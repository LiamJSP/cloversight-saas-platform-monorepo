# Operations runbook

For a read-only ZIP of primary/regional AWS logs, metrics and infrastructure evidence, use the [cloud audit collection guide](cloud-audit-collection.md). Run `bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --hours 24 --include-s3-access-logs` after SSO login. No deployment, project execution or watcher pause is required.

## Daily

- Review API, dispatcher, worker, capture, and SES errors, plus Twilio errors when the optional SMS capability is enabled.
- Inspect check, capture, capture-result, billing, report, and regional capture DLQs; preserve failed payload metadata before redrive.
- Review failed, pending, and `reconciliation_required` financial operations.
- Review notification failures and inbound reply rejections.
- Review accounts entering the closure grace period.
- Confirm primary/regional evidence lifecycle, per-plan capture-credit use, and storage growth.

## Weekly

- Reconcile internal transactions with Stripe invoices, payments, refunds, disputes, and payouts.
- Review high-duration/high-byte pages and capture timeout rates.
- Review regional queue age/depth, result latency, internal-error refund rate, target-outage rate, and monthly content-dedupe effectiveness.
- Review SSRF/egress proxy rejections and abuse indicators.
- Sample owner-visible steward request activity and mutation reasons; review suspicious-activity alert delivery failures and pending audit entries. See [steward security](steward-security.md).
- Review WAF allow-list drift and access needs.
- Review staging WAF blocked requests and IP-set allow matches for unexpected volume or drift.
- Confirm DynamoDB PITR, S3 versioning/lifecycle, and alarms.

## Monthly

- Complete the finance close and reconcile provider payouts to RBC deposits.
- Review Canadian/US tax-nexus metrics and active registrations.
- Restore a DynamoDB PITR copy in a non-production namespace.
- Exercise one account closure and cancellation before purge.
- Review plan utilization, browser seconds, storage, SMS, and unit economics.
- Review IAM, Secrets Manager versions, Cognito users, and staff access.
- Sweep expired replay/idempotency records through maintenance.

## Financial incident priority

1. Pause financial queue consumption when amount, customer, idempotency, or provider state is uncertain.
2. Do not create a replacement transaction after an ambiguous provider response.
3. Retrieve and reconcile the provider object using stored operation/idempotency references.
4. Keep ambiguous-success records in `reconciliation_required` until controlled staff repair.
5. Preserve transaction, invoice, payment, refund, event, request, and audit IDs.

## Monitoring incident priority

1. Pause affected check queues without deleting messages.
2. Disable new watcher publication if baseline or storage integrity is uncertain.
3. Preserve captures, correlation IDs, queue receipt data, and logs.
4. Never promote a changed baseline merely to clear an alert.
5. Restore from the last trusted green capture only after validating incident history.

## Regional capture queue triage

The coordinator is durable: do not invoke regional Lambdas directly and do not delete queue messages to make an alarm disappear. Check the primary queues first, then the exact regional stack. Every direct command names the `saas-admin` profile.

```bash
STACK_NAME=webwatch-staging
AWS_REGION=us-east-1
CAPTURE_QUEUE_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`CaptureQueueUrl`].OutputValue|[0]' --output text --region "$AWS_REGION" --profile saas-admin)
CAPTURE_RESULT_QUEUE_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`CaptureResultQueueUrl`].OutputValue|[0]' --output text --region "$AWS_REGION" --profile saas-admin)
aws sqs get-queue-attributes --queue-url "$CAPTURE_QUEUE_URL" --attribute-names All --output json --region "$AWS_REGION" --profile saas-admin
aws sqs get-queue-attributes --queue-url "$CAPTURE_RESULT_QUEUE_URL" --attribute-names All --output json --region "$AWS_REGION" --profile saas-admin
aws logs tail "/aws/lambda/webwatch-staging-capture" --since 2h --format short --region "$AWS_REGION" --profile saas-admin
REGIONAL_REGION=us-west-2
REGIONAL_STACK=webwatch-staging-regional-us-west-2
REGIONAL_QUEUE_URL=$(aws cloudformation describe-stacks --stack-name "$REGIONAL_STACK" --query 'Stacks[0].Outputs[?OutputKey==`CaptureQueueUrl`].OutputValue|[0]' --output text --region "$REGIONAL_REGION" --profile saas-admin)
aws sqs get-queue-attributes --queue-url "$REGIONAL_QUEUE_URL" --attribute-names All --output json --region "$REGIONAL_REGION" --profile saas-admin
aws logs tail "/aws/lambda/webwatch-staging-regional-capture" --since 2h --format short --region "$REGIONAL_REGION" --profile saas-admin
```

