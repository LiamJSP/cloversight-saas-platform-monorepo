import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '../src/storage/file-store.mjs';
import { WatcherService } from '../src/services/watchers.mjs';
import { demoState } from '../src/seed.mjs';
const logger = { debug() {}, info() {}, warn() {}, error() {} };
const actor = { actorId: 'acct_demo', role: 'customer', requestId: 'req_test' };

test('stale watcher drafts fail closed instead of overwriting newer state', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-conflict-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => Object.assign(state, demoState()));
    const service = new WatcherService({ store, config: { allowPrivateTargets: true } });
    const original = (await store.read()).watchers[0];
    const updated = await service.save('acct_demo', { ...structuredClone(original), name: 'Newer name' }, actor, { publish: false });
    assert.equal(updated.configRevision, 2);
    await assert.rejects(
      () => service.save('acct_demo', { ...structuredClone(original), name: 'Stale name' }, actor, { publish: false }),
      (error) => error.statusCode === 409 && error.code === 'WATCHER_VERSION_CONFLICT',
    );
    assert.equal((await store.read()).watchers[0].name, 'Newer name');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('server-side drafts count toward the plan watcher limit', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-limit-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => Object.assign(state, demoState()));
    const service = new WatcherService({ store, config: { allowPrivateTargets: true } });
    const second = await service.createDraft('acct_demo');
    await assert.rejects(
      () => service.save('acct_demo', second, actor, { publish: false }),
      (error) => error.statusCode === 400 && /supports 1 watcher/.test(error.message),
    );
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('disabling a watcher suspends alert timers and invalidates delivery retries', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-pause-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      state.alerts.push({ id: 'alert_pause', accountId: watcher.accountId, watcherId: watcher.id, status: 'open', notificationRound: 1, nextEscalationAt: '2099-01-01T00:00:00.000Z', nextReAlertAt: '2099-01-01T01:00:00.000Z', responses: [] });
      state.notifications.push({ id: 'notice_pause', accountId: watcher.accountId, watcherId: watcher.id, alertId: 'alert_pause', round: 1, status: 'retry_scheduled', retryAt: '2099-01-01T00:00:00.000Z' });
    });
    const service = new WatcherService({ store, config: { allowPrivateTargets: true } });
    await service.setStatus('acct_demo', 'watch_demo', 'paused', actor);
    const state = await store.read();
    assert.equal(state.watchers[0].status, 'paused');
    assert.equal(state.alerts[0].nextEscalationAt, null);
    assert.equal(state.alerts[0].nextReAlertAt, null);
    assert.ok(state.alerts[0].notificationsPausedAt);
    assert.equal(state.alerts[0].notificationRound, 2);
    assert.equal(state.notifications[0].round, 1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('publishing notification edits refreshes the policy of an active incident', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-policy-refresh-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      // Policy-refresh behavior needs two tiers, which starts at Essentials.
      state.accounts[0].planId = 'essentials';
      const watcher = state.watchers[0];
      watcher.status = 'active';
      state.alerts.push({ id: 'alert_policy_refresh', accountId: watcher.accountId, watcherId: watcher.id, status: 'open', notificationRound: 1, currentTierIndex: 0, nextEscalationAt: '2099-01-01T00:00:00.000Z', nextReAlertAt: '2099-01-01T01:00:00.000Z', responses: [], notificationPolicy: { recipientTiers: structuredClone(watcher.config.recipientTiers), allClearThreshold: 1, alertReceivedThreshold: 1, reAlertMinutes: 60, templates: structuredClone(watcher.config.templates), watcher: { name: watcher.name, url: watcher.config.url } } });
      watcher.openAlertId = 'alert_policy_refresh';
    });
    const service = new WatcherService({ store, config: { allowPrivateTargets: true } });
    const watcher = structuredClone((await store.read()).watchers[0]);
    // Keep this notification-policy test independent of external DNS. SSRF
    // resolution behavior has dedicated coverage in ssrf.test.mjs.
    watcher.config.url = 'https://127.0.0.1/';
    watcher.config.recipientTiers.push({ id: 'tier_new', name: 'Escalation', delayMinutes: 5, requiredAcknowledgements: 1, recipients: [{ id: 'rcpt_new', name: 'Backup', channel: 'email', destination: 'backup@example.test', enabled: true }] });
    await service.save('acct_demo', watcher, actor, { publish: true });
    const alert = (await store.read()).alerts.find((item) => item.id === 'alert_policy_refresh');
    assert.equal(alert.notificationRound, 1);
    assert.equal(alert.currentTierIndex, 0);
    assert.equal(alert.notificationPolicy.recipientTiers.length, 2);
    assert.equal(alert.notificationPolicyRefreshPending, true);
    assert.equal(alert.nextEscalationAt, null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('deleting a watcher retains reversible evidence and cancels live delivery', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-delete-watch-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      state.snapshots.push({ id: 'snap_delete', accountId: watcher.accountId, watcherId: watcher.id });
      state.alerts.push({ id: 'alert_delete', accountId: watcher.accountId, watcherId: watcher.id, status: 'open', notificationDispatch: { status: 'sending' } });
      state.notifications.push({ id: 'notice_delete', accountId: watcher.accountId, watcherId: watcher.id, alertId: 'alert_delete', status: 'retry_scheduled', retryAt: '2099-01-01T00:00:00.000Z' });
    });
    let removed = false;
    const service = new WatcherService({ store, config: { allowPrivateTargets: false }, assets: { async removeWatcher() { removed = true; } } });
    await service.remove('acct_demo', 'watch_demo', { actorId: 'acct_demo', role: 'customer', requestId: 'delete' });
    const state = await store.read();
    assert.equal(state.watchers[0].status, 'deleted');
    assert.equal(state.snapshots.length, 1);
    assert.equal(state.alerts[0].status, 'closed_by_watcher_delete');
    assert.equal(state.alerts[0].notificationDispatch.status, 'canceled');
    assert.equal(state.notifications[0].status, 'canceled');
    assert.equal(removed, false);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('watcher input rejects secret-bearing custom headers and excessive rule payloads', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-limits-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => Object.assign(state, demoState()));
    const service = new WatcherService({ store, config: { allowPrivateTargets: true } });
    const watcher = structuredClone((await store.read()).watchers[0]);
    watcher.config.requestHeaders = { authorization: 'Bearer secret' };
    await assert.rejects(() => service.save('acct_demo', watcher, actor, { publish: false }), /Custom request headers are not supported/);
    watcher.config.requestHeaders = {};
    watcher.config.ignoredSelectors = Array.from({ length: 101 }, (_, index) => `.item-${index}`);
    await assert.rejects(() => service.save('acct_demo', watcher, actor, { publish: false }), /No more than 100 ignored DOM selectors/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('SMS recipients require a response code placeholder in the SMS template', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-sms-template-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => { Object.assign(state, demoState()); state.accounts[0].planId = 'essentials'; });
    const service = new WatcherService({ store, config: { allowPrivateTargets: true, smsProvider: 'local', smsEnabled: true } });
    const watcher = structuredClone((await store.read()).watchers[0]);
    watcher.config.recipientTiers[0].recipients[0] = { id: 'sms_recipient', name: 'On call', channel: 'sms', destination: '+19025550123', enabled: true };
    watcher.config.templates.sms = 'Alert Received or All Clear';
    await assert.rejects(() => service.save('acct_demo', watcher, actor, { publish: false }), /must include \{\{responseCode\}\}/);
    watcher.config.templates.sms += ' — code {{responseCode}}';
    const saved = await service.save('acct_demo', watcher, actor, { publish: false });
    assert.match(saved.config.templates.sms, /responseCode/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('Free plan rejects SMS recipients even with a valid response code template', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-sms-free-plan-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => Object.assign(state, demoState()));
    const service = new WatcherService({ store, config: { allowPrivateTargets: true, smsProvider: 'local', smsEnabled: true } });
    const watcher = structuredClone((await store.read()).watchers[0]);
    watcher.config.recipientTiers[0].recipients[0] = { id: 'sms_recipient', name: 'On call', channel: 'sms', destination: '+19025550123', enabled: true };
    assert.match(watcher.config.templates.sms, /\{\{responseCode\}\}/);
    await assert.rejects(() => service.save('acct_demo', watcher, actor, { publish: false }), /SMS notifications are not included on this plan/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('SMS recipients are rejected when the deployment has no SMS capability', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-watcher-sms-disabled-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => { Object.assign(state, demoState()); state.accounts[0].planId = 'essentials'; });
    const service = new WatcherService({ store, config: { allowPrivateTargets: true, smsProvider: 'disabled', smsEnabled: false } });
    const watcher = structuredClone((await store.read()).watchers[0]);
    watcher.config.recipientTiers[0].recipients[0] = { id: 'sms_recipient', name: 'On call', channel: 'sms', destination: '+19025550123', enabled: true };
    await assert.rejects(() => service.save('acct_demo', watcher, actor, { publish: false }), /SMS notifications are not available for this deployment/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
