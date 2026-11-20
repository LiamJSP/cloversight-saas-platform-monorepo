import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from '../src/seed.mjs';
import { defaultWatcher } from '../src/domain/defaults.mjs';
import { PLANS, captureCreditUsage } from '../src/domain/plans.mjs';
import { WatcherService } from '../src/services/watchers.mjs';
import { ActionLogService } from '../src/services/action-log.mjs';
import { AccountService } from '../src/services/accounts.mjs';
import { ensureWatcherUsage, reconcileWatcherUsage, claimCaptureAdmission, captureNotBefore, assertManualCaptureAllowed, releaseFundedCaptureHold } from '../src/domain/usage-guards.mjs';
import { BillingService, resumeCreditDelayedWatchers } from '../src/billing/service.mjs';
import { LocalBillingProvider } from '../src/billing/providers.mjs';
import { carryCaptureUsage, applyPaidRenewalWindow } from '../src/billing/usage.mjs';
import { boundedSms, fitsSingleSms, smsSegments } from '../src/notifications/sms.mjs';
import { reserveInvitationBudget, notificationPolicyFits } from '../src/notifications/budgets.mjs';
import { NotificationService } from '../src/notifications/service.mjs';
import { NotificationProviders } from '../src/notifications/providers.mjs';
import { enforceCustomerRate, retryHeaders } from '../src/security/customer-rate.mjs';
import { RegionalMonitoringCoordinator } from '../src/monitoring/regional-coordinator.mjs';
import { MonitoringEngine } from '../src/monitoring/engine.mjs';
import { awsRuntimeInternals } from '../src/aws/runtime.mjs';
import { scheduleAfterEdit } from '../src/monitoring/schedule.mjs';
import { processStripeEvent } from '../src/api/routes.mjs';