Interpretation:

- `capture.job.dispatched` proves the primary worker resolved and wrote the Region's deterministic queue.
- `capture.result.sent` proves capture/comparison evidence was persisted locally and compact metadata reached the primary result queue.
- `capture.result.resent` is an idempotent replay, not another billable capture.
- `capture.run.completed` proves the primary transaction finalized the run.
- `CAPTURE_DEADLINE_EXCEEDED` is an internal failure and refunds that Region's reserved credit.
- A `target_outage` result is a completed billable attempt and can open an outage alert.
- Do not redrive a capture DLQ until the cause is fixed; the local run-result record makes a successful replay idempotent.

## Missed email notification triage

Use the check time and notification recipient to distinguish “no notification was created”, “SES rejected the API request”, and “SES accepted the message but delivery later failed”. Every direct AWS CLI command below deliberately names the `saas-admin` profile.

```bash
STACK_NAME=webwatch-staging
AWS_REGION=us-east-1
WORKER_FUNCTION=$(aws cloudformation describe-stack-resource --stack-name "$STACK_NAME" --logical-resource-id WorkerFunction --query 'StackResourceDetail.PhysicalResourceId' --output text --region "$AWS_REGION" --profile saas-admin)
CORE_TABLE=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`CoreTable`].OutputValue|[0]' --output text --region "$AWS_REGION" --profile saas-admin)
SES_FROM=$(aws lambda get-function-configuration --function-name "$WORKER_FUNCTION" --query 'Environment.Variables.SES_FROM_ADDRESS' --output text --region "$AWS_REGION" --profile saas-admin)
aws lambda get-function-configuration --function-name "$WORKER_FUNCTION" --query 'Environment.Variables.{EmailProvider:EMAIL_PROVIDER,SesRegion:SES_REGION,SesFrom:SES_FROM_ADDRESS,SesConfigurationSet:SES_CONFIGURATION_SET}' --output table --region "$AWS_REGION" --profile saas-admin
aws sesv2 get-account --query '{ProductionAccessEnabled:ProductionAccessEnabled,SendingEnabled:SendingEnabled,EnforcementStatus:EnforcementStatus,Daily:SendQuota.Max24HourSend,Rate:SendQuota.MaxSendRate,Sent24h:SendQuota.SentLast24Hours}' --output table --region "$AWS_REGION" --profile saas-admin
aws sesv2 get-email-identity --email-identity "${SES_FROM#*@}" --query '{Verified:VerifiedForSendingStatus,VerificationStatus:VerificationStatus,DkimStatus:DkimAttributes.Status,MailFromStatus:MailFromAttributes.MailFromDomainStatus}' --output table --region "$AWS_REGION" --profile saas-admin
aws sesv2 get-suppressed-destination --email-address 'liam+test@redcloversoftware.ca' --output json --region "$AWS_REGION" --profile saas-admin
aws logs tail "/aws/lambda/$WORKER_FUNCTION" --since 2h --filter-pattern 'notification' --format short --region "$AWS_REGION" --profile saas-admin
aws dynamodb scan --table-name "$CORE_TABLE" --filter-expression '#collection = :collection' --expression-attribute-values '{":collection":{"S":"notifications"}}' --projection-expression 'entityId,#value' --expression-attribute-names '{"#collection":"collection","#value":"value"}' --output json --region "$AWS_REGION" --profile saas-admin
aws dynamodb scan --table-name "$CORE_TABLE" --filter-expression '#collection = :collection' --expression-attribute-values '{":collection":{"S":"alerts"}}' --projection-expression 'entityId,#value' --expression-attribute-names '{"#collection":"collection","#value":"value"}' --output json --region "$AWS_REGION" --profile saas-admin
```

Interpretation:

