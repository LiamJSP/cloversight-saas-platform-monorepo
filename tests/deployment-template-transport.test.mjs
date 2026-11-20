import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const deployScriptPath = 'infra/scripts/deploy.sh';

test('large CloudFormation templates are transported through S3 instead of inline TemplateBody', () => {
  const script = fs.readFileSync(deployScriptPath, 'utf8');
  assert.match(script, /cloudformation validate-template --template-url/);
  assert.doesNotMatch(script, /cloudformation validate-template --template-body/);
  assert.match(script, /--s3-bucket\s+"\$WW_ARTIFACT_BUCKET"/);
  assert.match(script, /--s3-prefix\s+"\$\{ARTIFACT_PREFIX\}\/cloudformation"/);
});