const logger = { debug() {}, info() {}, warn() {}, error() {} };
const actor = { actorId: 'owner', role: 'customer', accountId: 'acct_demo', teamRole: 'owner', requestId: 'test' };
const config = { awsRegion: 'us-east-1', availableCheckRegions: ['us-east-1','us-west-2','eu-west-1','eu-central-1','ap-southeast-2'], allowPrivateTargets: true, smsEnabled: true, smsProvider: 'local', billingProvider: 'local', billingCurrency: 'USD', integritySecret: 'test-secret-at-least-thirty-two-characters', responseBaseUrl: 'https://example.test' };
function fixture(planId = 'business', count = 1) {
  const state = demoState();
  const account = state.accounts[0]; account.planId = planId;
  account.trialEndsAt = new Date(Date.now() - 86400_000).toISOString();
  account.currentPeriodStart = new Date(Date.now() - 86400_000).toISOString();
  account.currentPeriodEnd = new Date(Date.now() + 29 * 86400_000).toISOString();
  account.captureCreditPeriodStart = account.currentPeriodStart;
  account.captureCreditPeriodEnd = account.currentPeriodEnd;
  state.transactions = []; state.staffNotes = [];
  state.teamMembers = [{ id: 'owner_member', accountId: account.id, userId: actor.actorId, email: account.contactEmail, status: 'active', role: 'owner' }];
  state.watchers = Array.from({ length: count }, (_, i) => {
    const w = defaultWatcher(account.id, account.contactEmail);
    w.id = `watch_${i}`; w.status = 'active'; w.nextCheckAt = new Date(Date.now() - 1000).toISOString(); w.config.checkIntervalSeconds = PLANS[planId].minIntervalSeconds; w.config.url = 'http://127.0.0.1/';
    return w;
  });
  return state;
}
// Serial, rollback-capable fake persistence. Scoped snapshots may intentionally
// omit every GSI watcher; strong direct reads and account conditions must suffice.
class Store {
  constructor(state, stale = false) { this.state = structuredClone(state); this.stale = stale; this.pending = Promise.resolve(); this.writes = []; }
  async read() { return structuredClone(this.state); }
  async getEntity(collection, id) { return structuredClone(this.state[collection].find((x) => x.id === id) ?? null); }
  async readCollection(collection) { return structuredClone(this.state[collection]); }
  scoped(state, options = {}) {
    const copy = structuredClone(state);
    if (this.stale) copy.watchers = copy.watchers.filter((w) => (options.directEntities ?? []).some((x) => x.collection === 'watchers' && x.id === w.id));
    return copy;
  }
  async readAccount(_account, options) { return this.scoped(this.state, options); }
  transact(label, fn) { return this.run(label, fn); }
  transactAccount(_id, label, fn, options) { return this.run(label, fn, options); }
  run(label, fn, options) {
    const next = this.pending.then(async () => {
      const before = this.state; const draft = options ? this.scoped(before, options) : structuredClone(before);
      const result = await fn(draft);
      if (options && this.stale) {
        const ids = new Set(draft.watchers.map((w) => w.id));
        draft.watchers.push(...before.watchers.filter((w) => !ids.has(w.id)));
      }
      let writes = 0; let bytes = 0;
      for (const [key, rows] of Object.entries(draft)) if (Array.isArray(rows)) {
        const old = new Map(before[key].map((x) => [x.id ?? x.key, JSON.stringify(x)]));
        for (const row of rows) { const id = row.id ?? row.key; if (old.get(id) !== JSON.stringify(row)) { writes++; bytes += Buffer.byteLength(JSON.stringify(row)); } old.delete(id); }
        writes += old.size;
      }
      assert.ok(writes <= 99, `${label}: ${writes} writes exceed DynamoDB budget`);
      assert.ok(bytes <= 4 * 1024 * 1024, `${label}: ${bytes} exceeds DynamoDB transaction size`);
      this.writes.push({ label, writes, bytes }); this.state = draft;
      return structuredClone(result);
    });
    this.pending = next.catch(() => {}); return next;
  }
}
function watcherService(store) { return new WatcherService({ store, config }); }
function freshInput(planId = 'business') { const w = defaultWatcher(actor.accountId, 'demo@example.com'); delete w.id; w.config.checkIntervalSeconds = PLANS[planId].minIntervalSeconds; w.config.url = 'http://127.0.0.1/'; return w; }
function coordinator(store, sent = []) { return new RegionalMonitoringCoordinator({ store, config, logger, assets: {}, notifier: { async queueTier() {} }, dispatcher: { async send(region, message) { sent.push({ region, ...message }); } } }); }

test('all six plans match the supplied numerical catalog', () => {
  const expected = [
    ['free',0,10,1,604800,0,0,1,1,5,50,0,7,0,2592000],
    ['essentials',1900,1000,10,3600,0,0,2,2,10,250,25,30,5,2592000],
    ['professional',4900,10000,50,900,2,10,5,5,25,1500,75,90,25,2592000],
    ['team',14900,30000,100,300,3,25,10,10,50,3000,150,180,5,86400],
    ['business',39900,100000,250,120,5,100,25,10,100,7500,300,365,15,86400],
    ['scale',89900,300000,500,120,5,500,50,10,100,15000,600,null,25,86400],
  ];
  for (const row of expected) { const p = PLANS[row[0]]; assert.deepEqual([p.id,p.priceMinor,p.captureCredits,p.maxWatchers,p.minIntervalSeconds,p.maxCheckRegions,p.maxRegionalWatchers,p.maxUsers,p.maxRecipientTiers,p.maxRecipients,p.dailyDeliveryLimits.email,p.dailyDeliveryLimits.sms,p.historyDays,p.reportAllowance,p.reportWindowSeconds],row); }
  assert.equal(PLANS.scale.selfServe, false);
});

