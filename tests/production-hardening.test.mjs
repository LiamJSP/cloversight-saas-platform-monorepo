import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateAddress, resolveSafeTarget } from '../src/security/ssrf.mjs';
import { assertAwsSecrets, browserEnvironment } from '../src/security/runtime-boundary.mjs';
import { acquireCaptureLease } from '../src/aws/capture-lease.mjs';
import { retryDelay, sourceQueue, changeRecordVisibility } from '../src/aws/sqs-retry.mjs';
import { dispatchDueChecks } from '../src/aws/dispatcher.mjs';
import { scheduledDispatchIdentity } from '../src/aws/dispatch-identity.mjs';
import { DynamoStateStore } from '../src/storage/dynamo-store.mjs';
import { loadDeploymentSettings } from '../src/deployment/settings.mjs';
const logger = { info() {}, warn() {}, error() {} };

test('SSRF policy rejects equivalent IPv6 spellings and non-web special ranges', async () => {
  for (const ip of ['0:0:0:0:0:0:0:1', '0000:0000:0000:0000:0000:0000:0000:0000',
    '0:0:0:0:0:ffff:7f00:1', '2001:20::1', '2001:1ff::1', '2002:a9fe:a9fe::1',
    '3fff:fff::1', '64:ff9b:1::a9fe:a9fe', '5f00::1', '192.88.99.1', 'fe80::1%eth0']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['2001:200::1', '2001:4860:4860::8888', '2606:4700:4700::1111', '93.184.216.34']) assert.equal(isPrivateAddress(ip), false, ip);
  await assert.rejects(resolveSafeTarget('http://[0:0:0:0:0:0:0:1]/'), { code: 'PRIVATE_TARGET' });
  await assert.rejects(resolveSafeTarget('http://0x7f000001/'), { code: 'PRIVATE_TARGET' });
});

test('AWS rejects missing/default signing secrets and Chromium inherits no AWS/provider credentials', () => {
  for (const responseSecret of [{}, { integritySecret: 'local-only-development-secret-change-me' }, { integritySecret: 'short' }]) {
    assert.throws(() => assertAwsSecrets('worker', { responseSecret }), /signing secret/);
  }
  assert.throws(() => assertAwsSecrets('api', { responseSecret: { integritySecret: 'x'.repeat(40) } }), /origin secret/);
  assert.doesNotThrow(() => assertAwsSecrets('report'));
  assert.doesNotThrow(() => assertAwsSecrets('api', { responseSecret: { integritySecret: 'x'.repeat(40) }, originSecret: { originVerifySecret: 'y'.repeat(40) } }));
  assert.deepEqual(browserEnvironment({ PATH: '/bin', LD_LIBRARY_PATH: '/tmp/lib', AWS_ACCESS_KEY_ID: 'secret', AWS_SESSION_TOKEN: 'token', AWS_LAMBDA_RUNTIME_API: 'runtime', STRIPE_SECRET_KEY: 'sk_secret', NODE_OPTIONS: '--inspect' }), { PATH: '/bin', LD_LIBRARY_PATH: '/tmp/lib' });
});

class LeaseS3 {
  value = null; version = 0;
  async send(command) {
    const input = command.input;
    if (command.constructor.name === 'GetObjectCommand') {
      if (!this.value) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
      const copy = this.value;
      return { ETag: String(this.version), Body: { async transformToString() { return copy; } } };
    }
    if (input.IfNoneMatch && this.value || input.IfMatch && input.IfMatch !== String(this.version)) {
      throw Object.assign(new Error('conflict'), { $metadata: { httpStatusCode: 412 } });
    }
    this.value = input.Body; this.version++;
    return {};
  }
}

