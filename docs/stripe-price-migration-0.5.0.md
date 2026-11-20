# Stripe price migration for CLOVERSIGHT 0.5.0

The application price book is monthly USD and uses six server-owned Price IDs.

| Plan | Monthly USD | Environment variable | Self-serve |
|---|---:|---|---|
| Free | $0 | `STRIPE_PRICE_FREE` | account default; no paid checkout needed |
| Essentials | $19 | `STRIPE_PRICE_ESSENTIALS` | yes |
| Professional | $49 | `STRIPE_PRICE_PROFESSIONAL` | yes |
| Team | $149 | `STRIPE_PRICE_TEAM` | yes |
| Business | $399 | `STRIPE_PRICE_BUSINESS` | yes |
| Scale | $899 | `STRIPE_PRICE_SCALE` | no; sales-assisted |

## Stripe Dashboard steps

Perform the complete sequence in **test mode first**, then repeat in live mode only after staging certification.

1. Open Product catalog and use one CLOVERSIGHT subscription Product (or the existing CLOVERSIGHT Product).
2. Add six new recurring Prices: USD, monthly, flat-rate, tax behavior matching your reviewed Stripe Tax setup. Prices are immutable; do not edit/reuse the former CAD Prices.
3. Give the Prices unambiguous nicknames such as `CLOVERSIGHT Essentials USD monthly 2026-09` and optional lookup keys such as `webwatch_essentials_usd_monthly_2026_09`.
4. Copy each `price_...` ID into the matching `.env` variable. The Scale ID is still required for provider reconciliation even though checkout is blocked.
5. Confirm the webhook endpoint from the stack output receives at least `checkout.session.completed`, `invoice.*`, and `customer.subscription.*` events.
6. If there are no active legacy subscriptions, push the new IDs and leave old Prices archived for audit history.
7. If active legacy subscriptions exist, export their customer/subscription/Price IDs first. Release 0.5.0 keeps the exact retired CAD entitlement and renewal validation active as a temporary bridge—including the old and new Essentials plans that share a display/internal ID, which the app disambiguates with its catalog marker—but blocks self-serve plan changes for those accounts. Schedule a maintenance window, update each subscription to the intended new Price with an explicitly reviewed proration choice, and confirm the CLOVERSIGHT account's plan changes from the resulting webhook before continuing. Do not silently map plans whose watcher/cadence usage exceeds the new tier.
8. After every subscription is migrated or cancelled and at least one renewal/webhook cycle is reconciled, archive the old Prices. Archiving prevents new use but does not alter subscriptions that still reference them.
9. Keep Stripe Smart Retries aligned with CLOVERSIGHT's application retry policy so the two systems do not create unintended extra collection attempts.

Suggested legacy placement must be reviewed account-by-account:

- former Daily usually fits Essentials;
- former Hourly may require Professional if it has more than 10 watchers;
- former Priority usually fits Professional on cadence/regions but must be checked against credits;
- former Rapid requires Business to preserve two-minute cadence;
- former Essentials must be checked against the new one-hour cadence and 10-watcher limit.

There is no automatic bulk migration because currency, proration, customer notice, current usage, tax, and entitlement reductions require an explicit business decision.
