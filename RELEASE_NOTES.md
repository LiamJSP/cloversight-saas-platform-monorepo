# 0.5.22

This release includes the rewritten README, the first AWS installation guide, and the business-fork CI/CD walkthrough. The release ZIP and extension now use explicit file inventories. Local credentials, build caches and working notes stay outside the distribution. Both AWS portals require Cognito, and the development HTTP server binds only to loopback. Queue and operations-email checks now use the deployed regions and require verifiable results.

**Existing installations.** Keep your private operator `.env`, original bootstrap, existing production stacks, Cognito identities and Stripe Prices. Promote the reviewed commit through the business fork, or run `npm run deploy` from this release’s configured operator checkout to build a fresh worker. The changed AWS runtime needs a new image. Confirm the production `support@cloversight.app` mailbox receives mail. Set `TECHNICAL_ALERT_EMAIL` explicitly in any stage that enables technical alerts.

**Before opening signups.** Check hosted sign-in for both portals, a scheduled capture and its evidence, delivery to the configured SNS email in every deployed region, and actual SES delivery. If the production domain has been using Stripe sandbox, complete the [test-to-live cutover](docs/stripe-production-test-0.5.20.md) and verify a signed live webhook. See [first AWS installation](docs/aws-account-bootstrap.md) and the [CI/CD walkthrough](docs/github-production.md).

# 0.5.21

The public site builds from Markdown, JSON, and SCSS Modules into static S3 objects. The worker base is digest-pinned and exercised on PRs. Automatic releases compare with the last successful installation. The operator acceptance commands verify one watcher or a bounded Business cohort. The [CI/CD walkthrough](docs/github-production.md) includes the public-fork setup and upgrade steps.

# CLOVERSIGHT 0.5.20

AWS deployment/recovery hardening, expanded prerequisite checks, mandatory schema validation and regional image integrity improvements. Includes the 0.5.19 cancellation features and cumulative Cognito/SQS fixes. See [release notes](docs/release-notes-0.5.20.md), [AWS review](docs/aws-deployment-review-0.5.20.md) and [recovery/upgrade instructions](docs/upgrade-0.5.20.md). Prices and entitlements are unchanged. Refresh bootstrap and rebuild the worker once. No live deployment was performed.
