# Architecture

Cloversight keeps account, billing and scheduling state in `us-east-1`. Each selected region runs Chromium and stores its screenshots in a private bucket. The coordinator brings the regional results together for the customer. See the [plan enforcement review](customer-abuse-review-0.5.17.md) for how the platform limits watcher creation, scheduling and delivery.

The [system map](visuals/system-landscape.html) shows how the services connect. The [regional check diagram](visuals/regional-check.html) follows a capture through one region. For implementation details, see the [surface guide](surfaces.md), [AWS resource inventory](reference/cloudformation.md) and [gateway route table](reference/gateway-routes.md). The [documentation guide](documentation.md) covers how to regenerate the diagrams and reference pages.

## Browser surfaces and request boundary

Astro builds the Markdown-driven public site as static HTML. The customer and steward portals use plain browser JavaScript. The three surfaces share branding and the portals use the authentication code in `apps/shared/`. The public hero globe and dimmed application-stage copies are illustrative. The customer results globe uses `apps/customer/regional-globe/` to present actual retained regional check data. CloudFront serves the public, customer and steward S3 origins; the private `/api/*` route reaches API Gateway. The customer and steward Cognito JWT authorizers use distinct user pools. `src/aws/handler.mjs` verifies the CloudFront origin secret on private application routes and delegates to `src/api/routes.mjs`, which resolves the active tenant and checks owner-only operations.

The staging CloudFront and Cognito WAF ACLs in `infra/cloudformation/webwatch.yaml` default to block and permit declared IPv4/IPv6 IP sets. The staging-default `STAGING_CHATGPT_BROWSER_ENABLED` setting additionally admits ChatGPT user-agent and browser signature-header patterns regardless of IP at both layers. These are header compatibility rules, not cryptographic verification or application authentication. See [staging browser access](staging-browser-access.md). Provider callbacks and signed response surfaces are handled at their own application trust boundaries; see [security](security.md).

## Local runtime

The local platform is a Node.js service with static public, customer, and steward applications plus JSON/file persistence. `FileStore.transact` serializes state mutations and commits through atomic rename. Local checks retain the single-process compatibility engine so product flows can be exercised without AWS.

Every browser capture still uses the proven security and rendering path:

1. Validate the HTTP(S) URL and allowed port.
2. Resolve and reject private, loopback, link-local, multicast, reserved, and documentation networks.
3. Route HTTP/HTTPS through a loopback validating proxy that pins approved addresses and revalidates redirects and subresources.
4. Enforce capture-time ceilings and continuous cumulative bidirectional transferred-byte ceilings through the proxy, with request/connection bounds across responsive views.
5. Use the Playwright persistent/default context required by the Lambda Chromium build and a disposable profile for each capture.
6. Render full-page desktop, tablet, and mobile PNGs at DPR 1 after exclusions, font/media settling, and animation suppression.
7. Compare matching responsive profiles and normalized text without native image-processing dependencies.

The persistent/default-context approach is deliberate. The current Sparticuz Chromium integration was stabilized after incognito-context `Target.closed` failures, and the per-capture egress proxy is part of the SSRF boundary. Release 0.5.0 does not reuse a browser process across tenants because doing so safely would require a separately supervised warm-worker design and a proxy/context model that preserves those guarantees.

## AWS capture data flow

The control plane remains in `us-east-1`. Browser work and evidence stay in the AWS Region selected for each capture.

