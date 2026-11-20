import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, defaultWatcher } from '../src/domain/defaults.mjs';
import { ReportService } from '../src/reports/service.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, mutate) { return structuredClone(await mutate(this.state)); }
}

function reportState() {
  const now = new Date().toISOString();
  const state = emptyState(now);
  state.accounts.push({ id: 'acct_report', legalName: 'Report Team', contactEmail: 'owner@example.test', planId: 'professional', closureStatus: 'active' });
  const watcher = defaultWatcher('acct_report', 'owner@example.test');
  watcher.id = 'watch_report'; watcher.name = 'Status site'; watcher.status = 'active'; watcher.config.url = 'https://status.example.test/';
  state.watchers.push(watcher);
  state.snapshots.push({ id: 'snap_report', accountId: 'acct_report', watcherId: watcher.id, capturedAt: now, outcome: 'green', reasons: [] });
  return state;
}

test('report generation stays account-scoped and produces private PDF and escaped HTML assets', async () => {
  const state = reportState();
  state.accounts[0].legalName = 'Équipe <script>alert(1)</script>';
  const other = defaultWatcher('acct_other', 'other@example.test');
  other.id = 'watch_other'; other.name = 'FOREIGN-TENANT-MARKER'; other.status = 'active';
  state.accounts.push({ id: 'acct_other', legalName: 'FOREIGN-TENANT-MARKER', planId: 'professional', closureStatus: 'active' });
  state.watchers.push(other);
  state.snapshots.push({ id: 'snap_other', accountId: 'acct_other', watcherId: other.id, capturedAt: new Date().toISOString(), outcome: 'outage', reasons: ['FOREIGN-TENANT-MARKER'] });
  const store = new MemoryStore(state);
  const written = [];
  const assets = { async put(key, data, options) { written.push({ key, data, options }); return key; } };
  const service = new ReportService({ store, assets, config: { reportQueueUrl: null }, logger: { info() {}, warn() {}, error() {} } });
  const job = await service.request('acct_report', { period: 'day', domain: 'status.example.test' }, { actorId: 'member_report' });
  assert.equal(job.status, 'completed');
  assert.equal(written.length, 2);
  assert.match(written[0].key, /^reports\/acct_report\/report_[A-Za-z0-9_]+\.pdf$/);
  assert.equal(written[0].data.subarray(0, 8).toString('ascii'), '%PDF-1.4');
  assert.equal(written[0].options.contentType, 'application/pdf');
  assert.equal(written[0].options.cacheControl, 'private, max-age=300');
  assert.equal(written[1].key, written[0].key.replace(/\.pdf$/, '.html'));
  assert.equal(written[1].options.contentType, 'text/html; charset=utf-8');
  assert.equal(written[1].options.cacheControl, 'private, max-age=300');
  assert.equal(job.htmlAssetKey, written[1].key);
  assert.match(written[1].data.toString('utf8'), /Équipe &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(written[1].data.toString('utf8'), /<script>|FOREIGN-TENANT-MARKER/);
  assert.doesNotMatch(written[0].data.toString('ascii'), /FOREIGN-TENANT-MARKER/);
  await assert.rejects(() => service.status('acct_other', job.id), (error) => error.statusCode === 404);
});

test('report requests enforce the rolling account generation ceiling', async () => {
  const state = reportState();
  const requestedAt = new Date().toISOString();
  for (let index = 0; index < 25; index += 1) state.jobs.push({ id: `old_report_${index}`, type: 'report', accountId: 'acct_report', status: 'completed', requestedAt, completedAt: requestedAt });
  const service = new ReportService({ store: new MemoryStore(state), assets: { async put() {} }, config: { reportQueueUrl: null }, logger: { info() {}, warn() {}, error() {} } });
  await assert.rejects(() => service.request('acct_report', { period: 'week', domain: 'all' }, { actorId: 'owner_report' }), (error) => error.code === 'REPORT_ALLOWANCE_EXHAUSTED' && error.statusCode === 429);
});

// A completion-commit failure must be observed before process() returns so the
// durable job is failed, rather than leaving a running job and silently retrying.
test('report completion persistence failure records a failed job and rejects', async () => {
  class FailingStore extends MemoryStore {
    async transact(label, mutate) {
      if (label === 'report.complete') throw new Error('completion commit unavailable');
      return super.transact(label, mutate);
    }
  }
  const state = reportState();
  state.jobs.push({ id: 'report_commit_failure', type: 'report', accountId: 'acct_report', period: 'day', domain: 'all', status: 'queued', requestedAt: new Date().toISOString() });
  const store = new FailingStore(state);
  const service = new ReportService({ store, assets: { async put(key) { return key; } }, config: {}, logger: { info() {}, warn() {}, error() {} } });
  await assert.rejects(() => service.process('report_commit_failure'), /completion commit unavailable/);
  const job = (await store.read()).jobs[0];
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'completion commit unavailable');
});
