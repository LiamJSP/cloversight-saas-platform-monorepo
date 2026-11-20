# Test Stripe on the production AWS deployment — 0.5.20 hotfix

This deployment-tools hotfix separates Stripe mode from AWS stage. Keep `STAGE=prod` and all production domains, MFA, encryption, resource protection and other settings. Set `STRIPE_MODE=test` explicitly for the requested sandbox trial. Blank/unset mode continues to mean live for production and test for staging/beta; staging/beta cannot select live mode.

The existing runtime already uses the supplied Stripe key and Stripe-hosted Checkout. There is no separate browser publishable key to switch. The patch changes only deployment tooling, tests and documentation. It preserves release 0.5.20 and worker source hash `a471fafe40450f3d6dffd01849859b6ed32ebe407912c01c846e590a67996a01`; no worker rebuild, regional redeploy or bootstrap update is required for this patch. Do not apply it to a different release.

## 1. Apply in the current 0.5.20 directory

From your existing extracted release folder, including if its name contains spaces:

```bash
unzip -o "$HOME/Downloads/cloversight-stripe-test-mode-hotfix-0.5.20.zip"
node --test tests/stripe-secret-script.test.mjs
```

This overlay contains no private `.env`, generated worker evidence or customer data. It updates both secret-push commands and the consolidated deployment preflight, so they enforce the same mode. The updated complete 0.5.20 ZIP also includes this patch.

## 2. Configure the sandbox trial

Edit the existing `.env`; add `STRIPE_MODE=test` and keep `STAGE=prod`. Use actual values from one Stripe sandbox/test environment for:

```dotenv
STAGE=prod
STRIPE_MODE=test
STRIPE_SECRET_KEY=sk_test_REPLACE_FROM_SELECTED_SANDBOX
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_FROM_SANDBOX_ENDPOINT
STRIPE_PRICE_FREE=price_REPLACE_FROM_SELECTED_SANDBOX
STRIPE_PRICE_ESSENTIALS=price_REPLACE_FROM_SELECTED_SANDBOX
STRIPE_PRICE_PROFESSIONAL=price_REPLACE_FROM_SELECTED_SANDBOX
STRIPE_PRICE_TEAM=price_REPLACE_FROM_SELECTED_SANDBOX
STRIPE_PRICE_BUSINESS=price_REPLACE_FROM_SELECTED_SANDBOX
STRIPE_PRICE_SCALE=price_REPLACE_FROM_SELECTED_SANDBOX
```

Replace these placeholders; do not replace the rest of your environment. Keep the existing pinned `STRIPE_API_VERSION=2025-06-30.basil` unless deliberately updating the integration.

Find this production stack's webhook URL:

```bash
aws cloudformation describe-stacks \
  --profile saas-admin --region us-east-1 --stack-name webwatch-prod \
  --query "Stacks[0].Outputs[?OutputKey=='StripeWebhookUrl'].OutputValue | [0]" \
  --output text --no-cli-pager
```

In the selected Stripe sandbox, register that URL as a snapshot-event webhook endpoint with API version `2025-06-30.basil`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed`. Use that endpoint's signing secret, not a Stripe CLI listener secret or an endpoint pointing at staging. Webhook secrets have no test/live prefix, so the script cannot establish their environment from their text.

All six Prices must exist in that sandbox and match the plan catalogue: $0/$19/$49/$149/$399/$899 USD monthly, active, fixed per-unit billing, interval count 1 and licensed usage. The push command checks these through read-only Stripe API requests before changing the AWS secret. A wrong account/mode, wrong amount, archived Price, annual cadence, insufficient key permissions or network failure stops the upload. It never creates Stripe objects, charges a card or prints credentials.

Then run:

```bash
AWS_PROFILE=saas-admin npm run aws:push-secrets &&
AWS_PROFILE=saas-admin npm run aws:deploy &&
AWS_PROFILE=saas-admin npm run aws:deploy-web
```

The primary redeploy reuses your verified worker image and republishes Lambda code so new executions start with the uploaded credentials. It does not recreate the stack. Continue SES activation/audit/owner-enrollment steps that remain unfinished. No additional deployment is needed merely because the one-hour trial starts.

Confirm the command reports `Stripe TEST mode selected for AWS stage prod`, that Checkout displays test mode, that objects appear in the selected Stripe sandbox, and that webhook deliveries succeed and Cloversight reconciles the paid plan/cancellation. Use Stripe test payment methods and dedicated Cloversight test accounts. AWS captures and SES/Twilio activity still use real infrastructure and configured destinations; Stripe mode does not sandbox those services or isolate Cloversight's database.

## 3. Switch to live after the trial

1. While sandbox credentials are still installed, stop test monitoring and close the dedicated Cloversight test accounts. Wait for provider-confirmed immediate cancellation, resolved pending Checkout/payment work, and drained in-flight billing/check work. Resolve any outstanding test reconciliation in the sandbox before removing its key. Retain test audit records; do not bulk-delete production tables or Cognito pools.
2. Disable this production URL's sandbox webhook endpoint once test events have settled. Create its live counterpart with the same supported event set/version in the live Stripe account.
3. Change `.env` to `STRIPE_MODE=live`, its `sk_live_` secret key, the live endpoint's `whsec_` secret, and all six live Price IDs together. Setting the mode alone does not replace any deployed credentials. Existing test customers, subscriptions, transactions and local entitlements are not promoted or migrated into live mode; use a fresh Cloversight customer account for live onboarding.
4. Upload the live Stripe configuration, then redeploy the primary stack:

```bash
AWS_PROFILE=saas-admin npm run aws:push-stripe-secret &&
AWS_PROFILE=saas-admin npm run aws:deploy
```

5. Confirm `Stripe LIVE mode selected for AWS stage prod`, successful deployment, live Stripe request logs and live webhook delivery before admitting customers. The same hosted frontend supports both modes; another web build is unnecessary solely for the Stripe switch.

The existing runtime and secret caches refresh at five-minute intervals. A secret upload alone is therefore not an instantaneous cutover, and already-running invocations can retain their old configuration. Stopping/draining test work and redeploying after upload prevents treating a mixed transition as completed. Do not resume old test billing under live credentials.

The test setting remains active until you change it; it does not expire automatically after an hour. No AWS or Stripe account changes were made during preparation of this patch.

## References and verification

- [Stripe API keys and mode separation](https://docs.stripe.com/keys)
- [Stripe sandbox testing](https://docs.stripe.com/testing-use-cases)
- [Webhook endpoints and signing secrets](https://docs.stripe.com/webhooks)
- [Price fields and recurring billing configuration](https://docs.stripe.com/api/prices/object)

Regression tests cover default-live and explicit-test production, non-production live rejection, all six Price checks, mode/amount/cadence mismatches, redacted failures, and both shell entry points with mocked Stripe/AWS calls. The full local release gate also runs; live sandbox/browser acceptance is performed on your deployment.
