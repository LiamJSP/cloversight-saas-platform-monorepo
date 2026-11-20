import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = [
  'package.json',
  'scripts/worker-image-source-hash.mjs',
  'scripts/worker-base.mjs',
  'scripts/verify-worker-image-contract.mjs',
  'infra/docker/browser-worker',
  'infra/scripts/build-worker-image.sh',
  'infra/scripts/deploy.sh',
  'src',
];

async function collect(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const stat = await fs.stat(absolutePath);
  if (stat.isFile()) return [relativePath.split(path.sep).join('/')];
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const nested = await Promise.all(entries.filter(entry => entry.name !== 'node_modules').map((entry) => collect(path.join(relativePath, entry.name))));
  return nested.flat();
}

export async function workerImageSourceHash() {
  const files = (await Promise.all(inputs.map(collect))).flat().sort();
  const hash = crypto.createHash('sha256');
  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await fs.readFile(path.join(projectRoot, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${await workerImageSourceHash()}\n`);
}
