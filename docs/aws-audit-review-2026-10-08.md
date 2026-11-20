# AWS audit review — October 8, 2026

The supplied 24-hour staging bundle demonstrates cold-start capture timeouts and substantial idle maintenance overhead. Release 0.5.11 contains narrow fixes for those issues, additional capture-failure monitoring, safer image retention and corrected audit collection. It also includes the portrait mobile fixes identified in six supplied Chrome screenshots. This review did not execute the application, tests, builds, deployments or AWS commands.

## Decisions and delivery status

| Finding | Evidence | Release action |
| --- | --- | --- |
| Cold preparation consumed the page budget | Two of ten observed regional captures timed out on Mobile after Desktop/Tablet HTTP 200; driver readiness took 13–21 seconds | One bounded setup allowance; shared page budget begins after a fresh session is ready; absolute runtime and persistence reserves remain |
| Idle maintenance reconstructs global tables frequently | 1,440 dispatcher ticks with zero due jobs; 2,102,137 CoreTable read units | Cache only successful schema initialization per instance; bulk retention sweeps every 15 minutes; urgent maintenance every minute |
| Handled capture failures escape invocation-error alarms | Two operational timeouts, Lambda Errors zero | Worker and maintenance log filters feed one new incomplete-run metric/alarm |
| Alarms have no operator destination | Nine existing alarms publish to an unsubscribed OpsTopic; TechnicalAlertsEnabled=false despite configured address | Audit now flags missing confirmation; owner must enable intended alerts and confirm SNS email |
| Image expiry ignores deployed references | Source retains newest three images in repositories shared by stages | Expire only untagged remnants after seven days; retain tagged releases until verified unused |
| Audit command defects | Four CloudFront ARN/name failures and ten ECR input-casing failures | Collector 1.2 fixes inputs, log/metric names, prefixed JSON handling and scan/repository coverage |
| Five Cognito managed-login 400s | Successful logins follow them; pre-token logs show no exception | Cause unresolved; short incident-window probe below if it recurs; no speculative authentication change |
| Persistent management-history gap | Existing account trail is stopped; default history excludes reads and primary scan is capped | Document gap; do not change an unrelated account-wide trail |

Detailed evidence and limits follow. Configuration snapshots, historical log events, source risks and newly authored behavior are distinguished. The bundle has no invoice/Cost Explorer export, business rows or screenshot object bodies. It cannot prove exact savings, universal isolation, end-to-end email delivery or the cause of every historical regional comparison. Existing historical outcomes are not recomputed.

## Mobile changes from the supplied screenshots

The late desktop `132px` watcher-row height overrode responsive record sizing, leaving a short card around content extending far below it. The fixed height now applies only outside phone layouts; mobile records grow with content. Nested table backgrounds/padding are reduced in watcher, dashboard, report, team, action-log and transaction records. Long values wrap.

Dashboard animated metric spans no longer inherit label-sized typography. The uptime percentage stays on one line. The hamburger moves to the right with specificity that survives Pico's button reset. Route headings and report/form cards use more appropriate phone spacing; progress timestamps stack, and profile/plan controls retain width guards.

The watcher editor retains only Publish and Save draft in a compact two-column footer. Local recovery stays available in a disclosure in the scrolling body, updates on autosave/connectivity changes, and no longer reserves permanent footer height. Decorative steps disappear on phones and the intro remains an accessible dialog description. Archive stacks use their own transparent card skin, fit previews to the parent and separate timestamp/incident metadata. Detail archive cards have shorter decorative art and compact spacing. Evidence authorization and signed-URL behavior are preserved.

These are source fixes grounded in the screenshots and reviewed CSS cascade. They have not been rendered or certified on a newly deployed build; owner-operated Chrome portrait checks are listed in [release notes](release-notes-0.5.11.md).

## Runtime evidence and fixes

This review reads the uploaded audit and source passively. No application, test, build, deploy, AWS command or workload was executed.

### Coverage and interpretation

