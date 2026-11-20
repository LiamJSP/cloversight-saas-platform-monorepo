# CLOVERSIGHT 0.5.8 regional escalation eligibility

The alert transport remains AWS SES v2 `SendEmail` through the AWS SDK. The staging sender comes from `SES_FROM_ADDRESS` or the default `alerts@${stageBase}`. Nothing in the repository calls DigitalOcean or uses its SMTP service.

## Changes

- An address explicitly configured in a watcher tier with no linked team user ID now receives alerts for that watcher's affected regions. Linked team recipients still require active team membership and a matching `watchingRegions` selection.
- Forward escalation computes the next level from recipients eligible for the alert's affected regions. A level without eligible recipients is skipped, including when it sits between two eligible levels; the tier claim no longer rejects a later eligible level because an earlier filtered level has no recipients.
- Notification Activity marks unactivated levels with no eligible recipients and shows that they will be skipped unless updated. Notification status uses the same region eligibility calculation as the dispatch scheduler. The notification runtime log marker is `0.5.8`.
- The existing regional recipient fixture has been updated to reflect delivery to explicitly configured external addresses. No tests or builds were executed by the author.

## Deployment

Extract this complete ZIP and copy your private `.env` from 0.5.7 into the new directory. Use `AWS_PROFILE=saas-admin`. Run `aws sso login --profile saas-admin`, `npm ci`, `npm run aws:build-worker`, update `WORKER_IMAGE_URI` in `.env` from `.local/worker-image.env`, then `npm run aws:deploy`, `npm run aws:deploy-regional`, `npm run aws:deploy-web`, and `npm run aws:audit -- --quick`. The source hash and release marker require a fresh worker image. Existing Stripe settings, pricing and secrets are unchanged.

An existing **open** alert can resume its uncompleted escalation after this version reaches the maintenance worker, including delivery to explicitly configured later level addresses whose timers have elapsed. Inspect its Notification Activity before deploying if you need to adjust those recipients first. A completed, acknowledged, resolved, canceled, or paused incident does not re-send earlier levels.

## Remaining diagnosis

The reported DigitalOcean notification cannot be attributed to this AWS application from timing alone. Verify the notice through the DigitalOcean control panel/support using a manually entered address; ask for the affected resource/account identifier, outbound IP, message timestamps in UTC and whether the event preceded deactivation. Inspect the raw headers of the notice and one CLOVERSIGHT alert email. Redact personal addresses and tokens before sharing. For a missing escalation in the deployed version, inspect Notification Activity's level states and the billing Lambda's `notification.tier.*` / `maintenance.failed` log events; the dispatcher queues maintenance every minute. SES acceptance means the API accepted a send, not that the mailbox received it.
