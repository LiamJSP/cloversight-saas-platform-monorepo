# Release 0.5.14 — CLOVERSIGHT, phone menus and workflow consolidation

Source baseline: the delivered 0.5.13 audit-remediation ZIP. Authoring date: 2026-10-10. No project tests, application/browser sessions, package installs, builds, deployment or live provider/AWS operations were run. Passive parsing and archive/asset consistency checks are recorded in the readiness guide.

| Requested work | Delivered | Remaining |
| --- | --- | --- |
| Smartphone hamburger scrolling and spacing | Public viewport-attached navbar and a menu header outside the scrolling links; customer/steward viewport-attached phone rails; 1rem between menu items | Owner-run short-portrait, landscape, keyboard, zoom and touch acceptance. |
| CLOVERSIGHT rename | Product pages, portal/auth/error copy, notices, reports, extension, download/package/release names and current guides | Intentional resource/storage/protocol compatibility names; predecessor generated PNG/JSDoc snapshots. See [branding](branding.md). |
| Supplied logos | Full/compact light/dark SVGs, small favicons, Cognito inline assets, extension PNG icons/popup, SVG/PNG/PDF report/notice branding | Live Cognito, PDF and mail-client rendering acceptance. |
| Easy setup/deployment | `npm run dev`, `npm run aws:bootstrap` with automatic merge, `npm run deploy` with fresh image/output merge/primary/regional/secrets/web/SES sequence, `npm run setup` | External IAM/SSO, DNS/certificates/provider activation and source locks remain prerequisites. |
| Test suite review | Stale one-file report assertion fixed; report isolation/Unicode/escaping/commit-failure, closure hold/batch and real-browser phone regressions; new shell included in IaC parsing; duplicate Docker readiness calls removed | All execution; real DynamoDB/IAM/provider evidence and other audit regression gaps. See [test review](test-review-0.5.14.md). |
| Initial-release review | Practical security/paid-release gates separated from rapid follow-up work | See [release readiness](release-readiness-0.5.14.md). |

## Existing deployment upgrade

Extract into a new folder. Preserve your previous private `.env`, immutable `STEWARD_OWNER_SUB`, exact stack/bootstrap names, configured domains/provider IDs and custom staging allowlist. Do not rename deployed resources or data keys for the rebrand. Use Node 22/npm 10+ and working Docker/Buildx/AWS CLI v2.

Root dependencies and globe preparation are automatic on `dev` and `deploy`. Generate/review the two missing runtime locks on your owner workstation before production/CI:

```bash
npm run deps:lock
```

Review/commit their lockfiles, audits/SBOM and immutable container scan evidence. `STAGE=prod` forces dependency locks for both the direct worker-image and Lambda packaging paths; the consolidated deploy also checks locks before its AWS identity/image/deploy steps. CI refuses missing runtime source locks.

After configuring `.env`, authenticate and update access once (the wrapper merges its own outputs):

```bash
aws sso login --profile saas-admin
npm run aws:bootstrap
```

If IAM Identity Center permissions changed, grant/refresh the intended permission set and repeat SSO login before the deployment role is used. Keep a maintenance window across primary/regional upgrades:

```bash
npm run deploy
```

A new immutable worker image is required: source/version fingerprints changed. The wrapper chooses a fresh tag so a copied prior `WORKER_IMAGE_TAG` does not collide with immutable ECR. A verified same-source image can be reused with `npm run deploy -- --reuse-image`; it is checked by the existing deploy contract. `--skip-secrets` and `--skip-ses` are explicit maintenance/recovery choices, not the initial setup default. The command stops on failure and does not claim rollback across stages.

The granular deployment guide still documents change sets, existing GSI sequencing, viewer certificates, Cognito vanity-domain migration, DNS/SES and operator actions. No existing physical resource, allocation tag, queue protocol or Stripe price catalogue is migrated here. The staging ChatGPT exception and optional Twilio policy are preserved.

## First deployment and owner enrollment

Bootstrap requires `AWS_DEPLOYMENT_PRINCIPAL_ARN` and non-root Identity Center access; the first permission-set assignment cannot be performed by an unprovisioned deployment role. A new application stack has no steward pool to query until its first deploy. Use the existing [steward-owner commands](deployment.md#steward-owner-identity-for-this-release) after the pool exists, preserve the exact owner subject in `.env`, and redeploy primary infrastructure before staff access. Do not recreate an existing owner user. Production additionally needs actual TOTP enrollment/recovery and confirmed operator SNS subscriptions in every Region.

External gates remain: domain/ACM validation and SES production access, shared rule-set conflict review, Stripe configuration/webhooks, controlled tenant/isolation/provider checks, legal/privacy ownership and release security evidence. The application source cannot complete account/provider-console activation.

## Explicit acceptance (owner)

Run the complete local gate once on the final tree:

```bash
npm run setup
npm run test:release
```

Then review/stage actual authentication/MFA, two unrelated tenants' API/evidence/report/export boundaries, a real regional check, notification receipt, Stripe test-mode webhook/replay and closure/restore behavior. No browser/source-contract result substitutes for these AWS/provider checks. The blocker list is [release readiness](release-readiness-0.5.14.md).

For UI acceptance, scroll the public page in phone portrait, open its menu, scroll the menu to the end and verify the close control remains visible. Repeat in customer and steward menus, then resize to desktop. Check exactly 1rem between adjacent links/buttons, light/dark logos, 320px width, enlarged text and safe areas. Verify Escape/close restores public focus. The authored browser regressions exercise the real public/customer geometry; they have not been run here.
