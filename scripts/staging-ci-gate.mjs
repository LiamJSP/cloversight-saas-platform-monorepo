import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runStagingSmoke } from './staging-smoke.mjs';
import { runStagingFunctional } from './staging-functional.mjs';
import { runStagingRegionalCheck } from './staging-regional-check.mjs';
import { stagingTarget, stagingReadWithRetry } from './staging-test-client.mjs';
import { runStagingPaymentBoundary } from './staging-payment-boundary.mjs';

export function failOnWarning(env = process.env) {
  const value = String(env.WEBWATCH_TEST_FAIL_ON_WARNING ?? '0').toLowerCase();
  if (!['0', '1', 'false', 'true'].includes(value)) throw new Error('WEBWATCH_TEST_FAIL_ON_WARNING must be 0 or 1.');
  return value === '1' || value === 'true';
}

// Run the read-only identity/boundary probes before the one expensive mutation.
// A warning only means an optional fixture is absent; an executed check that
// fails is always fatal, even with strict warnings disabled.
export async function runStagingCiGate(env = process.env, { smoke = runStagingSmoke, functional = runStagingFunctional, payment = runStagingPaymentBoundary, regional = runStagingRegionalCheck } = {}) {
  const strict = failOnWarning(env);
  const warnings = [];
  const smokeResult = await smoke(stagingTarget(env), stagingReadWithRetry);
  if (!smokeResult.regionalStatusChecked) warnings.push('Smoke regional summary was not exercised because account A has no watcher.');
  const boundaries = await functional(env, stagingReadWithRetry);
  if (!boundaries.checkJobExercised) warnings.push('Cross-account check job denial was only exercised for accounts with existing jobs.');
  if (!boundaries.reportExercised) warnings.push('Cross-account report denial was only exercised for accounts with existing reports.');
  for (const warning of warnings) {
    console.warn(`WARNING: ${warning}`);
    if (env.GITHUB_ACTIONS === 'true') process.stdout.write(`::warning::${warning}\n`);
  }
  if (strict && warnings.length) throw new Error(`${warnings.length} staging coverage warning(s) with WEBWATCH_TEST_FAIL_ON_WARNING=1.`);
  await payment(env);
  const capture = await regional(env);
  return { warnings, capture, boundaries };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runStagingCiGate().then(({ warnings, capture }) => console.log(`Staging CI passed: ${capture.regionCount} live check regions; ${warnings.length} warning(s).`))
    .catch((error) => { console.error(`Staging CI failed: ${error.message}`); process.exitCode = 1; });
}