- Audit collector 1.1.0 requested 2026-10-07 22:55:09 UTC through 2026-10-08 22:55:09 UTC. Collection finished 23:03:28 UTC without interruption.
- All 14 collected log-group coverage records say complete, totaling 12,749 log events. The inbound email group has no events. That absence proves neither working inbound delivery nor a fault.
- Source discovery covered 184 resources across six collected stacks (primary, four regional and bootstrap). Metrics are 300-second aggregates. Collection-time queue/configuration samples are not continuous observations.
- Metric IDs restart at `m0` in each batch: join each `batch-N-queries.json` only to its matching `batch-N-page-P.json`. FunctionName and FunctionName+Resource metric series are two views of the same Lambda, not two workloads. Sum statistics give event totals; Maximum statistics for queue gauges give peaks. Do not sum gauges as message counts.
- CloudTrail was write-only (`ReadOnly=false`). us-east-1 stopped at the five-page/250-examined cap, including 100 selected events. Each other Region examined and included 62 events and reached the end. Routine read events/failures and older truncated primary management changes are outside that evidence.
- Detailed WAF, CloudFront access, Cognito pool delivery and S3 access logs were not available/configured in the bundle; AWS Health requires support subscription. No claim of a complete security or delivery audit follows from the collected application logs.

### Confirmed intermittent capture failure

At approximately 20:55 UTC, a single five-Region watcher run used capture image release `0.5.10`, the same source hash in all Regions, a fresh disposable profile, and a shared 30,000 ms watcher budget. Source `capture.mjs` began that budget before importing/extracting the Chromium executable.

| Region | Driver ready, elapsed ms | First run | Second run, approximately 21:31 UTC |
| --- | ---: | --- | --- |
| us-east-1 | 19,564 | CAPTURE_TIMEOUT at 30,001 ms, mobile navigation; desktop/tablet completed | All three profiles, complete at 15,453 ms |
| us-east-2 | 20,578 | CAPTURE_TIMEOUT at 30,002 ms, mobile navigation; desktop/tablet completed | All three profiles, complete at 16,533 ms |
| ca-central-1 | 12,760 | All profiles, complete at 25,260 ms | All profiles, complete at 15,433 ms |
| us-west-2 | 16,918 | All profiles, complete at 29,638 ms | All profiles, complete at 16,253 ms |
| eu-west-1 | 13,727 | All profiles, complete at 26,616 ms | All profiles, complete at 16,895 ms |

Successful desktop/tablet navigations reported HTTP 200. The two mobile failures are incomplete infrastructure captures, not evidence of a WordPress or regional site outage. The later driver's ready times were only 2.72–3.74 seconds. Cold extraction consumed most of the initial 30-second budget and is a direct explanation for this demonstrated intermittent regional evidence loss. The sample has only two watcher runs, so it cannot establish a general regional failure rate or prove the root cause of every historical changed result.

The first run finalized `green` after receiving all five result messages, with two internal-error regional results. This aggregate outcome means no positive alert trigger among chargeable captures; it does not mean all five captures succeeded. Current source distinguishes evidence/comparison completeness and does not clear existing notifications with incomplete comparisons. The second run was complete and the `notification.tier.blocked` event said `recovery_detected`, runtime revision `0.5.10`; that is an intentional stop after recovery, not an SES send error.

Authored fix in `src/monitoring/capture.mjs`: a single maximum 40-second infrastructure setup allowance includes earlier-session retirement, target validation, proxy startup, driver extraction and fresh-context launch. Existing individual startup/validation caps remain. Only after the new session is ready does the configured watcher page budget start; it is shared across Desktop, Tablet and Mobile, not granted once per view. The absolute work ceiling remains at most 150 seconds, including setup. `regional-capture-worker.mjs` also clamps that ceiling to remaining durable-run time minus 20 seconds and actual Lambda invocation time minus 25 seconds, preserving cleanup/evidence-persistence time. Disposable profiles, fail-closed retirement and immutable run/result identities remain intact. Historical results are not recomputed; new checks after deploying the rebuilt image are required.

### Operational alarm blind spot

All observed Lambda Errors and Throttles metrics with data were zero, including the two capture Lambdas that emitted the operational timeouts. The regional worker deliberately converts an operational capture error into an internal-error result and acknowledges its SQS record after persisting/sending it. Consequently Lambda's invocation-error metric cannot detect these capture failures. All log metric-filter inventories were empty.

Authored `capture.run.incomplete` WARN event in primary coordinator finalization. It reports only bounded Region lists plus run/job/watcher/snapshot correlation IDs. `operationalFailedRegions` includes internal errors and expired regional run deadlines. `comparisonUnavailableRegions` includes a reachable Region that had a previous reference but could not finish a required comparison. A first baseline without a prior reference and a positive target outage do not create this operational event. It logs after a new run commits and before subsequent baseline I/O; terminal result replays do not emit another count. Two primary log filters feed the new shared metric/alarm using the existing OpsTopic.

