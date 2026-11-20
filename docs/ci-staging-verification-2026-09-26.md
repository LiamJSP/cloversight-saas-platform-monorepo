# CI and bounded post-deploy staging verification — 2026-09-26

Current 0.5.14 note: Node 22 is the CI baseline; root and both deployed runtime dependency audits are separate jobs, and absent runtime source locks now fail their gate. Missing locks in this ZIP must be resolved/reviewed before a green run. Docker browser runners own their readiness check, so separate redundant readiness steps were removed. See [current test review](test-review-0.5.14.md).

The checked-in `.github/workflows/ci.yml` runs `npm run verify`, the offline Docker Chromium suite, and a separate documentation job on each pull request and `main` push. These jobs need no AWS account, staging secrets or `.env`. Verification requires Python 3 and PyYAML; the workflow installs both. The documentation job installs pinned Python docs dependencies, regenerates JSDoc and the visual atlas, builds MkDocs, and checks the generated CloudFormation reference tables for drift. A failing assertion, build, or container exits nonzero and stops its job and downstream dependencies.

After **the same main commit** has been deployed to staging, manually dispatch this workflow on `main`. Its staging job runs only on the protected `staging-validation` GitHub environment and on a trusted, preferably ephemeral runner labeled `self-hosted`, `linux`, `x64`, `staging-allowlisted`. That runner needs outbound HTTPS to the staging edge and Cognito domain and Docker access. Staging WAF limits ingress by IP; a generic rotating GitHub runner IP is not sufficient. Restrict the runner to trusted workflows; do not execute pull request code with staging secrets. Protect the environment, and restrict dispatch and deployments to authorized maintainers. No deployment is automated here.

## One-time test fixtures

1. Create two *separate* staging customer accounts and verified-email identities, each with at least one watcher. They must not share a team. Get their exact account IDs from their authenticated bootstraps. The credentials are for dedicated test users, never a real customer's account.
2. On account A, use an existing Professional-or-higher plan in **Stripe test mode**, then publish one dedicated watcher pointed to an owned, stable, publicly accessible HTTPS page. Configure **exactly two enabled AWS regions** and a **weekly schedule** (604800 seconds). Stable content should result in `green`; remove any open alert first. Do not use a site whose content changes during the test. The weekly schedule limits additional automatic captures; the CI command makes exactly one manual check per run. CI itself does not purchase or change a plan.
3. Sign in the two users through the managed Cognito authorization-code flow and securely obtain their refresh tokens. The deployed SPA app client allows refresh-token exchange, but its refresh tokens expire after **seven days**; replace the two GitHub environment secrets before expiry. If refresh-token rotation is enabled later, this flow fails closed rather than losing the rotated token; provide a rotation-aware credential source before re-enabling the staging job. Never put tokens in the repository, workflow command arguments, images, logs, artifacts or `.env` included in the source archive. This token refresh checks the deployed Cognito token service and user claims; it does **not** exercise the managed-login browser form or MFA enrollment.
4. Register the `staging-validation` environment and its variables and secrets below. Set `WEBWATCH_TEST_COGNITO_DOMAIN` to the customer Cognito managed-login origin (trailing slash), `WEBWATCH_TEST_COGNITO_HOST` to that hostname, and `WEBWATCH_TEST_COGNITO_ISSUER` to the exact `https://cognito-idp.us-east-1.amazonaws.com/<customer-pool-id>` issuer. The client ID is the deployed **public customer SPA** client. Use an allowlisted runner with no other tenant workloads.

| GitHub staging environment variable | Meaning |
| --- | --- |
| `WEBWATCH_TEST_BASE_URL` | Exact `https://` public staging origin, ending in `/`. |
| `WEBWATCH_TEST_EXPECTED_HOST` | Exact staging origin hostname. |
| `WEBWATCH_TEST_ACCOUNT_A`, `WEBWATCH_TEST_ACCOUNT_B` | Distinct fixture account IDs. |
| `WEBWATCH_TEST_COGNITO_DOMAIN`, `WEBWATCH_TEST_COGNITO_HOST`, `WEBWATCH_TEST_COGNITO_ISSUER`, `WEBWATCH_TEST_COGNITO_CLIENT_ID` | Exact deployed customer Cognito host, issuer, and client binding. |
| `WEBWATCH_TEST_CHECK_WATCHER_ID`, `WEBWATCH_TEST_CHECK_URL`, `WEBWATCH_TEST_CHECK_REGIONS` | Dedicated watcher, exact stable HTTPS URL, and ordered region IDs such as `us-east-1,eu-west-1`. |
| `WEBWATCH_TEST_STRIPE_WEBHOOK_URL` | Exact staging CloudFormation `StripeWebhookUrl` output on the API Gateway `execute-api` host. |
| `WEBWATCH_TEST_FAIL_ON_WARNING` | `0` by default; set to `1` to fail the staging gate when an optional coverage fixture is missing. |

