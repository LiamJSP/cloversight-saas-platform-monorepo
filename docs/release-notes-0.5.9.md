# CLOVERSIGHT 0.5.9: check status and beta preparation

## What changed

- **Check Status** on Watchers puts Phase A, the ongoing check in each enabled region, above Phase B, the existing notification activity. A clear separator distinguishes them; the check section refreshes every ten seconds while the dialog is open. Region outcomes use the customer-safe labels Queued, Checking, Checked, Change detected, Website issue, and Watcher error. Internal exception messages, worker infrastructure identifiers, and capture result payloads are never included in this read model.
- The public home hero places a much larger interactive regional globe over the 2D background shape, behind the small pink globe and sample results card. It reuses the existing bundled renderer, rotates slowly, supports pointer drag and keyboard arrows, respects reduced motion, and explicitly labels its mostly green and few red markers as illustrations rather than live service status.
- Customer read models return explicit watcher, check, alert, snapshot, and report fields. Evidence reads require matching account and watcher ownership; the signed asset locations are checked against the local or regional history layout. DynamoDB account reads discard stale or misindexed foreign entities, scoped writes reject cross-account changes, and multiple active memberships for one identity deny access pending support review.
- Initial paid entitlements require a paid Stripe Checkout Session with the bound account, customer, transaction, subscription, one expected Price, and a valid billing period. A subscription update alone cannot activate a pending purchase; out-of-band `invoice.paid` cannot grant paid access. A paid Stripe account with inactive billing or expired paid period receives free-tier configuration limits but zero capture credits and no report or provider sends until reconciliation. Retryable duplicate webhooks return a retry response while processing is in progress.
- A transactional UTC-day budget caps outbound notification provider attempts, including retries. Free: 50 email, no SMS; Essentials: 250 email/25 SMS; Professional: 1,500/75; Team: 3,000/150; Business: 7,500/300; Scale: 15,000/600. Exhausted attempts show as not delivered. Watcher activation validates plan limits, and capture enforces page and image size limits.
- The staging WAF admits only configured IP-set addresses. Its former signature-shaped browser-header exception was spoofable and has been removed. Copy the current allowlist into the new project directory before the infrastructure update.

## Deploy the complete release

Extract the ZIP into a **new** folder and copy your private `.env` and any customized `config/staging-ip-allowlist.txt` from your existing project. Confirm `AWS_PROFILE=saas-admin` in `.env`. Preserve other existing account, region, Stripe, Twilio, and stage settings. The source ZIP contains no private `.env`.

Run these commands from the extracted project directory, one command per terminal line. You own build, test, cloud access, deployment, and validation. Stop if validation or deployment fails, inspect the reported error, and resume from the failing step after fixing it.

```bash
aws sso login --profile saas-admin
aws sts get-caller-identity --profile saas-admin --region us-east-1 --no-cli-pager
npm ci
npm run verify
npm run deploy:validate
npm run aws:build-worker
cat .local/worker-image.env
```

Copy the newly generated digest-pinned `WORKER_IMAGE_URI` into `.env` before continuing. Do not reuse the previous release's image or old `.local/worker-image.env`. Use a short maintenance window or pause published watchers while updating the primary and regional workers.

```bash
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

No Stripe Price or provider secret changes are introduced. If this is a new installation rather than an upgrade, follow `deployment.md` for bootstrap, provider secrets, DNS, SES activation, and their stage-specific steps. Static assets alone cannot supply the API/check status or regional capture changes.

## Owner-operated staging acceptance

1. Check a watcher with several enabled regions. Observe Queued/Checking, then per-region Checked, Change detected, Website issue, or Watcher error in Phase A; confirm Phase B shows escalation and any daily-limit suppression. Check a second account's watcher ID with the first account's token and expect 404. Confirm the table and dialog stay readable with keyboard navigation, narrower desktop viewports, and reduced motion.
2. Check the public hero in the deployed page. Drag the globe and use arrow keys while focused; markers must be described as examples. Confirm the pink decoration and sample results card remain above it and that a browser without WebGL receives the fallback message.
3. Create two unrelated test accounts. For each account's token, request the other account's watcher, check status, snapshot assets, report status, team recipient lookup, and transaction retry. All must be rejected, including a guessed ID or stale cross-account reference. Signed regional screenshot URLs for owned snapshots should load, and a signed URL must expire. Inspect customer bootstrap for worker error strings, bucket names, raw S3 keys, payment IDs, and infrastructure metadata.
4. In **Stripe test mode**, inspect an incomplete/async Checkout, a completed paid Checkout, an initial invoice, an unsuccessful renewal, a successful renewal, a manually marked-paid invoice, cancellation, and a paid subscription with a pending plan update. Confirm only a verified paid event grants paid service and expired/inactive periods reduce allowances. Reconcile any preexisting paid account with a missing current period before beta; a fail-closed account might otherwise be temporarily restricted.
5. Confirm both staging CloudFront and Cognito are accessible from listed addresses and blocked from unlisted addresses even when the removed signature-like headers are copied. Verify WAF health, regional queues/DLQs, DNS, IAM, SES/Twilio if configured, and cost alerts using `npm run aws:audit -- --full` and the established operations runbook.

## Verification boundary

No code, tests, build, IaC validator, live browser, AWS command, or provider transaction was executed while writing this release, as requested. The static source review cannot establish absolute account isolation, payment correctness, cost bounds, or WCAG conformance without the staging checks and external certification in `known-limitations.md`. Legacy billing records and provider webhook shapes require particular attention during the rollout.
