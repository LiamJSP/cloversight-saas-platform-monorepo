# Development and testing

Use `npm run dev` for day-to-day work. Use `npm run verify` before opening a PR, and `npm run test:release` for verification plus the Docker browser suite. The release workflow and the live staging checks have separate entry points. [Business CI/CD](github-production.md) · [Staging verification](ci-staging-verification-2026-09-26.md)

## Workstation tools

| Task | Requirements |
| --- | --- |
| Run Cloversight | Bash, Git, Node 22.23.4 or newer in 22.x or Node 24.x, npm 10+, and Chromium. `.nvmrc` selects Node 22. |
| Run service and infrastructure checks | Also install Python 3 with venv/pip, `zip`, and the pinned Python tools below. |
| Run the browser suite in Docker | Docker Engine and a working Buildx plugin. The test image supplies Chromium and its libraries. |
| Deploy from a workstation | The verification tools, Docker/Buildx and AWS CLI v2. The GitHub CLI is used for the business-fork setup. |

On openSUSE Tumbleweed, install the tools for the tasks you need:

```bash
sudo zypper install git nodejs22 npm22 chromium curl ca-certificates zip unzip python3 python3-pip
sudo zypper install docker docker-buildx
sudo systemctl enable --now docker
```

Use your approved method to access the Docker daemon. If your workstation uses the `docker` group, `sudo usermod -aG docker "$USER"` takes effect at next login and grants root-equivalent access. Check with `docker info` and `docker buildx version`. Use your distro’s AWS CLI package if it supplies v2, or the signed AWS installer for your CPU architecture. Check `aws --version`. [Docker on Linux](https://docs.docker.com/engine/install/linux-postinstall/) · [AWS CLI installation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

On Debian/Ubuntu, Fedora or Arch, use the corresponding Git, Python, Chromium and Docker packages. Native Chromium is often simplest on Tumbleweed. An existing nvm install can use `nvm install 22 && nvm use 22`. If a system Chromium is in a custom location, set `CHROME_EXECUTABLE_PATH` to the executable in your private `.env`. When no installed browser is found, `npm run dev` can download the locked Playwright Chromium. On supported Debian/Ubuntu hosts, `npm run setup` followed by `npx --no-install playwright install-deps chromium` supplies the required OS libraries. [Node version guidance](node24-dependency-upgrade.md) · [Official nvm instructions](https://github.com/nvm-sh/nvm#install--update-script)

For verification and AWS deploys, install the pinned IaC dependencies in the directory the project detects:

```bash
python3 -m venv .local/iac-venv &&
  .local/iac-venv/bin/python -m pip install -r infra/requirements-iac.txt
```

## Local state and everyday changes

`npm run dev` uses loopback, seeds an empty demo store and simulates billing and email. Local state is in `.local/state.json`, captured files in `.local/assets` and simulated messages in `.local/outbox`. Restarting preserves them. `npm run clean` deletes local state and build output. Keep `ALLOWED_PRIVATE_TARGETS=false` for normal monitoring.

On a fresh checkout, `npm run setup` installs dependencies without starting the app. `npm ci` also installs from the committed root lockfile. Keep the two deployed runtime lockfiles in sync when intentionally updating dependencies. The separate `npm run deps:lock` command is for dependency changes. `npm run dev:server` serves the integrated site after setup, and `npm run dev:debug` starts the Node inspector. For a public-page edit, rebuild with `npm run build:public` in a second terminal and refresh the browser. [Surface guide](surfaces.md)

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

`verify` checks JavaScript syntax, runs the same local tests, validates IaC and shell contracts, builds static applications, and packages the extension. It uses the pinned PyYAML and cfn-lint tools from the workstation setup above. The documentation build runs separately. See [documentation tooling](documentation.md).

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

`browser:install` installs local Chromium and sets `CHROME_EXECUTABLE_PATH` in the project `.env`. On distributions Playwright does not officially support, it can select a fallback Linux build. Both native and Docker browser gates fail when Chromium is missing or blocked. Business CI runs the Docker browser gate separately from the service tests.

The browser suite checks the public routes and mobile controls, the customer Check Status dialog and steward browser history. Its scheduled-watcher test follows one due check through real Chromium, verifies one credit charged and retrieves the screenshot through the customer API using isolated local state.

## Additional test layers

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

To package new source files in a Git checkout, stage them first. Packaging uses the Git file list. A downloaded ZIP carries its source inventory for repackaging outside Git. The Chrome extension ZIP contains only its named distribution files.

For a release ZIP, `npm run package:release` runs verification and writes the archive and its SHA-256 checksum, including the installable Chrome extension. It requires `-- --replace` to overwrite existing outputs. Run the browser suite separately or use the dedicated business CI job. For a deployed Business capacity check, use the bounded scenario in the [CI/CD walkthrough](github-production.md).
