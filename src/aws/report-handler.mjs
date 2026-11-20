import { getAwsRuntime } from './runtime.mjs';

export async function handler(event) {
  const runtime = await getAwsRuntime('report');
  const failures = [];
  for (const record of event?.Records ?? []) {
    try {
      const message = JSON.parse(record.body ?? '{}');
      if (message.type !== 'report' || !message.jobId) throw Object.assign(new Error('Report queue message is invalid.'), { code: 'INVALID_REPORT_JOB' });
      const result = await runtime.reports.process(String(message.jobId));
      runtime.logger.info('report.record.acknowledged', { messageId: record.messageId, jobId: message.jobId, status: result?.status ?? 'ignored' });
    } catch (error) {
      runtime.logger.error('report.record.failed', { messageId: record.messageId, message: error.message, code: error.code });
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}
