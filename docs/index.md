# CLOVERSIGHT engineering guide

This is the source-linked reference for the 0.5.20 codebase. The [architecture](architecture.md) describes runtime boundaries, the [visual atlas](visuals/index.md) shows system topology and check flow, and [documentation tooling](documentation.md) explains how to regenerate the code and AWS references.

| Start here | Source of truth |
| --- | --- |
| Current rollout and deployment | [Release 0.5.20](release-notes-0.5.20.md), [AWS review](aws-deployment-review-0.5.20.md), [recovery/upgrade](upgrade-0.5.20.md) |
| Production Stripe sandbox trial | [Test-mode setup and live cutover](stripe-production-test-0.5.20.md) |
| Cancellation and recovery | [0.5.19 behavior and boundaries](cancellation-0.5.19.md) |
| Public claims and subscription facts | [0.5.18 copy review](public-copy-review-0.5.18.md), updated cancellation copy in 0.5.19 |
| Prior runtime upgrade | [0.5.17 upgrade](upgrade-0.5.17.md) |
| Customer abuse and plan enforcement | [0.5.17 review](customer-abuse-review-0.5.17.md) |
| Security, 250-watcher capacity and remaining production gates | [0.5.16 assessment](security-production-review-0.5.16.md) |
| Consolidated October 10 remediation and remaining work | [Audit change register](audit-change-register-2026-10-10.md) |
| Live portal review, authored fixes and portrait verification limits | [October 9 UI review](ui-review-2026-10-09.md) |
| Uploaded AWS audit findings and evidence limits | [October 8 audit review](aws-audit-review-2026-10-08.md) |
| Browser/run/evidence isolation | [Capture isolation](capture-isolation.md), `src/monitoring/`, `src/aws/` |
| Steward access, manager, activity log, and alerts | [Steward security](steward-security.md) |
| Public site, customer portal, steward portal, extension | [Surface map](surfaces.md), `apps/`, `extensions/` |
| API, billing, notifications and monitoring | [Architecture](architecture.md), `src/api/`, `src/` |
| AWS primary/regional stacks | [Resource inventory](reference/cloudformation.md), `infra/cloudformation/` |
| Deployment and live safety | [Deployment](deployment.md), [operations](operations.md), [limitations](known-limitations.md) |
| ChatGPT staging browser access | [Staging browser access](staging-browser-access.md), `infra/cloudformation/webwatch.yaml` |
| Node 24 and dependency review | [Owner trial and exact pin rationale](node24-dependency-upgrade.md) |
| Current branding/workflows/readiness | [Branding](branding.md), [test review](test-review-0.5.15.md), [readiness](release-readiness-0.5.15.md) |
| Release checks | [Testing](testing.md), `.github/workflows/ci.yml` |

The checked-in diagrams and generated tables describe this ZIP's source. They are not a statement that an AWS stack has been deployed or certified. See the [source audit](audit-current-state.md) for corrections and review limits.

The JSDoc HTML source browser and CloudFormation/gateway tables were regenerated for 0.5.19. The visual atlas retains the prior topology; use the current architecture/capture guides for the updated admission, lease, retry and capacity behavior. Local tests and static builds passed. Live AWS and browser-container behavior remain unverified; evidence and limits are recorded in the assessment.