- On the durable path, `capture.run.completed` proves regional results reached alert evaluation; `notification.tier.blocked` names the application-state gate when delivery does not start. `runtimeRevision: 0.5.9` identifies the daily notification budget and regional escalation implementation; `transportRevision: 0.5.0` identifies the unchanged SES API transport. An older runtime revision indicates the current release has not reached the notification worker. The compatibility engine can also emit `monitor.alert.notification_evaluating`.
- `roundOpenedReason: new_change_after_completed_round` with an incremented `notificationRound`, `tierIndex: 0`, and `newlyOpened: true` proves a separately detected material change advanced a terminal incident into a fresh notification round. It should be followed by `notification.tier.started` and then an SES acceptance or rejection. The transition is deliberately deferred while a current-round notification is `sending` or `retry_scheduled`.
- `notification.tier.zero_attempt_repaired` means an existing incident had durable proof of zero provider attempts and was safely reclaimed. It must be followed by `notification.tier.started` and either an SES acceptance or rejection.
- No `monitor.alert.notification_evaluating` event for a check whose stored outcome is `changed` or `outage` means the deployed worker predates 0.3.57 or the check completed through an unexpected path. Inspect `monitor.check.completed`, `monitor.alert.notification_failed`, and the worker-record events for that check.
- A changed check opens one incident rather than one alert per check. While an escalation is active, later changed checks refresh that incident without creating duplicate mail. Each configured level advances once, and no timer restarts level 1. A different durable change fingerprint after the sequence is terminal starts the next notification round; an identical continuing outage or banned phrase does not. Maintenance removes legacy `nextReAlertAt` values, repairs stale policy snapshots from the watcher without rewinding `currentTierIndex`, and derives a missing `nextEscalationAt` from durable tier delivery evidence. Confirm `notificationRound`, `notificationRoundOpenedReason`, `currentTierIndex`, `notificationDispatch.id/status/tierIndex`, `nextEscalationAt`, `notificationDelivery.attemptedAt`, and the absence of `nextReAlertAt` when diagnosing delivery order.
- `notification.delivery.failed` or `notification.email.ses.rejected` contains the AWS error code and request ID; fix that exact SES/IAM/configuration-set error before retrying.
- `ProductionAccessEnabled=false` means the SES account is still in its sandbox. Every destination must then be separately verified. A `MessageRejected` naming the recipient is not a deliverability or application failure: verify that email identity for a staging test, or request SES production access before sending watcher alerts to arbitrary customers.
- `notification.email.ses.accepted` plus a stored `status=sent` proves SES accepted the message, not final mailbox delivery. SES can accept a message addressed to an account-suppressed destination without sending it. Inspect account suppression, configuration-set bounce/complaint/delay/reject events, and the recipient mail system rather than re-running the watcher.
- A stored notification `status=suppressed` means CLOVERSIGHT's own global recipient block list stopped the delivery before transport. This is separate from the AWS SES account suppression list and must be managed only from the steward **Email block list** page after confirming the address owner's request.
- A stored `retry_scheduled` notification is retried once by the maintenance queue after five minutes. Confirm the Billing Lambda and Billing queue are healthy if it never transitions.
- `get-suppressed-destination` returning `NotFoundException` is the desired result. A listed destination must be reviewed before removal; do not blindly clear complaint suppression.

## Stripe checkout and webhook triage

The customer return now reconciles its Checkout Session directly, but Stripe webhooks remain required for renewals and asynchronous subscription state. Do not start another Checkout while investigating an existing paid session.

