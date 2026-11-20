# Security and production review — 0.5.16

Reviewed November 12, 2026, against the supplied 0.5.15 archive. This release contains source changes and local verification, **not an update to your AWS account**. No live credentials, CloudFormation state, billing history or production capture timings were available. Start rollout with [the upgrade guide](upgrade-0.5.16.md).

## Assessment

Cloversight already has useful tenant authorization, server-owned billing amounts, signed provider callbacks, private evidence buckets, indexed capture coordination, credit reservations and DNS-pinned browser egress. The main weaknesses were a scheduler sized below the requested workload, retry timing that defeated recovery, permissive failure paths in secret configuration/address classification, and unreproducible dependency trees.

The patched source is materially stronger, but unrestricted production admission still needs the live gates below. In particular, a Chromium compromise can still reach a shared capture IAM identity, and the present commercial plans cannot fund continuous 250-watcher/two-minute capture workloads. Neither a passing unit suite nor encrypted storage establishes complete browser isolation or a profitable service.

## Findings and changes

| Priority | Finding in 0.5.15 | Change in 0.5.16 | Limit of the fix |
| --- | --- | --- | --- |
| High reliability | Dispatcher admitted at most 20 outstanding checks per minute; primary browser concurrency inherited the two-slot check coordinator setting. 250 checks/120 seconds requires 125 admissions/minute. | Separate capture concurrency, default ceiling 64; configurable dispatch batch 500, check queue admission 500 and capture queue admission 256. Regional ceiling inherits the capture setting. A quota preflight checks reservations before deployment. | These are ceilings and soft queue limits, not measured throughput or guaranteed latency. Slow captures require a higher ceiling. |
| High reliability | Capture queue visibility was 1,200 seconds while a run expired after 900 seconds. A transient persistence/result-send failure could not retry in time. | Keep the initial queue visibility; once capture starts, set its receipt to 240 seconds, longer than the 180-second Lambda timeout. Caught failures use bounded retry visibility. Coordinator/result failures also retry promptly. | SQS is at-least-once. Service outages, repeated throttling, initialization failure before the handler, and exhausted retries can still produce DLQ/deadline failures. |
| Medium cost/reliability | Repeated scheduler deliveries minted different job IDs; concurrent regional deliveries could both start browsers before either persisted a result. | Conditional 180-second DynamoDB dispatch leases, stable scheduled-job IDs, and conditional 210-second S3 capture leases. First persisted result remains immutable. | Ambiguous sends recover after lease expiry. This is duplicate suppression, not exactly-once delivery. Drain old code during rollout because old workers do not acquire the new leases. |
| High conditional security | Missing AWS response-secret configuration could inherit the public local development signing key; origin secret was not explicitly required during runtime construction. | Reject missing, short or known development signing secrets and require a valid origin secret for the API. AWS capture rejects private-target mode. | Normal templates already bind generated secrets. This closes a misconfiguration failure path; it is not evidence that your deployed secret was missing or compromised. |
| Medium potential SSRF | Textual IPv6 checks accepted expanded loopback/unspecified spellings and some special-purpose allocations. | Numeric IPv6 prefix checks, conservative global-unicast policy, explicit documentation/transition exclusions, deprecated IPv4 relay exclusion and correct literal IPv6 DNS handling. | Direct predicate bypasses were reproduced. An end-to-end exploit through the existing DNS-pinned proxy was not demonstrated; DNS normalization may have blocked some variants already. |
| Medium defense in depth | Chromium inherited the parent's AWS/application environment. Capture KMS grants were not service-bound. | Launch with a small native-runtime environment allowlist; constrain capture KMS use to S3 and the configured evidence bucket's encryption context. | Same-UID processes and the disabled Chromium sandbox remain a trust boundary weakness. Environment filtering is not credentialless isolation. |
| Medium defense in depth | Private bucket/queue configuration did not explicitly deny cleartext transport. Internal error details could be returned with a 500 response. | Add TLS-deny policies to all application buckets and queues; retain service-principal/OAC/SES grants. Suppress 5xx diagnostic details. Ignore environment backups and local npm credentials in Git. | Existing SDK paths already use HTTPS. These policies prevent alternative cleartext access; live IAM/resource-policy checks remain required. |
| High dependency hygiene | Root manifest/lock disagreed; both deployed subpackages lacked locks. Registry audit found a high-severity markdown-it advisory in development documentation tooling. | Resolve all three locks from registry metadata; update markdown-it to 14.3.3; require all locks in verification; disable browser-image dependency lifecycle scripts. | Zero registry advisories is not an OS/container scan. The markdown-it finding was in documentation tooling, not the deployed Lambda package. |
| Medium baseline cost | Quiet billing/notification/deletion discovery repeatedly reconstructed all three state tables, including retained capture history. | Strongly consistent, paginated collection queries for discovery; skip full notification/purge work when no candidates exist. | Active compatibility mutations and retention sweeps still reconstruct shared state. The collection queries themselves are not bounded by tenant count. |
| Medium timing | Completion-relative intervals and recurring jitter could stretch a two-minute schedule by another dispatcher tick. | Preserve the scheduled phase and skip missed slots rather than catching up in a burst. Existing in-flight runs use their start time as fallback. | EventBridge still ticks once per minute. A check cannot overlap itself; a target slower than its requested interval cannot achieve that interval. |
| Medium operations | Admission/result queue delays had less direct visibility, and the release packager could include nested node_modules. | Add check/result queue-age alarms, semantic IaC checks and cfn-lint in CI; exclude nested dependency installations from release ZIPs. | Alarm destinations must be confirmed and exercised. |

