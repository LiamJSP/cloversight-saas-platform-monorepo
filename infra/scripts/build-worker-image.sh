#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
[[ "$STAGE" != prod ]] || export WEBWATCH_REQUIRE_DEPENDENCY_LOCKS=1
WEBWATCH_ORIGINAL_ARGS=("$@")
for tool in aws docker node; do require_command "$tool"; done
node "$ROOT/infra/runtime/dependency-evidence.mjs" check "$ROOT/infra/docker/browser-worker"
docker buildx version >/dev/null 2>&1 || { echo 'Docker Buildx is required to produce a Lambda-compatible single-architecture image.' >&2; exit 4; }
BUILD_NETWORK_ARGS=()
case "${WEBWATCH_WORKER_BUILD_NETWORK:-default}" in
  default) ;;
  host)
    BUILD_NETWORK_ARGS=(--network=host --allow=network.host)
    printf 'Worker build: using host networking for Dockerfile RUN instructions.\n' >&2
    ;;
  *)
    printf 'Unsupported WEBWATCH_WORKER_BUILD_NETWORK: %s (expected default or host).\n' "$WEBWATCH_WORKER_BUILD_NETWORK" >&2
    exit 8
    ;;
esac
assert_region
ensure_deployment_role
: "${WORKER_ECR_REPOSITORY:=webwatch-browser-worker}"
RELEASE_VERSION="$(cd "$ROOT" && node -p "require('./package.json').version")"
WORKER_IMAGE_SOURCE_SHA256="$(node "$ROOT/scripts/worker-image-source-hash.mjs")"
DEFAULT_WORKER_IMAGE_TAG="lambda-chromium153-playwright-1.63.0-node22-r43"
if [[ "${CLOVERSIGHT_FRESH_WORKER_IMAGE:-0}" == 1 ]]; then WORKER_IMAGE_TAG="${DEFAULT_WORKER_IMAGE_TAG}-v${RELEASE_VERSION}-$(date -u +%Y%m%dT%H%M%SZ)-$$"; fi
if [[ -z "${WORKER_IMAGE_TAG:-}" ]]; then
  WORKER_IMAGE_TAG="${DEFAULT_WORKER_IMAGE_TAG}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
fi
[[ "$WORKER_IMAGE_TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || { printf 'Invalid ECR worker image tag: %s\n' "$WORKER_IMAGE_TAG" >&2; exit 8; }
LAMBDA_NODE_BASE_DIGEST="$(node "$ROOT/scripts/worker-base.mjs")"
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG_URI="${REGISTRY}/${WORKER_ECR_REPOSITORY}:${WORKER_IMAGE_TAG}"
TAG_LOOKUP_ERROR="$(mktemp)"
if aws_active ecr describe-images --repository-name "$WORKER_ECR_REPOSITORY" --image-ids imageTag="$WORKER_IMAGE_TAG" >/dev/null 2>"$TAG_LOOKUP_ERROR"; then
  printf 'ECR worker image tag %s already exists in the immutable repository; choose a new WORKER_IMAGE_TAG.\n' "$WORKER_IMAGE_TAG" >&2
  rm -f "$TAG_LOOKUP_ERROR"
  exit 9
elif ! grep -q 'ImageNotFoundException' "$TAG_LOOKUP_ERROR"; then
  printf 'Could not verify ECR worker tag availability for %s:\n' "$WORKER_IMAGE_TAG" >&2
  cat "$TAG_LOOKUP_ERROR" >&2
  rm -f "$TAG_LOOKUP_ERROR"
  exit 10
fi
rm -f "$TAG_LOOKUP_ERROR"
# Keep every tagged release available to deployed digest-pinned Lambdas. A global
# newest-N policy can remove another stage's still-active image after staging builds.
if [[ ${CLOVERSIGHT_EXISTING_RELEASE:-0} != 1 ]]; then
  aws_active ecr put-lifecycle-policy --repository-name "$WORKER_ECR_REPOSITORY" --lifecycle-policy-text "file://$ROOT/infra/ecr/worker-lifecycle.json" >/dev/null
fi
# Keep the short-lived ECR authorization token out of the developer's persistent
# ~/.docker/config.json. Docker may still warn about plaintext storage, but this
# isolated config directory is deleted automatically when the script exits.
DOCKER_CONFIG_DIR="$(mktemp -d)"
trap 'rm -rf "$DOCKER_CONFIG_DIR"' EXIT
export DOCKER_CONFIG="$DOCKER_CONFIG_DIR"
aws_active ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
docker buildx build "${BUILD_NETWORK_ARGS[@]}" --provenance=false --sbom=false --load --platform linux/amd64 --label "org.opencontainers.image.base.digest=${LAMBDA_NODE_BASE_DIGEST##*@}" --build-arg WEBWATCH_CAPTURE_RELEASE="$RELEASE_VERSION" --build-arg WEBWATCH_CAPTURE_SOURCE_SHA256="$WORKER_IMAGE_SOURCE_SHA256" --build-arg WEBWATCH_REQUIRE_DEPENDENCY_LOCKS="${WEBWATCH_REQUIRE_DEPENDENCY_LOCKS:-0}" --label "org.opencontainers.image.source=cloversight-saas" --label "org.opencontainers.image.version=$RELEASE_VERSION" -f "$ROOT/infra/docker/browser-worker/Dockerfile" -t "$IMAGE_TAG_URI" "$ROOT"
docker run --rm --entrypoint node -e "EXPECTED_RELEASE=$RELEASE_VERSION" -e "EXPECTED_SOURCE_SHA256=$WORKER_IMAGE_SOURCE_SHA256" "$IMAGE_TAG_URI" -e 'const fs=require("node:fs");const source=fs.readFileSync("/var/task/src/monitoring/capture.mjs","utf8");const os=fs.readFileSync("/etc/os-release","utf8");for(const token of ["launchPersistentContext","persistentContext: true","disposable-profile","fs.mkdtemp","retirePendingSessions"]){if(!source.includes(token))throw new Error(`Built capture source is missing ${token}`)}if(!/Amazon Linux/i.test(os))throw new Error("Worker image is not based on Amazon Linux");if(process.env.WEBWATCH_CAPTURE_RELEASE!==process.env.EXPECTED_RELEASE)throw new Error("Built image release marker does not match");if(process.env.WEBWATCH_CAPTURE_SOURCE_SHA256!==process.env.EXPECTED_SOURCE_SHA256)throw new Error("Built image source marker does not match");require.resolve("playwright-core");require.resolve("@sparticuz/chromium");console.log(JSON.stringify({event:"worker-image.contract.verified",release:process.env.WEBWATCH_CAPTURE_RELEASE,sourceSha256:process.env.WEBWATCH_CAPTURE_SOURCE_SHA256,platform:"amazon-linux",driver:"sparticuz-chromium"}))'
docker push "$IMAGE_TAG_URI"
read -r DIGEST MEDIA_TYPE < <(aws_active ecr describe-images --repository-name "$WORKER_ECR_REPOSITORY" --image-ids imageTag="$WORKER_IMAGE_TAG" --query 'imageDetails[0].[imageDigest,imageManifestMediaType]' --output text)
[[ "$DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo 'ECR did not return a valid image digest.' >&2; exit 6; }
WORKER_IMAGE_MEDIA_TYPE="$(aws_active ecr describe-images --repository-name "$WORKER_ECR_REPOSITORY" --image-ids imageDigest="$DIGEST" --query 'imageDetails[0].imageManifestMediaType' --output text)"
case "$WORKER_IMAGE_MEDIA_TYPE" in
  application/vnd.docker.distribution.manifest.v2+json|application/vnd.oci.image.manifest.v1+json) ;;
  *) printf 'ECR worker image media type %s is not a Lambda-compatible single-image manifest. Buildx provenance/SBOM attestations must remain disabled.\n' "$WORKER_IMAGE_MEDIA_TYPE" >&2; exit 7 ;;
esac
case "$MEDIA_TYPE" in
  application/vnd.docker.distribution.manifest.v2+json|application/vnd.oci.image.manifest.v1+json) ;;
  *) printf 'ECR image media type %s is not a Lambda-compatible single-image manifest. Manifest lists/image indexes are rejected.\n' "$MEDIA_TYPE" >&2; exit 7 ;;
