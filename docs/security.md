# Security controls and review checklist

The [0.5.17 plan/abuse review](customer-abuse-review-0.5.17.md) adds durable quota, cadence, billing and notification controls. Live AWS acceptance remains outstanding.

The [0.5.16 assessment](security-production-review-0.5.16.md) records tested changes, remaining risks and live acceptance gates. The source is reviewed; the deployed account was not inspected or changed in this review.

## Implemented controls

- Separate customer and steward Cognito user pools/clients.
- Authorization-code PKCE, state verification, session storage, token refresh, and role-specific issuers.
- Configurable Cognito MFA; defaults are `OFF` for the initial staging request.
- Server-derived active team membership on every customer route, owner-only billing/team/recovery/delete operations, account-scoped directory lookups, and privacy-safe explicit steward response schemas.
- The eventually consistent identity index only locates a membership; a strongly consistent source-item read checks the subject, active status, and current role before account access is granted. A stale revoked membership fails closed.
- Reversible watcher snapshots are excluded from every steward response and are available only through the owner-authorized, account-scoped action-log service.
- Actor-and-IP directory rate claims plus API Gateway route throttling for team autocomplete and exact recipient lookup.
- Thirty-minute steward sensitive-view idle jettison.
- WAF IP allow-list on staging browser surfaces and Cognito managed-login endpoints.
- Staging edge and regional WAF default-deny rules with the declared IP allowlist and a switchable any-IP ChatGPT header exception. Copyable browser headers are not an authentication mechanism.
- CloudFront origin verification secret for private API routes.
- KMS encryption, private S3, Block Public Access, versioning, and CloudFront origin access control.
- Explicit TLS-deny policies on application S3 buckets and SQS queues; capture KMS access restricted to S3 and the configured evidence bucket's encryption context.
- AWS runtime startup rejects missing/weak/development response keys, requires the API origin key, and forbids private capture targets. Internal 5xx details are not returned to callers.
- DynamoDB point-in-time recovery and retained data resources.
- SQS DLQs, batch-item failure reporting, reserved concurrency, and dedicated report-worker/DLQ alarms.
- DNS-pinned browser egress proxy with private/reserved-address, redirect, subresource, port, timeout, and byte controls.
- Capture Lambda privilege isolation from billing and notification secrets.
- Ephemeral Chromium profiles, three fixed responsive viewports, full-page screenshots, and bounded capture resources.
- Numeric IPv6 public-address classification and a minimal browser environment exclude special-purpose destinations and inherited application/AWS variables. Chromium still shares the Lambda UID and IAM trust boundary; this is not a browser exploit sandbox.
- Checked-in registry-resolved dependency locks for all three npm packages, lifecycle scripts disabled during browser-image dependency installation, and root/runtime/browser dependency audits.
- The designed subscription flow uses Stripe-hosted Checkout and does not collect raw card fields. Arbitrary captures, notes and inbound mail can still contain unsolicited sensitive information; that broader storage has not been certified card-data-free.
- Signed price calculations, server-owned minor-unit amounts, Price/customer/metadata reconciliation, and idempotent financial operations.
- Terminal `reconciliation_required` state after provider success/local finalization ambiguity.
- Signed Stripe webhook validation and, when optional SMS is enabled, signed Twilio webhook validation, with replay claims and stale-claim recovery.
- SES malware/spam verdict enforcement plus DMARC-aligned automatic reply voting.
- Owner-subject and Cognito-sub-bound steward invitations with immediate application revocation, required reasons for sensitive staff mutations, and a retained per-request steward audit table. See [steward security](steward-security.md).
- Security headers and `noindex` customer/steward pages.

## Important configuration requirements

- Enable root MFA and remove root access keys.
- Use IAM Identity Center temporary credentials for humans.
- Enable steward MFA before real customer or payment-support data is exposed.
- Keep `ALLOWED_PRIVATE_TARGETS=false` in public environments.
- Keep staging behind the WAF allow-list.
- Use immutable ECR image digests.
- Store Stripe/Twilio secrets only in Secrets Manager and local protected environment files.
- Coordinate Stripe Smart Retries with the application’s one-retry rule.
- Treat console WAF changes as drift and reconcile them to source.

## Staging perimeter

The edge and regional staging ACLs in `infra/cloudformation/webwatch.yaml` default to `Block` and retain the `AllowDeclaredAddresses` IP-set rule. When `STAGING_CHATGPT_BROWSER_ENABLED=true` (default for staging), `AllowChatGptUserAgent` and `AllowChatGptBrowserHeaders` also admit matching requests regardless of IP, including Cognito managed login. Both rules disappear when the flag is false; the ACLs remain staging-only.

This owner-requested compatibility policy matches header text. AWS WAF does not verify the HTTP message signature, and a caller can copy the user agent or signature-shaped headers. It therefore grants staging perimeter access to anyone presenting the matching pattern, not exclusively OpenAI. Cognito sessions, tenant/owner checks, steward permissions, and CloudFront origin verification still apply. For authenticated OpenAI identity, a separate cryptographic verifier would be required; this hotfix does not introduce one. See [staging browser access](staging-browser-access.md) for exact matching and troubleshooting. Provider callback endpoints use separate signed application checks as described above.

## Production review still required

- Threat model and data-flow review.
- IAM Access Analyzer and least-privilege review after actual stack deployment.
- Dependency, container, and image vulnerability scans.
- Cognito/OAuth live review.
- Stripe, Twilio, and SES signature/replay certification.
- Authorized external penetration test.
- Disaster-recovery and backup-restore exercise.
- Privacy impact and retention review.

## Operational logs and unexpected sensitive data

Operational logging now applies bounded recursive redaction to common credential, token, contact, request-body and captured-content fields. Free-text messages remove recognizable URLs, email addresses, phone numbers, authorization values and several credential formats; stacks are omitted. This is defense in depth, not universal secret or card-data discovery. Keep log arguments to identifiers, codes and counts, and review third-party/provider errors before adding new fields. Reversible business audit before-images remain domain records and are intentionally not passed through the logging sanitizer.

Prohibit card numbers, security codes and other payment credentials in watcher targets, free-text notes, support and inbound email. If unexpected sensitive data is discovered, restrict access, record the location and assessment without copying the payload into another log, and identify current objects, versions, mail, logs and backups that require a scoped cleanup or retained exception. The owner must approve incident/quarantine and legal retention procedures, staff training and payment-scope reassessment. OCR/Luhn screening would be an aid, not proof that generic content contains no card data.

See [secret rotation](secret-rotation.md) for bounded provider refresh and the remaining coordinated single-key rollover limitation. Production MFA/template requirements and independently confirmed alert destinations are described in [deployment](deployment.md); staging exceptions remain separate.

## Capture evidence and browser drafts (0.5.10)

The reference-aware S3 adapter permits only the exact configured primary and regional bucket/Region pairs. Coordinator and worker separately validate tenant, watcher, regional profile and run ownership before accepting or copying evidence. See [capture isolation](capture-isolation.md) for disposable profile retirement, canonical job identity and the shared IAM/browser runtime boundary.

Browser recovery drafts and publication locks are scoped to the loaded account and immutable viewer ID. A legacy global recovery entry cannot establish ownership and is discarded without exposure or import; save a needed old local draft to the platform before upgrading. Retained evidence links remain short-lived bearer URLs; source authorization cannot retract a URL already issued before revocation.