test('stale GSI counts cannot create an extra watcher or regional slot', async () => {
  const full = new Store(fixture('essentials',10),true);
  await assert.rejects(watcherService(full).save(actor.accountId,freshInput('essentials'),actor),/10 watcher/);
  assert.equal(full.state.accounts[0].watcherUsage.total,10);
  const s=fixture('professional',11);s.watchers.slice(0,10).forEach((w)=>w.config.checkRegions=['us-east-1','us-west-2']);
  const store=new Store(s,true);const w=structuredClone(s.watchers[10]);w.config.checkRegions=['us-east-1','us-west-2'];
  await assert.rejects(watcherService(store).save(actor.accountId,w,actor),/multi-region/);
  assert.equal(store.state.accounts[0].watcherUsage.regional,10);
});

test('concurrent final-slot creates, deletion and undo maintain quota accounting', async () => {
  const store=new Store(fixture('essentials',9),true);const service=watcherService(store);
  const results=await Promise.allSettled([service.save(actor.accountId,freshInput('essentials'),actor),service.save(actor.accountId,freshInput('essentials'),actor)]);
  assert.equal(results.filter((x)=>x.status==='fulfilled').length,1);
  await service.remove(actor.accountId,'watch_0',actor);assert.equal(store.state.accounts[0].watcherUsage.total,9);
  const deletion=store.state.auditEvents.find((x)=>x.action==='watcher.deleted');
  await new ActionLogService({store,config}).revert(actor.accountId,deletion.id,actor);
  assert.equal(store.state.accounts[0].watcherUsage.total,10);
  await assert.rejects(service.save(actor.accountId,freshInput('essentials'),actor),/10 watcher/);
});

test('administrative reconciliation repairs only counters, with a dry-run default', async () => {
  const state=fixture();state.accounts[0].watcherUsage={version:1,total:99,regional:99};state.accounts[0].captureCreditsUsed=42;state.accounts[0].captureAttemptsUsed=70;
  const store=new Store(state);const before=structuredClone(store.state);
  assert.equal((await reconcileWatcherUsage(store,actor.accountId)).after.total,1);assert.deepEqual(store.state,before);
  await reconcileWatcherUsage(store,actor.accountId,true);assert.equal(store.state.accounts[0].watcherUsage.total,1);assert.equal(store.state.accounts[0].captureCreditsUsed,42);assert.equal(store.state.accounts[0].captureAttemptsUsed,70);
});

test('publish, resume and undo preserve the last start and current evidence', async () => {
  const state=fixture();const w=state.watchers[0];w.lastCaptureStartedAt=new Date().toISOString();w.latestSnapshotId='latest-new';w.captureRetryAfterAt=new Date(Date.now()+300000).toISOString();
  const store=new Store(state);const service=watcherService(store);
  await service.save(actor.accountId,{...w,name:'Changed'},actor,{publish:true});
  const event=store.state.auditEvents.find((x)=>x.action==='watcher.updated');
  store.state.watchers[0].latestSnapshotId='even-newer';
  await service.setStatus(actor.accountId,w.id,'paused',actor);await service.setStatus(actor.accountId,w.id,'active',actor);
  await new ActionLogService({store,config}).revert(actor.accountId,event.id,actor);
  const after=store.state.watchers[0];assert.equal(after.latestSnapshotId,'even-newer');assert.equal(after.lastCaptureStartedAt,w.lastCaptureStartedAt);assert.ok(Date.parse(after.nextCheckAt)>=Date.parse(w.captureRetryAfterAt));
});

test('250 Business watchers are paced across roughly two minutes', () => {
  const s=fixture('business',250),a=s.accounts[0],remaining=[...s.watchers],starts=[];const start=Date.now();
  for(let second=0;second<180&&remaining.length;second++) for(let i=remaining.length-1;i>=0;i--) if(claimCaptureAdmission(a,remaining[i],1,new Date(start+second*1000).toISOString()).allowed){starts.push(second);remaining.splice(i,1);}
  assert.equal(starts.length,250);assert.ok(Math.max(...starts)>100);assert.ok(Math.max(...starts)<180);
  for(const second of new Set(starts)) assert.ok(starts.filter((x)=>x===second).length<=5);
  assert.equal(a.captureAttemptsUsed,250);
});

