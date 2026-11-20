export const PLAN_CATALOG_VERSION = '2026-09-capture-credits-usd-v1';

const core = Object.freeze(['outage', 'banned_phrase', 'text_change']);
const visual = Object.freeze([...core, 'pixel_change']);

export const DAILY_DELIVERY_LIMITS = Object.freeze({
  free: Object.freeze({ email: 50, sms: 0 }),
  essentials: Object.freeze({ email: 250, sms: 25 }),
  professional: Object.freeze({ email: 1500, sms: 75 }),
  team: Object.freeze({ email: 3000, sms: 150 }),
  business: Object.freeze({ email: 7500, sms: 300 }),
  scale: Object.freeze({ email: 15000, sms: 600 }),
});

function plan(value) {
  return Object.freeze({ currency: 'USD', methods: visual, overageMode: 'pause', selfServe: true,
    dailyDeliveryLimits: DAILY_DELIVERY_LIMITS[value.id], ...value });
}

/**
 * One credit is one browser capture of one watcher in one AWS region. Desktop,
 * tablet, mobile, and every enabled detector are included in that credit.
 * Infrastructure retries are never charged.
 */
export const PLANS = Object.freeze({
  free: plan({
    id: 'free', name: 'Free', priceMinor: 0, captureCredits: 10,
    maxWatchers: 1, minIntervalSeconds: 604800, methods: core,
    maxCheckRegions: 0, maxRegionalWatchers: 0, maxUsers: 1,
    maxRecipientTiers: 1, maxRecipients: 5, historyDays: 7,
    actionHistoryDays: 7, reportAllowance: 0, reportWindowSeconds: 2592000,
    regionalResponsibilities: false,
    summary: 'One weekly watcher with 10 regional capture credits each month.',
  }),
  essentials: plan({
    id: 'essentials', name: 'Essentials', priceMinor: 1900, captureCredits: 1000,
    maxWatchers: 10, minIntervalSeconds: 3600,
    maxCheckRegions: 0, maxRegionalWatchers: 0, maxUsers: 2,
    maxRecipientTiers: 2, maxRecipients: 10, historyDays: 30,
    actionHistoryDays: 30, reportAllowance: 5, reportWindowSeconds: 2592000,
    regionalResponsibilities: false,
    summary: 'Ten hourly watchers with 1,000 regional capture credits each month.',
  }),
  professional: plan({
    id: 'professional', name: 'Professional', priceMinor: 4900, captureCredits: 10000,
    maxWatchers: 50, minIntervalSeconds: 900,
    maxCheckRegions: 2, maxRegionalWatchers: 10, maxUsers: 5,
    maxRecipientTiers: 5, maxRecipients: 25, historyDays: 90,
    actionHistoryDays: 90, reportAllowance: 25, reportWindowSeconds: 2592000,
    regionalResponsibilities: true,
    summary: 'Fifty watchers, two-region coverage, and 10,000 monthly capture credits.',
  }),
  team: plan({
    id: 'team', name: 'Team', priceMinor: 14900, captureCredits: 30000,
    maxWatchers: 100, minIntervalSeconds: 300,
    maxCheckRegions: 3, maxRegionalWatchers: 25, maxUsers: 10,
    maxRecipientTiers: 10, maxRecipients: 50, historyDays: 180,
    actionHistoryDays: 180, reportAllowance: 5, reportWindowSeconds: 86400,
    regionalResponsibilities: true,
    summary: 'Five-minute monitoring for operations teams with 30,000 monthly capture credits.',
  }),
  business: plan({
    id: 'business', name: 'Business', priceMinor: 39900, captureCredits: 100000,
    maxWatchers: 250, minIntervalSeconds: 120,
    maxCheckRegions: 5, maxRegionalWatchers: 100, maxUsers: 25,
    maxRecipientTiers: 10, maxRecipients: 100, historyDays: 365,
    actionHistoryDays: 365, reportAllowance: 15, reportWindowSeconds: 86400,
    regionalResponsibilities: true,
    summary: 'Two-minute monitoring, five regions, and 100,000 monthly capture credits.',
  }),
  scale: plan({
    id: 'scale', name: 'Scale', priceMinor: 89900, captureCredits: 300000,
    maxWatchers: 500, minIntervalSeconds: 120,
    maxCheckRegions: 5, maxRegionalWatchers: 500, maxUsers: 50,
    maxRecipientTiers: 10, maxRecipients: 100, historyDays: null,
    actionHistoryDays: null, reportAllowance: 25, reportWindowSeconds: 86400,
    regionalResponsibilities: true, includedStorageGb: 1000, selfServe: false,
    summary: 'High-volume monitoring with 300,000 monthly capture credits and 1 TB retained storage.',
  }),
});

