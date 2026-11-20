#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
WEBWATCH_ORIGINAL_ARGS=("$@")
require_command aws
assert_region
ensure_deployment_role

rule_set="$(stack_output SesReceiptRuleSetOutput)"
rule_name="$(stack_output SesReceiptRuleNameOutput)"
[[ -n "$rule_set" && "$rule_set" != None ]] || { echo 'Could not find the SES receipt rule set output.' >&2; exit 10; }
[[ -n "$rule_name" && "$rule_name" != None ]] || { echo 'Could not find the SES receipt rule output.' >&2; exit 10; }
found_rule="$(aws_active ses describe-receipt-rule-set --rule-set-name "$rule_set" --query "Rules[?Name=='${rule_name}'].Name | [0]" --output text 2>/dev/null || true)"
[[ "$found_rule" == "$rule_name" ]] || { printf 'Shared SES receipt rule set %s does not contain expected rule %s. Re-run the environment deployment after updating the bootstrap stack.\n' "$rule_set" "$rule_name" >&2; exit 10; }
active="$(aws_active ses describe-active-receipt-rule-set --query 'Metadata.Name' --output text 2>/dev/null || true)"
if [[ -n "$active" && "$active" != None && "$active" != "$rule_set" && "${REPLACE_ACTIVE_SES_RULE_SET:-false}" != true ]]; then
  printf 'SES receipt rule set %s is already active. Refusing to replace it.\n' "$active" >&2
  echo 'Merge the CLOVERSIGHT rule into the existing set or set REPLACE_ACTIVE_SES_RULE_SET=true after review.' >&2
  exit 11
fi
aws_active ses set-active-receipt-rule-set --rule-set-name "$rule_set"
verified="$(aws_active ses describe-active-receipt-rule-set --query 'Metadata.Name' --output text)"
[[ "$verified" == "$rule_set" ]] || { echo 'SES did not report the expected active receipt rule set.' >&2; exit 12; }
printf 'Active SES receipt rule set: %s (verified rule: %s)\n' "$verified" "$rule_name"