Relevant implementation: `src/security/runtime-boundary.mjs`, `src/security/ssrf.mjs`, `src/aws/dispatcher.mjs`, `src/aws/capture-lease.mjs`, `src/aws/sqs-retry.mjs`, `src/monitoring/schedule.mjs`, `src/storage/dynamo-store.mjs`, and the primary/regional CloudFormation templates.

## The 250-watcher scenario

Assuming continuously scheduled checks, one credit per watcher per selected Region, and a 30-day month:

| Workload | Captures/month | Credit consequence |
| --- | ---: | --- |
| 250 watchers, every 2 minutes, one Region | 5,400,000 | Business's 100,000 credits cover about 13.3 hours; Scale's 300,000 cover about 40 hours. |
| 250 watchers, every 2 minutes, five Regions | 27,000,000 | Requires Scale's regional-watcher entitlement; its included credits cover about 8 hours. |
| Business maximum regional mix: 100 watchers × 5 Regions plus 150 × 1 | 14,040,000 | Included credits cover about 5.1 hours. |

At the existing Business allowance, 250 one-Region watchers average roughly **108 minutes between checks** over a 30-day month if all are to remain funded. The advertised minimum interval is a capability, not an unlimited monthly allowance. Existing credit exhaustion behavior remains: the application pauses further admission; it does not issue an unapproved overage charge.

At an illustrative 2 GB and 15 billed seconds per capture, using USD 0.0000166667/GB-second, the first workload costs approximately **$2,700/month in browser compute alone**, before all other services and free-tier/tier adjustments. A 70% gross-margin target implies a **$9,000 compute-only price floor**. This is arithmetic for an illustrative workload, not a recommended price or complete bill forecast. At 3 MiB of new evidence per credit, that workload creates about **15.45 TiB/month** before deduplication; retention, transfer, KMS and requests matter considerably.

Do not increase included credits or advertise unlimited two-minute monitoring at $399/$899 on these assumptions. Keep current Stripe Prices/subscriptions unchanged during this infrastructure release. A future high-volume offer needs measured per-capture cost, explicit credit packs or metered overage, a prepaid spending ceiling, storage metering, customer consent and an assisted migration for any existing subscriptions. Scale remains blocked from self-service while its 1 TB entitlement is unmetered.

Run the reproducible calculator with measured values:

```bash
npm run capacity:plan -- --watchers 250 --interval 120 --regions 1 --mean-seconds 15 --p95-seconds 30 --concurrency 96 --credits 100000
```

The default rate is an illustrative input. Supply `--gb-second-usd` for the current Region/architecture/tier; `--mean-mib` and `--margin` are also configurable. The output explicitly lists excluded costs.

A conservative sizing heuristic is `ceil(watchers / interval × p95 duration / 0.7)` per Region:

| p95 total capture duration | Concurrency for 250/120s at 70% modeled utilization |
| --- | ---: |
| 15 seconds | 45 |
| 30 seconds | 90 |
| 60 seconds | 179 |
| 90 seconds | 268 |

This heuristic is deliberately more conservative than average-duration sizing. Measure the entire capture/evidence operation and separately measure result settlement, DynamoDB conflicts and scheduling lateness. The 64-slot default is not a claim that 60-second tails meet the requested cadence. A starting load-test configuration for a measured 30-second p95 is 96 slots per Region, not an automatic production recommendation.

Reserved concurrency adds no standing browser compute charge; it reserves account quota. There is no provisioned concurrency, NAT gateway, load balancer or continuously running ECS service added by this release. Existing WAF, KMS, CloudWatch, DNS, storage and queue polling costs remain. The two additional queue alarms and new lease operations add a small usage/monitoring cost. AWS Budgets alerts are delayed notifications, not a hard spend stop.

## Remaining production gates

