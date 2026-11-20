import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOpsEmail, queueDepth } from '../scripts/audit-delivery.mjs';

test('a DLQ needs all three SQS counts, including in-flight and delayed messages', () => {
  const attrs = { ApproximateNumberOfMessages: '0', ApproximateNumberOfMessagesNotVisible: '0', ApproximateNumberOfMessagesDelayed: '0' };
  assert.equal(queueDepth(attrs), 0);
  assert.equal(queueDepth({ ...attrs, ApproximateNumberOfMessagesNotVisible: '1', ApproximateNumberOfMessagesDelayed: '2' }), 3);
  assert.throws(() => queueDepth({ ApproximateNumberOfMessages: '0' }));
  assert.throws(() => queueDepth({ ...attrs, ApproximateNumberOfMessages: '' }));
});

test('a regional operations check requires the configured email and confirmed subscription on that topic', () => {
  const topic = 'arn:aws:sns:eu-west-1:123456789012:alerts';
  const stack = { stage: 'prod', topic, email: 'ops@example.test' };
  const confirmed = { TopicArn: topic, Protocol: 'email', Endpoint: stack.email, SubscriptionArn: topic + ':fixture' };
  const check = (row, s = stack) => checkOpsEmail('stack', 'eu-west-1', (args, options) => {
    assert.equal(options.region, 'eu-west-1');
    return args[0] === 'cloudformation' ? s : [row];
  });
  assert.equal(check(confirmed), 'confirmed');
  for (const patch of [{ Protocol: 'sqs' }, { Endpoint: 'other@example.test' }, { SubscriptionArn: 'PendingConfirmation' }, { TopicArn: 'other' }]) {
    assert.throws(() => check({ ...confirmed, ...patch }), /Confirm/);
  }
  assert.throws(() => check(confirmed, { ...stack, email: '' }), /OPS_ALERT_EMAIL/);
  assert.equal(check(confirmed, { ...stack, email: '', stage: 'staging' }), 'unconfigured');
  assert.equal(check(confirmed, { ...stack, email: '', stage: 'staging', enabled: 'true', technical: confirmed.Endpoint }), 'confirmed');
});
