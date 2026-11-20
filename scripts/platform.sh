#!/usr/bin/env bash
# One entry point per major workflow; run from any working directory.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
source "$ROOT/infra/scripts/lib.sh"
mode="${1:-help}"
[[ $# == 0 ]] || shift
case "$mode" in
  dev)
    [[ $# == 0 ]] || { echo 'Usage: npm run dev' >&2; exit 2; }
    require_command node; require_command npm
    node scripts/ensure-dependencies.mjs
    exec node scripts/start-dev.mjs
    ;;
  bootstrap)
    [[ $# == 0 ]] || { echo 'Set AWS_PROFILE in .env; usage: npm run aws:bootstrap' >&2; exit 2; }
    require_command aws
    [[ -f .env ]] || { echo 'Create and configure private .env before AWS bootstrap.' >&2; exit 2; }
    bash infra/scripts/bootstrap-aws-access.sh
    bash infra/scripts/merge-generated-env.sh .local/bootstrap-outputs.env
    echo 'Bootstrap outputs merged. Grant the Identity Center permission set sts:AssumeRole, refresh its SSO login, then run npm run deploy.'
    ;;
  deploy)
    reuse_image=false; skip_secrets=false; skip_ses=false
    for arg in "$@"; do
      case "$arg" in
        --reuse-image) reuse_image=true ;;
        --skip-secrets) skip_secrets=true ;;
        --skip-ses) skip_ses=true ;;
        *) printf 'Unknown deploy option: %s\n' "$arg" >&2; exit 2 ;;
      esac
    done
    [[ -f .env ]] || { echo 'Create and configure private .env before deployment.' >&2; exit 2; }
    for tool in node npm aws docker zip python3; do require_command "$tool"; done
    load_webwatch_env
    assert_region
    # This dependency upgrade needs all reviewed source locks before any AWS
    # identity/image operations, including staging's consolidated workflow.
    node scripts/dependency-locks.mjs
    node scripts/workflow-preflight.mjs "$@"
    node scripts/validate-iac.mjs
    node scripts/validate-cfn-schema.mjs
    # Discover an unrecoverable/in-progress stack before building or pushing an image.
    bash infra/scripts/assume-deployment-role.sh node "$ROOT/scripts/deployment-control.mjs" plan "$STACK_NAME" "$AWS_REGION" >/dev/null
    lock_args=()
    # Production cannot silently take the nondeterministic runtime install path.
    [[ "$STAGE" != prod ]] || lock_args+=(--require-locks)
    node infra/runtime/dependency-evidence.mjs check infra/runtime infra/docker/browser-worker "${lock_args[@]}"
    docker info >/dev/null
    docker buildx version >/dev/null
    assert_identity source
    node scripts/ensure-dependencies.mjs
    if [[ "$reuse_image" != true ]]; then
      CLOVERSIGHT_FRESH_WORKER_IMAGE=1 bash infra/scripts/build-worker-image.sh
      bash infra/scripts/merge-generated-env.sh .local/worker-image.env
    fi
    bash infra/scripts/deploy.sh
    bash infra/scripts/deploy-regional-captures.sh
    [[ "$skip_secrets" == true ]] || bash infra/scripts/push-secrets.sh
    bash infra/scripts/deploy-web.sh
    [[ "$skip_ses" == true ]] || bash infra/scripts/activate-ses-receiving.sh
    echo 'Deployment completed. Complete owner enrollment, SNS confirmation and release acceptance checks in docs/upgrade-0.5.20.md.'
    ;;
  help|--help|-h)
    echo 'Usage: bash scripts/platform.sh dev|bootstrap|deploy [--reuse-image] [--skip-secrets] [--skip-ses]'
    ;;
  *) echo 'Expected dev, bootstrap or deploy; see README.md.' >&2; exit 2 ;;
esac
