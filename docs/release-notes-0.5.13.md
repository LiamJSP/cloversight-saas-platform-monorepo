# Release 0.5.13 — first October 10 audit remediation

This source snapshot follows the attached 0.5.12 UI-review ZIP. Both October 10 PDFs were read in full. The [complete audit change register](audit-change-register-2026-10-10.md) tracks every finding, financial-control proposal, verification obligation and owner decision. Implemented means source authored and statically reviewed, not deployed or certified. No application code, project tests, dependency installation, builds or AWS/provider operations were executed in this session.

## Included changes

- Owner-only global suppression mutations; operational/security/deletion notices use a separate suppression policy. Provider acceptance, local queuing, suppression, failure and ambiguity are distinct. Durable attempt claims prevent blind replay of uncertain operational notices. Positive delivery feedback and a fully independent notification outbox remain deferred.
- Queue-pressure admission before capture credits, capacity/stale deferrals without false target outages, bounded retry jitter, frozen running-run reuse and partial-infrastructure-failure backoff. Approximate counts are soft limits; the rolling spend governor and regional physical-attempt permits remain deferred.
- Durable maintenance task leases, independent task execution, bounded retries, success heartbeat and a shared cleanup budget. Larger account erasure advances through bounded stages, with exact identity binding and unfinished-stage visibility. Subscription cancellation and unresolved internal payment/refund recovery hold deletion; provider cancellation is still owner-operated.
- Production steward MFA and explicit operational/budget recipients; separate regional browser concurrency, primary/regional alarms, optional tag-scoped budget and narrower deployment-role permissions. New alarm topics, keys, filters and alarms add recurring charges. Staging ChatGPT perimeter behavior remains as configured.
- Failed runtime initialization is retryable; successful dependency graphs and provider credentials refresh after five minutes. Coordinated signing/origin rotation remains an operator workflow. Central operational log sanitization covers common secrets, URLs, emails and phone data.
- Continuous capture-proxy byte limits and aggregate request/connection bounds. Build and CI now record dependency evidence and use committed runtime locks when present; authoritative Lambda/browser source locks and container vulnerability triage remain incomplete.
- Exact approved HTTPS payment destinations, a limited authenticated own-profile JSON download, seven-day accessed-draft expiry and current-viewer clearing. Legal notices, DPA/subprocessors, retention, transfer mechanisms and comprehensive person-level rights cases require owner facts and follow-up work.
- Keyboard recipient suggestions, steward idle warning/extension, persistent form errors, less disruptive report polling, concise loading/archive status, personal-data autocomplete, deliberate route/modal focus and light-theme copy contrast. New report jobs produce semantic Unicode HTML alongside the existing untagged PDF, sharing authorization and expiry. Complete WCAG rendered/assistive-technology acceptance remains pending.

## Owner rollout

Extract `webwatch-saas-release-0.5.13-audit-remediation-2026-10-10.zip`. Copy your existing private `.env` and customized `config/staging-ip-allowlist.txt` into the new `webwatch-saas-release-0.5.13/` directory. Keep `.env` mode 0600 and preserve the existing account, deployment principal, domains, provider configuration, `STEWARD_OWNER_SUB` and integrity/origin secrets. Dependency versions were not upgraded.

Review [deployment](deployment.md) and [account bootstrap](aws-account-bootstrap.md) first. Production now requires `COGNITO_STEWARD_MFA=ON`, `TECHNICAL_ALERTS_ENABLED=true` and explicit `TECHNICAL_ALERT_EMAIL`, `OPS_ALERT_EMAIL`, `BUDGET_ALERT_EMAIL`. Test MFA enrollment and recovery before production support access. Staging/beta retain explicit choices; `OPS_ALERT_EMAIL` and `BUDGET_ALERT_EMAIL` can independently configure destinations even with SES technical notices disabled. Confirm every SNS subscription. Do not toggle the legacy technical-alert budget branch casually on an existing stack: its conditional logical IDs can collide on the same physical budget name; follow the documented migration review.

