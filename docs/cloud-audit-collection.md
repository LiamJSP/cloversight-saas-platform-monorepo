# Collect AWS infrastructure evidence

`infra/scripts/collect-cloud-audit.sh` collects a timestamped ZIP for offline investigation. It is a standalone Bash script with an embedded Python standard-library collector. It does not import or execute CLOVERSIGHT, install dependencies, run tests, build images or deploy. AWS CLI v2 and Python 3.9+ are the only dependencies. No npm installation is needed to use the script directly.

Use the existing source SSO profile `saas-admin`. The collector never assumes the deployment role automatically, requests new IAM privileges or enables logging. Every AWS request explicitly selects the profile and region. It clears inherited static/assumed-role credential variables only in its AWS subprocess environment so an old terminal role session does not replace the selected SSO identity.

## Collect and return the ZIP

Run from the project root with your existing private `.env` present. The collector parses only literal allowlisted deployment settings; it never sources `.env`, includes it in the ZIP or evaluates shell substitutions. Explicit command-line options override defaults. Deployed `AvailableCheckRegions` also supplements region discovery unless `--regions` is specified.

```bash
aws sso login --profile saas-admin
bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --hours 24 --include-s3-access-logs
```

Allow the command to finish. It prints the exact **Audit ZIP** path. Upload that cloud-evidence ZIP for investigation; the project source ZIP is a different artifact. By default, both the ZIP and its evidence directory are under `.local/cloud-audits/`. The output is private locally (directory mode 0700, ZIP mode 0600), and each run uses a unique name without replacing previous evidence.

For a longer lookback:

```bash
bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --hours 72 --include-s3-access-logs
```

For an exact incident window, use UTC (`Z`) or an explicit offset. Halifax's 2026-10-08 offset is `-03:00`:

```bash
bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --since '2026-10-08T12:00:00-03:00' --until '2026-10-08T18:00:00-03:00' --include-s3-access-logs
```

To run the separately downloaded script from a project directory:

```bash
bash /absolute/path/collect-cloud-audit.sh --project-root "$PWD" --profile saas-admin --hours 24 --include-s3-access-logs
```

To specify a stage without relying on `.env`:

```bash
bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --stack webwatch-staging --stage staging --region us-east-1 --regions us-east-1,us-east-2,us-west-2,ca-central-1,eu-west-1 --hours 24 --include-s3-access-logs
```

Collector 1.2 uses bounded CloudTrail history by default: AWS filters `ReadOnly=false`, then the collector examines at most **5 pages / 250 events per region**, newest first. A **60-second shared scanning budget** also limits the history section across all regions. This budget excludes trail-configuration reads and other collection sections; it is not a one-minute limit for the entire collector. Broad read-event history is usually unnecessary for an initial runtime-log audit.

To omit CloudTrail history entirely while retaining runtime logs, metrics and trail configuration:

```bash
bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --hours 24 --skip-cloudtrail
```

Full options:

```bash
bash infra/scripts/collect-cloud-audit.sh --help
```

Only use broader CloudTrail history for a targeted investigation. This includes read events while keeping both limits:

```bash
bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --hours 2 --cloudtrail-mode all --max-cloudtrail-pages 10 --cloudtrail-budget-seconds 60
```

Removing both limits requires explicitly supplying `--max-cloudtrail-pages 0 --cloudtrail-budget-seconds 0`; routine audits should retain them. The default filter omits routine read events **including read-operation failures**. CloudWatch runtime errors, alarms, DLQs and current configuration remain collected. CloudTrail's `complete` field refers only to its selected mode/window, and caps or budget exhaustion are recorded as collection gaps.

If collector 1.0 is already scanning thousands of CloudTrail events, press **Ctrl+C once** and allow its ZIP packaging to finish. Its completed CloudWatch sections remain useful; upload that partial ZIP rather than starting the entire collection again. Version 1.1 also writes per-region CloudTrail coverage in a `finally` block when interrupted.

