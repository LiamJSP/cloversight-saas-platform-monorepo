/** @module storage/dynamo-store
 * @description DynamoDB persistence, lookup indexes and account-scoped transactions.
 */
import { emptyState } from '../domain/defaults.mjs';
import { clone, ISO } from '../lib.mjs';
import { scheduledDispatchIdentity } from '../aws/dispatch-identity.mjs';

const CORE_COLLECTIONS = Object.freeze(['accounts', 'teamMembers', 'teamInvitations', 'userProfiles', 'watchers', 'snapshots', 'alerts', 'transactions', 'refunds', 'notifications', 'emailSuppressions', 'emailUnsubscribeLinks', 'staffNotes', 'auditEvents', 'stewardUsers', 'stewardSettings', 'providerEvents', 'jobs']);
const ALL_COLLECTIONS = Object.freeze([...CORE_COLLECTIONS, 'closedAccounts', 'idempotency']);
const MAX_TRANSACTION_ENTITY_CHANGES = 99;
const SCHEDULE_SHARD_COUNT = 32;
const INDEX_PROPAGATION_GRACE_MS = 60_000;

/**
 * DynamoDB adapter for the existing state-domain services.
 *
 * Each entity is an independent item. Capture and customer hot paths use an
 * account revision item plus per-entity conditions; compatibility commands use
 * the original platform revision and the same per-entity collision checks. The
 * remaining global commands are deliberately tracked as a Scale-readiness limit.
 */
export class DynamoStateStore {
  constructor({ coreTableName, idempotencyTableName, closedAccountsTableName, region = process.env.AWS_REGION ?? 'us-east-1', logger, client = null }) {
    if (!coreTableName || !idempotencyTableName || !closedAccountsTableName) throw new Error('All DynamoDB table names are required.');
    Object.assign(this, { coreTableName, idempotencyTableName, closedAccountsTableName, region, logger, client });
    this.indexReadyAccounts = new Set();
    this.initialized = false;
    this.initializationPromise = null;
  }

