# Deploy or recover with 0.5.20

This complete release supersedes the 0.5.19 overlay fixes. It includes them plus the [AWS deployment review and corrections](aws-deployment-review-0.5.20.md). Use a new extraction directory. Keep the existing private environment, stage/stack names, shared bootstrap resources, provider IDs and data. Do not apply the older hotfix ZIP over this release.

## 1. Prepare the release on openSUSE

From `~/Downloads`, assuming the ZIP has its original filename:

```bash
mkdir cloversight-saas-release-0.5.20
unzip cloversight-saas-release-0.5.20.zip -d cloversight-saas-release-0.5.20
cd cloversight-saas-release-0.5.20
install -m 600 ../cloversight-saas-release-0.5.19/.env .env
npm ci
python3 -m venv .local/iac-venv
.local/iac-venv/bin/python -m pip install -r infra/requirements-iac.txt
npm run verify
```

Use the existing supported Node 22/24, AWS CLI v2, Docker/Buildx and Python setup. Install the distro's Python venv/ensurepip package if `python3 -m venv` is unavailable; do not use `sudo pip` or bypass system-Python protections. Scripts discover the project-local IaC environment automatically. Do not copy old `.local/worker-image.env`; this release needs its own build evidence. Copy a customized staging allowlist separately if you will also update staging.

Check `npm run deploy:settings` and private `.env`: account `807434077491`, `us-east-1`, `STAGE=prod`, `STACK_NAME=webwatch-prod`, `BASE_DOMAIN=cloversight.app`, the intended hosted zone and certificate, and the existing role/bucket/repository IDs. Do not print or share the whole private environment. No Stripe Price recreation or plan migration is required.

## 2. Refresh existing access and inspect the current failure

```bash
aws sso login --profile saas-admin
AWS_PROFILE=saas-admin npm run aws:bootstrap
AWS_PROFILE=saas-admin node scripts/deployment-control.mjs diagnose webwatch-prod us-east-1
aws cloudformation list-stack-resources \
  --profile saas-admin --region us-east-1 --stack-name webwatch-prod \
  --query "StackResourceSummaries[?ResourceStatus!='DELETE_COMPLETE'].[LogicalResourceId,ResourceType,PhysicalResourceId,ResourceStatus]" \
  --output table --no-cli-pager
```

Bootstrap updates the existing deployment policy and merges its five outputs. Your working Identity Center `sts:AssumeRole` permission need not be granted again. The updated policy adds read access for the new preflight checks.

The most recent supplied failure belongs to:

```text
arn:aws:cloudformation:us-east-1:807434077491:stack/webwatch-prod/1d161530-e27a-11f1-8516-0effd807e39b
```

Use the ARN actually returned by diagnostics. Earlier ARNs ending `7d7df840...`, `15b28650...` or `f7d58d00...` identify different stack creations and must not be reused for this incident.

| Current state | Action |
| --- | --- |
| An operation is still in progress | Wait for it to settle and inspect again. Do not start another deployment. |
| `CREATE_FAILED`, or `UPDATE_FAILED` with `DisableRollback=true` | 0.5.20 can resume a preserved installation; proceed after correcting its reported causes. |
| `ROLLBACK_FAILED` / `ROLLBACK_COMPLETE` / `DELETE_FAILED` from the unsuccessful initial creation | Complete the scoped cleanup below before recreating. Preservation cannot be applied retroactively. |
| `CREATE_COMPLETE` / `UPDATE_COMPLETE` / `UPDATE_ROLLBACK_COMPLETE` | Keep the stack and update it. Do not perform initial-creation cleanup. |
| An unexpected state or existing customer data | Inspect the exact resources and recovery requirements before changing them. Do not use destructive initial-install cleanup. |

### Cleanup only when this is still the unsuccessful initial production creation

This deletes that failed stack's resources. It is not an upgrade procedure for a working installation.

If the stack is already `ROLLBACK_COMPLETE`, skip pool deprotection and bucket emptying and proceed to stack deletion in step 4. Those manual steps apply only to identified deletion blockers.