1. EventBridge queries the 32-way sharded DynamoDB schedule index and places one watcher job on the primary check queue. A 180-second conditional claim in the idempotency table and a deterministic schedule/configuration-derived job ID suppress repeat ticks and ambiguous-send duplicates. The dispatcher admits at most 500 new jobs per tick by default, with tenant round-robin ordering within its bounded candidate window.
2. The worker checks regional queue pressure before credit reservation. A capacity or stale-job deferral records that no capture ran, keeps comparison evidence unchanged, and schedules bounded retry jitter. Approximate queue counts fail closed on lookup failure; they are soft admission controls, not leased permits or a measured capacity guarantee. The worker then acquires a unique tenant-scoped watcher lease, reserves one capture credit per selected Region, and freezes the capture configuration, its canonical SHA-256 identity, selected Regions, and per-Region comparison references in a durable run record. Queue replays use that frozen configuration and must still match the watcher's account, lease, status, and revision before dispatch.
3. A same-Region SQS event source invokes the browser Lambda. Tenant-hashed message groups enable fair scheduling on the standard queues; each queue also has long polling, a bounded concurrency mapping, partial-batch responses, five receive attempts, and a DLQ.
4. The regional worker captures, compares against the previous pointer, and writes text, responsive PNGs, previews, and diff overlays to that Region's private bucket.
5. The regional worker acquires a 210-second conditional S3 lease before starting a browser, writes an idempotent two-day result record locally, then sends size-bounded compact metadata to the primary result queue. Results are checked before and after lease acquisition; expired leases use conditional replacement. These controls suppress duplicates but do not establish exactly-once execution.
6. The primary worker validates account, watcher, run, snapshot, Region, responsive profile, evidence key, and configured bucket bindings before storing each Region's first result as a temporary deterministic DynamoDB entity. A conflicting replacement is rejected. It strongly reads every expected result ID before aggregation, so back-to-back deliveries do not depend on GSI propagation. Once all Regions return—or the deadline synthesizes infrastructure failures—it derives one compact snapshot, removes the temporary entities, and evaluates notifications.
7. Customer APIs authorize the snapshot/report metadata first, then return short-lived pre-signed S3 GET URLs. Binary evidence no longer passes through API Gateway and Lambda.

Browser preparation has one maximum 40-second allowance, including prior-session retirement, target validation, proxy startup, extraction and fresh-context launch. The watcher page budget starts once that session is ready and is shared by all three views. Setup and page work stay within a maximum 150-second ceiling; the regional worker also reserves 20 seconds of durable-run time and 25 seconds of Lambda invocation time for retirement and persistence.

Committed incomplete runs emit `capture.run.incomplete` in the primary worker or billing/maintenance log. Two filters feed one `WebWatch/<stage>` metric and alarm. Internal errors and unavailable required comparisons count; target outages and first baseline establishment alone do not.

Target outages consume credits because a browser capture was attempted and produced a customer-visible outcome. CLOVERSIGHT infrastructure failures are refunded. Replayed queue messages reuse the existing run/result and do not reserve credits again.

The queue contract is worker-agnostic. Lambda currently consumes it and scales to zero. A future ECS/Fargate warm worker can consume the same regional queue when measured volume justifies an always-on service, without returning to direct cross-Region Lambda invocation.

## Storage layout and comparison locality

Capture objects use a retention-class, tenant, watcher, Region, and month cohort:

`capture-history/<7|30|90|180|365|indefinite>/<account>/<watcher>/<region>/<YYYY-MM>/...`

Text and images are content-addressed by SHA-256 inside the monthly cohort. Identical content is reused. At most once per day, continued reuse performs an in-bucket metadata copy to refresh the object's lifecycle age without uploading the body. This avoids a new S3 version and COPY request on every high-frequency capture. Finite lifecycle rules include a two-day physical-deletion buffer so the last reference still outlives the exact customer-visible plan horizon. The monthly boundary bounds how long any one key is refreshed. If the prior hash matches, the worker also skips downloading it for comparison.

After the central snapshot commits, its latest healthy comparable evidence is copied or reused under content-addressed `baselines/<account>/<watcher>/<region>/` keys in the evidence's own Region. An unavailable Region or outage retains that Region's last healthy reference, with its actual source snapshot ID and capture timestamp; it must not be mislabeled as evidence from the latest check. The watcher conditionally advances a comparison pointer only if that snapshot is still latest. The current and immediately previous pointer generations remain hot, so queue retries, a partial commit, or lifecycle expiry cannot move the next check onto missing evidence. This rolling comparison pointer is separate from the explicitly approved green snapshot used by the alert/all-clear workflow.

Each regional result reports whether text and responsive visual comparisons completed, and which regional snapshot they used. A reachable capture without a prior reference establishes a baseline; a missing or unreadable comparison remains **Not compared**. A check with unavailable regional captures or incomplete required comparisons cannot automatically cancel an existing incident's notifications. Different Regions can legitimately use different earlier healthy snapshots after an outage or capture failure, so a current page change may cross the configured threshold in only some Regions. The UI reports each actual comparison rather than extrapolating a detected change into Regions that did not establish it.

Incident presentation prioritizes site outages, then trigger phrase matches, then ordinary text/visual changes, while retaining all underlying findings. **Complete site outage** means every selected Region positively reported an outage. **Regional site outage** requires both an outage Region and a reachable Region. If other Regions are unavailable and no reachable Region proves a partial outage, its extent remains unconfirmed. This describes observations from the configured check locations, not universal Internet availability. Repeated findings of the same method across Regions do not become a misleading generic “multiple changes” classification.

