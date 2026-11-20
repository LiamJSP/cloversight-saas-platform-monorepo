import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { archiveInventory, checkedFiles, releaseSources } from '../scripts/release-archive.mjs';

function sandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-package-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('Git and extracted releases only include source from their respective inventories', t => {
  const root = sandbox(t);
  fs.writeFileSync(path.join(root, 'README.md'), 'project');
  fs.writeFileSync(path.join(root, '.env.example'), 'STAGE=staging');
  fs.writeFileSync(path.join(root, '.env'), 'private');
  fs.writeFileSync(path.join(root, 'scratch.json'), 'private notes');
  const expected = ['.env.example', 'README.md'];
  fs.writeFileSync(path.join(root, archiveInventory), JSON.stringify(expected));
  assert.deepEqual(releaseSources(root), expected);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '--', ...expected], { cwd: root });
  assert.deepEqual(releaseSources(root), expected);
  execFileSync('git', ['add', '--', '.env'], { cwd: root });
  assert.throws(() => releaseSources(root), /Private/);
});

test('release inventories reject unsafe paths and symlinks, including ancestor symlinks', t => {
  const root = sandbox(t);
  fs.mkdirSync(path.join(root, 'real'));
  fs.writeFileSync(path.join(root, 'real', 'file.js'), 'fixture');
  fs.symlinkSync('real', path.join(root, 'alias'));
  for (const name of ['../file', 'alias/file.js', 'real/.env.backup', 'real/.aws/credentials', 'real/private.key']) {
    assert.throws(() => checkedFiles(root, [name]));
  }
});

test('recognized credential values in an otherwise valid source filename stop packaging without printing the value', t => {
  const root = sandbox(t);
  const marker = 'sk_' + 'live_' + 'A'.repeat(28);
  fs.writeFileSync(path.join(root, 'notes.md'), marker);
  assert.throws(() => checkedFiles(root, ['notes.md']), err => err.message.includes('notes.md') && !err.message.includes(marker));
});

test('the installable browser extension excludes unlisted working files', t => {
  const root = sandbox(t);
  const source = fileURLToPath(new URL('../extensions/chrome-target-picker', import.meta.url));
  const ext = path.join(root, 'extensions/chrome-target-picker');
  fs.cpSync(source, ext, { recursive: true });
  fs.writeFileSync(path.join(ext, 'operator-notes.txt'), 'private notes');
  fs.writeFileSync(path.join(ext, '.env'), 'private');
  const pack = fileURLToPath(new URL('../scripts/package-extension.mjs', import.meta.url));
  execFileSync(process.execPath, [pack], { cwd: root });
  const entries = execFileSync('unzip', ['-Z1', 'dist/cloversight-target-picker.zip'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  assert.ok(entries.includes('manifest.json') && entries.includes('picker.js'));
  assert.ok(!entries.includes('operator-notes.txt') && !entries.includes('.env'));
});
