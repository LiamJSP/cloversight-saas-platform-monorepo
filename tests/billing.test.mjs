import test from 'node:test';import assert from 'node:assert/strict';import { priceForPlan,proratedPlanChange,calculationEnvelope,verifyEnvelope,assertProviderBinding,assertRetryAllowed } from '../src/billing/safety.mjs';
test('prices are integer minor units from the server catalogue',()=>assert.deepEqual(priceForPlan('professional'),{amountMinor:4900,currency:'USD'}));
test('mid-period upgrade applies unused current-plan credit',()=>{const r=proratedPlanChange({currentPlanId:'professional',newPlanId:'team',periodStart:'2026-07-01T00:00:00Z',periodEnd:'2026-07-31T00:00:00Z',now:'2026-07-16T00:00:00Z'});assert.equal(r.unusedCreditMinor,2450);assert.equal(r.amountDueMinor,12450)});
test('signed calculation detects tampering',()=>{const secret='x'.repeat(32);const env=calculationEnvelope({accountId:'a',transactionId:'t',operation:'plan_change',planId:'essentials',amountMinor:1900,currency:'USD',providerCustomerId:'cus'},secret);assert.equal(verifyEnvelope(env,secret).amountMinor,1900);assert.throws(()=>verifyEnvelope({...env,canonical:env.canonical.replace('1900','19000')},secret))});
test('provider binding rejects wrong customer and amount',()=>{const e={accountId:'a',providerCustomerId:'cus_a',amountMinor:1900,currency:'USD'};assert.throws(()=>assertProviderBinding(e,{metadataAccountId:'b',customerId:'cus_a',amountMinor:1900,currency:'USD'}));assert.throws(()=>assertProviderBinding(e,{metadataAccountId:'a',customerId:'cus_b',amountMinor:1900,currency:'USD'}));assert.throws(()=>assertProviderBinding(e,{metadataAccountId:'a',customerId:'cus_a',amountMinor:19000,currency:'USD'}))});
test('retry hard-stops after 60 days',()=>assert.throws(()=>assertRetryAllowed({status:'failed',retryCount:0,retryMode:'manual',createdAt:'2020-01-01T00:00:00Z'},new Date('2026-01-01'))));

import { BillingService } from '../src/billing/service.mjs';
import { LocalBillingProvider } from '../src/billing/providers.mjs';
import { emptyState } from '../src/domain/defaults.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, mutate) { const result = await mutate(this.state); this.state.revision += 1; return structuredClone(result); }
}
const logger = { debug() {}, info() {}, warn() {}, error() {} };
function accountState() {
  // Keep service-level billing fixtures inside a live period so these tests do not
  // expire as wall-clock time advances. Exact proration arithmetic is covered by
  // the fixed-date unit test above; these cases exercise transaction semantics.
  const now = Date.now();
  const periodStart = new Date(now - 15 * 86400_000).toISOString();
  const periodEnd = new Date(now + 15 * 86400_000).toISOString();
  const state = emptyState(periodStart);
  state.accounts.push({ id: 'acct_a', legalName: 'A', contactEmail: 'a@example.com', country: 'CA', region: 'NS', postalCode: 'B3H1A1', profileComplete: true, planId: 'professional', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, providerCustomerId: 'cus_a', providerSubscriptionId: 'sub_a', closureStatus: 'active', createdAt: periodStart, updatedAt: periodStart });
  return state;
}
const billingConfig = { billingCurrency: 'USD', billingProvider: 'local', integritySecret: 'test-integrity-secret-at-least-32-chars' };

test('declined plan change is terminal and never changes the account plan', async () => {
  const store = new MemoryStore(accountState());
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  const result = await service.changePlan('acct_a', 'team', { actorId: 'acct_a', role: 'customer', requestId: 'req_decline' }, { simulateDecline: true });
  const state = await store.read();
  assert.equal(result.status, 'failed');
  assert.equal(state.accounts[0].planId, 'professional');
  assert.equal(state.transactions[0].status, 'failed');
  assert.equal(state.transactions[0].outcomeReason, 'declined');
  assert.equal(state.transactions[0].automaticRetryAt, null);
});

