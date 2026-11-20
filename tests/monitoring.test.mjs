import test from 'node:test';
import assert from 'node:assert/strict';
import { MonitoringEngine, monitoringEngineInternals } from '../src/monitoring/engine.mjs';
import { customerWatcherCheckStatus } from '../src/monitoring/check-status.mjs';
import { emptyState } from '../src/domain/defaults.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, mutate) { return structuredClone(await mutate(this.state)); }
}
const logger = { debug() {}, info() {}, warn() {}, error() {} };

test('regional check summary isolates tenants and removes worker diagnostics from customer output', () => {
  const state = emptyState();
  const watcher = { id: 'watch_a', accountId: 'acct_a', status: 'checking', activeCheckJobId: 'job_a', config: { checkRegions: ['us-east-1', 'eu-west-1'] } };
  state.jobs.push(
    { id: 'job_a', type: 'check', accountId: 'acct_a', watcherId: 'watch_a', status: 'running', requestedAt: '2026-09-26T10:00:00.000Z', captureRun: { id: 'run_a' }, error: 'secret-queue-url' },
    { id: 'foreign', type: 'capture-result', accountId: 'acct_b', watcherId: 'watch_a', parentJobId: 'job_a', runId: 'run_a', region: 'eu-west-1', result: { status: 'success' } },
    { id: 'east', type: 'capture-result', accountId: 'acct_a', watcherId: 'watch_a', parentJobId: 'job_a', runId: 'run_a', region: 'us-east-1', result: { status: 'target_outage', error: 'private-target-error' } },
  );
  const status = customerWatcherCheckStatus(state, watcher, 'us-east-1');
  assert.equal(status.phase, 'running');
  assert.deepEqual(status.regions.map(({ phase }) => phase), ['website', 'running']);
  assert.doesNotMatch(JSON.stringify(status), /secret-queue-url|private-target-error|foreign/);
});

test('completed regional check distinguishes website issues from watcher errors without leaking URLs', () => {
  const state = emptyState();
  const watcher = { id: 'watch_a', accountId: 'acct_a', status: 'active', config: { checkRegions: ['us-east-1', 'eu-west-1'] } };
  state.snapshots.push({
    id: 'snap_a', accountId: 'acct_a', watcherId: watcher.id, capturedAt: '2026-09-26T10:00:00.000Z',
    finalUrl: 'https://sensitive.example.test/path', regionalResults: [
      { region: 'us-east-1', status: 'internal_error', error: 'sensitive-worker-log' },
      { region: 'eu-west-1', status: 'target_outage', error: 'sensitive-target-diagnostic' },
    ],
  });
  const status = customerWatcherCheckStatus(state, watcher, 'us-east-1');
  assert.deepEqual(status.regions.map(({ label }) => label), ['Watcher error', 'Site outage']);
  assert.doesNotMatch(JSON.stringify(status), /sensitive/);
});
function outageAlertState(withBaseline = true) {
  const state = emptyState();
  state.watchers.push({ id: 'watch_a', accountId: 'acct_a', baselineSnapshotId: withBaseline ? 'snap_green' : null, openAlertId: 'alert_a', lastOutcome: 'outage' });
  if (withBaseline) state.snapshots.push({ id: 'snap_green', accountId: 'acct_a', watcherId: 'watch_a', pngKey: 'history/green.png', textKey: 'history/green.txt', promotedAt: new Date().toISOString() });
  state.snapshots.push({ id: 'snap_outage', accountId: 'acct_a', watcherId: 'watch_a', pngKey: null, textKey: null, promotedAt: null });
  state.alerts.push({ id: 'alert_a', accountId: 'acct_a', watcherId: 'watch_a', latestSnapshotId: 'snap_outage', status: 'resolving' });
  return state;
}

test('all-clear resolves a screenshot-less outage while retaining the last green baseline', async () => {
  const store = new MemoryStore(outageAlertState(true));
  const assets = { async copy() { throw new Error('outage snapshots must not be copied'); } };
  const engine = new MonitoringEngine({ store, assets, config: {}, logger, notifier: {} });
  await engine.promoteAlert('alert_a');
  const state = await store.read();
  assert.equal(state.alerts[0].status, 'all_clear');
  assert.equal(state.watchers[0].baselineSnapshotId, 'snap_green');
  assert.equal(state.watchers[0].lastOutcome, 'green');
  assert.equal(state.watchers[0].openAlertId, null);
});

test('all-clear promotes a captured recovery snapshot after an outage', async () => {
  const state = outageAlertState(true);
  state.snapshots.push({ id: 'snap_recovered', accountId: 'acct_a', watcherId: 'watch_a', pngKey: 'history/recovered.png', textKey: 'history/recovered.txt', promotedAt: null });
  state.alerts[0].latestSnapshotId = 'snap_recovered';
  const store = new MemoryStore(state); const copies = [];
  const assets = { async copy(from, to) { copies.push([from, to]); } };
  const engine = new MonitoringEngine({ store, assets, config: {}, logger, notifier: {} });
  await engine.promoteAlert('alert_a');
  const after = await store.read();
  assert.equal(after.watchers[0].baselineSnapshotId, 'snap_recovered');
  assert.equal(after.snapshots.find((item) => item.id === 'snap_recovered').promotedAt != null, true);
  assert.equal(copies.length, 2);
});

