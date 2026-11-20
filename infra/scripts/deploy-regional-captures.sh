#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
WEBWATCH_ORIGINAL_ARGS=("$@")
for tool in aws docker node python3; do require_command "$tool"; done
assert_region
ensure_deployment_role
eval "$(cd "$ROOT" && node scripts/deployment-settings.mjs shell)"
invalidate_ci_release_baseline
(cd "$ROOT" && node scripts/validate-iac.mjs && node scripts/validate-cfn-schema.mjs)
node "$ROOT/scripts/verify-worker-image-contract.mjs"

primary_plan="$(node "$ROOT/scripts/deployment-control.mjs" plan "$WW_STACK_NAME" "$AWS_REGION")"
primary_mode="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).mode)' "$primary_plan")"
[[ "$primary_mode" == rollback ]] || { echo 'Complete the primary stack before deploying regional workers.' >&2; exit 12; }

# A permission or network failure is not evidence that an ECR resource is absent.
ecr_resource_exists() {
  local missing_code="$1" result
  shift
  if result="$(command aws "$@" 2>&1)"; then return 0; fi
  if [[ "$result" == *"($missing_code)"* ]]; then return 1; fi
  printf 'ECR prerequisite check failed: %s\n' "$result" >&2
  exit 12
}

# Keep registry credentials in a private temporary directory, as in the build script.
regional_docker_config="$(mktemp -d)"
export DOCKER_CONFIG="$regional_docker_config"
trap 'rm -rf "$regional_docker_config"' EXIT

snapshot_bucket="$(stack_output SnapshotBucket)"
snapshot_region="$(stack_output SnapshotBucketRegion)"
data_key_arn="$(stack_output DataKeyArn)"
result_queue_url="$(stack_output CaptureResultQueueUrl)"
result_queue_arn="$(stack_output CaptureResultQueueArn)"
customer_origin="$(stack_output PublicUrl)"
source_repository_uri="${WW_WORKER_IMAGE_URI%@*}"
repository_name="${source_repository_uri#*/}"
source_registry="${source_repository_uri%%/*}"
release_tag="regional-${WW_WORKER_IMAGE_URI##*@sha256:}"
release_tag="${release_tag:0:75}"

