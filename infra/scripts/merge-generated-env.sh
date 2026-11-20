#!/usr/bin/env bash
# Merge a known generated deployment-input file into the private .env, without duplicate keys.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ $# != 1 ]]; then
  printf 'Usage: bash infra/scripts/merge-generated-env.sh .local/{bootstrap-outputs,worker-image}.env\n' >&2
  exit 2
fi

case "$1" in
  .local/bootstrap-outputs.env)
    expected=(ARTIFACT_BUCKET AWS_DEPLOYMENT_ROLE_ARN AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN WORKER_ECR_REPOSITORY SES_RECEIPT_RULE_SET_NAME)
    ;;
  .local/worker-image.env)
    expected=(WORKER_IMAGE_URI WORKER_IMAGE_TAG WORKER_IMAGE_MEDIA_TYPE WORKER_IMAGE_RELEASE_VERSION WORKER_IMAGE_SOURCE_SHA256 LAMBDA_NODE_BASE_IMAGE_DIGEST SERVERLESS_CHROMIUM_VERSION PLAYWRIGHT_CORE_VERSION)
    ;;
  *)
    printf 'Expected .local/bootstrap-outputs.env or .local/worker-image.env.\n' >&2
    exit 2
    ;;
esac

input="$ROOT/$1"
target="$ROOT/.env"
[[ -f "$input" && -f "$target" ]] || { printf 'Both %s and .env must exist.\n' "$1" >&2; exit 2; }

declare -A values=()
declare -A allowed=()
declare -A written=()
for key in "${expected[@]}"; do allowed["$key"]=1; done

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  if [[ ! "$line" =~ ^([A-Z][A-Z0-9_]*)=([A-Za-z0-9_./:@+-]+)$ ]]; then
    printf 'Invalid generated assignment in %s. The existing .env was not changed.\n' "$1" >&2
    exit 2
  fi
  key="${BASH_REMATCH[1]}"
  [[ -n "${allowed[$key]+set}" && -z "${values[$key]+set}" ]] || {
    printf 'Unexpected or repeated generated key %s in %s.\n' "$key" "$1" >&2
    exit 2
  }
  values["$key"]="${BASH_REMATCH[2]}"
done < "$input"

for key in "${expected[@]}"; do
  [[ -n "${values[$key]+set}" ]] || { printf 'Missing generated key %s in %s.\n' "$key" "$1" >&2; exit 2; }
done

umask 077
tmp="$(mktemp "$ROOT/.env.merge.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^[[:space:]]*([A-Z][A-Z0-9_]*)= ]]; then
    key="${BASH_REMATCH[1]}"
    if [[ -n "${values[$key]+set}" ]]; then
      if [[ -z "${written[$key]+set}" ]]; then
        printf '%s=%s\n' "$key" "${values[$key]}" >> "$tmp"
        written["$key"]=1
      fi
      continue
    fi
  fi
  printf '%s\n' "$line" >> "$tmp"
done < "$target"

for key in "${expected[@]}"; do
  if [[ -z "${written[$key]+set}" ]]; then
    printf '%s=%s\n' "$key" "${values[$key]}" >> "$tmp"
  fi
done
chmod 600 "$tmp"
mv -f -- "$tmp" "$target"
trap - EXIT
printf 'Updated .env from %s (%s keys; mode 600).\n' "$1" "${#expected[@]}"
