# Billing controls

In 0.5.17 plan changes pin the capture window and carry consumed credits/attempts; only a reconciled newer paid renewal resets it. Subscription status events cannot extend paid periods. Too-small credit downgrades and oversized adjustment commits fail before charging. Renewal resume work is bounded and replay-safe. See [review](customer-abuse-review-0.5.17.md) and [upgrade](upgrade-0.5.17.md).

## Duplicate-charge prevention

1. Create an internal transaction before any provider call.
2. Use a stable idempotency key derived from operation and transaction ID.
3. Claim the operation with a conditional write.
4. Reuse the same logical transaction for its one automatic retry.
5. Deduplicate every webhook event by provider event ID.
6. Permit only one processing plan change per account.
7. Keep the billing worker at concurrency 1 initially.
8. Reconcile daily: internal transactions, Stripe invoices/payment intents/refunds, Stripe payouts, and RBC deposits.
9. Treat provider success followed by a failed local commit as `reconciliation_required`, never as a chargeable retry.

Never create a fresh transaction merely because the network response was ambiguous. Retrieve the provider object by the stored idempotency/operation reference first. A `reconciliation_required` transaction is intentionally ineligible for automatic or manual payment retry until staff confirms the provider state and completes a controlled ledger repair.

## Incorrect-amount prevention

- Store money as integer minor units.
- Select server-owned plan IDs only.
- Bind a versioned price catalogue to every transaction.
- Sign the canonical account/transaction/operation/plan/amount/currency/customer envelope.
- Fetch and reconcile the Stripe Price object before subscription changes.
- Compare webhook subtotal to the internal amount; store tax separately.
- Put hard maximums on each plan operation.
- Require a distinct reviewed migration for any price-book change.
- Pin Stripe requests to API version `2025-06-30.basil` or newer. Flexible
  billing-mode subscriptions require the
  `/v1/invoices/create_preview` subscription-change preview. A blank value in an
  older secret falls back to this pin instead of the mutable account default.
- Quote plan changes through the authenticated server before showing the
  confirmation dialog. The customer sees the new monthly price, unused-period
  credit, estimated immediate charge, and renewal boundary before mutation.

## Wrong-customer prevention

- Persist one provider customer ID on the account.
- Put internal account and transaction IDs in provider metadata. For Stripe pending subscription updates, write this metadata in a separate idempotent call because pending updates accept only their documented update attributes.
- Read provider objects before a mutation and compare customer ID plus metadata.
- Do not accept payment-method IDs from arbitrary client input.
- Use the implemented Stripe-hosted Checkout redirect for payment-method collection. Stripe Billing Portal is not implemented in this release; introducing it needs its own server binding and redirect review.
- Reject objects whose account, customer, currency, amount, or plan does not reconcile.
- Grant initial paid access only after retrieving the bound Stripe Checkout Session and checking that it completed with `payment_status=paid`, its subscription is active, exactly one expected Price is present, the Stripe metadata matches the stored transaction, and the billing period is valid. A subscription update or manually marked-paid invoice alone never activates a new plan.
- A bound paid Stripe account with inactive billing or an expired paid period gets free-tier configuration limits, zero capture credits, and no report or notification provider attempts until reconciliation. A successful renewal payment can restore access; investigate stale billing data before advising a customer to purchase again.

## Payment navigation boundary

Checkout and invoice-payment destinations are parsed and restricted to exact HTTPS origins. The default origins are `https://checkout.stripe.com` and `https://invoice.stripe.com`; custom Stripe domains must be explicitly added to `STRIPE_PAYMENT_ORIGINS` only after verifying their provider ownership/configuration. An entry is an origin, not a suffix, wildcard, URL with credentials, path, query, or fragment. The local billing provider retains its exact application success route only.

New provider results, reused Checkout URLs, webhook invoice URLs and customer billing responses use this boundary. An invalid invoice link is omitted while payment state still reconciles; URL failure must never convert a completed/pending provider operation into a fresh charge attempt. If Checkout created a session but its navigation destination is unapproved, the internal operation moves to `reconciliation_required`, retains the provider session identifier and prevents a replacement session until staff review. Review any custom domain before deployment and resolve a blocked transaction through controlled ledger reconciliation rather than changing origin policy to accept an arbitrary URL.

These checks protect the browser navigation boundary. They do not establish merchant PCI validation or protect against malicious changes by a compromised deployment authority. Scope/SAQ, ASV and provider responsibility evidence remain owner tasks in the remediation register.

## Retry policy

- Failed renewal collection: status `retry_scheduled`, automatic retry at +24 hours.
- Self-service plan change requiring payment: status `payment_required`, with the Stripe-hosted invoice exposed to the customer and no blind automatic retry.
- Automatic retry: exactly one attempt with a deterministic retry key.
- Subsequent failure: manual action required.
- Manual retry: customer or steward with audit reason.
- Hard cutoff: 60 days from original transaction creation.
- Before another plan change, reconcile any stale single-flight claim against the bound Stripe subscription. Release it only when the requested Price/pending update was definitively not applied.
- Provider-completed/local-finalization-failed operations move to `reconciliation_required` with retries disabled.
- Stripe Smart Retries must be configured so they do not add extra attempts on top of this application policy.

The plan-change transaction claim rereads the account and requires it to remain active with no cancellation intent. Cancel renewal records a durable end-of-period request; account closure records an immediate request and denies new monitoring immediately. The maintenance worker reconciles bound Stripe subscriptions and Checkout Sessions, reads back provider cancellation, and sends an operational confirmation independently of monitoring notification quotas. Existing invoices and refund obligations remain recorded; cancellation does not automatically refund or void them.

The customer portal reports requested, processing, retry, scheduled, completed or attention status. A stored request is not provider confirmation. Stale subscription updates cannot resurrect a terminal subscription; a late paid Checkout or plan change can settle the ledger without re-enabling paid monitoring. Closure and reopening run in bounded resumable batches. Reopening preserves the cancellation intent and requires assisted setup before any new subscription.

Purge waits for closure batches, confirmed cancellation, unresolved payments and nonterminal refunds. Ambiguous old Checkout requests cannot be replayed after the safe idempotency window. See [cancellation and recovery](cancellation-0.5.19.md) and the [existing-stack upgrade](upgrade-0.5.19.md).