## Collected evidence

| Component | Evidence |
| --- | --- |
| Primary, nested, regional and bootstrap stacks | Resource inventory, current status, deployment events and already-recorded drift findings. No new drift detection is started. |
| All stack Lambda functions | API, dispatcher, worker, billing/maintenance, reports, browser capture, inbound email and both Cognito pre-token functions; CloudWatch events, logs configuration, current health, concurrency, event-source mappings, policy, code hash and resolved image digest. Lambda settings include only selected nonsecret operational environment fields. |
| Regional capture | Existing matching regional stacks discovered separately in every configured region; their queues, capture functions, bucket settings and logs. Missing stacks are explicit gaps. |
| SQS and DLQs | Current attributes, redrive policies, queue depths and historical age/depth/send/receive/delete metrics. Messages are never received or deleted, including from DLQs. |
| API Gateway | Stages, throttles, routes, integrations, authorizers, access-log destination and log events, latency and error/count metrics. |
| CloudFront and edge functions | Distribution state, origins, caching, WAF attachment, invalidation metadata, certificate metadata, live function configuration and available function logs/metrics. Both legacy and standard logging v2 delivery settings are inspected. |
| WAF | ACL rules, IP allowlists, full-log destination configuration, available CloudWatch logs and recent bounded request samples. Samples are a separate, smaller time window. |
| Cognito | Pool, domain, MFA, client and log-delivery configuration; exported CloudWatch events where configured, pre-token Lambda logs, metrics and matching CloudTrail management events. No user directory is exported. |
| DynamoDB | Table/index status, encryption, PITR and TTL settings; discovered table/index/operation metrics, throttles and capacity use. No customer records are scanned. |
| S3 | Encryption, public access, policy, versioning, lifecycle, notification and access-log settings; available request/storage metrics. Capture screenshots, inbound emails and application objects are not copied. |
| SES/SNS | SES account/sending state, stack identities, transactional configuration sets and feedback destinations, active receiving rules, SNS subscriptions and available SNS delivery logs/metrics. Account-level SES metrics are identified by their empty dimension list. |
| IAM, KMS and secrets | App/bootstrap roles and policies, encryption key metadata/policy/rotation and secret metadata. Secret values and Lambda deployment download URLs are excluded. CloudFront origin header values are redacted. |
| CloudWatch | Alarm state and history; app-scoped metric inventories and time series. Metric queries are retained beside their paginated results. |
| CloudTrail | Bounded recent non-read management events by default; exact app resource matching and app-role/caller failures. Existing trail status and event selectors remain collected. History covers at most 90 days; all-event mode is explicit. |
| DNS, certificates, budgets, AWS Health | Exact app DNS records from the stack's hosted zone, certificate validity, configured budget state, and available regional service incidents. Health API access can depend on the support plan. |

The optional `--include-s3-access-logs` downloads text logs from discovered logging destinations. It selects objects by **delivery `LastModified` time**, which can differ from the request timestamp. The default is at most 1,000 downloaded objects per destination; `--max-s3-log-objects 0` removes the cap. WAF prefixes are bound to the exact account, region and ACL. Legacy CloudFront prefixes are bound to the distribution ID. Unsupported formats, unresolvable paths and caps are recorded as gaps. Firehose payloads, Cognito S3 authentication logs and CloudFront real-time Kinesis streams are not downloaded by this collector.

## Reading the bundle

Start with:

