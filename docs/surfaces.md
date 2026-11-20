# Public, customer, steward and extension surfaces

The application uses static HTML/CSS and browser JavaScript. There is no React or server rendered frontend. `scripts/build.mjs` copies the source into `dist/`, while `infra/scripts/deploy-web.sh` publishes the public, customer and steward surfaces to their respective S3/CloudFront origins. `src/server.mjs` serves all three locally on port 4010.

| Surface | Main files | Behavior and entry |
| --- | --- | --- |
| Public site | `apps/public/*.html`, `public.css`, `hero-globe.js` | SEO pages, illustrative interactive globe, pricing, support, security and status; `/` |
| Customer portal | `apps/customer/index.html`, `app.js`, `components.css`, `locations.js` | Watcher editor, Check Status, regional evidence, alert controls, reports, billing, team and action log; `/app/` |
| Regional globe | `apps/customer/regional-globe/source/*.ts`, `index.js`, `globe.css` | Source TypeScript is bundled to `vendor/` through `scripts/build-regional-globe.mjs`; public hero and customer results consume it. See its own README and third-party notices. |
| Steward console | `apps/steward/index.html`, `app.js`, `components.css` | Separate staff login, account lookup, masked support views, refunds, suppression manager and audits; `/stewards/` locally |
| Shared browser layer | `apps/shared/auth.js`, `site.js`, `theme.js`, CSS, SVG | Cognito PKCE/session handling, shared behavior and brand tokens |
| Chrome picker | `extensions/chrome-target-picker/` | Manifest V3 active tab DOM picker; separately packaged by `scripts/package-extension.mjs` |

Customer and steward users have separate Cognito user pools. The local service uses local auth fixtures. Production browser access to private APIs is routed through CloudFront and independently checked by the API gateway authorizer, `src/aws/handler.mjs`, and the service router. See [security](security.md) and the [gateway route inventory](reference/gateway-routes.md).

The public globe is illustrative and does not report live regional health. For actual per-region check state, use the customer Check Status and archived results. The styling layers and accessibility checklist are in [portal design system](customer-portal-design-system.md) and [accessibility](accessibility.md).


0.5.14 uses supplied theme-aware full/compact CLOVERSIGHT logos and light/dark small favicons, including Cognito/extension/runtime notice/report surfaces. The static publisher uploads the same shared asset paths as the local server. See [branding](branding.md) for exact deployed-name compatibility exceptions and [the release guide](release-notes-0.5.14.md) for the phone menu and single-command workflows.
