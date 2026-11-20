import { emptyState, defaultWatcher } from './domain/defaults.mjs';
import { addDays, id, ISO } from './lib.mjs';
import { PLAN_CATALOG_VERSION } from './domain/plans.mjs';

export function demoState() {
  const now = ISO(); const periodEnd = addDays(now, 30);
  const state = emptyState(now);
  state.accounts.push({
    id: 'acct_demo', legalName: 'Acme Orchard Inc.', contactName: 'Demo Customer', contactEmail: 'demo@example.com',
    country: 'CA', region: 'ON', postalCode: 'M5V 2T6', taxIds: [], planId: 'free', planCatalogVersion: PLAN_CATALOG_VERSION, billingCurrency: 'USD', trialEndsAt: addDays(now, 30),
    currentPeriodStart: now, currentPeriodEnd: periodEnd, captureCreditsUsed: 0, captureCreditPeriodStart: now, captureCreditPeriodEnd: periodEnd, prepaidCaptureCredits: 0, provider: 'local', providerCustomerId: 'cus_local_demo_4242',
    providerSubscriptionId: 'sub_local_demo', closureStatus: 'active', disabledAt: null, closureScheduledAt: null,
    deleteAfter: null, createdAt: now, updatedAt: now,
  });
  const watcher = defaultWatcher('acct_demo', 'demo@example.com');
  watcher.id = 'watch_demo'; watcher.name = 'Example homepage'; watcher.status = 'draft'; watcher.config.url = 'https://example.com/';
  state.watchers.push(watcher);
  state.transactions.push({ id: 'txn_demo', accountId: 'acct_demo', provider: 'local', type: 'subscription_start', planId: 'free', amountMinor: 0, taxMinor: 0, currency: 'USD', status: 'completed', outcomeReason: null, providerCustomerId: 'cus_local_demo_4242', providerPaymentId: 'pi_local_demo', providerInvoiceId: 'in_local_demo', paymentReference: 'pm_local_4242', envelope: null, retryCount: 0, retryMode: null, automaticRetryAt: null, createdAt: now, updatedAt: now });
  state.staffNotes.push({ id: id('note'), accountId: 'acct_demo', authorId: 'staff_demo', body: 'Demo account seeded for local development.', createdAt: now });
  return state;
}
