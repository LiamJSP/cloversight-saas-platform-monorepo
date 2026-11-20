import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { addToZip, archiveInventory, releaseSources } from './release-archive.mjs';

const root = process.cwd();
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
const parent = path.dirname(root);
const filename = 'cloversight-saas-release-' + pkg.version + '.zip';
const output = path.join(parent, filename);
const replace = process.argv.slice(2);
if (replace.some(arg => arg !== '--replace')) throw new Error('Usage: npm run package:release -- [--replace]');
for (const file of [output, output + '.sha256']) {
  try {
    await fs.access(file);
    if (!replace.includes('--replace')) throw new Error('Release output already exists: ' + file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const sources = releaseSources(root);
execFileSync(process.execPath, ['scripts/verify.mjs'], { stdio: 'inherit' });
await fs.rm('docs/reference/jsdoc', { recursive: true, force: true });
execFileSync('npm', ['run', 'docs:js'], { stdio: 'inherit' });

const generated = ['dist/cloversight-target-picker.zip'];
const jsdoc = 'docs/reference/jsdoc';
for (const entry of await fs.readdir(jsdoc, { recursive: true, withFileTypes: true })) {
  if (entry.isDirectory()) continue;
  generated.push(path.relative(root, path.resolve(entry.parentPath, entry.name)));
}

// Build privately and publish completed files. A failed build preserves the previous release.
const temp = await fs.mkdtemp(path.join(parent, '.cloversight-package-'));
try {
  const archive = path.join(temp, filename);
  await fs.writeFile(path.join(temp, archiveInventory), JSON.stringify(sources, null, 2) + '\n');
  addToZip(archive, root, [...sources, ...generated]);
  addToZip(archive, temp, [archiveInventory]);
  const digest = createHash('sha256').update(await fs.readFile(archive)).digest('hex');
  await fs.writeFile(archive + '.sha256', digest + '  ' + filename + '\n');
  if (replace.includes('--replace')) {
    await fs.rename(archive, output);
    await fs.rename(archive + '.sha256', output + '.sha256');
  } else {
    await fs.link(archive, output);
    await fs.link(archive + '.sha256', output + '.sha256');
  }
  console.log('Release: ' + output + '\nSHA-256: ' + digest);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
