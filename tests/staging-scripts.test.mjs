import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingTarget, stagingGet } from '../scripts/staging-test-client.mjs';
import { runStagingSmoke } from '../scripts/staging-smoke.mjs';
import { runStagingFunctional } from '../scripts/staging-functional.mjs';

const tokenA = 'a'.repeat(40);
const tokenB = 'b'.repeat(40);
const environment = {
  WEBWATCH_TEST_BASE_URL: 'https://stage.example.test/', WEBWATCH_TEST_EXPECTED_HOST: 'stage.example.test',
  WEBWATCH_TEST_ACCOUNT_A: 'acct_a', WEBWATCH_TEST_TOKEN_A: tokenA,
  WEBWATCH_TEST_ACCOUNT_B: 'acct_b', WEBWATCH_TEST_TOKEN_B: tokenB,
};
test('staging probes reject HTTP, redirects to other hosts, and misconfigured target hosts before any network request', () => {
  assert.throws(() => stagingTarget({ ...environment, WEBWATCH_TEST_BASE_URL: 'http://stage.example.test/' }), /HTTPS/);
  assert.throws(() => stagingTarget({ ...environment, WEBWATCH_TEST_BASE_URL: 'https://production.example.test/' }), /expected hostname/);
  assert.throws(() => stagingTarget({ ...environment, WEBWATCH_TEST_BASE_URL: 'https://stage.example.test/other' }), /no credentials/);
});

test('anonymous edge denial may be HTML, but redirects are rejected without following them', async () => {
  const target = stagingTarget(environment);
  let calls = 0;
  const denial = await stagingGet(target, '/api/customer/bootstrap', {
    token: null,
    fetchFn: async (url, options) => {
      calls += 1;
      assert.equal(url, 'https://stage.example.test/api/customer/bootstrap');
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers.authorization, undefined);
      return new Response('<h1>Denied</h1>', { status: 403, headers: { 'content-type': 'text/html' } });
    },
  });
  assert.deepEqual(denial, { status: 403, body: {} });
  await assert.rejects(() => stagingGet(target, '/api/health', {
    fetchFn: async () => { calls += 1; return new Response(null, { status: 302, headers: { location: 'https://other.example.test/' } }); },
  }), /Unexpected redirect/);
  assert.equal(calls, 2);
});

test('smoke detects a foreign watcher in aggregate status and fails rather than reporting success', async () => {
  const target = stagingTarget(environment);
  const get = async (_target, route, options = {}) => {
    if (route === '/api/health') return { status: 200, body: { status: 'healthy' } };
    if (route === '/api/customer/bootstrap' && options.token === null) return { status: 401, body: {} };
    if (route === '/api/customer/bootstrap') return { status: 200, body: { account: { id: 'acct_a' }, watchers: [{ id: 'watch_a' }], checkJobs: [] } };
    return { status: 200, body: { watchers: [{ watcherId: 'watch_b' }] } };
  };
  await assert.rejects(() => runStagingSmoke(target, get), /outside this account/);
});

test('smoke checks health, anonymous denial, account binding, and a regional status in five GETs', async () => {
  const calls = [];
  const target = stagingTarget(environment);
  const get = async (_target, route, options = {}) => {
    calls.push({ route, token: options.token });
    if (route === '/api/health') return { status: 200, body: { status: 'healthy' } };
    if (route === '/api/customer/bootstrap' && options.token === null) return { status: 401, body: {} };
    if (route === '/api/customer/bootstrap') return { status: 200, body: { account: { id: 'acct_a' }, watchers: [{ id: 'watch_a' }], checkJobs: [] } };
    if (route === '/api/customer/notification-status') return { status: 200, body: { watchers: [{ watcherId: 'watch_a' }] } };
    if (route === '/api/watchers/watch_a/check-status') return { status: 200, body: { regions: [{ phase: 'complete' }] } };
    throw new Error(`Unexpected route ${route}`);
  };
  const result = await runStagingSmoke(target, get);
  assert.equal(result.requests, 5);
  assert.equal(result.regionalStatusChecked, true);
  assert.deepEqual(calls.map(({ route }) => route), [
    '/api/health', '/api/customer/bootstrap', '/api/customer/bootstrap',
    '/api/customer/notification-status', '/api/watchers/watch_a/check-status',
  ]);
  assert.equal(calls[1].token, null);
});

test('tenant probe fails when a guessed foreign watcher becomes accessible', async () => {
  const get = async (target, route) => {
    if (route === '/api/customer/bootstrap') return { status: 200, body: { account: { id: target.accountId }, watchers: [{ id: target.accountId === 'acct_a' ? 'watch_a' : 'watch_b' }], checkJobs: [], reportJobs: [] } };
    if (route.includes('watch_b') && target.accountId === 'acct_a') return { status: 200, body: { phase: 'idle' } };
    return { status: route.includes(target.accountId === 'acct_a' ? 'watch_a' : 'watch_b') ? 200 : 404, body: {} };
  };
  await assert.rejects(() => runStagingFunctional(environment, get), /foreign watcher check status/);
});

test('tenant probe checks foreign watcher, activity, check job, and report from both accounts', async () => {
  const calls = [];
  const get = async (target, route) => {
    calls.push({ accountId: target.accountId, route });
    if (route === '/api/customer/bootstrap') return {
      status: 200,
      body: { account: { id: target.accountId }, watchers: [{ id: `watch_${target.accountId}` }],
        checkJobs: [{ id: `job_${target.accountId}` }], reportJobs: [{ id: `report_${target.accountId}` }] },
    };
    return { status: route === `/api/watchers/watch_${target.accountId}/check-status` ? 200 : 404, body: {} };
  };
  const result = await runStagingFunctional(environment, get);
  assert.equal(result.checkJobExercised, true);
  assert.equal(result.reportExercised, true);
  assert.equal(calls.length, 12);
  for (const accountId of ['acct_a', 'acct_b']) {
    const other = accountId === 'acct_a' ? 'acct_b' : 'acct_a';
    assert.ok(calls.some((call) => call.accountId === accountId && call.route === `/api/checks/job_${other}`));
    assert.ok(calls.some((call) => call.accountId === accountId && call.route === `/api/reports/report_${other}`));
  }
});
