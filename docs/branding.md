# CLOVERSIGHT identity and compatibility

The 0.5.14 product name is **CLOVERSIGHT**. `CloverSightTheme` uses mixed case as a JavaScript global identifier. The existing domain remains owner configured; no new domain was supplied and no DNS migration is implied.

## Supplied assets

`apps/shared/brand/` contains the six supplied full/compact/small light/dark SVGs and the kit's README/font license. The artwork remains vector outlines with no linked font or external request. The supplied small marks serve as light/dark favicons. Public, customer and steward links use full logos where space allows and compact marks in constrained navigation; accessible link names remain CLOVERSIGHT even when the mark is shown alone.

The static publisher uploads `brand.css`, the shared brand directory and both favicons to each surface's own origin before submitting/waiting for invalidations. The local server exposes the same paths. Cache revisions are 0.5.14. Existing shared theme selection controls which logo is displayed; favicon media queries follow browser color preference.

All three CloudFormation-managed Cognito branding resources embed supplied SVG full logos and small favicons for LIGHT and DARK. The existing Cognito form remains configured LIGHT; this release does not switch its theme or login URLs. [Cognito asset types](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AssetType.html) support those color modes and SVG.

Cognito's [SVG allowlist](https://docs.aws.amazon.com/cognito/latest/developerguide/managed-login-brandingeditor.html#managed-login-brandingeditor-api) does not accept the browser accessibility attributes `role` and `focusable`. The 0.5.19 Cognito hotfix removes those attributes from all 12 CloudFormation-embedded assets, preserving the paths, colors, titles and descriptions. Browser-served source SVGs retain their accessibility attributes. `npm run iac:validate` parses each embedded SVG and checks our supported outline subset, all four light/dark logo/favicon combinations for each client, and production user-pool deletion protection. Hotfix revision 2 also adapts all six FORM_LOGO canvases from 516×72 to 516×144, with `viewBox="0 -36 516 144"`, to meet the 1:1–4:1 logo ratio enforced by the Cognito service (observed in the 2026-11-17 deployment error). The additional transparent padding centers the unchanged artwork; it does not stretch or crop the paths. The six 24×24 favicons keep their original dimensions. Validation now checks dimensions and aspect ratios as well as markup; `node --test tests/cognito-branding.test.mjs` exercises these constraints with real template mutations. Future branding changes must use Cognito-compatible assets, rather than copying arbitrary browser SVG markup into the template.

For an initial production deployment stuck in `ROLLBACK_FAILED` after the rejected assets, follow [the 0.5.19 Cognito recovery guide](cognito-recovery-0.5.19.md). Keep deletion protection enabled in the template; deactivate it only on the identified empty pools of that failed create before removing that stack. Successful production stacks remain protected.

Signed response pages and the HTML report embed the supplied SVG outlines from `src/brand/assets.mjs`. PDF report headers use the same supplied dark full-lockup paths converted to equivalent PDF vector commands (quadratic curves become cubic curves); no runtime image/font dependency is added. Alert email replaces its old simulated mark with an embedded PNG export and retains visible CLOVERSIGHT text for clients that block embedded images. Actual mail-client rendering remains owner acceptance; no remote tracking-image request is added.

The extension popup uses the full light SVG. Chrome's manifest/action icons use 16/32/48/128px PNG exports; 16px uses the supplied simplified mark. The 0.3.1 extension retains existing permissions. [Chrome does not accept SVG extension icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons).

## Intentional legacy identifier exceptions

These are established deployment/storage/protocol contracts, not product copy. They are preserved across the rebrand:

| Contract | Examples | Why it remains |
| --- | --- | --- |
| AWS physical names and source template path | `webwatch-staging`, `webwatch-…-regional-…`, `infra/cloudformation/webwatch.yaml`, IAM roles, KMS aliases, SQS/Lambda/log/ECR/SES names and artifact prefixes | Renaming can replace resources, lose ownership or detach consumers. |
| Cost/security allocation | `Application=WebWatch`, the existing `WebWatch-…` budgets and `WebWatch/…` metric namespaces | Tags, IAM tag conditions, budget filters, historical costs and alarms must continue to agree. Owner tag defaults can use CLOVERSIGHT. |
| Authentication and origin protocol | `webwatch_role`, `x-webwatch-origin` | Existing token issuers/verifiers and CloudFront/API origin checks must remain aligned. |
| Operator/build/staging configuration | `WEBWATCH_*`, `WW_*`, existing Actions vars/secrets and concurrency group | Avoid invalidating existing private environments and staging credentials/settings. |
| Browser/session recovery | `webwatch-theme`, OAuth transaction/token/return-path keys, `webwatch-drafts`, local-account and cleanup-warning keys | Preserve theme, sign-in continuity and recoverable drafts without silent loss. |
| Extension coordination | `webwatch-picker`, installed marker/overlay ID | Existing injected content scripts and updated popup can coordinate safely. |
| Versioned export schema | `webwatch.personal-profile-export.v1` | The schema remains a stable consumer contract; human text and downloaded filenames are rebranded. |
| Historical artifacts | Earlier archive filenames and diagram source references | Existing input/artifact references remain resolvable. |

Renaming these needs a separate reviewed migration covering existing and fresh stacks, IAM and allocation filters, dual-read/session migration, extension coexistence and external export consumers. This decision is deferred for owner comments. Do not replace these values in a private `.env` or CloudFormation change set merely to remove the old word.

## Generated documentation limit

Current guides and textual generated HTML/SVG sources are rebranded. The two predecessor architecture-atlas PNG snapshots and the generated JSDoc source-browser snapshot have not been rebuilt. Run the documented owner-operated `docs:generate` workflow after reviewing the source; the PNG snapshots may still show the predecessor brand. These are documentation artifacts and do not serve as application logos. Their regeneration is incomplete in this session and is not presented as a passing build.
