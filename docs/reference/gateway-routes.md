# AWS HTTP API gateway routes

Generated from `infra/cloudformation/webwatch.yaml` by `scripts/generate-doc-reference.py`.
An `ANY .../{proxy+}` gateway mapping accepts multiple verbs and paths; the actual allowed operations and account/owner checks live in `src/api/routes.mjs`. JWT authorizers protect gateway routes; signed responses and provider webhooks perform their own checks in application code.

| Logical ID | Gateway route key | Gateway authorization | Condition |
| --- | --- | --- | --- |
| `HealthRoute` | `GET /api/health` | `NONE` | `always` |
| `AssetRoute` | `GET /api/assets` | `NONE` | `always` |
| `StripeWebhookRoute` | `POST /api/webhooks/stripe` | `NONE` | `always` |
| `TwilioInboundRoute` | `POST /api/webhooks/twilio/inbound` | `NONE` | `EnableTwilio` |
| `TwilioStatusRoute` | `POST /api/webhooks/twilio/status` | `NONE` | `EnableTwilio` |
| `ResponsePageRoute` | `ANY /respond/{proxy+}` | `NONE` | `always` |
| `UnsubscribePageRoute` | `ANY /unsubscribe/{proxy+}` | `NONE` | `always` |
| `AlertResponseRoute` | `POST /api/alerts/respond` | `NONE` | `always` |
| `AlertCodeResponseRoute` | `POST /api/alerts/respond-code` | `NONE` | `always` |
| `CustomerBootstrapRoute` | `GET /api/customer/bootstrap` | `JWT` | `always` |
| `CustomerSnapshotAssetsRoute` | `GET /api/customer/snapshots/{snapshotId}/assets` | `JWT` | `always` |
| `WatcherCreateRoute` | `POST /api/watchers` | `JWT` | `always` |
| `WatcherProxyRoute` | `ANY /api/watchers/{proxy+}` | `JWT` | `always` |
| `CheckStatusRoute` | `GET /api/checks/{jobId}` | `JWT` | `always` |
| `BannedPhraseRoute` | `POST /api/banned-phrases/parse` | `JWT` | `always` |
| `BillingProxyRoute` | `ANY /api/billing/{proxy+}` | `JWT` | `always` |
| `TransactionProxyRoute` | `ANY /api/transactions/{proxy+}` | `JWT` | `always` |
| `AccountProxyRoute` | `ANY /api/account/{proxy+}` | `JWT` | `always` |
| `UserProxyRoute` | `ANY /api/user/{proxy+}` | `JWT` | `always` |
| `TeamRoute` | `GET /api/team` | `JWT` | `always` |
| `TeamProxyRoute` | `ANY /api/team/{proxy+}` | `JWT` | `always` |
| `ActionLogRoute` | `GET /api/action-log` | `JWT` | `always` |
| `ActionLogProxyRoute` | `ANY /api/action-log/{proxy+}` | `JWT` | `always` |
| `ReportsRoute` | `ANY /api/reports` | `JWT` | `always` |
| `ReportsProxyRoute` | `ANY /api/reports/{proxy+}` | `JWT` | `always` |
| `StewardProxyRoute` | `ANY /api/steward/{proxy+}` | `JWT` | `always` |

## Runtime boundaries

- `src/aws/handler.mjs` checks the injected CloudFront origin secret on private routes, including direct API Gateway requests.
- `src/api/routes.mjs` applies customer membership, owner-only mutations, tenant scope, webhook signatures, and rate limits.
- `src/server.mjs` serves the same router locally with file-backed state and local authorization.
- `POST /api/webhooks/twilio/*` is present only when `TwilioEnabled` is true in the template and `smsEnabled` is true at runtime.