// Accounts already subscribed to the retired 0.4.x CAD price book must keep
// operating until their Stripe subscription is deliberately migrated. These
// plans cannot be sold or shown as choices (the one shared Essentials ID is
// disambiguated by its catalog marker). Their capture allowances preserve the
// old plan's maximum 31-day schedule instead of converting a deployment into
// an accidental service cut.
const LEGACY_PLAN_ENTITLEMENTS = Object.freeze({
  essentials: Object.freeze({
    id: 'essentials', name: 'Essentials (legacy)', currency: 'CAD', priceMinor: 1000,
    captureCredits: 20, maxWatchers: 4, minIntervalSeconds: 604800, methods: core,
    maxCheckRegions: 0, maxRegionalWatchers: 0,
  }),
  daily: Object.freeze({
    id: 'daily', name: 'Daily (legacy)', currency: 'CAD', priceMinor: 2000,
    captureCredits: 310, maxWatchers: 10, minIntervalSeconds: 86400, methods: visual,
    maxCheckRegions: 0, maxRegionalWatchers: 0,
  }),
  hourly: Object.freeze({
    id: 'hourly', name: 'Hourly (legacy)', currency: 'CAD', priceMinor: 3000,
    captureCredits: 18600, maxWatchers: 25, minIntervalSeconds: 3600, methods: visual,
    maxCheckRegions: 0, maxRegionalWatchers: 0,
  }),
  priority: Object.freeze({
    id: 'priority', name: 'Priority (legacy)', currency: 'CAD', priceMinor: 19900,
    captureCredits: 148800, maxWatchers: 25, minIntervalSeconds: 900, methods: visual,
    maxCheckRegions: 2, maxRegionalWatchers: 10,
  }),
  rapid: Object.freeze({
    id: 'rapid', name: 'Rapid (legacy)', currency: 'CAD', priceMinor: 79900,
    captureCredits: 669600, maxWatchers: 10, minIntervalSeconds: 120, methods: visual,
    maxCheckRegions: 3, maxRegionalWatchers: 5,
  }),
});

function legacyEntitlement(value) {
  return {
    maxUsers: 50, maxRecipientTiers: 10, maxRecipients: 100,
    historyDays: 90, actionHistoryDays: 90,
    reportAllowance: 25, reportWindowSeconds: 86400,
    overageMode: 'pause', selfServe: false, legacy: true,
    regionalResponsibilities: value.maxCheckRegions > 0,
    summary: 'Retired 0.4.x plan awaiting an assisted Stripe price migration.',
    ...value,
  };
}

