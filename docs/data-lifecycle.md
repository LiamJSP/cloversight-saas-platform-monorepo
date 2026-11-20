# Data lifecycle

## Capture evidence

AWS capture evidence is stored in the Region where it was produced under:

`capture-history/<retention-class>/<account>/<watcher>/<region>/<YYYY-MM>/`

Objects are content-addressed inside a monthly cohort. Continued reuse refreshes the object's lifecycle age with an in-bucket metadata copy at most once per day, so a newly retained snapshot cannot lose evidence based on the original object's age without generating a new object version on every capture. The monthly cohort bounds that refresh behavior and prevents one permanent hash key from living forever. Customer-visible metadata ends at the exact plan horizon; finite S3 rules add two days only as a lifecycle-processing/reference-age safety buffer.

| Retention class | Lifecycle |
|---|---|
| 7 | customer horizon 7 days; physical expiry day 9 |
| 30 | customer horizon 30 days; physical expiry day 32 |
| 90 | Standard-IA day 31; customer horizon day 90; physical expiry day 92 |
| 180 | Standard-IA day 31; Glacier Instant Retrieval day 90; customer horizon day 180; physical expiry day 182 |
| 365 | Standard-IA day 31; Glacier Instant Retrieval day 90; customer horizon day 365; physical expiry day 367 |
| indefinite | Standard-IA day 31; Glacier Instant Retrieval day 90; no automatic expiry |

AWS does not transition objects smaller than 128 KB by default. Text and compact metadata therefore ordinarily remain in Standard; large PNG evidence is the expected transition target.

The primary bucket retains legacy `history/` paths for compatibility. After a coordinated snapshot commits, its latest comparable evidence is copied or reused at content-addressed `baselines/<account>/<watcher>/<region>/` keys in the evidence's own Region. A conditional watcher pointer activates the baseline only when that snapshot is still latest; the current and immediately previous generations stay hot. Copies that lose that latest-snapshot race are removed. These rolling comparison pointers are separate from the alert workflow's approved-green snapshot metadata. Baseline objects do not expire, while replaced versions in the versioned primary bucket expire after seven days. `run-results/` idempotency records expire after two days.

## Customer-visible metadata

Snapshot/action-history responses are filtered to the plan horizon: 7, 30, 90, 180, 365 days, or indefinite for Scale. Metadata maintenance prunes expired records while retaining the latest live-watcher and approved-green snapshot metadata needed for continuity. S3 lifecycle remains the independent backstop for ordinary history binaries; the rolling comparison pointer remains hot separately.

Included Scale storage is 1 TB, but storage metering/overage enforcement is not implemented. Scale is therefore sales-assisted and must not be self-provisioned.

## Other records

- Generated PDF reports: seven days; download links: at most 15 minutes.
- Terminal check-job status: maintenance horizon of 30 days.
- Temporary per-Region capture-result entities: removed when aggregation commits; orphan cleanup after two days.
- Raw SES MIME: seven-day S3 lifecycle troubleshooting retention, including replies rejected after receipt; lifecycle processing is asynchronous. The handler limits reads and parser input to 5 MB and rejects permanent parse/reply failures without retrying them as transport failures. This is a processing-size bound, not a card-data detector or raw-mail erasure guarantee.
- Idempotency/replay claims: DynamoDB TTL where configured.
- Operational account/team/invitation data: disabled immediately at scheduled closure and purged after the configured grace period.
- Unsubscribe links: account-bound when created or repaired, removed with account notifications at closure, and pruned after their expiry by bounded maintenance. Legacy links without an account binding are removed by matching the purged notification ID or normal expiry.
- Email opt-out suppressions: retained separately so closing an account does not inadvertently permit unwanted email again. Their identifier minimization, justified purpose and final lifetime still require an approved policy.
- Closed-account store: restricted identifiable account/tax fields and redacted financial records, plus a per-stage deletion manifest. These records are pseudonymous/identifiable, not anonymous; no legal retention duration is invented by the implementation.
- Provider/staff audit records: final legal, accounting, security and hold schedules remain to be approved. Current TTLs and log settings are engineering settings, not evidence of legal sufficiency.

## Erasure sequence

The deletion worker advances one due account through resumable bounded operational batches. Once `purging` starts, access/restoration stays disabled. Each transaction reserves at most 80 entity changes and a conservative 1.5 MB JSON payload estimate for whole-value DynamoDB conditions. The restricted account header stays `operational_pending` until all operational sources are removed. Retained financial summaries and per-subject identity outcomes are separate restricted rows, so transaction history and membership history cannot enlarge a single closed-account item indefinitely. A header over the conservative size bound requires manual minimization review.

Scheduling closure now records an immediate cancellation intent and blocks new monitoring and portal billing operations in the same transaction. Watcher pauses, alert timers, and automatic payment retries drain in batches of at most 40 changed records and a conservative 1.5 MB payload estimate. Reopening restores eligible operational state in the same bounded manner, but never removes cancellation intent or restarts paid billing.