test('capture lease admits one competing delivery, suppresses duplicates and recovers a killed invocation', async () => {
  const client = new LeaseS3();
  const request = { client, bucket: 'captures', key: 'run-results/lease', fingerprint: 'immutable-job', now: 1_000_000 };
  const result = await Promise.allSettled([acquireCaptureLease({ ...request, owner: 'a' }), acquireCaptureLease({ ...request, owner: 'b' })]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(result.find((r) => r.status === 'rejected').reason.code, 'CAPTURE_ALREADY_RUNNING');
  await assert.rejects(acquireCaptureLease({ ...request, owner: 'c', now: 1_180_000 }), { code: 'CAPTURE_ALREADY_RUNNING' });
  await acquireCaptureLease({ ...request, owner: 'retry', now: 1_240_000 });
  assert.equal(JSON.parse(client.value).owner, 'retry');
  await acquireCaptureLease({ ...request, owner: 'last', now: 1_480_000 });
  await assert.rejects(acquireCaptureLease({ ...request, owner: 'exhausted', now: 1_720_000 }), { code: 'CAPTURE_ATTEMPT_LIMIT' });
  await assert.rejects(acquireCaptureLease({ ...request, fingerprint: 'tampered', now: 1_500_000 }), { code: 'CAPTURE_JOB_BINDING_MISMATCH' });
});

test('retry visibility is bounded, targets only configured source queues and preserves the receipt', async () => {
  const queue = 'https://sqs.us-east-1.amazonaws.com/123456789012/checks';
  const record = { eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:checks', receiptHandle: 'receipt', attributes: { ApproximateReceiveCount: '1' } };
  assert.equal(sourceQueue(record, [queue]), queue);
  assert.equal(sourceQueue(record, ['https://evil.test/123456789012/checks']), null);
  assert.equal(retryDelay(record), 30);
  assert.equal(retryDelay({ ...record, attributes: { ApproximateReceiveCount: '999' } }), 120);
  assert.equal(retryDelay(record, { retryAfterSeconds: 211 }), 211);
  const sent = [];
  await changeRecordVisibility(record, [queue], 240, { async send(command) { sent.push(command.input); } });
  assert.deepEqual(sent, [{ QueueUrl: queue, ReceiptHandle: 'receipt', VisibilityTimeout: 240 }]);
});

function dispatchFixture(count = 250) {
  const now = '2026-11-12T12:00:00.000Z';
  const watchers = Array.from({ length: count }, (_, i) => ({ id: `watch_${i}`, accountId: 'acct_power', configRevision: 1, nextCheckAt: now }));
  const claims = new Map();
  const client = { async send(command) {
    const x = command.input; const current = claims.get(x.Item.PK);
    if (current && current.leaseUntil > x.ExpressionAttributeValues[':now']) throw Object.assign(new Error('busy'), { name: 'ConditionalCheckFailedException' });
    claims.set(x.Item.PK, structuredClone(x.Item)); return {};
  } };
  const store = new DynamoStateStore({ coreTableName: 'core', idempotencyTableName: 'idem', closedAccountsTableName: 'closed', client });
  store.dueWatchers = async () => structuredClone(watchers);
  const messages = [];
  const delays = []; let failNext = false; let queueHealthy = true;
  const sqs = { async send(command) {
    if (command.constructor.name === 'GetQueueAttributesCommand') {
      if (!queueHealthy) throw new Error('queue unavailable');
      return { Attributes: { ApproximateNumberOfMessages: '0', ApproximateNumberOfMessagesNotVisible: '0', ApproximateNumberOfMessagesDelayed: '0' } };
    }
    if (command.input.Entries) {
      delays.push(...command.input.Entries.map((e) => e.DelaySeconds));
      messages.push(...command.input.Entries.map((e) => JSON.parse(e.MessageBody)));
      if (failNext) { failNext = false; throw new Error('send response lost'); }
      return { Successful: command.input.Entries.map(({ Id }) => ({ Id })) };
    }
    return {};
  } };
  const config = { checkQueueUrl: 'checks', billingQueueUrl: 'maintenance', dispatchBatchSize: 500, checkQueueMaxOutstanding: 500 };
  return { now, store, sqs, config, logger, messages, delays, watchers, fail() { failNext = true; }, unhealthy() { queueHealthy = false; } };
}

test('250-watcher burst dispatches in one tick; repeated ticks do not multiply jobs', async () => {
  const f = dispatchFixture();
  const first = await dispatchDueChecks(f);
  assert.equal(first.dispatched, 250);
  assert.ok(new Set(f.delays).size > 80);
  assert.ok(f.delays.every((n) => n >= 0 && n < 120));
  assert.equal(new Set(f.messages.map((m) => m.jobId)).size, 250);
  const repeated = await dispatchDueChecks({ ...f, now: '2026-11-12T12:01:00.000Z' });
  assert.equal(repeated.dispatched, 0);
  assert.equal(repeated.duplicateClaims, 250);
  // A stalled/ambiguous send can be recovered without minting another job ID.
  const oldIds = f.messages.map((m) => m.jobId);
  await dispatchDueChecks({ ...f, now: '2026-11-12T12:03:00.000Z' });
  assert.deepEqual(f.messages.slice(250).map((m) => m.jobId), oldIds);
  assert.notEqual(scheduledDispatchIdentity(f.watchers[0]), scheduledDispatchIdentity({ ...f.watchers[0], configRevision: 2 }));
});

test('ambiguous dispatch and unavailable queue health defer safely, without losing the due occurrence', async () => {
  const f = dispatchFixture(1); f.fail();
  await assert.rejects(dispatchDueChecks(f), /response lost/);
  assert.equal((await dispatchDueChecks(f)).dispatched, 0);
  await dispatchDueChecks({ ...f, now: '2026-11-12T12:03:00.000Z' });
  assert.equal(f.messages[0].jobId, f.messages[1].jobId);
  const down = dispatchFixture(1); down.unhealthy();
  const result = await dispatchDueChecks(down);
  assert.equal(result.dispatched, 0); assert.equal(result.maintenanceQueued, true);
});

test('capture concurrency is independent of coordinator slots; fractional settings are rejected', () => {
  const env = { STAGE: 'beta' };
  const settings = loadDeploymentSettings(env);
  assert.equal(settings.reservedCaptureConcurrency, 64);
  assert.equal(settings.regionalCaptureConcurrency, 64);
  assert.equal(settings.reservedCheckConcurrency, 2);
  assert.equal(settings.dispatchBatchSize, 500);
  assert.throws(() => loadDeploymentSettings({ ...env, CAPTURE_RESERVED_CONCURRENCY: '2.5' }), /integer/);
});

import { nextScheduledCheckAt } from '../src/monitoring/schedule.mjs';
import { BillingService } from '../src/billing/service.mjs';
import { NotificationService } from '../src/notifications/service.mjs';
import { AccountService } from '../src/services/accounts.mjs';

test('two-minute schedules keep their phase and skip missed slots without catch-up work', () => {
  const watcher = { id: 'watcher', config: { checkIntervalSeconds: 120 } };
  assert.equal(nextScheduledCheckAt(watcher, '2026-11-12T12:00:00Z', '2026-11-12T12:00:45Z'), '2026-11-12T12:02:00.000Z');
  assert.equal(nextScheduledCheckAt(watcher, '2026-11-12T12:00:00Z', '2026-11-12T12:05:00Z'), '2026-11-12T12:06:00.000Z');
  assert.equal(nextScheduledCheckAt(watcher, '2026-11-12T12:00:00Z', '2026-11-12T12:02:00Z'), '2026-11-12T12:04:00.000Z');
});

test('collection discovery paginates strongly consistent queries against the correct table', async () => {
  const calls = [];
  const store = new DynamoStateStore({ coreTableName: 'core', idempotencyTableName: 'idem', closedAccountsTableName: 'closed', client: { async send(command) {
    calls.push(command.input);
    return calls.length === 1 ? { Items: [{ collection: 'closedAccounts', value: { id: 'one' } }], LastEvaluatedKey: { PK: 'COLLECTION#closedAccounts', SK: 'ENTITY#one' } }
      : { Items: [{ collection: 'closedAccounts', value: { id: 'two' } }] };
  } } });
  assert.deepEqual(await store.readCollection('closedAccounts'), [{ id: 'one' }, { id: 'two' }]);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((x) => x.TableName === 'closed' && x.ConsistentRead === true && !x.IndexName));
  assert.ok(calls[1].ExclusiveStartKey);
});

test('quiet maintenance discovery does not reconstruct or write the global state', async () => {
  const reads = [];
  const store = { async readCollection(name) { reads.push(name); return []; }, async read() { throw new Error('global scan'); }, async transact() { throw new Error('global write'); } };
  const billing = new BillingService({ store, provider: {}, config: {}, logger });
  const notifier = new NotificationService({ store, providers: {}, config: {}, logger });
  const accounts = new AccountService({ store, config: {}, notifier });
  await billing.processRetries(); await billing.processRefunds(); await notifier.processTimers();
  assert.deepEqual(await accounts.purgeDue(), []);
  assert.deepEqual(await accounts.pendingDeletionConfirmations(), []);
  assert.deepEqual(new Set(reads), new Set(['transactions', 'refunds', 'notifications', 'alerts', 'accounts', 'closedAccounts']));
});

import { capacityPlan, assertReservationBudget } from '../src/deployment/capacity.mjs';
test('capacity planning exposes both the 250-watcher credit gap and required headroom', () => {
  const plan = capacityPlan();
  assert.equal(plan.requestedCaptures, 5_400_000);
  assert.equal(plan.requiredConcurrencyPerRegion, 90);
  assert.ok(Math.abs(plan.creditCoverageHours - 13.3333333) < 0.0001);
  assert.ok(Math.abs(plan.browserComputeUsd - 2700) < 0.01);
  assert.equal(capacityPlan({ regions: 5 }).requestedCaptures, 27_000_000);
  assert.throws(() => capacityPlan({ intervalSeconds: 0 }), /Invalid/);
  assert.throws(() => assertReservationBudget(110, [{ current: 2, desired: 64 }]), /quota increase/);
  assert.throws(() => assertReservationBudget(110, [{ current: 64, desired: 2 }, { current: 2, desired: 64 }]), /quota increase/);
  assert.deepEqual(assertReservationBudget(920, [{ current: 2, desired: 64 }]), { additional: 62, remainingUnreserved: 858 });
});