The optional tag-scoped budget stays disabled unless you approve account/application scope, activate and verify the `Application`/`Stage` cost allocation tags and set its explicit limit. The activation preflight reads AWS billing state only when this option is enabled. Queue-pressure settings and approved custom Stripe payment origins have explicit deployment mapping; defaults need no private-value changes.

If you use the checked-in bootstrap role policies, have the authorized account administrator apply/review their updates before deployment. Runtime-role management and PassRole are narrower, while CloudFormation execution still has substantial authority; a complete enforced permissions boundary/account split is not part of this release. The application deployment commands do not replace that bootstrap review.

Pause published watchers through your existing operator process and let in-flight checks finish during the coordinated image/IaC rollout. Avoid initiating erasure or new checks while primary and regional components are at different releases. Rebuild the immutable worker image: the source/release fingerprint includes the changed platform sources and package marker. The following commands are for you to run from the new source directory, one command per line.

```bash
aws sso login --profile saas-admin
export AWS_PROFILE=saas-admin AWS_PAGER=""
npm ci
npm run verify
npm run browser:docker:check
npm run test:browser:docker
sed -i -E '/^[[:space:]]*(export[[:space:]]+)?WORKER_IMAGE_TAG=/d' .env
unset WORKER_IMAGE_TAG
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

The `sed` command removes only an inherited/generated image tag. If you intentionally use a custom immutable tag, supply a new unused one instead. Deploy every configured secondary Region, not just the primary stack. Static deployment includes new cache markers; hard-refresh after CloudFront invalidation. No price migration or automatic secret rotation is required solely by this snapshot.

Set `WEBWATCH_REQUIRE_DEPENDENCY_LOCKS=1` only after authoritative reviewed lockfiles for `infra/runtime` and `infra/docker/browser-worker` are committed. Enabling it now deliberately stops the build instead of using the warned legacy dependency resolution. A successful default build is not evidence that those two runtime trees are deterministically locked.

## Required owner acceptance before promotion

1. Run the existing release, IaC and browser checks above. Inspect new settings and stack changes before applying them; confirm destinations, permissions, alarm dimensions and healthy quiet-tick metrics across every configured Region. Trigger a controlled failure and verify actual operator receipt.
2. With unrelated customer accounts, verify every report/PDF/HTML/personal-data/asset/check-status endpoint rejects cross-account access; expired links cannot outlive report expiry. New HTML companions exist only for newly generated jobs.
3. Exercise high queue pressure, queue lookup failure, stale jobs, one-region outage, partial internal failures, duplicate/late results, worker restart and timeout. Verify deferrals consume no capture credit, do not report a site outage and do not advance trusted/rolling evidence. Verify lease refunds/settlement only once.
4. Exercise large-account staged deletion, grace-period undo and irreversible purging; billing/subscription holds; duplicate expired unsubscribe links; resolved/unresolved/shared Cognito identities; missing directory; primary versioned and every configured regional bucket; suppressed and ambiguous deletion notices. Confirm unfinished records remain visible and unrelated accounts progress.
5. Cancel a live Stripe subscription using the approved timing/credit policy, verify its bound terminal webhook/account status, then allow erasure. Closure does not automatically cancel it. Review retained finance/audit/suppression/tombstone exceptions and historical/backup/provider locations. In-flight regional object writes and replay/restore generation fencing remain open; do not claim complete erasure from the configured-bucket sweep alone.
6. Exercise Stripe custom/invalid destinations and payment reconciliation without issuing duplicate charges. Verify provider rotation propagation and single-key response/origin recovery using [secret rotation](secret-rotation.md). Inspect redacted operational logs without inserting real sensitive content.
7. Complete the audit's full WCAG matrix with keyboard, zoom/reflow, both themes, touch, reduced motion, screen readers, form errors, idle extension, report polling, route/modal focus and HTML report semantics. Validate visual-change equivalence separately; source changes are not a conformance certificate.

The financial attempt ledger, rolling liability forecast, independent governor and safe financial hold actuators need a dedicated later implementation session. Review the register's owner decisions before that work; no thresholds, residency commitments or legal retention durations were guessed.