test('failed automatic retry becomes terminal and cannot loop', async () => {
  const state = accountState();
  const envelope = calculationEnvelope({ accountId: 'acct_a', transactionId: 'txn_retry', operation: 'plan_change', planId: 'team', amountMinor: 12450, currency: 'USD', providerCustomerId: 'cus_a' }, billingConfig.integritySecret);
  state.transactions.push({ id: 'txn_retry', accountId: 'acct_a', type: 'plan_change', planId: 'team', amountMinor: 12450, currency: 'USD', providerCustomerId: 'cus_a', status: 'retry_scheduled', retryCount: 0, retryMode: null, automaticRetryAt: '2026-07-01T00:00:00.000Z', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), envelope });
  const store = new MemoryStore(state);
  let attempts = 0;
  const provider = { async retry() { attempts += 1; throw Object.assign(new Error('declined'), { declineCode: 'do_not_honor' }); } };
  const service = new BillingService({ store, provider, config: billingConfig, logger });
  await assert.rejects(() => service.retry('txn_retry', { actorId: 'system', role: 'system', requestId: 'auto' }, 'automatic'));
  const after = await store.read();
  assert.equal(attempts, 1);
  assert.equal(after.transactions[0].status, 'failed');
  assert.equal(after.transactions[0].retryCount, 1);
  assert.equal(after.transactions[0].automaticRetryAt, null);
});


test('successful plan-change retry applies the new plan exactly once', async () => {
  const state = accountState();
  const envelope = calculationEnvelope({ accountId: 'acct_a', transactionId: 'txn_retry_success', operation: 'plan_change', planId: 'team', amountMinor: 12450, currency: 'USD', providerCustomerId: 'cus_a' }, billingConfig.integritySecret);
  state.transactions.push({ id: 'txn_retry_success', accountId: 'acct_a', type: 'plan_change', planId: 'team', amountMinor: 12450, currency: 'USD', providerCustomerId: 'cus_a', status: 'failed', retryCount: 0, retryMode: null, automaticRetryAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), envelope });
  const store = new MemoryStore(state);
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  await service.retry('txn_retry_success', { actorId: 'staff_a', role: 'steward', requestId: 'req_retry', reason: 'Customer approved retry.' }, 'manual');
  const after = await store.read();
  assert.equal(after.accounts[0].planId, 'team');
  assert.equal(after.transactions[0].status, 'completed');
  assert.equal(after.transactions[0].retryCount, 1);
  assert.equal(after.auditEvents.at(-1).reason, 'Customer approved retry.');
});

test('selecting the current plan is rejected and creates no transaction', async () => {
  const store = new MemoryStore(accountState());
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  await assert.rejects(
    () => service.changePlan('acct_a', 'professional', { actorId: 'acct_a', role: 'customer', requestId: 'same-plan' }),
    (error) => error.statusCode === 409 && error.code === 'ALREADY_SUBSCRIBED_TO_PLAN' && error.message === 'You are already subscribed to this plan.',
  );
  assert.equal((await store.read()).transactions.length, 0);
});

test('retired subscriptions require an assisted currency and Price migration', async () => {
  const state = accountState();
  state.accounts[0].planId = 'priority';
  const store = new MemoryStore(state);
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  await assert.rejects(
    () => service.changePlan('acct_a', 'professional', { actorId: 'acct_a', role: 'customer', requestId: 'legacy-migration' }),
    (error) => error.statusCode === 409 && error.code === 'LEGACY_PLAN_MIGRATION_REQUIRED',
  );
  assert.equal((await store.read()).transactions.length, 0);
});

test('a pre-marker CAD Essentials subscription cannot enter the USD self-serve change path', async () => {
  const state = accountState();
  state.accounts[0].planId = 'essentials';
  delete state.accounts[0].planCatalogVersion;
  const store = new MemoryStore(state);
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  await assert.rejects(
    () => service.changePlan('acct_a', 'professional', { actorId: 'acct_a', role: 'customer', requestId: 'legacy-essentials-migration' }),
    (error) => error.statusCode === 409 && error.code === 'LEGACY_PLAN_MIGRATION_REQUIRED',
  );
  assert.equal((await store.read()).transactions.length, 0);
});

