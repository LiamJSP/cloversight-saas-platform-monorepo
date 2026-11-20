import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const validator = fs.readFileSync('scripts/validate-iac.mjs', 'utf8');
const fixtures = [
  ['primary', 'infra/cloudformation/webwatch.yaml', 'parser', 'parsed'],
  ['regional', 'infra/cloudformation/regional-capture.yaml', 'regionalParser', 'parsedRegional'],
];

function validate(parser, source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-sqs-'));
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

for (const [name, file, parserName, resultName] of fixtures) {
  const template = fs.readFileSync(file, 'utf8');
  const parser = validator.split(`const ${parserName} = String.raw\`\n`)[1]?.split(`\n\`;\nconst ${resultName} =`)[0];
  assert.ok(parser, `${name} parser must be available for regression fixtures`);
  const policyStart = template.indexOf('  QueueTransportPolicy:\n');
  assert.notEqual(policyStart, -1);
  const nextResource = template.slice(policyStart + 1).search(/\n  [A-Za-z][A-Za-z0-9]*:/);
  const policyEnd = nextResource < 0 ? template.length : policyStart + 1 + nextResource;
  const policy = template.slice(policyStart, policyEnd);

  function mutate(from, to) {
    assert.ok(policy.includes(from), `Fixture must modify the ${name} queue policy`);
    return template.slice(0, policyStart) + policy.replace(from, to) + template.slice(policyEnd);
  }

  test(`${name}: the shared SQS transport policy passes IaC validation`, () => {
    const result = validate(parser, template);
    assert.equal(result.status, 0, result.stderr);
  });

  test(`${name}: a multi-resource SQS statement is rejected`, () => {
    const result = validate(parser, mutate("Resource: '*'", 'Resource: [!GetAtt CaptureQueue.Arn, !GetAtt CaptureDeadLetterQueue.Arn]'));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /single Resource string/);
  });

  test(`${name}: no queue or DLQ can lose its transport policy`, () => {
    const result = validate(parser, mutate('!Ref CaptureQueue, !Ref CaptureDeadLetterQueue', '!Ref CaptureQueue'));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AssertionError/);
  });

  test(`${name}: the shared policy cannot become a grant or lose its HTTPS condition`, () => {
    for (const [from, to, message] of [
      ['Effect: Deny', 'Effect: Allow', /without granting access/],
      ["'aws:SecureTransport': 'false'", "'aws:SecureTransport': 'true'", /HTTPS requirement/],
      [", 'aws:PrincipalIsAWSService': 'false'", '', /AWS service exemption/],
    ]) {
      const result = validate(parser, mutate(from, to));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
    }
  });
}
