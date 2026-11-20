import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { awsJson } from './aws-cli.mjs';

const key = 'webwatch/prod/ci/release-state.json';
const shaPattern = /^[0-9a-f]{40}$/;

export function installationFingerprint(stacks) {
  const state = stacks.map(stack => [
    stack.StackId, stack.LastUpdatedTime || stack.CreationTime,
    [...stack.Parameters].map(p => [p.ParameterKey, p.ParameterValue]).sort(([a], [b]) => a.localeCompare(b)),
  ]).sort(([a], [b]) => a.localeCompare(b));
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

export function docsOnly(marker, { sha, repositoryId, fingerprint, cwd, event }) {
  if (event !== 'push' || !shaPattern.test(sha) || !shaPattern.test(marker?.sha) ||
      marker?.state !== 'succeeded' || !repositoryId || marker.repositoryId !== repositoryId ||
      marker.fingerprint !== fingerprint) return false;
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', marker.sha, sha], { cwd, stdio: 'ignore' });
  if (ancestor.status !== 0) return false;
  // NUL-delimited, disable rename detection so BOTH sides of renames must be docs.
  const diff = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', marker.sha, sha, '--'], { cwd, encoding: 'utf8' });
  return diff.split('\0').filter(Boolean).every(name =>
    /^(README|RELEASE_NOTES)\.md$/.test(name) || /^docs\/(?:[^/]+\/)*[^/]+\.md$/.test(name));
}

function temporary(operation) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-release-'));
  try { return operation(path.join(dir, 'state.json')); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export function readMarker(bucket) {
  const list = awsJson(['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', key, '--max-keys', '1', '--no-paginate']);
  if (!list.Contents?.some(item => item.Key === key && item.Size > 0 && item.Size <= 4096)) return null;
  return temporary(file => {
    awsJson(['s3api', 'get-object', '--bucket', bucket, '--key', key, file]);
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e instanceof SyntaxError) return null; throw e; }
  });
}

export function writeMarker(bucket, marker) {
  temporary(file => {
    fs.writeFileSync(file, JSON.stringify(marker), { mode: 0o600 });
    awsJson(['s3api', 'put-object', '--bucket', bucket, '--key', key, '--body', file, '--content-type', 'application/json']);
  });
}
