# Notifications and acknowledgement

Each alert records the notification and consensus policy used for its incident round. Publishing recipient, tier, template, or consensus changes updates that policy without rewinding notification progress. Maintenance preserves the highest durably activated tier and repairs its next deadline, so an edit cannot resend level one.

## Incident categories and regional evidence

Alerts and notification activity share the retained check's incident classification. **Site change** means a configured text or visual threshold was exceeded. **Trigger phrase detected** means captured content matched a configured phrase; the email lists the matched phrases separately from ordinary changes. **Site outage** means target availability failed. An outage takes precedence over trigger phrases or generic changes in the headline, while the email still mentions any additional findings in reachable content.

Outage scope describes the monitored regions, not the entire Internet. **Complete site outage** requires positive outage evidence from every configured region in that check. **Regional site outage** requires both an unavailable target in at least one region and a reachable target in another. **Site outage · extent unconfirmed** is used when the remaining coverage is missing or inconclusive. A browser/capture infrastructure failure is missing evidence, not proof of a site outage or recovery. Region selection stored with the incident remains authoritative after watcher settings change. Older alerts lacking sufficient retained coverage use the unconfirmed label.

Both native HTML and plain-text email prominently include the category, scope explanation, monitored and affected regions, and trigger phrase evidence. Outages, phrase matches, and ordinary changes use distinct red, amber, and blue HTML banners; the meaning also appears in text for blocked styling and assistive technology. Signed responses, unsubscribe controls, and the fail-safe multipart renderer remain unchanged.

Custom message templates retain their content beneath this incident evidence. `{{alert.kindLabel}}` and `{{alert.summary}}` use the shared category and customer-safe findings. Templates may also use `{{alert.incidentDescription}}`, `{{alert.outageScopeLabel}}`, `{{alert.affectedRegionsLabel}}`, `{{alert.checkedRegionsLabel}}`, and `{{alert.triggerMatchesLabel}}`. Email subjects always retain the incident label even if a custom subject omits it. The exact legacy default ending in `{{watcher.name}} changed` is rendered without that final word so an outage is not described as a content change. Raw capture failure details are never copied into outage summaries.

## Tier behavior

A tier sends immediately when activated. If fewer than `requiredAcknowledgements` recipients respond before the configured delay expires, the next tier activates. Escalation is a single forward-only pass: each tier is activated at most once for the incident round, and the final tier completes the sequence without scheduling another level-one send. Legacy repeat timers are removed during maintenance.

For regional incidents, a recipient linked to an active team member receives alerts only for regions in that member's watching list. An email address explicitly entered in a watcher level without a linked team user ID receives that watcher's regional alerts. Levels with no eligible recipients are skipped while later eligible levels continue. The Notification Activity dialog marks levels with no eligible recipients so the owner can update them before their turn.

Tier dispatch is durable. The alert atomically claims a round/tier dispatch before any provider call, then sends its recipients with bounded concurrency. A watcher remains notification-eligible while a new capture holds its `checking` lease, so a back-to-back check cannot discard a recipient claim, tier-completion commit, or escalation deadline. Maintenance resumes a stale dispatch left incomplete by an interrupted worker, reclaims a provider delivery left in `sending`, and retries it once. Idempotency remains scoped to alert, round, tier, and recipient.

## Daily provider-attempt budgets

An account-wide UTC-day budget caps each outbound email and SMS provider attempt, including the single retry. Free allows 50 email attempts and no SMS; Essentials 250/25; Professional 1,500/75; Team 3,000/150; Business 7,500/300; Scale 15,000/600 (email/SMS). Exhausted deliveries end as **Not delivered — daily limit reached** and do not call the provider. A fresh budget starts at 00:00 UTC. Retired plans with an unrecognized plan ID have a conservative 500/25 fallback; retired Essentials uses the Essentials limit. The claim and the delivery record share a transaction, so parallel dispatches cannot overshoot a tenant's budget. Allow enough headroom for incident escalation when setting tier recipient lists.

