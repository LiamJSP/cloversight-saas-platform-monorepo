# Testing and release checks

The source-generated documentation workflow is described in [documentation from source](documentation.md). `npm run docs:generate` produces the diagrams, CloudFormation references and JSDoc HTML; `npm run docs:site` renders the MkDocs guide. These commands are separate from `npm run verify` and do not certify the product or a deployed stack.

The checked-in GitHub Actions CI workflow and the bounded live two-region staging check are described in [CI staging verification](ci-staging-verification-2026-09-26.md). The optional staging job requires dedicated fixtures and a trusted, WAF-allowlisted runner.

See [the 2026-09-26 test audit](testing-audit-2026-09-26.md) for the individual test-file review and rationale. The default `npm test` suite is local and does not contact AWS or Stripe. Provider tests replace network requests with fixtures. Staging probes run only through their separate, explicit commands below.

The [0.5.16 assessment](security-production-review-0.5.16.md) records 190 passing deterministic tests, static build/IaC verification and zero registry audit findings across all three locked trees. It also records the unavailable Docker/browser/AWS gates. Use the checked-in locks with `npm ci`; reserve `deps:lock` for intentional dependency updates. The [original 0.5.15 test review](test-review-0.5.15.md) explains the Node 22/24 comparison. Use Node 22 or 24 locally; the browser test image is Node 24 and deployed Lambda remains Node 22. `npm run test:release` runs `verify` plus the Docker Chromium suite; `verify` already includes `npm test`, so avoid rerunning all three for an unchanged tree. CI also runs cfn-lint at error level and refuses missing runtime locks.

## Fast, deterministic checks

```bash
npm run setup
npm test
```

`npm test` explicitly runs `tests/*.test.mjs` with Node's built-in runner. It covers service behavior and failure paths for billing, tenant boundaries, notification delivery, watcher lifecycle, account closure, report quotas, SSRF, webhook verification, and capture allowances. Some IaC and deploy-script tests are narrow source contracts; they cannot prove a live AWS deployment behaves as expected.

For a release gate, run:

```bash
npm run verify
```

`verify` checks JavaScript syntax, runs the same local tests, validates IaC and shell contracts, builds static applications, and packages the extension. Its IaC validation **requires** Python 3 and PyYAML and fails if either is missing. The checked-in GitHub Actions workflow installs these before running this gate.

## Explicit Chromium integration gate

Recommended on openSUSE and for reproducible CI browser runs:

```bash
npm run test:browser:docker
```

The separate optional `npm run browser:docker:check` diagnostic confirms the Docker CLI and accessible daemon; it never installs or starts Docker for you. The test command checks root-lock agreement and Docker readiness before building the exact-version Playwright 1.63.0 / asserted Node 24 test image and running the existing `node:test` browser suite inside it. Chromium and its Linux libraries come from the image; your host needs Docker, Node and npm for these commands, but no host Chromium installation. The local container has no external network access, and the project `.env` is excluded from the build context. The browser test still starts its disposable local HTTP server inside the same container. See [Docker browser testing](testing-docker-2026-09-26.md) for direct Docker commands when you prefer not to use host Node/npm.

For a native browser run instead:

```bash
npm run browser:install
npm run test:browser
```

`browser:install` installs local Chromium and sets `CHROME_EXECUTABLE_PATH` in the project `.env`. On distributions Playwright does not officially support, it can select a fallback Linux build. Both native and Docker browser gates fail when Chromium is missing or blocked. They run separately from `npm test` and `verify`; wire one into a dedicated browser job. Do not treat a successful `npm test` as proof that browser capture works.

The browser job also checks phone public/customer menu scroll geometry and 1rem spacing, then starts the real local HTTP server with temporary, isolated state and exercises the customer Check Status modal and steward browser history. It cannot contact AWS; it uses local billing and notification providers. The keyboard focus case led to a customer-portal focus restoration fix.

## Six additional test layers

1. Focused regressions in `node:test`: paid Checkout/plan-change binding and the daily notification cap across two accounts.
2. API integration in `node:test`: the real router and account/report/notification services deny guessed foreign identifiers and revoked identities, even when the store returns records for both tenants.
3. Fast local browser functionality: `npm run test:browser:docker` or the native `npm run test:browser` captures a page and tests customer/steward UI behavior against the real local HTTP server.
4. Opt-in staging smoke: `npm run test:staging:smoke` checks public health, anonymous denial, authenticated account binding and regional summary. Read-only, at most five GETs.
5. Post-deploy functional verification: `npm run test:staging:functional` uses two isolated customer identities to check cross-account watcher, check job and report access. `npm run test:staging:browser` exercises the deployed customer modal using a short-lived access token; it blocks write requests and limits API GETs to 20. The check-job/report probes state when fixture records are absent and do not claim those paths passed.
6. Short, capped load probe: `npm run test:load:plan` makes no requests; `npm run test:load -- --execute` targets only authenticated, read-only notification status after verifying a staging account. Max 100 requests, 60 seconds, three concurrent, two launches per second, and a $5.00 user-supplied estimated ceiling. The ledger reserves ten cents per attempted request, including failed requests, before any GET. It stops on HTTP errors and never retries. This is a deliberately conservative planning estimate, not a live AWS bill or a promise that AWS charges cannot exceed it; AWS budgets and actual billing are delayed, and traffic outside this script is not included.

See [staging test instructions](testing-additions-2026-09-26.md) for environment setup, commands, CI separation, and the cost limitation. None of these opt-in staging or load commands are part of `verify`.

## Deployment and staging

The local suite makes no live AWS or Stripe claims. After a staging deploy, use `AWS_PROFILE=saas-admin npm run aws:audit` for a read-only platform check, then perform actual authenticated customer/steward route and tenant-isolation checks with test accounts. Test Stripe payment and renewal paths in Stripe test mode with real webhook delivery, check mail delivery with controlled recipients, and separately check multi-region worker capture and queue recovery. Keep browser and staging test credentials out of repository artifacts and build output.

Temporary load checks operate only on a designated staging account with an exact expected hostname. Use an AWS budget alarm as a separate warning; it is not an immediate cost stop. No load or paid-cloud test is part of the local release gate.
