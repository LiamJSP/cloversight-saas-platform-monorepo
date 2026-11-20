import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertWorkstationNode } from './workstation-runtime.mjs';
import { assertDependencyLock, dependencyScopes } from './dependency-locks.mjs';

if (process.argv.length > 2) throw new Error('Usage: npm run deps:lock');
assertWorkstationNode();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' });
if (npmVersion.error || npmVersion.status !== 0 || Number(npmVersion.stdout.trim().split('.')[0]) < 10) throw new Error('Use npm 10+ to resolve source locks.');
// Preserve prior lock bytes before npm writes. This command resolves metadata;
// it does not install node_modules, run lifecycle scripts, audit or run the app.
fs.mkdirSync('.local', { recursive: true });
const backup = fs.mkdtempSync(path.join(root, '.local', 'dependency-lock-backup-'));
for (const directory of dependencyScopes) {
  const file = path.join(directory, 'package-lock.json');
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(backup, `${directory === '.' ? 'root' : directory.replaceAll('/', '-')}.package-lock.json`), fs.constants.COPYFILE_EXCL);
}
console.log(`Previous locks preserved in ${path.relative(root, backup)}.`);
for (const directory of dependencyScopes) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Pin an exact stable version for ${name} in ${directory}.`);
  }
  const args = ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--include=dev'];
  if (directory !== '.') args.push('--prefix', directory);
  const result = spawnSync('npm', args, { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Lock resolution failed for ${directory}. Earlier locks may already be updated; inspect changes and preserved originals before retrying.`);
  assertDependencyLock(directory);
}
console.log('All three source locks resolved. Review their changes; run npm run setup and the documented acceptance/audit gates before deploying.');
