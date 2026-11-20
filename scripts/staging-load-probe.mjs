import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { stagingTarget } from './staging-test-client.mjs';
import { planLoadProbe, costLedger } from './load-guard.mjs';

export async function runLoadProbe(target, plan, { fetchFn = fetch, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const ledger = costLedger(plan);
  const started = Date.now();
  const deadline = started + plan.durationMs;
  const controllers = new Set();
  const latencies = [];
  let firstError = null;
  let stopped = false;
  const timer = setTimeout(() => { stopped = true; for (const controller of controllers) controller.abort(); }, plan.durationMs);

  async function oneRequest(route, verifyAccount = false) {
    if (stopped || Date.now() >= deadline || !ledger.reserve()) return false;
    const controller = new AbortController(); controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), Math.min(8000, Math.max(1, deadline - Date.now())));
    const start = Date.now();
    try {
      const response = await fetchFn(`${target.baseUrl}${route}`, {
        method: 'GET', redirect: 'manual', cache: 'no-store',
        headers: { authorization: `Bearer ${target.token}`, accept: 'application/json' }, signal: controller.signal,
      });
      if (response.status !== 200) throw new Error(`Read-only staging request returned HTTP ${response.status}.`);
      if (verifyAccount) {
        const data = await response.json();
        if (data.account?.id !== target.accountId) throw new Error('Preflight account identity did not match the selected staging fixture.');
        if (!Array.isArray(data.watchers) || data.watchers.length > 10) throw new Error('Load fixture must contain no more than ten watchers.');
      } else await response.body?.cancel();
      latencies.push(Date.now() - start);
      return true;
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }

  try {
    if (!await oneRequest('/api/customer/bootstrap', true)) throw new Error('Insufficient time or budget for the staging account preflight.');
    const pending = new Set();
    for (let i = 0; i < plan.loadRequests && !firstError && !stopped && Date.now() < deadline; i += 1) {
      while (pending.size >= plan.concurrency && !firstError && !stopped) await Promise.race(pending);
      if (firstError || stopped || Date.now() >= deadline) break;
      const work = oneRequest('/api/customer/notification-status')
        .catch((error) => { firstError ??= error; stopped = true; for (const controller of controllers) controller.abort(); })
        .finally(() => pending.delete(work));
      pending.add(work);
      await delay(Math.min(plan.intervalMs, Math.max(0, deadline - Date.now())));
    }
    await Promise.all(pending);
    if (firstError) throw firstError;
    if (ledger.attempts < 2) throw new Error('No load request completed before the duration ceiling.');
    const ordered = latencies.sort((a, b) => a - b);
    return { attempts: ledger.attempts, estimatedCents: ledger.estimatedCents, completed: ordered.length, p95Ms: ordered[Math.ceil(ordered.length * 0.95) - 1] ?? null, durationMs: Date.now() - started };
  } finally { clearTimeout(timer); for (const controller of controllers) controller.abort(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  try {
    const execute = args.length === 1 && args[0] === '--execute';
    const dryRun = !args.length || (args.length === 1 && args[0] === '--dry-run');
    if (!execute && !dryRun) throw new Error('Specify either --dry-run or --execute, never both.');
    const target = stagingTarget();
    const plan = planLoadProbe({
      maxUsd: process.env.WEBWATCH_TEST_MAX_USD,
      maxRequests: process.env.WEBWATCH_TEST_MAX_REQUESTS ?? 40,
      durationSeconds: process.env.WEBWATCH_TEST_DURATION_SECONDS ?? 30,
      concurrency: process.env.WEBWATCH_TEST_CONCURRENCY ?? 2,
      intervalMs: process.env.WEBWATCH_TEST_INTERVAL_MS ?? 500,
    });
    if (dryRun) {
      console.log(`Dry run: host ${target.host}; at most ${plan.totalRequests} GETs including identity preflight, ${plan.durationMs / 1000}s, ${plan.concurrency} concurrent, estimate $${(plan.maximumEstimatedCents / 100).toFixed(2)} against the $${(plan.ceilingCents / 100).toFixed(2)} input ceiling. No requests sent. Add --execute to run.`);
    } else {
      const result = await runLoadProbe(target, plan);
      console.log(`Capped probe complete: ${result.completed}/${result.attempts} read-only requests, p95 ${result.p95Ms} ms, elapsed ${result.durationMs} ms, conservative estimate $${(result.estimatedCents / 100).toFixed(2)}.`);
    }
  } catch (error) { console.error(`Capped probe failed: ${error.message}`); process.exitCode = 1; }
}
