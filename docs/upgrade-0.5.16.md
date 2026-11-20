# Upgrade an existing AWS deployment to 0.5.16

This is an in-place CloudFormation source upgrade. It does not rename deployed `webwatch-*` resources, change tenant IDs, replace Cognito pools/tables/buckets, change Stripe prices, rotate secrets, erase evidence or add a GSI. The pre-existing one-GSI-at-a-time upgrade sequence remains available for older tables. Never create a new stack or bootstrap role merely to work around an update failure.

Read [the assessment](security-production-review-0.5.16.md), especially the remaining renderer, sustained-volume and pricing limits. The ZIP has been checked locally; **your live account has not been changed or certified**.

## 1. Preserve your current configuration and rollback artifacts

Use a separate checkout/extraction directory. Keep the previous source, immutable browser digest, runtime ZIP/key, deployed primary/regional templates and parameter values. Copy your protected `.env` and staging IP allowlist into the new checkout; do not replace them with `.env.example`. Keep `STAGE`, `STACK_NAME`, `BOOTSTRAP_STACK_NAME`, account ID, domains, Cognito prefixes, existing owner subject and role ARNs unchanged.

Run from the new repository root on your openSUSE workstation. Use your existing Node 22 or Node 24 installation, npm 10+, AWS CLI v2, Docker/Buildx, zip/unzip and Python/PyYAML. Use an isolated Python virtual environment if Tumbleweed's Python environment requires it. A Docker-compatible command alone is not proof that an alternative runtime passes the image gate.

```bash
chmod 600 .env
aws sso login --profile saas-admin
aws sts get-caller-identity --profile saas-admin --no-cli-pager
npm ci
npm run deps:check
npm run verify
npm run test:browser:docker
```

Set `AWS_PROFILE=saas-admin` in the existing `.env`; the deployment scripts use that source profile and then assume the dedicated deployment role. Retain `AWS_REGION=us-east-1` for the primary stack. Do not regenerate the checked-in locks during an ordinary deployment. The container/Node 22 browser gate is mandatory before production because it was unavailable during this review.

## 2. Set deliberate capacity values

Old `.env` values override new defaults. An existing `CAPTURE_QUEUE_MAX_OUTSTANDING=8` or `CHECK_QUEUE_MAX_OUTSTANDING=20` would preserve the old bottleneck. Update those lines deliberately; do not append duplicate keys.

| Variable | New default | Purpose |
| --- | ---: | --- |
| `RESERVED_CHECK_CONCURRENCY` | 2 | Primary check coordinator slots |
| `WORKER_RESERVED_CONCURRENCY` | 4 | Must be at least check slots + two result slots |
| `CAPTURE_RESERVED_CONCURRENCY` | 64 | Primary browser ceiling, independently configurable up to 500 |
| `REGIONAL_CAPTURE_CONCURRENCY` | blank | Inherits the primary browser ceiling; applies in each secondary Region |
| `DISPATCH_BATCH_SIZE` | 500 | Maximum newly claimed watcher jobs per minute |
| `CHECK_QUEUE_MAX_OUTSTANDING` | 500 | Approximate primary queue admission ceiling |
| `CAPTURE_QUEUE_MAX_OUTSTANDING` | 256 | Approximate per-Region outstanding capture ceiling |
| `CAPTURE_QUEUE_HEALTH_CACHE_SECONDS` | 10 | Short-lived pressure observation cache |
| `CAPTURE_QUEUE_DEFERRAL_SECONDS` | 60 | Capacity deferral plus deterministic jitter |

For an owned staging target with measured 30-second p95 and 250 watchers at 120 seconds, start the controlled experiment at `CAPTURE_RESERVED_CONCURRENCY=96` and leave regional concurrency blank to inherit it. The calculator gives 90 required slots at 70% modeled utilization. Recalculate for your measured tail. Queue limits must fit the 900-second durable deadline, and concurrency must fit regional AWS quotas. Do not raise caps simply to conceal sustained backlog.

```bash
npm run capacity:plan -- --watchers 250 --interval 120 --regions 1 --mean-seconds 15 --p95-seconds 30 --concurrency 96
```

Set a **new, unused** immutable `WORKER_IMAGE_TAG`, for example `cloversight-0.5.16-20261112`. Reusing the deployed release tag is not supported. Keep current prices/credits and verified secret values intact. Update operational budget amounts only after reviewing real expected spend; the budget is an alert, not a ceiling.

## 3. Update bootstrap permissions and build a fresh image