Each stored reference includes key, bucket, and Region. The primary DynamoDB item contains only compact comparison/alert metadata, not image or page bodies. The primary Region uses the existing KMS-encrypted snapshot bucket; secondary stacks use private SSE-S3 buckets to avoid cross-Region KMS traffic and key-policy coupling.

## Persistence model

The capture hot path no longer reconstructs all tenants:

- `LookupIndex` returns one account's entities or a bounded collection prefix; routine dispatch and result commits use strong direct watcher/job/snapshot/alert reads and do not load retained history.
- Strong direct reads override eventual GSI copies for the account, watcher, active job, latest snapshot, baseline, open alert, and deterministic temporary capture-result entities.
- An account revision item serializes tenant-scoped mutations, while per-entity whole-value conditions detect conflicts with compatibility commands. An additional condition matches the strongly read account value when the command does not already write/delete the account, so concurrent closure/deletion forces admission to retry against its new state. The revision is sampled before entity reads, so a commit during snapshot assembly makes the expected revision stale and forces a retry.
- `IdentityIndex` resolves a Cognito user to an active team membership without a global scan.
- `ScheduleIndex` uses 32 deterministic watcher shards and 32 capture-deadline shards, with the legacy schedule partition queried during rolling migration.
- Watchers retain `activeCheckJobId` and `latestSnapshotId` pointers for idempotent job claims and O(1) previous-evidence access.
- The first account-scoped read of a pre-0.5.0 tenant performs a strongly consistent compatibility scan, conditionally installs its tenant/identity/sharded index attributes, and writes an index-schema marker. Later reads use the indexes; value-equality conditions prevent the migration from overwriting a concurrent command.

Schema initialization is coalesced and remembered after success only within the current store/table instance; state, revision and authorization reads are not cached. AWS maintenance runs urgent notifications, billing retries/refunds, capture deadlines and closure work every minute. Bulk object, snapshot-metadata and expired-record cleanup runs every 15 UTC minutes; plan history cutoffs still govern access independently.

Billing, notification, closure, report quota admission, and steward compatibility mutations still use the original global coherent transaction adapter. Report job status and mutations now use strong direct/scoped reads, while report input and broader list queries remain eventually consistent account-index views. That is an explicit remaining scaling limit; the high-frequency scheduler, watcher edits, direct evidence authorization, manual-check claim, and capture result path are tenant-scoped, and the routine capture transactions are bounded to direct entities plus active-incident notifications when needed.

Since 0.5.16, billing/notification/deletion discovery uses strongly consistent, paginated collection queries; notification and purge ticks skip the global transaction when no candidates exist. Active mutations and retention sweeps still have the compatibility limit. Snapshot cleanup's 90-row quarter-hour budget cannot sustain a continuous 180,000-check/day account. See the [production review](security-production-review-0.5.16.md) before enabling millions of monthly captures.

## Queue and concurrency invariants

- Lambda and its SQS event source are in the same Region.
- Capture queue initial visibility is 1,200 seconds for a 180-second browser Lambda. An executing uncached capture changes its receipt to 240 seconds; caught failures use bounded retry visibility so recovery can occur before the 900-second durable deadline.
- Result queue visibility is 3,660 seconds for a 600-second worker plus batching window.
- Capture/result mappings use `ReportBatchItemFailures`.
- The shared primary worker reserves at least the configured check-dispatch concurrency plus two bounded result-aggregation slots.
- Browser concurrency is independent of that coordinator: `CAPTURE_RESERVED_CONCURRENCY` defaults to 64 in the primary Region and `REGIONAL_CAPTURE_CONCURRENCY` inherits it unless overridden. These are on-demand ceilings; no provisioned concurrency is enabled. Deployment checks the available regional reservation quota.
- Check, capture, result, and report messages use a bounded tenant-hashed `MessageGroupId` so a noisy account cannot monopolize a standard queue's dwell time.
- A watcher lease prevents overlapping checks and temporarily removes the watcher from the due schedule.
- A configuration revision invalidates stale results.
- A result is accepted once per Region and run; later duplicates are harmless. Individual results are capped before SQS transport and are never accumulated inside the durable check-job item.
- Missing results become `internal_error` at the durable deadline and are refunded.
- Credit exhaustion moves `nextCheckAt` to the next allowance period, removing repeated scheduler churn.
- Paused/draft/deleted watchers have no active schedule-index entry.
- Completed scheduled runs preserve their original interval phase and skip missed slots. Minute-level dispatch and the no-overlap lease still limit achievable cadence; a slow target cannot meet an interval shorter than its processing time.

