import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts', 'tests', 'apps', 'extensions'];
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) walk(file);
    else if (/\.(mjs|js)$/.test(entry.name)) files.push(file);
  }
}
for (const root of roots) if (fs.existsSync(root)) walk(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax verification passed for ${files.length} JavaScript files.`);
