# CLOVERSIGHT 0.5.17

Durable account quotas, server pacing and persisted cadence protect scheduled/manual checks, concurrent creates, stale indexes, edits, pause/resume, undo and replacement watchers. Unknown canceled work remains charged; infrastructure refunds retain a separate attempt limit and regional retries have a three-lease ceiling.

Plan changes preserve consumption through anchor resets. Paid renewal replay cannot refill credits, and large exhausted accounts resume through durable bounded batches. Oversized configuration adjustments fail before charging.

Incident recipient overrides and send/retry paths enforce current plan limits. Invitations share email budgets, cooldowns and opt-outs. SMS fits one segment with preserved reply instructions. API budgets use the verified account across members/IPs.

Prices and catalog allowances remain unchanged. Existing CloudFormation resources and dependency resolutions are unchanged from 0.5.16. Upgrade code, regional images and static assets together; account/run fields are additive and old writers must not remain active after reopening traffic.

See the [plan and abuse findings](customer-abuse-review-0.5.17.md), [upgrade guide](upgrade-0.5.17.md) and [verification evidence](review-evidence/verification-0.5.17.txt). Live AWS/container/provider acceptance and the documented signup, global maintenance/retention, large lifecycle, renderer and physical-cost gates remain outstanding.
