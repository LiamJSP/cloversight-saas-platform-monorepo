# Update an existing deployment to 0.5.18

This release changes public copy and status labels. It preserves prices, entitlements, runtime behavior, dependency versions, and CloudFormation resources. Package versions advance to identify the source archive; existing 0.5.17 worker images remain valid.

## Already running 0.5.17

Use the existing checkout/configuration for the correct AWS account and stage. Preserve your real `.env` and deployed parameters; do not replace them with `.env.example`. Confirm the 0.5.17 runtime upgrade and acceptance checks are complete before publishing claims about those controls.

On your openSUSE workstation, with the supported Node/npm versions and existing deployment configuration:

```bash
npm ci
npm run deploy:validate
AWS_PROFILE=saas-admin npm run aws:deploy-web
```

The existing web deployment command uploads all three static applications and shared assets, then invalidates their CloudFront distributions and waits for completion. Customer/steward application source is unchanged in this release. It does not rebuild worker images, update the CloudFormation stacks, migrate account data, reset usage, or change Stripe prices. No backend deployment is required when production already runs 0.5.17.

Verify the target account/stage through your existing deployment settings before running it. The script uses your configured deployment role. This review did not run these commands against AWS.

## Running an older version

Do not publish the new statements about quotas, billing windows, invitations, or scheduling while the older implementation is still active. Complete the [0.5.17 existing-stack upgrade](upgrade-0.5.17.md), including any prerequisite 0.5.16 steps, using this archive's source. That process changes runtime behavior and requires its controlled migration/acceptance steps. Deploy the updated web assets after the runtime upgrade succeeds.

## Verify the published pages

- Pricing shows all six USD catalog prices and unchanged limits, 31 trial credits, Free visual detection limited to the trial, rolling report windows, and Scale's assisted-availability qualification.
- The home page and search description no longer promise escalation until someone responds.
- Pricing, support, and terms distinguish account closure from Stripe cancellation. Confirm that support can fulfill cancellation requests before opening paid signups.
- Status reports only public health-endpoint reachability. Check both a successful request and a blocked/network-failed request in the browser.
- Pricing comparison scrolls on phones; navigation, signup/login links, and links to terms/support work at phone and desktop widths.
- Check actual enabled regions/SMS settings and the Stripe Price configuration against the copy. These deployed settings were not available to this review.

For a presentation regression, redeploy the previous static source using the same configuration. That also restores the old inaccurate statements, so prefer correcting the specific page. A static rollback does not roll back the runtime or account data.
