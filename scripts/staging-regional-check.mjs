import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { stagingTarget, stagingGet, stagingPost, expectStagingStatus } from './staging-test-client.mjs';
import { refreshConfiguration, refreshStagingTokens } from './staging-ci-tokens.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TERMINAL = new Set(['completed', 'failed', 'skipped']);

export function regionalCheckFixture(env = process.env) {
  if (env.WEBWATCH_TEST_ALLOW_CHECK !== '1') throw new Error('Set WEBWATCH_TEST_ALLOW_CHECK=1 to authorize one staging check.');
  const watcherId = String(env.WEBWATCH_TEST_CHECK_WATCHER_ID ?? '');
  const expectedUrl = String(env.WEBWATCH_TEST_CHECK_URL ?? '');
  const regions = String(env.WEBWATCH_TEST_CHECK_REGIONS ?? '').split(',').map((item) => item.trim());
  // A queued check can take ten minutes before it is declared stale; the
  // regional result deadline then permits a further fifteen minutes.
  const seconds = Number(env.WEBWATCH_TEST_CHECK_TIMEOUT_SECONDS ?? 1620);
  if (!/^[-_A-Za-z0-9]{3,128}$/.test(watcherId)) throw new Error('Provide the dedicated staging watcher ID.');
  let url;
  try { url = new URL(expectedUrl); } catch { throw new Error('Provide the exact HTTPS URL of the dedicated stable staging target.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') || url.hash || url.port ||
      net.isIP(url.hostname) || /(?:^|\.)(?:localhost|local|internal|test)$/.test(url.hostname)) throw new Error('Staging check target must be a public DNS HTTPS URL without credentials, fragment or port.');
  if (regions.length !== 2 || new Set(regions).size !== 2 || regions.some((region) => !/^[a-z]{2}-[a-z]+-\d$/.test(region))) throw new Error('Configure exactly two distinct expected check regions to cap the probe.');
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 1800) throw new Error('Check timeout must be 60–1800 seconds.');
  if (seconds > 600) {
    refreshConfiguration(env);
    if (!env.WEBWATCH_TEST_REFRESH_TOKEN_A || !env.WEBWATCH_TEST_REFRESH_TOKEN_B) throw new Error('Checks longer than ten minutes require both Cognito refresh credentials for the 15-minute access token.');
  }
  return { watcherId, expectedUrl, regions, timeoutMs: seconds * 1000 };
}

function checkJob(result, watcherId, expectedId) {
  if (result.status !== 200 || result.body?.id !== expectedId || result.body?.watcherId !== watcherId ||
      !['queued', 'running', ...TERMINAL].includes(result.body.status)) {
    throw new Error('The check job returned an unexpected account binding or response shape.');
  }
  return result.body;
}