### API and queue evidence

- API access logs contain 156 requests: 136 HTTP 200, three 202, fourteen 404 and three 403; no 5xx. Median observed gateway latency is 158.5 ms, p95 2,027 ms and maximum 3,579 ms. This includes cold starts and is a small, irregular staging sample, not a load test.
- The fourteen 404s were `Snapshot not found` at archived watcher-bound asset routes between 00:03 and 00:54 UTC. Current API configuration was last modified at 19:38:41 UTC, after those failures; the existing 0.5.10 customer snapshot asset route no longer requires a live watcher for archived access. The audit cannot establish that the same 404 defect persists after the later deployment.
- Two 403s were denied steward accounts (`disabled or has not been invited`), and one customer bootstrap 403 said `Account is unavailable`. These application-state denials are not evidence of a service outage; do not relax authorization to remove them.
- All 18 queue configuration samples had zero visible, in-flight and delayed messages. Available queue-visible maxima and DLQ maxima stayed zero. Regional oldest-message maxima reached 28 seconds (us-east-2), 7 seconds (ca-central-1), 33 seconds (us-west-2); these are bounded dwell observations during processing. Capture-result oldest age reached 10 seconds; billing reached one second. No backlog or DLQ accumulation is evidenced in this window.
- Primary coordinator logged ten capture dispatches, two terminal run completions and result acknowledgements. Regional workers each logged two results sent; no binding failure, result conflict, disposable-session cleanup failure or queue record failure was found. This small sample cannot prove universal isolation or successful unobserved workloads.
- Capture Lambda memory peaks were 728–787 MiB while configured memory was 2,048 MiB. Lowering memory based only on those peaks would also change CPU and could worsen the demonstrated extraction latency. No capture memory reduction is justified by this limited evidence.
- Primary Lambda log groups retain 30 days and secondary capture groups 14 days. No unbounded-retention Lambda log group was found.

The `suspected-issues` heuristic file has 48 rows: 17 application 4xx events plus the same 17 gateway 4xx requests, two actual operational timeouts, ten errors printed by the observed target page's JavaScript console, and two Playwright launch-command false positives (matched flag words). It is not 48 independent infrastructure incidents. Repeated target console text is target output and should not be confused with an application or browser-isolation fault.

### Quiet-stage DynamoDB and maintenance overhead

Dispatcher logs show 1,440 minute ticks, all with `due=0`, `dispatched=0`, `maintenanceQueued=true`. Billing/maintenance logs show 1,441 acknowledgements at log-window boundaries; the 300-second invocation metric reports 1,440 in the requested aggregate window. Their small count difference is bucket/window alignment, not duplicate durable billing operations. Dispatcher median handler duration was 1,145.68 ms, billing/maintenance 1,453.31 ms. Current deployed billing memory is 1,024 MiB, dispatcher 256 MiB.

Exact metric-series analysis found 2,102,137 CoreTable consumed read capacity units, 184,432 idempotency-table read units and 46,108 closed-account read units in the 24-hour window; core scan returned-item count was 4,175,473. The remaining global coherent state adapter reconstructs three tables on every `read()`. On an idle maintenance pass there are approximately eight such reads: notification timers twice, billing retry/refund scans, account purge/confirmation scans, snapshot metadata cleanup and expired-record cleanup. This is the principal demonstrated idle overhead; browser captures numbered only ten.

CoreTable `ConditionalCheckFailedRequests` was 11,668. No `dynamo.transaction.conflict` or worker record failure was found in logs. Source `initialize()` submitted a conditional `Put` for the already-existing META row on every read, and caught the expected condition failure. That behavior explains a large portion of the count; do not report 11,668 genuine application transaction collisions. It is not possible to attribute every individual conditional failure from the aggregate alone.

Authored narrow improvements:

1. `DynamoStateStore.initialize()` caches only successful schema-initialization completion within that store/table instance, coalesces in-flight attempts and retries a genuine failure. It does not cache state, revisions, identities, memberships or authorization reads. No-op transaction semantics were left unchanged.
2. Dispatcher marks bulk retention cleanup once every 15 UTC minutes; worker passes that flag to MaintenanceService. All delivery timers/escalations, billing retries/refunds, capture-run expiry and account-closure/asset-erasure/confirmation work continue every minute. Only general history asset cleanup, snapshot-metadata cleanup and expired operational-record cleanup move to the longer cadence. Existing messages and local/default callers retain full cleanup.