  async #document() {
    if (this.client) return this.client;
    const [{ DynamoDBClient }, { DynamoDBDocumentClient }] = await Promise.all([
      import('@aws-sdk/client-dynamodb'),
      import('@aws-sdk/lib-dynamodb'),
    ]);
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }), {
      marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
    });
    return this.client;
  }

  async initialize() {
    if (this.initialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
        try {
          await (await this.#document()).send(new PutCommand({
            TableName: this.coreTableName,
            Item: { PK: 'META', SK: 'STATE', entityType: 'meta', schemaVersion: 2, revision: 0, createdAt: ISO(), updatedAt: ISO() },
            ConditionExpression: 'attribute_not_exists(PK)',
          }));
        } catch (error) {
          if (error?.name !== 'ConditionalCheckFailedException') throw error;
        }
        // Cache only completion of schema initialization for this store/table
        // instance. Every state, revision, identity and permission read remains
        // fresh; an unavailable table or failed request stays retryable.
        this.initialized = true;
      })();
    }
    const pending = this.initializationPromise;
    try { await pending; }
    catch (error) { if (this.initializationPromise === pending) this.initializationPromise = null; throw error; }
  }

  async read() {
    await this.initialize();
    const [{ GetCommand }] = await Promise.all([import('@aws-sdk/lib-dynamodb')]);
    const meta = await (await this.#document()).send(new GetCommand({ TableName: this.coreTableName, Key: { PK: 'META', SK: 'STATE' }, ConsistentRead: true }));
    const state = emptyState(meta.Item?.createdAt ?? ISO());
    state.schemaVersion = Number(meta.Item?.schemaVersion ?? 2);
    state.revision = Number(meta.Item?.revision ?? 0);
    state.updatedAt = meta.Item?.updatedAt ?? state.createdAt;
    for (const collection of ALL_COLLECTIONS) state[collection] = [];

    const [coreItems, idempotencyItems, closedItems] = await Promise.all([
      this.#scan(this.coreTableName),
      this.#scan(this.idempotencyTableName),
      this.#scan(this.closedAccountsTableName),
    ]);
    for (const item of [...coreItems, ...idempotencyItems, ...closedItems]) {
      if (!ALL_COLLECTIONS.includes(item.collection) || item.value == null) continue;
      state[item.collection].push(item.value);
    }
    return state;
  }

  // Maintenance discovery must not reread retained screenshots' metadata and
  // every unrelated tenant collection just to find an empty work list. Base
  // table queries are strongly consistent; mutations still recheck their claims.
  async readCollection(collection) {
    if (!ALL_COLLECTIONS.includes(collection)) throw new Error('Unsupported collection.');
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const values = [];
    let cursor;
    do {
      const result = await (await this.#document()).send(new QueryCommand({
        TableName: tableFor(collection, this),
        KeyConditionExpression: 'PK = :partition',
        ExpressionAttributeValues: { ':partition': `COLLECTION#${collection}` },
        ConsistentRead: true, ExclusiveStartKey: cursor,
      }));
      for (const item of result.Items ?? []) if (item.collection === collection && item.value != null) values.push(item.value);
      cursor = result.LastEvaluatedKey;
    } while (cursor);
    return values;
  }

  /**
   * Read one tenant through the account GSI instead of reconstructing every
   * tenant. This is the read model used by customer-facing routes; mutation
   * compatibility remains in transact() until each command has a scoped form.
   */
  async readAccount(accountId, options = {}) {
    const safeAccountId = String(accountId ?? '');
    if (!safeAccountId) throw new Error('Account ID is required.');
    await this.initialize();
    const migrationItems = await this.#ensureAccountIndexes(safeAccountId);
    const [{ GetCommand, QueryCommand, BatchGetCommand }] = await Promise.all([import('@aws-sdk/lib-dynamodb')]);
    const document = await this.#document();
    const [meta, accountResult] = await Promise.all([
      document.send(new GetCommand({ TableName: this.coreTableName, Key: { PK: 'META', SK: 'STATE' }, ConsistentRead: true })),
      document.send(new GetCommand({ TableName: this.coreTableName, Key: entityKey('accounts', safeAccountId), ConsistentRead: true })),
    ]);
    const items = [];
    // Omit lookupPrefixes to load the complete tenant compatibility view.
    // Pass [] for a direct-entity-only command, or collection prefixes such
    // as NOTIFICATIONS# to keep a mutation bounded without a table scan.
    const lookupPrefixes = options.lookupPrefixes == null
      ? null
      : [...new Set(options.lookupPrefixes.map((value) => String(value).toUpperCase()).filter(Boolean))];
    const queries = lookupPrefixes == null ? [null] : lookupPrefixes;
    let lookupUnavailable = false;
    for (const prefix of queries) {
      let key;
      try {
        do {
          const page = await document.send(new QueryCommand({
            TableName: this.coreTableName,
            IndexName: 'LookupIndex',
            KeyConditionExpression: prefix
              ? 'GSI2PK = :account AND begins_with(GSI2SK, :prefix)'
              : 'GSI2PK = :account',
            ExpressionAttributeValues: {
              ':account': `ACCOUNT#${safeAccountId}`,
              ...(prefix ? { ':prefix': prefix } : {}),
            },
            ExclusiveStartKey: key,
          }));
          items.push(...(page.Items ?? []));
          key = page.LastEvaluatedKey;
        } while (key);
      } catch (error) {
        if (error?.name !== 'ValidationException' || !/LookupIndex|specified index/i.test(String(error.message))) throw error;
        lookupUnavailable = true;
        this.logger?.warn?.('dynamo.lookup_index.unavailable', { accountId: safeAccountId, fallback: 'strong-account-scan' });
        break;
      }
    }
    // A strongly consistent migration scan wins over an eventually consistent
    // GSI page during the one request that installs the indexes. The same
    // bounded fallback keeps a staged deployment available while LookupIndex
    // is still being created; normal traffic returns to Query automatically.
    const strongOverlay = lookupUnavailable && !migrationItems.length
      ? accountItemsFromScan(await this.#scan(this.coreTableName), safeAccountId)
      : migrationItems;
    items.push(...(lookupPrefixes == null
      ? strongOverlay
      : strongOverlay.filter((item) => lookupPrefixes.some((prefix) => lookupSortKey(item).startsWith(prefix)))));
    if (accountResult.Item) items.push(accountResult.Item);
    const memberUserIds = [...new Set(items.filter((item) => item.collection === 'teamMembers' && item.value?.userId).map((item) => String(item.value.userId)))];
    const directKeys = (options.directEntities ?? []).map((entry) => entityKey(String(entry.collection), String(entry.id)));
    const requestedKeys = [...new Map(
      [...memberUserIds.map((id) => entityKey('userProfiles', id)), ...directKeys]
        .map((entry) => [`${entry.PK}:${entry.SK}`, entry]),
    ).values()];
    if (requestedKeys.length) {
      for (let offset = 0; offset < requestedKeys.length; offset += 100) {
        let pending = requestedKeys.slice(offset, offset + 100);
        do {
          const response = await document.send(new BatchGetCommand({ RequestItems: { [this.coreTableName]: { Keys: pending, ConsistentRead: true } } }));
          items.push(...(response.Responses?.[this.coreTableName] ?? []));
          pending = response.UnprocessedKeys?.[this.coreTableName]?.Keys ?? [];
        } while (pending.length);
      }
    }
    if (options.followWatcherReferences) {
      const referenceKeys = [];
      for (const item of items.filter((candidate) => candidate.collection === 'watchers' && candidate.value)) {
        if (item.value.activeCheckJobId) referenceKeys.push(entityKey('jobs', String(item.value.activeCheckJobId)));
        if (item.value.latestSnapshotId) referenceKeys.push(entityKey('snapshots', String(item.value.latestSnapshotId)));
        if (item.value.baselineSnapshotId) referenceKeys.push(entityKey('snapshots', String(item.value.baselineSnapshotId)));
        if (item.value.openAlertId) referenceKeys.push(entityKey('alerts', String(item.value.openAlertId)));
      }
      const uniqueReferences = [...new Map(referenceKeys.map((entry) => [`${entry.PK}:${entry.SK}`, entry])).values()];
      for (let offset = 0; offset < uniqueReferences.length; offset += 100) {
        let pending = uniqueReferences.slice(offset, offset + 100);
        do {
          const response = await document.send(new BatchGetCommand({ RequestItems: { [this.coreTableName]: { Keys: pending, ConsistentRead: true } } }));
          items.push(...(response.Responses?.[this.coreTableName] ?? []));
          pending = response.UnprocessedKeys?.[this.coreTableName]?.Keys ?? [];
        } while (pending.length);
      }
    }
    const state = emptyState(meta.Item?.createdAt ?? ISO());
    state.schemaVersion = Number(meta.Item?.schemaVersion ?? 2);
    state.revision = Number(meta.Item?.revision ?? 0);
    state.updatedAt = meta.Item?.updatedAt ?? state.createdAt;
    for (const collection of ALL_COLLECTIONS) state[collection] = [];
    const entities = new Map();
    for (const item of items) {
      if (!ALL_COLLECTIONS.includes(item.collection) || item.value == null) continue;
      const identity = `${item.collection}:${entityId(item.collection, item.value)}`;
      entities.set(identity, item);
    }
    // GSI pages and direct-reference reads are never an authorization boundary.
    // A stale/misindexed item (or a bad cross-account reference) must not enter
    // a tenant read model, even if the caller later forgets an account filter.
    const userIds = new Set([...entities.values()]
      .filter((item) => item.collection === 'teamMembers' && item.value?.accountId === safeAccountId)
      .map((item) => String(item.value.userId)));
    for (const item of entities.values()) {
      if (belongsToAccount(item.collection, item.value, safeAccountId, userIds)) state[item.collection].push(item.value);
      else this.logger?.warn?.('dynamo.account_read.rejected_foreign_entity', { collection: item.collection, accountId: safeAccountId });
    }
    return state;
  }

  /**
   * Serialize a tenant mutation with a small account revision item, then use
   * entity-value conditions to detect collisions with legacy/global commands.
   * This keeps the capture hot path off the three-table reconstruction scan.
   */
  async transactAccount(accountId, label, mutate, options = {}, attempts = 5) {
    const safeAccountId = String(accountId ?? '');
    if (!safeAccountId) throw new Error('Account ID is required for a scoped transaction.');
    let lastConflict;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const lockRevision = await this.#accountRevision(safeAccountId);
      // Read the revision first. If any account-scoped command commits before
      // or during the following entity reads, this stale expected revision
      // makes the transaction fail and retry. Reading the revision afterward
      // could otherwise bless decisions made from an older account snapshot.
      const before = await this.readAccount(safeAccountId, options);
      const draft = clone(before);
      const result = await mutate(draft);
      draft.revision = before.revision;
      draft.updatedAt = ISO();
      const writes = this.#diff(before, draft);
      const accountBefore = before.accounts.find((account) => account.id === safeAccountId) ?? null;
      const writesAccount = writes.some((change) => change.collection === 'accounts' && change.id === safeAccountId);
      // The account revision consumes one transaction slot. A read-only
      // account fence consumes another unless the account's conditional
      // put/delete already checks that same key (DynamoDB forbids both).
      const maxEntityChanges = MAX_TRANSACTION_ENTITY_CHANGES - (writesAccount ? 0 : 1);
      if (writes.length > maxEntityChanges) throw Object.assign(new Error(`Operation ${label} changes ${writes.length} entities; the scoped DynamoDB transaction limit is ${maxEntityChanges}.`), { code: 'DYNAMO_TRANSACTION_TOO_LARGE' });
      const memberIds = new Set([...before.teamMembers, ...draft.teamMembers]
        .filter((member) => member.accountId === safeAccountId).map((member) => String(member.userId)));
      for (const change of writes) {
        if ((change.previous && !belongsToAccount(change.collection, change.previous, safeAccountId, memberIds))
          || (change.value && !belongsToAccount(change.collection, change.value, safeAccountId, memberIds))) {
          throw Object.assign(new Error('Scoped transaction attempted to write outside its account.'), { code: 'TENANT_SCOPE_VIOLATION' });
        }
      }
      try {
        await this.#commitAccount(safeAccountId, lockRevision, writes, accountBefore);
        this.logger?.debug?.('dynamo.account_transaction.committed', { label, accountId: safeAccountId, accountRevision: lockRevision + 1, entityChanges: writes.length, attempt });
        return clone(result);
      } catch (error) {
        if (error?.name !== 'TransactionCanceledException' && error?.name !== 'ConditionalCheckFailedException') throw error;
        lastConflict = error;
        this.logger?.warn?.('dynamo.account_transaction.conflict', { label, accountId: safeAccountId, expectedRevision: lockRevision, attempt });
        await new Promise((resolve) => setTimeout(resolve, Math.min(250, 20 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 25)));
      }
    }
    throw Object.assign(new Error(`Concurrent updates prevented ${label} from committing after ${attempts} attempts.`), { code: 'DYNAMO_CONFLICT', cause: lastConflict, statusCode: 409 });
  }

  async getEntity(collection, id) {
    if (!CORE_COLLECTIONS.includes(collection)) throw new Error(`Unsupported direct entity collection ${collection}.`);
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await (await this.#document()).send(new GetCommand({ TableName: this.coreTableName, Key: entityKey(collection, String(id)), ConsistentRead: true }));
    return result.Item?.value ?? null;
  }

  /** One conditional DynamoDB write per fixed rate window, with table TTL. */
  async consumeRateLimit(scope, identity, limit, windowSeconds) {
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const window = Math.max(1, Math.floor(windowSeconds));
    const bucket = Math.floor(Date.now() / 1000 / window);
    try {
      await (await this.#document()).send(new UpdateCommand({
        TableName: this.idempotencyTableName,
        Key: { PK: `RATE#${scope}`, SK: `WINDOW#${bucket}#${identity}` },
        UpdateExpression: 'SET expiresAtEpoch = if_not_exists(expiresAtEpoch, :expiry) ADD attempts :one',
        ConditionExpression: 'attribute_not_exists(attempts) OR attempts < :limit',
        ExpressionAttributeValues: { ':expiry': (bucket + 1) * window + 3600, ':one': 1, ':limit': limit },
      }));
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') throw Object.assign(new Error('Too many requests. Try again later.'), { statusCode: 429, code: 'ACCOUNT_RATE_LIMIT', retryAfterSeconds: window });
      throw error;
    }
  }

  async findActiveMembershipByUser(userId) {
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const active = [];
    let cursor;
    try {
      do {
        const result = await (await this.#document()).send(new QueryCommand({
          TableName: this.coreTableName,
          IndexName: 'IdentityIndex',
          KeyConditionExpression: 'GSI3PK = :user',
          ExpressionAttributeValues: { ':user': `USER#${String(userId)}` },
          ExclusiveStartKey: cursor,
        }));
        for (const item of result.Items ?? []) {
          if (item.collection === 'teamMembers' && item.value?.userId === userId && item.value.status === 'active') active.push(item.value);
        }
        cursor = result.LastEvaluatedKey;
      } while (cursor);
    } catch (error) {
      if (error?.name === 'ValidationException' && /IdentityIndex|specified index/i.test(String(error.message))) return null;
      throw error;
    }
    if (active.length > 1) throw Object.assign(new Error('Identity has multiple active memberships; account access requires support review.'), { statusCode: 403, code: 'TEAM_MEMBERSHIP_CONFLICT' });
    return active[0] ?? null;
  }

  async ensureMembershipIndex(member) {
    if (!member?.id || !member?.userId) return;
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await (await this.#document()).send(new UpdateCommand({
      TableName: this.coreTableName,
      Key: entityKey('teamMembers', String(member.id)),
      UpdateExpression: 'SET GSI3PK = :pk, GSI3SK = :sk',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':pk': `USER#${String(member.userId)}`, ':sk': `MEMBERSHIP#${String(member.id)}` },
    }));
  }

  async transact(label, mutate, attempts = 5) {
    let lastConflict;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const before = await this.read();
      const draft = clone(before);
      const result = await mutate(draft);
      draft.revision = before.revision + 1;
      draft.updatedAt = ISO();
      const writes = this.#diff(before, draft);
      if (writes.length > MAX_TRANSACTION_ENTITY_CHANGES) {
        throw Object.assign(new Error(`Operation ${label} changes ${writes.length} entities; DynamoDB transactions support at most ${MAX_TRANSACTION_ENTITY_CHANGES} plus the revision lock.`), { code: 'DYNAMO_TRANSACTION_TOO_LARGE' });
      }
      try {
        await this.#commit(before.revision, draft, writes);
        this.logger?.debug?.('dynamo.transaction.committed', { label, revision: draft.revision, entityChanges: writes.length, attempt });
        return clone(result);
      } catch (error) {
        if (error?.name !== 'TransactionCanceledException' && error?.name !== 'ConditionalCheckFailedException') throw error;
        lastConflict = error;
        this.logger?.warn?.('dynamo.transaction.conflict', { label, expectedRevision: before.revision, attempt });
        await new Promise((resolve) => setTimeout(resolve, Math.min(250, 20 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 25)));
      }
    }
    throw Object.assign(new Error(`Concurrent updates prevented ${label} from committing after ${attempts} attempts.`), { code: 'DYNAMO_CONFLICT', cause: lastConflict, statusCode: 409 });
  }

  async claimScheduledDispatch(watcher, owner, now = ISO()) {
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const identity = scheduledDispatchIdentity(watcher);
    const epoch = Math.floor(Date.parse(now) / 1000);
    try {
      await (await this.#document()).send(new PutCommand({
        TableName: this.idempotencyTableName,
        Item: { PK: `DISPATCH#${identity}`, SK: 'CLAIM', owner, leaseUntil: epoch + 180, expiresAtEpoch: epoch + 86400 },
        ConditionExpression: 'attribute_not_exists(PK) OR leaseUntil <= :now',
        ExpressionAttributeValues: { ':now': epoch },
      }));
      return { jobId: `job_sched_${identity.slice(0, 40)}` };
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') return null;
      throw error;
    }
  }

  async dueWatchers(now = ISO(), limit = 500) {
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const boundedLimit = Math.max(1, Math.min(1000, Number(limit) || 500));
    const document = await this.#document();
    // Query the legacy partition during rolling migration. Any watcher written
    // by this release is moved onto a deterministic shard automatically.
    const partitions = ['SCHEDULE', ...Array.from({ length: SCHEDULE_SHARD_COUNT }, (_, index) => `SCHEDULE#${String(index).padStart(2, '0')}`)];
    const pages = await Promise.all(partitions.map((partition) => document.send(new QueryCommand({
      TableName: this.coreTableName,
      IndexName: 'ScheduleIndex',
      KeyConditionExpression: 'GSI1PK = :partition AND GSI1SK <= :cutoff',
      ExpressionAttributeValues: { ':partition': partition, ':cutoff': `${now}#~` },
      Limit: boundedLimit,
      ScanIndexForward: true,
    }))));
    const unique = new Map();
    for (const item of pages.flatMap((page) => page.Items ?? [])) if (item.value?.id) unique.set(item.value.id, item.value);
    return [...unique.values()].sort((left, right) => String(left.nextCheckAt).localeCompare(String(right.nextCheckAt))).slice(0, boundedLimit);
  }

  async dueCaptureRuns(now = ISO(), limit = 50) {
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const document = await this.#document();
    const partitions = Array.from({ length: SCHEDULE_SHARD_COUNT }, (_, index) => `CAPTURE_DEADLINE#${String(index).padStart(2, '0')}`);
    const pages = await Promise.all(partitions.map((partition) => document.send(new QueryCommand({
      TableName: this.coreTableName,
      IndexName: 'ScheduleIndex',
      KeyConditionExpression: 'GSI1PK = :partition AND GSI1SK <= :cutoff',
      ExpressionAttributeValues: { ':partition': partition, ':cutoff': `${now}#~` },
      Limit: boundedLimit,
      ScanIndexForward: true,
    }))));
    const unique = new Map();
    for (const item of pages.flatMap((page) => page.Items ?? [])) if (item.value?.id) unique.set(item.value.id, item.value);
    return [...unique.values()].sort((left, right) => String(left.captureRun?.deadlineAt).localeCompare(String(right.captureRun?.deadlineAt))).slice(0, boundedLimit);
  }

  async #accountRevision(accountId) {
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await (await this.#document()).send(new GetCommand({ TableName: this.coreTableName, Key: accountRevisionKey(accountId), ConsistentRead: true }));
    return Number(result.Item?.revision ?? 0);
  }

  /**
   * Existing 0.4.x items predate LookupIndex/IdentityIndex and the sharded
   * schedule keys. Backfill one account on first access, using value equality
   * so a concurrent command can never be overwritten. The strong scan is also
   * returned to the caller, keeping this migration request correct while GSI
   * propagation is still eventual.
   */
  async #ensureAccountIndexes(accountId) {
    if (this.indexReadyAccounts.has(accountId)) return [];
    const { GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const document = await this.#document();
    const markerKey = accountIndexMarkerKey(accountId);
    const marker = await document.send(new GetCommand({ TableName: this.coreTableName, Key: markerKey, ConsistentRead: true }));
    if (Number(marker.Item?.schemaVersion ?? 0) >= 1) {
      const markedAt = Date.parse(marker.Item?.updatedAt ?? '');
      if (Number.isFinite(markedAt) && Date.now() - markedAt < INDEX_PROPAGATION_GRACE_MS) {
        // LookupIndex is eventually consistent. During the short propagation
        // window, retain the strong scan as a correctness overlay rather than
        // trusting that every newly indexed item is already visible.
        return accountItemsFromScan(await this.#scan(this.coreTableName), accountId);
      }
      this.indexReadyAccounts.add(accountId);
      return [];
    }

    let coreItems = await this.#scan(this.coreTableName);
    let scoped = accountItemsFromScan(coreItems, accountId);
    let conflicted = false;
    for (let offset = 0; offset < scoped.length; offset += 10) {
      await Promise.all(scoped.slice(offset, offset + 10).map(async (item) => {
        if (!item.collection || item.value == null || !CORE_COLLECTIONS.includes(item.collection)) return;
        const desired = entityItem(item.collection, entityId(item.collection, item.value), item.value);
        if (indexAttributesEqual(item, desired)) return;
        try {
          await document.send(new PutCommand({
            TableName: this.coreTableName,
            Item: withIndexAttributes(item, desired),
            ConditionExpression: '#value = :expected',
            ExpressionAttributeNames: { '#value': 'value' },
            ExpressionAttributeValues: { ':expected': item.value },
          }));
        } catch (error) {
          if (error?.name !== 'ConditionalCheckFailedException') throw error;
          conflicted = true;
        }
      }));
    }
    if (conflicted) {
      coreItems = await this.#scan(this.coreTableName);
      scoped = accountItemsFromScan(coreItems, accountId);
    } else {
      await document.send(new PutCommand({
        TableName: this.coreTableName,
        Item: { ...markerKey, entityType: 'accountIndexMarker', schemaVersion: 1, updatedAt: ISO() },
      }));
      this.logger?.info?.('dynamo.account_indexes.ready', { accountId, migratedItems: scoped.length });
    }
    return scoped;
  }

  async #scan(tableName) {
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const items = [];
    let key;
    do {
      const result = await (await this.#document()).send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: key, ConsistentRead: true }));
      items.push(...(result.Items ?? []));
      key = result.LastEvaluatedKey;
    } while (key);
    return items;
  }

  #diff(before, after) {
    const changes = [];
    for (const collection of ALL_COLLECTIONS) {
      const oldMap = new Map((before[collection] ?? []).map((value) => [entityId(collection, value), value]));
      const newMap = new Map((after[collection] ?? []).map((value) => [entityId(collection, value), value]));
      for (const [id, value] of newMap) {
        const previous = oldMap.get(id);
        if (!previous || JSON.stringify(previous) !== JSON.stringify(value)) changes.push({ action: 'put', collection, id, value, previous: previous ?? null });
      }
      for (const [id, previous] of oldMap) if (!newMap.has(id)) changes.push({ action: 'delete', collection, id, previous });
    }
    return changes;
  }

  async #commit(expectedRevision, state, changes) {
    const { TransactWriteCommand } = await import('@aws-sdk/lib-dynamodb');
    const TransactItems = [{
      Update: {
        TableName: this.coreTableName,
        Key: { PK: 'META', SK: 'STATE' },
        UpdateExpression: 'SET revision = :next, updatedAt = :updated, schemaVersion = :schema',
        ConditionExpression: 'revision = :expected',
        ExpressionAttributeValues: { ':next': state.revision, ':updated': state.updatedAt, ':schema': state.schemaVersion, ':expected': expectedRevision },
      },
    }];
    for (const change of changes) {
      const tableName = tableFor(change.collection, this);
      const key = entityKey(change.collection, change.id);
      TransactItems.push(transactionWrite(change, tableName, key));
    }
    await (await this.#document()).send(new TransactWriteCommand({ TransactItems }));
  }

  async #commitAccount(accountId, expectedRevision, changes, accountBefore) {
    const { TransactWriteCommand } = await import('@aws-sdk/lib-dynamodb');
    const TransactItems = [{
      Update: {
        TableName: this.coreTableName,
        Key: accountRevisionKey(accountId),
        UpdateExpression: 'SET revision = :next, updatedAt = :updated, entityType = :type',
        ConditionExpression: 'attribute_not_exists(revision) OR revision = :expected',
        ExpressionAttributeValues: { ':next': expectedRevision + 1, ':updated': ISO(), ':type': 'accountRevision', ':expected': expectedRevision },
      },
    }];
    if (!changes.some((change) => change.collection === 'accounts' && change.id === accountId)) {
      // Legacy/global closure and billing transactions do not advance the
      // account revision. Match the strongly read source account as well so
      // they cannot change/delete it between admission and a scoped commit.
      const condition = accountBefore
        ? { ConditionExpression: '#value = :expectedAccount', ExpressionAttributeNames: { '#value': 'value' }, ExpressionAttributeValues: { ':expectedAccount': accountBefore } }
        : { ConditionExpression: 'attribute_not_exists(PK)' };
      TransactItems.push({ ConditionCheck: { TableName: this.coreTableName, Key: entityKey('accounts', accountId), ...condition } });
    }
    for (const change of changes) TransactItems.push(transactionWrite(change, tableFor(change.collection, this), entityKey(change.collection, change.id)));
    await (await this.#document()).send(new TransactWriteCommand({ TransactItems }));
  }
}

