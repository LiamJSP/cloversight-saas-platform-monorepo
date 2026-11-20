import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// The pinned local IaC environment also supplies PyYAML to regression fixtures.
if (fs.existsSync('.local/iac-venv/bin/python')) process.env.PATH = `${path.resolve('.local/iac-venv/bin')}:${process.env.PATH}`;

import { assertWorkstationNode } from './workstation-runtime.mjs';
import { assertDependencyLock, dependencyScopes } from './dependency-locks.mjs';
assertWorkstationNode();
for (const directory of dependencyScopes) assertDependencyLock(directory);

const sourceFiles = [];
function collectJavaScript(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) collectJavaScript(file);
    else if (/\.(mjs|js)$/.test(entry.name)) sourceFiles.push(file);
  }
}

for (const directory of ['src', 'scripts', 'tests', 'apps', 'extensions']) {
  if (fs.existsSync(directory)) collectJavaScript(directory);
}
sourceFiles.sort();

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const file of sourceFiles) run(process.execPath, ['--check', file]);

const serviceTests = fs.readdirSync('tests').filter((name) => name.endsWith('.test.mjs')).sort().map((name) => `tests/${name}`);
if (!serviceTests.length) throw new Error('No deterministic service tests were found.');
run(process.execPath, ['--test', '--test-reporter=spec', ...serviceTests]);
run(process.execPath, ['scripts/validate-iac.mjs']);
run(process.execPath, ['scripts/validate-cfn-schema.mjs']);
run(process.execPath, ['scripts/build.mjs']);
run(process.execPath, ['scripts/package-extension.mjs']);
console.log(`Verification passed: ${sourceFiles.length} JavaScript files parsed.`);
