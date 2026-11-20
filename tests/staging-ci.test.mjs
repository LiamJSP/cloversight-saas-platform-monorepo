import test from 'node:test';
import assert from 'node:assert/strict';
import { runStagingRegionalCheck, regionalCheckFixture } from '../scripts/staging-regional-check.mjs';
import { runStagingCiGate, failOnWarning } from '../scripts/staging-ci-gate.mjs';
import { refreshStagingTokens } from '../scripts/staging-ci-tokens.mjs';
import { runStagingPaymentBoundary, stripeWebhookFixture } from '../scripts/staging-payment-boundary.mjs';
import { stagingGet, stagingReadWithRetry } from '../scripts/staging-test-client.mjs';

const env = {
  WEBWATCH_TEST_BASE_URL: 'https://staging.example.test/', WEBWATCH_TEST_EXPECTED_HOST: 'staging.example.test',
  WEBWATCH_TEST_ACCOUNT_A: 'acct_canary', WEBWATCH_TEST_TOKEN_A: 'a'.repeat(40),
  WEBWATCH_TEST_ALLOW_CHECK: '1', WEBWATCH_TEST_CHECK_WATCHER_ID: 'watch_canary',
  WEBWATCH_TEST_CHECK_URL: 'https://canary.example.com/stable', WEBWATCH_TEST_CHECK_REGIONS: 'us-east-1,eu-west-1',
  WEBWATCH_TEST_CHECK_TIMEOUT_SECONDS: '120',
};
const bootstrap = { status: 200, body: {
  account: { id: 'acct_canary' }, captureUsage: { remaining: 4 }, alerts: [], checkJobs: [],
  watchers: [{ id: 'watch_canary', status: 'active', config: { url: env.WEBWATCH_TEST_CHECK_URL, checkRegions: ['us-east-1', 'eu-west-1'], checkIntervalSeconds: 604800 } }],
} };

test('a live regional check submits once, waits for its own job and both published region summaries', async () => {
  let time = 100_000, jobReads = 0, summaryReads = 0, submissions = 0;
  const result = await runStagingRegionalCheck(env, {
    now: () => time, wait: async (ms) => { time += ms; },
    get: async (_target, route) => {
      if (route === '/api/customer/bootstrap') return bootstrap;
      if (route === '/api/checks/job_canary') return { status: 200, body: {
        id: 'job_canary', watcherId: 'watch_canary', status: ++jobReads === 1 ? 'running' : 'completed',
        snapshotId: jobReads > 1 ? 'snap_canary' : null, outcome: jobReads > 1 ? 'green' : null,
      } };
      if (route === '/api/watchers/watch_canary/check-status') return { status: 200, body: {
        phase: ++summaryReads === 1 ? 'running' : 'completed',
        regions: ['us-east-1', 'eu-west-1'].map((id) => ({ id, phase: summaryReads === 1 ? 'running' : 'complete' })),
      } };
      throw new Error('Unexpected request');
    },
    post: async (_target, route) => {
      assert.equal(route, '/api/watchers/watch_canary/check'); submissions += 1;
      return { status: 202, body: { id: 'job_canary', watcherId: 'watch_canary', status: 'queued', deduplicated: false } };
    },
  });
  assert.deepEqual({ submissions, jobReads, summaryReads, regions: result.regionCount }, { submissions: 1, jobReads: 2, summaryReads: 2, regions: 2 });
});

test('the expensive check refuses wrong fixtures and never retries an ambiguous POST', async () => {
  assert.throws(() => regionalCheckFixture({ ...env, WEBWATCH_TEST_CHECK_REGIONS: 'us-east-1,us-east-1' }));
  assert.throws(() => regionalCheckFixture({ ...env, WEBWATCH_TEST_ALLOW_CHECK: '0' }));
  let submissions = 0;
  await assert.rejects(() => runStagingRegionalCheck(env, {
    get: async () => bootstrap,
    post: async () => { submissions += 1; throw new Error('HTTP response lost after dispatch'); },
  }), /response lost/);
  assert.equal(submissions, 1);
});

test('a brief missing job and a transient AWS gateway response are read again; a terminal worker failure is fatal', async () => {
  let time = 100_000, reads = 0;
  const post = async () => ({ status: 202, body: { id: 'job_canary', watcherId: 'watch_canary', status: 'queued' } });
  const get = async (_target, route) => {
    if (route === '/api/customer/bootstrap') return bootstrap;
    if (route === '/api/checks/job_canary') {
      reads += 1;
      if (reads === 1) return { status: 404, body: {} };
      if (reads === 2) return { status: 503, body: {} };
      return { status: 200, body: { id: 'job_canary', watcherId: 'watch_canary', status: 'failed' } };
    }
    throw new Error('No regional status read is necessary after worker failure');
  };
  await assert.rejects(() => runStagingRegionalCheck(env, { post, get, now: () => time, wait: async (ms) => { time += ms; } }), /failed\/unavailable/);
  assert.equal(reads, 3);
});