| GitHub staging environment secret | Meaning |
| --- | --- |
| `WEBWATCH_TEST_REFRESH_TOKEN_A`, `WEBWATCH_TEST_REFRESH_TOKEN_B` | The two distinct customer refresh tokens (rotated manually before their seven-day expiry). |

## What runs and how failures are classified

1. `npm run test:staging:tokens`: exchange each refresh token over HTTPS for a short-lived **access token**, verify issuer/client/role/expiration and distinct subjects, mask tokens and pass them to later Actions steps. Any invalid or expired token is a fatal setup error. It refreshes again before the browser step.
2. `npm run test:staging:ci`: read-only smoke and two-account tenant checks first; send **one** deliberately invalid signature to the exact deployed Stripe webhook and require HTTP 400 with the signature rejection (no valid Stripe event or payment is created). Next, confirm the dedicated watcher/account/target/regions/weekly cadence, two remaining regional credits, and no running job or open alert. Then issue **one** authenticated Check Now POST. Poll only the returned persisted job ID, not a general latest-job list. Accept a brief initial 404 and at most four consecutive transient 429/502/503/504/network failures for reads, while retaining an absolute 27-minute job deadline and at most 270 job reads (up to ten minutes for queue staleness, 15 minutes for regional results, plus a two-minute buffer). Refresh the access token during long waits. Require completed/green with a snapshot, then allow up to 90 seconds for the separate account-scoped regional summary to show `complete` in both configured regions. A failed, skipped, timed-out, wrong-account, or error-region result is fatal. **Never retry the POST** after a lost response: doing so could create a second check.

   Smoke and isolation GETs permit at most two additional reads after transient 429/502/503/504/network failures; permanent denials and bad JSON still fail. All retry limits count actual requests rather than hiding cloud latency behind an unbounded loop.
3. `npm run test:staging:browser:docker`: browse the deployed customer modal read-only with a new access token. Docker's image carries version-matched Chromium. No mutation is allowed from the browser script.
4. The optional `run_load_probe` dispatch input runs the existing dry plan and a deliberately small, bounded read probe after all other checks have passed. It makes at most 20 GETs including identity preflight, two concurrent, at most 30 seconds. The $2 estimate is *not* an AWS spending guarantee.

Executed assertions and HTTP failures always stop the job. Missing historical check jobs or reports on a fixture produce explicit `WARNING` messages because those **particular** cross-account denial cases could not run. Set `WEBWATCH_TEST_FAIL_ON_WARNING=1` to make such warnings fail. The existing `npm run aws:audit -- --strict` has the same fail-on-warning behavior if run separately with an AWS read-only role. The CI workflow does not use `saas-admin` SSO credentials or install an AWS IAM role; adding a CloudFormation audit job requires an explicitly configured GitHub OIDC read-only role, and the full audit requires the project's deployment settings and staging allowlist. Do not put a workstation `.env` or long-lived AWS keys in GitHub Actions.

Strict warning mode requires at least one retained check job and report for **each** fixture account. Provision those records in advance using a separate controlled staging setup; the daily CI gate intentionally does not create reports or extra checks merely to remove a warning. For a manual run with short-lived access tokens already in your shell, `WEBWATCH_TEST_FAIL_ON_WARNING=1 npm run test:staging:ci` enables the same policy.

## Current limits

- This verifies the actual AWS API, queued job, two regional capture workers, durable snapshot and customer read model. It does not validate every worker failure/retry path or large-scale concurrency.
- The live Stripe probe checks **invalid-signature rejection only**. It does not make a real Stripe test-mode payment, send a recipient email, receive a reply, complete managed-login UI or MFA, or validate SES delivery. Local deterministic Stripe/webhook/notification tests are in `verify`, but those do not establish live provider end-to-end behavior. These need isolated, reversible fixtures and credentials before they can become reliable daily gates.
- Each run performs one two-region capture plus bounded reads. The dedicated watcher also runs on its own weekly schedule. Browser Lambda duration, page size, history retention and account activity influence actual AWS charges; this test caps its requests and fan-out, not the cloud bill. Ensure your staging budget alarm and actual cost review are configured separately.
- The 15-minute Cognito access token is refreshed mid-poll; refresh-token expiration after seven days still requires operator rotation. A staging run with stale credentials fails before its costly check.

The tests and workflow were authored without running them. Do not claim a green CI gate until your own GitHub Actions run confirms the fixtures and AWS deployment match these contracts.
