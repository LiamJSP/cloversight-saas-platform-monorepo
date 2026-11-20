import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const local = '.local/iac-venv/bin/cfn-lint';
const executable = process.env.CFN_LINT || (fs.existsSync(local) ? local : 'cfn-lint');
const templates = ['infra/bootstrap/access.yaml', 'infra/github/oidc-provider.yaml', 'infra/github/production-access.yaml', 'infra/cloudformation/webwatch.yaml', 'infra/cloudformation/regional-capture.yaml'];
const result = spawnSync(executable, ['-t', ...templates, '-r', 'us-east-1', 'us-east-2', 'us-west-2', 'ca-central-1', 'eu-west-1', '-f', 'json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (result.error) throw new Error('Install the pinned IaC tools first: python3 -m venv .local/iac-venv && .local/iac-venv/bin/python -m pip install -r infra/requirements-iac.txt');
let findings;
try { findings = JSON.parse(result.stdout); }
catch { throw new Error(`cfn-lint did not return JSON: ${result.stderr || result.stdout}`); }
const expected = (finding) => {
  const p = JSON.stringify(finding.Location?.Path ?? []);
  // BaseDomain is retained for deployed-stack parameter compatibility. An empty
  // optional custom certificate is valid only while its resource is disabled;
  // deployment settings and the AWS certificate preflight validate custom mode.
  return (finding.Rule?.Id === 'W2001' && p === '["Parameters","BaseDomain"]') ||
    (finding.Rule?.Id === 'W1030' && (p.startsWith('["Parameters","CustomerCognitoCertificateArn"') || p.startsWith('["Resources","CustomerUserPoolCustomDomain","Properties","CustomDomainConfig","CertificateArn"')));
};
const failures = findings.filter((finding) => !expected(finding));
for (const finding of failures) console.error(`${finding.Level} ${finding.Rule?.Id} ${finding.Filename}:${finding.Location?.Start?.LineNumber}: ${finding.Message}`);
if (failures.length || (result.status !== 0 && !findings.length)) throw new Error('CloudFormation schema validation failed.');
console.log(`CloudFormation schemas checked for all ${templates.length} templates in five Regions (${findings.length} documented compatibility warnings).`);
