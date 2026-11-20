import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { emptyState } from '../src/domain/defaults.mjs';
import { entitlements, PLAN_CATALOG_VERSION } from '../src/domain/plans.mjs';
import { CancellationService, cancellationPaymentPending } from '../src/billing/cancellation.mjs';
import { BillingService } from '../src/billing/service.mjs';
import { StripeBillingProvider } from '../src/billing/providers.mjs';
import { AccountService } from '../src/services/accounts.mjs';
import { NotificationService } from '../src/notifications/service.mjs';
import { createRouter, processStripeEvent } from '../src/api/routes.mjs';
import { enforceCustomerRate } from '../src/security/customer-rate.mjs';
const logger = { debug() {}, info() {}, warn() {}, error() {} };
const actor = { actorId: 'owner', role: 'customer', teamRole: 'owner' };
const config = { billingProvider: 'stripe', closureGraceDays: 30, stripePriceIds: { business: 'price_a' }, appEnv: 'test' };
const before = () => new Date(Date.now() - 86400_000).toISOString();
const after = () => new Date(Date.now() + 86400_000).toISOString();
class Store {
  constructor(state) { this.state = structuredClone(state); this.queue = Promise.resolve(); this.maxChanges = 0; }
  async read() { return structuredClone(this.state); }
  transact(label, fn) {
    const run = this.queue.then(async () => {
      const draft = structuredClone(this.state); const result = await fn(draft); let count = 0;
      for (const [key, rows] of Object.entries(draft)) if (Array.isArray(rows)) {
        const old = new Map((this.state[key] ?? []).map(row => [row.id, JSON.stringify(row)]));
        for (const row of rows) if (JSON.stringify(row) !== old.get(row.id)) count += 1;
      }
      this.maxChanges = Math.max(this.maxChanges, count); assert.ok(count <= 99, `${label} exceeded DynamoDB entity budget: ${count}`);
      this.state = draft; return structuredClone(result);
    }); this.queue = run.catch(() => {}); return run;
  }
}
function fixture(overrides = {}) {
  const state = emptyState();
  state.accounts.push({ id: 'acct_a', planId: 'business', planCatalogVersion: PLAN_CATALOG_VERSION, provider: 'stripe', providerCustomerId: 'cus_a', providerSubscriptionId: 'sub_a', billingStatus: 'active', closureStatus: 'active', currentPeriodStart: before(), currentPeriodEnd: after(), contactEmail: 'owner@example.test', ...overrides });
  state.teamMembers.push({ id: 'member_a', accountId: 'acct_a', userId: 'owner', role: 'owner', status: 'active' });
  const store = new Store(state);
  const sub = { id: 'sub_a', customer: 'cus_a', metadata: { accountId: 'acct_a' }, status: 'active', items: { data: [{ price: { id: 'price_a' }, current_period_end: Math.floor(Date.parse(after()) / 1000) }] } };
  const provider = {
    calls: 0, sub,
    async cancellationSubscriptions() { return [structuredClone(sub)]; },
    async cancelSubscription(input) { this.calls += 1; if (input.mode === 'immediate') sub.status = 'canceled'; else sub.cancel_at_period_end = true; return structuredClone(sub); },
    async retrieveSubscription() { return structuredClone(sub); },
  };
  const cancellations = new CancellationService({ store, provider, config, logger });
  const accounts = new AccountService({ store, config });
  return { store, provider, cancellations, accounts };
}
async function due(f) { await f.store.transact('due', s => { s.accounts[0].billingCancellation.nextAttemptAt = before(); }); }

test('renewal cancellation is durable/idempotent and keeps paid access until confirmed period end', async () => {
  const f = fixture(); const first = await f.cancellations.request('acct_a', actor);
  assert.equal(first.status, 'requested'); assert.equal(f.provider.calls, 0);
  assert.equal((await f.cancellations.request('acct_a', actor)).id, first.id);
  await Promise.all([f.cancellations.process('acct_a'), f.cancellations.process('acct_a')]);
  const a = (await f.store.read()).accounts[0]; assert.equal(a.billingCancellation.status, 'scheduled'); assert.equal(f.provider.calls, 1);
  assert.equal(entitlements(a).maxWatchers, 250);
  f.provider.sub.status = 'canceled'; await due(f); await f.cancellations.process('acct_a');
  assert.equal((await f.store.read()).accounts[0].billingCancellation.status, 'completed');
  assert.equal(entitlements((await f.store.read()).accounts[0]).billingRestricted, true);
});

