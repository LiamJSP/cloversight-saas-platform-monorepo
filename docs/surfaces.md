# Public site, portals and browser extension

Cloversight publishes three static web surfaces. The public site uses Astro at build time. The customer and steward portals use plain browser JavaScript. The development server serves all three on port 4010. In AWS, CloudFront fronts their private S3 origins.

| Surface | Entry point | Where to edit |
| --- | --- | --- |
| Public site | `/` | `apps/public/src/content/` for page copy, `src/data/labels.json` within that app for navigation and control labels, `src/styles/` for SCSS Modules, `src/pages/` and `src/components/` for layouts and rendering |
| Customer portal | `/app/` | `apps/customer/` for watcher setup, regional evidence, alert controls, reports, team, billing and action history |
| Steward console | `/stewards/` locally, `stewards.<stage-domain>` on AWS | `apps/steward/` for account lookup, masked support views, refunds, notification suppressions and audit history |
| Shared browser code | Used by the sites and portals | `apps/shared/` for theme, logos, browser authentication and shared behavior |
| Chrome target picker | Browser extension | `extensions/chrome-target-picker/` for the Manifest V3 extension. Build its installable ZIP with `npm run package:extension`. |

## Edit and preview a public page

1. Edit its Markdown file. Home, support and status use named frontmatter fields for cards. Legal and pricing content also use Markdown paragraphs and headings. Keep legal `{#section-id}` markers so existing links continue to work.
2. For plan prices, limits or checkout eligibility, change the shared catalog in `src/domain/plans.mjs`. The public pricing page reads it during the build.
3. Run `npm run dev` for the integrated preview. To rebuild public HTML and hashed CSS while the server is running, run `npm run build:public` in a second terminal, then refresh the browser. Output is in `dist/public/`.

The globe on the public homepage is an illustration. The customer results globe shows retained evidence from actual regional checks. Its TypeScript source lives in `apps/customer/regional-globe/`.

Customer and steward users sign in through separate Cognito pools. Private API requests pass through CloudFront to API Gateway, then the application verifies the origin, actor and tenant permissions. The local server uses demo identities. For implementation details, see [architecture](architecture.md), [security](security.md), the [gateway route inventory](reference/gateway-routes.md) and [branding compatibility](branding.md).