test('coordinator commits account pacing with credits and replacement watchers do not reset it', async (t) => {
  t.mock.timers.enable({apis:['Date'],now:Date.now()});const store=new Store(fixture('business',8));const sent=[];const monitor=coordinator(store,sent);
  await Promise.all(store.state.watchers.map((w)=>monitor.check(w.id,{manual:true,accountId:actor.accountId})));
  assert.equal(sent.length,5);assert.equal(store.state.accounts[0].captureCreditsUsed,5);assert.equal(store.state.accounts[0].captureAttemptsUsed,5);
  const replacement=defaultWatcher(actor.accountId,'demo@example.com');replacement.config.checkIntervalSeconds=120;
  assert.equal(claimCaptureAdmission(store.state.accounts[0],replacement,1,new Date().toISOString()).code,'CAPTURE_RATE_DEFERRED');
});

test('manual API proxy and local engine cannot bypass cadence or credits', async () => {
  const state=fixture();state.watchers[0].lastCaptureStartedAt=new Date().toISOString();const store=new Store(state);
  const proxy=new awsRuntimeInternals.QueueMonitoringProxy({store,queueUrl:'checks',region:'us-east-1',logger});
  await assert.rejects(proxy.check('watch_0',{manual:true,accountId:actor.accountId}),{code:'CHECK_CADENCE_LIMIT'});
  const engine=new MonitoringEngine({store,config,logger});assert.equal(await engine.acquire('watch_0','test',{force:true}),null);
  delete store.state.watchers[0].lastCaptureStartedAt;store.state.accounts[0].captureCreditsUsed=100000;
  assert.throws(()=>assertManualCaptureAllowed(store.state.watchers[0],store.state.accounts[0]),{code:'CAPTURE_CREDITS_EXHAUSTED'});
  assert.equal(store.state.jobs.length,0);
});

test('refunded infrastructure work still exhausts a separate finite attempt allowance', () => {
  const s=fixture('free');const a=s.accounts[0],w=s.watchers[0];a.captureAttemptPeriodStart=captureCreditUsage(a).periodStart;a.captureAttemptsUsed=20;
  assert.equal(claimCaptureAdmission(a,w,1,new Date().toISOString()).code,'CAPTURE_ATTEMPT_LIMIT');assert.equal(a.captureCreditsUsed,0);
});

test('canceling unknown in-flight work retains credits; explicit internal failure refunds once', async () => {
  const store=new Store(fixture());const sent=[];const monitor=coordinator(store,sent);
  await monitor.check('watch_0',{manual:true,accountId:actor.accountId});const job=store.state.jobs.find((x)=>x.type==='check');store.state.watchers[0].status='paused';
  await monitor.check('watch_0',{manual:true,accountId:actor.accountId,jobId:job.id});assert.equal(store.state.accounts[0].captureCreditsUsed,1);
  const other=new Store(fixture());const m=coordinator(other);await m.check('watch_0',{manual:true,accountId:actor.accountId});const j=other.state.jobs.find((x)=>x.type==='check');
  const result={type:'regional-capture-result',contractVersion:1,jobId:j.id,runId:j.captureRun.id,snapshotId:j.captureRun.snapshotId,accountId:actor.accountId,watcherId:'watch_0',region:'us-east-1',status:'internal_error',capturedAt:new Date().toISOString(),error:{code:'CAPTURE_TIMEOUT',message:'internal fixture'}};
  await m.acceptResult(result);await m.acceptResult(result);assert.equal(other.state.accounts[0].captureCreditsUsed,0);assert.equal(other.state.accounts[0].captureAttemptsUsed,1);assert.ok(other.state.watchers[0].captureRetryAfterAt);
});