test('500-watcher closure/reopening uses bounded batches and never restarts Stripe billing', async () => {
  const f = fixture(); await f.store.transact('seed-watchers', s => {});
  // Fixtures may exceed one transaction; production creation remains per watcher.
  for (let i = 0; i < 500; i++) f.store.state.watchers.push({ id: `watch_${i}`, accountId: 'acct_a', status: i % 2 ? 'paused' : 'active' });
  for (let i = 0; i < 120; i++) f.store.state.alerts.push({ id: `alert_${i}`, accountId: 'acct_a', status: 'open', nextEscalationAt: after() });
  await f.accounts.scheduleClosure('acct_a', 'owner request', actor);
  assert.equal(f.store.state.accounts[0].closureStatus, 'scheduled'); assert.ok(f.store.state.accounts[0].closureWork);
  await f.accounts.processClosureTransitions(); await f.accounts.processClosureTransitions();
  assert.ok(f.store.state.watchers.every(w => w.status === 'account_paused'));
  await f.cancellations.process('acct_a'); assert.equal(f.provider.sub.status, 'canceled');
  const calls = f.provider.calls; await f.accounts.cancelClosure('acct_a', 'restore records', actor);
  await f.accounts.processClosureTransitions(); await f.accounts.processClosureTransitions();
  assert.equal(f.store.state.watchers[0].status, 'active'); assert.equal(f.store.state.watchers[1].status, 'paused');
  assert.equal(f.provider.calls, calls); assert.equal(entitlements(f.store.state.accounts[0]).billingRestricted, true);
  assert.ok(f.store.maxChanges <= 43);
});

test('legacy and overdue customers can cancel even with exhausted API mutation quotas', async () => {
  const f = fixture({ planId: 'daily', planCatalogVersion: null, billingStatus: 'past_due' });
  await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a');
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'scheduled');
  const scopes = []; await enforceCustomerRate({ async consumeRateLimit(scope) { scopes.push(scope); if (scope !== 'customer-cancellation') throw Error('exhausted'); } }, { accountId: 'acct_a' }, 'POST', '/api/billing/cancel');
  assert.deepEqual(scopes, ['customer-cancellation']);
});

test('provider interruption retries persisted intent without falsely confirming cancellation', async () => {
  const f = fixture(); const original = f.provider.cancelSubscription;
  f.provider.cancelSubscription = async () => { throw Error('timeout'); };
  await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a');
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'retry_scheduled');
  assert.equal(f.store.state.accounts[0].billingCancellation.confirmedAt, undefined);
  f.provider.cancelSubscription = original; await due(f); await f.cancellations.process('acct_a');
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'scheduled');
});

test('terminal cancellation survives an older active subscription webhook', async () => {
  const f = fixture(); const event = (type, status, created) => ({ id: `${type}_${created}`, created, type, data: { object: { ...f.provider.sub, status } } });
  await processStripeEvent(event('customer.subscription.deleted', 'canceled', 200), f.store, logger, config);
  await processStripeEvent(event('customer.subscription.updated', 'active', 100), f.store, logger, config);
  assert.equal(f.store.state.accounts[0].billingStatus, 'canceled');
  assert.equal(f.store.state.accounts[0].terminalSubscriptionId, 'sub_a');
});

test('updated webhook retrieves current provider status instead of replaying a stale snapshot', async () => {
  const f = fixture(); f.provider.sub.status = 'unpaid';
  await processStripeEvent({ type: 'customer.subscription.updated', data: { object: { ...f.provider.sub, status: 'active' } } }, f.store, logger, config, { provider: f.provider });
  assert.equal(f.store.state.accounts[0].billingStatus, 'unpaid');
});

