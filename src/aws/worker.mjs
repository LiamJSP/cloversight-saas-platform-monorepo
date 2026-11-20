/** @module aws/worker
 * @description Primary SQS worker handling check dispatch and regional result aggregation.
 */
import { getAwsRuntime } from './runtime.mjs';
import { retryRecordSoon } from './sqs-retry.mjs';

export async function handler(event, context) {
  const runtime = await getAwsRuntime('worker');
  const failures = [];
  for (const record of event?.Records ?? []) {
    try {
      const message = JSON.parse(record.body ?? '{}');
      const allowed = String(process.env.WORKER_ALLOWED_JOB_TYPES ?? '').split(',').filter(Boolean);
      if (allowed.length && !allowed.includes(message.type)) throw Object.assign(new Error('Job type is not allowed on this worker.'), { code: 'UNKNOWN_JOB_TYPE' });
      let result;
      if (message.type === 'check') {
        if (!message.watcherId) throw new Error('Check job is missing watcherId.');
        result = await runtime.monitoring.check(String(message.watcherId), { owner: context?.awsRequestId ?? record.messageId, accountId: message.accountId ? String(message.accountId) : null, manual: Boolean(message.manual), jobId: message.jobId ? String(message.jobId) : null, requestedAt: message.requestedAt ? String(message.requestedAt) : null });
      } else if (message.type === 'regional-capture-result') {
        result = await runtime.monitoring.acceptResult(message);
      } else if (message.type === 'maintenance') {
        result = await runtime.maintenance.tick({ runCleanup: message.runCleanup !== false, requestedAt: message.requestedAt, owner: context?.awsRequestId ?? record.messageId, strict: true });
      } else if (message.type === 'refunds') {
        await runtime.billing.processRefunds();
      } else if (message.type === 'billing-retries') {
        await runtime.billing.processRetries();
      } else if (message.type === 'report') {
        if (!message.jobId) throw new Error('Report job is missing jobId.');
        result = await runtime.reports.process(String(message.jobId));
      } else {
        throw Object.assign(new Error(`Unknown worker job type ${message.type}.`), { code: 'UNKNOWN_JOB_TYPE' });
      }
      runtime.logger.info('worker.record.acknowledged', {
        messageId: record.messageId,
        type: message.type,
        jobId: message.jobId,
        checkStatus: message.type === 'check' ? (result?.failed ? 'failed' : result?.deferred ? 'deferred' : result?.skipped ? 'skipped' : result?.queued ? 'dispatched' : 'completed') : null,
        maintenanceHealthy: message.type === 'maintenance' ? result?.healthy === true : null,
      });
    } catch (error) {
      await retryRecordSoon(record, [runtime.config.checkQueueUrl, runtime.config.captureResultQueueUrl, runtime.config.billingQueueUrl], error, runtime.logger);
      runtime.logger.error('worker.record.failed', { messageId: record.messageId, message: error.message, code: error.code });
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}
