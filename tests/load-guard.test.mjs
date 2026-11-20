import test from 'node:test';
import assert from 'node:assert/strict';
import { planLoadProbe, costLedger } from '../scripts/load-guard.mjs';
import { runLoadProbe } from '../scripts/staging-load-probe.mjs';

const input = { maxUsd: 0.50, maxRequests: 40, durationSeconds: 30, concurrency: 2, intervalMs: 500 };
const target = { baseUrl: 'https://stage.example.test', host: 'stage.example.test', accountId: 'acct_a', token: 'x'.repeat(40) };

test('cost guard clamps requests to estimated ceiling and charges before every attempt', () => {
  const plan = planLoadProbe(input);
  assert.equal(plan.totalRequests, 5);
  assert.equal(plan.loadRequests, 4);
  const ledger = costLedger(plan);
  for (let attempt = 0; attempt < 5; attempt += 1) assert.equal(ledger.reserve(), true);
  assert.equal(ledger.reserve(), false);
  assert.equal(ledger.attempts, 5);
  assert.equal(ledger.estimatedCents, 50);
});

test('cost guard rejects unsafe cost, time, concurrency, and rate overrides', () => {
  for (const bad of [
    { maxUsd: 5.01 }, { maxUsd: 0.21_1 }, { maxRequests: 101 },
    { durationSeconds: 61 }, { concurrency: 4 }, { intervalMs: 499 },
  ]) assert.throws(() => planLoadProbe({ ...input, ...bad }));
});

test('capped probe uses the real reservation boundary for preflight and every GET', async () => {
  const requests = [];
  const plan = planLoadProbe(input);
  const fetchFn = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/bootstrap')) return new Response(JSON.stringify({ account: { id: target.accountId }, watchers: [] }), { status: 200 });
    return new Response('{}', { status: 200 });
  };
  const result = await runLoadProbe(target, plan, { fetchFn, delay: async () => {} });
  assert.equal(result.attempts, 5);
  assert.equal(result.completed, 5);
  assert.equal(result.estimatedCents, 50);
  assert.ok(requests.every(({ url, options }) => options.method === 'GET' && options.redirect === 'manual' && url.startsWith(target.baseUrl)));
});

test('preflight identity mismatch stops before any load request', async () => {
  let calls = 0;
  await assert.rejects(() => runLoadProbe(target, planLoadProbe(input), { fetchFn: async () => {
    calls += 1;
    return new Response(JSON.stringify({ account: { id: 'acct_other' }, watchers: [] }), { status: 200 });
  }, delay: async () => {} }), /identity did not match/);
  assert.equal(calls, 1);
});
