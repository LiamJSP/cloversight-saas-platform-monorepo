# Documentation from source

The project uses three complementary documentation formats:

| Tool or format | Scope | Generated output |
| --- | --- | --- |
| Material for MkDocs | Navigable runbooks, architecture and surface guides | `.local/docs-site/` |
| JSDoc | Browser JavaScript, extension and Node service modules | `docs/reference/jsdoc/` |
| PyYAML CloudFormation extractor | Primary and regional infrastructure resources, API Gateway route keys | `docs/reference/cloudformation.md`, `docs/reference/gateway-routes.md` |
| Matplotlib atlas renderer | Source linked architecture figures and standalone brand-styled HTML | `docs/visuals/` |

Install dependencies from the repository root with `npm ci` and `python3 -m pip install -r docs/requirements.txt`. Then run `npm run docs:generate` to regenerate the checked-in AWS tables and visual atlas plus the JSDoc HTML reference. Run `npm run docs:site` to produce the searchable MkDocs site. To browse locally use `mkdocs serve -f mkdocs.yml`; open `docs/visuals/system-landscape.html` and `docs/visuals/regional-check.html` directly for standalone diagrams. The [JSDoc index](reference/jsdoc/index.html) is included in this ZIP as a generated snapshot, but `docs/reference/jsdoc/` is ignored by Git and must be regenerated in a source checkout before building the site.

The CloudFormation extractor uses safe YAML parsing with constructors for intrinsic tags, enumerates logical resources/outputs, and lists every configured HTTP API gateway route. The `ANY .../{proxy+}` routes cover multiple runtime operations: the generated gateway table does **not** claim to list all HTTP methods, payload fields, account checks or response schemas. Read `src/api/routes.mjs` and [security](security.md) for that behavior. JSDoc contains documentation for annotated modules and source navigation for the included JavaScript; comments should be added alongside changed public functions rather than promising inference of undocumented contracts.

`docs/requirements.txt` pins the Python doc environment, and `package-lock.json` pins JSDoc. The [visual atlas](visuals/index.md) uses diagrams maintained in a small declarative renderer; update its nodes and source pointers when a topology change lands. The [AWS inventory](reference/cloudformation.md) and [gateway inventory](reference/gateway-routes.md) must be regenerated after CloudFormation edits.

No documentation generation deploys infrastructure or runs the product test suite. The existing release gate is described in [testing](testing.md).

## Deployed dependency and release evidence

The root, `infra/runtime/` and `infra/docker/browser-worker/` dependency scopes all contain registry-resolved package locks in 0.5.16. Root developer dependencies also include the pinned AWS SDK clients used by the queue/lease regression tests. Runtime/image packaging continues to use its separate manifests, so test dependencies do not expand the deployed application tree. `npm run verify` checks all three source locks. Use `npm ci` for ordinary installs; only run `npm run deps:lock` when intentionally updating and reviewing dependency resolution.

The documentation-only markdown-it transitive dependency was updated from 14.3.2 to 14.3.3 following the registry advisory. Root, managed Lambda and browser package audits report zero vulnerabilities at review time. The Chromium/Playwright pair remains 153.0.0/1.63.0 and requires actual container acceptance before promotion. The browser Docker install now disables lifecycle scripts; verify the packaged native binary in the existing image-contract/browser gates.

CI also runs cfn-lint 1.60.1 at error level alongside the repository semantic IaC validator. Regenerate the resource/gateway inventory after template changes; the 0.5.16 tables contain 178 primary and 17 regional resources.

Lambda packaging produces `dist/lambda/runtime.sbom.cdx.json` and `runtime.release-evidence.json` alongside `runtime.zip`. The browser image retains its installed-tree SBOM; the worker-image build script exports it to `.local/release-evidence/<image-tag>/browser-worker.sbom.cdx.json` and records immutable ECR/base-image URIs, source digest, manifest/lock digests and SBOM digest in `browser-worker.release-evidence.json`. A null source-lock digest explicitly identifies an unlocked resolution. Preserve this evidence with the final promoted artifact. SBOM generation is separate from Buildx attestations so Lambda continues receiving the supported single-image manifest.

