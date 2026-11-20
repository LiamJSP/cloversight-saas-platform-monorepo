import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const validator = fs.readFileSync('scripts/validate-iac.mjs', 'utf8');
const parser = validator.split('const parser = String.raw`\n')[1]?.split('\n`;\nconst parsed =')[0];
assert.ok(parser);
const template = fs.readFileSync('infra/cloudformation/webwatch.yaml', 'utf8');
function validate(source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-cloudfront-'));
  try {
    const file = path.join(directory, 'template.yaml'); fs.writeFileSync(file, source);
    return spawnSync('python3', ['-c', parser, file], { encoding: 'utf8' });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
test('IaC validation rejects parallel CloudFront function creation regressions', () => {
  const current = validate(template); assert.equal(current.status, 0, current.stderr);
  const parallel = validate(template.replace('    DependsOn: CustomerLegacyRedirectFunction\n', ''));
  assert.notEqual(parallel.status, 0); assert.match(parallel.stderr, /serialize CloudFront function/);
});
test('IaC validation rejects oversized CloudFront function code before upload', () => {
  const oversized = validate(template.replace('      FunctionCode: |\n', `      FunctionCode: |\n        // ${'x'.repeat(10241)}\n`));
  assert.notEqual(oversized.status, 0); assert.match(oversized.stderr, /function size limit/);
});
