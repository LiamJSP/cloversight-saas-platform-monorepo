#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
require_command aws
require_value AWS_DEPLOYMENT_PRINCIPAL_ARN
: "${BOOTSTRAP_STACK_NAME:=webwatch-deployment-bootstrap}"
: "${SES_RECEIPT_RULE_SET_NAME:=webwatch-shared-inbound}"
assert_region
assert_identity source

aws_source cloudformation deploy \
  --stack-name "$BOOTSTRAP_STACK_NAME" \
  --template-file "$ROOT/infra/bootstrap/access.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides DeploymentPrincipalArn="$AWS_DEPLOYMENT_PRINCIPAL_ARN" SesReceiptRuleSetName="$SES_RECEIPT_RULE_SET_NAME"

mkdir -p "$ROOT/.local"
umask 077
artifact="$(aws_source cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucketName'].OutputValue | [0]" --output text)"
deploy_role="$(aws_source cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='DeploymentRoleArn'].OutputValue | [0]" --output text)"
execution_role="$(aws_source cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='CloudFormationExecutionRoleArn'].OutputValue | [0]" --output text)"
repository="$(aws_source cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='WorkerRepositoryUri'].OutputValue | [0]" --output text)"
ses_rule_set="$(aws_source cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SesReceiptRuleSetName'].OutputValue | [0]" --output text)"
cat > "$ROOT/.local/bootstrap-outputs.env" <<EOF2
# Generated non-secret values for merge-generated-env.sh.
ARTIFACT_BUCKET=${artifact}
AWS_DEPLOYMENT_ROLE_ARN=${deploy_role}
AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN=${execution_role}
WORKER_ECR_REPOSITORY=${repository##*/}
SES_RECEIPT_RULE_SET_NAME=${ses_rule_set}
EOF2
aws_source cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --query 'Stacks[0].Outputs' --output table
cat <<'TEXT'
Bootstrap complete. Add an sts:AssumeRole permission for the DeploymentRoleArn to the
IAM Identity Center deployment permission set, run
bash infra/scripts/merge-generated-env.sh .local/bootstrap-outputs.env,
sign in again, and run npm run aws:build-worker.
TEXT
