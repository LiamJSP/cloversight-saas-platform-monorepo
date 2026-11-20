import { schedulingOffset } from '../monitoring/schedule.mjs';
/** @module aws/dispatcher
 * @description EventBridge schedule dispatcher for due monitoring work.
 */
import { loadConfig } from '../config.mjs';
import { createLogger } from '../logger.mjs';
import { DynamoStateStore } from '../storage/dynamo-store.mjs';
import { fairQueueGroupId, ISO, id } from '../lib.mjs';
import { fairWatcherOrder, queuePressure } from './queue-pressure.mjs';

/**
 * Lightweight scheduler dispatcher. It intentionally does not construct the
 * notification or billing runtime, so a timing-only Lambda has no access to
 * Stripe, Twilio, response-signing, or snapshot secrets.
 */
export async function handler(event, context) {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const store = new DynamoStateStore({
    coreTableName: config.coreTableName,
    idempotencyTableName: config.idempotencyTableName,
    closedAccountsTableName: config.closedAccountsTableName,
    region: config.awsRegion,
    logger,
  });
  const now = ISO();
  const { SQSClient } = await import('@aws-sdk/client-sqs');
  return dispatchDueChecks({ config, logger, store, now, sqs: new SQSClient({ region: config.awsRegion }), owner: context?.awsRequestId ?? id('dispatch') });
}

export async function dispatchDueChecks({ config, logger, store, now = ISO(), sqs, owner = id('dispatch') }) {
  const { SendMessageBatchCommand, SendMessageCommand } = await import('@aws-sdk/client-sqs');
  // Queue essential work before any check-read/admission failure. A capture
  // backlog must not stop settlement, notification or account-erasure timers.
  const runCleanup = new Date(now).getUTCMinutes() % 15 === 0;
  if (config.billingQueueUrl) {
    await sqs.send(new SendMessageCommand({ QueueUrl: config.billingQueueUrl, MessageBody: JSON.stringify({ type: 'maintenance', jobId: id('maint'), requestedAt: now, runCleanup }) }));
  }
  const limit = config.dispatchBatchSize ?? 500;
  // Retain a broader candidate window before tenant round-robin admission.
  const due = await store.dueWatchers(new Date(Date.parse(now) + 59_000).toISOString(), Math.min(1000, limit * 2));
  let capacity = limit;
  let checkQueueOutstanding = null;
  if (due.length) {
    try {
      const pressure = await queuePressure(sqs, config.checkQueueUrl);
      checkQueueOutstanding = pressure.outstanding;
      capacity = Math.max(0, Math.min(limit, Number(config.checkQueueMaxOutstanding ?? 500) - pressure.outstanding));
    } catch (error) {
      capacity = 0;
      logger.warn('dispatcher.queue.health_unavailable', { code: error.code ?? error.name });
    }
  }
  let dispatched = 0;
  let claimed = 0;
  let duplicateClaims = 0;
  const candidates = fairWatcherOrder(due, now);
  for (let offset = 0; offset < candidates.length && claimed < capacity;) {
    const batch = candidates.slice(offset, offset + Math.min(10, capacity - claimed));
    const claims = await Promise.all(batch.map((watcher) => store.claimScheduledDispatch(watcher, owner, now)));
    const entries = batch.flatMap((watcher, index) => claims[index] ? [{
      Id: `w${offset + index}`, MessageGroupId: fairQueueGroupId(watcher.accountId),
      DelaySeconds: watcher.nextCheckAt > now ? Math.min(59, Math.max(0, Math.ceil((Date.parse(watcher.nextCheckAt) - Date.parse(now)) / 1000))) : schedulingOffset(watcher, 120),
      MessageBody: JSON.stringify({ type: 'check', jobId: claims[index].jobId, accountId: watcher.accountId, watcherId: watcher.id, manual: false, requestedAt: now }),
    }] : []);
    offset += batch.length;
    duplicateClaims += batch.length - entries.length;
    claimed += entries.length;
    if (!entries.length) continue;
    // On an ambiguous send, leave the short lease in place. A subsequent tick
    // retries the SAME job after expiry, so a lost acknowledgement cannot bill
    // a second capture. An unsent job is delayed, never permanently marked sent.
    const result = await sqs.send(new SendMessageBatchCommand({ QueueUrl: config.checkQueueUrl, Entries: entries }));
    dispatched += result.Successful?.length ?? 0;
    if (result.Failed?.length) throw Object.assign(new Error(`SQS rejected ${result.Failed.length} watcher jobs.`), { details: result.Failed });
  }
  // Delivery timers, billing retries and capture deadlines still run every
  // minute. Bulk retention sweeps need no such cadence and otherwise rebuild
  // all three state tables twice per minute even on an idle deployment.
  const deferred = Math.max(0, due.length - claimed - duplicateClaims);
  if (deferred) logger.info('dispatcher.capacity_deferred', { deferred, checkQueueOutstanding, reason: checkQueueOutstanding == null ? 'queue-health-unavailable' : 'queue-backpressure' });
  const result = { due: due.length, dispatched, deferred, duplicateClaims, checkQueueOutstanding, maintenanceQueued: Boolean(config.billingQueueUrl), cleanupQueued: Boolean(config.billingQueueUrl) && runCleanup };
  logger.info('dispatcher.completed', result);
  return result;
}