## Customer email opt-out and operational delivery

Each alert email includes a signed, opaque `/unsubscribe/*` link in its HTML and plain-text footer. SES also receives `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. A GET shows a confirmation page and does not mutate state, which prevents ordinary security-link scanning from silently opting out a recipient. A POST records the block.

The normalized address is stored in the global `emailSuppressions` collection, outside every customer account. A matching block is checked when a recipient notification is claimed and again immediately before the provider request; retries and customer team invitations respect the same policy. A suppressed notification is terminal for that incident and forward escalation continues without replaying it. Customer watcher edits cannot override the block. Only the platform owner can add or remove an address from **Email block list**, with a mandatory audit reason; ordinary stewards retain read access. Removing a customer block allows future mail but never replays previously suppressed notifications. New suppression records explicitly use `scope: customer`; legacy steward and recipient-link records keep that meaning.

Administrative security, staff-action and technical notices, and required account-deletion confirmations, are operational communications. They do not consult voluntary customer blocks or customer attempt budgets. Their destinations remain deployment/owner policy; customer unsubscribe links cannot disable supervisory mail. Explicit provider restrictions (`scope: provider`, or SES/provider bounce/complaint sources) still block an operational send, and the SES transport continues to honor SES's own suppression controls. A provider restriction cannot be cleared through the customer block-list endpoint. This release does not ingest SES feedback into local restrictions or establish alternate operational recipients.

The account-cleanup notice describes only completed operational/linked-identity cleanup and monitoring evidence in currently configured storage. It identifies retained financial, opt-out, provider, backup/security and out-of-scope identity exceptions without inventing an approved legal retention basis or claiming universal erasure. Cleanup completion and the separate communication outcome remain distinct.

Unsubscribe links now carry the originating `accountId` as well as notification identity, so account erasure can remove their residual personal data. Older links are repaired when reused for a notification; account cleanup also resolves legacy links by notification identity. The link-creation transaction refuses inactive or purging accounts before returning or creating a link, preventing an interrupted delivery from recreating an erased link between cleanup batches. Initial sends and retries record this as cancellation, and email/SMS checks recheck active account state before calling the provider. An existing valid unsubscribe link can still record the recipient's choice until the erasure process removes it. Expiration and erasure must be enforced independently of asynchronous storage deletion.

SES returns **accepted** only when it returns a provider message ID; local mode returns **local_queued** after writing its file. Neither means delivered to a mailbox. Customer notification `status: sent` remains the compatibility/dispatch state, while `deliveryState` distinguishes provider acceptance, local queuing, suppression, failed attempts and ambiguous attempts. An interrupted provider attempt is ambiguous because SES may already have accepted it. SDK retries are disabled; the existing incident service owns its single bounded retry and provider-attempt allowance. Possible duplicates remain after an ambiguous attempt. Positive delivery confirmation requires a future authenticated SES-feedback reconciliation path.

A green recovery check cancels the current dispatch before it clears escalation timers. Provider calls already accepted before that transaction may still arrive, but their old round cannot restore timers or accept a response after a later recurrence opens a fresh round. Delivery attempts also carry attempt IDs so a late result from an abandoned attempt cannot overwrite the recorded result of its retry.

## Customer notification activity controls

The watcher list exposes the current level as queued, notifying, retrying, paused, or waiting alongside a region-level watcher check summary. A small account-scoped endpoint refreshes these statuses without reloading the rest of the customer bootstrap payload. The **Check Status** dialog presents Phase A check progress first, followed by a dividing rule and Phase B notification activity. It deliberately omits raw capture errors, infrastructure identifiers, and target response details; a failure is shown as **Website issue** or **Watcher error**.

The notification section is an incident read model built from the alert, its frozen base policy, incident controls, dispatch claim, and per-recipient notification records. Customers can:

- Replace recipients on a level that has not activated. The replacement is stored in `alert.notificationControl.recipientOverrides` and never changes the watcher policy or later incidents.
- Mute an unactivated level, or mute the current waiting level to advance immediately to the next unmuted level. A paused current level must be resumed before it can be force-skipped.
- Cancel the remaining notification activity without resolving the detected-change alert. Cancellation clears timers and prevents new sends, stale dispatch completion, retries, and late signed responses from changing notification state.

Every mutation supplies the control revision it read. The state transaction rejects a stale revision, and immediate skip dispatches also verify the expected next tier ID. This keeps UI actions deterministic when a check, maintenance pass, watcher policy edit, or second browser session overlaps them. A provider call accepted before cancellation or muting cannot be recalled; the UI states this explicitly.

Recipients can respond:

- `Alert Received`: counts toward acknowledgement consensus. On consensus, escalation completes without a repeat send.
- `All Clear`: counts toward all-clear consensus. On consensus, the incident snapshot is promoted to the permanent green baseline and the watcher returns to green.

## Signed browser response

The URL is expiring and recipient-bound. A `GET` displays a branded confirmation form and never records a vote, protecting against link scanners. Only a `POST` records the selected response. Both the prompt and result pages use the same self-contained renderer in local and AWS runtimes, include a clear portal login action, and remain compatible with the response route's restrictive content-security policy.

## Email replies

Outbound email contains a short response code and a reply address tied to the configured reply domain. SES stores raw MIME briefly, invokes the parser, and supplies security verdicts.

Alert mail is sent as native text and HTML alternatives. The HTML renderer uses inline styles and a table layout, with an HTML wordmark instead of a remote logo asset, so the brand and alert action survive blocked images and restrictive clients without introducing an open-tracking request. It contains no scripts, forms, web fonts, attachments, or marketing pixels. The plain-text alternative independently includes the watcher, monitored URL, signed response URL, accepted reply phrases, and response code.

The SES v2 transport always receives the exact verified `SES_FROM_ADDRESS`; display-name formatting is not mixed into the identity field. Rendering is fail-safe: an unexpected presentation error is logged without message content and replaced immediately by a complete minimal multipart body, so presentation cannot suppress the provider call.

CloudFormation provisions DKIM signing, a custom MAIL FROM domain with SPF, DMARC, SES reputation metrics, and operational event delivery for bounces, complaints, delays, rejections, and rendering failures. These controls and the recognizable transactional content are the deliverability foundation; inbox placement can never be guaranteed by HTML styling alone.

The security-alert audit marker persists its leased attempt identity/count, provider message ID and truthful **attempted**, **accepted**, **local_queued**, **suppressed**, **failed** or **ambiguous** outcome. Retry is limited to one additional attempt on a later qualifying staff action; a late result cannot overwrite its replacement attempt. Operational staff/technical/privacy sends still run inline through the existing store adapter. An independent durable outbox/worker, positive and negative feedback reconciliation, independently confirmed fallback subscriptions and sender heartbeat remain outstanding work; acceptance must never be presented as confirmed delivery.

Automatic email votes require:

- Virus and spam verdicts not failed.
- Passing DMARC verdict.
- Recognized response phrase.
- Valid response code.
- Sender address matching the frozen intended recipient.
- Unused provider event ID.

Recipients who cannot pass the automatic-reply policy can use the signed browser link.

## SMS replies

SMS is an optional deployment capability. Leave `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` all blank for email-only operation, or configure all three to enable the SMS editor, outbound provider, and webhook routes. Partial configuration is rejected. SMS templates must include `{{responseCode}}` whenever an SMS recipient is configured. Twilio inbound and delivery-status webhooks require valid Twilio signatures and idempotent provider event handling. Destination numbers are validated through Twilio Lookup and restricted to Canada and the United States.

## Local mode

Local email and SMS are written to `.local/outbox`. The same response/consensus domain logic is used without sending external messages.
