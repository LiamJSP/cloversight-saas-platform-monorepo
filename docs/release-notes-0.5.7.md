# CLOVERSIGHT 0.5.7 regional capture and evidence

## Changes

- Preserve the first successful HTTP response in capture diagnostics when a later responsive profile fails. A navigation timeout after desktop/tablet evidence is classified as an incomplete infrastructure capture, rather than proof that the monitored URL is down. Report that regional error to the result coordinator immediately and refund its capture credit, instead of waiting for an SQS retry that arrives after the coordinator's result deadline.
- Preserve each regional capture's own timestamp in new snapshots. Show successful HTTP responses without a comparable previous check as **Reachable · Not compared**; keep failed or missing captures distinct.
- Separate the 3D globe from the result summary with the same one-rem gap used between result sections.
- The screenshot and diff actions fetch a fresh, watcher-scoped, snapshot-scoped result, display a spinner through the scroll and for at least two seconds afterward, and then display only evidence attached to the selected region. Ignore late responses for a different selection. The API rejects regional screenshot metadata whose region or bucket conflicts with its regional result.
- Explain a missing diff overlay inline. A first check, an unavailable previous screenshot, or an unchanged screenshot does not produce a comparison PNG, and these cases are not modal errors.

## Deployment

Copy the private `.env` from the deployed 0.5.6 directory into the new extracted project folder. Log in with `aws sso login --profile saas-admin`. Run `npm ci` and `npm run aws:build-worker` from the new folder. Set `WORKER_IMAGE_URI` in `.env` to the new digest-pinned value in `.local/worker-image.env`; do not carry forward an explicit old `WORKER_IMAGE_TAG`. Run `npm run aws:deploy`, `npm run aws:deploy-regional`, `npm run aws:deploy-web`, and `npm run aws:audit -- --quick` in that order. The configured AWS profile in `.env` must be `saas-admin`. A fresh watcher check is required to evaluate the new capture behavior; old results are not rewritten.

## Runtime evidence still needed

An observed `us-west-2` mobile navigation timeout can be a slow target response, a deadline exhausted by previous viewports, or a browser/proxy problem. The source changes how an already observed HTTP response is classified; they do not guarantee mobile navigation completes. Capture stage logs around a fresh failed run show its elapsed time and profile statuses. A `us-east-1` result deadline means its result was never accepted by the coordinator; read its capture Lambda's `capture.record.failed` and `capture.failed` logs, along with Lambda timeout/REPORT lines around that check, before changing queue or browser settings.

The capture SQS queue visibility is 1,200 seconds, the regional result deadline is 900 seconds, and the Lambda timeout is 180 seconds. A record-level S3/SQS failure can therefore still surface as a result deadline. The new code sends a result promptly for browser capture errors, while persistence/transport failures still require their actual worker error to determine the correct fix.

No build, test, AWS command, or deployment was executed during authorship; project owner runs these gates.