| File | Purpose |
| --- | --- |
| `manifest.json` | Identity, UTC window, versions, collection counts, interruption state and selected caps. |
| `collection-gaps.json` | AccessDenied, timeouts, disabled/missing logging, missing stacks, empty windows, unsupported destinations and incomplete pagination. |
| `indicators.json` | Nonempty DLQs, alarm states, unsuccessful function/stack updates, disabled mappings and matching CloudTrail errors. These require interpretation, not automatic repair. |
| `log-coverage.json` | Coverage and completeness per log group, retained window, event counts and structured event names. |
| `cloudtrail-coverage.json` | Selected mode, examined/included event counts, page caps and completeness per region, including interrupted work. |
| `logs/suspected-issues.ndjson.gz` | Heuristic error/warning/HTTP-error excerpts with region, log group, event ID, stream and timestamp. |
| `logs/REGION/GROUP/events.ndjson.gz` | All collected events for that group, with known secrets redacted; full pagination by default. |
| `commands.ndjson` | Read operations, selected regions, results and failures. No credential values are included. |
| `SHA256SUMS.txt` | Checksums of the collected files before ZIP packaging. |

The suspected-issues index can include expected access rejection, target-site outages, retries or messages discussing an error without actually encountering one. It is not a health verdict. Missing data or a blank error index cannot establish that a component is healthy. Late-arriving logs can appear in a later collection even for the same event-time window.

Current configuration and queue depths are collected at different instants; the historical window applies to log events and metrics, not a transactionally consistent backup of infrastructure state. Stored CloudFormation drift findings may be old. The collector does not trigger a new scan.

No historical data can be recovered from logging that was never enabled, retention that already expired, or feedback delivered only to SNS email. CloudTrail event-history lookup does not export S3/DynamoDB data events. Existing trail selectors show whether separate data-event evidence might exist for targeted follow-up.

Known secrets, JWTs, authorization/cookie headers, payment keys and presigned-link credentials are redacted before writing evidence. This is best effort: operational logs can still contain emails, IP addresses, URLs and account IDs. Treat the ZIP as private diagnostic evidence, not a public attachment.

## Failures and return codes

The collector continues after individual read failures so that one missing permission does not prevent collecting other components. It does not change IAM to repair its own permissions. AWS read calls and metric retrieval may incur normal AWS charges.

- `0`: reached the end without failed CLI requests; still inspect collection gaps, including disabled or empty logging.
- `2`: reached the end, but one or more requests failed. A ZIP is still produced; this can reflect missing permissions, an older CLI operation or unavailable AWS Health access rather than an app defect.
- `1`: collection stopped early, including missing SSO identity, wrong account or an unreadable primary stack. Partial diagnostic evidence is packaged when output storage remains available.
- `130`: interrupted with Ctrl+C; partial evidence is retained and packaged. A forced kill or full disk can prevent packaging.

Return the ZIP even if some APIs were denied. The failure metadata tells us exactly which targeted read commands are needed next. No deployment or watcher pause is required to run this collector.

## AWS API references

Implementation references checked on 2026-10-08:

- [CloudWatch Logs FilterLogEvents](https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html): empty pages can still have a continuation token.
- [CloudWatch GetMetricData](https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html): batched metrics, pagination and series status.
- [CloudTrail LookupEvents](https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html): regional management-event history and the 90-day boundary.
- [WAF GetSampledRequests](https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-sampled-requests.html): samples cover at most the recent three hours, not the entire audit window.
- [CloudFront logging v2](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html): delivery sources/connections/destinations are distinct from legacy distribution logging.
- [CloudFront metrics](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html) and [edge function logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-logs.html).

This collector was authored through source/API-documentation review. It was not executed against AWS or run locally during the source-authoring session.

## Collector 1.2 corrections

The supplied October 8 bundle was collected by 1.1. Its 15 failed AWS calls comprise four malformed CloudFront function-name arguments, ten malformed ECR JSON inputs, and one unavailable AWS Health request. Version 1.2 fixes the first fourteen, uses correct function log groups/metric dimensions, collects deployed repository lifecycle configuration and the stack-owned CLOVERSIGHT custom metric, and scrubs/summarizes JSON bodies inside prefixed Lambda console records. CloudTrail limits are unchanged. A missing confirmed OpsTopic subscriber and automatic expiry of tagged worker images are now explicit indicators. See the [audit review](aws-audit-review-2026-10-08.md) for the existing bundle's coverage limits; no full rerun is needed merely to replace it.
