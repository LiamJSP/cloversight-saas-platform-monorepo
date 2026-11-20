# CLOVERSIGHT SaaS

Release **0.5.20** hardens AWS provisioning and recovery: ordered CloudFront creation, preserved initial failures, bounded throttle retries, expanded prerequisite checks and mandatory resource-schema validation. See the [AWS deployment review](docs/aws-deployment-review-0.5.20.md), [release notes](docs/release-notes-0.5.20.md) and [recovery/upgrade guide](docs/upgrade-0.5.20.md). The 0.5.19 cancellation features and all Cognito/SQS hotfixes are included. Prices and entitlements are unchanged; existing scheduled closures still acquire immediate cancellation intent when the new worker runs, so review them before rollout. Earlier [0.5.17 abuse-control migrations](docs/upgrade-0.5.17.md) still apply to older deployments.

CLOVERSIGHT monitors website uptime and content changes with real Chromium captures in configured AWS Regions. Each successful capture is compared with the previous comparable check; an explicitly trusted green baseline remains the approval target for alert/all-clear workflows. It includes customer and steward portals, team notification ladders, SES email, optional Twilio SMS, Stripe billing, private PDF/HTML reports and CloudFormation infrastructure. The control plane is in `us-east-1`.

For production releases from GitHub Actions, follow the [included CI/CD rollout guide](docs/github-production.md). Start with the read-only inspection of the existing AWS installation before enabling deployment on merge.

## Start locally: one command

After installing the workstation prerequisites below, use the checked-in source locks, then run from the extracted project root:

```bash
npm run dev
```

This accepts Node 22 or 24, rejects a stale root source lock with instructions, and installs root dependencies with `npm ci` when the lock/manifest/runtime/platform fingerprint or declared installed versions change, creates a private `.env` with a random local price-integrity secret **only if it does not exist**, finds system Chromium or downloads the locked Playwright browser if needed, prepares the regional globe and starts the server. Existing `.env`, state, captures and simulated messages are preserved. The server seeds an empty local store automatically; a forced seed is unnecessary.

Dev binds to `127.0.0.1` and explicitly uses local billing/email with SMS disabled, including when your `.env` contains deployment provider settings. It does not deploy, charge Stripe or send provider email/SMS. Monitoring your configured URLs still uses network access.

- Public site: `http://127.0.0.1:4010/`
- Customer portal: `http://127.0.0.1:4010/app/`
- Steward portal: `http://127.0.0.1:4010/stewards/`

Local state is `.local/state.json`, captures are `.local/assets` and simulated notices are `.local/outbox`. Keep `ALLOWED_PRIVATE_TARGETS=false` for normal monitoring. A private-target exception is only for an explicitly authorized local fixture. `npm run dev:server` remains the direct entry point after setup; `npm run dev:debug` starts the inspector after setup. `npm run clean` deletes local state and build output; it is not a startup prerequisite.

## Linux workstation prerequisites

Use **Node.js 22 or 24 LTS and npm 10+**. `.nvmrc` keeps 22 as the default; CI service verification covers both. Managed AWS runtimes and the worker base remain Node 22 during the Node 24 workstation trial; an unversioned distribution `nodejs` package may install another major. Bash, Chromium and its runtime libraries are needed for native monitoring. AWS deployment additionally needs AWS CLI **v2**, Docker Engine with Buildx, `zip` and Python 3. Verification additionally needs the pinned PyYAML and cfn-lint tools in `infra/requirements-iac.txt`. No Windows workstation is required.

The previous workstation testing was on **openSUSE Tumbleweed**. Local verification ran on Node 24 in the review workspace; the owner workstation setup and Docker acceptance remain unverified. Package availability and enterprise repositories vary, so review your enabled repositories before adding or replacing packages.

