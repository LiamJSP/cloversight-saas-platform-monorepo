# Node 24 trial and dependency review — 0.5.15

Review date: 2026-10-10. Baseline: the delivered CLOVERSIGHT 0.5.14 source archive. This is a source-authored compatibility candidate, not a claim that the project has been tested on these versions. No application, dependency install, test, browser session, build, Docker image or AWS operation was run while authoring it.

## Runtime scope

| Surface | This release | Reason |
| --- | --- | --- |
| Local dev/setup/doctor/verification | Node 22 or Node 24, npm 10+ | Allows a controlled Node 24 workstation trial; rejects unsupported intervening/other majors. |
| `.nvmrc` | 22 | Keeps the existing default and an easy comparison baseline. Select 24 explicitly for the trial. |
| CI service/source verification | Matrix of Node 22 and 24 | Runs the same useful service/IaC/build gate under both majors. Execution evidence remains pending. |
| Docker browser acceptance | Playwright 1.63.0 Noble image, Node 24 | Upstream Playwright images use Node 24. The Dockerfile now asserts the major instead of assuming it. This browser job runs once, not once per host-Node matrix entry. |
| Managed AWS Lambdas and capture worker | Node 22 / Amazon Linux 2023 | Keeps the staging runtime unchanged while local Node 24 is evaluated. Running deployment tools on Node 24 does not change deployed runtimes. |

