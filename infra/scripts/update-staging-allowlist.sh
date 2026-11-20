#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
WEBWATCH_ORIGINAL_ARGS=("$@")
for tool in aws node; do require_command "$tool"; done
assert_region
[[ "$STAGE" == staging ]] || { echo 'The allow-list updater is staging-only.' >&2; exit 10; }
ensure_deployment_role
node "$ROOT/scripts/deployment-settings.mjs" validate

mapfile -t ipv4 < <(cd "$ROOT" && node --input-type=module - <<'NODE'
import { assertDeployableAllowlist, loadDeploymentSettings } from './src/deployment/settings.mjs';
for (const value of assertDeployableAllowlist(loadDeploymentSettings().allowlist).ipv4) console.log(value);
NODE
)
mapfile -t ipv6 < <(cd "$ROOT" && node --input-type=module - <<'NODE'
import { assertDeployableAllowlist, loadDeploymentSettings } from './src/deployment/settings.mjs';
for (const value of assertDeployableAllowlist(loadDeploymentSettings().allowlist).ipv6) console.log(value);
NODE
)

update_set() {
  local scope="$1" family="$2" name_key="$3" id_key="$4"; shift 4
  local addresses=("$@")
  [[ ${#addresses[@]} -gt 0 ]] || return 0
  local name id token
  name="$(stack_output "$name_key")"; id="$(stack_output "$id_key")"
  token="$(aws_active wafv2 get-ip-set --scope "$scope" --name "$name" --id "$id" --query LockToken --output text)"
  aws_active wafv2 update-ip-set --scope "$scope" --name "$name" --id "$id" --lock-token "$token" --addresses "${addresses[@]}"
  printf 'Updated %s %s with %d CIDR(s).\n' "$scope" "$family" "${#addresses[@]}"
}
update_set CLOUDFRONT IPV4 EdgeIpv4SetName EdgeIpv4SetId "${ipv4[@]}"
update_set CLOUDFRONT IPV6 EdgeIpv6SetName EdgeIpv6SetId "${ipv6[@]}"
update_set REGIONAL IPV4 RegionalIpv4SetName RegionalIpv4SetId "${ipv4[@]}"
update_set REGIONAL IPV6 RegionalIpv6SetName RegionalIpv6SetId "${ipv6[@]}"
cat <<'TEXT'
Console edits and this script take effect immediately but are CloudFormation drift.
Keep config/staging-ip-allowlist.txt authoritative; the next stack deployment can
replace dashboard-only edits with the file's values.
TEXT