The bulk gate removes roughly 1.87 of those eight idle table-reconstruction passes per minute (about 23% of this maintenance scan pattern), not 23% of the entire AWS bill. Bounded physical/metadata cleanup can lag its due time by up to 15 minutes plus queue/service lag; existing customer bootstrap and both snapshot-asset authorization routes still apply exact plan history cutoffs, independent of the cleanup sweep. This remains a deliberate scaling limit: timely notification/billing compatibility scans still use the global state adapter.

The report-only runtime emitted one `capture.durable_regional.disabled` warning at 00:05 even though report generation has no capture queue requirement and acknowledged its one job. Source now suppresses that inapplicable warning only for report-only mode; capture-capable runtimes retain it.

### Collector defects and remaining evidence gaps

Four CloudFront function configuration calls supplied the physical function ARN to `describe-function --name`, which requires the function name; the fabricated log-group paths also contained that ARN. Ten ECR metadata/scan calls used `RegistryId`, `RepositoryName`, `ImageIds`/`ImageId`, whereas those CLI JSON inputs require lower-camel-case keys. The other failed call was AWS Health's subscription-required response. These explain all 15 failed collector AWS calls and should be corrected in the collector, rather than treated as 15 deployed-component failures. Collector 1.2 contains those script corrections.

The bundle does not include object bodies, DynamoDB business rows, Cost Explorer billing, continuous delivery feedback history or complete primary CloudTrail reads. It is insufficient to calculate an exact monthly bill, examine every historical comparison image or prove successful SES delivery. Five Cognito managed-login 400 events require request-context analysis; their cause remains unresolved in this bundle. No infrastructure mutation or retry/redrive is justified solely by these partial management-event summaries.

## Infrastructure, request costs and deployment risks

Evidence window: 2026-10-07 22:55:09 UTC through 2026-10-08 22:55:09 UTC. Collector 1.1.0 completed at 23:03:28 UTC after 8 minutes 19 seconds. The ZIP contains six complete stacks, 184 discovered resources, 14 log groups and 12,749 log events. All 14 log windows are marked complete. CloudTrail us-east-1 was deliberately limited to 250 examined write/management events and is incomplete; the other four Regions each examined 62 events and completed that filtered history window. Read-only management history and business data were intentionally excluded.

No project code, build, test, AWS mutation, deployment or remote invocation was executed during this review. The analysis reads supplied JSON/NDJSON and source only. There is no Cost Explorer, CUR, or invoice export in the supplied evidence, so these are resource/request observations, not a measured dollar bill or a promised savings amount.

### Main measured cost issue: idle maintenance repeatedly scans coherent global state

The dispatcher has 1,440 CloudWatch invocations for the 24-hour window, with application logs reporting zero due watchers and zero dispatched watcher jobs on every cycle. Each cycle nevertheless queues maintenance. Billing has 1,440 metric invocations; its raw log contains 1,441 REPORT lines because REPORT/log boundaries and five-minute metric buckets do not represent identical invocation windows. Dispatcher REPORT median duration is 1,145.68 ms; Billing REPORT median is 1,453.31 ms. Deployment changed during the window, so use the current 1,024-MiB Billing configuration rather than assuming all historical REPORTs used one memory allocation.

CloudWatch exact table-level capacity and scan totals:

| Resource / metric | 24-hour total |
| --- | ---: |
| CoreTable consumed read capacity units | 2,102,137 |
| CoreTable consumed write capacity units | 21,232 |
| CoreTable Scan returned item count | 4,175,473 |
| IdempotencyTable consumed read capacity units | 184,432 |
| IdempotencyTable Scan returned item count | 1,832,793 |
| ClosedAccountsTable consumed read capacity units | 46,108 |
| ClosedAccountsTable Scan returned item count | 0 |
| ScheduleIndex consumed read capacity units | 46,800 |
| CoreTable conditional check failed requests | 11,668 |

Each batch's result IDs are joined only to that same batch's query definitions. The table rows exclude duplicated Source=Customer dimensions; the ScheduleIndex row is separate and must not be silently added to the base table result as though it were a duplicate view. Capacity totals are measured units; Scan returned item counts are rows returned across repeated scans, not unique customers or watches.