function completedChangeRoundState(notificationStatus = 'sent') {
  const state = emptyState();
  const watcher = {
    id: 'watch_round', accountId: 'acct_round', baselineSnapshotId: 'snap_baseline', openAlertId: 'alert_round', status: 'active',
    name: 'Round watcher',
    config: {
      url: 'https://example.test/',
      recipientTiers: [{ id: 'tier_one', name: 'Level 1', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'recipient_one', name: 'On call', channel: 'email', destination: 'on-call@example.test', enabled: true }] }],
      allClearThreshold: 1, alertReceivedThreshold: 1, reAlertMinutes: 30,
      templates: { subject: 'Change', text: 'Changed', sms: '' },
    },
  };
  state.watchers.push(watcher);
  state.alerts.push({
    id: watcher.openAlertId, accountId: watcher.accountId, watcherId: watcher.id,
    latestSnapshotId: 'snap_previous_change',
    status: 'open', currentTierIndex: 0, notificationRound: 1, newlyOpened: false, sendAgain: false,
    escalationCompletedAt: '2026-09-19T05:00:00.000Z', nextEscalationAt: null, responses: [],
    reasons: [{ method: 'text_change', message: '8% of normalized text changed', value: 8, threshold: 5 }], bannedMatches: [],
    notificationDispatch: { id: 'dispatch_round_one', round: 1, tierIndex: 0, status: 'completed' },
    notificationDelivery: { dispatchId: 'dispatch_round_one', round: 1, tierIndex: 0, attempted: 1, sent: notificationStatus === 'sent' ? 1 : 0, failed: notificationStatus === 'sent' ? 0 : 1 },
    notificationControl: { revision: 2, mutedTierIds: [], recipientOverrides: {}, canceledAt: null },
  });
  state.snapshots.push({ id: 'snap_previous_change', accountId: watcher.accountId, watcherId: watcher.id, outcome: 'changed', httpStatus: 200, finalUrl: watcher.config.url, textHash: 'old-content', screenshotHash: 'old-screen', screenshots: [] });
  state.notifications.push({ id: 'notice_round_one', alertId: watcher.openAlertId, watcherId: watcher.id, accountId: watcher.accountId, round: 1, tierIndex: 0, status: notificationStatus });
  return { state, watcher };
}

test('a material change after completed escalation opens a new notification round', () => {
  const { state, watcher } = completedChangeRoundState('sent');
  const snapshot = { id: 'snap_new_change', outcome: 'changed', httpStatus: 200, finalUrl: watcher.config.url, textHash: 'new-content', screenshotHash: 'new-screen', screenshots: [] };
  const reasons = [{ method: 'text_change', message: '12% of normalized text changed', value: 12, threshold: 5 }];
  const alert = monitoringEngineInternals.openOrRefreshAlert(state, watcher, snapshot, reasons, [], '2026-09-19T06:00:00.000Z');
  assert.equal(alert.notificationRound, 2);
  assert.equal(alert.currentTierIndex, 0);
  assert.equal(alert.newlyOpened, true);
  assert.equal(alert.sendAgain, false);
  assert.equal(alert.notificationRoundOpenedReason, 'new_change_after_completed_round');
  assert.equal(alert.notificationRoundSnapshotId, snapshot.id);
  assert.equal(alert.escalationCompletedAt, null);
  assert.equal(alert.notificationDispatch, null);
  assert.equal(alert.notificationDelivery, null);
  assert.equal(alert.notificationControl, null);
});

test('a material change cannot supersede a completed round while its retry is pending', () => {
  const { state, watcher } = completedChangeRoundState('retry_scheduled');
  const snapshot = { id: 'snap_change_during_retry', outcome: 'changed', httpStatus: 200, finalUrl: watcher.config.url, textHash: 'new-content', screenshotHash: 'new-screen', screenshots: [] };
  const reasons = [{ method: 'text_change', message: '12% of normalized text changed', value: 12, threshold: 5 }];
  const alert = monitoringEngineInternals.openOrRefreshAlert(state, watcher, snapshot, reasons, [], '2026-09-19T06:00:00.000Z');
  assert.equal(alert.notificationRound, 1);
  assert.equal(alert.newlyOpened, false);
  assert.equal(alert.escalationCompletedAt, '2026-09-19T05:00:00.000Z');
  assert.equal(alert.latestSnapshotId, snapshot.id);
});

test('an unchanged continuing condition does not restart a completed notification round', () => {
  const { state, watcher } = completedChangeRoundState('sent');
  const previous = state.snapshots.find((item) => item.id === 'snap_previous_change');
  const snapshot = { ...structuredClone(previous), id: 'snap_same_condition' };
  const reasons = structuredClone(state.alerts[0].reasons);
  const alert = monitoringEngineInternals.openOrRefreshAlert(state, watcher, snapshot, reasons, [], '2026-09-19T06:00:00.000Z');
  assert.equal(alert.notificationRound, 1);
  assert.equal(alert.newlyOpened, false);
  assert.equal(alert.notificationRoundOpenedReason, undefined);
  assert.equal(alert.latestSnapshotId, snapshot.id);
});