export function entitlements(account, now = new Date()) {
  const paidStripe = account.provider === 'stripe' && account.planId !== 'free';
  const paidAccessUnavailable = (paidStripe || account.planId !== 'free' && account.billingCancellation) && (
    account.billingCancellation?.mode === 'immediate' || account.billingCancellation?.status === 'completed' ||
    (account.billingStatus != null && account.billingStatus !== 'active')
    || !validIso(account.currentPeriodStart) || account.currentPeriodStart > now.toISOString()
    || !validIso(account.currentPeriodEnd)
    || account.currentPeriodEnd <= now.toISOString()
  );
  const planValue = isRetiredPlan(account)
    ? legacyEntitlement(LEGACY_PLAN_ENTITLEMENTS[account.planId])
    : PLANS[account.planId];
  if (!planValue) throw Object.assign(new Error('Unknown plan.'), { statusCode: 400 });
  const trial = account.planId === 'free' && new Date(account.trialEndsAt).getTime() > now.getTime();
  if (paidAccessUnavailable) return { ...PLANS.free, trialActive: false, billingRestricted: true };
  return trial
    ? { ...planValue, captureCredits: 31, minIntervalSeconds: 86400, methods: visual, trialActive: true }
    : { ...planValue, trialActive: false };
}

export function isRetiredPlan(account) {
  const planId = String(account?.planId ?? '');
  if (!LEGACY_PLAN_ENTITLEMENTS[planId]) return false;
  if (planId !== 'essentials') return true;
  // 0.4.x and 0.5.0 intentionally share the public Essentials name. Existing
  // paid CAD accounts have no 0.5.0 catalog marker, while every new USD
  // activation records one. Keep that ambiguous legacy ID on the migration
  // bridge until Stripe proves the account has moved to the current catalog.
  return Boolean(account?.providerSubscriptionId || account?.billingCurrency === 'CAD')
    && account?.planCatalogVersion !== PLAN_CATALOG_VERSION;
}

export function validateWatcherForPlan(config, account, currentCount, creating, now = new Date(), regionalWatcherCount = 0, wasRegional = false) {
  const access = entitlements(account, now);
  const errors = [];
  if (creating && currentCount >= access.maxWatchers) errors.push(`This plan supports ${access.maxWatchers} watcher(s).`);
  if (!Number.isInteger(config.checkIntervalSeconds) || config.checkIntervalSeconds < access.minIntervalSeconds) errors.push('The selected check interval is not available on this plan.');
  for (const method of config.methods ?? []) if (!access.methods.includes(method)) errors.push(`${method} is not available on this plan.`);
  const regions = Array.isArray(config.checkRegions) ? config.checkRegions : [];
  if (regions.length > access.maxCheckRegions) errors.push(access.maxCheckRegions ? `This plan supports at most ${access.maxCheckRegions} check regions per watcher.` : 'Multi-region checks are available on Professional, Team, Business, and Scale plans.');
  if (regions.length && !wasRegional && regionalWatcherCount >= access.maxRegionalWatchers) errors.push(`This plan supports multi-region checks on ${access.maxRegionalWatchers} watcher(s).`);
  if ((config.recipientTiers?.length ?? 0) > access.maxRecipientTiers) errors.push(`This plan supports at most ${access.maxRecipientTiers} recipient escalation tier(s).`);
  const recipientCount = (config.recipientTiers ?? []).reduce((sum, tier) => sum + (tier.recipients?.length ?? 0), 0);
  if (recipientCount > access.maxRecipients) errors.push(`This plan supports at most ${access.maxRecipients} recipients per watcher.`);
  if (access.dailyDeliveryLimits?.sms === 0 && (config.recipientTiers ?? []).some((tier) => (tier.recipients ?? []).some((recipient) => recipient.channel === 'sms' && recipient.enabled !== false))) errors.push('SMS notifications are not included on this plan.');
  return { access, errors };
}

export function expectedMonthlyChecks(planId) {
  const planValue = PLANS[planId] ?? LEGACY_PLAN_ENTITLEMENTS[planId];
  if (!planValue) throw new Error(`Unknown plan ${planId}.`);
  return Math.ceil(30 * 86400 / planValue.minIntervalSeconds) * planValue.maxWatchers;
}

export function expectedMonthlyCaptures(planId) {
  const planValue = PLANS[planId] ?? LEGACY_PLAN_ENTITLEMENTS[planId];
  if (!planValue) throw new Error(`Unknown plan ${planId}.`);
  return planValue.captureCredits;
}