```bash
STACK_NAME=webwatch-staging
AWS_REGION=us-east-1
API_FUNCTION=$(aws cloudformation describe-stack-resource --stack-name "$STACK_NAME" --logical-resource-id ApiFunction --query 'StackResourceDetail.PhysicalResourceId' --output text --region "$AWS_REGION" --profile saas-admin)
CORE_TABLE=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`CoreTable`].OutputValue|[0]' --output text --region "$AWS_REGION" --profile saas-admin)
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`StripeWebhookUrl`].OutputValue|[0]' --output text --region "$AWS_REGION" --profile saas-admin
aws lambda get-function-configuration --function-name "$API_FUNCTION" --query 'Environment.Variables.{BillingProvider:BILLING_PROVIDER,StripeSecretArn:STRIPE_SECRET_ARN,ResponseBaseUrl:RESPONSE_BASE_URL}' --output table --region "$AWS_REGION" --profile saas-admin
aws logs tail "/aws/lambda/$API_FUNCTION" --since 6h --filter-pattern 'stripe' --format short --region "$AWS_REGION" --profile saas-admin
aws dynamodb scan --table-name "$CORE_TABLE" --filter-expression '#collection = :collection AND #value.accountId = :account' --expression-attribute-values '{":collection":{"S":"transactions"},":account":{"S":"acct_e154fbfdcafc4f75e7f6dac6"}}' --expression-attribute-names '{"#collection":"collection","#value":"value"}' --projection-expression 'entityId,#value' --output json --region "$AWS_REGION" --profile saas-admin
aws dynamodb scan --table-name "$CORE_TABLE" --filter-expression '#collection = :collection AND #value.id = :account' --expression-attribute-values '{":collection":{"S":"accounts"},":account":{"S":"acct_e154fbfdcafc4f75e7f6dac6"}}' --expression-attribute-names '{"#collection":"collection","#value":"value"}' --projection-expression 'entityId,#value' --output json --region "$AWS_REGION" --profile saas-admin
aws secretsmanager describe-secret --secret-id "$(aws lambda get-function-configuration --function-name "$API_FUNCTION" --query 'Environment.Variables.STRIPE_SECRET_ARN' --output text --region "$AWS_REGION" --profile saas-admin)" --query '{Name:Name,LastChangedDate:LastChangedDate,VersionIdsToStages:VersionIdsToStages}' --output json --region "$AWS_REGION" --profile saas-admin
```

In Stripe test mode, confirm that the webhook endpoint exactly matches the stack `StripeWebhookUrl`, the signing secret in Secrets Manager belongs to that endpoint, and `checkout.session.completed`, `invoice.*`, and `customer.subscription.*` deliveries receive HTTP 200 responses. A `pending_checkout` transaction with a completed Stripe Session is repaired when the customer next opens Billing; a known-customer active subscription is also recovered before the server permits any new Checkout. Before a new plan-change charge, the service now reconciles blocking `processing`, `retry_scheduled`, `payment_required`, and `reconciliation_required` records against the bound Stripe subscription. A definitively unapplied stale request becomes `failed`; a paid request completes locally; and a pending invoice remains `payment_required` instead of being charged again.

## WAF access recovery

If your public IP changes:

1. Update `config/staging-ip-allowlist.txt` from a secure workstation.
2. Run `npm run aws:update-allowlist` using an authorized non-root session.
3. When console access is the only immediate option, update both edge and regional IP sets, then reconcile source and run drift detection.

Staging CloudFront and Cognito permit the IP addresses in `config/staging-ip-allowlist.txt` and, when enabled, the any-IP ChatGPT header exception described in [staging browser access](staging-browser-access.md). Add ordinary trusted workstation addresses to the allowlist. The IP-set updater does not change ACL rules or `EnableStagingChatGptBrowser`; use a primary stack deployment for those changes. Inspect the distinct `AllowChatGptUserAgent` and `AllowChatGptBrowserHeaders` sampled-request metrics to diagnose browser access.

## Incomplete captures and operational email delivery

A committed run with internal capture failures or an unavailable required comparison emits `capture.run.incomplete` with bounded region lists. Worker and billing/maintenance logs feed `WebWatch/<stage>/CaptureIncompleteRuns` and one primary CloudWatch alarm (one or more events in five minutes). Target-site outages and a first successful baseline alone do not count as infrastructure failures. Lambda `Errors=0` does not prove capture success, because an internal-error result can be persisted and acknowledged successfully.

The October 8 staging audit found `TechnicalAlertsEnabled=false`, an already configured alert address, and no OpsTopic subscriptions. To receive operator emails, set `TECHNICAL_ALERTS_ENABLED=true` and retain the intended `TECHNICAL_ALERT_EMAIL` in the private `.env`, deploy the primary stack, and confirm the SNS subscription email. The post-deploy audit now checks confirmed destinations; enablement with no confirmed destination is a failure, while disabled/no destination is a warning. This does not alter customer incident notification settings.

