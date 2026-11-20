import test from 'node:test';
import assert from 'node:assert/strict';
import { dynamoStoreInternals } from '../src/storage/dynamo-store.mjs';

test('legacy account items derive their future lookup prefix before GSI propagation', () => {
  const legacyWatcher = {
    PK: 'COLLECTION#watchers',
    SK: 'ENTITY#watch_1',
    collection: 'watchers',
    entityId: 'watch_1',
    value: { id: 'watch_1', accountId: 'acct_1', status: 'active', nextCheckAt: '2026-09-20T00:00:00.000Z' },
  };
  assert.equal(dynamoStoreInternals.lookupSortKey(legacyWatcher), 'WATCHERS#watch_1');
  assert.equal(dynamoStoreInternals.entityItem('watchers', 'watch_1', legacyWatcher.value).GSI2PK, 'ACCOUNT#acct_1');
});
