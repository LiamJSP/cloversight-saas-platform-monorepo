import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagingTarget } from './staging-test-client.mjs';
import { ensureBrowserDockerReady } from './check-browser-docker.mjs';

import { assertDependencyLock } from './dependency-locks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assertDependencyLock(root);
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.dependencies?.playwright;
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Pin an exact Playwright version before running the browser container.');
const dockerfile = readFileSync(path.join(root, 'tests/docker/Dockerfile.browser'), 'utf8');
if (!dockerfile.includes(`FROM mcr.microsoft.com/playwright:v${version}-noble`)) {
  throw new Error('The browser image version must match package.json playwright exactly.');
}

const mode = process.argv[2] ?? 'local';
if (!['local', 'staging'].includes(mode) || process.argv.length > 3) throw new Error('Expected local or staging browser mode.');
// Validate the destination and fixture before building an image or forwarding
// credentials. Only these four test variables reach the staging container.
if (mode === 'staging') stagingTarget();
ensureBrowserDockerReady();

const image = `cloversight-browser-tests:v${version}`;
function docker(args) {
  const result = spawnSync('docker', args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw new Error(`Unable to start Docker: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

docker(['build', '--file', 'tests/docker/Dockerfile.browser', '--tag', image, '.']);
const args = ['run', '--rm', '--init', '--shm-size=1g'];
if (mode === 'local') args.push('--network', 'none');
else for (const name of ['WEBWATCH_TEST_BASE_URL', 'WEBWATCH_TEST_EXPECTED_HOST', 'WEBWATCH_TEST_ACCOUNT_A', 'WEBWATCH_TEST_TOKEN_A']) args.push('--env', name);
args.push(image);
if (mode === 'staging') args.push('npm', 'run', 'test:staging:browser');
docker(args);
