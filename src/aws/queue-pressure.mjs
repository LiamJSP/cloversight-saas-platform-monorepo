const ATTRIBUTES = ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesDelayed'];

/** Approximate SQS backlog is a soft admission signal, never a hard permit. */
export async function queuePressure(client, queueUrl) {
  const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');
  const result = await client.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ATTRIBUTES }));
  const counts = ATTRIBUTES.map((name) => Number(result.Attributes?.[name]));
  if (counts.some((count) => !Number.isInteger(count) || count < 0)) throw Object.assign(new Error('Queue health returned incomplete message counts.'), { code: 'QUEUE_HEALTH_UNAVAILABLE' });
  return { visible: counts[0], inFlight: counts[1], delayed: counts[2], outstanding: counts.reduce((sum, count) => sum + count, 0), observedAt: new Date().toISOString(), admissionsSinceObservation: 0 };
}

export function fairWatcherOrder(watchers, now) {
  const groups = new Map();
  for (const watcher of watchers) {
    const accountId = String(watcher.accountId ?? 'unknown');
    if (!groups.has(accountId)) groups.set(accountId, []);
    groups.get(accountId).push(watcher);
  }
  const accounts = [...groups.keys()].sort();
  const offset = accounts.length ? Math.floor(Date.parse(now) / 60_000) % accounts.length : 0;
  const order = [...accounts.slice(offset), ...accounts.slice(0, offset)];
  const result = [];
  while (result.length < watchers.length) for (const account of order) {
    const watcher = groups.get(account).shift();
    if (watcher) result.push(watcher);
  }
  return result;
}
