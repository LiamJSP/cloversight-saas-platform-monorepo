# 0.5.16 — Security and capture-capacity hardening

This release separates browser capacity from coordinator concurrency, admits larger watcher bursts, suppresses duplicate scheduler/browser work, retries failed messages within durable-run deadlines, preserves scheduled cadence, and reduces quiet-period global reads. It adds fail-closed AWS secret configuration, numeric IPv6 filtering, a restricted browser environment, S3-bound capture KMS permissions, TLS policies, queue-age alarms and Lambda quota preflights.

All three dependency trees are locked. The vulnerable documentation-only markdown-it dependency is updated. Verification now checks every lock, and release archives exclude nested node_modules. Five stale baseline fixtures were corrected while preserving the stricter payment/tenant checks.

Start with [the existing-deployment upgrade guide](upgrade-0.5.16.md). Read [the complete security, capacity, pricing and validation assessment](security-production-review-0.5.16.md) before production promotion. Existing prices, credit entitlements, stateful resource identities and staging access exceptions are preserved.

Local verification passed 190 tests and build/IaC checks. Browser-container and live AWS acceptance remain outstanding. This release does not make Chromium credentialless, replace every global transaction, meter Scale storage or provide a hard dollar spending cap.
