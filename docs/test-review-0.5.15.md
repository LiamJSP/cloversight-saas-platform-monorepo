# Test review — 0.5.15 Node 24/dependencies

The detailed [0.5.14 test review](test-review-0.5.14.md) remains applicable, including its unproven live-provider, security and accessibility cases. No tests were deleted or executed in this session.

## Changes to the gates

- CI `verify` runs the same deterministic service/IaC/build/extension gate on Node 22 and 24. Different Node majors are a meaningful compatibility check; a second identical browser-container job would not add host-Node coverage, so the browser job remains single.
- Browser Docker uses Playwright 1.63.0 with an explicit Node 24 major assertion. Its version agrees with root Playwright and worker Core, and worker Chromium uses the corresponding major 153. Lambda still runs Node 22/AL2023 and requires independent staging acceptance.
- Setup/verify/browser-image invocation reject stale root lock metadata before running. Consolidated deployment checks all three source locks before AWS identity/image steps. `npm run deps:check` is a source agreement check, not an audit or transitive integrity proof; npm ci/audit and actual execution remain necessary.
- The setup marker includes Node/npm major and host platform/architecture. Current-revision Playwright lookup replaces arbitrary directory scanning, so the new browser candidate is not accidentally checked against an older downloaded revision.
- Pixelmatch stays on v7. An algorithm-changing v8 update would need representative image/threshold evidence and baseline policy, not merely rewritten expected counts to make tests green.

## Owner execution

Resolve/review locks first with `npm run deps:lock`, then select the intended Node major and run `npm run setup`. `npm run test:release` includes `verify` and Docker browser coverage; do not repeat `npm test`, `verify` and `test:release` on the same unchanged tree.

For the Node 22/24 comparison, run the complete gate once on Node 24, then only `npm run verify` on Node 22. The Docker image is Node 24 in both cases, so rerunning it solely because the host Node changed adds little. Native system Chromium remains a separate workstation acceptance path.

Follow [Node 24 and dependency instructions](node24-dependency-upgrade.md) for one-line commands, exact update choices, three-scope audits, scan limits and staging acceptance. No successful install/test/browser/provider/audit result is claimed in this source snapshot.

## Passive authoring checks

Parsed 16 changed/new JavaScript modules without imports/execution, all 18 shell scripts with mode 0755, 10 JSON files and CI/MkDocs YAML. All three CloudFormation templates and the predecessor root lock are byte-identical to 0.5.14. Relative imports across 160 source modules and changed guide links resolved. Browser/comparison/S3-presigner/DynamoDB pair pins were compared across manifests and image/version contracts. The root lock mismatch is intentional pending owner npm resolution; these checks are not tests, dependency resolution, audits or a successful build.
