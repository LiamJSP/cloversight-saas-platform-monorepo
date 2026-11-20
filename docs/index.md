# Cloversight engineering guide

Start with the task you’re working on. The architecture guide follows a watcher from its scheduled slot to the evidence a customer sees. The installation guide takes a new AWS account through its first staging and production deployments.

| I want to… | Read |
| --- | --- |
| Run the app and tests on my workstation | [Workstation tools and testing](testing.md) |
| Understand the services and their boundaries | [Architecture](architecture.md), [visual atlas](visuals/index.md), [capture isolation](capture-isolation.md) |
| Change a public page, portal or browser extension | [Surface guide](surfaces.md), [customer portal design system](customer-portal-design-system.md), [accessibility](accessibility.md) |
| Understand subscriptions, credits and alert delivery | [Billing controls](billing-controls.md), [plan enforcement](customer-abuse-review-0.5.17.md), [notification flow](notifications.md) |
| Set up AWS for the first time | [First AWS installation](aws-account-bootstrap.md) |
| Release or recover an existing installation | [Business-fork CI/CD](github-production.md), [deployment reference](deployment.md), [stack recovery](upgrade-0.5.20.md) |
| Investigate a production incident or plan capacity | [Operations](operations.md), [cost model](cost-model.md), [known limitations](known-limitations.md) |
| Review security and data handling | [Security](security.md), [steward access](steward-security.md), [data lifecycle](data-lifecycle.md), [privacy](privacy.md) |
| Look up an AWS resource or API route | [CloudFormation inventory](reference/cloudformation.md), [gateway routes](reference/gateway-routes.md), [regenerating the references](documentation.md) |

## Operator procedures

Use a dedicated test tenant for [staging verification](ci-staging-verification-2026-09-26.md). The [CI/CD walkthrough](github-production.md) also covers the live single-watcher smoke check and bounded 250-watcher scenario. For billing changes, use the [Stripe test-to-live procedure](stripe-production-test-0.5.20.md) and [cancellation and recovery guide](cancellation-0.5.19.md). For changes to the staging perimeter, use [staging access](staging-browser-access.md).

## Release history and evidence

Files named `release-notes-*`, `upgrade-*` and dated reviews record what changed or was tested at that time. The [AWS deployment review](aws-deployment-review-0.5.20.md), [production security review](security-production-review-0.5.16.md), [audit change register](audit-change-register-2026-10-10.md) and [source audit](audit-current-state.md) retain their original scope. For the current release, see `RELEASE_NOTES.md` at the repository root.
