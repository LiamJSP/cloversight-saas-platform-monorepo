# Test-suite audit — 2026-09-26

Follow-up: [Additional testing layers](testing-additions-2026-09-26.md) now provide opt-in authenticated staging probes, a local customer/steward browser journey, and a capped read-only staging load probe. This document records the original suite review; the CI workflow and deeper live integrations remain future work.

This is a source review, **not a passing test report**. No test, build, deployment, network browser, or AWS command was run while preparing this change. Run the gates in `docs/testing.md` before merging. Each existing test file was reviewed for a concrete failure mode.

## Changes made

- Rewrote stale Checkout webhook tests: metadata alone cannot activate paid service; a bound session must be fetched again and verified through the billing service. Corrected two Checkout fixtures and added Price, item-count, and transaction-metadata denial cases.
- Rewrote renewal fixtures with subscription binding and a live billing period. `invoice.payment_succeeded` completes a renewal; `invoice.paid` alone cannot, and a foreign subscription is rejected.
- Distinguished local calendar credit rollover from Stripe service. Added expired, active, and past-due Stripe capture-credit cases.
- Stopped pinning a notification diagnostic to an old release number.
- Moved real Chromium capture to an explicit `test:browser` gate that fails when Chromium is missing or blocked. Local `npm test` and `verify` use deterministic service tests; syntax scanning still includes the browser fixture.
- Removed a post-deploy audit source grep that purported to prove read-only AWS operation, a redundant reserved Lambda env test already covered by parsed-template IaC validation, and steward UI regexes that purported to prove browser functionality. Removed an irrelevant template byte-size assertion and historical UUID checks.
- Added check-status cross-account, regional classification and worker-diagnostic redaction cases, plus ambiguous team-membership denial.
- Made the IaC gate fail when Python/PyYAML is unavailable, so CI cannot report success after skipping semantic CloudFormation checks.

## Existing files reviewed individually

| Original file | Decision | Real failure mode or reason for removal |
| --- | --- | --- |
| `aws-runtime-mode.test.mjs` | Keep | Inbound mail cannot acquire billing access; Stripe API requires secret. |
| `billing.test.mjs` | Strengthen | Charge reconciliation, retries, atomic commits, delayed Checkout repair, downgrade guard; correct provider fixtures. |
| `capture.test.mjs` | Split | Timeout clamp stays fast; Chromium capture moved to `tests/browser/capture.test.mjs`. |
| `cloudfront-origin-header-policy.test.mjs` | Narrow | Auth forwarding and origin/cache configuration contract; remove arbitrary UUIDs. |
| `deployment-auth-preflight.test.mjs` | Keep as contract | IAM/ACM, staged indexes, S3 missing-object handling, MFA and throttling. |
| `deployment-settings.test.mjs` | Keep | Fail partial SMS setup, unsafe regions and worker concurrency. |
| `deployment-template-transport.test.mjs` | Narrow | S3 transport for CloudFormation; no irrelevant template size check. |
| `dynamo-store-indexes.test.mjs` | Keep | Legacy records derive scoped lookup keys before GSI propagation. |
| `egress-proxy.test.mjs` | Keep | Local pinned forwarding and private CONNECT rejection. |
| `federated-account.test.mjs` | Strengthen | Identity, duplicate email, atomic registration and ambiguous membership denial. |
| `inbound-email.test.mjs` | Keep | Trusted sender-facing reply extraction and size ceiling. |
| `lambda-reserved-env.test.mjs` | Remove duplicate | Parsed IaC validator already checks all reserved Lambda environment keys. |
| `masking.test.mjs` | Keep | Steward views omit secrets, billing envelopes and reversible snapshots. |
| `monitoring.test.mjs` | Strengthen | Outage recovery, alert rounds, foreign-job filtering, redacted check status. |
| `notification-providers.test.mjs` | Keep | Country/capability checks before paid Twilio calls. |
| `notification.test.mjs` | Keep, fix stale assertion | Suppression, retries, idempotency, escalation, round recovery, opt-out and owner controls. |
| `pixel.test.mjs` | Keep | Pixel detector behavior with in-memory images. |
| `plans.test.mjs` | Strengthen | Plan gates, trial expiry and paid capture budget. |
| `post-deploy-audit.test.mjs` | Remove false assurance | Command-name grep cannot establish read-only execution or actual AWS health. |
| `reports.test.mjs` | Keep | Report generation, scoped status and generation quota. |
| `response-page.test.mjs` | Keep | Escaping public signed links and safe response pages. |
| `ses-verdicts.test.mjs` | Keep | Untrusted or spoofed SES verdict rejection. |
| `ssrf.test.mjs` | Strengthen | Reserved IPv4/IPv6, hex mapping and NAT64 forms. |
| `steward-auth-ui.test.mjs` | Remove false assurance | Regexes cannot prove login, session renewal or browser history behavior. |
| `store-account.test.mjs` | Keep | Serialized file transactions, closure, retry stop and free-trial isolation. |
| `stripe-event.test.mjs` | Rewrite | Bound Checkout, provider re-verification and wrong account/session/amount denial. |
| `stripe-plan-change.test.mjs` | Keep | Mocked preview versus mutation, charge binding and sanitized Stripe errors. |
| `stripe-renewal.test.mjs` | Rewrite | Signed renewal ledger, replay, paid success, manual mark and wrong subscription denial. |
| `stripe-secret-script.test.mjs` | Keep as contract | Test-mode guard and independent Stripe secret operator path. |
| `stripe-signature.test.mjs` | Keep | Signature rotation and malformed signed payloads. |
| `team-action-log.test.mjs` | Keep | Team scope, owner-only restore, redaction and plan/retention bypass denial. |
| `text.test.mjs` | Keep | Normalization, bounded change payload, quote context and outage classification. |
| `token.test.mjs` | Keep | Signed response integrity and expiry. |
| `twilio-signature.test.mjs` | Keep | Exact public URL and form parameter signature binding. |
| `watcher-conflict.test.mjs` | Keep | Optimistic edits, pause/delete effects and unsafe input rejection. |
| `worker-image-manifest.test.mjs` | Keep as contract | Immutable image tag and manifest build-script safeguards. |

## Limits and next CI work

In-memory and file stores do not simulate DynamoDB conditional writes, IAM, distributed queues, event reordering or real Stripe/SES/Twilio traffic. Source contracts cannot establish that AWS accepted an update. This original review preceded the opt-in authenticated staging checks and capped load probe linked above. There is no GitHub Actions workflow in this source; these opt-in checks are not CI gates and must not be represented as covered in CI reports.

For the next release gates, prioritize a disposable DynamoDB tenant-read/conditional-write check, an authenticated staging steward browser journey, Stripe test-mode webhook replay, and a small multi-region capture/notification smoke path. External tests need explicit invocation and cost ceilings; they are not part of `npm test`.
