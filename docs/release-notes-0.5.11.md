# Release 0.5.11 — portrait mobile and audit-supported cloud fixes

This full source snapshot includes all earlier 0.5.10 fixes and the remaining mobile-layout and AWS-audit changes. It is an authorship deliverable: no app, test, build, deployment or AWS workload was run. The six supplied iPhone SE screenshots and the completed 24-hour audit were reviewed passively. Read [the detailed audit findings](aws-audit-review-2026-10-08.md) for measured counts, historical context and unresolved items.

## Included changes

- Watcher record cards grow with content; compact tables lose redundant nesting/padding. Dashboard count typography, uptime meter, navigation alignment, report headings and wrapping are corrected.
- Watcher editor uses a compact Publish/Save footer and a useful scrolling body. Local recovery remains accessible in a disclosure with autosave/connectivity updates. Archive preview metadata no longer overlaps; cards fit narrow containers and avoid the shared green button background.
- New `mobile-layout.css` is explicitly included and deployed. Browser asset query versions and package/image release markers advance to 0.5.11.
- Cold setup has one maximum 40-second allowance; all three devices share the configured page budget after fresh-context startup. Work is capped at 150 seconds and further limited by remaining durable-run/Lambda time. Session isolation and exact tenant/evidence bindings remain unchanged.
- Store initialization coalesces pending attempts and remembers successful schema setup only per instance; state and authorization are not cached. Bulk retention cleanup runs every 15 minutes; urgent notifications, billing/refunds, capture expiry and account closure remain every minute.
- Two primary log filters feed one incomplete-run metric/alarm. Post-deploy audit detects missing operator subscribers.
- Primary/bootstrap and regional ECR policies preserve tagged deployments and expire only untagged remnants after seven days. Explicit retirement checks are required to avoid accumulating old tagged releases.
- Collector 1.2 corrects CloudFront/ECR commands, prefixed JSON summaries/redaction, repository lifecycle and custom metric coverage. CloudTrail page/time limits remain bounded.

## Deploy the complete snapshot

Extract `webwatch-saas-release-0.5.11-mobile-cloud-2026-10-08.zip`. Copy the private `.env` from your currently deployed project into `webwatch-saas-release-0.5.11/` before running commands. Also carry forward any customized `config/staging-ip-allowlist.txt`. Preserve all existing domains, account IDs, secrets, owner subject and deployment principal settings. Do not replace your private configuration with example defaults.

The bootstrap update aligns the existing primary ECR repository's declared retention policy. It changes no resource logical ID and needs no new IAM grant in the collected deployment-role policy. It requires your existing `AWS_DEPLOYMENT_PRINCIPAL_ARN`. If that setting was not carried in `.env`, retrieve the existing stack's value and copy it into your private configuration; do not substitute another principal:

```bash
aws cloudformation describe-stacks --profile saas-admin --region us-east-1 --stack-name webwatch-deployment-bootstrap --query "Stacks[0].Parameters[?ParameterKey=='DeploymentPrincipalArn'].ParameterValue | [0]" --output text --no-cli-pager
```

Use your actual bootstrap stack name if customized. Pause published watchers and let existing checks finish before the primary/regional update window. From the new extracted root, run each command separately and stop if one fails:

```bash
aws sso login --profile saas-admin
export AWS_PROFILE=saas-admin AWS_PAGER=""
npm ci
npm run aws:bootstrap
bash infra/scripts/merge-generated-env.sh .local/bootstrap-outputs.env
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

The scripts select the source SSO profile and then assume the existing deployment role where required. The rebuilt image/source contract must match this release; do not carry an older image URI/hash forward after rebuilding. All four secondary regions must be updated before resuming watchers. Static-only deployment cannot deliver the capture or database fixes. No secret push, Stripe price migration or SES receipt activation is required solely for this upgrade.

To receive technical alarm and SES-feedback emails, set `TECHNICAL_ALERTS_ENABLED=true` and retain the intended `TECHNICAL_ALERT_EMAIL` in `.env` before `aws:deploy`. The existing deployed address is already configured, but delivery is disabled. Confirm the new SNS subscription email, then rerun the final audit. Enabled but unconfirmed alert delivery now fails the audit; explicitly disabled/no subscriber warns. Customer incident delivery settings are separate.

Tagged image retention can increase ECR storage. Keep digests used by any deployed Lambda, published version, other stage or rollback plan. Only retire tags/digests after checking every reference; no automatic deletion script is supplied because age/build count cannot prove disuse.

## Owner-operated verification

1. In Chrome at iPhone SE portrait dimensions, review Overview, Watchers, Archived Results (stacks/detail), Reports, Team, Action log, Plans & billing and My profile in light/dark mode. Watcher cards must enclose the entire row, metric counts and uptime percent must be readable, and no page should need horizontal panning.
2. Open the watcher editor, focus lower inputs with the keyboard open, scroll to recipients/templates/recovery, then Save draft and Publish. Header/Close and the two footer actions must leave a usable form viewport. Verify the recovery disclosure works online/offline and after autosave.
3. Open Check Status and View Results from a watcher and a deleted-watcher archive. Confirm Close, vertical scrolling, three-device previews, region selection and long metadata stay reachable. Verify archive thumbnails load/retry with unchanged signed URL queries.
4. Resume watchers only after all deployments complete. Run a fresh five-Region check. Capture logs should report release 0.5.11, `setupBudgetMs`, `overallBudgetMs` and `page-budget-started`; every expected device/Region should have evidence or an explicit unavailable state. Compare a cold check with a later check. Historical snapshots will not be recomputed.
5. Review `CaptureIncompleteRunAlarm` and its shared metric, plus OpsTopic confirmed subscription. Confirm a genuine infrastructure failure is visible without turning a missing capture into a target outage. Compare subsequent CoreTable read units and conditional failures with the audit, without treating a short sample as a dollar savings forecast.

The five intermittent managed-login 400 responses remain unresolved; use the short incident-window instructions in the audit report if they recur. The stopped account-level CloudTrail trail and absent detailed request log sinks remain visibility gaps outside this app patch.

## New steward accounts

Sign in as the existing configured platform owner to the steward portal, open Steward Manager and invite the intended staff member. Have them follow their invitation and sign in. Preserve `STEWARD_OWNER_SUB`; it identifies the existing owner and must not be replaced with a new staff subject. Initial owner provisioning, if no owner exists, is documented in [deployment](deployment.md#steward-owner-identity-for-this-release) and [steward security](steward-security.md).
