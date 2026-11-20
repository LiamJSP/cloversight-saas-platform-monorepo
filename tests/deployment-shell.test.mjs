import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function run(mode, failures, reason = 'Rate exceeded', noOp = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-deploy-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    for (const name of ['deployment-control.mjs', 'aws-cli.mjs']) fs.copyFileSync(`scripts/${name}`, path.join(root, 'scripts', name));
    fs.writeFileSync(path.join(root, 'aws'), `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args)+'\\n');
const op = args[args.indexOf('cloudformation')+1];
if (op === 'deploy') {
  const calls = fs.readFileSync(process.env.CALLS,'utf8').trim().split('\\n').map(JSON.parse);
  process.exit(calls.filter(x=>x.includes('deploy')).length <= Number(process.env.FAILURES) ? 42 : 0);
}
if (op === 'describe-stacks') {
  const count = fs.readFileSync(process.env.CALLS,'utf8').trim().split('\\n').map(JSON.parse).filter(x=>x.includes('deploy')).length;
  const done = count > Number(process.env.FAILURES) && process.env.NO_OP !== 'true';
  console.log(JSON.stringify({Stacks:[{StackId:'arn:current',StackStatus:done?'CREATE_COMPLETE':'CREATE_FAILED',DisableRollback:true}]}));
}
else if (op === 'describe-stack-events') console.log(JSON.stringify({StackEvents:[{Timestamp:new Date().toISOString(),ResourceType:'AWS::CloudFront::Function',LogicalResourceId:'StewardSpaRewriteFunction',ResourceStatus:'CREATE_FAILED',ResourceStatusReason:process.env.REASON}]}));
else throw new Error('Unexpected AWS call '+op);
`, { mode: 0o755 });
    fs.writeFileSync(path.join(root, 'sleep'), '#!/usr/bin/env bash\nprintf "%s\\n" "$1" >> "$DELAYS"\n', { mode: 0o755 });
    const callsFile = path.join(root, 'calls');
    const delaysFile = path.join(root, 'delays');
    const result = spawnSync('bash', ['-c', 'set -euo pipefail; source "$DEPLOY_LIB"; deploy_cloudformation_checked webwatch-prod us-east-1 "$MODE" --template-file template.yaml'], {
      encoding: 'utf8', env: { ...process.env, ROOT: root, PATH: `${root}:${process.env.PATH}`, DEPLOY_LIB: path.resolve('infra/scripts/lib.sh'), MODE: mode, CALLS: callsFile, DELAYS: delaysFile, FAILURES: String(failures), REASON: reason, NO_OP: String(noOp) },
    });
    const calls = fs.readFileSync(callsFile, 'utf8').trim().split('\n').map(JSON.parse);
    const delays = fs.existsSync(delaysFile) ? fs.readFileSync(delaysFile, 'utf8').trim().split('\n').map(Number) : [];
    const diagnostic = path.join(root, '.local/deployment-failure-webwatch-prod-us-east-1.json');
    return { ...result, calls, delays, diagnostic: fs.existsSync(diagnostic) ? JSON.parse(fs.readFileSync(diagnostic)) : null };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('preserved throttled creates retry with backoff and retain diagnostic stack identity', () => {
  const result = run('preserve', 2);
  assert.equal(result.status, 0, result.stderr);
  const attempts = result.calls.filter(call => call.includes('deploy'));
  assert.equal(attempts.length, 3);
  assert.ok(attempts.every(call => call.includes('--disable-rollback')));
  assert.ok(result.delays[0] >= 30 && result.delays[0] <= 45);
  assert.ok(result.delays[1] >= 60 && result.delays[1] <= 75);
  assert.equal(result.diagnostic.stack, 'arn:current');
});

test('throttling retries stop after three attempts and preserve the AWS CLI failure exit', () => {
  const result = run('preserve', 10);
  assert.equal(result.status, 42);
  assert.equal(result.calls.filter(call => call.includes('deploy')).length, 3);
  assert.equal(result.delays.length, 2);
});

test('permission failures and completed-stack updates never trigger the creation retry loop', () => {
  for (const [mode, reason] of [['preserve', 'AccessDenied'], ['rollback', 'Rate exceeded']]) {
    const result = run(mode, 10, reason);
    assert.equal(result.status, 42);
    const attempts = result.calls.filter(call => call.includes('deploy'));
    assert.equal(attempts.length, 1);
    assert.equal(result.delays.length, 0);
    assert.ok(attempts[0].includes(mode === 'rollback' ? '--no-disable-rollback' : '--disable-rollback'));
  }
});

test('a zero CLI exit for an empty change set cannot report a still-failed stack as deployed', () => {
  const result = run('preserve', 0, 'Invalid configuration', true);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /without a completed stack/);
  assert.equal(result.calls.filter(call => call.includes('deploy')).length, 1);
});
