# Release 0.5.15 — Node 24 workstation trial and dependency updates

Baseline: the delivered 0.5.14 source ZIP. Date: 2026-10-10. Product/menu/branding fixes and the entire prior audit backlog are retained. This session changes source only; no installs, tests, application/browser sessions, builds, scans or deployments were executed.

## Delivered

- Accept Node 22 and Node 24 LTS in local setup/doctor/verification; preserve Node 22 as `.nvmrc` and AWS runtime defaults. Add a Node 22/24 CI service verification matrix.
- Coordinate Playwright/Core/test image 1.63.0 with serverless Chromium 153.0.0, update deploy/source-contract version references and the image tag, and assert Node 24 inside the browser acceptance image.
- Update Pixelmatch to 7.2.0 in all three trees; retain the v7 colour metric. Pixelmatch 8 is deferred because it changes monitoring diff counts.
- Replace the old 3.864.0 deployed SDK pins with the reviewed exact v3 candidates listed in [the dependency review](node24-dependency-upgrade.md). Keep the S3/presigner and DynamoDB/document-client pairs aligned.
- Resolve all three source lock scopes through one `npm run deps:lock`, preserving prior locks before writing. Add `npm run deps:check` and actionable source-lock gates. Consolidated deployment now requires all three locks in every stage.
- Include runtime/platform inputs in the dependency-install marker and resolve the current locked Playwright browser instead of choosing an arbitrary older downloaded executable. Update CI checkout/setup-node to explicit patch/minor release tags.

## Required owner preparation

**This ZIP retains the incoming root lock as evidence; it is stale for the new pins. Both runtime locks are absent.** From the new extracted root, select Node 24, resolve/review all locks, then install and test:

```bash
nvm install 24 && nvm use 24
```

```bash
npm run deps:lock
```

```bash
npm run deps:check && npm run setup && npm run test:release
```

See [the complete Node 24 instructions](node24-dependency-upgrade.md) for the native/Docker distinction, dependency audit commands, Node 22 comparison, exact pin rationale and remaining evidence. No version is described as project-tested just because it has an upstream release.

## Existing staging upgrade

Extract into a fresh folder; copy the previous private `.env` and custom staging allowlist without overwriting them with templates. Preserve stack/bootstrap/domain/Region/provider identifiers and the existing immutable `STEWARD_OWNER_SUB`. Keep `STAGE=staging`, the primary Region `us-east-1`, and the Lambda base/runtime on Node 22. No bootstrap template or CloudFormation runtime/resource migration was made in this session; rerun bootstrap only if needed for missing outputs/access or when taking an earlier release's required access changes.

After lock review/local acceptance and SSO login, pause watchers and use:

```bash
npm run deploy
```

The workflow builds a fresh image and updates primary, regional and static surfaces. An older release's image will fail the release/source contract; do not use `--reuse-image` for it. Keep a maintenance window because the sequence is not atomic. Resume watchers only after live provider/tenant/capture acceptance, review of browser-upgrade visual differences and scan triage. Existing trusted baselines/thresholds are preserved. The old resource/storage/auth compatibility identifiers remain intentional.

## Incomplete

Authoritative npm locks and integrity/peer resolution; execution on Node 22/24/openSUSE/Docker/Lambda; actual AWS/provider acceptance and clean dependency/container scans; cloud Node 24 migration; generated atlas/JSDoc refresh; all deferred controls in [the prior readiness guide](release-readiness-0.5.14.md) and [the full audit register](audit-change-register-2026-10-10.md). The new source gates stop with instructions until lock resolution is completed.
