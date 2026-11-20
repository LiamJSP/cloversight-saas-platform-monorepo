# Release 0.5.10 — results, responsive layouts and capture isolation

Source snapshot dated 2026-10-08. This release was authored and reviewed without executing the project, running tests, building images or deploying. The existing staging app was inspected read-only after secure sign-in.

## Requested work

| Task | Source changes | Verification boundary |
| --- | --- | --- |
| 1. Check Status layout | Padded, vertically scrolling body with a visible header and consistent modal spacing. | Live old staging confirmed a 902 px panel clipping 1,542 px of content; new CSS needs deployment. |
| 2. Archive thumbnails | Review-size previews, bounded image requests, canceled detached views, exact signed-URL retries, reload controls, and account-authorized refresh for deleted-watcher archives. | Several source defects found; the intermittent network symptom was not reproduced conclusively. |
| 3. My profile | All inputs and region preferences stack vertically; profile and closure cards share one aligned width. | Source review covers owner/member variants. |
| 4. Portrait mobile | Corrected crowded navigation, obsolete reserved padding, action-menu sizing, fixed-width uptime overflow, long-value wrapping, modal actions, responsive evidence cards and safe-area spacing. | Supported cloud-browser interface offered no portrait viewport control; Chrome device-emulation shortcut had no effect. A true portrait browser pass is still pending. Team/billing/action-log were source-reviewed; the signed-in staging account was a team member. |
| 5. Public payment copy | PayPal, Alipay and WeChat Pay labels/logos removed from public static pages. | App billing/provider stubs retained. |
| 6. Three views | Common results modal prominently leads with Desktop, Tablet and Mobile cards for the selected region. | Exact profile evidence, visible unavailable state and direct profile navigation; used by watcher and archive results. |
| 7. Incident distinctions | Generic site changes, trigger phrases and outages have separate labels, colors, email subjects and evidence. Outage scope is complete, regional or unconfirmed. | Complete means every monitored region confirms outage; missing capture evidence cannot prove it. |
| 8. Literal template | The single-quoted fallback that displayed interpolation code is fixed. | Confirmed in live old staging. |
| 9. Regional comparisons | Frozen check configuration, same-region baseline lookup after primary fallback, actual per-region baseline IDs/timestamps, honest missing-comparison explanations, and detector-based globe classification. | Historical snapshots are not recomputed. Fresh checks are needed to confirm the reported WordPress symptom. Small below-threshold differences no longer show as flagged changes. |
| 10. Isolation | Fresh private browser profiles/processes, late-launch retirement, fail-closed cleanup, immutable first-result commit, canonical configuration fingerprints, exact result/evidence ownership, configured queue/location binding, strongly read membership authorization, and account/user-scoped draft recovery. | Application/session/evidence hardening; shared capture IAM roles and the established Lambda Chromium sandbox setting remain. No claim of per-tenant hardware isolation or immunity to browser exploits. |

The archive refresh route also now supports retained results whose watcher was deleted. Those results open a read-only modal instead of a blank view. An unavailable comparison remains unavailable rather than becoming an invented match or change.

## Deploy from the new project directory

Copy the existing private `.env` into the new extracted `webwatch-saas-release-0.5.10` directory before running commands. Also carry over any customized `config/staging-ip-allowlist.txt`. Keep `AWS_PROFILE=saas-admin` in `.env`, preserve the existing `STEWARD_OWNER_SUB`, and retain the owner-requested staging browser exception. No pricing catalogue or provider secret changes are required.

Save any old browser-only recovery draft to the platform before upgrading. The old global IndexedDB recovery key has no verifiable owner and is discarded without being shown or imported; new drafts are scoped to both account and signed-in user.

Use a maintenance window: pause affected watchers and allow existing queued/running checks to reach terminal status before replacing the coordinator and all capture workers. Do not unpause them between primary and regional deployments. New and historical incident behavior can coexist, but all new runtime files and capture images must be deployed from this snapshot.

Run each command from the project root; each command occupies one line:

```bash
aws sso login --profile saas-admin
export AWS_PROFILE=saas-admin AWS_PAGER=""
npm ci
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run aws:deploy
npm run aws:deploy-regional
npm run aws:deploy-web
npm run aws:audit -- --full
```

The scripts use `saas-admin` for the source login and then assume the existing deployment role. A new digest-pinned browser image is mandatory: the release/source contract includes the updated core source. Do not reuse the old `.local/worker-image.env`. The web deployment explicitly uploads the new `results-evidence.css` and waits for CloudFront invalidations. The regional deployment updates every configured secondary-region capture worker; a primary-only deploy leaves old regional code running.