test('closure expires open Checkout and settles an already-paid racing session without granting access', async () => {
  const f = fixture(); f.store.state.accounts[0].providerSubscriptionId = null;
  f.store.state.transactions.push({ id: 'txn_a', accountId: 'acct_a', type: 'subscription_start', providerCheckoutId: 'cs_a', status: 'pending_checkout', amountMinor: 39900, currency: 'USD' });
  const session = { checkoutId: 'cs_a', status: 'open', mode: 'subscription', metadataAccountId: 'acct_a', metadataTransactionId: 'txn_a', customerId: 'cus_a', amountMinor: 39900, currency: 'USD' };
  f.provider.retrieveCheckout = async () => structuredClone(session);
  f.provider.expireCheckout = async () => { Object.assign(session, { status: 'complete', paymentStatus: 'paid', subscriptionId: 'sub_a', metadataSubscriptionAccountId: 'acct_a', providerPaymentId: 'pi_a', providerInvoiceId: 'in_a' }); };
  await f.accounts.scheduleClosure('acct_a', 'close', actor); await f.cancellations.process('acct_a');
  assert.equal(f.provider.sub.status, 'canceled'); assert.equal(f.store.state.transactions[0].status, 'completed');
  assert.equal(f.store.state.transactions[0].providerPaymentId, 'pi_a'); assert.equal(f.store.state.accounts[0].closureStatus, 'scheduled');
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'completed');
});

test('an unbound timed-out Checkout is recovered with its original idempotent request, then expired', async () => {
  const f = fixture({ providerSubscriptionId: null }); const request = { idempotencyKey: 'checkout:txn_a', planId: 'business' };
  f.store.state.transactions.push({ id: 'txn_a', accountId: 'acct_a', type: 'subscription_start', status: 'failed', outcomeReason: 'STRIPE_NETWORK_ERROR', createdAt: new Date().toISOString(), checkoutRequest: request });
  let status = 'open'; f.provider.createCheckout = async input => { assert.deepEqual(input, request); return { checkoutId: 'cs_a', customerId: 'cus_a' }; };
  f.provider.retrieveCheckout = async () => ({ checkoutId: 'cs_a', status, mode: 'subscription', metadataAccountId: 'acct_a', metadataTransactionId: 'txn_a', customerId: 'cus_a' });
  f.provider.expireCheckout = async () => { status = 'expired'; }; f.provider.cancellationSubscriptions = async () => [];
  await f.accounts.scheduleClosure('acct_a', 'close', actor); await f.cancellations.process('acct_a');
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'completed'); assert.equal(status, 'expired');
});

test('expired idempotency recovery does not create another Checkout session', async () => {
  const f = fixture(); let creates = 0; f.provider.createCheckout = async () => { creates++; };
  f.store.state.transactions.push({ id: 'txn_a', accountId: 'acct_a', type: 'subscription_start', status: 'pending_checkout', createdAt: '2020-01-01T00:00:00Z', checkoutRequest: {} });
  await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a');
  assert.equal(creates, 0); assert.equal(f.store.state.accounts[0].billingCancellation.status, 'retry_scheduled');
});

test('stale worker lease recovers after provider cancellation succeeded before local commit', async () => {
  const f = fixture(); await f.cancellations.request('acct_a', actor); f.provider.sub.cancel_at_period_end = true;
  Object.assign(f.store.state.accounts[0].billingCancellation, { status: 'processing', leaseToken: 'dead', leaseUntil: before() });
  await f.cancellations.process('acct_a'); assert.equal(f.store.state.accounts[0].billingCancellation.status, 'scheduled');
});

test('unresolved billing holds erasure while completed cancellation remains confirmed', async () => {
  const f = fixture(); f.store.state.transactions.push({ id: 'txn_a', accountId: 'acct_a', type: 'plan_change', status: 'reconciliation_required', providerInvoiceId: 'in_a', amountMinor: 39900, currency: 'USD' });
  await f.accounts.scheduleClosure('acct_a', 'close', actor); await f.cancellations.process('acct_a'); f.store.state.accounts[0].deleteAfter = before();
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'completed'); assert.deepEqual(await f.accounts.purgeDue(), []);
  assert.equal(f.store.state.accounts[0].purgeBlockedReason, 'billing_reconciliation_pending');
  f.provider.retrieveCancellationInvoice = async () => ({ status: 'paid', amountMinor: 39900, currency: 'USD', providerPaymentId: 'pi_a' });
  await f.cancellations.reconcileCompletedFinancial('acct_a'); assert.equal(f.store.state.transactions[0].status, 'completed');
  assert.equal(f.store.state.accounts[0].billingCancellation.financialReview, false);
});

