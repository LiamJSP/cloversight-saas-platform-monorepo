# Cloversight 0.5.22 · Production CI/CD on openSUSE

Your personal repo holds the public source. Only the business fork runs CI/CD and deploys to the existing `webwatch-prod` installation at `cloversight.app`.

Follow **steps 1–6** in one Bash terminal. Check each result before continuing. After setup, use [Everyday releases](#everyday-releases), [Watcher capacity](#verify-watcher-capacity-in-aws) or [Recovery](#recovery-and-operator-tasks).

### Where production configuration lives

**Keep your production `.env` in your existing private workstation checkout.** GitHub releases use the configuration already in AWS. You do not upload the file or copy it into either repo.

| Where | What belongs there |
| --- | --- |
| Private workstation checkout | `.env` supplies the initial provisioning, configuration-change and rotation scripts. Set `AWS_PROFILE=saas-admin` there. Your SSO session, local development settings, `.env` backups and `.local/` files stay on the workstation. Git tracks only `.env.example`. |
| AWS CloudFormation | Your deployed stacks hold domains, certificates, hosted zone IDs, alerts, regions and concurrency. Each release reads the installed parameters and outputs into the runner’s temporary environment. Editing your local file takes effect only when you apply the relevant change. |
| AWS Secrets Manager | Stores the Stripe key, webhook secret, API version, mode and six Price IDs, plus optional Twilio credentials in a separate secret. From the private checkout, `npm run aws:push-stripe-secret` updates Stripe. `npm run aws:push-secrets` also uploads configured Twilio credentials. Normal releases preserve the installed Stripe mode. |
| Business GitHub repo | Set one production **repository variable**, `PRODUCTION_AUTO_DEPLOY`. The GitHub **environment** `production` controls branches and approvals. OIDC supplies temporary AWS credentials. Leave production secrets empty in GitHub. |

## 1. Check your workstation and download

Open a fresh Bash terminal as your normal user. Use your existing personal GitHub CLI login. The `unset` lines clear shell credentials that could override a saved login.

```bash
unset GH_TOKEN GITHUB_TOKEN
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
git --version
gh --version
aws --version
node --version
npm --version
command -v unzip sha256sum python3 curl
PERSONAL="$(gh api user --jq .login)"
printf 'Personal GitHub login: %s\n' "$PERSONAL"
```

Confirm your personal username, AWS CLI **2.x**, Node **22.23.4 or later in 22.x, or 24.x**, and npm **10+**. If a tool is missing, use [Workstation setup](#workstation-setup). GitHub-hosted runners supply Docker for the rollout.

Download the full ZIP and its matching checksum to `~/Downloads`. Keep their filenames. For the bundle accompanying this guide, run:

```bash
ZIP="$HOME/Downloads/cloversight-saas-release-0.5.22.zip"
(cd "$HOME/Downloads" && sha256sum --check "${ZIP##*/}.sha256")
```

Continue when the ZIP reports `OK`. The archive includes this walkthrough and the first AWS installation guide.

## 2. Publish the personal repository with Actions disabled

Stay signed in as **your personal user**. Extract into a new directory, separate from your configured AWS checkout.

```bash
ARCHIVE="$PERSONAL/cloversight"
IMPORT="$HOME/src/cloversight-personal-import"
mkdir -p "$HOME/src"
mkdir "$IMPORT" && unzip -q "$ZIP" -d "$IMPORT" && cd "$IMPORT" && git init -b main
```

If the directory already exists, inspect it first. In the new repo, check what Git will publish.

```bash
git add -- .
git diff --cached --stat
git ls-files -- .github/workflows package-lock.json infra/runtime/package-lock.json infra/docker/browser-worker/package-lock.json
git ls-files -- '.env*' '.local/*' '.aws/*'
git var GIT_AUTHOR_IDENT
```

Expect both workflows and three lockfiles. The private-file query should print **only `.env.example`**. The staging allowlist contains an example address. Keep real CIDRs, SSO caches and account test evidence private. If needed, set your Git author locally with `git config user.name "Your Name"` and `git config user.email "your GitHub commit email"`.

Create the public repo **empty**, disable Actions, and read the setting back **before pushing**. If GitHub reports the repo already exists, inspect its owner, visibility and branches before using it.

```bash
git commit -m "Import Cloversight 0.5.22 with production CI/CD"
git tag -a cloversight-0.5.22-import -m "Original CI/CD release"
gh auth setup-git --hostname github.com
gh repo create "$ARCHIVE" --public &&
  gh api --method PUT "repos/$ARCHIVE/actions/permissions" -F enabled=false --silent
gh api "repos/$ARCHIVE/actions/permissions" --jq .enabled
```

Once you see `false`, publish:

```bash
git remote add origin "https://github.com/$ARCHIVE.git"
test "$(gh api "repos/$ARCHIVE/actions/permissions" --jq .enabled)" = false &&
  git push -u origin main &&
  git push origin refs/tags/cloversight-0.5.22-import
gh repo view "$ARCHIVE" --json nameWithOwner,visibility,defaultBranchRef
```

Expect your personal owner, `PUBLIC` and `main`. Personal setup is complete. For an explicitly read-only snapshot, you can now run `gh repo archive "$ARCHIVE"`. It remains publicly forkable. [Actions permissions](https://docs.github.com/en/rest/actions/permissions#set-github-actions-permissions-for-a-repository) · [Repository archiving](https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories)

## 3. Switch GitHub accounts and create the business fork

**Switch now.** Enter your business **login username**. If it’s already saved, `gh` selects it. Otherwise, sign in **as the business user** in the browser when prompted. Your personal login stays saved.

```bash
read -rp 'Business GitHub username: ' BUSINESS_LOGIN
if ! gh auth switch --hostname github.com --user "$BUSINESS_LOGIN"; then
  gh auth login --hostname github.com --git-protocol https --web --scopes workflow &&
    gh auth switch --hostname github.com --user "$BUSINESS_LOGIN"
fi
gh auth setup-git --hostname github.com
gh api user --jq .login
```

Confirm the printed username and select the same account in your browser. At **Fork owner**, press **Enter** for that business user or enter the **organization slug** if the business is an organization you administer. To create an organization first, use **GitHub → Settings → Organizations → New organization**, select its plan and enter its name and contact email. [Switch CLI accounts](https://cli.github.com/manual/gh_auth_switch) · [Fork options](https://cli.github.com/manual/gh_repo_fork)

```bash
read -rp "Fork owner [$BUSINESS_LOGIN]: " BUSINESS_OWNER
BUSINESS_OWNER="${BUSINESS_OWNER:-$BUSINESS_LOGIN}"
BUSINESS="$BUSINESS_OWNER/cloversight"
(
  set -eu
  ACTIVE="$(gh api user --jq .login)"
  [[ "${ACTIVE,,}" = "${BUSINESS_LOGIN,,}" && "${BUSINESS_OWNER,,}" != "${PERSONAL,,}" ]]
  if [[ "${BUSINESS_OWNER,,}" = "${BUSINESS_LOGIN,,}" ]]; then
    gh repo fork "$ARCHIVE" --clone=false --remote=false
  else
    gh repo fork "$ARCHIVE" --org "$BUSINESS_OWNER" --clone=false --remote=false
  fi
)
gh api "repos/$BUSINESS" --jq '{repo:.full_name,parent:.parent.full_name,private,branch:.default_branch,admin:.permissions.admin}'
```

Expect the business repo, the personal parent, `private: false`, `main` and `admin: true`. If the fork already exists or takes a moment to appear, repeat only the lookup. In the browser, use **Fork → Create a new fork → Owner → business owner**.

Clone by explicit URL so future pushes and pull requests target the business fork:

```bash
git clone "https://github.com/$BUSINESS.git" "$HOME/src/cloversight-business" &&
  cd "$HOME/src/cloversight-business"
git switch main
git config remote.pushDefault origin
gh repo set-default "$BUSINESS"
git remote get-url --push origin
gh repo set-default --view
git rev-parse HEAD
gh api "repos/$ARCHIVE/commits/main" --jq .sha
```

Check that both destinations name the **business** repo and the two initial SHAs match. Set a local business Git author here if it differs from your personal one (step 2). In a fresh terminal, return to `~/src/cloversight-business` and set `BUSINESS="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"`.

## 4. Enable business CI and protect main

From the business clone, print the five pinned action references (checkout, setup-node, setup-python, upload-artifact and AWS credentials), then open the business repository.

```bash
grep -hE '^[[:space:]]*-? *uses: (actions|aws-actions)/' .github/workflows/*.yml |
  sed -E 's/.*uses: ([^ ]+).*/\1/' | sort -u
gh repo view "$BUSINESS" --web
```

| In GitHub | What to set |
| --- | --- |
| **Actions** | Click **I understand my workflows, go ahead and enable them** if shown. |
| **Settings → Actions → General** | Allow the five pinned actions printed above. Under a restricted policy, allow GitHub-created actions plus the exact AWS action reference. If locked, the org owner must allow them. Set **Workflow permissions** to read repository contents and packages. Leave write tokens and secrets for external fork PRs disabled. Save. |
| **Settings → General → Pull Requests** | Enable **Allow squash merging**. |
| **Settings → Advanced Security** | Enable the dependency graph if prompted, then **Dependabot version updates**. In **Insights → Dependency graph → Dependabot**, check for `/infra/docker/browser-worker`. Forks need this explicit switch. |

Use GitHub-hosted runners. Keep auto-deploy off until the first manual release passes. [Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) · [Dependabot on forks](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates#enabling-version-updates-on-forks)

```bash
gh variable set PRODUCTION_AUTO_DEPLOY --repo "$BUSINESS" --body false
gh api "repos/$BUSINESS/actions/variables/PRODUCTION_AUTO_DEPLOY" --jq .value
gh workflow list --repo "$BUSINESS" --all
```

Expect `false` and **CLOVERSIGHT verification**. The deployment switch lives in **Settings → Secrets and variables → Actions → Variables → Repository variables**.

Run verification. `start_run` returns the exact run ID and is reused in step 6. Paste the function again in a new terminal, or use **Actions → CLOVERSIGHT verification → Run workflow**, select `main` and the target, then run. If you start or reopen a run in the browser, copy its ID after `/actions/runs/` in the URL. For the check list, use `read -rp 'Verification run ID: ' VERIFY_RUN`. [Workflow dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)

```bash
start_run() {
  gh api --method POST -H 'X-GitHub-Api-Version: 2026-03-10' \
    "repos/$BUSINESS/actions/workflows/ci.yml/dispatches" \
    -f ref=main -f "inputs[target]=$1" --jq .workflow_run_id
}
VERIFY_RUN="$(start_run verify)" &&
  gh run watch "$VERIFY_RUN" --repo "$BUSINESS" --exit-status
gh run view "$VERIFY_RUN" --repo "$BUSINESS" --json jobs \
  --jq '.jobs[] | select(.conclusion=="success") | .name'
```

Copy the **eight successful check names** exactly as printed. You should see two Node verification jobs, browser, worker-image, documentation, dependency-security and two runtime dependency jobs (Lambda and browser worker). Staging and production skip this target. View failures with `gh run view "$VERIFY_RUN" --repo "$BUSINESS" --log-failed`.

1. **Protect `main`.** Go to **Settings → Rules → Rulesets → New ruleset → New branch ruleset**. Name it `cloversight-production-main`, set **Active**, then **Target branches → Include default branch**. Enable **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** and **Require status checks to pass**. Add all eight names from GitHub Actions. Use **0 approvals** if you’re the only maintainer, or **1** when another developer can review. Leave the bypass list empty and click **Create**. [Branch rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
2. **Protect production.** Open **Settings → Environments → New environment**. Enter exactly `production` and click **Configure environment**. Under **Deployment branches and tags**, select **Selected branches and tags → Add rule → Branch**, enter `main` and save. For a human release gate, add **Required reviewers**. A solo operator who wants to approve their own runs must be an eligible reviewer with self-review permitted. Manual dispatch still obeys this gate. [Deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

```bash
gh api "repos/$BUSINESS/rules/branches/main" \
  --jq '.[] | {type,checks:[.parameters.required_status_checks[]?.context]}'
gh api "repos/$BUSINESS/environments/production" --jq .deployment_branch_policy
gh api "repos/$BUSINESS/environments/production/deployment-branch-policies" \
  --jq '.branch_policies[] | {name,type}'
```

Check for deletion, force-push, PR and status-check rules, all eight check names, `custom_branch_policies: true` and a `main` branch rule. If the type is absent in the API, confirm **Branch** in the UI. If a check is missing in the picker, get its name from the successful business run.

## 5. Connect the business fork to AWS

In the business clone, sign in with **`saas-admin`** and check the existing installation. If needed, [set up the profile](#workstation-setup) first.

```bash
cd "$HOME/src/cloversight-business"
git switch main && git pull --ff-only origin main
git status --short
gh api "repos/$BUSINESS" --jq '{repo:.full_name,id:.id,owner_id:.owner.id}'
export AWS_PROFILE=saas-admin
aws sso login --profile saas-admin
aws sts get-caller-identity --profile saas-admin --region us-east-1 \
  --query '{Account:Account,Arn:Arn}' --output table --no-cli-pager
aws cloudformation describe-stacks --profile saas-admin --region us-east-1 \
  --stack-name webwatch-prod \
  --query 'Stacks[0].{Status:StackStatus,ExecutionRole:RoleARN,Stack:StackId}' \
  --output table --no-cli-pager
AWS_PROFILE=saas-admin node --input-type=module -e '
  import { productionContext } from "./scripts/github-production.mjs";
  for (const stack of productionContext().stacks) console.log(stack.StackStatus, stack.StackId);
'
```

Expect a clean working tree, the business repo, your federated role in account **807434077491**, and **`webwatch-prod` in `us-east-1`**. The Node check verifies the public domain, both lookup and identity indexes, the execution role, a digest-pinned worker and every configured regional stack. Typical ready states are `CREATE_COMPLETE` and `UPDATE_COMPLETE`. A stable `UPDATE_ROLLBACK_COMPLETE` is also usable after you review the failure. For a missing, in-progress or failed stack, finish its installation or use [Recovery](#recovery-and-operator-tasks) first.

**Check existing access before binding.** A fresh GitHub repo can still share an AWS account with an older CI role. List any active access stack and its current repository binding:

```bash
aws cloudformation describe-stacks --profile saas-admin --region us-east-1 \
  --query "Stacks[?StackName=='cloversight-github-release-access'].Parameters[] | [?ParameterKey=='Repository' || ParameterKey=='RepositoryId' || ParameterKey=='OwnerId'].[ParameterKey,ParameterValue]" \
  --output table --no-cli-pager
```

An empty result is expected. Otherwise, compare all three values with GitHub before proceeding. Re-running setup **reassigns that release role**. Resolve any mismatch first.

**Install the release role.** This is the first AWS write. The script creates or reuses the GitHub OIDC provider and creates or updates `cloversight-github-release-access`.

```bash
(
  set -eu
  test "$(git remote get-url origin)" = "https://github.com/$BUSINESS.git"
  test "$(git branch --show-current)" = main
  test -z "$(git status --porcelain)"
  test "$(aws sts get-caller-identity --profile saas-admin --query Account --output text)" = 807434077491
  AWS_PROFILE=saas-admin node scripts/setup-github-production.mjs "$BUSINESS"
)
```

Expect `Binding BUSINESS-OWNER/cloversight` and CloudFormation success (or an empty change set for an identical binding). Verify the name and IDs against GitHub.

```bash
aws cloudformation describe-stacks --profile saas-admin --region us-east-1 \
  --stack-name cloversight-github-release-access \
  --query "Stacks[0].Parameters[?ParameterKey=='Repository' || ParameterKey=='RepositoryId' || ParameterKey=='OwnerId'].[ParameterKey,ParameterValue]" \
  --output table --no-cli-pager
gh api "repos/$BUSINESS" --jq '{Repository:.full_name,RepositoryId:.id,OwnerId:.owner.id}'
aws iam get-role --profile saas-admin --role-name cloversight-github-production \
  --query Role.Arn --output text --no-cli-pager
```

Expect `arn:aws:iam::807434077491:role/cloversight-github-production` for the runner. [AWS OIDC claims](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html)

## 6. Inspect, deploy once, then turn on automatic releases

**Inspect first.** Use the `start_run` function from step 4. If the run waits for an environment reviewer, open the printed URL and choose **Review deployments → production → Approve and deploy**.

```bash
INSPECT_RUN="$(start_run inspect-production)" &&
  printf 'Inspection: https://github.com/%s/actions/runs/%s\n' "$BUSINESS" "$INSPECT_RUN" &&
  gh run watch "$INSPECT_RUN" --repo "$BUSINESS" --exit-status
gh run view "$INSPECT_RUN" --repo "$BUSINESS" --web
```

Open **production / release → Inspect or release existing production installation**. Confirm a successful AWS login, the installed stack ARNs and a green release job. A skipped job leaves AWS access unverified.

**Deploy to production.** Continue after inspection succeeds and any active workstation or CloudFormation deployment finishes.

```bash
DEPLOY_RUN="$(start_run deploy-production)" &&
  printf 'Release: https://github.com/%s/actions/runs/%s\n' "$BUSINESS" "$DEPLOY_RUN" &&
  gh run watch "$DEPLOY_RUN" --repo "$BUSINESS" --exit-status
gh run view "$DEPLOY_RUN" --repo "$BUSINESS" --json headSha,conclusion,url
curl -fsS https://cloversight.app/api/health
```

Expect `success` and `{"status":"healthy"}`. The workflow checks that the tested commit is still current, reuses or builds the worker, deploys Lambda and the primary and regional stacks, publishes all three sites, waits for CloudFront and compares live files with the release. The **Summary** records the commit and worker digest. To exercise sign-in, open the [public site](https://cloversight.app/), [customer portal](https://cloversight.app/app/) and [steward portal](https://stewards.cloversight.app/), using the respective accounts. Billing verification requires a separate transaction.

**Turn on automatic deployment** for the next merge to business `main`:

```bash
gh variable set PRODUCTION_AUTO_DEPLOY --repo "$BUSINESS" --body true
gh api "repos/$BUSINESS/actions/variables/PRODUCTION_AUTO_DEPLOY" --jq .value
```

Expect `true`. The manual run already shipped this commit. For manual-only releases, leave the switch `false` and dispatch `deploy-production` after selected merges.

## Everyday releases

**Branch.** Confirm the business push URL and a clean working tree, then branch from current `main`.

```bash
cd "$HOME/src/cloversight-business"
BUSINESS="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
git remote get-url --push origin
git status --short
git switch main && git pull --ff-only origin main
read -rp 'New branch (e.g. fix/watcher-timezone): ' BRANCH
git switch -c "$BRANCH"
```

**Edit and test.** On your first working checkout, install the pinned dependencies and run the service and infrastructure checks:

```bash
npm ci &&
  python3 -m venv .local/iac-venv &&
  .local/iac-venv/bin/python -m pip install -r infra/requirements-iac.txt &&
  npm run verify
```

Use `npm run verify` on later changes. Repeat `npm ci` after a root lockfile change and the pip install after an IaC requirements change. If Docker is installed locally, `npm run test:browser:docker` runs the browser suite. Business CI also runs it on PRs.

| If you’re changing… | Where to work and how to check it |
| --- | --- |
| Public site copy or styling | Edit Markdown in `apps/public/src/content/`. Home, support and status cards use frontmatter. Legal and pricing text supports ordinary Markdown. Preserve legal heading markers such as `{#section-id}`. UI labels live in `apps/public/src/data/labels.json`, SCSS Modules under `apps/public/src/styles/`, and prices, limits and checkout eligibility in `src/domain/plans.mjs`. Run `npm run build:public` for HTML, sitemap, robots and hashed CSS in `dist/public/`. Use `npm run dev:server` and the printed loopback address to preview navigation, shared portal assets and API health. Rebuild in a second terminal after edits, then refresh. |
| Worker base image | Review Dependabot’s weekly digest PR. The Dockerfile pins the AWS Lambda Node 22 base. The `worker-image` job builds Linux amd64 and runs the packaged Chromium on an HTML fixture with networking disabled. Merge a green update through the normal rules. Production publishes the new immutable ECR digest. |

**Open and review the PR.** Review the staged diff before committing. Confirm the PR base is the business repo’s `main`.

```bash
git add -- .
git diff --cached --stat
git diff --cached --check
read -rp 'Commit title: ' TITLE
git commit -m "$TITLE" && git push -u origin "$BRANCH"
gh pr create --repo "$BUSINESS" --base main --head "$BRANCH" --fill
PR="$(gh pr view "$BRANCH" --repo "$BUSINESS" --json number --jq .number)"
gh pr checks "$PR" --repo "$BUSINESS" --watch
gh pr view "$PR" --repo "$BUSINESS" --web
```

If checks are still registering, repeat `gh pr checks`. For a failure, open the first failed step, fix it on the same branch and push. Review **Files changed**, get any required approval and wait for all eight checks.

**Merge and follow the actual release commit.**

```bash
gh pr merge "$PR" --repo "$BUSINESS" --squash
MERGED_SHA="$(gh pr view "$PR" --repo "$BUSINESS" --json mergeCommit --jq .mergeCommit.oid)"
gh run list --repo "$BUSINESS" --workflow ci.yml --branch main --event push \
  --commit "$MERGED_SHA" --json databaseId,headSha,url,status
```

If the list is empty, repeat the lookup after a few seconds. Then watch the matching run:

```bash
PUSH_RUN="$(gh run list --repo "$BUSINESS" --workflow ci.yml --branch main --event push \
  --commit "$MERGED_SHA" --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
test -n "$PUSH_RUN" && gh run watch "$PUSH_RUN" --repo "$BUSINESS" --exit-status
```

Every PR runs CI. With auto-deploy enabled, a merged application, public-site or infrastructure change deploys. A change limited to Markdown under `docs/`, the root `README.md` or `RELEASE_NOTES.md` can skip deployment. Even on a skip, the job uses OIDC to check the installed stacks against the last successful release recorded in the private S3 artifact bucket. The run summary gives the decision.

A missing baseline, changed stack, workstation deploy from this release or interrupted deployment forces the next automatic run to deploy. A newer push can supersede a queued one. Follow the newest run and its released SHA. Manual `deploy-production` always runs the full release. Use it to reapply the reviewed version after an out-of-band AWS console change.

## Verify watcher capacity in AWS

PR CI checks the scheduler locally with Chromium. After the first release, test the deployed scheduler from the business clone. Run smoke first, then the Business scenario before committing that capacity to a customer. Both consume tenant credits and incur AWS charges.

| Mode | Watchers | Cadence | Starts per watcher | Maximum credits |
| --- | ---: | ---: | ---: | ---: |
| `smoke` | 1 | 120 seconds | 1 | 1 |
| `business` | 250 | 120 seconds | 2 | 500 |

**Prepare the tenant.** Use a dedicated active Business tenant with zero watchers, enough credits for each run and over 14 minutes left in its usage window. Close sessions that could edit watchers or trigger checks. The scheduler spreads due times across the interval. All watchers target `https://cloversight.app/security` in the primary region and use the owner’s email.

**Authenticate.** Sign in to the customer portal as the tenant owner. In your browser’s **Developer Tools → Network**, refresh and open `/api/customer/bootstrap`. Use `account.id` and `account.contactEmail` from the response. From the **Authorization** request header, copy only the token following `Bearer`. Back in the terminal:

```bash
cd "$HOME/src/cloversight-business"
export AWS_PROFILE=saas-admin
aws sso login --profile saas-admin
aws sts get-caller-identity --profile saas-admin --query Account --output text
umask 077
mkdir -p .local
read -rp 'Dedicated tenant account ID: ' ACCEPTANCE_ACCOUNT_ID
read -rp 'Dedicated owner email: ' ACCEPTANCE_OWNER_EMAIL
export ACCEPTANCE_ACCOUNT_ID ACCEPTANCE_OWNER_EMAIL
read -rsp 'Owner access token (hidden): ' ACCEPTANCE_TOKEN
printf '\n'
printf '%s\n' "$ACCEPTANCE_TOKEN" > .local/acceptance-owner-token
chmod 600 .local/acceptance-owner-token
unset ACCEPTANCE_TOKEN
```

Expect AWS account `807434077491`. The tool also verifies the signed customer identity and stack. Refresh the token before each run by repeating the hidden prompt, file write and `unset`. Keep it out of terminal history and Git.

**Run smoke.** Record the ID printed before provisioning. In `.local/acceptance/RUN_ID/result.json`, look for `passed: true`, `completed: 1`, `charged: 1`, three profiles (desktop, tablet, mobile), a fresh snapshot ID and queue measurements. The tool verifies the PNG signature through the customer’s signed URL and stores evidence identifiers.

```bash
npm run acceptance:scheduled -- plan smoke &&
  npm run acceptance:scheduled -- run smoke
```

After checking the report, free the saved watcher slot.

```bash
read -rp 'Smoke run ID: ' ACCEPTANCE_RUN
npm run acceptance:scheduled -- cleanup "$ACCEPTANCE_RUN"
```

**Run Business.** After a passing smoke check and cleanup, refresh the token, then:

```bash
npm run acceptance:scheduled -- plan business &&
  npm run acceptance:scheduled -- run business
```

A pass requires 500 distinct successful scheduled captures and exactly 500 credits in the same usage window, a fresh customer-readable snapshot, p95 start lateness ≤120 seconds and observed oldest-message age ≤120 seconds on each shared check, capture and result queue. Lateness runs from the original due slot to durable admission by the coordinator. The report also records p95 time to completion, maximum start lateness and skipped jobs. Two cycles measure burst capacity. Use results across releases when tuning worker concurrency.

**Report and clean up, including after a failure.** The server caps each fixture’s starts and enforces an absolute expiry if the terminal disconnects. Let in-flight captures finish. If a token expires or CloudWatch samples are missing after an idle period, refresh the token and rerun `report` with the **same** ID. It reads the original window without generating new captures. Missing metrics give an inconclusive result. Keep `result.json` with your private release evidence. [SQS metrics](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html)

```bash
read -rp 'Business run ID: ' ACCEPTANCE_RUN
npm run acceptance:scheduled -- report "$ACCEPTANCE_RUN"
npm run acceptance:scheduled -- cleanup "$ACCEPTANCE_RUN"
rm -f .local/acceptance-owner-token
```

Run `cleanup` even after a failed provision or report. It verifies the tenant and run for each watcher. If a capture is still settling, retry when it finishes.

## Recovery and operator tasks

To pause future automatic releases, list recent runs and read the failed step:

```bash
gh variable set PRODUCTION_AUTO_DEPLOY --repo "$BUSINESS" --body false
gh run list --repo "$BUSINESS" --workflow ci.yml --branch main --limit 8
read -rp 'Failed run ID: ' FAILED_RUN
gh run view "$FAILED_RUN" --repo "$BUSINESS" --log-failed
```

Queued or active runs can still finish. Authorized manual dispatches remain available.

| Symptom | Action |
| --- | --- |
| GitHub 403/404 or rejected workflow files | Check `gh api user --jq .login` and admin access on the intended repo. For an OAuth login missing the workflow scope, run `gh auth refresh --hostname github.com --scopes workflow`, authorize the active account and retry. If the org uses SSO, authorize the GitHub CLI for that org. |
| AWS profile missing, expired or wrong account | Use the SSO instructions below. Confirm `aws sts get-caller-identity --profile saas-admin` returns `807434077491`. For an operator shell script, check its effective `.env` values below. |
| Primary or regional stack missing | CI updates an initialized installation. In the **configured operator checkout** at the deployed source revision, check the profile and worker digest, then follow `docs/upgrade-0.5.20.md` for the applicable installation steps. For a ready primary and validated worker, `AWS_PROFILE=saas-admin npm run aws:deploy-regional` creates or updates the configured regions. Once stable, repeat step 5 and `inspect-production`. |
| AWS OIDC provider lacks the STS audience | In account `807434077491`, choose **IAM → Identity providers → token.actions.githubusercontent.com → Audiences → Add audience**, add `sts.amazonaws.com`, then repeat the binding in step 5. |
| AWS denies the inspection login | Compare the GitHub repository and owner IDs with the AWS binding. Verify the `production` environment, `refs/heads/main`, `.github/workflows/production.yml` and the STS audience. If the org customized its OIDC subject, align the trust template with its actual value before retrying. |
| CI passed but production skipped | Check the event first. PRs and `verify` runs only verify. A `main` push needs `PRODUCTION_AUTO_DEPLOY=true` and can qualify for the documented skip. Manual `deploy-production` works with the variable set to `false`. |
| CloudFormation or site publishing failed | Identify the failed phase (primary, regional or site publish). Diagnose the affected stack below. An interrupted run can leave CloudFormation active. Wait for stability, fix via PR and deploy the current verified `main`. |
| Roll back code | Pause automatic releases. Open the merged PR, choose **Revert** and open the revert PR against business `main`. If necessary, branch from current `main` and run `git revert` on the bad squash-merge SHA. Resolve conflicts, review, pass CI, merge and deploy the new commit using step 6. Reconcile any payments, notifications or migrations separately. |

```bash
AWS_PROFILE=saas-admin node scripts/deployment-control.mjs diagnose webwatch-prod us-east-1
```

For a regional failure, use the region printed in the failed step.

```bash
read -rp 'Failing region (e.g. eu-west-1): ' FAILED_REGION
AWS_PROFILE=saas-admin node scripts/deployment-control.mjs diagnose \
  "webwatch-prod-regional-$FAILED_REGION" "$FAILED_REGION"
```

**Workstation-only changes.** Use the private operator checkout for Stripe sandbox/live changes, secret rotation, SES receiving activation, new required stack parameters and data migrations. For a Stripe cutover follow the configuration, drain, upload, redeploy and verification steps in `docs/stripe-production-test-0.5.20.md`. The 0.5.22 release includes the hotfix described there. Before a workstation infrastructure update, match the deployed revision and worker digest. After replacing resources or adding regions, refresh the AWS binding in step 5 and inspect again.

To check the private `.env` without displaying secrets, enter the path to your **existing configured release**. Operator shell scripts source `.env` after launch, so its `AWS_PROFILE` can override a shell assignment.

```bash
read -erp 'Configured operator checkout (absolute path): ' OPERATOR_DIR
(
  cd "$OPERATOR_DIR" && test -f .env || exit 1
  ROOT="$PWD"
  export AWS_PROFILE=saas-admin
  source infra/scripts/lib.sh
  load_webwatch_env
  printf 'profile=%s stage=%s primary=%s regions=%s\n' \
    "$AWS_PROFILE" "$STAGE" "$AWS_REGION" "${REGIONAL_CHECK_REGIONS:-unset}"
)
```

Expect `saas-admin`, `prod`, `us-east-1` and the intended regions. If needed, edit `"$OPERATOR_DIR/.env"`, save `AWS_PROFILE=saas-admin` and repeat the check.

**Optional staging.** If you retain staging, run its manual workflow on `main` after that commit is deployed there. Set `STAGING_HOSTED_RUNNER` to a GitHub-hosted runner with dedicated egress and allowlist its IP from your private `.local/staging-ip-allowlist.txt`. Its separate `staging-validation` environment holds staging test settings. Production setup works independently.

### Workstation setup

For missing openSUSE packages, use `sudo zypper refresh`, then `sudo zypper install git unzip coreutils python3 curl`. For Node/npm use `sudo zypper install nodejs22 npm22`, or `nvm install 22` and `nvm use 22` if you already use nvm. Check `zypper info aws-cli` and install `aws-cli` if the package is v2. Otherwise use the AWS installer. Try `sudo zypper install gh` first. If your repositories lack it, run the following and recheck `gh --version`. [AWS CLI installer](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) · [GitHub CLI on openSUSE](https://github.com/cli/cli/blob/trunk/docs/install_linux.md#opensusesuse-linux-zypper)

```bash
sudo zypper addrepo https://cli.github.com/packages/rpm/gh-cli.repo
sudo zypper refresh
sudo zypper install gh
```

Use `aws configure list-profiles` to check for `saas-admin`. If missing, run `aws configure sso --profile saas-admin`. Enter your existing Identity Center session name (or `cloversight-sso` for a new one), access portal start URL, Identity Center region and default registration scope `sso:account:access`. Existing session details are in `~/.aws/config`. Finish the browser login, select account `807434077491` and your deployment-admin permission set (previously `AdminFullAccess`). Use `us-east-1` as the default **deployment** region and `json` as output. Return to `aws sso login --profile saas-admin` in step 5. [AWS Identity Center CLI setup](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

### Upgrading an existing 0.5.20 or 0.5.21 business fork

Skip this for the two new repos. For an existing business fork, keep its production role and environment. Use step 1 to set `ZIP` and verify the archive. From the business clone, create a clean release worktree:

```bash
git fetch origin main
RELEASE_TEMP="$(mktemp -d)"
BRANCH=release/0.5.22
git worktree add -b "$BRANCH" "$RELEASE_TEMP/work" origin/main &&
  mkdir "$RELEASE_TEMP/source" &&
  unzip -q "$ZIP" -d "$RELEASE_TEMP/source" &&
  cd "$RELEASE_TEMP/work" &&
  git rm -r --ignore-unmatch -- apps/public &&
  cp -a "$RELEASE_TEMP/source/." . &&
  git add -A
git diff --cached --stat
git diff --cached --check
```

Review the staged changes, preserve business-specific edits and confirm the obsolete public HTML is removed. Starting at **Edit and test** in Everyday releases, test and open the PR. Add `worker-image` to the ruleset after its first green run. Once merged, inspect production and deploy manually. The first 0.5.22 deploy rebuilds the worker, reuses existing stacks and Stripe configuration, and records the release baseline in the artifact bucket.