New template environment values (`LEGACY_SNAPSHOT_BUCKET_NAME` and `LEGACY_SNAPSHOT_BUCKET_REGION`) are wired by CloudFormation; they are not additional manual `.env` inputs. Primary capture gets read access to the legacy `history/` prefix. Secondary capture legacy access is narrowed to primary `history/` and `baselines/` prefixes. Capture transport contract version stays 1 with compatible additional metadata; no data migration or destructive stack operation is included.

## Create a steward account

For an additional steward, sign in to the separate steward console as the configured platform owner. Open **Steward Manager**, enter the work email under **Invite a steward**, and select **Send invitation**. This creates the Cognito user and the application's active invitation bound to its immutable subject. Cognito sends a temporary password; in this checked-in template it expires after one day. The invitee uses the steward sign-in page, replaces that password and follows the configured MFA flow. The default steward pool requires software-token MFA; retain that protection.

Creating an ordinary staff user with AWS CLI alone does not grant application access. `STEWARD_OWNER_SUB` is the one platform owner's subject, not a list of staff subjects. Do not replace it to add a steward.

To obtain the actual console URL for your stage:

```bash
aws cloudformation describe-stacks --stack-name webwatch-staging --region us-east-1 --profile saas-admin --query 'Stacks[0].Outputs[?OutputKey==`StewardUrl`].OutputValue|[0]' --output text --no-cli-pager
```

If the platform owner has not yet been bootstrapped, first look up that owner in the steward pool. Substitute the real owner's email and stage stack name:

```bash
STACK_NAME=webwatch-staging
OWNER_EMAIL=owner@example.com
STEWARD_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region us-east-1 --profile saas-admin --query 'Stacks[0].Outputs[?OutputKey==`StewardUserPoolId`].OutputValue|[0]' --output text --no-cli-pager)
aws cognito-idp admin-get-user --user-pool-id "$STEWARD_POOL_ID" --username "$OWNER_EMAIL" --region us-east-1 --profile saas-admin --output json --no-cli-pager
```

Only if it reports `UserNotFoundException`, create the initial owner:

```bash
aws cognito-idp admin-create-user --user-pool-id "$STEWARD_POOL_ID" --username "$OWNER_EMAIL" --user-attributes Name=email,Value="$OWNER_EMAIL" Name=email_verified,Value=true --desired-delivery-mediums EMAIL --region us-east-1 --profile saas-admin --no-cli-pager
```

Retrieve the immutable subject:

```bash
OWNER_SUB=$(aws cognito-idp admin-get-user --user-pool-id "$STEWARD_POOL_ID" --username "$OWNER_EMAIL" --region us-east-1 --profile saas-admin --query "UserAttributes[?Name=='sub'].Value | [0]" --output text --no-cli-pager)
printf '%s\n' "$OWNER_SUB"
```

Set the single `STEWARD_OWNER_SUB` entry in your private `.env` to that value and rerun `npm run aws:deploy`. Use the subject from this stage's **steward** pool. For a brand-new stack the pool must first be created by an initial deployment; keep staff access denied until the owner subject is configured and redeployed. Then use Steward Manager for every additional steward. See [steward security](steward-security.md).

## Owner verification after rollout

1. Unpause the watchers after all stacks and static assets finish. Run fresh checks and compare each region against the actual reference ID/time now displayed. Historical archives keep their recorded findings.
2. In Chrome portrait at 320, 360 and 390 px widths, review Overview, Watchers, editor/recipient controls, Check Status, View Results, archive stacks and cards, Reports, Profile, plus owner-only Team, Action log and Billing. Check keyboard scrolling, modal Close access and absence of horizontal overflow.
3. Leave Archived Results open beyond signed-link expiry, then navigate away/back and use Reload thumbnails. Also review an archive whose watcher was deleted.
4. Review generic changes, trigger phrases and partial/complete outages in both the app and delivered multipart email. A failed regional capture must remain an error/unavailable state, not a target outage or confirmed unchanged result.
5. Exercise overlapping edits, paused watchers, queue redeliveries, revocation and cross-account authorization using your normal staging fixtures. See [capture isolation](capture-isolation.md) for the exact trust boundary.

For a regional mismatch that remains after a fresh check, supply the displayed snapshot ID, regional reference IDs/times, affected regions, and sanitized capture error events. Do not edit captured evidence or queue message identities to force a change flag.
