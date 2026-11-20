# Upgrade an existing deployment to 0.5.17

Read the [customer abuse review](customer-abuse-review-0.5.17.md). This release was not deployed to AWS during review. Keep existing stack names, `webwatch-*` resources, pools, tables, buckets, Stripe Price/subscription IDs and secrets. All CloudFormation templates are identical to 0.5.16. Direct upgrades from 0.5.15 also require [the preceding upgrade steps](upgrade-0.5.16.md).

## Preserve and verify

Extract separately. Preserve prior source/runtime artifacts, all regional browser digests, private `.env`, staging allowlist, stack parameters and owner/deployment settings. Copy private configuration rather than replacing it with the example. From the new project on your openSUSE workstation:

```bash
aws sso login --profile saas-admin
aws sts get-caller-identity --profile saas-admin --no-cli-pager
npm ci
npm run deps:check
npm run verify
npm run test:browser:docker
```

Use the existing login method if this profile does not use SSO. Keep `AWS_PROFILE=saas-admin` in protected configuration. Use a new unused image tag, e.g. `cloversight-0.5.17-20261113`; the default advances to r41. Dependency resolutions are unchanged. Container/source-contract acceptance and vulnerability review remain required before promotion.

## Drain and deploy

Pause active watchers and stop customer/manual writes during the controlled upgrade. Let capture/check/result queues, including delayed messages, settle in every Region; inspect DLQs. Keep billing reconciliation/maintenance running and drain prior billing operations. Do not mix old and new writers after reopening traffic.

```bash
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run deploy:validate
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

Use the actual existing primary/regional stacks. Inspect change sets and events: no data-resource replacement or new GSI is intended. Rebuild all managed Lambdas and all regional capture images from this source, then deploy static assets. Do not recreate bootstrap resources, regenerate secrets, replace SES receiving rules or create Stripe Prices for this patch. Apply 0.5.16 quota-read permissions first if they are still missing.

## Initialize and reconcile

The first quota mutation or capture admission bootstraps saved/regional watcher counters through a strong compatibility snapshot. This is additive metadata, not a schema replacement. Because this initial read spans compatibility state, initialize during maintenance for large existing datasets.

For an administrative dry run or recovery from old writers, obtain the actual physical tables using:

```bash
aws cloudformation describe-stack-resources --profile saas-admin --stack-name YOUR_EXISTING_STACK --no-cli-pager
```

Set `CORE_TABLE_NAME`, `IDEMPOTENCY_TABLE_NAME` and `CLOSED_ACCOUNTS_TABLE_NAME` to those IDs. The protected source profile needs read access, plus existing conditional write permissions for apply. The helper does not assume the deployment role or widen IAM.

```bash
AWS_PROFILE=saas-admin npm run usage:reconcile -- --account ACCOUNT_ID
AWS_PROFILE=saas-admin npm run usage:reconcile -- --account ACCOUNT_ID --apply
```

Inspect the dry-run counts before applying. Only watcher counters change. Captures, attempts, evidence, plans and billing-window pins are preserved. Initialization/reconciliation failures must not be bypassed by granting fresh credits.

Deployment does not clear existing usage. Compare the current paid period with reconciled Stripe invoices before enabling plan changes, particularly if old status events advanced it. A verified paid renewal resets once: up to twenty held watchers resume in the payment commit and remaining IDs drain through `capture-resumptions` maintenance batches of fifty, up to ten batches/account and five eligible accounts/tick. Verify the pending list drains. Paused watchers stay paused; later activation releases a funded credit hold while preserving cadence/recovery.

## Staging acceptance

1. Exercise each plan boundary with concurrent extra watchers, regional conversions, recipients, tiers, seats and reports. Include drafts, paused watchers, stale editors, deletion/recreation and temporary incident recipients.
2. Repeated Check Now, publish/pause/resume and undo must preserve last-start and recovery clocks. Unknown canceled work stays charged; known infrastructure failures refund once while retaining attempt usage.
3. Ramp an owned target and funded staging account through 10/50/100/250 watchers. Observe start distribution, queue ages, concurrency, deferrals, credits and complete outcomes. Set capacity from measured p95 browser duration; local tests do not establish an AWS latency guarantee. Lower-tier onboarding deliberately spreads more slowly.
4. In Stripe test mode, exercise plan cycling, consumed-credit downgrades, duplicate/late events and a 250-watcher paid renewal. Usage carries through plan changes; renewals refill once and resumptions fit bounded transactions. Oversized adjustments must fail before payment.
5. Exercise invitation cooldowns, suppressions, final-seat resend, ASCII/Unicode SMS segment counts and code-based ALERT RECEIVED / ALL CLEAR replies. Inspect ambiguous provider acceptance and the bounded retry/daily-attempt policy; do not assume exactly-once transport.
6. Confirm new pricing/confirmation wording, HTTP 429 handling, ordinary login, tenant isolation, regional evidence and report download. Reopen traffic only after deployed acceptance passes.

## Rollback

Prefer a forward correction retaining the new accounting. Otherwise pause admission, drain and restore saved code/runtime plus every regional image digest together. Keep additive metadata. Old code ignores new counters and windows and can reopen abuse paths: keep customer writes/captures closed or reconcile counters before a later 0.5.17 rollout. Preserve the credit/attempt ledger and reconcile invoices/run records; surviving watcher counts cannot reconstruct consumed captures. Do not delete tables or bulk-redrive obsolete jobs as a rollback shortcut.

Resumption batches also obey byte budgets: up to 1 MB of watcher payload in the payment commit and 3 MB in maintenance, with room reserved below DynamoDB’s 4 MB transaction ceiling. Large rule sets can reduce the number resumed per batch.