test('temporary incident recipients enforce the full current policy and Free excludes SMS', async () => {
  const s=fixture('essentials');const w=s.watchers[0];const tier=w.config.recipientTiers[0];w.openAlertId='alert';s.alerts.push({id:'alert',accountId:actor.accountId,watcherId:w.id,status:'open',openedAt:new Date().toISOString(),currentTierIndex:0,notificationRound:1,newlyOpened:true,responses:[]});
  const store=new Store(s);const service=new NotificationService({store,config,logger,providers:{}});
  const recipients=Array.from({length:11},(_,i)=>({id:`r${i}`,name:'Recipient',channel:'email',destination:`r${i}@example.test`,enabled:true}));
  await assert.rejects(service.replaceTierRecipients(actor.accountId,w.id,tier.id,recipients,0,actor),/plan limits/);
  const free=fixture('free').accounts[0];assert.equal(notificationPolicyFits({recipientTiers:[{recipients:[{channel:'sms'}]}]},free),false);
});

test('SMS handles Unicode, GSM extensions and preserves supported reply instructions', async () => {
  for(const text of ['A'.repeat(1600),'界'.repeat(1600),'😀'.repeat(1600),'^{}€'.repeat(400)]){const out=boundedSms(text,'WW1234');assert.ok(fitsSingleSms(out));assert.equal(smsSegments(out),1);assert.match(out,/WW1234: ALERT RECEIVED \/ ALL CLEAR$/);}
  assert.equal(smsSegments('^'.repeat(81)),2);assert.equal(fitsSingleSms('😀'.repeat(36)),false);
  const providers=new NotificationProviders({smsProvider:'twilio',smsEnabled:true},logger);
  await assert.rejects(providers.sendSms({to:'+19025550123',text:'a'.repeat(1000)}),{code:'SMS_SEGMENT_LIMIT'});
});

test('invitations share email budgets and a cross-account destination cooldown', () => {
  const s=fixture('essentials');const a=s.accounts[0];const now=new Date().toISOString();reserveInvitationBudget(s,a,'person@example.test',now);
  assert.throws(()=>reserveInvitationBudget(s,{...a,id:'another'},'person@example.test',now),{code:'INVITATION_RATE_LIMIT'});
  assert.equal(s.idempotency.find((x)=>x.scope==='delivery-budget').attempts,1);
  const entry=s.idempotency.find((x)=>x.scope==='delivery-budget');entry.attempts=250;
  assert.throws(()=>reserveInvitationBudget(s,a,'other@example.test',now),{code:'EMAIL_ALLOWANCE_EXHAUSTED'});
});

test('suppressed invitations never reach Cognito and an expired invitation does not occupy the last seat', async () => {
  const s=fixture('essentials');s.emailSuppressions.push({email:'blocked@example.test'});s.teamInvitations.push({id:'expired',accountId:actor.accountId,email:'expired@example.test',status:'pending',expiresAt:new Date(Date.now()-1000).toISOString()});
  const store=new Store(s);let sends=0;const accounts=new AccountService({store,config,identityDirectory:{async invite(){sends++;return {};}}});
  await assert.rejects(accounts.invite(actor.accountId,{email:'blocked@example.test'},actor),{code:'EMAIL_SUPPRESSED'});assert.equal(sends,0);
  await accounts.invite(actor.accountId,{email:'new@example.test'},actor);assert.equal(sends,1);
  assert.equal((await accounts.listTeam(actor.accountId,actor)).invitations.length,1);
});

test('API budgets are shared by account across members and IP rotation', async (t) => {
  t.mock.timers.enable({apis:['Date'],now:Date.now()});const store=new Store(fixture());
  for(let i=0;i<60;i++)await enforceCustomerRate(store,{...actor,actorId:`member-${i}`,ip:`ip-${i}`},'GET','/api/customer/bootstrap');
  await assert.rejects(enforceCustomerRate(store,actor,'GET','/api/customer/bootstrap'),{statusCode:429});
  await enforceCustomerRate(store,{...actor,accountId:'different'},'GET','/api/customer/bootstrap');
  assert.equal(retryHeaders({statusCode:429,retryAfterSeconds:60})['retry-after'],'60');
});

