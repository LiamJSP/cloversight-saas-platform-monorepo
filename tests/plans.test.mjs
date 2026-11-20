import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExpiredFreeTrialWatcherPolicy,
  PLANS,
  entitlements,
  validateWatcherForPlan,
  expectedMonthlyChecks,
  expectedMonthlyCaptures,
  captureCreditUsage,
} from '../src/domain/plans.mjs';

const account = { planId: 'free', trialEndsAt: '2999-01-01T00:00:00.000Z' };

test('the USD catalogue exposes the six approved plans and prices', () => {
  assert.deepEqual(Object.keys(PLANS), ['free', 'essentials', 'professional', 'team', 'business', 'scale']);
  assert.deepEqual(
    Object.fromEntries(Object.values(PLANS).map((plan) => [plan.id, plan.priceMinor])),
    { free: 0, essentials: 1900, professional: 4900, team: 14900, business: 39900, scale: 89900 },
  );
  assert.ok(Object.values(PLANS).every((plan) => plan.currency === 'USD'));
  assert.equal(PLANS.scale.selfServe, false);
});

test('free trial temporarily enables daily visual checks', () => {
  const access = entitlements(account, new Date('2026-01-01'));
  assert.equal(access.trialActive, true);
  assert.ok(access.methods.includes('pixel_change'));
  assert.equal(access.minIntervalSeconds, 86400);
});

test('expired free plan is weekly and has no visual detector', () => {
  const access = entitlements({ ...account, trialEndsAt: '2020-01-01T00:00:00.000Z' }, new Date('2026-01-01'));
  assert.equal(access.minIntervalSeconds, 604800);
  assert.ok(!access.methods.includes('pixel_change'));
});

test('an expired Free visual trial returns persisted watcher policy to weekly core checks', () => {
  const expiredAccount = { planId: 'free', trialEndsAt: '2026-01-01T00:00:00.000Z' };
  const watcher = { config: { checkIntervalSeconds: 86400, methods: ['outage', 'text_change', 'pixel_change'], checkRegions: ['us-west-2'] } };
  const adjustment = applyExpiredFreeTrialWatcherPolicy(watcher, expiredAccount, new Date('2026-02-01T00:00:00.000Z'));
  assert.equal(adjustment.reason, 'free-trial-ended');
  assert.equal(watcher.config.checkIntervalSeconds, 604800);
  assert.deepEqual(watcher.config.methods, ['outage', 'text_change']);
  assert.deepEqual(watcher.config.checkRegions, []);
});

test('retired CAD plan IDs retain bounded service while awaiting assisted migration', () => {
  const access = entitlements({ planId: 'priority' }, new Date('2026-01-01'));
  assert.equal(access.legacy, true);
  assert.equal(access.captureCredits, 148800);
  assert.equal(access.maxCheckRegions, 2);
  assert.equal(access.selfServe, false);
  assert.equal(PLANS.priority, undefined);
});

test('retired CAD Essentials is distinguished from the current USD plan by its catalog marker', () => {
  const legacy = entitlements({ planId: 'essentials', providerSubscriptionId: 'sub_old' }, new Date('2026-01-01'));
  const current = entitlements({ planId: 'essentials', providerSubscriptionId: 'sub_new', planCatalogVersion: '2026-09-capture-credits-usd-v1' }, new Date('2026-01-01'));
  assert.equal(legacy.legacy, true);
  assert.equal(legacy.priceMinor, 1000);
  assert.equal(legacy.maxWatchers, 4);
  assert.equal(current.legacy, undefined);
  assert.equal(current.priceMinor, 1900);
});

test('plan validator rejects an over-frequency check', () => {
  const result = validateWatcherForPlan(
    { checkIntervalSeconds: 120, methods: ['outage'] },
    { planId: 'essentials', trialEndsAt: '2020-01-01' },
    0,
    true,
    new Date(),
  );
  assert.ok(result.errors.length);
});

test('Scale theoretical schedule is capped by 300k monthly capture credits', () => {
  assert.equal(expectedMonthlyChecks('scale'), 10_800_000);
  assert.equal(expectedMonthlyCaptures('scale'), 300_000);
});

test('local-plan capture usage rolls to a calendar window after an expired subscription period', () => {
  const usage = captureCreditUsage({
    planId: 'essentials',
    currentPeriodStart: '2026-07-01T00:00:00.000Z',
    currentPeriodEnd: '2026-08-01T00:00:00.000Z',
    captureCreditPeriodStart: '2026-09-01T00:00:00.000Z',
    captureCreditPeriodEnd: '2026-10-01T00:00:00.000Z',
    captureCreditsUsed: 125,
    prepaidCaptureCredits: 0,
  }, PLANS.essentials, new Date('2026-09-20T00:00:00.000Z'));
  assert.equal(usage.used, 125);
  assert.equal(usage.remaining, 875);
  assert.equal(usage.periodEnd, '2026-10-01T00:00:00.000Z');
});

test('expired or past-due Stripe service has no capture allowance, even with unused prepaid credits', () => {
  const base = {
    provider: 'stripe', planId: 'essentials', billingStatus: 'active',
    currentPeriodStart: '2026-07-01T00:00:00.000Z', currentPeriodEnd: '2026-08-01T00:00:00.000Z',
    captureCreditPeriodStart: '2026-09-01T00:00:00.000Z', captureCreditPeriodEnd: '2026-10-01T00:00:00.000Z',
    prepaidCaptureCredits: 500, captureCreditsUsed: 0,
  };
  const at = new Date('2026-09-20T00:00:00.000Z');
  assert.equal(captureCreditUsage(base, PLANS.essentials, at).remaining, 0);
  const active = { ...base, currentPeriodStart: '2026-09-01T00:00:00.000Z', currentPeriodEnd: '2026-10-01T00:00:00.000Z' };
  assert.equal(captureCreditUsage(active, PLANS.essentials, at).remaining, 1500);
  assert.equal(captureCreditUsage({ ...active, billingStatus: 'past_due' }, PLANS.essentials, at).remaining, 0);
});

test('regional checks start on Professional and enforce its two-region limit', () => {
  const base = { checkIntervalSeconds: 3600, methods: ['outage'], checkRegions: ['us-east-1'] };
  assert.match(
    validateWatcherForPlan(base, { planId: 'essentials' }, 0, true, new Date()).errors.join(' '),
    /Professional, Team, Business, and Scale/,
  );
  assert.equal(validateWatcherForPlan(base, { planId: 'professional' }, 0, true, new Date()).errors.length, 0);
  assert.match(
    validateWatcherForPlan(
      { ...base, checkRegions: ['us-east-1', 'us-west-2', 'eu-west-1'] },
      { planId: 'professional' },
      0,
      true,
      new Date(),
    ).errors.join(' '),
    /at most 2/,
  );
});
