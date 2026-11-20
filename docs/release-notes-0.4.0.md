# CLOVERSIGHT 0.4.0 release notes

Release 0.4.0 adds regional monitoring, secure team collaboration, a reversible watcher action log, and asynchronous PDF reports.

## Regional monitoring

- Priority supports up to two selected AWS regions on ten watchers; Rapid supports up to three regions on five watchers.
- Regional browser probes are stateless. Tenant state, snapshots, alerts, profiles, and reports remain in the primary `us-east-1` stack.
- Any selected region can open or refresh an alert. For a regional watcher, a recipient must be an active team user and must select at least one affected region in **My profile** before CLOVERSIGHT will send that alert to them.
- Every selected region runs the full outage, banned-phrase, text, and responsive visual checks. Secondary screenshot sources are retained for rolling visual comparison, while redundant regional previews and diff overlays are omitted to control storage growth. If one region's capture runtime fails internally, another successful regional result can become the primary evidence without repeating that capture.

## Teams and tenant isolation

- Every customer identity resolves to one explicit owner/member record before a customer API route runs.
- Owners can invite or remove members. Members inherit the owner account plan, can create/edit/pause/run watchers, and cannot delete watchers.
- Members cannot access billing, owner profile fields, team administration, or the action log.
- Recipient autocomplete searches only active members of the current team. Search and lookup are bounded, rate limited, and independently account-scoped.

## Recovery and reporting

- Watcher create, edit, status, delete, and revert events retain the complete prior watcher state needed for recovery plus a bounded post-change summary in the owner-only action log.
- Deletion is a recoverable soft delete; a recorded owner revert can restore it.
- Day, week, month, and year PDF reports can cover one monitored domain or the whole account. Generation runs through a dedicated least-privilege SQS/Lambda worker, caps analysis at 5,000 retained results, caps PDF pages, permits at most three active and 25 rolling-daily jobs per account, reports progress, expires generated files after seven days, and has dedicated Lambda-error and report-DLQ alarms.

## Commercial changes

- Priority is CAD $199/month: 25 watchers, 15-minute cadence, two regions on ten watchers.
- Rapid is CAD $799/month: 10 watchers, two-minute cadence, three regions on five watchers.
- Free, Essentials, Daily, and Hourly pricing remains unchanged.
- New Stripe recurring Prices must be created for Priority and Rapid; update `STRIPE_PRICE_PRIORITY` and `STRIPE_PRICE_RAPID` before pushing staging secrets.

## Deployment

This release requires a new browser-worker image and both the primary and regional CloudFormation deployments. Set `REGIONAL_CHECK_REGIONS=us-east-1,us-east-2,us-west-2,ca-central-1,eu-west-1`, deploy the primary stack, then run `npm run aws:deploy-regional` before deploying the static applications.