[Node lists 24 as LTS](https://nodejs.org/en/about/previous-releases), with [24.21.0](https://nodejs.org/en/blog/release/v24.21.0) shown during this review. [AWS lists both `nodejs22.x` and `nodejs24.x` on Amazon Linux 2023](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html). AWS availability supports a later cloud migration; it does not prove this application's runtime compatibility. Do not change only a CloudFormation runtime string: the worker Docker base, major assertion, CI, release/source fingerprint and provider acceptance must move together.

## Try Node 24 on the openSUSE workstation

Extract into a fresh directory. Keep the previous release/configuration for recovery. For dev-only testing, let `npm run dev` create a separate private `.env`; it does not require deployment credentials. For a staging upgrade, copy the previous `.env` and custom allowlist as described in the release notes. Never replace private configuration with `.env.example`.

Use an existing [nvm installation](https://github.com/nvm-sh/nvm#usage); README contains the install prerequisites if it is absent. No system-wide Node replacement or `sudo npm` is needed. In this release's root:

```bash
nvm install 24 && nvm use 24 && node --version && npm --version
```

Resolve source lock metadata for the root, Lambda and browser-worker packages:

```bash
npm run deps:lock
```

**Required before setup/deployment:** the incoming root lock is preserved byte-for-byte as 0.5.14 evidence and does not describe the new pins; both runtime locks remain absent. The command above resolves all three through npm without installing `node_modules` or running lifecycle scripts, then checks direct pins/manifest metadata. It first preserves existing locks under `.local/dependency-lock-backup-*`. Review the generated files. npm, rather than hand-authored hashes, must resolve transitive dependencies and integrity. An unavailable exact pin, peer conflict or network failure stops the command; do not bypass it with `--force` or `--legacy-peer-deps`. Report that output for follow-up. Earlier scopes may already be updated if a later scope fails.

```bash
npm run deps:check && npm run setup
```

`setup` installs the reviewed root lock when needed. Its fingerprint includes the Node/npm major and platform/architecture, so changing from 22 to 24 refreshes the install rather than trusting a marker from a different runtime. Existing local state is retained.

For the complete local acceptance gate (Python 3/PyYAML and working Docker required):

```bash
npm run test:release
```

This runs source parsing, service tests, IaC validation, static build/extension packaging and the actual local Docker Chromium suite. It exercises service code under your selected host Node and browser integration inside the asserted Node 24 image. It does not contact AWS/Stripe or certify the Lambda-native browser. It writes/replaces generated `dist` output; use the fresh working directory. Do not separately rerun `npm test` and `verify` on the unchanged tree. If Docker is unavailable and you want a service-only first pass, use `npm test` and record browser coverage as pending.

Then start the local product:

```bash
npm run dev
```

Check login/local account routes, watcher creation, real captures against a controlled URL, reports, notifications, the phone menu and the globe. Local dev explicitly selects local billing/email with SMS disabled even when deployment provider values are present in `.env`. Stop it with Ctrl-C before changing Node versions.

Native dev on Tumbleweed normally uses distro Chromium. For an explicitly driver-matched local browser, after setup use:

```bash
npm run browser:install
```

That downloads the locked revision and updates only `CHROME_EXECUTABLE_PATH` in private `.env`. It cannot supply missing OS libraries on an unsupported distro. The Docker gate avoids that workstation-library ambiguity. If a copied `.env` points to an older release's browser directory, review/remove that stale override or run `browser:install`; do not mistake an arbitrary existing binary for the locked browser.

To compare service behavior with the existing major, without downgrading dependency pins:

```bash
nvm install 22 && nvm use 22 && npm run setup && npm run verify
```

Return to the trial with:

```bash
nvm use 24 && npm run setup
```

Keep `node --version`, `npm --version`, failing command/output and whether you used native or Docker Chromium with any report. Node's LTS/support listing and package release notes establish upstream support; successful owner acceptance establishes working behavior in this project.

## Selected dependency changes

Exact pins are maintained. Stable upstream releases and the APIs used by the project inform this selection. Registry publication/peer resolution, clean audits and actual provider/browser behavior must still be confirmed by the owner commands.

| Package / dependency scope | Before | Selected | Decision / source |
| --- | --- | --- | --- |
| `playwright` root; `playwright-core` worker; test image | 1.61.0 | 1.63.0 | Coordinate the driver/image versions. [1.63 release](https://github.com/microsoft/playwright/releases/tag/v1.63.0) uses Chromium 153; existing launch/context/route/screenshot APIs remain available. |
| `@sparticuz/chromium` worker | 149.0.0 | 153.0.0 | [Lambda-native 153 release](https://github.com/Sparticuz/chromium/releases/tag/v153.0.0) matches the driver's Chromium major and documents Node 22/24-compatible layers. Exact browser builds differ; this is an alignment rationale, not a guarantee. |
| `pixelmatch`, all three packages | 7.1.0 | 7.2.0 | [v7 release notes](https://github.com/mapbox/pixelmatch/releases) cover performance/error fixes and a checkerboard option. Keeps the v7 metric. |
| `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`, Lambda | 3.864.0 | 3.1141.0 | Keep the document client pair aligned on the [September 25 v3 release](https://github.com/aws/aws-sdk-js-v3/releases/tag/v3.1141.0); [document-client changelog](https://github.com/aws/aws-sdk-js-v3/blob/main/lib/lib-dynamodb/CHANGELOG.md). Exact npm publication/peer resolution must confirm both pins. |
| `@aws-sdk/client-s3` in both runtimes + `s3-request-presigner` in Lambda | 3.864.0 | 3.1148.0 | Keep S3/presigner aligned on an observed v3 publication; [S3](https://www.npmjs.com/package/@aws-sdk/client-s3), [presigner](https://www.npmjs.com/package/@aws-sdk/s3-request-presigner). |
| `@aws-sdk/client-cognito-identity-provider`, Lambda | 3.864.0 | 3.1119.0 | [Observed published v3 version](https://www.npmjs.com/package/@aws-sdk/client-cognito-identity-provider); retains the modular command API. |
| `@aws-sdk/client-lambda`, Lambda | 3.864.0 | 3.1136.0 | [Observed published v3 version](https://www.npmjs.com/package/@aws-sdk/client-lambda?activeTab=versions). |
| `@aws-sdk/client-secrets-manager`, Lambda | 3.864.0 | 3.1146.0 | [Observed published v3 version](https://www.npmjs.com/package/@aws-sdk/client-secrets-manager). |
| `@aws-sdk/client-sesv2`, Lambda | 3.864.0 | 3.1147.0 | [Observed published v3 version](https://www.npmjs.com/package/@aws-sdk/client-sesv2). |
| `@aws-sdk/client-sqs`, both runtimes | 3.864.0 | 3.1146.0 | [Observed published v3 version](https://www.npmjs.com/package/@aws-sdk/client-sqs). |
| CI checkout/setup-node actions | Floating v7 | 7.0.1 / 7.1.0 | [Checkout release](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node release](https://github.com/actions/setup-node/releases/tag/v7.1.0). Explicit release tags improve reviewability but remain mutable; commit-SHA pinning is separate follow-up. |

SDK packages do not all publish the same version on every monorepo release. Their selected pins deliberately differ; npm must validate and lock their shared Smithy dependencies. [AWS recommends packaging the SDK modules used](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html), which the deployment packages already do. The root local tree does not contain those modules, so a root audit/service pass cannot certify AWS deployment dependencies.

## Retained dependencies and avoided upgrades

| Package | Retained pin | Reason |
| --- | --- | --- |
| `esbuild` | 0.28.2 | Already the latest release shown by [upstream](https://github.com/evanw/esbuild/releases). |
| `three` | 0.186.0 | Already the latest [r186](https://github.com/mrdoob/three.js/releases). The globe bundle is not rebuilt in this authoring session; deployment/dev already rebuild it. |
| `jsdoc` | 4.0.5 | [npm publication](https://www.npmjs.com/package/jsdoc) confirms the existing pin; GitHub Releases lists an older 4.0.4, so it is not a reason to downgrade. |
| `pngjs` | 7.0.0 | [Current source package](https://github.com/pngjs/pngjs/blob/main/package.json) and [publication](https://www.npmjs.com/package/pngjs) match the existing pin. Keep the application's image-size/decoder guards. |
| `@picocss/pico`, `d3-geo`, `topojson-client`, `world-atlas` | 2.1.1 / 3.1.1 / 3.1.0 / 2.0.2 | No justified compatible update found in the reviewed [Pico](https://github.com/picocss/pico/releases), [D3](https://github.com/d3/d3-geo/releases), [TopoJSON](https://github.com/topojson/topojson-client/releases) and [atlas](https://github.com/topojson/world-atlas/releases) release listings. |
| `@fontsource-variable/manrope` | 5.2.8 | No sufficiently verified newer compatible font artifact selected. Preserve current font paths/layout. |
| Documentation Python packages | Existing `docs/requirements.txt` | Node 24 does not require changing Python tooling. These were not fully security-certified; keep their separate owner workflow/audit. |

**Do not use Pixelmatch 8 here yet.** Its [release notes](https://github.com/mapbox/pixelmatch/releases/tag/v8.0.0) replace the YIQ colour metric with OKLab/HyAB and warn that diff counts change despite the unchanged API/threshold range. That affects customer alert thresholds, not just tests; it requires representative image comparisons and a migration/rebaselining decision. Playwright 1.64 uses a newer browser major than the available Lambda Chromium 153, so retain the coordinated 1.63 candidate for this release. No `npm update`, floating `latest` production pins or `npm audit fix --force` was used.

## Audit and staging acceptance

After generating/reviewing the locks and running setup, audit the root tree:

```bash
npm audit --audit-level=high
```

Install/audit each deployment tree explicitly, with lifecycle scripts disabled for this audit step (these are owner commands, not commands executed during authoring):

```bash
npm ci --prefix infra/runtime --omit=dev --ignore-scripts --no-audit --no-fund && npm audit --prefix infra/runtime --omit=dev --audit-level=high
```

```bash
npm ci --prefix infra/docker/browser-worker --omit=dev --ignore-scripts --no-audit --no-fund && npm audit --prefix infra/docker/browser-worker --omit=dev --audit-level=high
```

Commit or otherwise retain all three reviewed locks with the source snapshot. npm audit covers registry advisories for those resolved JavaScript trees; it does not scan Chromium/OS libraries, prove absence of vulnerabilities or replace digest-specific ECR/container triage. No clean audit result is claimed here.

For the existing staging environment, preserve stack/domain/provider/owner identifiers and the allowlist. Once locks and local acceptance are satisfactory, authenticate, update bootstrap if needed, pause watchers and run the normal consolidated deployment from this exact source. It now requires all three agreeing locks for **every stage**, before AWS identity/image operations:

```bash
aws sso login --profile saas-admin
```

```bash
npm run deploy
```

A fresh worker image is mandatory. Preserve legacy AWS/data/auth names, and do not reuse the 0.5.14 capture image. Keep `LAMBDA_NODE_BASE_IMAGE_TAG=public.ecr.aws/lambda/nodejs:22` (or its default); do not set it to 24 during this workstation trial.

Staging acceptance needs actual Cognito auth, DynamoDB transactions/tenant boundaries, S3 writes/readback/presigned URLs, SQS/regional results, SES notices, Secret Manager access, Lambda invocation and Stripe test callbacks. Confirm the browser driver's upgraded capture against representative targets. A browser change can alter pixels/fonts/layout and cause differences from an older saved screenshot even with the v7 comparison metric; review first-run alerts before resuming the full watcher set. Do not silently discard trusted green baselines or redefine existing thresholds.

The prior [release gates](release-readiness-0.5.14.md), [audit backlog](audit-change-register-2026-10-10.md) and [test-review limitations](test-review-0.5.14.md) remain. Moving the AWS runtime to 24, authoritative lock resolution, clean scans, provider/browser/OS acceptance and generated-documentation refresh are still incomplete.
