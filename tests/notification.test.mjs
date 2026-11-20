import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import { FileStore } from '../src/storage/file-store.mjs';import { demoState as seededDemoState } from '../src/seed.mjs';import { NotificationService } from '../src/notifications/service.mjs';
function demoState() { const state = seededDemoState(); state.accounts[0].planId = 'professional'; return state; }
const logger={debug(){},info(){},warn(){},error(){}};
test('regional incidents notify responsible active team members and explicitly configured external addresses',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ww-notice-regions-'));try{const store=new FileStore(path.join(dir,'state.json'),logger);await store.initialize();await store.transact('seed',s=>{Object.assign(s,demoState());const w=s.watchers[0];w.status='active';w.config.checkRegions=['us-east-1','us-west-2'];w.config.recipientTiers[0].recipients=[{id:'east',userId:'user_east',name:'East',channel:'email',destination:'east@example.test',enabled:true},{id:'west',userId:'user_west',name:'West',channel:'email',destination:'west@example.test',enabled:true},{id:'revoked',userId:'user_revoked',name:'Revoked',channel:'email',destination:'revoked@example.test',enabled:true},{id:'external',name:'External',channel:'email',destination:'external@example.test',enabled:true}];w.config.recipientTiers[0].requiredAcknowledgements=1;s.teamMembers.push({id:'member_east',accountId:w.accountId,userId:'user_east',email:'east@example.test',role:'member',status:'active'},{id:'member_west',accountId:w.accountId,userId:'user_west',email:'west@example.test',role:'member',status:'active'},{id:'member_revoked',accountId:w.accountId,userId:'user_revoked',email:'revoked@example.test',role:'member',status:'revoked'});s.userProfiles.push({id:'user_east',watchingRegions:['us-east-1']},{id:'user_west',watchingRegions:['us-west-2']},{id:'user_revoked',watchingRegions:['us-west-2']});const alert={id:'alert_region',accountId:w.accountId,watcherId:w.id,kind:'outage',kindLabel:'Page Outage',status:'open',summary:'west down',affectedRegions:['us-west-2'],regionScoped:true,openedAt:new Date().toISOString(),currentTierIndex:0,notificationRound:1,nextEscalationAt:null,nextReAlertAt:null,responses:[],newlyOpened:true};s.alerts.push(alert);w.openAlertId=alert.id});const destinations=[];const providers={sendEmail:async(message)=>{destinations.push(message.to);return {providerId:'region-send'}},sendSms:async()=>{throw new Error('not expected')}};const service=new NotificationService({store,providers,config:{integritySecret:'x'.repeat(32),responseBaseUrl:'http://localhost:4010'},logger});await service.queueTier('alert_region',0);assert.deepEqual(destinations,['west@example.test','external@example.test']);assert.deepEqual((await store.read()).notifications.map((item)=>item.destination),['west@example.test','external@example.test'])}finally{await fs.rm(dir,{recursive:true,force:true})}});

test('notification sends are idempotent and all-clear consensus calls promotion',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ww-notice-'));try{const store=new FileStore(path.join(dir,'state.json'),logger);await store.initialize();await store.transact('seed',s=>{Object.assign(s,demoState());const w=s.watchers[0];w.status='active';const alert={id:'alert_x',accountId:'acct_demo',watcherId:w.id,kind:'text_change',kindLabel:'Text Change',status:'open',summary:'changed',bannedMatches:[],openedAt:new Date().toISOString(),currentTierIndex:0,notificationRound:1,nextEscalationAt:null,nextReAlertAt:null,responses:[],newlyOpened:true};s.alerts.push(alert);w.openAlertId=alert.id});let sent=0;const providers={sendEmail:async()=>({providerId:`p${++sent}`}),sendSms:async()=>({providerId:`p${++sent}`})};const service=new NotificationService({store,providers,config:{integritySecret:'x'.repeat(32),responseBaseUrl:'http://localhost:4010'},logger});let promoted=false;service.setAllClearHandler(async()=>{promoted=true});await service.queueTier('alert_x',0);await service.queueTier('alert_x',0);assert.equal(sent,1);const state=await store.read();const recipient=state.watchers[0].config.recipientTiers[0].recipients[0];const result=await service.recordResponse({alertId:'alert_x',recipientId:recipient.id,response:'all_clear',source:'test'});assert.equal(result.status,'all_clear');assert.equal(promoted,true)}finally{await fs.rm(dir,{recursive:true,force:true})}});

test('legacy recipients without an enabled field remain notification eligible', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-legacy-enabled-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      delete watcher.config.recipientTiers[0].recipients[0].enabled;
      watcher.openAlertId = 'alert_legacy_enabled';
      state.alerts.push({ id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    const destinations = [];
    const providers = { async sendEmail(message) { destinations.push(message.to); return { providerId: 'legacy_enabled_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    await service.queueTier('alert_legacy_enabled', 0);
    assert.deepEqual(destinations, ['demo@example.com']);
    assert.equal((await store.read()).notifications[0].status, 'sent');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('a platform email suppression overrides watcher recipients and advances the tier without transport', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-email-suppression-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0]; watcher.status = 'active';
      state.alerts.push({ id: 'alert_suppressed', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    let sends = 0;
    const providers = { async sendEmail() { sends += 1; return { providerId: 'unexpected' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    await service.addEmailSuppression('  DEMO@example.com ', 'Recipient asked support to stop customer alert email.', { actorId: 'staff_test', role: 'steward', stewardRole: 'owner', requestId: 'req_test' });
    const result = await service.queueTier('alert_suppressed', 0);
    const state = await store.read();
    assert.equal(sends, 0);
    assert.equal(result[0].suppressed, true);
    assert.equal(state.notifications[0].status, 'suppressed');
    assert.equal(state.alerts[0].notificationDelivery.suppressed, 1);
    assert.ok(state.alerts[0].escalationCompletedAt);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('alert email carries one-click unsubscribe headers and a recipient opt-out blocks later alerts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-email-unsubscribe-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0]; watcher.status = 'active';
      state.alerts.push({ id: 'alert_unsubscribe_one', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    const messages = [];
    const providers = { async sendEmail(message) { messages.push(message); return { providerId: `email_${messages.length}` }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'https://staging.example.test', smsEnabled: false }, logger });
    await service.queueTier('alert_unsubscribe_one', 0);
    assert.equal(messages.length, 1);
    assert.match(messages[0].html, /Unsubscribe this address from customer monitoring alerts/);
    assert.equal(messages[0].headers.find((header) => header.name === 'List-Unsubscribe-Post').value, 'List-Unsubscribe=One-Click');
    const link = (await store.read()).emailUnsubscribeLinks[0];
    await service.recordEmailUnsubscribe({ purpose: 'email_unsubscribe', linkId: link.id });
    await store.transact('second.alert', (state) => {
      const watcher = state.watchers[0];
      state.alerts.push({ id: 'alert_unsubscribe_two', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    await service.queueTier('alert_unsubscribe_two', 0);
    const state = await store.read();
    assert.equal(messages.length, 1);
    assert.equal(state.emailSuppressions[0].source, 'recipient_link');
    assert.equal(state.notifications.find((item) => item.alertId === 'alert_unsubscribe_two').status, 'suppressed');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('a blocked tier records a deterministic diagnostic reason without sending', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-block-reason-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.openAlertId = 'alert_canceled_diagnostic';
      state.alerts.push({ id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id, status: 'open', openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, responses: [], newlyOpened: true, notificationControl: { revision: 1, mutedTierIds: [], recipientOverrides: {}, canceledAt: new Date().toISOString() } });
    });
    const warnings = [];
    const diagnosticLogger = { debug() {}, info() {}, warn(event, fields) { warnings.push({ event, fields }); }, error() {} };
    const providers = { async sendEmail() { throw new Error('not expected'); }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger: diagnosticLogger });
    assert.deepEqual(await service.queueTier('alert_canceled_diagnostic', 0), []);
    assert.equal(warnings.at(-1).event, 'notification.tier.blocked');
    assert.equal(warnings.at(-1).fields.reason, 'activity_canceled');
    assert.match(warnings.at(-1).fields.runtimeRevision, /^\d+\.\d+\.\d+$/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('an existing incident with durable zero-attempt evidence is repaired and sent once', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-zero-attempt-repair-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.openAlertId = 'alert_zero_attempt';
      state.alerts.push({
        id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id,
        kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [],
        openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 4,
        nextEscalationAt: null, nextReAlertAt: null, escalationCompletedAt: '2020-01-01T00:00:01.000Z',
        responses: [], newlyOpened: false, sendAgain: false,
        notificationDispatch: { id: 'dispatch_zero_attempt', round: 4, tierIndex: 0, status: 'completed', startedAt: '2020-01-01T00:00:00.000Z', completedAt: '2020-01-01T00:00:01.000Z' },
        notificationDelivery: { dispatchId: 'dispatch_zero_attempt', tierIndex: 0, round: 4, attemptedAt: '2020-01-01T00:00:01.000Z', attempted: 0, sent: 0, failed: 0 },
      });
    });
    const destinations = [];
    const events = [];
    const repairLogger = { debug() {}, info(event, fields) { events.push({ event, fields }); }, warn(event, fields) { events.push({ event, fields }); }, error() {} };
    const providers = { async sendEmail(message) { destinations.push(message.to); return { providerId: 'repaired_zero_attempt_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger: repairLogger });
    await service.queueTier('alert_zero_attempt', 0);
    await service.queueTier('alert_zero_attempt', 0);
    const state = await store.read();
    assert.deepEqual(destinations, ['demo@example.com']);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].status, 'sent');
    assert.equal(state.alerts[0].notificationDelivery.attempted, 1);
    assert.equal(events.some((item) => item.event === 'notification.tier.zero_attempt_repaired'), true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('an existing incident with recipient send evidence is never repaired or resent', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-send-evidence-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const recipient = watcher.config.recipientTiers[0].recipients[0];
      watcher.openAlertId = 'alert_with_send_evidence';
      state.alerts.push({ id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id, status: 'open', openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 2, nextEscalationAt: null, escalationCompletedAt: '2020-01-01T00:00:01.000Z', responses: [], newlyOpened: false, sendAgain: false, notificationDispatch: { id: 'dispatch_sent', round: 2, tierIndex: 0, status: 'completed', startedAt: '2020-01-01T00:00:00.000Z', completedAt: '2020-01-01T00:00:01.000Z' }, notificationDelivery: { dispatchId: 'dispatch_sent', tierIndex: 0, round: 2, attemptedAt: '2020-01-01T00:00:01.000Z', attempted: 1, sent: 1, failed: 0 } });
      state.notifications.push({ id: 'notice_sent_evidence', alertId: watcher.openAlertId, watcherId: watcher.id, accountId: watcher.accountId, dispatchId: 'dispatch_sent', tierId: watcher.config.recipientTiers[0].id, tierIndex: 0, recipientId: recipient.id, channel: recipient.channel, destination: recipient.destination, round: 2, status: 'sent', providerId: 'ses_existing', responseCode: 'EXISTING', createdAt: '2020-01-01T00:00:00.000Z', sentAt: '2020-01-01T00:00:01.000Z' });
    });
    let sends = 0;
    const providers = { async sendEmail() { sends += 1; return { providerId: 'unexpected' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    await service.queueTier('alert_with_send_evidence', 0);
    assert.equal(sends, 0);
    assert.equal((await store.read()).notifications.length, 1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('failed notification delivery is retried once and then marked sent', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-retry-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      state.alerts.push({ id: 'alert_retry', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'page unavailable', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    let attempts = 0;
    const providers = {
      async sendEmail() { attempts += 1; if (attempts === 1) throw new Error('temporary provider failure'); return { providerId: 'email_retry_ok' }; },
      async sendSms() { throw new Error('not expected'); },
    };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    const queued = await service.queueTier('alert_retry', 0);
    assert.equal(queued[0].retryScheduled, true);
    await store.transact('make.retry.due', (state) => { state.notifications[0].retryAt = '2000-01-01T00:00:00.000Z'; });
    await service.processTimers();
    const state = await store.read();
    assert.equal(attempts, 2);
    assert.equal(state.notifications[0].status, 'sent');
    assert.equal(state.notifications[0].retryCount, 1);
    assert.equal(state.notifications[0].retryAt, null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('maintenance reclaims a delivery left sending by an interrupted worker', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-stale-send-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const recipient = watcher.config.recipientTiers[0].recipients[0];
      state.alerts.push({ id: 'alert_stale_send', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: '2099-01-01T00:00:00.000Z', nextReAlertAt: '2099-01-01T00:00:00.000Z', responses: [], newlyOpened: false });
      state.notifications.push({ id: 'notice_stale_send', alertId: 'alert_stale_send', watcherId: watcher.id, accountId: watcher.accountId, tierId: watcher.config.recipientTiers[0].id, tierIndex: 0, recipientId: recipient.id, channel: recipient.channel, destination: recipient.destination, round: 1, status: 'sending', responseCode: 'STALE42', responseExpiresAt: '2099-01-01T00:00:00.000Z', retryCount: 0, retryAt: null, attemptStartedAt: '2020-01-01T00:00:00.000Z', createdAt: '2020-01-01T00:00:00.000Z' });
    });
    let attempts = 0;
    const providers = { async sendEmail() { attempts += 1; return { providerId: 'reclaimed_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    await service.processTimers();
    const notification = (await store.read()).notifications.find((item) => item.id === 'notice_stale_send');
    assert.equal(attempts, 1);
    assert.equal(notification.status, 'sent');
    assert.equal(notification.retryCount, 1);
    assert.equal(notification.providerId, 'reclaimed_send');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('maintenance advances to the next tier when the current tier has too few replies', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-escalation-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.config.recipientTiers.push({ id: 'tier_backup', name: 'Backup', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_backup', name: 'Backup', channel: 'email', destination: 'backup@example.test', enabled: true }] });
      const primaryTier = watcher.config.recipientTiers[0];
      const primaryRecipient = primaryTier.recipients[0];
      state.alerts.push({ id: 'alert_escalate', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: '2020-01-01T00:01:00.000Z', nextReAlertAt: '2099-01-01T00:00:00.000Z', responses: [], newlyOpened: false, notificationDispatch: { id: 'dispatch_escalate_primary', round: 1, tierIndex: 0, status: 'completed', startedAt: '2020-01-01T00:00:00.000Z', completedAt: '2020-01-01T00:00:01.000Z' }, notificationDelivery: { dispatchId: 'dispatch_escalate_primary', tierIndex: 0, round: 1, attemptedAt: '2020-01-01T00:00:01.000Z', attempted: 1, sent: 1, failed: 0 } });
      state.notifications.push({ id: 'notice_escalate_primary', alertId: 'alert_escalate', watcherId: watcher.id, accountId: watcher.accountId, dispatchId: 'dispatch_escalate_primary', tierId: primaryTier.id, tierIndex: 0, recipientId: primaryRecipient.id, channel: primaryRecipient.channel, destination: primaryRecipient.destination, round: 1, status: 'sent', providerId: 'ses_primary', responseCode: 'PRIMARY1', createdAt: '2020-01-01T00:00:00.000Z', sentAt: '2020-01-01T00:00:01.000Z' });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: 'tier_two_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    await service.processTimers();
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_escalate');
    assert.deepEqual(destinations, ['backup@example.test']);
    assert.equal(alert.currentTierIndex, 1);
    assert.equal(alert.nextEscalationAt, null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('a back-to-back check cannot discard tier completion or block escalation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-check-overlap-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.config.recipientTiers.push({ id: 'tier_overlap_backup', name: 'Backup', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_overlap_backup', name: 'Backup', channel: 'email', destination: 'overlap-backup@example.test', enabled: true }] });
      state.alerts.push({ id: 'alert_check_overlap', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    const destinations = [];
    let acceptFirstEmail;
    let firstEmailStarted;
    const firstEmailGate = new Promise((resolve) => { acceptFirstEmail = resolve; });
    const firstEmailReady = new Promise((resolve) => { firstEmailStarted = resolve; });
    const providers = {
      async sendEmail(input) {
        destinations.push(input.to);
        if (destinations.length === 1) { firstEmailStarted(); await firstEmailGate; }
        return { providerId: `overlap_send_${destinations.length}` };
      },
      async sendSms() { throw new Error('not expected'); },
    };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    const firstTier = service.queueTier('alert_check_overlap', 0);
    await firstEmailReady;
    await store.transact('overlapping.check.started', (state) => { state.watchers[0].status = 'checking'; state.watchers[0].leaseOwner = 'check-overlap'; state.watchers[0].leaseExpiresAt = '2099-01-01T00:00:00.000Z'; });
    acceptFirstEmail();
    await firstTier;

    let alert = (await store.read()).alerts.find((item) => item.id === 'alert_check_overlap');
    assert.equal(alert.newlyOpened, false);
    assert.equal(alert.notificationDispatch.status, 'completed');
    assert.ok(alert.nextEscalationAt);

    await store.transact('make.overlap.escalation.due', (state) => { state.alerts.find((item) => item.id === 'alert_check_overlap').nextEscalationAt = '2000-01-01T00:00:00.000Z'; });
    await service.processTimers();
    alert = (await store.read()).alerts.find((item) => item.id === 'alert_check_overlap');
    assert.deepEqual(destinations, ['demo@example.com', 'overlap-backup@example.test']);
    assert.equal(alert.currentTierIndex, 1);
    assert.equal(alert.notificationDispatch.status, 'completed');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('a legacy repeat timer is removed while forward escalation remains pending', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-timer-order-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.config.reAlertMinutes = 1;
      watcher.config.recipientTiers[0].delayMinutes = 10;
      watcher.config.recipientTiers.push({ id: 'tier_timer_backup', name: 'Backup', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_timer_backup', name: 'Backup', channel: 'email', destination: 'backup-timer@example.test', enabled: true }] });
      state.alerts.push({ id: 'alert_timer_order', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: 'ordered_tier_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });

    await service.queueTier('alert_timer_order', 0);
    let alert = (await store.read()).alerts.find((item) => item.id === 'alert_timer_order');
    assert.deepEqual(destinations, ['demo@example.com']);
    assert.ok(alert.nextEscalationAt);
    assert.equal(alert.nextReAlertAt, null);

    // Reproduce an already-open alert written by a release that persisted both
    // timers. The overdue repeat must not take ownership from escalation.
    await store.transact('add.legacy.repeat.timer', (state) => { state.alerts.find((item) => item.id === 'alert_timer_order').nextReAlertAt = '2000-01-01T00:01:00.000Z'; });
    await service.processTimers();
    alert = (await store.read()).alerts.find((item) => item.id === 'alert_timer_order');
    assert.deepEqual(destinations, ['demo@example.com']);
    assert.equal(alert.notificationRound, 1);
    assert.equal(alert.currentTierIndex, 0);

    await store.transact('make.escalation.due', (state) => { state.alerts.find((item) => item.id === 'alert_timer_order').nextEscalationAt = '2000-01-01T00:02:00.000Z'; });
    await service.processTimers();
    alert = (await store.read()).alerts.find((item) => item.id === 'alert_timer_order');
    assert.deepEqual(destinations, ['demo@example.com', 'backup-timer@example.test']);
    assert.equal(alert.notificationRound, 1);
    assert.equal(alert.currentTierIndex, 1);
    assert.equal(alert.nextEscalationAt, null);
    assert.equal(alert.nextReAlertAt, null);
    assert.ok(alert.escalationCompletedAt);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('maintenance repairs a missing escalation timer by advancing the same round', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-escalation-repair-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.config.recipientTiers.push({ id: 'tier_repair_backup', name: 'Backup', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_repair_backup', name: 'Backup', channel: 'email', destination: 'repair-backup@example.test', enabled: true }] });
      state.alerts.push({ id: 'alert_escalation_repair', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 7, nextEscalationAt: null, nextReAlertAt: '2000-01-01T00:01:00.000Z', escalationCompletedAt: null, notificationDelivery: { tierIndex: 0, round: 7, attemptedAt: '2020-01-01T00:00:00.000Z', attempted: 1, sent: 1, failed: 0 }, responses: [], newlyOpened: false });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: 'repaired_escalation_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });

    await service.processTimers();
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_escalation_repair');
    assert.deepEqual(destinations, ['repair-backup@example.test']);
    assert.equal(alert.notificationRound, 7);
    assert.equal(alert.currentTierIndex, 1);
    assert.ok(alert.escalationCompletedAt);
    assert.equal(alert.nextReAlertAt, null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('a stale one-tier alert policy is repaired from the watcher and advances without resending level one', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-policy-progress-repair-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const levelOne = watcher.config.recipientTiers[0];
      watcher.config.recipientTiers.push(
        { id: 'tier_repaired_two', name: 'Level 2', delayMinutes: 4, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_repaired_two', name: 'Level 2', channel: 'email', destination: 'level-two@example.test', enabled: true }] },
        { id: 'tier_repaired_three', name: 'Level 3', delayMinutes: 4, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_repaired_three', name: 'Level 3', channel: 'email', destination: 'level-three@example.test', enabled: true }] },
      );
      state.alerts.push({
        id: 'alert_policy_progress_repair', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 9,
        nextEscalationAt: null, nextReAlertAt: '2000-01-01T00:00:00.000Z', escalationCompletedAt: '2020-01-01T00:01:00.000Z', responses: [], newlyOpened: false,
        notificationPolicy: { recipientTiers: [structuredClone(levelOne)], allClearThreshold: 1, alertReceivedThreshold: 1, reAlertMinutes: 1, templates: structuredClone(watcher.config.templates), watcher: { name: watcher.name, url: watcher.config.url } },
        notificationDispatch: { id: 'dispatch_old_level_one', round: 9, tierIndex: 0, status: 'completed', startedAt: '2020-01-01T00:00:00.000Z', completedAt: '2020-01-01T00:00:01.000Z' },
        notificationDelivery: { dispatchId: 'dispatch_old_level_one', tierIndex: 0, round: 9, attemptedAt: '2020-01-01T00:00:01.000Z', attempted: 1, sent: 1, failed: 0 },
      });
      state.notifications.push({ id: 'notice_old_level_one', alertId: 'alert_policy_progress_repair', watcherId: watcher.id, accountId: watcher.accountId, dispatchId: 'dispatch_old_level_one', tierId: levelOne.id, tierIndex: 0, recipientId: levelOne.recipients[0].id, channel: 'email', destination: levelOne.recipients[0].destination, round: 9, status: 'sent', responseCode: 'OLDLVL1', createdAt: '2020-01-01T00:00:00.000Z', sentAt: '2020-01-01T00:00:01.000Z' });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: `policy_repair_${destinations.length}` }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });

    await service.processTimers();
    let alert = (await store.read()).alerts.find((item) => item.id === 'alert_policy_progress_repair');
    assert.deepEqual(destinations, ['level-two@example.test']);
    assert.equal(alert.notificationRound, 9);
    assert.equal(alert.currentTierIndex, 1);
    assert.equal(alert.nextReAlertAt, null);
    assert.ok(alert.nextEscalationAt);

    await store.transact('make.level.three.due', (state) => { state.alerts.find((item) => item.id === 'alert_policy_progress_repair').nextEscalationAt = '2000-01-01T00:00:00.000Z'; });
    await service.processTimers();
    alert = (await store.read()).alerts.find((item) => item.id === 'alert_policy_progress_repair');
    assert.deepEqual(destinations, ['level-two@example.test', 'level-three@example.test']);
    assert.equal(alert.currentTierIndex, 2);
    assert.equal(alert.nextEscalationAt, null);
    assert.equal(alert.nextReAlertAt, null);
    assert.ok(alert.escalationCompletedAt);

    await store.transact('restore.legacy.repeat.timer', (state) => { state.alerts.find((item) => item.id === 'alert_policy_progress_repair').nextReAlertAt = '2000-01-01T00:00:00.000Z'; });
    await service.processTimers();
    assert.deepEqual(destinations, ['level-two@example.test', 'level-three@example.test']);
    assert.equal((await store.read()).alerts.find((item) => item.id === 'alert_policy_progress_repair').nextReAlertAt, null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('a completed single-level incident is never periodically resent', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-single-pass-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      state.alerts.push({ id: 'alert_single_pass', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: 'single_pass' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });

    await service.queueTier('alert_single_pass', 0);
    await store.transact('inject.legacy.repeat', (state) => { state.alerts.find((item) => item.id === 'alert_single_pass').nextReAlertAt = '2000-01-01T00:00:00.000Z'; });
    await service.processTimers();
    await service.processTimers();
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_single_pass');
    assert.deepEqual(destinations, ['demo@example.com']);
    assert.equal(alert.notificationRound, 1);
    assert.equal(alert.nextReAlertAt, null);
    assert.ok(alert.escalationCompletedAt);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('meeting a tier reply requirement completes escalation without scheduling a resend', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-tier-complete-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const recipient = watcher.config.recipientTiers[0].recipients[0];
      watcher.config.recipientTiers.push({ id: 'tier_unused', name: 'Unused', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_unused', name: 'Unused', channel: 'email', destination: 'unused@example.test', enabled: true }] });
      watcher.config.alertReceivedThreshold = 2;
      state.alerts.push({ id: 'alert_tier_complete', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: '2020-01-01T00:01:00.000Z', nextReAlertAt: '2099-01-01T00:00:00.000Z', responses: [{ id: 'resp_tier', recipientId: recipient.id, response: 'alert_received', createdAt: '2020-01-01T00:00:30.000Z' }], newlyOpened: false });
    });
    let sent = 0;
    const providers = { async sendEmail() { sent += 1; return { providerId: 'unexpected' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    await service.processTimers();
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_tier_complete');
    assert.equal(sent, 0);
    assert.equal(alert.currentTierIndex, 0);
    assert.equal(alert.nextEscalationAt, null);
    assert.equal(alert.nextReAlertAt, null);
    assert.ok(alert.escalationCompletedAt);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('responses from an earlier notification round are rejected', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-stale-response-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const recipient = watcher.config.recipientTiers[0].recipients[0];
      state.alerts.push({ id: 'alert_stale_response', accountId: watcher.accountId, watcherId: watcher.id, status: 'open', openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 2, nextEscalationAt: null, nextReAlertAt: null, responses: [] });
      state.notifications.push({ id: 'notice_old_round', alertId: 'alert_stale_response', watcherId: watcher.id, accountId: watcher.accountId, recipientId: recipient.id, channel: 'email', destination: recipient.destination, round: 1, status: 'sent', responseCode: 'OLD1234' });
    });
    const service = new NotificationService({ store, providers: {}, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    const recipientId = (await store.read()).watchers[0].config.recipientTiers[0].recipients[0].id;
    await assert.rejects(
      () => service.recordResponse({ alertId: 'alert_stale_response', recipientId, notificationId: 'notice_old_round', response: 'alert_received', source: 'test' }),
      (error) => error.code === 'STALE_ALERT_RESPONSE' && error.statusCode === 409,
    );
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('maintenance resumes an initial tier whose inline dispatch was interrupted', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-resume-tier-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      state.alerts.push({ id: 'alert_resume_tier', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    let sent = 0;
    const providers = { async sendEmail() { sent += 1; return { providerId: 'resumed_tier' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    await service.processTimers();
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_resume_tier');
    assert.equal(sent, 1);
    assert.equal(alert.newlyOpened, false);
    assert.equal(alert.nextReAlertAt, null);
    assert.ok(alert.escalationCompletedAt);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('paused watchers and recovered alerts cannot send or re-alert', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-paused-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'paused';
      state.alerts.push({ id: 'alert_paused', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: '2000-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: '2000-01-01T00:01:00.000Z', responses: [], newlyOpened: true });
    });
    let sent = 0;
    const providers = { async sendEmail() { sent += 1; return { providerId: 'unexpected' }; }, async sendSms() { sent += 1; return { providerId: 'unexpected' }; } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    assert.deepEqual(await service.queueTier('alert_paused', 0), []);
    await store.transact('mark.recovered', (state) => { state.watchers[0].status = 'active'; state.alerts[0].recoveryDetectedAt = new Date().toISOString(); });
    await service.processTimers();
    assert.equal(sent, 0);
    assert.equal((await store.read()).alerts[0].notificationRound, 1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('open alerts retain the recipient policy that was active when the alert opened', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-policy-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const policy = {
        recipientTiers: structuredClone(watcher.config.recipientTiers),
        allClearThreshold: 1,
        alertReceivedThreshold: 1,
        reAlertMinutes: 30,
        templates: structuredClone(watcher.config.templates),
      };
      state.alerts.push({ id: 'alert_policy', accountId: watcher.accountId, watcherId: watcher.id, kind: 'text_change', kindLabel: 'Text Change', status: 'open', summary: 'changed', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], notificationPolicy: policy, newlyOpened: true });
      watcher.config.recipientTiers = [{ id: 'new_tier', name: 'Replacement', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'new_recipient', channel: 'email', destination: 'new@example.test', enabled: true }] }];
    });
    let sentTo = null;
    const providers = { async sendEmail(input) { sentTo = input.to; return { providerId: 'policy_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    let resolved = false; service.setAllClearHandler(async () => { resolved = true; });
    await service.queueTier('alert_policy', 0);
    assert.equal(sentTo, 'demo@example.com');
    const state = await store.read();
    const frozenRecipientId = state.alerts.find((item) => item.id === 'alert_policy').notificationPolicy.recipientTiers[0].recipients[0].id;
    const response = await service.recordResponse({ alertId: 'alert_policy', recipientId: frozenRecipientId, response: 'all_clear', source: 'test' });
    assert.equal(response.status, 'all_clear');
    assert.equal(resolved, true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('email notifications use an alert-specific Reply-To address for automatic SES reply parsing', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-replyto-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      state.alerts.push({ id: 'alert_replyto', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'page unavailable', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: true });
    });
    let email;
    const providers = { async sendEmail(input) { email = input; return { providerId: 'email_replyto' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'https://login.staging.example.test', sesReplyDomain: 'reply.staging.example.test' }, logger });
    await service.queueTier('alert_replyto', 0);
    const state = await store.read();
    const notice = state.notifications[0];
    assert.equal(email.replyTo, `reply+${notice.responseCode}@reply.staging.example.test`);
    assert.equal(email.notificationId, notice.id);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('failed inbound reply processing is reclaimable and completed replies remain idempotent', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-inbound-replay-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const recipient = watcher.config.recipientTiers[0].recipients[0];
      state.alerts.push({ id: 'alert_inbound', accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, responses: [], newlyOpened: false });
      state.notifications.push({ id: 'notice_inbound', alertId: 'alert_inbound', watcherId: watcher.id, accountId: watcher.accountId, recipientId: recipient.id, channel: 'email', destination: recipient.destination, responseCode: 'WW42A7', responseExpiresAt: '2099-01-01T00:00:00.000Z', status: 'sent' });
    });
    const service = new NotificationService({ store, providers: {}, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010' }, logger });
    const original = service.recordResponse.bind(service);
    let calls = 0;
    service.recordResponse = async (input) => { calls += 1; if (calls === 1) throw new Error('transient consensus failure'); return original(input); };
    await assert.rejects(() => service.recordInboundReply({ channel: 'email', sender: 'demo@example.com', body: 'Alert Received\nCode: WW42A7', providerMessageId: 'ses-retry-1' }), /transient/);
    let state = await store.read();
    assert.equal(state.providerEvents.find((item) => item.id === 'inbound:email:ses-retry-1').status, 'failed');
    const accepted = await service.recordInboundReply({ channel: 'email', sender: 'demo@example.com', body: 'Alert Received\nCode: WW42A7', providerMessageId: 'ses-retry-1' });
    assert.equal(accepted.status, 'acknowledged');
    const duplicate = await service.recordInboundReply({ channel: 'email', sender: 'demo@example.com', body: 'Alert Received\nCode: WW42A7', providerMessageId: 'ses-retry-1' });
    assert.equal(duplicate.duplicate, true);
    state = await store.read();
    const event = state.providerEvents.find((item) => item.id === 'inbound:email:ses-retry-1');
    assert.equal(event.status, 'completed');
    assert.equal(event.attempts, 2);
    assert.equal(state.alerts.find((item) => item.id === 'alert_inbound').responses.length, 1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('temporary recipients apply only to an unactivated incident tier', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-temporary-recipients-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.config.recipientTiers.push({ id: 'tier_temp_two', name: 'Level 2', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_saved_two', name: 'Saved backup', channel: 'email', destination: 'saved@example.test', enabled: true }] });
      watcher.openAlertId = 'alert_temp_recipients';
      state.alerts.push({ id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: '2000-01-01T00:00:00.000Z', nextReAlertAt: null, escalationCompletedAt: null, notificationDelivery: { tierIndex: 0, round: 1, attemptedAt: '2020-01-01T00:00:00.000Z', attempted: 1, sent: 1, failed: 0 }, responses: [], newlyOpened: false });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: 'temporary_recipient_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    const activity = await service.replaceTierRecipients('acct_demo', stateWatcherId(await store.read()), 'tier_temp_two', [{ id: 'temp_rcpt_two', name: 'Incident backup', channel: 'email', destination: 'incident@example.test', enabled: true }], 0, { actorId: 'acct_demo', role: 'customer', requestId: 'req_temp' });
    assert.equal(activity.revision, 1);
    assert.equal(activity.tiers[1].isTemporary, true);
    await service.processTimers();
    const state = await store.read();
    assert.deepEqual(destinations, ['incident@example.test']);
    assert.equal(state.watchers[0].config.recipientTiers[1].recipients[0].destination, 'saved@example.test');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('muting a queued middle level skips directly to the next unmuted level', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-muted-tier-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.config.recipientTiers.push(
        { id: 'tier_muted_two', name: 'Level 2', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_muted_two', name: 'Muted backup', channel: 'email', destination: 'muted@example.test', enabled: true }] },
        { id: 'tier_live_three', name: 'Level 3', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_live_three', name: 'Live backup', channel: 'email', destination: 'level-three@example.test', enabled: true }] },
      );
      watcher.openAlertId = 'alert_muted_tier';
      state.alerts.push({ id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', currentTierIndex: 0, notificationRound: 1, nextEscalationAt: '2000-01-01T00:00:00.000Z', nextReAlertAt: null, escalationCompletedAt: null, notificationDelivery: { tierIndex: 0, round: 1, attemptedAt: '2020-01-01T00:00:00.000Z', attempted: 1, sent: 1, failed: 0 }, responses: [], newlyOpened: false });
    });
    const destinations = [];
    const providers = { async sendEmail(input) { destinations.push(input.to); return { providerId: 'unmuted_tier_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    const watcherId = stateWatcherId(await store.read());
    await service.setTierMuted('acct_demo', watcherId, 'tier_muted_two', true, 0, { actorId: 'acct_demo', role: 'customer', requestId: 'req_mute' });
    await service.processTimers();
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_muted_tier');
    assert.deepEqual(destinations, ['level-three@example.test']);
    assert.equal(alert.currentTierIndex, 2);
    assert.ok(alert.escalationCompletedAt);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('canceling notification activity invalidates queued sends and rejects further mutations', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-notice-cancel-activity-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      watcher.openAlertId = 'alert_cancel_activity';
      state.alerts.push({ id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, nextEscalationAt: null, nextReAlertAt: null, escalationCompletedAt: null, responses: [], newlyOpened: true });
    });
    let sends = 0;
    const providers = { async sendEmail() { sends += 1; return { providerId: 'unexpected_send' }; }, async sendSms() { throw new Error('not expected'); } };
    const service = new NotificationService({ store, providers, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    const watcherId = stateWatcherId(await store.read());
    const activity = await service.cancelActivity('acct_demo', watcherId, 0, { actorId: 'acct_demo', role: 'customer', requestId: 'req_cancel' });
    assert.equal(activity.active, false);
    assert.ok(activity.alert.canceledAt);
    await service.queueTier('alert_cancel_activity', 0);
    await service.processTimers();
    assert.equal(sends, 0);
    await assert.rejects(() => service.cancelActivity('acct_demo', watcherId, 0, { actorId: 'acct_demo', role: 'customer', requestId: 'req_stale' }), (error) => error.code === 'NOTIFICATION_ACTIVITY_CANCELED');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

function stateWatcherId(state) { return state.watchers[0].id; }
