import { createHmac } from 'node:crypto';
import { constantTimeEqual } from '../lib.mjs';
import { PLANS, PLAN_CATALOG_VERSION } from '../domain/plans.mjs';

const LEGACY_CAD_PRICE_MINOR = Object.freeze({ free: 0, essentials: 1000, daily: 2000, hourly: 3000, priority: 19900, rapid: 79900 });

export function money(value, currency = 'USD') {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Money must be a non-negative integer in minor units.');
  if (!['CAD', 'USD'].includes(currency)) throw new Error('Unsupported currency.');
  return { amountMinor: value, currency };
}

export function priceForPlan(planId, currency = 'USD') {
  const plan = PLANS[planId];
  if (!plan) throw Object.assign(new Error('Unknown plan.'), { statusCode: 400 });
  if (currency !== 'USD' || plan.currency !== 'USD') throw Object.assign(new Error('Only the explicit USD price book is enabled.'), { statusCode: 400 });
  return money(plan.priceMinor, currency);
}

// Renewal webhooks for subscriptions that have not yet completed the assisted
// CAD-to-USD migration still need exact server-side reconciliation. This is
// deliberately read-only: retired Prices cannot be used for new checkout or
// self-serve plan changes.
export function recurringPriceMinor(planId, currency = 'USD') {
  const normalized = String(currency).toUpperCase();
  if (normalized === 'USD') return PLANS[planId]?.priceMinor ?? null;
  if (normalized === 'CAD') return LEGACY_CAD_PRICE_MINOR[planId] ?? null;
  return null;
}

export function proratedPlanChange({ currentPlanId, newPlanId, periodStart, periodEnd, now, currency = 'USD' }) {
  const current = priceForPlan(currentPlanId, currency); const next = priceForPlan(newPlanId, currency);
  const start = new Date(periodStart).getTime(); const end = new Date(periodEnd).getTime(); const at = new Date(now).getTime();
  if (!(start < end) || at < start || at > end) throw new Error('Invalid billing period for proration.');
  const remainingRatio = (end - at) / (end - start);
  const unusedCreditMinor = Math.round(current.amountMinor * remainingRatio);
  const amountDueMinor = Math.max(0, next.amountMinor - unusedCreditMinor);
  return { currentPriceMinor: current.amountMinor, newPriceMinor: next.amountMinor, unusedCreditMinor, amountDueMinor, currency, remainingRatio: Number(remainingRatio.toFixed(6)) };
}

export function calculationEnvelope(input, secret) {
  const canonical = JSON.stringify({ accountId: input.accountId, transactionId: input.transactionId, operation: input.operation, planId: input.planId, amountMinor: input.amountMinor, currency: input.currency, providerCustomerId: input.providerCustomerId, catalogVersion: PLAN_CATALOG_VERSION });
  return { canonical, signature: createHmac('sha256', secret).update(canonical).digest('hex') };
}
export function verifyEnvelope(envelope, secret) {
  const expected = createHmac('sha256', secret).update(envelope.canonical).digest('hex');
  if (!constantTimeEqual(expected, envelope.signature)) throw Object.assign(new Error('Transaction price integrity check failed.'), { code: 'PRICE_INTEGRITY_FAILED' });
  return JSON.parse(envelope.canonical);
}
export function assertProviderBinding(expected, provider) {
  if (expected.accountId !== provider.metadataAccountId) throw Object.assign(new Error('Provider object belongs to a different internal account.'), { code: 'CUSTOMER_BINDING_FAILED' });
  if (expected.providerCustomerId && expected.providerCustomerId !== provider.customerId) throw Object.assign(new Error('Provider customer does not match the account.'), { code: 'CUSTOMER_BINDING_FAILED' });
  if (expected.amountMinor !== provider.amountMinor || expected.currency.toLowerCase() !== provider.currency.toLowerCase()) throw Object.assign(new Error('Provider amount does not match the signed server calculation.'), { code: 'AMOUNT_RECONCILIATION_FAILED' });
}
export function assertRetryAllowed(transaction, now = new Date()) {
  if (!['failed', 'declined', 'retry_scheduled'].includes(transaction.status)) throw new Error('Only failed transactions may be retried.');
  if (transaction.retryCount >= 1 && transaction.retryMode !== 'manual') throw new Error('The automatic retry has already been used.');
  if (now.getTime() - new Date(transaction.createdAt).getTime() > 60 * 86400_000) throw Object.assign(new Error('Transactions older than 60 days cannot be retried.'), { code: 'RETRY_EXPIRED' });
}