For billing and notification timeliness, urgent maintenance remains every minute. General retention sweeps run every 15 UTC minutes. Physical/metadata cleanup can lag by up to 15 minutes plus queue or service lag, while exact customer-visible history cutoffs remain enforced on reads. Keep tagged ECR releases until all deployed Lambda/version and rollback references in every stage/Region have been checked. Do not remove the final tag from a still-required image.

## Maintenance task health and retry state

Each AWS maintenance task has a small direct DynamoDB record at `PK=MAINTENANCE#<task>`, `SK=STATE` in the primary CoreTable. These unindexed records have no customer collection and are excluded from compatibility state reconstruction. Claims have a 660-second lease (longer than the 600-second worker), conditional ownership, a last-success timestamp and capped 30–300-second retry backoff. Notification timers, billing retries/refunds, capture deadlines, account purge and deletion confirmations have independent claims. A failed task does not prevent the other tasks from being attempted. The existing financial/provider idempotency and reconciliation rules still govern business effects; the task lease does not promise exactly-once execution.

`maintenance.task.succeeded` includes the task's positive last-success heartbeat even when no records were due. `maintenance.task.failed` and `maintenance.task.state_failed` expose execution or lease-state failure; the AWS worker returns a partial SQS batch failure when execution fails. `maintenance.completed` describes every tick and includes `healthy`, deferred tasks and failed tasks. Only `maintenance.healthy` is the aggregate healthy heartbeat. Deferred retry/lease tasks and stale historical successes do not emit that heartbeat. Inspect per-task `lastSucceededAt` as well as Lambda Errors and the Billing DLQ. Helpers that record an individual provider rejection in their own durable business state remain subject to the separate billing/notification failure signals.

For one bounded state read after resolving `CORE_TABLE` as in the email triage section:

```bash
aws dynamodb get-item --table-name "$CORE_TABLE" --key '{"PK":{"S":"MAINTENANCE#notifications"},"SK":{"S":"STATE"}}' --consistent-read --output json --region "$AWS_REGION" --profile saas-admin
```

Retention tasks normally run once per 15-minute schedule slot. Pending/failed retention tasks are also discovered on intervening urgent ticks, so bounded retry backoff applies without waiting for the next quarter-hour. Expired metadata cleanup logs `eligibleBefore`, `remaining`, `removed` and `oldestExpiredAgeSeconds`. Snapshot cleanup protects live latest, approved-baseline and incident references and selects the oldest 90 eligible records. General expiry shares a 90-item transaction budget across eligible idempotency, provider-event, check/result-job, watcher-audit and unsubscribe-link records, reusing spare capacity between classes. This improves fixed class throughput but still uses the compatibility global transaction; indexed/cursor cleanup remains required before growth. Link expiry does not remove justified global opt-out/provider-suppression records.

Maintenance failure notices use a durable hourly claim and only accepted/local queued transport outcomes count as notice success. A missing transport identity, provider rejection or suppression emits `maintenance.alert.failed`; it never means delivered. Known ambiguous attempts are persisted and held for that hour rather than automatically resent; the next hour can create a reminder. An expired running sender lease is also persisted as an interrupted ambiguous attempt and is not replayed. SNS operational alarms remain the independent detection path. These claims expose send uncertainty and avoid automatic replay after a crash; they do not establish confirmed mailbox delivery or a complete operational outbox/feedback history.

Account erasure checks the persisted identity stage before removing configured-region assets and sending confirmation. Each confirmation requires a durable pre-send attempt claim; outcome updates are fenced to that attempt identity. A stale interrupted sender becomes ambiguous/manual review rather than being freely resent. Suppressed, ambiguous or failed notices remain distinct from verified erasure completion. They are never recorded as sent merely because the email helper resolved. Review the account deletion manifest and communication outcome separately; retired buckets and backup/restore coverage still need the governance work described in `data-lifecycle.md`.

Primary capture admission, result acceptance/finalization and comparison-baseline activation now recheck an active account inside their transaction decisions. Nonactive existing capture runs become terminal skipped without generating a new result/snapshot/baseline or reactivating a closure-paused watcher. This clears their deadline schedule entries and settles remaining customer credits once. A stale queued check cannot insert a replacement job for a missing/nonactive account. Scoped transactions also condition the strongly read account item so concurrent compatibility closure changes force a retry.

