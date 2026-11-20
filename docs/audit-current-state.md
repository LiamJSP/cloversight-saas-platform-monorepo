# Source documentation audit — 0.5.9

This audit compares the supplied project source with the current engineering docs. It is a source inspection and documentation generation pass. It did not deploy AWS infrastructure, run the product test suite or verify any live provider/account behavior.

The 2026-10-07 [staging browser access hotfix](staging-browser-access.md) supersedes the original audit's IP-only staging observation below. The owner-requested header exception is now present in source; successful access after deployment remains unverified.

## Source inspected

- `apps/public/`, `apps/customer/`, `apps/steward/`, `apps/shared/` and the Chrome extension.
- The local `src/server.mjs` composition, `src/api/routes.mjs`, the AWS handler/runtime/worker modules, monitoring, billing, notification and persistence services.
- Both `infra/cloudformation/` templates, deployment scripts, package scripts, and `.github/workflows/ci.yml`.
- Current core docs and release limitations. Historical release notes and changelogs were left intact.

## Corrections and current boundaries

| Finding | Source evidence | Documentation action |
| --- | --- | --- |
| At the original audit, README claimed staging permits a spoofable ChatGPT Work header fingerprint, contradicting its own allowlist bullet. | At that point, `EdgeWebAcl` and `RegionalWebAcl` contained `AllowDeclaredAddresses` IP sets only. The 2026-10-07 hotfix adds switchable ChatGPT user-agent and browser-header rules to both. | Original correction retained as history; current README and core guides now describe the restored exception and its spoofability. |
| Customer design guide said six navigation targets, while the portal has more routes and a conditional advanced desk. | `apps/customer/index.html` rail buttons. | Updated the portal design system inventory and added the surface map. |
| Existing docs explained regional queues in prose but lacked a current visual and a template-derived resource/route inventory. | `src/aws/*`, `src/monitoring/regional-coordinator.mjs`, both CloudFormation templates. | Added source linked diagrams, resource table, gateway route table and regeneration commands. |
| Code documentation had no unified navigation or reproducible JavaScript API reference. | `package.json`, `docs/`, JavaScript entry modules. | Added MkDocs configuration, JSDoc module annotations/configuration, pinned dependencies, generated HTML and a documentation CI job. |

## Known limits of the generated references

The gateway table describes declared API Gateway entrypoints. Catchall `ANY` routes do not enumerate the runtime router's allowed methods, payload schemas, team roles or per-account checks. The diagrams describe intended code paths. Use the exact source and [known limitations](known-limitations.md) for release decisions.

Run the existing product checks and live staging certification in [testing](testing.md) and [deployment](deployment.md) before promotion.

## Deployment packaging follow-up

Every repository `.sh` file is executable in the delivered ZIP. `infra/scripts/merge-generated-env.sh` merges the two generated non-secret deployment input files into an existing `.env`, replaces only their keys, rejects missing or unexpected generated assignments, and retains owner-only file permissions. The README and deployment guide show the commands in sequence.
