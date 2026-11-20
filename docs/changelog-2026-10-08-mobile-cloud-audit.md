# October 8, 2026 — portrait mobile and AWS audit fixes (0.5.11)

- Fixed content height and CSS specificity in phone record cards, dashboard counters/meter/navigation and report/form spacing.
- Added scoped mobile editor/archive stylesheet with compact actions, scrolling recovery and archive metadata/card fixes; deployed explicitly and cache versions bumped.
- Separated bounded cold setup from the shared responsive page budget, preserving absolute/runtime persistence limits and disposable sessions.
- Coalesced successful schema initialization and reduced bulk retention cleanup cadence while urgent work stays every minute.
- Added shared incomplete-run metric/alarm covering worker and maintenance logs, plus operator subscription checks.
- Protected tagged deployment images from automatic count-based expiry; synchronized bootstrap/build/regional policies.
- Corrected audit collector CloudFront/ECR inputs, prefixed JSON handling/redaction, lifecycle and custom-metric coverage.
- Updated deployment, audit evidence, architecture, operations, cost, isolation and resource inventory guides. Three monitoring resources added; routes/protocol/price catalogue unchanged.

Authored/reviewed source and supplied evidence only. No project code, tests, builds or AWS actions executed. Full findings and remaining visibility/login limits: `aws-audit-review-2026-10-08.md`. Complete upgrade instructions: `release-notes-0.5.11.md`.