test('daily mutation limit remains after minute buckets roll over', async (t) => {
  const day=Date.parse(new Date().toISOString().slice(0,10)+'T01:00:00Z');t.mock.timers.enable({apis:['Date'],now:day});const store=new Store(fixture());
  for(let i=0;i<100;i++){t.mock.timers.setTime(day+i*61000);await enforceCustomerRate(store,{...actor,apiDailyMutationLimit:100},'POST','/api/watchers');}
  t.mock.timers.setTime(day+101*61000);await assert.rejects(enforceCustomerRate(store,{...actor,apiDailyMutationLimit:100},'POST','/api/watchers'),{statusCode:429});
});

test('plan switching preserves consumed credits and rejects a smaller allowance before charging', async () => {
  const s=fixture('professional');s.accounts[0].captureCreditsUsed=8000;s.accounts[0].captureAttemptsUsed=8500;s.accounts[0].captureAttemptPeriodStart=s.accounts[0].currentPeriodStart;
  const store=new Store(s);const billing=new BillingService({store,config,logger,provider:new LocalBillingProvider()});
  await billing.changePlan(actor.accountId,'team',actor);assert.equal(captureCreditUsage(store.state.accounts[0]).used,8000);assert.equal(store.state.accounts[0].captureAttemptsUsed,8500);
  await billing.changePlan(actor.accountId,'professional',actor);assert.equal(captureCreditUsage(store.state.accounts[0]).used,8000);
  await assert.rejects(billing.changePlan(actor.accountId,'essentials',actor),{code:'PLAN_DOWNGRADE_BLOCKED'});
  assert.equal(store.state.accounts[0].planId,'professional');
});

test('oversized plan adjustments fail before a provider charge', async () => {
  const store=new Store(fixture('business',100));let charges=0;const billing=new BillingService({store,config,logger,provider:{async changePlan(){charges++;throw new Error('must not charge');}}});
  await assert.rejects(billing.changePlan(actor.accountId,'team',actor),/too many watchers/);assert.equal(charges,0);assert.equal(store.state.transactions.length,0);
  store.state.watchers=store.state.watchers.slice(0,40);
  store.state.watchers.forEach((w)=>{w.config.bannedPhrases=Array.from({length:200},()=> 'a'.repeat(500));});
  await assert.rejects(billing.changePlan(actor.accountId,'team',actor),/byte budget/);assert.equal(charges,0);assert.equal(store.state.transactions.length,0);
});

test('250 credit-delayed watchers resume in bounded durable batches with replay safety', async () => {
  const s=fixture('business',250);s.watchers.forEach((w)=>{w.lastDelayReason='capture-credit-allowance-exhausted';w.nextCheckAt=s.accounts[0].currentPeriodEnd;});
  const store=new Store(s,true);await store.transact('paid-renewal',(draft)=>resumeCreditDelayedWatchers(draft,actor.accountId));
  assert.equal(store.state.accounts[0].pendingCaptureResumptions.length,230);
  store.state.watchers.find((w)=>w.id==='watch_24').status='paused';const billing=new BillingService({store,config,logger,provider:{}});await billing.processCaptureResumptions();await billing.processCaptureResumptions();
  assert.equal(store.state.accounts[0].pendingCaptureResumptions.length,0);assert.equal(store.state.watchers.filter((w)=>w.lastDelayReason===null).length,249);assert.equal(store.state.watchers.find((w)=>w.id==='watch_24').status,'paused');
  assert.ok(store.writes.every((x)=>x.writes<=51));
  releaseFundedCaptureHold(store.state.watchers.find((w)=>w.id==='watch_24'),store.state.accounts[0]);assert.equal(store.state.watchers.find((w)=>w.id==='watch_24').lastDelayReason,null);
  const large=fixture('business',60);
  large.watchers.forEach((w)=>{w.lastDelayReason='capture-credit-allowance-exhausted';w.config.bannedPhrases=Array.from({length:200},()=> '界'.repeat(500));});
  const bigStore=new Store(large,true);
  await bigStore.transact('large-paid-renewal',(draft)=>resumeCreditDelayedWatchers(draft,actor.accountId));
  assert.ok(bigStore.state.accounts[0].pendingCaptureResumptions.length>40);
  await new BillingService({store:bigStore,config,logger,provider:{}}).processCaptureResumptions();
  assert.equal(bigStore.state.accounts[0].pendingCaptureResumptions.length,0);
  assert.ok(bigStore.writes.every((x)=>x.bytes<3_100_000));
});

