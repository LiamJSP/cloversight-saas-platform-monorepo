#!/usr/bin/env bash
# Shared deployment helpers. This file never prints secret values.
set -o pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

load_webwatch_env() {
  if [[ -f "$ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.env"
    set +a
  fi
  export AWS_REGION="${AWS_REGION:-us-east-1}"
  export AWS_DEFAULT_REGION="$AWS_REGION"
  export STAGE="${STAGE:-staging}"
  export STACK_NAME="${STACK_NAME:-webwatch-${STAGE}}"
}
require_command() { command -v "$1" >/dev/null 2>&1 || { printf 'Required command not found: %s\n' "$1" >&2; exit 4; }; }
require_value() { [[ -n "${!1:-}" ]] || { printf 'Required environment variable is missing: %s\n' "$1" >&2; exit 5; }; }
aws_source() { if [[ -n "${AWS_PROFILE:-}" ]]; then command aws --profile "$AWS_PROFILE" --region "$AWS_REGION" "$@"; else command aws --region "$AWS_REGION" "$@"; fi; }
aws_active() { command aws --region "$AWS_REGION" "$@"; }
assert_region() { [[ "$AWS_REGION" == us-east-1 ]] || { echo 'This release is pinned to us-east-1.' >&2; exit 6; }; }
assert_identity() {
  local mode="${1:-active}" arn account
  if [[ "$mode" == source ]]; then
    arn="$(aws_source sts get-caller-identity --query Arn --output text)"
    account="$(aws_source sts get-caller-identity --query Account --output text)"
  else
    arn="$(aws_active sts get-caller-identity --query Arn --output text)"
    account="$(aws_active sts get-caller-identity --query Account --output text)"
  fi
  [[ "$arn" != *":root" ]] || { echo 'Refusing to operate as the AWS root principal.' >&2; exit 7; }
  if [[ -n "${AWS_ACCOUNT_ID:-}" && "$account" != "$AWS_ACCOUNT_ID" ]]; then
    printf 'AWS identity account %s does not match AWS_ACCOUNT_ID %s.\n' "$account" "$AWS_ACCOUNT_ID" >&2; exit 8
  fi
  printf 'AWS identity: %s (%s)\n' "$arn" "$account" >&2
}
ensure_deployment_role() {
  if [[ "${WEBWATCH_DEPLOYMENT_ROLE_ACTIVE:-false}" == true ]]; then assert_identity active; return; fi
  require_value AWS_DEPLOYMENT_ROLE_ARN
  local script="${BASH_SOURCE[1]}"
  local -a args=("${WEBWATCH_ORIGINAL_ARGS[@]:-}")
  exec "$ROOT/infra/scripts/assume-deployment-role.sh" "$script" "${args[@]}"
}
stack_output() {
  aws_active cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" --output text
}

# Preserve new installations for repair; completed-stack updates still roll back.
# Only a preserved failed stack whose resource failures are all throttling errors
# is retried. Never delete resources or retry invalid templates/permissions here.
deploy_cloudformation_checked() {
  local target_stack="$1" target_region="$2" failure_mode="$3"
  shift 3
  local attempt started exit_code delay
  local -a failure_options=(--no-disable-rollback)
  [[ "$failure_mode" != preserve ]] || failure_options=(--disable-rollback)
  for attempt in 1 2 3; do
    started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    if AWS_RETRY_MODE=standard AWS_MAX_ATTEMPTS=8 command aws --region "$target_region" --no-cli-pager cloudformation deploy \
      --stack-name "$target_stack" "${failure_options[@]}" "$@"; then
      # --no-fail-on-empty-changeset must never turn a still-failed stack green.
      if node "$ROOT/scripts/deployment-control.mjs" completed "$target_stack" "$target_region"; then return 0; fi
      exit_code=1
    else
      exit_code=$?
    fi
    node "$ROOT/scripts/deployment-control.mjs" diagnose "$target_stack" "$target_region" "$started" || true
    if [[ "$failure_mode" == preserve && "$attempt" -lt 3 ]] && node "$ROOT/scripts/deployment-control.mjs" retryable "$target_stack" "$target_region" "$started"; then
      delay=$((attempt * 30 + RANDOM % 16))
      printf 'Only throttling failures remain in the preserved stack. Retrying in %s seconds (attempt %s of 3).\n' "$delay" "$((attempt + 1))" >&2
      sleep "$delay"
    else
      return "$exit_code"
    fi
  done
}
