#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"; load_webwatch_env
WEBWATCH_ORIGINAL_ARGS=("$@")
require_command aws; assert_region; ensure_deployment_role
[[ "$STAGE" == staging && "$STACK_NAME" == *staging* ]] || { echo 'Deletion helper is staging-only and requires staging in STACK_NAME.' >&2; exit 2; }
aws_active cloudformation delete-stack --stack-name "$STACK_NAME"
aws_active cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" || { echo 'Delete did not complete. Run npm run aws:events before editing resources manually.' >&2; exit 1; }
