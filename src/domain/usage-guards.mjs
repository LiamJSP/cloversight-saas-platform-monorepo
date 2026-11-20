import { entitlements, captureCreditUsage, validateWatcherForPlan } from './plans.mjs';

export function watcherUsage(state, account) {
  if (account.watcherUsage?.version === 1) return account.watcherUsage;
  const watchers = state.watchers.filter((item) => item.accountId === account.id && item.status !== 'deleted');
  return { version: 1, total: watchers.length, regional: watchers.filter((item) => item.config?.checkRegions?.length).length };
}

// Bootstrap from a strong compatibility snapshot once. Thereafter every slot
// claim updates the conditionally written account, never an eventual GSI count.
export async function ensureWatcherUsage(store, accountId) {
  const account = store.getEntity ? await store.getEntity('accounts', accountId) : (await store.read()).accounts.find((item) => item.id === accountId);
  if (!account || account.watcherUsage?.version === 1) return;
  await store.transact('watcher.usage.initialize', (state) => {
    const live = state.accounts.find((item) => item.id === accountId);
    if (live && live.watcherUsage?.version !== 1) live.watcherUsage = watcherUsage(state, live);
    return null;
  });
}

export async function reconcileWatcherUsage(store, accountId, apply = false) {
  const reconcile = (state) => {
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw new Error('Account not found.');
    const before = structuredClone(account.watcherUsage ?? null);
    const after = watcherUsage(state, { ...account, watcherUsage: null });
    if (apply) account.watcherUsage = after;
    return { accountId, applied: apply, before, after };
  };
  return apply ? store.transact('watcher.usage.reconcile', reconcile) : reconcile(await store.read());
}

export function updateWatcherUsage(account, before, after) {
  if (account?.watcherUsage?.version !== 1) return;
  const live = (item) => item && item.status !== 'deleted' ? 1 : 0;
  const regional = (item) => live(item) && item.config?.checkRegions?.length ? 1 : 0;
  account.watcherUsage.total += live(after) - live(before);
  account.watcherUsage.regional += regional(after) - regional(before);
  if (account.watcherUsage.total < 0 || account.watcherUsage.regional < 0 || account.watcherUsage.regional > account.watcherUsage.total) throw new Error('Watcher quota accounting requires reconciliation.');
}

export function captureNotBefore(watcher, account, now = new Date()) {
  const access = entitlements(account, now);
  const last = Date.parse(watcher.lastCaptureStartedAt ?? watcher.lastCheckAt ?? '');
  const interval = Math.max(Number(watcher.config?.checkIntervalSeconds) || 0, access.minIntervalSeconds);
  return Math.max(Number.isFinite(last) ? last + interval * 1000 : 0, Date.parse(watcher.captureRetryAfterAt ?? '') || 0);
}

export function releaseFundedCaptureHold(watcher, account) {
  if (watcher.lastDelayReason !== 'capture-credit-allowance-exhausted' || captureCreditUsage(account).remaining < (watcher.config?.checkRegions?.length || 1)) return;
  watcher.nextCheckAt = null;
  watcher.lastDelayReason = null;
}

export function assertManualCaptureAllowed(watcher, account, now = new Date()) {
  if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
  const at = captureNotBefore(watcher, account, now);
  if (at > now.getTime()) throw Object.assign(new Error('This watcher is still within its check interval or recovery delay.'), { statusCode: 429, code: 'CHECK_CADENCE_LIMIT', retryAt: new Date(at).toISOString() });
  if (captureCreditUsage(account, entitlements(account, now), now).remaining < (watcher.config?.checkRegions?.length || 1)) throw Object.assign(new Error('Monthly regional capture allowance exhausted.'), { statusCode: 429, code: 'CAPTURE_CREDITS_EXHAUSTED' });
}

// Committed atomically with the run and credits. Replacement watchers and
// infrastructure refunds never restore tokens or the separate attempt budget.
export function claimCaptureAdmission(account, watcher, regionCount, nowIso) {
  const now = Date.parse(nowIso);
  const access = entitlements(account, new Date(now));
  const usage = captureCreditUsage(account, access, new Date(now));
  const errors = validateWatcherForPlan(watcher.config, account, 0, false, new Date(now), 0, true).errors;
  const count = account.watcherUsage;
  if (access.billingRestricted || errors.length || count?.total > access.maxWatchers || count?.regional > access.maxRegionalWatchers) return { allowed: false, code: 'CAPTURE_PLAN_RESTRICTED', reason: 'capture-plan-restricted', retryAt: new Date(now + 3600_000).toISOString() };
  const notBefore = captureNotBefore(watcher, account, new Date(now));
  if (notBefore > now) return { allowed: false, code: 'CHECK_CADENCE_LIMIT', reason: 'check-cadence-limit', retryAt: new Date(notBefore).toISOString() };
  const prior = account.captureAdmission ?? {};
  const rate = access.maxWatchers / access.minIntervalSeconds;
  const burst = Math.max(1, Math.min(5, Math.ceil(access.maxWatchers / 10)));
  const elapsed = Math.max(0, (now - (Number(prior.updatedAtMs) || now)) / 1000);
  const refillRate = Number.isFinite(prior.rate) ? Math.min(rate, prior.rate) : rate;
  const tokens = Math.min(burst, Number.isFinite(prior.tokens) ? prior.tokens + elapsed * refillRate : burst);
  account.captureAdmission = { tokens, updatedAtMs: now, rate };
  if (tokens < 1) return { allowed: false, code: 'CAPTURE_RATE_DEFERRED', reason: 'capture-rate-deferred', retryAt: new Date(now + Math.ceil((1 - tokens) / rate) * 1000).toISOString() };
  const attempted = account.captureAttemptPeriodStart === usage.periodStart ? Math.max(0, Number(account.captureAttemptsUsed) || 0) : 0;
  if (attempted + regionCount > Math.max(2, usage.allowance * 2)) return { allowed: false, code: 'CAPTURE_ATTEMPT_LIMIT', reason: 'capture-attempt-limit', retryAt: usage.periodEnd };
  account.captureAdmission = { tokens: tokens - 1, updatedAtMs: now, rate };
  account.captureAttemptsUsed = attempted + regionCount;
  account.captureAttemptPeriodStart = usage.periodStart;
  watcher.lastCaptureStartedAt = nowIso;
  return { allowed: true };
}
