import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

await fs.rm('dist', { recursive: true, force: true });
await fs.mkdir('dist', { recursive: true });
for (const source of ['apps', 'extensions/chrome-target-picker', 'infra', 'docs', 'src']) {
  const target = path.join('dist', source);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true, filter: file => file !== 'apps/public' && !file.split(path.sep).includes('node_modules') });
}
for (const file of ['README.md', 'RELEASE_NOTES.md', '.env.example', 'package.json', 'package-lock.json']) {
  await fs.copyFile(file, path.join('dist', path.basename(file)));
}
execFileSync('npm', ['run', 'build:public'], { stdio: 'inherit' });
console.log('Built static assets and deployment source into dist/.');