The quota preflight needs two additional read permissions: `lambda:GetAccountSettings` and application-scoped `lambda:GetFunctionConcurrency`. Apply the existing bootstrap stack using the same source principal and stack name:

```bash
npm run aws:bootstrap
bash infra/scripts/merge-generated-env.sh .local/bootstrap-outputs.env
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
```

Review the existing bootstrap stack change set/events. The new permissions are read-only; do not substitute AdministratorAccess for the deployment role. A missing quota permission now fails deployment preflight instead of being treated as spare capacity. If reservations exceed the account's available quota above AWS's 100-slot unreserved floor, request the Region-specific quota increase before retrying.

The browser image and managed Lambda source must be from the same release. Manifest/source hashes and digest checks remain enforced. Run and review the exact image's ECR/OS scan; zero npm advisories is insufficient.

## 4. Drain and update the existing stacks

Arrange a controlled maintenance window and pause active watchers through the existing application before updating. Stop manual checks during the window. Let running captures settle and check capture/result queues and DLQs in every configured Region. This avoids old capture code running without the new leases alongside new code. A paused watcher retains its configuration and evidence. Keep the minute maintenance pipeline running so billing/notification/deletion duties continue.

Save `aws cloudformation get-template` output and current stack parameters for the **actual existing stack names** with `--profile saas-admin`. Check current stack status; resolve `UPDATE_ROLLBACK_FAILED` or drift before another upgrade. Use the existing deployment guide for the historical route rollback/GSI cases.

```bash
npm run deploy:validate
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

The first command validates local values. Infrastructure deployment then runs read-only certificate/image/alias and Lambda-quota preflights before updating the existing stack. Regional deployment also checks its Region's quota. All configured regional stacks need this release. The new DynamoDB dispatch-claim permission, SQS visibility permission, S3-bound KMS conditions, bucket/queue policies and new environment variables must be deployed with the code.

No database migration/backfill is introduced by 0.5.16. Existing running jobs without `scheduledFor` use their start time when settling. Old result paths remain readable. New operational dispatch rows have a one-day DynamoDB TTL; capture leases share the existing two-day run-results lifecycle and account-erasure prefix.

Do not run `aws:push-secrets` or rotate keys as a routine part of this patch. Verify the existing response secret has a non-development key of at least 32 characters and the API origin secret is present, using authorized secret-management procedures without printing values into logs. Missing secrets now intentionally prevent startup. The release does not require changing active SES receiving rules or Stripe Prices.

## 5. Prove operation before resuming normal work

Confirm operational SNS subscriptions in the primary and every secondary Region; test delivery and inspect new check/result age alarms. Confirm customer/steward login and production steward MFA. Run the documented staging API, tenant, payment-boundary and regional/browser acceptance gates on the deployed digest.

For a capacity exercise, use a target you own, with outbound request volume authorized by its operator. Use a dedicated funded test account and agreed dollar/capture limits. Ramp through 10, 50, 100 and 250 watchers; do not reuse the existing read-only API load probe as proof of browser throughput. Observe at least several steady capture intervals, including first capture, a changed page, retries and a worker interruption. Collect:

- p50/p95/p99 scheduling lateness, browser/evidence duration and result settlement time;
- Lambda concurrency, throttles, billed duration, memory and cold starts;
- queue age/depth and all DLQs; evidence freshness and regional completeness;
- DynamoDB conflicts/throttles and maintenance/cleanup backlog;
- logical credits and physical attempts, bytes stored/transferred and measured spend.

Require no unintended tenant leakage, duplicate credit reservation or missing watcher settlement. Verify a transient capture failure can retry before the 900-second deadline and that a failed attempt releases credits exactly once. An overloaded or unhealthy queue must defer work visibly, never label missing comparisons as unchanged. For a two-minute target, account for up to one scheduler minute plus queue/processing time and the no-overlap rule.

Resume watchers gradually after these checks. Production rollout should use the same measured configuration and exact reviewed immutable release artifacts.

## Rollback

Pause new checks and drain in-flight captures first. Restore the previous source/runtime artifact and **every affected Region's** previous image digest using the saved stack configuration. Keep all data-resource names and retained resources. New dispatch/capture lease objects are inert to old code and expire naturally; no destructive data rollback is needed. Restore previous concurrency values deliberately if quota reservations matter.

A full template rollback removes the new policies/alarms and reopens their guardrails. Prefer a forward correction or a reviewed code rollback that retains compatible security policies when practical. Never delete a data stack to recover a failed deployment, bulk-redrive unexamined DLQs, or rebuild the previous release from unlocked dependencies and call it the old artifact.
