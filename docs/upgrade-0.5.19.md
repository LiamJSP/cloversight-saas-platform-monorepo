# Upgrade an existing deployment to 0.5.19

This is a runtime, worker and portal release. Publishing only the public pages is insufficient. Existing AWS resources, plan prices, entitlements, Stripe Price IDs and dependency resolutions are preserved. No CloudFormation resource definition changes are intended. This review did not deploy to AWS or use your workstation credentials.

## Before deploying

Preserve the deployed source/artifacts, worker digests, private environment, region inventory and stack parameters. Keep your existing tables, buckets, Cognito pools, Stripe customers/subscriptions and signing secrets. Do not replace private configuration with `.env.example`. If upgrading from before 0.5.17, also complete that release's [usage-counter and billing-window migration](upgrade-0.5.17.md), including any earlier prerequisites, using this release's source.

**Existing accounts scheduled for closure will acquire an immediate Stripe cancellation intent automatically when the new maintenance worker runs.** Review those accounts and any already-agreed cancellation dates before rollout. Reopen an incorrectly scheduled closure through the existing approved workflow before deploying, if appropriate. Do not delete or mask their billing references. Already purged historical records without provider references require separate reconciliation; the worker cannot reconstruct them.

Verify the intended policy: renewal cancellation at period end; account closure requests immediate cancellation without automatic refunds, prorations or invoice voiding; reopening never restarts paid billing. Confirm support can handle ambiguous cases and explicit restarts. Verify Stripe restricted-key access for the operations listed in [cancellation and recovery](cancellation-0.5.19.md), and confirm the existing operational email/maintenance alarms are configured and receiving events.

On openSUSE, use the supported Node/npm versions and your existing `saas-admin` authentication method:

```bash
aws sts get-caller-identity --profile saas-admin --no-cli-pager
npm ci
npm run deps:check
npm run verify
npm run test:browser:docker
```

If the profile uses SSO, log in with `aws sso login --profile saas-admin` first. Check the account, stage and region using the existing settings. Use a new unused worker image tag; the default advances from r41 to `lambda-chromium153-playwright-1.63.0-node22-r42`. An explicit `WORKER_IMAGE_TAG` overrides the default and must also be advanced.

## Controlled rollout

Stop new customer/manual writes and pause active monitoring through your existing maintenance procedure. Drain in-flight billing, captures/check results and delayed queues across all configured regions; inspect DLQs. Allow old maintenance work to finish, then prevent old runtime writers from overlapping with the new version. Do not turn off Stripe event delivery or discard queued events.

```bash
AWS_PROFILE=saas-admin npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run deploy:validate
AWS_PROFILE=saas-admin npm run aws:deploy
AWS_PROFILE=saas-admin npm run aws:deploy-regional
AWS_PROFILE=saas-admin npm run aws:deploy-web
AWS_PROFILE=saas-admin npm run aws:audit -- --full
```

Use the existing primary and regional stacks and inspect their change sets/events. Rebuild the managed Lambda runtime and regional worker images from this source, deploy the portals after the runtime, and confirm CloudFront invalidation completes. Do not bootstrap replacements, regenerate secrets, recreate Prices, reset usage windows or bulk-redrive old jobs. The new cancellation and closure fields are additive; no bulk data rewrite is required. The existing billing and steward proxy routes cover the new endpoints.

## Staging acceptance before production traffic

1. In Stripe test mode, cancel a current subscription from the owner portal. Verify HTTP 202, a pending request, Stripe `cancel_at_period_end`, a readback-confirmed date and continued access through the existing paid window. Advance the test subscription to its actual boundary; check terminal status and paid-access restriction. Check past-due and legacy-price accounts too.
2. Schedule closure on a funded 500-watcher staging account with alert timers and failed-payment retries. Verify immediate denial of new work, bounded pause batches, immediate provider cancellation and no new portal charge/retry. Reopen during the grace period: operational restoration must be bounded and must not resubscribe or restore paid access automatically.
3. Race cancellation against Checkout creation/completion, plan change and a renewal response. Deliver duplicate/out-of-order events through the real webhook path. Payments may settle, but no canceled account may be reactivated and every newly created bound subscription must be canceled.
4. Interrupt the worker after Stripe acceptance but before local confirmation. Simulate provider timeout, invalid binding and an old unbound Checkout. Confirm durable retries/readback, no replacement charge, attention after the retry ceiling and a successful audited steward retry after resolving the cause.
5. Leave an invoice open and a refund pending. Verify purge remains blocked after the grace period, other eligible accounts continue, and verified paid/void/uncollectible outcomes reconcile without automatic collection or refund. Verify a failed transaction with an open invoice also holds deletion.
6. Exhaust monitoring email and general mutation quotas, then request cancellation as owner. Verify status access and operational email remain available. Test SES acceptance, suppression and uncertain send outcomes; confirm maintenance failure/heartbeat alarms and staff visibility. Do not use a real customer email for test delivery.
7. Verify member/nonowner and cross-tenant requests fail. A closed-account owner should see only the restricted status screen, with ordinary monitoring APIs denied. Verify customer and steward actions in a real browser at phone/desktop widths. Check pricing, terms, privacy, security and support copy against the deployed behavior.

Local release tests cannot establish actual AWS transaction timing, Stripe permissions, SES delivery or browser rendering. Those live checks were not executable in the review workspace and must pass on your staging deployment before production promotion.

## Rollback

Prefer a forward correction. If reverting code, stop admissions and old/new worker overlap, preserve cancellation intents, payment references, confirmation outcomes and closure progress, and restore all saved runtime/image/static artifacts consistently. **Do not resume old billing writers:** earlier releases ignore cancellation intent and can create charges or reactivate monitoring. Keep affected billing paths closed and reconcile Stripe directly until corrected code is deployed. Never roll back cancellation by issuing an implicit new subscription or by restoring a stale database snapshot over the ledger.
