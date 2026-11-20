#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
WEBWATCH_ORIGINAL_ARGS=("$@")
for tool in aws node mktemp; do require_command "$tool"; done
assert_region
ensure_deployment_role
node "$ROOT/scripts/stripe-secret-config.mjs" validate
stripe_arn="$(stack_output StripeSecretArn)"
[[ "$stripe_arn" == arn:* ]] || { echo 'Could not resolve Stripe secret ARN from the stack.' >&2; exit 11; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
chmod 700 "$tmp"
node "$ROOT/scripts/stripe-secret-config.mjs" prepare "$tmp/stripe.json"
aws_active secretsmanager put-secret-value --secret-id "$stripe_arn" --secret-string "file://$tmp/stripe.json" --query VersionId --output text >/dev/null
printf 'Updated Stripe secret for %s without printing secret values.\n' "$STACK_NAME"