CI now audits the root lock for high/critical advisories and exports its CycloneDX SBOM. Separate Lambda/browser runtime jobs check manifests and, when committed locks are present, install, audit and export the actual locked tree. The runtime CI gate now requires committed source locks and fails when either is absent; a passing root audit does not certify deployed dependencies. Require these security jobs in repository branch protection before promotion. Registry audit does not scan operating-system packages, prove exploitability or establish PCI compliance. ECR/container scan triage and a documented release approval remain owner release gates; there is no automatic deployment here.

Review browser/Chromium, Node.js, AWS SDK, Docker base and transitive advisories at least weekly and for every promoted release. Record severity, affected deployed digest, owner, patch deadline, decision and closure evidence. Urgent patches follow the approved risk-ranked incident/patch policy; do not defer a browser security fix to a normal feature release. Rebuild with a reviewed base digest and dependency locks, retain the new SBOM and container scan findings, and certify capture/isolation behavior in owner-operated staging before promotion. Changing the browser/driver pair also requires updating its versioned runtime manifest and the architecture/capture-isolation guide.

## Historical execution notes

Earlier release notes below describe the evidence available then. Missing-lock and stale-generation limitations are superseded by the current 0.5.17 evidence.

### 0.5.12 UI review snapshot

The release and UI review guides describe the current source changes and the live review of deployed 0.5.11. The available browser could not emulate a portrait viewport, so the review separates observed desktop behavior from source-reviewed portrait rules. Local tests, builds and documentation generators were not run. The generated references retained from the incoming archive are not regenerated 0.5.12 output. Infrastructure resources and gateway routes are unchanged by 0.5.12.

## 0.5.11 authorship snapshot

Current guides and rollout instructions were updated during source authorship. JSDoc HTML and visual-atlas generation were deliberately not executed because this session excluded project execution and builds. The existing generated HTML is a predecessor snapshot; regenerate it in the owner-operated documentation workflow before publishing it as current. The CloudFormation resource table was manually updated from checked-in YAML for the two new log metric filters and one alarm (164 primary resources). Gateway routes and runtime topology remain unchanged. No generator, test or product code was run.

## 0.5.13 source-review documentation

The October 10 source session regenerated only the CloudFormation resource and gateway-route inventory through the documentation-only Python extractor. It did not execute the application, tests, dependency installation, product builds, JSDoc/atlas build or deployment. The retained generated JSDoc and visual assets describe their predecessor snapshot; current changed behavior is in [the release guide](release-notes-0.5.13.md) and [complete audit register](audit-change-register-2026-10-10.md). Regenerate the full documentation on the owner workstation before publishing it as current.

## 0.5.15 Node/dependency handoff

Current guides use [0.5.15 rollout](release-notes-0.5.15.md), [Node/dependency review](node24-dependency-upgrade.md), [branding](branding.md), [test review](test-review-0.5.15.md) and [readiness](release-readiness-0.5.15.md). Node 22/24 are accepted workstation majors, CI service verification covers both, Docker browser acceptance asserts 24, and AWS stays on Node 22/AL2023. `npm run deps:lock` resolves all three trees after preserving prior locks; the incoming root lock is stale and runtime locks remain absent until owner execution. The retained JSDoc source snapshot and atlas PNGs have not been rebuilt. No documentation or product build was executed in this session. Textual source references and current templates are authoritative.

## 0.5.17 enforcement update

Dependency resolutions and all three CloudFormation templates remain the 0.5.16 versions. Generated resource references and JSDoc are refreshed with `npm run docs:reference` and `npm run docs:js`. The visual atlas retains the prior topology. See [verification](review-evidence/verification-0.5.17.txt) and [production limits](customer-abuse-review-0.5.17.md).
