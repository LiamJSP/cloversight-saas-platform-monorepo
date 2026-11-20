import { captureCreditUsage, entitlements } from '../domain/plans.mjs';

// Stripe anchor changes must not refill a bucket financed by proration credit.
export function carryCaptureUsage(account, transaction, period = {}) {
  if (transaction.captureWindowApplied) return false;
  const usage = captureCreditUsage(account, entitlements(account));
  const periodStart = account.captureCreditWindow?.periodStart ?? account.captureCreditPeriodStart ?? usage.periodStart;
  const used = account.captureCreditPeriodStart === periodStart ? Math.max(0, Number(account.captureCreditsUsed) || 0) : usage.used;
  const periodEnd = period.periodEnd ?? usage.periodEnd;
  account.captureCreditWindow = { periodStart, periodEnd };
  account.captureCreditPeriodStart = periodStart;
  account.captureCreditPeriodEnd = periodEnd;
  account.captureCreditsUsed = used;
  transaction.captureWindowApplied = true;
  return true;
}

export function applyPaidRenewalWindow(account, transaction, period) {
  if (transaction.captureWindowApplied) return false;
  const start = period.start ?? period.periodStart;
  const end = period.end ?? period.periodEnd;
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || end <= start) throw new Error('Paid renewal has no valid capture period.');
  const latestStart = account.currentPeriodStart ?? account.captureCreditPeriodStart;
  const creditedStart = account.captureCreditWindow?.periodStart ?? account.captureCreditPeriodStart ?? latestStart;
  if ((latestStart && start < latestStart) || (creditedStart && start <= creditedStart)) { transaction.captureWindowApplied = true; return false; }
  account.currentPeriodStart = start;
  account.currentPeriodEnd = end;
  account.captureCreditWindow = { periodStart: start, periodEnd: end };
  account.captureCreditPeriodStart = start;
  account.captureCreditPeriodEnd = end;
  account.captureCreditsUsed = 0;
  account.captureAttemptPeriodStart = start;
  account.captureAttemptsUsed = 0;
  transaction.captureWindowApplied = true;
  return true;
}
