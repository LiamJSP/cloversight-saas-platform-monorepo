import { id, ISO } from '../lib.mjs';

/** Small, unindexed operational records; never reconstruct customer state. */
export class MaintenanceTaskState {
  constructor({ tableName, region, client = null }) {
    if (!tableName) throw new Error('Maintenance task state requires a table name.');
    Object.assign(this, { tableName, region, client });
  }

  async #document() {
    if (!this.client) {
      const [{ DynamoDBClient }, { DynamoDBDocumentClient }] = await Promise.all([import('@aws-sdk/client-dynamodb'), import('@aws-sdk/lib-dynamodb')]);
      this.client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }), { marshallOptions: { removeUndefinedValues: true } });
    }
    return this.client;
  }

  #key(task) {
    if (!/^[a-z][a-z0-9-]{0,70}$/.test(task)) throw new Error('Invalid maintenance task name.');
    return { PK: `MAINTENANCE#${task}`, SK: 'STATE' };
  }

  async pendingTasks(tasks) {
    const { BatchGetCommand } = await import('@aws-sdk/lib-dynamodb');
    const document = await this.#document();
    const states = [];
    let pending = tasks.map((task) => this.#key(task));
    for (let attempt = 0; pending.length && attempt < 3; attempt += 1) {
      const result = await document.send(new BatchGetCommand({ RequestItems: { [this.tableName]: { Keys: pending, ConsistentRead: true } } }));
      states.push(...(result.Responses?.[this.tableName] ?? []));
      pending = result.UnprocessedKeys?.[this.tableName]?.Keys ?? [];
    }
    if (pending.length) throw Object.assign(new Error('Maintenance retry state could not be fully read.'), { code: 'MAINTENANCE_STATE_UNAVAILABLE' });
    return states.filter((state) => ['running', 'retry_scheduled'].includes(state.status)).map((state) => state.task);
  }

  async claim(task, { scheduledAt, owner, leaseSeconds = 660 }) {
    if (!Number.isFinite(Date.parse(scheduledAt))) throw new Error('Maintenance scheduled time is invalid.');
    const { GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const document = await this.#document();
    const key = this.#key(task);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const prior = (await document.send(new GetCommand({ TableName: this.tableName, Key: key, ConsistentRead: true }))).Item;
      const now = ISO();
      const nowEpoch = Math.floor(Date.now() / 1000);
      if (prior?.lastSucceededScheduledAt >= scheduledAt) return { claimed: false, reason: 'already-completed', state: prior };
      if (prior?.status === 'ambiguous' && prior.pendingScheduledAt >= scheduledAt) return { claimed: false, reason: 'ambiguous', state: prior };
      if (prior?.status === 'running' && Number(prior.leaseUntilEpoch) > nowEpoch) return { claimed: false, reason: 'leased', state: prior };
      if (task === 'failure-notice' && prior?.status === 'running') {
        // A terminated sender may have reached SES. Lease expiry is not proof
        // of a failed transport attempt, so do not resend that attempt.
        const interrupted = {
          ...prior, revision: Number(prior.revision) + 1,
          status: 'ambiguous', deliveryState: 'ambiguous', ambiguousAt: now,
          previousAmbiguousAttempt: { scheduledAt: prior.pendingScheduledAt, attemptId: prior.leaseToken, attemptedAt: prior.lastAttemptAt },
          leaseToken: null, owner: null, leaseUntilEpoch: null, retryAt: null,
          lastFailedAt: now, updatedAt: now, errorCode: 'NOTICE_ATTEMPT_INTERRUPTED',
        };
        try {
          await document.send(new PutCommand({
            TableName: this.tableName, Item: interrupted,
            ConditionExpression: '#revision = :revision AND leaseToken = :leaseToken',
            ExpressionAttributeNames: { '#revision': 'revision' }, ExpressionAttributeValues: { ':revision': prior.revision, ':leaseToken': prior.leaseToken },
          }));
          return { claimed: false, reason: 'ambiguous-previous-attempt', state: interrupted };
        } catch (error) { if (error.name !== 'ConditionalCheckFailedException') throw error; continue; }
      }
      if (prior?.retryAt && prior.retryAt > now) return { claimed: false, reason: 'retry-deferred', state: prior };
      const leaseToken = id('maintenance_claim');
      const state = {
        ...prior, ...key, entityType: 'maintenance-task', task,
        revision: Number(prior?.revision ?? 0) + 1,
        pendingScheduledAt: [prior?.pendingScheduledAt, scheduledAt].filter(Boolean).sort().at(-1),
        status: 'running', leaseToken, owner, leaseUntilEpoch: nowEpoch + leaseSeconds,
        lastAttemptAt: now, updatedAt: now, retryAt: null,
        consecutiveFailures: Number(prior?.consecutiveFailures ?? 0),
      };
      try {
        await document.send(new PutCommand({
          TableName: this.tableName, Item: state,
          ConditionExpression: prior ? '#revision = :revision' : 'attribute_not_exists(PK)',
          ...(prior ? { ExpressionAttributeNames: { '#revision': 'revision' }, ExpressionAttributeValues: { ':revision': Number(prior.revision ?? 0) } } : {}),
        }));
        return { claimed: true, leaseToken, state };
      } catch (error) { if (error.name !== 'ConditionalCheckFailedException') throw error; }
    }
    throw Object.assign(new Error(`Maintenance task ${task} claim conflicted repeatedly.`), { code: 'MAINTENANCE_CLAIM_CONFLICT' });
  }

  async finish(task, { leaseToken, success, error = null, state: claimedState = null, deliveryState = null, providerMessageId = null }) {
    const { GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const document = await this.#document();
    const key = this.#key(task);
    const prior = claimedState ?? (await document.send(new GetCommand({ TableName: this.tableName, Key: key, ConsistentRead: true }))).Item;
    if (!prior || prior.status !== 'running' || prior.leaseToken !== leaseToken) throw Object.assign(new Error(`Maintenance task ${task} lost its execution lease.`), { code: 'MAINTENANCE_CLAIM_LOST' });
    const now = ISO();
    const failures = success ? 0 : Number(prior.consecutiveFailures ?? 0) + 1;
    const ambiguous = !success && error?.deliveryState === 'ambiguous';
    const retrySeconds = Math.min(300, 30 * 2 ** Math.min(4, Math.max(0, failures - 1)));
    const state = {
      ...prior, revision: Number(prior.revision) + 1, updatedAt: now,
      status: success ? 'succeeded' : ambiguous ? 'ambiguous' : 'retry_scheduled', leaseToken: null, owner: null, leaseUntilEpoch: null,
      consecutiveFailures: failures, retryAt: success || ambiguous ? null : new Date(Date.now() + retrySeconds * 1000).toISOString(),
      ...(deliveryState || error?.deliveryState ? { deliveryState: deliveryState ?? error.deliveryState, providerMessageId } : {}),
      ...(success ? { lastSucceededAt: now, lastSucceededScheduledAt: prior.pendingScheduledAt, errorCode: null } : { lastFailedAt: now, errorCode: String(error?.code ?? error?.name ?? 'MAINTENANCE_TASK_FAILED').slice(0, 100) }),
    };
    await document.send(new PutCommand({
      TableName: this.tableName, Item: state,
      ConditionExpression: '#revision = :revision AND leaseToken = :leaseToken',
      ExpressionAttributeNames: { '#revision': 'revision' }, ExpressionAttributeValues: { ':revision': prior.revision, ':leaseToken': leaseToken },
    }));
    return state;
  }
}