esac
mkdir -p "$ROOT/.local"
umask 077
DEPENDENCY_EVIDENCE_DIR="$ROOT/.local/release-evidence/$WORKER_IMAGE_TAG"
mkdir -p "$DEPENDENCY_EVIDENCE_DIR"
docker run --rm --entrypoint cat "${REGISTRY}/${WORKER_ECR_REPOSITORY}@${DIGEST}" /var/task/dependency.sbom.cdx.json > "$DEPENDENCY_EVIDENCE_DIR/browser-worker.sbom.cdx.json"
node "$ROOT/infra/runtime/dependency-evidence.mjs" record --scope browser-worker --manifest "$ROOT/infra/docker/browser-worker/package.json" --source-lock "$ROOT/infra/docker/browser-worker/package-lock.json" --sbom "$DEPENDENCY_EVIDENCE_DIR/browser-worker.sbom.cdx.json" --artifact "${REGISTRY}/${WORKER_ECR_REPOSITORY}@${DIGEST}" --source-sha256 "$WORKER_IMAGE_SOURCE_SHA256" --base-image "$LAMBDA_NODE_BASE_DIGEST" --output "$DEPENDENCY_EVIDENCE_DIR/browser-worker.release-evidence.json"
cat > "$ROOT/.local/worker-image.env" <<EOF2
# Generated by build-worker-image.sh. Non-secret immutable deployment inputs.
WORKER_IMAGE_URI=${REGISTRY}/${WORKER_ECR_REPOSITORY}@${DIGEST}
WORKER_IMAGE_TAG=${WORKER_IMAGE_TAG}
WORKER_IMAGE_MEDIA_TYPE=${WORKER_IMAGE_MEDIA_TYPE}
WORKER_IMAGE_RELEASE_VERSION=${RELEASE_VERSION}
WORKER_IMAGE_SOURCE_SHA256=${WORKER_IMAGE_SOURCE_SHA256}
LAMBDA_NODE_BASE_IMAGE_DIGEST=${LAMBDA_NODE_BASE_DIGEST}
SERVERLESS_CHROMIUM_VERSION=153.0.0
PLAYWRIGHT_CORE_VERSION=1.63.0
EOF2
printf 'Worker image: %s\nRelease: %s\nSource SHA-256: %s\nLambda Node base: %s\nServerless Chromium: %s\nPlaywright Core: %s\n' "${REGISTRY}/${WORKER_ECR_REPOSITORY}@${DIGEST}" "$RELEASE_VERSION" "$WORKER_IMAGE_SOURCE_SHA256" "$LAMBDA_NODE_BASE_DIGEST" '153.0.0' '1.63.0'
