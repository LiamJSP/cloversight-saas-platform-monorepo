import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, defaultWatcher } from '../src/domain/defaults.mjs';
import { AccountService } from '../src/services/accounts.mjs';
import { ActionLogService } from '../src/services/action-log.mjs';

class MemoryStore {
  constructor(state) { this.state = structuredClone(state); }
  async read() { return structuredClone(this.state); }
  async transact(_label, mutate) { return structuredClone(await mutate(this.state)); }
}

function teamState() {
  const state = emptyState('2026-09-20T00:00:00.000Z');
  state.accounts.push(
    { id: 'acct_a', legalName: 'Alpha', contactEmail: 'owner-a@example.test', planId: 'professional', closureStatus: 'active' },
    { id: 'acct_b', legalName: 'Bravo', contactEmail: 'owner-b@example.test', planId: 'professional', closureStatus: 'active' },
  );
  state.teamMembers.push(
    { id: 'owner_a', accountId: 'acct_a', userId: 'user_owner_a', email: 'owner-a@example.test', firstName: 'Alice', lastName: 'Owner', role: 'owner', status: 'active' },
    { id: 'member_a', accountId: 'acct_a', userId: 'user_member_a', email: 'bob@example.test', firstName: 'Bob', lastName: 'North', role: 'member', status: 'active' },
    { id: 'owner_b', accountId: 'acct_b', userId: 'user_owner_b', email: 'brian@example.test', firstName: 'Brian', lastName: 'South', role: 'owner', status: 'active' },
  );
  state.userProfiles.push(
    { id: 'user_owner_a', firstName: 'Alice', lastName: 'Owner', watchingRegions: ['us-east-1'] },
    { id: 'user_member_a', firstName: 'Bob', lastName: 'North', watchingRegions: ['us-west-2'] },
    { id: 'user_owner_b', firstName: 'Brian', lastName: 'South', watchingRegions: ['eu-west-1'] },
  );
  return state;
}

test('recipient search and lookup remain strictly scoped to the actor team', async () => {
  const service = new AccountService({ store: new MemoryStore(teamState()), config: { awsRegion: 'us-east-1', availableCheckRegions: ['us-east-1', 'us-west-2', 'eu-west-1'] } });
  const actor = { actorId: 'user_member_a', role: 'customer' };
  assert.deepEqual(await service.searchRecipients('acct_a', 'bo', actor), [{ id: 'member_a', name: 'Bob North' }]);
  assert.deepEqual(await service.searchRecipients('acct_a', 'Nort Bo', actor), [{ id: 'member_a', name: 'Bob North' }]);
  assert.deepEqual(await service.searchRecipients('acct_a', 'Bobb', actor), [{ id: 'member_a', name: 'Bob North' }]);
  await assert.rejects(() => service.recipient('acct_a', 'owner_b', actor), (error) => error.statusCode === 404);
  await assert.rejects(() => service.searchRecipients('acct_b', 'bri', actor), (error) => error.statusCode === 403);
});

test('action log is owner-only, redacts snapshots, and safely restores alert state', async () => {
  const state = teamState();
  const watcher = defaultWatcher('acct_a', 'owner-a@example.test');
  watcher.id = 'watch_a'; watcher.name = 'Current'; watcher.status = 'active'; watcher.configRevision = 2;
  const before = structuredClone(watcher); before.name = 'Prior'; before.status = 'paused'; before.configRevision = 1;
  state.watchers.push(watcher);
  state.alerts.push({ id: 'alert_a', accountId: 'acct_a', watcherId: watcher.id, status: 'open', notificationRound: 1, nextEscalationAt: '2099-01-01T00:00:00.000Z', nextReAlertAt: null, responses: [] });
  state.notifications.push({ id: 'notice_a', accountId: 'acct_a', watcherId: watcher.id, alertId: 'alert_a', status: 'retry_scheduled', retryAt: '2099-01-01T00:00:00.000Z' });
  state.auditEvents.push({ id: 'event_a', at: new Date().toISOString(), accountId: 'acct_a', actorId: 'user_member_a', actorRole: 'customer', action: 'watcher.updated', targetId: watcher.id, metadata: { before, afterSummary: { name: watcher.name } } });
  const store = new MemoryStore(state);
  const service = new ActionLogService({ store });
  await assert.rejects(() => service.list('acct_a', { actorId: 'user_member_a' }), (error) => error.statusCode === 403);
  const listed = await service.list('acct_a', { actorId: 'user_owner_a' });
  assert.equal(listed[0].metadata.before, undefined);
  assert.equal(listed[0].metadata.beforeSummary.name, 'Prior');
  await service.revert('acct_a', 'event_a', { actorId: 'user_owner_a', role: 'customer', requestId: 'revert_a' });
  const after = await store.read();
  assert.equal(after.watchers[0].name, 'Prior');
  assert.equal(after.watchers[0].status, 'paused');
  assert.ok(after.alerts[0].notificationsPausedAt);
  assert.equal(after.notifications[0].status, 'canceled');
});

test('action-log recovery cannot restore features excluded by the current plan', async () => {
  const state = teamState();
  state.accounts.find((item) => item.id === 'acct_a').planId = 'essentials';
  const watcher = defaultWatcher('acct_a', 'owner-a@example.test');
  watcher.id = 'watch_plan'; watcher.status = 'active'; watcher.configRevision = 3;
  const premiumBefore = structuredClone(watcher);
  premiumBefore.config.checkIntervalSeconds = 900;
  premiumBefore.config.checkRegions = ['us-east-1', 'us-west-2'];
  state.watchers.push(watcher);
  state.auditEvents.push({ id: 'event_plan', at: new Date().toISOString(), accountId: 'acct_a', actorId: 'billing-plan-enforcement', actorRole: 'system', action: 'watcher.plan_adjusted', targetId: watcher.id, metadata: { before: premiumBefore } });
  const service = new ActionLogService({ store: new MemoryStore(state), config: { awsRegion: 'us-east-1', availableCheckRegions: ['us-east-1', 'us-west-2'] } });
  await assert.rejects(() => service.revert('acct_a', 'event_plan', { actorId: 'user_owner_a', role: 'customer' }), (error) => error.code === 'ACTION_REVERT_PLAN_CONFLICT' && error.statusCode === 409);
});

test('action-log recovery cannot bypass the plan retention window with a known event ID', async () => {
  const state = teamState();
  const watcher = defaultWatcher('acct_a', 'owner-a@example.test');
  watcher.id = 'watch_expired'; watcher.status = 'active'; watcher.configRevision = 2;
  state.watchers.push(watcher);
  state.auditEvents.push({ id: 'event_expired', at: '2000-01-01T00:00:00.000Z', accountId: 'acct_a', actorId: 'user_owner_a', actorRole: 'customer', action: 'watcher.updated', targetId: watcher.id, metadata: { before: structuredClone(watcher) } });
  const service = new ActionLogService({ store: new MemoryStore(state) });
  await assert.rejects(() => service.revert('acct_a', 'event_expired', { actorId: 'user_owner_a', role: 'customer' }), (error) => error.code === 'ACTION_EVENT_EXPIRED' && error.statusCode === 404);
});
