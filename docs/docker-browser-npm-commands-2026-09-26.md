# Docker browser test npm commands — 2026-09-26

Added `npm run browser:docker:check` for a read-only Docker CLI/daemon readiness check, `npm run test:browser:docker` for the isolated local browser suite, and `npm run test:staging:browser:docker` for the opt-in authenticated staging browser suite. Both test commands run the readiness check automatically and leave Docker installation, service startup, and access configuration to the operator.

This change updates `package.json` and therefore the production worker image's source fingerprint. No AWS deployment is needed to run these tests. A future full deployment from this source requires a fresh worker image as described in `docs/deployment.md`.

No tests, builds, Docker commands, or deployments were run while authoring this change.
