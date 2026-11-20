# Customer abuse and plan enforcement — 0.5.17

Reviewed 2026-11-13 against the supplied plan table and the 0.5.16 archive. This release implements and locally tests the controls below. Prices, Stripe Price IDs, included captures, watcher counts and regional entitlements are unchanged. No live AWS deployment or provider traffic was performed. Follow [the existing-stack upgrade](upgrade-0.5.17.md).

## Findings fixed

| Abuse or failure | Enforcement |
| --- | --- |
| Concurrent creates or stale index reads exceed watcher/regional limits | One strong bootstrap initializes account counters. Create/edit/delete/undo/plan adjustments maintain them under conditional transactions. Drafts and paused watchers occupy slots. Execution checks current plan limits again. |
| Manual checks, publish/resume or undo bypass cadence | A durable last-start clock and infrastructure recovery hold apply to scheduled and manual checks. Configuration undo preserves current evidence and runtime accounting. |
| Hundreds of watchers start together; deleting/recreating IDs evades pacing | Server phases stagger initial/resumed work by up to 120 seconds. Dispatcher lookahead of 59 seconds and SQS message delays distribute due work. An account token bucket allows at most five immediate starts and refills at watcher limit divided by minimum interval. Replacement watchers share that bucket. |
| Cancel in-flight work to obtain free captures | Unknown work remains charged; only explicit infrastructure failures refund credits. Results and terminal run state prevent duplicate refunds. A separate nonrefundable regional-attempt budget is twice the capture allowance. Each immutable regional run has at most three S3 lease acquisitions. |
| Upgrade/downgrade repeatedly to refill credits using proration | Plan changes carry consumed credits and attempts through a pinned capture window. Only a reconciled paid renewal resets it. Duplicate/older renewals cannot rewind usage. Subscription status events cannot grant a new plan or paid period. Downgrades below usage are blocked before charging. |
| A renewal attempts to resume 250 watchers in one DynamoDB transaction | Payment resumes up to twenty watchers and records the rest for durable batches of fifty. Maintenance processes up to ten batches per eligible account and five accounts per tick. Paused/deleted watchers are not activated. Oversized plan adjustment sets are rejected before payment, checking both entity count and a conservative byte budget. |
| Temporary incident recipients exceed plan limits | Validate the full effective policy, including overrides, when editing and before send/retry. Current tier, total-recipient and Free SMS restrictions apply. |
| Invitations bypass email limits and opt-outs | Reserve from the daily account email budget before Cognito/SES; respect suppressions. A hashed destination limit spans accounts: ten-minute cooldown, at most three attempts/day. Cognito automatic invitation retries are disabled. Expired invites do not occupy seats; resending an unexpired invite does not require another seat. |
| Long/Unicode SMS multiplies charges | Render one segment while retaining the response code and supported reply commands. Enforce 150 GSM septets or 70 UTF-16 units, accounting for extension characters and surrogate pairs. Transport rejects oversized SMS before lookup, disables Smart Encoding and times out after 15 seconds. |
| Rotate members, tokens or IPs to multiply API quotas | Verified-account limits: 60 requests/second, 600/minute, 60 mutations/minute, 60 bootstrap loads/minute and 20 billing mutations/10 minutes. UTC daily mutations are max(100, 10 × watcher limit), capped at 5,000. HTTP 429 returns Retry-After. Team/action-log/check-status reads avoid unrelated history where possible. |

These are operational usage bounds, not a dollar guarantee. One logical Region attempt can require up to three lease acquisitions, with at most two browser launch attempts inside an invocation. Notification provider retries consume daily attempts; ambiguous provider acceptance does not imply exactly-once delivery.

The deterministic Business cohort of 250 two-minute watchers spreads over approximately two minutes. This is not a measured AWS latency guarantee. Essentials' one-start burst and ten-start/hour refill mean ten simultaneous new watchers can take about 54 minutes to receive their first checks. Existing per-watcher cadence, recovery, credit and queue-pressure limits can add delays. There is no catch-up storm or guarantee of an exact wall-clock minute.

## Plan cross-check

The regression suite checks every numerical catalog field below, including prices. Owner, active members and unexpired pending invitations count toward users. Recipients are totaled across all tiers, not granted again per tier. Free/Essentials encode primary-only checks as zero additional configured Regions, not zero captures. Email support is a service promise rather than an executable quota.

| Plan | Price | Credits/month | Watchers | Minimum interval | Regional watchers × Regions | Users | Tiers / total recipients | Email / optional SMS per UTC day | History | PDF quota |
| --- | ---: | ---: | ---: | --- | --- | ---: | --- | --- | --- | --- |
| Free | $0 | 10 | 1 | Weekly* | Primary only | 1 | 1 / 5 | 50 / 0 | 7 days | None |
| Essentials | $19 | 1,000 | 10 | Hourly | Primary only | 2 | 2 / 10 | 250 / 25 | 30 days | 5 per rolling 30 days |
| Professional | $49 | 10,000 | 50 | 15 minutes | 10 × 2 | 5 | 5 / 25 | 1,500 / 75 | 90 days | 25 per rolling 30 days |
| Team | $149 | 30,000 | 100 | 5 minutes | 25 × 3 | 10 | 10 / 50 | 3,000 / 150 | 180 days | 5 per rolling 24 hours |
| Business | $399 | 100,000 | 250 | 2 minutes | 100 × 5 | 25 | 10 / 100 | 7,500 / 300 | 365 days | 15 per rolling 24 hours |
| Scale | $899 | 300,000 | 500 | 2 minutes | 500 × 5 | 50 | 10 / 100 | 15,000 / 600 | Indefinite† | 25 per rolling 24 hours |

