import { spawnSync } from 'node:child_process';
import { assertReservationBudget } from '../src/deployment/capacity.mjs';
const stage = process.env.WW_STAGE;
if (!['staging', 'beta', 'prod'].includes(stage)) throw new Error('Load validated deployment settings before checking Lambda quota.');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--regional')) throw new Error('Usage: check-lambda-capacity.mjs [--regional REGION]');
const regional = args[1];
const region = regional ?? process.env.AWS_REGION ?? 'us-east-1';
if (regional && !String(process.env.WW_CHECK_REGIONS).split(',').includes(regional)) throw new Error('Region is not in the deployment configuration.');
function aws(operation, rest = [], missing = false) {
  const result = spawnSync('aws', ['--region', region, '--no-cli-pager', 'lambda', operation, ...rest, '--output', 'json'], { encoding: 'utf8' });
  if (result.status !== 0) {
    if (missing && /ResourceNotFoundException/.test(result.stderr ?? '')) return {};
    throw new Error(`Read-only Lambda quota preflight failed (${operation}): ${result.stderr || result.error?.message || result.status}`);
  }
  return JSON.parse(result.stdout);
}
const desired = regional ? { 'regional-capture': Number(process.env.WW_REGIONAL_CAPTURE_CONCURRENCY) }
  : { capture: Number(process.env.WW_CAPTURE_CONCURRENCY), worker: Number(process.env.WW_WORKER_CONCURRENCY), api: 5, billing: 1, report: 2, dispatcher: 1, 'inbound-email': 2 };
const unreserved = aws('get-account-settings').AccountLimit?.UnreservedConcurrentExecutions;
const reservations = Object.entries(desired).map(([name, desired]) => ({
  desired, current: aws('get-function-concurrency', ['--function-name', `webwatch-${stage}-${name}`], true).ReservedConcurrentExecutions ?? 0,
}));
const result = assertReservationBudget(unreserved, reservations);
console.log(`Lambda quota checked in ${region}: at least ${result.remainingUnreserved} unreserved slots remain while reservations increase (planned reductions are not credited early).`);
