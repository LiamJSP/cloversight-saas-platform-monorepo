import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const template = fs.readFileSync('infra/cloudformation/webwatch.yaml', 'utf8');
// Run the actual IaC parser against altered templates without changing the repo.
const validator = fs.readFileSync('scripts/validate-iac.mjs', 'utf8');
const parser = validator.split('const parser = String.raw`\n')[1]?.split('\n`;\nconst parsed =')[0];
assert.ok(parser, 'The primary IaC parser must be available for regression fixtures.');
const dimensions = 'width="516" height="144" viewBox="0 -36 516 144"';

function validate(source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-branding-'));
  try {
    const file = path.join(directory, 'template.yaml');
    fs.writeFileSync(file, source);
    const result = spawnSync('python3', ['-c', parser, file], { encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('all embedded Cognito assets pass the actual IaC validator', () => {
  const result = validate(template);
  assert.equal(result.status, 0, result.stderr);
});

test('the rejected 516x72 ratio is caught on every login logo, including conditional custom-domain assets', () => {
  const positions = [...template.matchAll(/width="516" height="144" viewBox="0 -36 516 144"/g)];
  assert.equal(positions.length, 6);
  for (const match of positions) {
    const source = template.slice(0, match.index) + 'width="516" height="72" viewBox="0 0 516 72"' + template.slice(match.index + dimensions.length);
    const result = validate(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /logo width:height ratio must be between 1:1 and 4:1/);
  }
});

test('Cognito logo ratio limits are inclusive', () => {
  for (const height of [516, 129]) {
    const result = validate(template.replace(dimensions, `width="516" height="${height}" viewBox="0 0 516 ${height}"`));
    assert.equal(result.status, 0, result.stderr);
  }
});

test('invalid dimensions, out-of-range ratios, and inconsistent viewBoxes are rejected', () => {
  for (const [replacement, message] of [
    ['width="516" height="600" viewBox="0 0 516 600"', /logo width:height ratio/],
    ['width="516" height="128" viewBox="0 0 516 128"', /logo width:height ratio/],
    ['width="516" height="0" viewBox="0 0 516 144"', /finite positive SVG dimensions/],
    ['width="NaN" height="144" viewBox="0 0 516 144"', /finite positive SVG dimensions/],
    ['width="Infinity" height="144" viewBox="0 0 516 144"', /finite positive SVG dimensions/],
    ['width="-516" height="144" viewBox="0 0 516 144"', /finite positive SVG dimensions/],
    ['height="144" viewBox="0 0 516 144"', /missing or invalid SVG dimensions/],
    ['width="516" height="144" viewBox="0 0 516 72"', /aspect ratios must match/],
    ['width="516" height="144" viewBox="0 0 516 0"', /invalid viewBox dimensions/],
    ['width="516" height="144" viewBox="NaN 0 516 144"', /invalid viewBox dimensions/],
  ]) {
    const result = validate(template.replace(dimensions, replacement));
    assert.notEqual(result.status, 0, replacement);
    assert.match(result.stderr, message);
  }
});

test('browser-only attributes are rejected on every embedded SVG', () => {
  const positions = [...template.matchAll(/<svg\b/g)];
  assert.equal(positions.length, 12);
  for (const match of positions) {
    for (const attribute of ['role="img"', 'focusable="false"']) {
      const index = match.index + 4;
      const result = validate(template.slice(0, index) + ` ${attribute}` + template.slice(index));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /unsupported SVG attribute/);
    }
  }
});

test('external references and scripts remain outside the accepted logo subset', () => {
  for (const [source, message] of [
    [template.replace('<path ', '<path href="https://example.com/logo.svg" '), /unsupported SVG attribute/],
    [template.replace('</svg>', '<script>alert(1)</script></svg>'), /unsupported SVG element/],
  ]) {
    const result = validate(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  }
});
