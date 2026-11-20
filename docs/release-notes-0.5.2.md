# CLOVERSIGHT 0.5.2 release notes

Release 0.5.2 corrects the final two validation fixtures exposed after the 0.5.1 runtime fixes.

- The DynamoDB staged-GSI regression now derives its expected deployment phase label from `package.json`, preventing patch-version changes from invalidating an otherwise correct deployment script.
- The active-incident notification-policy regression now uses Essentials because the scenario deliberately adds a second escalation tier. Free correctly remains limited to one tier.

There are no CloudFormation resource, Stripe catalogue, or application-runtime behavior changes relative to 0.5.1.