test('operational confirmation bypasses exhausted monitoring email limits and is not duplicated', async () => {
  const f = fixture(); let sends = 0;
  f.cancellations.notifier = new NotificationService({ store: f.store, logger, config: { emailProvider: 'ses' }, providers: { async sendEmail() { sends++; return { providerId: 'ses_a' }; } } });
  f.store.state.idempotency.push({ id: 'budget', key: 'exhausted', attempts: 999999 });
  await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a');
  await Promise.all([f.cancellations.sendNotice('acct_a'), f.cancellations.sendNotice('acct_a')]);
  assert.equal(sends, 1); assert.equal(f.store.state.accounts[0].billingCancellation.notice.status, 'accepted');
});

test('ambiguous confirmation email does not cause resend or undo provider cancellation', async () => {
  const f = fixture(); let sends = 0; f.cancellations.notifier = { async sendBillingCancellation() { sends++; throw Error('network'); } };
  await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a'); await f.cancellations.sendNotice('acct_a'); await f.cancellations.sendNotice('acct_a');
  assert.equal(sends, 1); assert.equal(f.store.state.accounts[0].billingCancellation.notice.status, 'ambiguous'); assert.equal(f.store.state.accounts[0].billingCancellation.status, 'scheduled');
});

test('Stripe cancellation binds the exact customer and supports legacy prices without a catalog lookup', async () => {
  const p = new StripeBillingProvider({ stripeSecretKey: 'test' }); const sub = { id: 'sub_a', customer: 'cus_a', metadata: {}, status: 'past_due', items: { data: [{ current_period_end: Math.floor(Date.parse(after()) / 1000) }] } }; let deletes = 0;
  p.request = async (method, path, body) => { if (method === 'DELETE') { deletes++; assert.deepEqual(body, { prorate: 'false', invoice_now: 'false' }); sub.status = 'canceled'; } return structuredClone(sub); };
  await assert.rejects(() => p.cancelSubscription({ accountId: 'acct_a', providerCustomerId: 'cus_other', subscriptionId: 'sub_a', mode: 'immediate', allowLegacyBinding: true }), e => e.code === 'CUSTOMER_BINDING_FAILED');
  assert.equal(deletes, 0); await p.cancelSubscription({ accountId: 'acct_a', providerCustomerId: 'cus_a', subscriptionId: 'sub_a', mode: 'immediate', allowLegacyBinding: true }); assert.equal(deletes, 1);
});

test('scheduled Stripe cancellation is confirmed by readback and releases future schedule phases', async () => {
  const p = new StripeBillingProvider({ stripeSecretKey: 'test' }); const sub = { id: 'sub_a', customer: 'cus_a', metadata: { accountId: 'acct_a' }, schedule: 'sched_a', status: 'active', items: { data: [{ current_period_end: Math.floor(Date.parse(after()) / 1000) }] } }; const calls = [];
  p.request = async (method, path, body, key) => { calls.push({ method, path, key }); if (path.endsWith('/release')) { sub.schedule = null; return { released_subscription: 'sub_a' }; } if (method === 'POST') sub.cancel_at_period_end = true; return structuredClone(sub); };
  const result = await p.cancelSubscription({ accountId: 'acct_a', providerCustomerId: 'cus_a', subscriptionId: 'sub_a', mode: 'period_end', idempotencyKey: 'cancel_a' });
  assert.equal(result.cancel_at_period_end, true); assert.equal(calls.at(-1).method, 'GET'); assert.ok(calls.some(c => c.path.endsWith('/release')));
});

test('cancellation fences new plan changes and manual payment retries', async () => {
  const f = fixture(); const billing = new BillingService({ ...f, config, logger }); await f.cancellations.request('acct_a', actor);
  await assert.rejects(() => billing.quotePlanChange('acct_a', 'team'), e => e.code === 'BILLING_CANCELLATION_PENDING');
  f.store.state.transactions.push({ id: 'txn_a', accountId: 'acct_a', status: 'failed', type: 'subscription_renewal' });
  await assert.rejects(() => billing.retry('txn_a', actor), e => e.code === 'BILLING_CANCELLATION_PENDING');
});

