import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function stripeWebhookFixture(env = process.env) {
  let url;
  try { url = new URL(String(env.WEBWATCH_TEST_STRIPE_WEBHOOK_URL ?? '')); }
  catch { throw new Error('Set WEBWATCH_TEST_STRIPE_WEBHOOK_URL to the exact staging stack StripeWebhookUrl output.'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname) ||
      url.pathname !== '/api/webhooks/stripe' || url.search || url.hash || url.port || url.username || url.password) {
    throw new Error('The webhook fixture must be the exact HTTPS AWS API Gateway Stripe path without credentials or parameters.');
  }
  return url.toString();
}

// A single unsigned request cannot change a subscription. Never submit a
// valid payment event here; this probes only the real deployed signature gate.
export async function runStagingPaymentBoundary(env = process.env, { fetchFn = fetch, now = Date.now } = {}) {
  const url = stripeWebhookFixture(env);
  const body = JSON.stringify({ id: 'evt_ci_reject_unsigned', type: 'invoice.paid', data: { object: {} } });
  const response = await fetchFn(url, {
    method: 'POST', redirect: 'manual', cache: 'no-store',
    headers: { 'content-type': 'application/json', 'stripe-signature': `t=${Math.floor(now() / 1000)},v1=${'0'.repeat(64)}` },
    body, signal: AbortSignal.timeout(12000),
  });
  if (response.status !== 400) throw new Error(`Unsigned Stripe webhook was not rejected with HTTP 400 (received ${response.status}).`);
  if (Number(response.headers.get('content-length') ?? 0) > 8000) throw new Error('Webhook rejection response is unexpectedly large.');
  const content = await response.text();
  if (content.length > 8000) throw new Error('Webhook rejection response is unexpectedly large.');
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error('Webhook rejection did not return the expected JSON response.'); }
  if (!/Stripe webhook signature is invalid/.test(String(parsed.error ?? ''))) throw new Error('Webhook was rejected for a reason other than its invalid signature.');
  return { rejected: true };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runStagingPaymentBoundary().then(() => console.log('Staging Stripe signature boundary passed.'))
    .catch((error) => { console.error(`Staging Stripe signature boundary failed: ${error.message}`); process.exitCode = 1; });
}