These metadata gates do not fence regional S3 writes. Regional browser/result handlers lack a live erased-account/privacy-generation check; a late or replayed job can recreate an object after a configured-prefix erasure sweep. Baseline copies and report uploads can also race the sweep before their completion metadata is rejected. Ordinary `remove`/`removeReference` deletes do not permanently remove every primary-bucket version. Strict privacy-generation/tombstone enforcement before each regional write, writer-drain/final versioned sweeps, a durable current-and-retired resource manifest and restore fencing remain required for G05. Do not describe the current confirmation as proof of no object resurrection or comprehensive backup/retired-location erasure.

Closure scheduling and cancellation still pause/restore all account watchers and affected incidents through one compatibility transaction. Very large accounts can exceed its 99-entity mutation limit; that boundary remains follow-up work separate from the newly bounded operational purge.

## Soft queue backpressure and infrastructure deferral

The dispatcher queues essential maintenance before consulting due-check or queue capacity. It reads the primary check queue's approximate visible, delayed and in-flight count only when checks are due, limits its new batch to available headroom, and rotates account order within its bounded candidate set. `CHECK_QUEUE_MAX_OUTSTANDING` and `DISPATCH_BATCH_SIZE` both default to 500. Each schedule/configuration identity has a stable job ID and a conditional 180-second DynamoDB dispatch lease; an ambiguous SQS send can be retried with that same job ID after lease expiry. SQS tenant-hashed fair queue message groups remain in place.

Before reserving customer credits, the coordinator reads all selected capture queues. `CAPTURE_QUEUE_MAX_OUTSTANDING` defaults to 256 per Region, including visible, delayed and in-flight messages. Queue-health samples are cached per warm worker for `CAPTURE_QUEUE_HEALTH_CACHE_SECONDS` (default ten seconds), with that worker's newly submitted messages added locally. Unknown/missing queue health defers new work. `CAPTURE_QUEUE_DEFERRAL_SECONDS` defaults to 60 seconds, plus stable 0–29-second watcher jitter. Scheduled and manual checks share this regional pre-credit admission gate. Checks that spent ten minutes in the primary queue are explicitly skipped/deferred before creating a new capture run. An expired running job is settled rather than redispatched, and replay dispatch excludes already accepted Regions.

`CAPTURE_CAPACITY_DEFERRED` / `capture-capacity-deferred` and `CHECK_QUEUE_STALE` are platform scheduling outcomes, not monitored-site outages. They preserve incident state and comparison evidence and do not reserve new capture credits. Existing internal capture failures continue to refund infrastructure-failed Regions. Repeated partial regional infrastructure failures now add bounded watcher backoff; target-site outages alone do not trigger that backoff. This is per-watcher protection, not a global regional circuit breaker.

These queue counts are eventual and approximate, and admissions from multiple workers are not atomic. The defaults are not a guaranteed queue bound, deadline guarantee, capacity benchmark or dollar governor. At the 64-slot browser ceiling, 256 workloads taking the full 180 seconds would consume roughly 720 seconds even without cold-start ramp, before result/persistence uncertainty; select limits from measured tails and the 900-second run deadline. Use `npm run capacity:plan` and controlled staging load before admitting a continuous power-user workload. Queue-age alarms now cover primary check/result queues as well as capture queues. Age is not queried by this admission gate. Preserve result/deadline/financial/deletion workers during any future hold. Hard shared permits, regional breakers, measured admission budgets and a financial control plane remain follow-up work.

Capture deliveries use a conditional 210-second S3 lease and immutable results. An executing uncached receipt is shortened from the queue's initial 1,200 seconds to 240 seconds, longer than the Lambda hard timeout. Caught capture/coordinator failures use bounded visibility backoff. A live duplicate lease is a retry condition, not a target-site outage. These changes need matching IAM/environment updates in every Region; follow [the existing-stack upgrade guide](upgrade-0.5.16.md).

AWS references: [GetQueueAttributes approximation and supported attributes](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_GetQueueAttributes.html), [SQS queue-age and fair-queue metric semantics](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html), [Lambda partial batch retry behavior](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html).
