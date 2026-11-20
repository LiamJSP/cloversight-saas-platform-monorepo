#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
require_command aws
require_value AWS_DEPLOYMENT_ROLE_ARN
[[ $# -gt 0 ]] || { echo 'Usage: assume-deployment-role.sh command [arguments...]' >&2; exit 2; }
assert_region
assert_identity source

SESSION_NAME="webwatch-$(date -u +%Y%m%dT%H%M%SZ)-$$"
read -r ACCESS SECRET TOKEN EXPIRATION < <(
  aws_source sts assume-role \
    --role-arn "$AWS_DEPLOYMENT_ROLE_ARN" \
    --role-session-name "$SESSION_NAME" \
    --duration-seconds "${AWS_ROLE_SESSION_SECONDS:-3600}" \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken,Expiration]' \
    --output text
)
[[ -n "$ACCESS" && -n "$SECRET" && -n "$TOKEN" ]] || { echo 'AWS returned incomplete role credentials.' >&2; exit 6; }
printf 'Using short-lived deployment credentials expiring %s.\n' "$EXPIRATION" >&2
exec env -u AWS_PROFILE \
  AWS_ACCESS_KEY_ID="$ACCESS" \
  AWS_SECRET_ACCESS_KEY="$SECRET" \
  AWS_SESSION_TOKEN="$TOKEN" \
  AWS_REGION="$AWS_REGION" \
  AWS_DEFAULT_REGION="$AWS_REGION" \
  WEBWATCH_DEPLOYMENT_ROLE_ACTIVE=true \
  "$@"
