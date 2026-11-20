# CLOVERSIGHT 0.5.19

Automated renewal cancellation and account-closure cancellation now share a durable Stripe reconciliation workflow. Owners can request cancellation and see provider-confirmed status; staff can recover bounded failures with an audited retry. Public pricing, terms, privacy, security and support copy reflect the implementation.

## Changes

- Cancel renewal at the paid period end; request immediate cancellation on closure. Save intent before provider calls, verify account bindings, release subscription schedules and read back provider confirmation. Do not automatically refund payments or void invoices.
- Fence new Checkout sessions, plan changes and portal payment retries once cancellation is recorded. Recover/expire racing Checkout sessions with the original safe idempotency key; settle late payments without granting paid access or resetting credits. Prevent stale subscription updates from resurrecting terminal subscriptions.
- Close and reopen 500-watcher accounts in bounded resumable transactions. Reopening never restarts billing. Preserve operational and financial recovery records until cancellation, payments and refunds are reconciled.
- Keep open invoices unresolved even when the payment attempt was marked failed. Rotate reconciliation attempts, retain financial holds, and cap worker admission so cancellation work yields to later maintenance ticks.
- Provide owner-only cancellation/status access independently of general usage quotas, including a restricted closed-account status screen. Send operational confirmations independently of monitoring email allowances, with durable send claims and explicit ambiguity handling.
- Show cancellation state and reasoned retry controls in the steward console. Existing scheduled closures automatically acquire immediate cancellation intent after deployment; review them before enabling the new worker.

Prices, plan allowances, dependency resolutions and CloudFormation resource definitions are unchanged. Package versions advance to 0.5.19 and the default worker image tag to r42. After cancellation, starting another subscription remains support-assisted; no automatic reactivation is provided.

## Verification and deployment

The release gate passes 239 deterministic service tests, parses 176 JavaScript files, validates 178 primary and 17 regional CloudFormation resources, builds the static applications/runtime assets and packages the browser extension. Twenty-eight new cancellation tests cover normal paths, concurrency, 500-watcher transitions, provider failures, late events, Checkout recovery, invoice holds and notice outcomes. `git diff --check` is clean. Generated JavaScript and infrastructure references were refreshed.

These are local checks with provider/store fixtures. Live AWS, Stripe test-mode, SES and browser acceptance were not performed in the review workspace. Deploy the runtime and workers before the public claims, using the [0.5.19 existing-stack upgrade](upgrade-0.5.19.md). Read [cancellation policy, boundaries and recovery](cancellation-0.5.19.md) for operational details and residual manual cases. No production deployment or customer cancellation was performed during this review.
