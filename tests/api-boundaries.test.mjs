import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createRouter } from '../src/api/routes.mjs';
import { AccountService } from '../src/services/accounts.mjs';
import { ActionLogService } from '../src/services/action-log.mjs';
import { ReportService } from '../src/reports/service.mjs';
import { NotificationService } from '../src/notifications/service.mjs';
import { RegionalMonitoringCoordinator } from '../src/monitoring/regional-coordinator.mjs';
import { defaultWatcher, emptyState } from '../src/domain/defaults.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, mutate) { return structuredClone(await mutate(this.state)); }
}
const logger = { debug() {}, info() {}, warn() {}, error() {} };
const config = { awsRegion: 'us-east-1', availableCheckRegions: ['us-east-1'], emailProvider: 'local', smsEnabled: false, integritySecret: 'test-integrity-secret-at-least-32-characters', responseBaseUrl: 'http://localhost:4010', billingProvider: 'local' };
function fixture() {
  const state = emptyState();
  for (const [accountId, userId] of [['acct_a', 'user_a'], ['acct_b', 'user_b']]) {
    state.accounts.push({ id: accountId, planId: 'professional', provider: 'local', closureStatus: 'active', profileComplete: true, contactEmail: `${userId}@example.test`, legalName: accountId, createdAt: new Date().toISOString() });
    state.teamMembers.push({ id: `member_${accountId}`, accountId, userId, status: 'active', role: 'owner' });
    const watcher = defaultWatcher(accountId, `${userId}@example.test`);
    watcher.id = `watch_${accountId}`; watcher.name = `Private ${accountId}`;
    watcher.config.url = `https://${accountId}.example.test/`;
    state.watchers.push(watcher);
    state.jobs.push({ id: `job_${accountId}`, accountId, type: 'check', watcherId: watcher.id, status: 'failed', error: `private-worker-${accountId}`, requestedAt: new Date().toISOString() });
    state.transactions.push({ id: `txn_${accountId}`, accountId, status: 'failed', type: 'plan_change', amountMinor: 1900, providerPaymentId: `secret-${accountId}`, createdAt: new Date().toISOString() });
    state.jobs.push({ id: `report_${accountId}`, accountId, type: 'report', status: 'completed', requestedAt: new Date().toISOString() });
  }
  return state;
}
function harness(state = fixture()) {
  const store = new MemoryStore(state);
  const accounts = new AccountService({ store, config });
  const actionLog = new ActionLogService({ store, config });
  const reports = new ReportService({ store, assets: {}, config, logger });
  const notifier = new NotificationService({ store, providers: {}, config, logger });
  const monitoring = new RegionalMonitoringCoordinator({ store, config, logger, dispatcher: { async send() { throw new Error('unexpected dispatch'); } } });
  let billingRetries = 0;
  const router = createRouter({ config, store, accounts, actionLog, reports, notifier, monitoring, assets: {}, watcherService: {}, logger, billing: { async retry() { billingRetries += 1; throw new Error('unexpected billing retry'); } } });
  async function request(path, { actorId = 'user_a', method = 'GET' } = {}) {
    const req = Readable.from([]);
    req.method = method; req.headers = {}; req.socket = { remoteAddress: '127.0.0.1' };
    let status = 200, body = '';
    const res = { writeHead(code) { status = code; }, end(value) { body += value ?? ''; } };
    const actor = { role: 'customer', actorId, email: `${actorId}@example.test`, ip: '127.0.0.1', requestId: 'test-request' };
    try { await router(req, res, new URL(path, 'http://localhost:4010'), actor); return { status, body: JSON.parse(body) }; }
    catch (error) { return { status: error.statusCode ?? 500, code: error.code }; }
  }
  return { request, store, get billingRetries() { return billingRetries; } };
}

test('HTTP bootstrap only returns the verified team account, even when storage supplies all tenants', async () => {
  const { request } = harness();
  const a = await request('/api/customer/bootstrap');
  assert.equal(a.status, 200);
  assert.deepEqual(a.body.watchers.map(({ id }) => id), ['watch_acct_a']);
  assert.deepEqual(a.body.checkJobs.map(({ id }) => id), ['job_acct_a']);
  assert.deepEqual(a.body.transactions.map(({ id }) => id), ['txn_acct_a']);
  assert.doesNotMatch(JSON.stringify(a.body), /acct_b|secret-acct_b|private-worker-acct_b/);
  const b = await request('/api/customer/bootstrap', { actorId: 'user_b' });
  assert.equal(b.status, 200);
  assert.deepEqual(b.body.watchers.map(({ id }) => id), ['watch_acct_b']);
});

test('guessed watcher, check, report, and billing identifiers cannot cross the HTTP account boundary', async () => {
  const app = harness();
  for (const [path, method, allowedStatuses] of [
    ['/api/watchers/watch_acct_b/check-status', 'GET', [404]],
    ['/api/watchers/watch_acct_b/notification-activity', 'GET', [404]],
    ['/api/watchers/watch_acct_b/check', 'POST', [404]],
    ['/api/checks/job_acct_b', 'GET', [404]],
    ['/api/reports/report_acct_b', 'GET', [404]],
    ['/api/transactions/txn_acct_b/retry', 'POST', [403]],
  ]) {
    const response = await app.request(path, { method });
    assert.ok(allowedStatuses.includes(response.status), `${method} ${path} returned ${response.status}`);
  }
  assert.equal(app.billingRetries, 0);
  assert.equal((await app.store.read()).accounts.length, 2);
});

test('revoked members cannot reach account data through any customer route', async () => {
  const state = fixture();
  state.teamMembers.find(({ userId }) => userId === 'user_a').status = 'revoked';
  const { request } = harness(state);
  for (const path of ['/api/customer/bootstrap', '/api/watchers/watch_acct_a/check-status', '/api/reports']) {
    assert.equal((await request(path)).status, 403, path);
  }
});
