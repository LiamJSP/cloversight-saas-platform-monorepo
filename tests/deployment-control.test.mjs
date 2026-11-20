import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentMode, relevantFailures, canRetryThrottledCreate } from '../scripts/deployment-control.mjs';

test('new and preserved failed stacks can resume; completed stacks use rollback', () => {
  assert.equal(deploymentMode(null), 'preserve');
  for (const StackStatus of ['REVIEW_IN_PROGRESS', 'CREATE_FAILED']) assert.equal(deploymentMode({ StackStatus }), 'preserve');
  assert.equal(deploymentMode({ StackStatus: 'UPDATE_FAILED', DisableRollback: true }), 'preserve');
  for (const StackStatus of ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE', 'IMPORT_COMPLETE']) assert.equal(deploymentMode({ StackStatus, DisableRollback: true }), 'rollback');
});

test('rollback, deletion, active operations and unknown states fail closed with the exact stack ID', () => {
  for (const StackStatus of ['ROLLBACK_FAILED', 'ROLLBACK_COMPLETE', 'DELETE_FAILED', 'CREATE_IN_PROGRESS', 'UPDATE_IN_PROGRESS', 'DELETE_COMPLETE', 'UPDATE_FAILED', 'UNEXPECTED']) {
    assert.throws(() => deploymentMode({ StackStatus, StackId: 'arn:current-stack' }), /arn:current-stack/);
  }
});

test('failure reporting excludes old attempts and downstream creation cancellation', () => {
  const events = [
    { Timestamp: '2026-11-16T00:00:00Z', ResourceStatus: 'CREATE_FAILED', ResourceStatusReason: 'old error' },
    { Timestamp: '2026-11-17T01:00:00Z', ResourceStatus: 'CREATE_FAILED', ResourceStatusReason: 'Resource creation cancelled' },
    { Timestamp: '2026-11-17T01:00:00Z', ResourceStatus: 'CREATE_FAILED', ResourceStatusReason: 'Rate exceeded' },
    { Timestamp: '2026-11-17T01:00:00Z', ResourceStatus: 'CREATE_COMPLETE' },
  ];
  assert.deepEqual(relevantFailures(events, '2026-11-17T00:00:00Z'), [events[2]]);
  assert.throws(() => relevantFailures(events, 'not-a-date'));
});

test('automatic retry requires a preserved failed stack and exclusively throttling failures', () => {
  const stack = { StackStatus: 'CREATE_FAILED', DisableRollback: true };
  const throttled = { ResourceType: 'AWS::CloudFront::Function', ResourceStatusReason: 'ServiceLimitExceeded: Reason: Rate exceeded' };
  assert.equal(canRetryThrottledCreate(stack, [throttled]), true);
  for (const reason of ['AccessDenied', 'Invalid assets', 'TooManyFunctions: quota exceeded', 'The bucket is not empty']) {
    assert.equal(canRetryThrottledCreate(stack, [throttled, { ResourceType: 'AWS::S3::Bucket', ResourceStatusReason: reason }]), false);
  }
  assert.equal(canRetryThrottledCreate({ ...stack, DisableRollback: false }, [throttled]), false);
  assert.equal(canRetryThrottledCreate({ ...stack, StackStatus: 'ROLLBACK_FAILED' }, [throttled]), false);
  assert.equal(canRetryThrottledCreate(stack, []), false);
});
