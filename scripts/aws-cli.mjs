import { spawnSync } from 'node:child_process';

export function awsJson(args, { region = process.env.AWS_REGION || 'us-east-1', missingStackIsNull = false } = {}) {
  const result = spawnSync('aws', ['--region', region, '--no-cli-pager', ...args, '--output', 'json'], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '8' },
  });
  if (result.status !== 0) {
    const stderr = String(result.stderr || result.error?.message || '').trim();
    if (missingStackIsNull && /ValidationError/.test(stderr) && /Stack with id .* does not exist/.test(stderr)) return null;
    throw new Error(`AWS CLI ${args.slice(0, 2).join(' ')} failed in ${region}: ${stderr || `exit ${result.status}`}`);
  }
  try { return JSON.parse(result.stdout || '{}'); }
  catch { throw new Error(`AWS CLI returned invalid JSON for ${args.slice(0, 2).join(' ')}.`); }
}

export function readStack(name, region) {
  return awsJson(['cloudformation', 'describe-stacks', '--stack-name', name], { region, missingStackIsNull: true })?.Stacks?.[0] ?? null;
}

export function stackResources(stack, region) {
  if (!stack) return [];
  return (awsJson(['cloudformation', 'list-stack-resources', '--stack-name', stack.StackId], { region }).StackResourceSummaries ?? [])
    .filter((resource) => resource.ResourceStatus !== 'DELETE_COMPLETE' && resource.ResourceStatus !== 'DELETE_SKIPPED');
}