## Security and privacy boundaries

- Capture roles cannot read Stripe, Twilio, Cognito-management, or response-signing secrets.
- Regional jobs contain only capture configuration and evidence pointers; recipient lists, templates, team profiles, billing data, and audit data are not dispatched.
- Regional buckets block all public access and expose only short-lived signed reads after account authorization.
- Customer and steward identities use separate Cognito pools and route authorization. The steward request log uses its own retained, KMS-encrypted DynamoDB table; the configured platform owner subject and active invitation records govern staff access. See [steward security](steward-security.md).
- Account deletion removes object versions from the primary bucket and every currently configured regional bucket before confirming deletion.
- Before removing a Region from `REGIONAL_CHECK_REGIONS`, purge/decommission its customer evidence through the documented regional-stack procedure; a removed Region is no longer discoverable by the runtime erasure loop.

## Lifecycle and cost controls

- 7- and 30-day classes expire directly after a two-day physical-deletion buffer; customer-visible metadata still ends exactly at the plan horizon.
- 90-day history moves eligible objects to Standard-IA after day 31 and physically expires at day 92.
- 180-/365-day and indefinite history moves eligible objects to Standard-IA after day 31 and Glacier Instant Retrieval after day 90.
- Run-result records expire after two days; generated PDF and HTML report companions expire after seven days.
- Current and previous rolling comparison evidence uses stable, content-addressed per-Region `baselines/` keys; current objects do not expire and replaced versions in the versioned primary bucket expire after seven days.
- ECR expires untagged build remnants after seven days. Tagged deployment and rollback releases remain until an operator verifies that no stage, Lambda version or rollback plan needs their digest.
- AWS currently does not transition objects smaller than 128 KB by default. That is desirable for text/metadata; large PNG evidence receives the storage-class savings.

See `data-lifecycle.md`, `cost-model.md`, and `known-limitations.md` for the operational boundaries.

## Remediation control boundaries (0.5.13)

AWS runtime construction coalesces concurrent initialization, evicts failed initialization promises and refreshes successful dependency graphs after five minutes. Provider secrets refresh through those graphs. Response/integrity and CloudFront-origin signing secrets remain process-lifetime values and require a coordinated environment recycle; overlapping verification keys are not implemented. Authorization and database reads remain fresh. See [secret rotation](secret-rotation.md).

Maintenance task claims, leases, last-success times and bounded retry state live as separate, unindexed operational rows in the primary Core table. Successful quiet ticks emit a positive heartbeat; failed/deferred tasks cannot silently count as healthy. Cleanup shares a 90-item transaction budget across expired classes and preserves current comparison/baseline/incident pointers; full table reconstruction and indexed backlog pagination remain future work.

Account closure now enters an irreversible `purging` phase after its grace period. Operational deletion waits for unsettled billing and confirmed terminal status of a known Stripe subscription, progresses in bounded transactions, preserves partitioned financial exceptions and immutable identity bindings, then waits for Cognito and configured-bucket erasure before claiming a deletion email attempt. Unknown transport outcomes remain ambiguous for operator review. The stewardship closure page exposes unfinished stages; completed transport acceptance does not prove mailbox delivery. See [data lifecycle](data-lifecycle.md), [privacy](privacy.md) and [notifications](notifications.md).

Private report companions share tenant-authorized metadata, prefix checks, download expiry and lifecycle with existing PDFs. HTML is escaped, self-contained and script-free; it preserves Unicode and semantic report tables. Neither monitoring reports nor the limited own-profile export substitutes for a comprehensive person-level access workflow.

Production MFA rules, operational/budget destinations, regional alarm topics and resource tags strengthen the declared IaC. No financial ledger, billing-feed reconciliation, global work-permit subsystem, autonomous spend-hold actuator or approved cost forecast is implemented by these controls. Consult [the audit register](audit-change-register-2026-10-10.md) before extending them.

Resumption batches also obey byte budgets: up to 1 MB of watcher payload in the payment commit and 3 MB in maintenance, with room reserved below DynamoDB’s 4 MB transaction ceiling. Large rule sets can reduce the number resumed per batch.
