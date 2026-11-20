import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountService } from '../src/services/accounts.mjs';
import { emptyState } from '../src/domain/defaults.mjs';

class MemoryStore {
  constructor() { this.state = emptyState(); }
  async read() { return structuredClone(this.state); }
  async transact(_label, fn) { return structuredClone(await fn(this.state)); }
}

const config = { billingProvider: 'stripe' };
const actor = { actorId: 'acct_federated', role: 'customer', email: 'owner@example.test', requestId: 'req_1' };

test('verified Cognito identity is provisioned exactly once as a free-trial account', async () => {
  const store = new MemoryStore();
  const service = new AccountService({ store, config });
  const first = await service.ensureFederatedAccount(actor);
  const second = await service.ensureFederatedAccount(actor);
  assert.equal(first.id, actor.actorId);
  assert.equal(second.id, actor.actorId);
  assert.equal(first.planId, 'free');
  assert.equal(first.provider, 'stripe');
  assert.equal(first.profileComplete, false);
  assert.equal((await store.read()).accounts.length, 1);
});

test('federated provisioning fails closed when the verified email belongs to another account', async () => {
  const store = new MemoryStore();
  store.state.accounts.push({ id: 'acct_other', contactEmail: actor.email, closureStatus: 'active' });
  const service = new AccountService({ store, config });
  await assert.rejects(() => service.ensureFederatedAccount(actor), (error) => error.code === 'EMAIL_ACCOUNT_CONFLICT');
  assert.equal((await store.read()).accounts.length, 1);
});

test('one verified identity cannot silently select between two active team memberships', async () => {
  const store = new MemoryStore();
  store.state.accounts.push(
    { id: 'acct_one', closureStatus: 'active' },
    { id: 'acct_two', closureStatus: 'active' },
  );
  store.state.teamMembers.push(
    { id: 'member_one', accountId: 'acct_one', userId: actor.actorId, status: 'active' },
    { id: 'member_two', accountId: 'acct_two', userId: actor.actorId, status: 'active' },
  );
  const service = new AccountService({ store, config });
  await assert.rejects(() => service.ensureFederatedAccount(actor), (error) => error.code === 'TEAM_MEMBERSHIP_CONFLICT' && error.statusCode === 403);
  assert.equal((await store.read()).accounts.length, 2);
});

test('registration saves the owner and billing profiles together only after all fields are present', async () => {
  const store = new MemoryStore();
  const service = new AccountService({ store, config: { ...config, awsRegion: 'us-east-1', availableCheckRegions: ['us-east-1', 'us-west-2', 'ca-central-1'] } });
  await service.ensureFederatedAccount(actor);
  const input = { firstName: 'Pat', lastName: 'Lee', watchingRegions: ['us-east-1', 'ca-central-1'], legalName: 'Example Operations', contactName: 'Pat Lee', contactEmail: actor.email, country: 'CA', region: 'ON', postalCode: 'K1A 0B1' };
  await assert.rejects(() => service.saveOwnerProfile(actor.actorId, { ...input, lastName: '' }, actor), /last name/);
  assert.equal((await store.read()).accounts[0].profileComplete, false);
  await assert.rejects(() => service.updateProfile(actor.actorId, input, actor), /Complete your registration/);
  const saved = await service.saveOwnerProfile(actor.actorId, input, actor);
  const state = await store.read();
  assert.equal(saved.profileComplete, true);
  assert.equal(state.accounts[0].country, 'CA');
  assert.equal(state.accounts[0].region, 'ON');
  assert.equal(state.userProfiles[0].lastName, 'Lee');
  assert.deepEqual(state.userProfiles[0].watchingRegions, ['us-east-1', 'ca-central-1']);
});