test('a missing optional isolation fixture is a warning unless strict mode is enabled; real errors always fail', async () => {
  let captured = 0;
  const services = {
    smoke: async () => ({ regionalStatusChecked: true }),
    functional: async () => ({ checkJobExercised: false, reportExercised: true }),
    payment: async () => ({ rejected: true }),
    regional: async () => { captured += 1; return { regionCount: 2 }; },
  };
  assert.equal((await runStagingCiGate(env, services)).warnings.length, 1);
  await assert.rejects(() => runStagingCiGate({ ...env, WEBWATCH_TEST_FAIL_ON_WARNING: '1' }, services), /coverage warning/);
  assert.equal(captured, 1, 'strict mode stops before the paid regional check');
  await assert.rejects(() => runStagingCiGate(env, { ...services, regional: async () => { throw new Error('capture failed'); } }), /capture failed/);
  assert.throws(() => failOnWarning({ WEBWATCH_TEST_FAIL_ON_WARNING: 'sometimes' }));
});

test('the deployed webhook boundary sends only a tampered event and requires signature rejection', async () => {
  const config = { WEBWATCH_TEST_STRIPE_WEBHOOK_URL: 'https://api123.execute-api.us-east-1.amazonaws.com/api/webhooks/stripe' };
  assert.throws(() => stripeWebhookFixture({ WEBWATCH_TEST_STRIPE_WEBHOOK_URL: 'https://attacker.example.test/api/webhooks/stripe' }));
  let attempts = 0;
  const result = await runStagingPaymentBoundary(config, { now: () => 1_000_000, fetchFn: async (url, options) => {
    attempts += 1;
    assert.equal(url, config.WEBWATCH_TEST_STRIPE_WEBHOOK_URL);
    assert.equal(options.method, 'POST');
    assert.match(options.headers['stripe-signature'], /^t=1000,v1=0{64}$/);
    return new Response(JSON.stringify({ error: 'Stripe webhook signature is invalid.' }), { status: 400 });
  } });
  assert.equal(result.rejected, true);
  assert.equal(attempts, 1);
  await assert.rejects(() => runStagingPaymentBoundary(config, { fetchFn: async () => new Response(JSON.stringify({ received: true }), { status: 200 }) }), /not rejected/);
});

test('read-only staging retries stop after transient failures without retrying authorization denials', async () => {
  let reads = 0;
  const options = { get: async () => ({ status: ++reads < 3 ? 503 : 200, body: {} }), wait: async () => {} };
  assert.equal((await stagingReadWithRetry({}, '/api/health', {}, options)).status, 200);
  assert.equal(reads, 3);
  reads = 0;
  const forbidden = await stagingReadWithRetry({}, '/api/health', {}, { get: async () => { reads += 1; return { status: 403, body: {} }; }, wait: async () => {} });
  assert.equal(forbidden.status, 403);
  assert.equal(reads, 1);
  const htmlGateway = await stagingGet({ baseUrl: 'https://staging.example.test' }, '/api/health', {
    fetchFn: async () => new Response('<html>Throttled</html>', { status: 503, headers: { 'content-type': 'text/html' } }),
  });
  assert.deepEqual(htmlGateway, { status: 503, body: {} });
});

function token(sub, config) {
  const claims = { sub, iss: config.WEBWATCH_TEST_COGNITO_ISSUER, client_id: config.WEBWATCH_TEST_COGNITO_CLIENT_ID,
    token_use: 'access', webwatch_role: 'customer', email_verified: 'true', exp: Math.floor(Date.now() / 1000) + 900 };
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

test('Cognito refresh validates both account tokens and fails closed if rotation would strand CI', async () => {
  const config = { ...env, WEBWATCH_TEST_COGNITO_DOMAIN: 'https://auth.example.test/', WEBWATCH_TEST_COGNITO_HOST: 'auth.example.test',
    WEBWATCH_TEST_COGNITO_CLIENT_ID: '1234567890clientid', WEBWATCH_TEST_COGNITO_ISSUER: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
    WEBWATCH_TEST_REFRESH_TOKEN_A: 'refresh_a'.repeat(5), WEBWATCH_TEST_REFRESH_TOKEN_B: 'refresh_b'.repeat(5) };
  let calls = 0;
  const good = await refreshStagingTokens(config, { fetchFn: async () => new Response(JSON.stringify({ access_token: token(`sub_${++calls}`, config) }), { status: 200 }) });
  assert.notEqual(good.A, good.B);
  await assert.rejects(() => refreshStagingTokens(config, { fetchFn: async () => new Response(JSON.stringify({ access_token: token('sub_a', config), refresh_token: 'unexpected_rotation' }), { status: 200 }) }), /rotation/);
});
