# Public copy and subscription review — 0.5.18

This is the historical 0.5.18 assessment. The cancellation limitation described below is superseded by [0.5.19 automated cancellation](cancellation-0.5.19.md); the public cancellation copy has been updated accordingly.

Reviewed the repository's public pages against its current plan catalog, account/billing services, capture admission, notification workflow, report generation, and retention behavior. The platform implementation takes precedence where marketing copy disagreed. This is a source review, not a verification of live Stripe Price objects, deployed settings, provider availability, or the currently published website.

Prices and plan entitlements are unchanged. All six price cards and all numeric plan limits matched already. The corrections address what customers could reasonably infer from those figures and from surrounding feature claims.

| Public claim or omission | Corrected statement | Implementation evidence |
| --- | --- | --- |
| Free trial mentioned without its credit allowance or detector boundary | New accounts have 31 credits, daily checks, and visual detection during the 30-day trial; afterward Free has 10 monthly credits, weekly cadence, and core detectors. Other Free limits remain in effect. | `src/domain/plans.mjs` (`entitlements`, `captureCreditUsage`); `src/services/accounts.mjs` |
| Fast cadence and large watcher counts could imply continuous monitoring of every watcher | Monthly credits are the binding usage budget. Starts are staggered, exact clock times are not promised, and Check Now shares scheduling limits. A 30-day two-minute schedule budgets 21,600 credits per region. | `src/domain/usage-guards.mjs`; `src/monitoring/engine.mjs`; `src/aws/dispatcher.mjs` |
| A credit was described only as a saved run | One credit is reserved per admitted regional check; outages count, known internal failures refund, and canceled work with unknown outcomes remains charged. Recovery attempts are bounded. | `src/domain/plans.mjs`; `src/domain/usage-guards.mjs`; `src/monitoring/regional-coordinator.mjs` |
| Changing plans could sound like a new credit allowance | Consumed credits carry forward; a verified paid renewal resets the allowance. Downgrades require usage and configuration to fit. No automatic overage or credit packs are offered. | `src/billing/service.mjs`; `src/api/routes.mjs`; `src/domain/plans.mjs` |
| Watcher, user, and recipient limits lacked counting rules | Drafts/paused watchers count; owner, active members, and unexpired invitations count as seats; recipients are totaled across watcher tiers. | `src/services/watchers.mjs`; `src/services/accounts.mjs`; `src/domain/usage-guards.mjs`; `src/domain/plans.mjs` |
| Regional quotas were terse and could imply every watcher has multiple regions | Regional subset and per-watcher limits are explained; other watchers use the primary region. Only enabled catalog locations are available. | `src/domain/plans.mjs`; `src/domain/regions.mjs` |
| Optional SMS and daily delivery quotas lacked important boundaries | SMS requires enablement and eligible US/Canadian destinations under the default country configuration; messages are limited to one segment. Attempts/retries count, invitations share email capacity, and suppression/cooldowns can stop sends sooner. | `src/notifications/providers.mjs`, `sms.mjs`, `budgets.mjs`; `src/services/accounts.mjs`; `src/config.mjs` |
| Escalation would continue until someone responded | Each round traverses the configured tiers once and can stop without resolution. Recovery, acknowledgement, all clear, and cancellation can stop it sooner. | `src/notifications/service.mjs`; `src/monitoring/regional-coordinator.mjs` |
| All responses were described as signed web responses | Signed expiring web submissions and sender/code-matched email or SMS replies are distinguished; opening a link does not vote. | `src/notifications/token.mjs`, `response-page.mjs`, `replies.mjs`, `service.mjs` |
| Report limits said “per month/day” without window semantics | Requests count in rolling 30-day/24-hour windows, including later failures; three concurrent jobs; latest 5,000 checks; downloads expire seven days after request. | `src/reports/service.mjs` |
| Scale sounded like an immediately available 1 TB/indefinite-storage purchase | Scale is unavailable for portal checkout/upgrades. Its catalog figures are shown with explicit support/availability/storage-agreement qualification. | `src/domain/plans.mjs` (`selfServe: false`); `src/billing/service.mjs` (`assertSelfServePlan`) |
| Account controls could be understood to cancel paid renewal | Portal closure pauses monitoring but does not cancel Stripe. Public pricing, support, terms, privacy, and security now direct customers to support for cancellation and effective-date confirmation. | `src/services/accounts.mjs` (`scheduleClosure`, `purgeDue`); `src/billing/providers.mjs`; `src/api/routes.mjs` |
| Plan history implied exact physical deletion at the horizon | Customer-visible history is distinguished from asynchronous physical cleanup and retained comparison/approved-green continuity records. Billing reconciliation or an uncanceled subscription can hold account erasure. | `src/domain/plans.mjs`; `src/services/maintenance.mjs`; `src/services/accounts.mjs`; `docs/data-lifecycle.md` |
| Ignoring a page region could imply it was never processed | Ignored selectors filter extracted/captured evidence after fetching; they do not prevent resources from being fetched or guarantee excluded content is never processed. | `src/monitoring/capture.mjs` |
| Every API request and staff action implied identical authentication/audit treatment | Claims are scoped to authenticated customer/steward APIs and privileged support changes. | `src/api/routes.mjs`; `src/security/auth.mjs`; `src/security/masking.mjs` |
| Status said “Platform API operational” | Success means the public health endpoint responded. It does not test authenticated APIs, workers, sign-in, billing, or delivery. Failure alone does not establish a platform outage. | `apps/shared/site.js`; `src/api/routes.mjs` (`GET /api/health`) |
| Support asked for alert response codes | Support requests notification IDs instead and tells customers not to disclose actionable response codes. | `apps/public/support.html`; `src/notifications/service.mjs` |

Changes cover the home page and its search description, pricing cards/table/FAQ, security, support, status and its search description, privacy, terms, and the shared status text. Public script references are cache-versioned to 0.5.18. Existing designs and navigation are preserved.

## Validation

- Programmatic comparison of the public table with the imported `PLANS` catalog: all 84 catalog-derived cells across six plans match. Six support labels match the user's supplied plan table; those service-policy labels are not programmatically enforced by the catalog.
- All six cards match their catalog price and monthly credits. Scale has a support CTA, not a signup/purchase CTA.
- Public HTML structure and local public links checked; stale contradictory copy searched across every public page, including metadata.
- Release packaging runs the existing complete source/test/IaC/build gate. Final results are recorded in the release notes.
- No live AWS, Stripe, Twilio, or SES inspection/deployment. A compatible local Playwright browser is not installed, so no rendered browser acceptance is claimed.

## Operating follow-ups

1. **Cancellation remains a manual operational gap.** The copy now tells the truth, but reliable self-service cancellation should be a separate billing change with provider reconciliation and explicit effective dates. Support must actually process requests and confirm provider cancellation; closure alone is insufficient.
2. **Keep Scale gated.** Retained-storage metering is not implemented. Confirm any assisted arrangement operationally before making stronger public availability or storage promises.
3. **Verify deployment-specific facts before publishing.** Check enabled regions, SMS country/enablement settings, Stripe currency/recurring amounts/tax settings, support coverage, and that the 0.5.17 runtime controls are deployed. The public support labels are the supplied business policy, not proof of staffing or an SLA.
4. **Preserve prior production gates.** This copy release does not resolve the remaining engineering and live acceptance items in the [0.5.17 abuse review](customer-abuse-review-0.5.17.md).

No price increase or entitlement reduction is needed to correct these public statements. Commercial capacity recommendations in the earlier abuse review remain separate from this alignment work.
