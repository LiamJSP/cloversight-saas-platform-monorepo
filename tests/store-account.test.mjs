import { CancellationService } from '../src/billing/cancellation.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import { FileStore } from '../src/storage/file-store.mjs';import { demoState } from '../src/seed.mjs';import { AccountService } from '../src/services/accounts.mjs';
const logger={debug(){},info(){},warn(){},error(){}};
test('file transactions serialize and account closure restores original watcher status',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ww-store-'));try{const store=new FileStore(path.join(dir,'state.json'),logger);await store.initialize();await store.transact('seed',s=>Object.assign(s,demoState()));await store.transact('add-paused',s=>{const copy=structuredClone(s.watchers[0]);copy.id='watch_paused';copy.status='paused';s.watchers.push(copy)});const service=new AccountService({store,config:{closureGraceDays:30}});const actor={actorId:'staff',role:'steward',requestId:'r'};await service.scheduleClosure('acct_demo','customer request',actor);let state=await store.read();assert.ok(state.watchers.every(w=>w.status==='account_paused'));await service.cancelClosure('acct_demo','customer rescinded request',actor);state=await store.read();assert.equal(state.watchers.find(w=>w.id==='watch_demo').status,'draft');assert.equal(state.watchers.find(w=>w.id==='watch_paused').status,'paused');assert.ok(state.auditEvents.length>=2)}finally{await fs.rm(dir,{recursive:true,force:true})}});

test('due closure keeps only redacted closed-account billing records', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-purge-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => Object.assign(state, demoState()));
    const service = new AccountService({ store, config: { closureGraceDays: 1 } });
    const actor = { actorId: 'staff', role: 'steward', requestId: 'purge' };
    await service.scheduleClosure('acct_demo', 'verified closure request', actor);
    await store.transact('make-due', (state) => { state.accounts[0].deleteAfter = '2000-01-01T00:00:00.000Z'; });
    await new CancellationService({ store, config: { billingProvider: 'local' }, logger }).process('acct_demo');
    const purged = await service.purgeDue();
    const state = await store.read();
    assert.equal(purged[0].accountId, 'acct_demo');
    assert.equal(state.accounts.length, 0);
    assert.equal(state.transactions.length, 0);
    const closedAccount = state.closedAccounts.find((item) => item.kind === 'closed_account');
    const closedTransaction = state.closedAccounts.find((item) => item.kind === 'closed_financial_transaction')?.transactions[0];
    assert.equal(closedAccount.id, 'acct_demo');
    assert.deepEqual(closedAccount.transactions, []);
    assert.equal(closedTransaction.accountId, 'acct_demo');
    assert.match(closedTransaction.paymentReference, /••••/);
    assert.doesNotMatch(closedTransaction.paymentReference, /pm_local_4242/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('local registration creates an isolated free-trial account and rejects duplicate email', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-register-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    const service = new AccountService({ store, config: { appEnv: 'local', closureGraceDays: 30 } });
    const input = { legalName: 'North Orchard Ltd.', contactName: 'Liam', contactEmail: 'liam@example.test', country: 'CA', region: 'ON', postalCode: 'K1A 0B1' };
    const account = await service.registerLocal(input, { actorId: 'local', role: 'system', requestId: 'register' });
    assert.equal(account.planId, 'free');
    assert.equal(account.contactEmail, 'liam@example.test');
    assert.equal((await store.read()).watchers.length, 0);
    await assert.rejects(() => service.registerLocal(input), (error) => error.statusCode === 409);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('scheduling closure stops automatic billing retries while preserving an open invoice', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-close-retry-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => { Object.assign(state, demoState()); state.transactions[0].status = 'retry_scheduled'; state.transactions[0].automaticRetryAt = new Date().toISOString(); });
    const service = new AccountService({ store, config: { appEnv: 'local', closureGraceDays: 30 } });
    await service.scheduleClosure('acct_demo', 'verified closure request', { actorId: 'staff', role: 'steward', requestId: 'close' });
    const transaction = (await store.read()).transactions[0];
    assert.equal(transaction.status, 'payment_required');
    assert.ok(transaction.providerInvoiceId);
    assert.equal(transaction.automaticRetryAt, null);
    assert.equal(transaction.outcomeReason, 'account_closure_cancelled_retry');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('account closure pauses open alert timers and cancellation resumes them without immediate escalation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-close-alert-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      const watcher = state.watchers[0];
      watcher.status = 'active';
      const future = new Date(Date.now() + 10 * 60_000).toISOString();
      state.alerts.push({ id: 'alert_closure', accountId: watcher.accountId, watcherId: watcher.id, status: 'open', nextEscalationAt: future, nextReAlertAt: null, responses: [] });
      watcher.openAlertId = 'alert_closure';
    });
    const service = new AccountService({ store, config: { appEnv: 'local', closureGraceDays: 30 } });
    const actor = { actorId: 'staff', role: 'steward', requestId: 'close-alert' };
    await service.scheduleClosure('acct_demo', 'verified closure request', actor);
    let state = await store.read();
    let alert = state.alerts.find((item) => item.id === 'alert_closure');
    assert.equal(alert.status, 'account_paused');
    assert.equal(alert.nextEscalationAt, null);
    assert.ok(alert.remainingEscalationSecondsBeforeClosure >= 500);
    await service.cancelClosure('acct_demo', 'customer retained service', actor);
    state = await store.read();
    alert = state.alerts.find((item) => item.id === 'alert_closure');
    assert.equal(alert.status, 'open');
    assert.ok(Date.parse(alert.nextEscalationAt) > Date.now() + 8 * 60_000);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('closure retains live subscriptions and unsettled provider records for reconciliation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-close-provider-hold-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      Object.assign(state.accounts[0], { provider: 'stripe', providerSubscriptionId: 'sub_bound_live', billingStatus: 'active' });
    });
    const service = new AccountService({ store, config: { billingProvider: 'local', closureGraceDays: 1 } });
    await service.scheduleClosure('acct_demo', 'verified closure', { actorId: 'owner', role: 'steward' });
    await store.transact('due', (state) => { state.accounts[0].deleteAfter = '2000-01-01T00:00:00.000Z'; });
    assert.deepEqual(await service.purgeDue(), []);
    let state = await store.read();
    assert.equal(state.accounts[0].purgeBlockedReason, 'provider_subscription_cancellation_pending');
    assert.equal(state.transactions[0].providerPaymentId, 'pi_local_demo');
    await store.transact('terminal-subscription-unsettled-payment', (draft) => {
      draft.accounts[0].billingStatus = 'canceled';
      draft.accounts[0].billingCancellation.status = 'completed';
      draft.transactions[0].status = 'reconciliation_required';
    });
    assert.deepEqual(await service.purgeDue(), []);
    state = await store.read();
    assert.equal(state.accounts[0].purgeBlockedReason, 'billing_reconciliation_pending');
    assert.equal(state.transactions[0].paymentReference, 'pm_local_4242');
    assert.equal(state.closedAccounts.length, 0, 'no redacted archive may replace recovery data while payment is unsettled');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('busy-account operational erasure resumes in bounded batches and cannot be undone after starting', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-close-batches-'));
  try {
    const store = new FileStore(path.join(dir, 'state.json'), logger);
    await store.initialize();
    await store.transact('seed', (state) => {
      Object.assign(state, demoState());
      for (let index = 0; index < 200; index += 1) state.snapshots.push({ id: `snap_batch_${index}`, accountId: 'acct_demo', watcherId: 'watch_demo', capturedAt: new Date().toISOString(), outcome: 'green' });
    });
    const service = new AccountService({ store, config: { billingProvider: 'local', closureGraceDays: 1 } });
    const actor = { actorId: 'owner', role: 'steward' };
    await service.scheduleClosure('acct_demo', 'verified closure', actor);
    await store.transact('due', (state) => { state.accounts[0].deleteAfter = '2000-01-01T00:00:00.000Z'; });
    await new CancellationService({ store, config: { billingProvider: 'local' }, logger }).process('acct_demo');
    assert.deepEqual(await service.purgeDue(), []);
    let state = await store.read();
    assert.equal(state.accounts[0].closureStatus, 'purging');
    assert.ok(state.snapshots.length > 0 && state.snapshots.length < 200);
    await assert.rejects(() => service.cancelClosure('acct_demo', 'too late', actor), (error) => error.statusCode === 400);
    for (let batch = 0; batch < 8 && state.accounts.length; batch += 1) {
      const before = state.snapshots.length;
      await service.purgeDue();
      state = await store.read();
      assert.ok(before - state.snapshots.length <= 80, 'one batch must remain within its record-mutation budget');
    }
    assert.equal(state.accounts.length, 0);
    assert.equal(state.snapshots.length, 0);
    const closed = state.closedAccounts.find((item) => item.kind === 'closed_account');
    assert.equal(closed.deletionManifest.operationalRecords.status, 'completed');
    assert.equal(closed.deletionConfirmationStatus, 'assets_pending');
    await assert.rejects(() => service.confirmDeletionAssets('acct_demo'), (error) => error.code === 'IDENTITY_DELETION_PENDING');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
