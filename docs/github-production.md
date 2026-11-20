# GitHub Actions releases for Cloversight 0.5.20

These workflows update the installed `webwatch-prod` stack at `cloversight.app` in AWS account `807434077491`, primary region `us-east-1`, and its configured secondary stacks. Run the setup commands from the project root on your openSUSE workstation. Allow one release at a time across GitHub and the workstation.

## 1. Import the integrated release

The complete 0.5.20 CI/CD release includes both workflows, their AWS templates, scripts and tests. Keep your configured workstation directory for operator deployments. The ZIP opens at the project root, with `package.json` and `.github/workflows/` at the top level.

Use Git, GitHub CLI (`gh`), AWS CLI v2, Node 22 or 24, and unzip on your openSUSE workstation. Sign in, set the name of your production repository, and point `release_zip` at the downloaded file. Replace `OWNER/REPO` below.

```bash
gh auth login --hostname github.com
aws sso login --profile saas-admin
REPO='OWNER/REPO'
release_zip="$HOME/Downloads/cloversight-saas-release-0.5.20-cicd.zip"
```

**New GitHub repository.** Extract into a new directory. Review the staged file list before committing. It should contain the workflows, all three package locks, and the sample configuration `.env.example`. Keep operator configuration and deployment state in your existing workstation directory.

```bash
release_dir="$(mktemp -d "$HOME/Downloads/cloversight-import.XXXXXXXX")"
unzip -q "$release_zip" -d "$release_dir"
cd "$release_dir"
git init -b main
git add -- .
git diff --cached --stat
git commit -m "Import Cloversight 0.5.20 with production release workflows"
gh repo create "$REPO" --private --source=. --remote=origin --push
```

**Existing GitHub repository.** Use a fresh clone and a branch so that you can review the differences against your current main. Extracting the archive into this clone includes workflow dotfiles and executable scripts. The existing repository may have edits of its own. Reconcile them before staging.

```bash
clone_root="$(mktemp -d "$HOME/Downloads/cloversight-review.XXXXXXXX")"
gh repo clone "$REPO" "$clone_root/project"
cd "$clone_root/project"
git switch main
git switch -c github-production-release
unzip -qo "$release_zip"
git status --short
git diff --stat
# Review changed and newly added files, then stage the intended release.
git add -- .
git diff --cached --stat
git commit -m "Integrate Cloversight 0.5.20 production release workflows"
git push -u origin github-production-release
gh pr create --base main --fill
```

Keep the repository variable `PRODUCTION_AUTO_DEPLOY` unset or set to `false` for the initial import or merge. Review and merge an existing-repository pull request once its verification jobs pass. Continue from the clone linked to the production repository.

## 2. Protect main and the production environment

In GitHub **Settings → Rules → Rulesets**, protect `main` against force pushes and deletions, require a pull request, and require the CI status checks. After the first run, select the actual check names for the Node 22/24 verification matrix, browser, documentation, root audit and both runtime audits. Protect review of changes to the workflow, deployment scripts, infrastructure and dependency locks. A merged release can deploy Lambda code that runs with the application's production permissions.

In **Settings → Environments**, create `production`. Choose **Selected branches and tags** and add a **branch** rule for exactly `main`. Add a required reviewer if you want an approval before deployment and your GitHub plan supports it. For a solo operator, enabling prevent-self-review requires a second eligible reviewer. Private repository environment rules and required reviews depend on plan. Verify the environment is available for this repository before binding AWS access. The workflow only needs the usual read-only repository token plus the production job's OIDC token.

## 3. Install release access in AWS once

From the freshly merged main branch:

```bash
git switch main
git pull --ff-only
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
AWS_PROFILE=saas-admin node scripts/setup-github-production.mjs "$REPO"
```

The script checks the account, domain, stack identities, execution role, enabled indexes, and every region in the primary stack. If an advertised secondary stack is missing, complete that region using the existing workstation deployment and its operator runbook before retrying. Use your original configured workstation directory for those commands. The script reuses the account's GitHub issuer or provisions it once with CloudFormation. If an existing issuer lacks the STS audience, add `sts.amazonaws.com` to its audiences in **AWS IAM → Identity providers** and retry. Custom enterprise issuers and customized GitHub subject formats require a matching trust-policy change.

