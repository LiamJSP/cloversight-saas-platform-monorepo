# Browser and evidence isolation

This guide describes checked-in behavior through 0.5.16. Local application tests, builds and IaC checks were executed; the Amazon Linux browser image and live AWS behavior were not verified in this review. See the [assessment and verification limits](security-production-review-0.5.16.md).

## Fresh browser state

`src/monitoring/capture.mjs` snapshots caller configuration before awaiting any work. Every capture attempt launches a new Chromium process and a new Playwright default context with an atomically created private profile beneath the runtime's temporary directory. The profile path is never reused, including on a browser retry. The default context preserves the established Sparticuz/Amazon Linux launch approach; it does not mean that the profile or browser is shared.

The browser driver and extracted Chromium executable may be cached by the runtime. Browser processes, contexts, pages, profiles, cookies, cache, local/session storage and service workers are not cached between checks. Service workers and downloads are disabled. Startup pages must be blank/new-tab pages, extra startup pages close, and page-created popups close without becoming evidence. Driver arguments cannot override the invocation's profile/proxy or request restoration of an old session.

Desktop, tablet and mobile are three viewports of the same newly created capture session. They may share target-created cookies within that one check. A later check, another Region, a retry or another watcher receives a distinct process, context, profile and loopback egress proxy.

## Live capture resource limits

The loopback proxy meters streaming traffic before forwarding each HTTP body chunk or encrypted CONNECT tunnel chunk. One cumulative session envelope covers both inbound and outbound bytes across every viewport; it is `MAX_PAGE_BYTES` multiplied by the actual capture profile count (30 MB for the default three-profile capture, 10 MB for a metadata-only capture). TLS framing and requests count toward the CONNECT envelope. Ordinary HTTP headers are bounded by Node's header parser and the session request ceiling rather than included in body-byte accounting. This wire-byte counter is a capture resource-abuse signal, not an AWS chargeable-egress meter.

The proxy also admits at most 1,500 HTTP requests/CONNECT tunnels and 1,500 accepted TCP connections over the session, with at most 128 browser-side connections active at once. Browser routing independently counts up to 1,500 actual HTTP(S) requests, including requests multiplexed inside one encrypted tunnel, before starting per-request DNS validation. These ceilings are shared by Desktop, Tablet and Mobile and do not reset between views. Crossing any limit retires the active proxy sockets and blocks later sockets/upstreams. Capture preserves the `PAGE_TOO_LARGE` resource-limit error even when Playwright reports the interrupted navigation as a generic network failure. The existing per-profile body, DOM, dimensions and screenshot checks remain in place.

These controls bound normal renderer network work; they do not sandbox a compromised browser process. A credentialless renderer with an independently enforced network boundary and a privileged evidence broker remains a separate design/rollout task. Live stress and isolation validation must be performed by the owner before production promotion.

## Timed-out work and cleanup

A deadline race does not cancel an asynchronous Playwright launch. The capture now retains that launch promise, waits for it during retirement, and closes any context that becomes available late. A proxy that binds after its startup deadline also closes. Cleanup removes the profile only after browser shutdown. Cleanup failure is an infrastructure error (`CAPTURE_ISOLATION_FAILED`) rather than a successful capture or target outage.

A retired session that cannot finish shutdown remains quarantined in the warm runtime. Before another capture starts, its retirement must finish; otherwise the new check fails closed. The implementation does not attach to or resume the unfinished browser. A Lambda hard kill can interrupt cleanup, but subsequent profile names are still unique and do not reopen the old profile.

## Job, result and tenant binding

`src/aws/regional-capture-worker.mjs` freezes a cloned job after validation. The job's Region must match the worker, its result queue URL/Region must exactly match deployment configuration, and its immutable configuration hash is verified when supplied. An expired queued run cannot start another browser.

