#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"; load_webwatch_env
require_command aws; assert_region
if [[ "${WEBWATCH_DEPLOYMENT_ROLE_ACTIVE:-false}" != true && -n "${AWS_DEPLOYMENT_ROLE_ARN:-}" ]]; then WEBWATCH_ORIGINAL_ARGS=("$@"); ensure_deployment_role; fi
aws_active cloudformation describe-stack-events --stack-name "$STACK_NAME" --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED` || ResourceStatus==`DELETE_FAILED` || ResourceStatus==`UPDATE_ROLLBACK_FAILED`].[Timestamp,LogicalResourceId,ResourceType,ResourceStatus,ResourceStatusReason]' --output table
