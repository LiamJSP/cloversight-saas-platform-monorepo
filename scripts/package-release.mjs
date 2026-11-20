import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const root = process.cwd();
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const output = path.resolve(root, '..', `cloversight-saas-release-${pkg.version}.zip`);
const checksumPath = `${output}.sha256`;

const replace = process.argv.slice(2);
if (replace.some((arg) => arg !== '--replace')) throw new Error('Usage: npm run package:release -- [--replace]');
for (const file of [output, checksumPath]) {
  try { await fs.access(file); if (!replace.includes('--replace')) throw new Error(`Release output already exists: ${file}. Preserve it or pass --replace explicitly.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
// Packaging is a release gate, not merely an archive command.
run(process.execPath, ['scripts/verify.mjs']);
await fs.rm(output, { force: true });
await fs.rm(checksumPath, { force: true });

run('zip', [
  '-qr', output, '.',
  '-x',
  '.local/*', '.local-browsers/*', '.git/*', 'node_modules/*', '*/node_modules/*', '.aws/*',
  '.env*', '*/.env*', '.npmrc', '*/.npmrc', '.envrc', '*/.envrc',
  '.env', '.env.local', '.env.production', '.env.development', '.env.test', '.env.*.local',
  '*.zip', '../*.zip',
  'dist/*', 'nvm-install.sh', 'aws/*',
]);

// Preserve the independently installable extension package in the release without
// copying other disposable build output into source control or the archive.
run('zip', ['-q', output, '.env.example', 'dist/cloversight-target-picker.zip']);

const archive = await fs.readFile(output);
const digest = createHash('sha256').update(archive).digest('hex');
await fs.writeFile(checksumPath, `${digest}  ${path.basename(output)}\n`, { mode: 0o644 });
console.log(`Release: ${output}`);
console.log(`SHA-256: ${digest}`);
