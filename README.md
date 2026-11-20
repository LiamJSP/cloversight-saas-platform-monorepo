# Cloversight

Cloversight is a website monitoring platform. A *watcher* opens a page in Chromium on a schedule, checks it for outages or changes, and alerts the people responsible. If a page still loads but an important message disappears, the team can see what changed on desktop, tablet and mobile.

## How the platform fits together

1. **Set up a workspace.** Customers sign in, choose a plan and invite teammates. The pricing page, customer portal and billing service share one catalog for credits, check frequency, regions and allowances.
2. **Watch a page.** Check for outages, banned phrases and text changes. The introductory trial and paid plans also include visual checks. The Chrome extension helps select page elements. The scheduler spreads checks across time and dispatches them to the selected regions. One credit covers all three screen sizes in one region.
3. **Investigate and respond.** The portal shows regional results and screenshots alongside the previous comparable capture. Teams can approve a trusted baseline, escalate alerts by email or optional SMS, and record an acknowledgment or all-clear. Customers can revisit their history and, on paid plans, download private PDF and HTML reports.
4. **Operate the service.** Stripe handles hosted checkout and subscription events. Cloversight enforces plan limits and handles cancellation and account closure. Staff use a separate **steward** portal for support, refunds and audit history.

## Run it locally

Use Bash, Git, Node **22.23.4+ in 22.x or Node 24.x**, npm **10+** and Chromium. On openSUSE Tumbleweed, install the tools with `sudo zypper install git nodejs22 npm22 chromium`. From an extracted release, run `npm run dev`. For a Git checkout, use the repository’s HTTPS URL.

```bash
read -rp 'Repository HTTPS URL (GitHub → Code): ' REPO_URL
git clone "$REPO_URL" cloversight && cd cloversight && npm run dev
```

Explore the seeded demo in the **customer portal**. Startup installs dependencies, builds the Astro site and creates a private `.env` if needed. Local billing and email are simulated, SMS is disabled, and watchers can reach the URLs you configure. Stop with **Ctrl+C**.

[Customer portal](http://127.0.0.1:4010/app/) · [Public site](http://127.0.0.1:4010/) · [Steward console](http://127.0.0.1:4010/stewards/) · [Workstation setup and tests](docs/testing.md)

## Deploy to AWS

CloudFormation provisions a primary stack in `us-east-1` and regional Lambda workers that run Chromium. SQS carries jobs and results, DynamoDB holds account state, and private S3 buckets store evidence. CloudFront serves the sites. AWS resource names retain the project’s original `webwatch` prefix for upgrade compatibility.

| | Staging | Production |
| --- | --- | --- |
| Stack and public URL | `webwatch-staging` · `staging.<base-domain>` | `webwatch-prod` · `<base-domain>` |
| Access | WAF on the sites and Cognito. Set your private IP allowlist and choose whether to enable the optional browser exception. | Public site and customer signup. Separate steward login with mandatory MFA. |
| Billing and alerts | Stripe sandbox. AWS captures, SES and any configured SMS use real services. | Live Stripe by default. Set the application, operations and budget email destinations and confirm alarm subscriptions in every region. |

**New AWS account.** Set up the `saas-admin` profile on your workstation, delegate the domain to Route 53 and request an ACM certificate. Give each stage a private `.env`. Bootstrap access, build the worker and deploy the primary stack. It supplies the Stripe webhook URL and steward pool. Configure both, finish the rollout and verify a scheduled capture in staging before repeating for production. [First AWS installation](docs/aws-account-bootstrap.md)

**Existing production stack.** The business fork can take over releases using short-lived AWS credentials. The runner reads installed settings from CloudFormation. Provider secrets stay in Secrets Manager and the operator `.env` stays on your workstation. [Business-fork CI/CD walkthrough](docs/github-production.md)

## Find your way around

| Directory | What you’ll find |
| --- | --- |
| [apps/](apps/) | Astro public site (Markdown copy, JSON labels, SCSS Modules), customer and steward portals, shared authentication and styling |
| [extensions/chrome-target-picker/](extensions/chrome-target-picker/) | The Chrome extension for selecting elements on a monitored page |
| [src/](src/) | API and tenant access, monitoring, billing, notifications, reports, local and AWS storage, and the [plan catalog](src/domain/plans.mjs) |
| [infra/](infra/) | Bootstrap and application CloudFormation templates, Lambda dependencies, browser worker image and deployment scripts |
| [scripts/](scripts/) and [GitHub workflows](.github/workflows/) | Local startup, builds, validation, release packaging and GitHub Actions |
| [tests/](tests/) and [docs/](docs/) | Service and browser tests, staging checks, operator guides and generated reference |

The [engineering guide](docs/index.md) is the docs index. Follow a check through the [architecture](docs/architecture.md), find an interface in the [surface guide](docs/surfaces.md), or troubleshoot a running service with the [operations runbook](docs/operations.md) and [known limitations](docs/known-limitations.md).

[Release notes](RELEASE_NOTES.md) · [License](LICENSE)
