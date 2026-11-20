# Recover the failed 0.5.19 production creation — hotfix revision 3

**Historical incident guide. For the current release and stack, use [0.5.20 recovery](upgrade-0.5.20.md); do not apply this old overlay or reuse its historical ARN.**

The latest failure is the primary SQS QueueTransportPolicy: Amazon SQS rejects
statements with multiple resources. Revision 3 changes the primary and regional
shared transport denials to the single scalar `Resource: '*'`. The explicit queue
attachment lists, logical IDs, Deny effect, HTTPS condition and AWS service
exemption remain unchanged. This grants no access and avoids replacing queues or
moving policy ownership during existing-stack updates. AWS documents the
[shared queue-policy pattern](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-iam.html#scenario-sqs-policy).

This cumulative patch also includes both prior Cognito fixes: removing unsupported
SVG attributes and adding transparent padding to meet the logo aspect-ratio limit.
The current rollback is blocked by two protected Cognito pools and a nonempty
InboundMailBucket. The bucket contents must be inspected; the error does not tell
us whether they are setup artifacts or mail that should be saved.

This procedure deletes the remaining resources of the failed initial
`webwatch-prod` creation. Do not use it for a working stack or pools containing
users. Keep staging and the shared deployment bootstrap stack intact.

## 1. Apply the overlay patch

Download the updated `cloversight-cognito-hotfix-0.5.19.zip` again, replacing the
earlier ZIP in Downloads. It includes the SQS fix and both Cognito fixes. Run from the existing
release directory (where your configured `.env` and `.local` already exist):

```bash
cd ~/Downloads/cloversight-saas-release-0.5.19
unzip -o ../cloversight-cognito-hotfix-0.5.19.zip
npm run iac:validate &&
node --test tests/cognito-branding.test.mjs tests/sqs-transport-policy.test.mjs
```

The patch contains the corrected primary and regional templates, IaC validator,
regression tests and these guides. If either test file is missing after extraction,
the ZIP is an old revision.
It contains no environment files. It preserves release 0.5.19 and the worker source
hash, so the verified image can be reused. Do not rebuild the image for this fix.

## 2. Identify the failed stack's remaining resources

```bash
aws cloudformation describe-stacks \
  --profile saas-admin --region us-east-1 --stack-name webwatch-prod \
  --query 'Stacks[0].{Id:StackId,Status:StackStatus,TerminationProtection:EnableTerminationProtection}' \
  --output json --no-cli-pager

aws cloudformation list-stack-resources \
  --profile saas-admin --region us-east-1 --stack-name webwatch-prod \
  --query "StackResourceSummaries[?ResourceStatus!='DELETE_COMPLETE'].[LogicalResourceId,ResourceType,PhysicalResourceId,ResourceStatus]" \
  --output table --no-cli-pager
```

The incident's failed stack ARN is:
`arn:aws:cloudformation:us-east-1:807434077491:stack/webwatch-prod/7d7df840-e273-11f1-9069-12ffca6719b9`.
Check that the ID matches, status is still `ROLLBACK_FAILED`, termination protection
is off, and the remaining resources are the two `DELETE_FAILED` pools
`CustomerUserPool` and `StewardUserPool` plus `InboundMailBucket`. Stop if the
inventory differs; inspect any additional resources before deletion.

## 3. Deactivate deletion protection on those two empty pools

In the [Cognito console in us-east-1](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1),
open each exact pool ID from step 2. Confirm its Users list is empty. In Settings,
open the User pool security tab and deactivate Deletion protection. Do not delete
the pools directly; let CloudFormation clean up its own resources.

Use the console for this change. A minimal `update-user-pool --deletion-protection
INACTIVE` API request can reset other omitted settings to defaults. AWS documents
both the [protection control](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-deletion-protection.html)
and [UpdateUserPool's full-configuration semantics](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserPool.html).

Production deletion protection remains ACTIVE in the patched CloudFormation
template, so newly created production pools receive protection again.

## 4. Inspect and empty only the failed stack's inbound-mail bucket

Use the exact physical bucket name listed for `InboundMailBucket` in step 2. In the
[S3 console](https://s3.console.aws.amazon.com/s3/buckets?region=us-east-1), inspect
its objects and download any messages or other data you need to preserve before
emptying it. Do not assume the contents are disposable SES test files.

Then select that bucket and choose **Empty**. This permanently deletes its objects,
including all versions and delete markers if versioning was enabled. Wait for the
empty operation to succeed, but leave the bucket itself for CloudFormation to
remove. See [AWS's empty-bucket procedure](https://docs.aws.amazon.com/AmazonS3/latest/userguide/empty-bucket.html).
Do not empty the shared artifact bucket or any staging bucket.

If objects reappear, check this failed stack's SES receipt-rule status and stop its
writer before repeating the empty operation. Do not deactivate the shared receipt
rule set, since staging may still use it.

## 5. Delete only that failed stack, then redeploy

After the checks above, run this block. Its exact stack ARN prevents it from
targeting a replacement stack with the same name. Each command must succeed before
the next runs.

```bash
FAILED_STACK_ARN='arn:aws:cloudformation:us-east-1:807434077491:stack/webwatch-prod/7d7df840-e273-11f1-9069-12ffca6719b9'

aws cloudformation delete-stack \
  --profile saas-admin --region us-east-1 \
  --stack-name "$FAILED_STACK_ARN" --no-cli-pager &&
aws cloudformation wait stack-delete-complete \
  --profile saas-admin --region us-east-1 \
  --stack-name "$FAILED_STACK_ARN" --no-cli-pager &&
AWS_PROFILE=saas-admin npm run aws:deploy
```

If deletion or the waiter fails, inspect events using the exact ARN and stop before
redeploying. Do not force-delete or retain failed resources as a shortcut; retained
names can block the replacement deployment. `continue-update-rollback` is for
`UPDATE_ROLLBACK_FAILED`, not this failed-create state.

After primary deployment succeeds, resume the first-install production workflow
for regional stacks, secrets, web assets, SES, confirmed operational subscriptions,
steward setup and acceptance checks. New Cognito pools have new IDs and user subs.

## Local verification

The SQS tests run both actual IaC parsers against corrected templates and deliberately
invalid variants. They reject multi-resource statements, missing queue/DLQ
attachments, accidental Allow effects, weakened HTTPS conditions and loss of the
AWS service exemption. The templates retain all 10 primary and 2 regional queue
attachments. No new resources or IAM permissions are introduced.


The six FORM_LOGO SVGs now have a 516×144 canvas and a `0 -36 516 144` viewBox
(3.58:1). This adds equal transparent padding above and below the artwork; paths,
colors, titles and descriptions are unchanged, without stretching or cropping. The
six favicons remain 24×24. Both rejected browser attributes remain removed from all
12 embedded assets. Local validation checks finite positive dimensions, matching
viewport/viewBox aspect ratios, the 1:1–4:1 logo range, square favicons, supported
SVG markup, and production deletion protection. Regression tests exercise every
logo and favicon plus invalid dimensions and both ratio boundaries. These checks
do not replace AWS-side validation or a successful deployment.
