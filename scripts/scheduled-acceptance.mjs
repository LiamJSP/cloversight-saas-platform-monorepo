// Opt-in operator tool. Ordinary releases and pull requests never start customer captures.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { readStack, stackResources, awsJson } from './aws-cli.mjs';
import { DynamoStateStore } from '../src/storage/dynamo-store.mjs';
import { WatcherService } from '../src/services/watchers.mjs';
import { defaultWatcher } from '../src/domain/defaults.mjs';
import { captureCreditUsage, entitlements, validateWatcherForPlan } from '../src/domain/plans.mjs';
import { ensureWatcherUsage, updateWatcherUsage } from '../src/domain/usage-guards.mjs';
import { scheduleAfterEdit } from '../src/monitoring/schedule.mjs';
import { summarizeRun } from './acceptance-metrics.mjs';

const [mode, option] = process.argv.slice(2);
const counts = { smoke: 1, business: 250 };
if (!['plan', 'run', 'report', 'cleanup'].includes(mode) || process.argv.length !== 4) throw new Error('Use plan|run smoke|business, or report|cleanup RUN_ID.');
if (['plan', 'run'].includes(mode) && !Object.hasOwn(counts, option)) throw new Error('Choose smoke or business.');
const target = 'https://cloversight.app/security';
const region = 'us-east-1';
const stackName = 'webwatch-prod';
const count = counts[option];
const cycles = count === 1 ? 1 : 2;
const iso = ms => new Date(ms).toISOString();
if (mode === 'plan') {
  console.log(JSON.stringify({ target, watchers: count, intervalSeconds: 120, cycles, maximumCaptureCredits: count * cycles, regions: [region], startsExpireAfterMinutes: 12 }, null, 2));
  process.exit(0);
}
const runId = mode === 'run' ? randomUUID() : option;
if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(runId)) throw new Error('Invalid run ID.');
const folder = path.resolve('.local', 'acceptance', runId);
const manifestFile = path.join(folder, 'fixture.json');
function save(file, value) {
  const temp = file + '.new';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, file);
}
const accountId = process.env.ACCEPTANCE_ACCOUNT_ID;
const email = process.env.ACCEPTANCE_OWNER_EMAIL;
if (!accountId || !email || !process.env.AWS_PROFILE) throw new Error('Set AWS_PROFILE, ACCEPTANCE_ACCOUNT_ID and ACCEPTANCE_OWNER_EMAIL for the dedicated Business test tenant.');
const stack = readStack(stackName, region);
if (!stack?.StackId.startsWith('arn:aws:cloudformation:us-east-1:807434077491:stack/webwatch-prod/') ||
    !['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stack.StackStatus)) throw new Error('Requires the stable installed production stack.');
const outputs = Object.fromEntries(stack.Outputs.map(o => [o.OutputKey, o.OutputValue]));
if (outputs.PublicUrl !== new URL(target).origin) throw new Error('Unexpected production hostname.');
const resources = Object.fromEntries(stackResources(stack, region).map(r => [r.LogicalResourceId, r.PhysicalResourceId]));
const store = new DynamoStateStore({ region, coreTableName: resources.CoreTable, idempotencyTableName: resources.IdempotencyTable, closedAccountsTableName: resources.ClosedAccountsTable });
async function customer(route) {
  const token = fs.readFileSync('.local/acceptance-owner-token', 'utf8').trim();
  if (!token || /\s/.test(token)) throw new Error('Provide the dedicated owner access token in .local/acceptance-owner-token.');
  const response = await fetch(new URL(route, outputs.PublicUrl), {
    headers: { authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Customer evidence API returned HTTP ' + response.status + '. Refresh the dedicated token and use report with the same run ID.');
  return response.json();
}
const identity = await customer('/api/customer/bootstrap?view=identity');
if (identity.accountId !== accountId || identity.owner !== true || identity.boundedScheduledAcceptance !== 1)
  throw new Error('Account binding, deployed bounded scheduler version, or owner login failed.');
function validateOwner(a) {
  if (!a || a.id !== accountId || a.contactEmail?.toLowerCase() !== email.toLowerCase() || a.closureStatus !== 'active') throw new Error('Dedicated test account or owner email differs.');
}
const owner = await store.getEntity('accounts', accountId);
validateOwner(owner);
let manifest;
if (mode === 'run') {
  const startMs = Date.now() + 120_000;
  const start = iso(startMs);
  const expiresAt = iso(startMs + 12 * 60_000);
  const usage = captureCreditUsage(owner);
  if (entitlements(owner).id !== 'business' || usage.remaining < count * cycles || usage.periodEnd <= expiresAt) throw new Error('An active Business allowance covering this run is required.');
  await ensureWatcherUsage(store, accountId);
  const fixtures = Array.from({ length: count }, (_, index) => {
    const watcher = defaultWatcher(accountId, email);
    watcher.id = 'watch_accept_' + runId + '_' + index;
    watcher.name = 'Scheduled acceptance ' + runId.slice(0, 8) + ' / ' + (index + 1);
    watcher.config.url = target;
    watcher.config.checkIntervalSeconds = 120;
    watcher.config.methods = ['outage', 'text_change'];
    watcher.status = 'active';
    watcher.nextCheckAt = scheduleAfterEdit(watcher, start);
    watcher.acceptanceRun = { id: runId, startsLeft: cycles, expiresAt };
    return watcher;
  });
  manifest = { runId, accountId, stackId: stack.StackId, target, start, expiresAt, cycles, creditsBefore: usage.used,
    periodStart: usage.periodStart, periodEnd: usage.periodEnd, fixtures: fixtures.map(w => ({ id: w.id, firstDue: w.nextCheckAt })) };
  fs.mkdirSync(folder, { mode: 0o700, recursive: true });
  save(manifestFile, manifest);
  console.log('Acceptance run ' + runId + '. Evidence and recovery manifest: ' + folder);
  // Small conditional transactions. The strongly read account counter prevents a concurrent
  // run or another customer's watchers from mixing with this cohort.
  for (let i = 0; i < count; i += 20) {
    await store.transactAccount(accountId, 'acceptance.provision', state => {
      const a = state.accounts.find(row => row.id === accountId);
      validateOwner(a);
      if (Date.now() >= startMs || a.watcherUsage?.version !== 1 || a.watcherUsage.total !== i ||
          entitlements(a).id !== 'business' || captureCreditUsage(a).used !== usage.used) throw new Error('Fixture provisioning lost isolation or missed the start window. Use cleanup for this run.');
      for (const w of fixtures.slice(i, i + 20)) {
        const { errors } = validateWatcherForPlan(w.config, a, a.watcherUsage.total, true);
        if (errors.length) throw new Error(errors.join(' '));
        state.watchers.push(structuredClone(w));
        updateWatcherUsage(a, null, w);
      }
    }, { lookupPrefixes: [], directEntities: fixtures.slice(i, i + 20).map(w => ({ collection: 'watchers', id: w.id })) });
  }
} else {
  manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest.accountId !== accountId || manifest.stackId !== stack.StackId || manifest.runId !== runId ||
      ![1, 250].includes(manifest.fixtures.length) || manifest.fixtures.some((f, i) => f.id !== 'watch_accept_' + runId + '_' + i)) throw new Error('Fixture manifest binding failed.');
}
if (mode === 'cleanup') {
  const service = new WatcherService({ store, config: { awsRegion: region } });
  for (const { id } of manifest.fixtures) {
    const w = await store.getEntity('watchers', id);
    if (!w || w.status === 'deleted') continue;
    if (w.accountId !== accountId || w.acceptanceRun?.id !== runId) throw new Error('Unexpected watcher ownership.');
    if (w.status === 'checking') throw new Error('A capture is settling. Retry cleanup after it finishes.');
    await service.remove(accountId, id, { accountId, teamRole: 'owner', role: 'customer', reason: 'Remove scheduled acceptance fixture' });
  }
  console.log('Released the saved watcher slots for ' + runId + '.');
  process.exit(0);
}
const ids = new Set(manifest.fixtures.map(f => f.id));
const end = Date.parse(manifest.expiresAt) + 3 * 60_000;
if (mode === 'run') {
  // Poll only the fresh, known watcher IDs. Older jobs and screenshots in the
  // tenant's retained history are never repeatedly loaded while captures run.
  const scoped = { lookupPrefixes: [], directEntities: manifest.fixtures.map(f => ({ collection: 'watchers', id: f.id })) };
  while (Date.now() < end) {
    const { watchers } = await store.readAccount(accountId, scoped);
    if (watchers.length === manifest.fixtures.length && watchers.every(w => w.acceptanceRun?.id === runId && w.status === 'paused')) break;
    await wait(15_000);
  }
}
// Read the tenant's durable job index once to include failed, skipped and
// unexpected manual attempts as well as the expected successes.
const jobs = (await store.readAccount(accountId, { lookupPrefixes: ['JOBS#'] })).jobs.filter(j => ids.has(j.watcherId));
const current = captureCreditUsage(await store.getEntity('accounts', accountId));
const measures = summarizeRun({ ...manifest, jobs, creditsAfter: current.used, periodStable: current.periodStart === manifest.periodStart && current.periodEnd === manifest.periodEnd });
const result = { runId, target, ...measures, queueMaxAgeSeconds: {}, customerEvidence: null, passed: false };
const report = path.join(folder, 'result.json');
save(report, result);
const finish = Math.min(end, Math.max(Date.parse(manifest.start) + 60_000, ...jobs.filter(j => ids.has(j.watcherId)).map(j => Date.parse(j.completedAt) || 0), Math.min(Date.now(), Date.parse(manifest.expiresAt))));
// Freeze the observation window on the first completed measurement for historical reports.
manifest.observedUntil ??= iso(finish);
if (mode === 'run' || measures.completed === measures.expected) save(manifestFile, manifest);
for (const [role, output] of Object.entries({ checks: 'CheckQueueUrl', captures: 'CaptureQueueUrl', results: 'CaptureResultQueueUrl' })) {
  const name = new URL(outputs[output]).pathname.split('/').pop();
  const stats = awsJson(['cloudwatch', 'get-metric-statistics', '--namespace', 'AWS/SQS', '--metric-name', 'ApproximateAgeOfOldestMessage',
    '--dimensions', 'Name=QueueName,Value=' + name, '--start-time', manifest.start, '--end-time', manifest.observedUntil,
    '--period', '60', '--statistics', 'Maximum'], { region });
  const values = stats.Datapoints.map(p => p.Maximum).filter(Number.isFinite);
  result.queueMaxAgeSeconds[role] = values.length ? Math.max(...values) : null;
}
save(report, result);
const sample = jobs.find(j => ids.has(j.watcherId) && j.type === 'check' && !j.manual && j.status === 'completed' && j.outcome === 'green' && j.snapshotId);
if (sample) {
  const snapshot = await customer('/api/watchers/' + encodeURIComponent(sample.watcherId) + '/snapshots/' + encodeURIComponent(sample.snapshotId) + '/assets');
  const screenshots = snapshot.screenshots || [];
  if (snapshot.id === sample.snapshotId && snapshot.accountId === accountId && snapshot.watcherId === sample.watcherId &&
      Date.parse(snapshot.capturedAt) >= Date.parse(manifest.start) && ['desktop', 'tablet', 'mobile'].every(p => screenshots.some(s => s.profile === p && s.pngUrl))) {
    const url = new URL(screenshots.find(s => s.profile === 'desktop').pngUrl);
    if (url.protocol !== 'https:' || !(url.hostname.endsWith('.amazonaws.com') || url.origin === outputs.PublicUrl)) throw new Error('Unexpected evidence origin.');
    const bytes = await fetch(url, { headers: { range: 'bytes=0-7' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (bytes.status === 206 && Buffer.from(await bytes.arrayBuffer()).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
      result.customerEvidence = { watcherId: sample.watcherId, snapshotId: sample.snapshotId, capturedAt: snapshot.capturedAt, profiles: ['desktop', 'tablet', 'mobile'] };
    } else await bytes.body?.cancel();
  }
}
result.passed = measures.passed && Boolean(result.customerEvidence) && Object.values(result.queueMaxAgeSeconds).every(v => v !== null && v <= 120);
save(report, result);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