The separate `cloversight-github-release-access` stack creates `cloversight-github-production`. Its trust ties both supported subject formats to the repository and owner IDs, `main`, the `production` environment and the production reusable workflow. The grant names the installed stack ARNs, site buckets, distributions, ECR repositories and execution role. Run setup again after an intentional resource replacement, transfer/rename, or regional expansion. Leave the existing human deployment role, bootstrap stack and Secrets Manager values in place.

## 4. Inspect, then release

In **Actions → CLOVERSIGHT verification → Run workflow**, choose branch `main` and target `inspect-production`. The job runs verification, signs in with OIDC, inspects the installed configuration, and checks the primary DNS, certificate, quotas and image with an AWS session restricted to reads. Inspection exercises authentication and reads. The first actual deployment exercises write permissions. The same controls are available from your workstation:

```bash
gh workflow run ci.yml --repo "$REPO" --ref main -f target=inspect-production
gh run list --repo "$REPO" --workflow ci.yml --limit 5
# Copy the matching run ID from that list.
gh run watch RUN_ID --repo "$REPO" --exit-status
```

After inspection succeeds, dispatch `deploy-production` and watch that run:

```bash
gh workflow run ci.yml --repo "$REPO" --ref main -f target=deploy-production
```

The job checks that the verified revision is still the head of main as it starts release. A matching source hash and release label allow reuse of the installed ECR digest. Otherwise it builds, verifies, and pushes one worker for that run. It packages the locked Lambda ZIP, updates the existing primary and regional stacks using the same worker digest, then uploads the portals and waits for CloudFront. It verifies the runtime key and image parameters, compares each portal's HTML to the checked-out files and requires `/api/health` to report healthy. The Actions summary records the commit and worker digest. The run also retains the available worker contract, dependency inventories and release evidence for 30 days. An installed worker built before the CI/CD integration will be rebuilt on the first deployment because its source hash includes the changed build and deployment scripts.

Provider credentials and Stripe sandbox/live selection stay in the deployed secret. Ordinary CI releases retain the primary stack's installed parameters except the runtime key and worker digest. Secondary deployments refresh their central bindings and image, preserving individual capacity and alert settings. Changes to existing parameter values, introduction of new required parameters, SES activation, migrations and secret cutovers use the operator procedure. Before a future workstation infrastructure update, check out the currently deployed revision and refresh its worker image contract and digest. An older release directory can redeploy an older worker. For the Stripe trial and live cutover follow `docs/stripe-production-test-0.5.20.md`. HTTP checks are distinct from a real customer checkout or cancellation test.

## 5. Enable or pause deployment on merge

After the manual deployment passes, set this **repository-level Actions variable**:

```bash
gh variable set PRODUCTION_AUTO_DEPLOY --repo "$REPO" --body true
```

The next verified push to main will deploy. PR jobs run tests using read-only repository access. The staging self-hosted job runs only when you explicitly choose the staging target. The manual production targets also work with automatic delivery disabled.

To pause future automatic releases:

```bash
gh variable set PRODUCTION_AUTO_DEPLOY --repo "$REPO" --body false
```

## Failures and recovery

Start with the first failed step in Actions (`gh run view RUN_ID --repo "$REPO" --log-failed`). For OIDC access failures verify repository IDs/name, environment, main ref, reusable workflow path, STS audience and any customized subject format. For a stack failure, diagnose the exact primary or regional stack with `AWS_PROFILE=saas-admin node scripts/deployment-control.mjs diagnose STACK_NAME REGION`.

CloudFormation rolls back failed updates within each stack; primary, regional and static releases are separate stages. A later failure can leave a mix of revisions. Pause automatic delivery, check each affected stack has reached a stable status, correct the failing step, then dispatch the current verified main revision again. If application code needs reverting, merge a revert of the offending change and deploy that new commit. A cancelled Actions job can leave a CloudFormation operation running. Do not start a workstation deployment before it finishes. Reverting code does not undo data migrations, billing transactions or external notifications.

References: [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [AWS GitHub OIDC condition keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html), [GitHub environment protections](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [CloudFormation deployment parameters](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html).