command aws --region "$AWS_REGION" ecr get-login-password | docker login --username AWS --password-stdin "$source_registry" >/dev/null
docker pull "$WW_WORKER_IMAGE_URI"
IFS=',' read -r -a regions <<<"$WW_CHECK_REGIONS"
for regional_region in "${regions[@]}"; do
  [[ "$regional_region" == "$AWS_REGION" ]] && continue
  regional_stack="webwatch-${WW_STAGE}-regional-${regional_region}"
  regional_plan="$(node "$ROOT/scripts/deployment-control.mjs" plan "$regional_stack" "$regional_region")"
  failure_mode="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).mode)' "$regional_plan")"
  if [[ ${CLOVERSIGHT_EXISTING_RELEASE:-0} == 1 ]]; then
    [[ "$failure_mode" == rollback ]] || { echo "CI requires an existing stable stack in $regional_region." >&2; exit 12; }
    WW_REGIONAL_CAPTURE_CONCURRENCY="$(aws --region "$regional_region" cloudformation describe-stacks --stack-name "$regional_stack" --query "Stacks[0].Parameters[?ParameterKey=='ReservedCaptureConcurrency'].ParameterValue | [0]" --output text)"
    [[ "$WW_REGIONAL_CAPTURE_CONCURRENCY" =~ ^[0-9]+$ ]] || { echo 'Missing regional capacity.' >&2; exit 12; }
  fi
  node "$ROOT/scripts/check-lambda-capacity.mjs" --regional "$regional_region"
  registry="${AWS_ACCOUNT_ID}.dkr.ecr.${regional_region}.amazonaws.com"
  regional_repository_uri="${registry}/${repository_name}"
  if ! ecr_resource_exists RepositoryNotFoundException --region "$regional_region" ecr describe-repositories --repository-names "$repository_name"; then
    [[ ${CLOVERSIGHT_EXISTING_RELEASE:-0} != 1 ]] || { echo "Install the regional ECR repository in $regional_region first." >&2; exit 12; }
    command aws --region "$regional_region" ecr create-repository --repository-name "$repository_name" --image-scanning-configuration scanOnPush=true --image-tag-mutability IMMUTABLE --tags Key=Application,Value=WebWatch Key=Component,Value=SharedBrowserImages "Key=Owner,Value=${WW_RESOURCE_OWNER}" >/dev/null
  fi
  if [[ ${CLOVERSIGHT_EXISTING_RELEASE:-0} != 1 ]]; then
    command aws --region "$regional_region" ecr put-lifecycle-policy --repository-name "$repository_name" --lifecycle-policy-text "file://$ROOT/infra/ecr/worker-lifecycle.json" >/dev/null
  fi
  if ! ecr_resource_exists ImageNotFoundException --region "$regional_region" ecr describe-images --repository-name "$repository_name" --image-ids imageTag="$release_tag"; then
    if ! ecr_resource_exists ImageNotFoundException --region "$regional_region" ecr describe-images --repository-name "$repository_name" --image-ids "imageTag=${release_tag}-layers"; then
      command aws --region "$regional_region" ecr get-login-password | docker login --username AWS --password-stdin "$registry" >/dev/null
      docker tag "$WW_WORKER_IMAGE_URI" "${regional_repository_uri}:${release_tag}-layers"
      docker push "${regional_repository_uri}:${release_tag}-layers" >/dev/null
    fi
    node "$ROOT/scripts/copy-worker-manifest.mjs" "$repository_name" "$regional_region" "${WW_WORKER_IMAGE_URI##*@}" "$release_tag"
  fi
  regional_digest="$(command aws --region "$regional_region" ecr describe-images --repository-name "$repository_name" --image-ids imageTag="$release_tag" --query 'imageDetails[0].imageDigest' --output text)"
  [[ "$regional_digest" == "${WW_WORKER_IMAGE_URI##*@}" ]] || { echo "Regional image digest differs from the verified source image in $regional_region." >&2; exit 12; }
  regional_image_uri="${regional_repository_uri}@${regional_digest}"
  regional_settings=("ReservedCaptureConcurrency=${WW_REGIONAL_CAPTURE_CONCURRENCY}" "OpsAlertEmail=${WW_OPS_EMAIL}" "ResourceOwner=${WW_RESOURCE_OWNER}")
  if [[ ${CLOVERSIGHT_EXISTING_RELEASE:-0} == 1 ]]; then regional_settings=(); fi
  deploy_cloudformation_checked "$regional_stack" "$regional_region" "$failure_mode" --template-file "$ROOT/infra/cloudformation/regional-capture.yaml" --role-arn "$WW_EXECUTION_ROLE_ARN" --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset --tags "Application=WebWatch" "Stage=${WW_STAGE}" "Owner=${WW_RESOURCE_OWNER}" --parameter-overrides "Stage=${WW_STAGE}" "ImageUri=${regional_image_uri}" "CentralSnapshotBucketName=${snapshot_bucket}" "CentralSnapshotBucketRegion=${snapshot_region}" "CentralDataKeyArn=${data_key_arn}" "CentralResultQueueUrl=${result_queue_url}" "CentralResultQueueArn=${result_queue_arn}" "CentralResultQueueRegion=${AWS_REGION}" "CustomerOrigin=${customer_origin}" "${regional_settings[@]}"
  if [[ ${CLOVERSIGHT_EXISTING_RELEASE:-0} == 1 ]]; then
    installed_image="$(aws --region "$regional_region" cloudformation describe-stacks --stack-name "$regional_stack" --query "Stacks[0].Parameters[?ParameterKey=='ImageUri'].ParameterValue | [0]" --output text)"
    [[ "$installed_image" == "$regional_image_uri" ]] || { echo "Unexpected deployed image in $regional_region." >&2; exit 12; }
  fi
  printf 'Regional capture deployed in %s.\n' "$regional_region"
done
