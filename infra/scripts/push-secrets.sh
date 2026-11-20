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
twilio_value_count=0
for name in TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM; do [[ -n "${!name:-}" ]] && twilio_value_count=$((twilio_value_count + 1)); done
[[ "$twilio_value_count" == 0 || "$twilio_value_count" == 3 ]] || { echo 'Twilio is optional, but TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM must either all be configured or all be blank.' >&2; exit 10; }
twilio_enabled=false
if [[ "$twilio_value_count" == 3 ]]; then
  twilio_enabled=true
  [[ "$TWILIO_ACCOUNT_SID" == AC* ]] || { echo 'TWILIO_ACCOUNT_SID must start with AC.' >&2; exit 10; }
  [[ "$TWILIO_FROM" =~ ^\+[1-9][0-9]{7,14}$ ]] || { echo 'TWILIO_FROM must be an E.164 phone number for this release.' >&2; exit 10; }
fi

stripe_arn="$(stack_output StripeSecretArn)"
[[ "$stripe_arn" == arn:* ]] || { echo 'Could not resolve the Stripe secret ARN from the stack.' >&2; exit 11; }
twilio_arn=''
if [[ "$twilio_enabled" == true ]]; then
  twilio_arn="$(stack_output TwilioSecretArn)"
  [[ "$twilio_arn" == arn:* ]] || { echo 'Twilio credentials are configured, but the stack does not expose an enabled Twilio secret.' >&2; exit 11; }
fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
chmod 700 "$tmp"
node "$ROOT/scripts/stripe-secret-config.mjs" prepare "$tmp/stripe.json"
aws_active secretsmanager put-secret-value --secret-id "$stripe_arn" --secret-string "file://$tmp/stripe.json" --query VersionId --output text >/dev/null
if [[ "$twilio_enabled" == true ]]; then
  node --input-type=module - "$tmp/twilio.json" <<'NODE'
import fs from 'node:fs';
const [twilioPath] = process.argv.slice(2);
const twilio = { accountSid: process.env.TWILIO_ACCOUNT_SID, authToken: process.env.TWILIO_AUTH_TOKEN, from: process.env.TWILIO_FROM };
fs.writeFileSync(twilioPath, JSON.stringify(twilio), { mode: 0o600 });
NODE
  aws_active secretsmanager put-secret-value --secret-id "$twilio_arn" --secret-string "file://$tmp/twilio.json" --query VersionId --output text >/dev/null
  printf 'Updated Stripe and Twilio secrets for %s without printing secret values.\n' "$STACK_NAME"
else
  printf 'Updated the Stripe secret for %s. Twilio is disabled because its optional credentials are blank.\n' "$STACK_NAME"
fi
