import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { awsJson, readStack, stackResources } from './aws-cli.mjs';

export function deploymentMode(stack) {
  if (!stack || stack.StackStatus === 'REVIEW_IN_PROGRESS' || stack.StackStatus === 'CREATE_FAILED') return 'preserve';
  if (stack.StackStatus === 'UPDATE_FAILED' && stack.DisableRollback === true) return 'preserve';
  if (['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE', 'IMPORT_COMPLETE', 'IMPORT_ROLLBACK_COMPLETE'].includes(stack.StackStatus)) return 'rollback';
  throw new Error(`Stack ${stack.StackId} is ${stack.StackStatus}. Deployment is blocked before packaging or uploading. Resolve this exact stack's state; do not reuse an ARN from an earlier creation.`);
}

export function relevantFailures(events, since = null) {
  const after = since ? Date.parse(since) : null;
  if (since && !Number.isFinite(after)) throw new Error('Invalid deployment start timestamp.');
  return events.filter((event) => String(event.ResourceStatus).endsWith('_FAILED') &&
    event.ResourceStatusReason !== 'Resource creation cancelled' &&
    (after === null || Date.parse(event.Timestamp) >= after));
}

export function canRetryThrottledCreate(stack, failures) {
  if (!stack || !['CREATE_FAILED', 'UPDATE_FAILED'].includes(stack.StackStatus) || stack.DisableRollback !== true) return false;
  const resources = failures.filter((event) => event.ResourceType !== 'AWS::CloudFormation::Stack');
  return resources.length > 0 && resources.every((event) => /rate exceeded|throttl|TooManyRequests|RequestLimitExceeded/i.test(event.ResourceStatusReason || ''));
}

export function inspectPlan(name, region) {
  const stack = readStack(name, region);
  const mode = deploymentMode(stack);
  const resources = stackResources(stack, region);
  return { mode, stackId: stack?.StackId ?? null, status: stack?.StackStatus ?? 'NEW',
    coreTableId: resources.find((resource) => resource.LogicalResourceId === 'CoreTable' && ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_FAILED'].includes(resource.ResourceStatus))?.PhysicalResourceId ?? '' };
}

export function failureReport(name, region, since) {
  const stack = readStack(name, region);
  if (!stack) return { stack: name, region, status: 'NOT_FOUND', failures: [], retryable: false };
  const events = awsJson(['cloudformation', 'describe-stack-events', '--stack-name', stack.StackId], { region }).StackEvents ?? [];
  const failures = relevantFailures(events, since);
  return { stack: stack.StackId, region, status: stack.StackStatus, reason: stack.StackStatusReason,
    failures: failures.map(({ Timestamp, LogicalResourceId, ResourceType, ResourceStatus, ResourceStatusReason }) =>
      ({ Timestamp, LogicalResourceId, ResourceType, ResourceStatus, ResourceStatusReason })),
    retryable: canRetryThrottledCreate(stack, failures) };
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const [command, name, region = process.env.AWS_REGION || 'us-east-1', since] = process.argv.slice(2);
  if (!['plan', 'diagnose', 'retryable', 'completed'].includes(command) || !/^webwatch-[\w-]+$/.test(name || '')) throw new Error('Usage: deployment-control.mjs plan|diagnose|retryable|completed webwatch-STACK REGION [START_TIMESTAMP]');
  try {
    if (command === 'plan') console.log(JSON.stringify(inspectPlan(name, region)));
    else if (command === 'completed') {
      const stack = readStack(name, region);
      if (deploymentMode(stack) !== 'rollback') throw new Error(`AWS CLI finished without a completed stack: ${stack?.StackId || name} is ${stack?.StackStatus || 'NOT_FOUND'}.`);
    }
    else {
      const report = failureReport(name, region, since);
      if (command === 'retryable') process.exitCode = report.retryable ? 0 : 1;
      else {
        const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
        const dir = path.join(root, '.local');
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        const file = path.join(dir, `deployment-failure-${name}-${region}.json`);
        fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
        console.error(JSON.stringify(report, null, 2));
        console.error(`Deployment diagnostics saved to ${file}`);
      }
    }
  } catch (error) {
    console.error(error.message);
    if (command === 'plan') {
      try { console.error(JSON.stringify(failureReport(name, region), null, 2)); } catch (diagnosticError) { console.error(diagnosticError.message); }
    }
    process.exitCode = 1;
  }
}