function tableFor(collection, store) {
  if (collection === 'idempotency') return store.idempotencyTableName;
  if (collection === 'closedAccounts') return store.closedAccountsTableName;
  return store.coreTableName;
}
function entityId(collection, value) {
  const id = collection === 'idempotency' ? value?.key : value?.id;
  if (!id) throw new Error(`Entity in ${collection} has no stable ID.`);
  return String(id);
}
function entityKey(collection, id) { return { PK: `COLLECTION#${collection}`, SK: `ENTITY#${id}` }; }
function accountRevisionKey(accountId) { return { PK: `ACCOUNT#${accountId}`, SK: 'REVISION' }; }
function accountIndexMarkerKey(accountId) { return { PK: `ACCOUNT#${accountId}`, SK: 'INDEX_SCHEMA' }; }
function transactionWrite(change, tableName, key) {
  const condition = change.previous
    ? { ConditionExpression: '#value = :previous', ExpressionAttributeNames: { '#value': 'value' }, ExpressionAttributeValues: { ':previous': change.previous } }
    : { ConditionExpression: 'attribute_not_exists(PK)' };
  if (change.action === 'delete') return { Delete: { TableName: tableName, Key: key, ...condition } };
  return { Put: { TableName: tableName, Item: entityItem(change.collection, change.id, change.value), ...condition } };
}
function entityItem(collection, id, value) {
  const item = { ...entityKey(collection, id), collection, entityId: id, value };
  if (collection === 'watchers' && ['active', 'checking'].includes(value.status) && value.nextCheckAt) {
    item.GSI1PK = `SCHEDULE#${scheduleShard(id)}`;
    item.GSI1SK = `${value.nextCheckAt}#${id}`;
  }
  if (collection === 'jobs' && value.type === 'check' && value.status === 'running' && value.captureRun?.deadlineAt) {
    item.GSI1PK = `CAPTURE_DEADLINE#${scheduleShard(id)}`;
    item.GSI1SK = `${value.captureRun.deadlineAt}#${id}`;
  }
  if (value?.accountId) {
    item.GSI2PK = `ACCOUNT#${value.accountId}`;
    item.GSI2SK = `${collection.toUpperCase()}#${id}`;
  } else if (collection === 'accounts' && value?.contactEmail) {
    item.GSI2PK = `EMAIL#${String(value.contactEmail).trim().toLowerCase()}`;
    item.GSI2SK = `ACCOUNT#${id}`;
  }
  if (collection === 'idempotency' && value?.expiresAtEpoch != null) {
    const raw = Number(value.expiresAtEpoch);
    if (Number.isFinite(raw)) item.expiresAtEpoch = raw > 10_000_000_000 ? Math.floor(raw / 1000) : Math.floor(raw);
  }
  if (collection === 'teamMembers' && value?.userId) {
    item.GSI3PK = `USER#${String(value.userId)}`;
    item.GSI3SK = `MEMBERSHIP#${id}`;
  }
  return item;
}

