import fs from 'node:fs/promises';
import path from 'node:path';

await fs.rm('dist', { recursive: true, force: true });
await fs.mkdir('dist', { recursive: true });
for (const source of ['apps', 'extensions/chrome-target-picker', 'infra', 'docs', 'src']) {
  const target = path.join('dist', source);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
}
for (const file of ['README.md', 'RELEASE_NOTES.md', '.env.example', 'package.json', 'package-lock.json']) {
  await fs.copyFile(file, path.join('dist', path.basename(file)));
}
console.log('Built static assets and deployment source into dist/.');