Purge waits for transition batches and cancellation confirmation. The maintenance worker cancels bound Stripe subscriptions, expires or reconciles Checkout Sessions, and checks provider state before recording completion. A stored subscription must be terminal (`canceled` or `incomplete_expired`). Pending, payment-required, in-flight or reconciliation-required internal payments and nonterminal refunds retain their recovery references and block erasure. Known invoices are read and reconciled without automatic collection, refunds or voiding. Subscription holds take precedence; held accounts do not prevent cleanup of other eligible accounts.

Old unbound Checkout operations, missing or mismatched provider bindings, and uncertain provider outcomes require reconciliation. This is not provider-side record deletion or proof that every possible off-platform invoice has settled. See [cancellation policy and recovery](cancellation-0.5.19.md). Historical vendors, backups, and financial retention exceptions remain outside the configured erasure scope.

Unsubscribe records are removed before notifications, preserving notification-to-account linkage for legacy records across interrupted batches. Authenticated identity bindings are recorded before the corresponding membership/profile disappears. After operational completion, the worker resolves customer Cognito bindings and disables/signs out/deletes nonshared identities. It deletes all versions under the account prefixes from the primary bucket and every Region currently listed in `REGIONAL_CHECK_REGIONS`. A profile/identity that is still needed by another active membership is retained with a `retained_shared_identity` manifest outcome.

Directory erasure verifies the immutable Cognito `sub` against CLOVERSIGHT's hashed customer ID. New authenticated membership writes retain the trusted directory binding. A known subject resolves by its exact `sub`; legacy bindings use the member email only as a search hint. Both paths verify the exact subject with `AdminGetUser` before destructive calls. Directory requests have a 15-second abort bound, filtered lookup stops after three pages, and each maintenance call handles at most three eligible identities. Unresolved identities and legacy closed records without membership manifests require manual review; neither an empty eventually consistent directory search nor a missing directory adapter counts as production erasure. Completed identity entries drop temporary email, raw subject and username fields, retaining a minimal subject-hash fence/outcome.

The same closed subject cannot silently create another tenant from a still-valid JWT. A new verified Cognito subject may register separately. This is a replay/authorization fence, not a ban on a person's fresh registration; approved tombstone lifetime and any explicit reinstatement workflow remain product/privacy decisions. Account IDs, subject hashes and masked payment references must still be treated as personal data where linkable.

Identity lookup/transport failures retry with bounded backoff and a five-attempt ceiling; mismatched immutable bindings, missing adapters and missing legacy manifests require manual review. Eligible cases rotate by last attempt time; held cases cannot occupy the first batch indefinitely and starve newer closures.

Operational cleanup completion and communication completion are separate. Assets cannot advance to confirmation while identity cleanup is pending. A durable `attempted` claim with an attempt ID is written before sending the deletion notice; completion/failure writes must match that attempt. A stale 180-second claim becomes `ambiguous` and requires review rather than sending again after a crash that may have occurred after provider acceptance. An accepted email is recorded as `accepted` (or `local_queued` in local development), not proof of human receipt. Suppressed or ambiguous communication stays pending for review; failed attempts use bounded backoff and a five-attempt ceiling. Restricted financial records, opt-out suppression, vendor records, backups and security-record exceptions are explicitly outside the verified configured-asset stage; the customer notice must state that scope.

Before removing or deleting a regional stack:

1. Remove that Region from all watcher configurations.
2. Complete or expire in-flight capture runs.
3. Purge customer evidence from that Region or retain the Region in runtime configuration until scheduled account erasures are complete.
4. Record the retained bucket name if CloudFormation retains it.
5. Only then remove the Region from `REGIONAL_CHECK_REGIONS` and delete the exact regional stack.

Legal hold must be explicit and audited. A recorded configured-source manifest and bounded partitioned operational purge now exist, but a full exportable privacy-case manifest, historical orphan-bucket registry, backup/restore erasure ledger, independent provider erasure outcomes and regional queued-work privacy-generation fencing remain production-governance/engineering work. The purge still uses the compatibility adapter's global coherent reads; bounded writes remove the per-transaction count/financial-item accumulation problem but do not remove that global read scaling limit. Owner-run large-account/interruption/identity/replay scenarios remain required validation; no project execution was performed in this source session.

See [privacy engineering and operating decisions](privacy.md) for the independent individual-rights process and unresolved schedules.

Account-scoped commits conditionally match the strongly read account record unless their own conditional account write already provides that fence. A concurrent compatibility closure/deletion forces a retry; admission rechecks closure state. Scoped transactions allow 98 entity changes with the separate account condition, or 99 when writing the account. This does not eliminate every global collection phantom-insert/quota race; compatibility migration and direct quota records remain future work.
