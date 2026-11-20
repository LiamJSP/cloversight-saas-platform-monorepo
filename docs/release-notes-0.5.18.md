# CLOVERSIGHT 0.5.18 — Public copy and subscription alignment

The public site now describes the enforced plan catalog and platform behavior consistently. All six prices and numeric entitlements were already correct and remain unchanged.

Corrected Free trial/detector details, regional and credit accounting, scheduling limits, report windows, user/watcher/recipient counting, invitation and SMS budgets, bounded escalation, Scale availability, retention, cancellation/closure, and public health-check scope. Support no longer asks customers to share actionable response codes. SEO descriptions were updated with the visible copy.

**Material operating finding:** account closure does not cancel the Stripe subscription. Public pages now direct customers to support for cancellation and confirmation of its effective date. Reliable self-service cancellation remains a separate implementation task. Scale remains gated from self-service while storage metering is incomplete.

The [source-linked review](public-copy-review-0.5.18.md) records the evidence and remaining operational checks. The [update guide](upgrade-0.5.18.md) uses the existing `saas-admin` profile and supports a static-only update for deployments already running 0.5.17. Older deployments must complete the prior runtime upgrade first.

Validation: all 84 catalog-derived pricing-table cells and six support-policy labels agree; all six plan cards match prices and credits. The existing release gate passed 211 service tests, parsed 174 JavaScript files, validated 178 primary and 17 regional infrastructure resources, built static/deployment assets, and packaged the extension. Public HTML structure and internal links were checked. No dependency or infrastructure resource changes were introduced.

No live deployment, live provider configuration inspection, or rendered browser acceptance was performed. A compatible local Playwright browser is not installed. Earlier production acceptance and scaling gates remain in effect.