function scheduleShard(id) {
  let hash = 2166136261;
  for (const character of String(id)) { hash ^= character.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return String((hash >>> 0) % SCHEDULE_SHARD_COUNT).padStart(2, '0');
}

function accountItemsFromScan(items, accountId) {
  const memberships = items.filter((item) => item.collection === 'teamMembers' && item.value?.accountId === accountId);
  const userIds = new Set(memberships.map((item) => String(item.value?.userId ?? '')).filter(Boolean));
  return items.filter((item) => item.value != null && (
    (item.collection === 'accounts' && item.value.id === accountId)
    || item.value.accountId === accountId
    || (item.collection === 'userProfiles' && userIds.has(String(item.value.id)))
  ));
}

function belongsToAccount(collection, value, accountId, memberUserIds) {
  if (collection === 'accounts') return value?.id === accountId;
  if (collection === 'userProfiles') return memberUserIds.has(String(value?.id ?? ''));
  return value?.accountId === accountId;
}

const INDEX_ATTRIBUTES = Object.freeze(['GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'GSI3PK', 'GSI3SK']);
function indexAttributesEqual(current, desired) {
  return INDEX_ATTRIBUTES.every((field) => current[field] === desired[field]);
}
function withIndexAttributes(current, desired) {
  const value = { ...current };
  for (const field of INDEX_ATTRIBUTES) delete value[field];
  for (const field of INDEX_ATTRIBUTES) if (desired[field] != null) value[field] = desired[field];
  return value;
}

function lookupSortKey(item) {
  if (!item?.collection || item.value == null || !CORE_COLLECTIONS.includes(item.collection)) return String(item?.GSI2SK ?? '');
  return String(entityItem(item.collection, entityId(item.collection, item.value), item.value).GSI2SK ?? item.GSI2SK ?? '');
}

export const dynamoStoreInternals = Object.freeze({ entityId, entityKey, entityItem, tableFor, scheduleShard, accountRevisionKey, accountIndexMarkerKey, accountItemsFromScan, transactionWrite, lookupSortKey, CORE_COLLECTIONS, ALL_COLLECTIONS, SCHEDULE_SHARD_COUNT });
