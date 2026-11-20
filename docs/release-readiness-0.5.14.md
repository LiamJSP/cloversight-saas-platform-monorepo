# Practical initial-release readiness — 0.5.14

Source review dated 2026-10-10, based on the delivered 0.5.13 source, both prior audit registers and this release's changes. No tests, installs, builds, deployments, provider operations or live certification occurred. This list distinguishes known gaps from evidence that has not yet been collected; it does not assert an observed live exploit or payment failure.

## Resolve before an unrestricted paid production release

| Gate | Concrete concern | Required completion |
| --- | --- | --- |
| **Deployed dependencies** | `infra/runtime` and `infra/docker/browser-worker` lack authoritative source locks; no clean audit/container scan evidence exists for the promoted artifact. A root lock does not cover these deployments. | Owner-run `npm run deps:lock`, review/commit both locks, pass each tree's integrity/audit checks and triage container/ECR findings for the exact digest. Production and runtime CI now fail closed on absent locks. |
| **Untrusted browser privilege boundary** | The renderer still shares the capture worker's privilege boundary; broker/credential separation remains deferred. Proxy SSRF and byte bounds do not prevent every browser-process compromise from reaching worker credentials/evidence. | Complete the audit's capture isolation/IAM review and the credentialless capture/broker boundary before treating arbitrary customer-controlled pages as security-certified. See [capture isolation](capture-isolation.md) and F12 in the audit register. |
| **Paid account closure** | Scheduling closure does not cancel the bound Stripe subscription. Purge safely holds an active subscription/unsettled ledger, but a hold does not stop future provider charges. | Decide cancellation timing; implement the bound/idempotent provider transition or a reliable owner-operated cancellation process before offering paid self-service closure. Preserve reconciliation evidence. Do not tell a customer billing stopped merely because monitoring paused. |
| **Erasure/restore promises** | Late object puts, historical/retired buckets, noncurrent/backup restoration and provider/legal-retention inventories remain incomplete. Current cleanup notices have bounded scope. | Approve the retention/provider inventory and close late-write/restore replay races before promising comprehensive automatic deletion. Supply a staffed rights-request process and truthful retention language meanwhile. |
| **Production identity/provider acceptance** | Source cannot establish actual tenant isolation, owner MFA/recovery, confirmed SNS, SES production access, successful browser capture or correct real Stripe callbacks. | Run controlled staging with two unrelated accounts; verify API and image/report/export isolation, auth/MFA, exact-source regional capture, mail receipt, alarms and Stripe test-mode replay/reconciliation. Retain observed evidence. |
| **Published legal/privacy identity** | Existing legal/tax pages remain drafts and wider individual-rights/retention/processor decisions are not implemented by a logo or profile download. | Owner/legal review of operator details, privacy/terms/processor and incident/rights handling before inviting the applicable paying customer audience. No PCI/GDPR/WCAG certification is claimed. |

These gates may permit a specifically scoped owner-controlled staging/limited beta with explicit risk decisions; they do not justify an unqualified production-ready claim. Security evidence remains a priority over cosmetic completeness.

## Suitable rapid follow-up with controlled initial scale

- Keep Scale sales-assisted: 1 TB storage is unmetered and compatibility transactions can become too large. Complete physical storage/usage metering and scalable account-partitioned compatibility paths before expanding.
- AWS budgets, credit quotas and queue admission are not a dollar spend cap. The financial ledger/governor/next-24-hour liability design is deferred. Choose a small initial cohort, controlled concurrency and an accountable operator budget response; implement the governor if a hard spending guarantee is required.
- Complete independent operational outboxes, SES delivery feedback and billing/maintenance backlog health alarms. Current accepted/queued/ambiguous states remain truthful, but accepted mail is not confirmed receipt.
- Complete the wider rights/export workflow, complete WCAG matrix/visual equivalence and tagged Unicode PDF work. The new semantic HTML report helps; it does not certify all criteria.
- Rebuild generated documentation snapshots and decide a separate legacy namespace/domain/session migration. Existing physical identifiers deliberately remain stable; do not rename them in place during this release.

## Completed in this session

Phone navbar/menu scrolling and 1rem item spacing; product rebrand and supplied full/compact light/dark assets; Cognito/extension/notice/report/download branding; one-command dev/bootstrap/deploy workflows; fingerprinted root dependency setup; Node 22 alignment; owner-oriented Linux README; production/CI source-lock enforcement; stale report test repair and focused report/closure/phone regressions; new-shell coverage; redundant CI browser doctor removal; source-release exclusion of private env/credential/browser files and explicit overwrite opt-in.

The original AWS physical resource names, allocation filters and IAM tag conditions were compared against the predecessor source and preserved. Version/cache references are 0.5.14. No existing source file was removed. These are authored changes with passive review, not a successful build or deployed result.

## Incomplete / owner comments

- Both runtime dependency locks and scan evidence are still absent; the new CI/production gate will stop until they are supplied.
- No runtime/browser/provider/AWS/OS-distro testing or application build was performed. The new regression tests and consolidated workflows need owner execution.
- Existing customers' stored custom alert templates are not rewritten by changing default source copy; an explicit, narrowly scoped template migration is needed if their historical default text must be rebranded. Do not overwrite customer-authored messages.
- Decide whether legacy technical resource/configuration/schema/domain identifiers should be migrated in a later release. This ZIP preserves them intentionally to prevent breaking existing deployment/data/session consumers.
- Predecessor generated atlas PNG and JSDoc snapshots are not rebuilt. Current source and guides are authoritative; regenerate through the documented documentation workflow.
- The larger October 10 financial/privacy/isolation/accessibility work remains in [the complete audit register](audit-change-register-2026-10-10.md), with owner decisions and session-sized follow-up proposals.

## Passive handoff checks

The session handoff checks parse source without importing/running it, check shell syntax without executing commands, parse JSON/CloudFormation YAML and compare resource names/conditions, inspect supplied SVG/PNG assets, resolve active static/source references, and verify the final ZIP's file set/bytes/modes against the predecessor snapshot. This does not run the project verify script, install dependencies, exercise a simulator or build/deploy the platform.

Recorded passive results: 36 changed/new JavaScript modules parsed without imports; all 18 shell scripts parsed with mode 0755; 10 JSON files parsed and root manifest/lock version/name/engines/dependencies agreed; three CloudFormation templates parsed without duplicate keys with 174/15/5 logical resources and only intended description/owner-default/Cognito-asset changes. Relative source imports, active static paths and current handoff-document links resolved. Supplied SVGs and extension PNG dimensions/transparency were inspected. These are source checks only.
