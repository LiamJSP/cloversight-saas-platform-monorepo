import fs from 'node:fs/promises';
import path from 'node:path';
import { addToZip } from './release-archive.mjs';

const source = 'extensions/chrome-target-picker';
const files = ['manifest.json', 'popup.html', 'popup.js', 'picker.js', 'logo.svg', 'icon.svg',
  'icon16.png', 'icon32.png', 'icon48.png', 'icon128.png', 'README.md'];
await fs.mkdir('dist', { recursive: true });
const temp = await fs.mkdtemp('dist/.extension-');
try {
  const archive = path.resolve(temp, 'extension.zip');
  addToZip(archive, source, files);
  await fs.rename(archive, 'dist/cloversight-target-picker.zip');
  console.log('Created dist/cloversight-target-picker.zip');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