Previous evidence is accepted only from this worker's configured bucket/Region or the explicitly configured legacy primary bucket/Region. Every key must remain beneath this job's account and watcher prefix, and modern keys also include the worker's Region. Referenced content hashes must agree with content-addressed filenames; downloaded previous bytes are checked against their recorded hashes before comparison. Cross-account, cross-watcher and arbitrary-bucket pointers fail validation before any evidence read.

New result objects use:

`run-results/<account>/<watcher>/<job>/<run>/<region>.json`

They commit with S3 `IfNoneMatch: '*'`. Before an uncached capture starts, a sibling `.lease` object binds the job fingerprint for 210 seconds, longer than the 180-second invocation timeout. Creation and expired-lease replacement are conditional; competing deliveries defer. Cached results are checked before and after claiming. The first persisted result still wins and later deliveries resend it instead of overwriting it. Replays verify account, watcher, job, run, snapshot, Region, evidence location and responsive profiles; new records also bind a canonical job fingerprint. The older account/run result path remains readable for a rolling deployment, with the same identity/evidence checks; legacy records cannot retroactively supply a job fingerprint that was never recorded. Drain old workers before deploying because they do not honor the new lease.

The central coordinator independently validates its durable run binding and permitted evidence locations before accepting a result. Customer APIs still authorize retained snapshot ownership before returning short-lived signed URLs. Shared AWS SDK clients hold transport configuration, not browser or watcher evidence.

## Legacy direct-capture compatibility

The current CloudFormation capture entry points use the regional SQS worker. The retained direct invoke adapter and handler now exchange a random request nonce and a distinct execution ID. Temporary objects are scoped to `capture-tmp/<job>/<nonce>/<execution>/`. The caller verifies the echoed identity, exact keys and complete responsive profile set before reading or deleting those objects. Deploy both compatibility files together; an older handler cannot satisfy the new adapter's invocation binding.

## Deployment and trust boundary

Primary and regional capture stacks must set their own `CAPTURE_QUEUE_URL`, `CAPTURE_RESULT_QUEUE_URL` and `CAPTURE_RESULT_QUEUE_REGION`, plus `LEGACY_SNAPSHOT_BUCKET_NAME` and `LEGACY_SNAPSHOT_BUCKET_REGION` for the supported migration path. Deploy the runtime and every configured regional image/stack from the same release. The `run-results/` lifecycle and account-erasure prefix remain valid for both results and leases. Caught failures shorten visibility; an uncached executing capture also sets 240-second visibility to recover after a hard kill before the durable run expires.

These are application/session/evidence isolation controls. The browser role remains shared across tenants and the Lambda Chromium launch still disables the Chromium sandbox to match its supported runtime. This change does not claim per-tenant hardware/IAM isolation or protection against every Chromium exploit. Browser image patching, least-privilege role review and live staging verification remain deployment responsibilities. A customer cannot use these capture-role permissions directly.

Chromium receives an explicit native-runtime environment allowlist rather than AWS credentials, runtime API endpoints or application secrets. This only limits inheritance: the same UID/process environment and shared execution role are not a credentialless boundary. Capture KMS permissions are now S3-bound; a separate broker and externally enforced renderer network boundary remain architectural follow-up work.

For a suspected mismatch, preserve the exact `jobId`, `runId`, `snapshotId`, `accountId`, `watcherId`, Region and `capture.cleanup.failed`/binding error events. Do not redrive a message with edited identifiers or replace a cached result to force acceptance. Follow [regional capture queue triage](operations.md#regional-capture-queue-triage).

## Bounded cold preparation in 0.5.11

Cold browser preparation has one maximum 40-second allowance, including previous-session retirement. The configured page budget begins after the new private session is ready and is shared across Desktop, Tablet and Mobile. Setup and page work stay within 150 seconds, further reduced by remaining Lambda/durable-run time with persistence reserves. Each startup substage retains its own cap. This does not reuse browser processes or profiles and does not relax fail-closed cleanup. Capture log markers record both setup and absolute budgets for post-deployment review.