test('only the verified owner can cancel or see status after closure, with tenant derived server-side', async () => {
  const f = fixture(); f.store.state.teamMembers.push({ id: 'member_b', accountId: 'acct_a', userId: 'member', status: 'active', role: 'member' });
  const billing = new BillingService({ ...f, config, logger }); const router = createRouter({ ...f, billing, config, logger });
  const call = async (path, who, method = 'GET') => {
    const req = Readable.from([]); req.method = method; req.headers = {}; const res = { statusCode: null, writeHead(n) { this.statusCode = n; }, end(body) { this.body = JSON.parse(body); } };
    await router(req, res, new URL(`http://localhost${path}`), { actorId: who, role: 'customer', email: `${who}@example.test` }); return res;
  };
  await assert.rejects(() => call('/api/billing/cancel', 'member', 'POST'), e => e.statusCode === 403);
  const requested = await call('/api/billing/cancel', 'owner', 'POST'); assert.equal(requested.statusCode, 202);
  await f.accounts.scheduleClosure('acct_a', 'close', actor);
  const status = await call('/api/billing/cancellation', 'owner'); assert.equal(status.body.closureStatus, 'scheduled');
  assert.equal(status.body.cancellation.mode, 'immediate'); assert.equal(status.body.providerCustomerId, undefined);
  await assert.rejects(() => call('/api/billing/cancellation', 'member'), e => e.statusCode === 403);
});

test('an already claimed renewal retry can settle after cancellation without restoring paid access', async () => {
  const { calculationEnvelope } = await import('../src/billing/safety.mjs');
  const f = fixture({ country: 'US', region: 'NY', postalCode: '10001' }); const cfg = { ...config, integritySecret: 'x'.repeat(32), billingCurrency: 'USD' };
  const data = { accountId: 'acct_a', transactionId: 'retry_a', operation: 'subscription_renewal', planId: 'business', amountMinor: 39900, currency: 'USD', providerCustomerId: 'cus_a' };
  f.store.state.transactions.push({ id: 'retry_a', ...data, type: 'subscription_renewal', status: 'failed', retryCount: 0, createdAt: before(), envelope: calculationEnvelope(data, cfg.integritySecret), periodStart: before(), periodEnd: after() });
  f.provider.retry = async input => {
    await f.accounts.scheduleClosure('acct_a', 'close during payment', actor);
    await f.cancellations.process('acct_a');
    return { status: 'completed', amountMinor: input.amountMinor, currency: input.currency, metadataAccountId: 'acct_a', customerId: 'cus_a', providerPaymentId: 'pi_a', periodStart: before(), periodEnd: after() };
  };
  const billing = new BillingService({ ...f, config: cfg, logger }); const result = await billing.retry('retry_a', actor);
  assert.equal(result.status, 'completed'); assert.equal(f.store.state.accounts[0].billingStatus, 'canceled');
  assert.equal(f.store.state.accounts[0].billingCancellation.mode, 'immediate'); assert.equal(entitlements(f.store.state.accounts[0]).billingRestricted, true);
});

test('known renewal stops even when an old unbound Checkout needs manual investigation', async () => {
  const f = fixture(); f.store.state.transactions.push({ id: 'old', accountId: 'acct_a', type: 'subscription_start', status: 'pending_checkout', createdAt: '2020-01-01T00:00:00Z' });
  await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a');
  assert.equal(f.provider.sub.cancel_at_period_end, true); assert.equal(f.store.state.accounts[0].billingCancellation.status, 'retry_scheduled');
});

test('retry exhaustion triggers operational attention and supports an audited staff retry', async () => {
  const f = fixture(); await f.cancellations.request('acct_a', actor); f.provider.cancelSubscription = async () => { throw Error('outage'); };
  for (let i=0;i<8;i++) { await due(f); await f.cancellations.process('acct_a'); }
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'attention');
  await assert.rejects(()=>f.cancellations.processDue(),e=>e.code==='CANCELLATION_ATTENTION_REQUIRED');
  await f.cancellations.retry('acct_a',{actorId:'support',role:'steward'},'Provider recovered');
  assert.equal(f.store.state.accounts[0].billingCancellation.status, 'requested');
});

