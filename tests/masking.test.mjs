import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from '../src/seed.mjs';
import { stewardAccountView, stewardAuditEventSummary, stewardTransactionSummary } from '../src/security/masking.mjs';

test('steward account view exposes support fields but omits customer secrets and content rules', () => {
  const state = demoState();
  const watcher = state.watchers[0];
  watcher.config.requestHeaders = { authorization: 'Bearer customer-secret' };
  watcher.config.bannedPhrases = ['highly confidential phrase'];
  watcher.config.ignoredSelectors = ['#customer-private-target'];
  watcher.config.templates.text = 'private operational template';
  const view = stewardAccountView(state, state.accounts[0]);
  const serialized = JSON.stringify(view);
  assert.match(view.watchers[0].config.url, /…/);
  assert.equal(view.watchers[0].config.bannedPhraseCount, 1);
  assert.equal(view.watchers[0].config.ignoredSelectorCount, 1);
  assert.doesNotMatch(serialized, /customer-secret/);
  assert.doesNotMatch(serialized, /highly confidential phrase/);
  assert.doesNotMatch(serialized, /customer-private-target/);
  assert.doesNotMatch(serialized, /private operational template/);
  assert.doesNotMatch(serialized, /pm_local_4242/);
});

test('steward transaction schema omits signed envelopes and raw provider identifiers', () => {
  const transaction = { ...demoState().transactions[0], envelope: { canonical: 'secret-canonical', signature: 'secret-signature' }, providerInvoiceId: 'in_raw_identifier' };
  const summary = stewardTransactionSummary(transaction);
  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /secret-canonical|secret-signature|in_raw_identifier|pm_local_4242/);
  assert.match(summary.providerInvoiceId, /••••/);
});

test('steward audit views never expose reversible watcher snapshots', () => {
  const state = demoState();
  state.auditEvents.push({ id: 'watcher_event', accountId: state.accounts[0].id, action: 'watcher.updated', metadata: { before: state.watchers[0] } });
  state.auditEvents.push({ id: 'billing_event', accountId: state.accounts[0].id, action: 'billing.updated', metadata: { secret: 'private-metadata' } });
  const view = stewardAccountView(state, state.accounts[0]);
  assert.equal(view.events.some((event) => event.id === 'watcher_event'), false);
  assert.doesNotMatch(JSON.stringify(view), /private-metadata/);
  assert.equal('metadata' in stewardAuditEventSummary(state.auditEvents.at(-1)), false);
});
