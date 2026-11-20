import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

function resourceBlock(source, name) {
  const start = source.search(new RegExp(`^  ${name}:\\s*$`, 'm'));
  assert.notEqual(start, -1, `missing ${name}`);
  const rest = source.slice(start + 1);
  const next = rest.search(/^  [A-Za-z0-9][A-Za-z0-9]*:\s*$/m);
  return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
}

test('deployment role can inspect the CloudFront ACM certificate during preflight', async () => {
  const source = await fs.readFile('infra/bootstrap/access.yaml', 'utf8');
  const deploymentRole = source.split('  DeploymentRole:', 2)[1] ?? '';
  assert.match(deploymentRole, /Sid: InspectDeploymentCertificate[\s\S]*?Action:\s*acm:DescribeCertificate[\s\S]*?Resource:\s*!Sub 'arn:\$\{AWS::Partition\}:acm:us-east-1:\$\{AWS::AccountId\}:certificate\/\*'/);
  assert.match(deploymentRole, /cloudfront:ListDistributions/);
  assert.match(deploymentRole, /Sid: InspectDynamoIndexDeployment[\s\S]*?Action:\s*dynamodb:DescribeTable/);
});

test('capture roles can distinguish missing cached S3 objects from access denial', async () => {
  const [primary, regional] = await Promise.all([
    fs.readFile('infra/cloudformation/webwatch.yaml', 'utf8'),
    fs.readFile('infra/cloudformation/regional-capture.yaml', 'utf8'),
  ]);
  assert.match(resourceBlock(primary, 'CaptureRole'), /Action: s3:ListBucket\s*\n\s*Resource: !GetAtt SnapshotBucket\.Arn/);
  assert.match(resourceBlock(regional, 'RegionalCaptureRole'), /Action: s3:ListBucket\s*\n\s*Resource: !GetAtt CaptureBucket\.Arn/);
});

test('existing DynamoDB tables add new GSIs in separate stack operations', async () => {
  const [source, packageJson] = await Promise.all([
    fs.readFile('infra/scripts/deploy.sh', 'utf8'),
    fs.readFile('package.json', 'utf8').then(JSON.parse),
  ]);
  assert.match(source, /dynamodb describe-table/);
  assert.match(source, /deploy_stack_phase true false 'add LookupIndex to the existing table'/);
  assert.ok(source.includes(`deploy_stack_phase true true 'deploy the complete ${packageJson.version} stack'`));
});

test('Cognito software-token MFA is omitted when MFA configuration is OFF', async () => {
  const source = await fs.readFile('infra/cloudformation/webwatch.yaml', 'utf8');
  assert.match(source, /CustomerMfaEnabled:\s*!Not \[!Equals \[!Ref CustomerMfa, 'OFF'\]\]/);
  assert.match(source, /StewardMfaEnabled:\s*!Not \[!Equals \[!Ref StewardMfa, 'OFF'\]\]/);

  const customer = resourceBlock(source, 'CustomerUserPool');
  assert.match(customer, /MfaConfiguration:\s*!Ref CustomerMfa/);
  assert.match(customer, /EnabledMfas:\s*!If\s*\n\s*- CustomerMfaEnabled\s*\n\s*- \[SOFTWARE_TOKEN_MFA\]\s*\n\s*- !Ref 'AWS::NoValue'/);

  const steward = resourceBlock(source, 'StewardUserPool');
  assert.match(steward, /MfaConfiguration:\s*!Ref StewardMfa/);
  assert.match(steward, /EnabledMfas:\s*!If\s*\n\s*- StewardMfaEnabled\s*\n\s*- \[SOFTWARE_TOKEN_MFA\]\s*\n\s*- !Ref 'AWS::NoValue'/);

  assert.doesNotMatch(source, /^\s+EnabledMfas:\s*\[SOFTWARE_TOKEN_MFA\]\s*$/m);
});

test('API stage waits for its route-specific throttle target', async () => {
  const source = await fs.readFile('infra/cloudformation/webwatch.yaml', 'utf8');
  const stage = resourceBlock(source, 'ApiStage');
  assert.match(stage, /DependsOn:\s*TeamProxyRoute/);
  assert.match(stage, /'ANY \/api\/team\/\{proxy\+\}':\s*\{ ThrottlingBurstLimit: 5/);
});
