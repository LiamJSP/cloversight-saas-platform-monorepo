// Run from the release root with the workstation's SSO profile and GitHub CLI login.
import { execFileSync } from 'node:child_process';
import { awsJson } from './aws-cli.mjs';
import { account, region, productionContext } from './github-production.mjs';

const repository = process.argv[2] || '';
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || process.argv.length !== 3) {
  throw new Error('Usage: AWS_PROFILE=saas-admin node scripts/setup-github-production.mjs OWNER/REPO');
}
const identity = awsJson(['sts', 'get-caller-identity'], { region });
if (identity.Account !== account || identity.Arn.endsWith(':root')) throw new Error('Expected a federated administrator in the production account.');
const repo = JSON.parse(execFileSync('gh', ['api', '--hostname', 'github.com', `repos/${repository}`], { encoding: 'utf8' }));
if (repo.default_branch !== 'main') throw new Error('This release workflow targets the main branch. Match the workflow and trust policy to your protected branch first.');
const { env, stacks, outputs, regions } = productionContext();
const sites = ['Public', 'Customer', 'Steward'];
const bucketArns = sites.map(site => {
  const bucket = outputs[site + 'Bucket'];
  if (!/^[a-z0-9][a-z0-9.-]+$/.test(bucket || '')) throw new Error(`Missing ${site} bucket.`);
  return 'arn:aws:s3:::' + bucket;
});
const cfDistributions = sites.map(site => {
  const id = outputs[site + 'DistributionId'];
  if (!/^[A-Z0-9]+$/.test(id || '')) throw new Error(`Missing ${site} distribution ID.`);
  return `arn:aws:cloudfront::${account}:distribution/${id}`;
});
const params = {
  Repository: repo.full_name, RepositoryId: repo.id, OwnerId: repo.owner.id,
  ImmutableSubject: `repo:${repo.owner.login}@${repo.owner.id}/${repo.name}@${repo.id}:environment:production`,
  StackArns: stacks.map(s => s.StackId),
  WorkerRepositoryArns: regions.map(r => `arn:aws:ecr:${r}:${account}:repository/${env.WORKER_ECR_REPOSITORY}`),
  SiteBucketArns: bucketArns, SiteObjectArns: bucketArns.map(arn => arn + '/*'), DistributionArns: cfDistributions,
  ArtifactBucket: env.ARTIFACT_BUCKET, CertificateArns: [...new Set([env.CLOUDFRONT_CERTIFICATE_ARN, env.COGNITO_CUSTOMER_CERTIFICATE_ARN].filter(Boolean))],
  ZoneId: env.ROUTE53_HOSTED_ZONE_ID, ExecutionRoleArn: env.AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN,
};
function deploy(name, template, args = []) {
  execFileSync('aws', ['--region', region, '--no-cli-pager', 'cloudformation', 'deploy', '--stack-name', name,
    '--template-file', 'infra/github/' + template, '--no-fail-on-empty-changeset', ...args], { stdio: 'inherit' });
}
const provider = `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`;
const providers = awsJson(['iam', 'list-open-id-connect-providers'], { region }).OpenIDConnectProviderList;
if (!providers.some(p => p.Arn === provider)) deploy('cloversight-github-issuer', 'oidc-provider.yaml', ['--capabilities', 'CAPABILITY_IAM']);
const issuer = awsJson(['iam', 'get-open-id-connect-provider', '--open-id-connect-provider-arn', provider], { region });
if (!issuer.ClientIDList.includes('sts.amazonaws.com')) {
  throw new Error('The existing GitHub OIDC provider must include audience sts.amazonaws.com. Add the audience, then retry.');
}
console.log(`Binding ${repo.full_name} (ID ${repo.id}) on main to ${stacks.length} installed production stacks.`);
deploy('cloversight-github-release-access', 'production-access.yaml', ['--capabilities', 'CAPABILITY_NAMED_IAM',
  '--parameter-overrides', ...Object.entries(params).map(([k, v]) => k + '=' + v)]);