Source inspection identifies several full coherent reads and global compatibility transactions in minute-by-minute maintenance. The authored runtime changes are: coalesce/cache successful schema initialization rather than attempting an already-existing META conditional write every read; run snapshot/object/expired-record housekeeping every 15 minutes while retaining the one-minute urgent notification, billing/refund retry, capture-deadline and account-closure work. Therefore the 11,668 conditional failures are not evidence of 11,668 lost transactions or attacks: initialize() deliberately attempted an insert that fails when META exists. Future comparison of these exact metrics is needed to quantify the savings.

Source evidence: `src/storage/dynamo-store.mjs`, `src/aws/dispatcher.mjs`, `src/aws/worker.mjs`, `src/services/maintenance.mjs`. Raw metrics live under `metrics/us-east-1/batch-*-queries.json` and matching `batch-*-page-*.json`.

### Browser memory and concurrency remain appropriate pending a meaningful load sample

Only ten capture Lambda invocations are observed: two per Region. Current captures use 2,048 MiB RAM, 2,048 MiB ephemeral storage, x86_64 and a 180-second Lambda timeout. Maximum observed memory is 728 MiB primary, 732 MiB Ohio, 739 MiB Canada, 732 MiB Oregon and 787 MiB Ireland. Duration/maxima vary with cold initialization. This tiny sample is not a basis for halving RAM/CPU, reducing concurrency, replacing the browser architecture or purchasing provisioned concurrency.

The total of non-DLQ SQS NumberOfEmptyReceives is 111,725. Regional capture queues each show about 17,270 empty receives while receiving only two messages. Primary queues each show approximately 8,600. Lambda pollers, bounded event-source concurrency and 20-second long polling explain quiet polling; this is request overhead, not duplicate captures or a runaway loop. Dropping event-source MaximumConcurrency merely to enable lower idle polling would weaken the deliberate scheduling/reserved-concurrency relationship and risks throttled messages. No such change was made.

All 18 discovered queue/DLQ configurations are empty at collection time; captured DLQ visible message metrics are zero. Source queue visibility remains 1,200 seconds for 180-second captures and 3,660 seconds for the 600-second primary result worker. All capture mappings are Enabled with BatchSize=1 and ReportBatchItemFailures; secondary MaximumConcurrency=4, primary capture=2. Existing bounded concurrency and partial-batch responses are preserved.

### Existing encryption, backup and storage controls are already cost-conscious

SnapshotBucket uses SSE-KMS with BucketKeyEnabled=true. The four secondary evidence buckets use SSE-S3. All queues use SQS-managed encryption. There is no justification for removing encryption or weakening isolation to reduce the observed request costs.

CoreTable, ClosedAccountsTable and StewardAuditTable PITR are enabled. IdempotencyTable PITR is intentionally disabled, with TTL enabled on expiresAtEpoch. Core/account/audit TTL is intentionally disabled because application lifecycle/tombstones preserve business and audit history. Enabling TTL arbitrarily would risk destructive deletion.

The daily S3 metrics show 315,861,039 bytes (about 301.2 MiB) across five evidence buckets. All discovered buckets with available daily metrics total 782,562,961 bytes (about 746.3 MiB), including 464,311,201 bytes in deployment artifacts. These are daily observations, not per-check growth rates, and count retained versions where included by S3's daily metric. Lifecycle exists for evidence, artifacts and inbound mail. Evidence transitions explicitly preserve the 128-KB minimum; primary BucketKeyEnabled already reduces suitable KMS overhead. Static-site buckets have no lifecycle by design and remain private origins. No retention reduction was applied to customer evidence.

### Fixed deployment risk: ECR newest-three policy can delete a still-deployed release

The source bootstrap ECR repository is shared across stages and used `tagStatus:any` with `imageCountMoreThan:3`. Regional deployment wrote the same policy. Each build/copy creates a distinct immutable release tag, while Lambda deployments pin a digest. A fourth staging build can therefore expire a still-active production or rollback release. Image age/count is not proof of disuse. The supplied audit cannot prove that a particular deployed image has been deleted because its ECR image/scan queries failed from collector argument casing, but the source policy is a definite latent risk.

Fixed:

- `infra/ecr/worker-lifecycle.json` expires only untagged build remnants after seven days and retains tagged deployment releases.
- `infra/bootstrap/access.yaml` declares the same lifecycle for the primary managed repository.
- `infra/scripts/build-worker-image.sh` installs that policy before any new image push.
- `infra/scripts/deploy-regional-captures.sh` installs that policy in each secondary repository before copying a new tagged release.

