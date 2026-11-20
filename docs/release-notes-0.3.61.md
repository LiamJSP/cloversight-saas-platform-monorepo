# CLOVERSIGHT 0.3.61 release notes

## Steward entry reliability

- Authentication is no longer awaited at module scope, so a transient runtime-config or token bootstrap failure cannot leave the static **Enter steward console** button without a handler.
- Authentication and console entry are single-flight and retryable. The read-only dashboard bootstrap uses a bounded retry for network, authorization-refresh, throttling, and server-startup failures; permission failures are not retried.
- The requested steward route is retained through Cognito PKCE authentication and restored after the callback.

## Steward design and navigation

- The console now uses the customer portal's responsive icon rail, animated orbit signature, ambient stage, glass top bar, responsive drawer, and reduced-motion handling.
- The steward theme toggle is removed.
- Metric grids, record summaries, lookup forms, table actions, and account/transaction controls have balanced widths and content-sized actions.
- Stable routes are available for `/`, `/accounts/`, `/transactions/`, `/scheduled-closures/`, `/refunds/`, and `/email-block-list/`.
- Account and transaction selections are URL-addressable. The privacy-preserving watcher support editor uses `?account=<id>&modal=watcher-edit&watcher=<id>` and participates in Back/Forward navigation.
- A CloudFront viewer-request function serves the SPA shell for direct steward deep links. The local server mirrors the same `/stewards/*` fallback.

## Deployment identity

- Runtime diagnostics and static asset keys advance to `0.3.61`.
- The complete-source worker image label advances to `lambda-chromium149-playwright-1.61.0-node22-r33-*`.
- Deploy infrastructure and static assets together; a web-only deployment cannot install the steward SPA rewrite.
