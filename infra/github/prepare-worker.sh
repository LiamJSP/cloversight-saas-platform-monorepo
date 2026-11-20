#!/usr/bin/env bash
set -euo pipefail
umask 077
mkdir -p .local
registry="${WORKER_IMAGE_URI%%/*}"
export DOCKER_CONFIG
DOCKER_CONFIG="$(mktemp -d)"
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$registry" >/dev/null
docker pull --platform linux/amd64 "$WORKER_IMAGE_URI"
source_hash="$(node scripts/worker-image-source-hash.mjs)"
version="$(node -p "require('./package.json').version")"
image_source="$(docker image inspect "$WORKER_IMAGE_URI" --format '{{index .Config.Labels "ca.redcloversoftware.webwatch.capture.source-sha256"}}')"
image_version="$(docker image inspect "$WORKER_IMAGE_URI" --format '{{index .Config.Labels "org.opencontainers.image.version"}}')"
base="$(node scripts/worker-base.mjs)"
image_base="$(docker image inspect "$WORKER_IMAGE_URI" --format '{{index .Config.Labels "org.opencontainers.image.base.digest"}}')"
if [[ "$image_base" == "${base##*@}" && "$source_hash" == "$image_source" && "$version" == "$image_version" ]]; then
  printf 'WORKER_IMAGE_URI=%s\nWORKER_IMAGE_RELEASE_VERSION=%s\nWORKER_IMAGE_SOURCE_SHA256=%s\nLAMBDA_NODE_BASE_IMAGE_DIGEST=%s\n' "$WORKER_IMAGE_URI" "$version" "$source_hash" "$base" > .local/worker-image.env
  echo "Reusing verified installed worker $WORKER_IMAGE_URI"
else
  export WORKER_IMAGE_TAG="gh-${GITHUB_SHA:?}-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
  bash infra/scripts/build-worker-image.sh
fi
