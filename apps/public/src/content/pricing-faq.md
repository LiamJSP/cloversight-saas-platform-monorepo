---
eyebrow: Plan details
heading: Clear before checkout.
---

## What is a capture credit?

Each watcher check accepted for processing reserves one credit per AWS region. Desktop, tablet, mobile, and every enabled detector are included; a five-region check reserves five credits. A target outage uses a credit. Confirmed platform-internal failures are refunded, and infrastructure retries do not add capture-credit charges. Canceling a check already in progress does not refund work whose outcome cannot be confirmed.

## What counts toward watcher and user limits?

Each saved URL configuration is a watcher, including its cadence, detectors, thresholds, ignored selectors, and notification tiers. Drafts and paused watchers occupy slots. The account owner, active members, and unexpired pending invitations count toward the user limit.

## How do regional checks work?

Free and Essentials use the primary capture region. Higher plans allow selected watchers to use the regional choices available in the portal, up to the per-watcher and account limits in the table. For example, Professional permits up to two regions on ten of its fifty watchers; other watchers use the primary region. The regional catalog covers N. Virginia, Ohio, Oregon, Canada Central, and Ireland; availability depends on enabled locations. Each region consumes its own credit.

## Can I change plans later?

Eligible plan changes are available in the portal, with unused-period price credit and any amount due calculated by the server. Consumed capture credits carry forward; changing plans does not refill the allowance. Your existing usage and configuration must fit the new plan. Scale and retired plans require support assistance.

## Are notifications limited?

Recipient limits apply to the total across all tiers of a watcher, not separately to each tier. Daily email and optional SMS attempt limits apply across the account and reset at midnight UTC. Retries count, and team invitations share the email budget. Destination suppression and invitation cooldowns can block sends before the account limit is reached. SMS is limited to one segment per attempt, so long messages are shortened. A send attempt is not a guarantee of delivery.

## How does escalation stop?

A notification round advances through the configured tiers once. It stops when the configured acknowledgement or all-clear threshold is reached, recovery is detected, notifications are canceled, or the final tier is exhausted. An incident can remain unresolved after notifications stop. No monitoring or delivery system can guarantee detection or human response; the portal records delivery and response state.

## How are reports counted?

Essentials and Professional use rolling 30-day request windows; Team, Business, and Scale use rolling 24-hour windows. Accepted report requests count even if generation later fails, with at most three reports queued or running at once. Reports include up to the latest 5,000 checks within the selected period and your plan's history window. HTML and PDF downloads expire seven days after the request.

## How do I stop paid renewal?

The account owner can select **Cancel renewal** in Billing. Once confirmed by Stripe, renewal stops at the end of the current paid period. Scheduling account closure stops monitoring and requests immediate subscription cancellation. Check the portal for confirmation and the effective date; requests awaiting Stripe confirmation remain pending. Cancellation does not automatically refund payments or remove outstanding invoices. Contact [support](mailto:support@cloversight.app?subject=Subscription%20cancellation) if a request needs attention. [Read about cancellation and closure.](/terms#ending)
