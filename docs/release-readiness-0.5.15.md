# Release readiness — 0.5.15

The practical blockers and deferred controls in [0.5.14 readiness](release-readiness-0.5.14.md) and [the full October 10 audit register](audit-change-register-2026-10-10.md) remain. Dependency/Node source updates do not close the browser privilege boundary, paid-account cancellation, erasure/restore, actual identity/provider acceptance or owner/legal gates.

## Additional requirements for this snapshot

1. Run `npm run deps:lock`, review the three npm-generated locks, retain them with the source and run `npm run deps:check`. The incoming root lock is deliberately preserved as predecessor evidence and is stale; Lambda/browser locks are absent. Setup/verification/browser wrapper/consolidated deployment stop until their required source locks agree. Consolidated staging deployment now requires all three.
2. Establish owner-run Node 24 and Node 22 service verification, local browser acceptance, three-scope npm audits and immutable worker/OS/Chromium scan evidence. Pins were selected using upstream sources, not successful execution of this application. npm publication/peer resolution is still a gate, particularly for SDK family pairs.
3. Deploy a fresh capture image to staging and verify actual SDK/provider/tenant and Lambda-native browser behavior. Review first-run visual differences from the Chromium upgrade before resuming the full watcher set. Existing thresholds/trusted baselines are preserved.
4. Keep managed Lambda runtimes and the worker base on Node 22 during the workstation trial. AWS supports Node 24, but a coherent cloud migration and live acceptance remain a subsequent task.

No installs, tests, application/browser sessions, builds, scan certification or deployments were executed. No existing source file was deleted. Generated atlas/JSDoc snapshots are retained and need the separate documentation refresh.

See [rollout](release-notes-0.5.15.md), [dependency/Node review](node24-dependency-upgrade.md) and [test review](test-review-0.5.15.md) for the authored changes and owner commands.
