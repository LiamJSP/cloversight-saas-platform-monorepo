const clients = new Map();

// Only the configured source queues may have their receipt visibility changed.
export function sourceQueue(record, queueUrls) {
  const arn = String(record.eventSourceARN ?? '').split(':');
  if (arn.length !== 6 || arn[2] !== 'sqs') return null;
  return queueUrls.filter(Boolean).find((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === `sqs.${arn[3]}.amazonaws.com`
      && url.pathname === `/${arn[4]}/${arn[5]}`;
  }) ?? null;
}

export function retryDelay(record, error) {
  const count = Math.max(1, Math.min(5, Number(record.attributes?.ApproximateReceiveCount) || 1));
  return Math.min(240, Math.max(30 * 2 ** Math.min(2, count - 1), Math.ceil(Number(error?.retryAfterSeconds) || 0)));
}

export async function changeRecordVisibility(record, queueUrls, seconds, client = null) {
  const queueUrl = sourceQueue(record, queueUrls);
  if (!queueUrl || !record.receiptHandle) return false;
  const region = record.eventSourceARN.split(':')[3];
  const { SQSClient, ChangeMessageVisibilityCommand } = await import('@aws-sdk/client-sqs');
  if (!client) {
    if (!clients.has(region)) clients.set(region, new SQSClient({ region }));
    client = clients.get(region);
  }
  await client.send(new ChangeMessageVisibilityCommand({ QueueUrl: queueUrl, ReceiptHandle: record.receiptHandle, VisibilityTimeout: seconds }));
  return true;
}

export async function retryRecordSoon(record, queueUrls, error, logger) {
  try { await changeRecordVisibility(record, queueUrls, retryDelay(record, error)); }
  catch (retryError) {
    // Never acknowledge failed work if changing visibility itself fails.
    logger?.warn?.('queue.retry_visibility.failed', { messageId: record.messageId, code: retryError.code ?? retryError.name });
  }
}