export async function runStagingRegionalCheck(env = process.env, { get = stagingGet, post = stagingPost, wait = sleep, now = Date.now, renew = refreshStagingTokens } = {}) {
  const target = stagingTarget(env);
  const fixture = regionalCheckFixture(env);
  const bootstrap = expectStagingStatus(await get(target, '/api/customer/bootstrap'), [200], 'preflight bootstrap');
  if (bootstrap.account?.id !== target.accountId) throw new Error('The staging check account does not match its access token.');
  if (!Number.isFinite(bootstrap.captureUsage?.remaining) || bootstrap.captureUsage.remaining < 2) throw new Error('The dedicated account needs at least two capture credits before this check.');
  const watcher = bootstrap.watchers?.find((item) => item.id === fixture.watcherId);
  if (!watcher || watcher.status !== 'active' || watcher.config?.url !== fixture.expectedUrl ||
      !Number.isInteger(watcher.config?.checkIntervalSeconds) || watcher.config.checkIntervalSeconds < 604800 ||
      JSON.stringify(watcher.config?.checkRegions) !== JSON.stringify(fixture.regions)) {
    throw new Error('Dedicated weekly watcher, exact stable target URL, or enabled regions differ from the CI fixture.');
  }
  if (bootstrap.checkJobs?.some((job) => job.watcherId === watcher.id && ['queued', 'running'].includes(job.status))) throw new Error('A check is already in progress for the CI watcher; refusing a deduplicated check.');
  if (bootstrap.alerts?.some((alert) => alert.watcherId === watcher.id && ['open', 'acknowledged', 'resolving'].includes(alert.status))) throw new Error('The CI watcher has an open alert; its target must be stable before this probe.');
  const route = `/api/watchers/${encodeURIComponent(watcher.id)}/check`;
  const start = now();
  // A single mutation per run. A failed/lost POST is reported, never retried.
  const submitted = await post(target, route, {});
  if (![200, 202].includes(submitted.status) || submitted.body?.watcherId !== watcher.id ||
      !/^[-_A-Za-z0-9]{3,180}$/.test(String(submitted.body?.id ?? '')) || submitted.body?.deduplicated || submitted.body?.status === 'skipped') {
    throw new Error('Check submission did not create a new job for the dedicated watcher.');
  }
  const jobId = submitted.body.id;
  const deadline = start + fixture.timeoutMs;
  let renewedAt = start;
  async function renewIfNeeded() {
    if (now() - renewedAt < 8 * 60_000) return;
    const tokens = await renew(env);
    if (!tokens?.A) throw new Error('Cognito did not renew the staging access token during the check.');
    target.token = tokens.A;
    renewedAt = now();
  }
  let transient = 0;
  let job;
  let polls = 0;
  while (now() < deadline && polls < 270) {
    polls += 1;
    try {
      await renewIfNeeded();
      const response = await get(target, `/api/checks/${encodeURIComponent(jobId)}`, { timeoutMs: 12000 });
      if ([429, 502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status} while polling the check job.`);
      if (response.status === 404 && now() - start < 30_000) { /* Persisted API reads may lag briefly. */ }
      else {
        job = checkJob(response, watcher.id, jobId);
        transient = 0;
        if (TERMINAL.has(job.status)) break;
      }
    } catch (error) {
      // API Gateway and Lambda may briefly return 429/502/503/504 during
      // deployment or scaling. Never retry a POST or conceal a lasting fault.
      if (!/(?:HTTP (?:429|502|503|504)|AbortError|TimeoutError|fetch failed)/.test(`${error.name} ${error.message}`) || ++transient > 4) throw error;
    }
    await wait(Math.min(7000, Math.max(0, deadline - now())));
  }
  if (!job || !TERMINAL.has(job.status)) throw new Error(`Regional check did not finish within ${fixture.timeoutMs / 1000}s and ${polls} bounded reads.`);
  if (job.status !== 'completed' || job.outcome !== 'green' || !job.snapshotId) throw new Error(`Regional check ended with ${job.status}/${job.outcome ?? 'unavailable'} rather than a healthy snapshot.`);

  // The job and the customer summary are distinct reads. Allow time for the
  // snapshot and its GSI-backed references to become visible after completion.
  let regionStatus;
  let summaryTransient = 0;
  const summaryDeadline = now() + 90_000;
  for (let attempt = 0; attempt < 18 && now() < summaryDeadline; attempt += 1) {
    await renewIfNeeded();
    try {
      const response = await get(target, `/api/watchers/${encodeURIComponent(watcher.id)}/check-status`, { timeoutMs: 12000 });
      if ([429, 502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status} while polling regional status.`);
      regionStatus = expectStagingStatus(response, [200], 'regional check status');
      summaryTransient = 0;
      const rows = regionStatus.regions;
      if (Array.isArray(rows) && rows.length === 2 && rows.every((row, index) => row.id === fixture.regions[index] && row.phase === 'complete')) break;
      if (Array.isArray(rows) && rows.some((row) => ['website', 'error'].includes(row.phase))) throw new Error('A regional capture reported a website or watcher error.');
    } catch (error) {
      if (!/(?:HTTP (?:429|502|503|504)|AbortError|TimeoutError|fetch failed)/.test(`${error.name} ${error.message}`) || ++summaryTransient > 4) throw error;
    }
    await wait(Math.min(5000, Math.max(0, summaryDeadline - now())));
  }
  if (regionStatus?.phase !== 'completed' || !fixture.regions.every((region, index) => regionStatus.regions?.[index]?.id === region && regionStatus.regions[index].phase === 'complete')) {
    throw new Error('The completed check did not produce successful customer-facing results for both enabled regions.');
  }
  if (/\b(?:errorCode|stack|bucket|queueUrl|providerCustomerId)\b/.test(JSON.stringify(regionStatus))) throw new Error('Regional status exposed an internal diagnostic key.');
  return { jobId, snapshotId: job.snapshotId, regionCount: 2, polls };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runStagingRegionalCheck().then(({ regionCount, polls }) => console.log(`Staging regional capture passed: ${regionCount} regions, ${polls} bounded job reads.`))
    .catch((error) => { console.error(`Staging regional capture failed: ${error.message}`); process.exitCode = 1; });
}
