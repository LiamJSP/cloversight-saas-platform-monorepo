# Automated cancellation and recovery — 0.5.19

The account owner can cancel renewal in Billing without a support ticket. Account closure also cancels the bound subscription. This is an asynchronous, durable workflow: a request is saved before calling Stripe, and provider readback determines confirmation. Source: `src/billing/cancellation.mjs`, `providers.mjs`, `service.mjs`, `src/services/accounts.mjs`, and `src/api/routes.mjs`.

## Customer policy

| Action | Billing outcome | Monitoring and data |
| --- | --- | --- |
| Cancel renewal | Set Stripe cancellation at the current period end; show the confirmed date | Retain access through the valid paid period; restrict paid access when cancellation completes |
| Schedule account closure | Request immediate cancellation, without automatic proration or refund | Deny new monitoring immediately; pause operational records in resumable batches; delete after the configured grace period and reconciliation |
| Reopen during the grace period | Preserve cancellation intent; never restart billing | Restore eligible operational state in batches, subject to billing restrictions |
| Restart after cancellation | Support-assisted new subscription setup is required | No automatic reactivation or silent new charge |

Cancellation does not erase invoices, issue refunds, or delete Stripe's financial records. Existing refund operations retain their independent reconciliation flow. Immediate cancellation uses `prorate=false` and `invoice_now=false`; scheduled cancellation retains Stripe's existing invoice behavior. These are implementation defaults, not a claim that every contractual refund or retention obligation is resolved.

## Request and confirmation

- `POST /api/billing/cancel` records the owner's period-end intent and returns HTTP 202. Repeated requests reuse it. Closure promotes it to an immediate intent; reopening cannot downgrade it.
- `GET /api/billing/cancellation` returns only request/confirmation/effective dates, status, closure deadline, email status and the financial-review flag. A verified owner of a scheduled closure can still reach this restricted status endpoint. Other members, other tenants and normal closed-account monitoring APIs remain denied.
- Cancellation has a separate small per-minute rate budget, so an exhausted general mutation allowance, retired plan or overdue bill cannot prevent the owner from requesting it. Other abuse limits remain enforced.
- State progresses through `requested`, `processing`, `retry_scheduled`, `scheduled`, `completed` or `attention`. The portal distinguishes a saved request from provider confirmation. Once recorded, the intent fences Checkout creation, plan changes and manual/automatic portal payment retries.
- The worker first stops a known renewal, then expires or reconciles Checkout Sessions, inventories account-bound subscriptions and reads back cancellation. It releases an attached subscription schedule before cancellation. Exact stored legacy subscription bindings can be canceled without adopting the current price book.

## Failure and race handling

Each request has a durable ID, a 600-second fenced lease and stable provider mutation keys. Network requests, including response reads, have a 15-second abort bound. Maintenance admits at most two cancellation accounts, two financial reconciliations and ten pending notices per pass, subject to a shared 60-second admission budget. An already-started bounded provider operation can overrun that budget; this is not a hard 60-second wall-clock guarantee. It leaves work for later ticks rather than starting another account indefinitely. Financial reconciliation rotates records so unresolved older invoices do not starve later payments.

Provider failures retry with backoff, capped at eight failed attempts and one hour between retries. Budget deferrals do not consume the failure allowance. Exhaustion and ambiguous/suppressed/failed confirmation messages surface through the existing maintenance task failure and operational alert path. Confirmed period-end cancellations are reread at least every six hours when maintenance is healthy, and at the effective end. Fairness uses the last attempt time. This still uses the existing global compatibility store; it is not an indexed high-volume cancellation queue.

Checkout recovery retains the original request and idempotency key. A lost local binding preserves any returned provider session ID. An unbound request can be replayed with that same key only while less than 23 hours old; older requests require reconciliation because Stripe can prune idempotency keys. Never create a fresh Checkout to resolve an uncertain old payment. A completed racing Checkout can settle its financial record, but its new subscription is canceled immediately and cannot grant paid access during cancellation. More than ten live bound subscriptions or an inventory beyond five pages requires operator review.

Subscription update webhooks reread current Stripe state instead of using second-resolution event timestamps as an ordering mechanism. A terminal subscription cannot be resurrected by a stale update. Late plan-change/renewal results can settle financial records without clearing the cancellation intent, resetting usage or resuming paid monitoring. Known invoices, including invoices on failed payment attempts, remain unresolved until a verified paid/void/uncollectible state is recorded. Reads do not collect or void them.

Closure/reopening batches change at most 40 records and use a conservative 1.5 MB serialized-payload budget, with room for the account and audit records under DynamoDB transaction limits. An account flag denies new activity immediately while batches drain. Purge waits for transition completion, confirmed cancellation, a terminal known subscription, unsettled internal payments and nonterminal refunds. Historical provider obligations outside the bound references remain an operator reconciliation responsibility.

Confirmation email uses the operational channel, independently of customer monitoring attempt allowances. A durable send claim prevents blindly resending after uncertain provider acceptance. Known failures get up to three attempts; stale sends become `ambiguous`. Provider-level suppression remains honored. Accepted by SES does not mean delivered or read. The portal remains the authoritative place to check status.

## Operator recovery

The steward account detail and closure list show cancellation status, effective date, email outcome and financial review. Inspect account-bound Stripe subscription/Checkout/invoice IDs and the audit trail. Do not clear cancellation metadata to unblock billing or purge.

For `attention` or `retry_scheduled`, resolve the provider or binding issue first. The steward **Retry cancellation** action calls `POST /api/steward/accounts/:id/retry-cancellation` with a required reason. It resets the bounded retry allowance and preserves the intent/idempotency identity; it cannot steal an active lease. There is no automatic force-complete control. A missing old Checkout binding or uncertain invoice needs a controlled, audited reconciliation using verified provider records. Email ambiguity requires delivery-log review; do not repeatedly click retry expecting it to resend a confirmed phase.

No new AWS resource or broad IAM grant is required. The existing Stripe credential must allow the required subscription reads, list/update/cancel operations, schedule release, Checkout reads/creation replay/expiration and invoice reads. Verify restricted-key permissions in test mode. Retain existing webhook signing secrets, event deduplication and event subscriptions.

## Evidence and rollout limit

Deterministic tests in `tests/cancellation.test.mjs` cover owner/tenant authorization, independent cancellation limits, 500-watcher closure/reopening, claims and retries, stale events, subscription schedules, late payments, Checkout recovery, unresolved invoice rotation, financial holds and notification ambiguity. Existing billing, account lifecycle, deployment and maintenance suites remain part of the release gate. These tests use provider/store fixtures; they are not live Stripe, SES, DynamoDB or browser acceptance. Follow [the deployment and acceptance guide](upgrade-0.5.19.md) before enabling this behavior for customers.

Provider references consulted: [Stripe cancellation](https://docs.stripe.com/billing/subscriptions/cancel), [webhook delivery/order](https://docs.stripe.com/webhooks), [subscription cancellation API](https://docs.stripe.com/api/subscriptions/cancel), [schedule release](https://docs.stripe.com/api/subscription_schedules/release), and [idempotency retention](https://docs.stripe.com/api/idempotent_requests).
