import test from 'node:test';
import assert from 'node:assert/strict';
import { awsRuntimeInternals } from '../src/aws/runtime.mjs';
import { UnsupportedBillingProvider, StripeBillingProvider } from '../src/billing/providers.mjs';

test('inbound email runtime cannot construct or access a live billing provider', () => {
  const provider = awsRuntimeInternals.createBillingProvider('inbound-email', { billingProvider: 'stripe' });
  assert.ok(provider instanceof UnsupportedBillingProvider);
  assert.throws(() => provider.retry(), /disabled-for-inbound-email/);
});

test('API runtime requires a configured Stripe secret when Stripe is enabled', () => {
  assert.throws(() => awsRuntimeInternals.createBillingProvider('api', { billingProvider: 'stripe' }), /STRIPE_SECRET_KEY/);
  const provider = awsRuntimeInternals.createBillingProvider('api', { billingProvider: 'stripe', stripeSecretKey: 'sk_test_example' });
  assert.ok(provider instanceof StripeBillingProvider);
});