1. Use the current inventory to identify the two actual Cognito pool IDs. Confirm both Users lists are empty. In the Cognito console in `us-east-1`, deactivate deletion protection for only those empty failed-installation pools. Leave CloudFormation to delete them. A minimal `update-user-pool` call can reset omitted configuration, so use the console for this targeted change.
2. If `InboundMailBucket` is present and blocks deletion, inspect its actual bucket. Save anything needed, then use S3 **Empty** on only that bucket, including versions/delete markers. Stop this failed stack's receipt rule first if it is still writing; preserve other shared receipt rules. Do not empty the artifact bucket, snapshots or staging buckets. Do not assume mail is disposable.
3. Other surviving resources, such as pre-token Lambdas and their role, can be dependents of the protected pools. Review the inventory; let CloudFormation delete its resources in dependency order.
4. After checking that the current ARN still matches the incident above and cleanup is appropriate, run the following. If diagnostics reports a different ARN, substitute that **verified** current ARN in both commands instead.

```bash
aws cloudformation delete-stack \
  --profile saas-admin --region us-east-1 \
  --stack-name 'arn:aws:cloudformation:us-east-1:807434077491:stack/webwatch-prod/1d161530-e27a-11f1-8516-0effd807e39b' \
  --no-cli-pager &&
aws cloudformation wait stack-delete-complete \
  --profile saas-admin --region us-east-1 \
  --stack-name 'arn:aws:cloudformation:us-east-1:807434077491:stack/webwatch-prod/1d161530-e27a-11f1-8516-0effd807e39b' \
  --no-cli-pager
```

**Retention correction:** `RetainExceptOnCreate` deletes resources during the original creation rollback, but retains them during a later explicit stack deletion. A successful delete can therefore leave protected pools or other retained resources behind. After deleting the stack, inspect its inventory and separately remove only confirmed unused retained resources; stack deletion is not proof that every physical resource disappeared.

Verify by name that `webwatch-prod` is now absent. Only the specific CloudFormation "Stack with id ... does not exist" response proves absence; an access/network error does not. If deletion fails, inspect the new events and remaining resources; do not force deletion or repeatedly run deploy against a blocked stack. The new template still enables production Cognito deletion protection.

## 3. Build once and deploy the primary stack

```bash
AWS_PROFILE=saas-admin CLOVERSIGHT_FRESH_WORKER_IMAGE=1 npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run deploy:validate
AWS_PROFILE=saas-admin npm run aws:deploy
```

The fresh-build flag avoids collision with an immutable tag copied from the old environment. Version/source-contract checks require the new build; do not reuse or edit old evidence. A later retry of the unchanged 0.5.20 deployment can reuse this build.

The script checks stack state before packaging/uploads; validates AWS schemas, names, DNS, SES, ACM, Cognito, CloudFront capacity and Lambda reservations; then deploys. New stacks preserve successful resources. Recognized throttling can trigger up to three total deployment attempts with backoff. Other failures stop with current events and a `.local/deployment-failure-webwatch-prod-us-east-1.json` report. A preserved failure normally calls for a fix and re-run, not deletion. The script verifies completion before declaring success.

For an already completed production installation, retain the maintenance, queue-drain, cancellation and rollback precautions in [the 0.5.19 upgrade guide](upgrade-0.5.19.md). Do not run old and new billing writers concurrently. Existing-stack updates retain normal CloudFormation rollback.

## 4. Complete deployment and acceptance

After primary completion:

```bash
AWS_PROFILE=saas-admin npm run aws:deploy-regional
AWS_PROFILE=saas-admin npm run aws:push-secrets
AWS_PROFILE=saas-admin npm run aws:deploy-web
AWS_PROFILE=saas-admin npm run aws:activate-ses
AWS_PROFILE=saas-admin npm run aws:audit -- --full
```

For an existing installation, push secrets only from your preserved, verified configuration; do not regenerate keys or overwrite provider bindings. SES activation must preserve any other application using the account's active rule set. Refresh SSO and inspect status if credentials expire; role chaining has a one-hour limit.

Before customer admission, confirm primary and regional SNS subscriptions; SES identity, DKIM and production access; working support/privacy/security receiving addresses at `cloversight.app`; steward owner enrollment/MFA; all regional capture results; webhook delivery; and the browser, billing and cancellation acceptance cases in the prior upgrade guide. Public HTML now points at `cloversight.app`, but this release does not provision human email mailboxes. `STAGE=prod` defaults to live Stripe credentials. The deployment-tools hotfix adds explicit `STRIPE_MODE=test` for a sandbox trial on the production domain; follow [the test/live cutover guide](stripe-production-test-0.5.20.md).

Keep staging and shared bootstrap/ECR/artifact resources until production has passed acceptance. This release does not automatically retire staging or launch customer traffic. No AWS operations were executed on your account during this review.
