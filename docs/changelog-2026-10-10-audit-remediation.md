# October 10, 2026 audit remediation — 0.5.13

Consolidated both supplied architecture/cost and PCI/GDPR/WCAG audits against the latest attached 0.5.12 source. Implemented a bounded first remediation slice across operational notifications, admission/maintenance, AWS settings/alarms/IAM, runtime secret lifecycle, log/capture limits, privacy erasure/export, payment destinations and portal/report accessibility.

Cross-component review added account-value conditions to scoped DynamoDB commits, active-account gates for new tenant writes and deferred-result settlement, partitioned bounded erasure, identity/notification retry fencing and preservation of unsettled/provider-billing references. Existing financial records, comparison pointers and staging authentication/perimeter contracts were retained.

Package/static-cache markers are 0.5.13. Dependency versions remain as received. Documentation-only resource/route inventory generation and passive syntax/data checks are separate from project execution. No project tests, application runs, builds or deployments were performed. Existing affected fixtures were adapted where their source contract changed; owner execution remains required.

See [the complete finding-by-finding change register](audit-change-register-2026-10-10.md) for completed/partial/deferred work and decisions, and [the rollout and acceptance guide](release-notes-0.5.13.md) for owner commands and verification. Historical release notes and predecessor generated JSDoc/visual assets remain available.
