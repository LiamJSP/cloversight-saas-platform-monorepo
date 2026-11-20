import test from 'node:test';
import assert from 'node:assert/strict';
import { processStripeEvent } from '../src/api/routes.mjs';
import { emptyState } from '../src/domain/defaults.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, fn) { return structuredClone(await fn(this.state)); }
}
const logger = { debug() {}, info() {}, warn() {}, error() {} };
const config = { integritySecret: 'test-integrity-secret-at-least-32-characters', billingCurrency: 'USD' };
const renewalStart = Math.floor((Date.now() - 86400_000) / 1000);
const renewalEnd = renewalStart + 30 * 86400;
const initialStart = renewalStart - 30 * 86400;

function renewalState() {
  const state = emptyState();
  state.accounts.push({
    id: 'acct_a', planId: 'essentials', providerCustomerId: 'cus_a', providerSubscriptionId: 'sub_a',
    closureStatus: 'active', currentPeriodStart: new Date(initialStart * 1000).toISOString(), currentPeriodEnd: new Date(renewalStart * 1000).toISOString(),
  });
  return state;
}

function invoiceEvent(type = 'invoice.payment_failed', overrides = {}) {
  return {
    id: `evt_${type.replace(/\W/g, '_')}`,
    type,
    data: {
      object: {
        id: 'in_renewal_a', customer: 'cus_a', currency: 'usd', subtotal: 1900, total: 2147, billing_reason: 'subscription_cycle',
        hosted_invoice_url: 'https://invoice.stripe.test/in_renewal_a', created: renewalStart,
        parent: { subscription_details: { subscription: 'sub_a', metadata: { accountId: 'acct_a' } } },
        lines: { data: [{ type: 'subscription', period: { start: renewalStart, end: renewalEnd } }] },
        ...overrides,
      },
    },
  };
}

test('recurring Stripe failure creates one signed ledger transaction and schedules one retry', async () => {
  const store = new MemoryStore(renewalState());
  await processStripeEvent(invoiceEvent(), store, logger, config);
  await processStripeEvent(invoiceEvent(), store, logger, config);
  const state = await store.read();
  assert.equal(state.transactions.length, 1);
  const txn = state.transactions[0];
  assert.equal(txn.type, 'subscription_renewal');
  assert.equal(txn.amountMinor, 1900);
  assert.equal(txn.taxMinor, 247);
  assert.equal(txn.status, 'retry_scheduled');
  assert.ok(txn.automaticRetryAt);
  assert.ok(txn.envelope?.signature);
});

test('paid recurring Stripe invoice completes the existing renewal ledger transaction', async () => {
  const store = new MemoryStore(renewalState());
  await processStripeEvent(invoiceEvent(), store, logger, config);
  await processStripeEvent(invoiceEvent('invoice.payment_succeeded', { status: 'paid', payment_intent: 'pi_renewal_a' }), store, logger, config);
  const state = await store.read();
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].status, 'completed');
  assert.equal(state.transactions[0].providerPaymentId, 'pi_renewal_a');
  assert.equal(state.transactions[0].automaticRetryAt, null);
  assert.equal(state.accounts[0].currentPeriodStart, new Date(renewalStart * 1000).toISOString());
  assert.equal(state.accounts[0].currentPeriodEnd, new Date(renewalEnd * 1000).toISOString());
});

test('manually marked invoice.paid does not grant a paid renewal', async () => {
  const store = new MemoryStore(renewalState());
  await processStripeEvent(invoiceEvent('invoice.paid', { status: 'paid' }), store, logger, config);
  const state = await store.read();
  assert.equal(state.transactions.length, 0);
  assert.equal(state.accounts[0].currentPeriodEnd, new Date(renewalStart * 1000).toISOString());
});

test('an invoice for a different subscription cannot renew the current account', async () => {
  const store = new MemoryStore(renewalState());
  await assert.rejects(
    () => processStripeEvent(invoiceEvent('invoice.payment_succeeded', { status: 'paid', parent: { subscription_details: { subscription: 'sub_other', metadata: { accountId: 'acct_a' } } } }), store, logger, config),
    (error) => error.code === 'CUSTOMER_BINDING_FAILED',
  );
  assert.equal((await store.read()).transactions.length, 0);
});

test('recurring Stripe amount mismatch fails before creating a ledger transaction', async () => {
  const state = renewalState();
  const store = new MemoryStore(state);
  await assert.rejects(
    () => processStripeEvent(invoiceEvent('invoice.payment_failed', { subtotal: 19000, total: 21470 }), store, logger, config),
    (error) => error.code === 'AMOUNT_MISMATCH',
  );
  assert.equal((await store.read()).transactions.length, 0);
});

test('a retired CAD subscription renewal remains reconcilable during assisted migration', async () => {
  const state = renewalState();
  state.accounts[0].planId = 'priority';
  const store = new MemoryStore(state);
  await processStripeEvent(invoiceEvent('invoice.payment_succeeded', { currency: 'cad', subtotal: 19900, total: 22487, status: 'paid' }), store, logger, config);
  const after = await store.read();
  assert.equal(after.transactions.length, 1);
  assert.equal(after.transactions[0].planId, 'priority');
  assert.equal(after.transactions[0].currency, 'CAD');
  assert.equal(after.transactions[0].amountMinor, 19900);
  assert.equal(after.transactions[0].status, 'completed');
});


test('paid renewal resets consumed credits once and its replay after a plan change cannot refill', async () => {
  const state = renewalState();
  state.accounts[0].captureCreditsUsed = 1000;
  state.accounts[0].captureCreditPeriodStart = state.accounts[0].currentPeriodStart;
  const store = new MemoryStore(state);
  const paid = invoiceEvent('invoice.payment_succeeded', { status: 'paid' });
  await processStripeEvent(paid, store, logger, config);
  assert.equal(store.state.accounts[0].captureCreditsUsed, 0);
  store.state.accounts[0].captureCreditsUsed = 25;
  store.state.accounts[0].planId = 'professional';
  await processStripeEvent({ ...paid, id: 'evt_old_renewal_replay' }, store, logger, config);
  assert.equal(store.state.accounts[0].captureCreditsUsed, 25);
  assert.equal(store.state.accounts[0].planId, 'professional');
});
