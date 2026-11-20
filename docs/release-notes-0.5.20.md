# CLOVERSIGHT 0.5.20

This release addresses the repeated initial AWS deployment failures and adds broader checks before provisioning. It contains every 0.5.19 runtime/cancellation feature and the cumulative Cognito/SQS hotfixes.

- Order CloudFront function and policy provisioning to reduce bursts.
- Preserve new installations on failure; retain rollback for completed-stack updates. Retry only preserved throttling failures, with a bounded backoff and completion readback.
- Detect blocked stack states early and report the current ARN, root resource failures and saved diagnostics.
- Check partial-stack ownership, DNS/SES/Cognito prerequisites, CloudFront names/quotas and existing Lambda capacity before provisioning.
- Make AWS resource-schema validation part of local verification, deployment and CI, with narrow documented warning exceptions.
- Correct DynamoDB IAM action names and update bootstrap read permissions.
- Harden regional ECR error handling, temporary credentials and exact manifest/digest copying.
- Update public canonical URLs and contact links to `cloversight.app`; receiving mailboxes still require configuration.

Prices, entitlements and existing logical resource IDs are preserved. The default image tag advances to r43 and the source contract requires one worker rebuild. Do not apply old hotfix overlays to this release.

Read [the AWS review](aws-deployment-review-0.5.20.md) for findings, documentation and verification limits, then follow [the 0.5.20 recovery/upgrade guide](upgrade-0.5.20.md). Local validation does not establish live AWS, Docker, Stripe, SES or browser acceptance. No live deployment or deletion was performed in this review.

## Deployment-tools hotfix — production Stripe sandbox trial

Explicit `STRIPE_MODE=test` permits sandbox billing on the production AWS deployment. Defaults remain live for production and test for staging/beta. Both secret writers and consolidated preflight share mode validation; uploads verify all six Price objects against the monthly USD catalogue. See [setup and live cutover](stripe-production-test-0.5.20.md). This patch does not change the worker source hash or require another worker rebuild.