test('successful Checkout return can reconcile a delayed or missing webhook', async () => {
  const state = accountState();
  state.accounts[0].planId = 'free';
  state.accounts[0].providerSubscriptionId = null;
  state.transactions.push({ id: 'txn_checkout', accountId: 'acct_a', type: 'subscription_start', planId: 'essentials', amountMinor: 1900, taxMinor: null, currency: 'USD', status: 'pending_checkout', providerCustomerId: 'cus_a', providerCheckoutId: 'cs_test_return', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const provider = { async retrieveCheckout(){return {checkoutId:'cs_test_return',status:'complete',paymentStatus:'paid',mode:'subscription',amountMinor:1900,taxMinor:247,currency:'USD',customerId:'cus_a',subscriptionId:'sub_new',subscriptionStatus:'active',subscriptionItemCount:1,subscriptionPlanId:'essentials',providerPaymentId:'pi_new',metadataAccountId:'acct_a',metadataTransactionId:'txn_checkout',metadataSubscriptionAccountId:'acct_a',metadataSubscriptionTransactionId:'txn_checkout',periodStart:new Date(Date.now()-86400_000).toISOString(),periodEnd:new Date(Date.now()+29*86400_000).toISOString()}} };
  const store = new MemoryStore(state);
  const service = new BillingService({ store, provider, config: billingConfig, logger });
  const result = await service.reconcileCheckout('acct_a', 'cs_test_return', { actorId:'acct_a', role:'customer', requestId:'checkout-return' });
  const after = await store.read();
  assert.equal(result.status, 'completed');
  assert.equal(after.accounts[0].planId, 'essentials');
  assert.equal(after.accounts[0].providerSubscriptionId, 'sub_new');
  assert.equal(after.transactions[0].status, 'completed');
});

test('Billing repairs a completed Checkout transaction whose account commit was lost', async () => {
  const state = accountState();
  state.accounts[0].planId = 'free';
  state.accounts[0].providerSubscriptionId = null;
  state.transactions.push({ id: 'txn_checkout_committed', accountId: 'acct_a', type: 'subscription_start', planId: 'essentials', amountMinor: 1900, taxMinor: 247, currency: 'USD', status: 'completed', providerCustomerId: 'cus_a', providerCheckoutId: 'cs_test_committed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const provider = { async retrieveCheckout(){return {checkoutId:'cs_test_committed',status:'complete',paymentStatus:'paid',mode:'subscription',amountMinor:1900,taxMinor:247,currency:'USD',customerId:'cus_a',subscriptionId:'sub_recovered',subscriptionStatus:'active',subscriptionItemCount:1,subscriptionPlanId:'essentials',providerPaymentId:'pi_recovered',metadataAccountId:'acct_a',metadataTransactionId:'txn_checkout_committed',metadataSubscriptionAccountId:'acct_a',metadataSubscriptionTransactionId:'txn_checkout_committed',periodStart:new Date(Date.now()-86400_000).toISOString(),periodEnd:new Date(Date.now()+29*86400_000).toISOString()}} };
  const store = new MemoryStore(state);
  const service = new BillingService({ store, provider, config: billingConfig, logger });
  const result = await service.reconcileCheckout('acct_a', null, { actorId:'acct_a', role:'customer', requestId:'repair-completed-checkout' });
  const after = await store.read();
  assert.equal(result.status, 'completed');
  assert.equal(after.accounts[0].planId, 'essentials');
  assert.equal(after.accounts[0].providerSubscriptionId, 'sub_recovered');
});

test('Checkout reconciliation rejects a different subscription Price, item count, or transaction metadata', async () => {
  for (const wrong of [
    { subscriptionPlanId: 'professional' },
    { subscriptionItemCount: 2 },
    { metadataSubscriptionTransactionId: 'txn_other' },
  ]) {
    const state = accountState();
    state.accounts[0].planId = 'free';
    state.accounts[0].providerSubscriptionId = null;
    state.transactions.push({ id: 'txn_checkout', accountId: 'acct_a', type: 'subscription_start', planId: 'essentials', amountMinor: 1900, currency: 'USD', status: 'pending_checkout', providerCustomerId: 'cus_a', providerCheckoutId: 'cs_test_bound' });
    const store = new MemoryStore(state);
    const provider = { async retrieveCheckout() { return {
      checkoutId: 'cs_test_bound', status: 'complete', paymentStatus: 'paid', mode: 'subscription', amountMinor: 1900,
      currency: 'USD', customerId: 'cus_a', subscriptionId: 'sub_new', subscriptionStatus: 'active',
      subscriptionItemCount: 1, subscriptionPlanId: 'essentials', metadataAccountId: 'acct_a',
      metadataTransactionId: 'txn_checkout', metadataSubscriptionAccountId: 'acct_a',
      metadataSubscriptionTransactionId: 'txn_checkout', periodStart: new Date(Date.now() - 86400_000).toISOString(),
      periodEnd: new Date(Date.now() + 29 * 86400_000).toISOString(), ...wrong,
    }; } };
    const service = new BillingService({ store, provider, config: billingConfig, logger });
    await assert.rejects(() => service.reconcileCheckout('acct_a', 'cs_test_bound', { actorId: 'acct_a', role: 'customer', requestId: 'bad-session' }), (error) => ['CUSTOMER_BINDING_FAILED', 'STRIPE_CURRENT_PRICE_MISMATCH'].includes(error.code));
    const after = await store.read();
    assert.equal(after.accounts[0].planId, 'free');
    assert.equal(after.transactions[0].status, 'pending_checkout');
  }
});

test('a downgrade quote discloses safe schedule and region adjustments', async () => {
  const state = accountState();
  state.watchers.push({ id: 'watch_fast', accountId: 'acct_a', name: 'Fast watch', status: 'active', config: { checkIntervalSeconds: 900, methods: ['outage', 'text_change', 'pixel_change'], checkRegions: ['us-east-1', 'us-west-2'] } });
  const store = new MemoryStore(state);
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  const quote = await service.quotePlanChange('acct_a', 'essentials');
  assert.equal(quote.watcherAdjustments.length, 1);
  assert.equal(quote.watcherAdjustments[0].toIntervalSeconds, 3600);
  assert.deepEqual(quote.watcherAdjustments[0].removedMethods, []);
  assert.deepEqual(quote.watcherAdjustments[0].methods, ['outage', 'text_change', 'pixel_change']);
  assert.deepEqual(quote.watcherAdjustments[0].checkRegions, []);
  assert.equal((await store.read()).watchers[0].config.checkIntervalSeconds, 900);
});

test('a downgrade is rejected before charging when watcher count exceeds the target limit', async () => {
  const state = accountState();
  for (let index = 0; index < 11; index += 1) state.watchers.push({ id: `watch_${index}`, accountId: 'acct_a', name: `Watch ${index}`, status: 'active', config: { checkIntervalSeconds: 604800, methods: ['outage'] } });
  const store = new MemoryStore(state);
  let charged = false;
  const provider = { async changePlan() { charged = true; return {}; } };
  const service = new BillingService({ store, provider, config: billingConfig, logger });
  await assert.rejects(
    () => service.changePlan('acct_a', 'essentials', { actorId: 'acct_a', role: 'customer', requestId: 'downgrade' }),
    (error) => error.statusCode === 409 && error.code === 'PLAN_DOWNGRADE_BLOCKED',
  );
  assert.equal(charged, false);
  assert.equal((await store.read()).transactions.length, 0);
});

test('checkout creation is single-flight and reuses the bound checkout URL', async () => {
  const state = accountState();
  state.accounts[0].planId = 'free';
  state.accounts[0].providerSubscriptionId = null;
  const store = new MemoryStore(state);
  let calls = 0;
  const provider = {
    async createCheckout(input) { calls += 1; return { checkoutId: 'cs_test_single', url: 'https://checkout.stripe.com/c/pay/cs_test_single', customerId: input.providerCustomerId }; },
  };
  const service = new BillingService({ store, provider, config: billingConfig, logger });
  const actor = { actorId: 'acct_a', role: 'customer', requestId: 'checkout-single' };
  const first = await service.createCheckout('acct_a', 'essentials', actor, { successUrl: 'https://app.test/success', cancelUrl: 'https://app.test/cancel' });
  const second = await service.createCheckout('acct_a', 'essentials', actor, { successUrl: 'https://app.test/success', cancelUrl: 'https://app.test/cancel' });
  assert.equal(calls, 1);
  assert.equal(second.transactionId, first.transactionId);
  assert.equal(second.checkoutUrl, first.checkoutUrl);
  assert.equal(second.reused, true);
  assert.equal((await store.read()).transactions.length, 1);
});

test('successful initial plan change commits payment state and account plan together', async () => {
  const state = accountState();
  state.watchers.push({ id: 'watch_credit_delayed', accountId: 'acct_a', name: 'Delayed watcher', status: 'active', nextCheckAt: state.accounts[0].currentPeriodEnd, lastDelayReason: 'capture-credit-allowance-exhausted', configRevision: 1, config: { checkIntervalSeconds: 3600, methods: ['outage'], checkRegions: [], recipientTiers: [] } });
  const store = new MemoryStore(state);
  const labels = [];
  const original = store.transact.bind(store);
  store.transact = async (label, mutate) => { labels.push(label); return original(label, mutate); };
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  const result = await service.changePlan('acct_a', 'team', { actorId: 'acct_a', role: 'customer', requestId: 'atomic-plan' });
  const after = await store.read();
  assert.equal(result.status, 'completed');
  assert.equal(after.accounts[0].planId, 'team');
  assert.equal(after.transactions[0].status, 'completed');
  assert.equal(after.watchers[0].lastDelayReason, null);
  assert.ok(Date.parse(after.watchers[0].nextCheckAt) >= Date.now() - 2000);
  assert.ok(Date.parse(after.watchers[0].nextCheckAt) <= Date.now() + 120_000);
  assert.ok(labels.includes('billing.transaction.complete'));
  assert.ok(!labels.includes('billing.plan_changed'));
});

test('provider binding failures are terminal and are never automatically retried', async () => {
  const store = new MemoryStore(accountState());
  const provider = {
    async changePlan(input) { return { status: 'completed', amountMinor: input.amountMinor, currency: input.currency, customerId: 'cus_wrong', metadataAccountId: input.accountId }; },
  };
  const service = new BillingService({ store, provider, config: billingConfig, logger });
  const result = await service.changePlan('acct_a', 'team', { actorId: 'acct_a', role: 'customer', requestId: 'binding-fail' });
  const transaction = (await store.read()).transactions[0];
  assert.equal(result.status, 'failed');
  assert.equal(transaction.status, 'failed');
  assert.equal(transaction.automaticRetryAt, null);
  assert.equal(transaction.outcomeReason, 'CUSTOMER_BINDING_FAILED');
});

test('provider success with local plan finalization failure enters reconciliation instead of retrying payment', async () => {
  const store = new MemoryStore(accountState());
  const original = store.transact.bind(store);
  store.transact = async (label, mutate) => {
    if (label === 'billing.transaction.complete') throw new Error('simulated storage commit failure');
    return original(label, mutate);
  };
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  const result = await service.changePlan('acct_a', 'team', { actorId: 'acct_a', role: 'customer', requestId: 'finalize-fail' });
  const state = await store.read();
  assert.equal(result.status, 'reconciliation_required');
  assert.equal(state.accounts[0].planId, 'professional');
  assert.equal(state.transactions[0].status, 'reconciliation_required');
  assert.equal(state.transactions[0].automaticRetryAt, null);
  assert.ok(state.transactions[0].providerPaymentId);
  await assert.rejects(() => service.retry(state.transactions[0].id, { actorId: 'staff', role: 'steward', requestId: 'unsafe-retry' }, 'manual'));
});

test('provider success with local retry finalization failure cannot be charged again', async () => {
  const state = accountState();
  const envelope = calculationEnvelope({ accountId: 'acct_a', transactionId: 'txn_reconcile_retry', operation: 'plan_change', planId: 'team', amountMinor: 12450, currency: 'USD', providerCustomerId: 'cus_a' }, billingConfig.integritySecret);
  state.transactions.push({ id: 'txn_reconcile_retry', accountId: 'acct_a', type: 'plan_change', planId: 'team', amountMinor: 12450, currency: 'USD', providerCustomerId: 'cus_a', status: 'failed', retryCount: 0, retryMode: null, automaticRetryAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), envelope });
  const store = new MemoryStore(state);
  const original = store.transact.bind(store);
  store.transact = async (label, mutate) => {
    if (label === 'billing.retry.complete') throw new Error('simulated retry commit failure');
    return original(label, mutate);
  };
  const service = new BillingService({ store, provider: new LocalBillingProvider(), config: billingConfig, logger });
  const result = await service.retry('txn_reconcile_retry', { actorId: 'staff', role: 'steward', requestId: 'retry-finalize', reason: 'approved' }, 'manual');
  const after = await store.read();
  assert.equal(result.status, 'reconciliation_required');
  assert.equal(after.transactions[0].status, 'reconciliation_required');
  assert.equal(after.transactions[0].retryCount, 1);
  assert.equal(after.transactions[0].automaticRetryAt, null);
  await assert.rejects(() => service.retry('txn_reconcile_retry', { actorId: 'staff', role: 'steward', requestId: 'again' }, 'manual'));
});