*The existing 30-day Free trial retains daily visual monitoring and 31 credits. Normal Free restrictions apply afterward. †Scale remains unavailable for self-service because its existing 1 TB storage promise is not metered. SMS requires configured Twilio capability and eligible US/Canada destinations.

Report requests that became jobs count even if they later fail; expiring the seven-day download does not reset the rolling allowance. There are at most three queued/running report jobs per account. The 5,000-result report output limit is not a database-read cap: retained rows are still read before truncation.

## Cadence is not an unlimited allowance

Arithmetic for 30 days at minimum cadence and the maximum legal regional mix:

| Plan | Required regional captures/month | Included | Continuous coverage before exhaustion |
| --- | ---: | ---: | --- |
| Essentials | 7,200 | 1,000 | 100 hours |
| Professional | 172,800 | 10,000 | 41.7 hours |
| Team | 1,296,000 | 30,000 | 16.7 hours |
| Business | 14,040,000 | 100,000 | 5.13 hours |
| Scale | 54,000,000 | 300,000 | 4 hours |

For **250 Business watchers in one Region every two minutes**, demand is 5.4 million captures/month. The included 100,000 lasts about **13 hours 20 minutes**. The controls admit funded bursts and pause on exhaustion; they do not create credits or charge unapproved overages. Customer pricing and plan-change confirmation explain monthly limits and carry-forward usage.

## Recommendations after closing the bypasses

Keep headline prices for this patch. Do not increase included captures merely to fund every watcher continuously at minimum cadence. Three resource promises need explicit limits or funding before unrestricted heavy use:

1. **Separately fund SMS.** Add a prepaid monthly segment allowance or a paid add-on alongside daily anti-spam caps. At Twilio's published US base rate of $0.0083/segment, fully using the daily allowances for 30 days costs about $6.23 / $18.68 / $37.35 / $74.70 / $149.40 for Essentials through Scale, excluding carrier fees, inbound messages, number rental and registration. Single-segment enforcement removes amplification, not legitimate delivery costs. This release does not introduce SMS charges.
2. **Measure and bound capture work.** Meter actual billed time and transferred bytes, including failures/refunds. A documented resource envelope per credit or prepaid heavy usage is more useful than a blanket price rise based on an unmeasured maximum. The browser Lambda uses 2 GB x86, a 150-second capture ceiling and a 180-second invocation ceiling. At an illustrative first-tier rate of $0.0000166667/GB-second, 100,000 captures at 150 billed seconds cost roughly $500 in browser compute alone; 300,000 cost $1,500. At 15 seconds these are $50/$150. This excludes retries, other functions, network, storage and delivery, and ignores free-tier/tier discounts. Verify actual Region and account pricing.
3. **Meter retained storage.** Keep Scale self-service blocked until retained bytes, retention/eviction and funded excess storage are enforceable. At an illustrative 3 MiB of unique evidence per capture, 300,000 captures add about 879 GiB/month before deduplication. Indefinite retention cannot stay within 1 TB; Business's year of history also needs measured costs. Changing high-entropy pages defeat deduplication without exceeding capture credits.

## Remaining production gates

- Many independently verified Free accounts can still multiply trial usage. Per-account controls do not replace signup protection and a global funded-trial admission budget. The staging header/allowlist exception is unchanged and is not a production abuse defense.
- History/bootstrap/report reads still load retained rows before truncation. Active billing/notification/erasure compatibility mutations and retention sweeps still load shared state. Date-ordered pagination, bounded workers and tenant maintenance budgets remain necessary.
- Account closure/reopening can exceed the existing 99-entity compatibility transaction bound. Large plan adjustments are now rejected before charging; prepare settings in smaller batches or use an assisted migration. Credit-renewal resumptions are fixed separately.
- Cleanup's existing 90-row quarter-hour budgets can fall behind heavy sustained capture use. No retained-byte or dollar ceiling was added. Do not promise millions of monthly captures without resolving retention/maintenance throughput.
- Shared Chromium/IAM isolation, physical cost attribution, provider configuration, restore drills and actual AWS burst acceptance remain as described in the [0.5.16 assessment](security-production-review-0.5.16.md).

## Verification and sources

See [verification evidence](review-evidence/verification-0.5.17.txt). Tests cover the plan matrix, stale/concurrent quotas, delete/undo, clocks/evidence, 250-watcher pacing, admission/credits, manual checks, cancellation/refunds, finite attempts, SMS, recipient overrides, invitations, request limits, plan cycling, renewal replay and bounded resumptions. All CloudFormation templates and dependency resolutions are unchanged from 0.5.16; account/run fields are additive. Old writers do not maintain the new counters: reconcile after rollback, without resetting captures or billing windows.

Primary references checked 2026-11-13: [Twilio US pricing](https://www.twilio.com/en-us/sms/pricing/us), [Twilio Message API](https://www.twilio.com/docs/messaging/api/message-resource), [SMS segmentation](https://help.twilio.com/articles/223181508-Does-Twilio-support-concatenated-SMS-messages-or-messages-over-160-characters), [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/), [AWS tiered pricing example](https://aws.amazon.com/about-aws/whats-new/2022/08/aws-lambda-tiered-pricing/), [Stripe subscription updates](https://docs.stripe.com/api/subscriptions/update), [DynamoDB transaction limits](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).

Resumption batches also obey byte budgets: up to 1 MB of watcher payload in the payment commit and 3 MB in maintenance, with room reserved below DynamoDB’s 4 MB transaction ceiling. Large rule sets can reduce the number resumed per batch.
