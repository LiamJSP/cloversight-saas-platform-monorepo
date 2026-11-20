import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { stagingTarget, stagingGet, expectStagingStatus } from './staging-test-client.mjs';

export async function runStagingSmoke(target = stagingTarget(), get = stagingGet) {
  const health = expectStagingStatus(await get(target, '/api/health', { token: null }), [200], '/api/health');
  if (health.status !== 'healthy') throw new Error('Public health route is not healthy.');
  expectStagingStatus(await get(target, '/api/customer/bootstrap', { token: null }), [401, 403], 'anonymous bootstrap');
  const bootstrap = expectStagingStatus(await get(target, '/api/customer/bootstrap'), [200], 'customer bootstrap');
  if (bootstrap.account?.id !== target.accountId || !Array.isArray(bootstrap.watchers) || !Array.isArray(bootstrap.checkJobs)) throw new Error('Bootstrap did not return the expected staging account and collections.');
  const notification = expectStagingStatus(await get(target, '/api/customer/notification-status'), [200], 'notification status');
  const ids = new Set(bootstrap.watchers.map((item) => item.id));
  if (!Array.isArray(notification.watchers) || notification.watchers.some((item) => !ids.has(item.watcherId))) throw new Error('Notification status included a watcher outside this account.');
  let checkedWatcher = false;
  if (bootstrap.watchers.length) {
    const watcherId = encodeURIComponent(bootstrap.watchers[0].id);
    const status = expectStagingStatus(await get(target, `/api/watchers/${watcherId}/check-status`), [200], 'watcher check status');
    if (!Array.isArray(status.regions) || !status.regions.length || status.regions.some((row) => !['idle', 'queued', 'running', 'complete', 'website', 'error', 'skipped', 'unknown'].includes(row.phase))) throw new Error('Regional check status has an invalid customer-facing shape.');
    if (/\b(?:errorCode|stack|bucket|queueUrl|providerCustomerId)\b/.test(JSON.stringify(status))) throw new Error('Customer-facing check status contains internal diagnostic keys.');
    checkedWatcher = true;
  }
  return { accountId: target.accountId, watcherCount: ids.size, regionalStatusChecked: checkedWatcher, requests: checkedWatcher ? 5 : 4 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runStagingSmoke().then((result) => console.log(`Staging smoke passed: ${result.requests} read-only requests, ${result.watcherCount} watchers, regional status ${result.regionalStatusChecked ? 'checked' : 'not present (no watchers)'}.`))
    .catch((error) => { console.error(`Staging smoke failed: ${error.message}`); process.exitCode = 1; });
}
