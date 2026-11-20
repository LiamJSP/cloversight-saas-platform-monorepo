import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeWebhook } from '../src/billing/providers.mjs';

test('Stripe webhook verification accepts any matching v1 signature during key rotation', () => {
  const secret = 'whsec_test_secret';
  const body = Buffer.from(JSON.stringify({ id: 'evt_test', type: 'invoice.paid', data: { object: {} } }));
  const timestamp = Math.floor(Date.now() / 1000);
  const good = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const event = verifyStripeWebhook(body, `t=${timestamp},v1=deadbeef,v1=${good}`, secret);
  assert.equal(event.id, 'evt_test');
});

test('Stripe webhook verification rejects invalid JSON after signature validation', () => {
  const secret = 'whsec_test_secret';
  const body = Buffer.from('{not-json');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  assert.throws(() => verifyStripeWebhook(body, `t=${timestamp},v1=${signature}`, secret), (error) => error.statusCode === 400);
});
