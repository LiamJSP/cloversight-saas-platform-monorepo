# AWS account bootstrap from root-only state

Do not use the root principal for deployment or daily administration.

1. Secure root with a hardware security key or equivalent MFA.
2. Remove root access keys if any exist.
3. Confirm alternate security, billing, and operations contacts.
4. Enable IAM Identity Center or create a tightly controlled deployment role through a one-time bootstrap.
5. Create separate human administrator and deployment permission sets.
6. Enable CloudTrail organization/account trails, account-level S3 Block Public Access, and billing alerts.
7. Restrict the deployment role to the named CLOVERSIGHT stacks and artifact bucket after the first successful bootstrap.
8. Use isolated production AWS accounts, with development/staging in separate accounts, rather than treating a stage label as an account boundary.

The bootstrap stack also owns the single shared regional SES receipt-rule set used by all CLOVERSIGHT environments. Re-run `npm run aws:bootstrap` when upgrading an older bootstrap stack so staging/beta/prod can add their own recipient rules without competing for SES rule-set activation.

`infra/scripts/deploy.sh` calls STS and refuses to run when the caller ARN is root.

Use [the deployment guide](deployment.md) for this project's current bootstrap and deployment commands. `npm run aws:bootstrap` now updates the bootstrap and merges generated keys into your existing private `.env` automatically. Direct callers of `bootstrap-aws-access.sh` still use `bash infra/scripts/merge-generated-env.sh .local/bootstrap-outputs.env`. Verify console steps and IAM policy choices against current AWS documentation before applying them.

## 0.5.13 execution-role restriction and remaining boundary

Update the existing bootstrap with its original `AWS_DEPLOYMENT_PRINCIPAL_ARN`, then merge generated outputs into the existing private `.env`. The CloudFormation execution role can now manage only the application runtime role namespaces `webwatch-staging-*`, `webwatch-beta-*` and `webwatch-prod-*`; it cannot use that IAM statement to edit the bootstrap's `webwatch-deployment` or `webwatch-cloudformation-execution` roles. Passing runtime roles is a separate allow statement restricted to `lambda.amazonaws.com`. The human deployment role still passes the exact execution role only to CloudFormation.

This is a narrow improvement, **not a complete deployment permissions boundary**. The execution role retains broad service permissions needed by the authored resources, and can still create powerful runtime policies within its permitted namespace. Permissions boundaries, exact regional/resource scoping, production-only principal separation and reviewed promotion/change-set enforcement need an approved deployment design and existing-account migration. Do not represent this change as removing compromise exposure or making the application audit tamper-proof.

The bootstrap grants deployment preflight `ce:ListCostAllocationTags` for the optional scoped budget and `sns:ListSubscriptionsByTopic` for production destination diagnostics; it does not grant cost-tag activation or financial policy mutation. The optional cost-tag API check is skipped when `SCOPED_BUDGET_ENABLED=false`. Regional ECR creation now tags shared image repositories, so the deployment role also needs `ecr:TagResource`. Application runtime tags are not an IAM authorization boundary.

Require MFA in the source Identity Center/IdP policy and review who can assume these roles. A trust condition based only on `aws:MultiFactorAuthPresent` is not a substitute for federated-session MFA policy and can reject legitimate Identity Center sessions; no such blanket condition was added. Keep recovery access and offboarding evidence with the account owner. See [AWS IAM MFA guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html).

An account/organization CloudTrail trail, protected long-term audit destination, accepted retention policy and Cost Anomaly Detection subscription are still owner/account controls. This update does not automatically create them or claim they are absent in the live account. The existing bounded audit collector is a diagnostic tool, not a persistent management trail.
