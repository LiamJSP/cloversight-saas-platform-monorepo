import test from 'node:test';
import assert from 'node:assert/strict';
import { processStripeEvent } from '../src/api/routes.mjs';
import { BillingService } from '../src/billing/service.mjs';
import { emptyState } from '../src/domain/defaults.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, fn) { return structuredClone(await fn(this.state)); }
}

const logger = { debug() {}, info() {}, warn() {}, error() {} };
const config = { billingCurrency: 'USD' };
function stateForStripe() {
  const state = emptyState();
  state.accounts.push({ id: 'acct_a', planId: 'free', providerCustomerId: 'cus_a', providerSubscriptionId: null, closureStatus: 'active' });
  state.transactions.push({
    id: 'txn_a', accountId: 'acct_a', type: 'subscription_start', planId: 'essentials', amountMinor: 1900,
    taxMinor: null, currency: 'USD', status: 'pending_checkout', providerCustomerId: 'cus_a',
    providerCheckoutId: 'cs_a', retryCount: 0,
  });
  return state;
}
function checkoutEvent(overrides = {}) {
  return { id: 'evt_a', type: 'checkout.session.completed', data: { object: {
    id: 'cs_a', mode: 'subscription', payment_status: 'paid', client_reference_id: 'acct_a',
    customer: 'cus_a', subscription: 'sub_a', currency: 'usd', amount_subtotal: 1900, amount_total: 2147,
    metadata: { accountId: 'acct_a', transactionId: 'txn_a' }, ...overrides,
  } } };
}
function billing(store) {
  const start = new Date(Date.now() - 86400_000).toISOString();
  const end = new Date(Date.now() + 29 * 86400_000).toISOString();
  return new BillingService({ store, config, logger, provider: { async retrieveCheckout() {
    return {
      checkoutId: 'cs_a', status: 'complete', paymentStatus: 'paid', mode: 'subscription', amountMinor: 1900,
      taxMinor: 247, currency: 'USD', customerId: 'cus_a', subscriptionId: 'sub_a', subscriptionStatus: 'active',
      subscriptionItemCount: 1, subscriptionPlanId: 'essentials', providerPaymentId: 'pi_a',
      metadataAccountId: 'acct_a', metadataTransactionId: 'txn_a', metadataSubscriptionAccountId: 'acct_a',
      metadataSubscriptionTransactionId: 'txn_a', periodStart: start, periodEnd: end,
    };
  } } });
}

test('paid Checkout event grants service only after the bound Stripe session is retrieved and verified', async () => {
  const store = new MemoryStore(stateForStripe());
  await processStripeEvent(checkoutEvent(), store, logger, config, billing(store));
  const state = await store.read();
  assert.equal(state.accounts[0].planId, 'essentials');
  assert.equal(state.accounts[0].providerSubscriptionId, 'sub_a');
  assert.equal(state.transactions[0].status, 'completed');
  assert.equal(state.transactions[0].taxMinor, 247);
});

test('an unrelated account cannot claim a bound Checkout transaction', async () => {
  const state = stateForStripe();
  state.accounts.push({ id: 'acct_b', planId: 'free', providerCustomerId: 'cus_b', closureStatus: 'active' });
  const store = new MemoryStore(state);
  await assert.rejects(
    () => processStripeEvent(checkoutEvent({ client_reference_id: 'acct_b', customer: 'cus_b', metadata: { accountId: 'acct_b', transactionId: 'txn_a' } }), store, logger, config, billing(store)),
    (error) => error.code === 'CUSTOMER_BINDING_FAILED',
  );
  assert.equal((await store.read()).accounts[1].planId, 'free');
});

test('a Checkout amount mismatch cannot activate a paid plan', async () => {
  const store = new MemoryStore(stateForStripe());
  await assert.rejects(() => processStripeEvent(checkoutEvent({ amount_subtotal: 19000 }), store, logger, config, billing(store)), (error) => error.code === 'AMOUNT_MISMATCH');
  assert.equal((await store.read()).transactions[0].status, 'pending_checkout');
  assert.equal((await store.read()).accounts[0].planId, 'free');
});

test('an unbound or unpaid Checkout event never activates service', async () => {
  const store = new MemoryStore(stateForStripe());
  await assert.rejects(() => processStripeEvent(checkoutEvent({ id: 'cs_other' }), store, logger, config, billing(store)), (error) => error.code === 'CUSTOMER_BINDING_FAILED');
  await processStripeEvent(checkoutEvent({ payment_status: 'unpaid' }), store, logger, config, billing(store));
  assert.equal((await store.read()).accounts[0].planId, 'free');
});

test('webhook cannot mark a paid plan when authoritative Stripe reconciliation is unavailable', async () => {
  const store = new MemoryStore(stateForStripe());
  await assert.rejects(() => processStripeEvent(checkoutEvent(), store, logger, config), (error) => error.code === 'CHECKOUT_RECONCILIATION_UNAVAILABLE');
  assert.equal((await store.read()).accounts[0].planId, 'free');
});

test('subscription.updated cannot advance a plan-change transaction before payment is confirmed', async () => {
  const state = stateForStripe();
  state.accounts[0].planId = 'essentials';
  state.accounts[0].providerSubscriptionId = 'sub_a';
  state.transactions.push({ id: 'txn_upgrade', accountId: 'acct_a', type: 'plan_change', planId: 'team', status: 'processing' });
  const store = new MemoryStore(state);
  await processStripeEvent({ id: 'evt_upgrade_pending', type: 'customer.subscription.updated', data: { object: {
    id: 'sub_a', customer: 'cus_a', status: 'active', metadata: { accountId: 'acct_a', transactionId: 'txn_upgrade' },
    items: { data: [{ price: { id: 'price_team' } }] }, pending_update: { subscription_items: [] },
  } } }, store, logger, { stripePriceIds: { essentials: 'price_essentials', team: 'price_team' }, billingCurrency: 'USD' });
  const after = await store.read();
  assert.equal(after.accounts[0].planId, 'essentials');
  assert.equal(after.accounts[0].billingStatus, 'plan_mismatch');
  assert.equal(after.transactions[1].status, 'payment_required');
});