test('paid plan-change reconciliation during cancellation records money without applying plan changes', async () => {
  const { calculationEnvelope } = await import('../src/billing/safety.mjs');
  const f = fixture({ country: 'US', region: 'NY', postalCode: '10001' }); const cfg = { ...config, integritySecret: 'x'.repeat(32), billingCurrency: 'USD' };
  const data = { accountId: 'acct_a', transactionId: 'old_change', operation: 'plan_change', planId: 'team', amountMinor: 1000, currency: 'USD', providerCustomerId: 'cus_a' };
  f.store.state.transactions.push({ id: 'old_change', ...data, type: 'plan_change', status: 'payment_required', createdAt: before(), envelope: calculationEnvelope(data, cfg.integritySecret) });
  f.provider.retrievePlanChangeState = async () => {
    await f.cancellations.request('acct_a', actor);
    return { subscriptionId: 'sub_a', customerId: 'cus_a', metadataAccountId: 'acct_a', result: { status: 'completed', amountMinor: 1000, currency: 'USD', metadataAccountId: 'acct_a', customerId: 'cus_a', providerInvoiceId: 'in_a', providerPaymentId: 'pi_a', periodStart: before(), periodEnd: after() } };
  };
  const billing = new BillingService({ ...f, config: cfg, logger });
  await assert.rejects(()=>billing.changePlan('acct_a', 'professional', actor), e=>e.code==='BILLING_CANCELLATION_PENDING');
  assert.equal(f.store.state.transactions[0].status, 'completed'); assert.equal(f.store.state.accounts[0].planId, 'business');
});

test('accepted notices do not starve a later pending cancellation confirmation', async () => {
  const f = fixture(); await f.cancellations.request('acct_a', actor); await f.cancellations.process('acct_a');
  for(let i=0;i<16;i++)f.store.state.accounts.unshift({id:`old_${i}`,billingCancellation:{id:`cancel_${i}`,status:'completed',notice:{status:'accepted'}}});
  let sends=0;f.cancellations.notifier={async sendBillingCancellation(){sends++;return {deliveryState:'accepted'};}};
  await f.cancellations.processDue(); assert.equal(sends,1);
});

test('Checkout binding failure preserves the provider session for cancellation', async () => {
  const f = fixture({ providerSubscriptionId: null, country: 'US', region: 'NY', postalCode: '10001' });
  f.provider.createCheckout = async () => ({ checkoutId: 'cs_recovered', customerId: 'cus_a', url: 'https://checkout.stripe.com/c/pay/cs_recovered' });
  const transact = f.store.transact.bind(f.store);
  f.store.transact = (label, fn) => label === 'billing.checkout.bound' ? Promise.reject(Error('local commit unavailable')) : transact(label, fn);
  const billing = new BillingService({ ...f, config: { ...config, integritySecret: 'x'.repeat(32), billingCurrency: 'USD' }, logger });
  await assert.rejects(() => billing.createCheckout('acct_a', 'essentials', actor, { successUrl: 'https://example.test/ok', cancelUrl: 'https://example.test/cancel' }), /local commit unavailable/);
  assert.equal(f.store.state.transactions[0].providerCheckoutId, 'cs_recovered');
  assert.equal(f.store.state.transactions[0].status, 'reconciliation_required');
});

test('unresolved invoices rotate so later cancellation payments can reconcile', async () => {
  const f = fixture();
  for (let i=0;i<6;i++) f.store.state.transactions.push({ id:`pay_${i}`, accountId:'acct_a', type:'renewal', status:'payment_required', providerInvoiceId:`in_${i}`, amountMinor:100, currency:'USD' });
  f.provider.retrieveCancellationInvoice = async ({ invoiceId }) => ({ status: invoiceId === 'in_5' ? 'paid' : 'open', amountMinor:100, currency:'USD' });
  await f.cancellations.request('acct_a', actor);
  await f.cancellations.process('acct_a');
  await f.cancellations.reconcileCompletedFinancial('acct_a');
  assert.equal(f.store.state.transactions.find(t=>t.id==='pay_5').status,'completed');
  assert.equal(f.store.state.accounts[0].billingCancellation.financialReview,true);
});