Tradeoff: tagged releases accumulate until explicitly retired, so ECR storage can rise. Preserve every deployed and published-version digest in every stage/Region and required rollback releases; review/delete only releases verified unused. Do not remove the final tag or expire a live digest. No automated purge guesses at disuse. The new policy is safe for releases built and copied by these scripts, which always assign tags; independently deployed untagged images require their own retention review.

Actual deployment-role policy already grants ecr:PutLifecyclePolicy on Resource=*. No IAM permission addition is needed. To keep the bootstrap CloudFormation desired policy consistent, update the existing bootstrap stack once before build; merely running the changed build script would make the old stored bootstrap template show ECR lifecycle drift. Its AWS_DEPLOYMENT_PRINCIPAL_ARN must already be carried forward in private .env.

```bash
aws sso login --profile saas-admin
export AWS_PROFILE=saas-admin AWS_PAGER=""
npm run aws:bootstrap
bash infra/scripts/merge-generated-env.sh .local/bootstrap-outputs.env
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

Official references reviewed 2026-10-08: [Lambda container image lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-lifecycle), [Lambda states and source artifact loss](https://docs.aws.amazon.com/lambda/latest/dg/functions-states.html), [ECR lifecycle rules](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html), [ECR untagged selection](https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html).

### Fixed monitoring blind spot: handled incomplete captures did not increment Lambda Errors

The first five-Region run has CAPTURE_TIMEOUT after about 30 seconds in primary and Ohio while navigating mobile, after successful desktop/tablet HTTP 200 captures. The other three Regions complete. Those operational errors are converted into internal-error result metadata; Lambda Errors stays zero. A second run completes all five Regions. This release corrects the cold browser preparation budget and emits `capture.run.incomplete` only after committed final aggregation for operational failures or an unavailable required comparison; actual target-site outages by themselves do not emit it.

New primary `CaptureIncompleteRunMetric` and `CaptureIncompleteMaintenanceMetric` transform the exact phrase `"capture.run.incomplete"` from WorkerLogGroup and BillingLogGroup into the same WebWatch/STAGE CaptureIncompleteRuns metric. The second group is required because capture-deadline synthesis runs through the Billing maintenance consumer. Phrase matching is deliberate because the current Node Lambda logging mode adds a timestamp/request-ID/severity prefix before JSON. One primary `CaptureIncompleteRunAlarm` triggers on Sum >= 1 over five minutes, missing data notBreaching, publishing to existing OpsTopic. This central metric covers regional outcomes and coordinator deadline synthesis without creating five custom metric/alarm pairs or new cross-Region notification plumbing. This adds one custom metric series and one alarm's ongoing CloudWatch cost; no numeric price claim is made.

### Operational email alert destination is disabled in the deployed configuration

OpsTopic has zero confirmed and zero pending subscriptions. All nine existing alarms publish there, as do SES operational-failure feedback events. TechnicalAlertEmail is configured, but TechnicalAlertsEnabled=false in the actual primary stack. Therefore the empty subscription is consistent with an explicit disabled setting; this is an alert-delivery gap, not an SNS service malfunction. Source defaults/options remain unchanged and no email recipient was invented.

`post-deploy-audit.sh` now inspects confirmed/pending subscribers. It fails when technical alerts are enabled but have no confirmed destination, and warns when disabled/no destination. To receive operational emails, choose/retain the intended TECHNICAL_ALERT_EMAIL, set TECHNICAL_ALERTS_ENABLED=true in private .env, deploy primary, and confirm the AWS SNS subscription email. The source collector also records a clear ops_alerts_without_confirmed_subscriber indicator. SNS configuration alone and an OK CloudWatch alarm do not establish end-to-end mailbox delivery.

### Corrected audit collector defects, distinct from AWS failures

14 of the 15 failed AWS CLI calls are deterministic collector input defects:

- Four CloudFront DescribeFunction calls passed ARN as function Name. That also produced invalid function-log-group paths and function metric dimensions. The collector now derives the function name from the physical ARN and uses `/aws/cloudfront/function/NAME` in us-east-1.
- Ten ECR image/scan calls used PascalCase JSON keys. ECR API input requires lowerCamel `registryId`, `repositoryName`, `imageIds` / `imageId`. These are fixed.
- The remaining AWS Health call failed SubscriptionRequiredException; this is unavailable evidence because of support-plan permissions, not an application outage.

Collector 1.2.0 also captures exact deployed worker repository configuration/lifecycle, identifies auto-expiry of tagged worker images, reports missing readable scan results, parses prefixed console JSON for event/level summaries, and applies secret-key scrubbing to those JSON bodies while retaining the log prefix. It registers CLOVERSIGHT custom metrics from exact stack-owned alarm definitions, so future audits collect CaptureIncompleteRuns. Existing CloudTrail page/time caps are unchanged. No new logging, scan, deployment or IAM mutation is performed by collection.

CloudFront function logs can legitimately be absent because the current rewrite functions have no console output. CloudFront access logging, WAF full logs and Cognito detailed log delivery are not configured in the evidence; there is no claim that their missing logs prove good or bad behavior. Enabling all full-request log sinks would add cost and sensitive data collection without solving the specific measured problem, so it was not done automatically.

Official API references reviewed 2026-10-08: [ECR DescribeImages JSON](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DescribeImages.html), [ECR scan findings JSON](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DescribeImageScanFindings.html), [CloudFront function log naming](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-logs.html), [CloudWatch metric filter patterns](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).

## Security and notification review

Reviewed the uploaded audit `webwatch-staging-audit-20261008T225509Z-gvf4x47x` against the preceding 0.5.10 source and the authored 0.5.11 changes. This is a read-only assessment of a finite observation window; no live security certification is implied. No app code, builds, tests, AWS commands or deployments were executed.

### Observation window and limits

The collector ran from 2026-10-08 22:55:09 UTC until 23:03:28 UTC and requested the preceding 24 hours, ending at 22:55:09 UTC. It finished normally. Management history uses `ReadOnly=false`, five pages per Region and a shared time budget. The primary Region reached its page limit, and read-operation failures were excluded. Existing full CloudFront/WAF request logs and detailed Cognito delivery were not configured. This evidence cannot establish absence of unauthorized access, read failures or incidents outside the retained window.

### Findings requiring action or attention

#### 1. Technical notification delivery is disabled

The primary stack's `TechnicalAlertsEnabled` parameter is `false`; `TechnicalAlertEmail` is already configured. The `OpsTopic` has zero confirmed and zero pending subscriptions, and `subscriptions.json` is empty. All nine collected CloudWatch alarms publish to that topic. The SES transactional event destination also publishes delivery/bounce/complaint feedback to it. Their configured notifications currently have no subscribed recipient.

Relevant evidence:

- `configuration/us-east-1/stacks/webwatch-staging-6fed292193/stack.json`
- `configuration/us-east-1/resources/OpsTopic-arn_aws_sns_us-east-1_807434077491_webwatch-staging-OpsTopic-TGlBAPEocLfh-6a1eb037e6/topic.json`
- The same directory's `subscriptions.json`
- Collected `*/alarm.json` files and SES `event-destinations.json`

The existing IaC already creates `OpsEmailSubscription` under the technical-alert condition. Set `TECHNICAL_ALERTS_ENABLED=true` in the private `.env`, preserve or intentionally select `TECHNICAL_ALERT_EMAIL`, deploy the primary stack, and confirm the SNS subscription email. A post-deploy audit should distinguish explicitly disabled notifications, an unconfirmed subscription, and an unexpectedly empty active topic. Do not silently switch the setting or choose another recipient.

#### 2. The existing account CloudTrail trail is stopped

The only collected trail status is `IsLogging=false`, with logging stopped in January 2021. This is an older account-level trail, outside this application's CloudFormation templates. Current management history still supplied events, but there is no evidence in this bundle of an active persistent trail. Report this account-level visibility gap; do not automatically restart or repurpose a trail belonging to another project.

Evidence: `cloudtrail/us-east-1/status-arn_aws_cloudtrail_us-east-1_807434077491_trail_After_Emequip_com_start-f746c2b931.json`.

#### 3. Five managed-login 400 responses have an unresolved cause

Retained management history contains five customer Cognito `login_POST` events with `errorCode=400`, `errorMessage="Unexpected exception"` at 16:04:36, 18:25:30, 18:25:33, 18:26:02 and 18:27:16 UTC on October 8. The same retained history contains successful `login_POST` responses at 18:26:07, 18:27:24 and 18:27:48 UTC. The observed customer app client uses a public client with the expected code flow, callback URL and scopes. Both pre-token Lambda log groups contain normal invocation records without exceptions during the requested window.

There is no evidence-supported app-code change for these errors. The bundle does not identify the underlying reason. If this recurs, record the exact managed-login browser error and UTC time. Collect only a short surrounding interval of `login_POST` history, alongside any pre-token Lambda exceptions, rather than repeating an account-wide audit.

Example bounded command, with the two timestamp placeholders replaced by a ten-minute interval around a fresh occurrence:

```bash
aws cloudtrail lookup-events --profile saas-admin --region us-east-1 --lookup-attributes AttributeKey=EventName,AttributeValue=login_POST --start-time "<UTC-start>" --end-time "<UTC-end>" --max-items 20 --output json --no-cli-pager > cognito-login-events.json
```

The event contents can contain identifying request context; keep the result private. Do not attribute the failures to WAF, credentials, browser cookies or pre-token logic without the corresponding evidence.

#### 4. Detailed request visibility is limited by current configuration

All three distributions have legacy standard access logging disabled, and no v2 delivery sources were returned. Neither WAF ACL has a readable full-log delivery configuration. Cognito detailed log delivery is absent. WAF samples are bounded recent samples, not a complete request ledger. The API access log and Lambda logs remain useful, but do not replace those records. No additional logging resources should be installed speculatively without considering retention and expected request volume.

#### 5. Fifteen collection errors are mostly collector defects, not app failures

- Four CloudFront `DescribeFunction` calls used a full ARN where the API requires a function name; the function log-group paths were constructed with that ARN too.
- Ten ECR policy calls failed local parameter validation because the collector supplied incorrect argument names.
- AWS Health returned `SubscriptionRequiredException`.

Missing bucket policies for private snapshot/regional/artifact buckets and missing Lambda resource policies for SQS-invoked functions are not by themselves exposures or broken triggers. Their same-account IAM permissions and event-source mappings govern the intended access path. Empty routine log windows are also not proof of component health.

### Controls observed in this bundle

- All ten collected S3 buckets have all four Block Public Access settings enabled. Each collected bucket has server-side encryption configured. The primary snapshot bucket uses its app KMS key and S3 Bucket Keys; other buckets use AES256 server-side encryption.
- Public/customer/steward static bucket policies permit CloudFront service access only from the configured distribution ARN(s). The receipt bucket permits SES writes from the same account to the intended `raw/` prefix.
- The app KMS key is enabled and automatic rotation is enabled. CloudWatch alarm and SES feedback publisher grants are restricted by source account and corresponding alarm/configuration-set ARN conditions.
- Core, closed-accounts and steward-audit tables have PITR enabled. The TTL-oriented idempotency table has PITR disabled; that is the current source design rather than evidence of backup drift.
- All collected queues use SSE-SQS and configured DLQs for live work queues. The lack of a queue resource policy is not a failure for the same-account identity-policy path.
- Customer and steward JWT authorizers use distinct issuer/pool and client audience pairs. Private routes have JWT authorizers; deliberately public webhook/response/asset-link endpoints use their separate application checks in source.
- Capture roles are restricted to their capture evidence, intended baseline fallback prefixes, capture queues and result delivery. They have no Stripe/response-secret access. General API/worker roles remain shared across accounts; application account checks, not IAM per-tenant partitions, enforce the tenant boundary.
- Customer/steward pools both use `MfaConfiguration=OFF`, matching the deliberate staging configuration. Steward MFA remains a prerequisite before exposing real customer/support data, as documented in the existing security guide.
- Both staging WAF ACLs retain the explicitly requested any-IP ChatGPT header exception. The exception is spoofable, documented as a perimeter compatibility rule, and must not be described as cryptographically authenticated OpenAI traffic. Preserve the owner-requested behavior.
- The certificate is issued, its domain validations succeeded and its observed expiry is March 14, 2027. No certificate expiry issue is evidenced in this bundle.
- Primary log retention is 30 days and regional capture retention is 14 days. All collected alarms were `OK` at collection time; that state does not imply message delivery to an operator when the topic has no subscribers.

### IAM review boundary

Runtime policies generally bind resources to the application tables, buckets, secrets, queues and log groups. Deployment and CloudFormation execution roles retain broader service/resource permissions; their trusted human and CloudFormation access paths are separate from runtime roles. A permissions-boundary or organization-wide least-privilege redesign is outside this evidence-backed patch. No broad admin managed policy was attached to the runtime roles in the collected role data. This statement does not certify the wider AWS account or grant a tenant-dedicated IAM sandbox.
