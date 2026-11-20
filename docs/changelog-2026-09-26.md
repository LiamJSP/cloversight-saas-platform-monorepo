# 2026-09-26: CLOVERSIGHT 0.5.9

- Added the combined Watchers Check Status dialog with per-region check progress above notification escalation, periodic refresh, and customer-safe error categories.
- Reused the regional globe renderer on the public hero with larger layered placement, illustrative AWS region markers, slow motion, keyboard/pointer support, reduced-motion handling, and fallback text.
- Reduced sensitive fields in customer API responses, validated signed evidence scope, hardened account reads/writes and duplicate-membership handling, bounded response-code rate claims and capture resources, and removed a spoofable staging WAF bypass.
- Bound paid activation to reconciled paid Stripe Checkout, prevented subscription/webhook shortcuts, restricted expired or inactive entitlements, and added daily outbound notification attempt budgets by plan.
- Updated the pricing page, operational, security, billing, notification, limitations, and deployment documentation. Version 0.5.9 requires a new worker image, a primary deployment, regional deployment, and static web deployment.
- No tests, builds, deployment, or live provider/browser checks were run by the author, per the owner's instruction. Required staging checks are in `release-notes-0.5.9.md`.
