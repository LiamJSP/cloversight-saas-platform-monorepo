# Release 0.5.12 — customer UI review fixes

This complete source snapshot merges all 0.5.11 mobile, capture-isolation and cloud-audit work with the latest customer presentation and view-navigation fixes. Read [the review coverage and findings](ui-review-2026-10-09.md) for the live evidence, source-only phone checks and remaining verification gaps.

The live Chrome browser could not change its 1363 × 936 viewport. All eight available customer routes and safe modal/disclosure variants were reviewed there. **This release has not been rendered at iPhone SE dimensions.** No local project code, tests, builds, deployments or AWS workloads were executed by the author. The owner performs final development/portrait verification and deployment.

## Changes

- Neutral inactive navigation and red destructive actions in dark mode; readable compact-desktop topbar values.
- Smaller Close controls, wrapping modal headings, compact escalation headings and readable watcher progress timestamps.
- New-route and archive-return scroll reset; native select Escape no longer closes the editor.
- Measured sticky result-header offsets and a second evidence alignment after loading completes; compact phone results and comfortable disclosure/search targets.
- Associated screenshot tabs/panels with arrow/Home/End navigation and compatible modal focus trapping.
- Scrollable, wrapping confirmation details and phone quote fields; neutral archive comparison labels, correct empty states and explicit missing historical capture time.
- Release/cache markers advance to 0.5.12; dependencies and infrastructure topology are unchanged.

## Deploy from the extracted root

Extract `webwatch-saas-release-0.5.12-ui-review-2026-10-09.zip`. **Copy your private `.env` from the currently deployed project into the new `webwatch-saas-release-0.5.12/` folder first.** Also carry forward customized `config/staging-ip-allowlist.txt`. Preserve the existing deployment principal, domains, account settings, secrets and `STEWARD_OWNER_SUB`; do not replace private values with example defaults.

The following is the complete, consistent-release path for an already deployed 0.5.11 environment. The existing image contract checks the package release and source fingerprint, so rebuild the image even though this patch changes no capture behavior. A previous generated-env merge can leave the old `WORKER_IMAGE_TAG` in the copied `.env`. The two tag-reset commands below remove that single generated setting and any inherited shell value so the build selects a fresh unique tag; other private settings remain intact. If you intentionally maintain a custom tag, substitute a new unused value instead. ECR tags are immutable. Do not reuse an older image contract.

Run each command separately from the new project root, stopping if any fails:

```bash
aws sso login --profile saas-admin
export AWS_PROFILE=saas-admin AWS_PAGER=""
npm ci
sed -i -E '/^[[:space:]]*(export[[:space:]]+)?WORKER_IMAGE_TAG=/d' .env
unset WORKER_IMAGE_TAG
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

The scripts use the configured SSO profile and existing deployment role. Update the primary stack and all four regional stacks before treating the release as complete. Static deployment uploads the changed customer assets and waits for the existing CloudFront invalidations. Then hard-refresh the browser. No bootstrap change, secret push, Stripe price migration or SES activation is required solely for this update. The audit command is the existing configuration audit, not another large CloudTrail/log collection.

For a quiet image-rollout window, pause published watchers and let current checks finish through your normal operator process, then resume after deployment. Avoid starting fresh checks during a partially updated regional rollout. No watcher actions were taken during this review.

Use the [owner portrait checklist](ui-review-2026-10-09.md#owner-portrait-verification-after-deployment) to validate layouts without performing consequential form submissions.

## Steward account reminder

Sign in to the steward portal as the configured platform owner, open Steward Manager and invite the intended staff member. They follow the invitation and sign in. Keep `STEWARD_OWNER_SUB` unchanged; it identifies the existing platform owner. Initial owner setup is covered in [deployment](deployment.md#steward-owner-identity-for-this-release).
