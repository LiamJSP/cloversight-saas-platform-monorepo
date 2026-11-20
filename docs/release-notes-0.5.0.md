# CLOVERSIGHT 0.5.0 release notes

Release 0.5.0 implements the high-return cost controls and the capture-credit USD price book.

## Cost architecture

- Add deterministic SQS capture queues and DLQs in every capture Region plus a durable primary result queue, tenant-fair message groups, size-bounded result contracts, and temporary per-Region result entities that keep the check-job item below DynamoDB's item limit.
- Compare text and responsive PNGs in the capture Region, keep evidence there, and return compact metadata only.
- Store capture evidence under plan-retention prefixes with monthly content-addressed deduplication.
- Add Standard-IA/Glacier Instant Retrieval lifecycle tiers and reduce ECR retention to three images per Region.
- Return authorized, short-lived S3 URLs instead of proxying snapshot/report binaries through API Gateway/Lambda.
- Shard watcher/deadline schedules 32 ways; add tenant read models, collection-bounded queries, tenant revision locks, strong direct pointer/result reads, and a membership identity index. Routine dispatch/result transactions no longer load an account's retained snapshot history.
- Lazily and conditionally backfill those indexes for existing 0.4.x account data on first scoped access.
- Keep account reads available through a strong, tenant-filtered compatibility scan during the brief staged `LookupIndex` creation window.
- Reserve and enforce regional capture credits; refund infrastructure failures, bill target outages, and hibernate exhausted watchers until the next period.
- Preserve each watcher's configured capture timeout across the queued regional contract, bounded by the worker's infrastructure ceiling.
- Preserve the proven per-capture Chromium persistent-context/SSRF design; browser-process reuse and always-on warm workers remain deferred.

## Pricing

- Replace the former CAD catalogue with Free $0, Essentials $19, Professional $49, Team $149, Business $399, and Scale $899 monthly USD tiers.
- Enforce watcher, cadence, Region, user, escalation-tier, recipient, retention, report, and capture-credit limits.
- Preserve the 30-day Free daily visual trial, then durably return existing trial watchers to weekly core detection on their first post-trial run.
- Keep existing CAD subscriptions operational under their bounded retired entitlements and validate their exact renewal amounts, while blocking retired plans from new checkout or self-serve plan changes until support completes the USD migration.
- Keep Scale sales-assisted until retained-storage metering and remaining compatibility transactions are production-ready.

## Operations

- Add regional queue/bucket/lifecycle checks to the post-deploy audit.
- Add IaC source checks for durable capture mappings, partial-batch handling, timeouts, and the identity index.
- Reserve separate check-dispatch and result-aggregation concurrency on the shared primary worker.
- Advance runtime and static asset revisions to `0.5.0`.

No build, test, validator, deployment, or live provider operation was executed during authorship; the project owner performs those gates.