1. **Renderer boundary — high:** Chromium still runs without its sandbox under a role that can read/write evidence across tenants in its Region. A strong next design separates a credentialless renderer from a broker holding narrowly scoped job/evidence capabilities, with network enforcement outside the renderer. It requires an end-to-end architecture and migration test; this patch does not pretend environment filtering solves it.
2. **Sustained-volume state access — high for continuous power use:** active notification/billing/erasure compatibility transactions and retention cleanup still load global state. Cleanup deletes at most 90 snapshot rows and 90 other expired rows per 15-minute sweep; that is 8,640/day per sweep, below a continuous 180,000-check/day workload. Account closure/cancellation also tries to update all watchers in one 99-entity transaction and can fail for a 250-watcher account; this needs an account-state fence plus resumable bounded batches. Before selling millions of captures/month, replace global maintenance with indexed/paginated due-work and retention processing that preserves protected comparison/incident pointers. Do not simply enable TTL on snapshots: that could delete an active baseline. Regional writes can also race account erasure; a privacy-generation fence and a final version-aware sweep remain necessary before claiming complete deletion.
3. **Physical spend — high:** logical credit refunds, execution retries and storage do not constitute a monetary ceiling. A durable physical-attempt ledger and independently enforced spend admission are still needed for a strict dollar cap. Keep alarms and conservative ceilings until measured margins support expansion.
4. **External validation:** run the actual Amazon Linux browser image, account/tenant isolation, hostile target and redirect cases, Cognito login/MFA, Stripe/SES/Twilio boundaries, evidence deletion/version purge, rollback and backup restoration in staging. Use a controlled owned target for the burst test.
5. **Abuse and supply chain:** production lacks the staging WAF allowlist by design; review signup abuse and per-account limits separately from shared API throttles. GitHub Actions remain version-tagged rather than full-SHA pinned; protect deployment environments and self-hosted runners. Triage ECR/OS/browser vulnerabilities against the exact promoted digest.
6. **Existing staging exception:** the owner-requested spoofable ChatGPT header allowance is preserved at both WAF layers. It is not authentication and is not enabled for production. Disable the switch if that compatibility exception is no longer wanted.
7. **Secret rotation:** response/origin keys still require coordinated rollout; overlapping key verification is not implemented. Rotate only with the existing documented procedure.

## Verification evidence

- `npm run verify`: **190 tests passed, zero failures/skips**, 167 JavaScript files parsed, static build and extension packaging succeeded, primary/regional IaC source checks passed.
- Original 0.5.15 source, using the resolved package versions: **174/179 tests passed**. Five failures were stale fixtures (unapproved fake checkout host, missing tenant bindings and an old UI label); fixtures were corrected without weakening payment-origin or tenant checks.
- `cfn-lint 1.60.1`: no error-level findings across primary, regional and bootstrap templates. Warnings were excluded from the gate; this does not validate deployed permissions, quotas or replacement behavior.
- Parsed comparison with the supplied templates: all 27 existing table, bucket, user-pool, key and queue definitions are unchanged across primary/regional/bootstrap templates; no existing resource logical IDs or checked physical name fields changed. Six new policies/alarms were added. Live drift/change-set review is still required.
- `npm audit --json` for root, Lambda and browser locked trees: **zero reported vulnerabilities** after the documentation dependency update, at review time.
- New tests exercise a 250-watch dispatch burst, repeat ticks, ambiguous sends, queue-health failure, competing/expired capture leases, visibility scoping, private address variants, secret rejection, browser environment filtering, phase-preserving schedules, collection pagination, quiet maintenance and sizing/quota arithmetic.
- A pattern scan found no AWS access-key IDs, long live Stripe secret keys or private-key PEM blocks in deliverable source. This is a limited pattern scan, not a forensic secret audit.
- Docker/AWS CLI were unavailable here. The matching Playwright browser download returned an invalid/truncated archive, so browser execution was **not verified**. Node 24.22.1 was used locally; deployed Node 22/container and CI matrix acceptance remain required.
- The 250-watch test uses in-memory AWS client doubles and checks application behavior. It is **not** an AWS performance benchmark or a two-minute availability guarantee.

## Sources

- [AWS Lambda reserved concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html): no additional reservation charge, account floor and sizing formula.
- [AWS Lambda SQS configuration](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html): initial visibility, partial batch response and retry recommendations.
- [AWS Lambda SQS scaling](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html): event-source limits and shared reserved capacity.
- [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/): verify inputs for the selected Region and tier.
- [IANA IPv6 special-purpose registry](https://www.iana.org/assignments/iana-ipv6-special-registry): address-range policy basis.
- npm registry audit response linked [GHSA-gfr2-rv44-r23c](https://github.com/advisories/GHSA-gfr2-rv44-r23c) and [GHSA-vfgh-jcmw-g37q](https://github.com/advisories/GHSA-vfgh-jcmw-g37q) for the documentation dependency. Audit responses are included under `docs/review-evidence/`.
