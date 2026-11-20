# CLOVERSIGHT 0.5.1 release notes

Release 0.5.1 is the validation follow-up to the 0.5.0 infrastructure and price-book migration.

## Runtime fixes

- Capture-credit accounting now treats a Stripe subscription period as authoritative only while both of its boundaries contain the requested instant. Expired periods roll to a coherent UTC calendar window without discarding usage already recorded in that window.
- Federated provisioning now rejects a verified email collision unless the existing account has an active owner membership explicitly bound to the same Cognito subject. Missing legacy owner metadata can no longer be interpreted as permission to claim the account.
- The new-watcher template no longer exposes a generated persisted ID. The customer application consequently creates it through `POST /api/watchers`, where watcher limits and a new server-generated identity are applied atomically.

## Validation corrections

- Downgrade coverage reflects the approved USD catalogue: Essentials supports ten watchers and responsive visual detection. The quote regression now verifies its hourly cadence and primary-Region restrictions without incorrectly stripping pixel comparison.
- The active-incident policy-refresh regression uses an explicitly allowed loopback target and no longer depends on public DNS availability.

## Required environment migration

The durable check and result queues introduced in 0.5.0 require at least two aggregation slots beyond `RESERVED_CHECK_CONCURRENCY`. A copied 0.4.x `.env` containing `WORKER_RESERVED_CONCURRENCY=3` must be changed to `4` when `RESERVED_CHECK_CONCURRENCY=2`. The deployment validator intentionally rejects the old value.

No CloudFormation logical resources or Stripe catalogue identifiers change in 0.5.1. Because application and worker source changed, build and deploy a fresh digest-pinned worker image before deploying the primary and regional stacks.