test('only a new paid renewal resets usage, and a subscription status event cannot grant it', async () => {
  const s=fixture('professional');const a=s.accounts[0];a.captureCreditsUsed=123;a.captureAttemptsUsed=150;
  const transaction={};carryCaptureUsage(a,transaction,{periodEnd:a.currentPeriodEnd});assert.equal(carryCaptureUsage(a,transaction),false);
  const period={start:new Date(Date.now()-1000).toISOString(),end:new Date(Date.now()+30*86400_000).toISOString()};
  const renewal={};assert.equal(applyPaidRenewalWindow(a,renewal,period),true);a.captureCreditsUsed=11;
  assert.equal(applyPaidRenewalWindow(a,{},period),false);assert.equal(a.captureCreditsUsed,11);
  const store=new Store(s);const before=await store.read();
  await processStripeEvent({id:'sub-update',type:'customer.subscription.updated',data:{object:{id:a.providerSubscriptionId,customer:a.providerCustomerId,metadata:{accountId:a.id},status:'active',current_period_start:Math.floor(Date.now()/1000),current_period_end:Math.floor(Date.now()/1000)+86400*60,items:{data:[{price:{id:'price_pro'}}]}}}},store,logger,{...config,stripePriceIds:{professional:'price_pro'}});
  assert.equal(store.state.accounts[0].currentPeriodEnd,before.accounts[0].currentPeriodEnd);assert.equal(store.state.accounts[0].captureCreditsUsed,11);
  const w=store.state.watchers[0];w.lastCaptureStartedAt=new Date().toISOString();assert.ok(Date.parse(scheduleAfterEdit(w,new Date().toISOString(),captureNotBefore(w,a)))>=Date.parse(w.lastCaptureStartedAt)+900000);
});

test('operator fixtures atomically bound scheduled work and permit redelivery of the original run', async () => {
  const state = fixture();
  state.watchers[0].acceptanceRun = { id: 'fixture', startsLeft: 1, expiresAt: new Date(Date.now() + 60000).toISOString() };
  const store = new Store(state);
  const monitor = coordinator(store);
  const options = { accountId: actor.accountId, jobId: 'scheduled_fixture' };
  assert.equal((await monitor.check('watch_0', { ...options, jobId: 'manual', manual: true })).skipped, true);
  assert.equal(store.state.watchers[0].acceptanceRun.startsLeft, 1);
  await monitor.check('watch_0', options);
  await monitor.check('watch_0', options);
  assert.equal(store.state.accounts[0].captureCreditsUsed, 1);
  assert.equal(store.state.watchers[0].acceptanceRun.startsLeft, 0);
  for (const [startsLeft, expiresAt] of [[0, new Date(Date.now() + 60000).toISOString()], [2, '2000-01-01T00:00:00.000Z']]) {
    const blocked = fixture();
    blocked.watchers[0].acceptanceRun = { id: 'bounded', startsLeft, expiresAt };
    const closed = new Store(blocked);
    assert.equal((await coordinator(closed).check('watch_0', options)).skipped, true);
    assert.equal(closed.state.accounts[0].captureCreditsUsed, 0);
    assert.equal(closed.state.watchers[0].nextCheckAt, null);
    assert.equal(closed.state.watchers[0].status, 'paused');
  }
  const empty = new Store(fixture('business', 0));
  const input = freshInput();
  input.acceptanceRun = { startsLeft: 1000 }; input.config.acceptanceRun = input.acceptanceRun;
  const created = await watcherService(empty).save(actor.accountId, input, actor, { publish: true });
  assert.equal(created.acceptanceRun, undefined);
  assert.equal(created.config.acceptanceRun, undefined);
});
