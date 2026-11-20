import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { docsOnly, installationFingerprint } from '../scripts/release-state.mjs';
import { workerBase } from '../scripts/worker-base.mjs';

test('automatic releases compare both sides of changes to the last installed success', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-history-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();
  git('init', '--quiet');
  const commit = (name, value) => {
    const file = path.join(cwd, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
    git('add', '-A'); git('commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  const first = commit('app.js', 'original');
  const marker = { state: 'succeeded', sha: first, repositoryId: '123', fingerprint: 'installed' };
  const current = { cwd, event: 'push', sha: commit('docs/ops/alerts.md', 'page'), repositoryId: '123', fingerprint: 'installed' };
  assert.ok(docsOnly(marker, current));
  for (const stale of [null, { ...marker, state: 'deploying' }, { ...marker, state: 'operator-deployment' }, { ...marker, fingerprint: 'replaced' }, { ...marker, repositoryId: 'other' }, { ...marker, sha: 'a'.repeat(40) }]) assert.equal(docsOnly(stale, current), false);
  assert.equal(docsOnly(marker, { ...current, event: 'workflow_dispatch' }), false);
  commit('apps/public/src/content/pricing.md', 'pricing');
  assert.equal(docsOnly(marker, { ...current, sha: commit('README.md', 'more docs') }), false);
  git('checkout', '--quiet', '--detach', first);
  fs.renameSync(path.join(cwd, 'app.js'), path.join(cwd, 'README.md'));
  git('add', '-A'); git('commit', '-qm', 'rename code to docs');
  assert.equal(docsOnly(marker, { ...current, sha: git('rev-parse', 'HEAD') }), false);
  assert.equal(docsOnly({ ...marker, sha: current.sha }, { ...current, sha: git('rev-parse', 'HEAD') }), false);
});

test('installation changes invalidate the baseline and worker base pins cannot float', () => {
  const stack = { StackId: 'one', CreationTime: 'one', Parameters: [{ ParameterKey: 'code', ParameterValue: 'one' }] };
  assert.notEqual(installationFingerprint([stack]), installationFingerprint([{ ...stack, LastUpdatedTime: 'two' }]));
  assert.notEqual(installationFingerprint([stack]), installationFingerprint([{ ...stack, Parameters: [] }]));
  assert.match(workerBase(), /^public\.ecr\.aws\/lambda\/nodejs:22@sha256:[a-f0-9]{64}$/);
  assert.throws(() => workerBase('FROM public.ecr.aws/lambda/nodejs:22'));
  assert.throws(() => workerBase('FROM public.ecr.aws/lambda/nodejs:22@sha256:' + 'a'.repeat(64) + '\nFROM elsewhere'));
});
