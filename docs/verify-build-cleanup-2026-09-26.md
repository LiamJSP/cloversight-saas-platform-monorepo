# Build input cleanup — 2026-09-26

`npm run verify` invokes `scripts/build.mjs`. That script used to require a root-level `GROUP_B_REQUIREMENTS.md`, which was absent from the release source, so verification failed after the earlier gates reached the build step. It also tried to copy the absent optional `GROUP_A_B_STATUS.md` and printed a warning.

The build now copies only the root files that ship with the project. The two documentation references to the missing Group B file now point to the maintained deployment guide or state their current confirmation needs directly. No application or infrastructure runtime code changed.

No tests, builds, or deployments were executed while preparing this correction.
