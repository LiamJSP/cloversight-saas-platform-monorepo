# Additional testing layers — 2026-09-26

No tests, browser sessions, builds, deployments or load probes were run while authoring these changes. Run the local gates before deploying. The scripts in this document only issue GET requests against a specifically configured staging host; no script creates accounts, checks a target URL, sends email, mutates plans, or calls Stripe.

## Local gates and GitHub Actions jobs

Run `npm ci`, `npm test`, and `npm run verify` on a standard Node 20–22 runner with Python 3 and PyYAML. `verify` includes syntax, all deterministic `node:test` files, IaC validation, build and extension packaging. Run `npm run browser:docker:check` and `npm run test:browser:docker` in a separate Docker-capable job, or use `npm run browser:install` and `npm run test:browser` on a natively supported browser runner. The local browser tests start the app with a disposable file store and local providers, then stop it and remove its state. Do not mark browser coverage green if Chromium is missing. Configure the actual GitHub Actions jobs in your CI/CD setup.

## Prepare staging fixtures

Create two separate customer identities on different teams, each with at least one watcher. Use short-lived **access tokens** (not ID tokens) for both. Provide the exact public staging hostname and the two account IDs in environment variables; do not store tokens in repository files, Actions artifacts or command arguments. The account IDs must differ. Staging functional verification can also exercise foreign check-job and report IDs if those fixtures already exist; it reports when either record type is absent. Refrain from creating live watcher checks just for these read-only probes.

Example bash commands, with your real account IDs substituted:

```bash
export WEBWATCH_TEST_BASE_URL=https://staging.websitemonitoringtool.com/
export WEBWATCH_TEST_EXPECTED_HOST=staging.websitemonitoringtool.com
export WEBWATCH_TEST_ACCOUNT_A=acct_replace_with_first
export WEBWATCH_TEST_ACCOUNT_B=acct_replace_with_second
read -rs -p 'First customer access token: ' WEBWATCH_TEST_TOKEN_A && export WEBWATCH_TEST_TOKEN_A
read -rs -p 'Second customer access token: ' WEBWATCH_TEST_TOKEN_B && export WEBWATCH_TEST_TOKEN_B
npm run test:staging:smoke
npm run test:staging:functional
npm run test:staging:browser
```

For a browser check inside Docker, use `npm run test:staging:browser:docker` after the same environment setup instead of `npm run test:staging:browser`; no host Chromium install is needed. The container receives only the four necessary staging variables from your environment, and its image never contains the token or `.env`. Docker administrators can inspect an active container's environment; use a short-lived staging token and let `--rm` remove the container afterward. The staging container needs network access to your staging host. The browser interception rejects non-GET API calls and aborts once it reaches 20 browser API requests; the initial account check is one additional GET. It does not perform a real Cognito sign-in. Passing it confirms a valid existing token can render the customer UI and its Check Status modal, but it cannot certify login, MFA, payment or a steward's managed session.

## Small, bounded load exercise

Use a staging account dedicated to this purpose, with at most ten watchers. The probe reads `/api/customer/bootstrap` once to verify the account binding and fixture size, then repeatedly reads `/api/customer/notification-status`. It runs only with `--execute`; the plan command performs **zero** HTTP requests. Configure a maximum estimated spend, then review the printed request/time bounds before running:

```bash
export WEBWATCH_TEST_MAX_USD=2.00
export WEBWATCH_TEST_MAX_REQUESTS=20
export WEBWATCH_TEST_DURATION_SECONDS=30
export WEBWATCH_TEST_CONCURRENCY=2
export WEBWATCH_TEST_INTERVAL_MS=500
npm run test:load:plan
npm run test:load -- --execute
```

The script refuses ceilings above $5, durations over 60 seconds, more than 100 requests or three simultaneous requests, and launch intervals below 500 ms. The lower of request count and the estimated dollar allowance wins. It reserves $0.10 of assumed spend **before each attempt**, counting timeouts and HTTP errors, so a configured $2 limit permits at most 20 total GETs including preflight. It uses no retries and stops after a non-200 response.

This checks a small read-heavy scaling path; it does not measure check-worker scaling. AWS pricing, background operations, retries triggered inside the application, unrelated account traffic, billing lag and price changes are outside the script's observable cost. The dollar figure is a conservative estimate, never an enforceable account-wide spending cap. Keep an AWS budget alert on the staging account and inspect actual costs afterward before increasing load. [AWS states that budget data and notifications are delayed](https://docs.aws.amazon.com/cost-management/latest/userguide/bcm-lite-use-budget.html); an alert cannot serve as an immediate kill switch.

## Deployment impact

The customer portal focus restoration change is the only runtime behavior change described in this testing guide. Running the tests requires no deployment. The later Docker npm commands changed `package.json`, which is included in the worker image source fingerprint; if this ZIP is used for a future full AWS deployment, follow [the deployment guide](deployment.md) to build a fresh worker image and update primary, regional, and web resources in the documented order. An earlier worker image cannot be assumed to match this source tree.