| Distribution | Base tools and Python for verification | Native browser |
| --- | --- | --- |
| openSUSE Tumbleweed | `sudo zypper install nodejs22 npm22 curl ca-certificates git zip unzip python3 python3-PyYAML` | `sudo zypper install chromium` |
| Ubuntu 24.04 LTS | `sudo apt-get update && sudo apt-get install -y curl ca-certificates git zip unzip python3 python3-venv python3-yaml` | `sudo apt-get install -y chromium-browser` (Ubuntu's Snap-backed launcher) |
| Debian 12/13 | `sudo apt-get update && sudo apt-get install -y curl ca-certificates git zip unzip python3 python3-venv python3-yaml` | `sudo apt-get install -y chromium` |
| Fedora | `sudo dnf install -y curl ca-certificates git zip unzip python3 python3-pyyaml` | `sudo dnf install -y chromium` |
| RHEL 9 / Rocky / AlmaLinux | `sudo dnf install -y curl ca-certificates git zip unzip python3 python3-pyyaml` | Chromium requires an approved browser/EPEL repository; configure `CHROME_EXECUTABLE_PATH` to its executable. |
| Arch / Manjaro | `sudo pacman -S --needed curl ca-certificates git zip unzip python python-yaml` | `sudo pacman -S --needed chromium` |

For distros without a maintained Node 22 package, install the version manager from its [official nvm instructions](https://github.com/nvm-sh/nvm#install--update-script), then select the project's version. Download the pinned installer to a file for inspection before executing it:

```bash
curl -fsSLo nvm-install.sh https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh
less nvm-install.sh
bash nvm-install.sh
export NVM_DIR="${XDG_CONFIG_HOME:-$HOME}/nvm"; test -s "$NVM_DIR/nvm.sh" || export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm install 22 && nvm use 22
node --version && npm --version
```

The installer's normal location is `~/.nvm`, or `$XDG_CONFIG_HOME/nvm` when that variable is set. A new shell normally loads it from your shell profile. Use the official [Node 22 downloads and signature instructions](https://nodejs.org/en/download) if a version manager is unsuitable.

For a Node 24 trial using nvm, run `nvm install 24 && nvm use 24`, then `npm ci && npm run test:release` using the checked-in locks. The browser test Docker image uses Node 24 independently of host Node; the deployed capture image remains Node 22. See [the original trial/comparison rationale](docs/node24-dependency-upgrade.md) and [current verification evidence](docs/security-production-review-0.5.16.md). Selecting Node 24 locally does not migrate AWS runtimes.

`npm run dev` can install project-local Chromium, but cannot install system libraries or grant administrator permissions. Native Playwright builds are not officially supported on every distro; prefer the distro Chromium on Tumbleweed/Fedora/Arch. For repeatable browser **tests**, use the Docker gate below. Debian/Ubuntu owners choosing bundled Chromium can install its OS libraries explicitly with `npx --no-install playwright install-deps chromium` after `npm run setup`.

### Docker and Buildx (deployment and Docker browser tests)

| Distribution | Docker installation |
| --- | --- |
| openSUSE Tumbleweed | `sudo zypper install docker docker-buildx` |
| Arch / Manjaro | `sudo pacman -S --needed docker docker-buildx` |
| Ubuntu / Debian | Configure the signed official [Ubuntu](https://docs.docker.com/engine/install/ubuntu/#install-using-the-apt-repository) or [Debian](https://docs.docker.com/engine/install/debian/#install-using-the-apt-repository) repository, then `sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin` |
| Fedora | Configure the official repo with `sudo dnf config-manager addrepo --from-repofile https://download.docker.com/linux/fedora/docker-ce.repo`, then `sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin` |
| RHEL / Rocky / AlmaLinux | Follow the signed official [RHEL repository prerequisites](https://docs.docker.com/engine/install/rhel/), then `sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin` |

Docker's repository/key setup is distro-specific; use the linked vendor instructions instead of an unverified generic installer. After installation, start the daemon and arrange approved user access to it:

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Membership grants powerful host access. Sign out and back in after changing membership; do not run the entire project as root. Then check:

```bash
npm run browser:docker:check
docker buildx version
```

### AWS CLI v2 (deployment only)

Use the [AWS installation and signature-verification instructions](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). On a Linux x86_64 workstation, download and verify the installer before running:

```bash
curl -fsSLo awscliv2.zip https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

For ARM64 use AWS's `awscli-exe-linux-aarch64.zip`. An existing v2 installation uses `sudo ./aws/install --update`. Use a distro package only if it actually supplies v2. Configure the non-root Identity Center profile once with `aws configure sso --profile saas-admin`.

### Local IaC validation tools

Install the pinned tools in a project-local environment. Verification and deployment discover it automatically; do not install these into the distribution-managed Python environment.

```bash
python3 -m venv .local/iac-venv
.local/iac-venv/bin/python -m pip install -r infra/requirements-iac.txt
npm run iac:validate
npm run iac:schema
```

## AWS access bootstrap: one command

For an upgrade, copy your existing private `.env` into the new folder and keep its owner subject, stack names, domain, provider IDs and custom IP allowlist. For a fresh deployment, create it without overwriting another file:

```bash
test -e .env || (umask 077 && cp .env.example .env)
chmod 600 .env
```

Set at least `AWS_ACCOUNT_ID`, `AWS_PROFILE`, `AWS_DEPLOYMENT_PRINCIPAL_ARN`, `BASE_DOMAIN`, `ROUTE53_HOSTED_ZONE_ID`, and the `us-east-1` CloudFront certificate ARN. Choose `STAGE=staging`, `beta` or `prod`, and the corresponding existing `STACK_NAME`. Supply at least three supported `REGIONAL_CHECK_REGIONS`, including `us-east-1`. Replace documentation-only CIDRs in `config/staging-ip-allowlist.txt`.

Authenticate and bootstrap:

```bash
aws sso login --profile saas-admin
npm run aws:bootstrap
```

The bootstrap command updates the existing access/artifact/ECR/shared-SES stack and automatically merges only its generated keys into private `.env`. It does not delete local state or replace unrelated settings. First-time Identity Center permission assignment (`sts:AssumeRole`) and SSO reauthentication remain owner prerequisites; see [account bootstrap](docs/aws-account-bootstrap.md). Existing bootstrap IAM changes should be reviewed against your account permissions before execution.

## Deploy: one command

**Already deployed or recovering a failed initial create:** follow [the 0.5.20 upgrade/recovery guide](docs/upgrade-0.5.20.md) for bootstrap permissions, state-specific recovery and rollout order. The commands below also include first-install provider/SES setup.

Complete workstation/access setup and private configuration first. Set Stripe credentials, webhook secret and all six Price IDs; staging/beta require `sk_test_`; production defaults to `sk_live_`, with an explicit `STRIPE_MODE=test` option for a controlled sandbox trial. See [production Stripe testing and live cutover](docs/stripe-production-test-0.5.20.md). Twilio is optional, with all three credentials blank or all configured. Production requires steward MFA ON and explicit technical, operational SNS and budget email destinations. The staging ChatGPT perimeter exception remains separately configured and spoofable; Cognito and tenant authorization remain required.

All three registry-resolved source locks are included. Check their manifest agreement and install without changing their resolution:

```bash
npm run deps:check
npm ci
```

Root, Lambda and browser npm audits reported zero vulnerabilities during this review; this does not replace the container/OS/browser acceptance gates. `npm run deps:lock` is for an intentional dependency update, not routine installation. Consolidated deployment requires all three agreeing locks for **every stage** before AWS identity/image operations; production direct image/Lambda packaging and runtime CI also enforce their runtime locks. Do not bypass a resolution failure using forced peer resolution. See [the assessment](docs/security-production-review-0.5.16.md) and [dependency evidence](docs/documentation.md).

Then deploy from this release's root:

```bash
aws sso login --profile saas-admin
npm run deploy
```

`deploy` performs configuration/tool/identity preflight, prepares locked root dependencies, builds and pushes a fresh immutable worker image, merges generated image inputs, deploys the primary stack and every configured secondary capture stack, pushes configured provider secrets, uploads all three static surfaces/shared logos, waits for CloudFront invalidations and activates the existing shared SES receiving rule set. It stops on the first failure and prints success only after the full sequence. It is not an atomic cross-Region update; retain a maintenance window and inspect failures before resuming.

The worker tag is fresh on each consolidated deployment, avoiding an immutable ECR collision with the tag copied from an older `.env`. A validated image already built from **this exact source/version** can be reused deliberately:

```bash
npm run deploy -- --reuse-image
```

`--skip-secrets` preserves existing provider secrets when credentials are already provisioned, and `--skip-ses` leaves receiving activation to the owner. Both are explicit recovery/maintenance options. The existing granular `aws:build-worker`, `aws:deploy`, `aws:deploy-regional`, `aws:push-secrets`, `aws:deploy-web` and `aws:activate-ses` commands remain for diagnosis. A direct worker build still respects an explicitly supplied `WORKER_IMAGE_TAG`.

DNS/certificate validation, SES production access, SNS subscription confirmation, Stripe setup, legal pages, first steward enrollment and `STEWARD_OWNER_SUB` are owner-operated prerequisites/acceptance steps. Use [the deployment runbook](docs/deployment.md) and [existing-stack upgrade](docs/upgrade-0.5.16.md). A first stack may need a second primary deploy after creating its steward owner. The consolidated command does not log in for you, silently replace another active SES rule set, run live tests, or certify release readiness.

### Deployment compatibility during the rebrand

All product-facing text, downloads, release/package names and current logos use CLOVERSIGHT. Existing AWS physical names, metric namespaces, billing allocation tags, persisted browser keys, JWT claims, origin headers, extension messaging and `WEBWATCH_*` operator/CI variables retain their established legacy identifiers. Renaming them would require resource/data/session or configuration migration. **Do not mass-replace private `.env` values or rename deployed stacks for this branding release.** Exact exceptions and the future migration decision are in [branding](docs/branding.md). Historical artifact references are preserved.

## Test and package commands (explicit owner execution)

Prepare locked root dependencies without starting a server:

```bash
npm run setup
```

| Gate | One command | What it proves |
| --- | --- | --- |
| Source-lock agreement | `npm run deps:check` | Direct pins/release metadata for all three trees; not an audit or transitive integrity proof. |
| Deterministic service/API regressions | `npm test` | Local behavior with file/in-memory stores and mocked providers; no live AWS/Stripe assurance. |
| Service/IaC/build/extension verification | `npm run verify` | Parses source, runs the deterministic suite, validates templates and executable shell scripts, builds/package-checks source. |
| Complete local release gate | `npm run test:release` | `verify` plus the Docker Chromium integration suite, including phone menu scrolling and existing capture/modal/steward history journeys. |
| Locked dependency audit | `npm audit --audit-level=high` | Registry findings for the root tree; AWS runtime/container scans are separate. |
| Source release archive | `npm run package:release` | Repeats `verify`, writes the versioned ZIP/checksum, includes the extension ZIP, excludes private env/credential files and local browsers. |

Release packaging refuses an existing output unless you explicitly pass `--replace`. It does not include Docker/browser coverage automatically; run `test:release` once before packaging or require the separate CI browser job. The intentional final package verification checks the tree being archived, so avoid separately running `npm test` then `verify` then `test:release` on an unchanged tree. Consult [the test review and remaining gaps](docs/test-review-0.5.15.md).

Staging tests are separately opt-in and require dedicated identities, exact host/account bindings, short-lived tokens and a WAF-allowlisted runner. The optional regional check triggers real captures only with explicit permission flags. No test/load probe is part of `npm run deploy`.

## Architecture and repository map

The capture path uses regional SQS workers, in-Region comparison/evidence, content-addressed S3 storage, sharded schedules and account revision transactions. Browser egress uses pinned DNS/address validation and transfer bounds. Customer/steward pools and route authorization are separate; provider callbacks verify signatures and provider/account bindings. Card data stays on approved Stripe-hosted origins.

| Directory | Responsibility |
| --- | --- |
| `apps/public`, `apps/customer`, `apps/steward` | Public site, customer portal and steward console |
| `apps/shared` | Theme/auth, supplied full/compact light/dark logos and favicons |
| `extensions/chrome-target-picker` | Manifest V3 DOM picker with raster Chrome icons |
| `src/api`, `src/security`, `src/services` | HTTP/tenant boundaries, authentication and account workflows |
| `src/monitoring`, `src/aws`, `src/storage` | Browser checks, AWS adapters, local/Dynamo/S3 persistence |
| `src/notifications`, `src/billing`, `src/reports`, `src/brand` | Notices, billing, reports and embedded runtime branding |
| `infra/cloudformation`, `infra/bootstrap`, `infra/docker`, `infra/scripts` | Application/access IaC, worker image and granular deployment |
| `scripts/platform.sh` | Consolidated dev/bootstrap/deploy entry point |
| `tests`, `docs` | Service/browser/staging suites and architecture/runbooks |

Compatibility billing, notification, report quota, closure and maintenance paths still use global coherent transactions/account-wide views. These limit sustained throughput and large-account closure; keep Scale sales-assisted. Budgets and capture credits do not cap the AWS bill. Erasure has documented provider, historical-storage and late-write limits. See [architecture](docs/architecture.md), [known limitations](docs/known-limitations.md), and [the complete October 10 audit register](docs/audit-change-register-2026-10-10.md).

The [engineering guide](docs/index.md) and [documentation workflow](docs/documentation.md) cover MkDocs, JSDoc and the architecture atlas. A bounded read-only AWS evidence bundle can be collected with `bash infra/scripts/collect-cloud-audit.sh --profile saas-admin --hours 24 --include-s3-access-logs` after SSO login. Complete the current [production gates](docs/security-production-review-0.5.16.md) and outstanding [provider/owner readiness items](docs/release-readiness-0.5.15.md) before production admission.
