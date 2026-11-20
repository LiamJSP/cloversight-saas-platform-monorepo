import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const dependencyScopes = Object.freeze(['.', 'infra/runtime', 'infra/docker/browser-worker']);

// Read source only: npm ci remains responsible for the transitive dependency tree.
export function assertDependencyLock(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const file = path.join(directory, 'package-lock.json');
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}. Run npm run deps:lock, review the locks, then retry.`);
  const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
  const root = lock.packages?.[''];
  if (lock.lockfileVersion < 2 || !root) throw new Error(`Unsupported ${file}; regenerate it with npm run deps:lock.`);
  if (lock.name !== manifest.name || root.name !== manifest.name || lock.version !== manifest.version || root.version !== manifest.version) throw new Error(`Release metadata disagrees in ${file}; run npm run deps:lock.`);
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'engines']) {
    const expected = manifest[field] ?? {};
    const actual = root[field] ?? {};
    const names = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    if ([...names].some((name) => expected[name] !== actual[name])) throw new Error(`Manifest and lock disagree in ${directory} (${field}); run npm run deps:lock and review the result.`);
  }
  for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Pin an exact stable version for ${name} in ${directory}.`);
    const entry = lock.packages[`node_modules/${name}`];
    if (entry?.version !== version || !entry.integrity) throw new Error(`Locked package ${name} does not match its exact pin in ${directory}; run npm run deps:lock.`);
  }
  return lock;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) throw new Error('Usage: npm run deps:check');
  for (const directory of dependencyScopes) {
    assertDependencyLock(directory);
    console.log(`Source dependency lock agrees: ${directory}`);
  }
}
