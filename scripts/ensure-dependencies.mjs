import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

import { assertWorkstationNode } from './workstation-runtime.mjs';
import { assertDependencyLock } from './dependency-locks.mjs';
const nodeMajor = assertWorkstationNode();
assertDependencyLock('.');
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' });
if (npmVersion.error || npmVersion.status !== 0 || Number(npmVersion.stdout.trim().split('.')[0]) < 10) throw new Error('Use npm 10 or newer; see README.md.');
const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const fingerprint = crypto.createHash('sha256').update(fs.readFileSync('package-lock.json')).update(fs.readFileSync('package.json')).update(`${nodeMajor}:${npmVersion.stdout.trim().split('.')[0]}:${process.platform}:${process.arch}`).digest('hex');
const marker = 'node_modules/.cloversight-source-lock';
const installed = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies }).every(([name, version]) => {
  try { return JSON.parse(fs.readFileSync(`node_modules/${name}/package.json`, 'utf8')).version === version; }
  catch { return false; }
});
if (!installed || !fs.existsSync(marker) || fs.readFileSync(marker, 'utf8') !== fingerprint) {
  const result = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  fs.writeFileSync(marker, fingerprint);
}