export function captureCreditUsage(account, access = entitlements(account), at = new Date()) {
  const now = at instanceof Date ? at.toISOString() : new Date(at).toISOString();
  // A stale or unpaid Stripe subscription cannot gain a new calendar-month
  // allowance when its last verified paid period ends. Existing free accounts
  // continue to use their regular calendar-month window.
  const paidStripe = account.provider === 'stripe' && account.planId !== 'free';
  const pinned = account.captureCreditWindow;
  const paymentUnavailable = paidStripe && ((account.billingStatus != null && account.billingStatus !== 'active')
    || !validIso(account.currentPeriodStart) || account.currentPeriodStart > now
    || !validIso(account.currentPeriodEnd) || account.currentPeriodEnd <= now
    || (pinned && (!validIso(pinned.periodEnd) || pinned.periodEnd <= now)));
  const hasActiveSubscriptionPeriod = validIso(account.currentPeriodStart)
    && validIso(account.currentPeriodEnd)
    && account.currentPeriodStart <= now
    && account.currentPeriodEnd > now;
  // Stripe subscription periods are authoritative only while they contain the
  // requested instant. Once one expires, move both boundaries to the UTC
  // calendar month together so an old start cannot be paired with a new end.
  const periodStart = pinned?.periodStart ?? (hasActiveSubscriptionPeriod ? account.currentPeriodStart : `${now.slice(0, 7)}-01T00:00:00.000Z`);
  const periodEnd = pinned?.periodEnd ?? (hasActiveSubscriptionPeriod ? account.currentPeriodEnd : nextMonthIso(now));
  const samePeriod = account.captureCreditPeriodStart === periodStart;
  const used = samePeriod ? Math.max(0, Number(account.captureCreditsUsed ?? 0)) : 0;
  const included = paymentUnavailable ? 0 : Math.max(0, Number(access.captureCredits ?? 0));
  const prepaid = paymentUnavailable ? 0 : Math.max(0, Number(account.prepaidCaptureCredits ?? 0));
  return {
    used,
    included,
    prepaid,
    allowance: included + prepaid,
    remaining: Math.max(0, included + prepaid - used),
    periodStart,
    periodEnd,
  };
}

export function historyCutoff(access, now = Date.now()) {
  return Number.isFinite(access?.historyDays) ? new Date(now - access.historyDays * 86400_000).toISOString() : null;
}

/**
 * The Free trial deliberately unlocks daily visual checks for 30 days. Bring
 * persisted watcher configuration back to the production Free policy at the
 * first post-trial run so daily/pixel settings cannot outlive the trial.
 */
export function applyExpiredFreeTrialWatcherPolicy(watcher, account, now = new Date()) {
  const access = entitlements(account, now);
  if (account?.planId !== 'free' || access.trialActive || !watcher?.config) return null;
  const before = {
    checkIntervalSeconds: Number(watcher.config.checkIntervalSeconds),
    methods: [...(watcher.config.methods ?? [])],
    checkRegions: [...(watcher.config.checkRegions ?? [])],
  };
  const supportedMethods = before.methods.filter((method) => access.methods.includes(method));
  const after = {
    checkIntervalSeconds: Math.max(before.checkIntervalSeconds || 0, access.minIntervalSeconds),
    methods: supportedMethods.length ? supportedMethods : ['outage'],
    checkRegions: before.checkRegions.slice(0, access.maxCheckRegions),
  };
  if (before.checkIntervalSeconds === after.checkIntervalSeconds
    && JSON.stringify(before.methods) === JSON.stringify(after.methods)
    && JSON.stringify(before.checkRegions) === JSON.stringify(after.checkRegions)) return null;
  Object.assign(watcher.config, after);
  return { reason: 'free-trial-ended', before, after };
}

function validIso(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function nextMonthIso(now) { const date = new Date(now); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString(); }