test('a slow cancellation pass leaves later work for another maintenance tick', async () => {
  const f = fixture(); await f.cancellations.request('acct_a', actor);
  f.store.state.accounts.push({ ...structuredClone(f.store.state.accounts[0]), id:'acct_b' });
  const originalNow = Date.now; let clock=originalNow(); let calls=0;
  try {
    Date.now=()=>clock;
    f.cancellations.process=async()=>{ calls++; clock+=61_000; };
    await f.cancellations.processDue();
    assert.equal(calls,1);
  } finally { Date.now=originalNow; }
});

test('a failed payment with a live invoice remains unresolved until provider confirmation', async () => {
  const f = fixture();
  f.store.state.transactions.push({id:'old_failed',accountId:'acct_a',type:'plan_change',status:'failed',providerInvoiceId:'in_failed',amountMinor:100,currency:'USD'});
  f.provider.retrieveCancellationInvoice=async()=>({status:'open',amountMinor:100,currency:'USD'});
  await f.cancellations.request('acct_a',actor); await f.cancellations.process('acct_a');
  assert.equal(f.store.state.accounts[0].billingCancellation.financialReview,true);
  assert.equal(cancellationPaymentPending(f.store.state.transactions[0]),true);
  f.provider.retrieveCancellationInvoice=async()=>({status:'void',amountMinor:100,currency:'USD'});
  await f.cancellations.reconcileCompletedFinancial('acct_a');
  assert.equal(f.store.state.transactions[0].cancellationInvoiceStatus,'void');
  assert.equal(cancellationPaymentPending(f.store.state.transactions[0]),false);
  assert.equal(f.store.state.accounts[0].billingCancellation.financialReview,false);
});

test('late paid renewal webhooks settle the ledger without extending canceled access or resetting credits', async () => {
  const f=fixture({captureCreditsUsed:123});
  const account=f.store.state.accounts[0]; const periodEnd=account.currentPeriodEnd;
  await f.cancellations.request('acct_a',actor);
  const start=Math.floor(Date.now()/1000), end=start+31*86400;
  await processStripeEvent({id:'evt_late_paid',type:'invoice.payment_succeeded',data:{object:{id:'in_late_paid',customer:'cus_a',currency:'usd',subtotal:39900,total:39900,billing_reason:'subscription_cycle',status:'paid',parent:{subscription_details:{subscription:'sub_a',metadata:{accountId:'acct_a'}}},lines:{data:[{type:'subscription',period:{start,end}}]}}}},f.store,logger,config);
  assert.equal(f.store.state.transactions[0].status,'completed');
  assert.equal(f.store.state.accounts[0].captureCreditsUsed,123);
  assert.equal(f.store.state.accounts[0].currentPeriodEnd,periodEnd);
  assert.equal(f.store.state.accounts[0].billingCancellation.status,'requested');
});

test('closure preserves an uncertain plan change until its missing invoice is recovered', async () => {
  const f=fixture();
  f.store.state.transactions.push({id:'unknown_change',accountId:'acct_a',type:'plan_change',planId:'team',status:'retry_scheduled',outcomeReason:'STRIPE_NETWORK_ERROR',amountMinor:100,currency:'USD'});
  f.provider.retrievePlanChangeState=async()=>({subscriptionId:'sub_a',customerId:'cus_a',metadataAccountId:'acct_a',result:{providerInvoiceId:'in_recovered'}});
  f.provider.retrieveCancellationInvoice=async()=>({status:'open',amountMinor:100,currency:'USD'});
  await f.accounts.scheduleClosure('acct_a','owner closure',actor);
  assert.equal(f.store.state.transactions[0].status,'reconciliation_required');
  assert.equal(f.store.state.transactions[0].cancellationPreviousOutcomeReason,'STRIPE_NETWORK_ERROR');
  await f.cancellations.process('acct_a');
  assert.equal(f.store.state.transactions[0].providerInvoiceId,'in_recovered');
  assert.equal(cancellationPaymentPending(f.store.state.transactions[0]),true);
  assert.equal(f.store.state.accounts[0].billingCancellation.financialReview,true);
});
