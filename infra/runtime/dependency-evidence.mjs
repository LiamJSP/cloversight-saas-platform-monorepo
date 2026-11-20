import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [command, ...args] = process.argv.slice(2);
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readOptional = async (file) => {
  try { return await fs.readFile(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};

// npm ci remains responsible for validating the complete transitive lock tree.
// This inexpensive preflight prevents a missing/stale source lock being mistaken
// for reproducible release evidence before a build starts.
if (command === 'check') {
  const required = args.includes('--require-locks') || process.env.WEBWATCH_REQUIRE_DEPENDENCY_LOCKS === '1';
  const directories = args.filter((arg) => arg !== '--require-locks');
  if (!directories.length) throw new Error('Provide at least one dependency package directory.');
  let missing = false;
  for (const directory of directories) {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    const bytes = await readOptional(path.join(directory, 'package-lock.json'));
    if (!bytes) {
      missing = true;
      console.error(`Dependency lock missing: ${directory}/package-lock.json; legacy npm install remains nondeterministic. See docs/documentation.md#deployed-dependency-and-release-evidence.`);
      continue;
    }
    const lock = JSON.parse(bytes);
    const root = lock.packages?.[''];
    if (lock.lockfileVersion < 2 || !root) throw new Error(`Unsupported lockfile: ${directory}/package-lock.json`);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const expected = manifest[field] ?? {};
      const actual = root[field] ?? {};
      const names = new Set([...Object.keys(expected), ...Object.keys(actual)]);
      if ([...names].some((name) => expected[name] !== actual[name])) throw new Error(`Dependency manifest and lockfile disagree: ${directory} (${field}). Regenerate and review the lock.`);
    }
    console.log(`Locked dependency manifest: ${directory} (sha256 ${digest(bytes)})`);
  }
  if (missing && required) throw new Error('WEBWATCH_REQUIRE_DEPENDENCY_LOCKS=1 requires committed Lambda and browser runtime locks before building.');
} else if (command === 'record') {
  const flags = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index]?.startsWith('--') || args[index + 1] == null) throw new Error('Evidence arguments must be --name value pairs.');
    flags[args[index].slice(2)] = args[index + 1];
  }
  for (const key of ['scope', 'manifest', 'source-lock', 'sbom', 'output', 'artifact']) {
    if (!flags[key]) throw new Error(`Missing evidence argument: --${key}`);
  }
  const manifest = await fs.readFile(flags.manifest);
  const sourceLock = await readOptional(flags['source-lock']);
  const sbom = await fs.readFile(flags.sbom);
  const artifact = flags.artifact.includes('@sha256:') ? { imageUri: flags.artifact } : { file: path.basename(flags.artifact), sha256: digest(await fs.readFile(flags.artifact)) };
  const evidence = {
    schemaVersion: 1,
    scope: flags.scope,
    recordedAt: new Date().toISOString(),
    manifestSha256: digest(manifest),
    sourceLockSha256: sourceLock ? digest(sourceLock) : null,
    reproducibleDependencyResolution: sourceLock !== null,
    sbom: { file: path.basename(flags.sbom), format: 'CycloneDX', sha256: digest(sbom) },
    artifact,
    ...(flags['source-sha256'] ? { sourceSha256: flags['source-sha256'] } : {}),
    ...(flags['base-image'] ? { baseImageUri: flags['base-image'] } : {}),
  };
  await fs.mkdir(path.dirname(flags.output), { recursive: true });
  await fs.writeFile(flags.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Dependency release evidence: ${flags.output}`);
} else {
  throw new Error('Expected dependency-evidence.mjs check or record.');
}
