import test from 'node:test';
import assert from 'node:assert/strict';
import { FileStore } from '../src/storage/file-store.mjs';
import { demoState } from '../src/seed.mjs';
import { NotificationService } from '../src/notifications/service.mjs';
import { DAILY_DELIVERY_LIMITS } from '../src/domain/plans.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const logger = { debug() {}, info() {}, warn() {}, error() {} };
test('daily provider-attempt cap suppresses excess recipients without affecting a second tenant', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ww-notification-budget-'));
  try {
    const store = new FileStore(path.join(directory, 'state.json'), logger);
    await store.initialize();
    await store.transact('budget.fixtures', (state) => {
      Object.assign(state, demoState());
      const a = state.watchers[0]; a.status = 'active'; a.openAlertId = 'alert_a';
      a.config.recipientTiers[0].recipients = [
        { id: 'rcpt_a1', name: 'One', channel: 'email', destination: 'one@example.test', enabled: true },
        { id: 'rcpt_a2', name: 'Two', channel: 'email', destination: 'two@example.test', enabled: true },
      ];
      state.alerts.push({ id: 'alert_a', accountId: a.accountId, watcherId: a.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, responses: [], newlyOpened: true });
      state.idempotency.push({ key: `delivery-budget:${a.accountId}:email:${new Date().toISOString().slice(0, 10)}`, accountId: a.accountId, scope: 'delivery-budget', attempts: DAILY_DELIVERY_LIMITS.free.email - 1 });
      state.accounts.push({ ...structuredClone(state.accounts[0]), id: 'acct_b', contactEmail: 'owner-b@example.test' });
      const b = structuredClone(a); b.id = 'watch_b'; b.accountId = 'acct_b'; b.openAlertId = 'alert_b';
      b.config.recipientTiers[0].recipients = [{ id: 'rcpt_b', name: 'B', channel: 'email', destination: 'b@example.test', enabled: true }];
      state.watchers.push(b);
      state.alerts.push({ id: 'alert_b', accountId: b.accountId, watcherId: b.id, kind: 'outage', kindLabel: 'Page Outage', status: 'open', summary: 'down', bannedMatches: [], openedAt: new Date().toISOString(), currentTierIndex: 0, notificationRound: 1, responses: [], newlyOpened: true });
    });
    const sent = [];
    const service = new NotificationService({ store, providers: { async sendEmail(message) { sent.push(message.to); return { providerId: `provider_${sent.length}` }; }, async sendSms() { throw new Error('SMS not expected'); } }, config: { integritySecret: 'x'.repeat(32), responseBaseUrl: 'http://localhost:4010', smsEnabled: false }, logger });
    await service.queueTier('alert_a', 0);
    await service.queueTier('alert_b', 0);
    const state = await store.read();
    assert.deepEqual(sent, ['one@example.test', 'b@example.test']);
    assert.equal(state.notifications.find((item) => item.recipientId === 'rcpt_a2').status, 'suppressed');
    assert.equal(state.idempotency.find((item) => item.key.includes('delivery-budget:acct_demo:email:')).attempts, DAILY_DELIVERY_LIMITS.free.email);
    assert.equal(state.idempotency.find((item) => item.key.includes('delivery-budget:acct_b:email:')).attempts, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
