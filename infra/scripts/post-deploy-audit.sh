#!/usr/bin/env bash
# Read-only post-deploy/runtime health audit for CLOVERSIGHT.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
export AWS_PAGER=""

MODE="full"
IDENTITY_MODE="source"
STRICT=false
LOG_FILE=""
LOOKBACK_MINUTES=30
WEBWATCH_ORIGINAL_ARGS=("$@")

usage() {
  cat <<'EOF'
Usage: post-deploy-audit.sh [options]

Options:
  --full                  Comprehensive audit (default): includes drift, storage controls, and recent Lambda metrics.
  --quick                 Faster audit: skips drift, deep storage checks, and recent Lambda metrics.
  --strict                Return exit 2 if warnings are present (failures always return exit 1).
  --identity source       Use AWS_PROFILE/source SSO credentials (default; audit is read-only).
  --identity deployment   Assume AWS_DEPLOYMENT_ROLE_ARN before auditing.
  --lookback-minutes N    Lambda error/throttle lookback for full audits (default: 30).
  --log PATH              Override timestamped .local/audits log path.
  -h, --help              Show this help.
EOF
}

while (($#)); do
  case "$1" in
    --full) MODE="full" ;;
    --quick) MODE="quick" ;;
    --strict) STRICT=true ;;
    --identity) shift; [[ $# -gt 0 ]] || { echo '--identity requires source or deployment.' >&2; exit 64; }; IDENTITY_MODE="$1" ;;
    --lookback-minutes) shift; [[ $# -gt 0 ]] || { echo '--lookback-minutes requires an integer.' >&2; exit 64; }; LOOKBACK_MINUTES="$1" ;;
    --log) shift; [[ $# -gt 0 ]] || { echo '--log requires a path.' >&2; exit 64; }; LOG_FILE="$1" ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

[[ "$IDENTITY_MODE" == source || "$IDENTITY_MODE" == deployment ]] || { echo '--identity must be source or deployment.' >&2; exit 64; }
[[ "$LOOKBACK_MINUTES" =~ ^[1-9][0-9]*$ ]] || { echo '--lookback-minutes must be a positive integer.' >&2; exit 64; }

for tool in aws curl node; do require_command "$tool"; done
assert_region
if [[ "$IDENTITY_MODE" == deployment ]]; then ensure_deployment_role; fi

mkdir -p "$ROOT/.local/audits"
if [[ -z "$LOG_FILE" ]]; then LOG_FILE="$ROOT/.local/audits/${STACK_NAME}-audit-$(date -u +%Y%m%dT%H%M%SZ).log"; fi
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
chmod 600 "$LOG_FILE" 2>/dev/null || true
exec > >(tee -a "$LOG_FILE") 2>&1

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
INFO_COUNT=0
BILLING_DLQ_EMPTY=false
CHECK_DLQ_EMPTY=false
REPORT_DLQ_EMPTY=false
CAPTURE_DLQ_EMPTY=false
CAPTURE_RESULT_DLQ_EMPTY=false

info() { INFO_COUNT=$((INFO_COUNT+1)); printf '[INFO] %s\n' "$*"; }
pass() { PASS_COUNT=$((PASS_COUNT+1)); printf '[PASS] %s\n' "$*"; }
warn() { WARN_COUNT=$((WARN_COUNT+1)); printf '[WARN] %s\n' "$*"; }
fail() { FAIL_COUNT=$((FAIL_COUNT+1)); printf '[FAIL] %s\n' "$*"; }
section() { printf '\n===== %s =====\n' "$*"; }

awsq() {
  if [[ "$IDENTITY_MODE" == deployment ]]; then aws_active "$@"; else aws_source "$@"; fi
}

awsq_region() {
  local audit_region="$1"; shift
  if [[ "$IDENTITY_MODE" == deployment ]]; then
    command aws --region "$audit_region" "$@"
  elif [[ -n "${AWS_PROFILE:-}" ]]; then
    command aws --profile "$AWS_PROFILE" --region "$audit_region" "$@"
  else
    command aws --region "$audit_region" "$@"
  fi
}

aws_capture() {
  local __var="$1"; shift
  local __out __rc
  __out="$(awsq "$@" 2>&1)"; __rc=$?
  printf -v "$__var" '%s' "$__out"
  return "$__rc"
}

stack_output_audit() {
  awsq cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" --output text 2>/dev/null
}

cf_physical() {
  awsq cloudformation describe-stack-resource --stack-name "$STACK_NAME" --logical-resource-id "$1" --query 'StackResourceDetail.PhysicalResourceId' --output text 2>/dev/null
}

check_http() {
  local label="$1" url="$2" code headers host
  url="${url%/}"
  host="${url#*://}"; host="${host%%/*}"
  if command -v getent >/dev/null 2>&1; then
    if getent ahosts "$host" >/dev/null 2>&1; then pass "$label DNS resolves: $host"; else fail "$label DNS does not resolve: $host"; fi
  else
    info "$label DNS check skipped because getent is unavailable."
  fi
  code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 8 --max-time 20 "$url/" 2>/dev/null || true)"
  case "$code" in
    200) pass "$label HTTPS returned 200: $url" ;;
    301|302|303|307|308) [[ "$label" == 'Legacy customer' ]] && pass "$label HTTPS redirected with $code: $url" || warn "$label HTTPS redirected with $code: $url" ;;
    401|403) fail "$label HTTPS returned $code (possible WAF/auth policy issue from this audit network): $url" ;;
    000|'') fail "$label HTTPS was unreachable: $url" ;;
    5??) fail "$label HTTPS returned server error $code: $url" ;;
    *) warn "$label HTTPS returned $code: $url" ;;
  esac
  headers="$(curl -sSI --connect-timeout 8 --max-time 20 "$url/" 2>/dev/null | tr -d '\r' || true)"
  for header in strict-transport-security content-security-policy x-content-type-options x-frame-options; do
    if printf '%s\n' "$headers" | grep -qi "^${header}:"; then pass "$label security header present: $header"; else warn "$label security header missing: $header"; fi
  done
}

check_secret_metadata() {
  local label="$1" arn="$2" meta
  [[ -n "$arn" && "$arn" != None ]] || { warn "$label secret output is absent."; return; }
  if aws_capture meta secretsmanager describe-secret --secret-id "$arn" --query '[Name,LastChangedDate]' --output text; then pass "$label secret exists (value not read): $meta"; else warn "$label secret metadata unavailable: $meta"; fi
}

printf 'CLOVERSIGHT post-deploy/runtime health audit\n'
printf 'Started UTC: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf 'Root: %s\n' "$ROOT"
printf 'Stage: %s\n' "$STAGE"
printf 'Stack: %s\n' "$STACK_NAME"
printf 'Region: %s\n' "$AWS_REGION"
printf 'Mode: %s\n' "$MODE"
printf 'Identity mode: %s\n' "$IDENTITY_MODE"
printf 'Log: %s\n' "$LOG_FILE"

section 'Local deployment configuration'
if (cd "$ROOT" && node scripts/deployment-settings.mjs validate) >/tmp/webwatch-audit-settings.$$ 2>&1; then
  pass 'Local deployment settings validate.'
else
  fail "Local deployment settings validation failed: $(tr '\n' ' ' </tmp/webwatch-audit-settings.$$)"
fi
rm -f /tmp/webwatch-audit-settings.$$ 2>/dev/null || true

identity="" account=""
if aws_capture identity sts get-caller-identity --query Arn --output text && aws_capture account sts get-caller-identity --query Account --output text; then
  pass "AWS identity available: $identity ($account)"
  if [[ -n "${AWS_ACCOUNT_ID:-}" && "$account" != "$AWS_ACCOUNT_ID" ]]; then fail "AWS account mismatch: expected $AWS_ACCOUNT_ID, got $account"; fi
else
  fail "Unable to resolve AWS identity: $identity $account"
fi

section 'CloudFormation stack'
stack_status=""
if aws_capture stack_status cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text; then
  case "$stack_status" in CREATE_COMPLETE|UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE|IMPORT_COMPLETE) pass "Stack status is $stack_status." ;; *) fail "Stack is not in a healthy complete state: $stack_status" ;; esac
else
  fail "Stack cannot be described: $stack_status"
fi

resource_rows=""
if aws_capture resource_rows cloudformation list-stack-resources --stack-name "$STACK_NAME" --query 'StackResourceSummaries[].[LogicalResourceId,ResourceType,ResourceStatus,PhysicalResourceId]' --output text; then
  unhealthy="$(printf '%s\n' "$resource_rows" | awk 'NF>=3 && $3 !~ /^(CREATE_COMPLETE|UPDATE_COMPLETE|IMPORT_COMPLETE)$/ {print}')"
  if [[ -z "$unhealthy" ]]; then pass 'All current CloudFormation resources report complete states.'; else fail "Non-complete CloudFormation resources:\n$unhealthy"; fi
  info "CloudFormation resource count: $(printf '%s\n' "$resource_rows" | awk 'NF{n++} END{print n+0}')"
else
  fail "Unable to enumerate CloudFormation resources: $resource_rows"
fi

PUBLIC_URL="$(stack_output_audit PublicUrl || true)"
CUSTOMER_URL="$(stack_output_audit CustomerUrl || true)"
LEGACY_CUSTOMER_URL="$(stack_output_audit LegacyCustomerUrl || true)"
STEWARD_URL="$(stack_output_audit StewardUrl || true)"
API_URL="$(stack_output_audit ApiUrl || true)"
PUBLIC_DISTRIBUTION="$(stack_output_audit PublicDistributionId || true)"
CUSTOMER_DISTRIBUTION="$(stack_output_audit CustomerDistributionId || true)"
STEWARD_DISTRIBUTION="$(stack_output_audit StewardDistributionId || true)"
EDGE_WEB_ACL="$(stack_output_audit EdgeWebAclArn || true)"

section 'CloudFront, DNS, TLS, WAF, static applications'
for pair in "Public:$PUBLIC_DISTRIBUTION:$PUBLIC_URL" "Legacy customer:$CUSTOMER_DISTRIBUTION:$LEGACY_CUSTOMER_URL" "Steward:$STEWARD_DISTRIBUTION:$STEWARD_URL"; do
  label="${pair%%:*}"; rest="${pair#*:}"; dist="${rest%%:*}"; url="${rest#*:}"
  if [[ -z "$dist" || "$dist" == None ]]; then fail "$label distribution output missing."; continue; fi
  dstatus="" denabled="" dwaf=""
  if aws_capture dstatus cloudfront get-distribution --id "$dist" --query 'Distribution.Status' --output text; then
    [[ "$dstatus" == Deployed ]] && pass "$label CloudFront distribution $dist is Deployed." || warn "$label CloudFront distribution $dist status: $dstatus"
  else fail "$label CloudFront distribution cannot be read: $dstatus"; fi
  if aws_capture denabled cloudfront get-distribution --id "$dist" --query 'Distribution.DistributionConfig.Enabled' --output text; then
    [[ "$denabled" == True || "$denabled" == true ]] && pass "$label CloudFront distribution is enabled." || fail "$label CloudFront distribution is disabled."
  fi
  if aws_capture dwaf cloudfront get-distribution --id "$dist" --query 'Distribution.DistributionConfig.WebACLId' --output text; then
    if [[ -n "$EDGE_WEB_ACL" && "$EDGE_WEB_ACL" != None && "$dwaf" == "$EDGE_WEB_ACL" ]]; then pass "$label distribution uses the expected edge WAF ACL."; elif [[ -n "$dwaf" && "$dwaf" != None ]]; then warn "$label distribution has a WAF ACL but it differs from stack output: $dwaf"; else fail "$label distribution has no WAF ACL."; fi
  fi
  [[ -n "$url" && "$url" != None ]] && check_http "$label" "$url" || fail "$label URL output missing."
done
[[ -n "$CUSTOMER_URL" && "$CUSTOMER_URL" != None ]] && check_http 'Canonical customer app' "$CUSTOMER_URL" || fail 'Canonical customer app URL output missing.'
info 'A true WAF deny-path test must be performed from a non-allowlisted network; this audit can only verify the attached ACL and the current network path.'

if [[ -n "${CLOUDFRONT_CERTIFICATE_ARN:-}" ]]; then
  cert_status="" cert_expiry=""
  if aws_capture cert_status acm describe-certificate --certificate-arn "$CLOUDFRONT_CERTIFICATE_ARN" --query 'Certificate.Status' --output text; then
    [[ "$cert_status" == ISSUED ]] && pass 'CloudFront ACM certificate is ISSUED.' || fail "CloudFront ACM certificate status: $cert_status"
    if aws_capture cert_expiry acm describe-certificate --certificate-arn "$CLOUDFRONT_CERTIFICATE_ARN" --query 'Certificate.NotAfter' --output text; then info "CloudFront ACM certificate expiry: $cert_expiry"; fi
  else warn "Unable to inspect CloudFront ACM certificate: $cert_status"; fi
fi

section 'API Gateway reachability'
if [[ -n "$API_URL" && "$API_URL" != None ]]; then
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 8 --max-time 20 "$API_URL/" 2>/dev/null || true)"
  case "$api_code" in 2??|3??|4??) pass "API Gateway endpoint is reachable (HTTP $api_code); root-route status is not treated as an application health contract." ;; 000|'') fail 'API Gateway endpoint is unreachable.' ;; 5??) fail "API Gateway root returned HTTP $api_code." ;; *) warn "Unexpected API Gateway HTTP status: $api_code" ;; esac
else fail 'ApiUrl stack output is missing.'; fi
api_ids="$(printf '%s\n' "$resource_rows" | awk '$2=="AWS::ApiGatewayV2::Api"{print $4}')"
for api_id in $api_ids; do
  api_name=""
  if aws_capture api_name apigatewayv2 get-api --api-id "$api_id" --query 'Name' --output text; then pass "API Gateway v2 API exists: $api_name ($api_id)"; else fail "API Gateway API $api_id cannot be read: $api_name"; fi
  route_keys=""
  if aws_capture route_keys apigatewayv2 get-routes --api-id "$api_id" --query 'Items[].RouteKey' --output text; then
    if grep -Fq 'GET /api/checks/{jobId}' <<<"$route_keys"; then pass 'Persisted check-status route is deployed.'; else fail 'Persisted check-status route is missing; Check Now cannot update in real time.'; fi
    for required_route in 'ANY /api/team/{proxy+}' 'ANY /api/action-log' 'ANY /api/action-log/{proxy+}' 'ANY /api/reports' 'ANY /api/reports/{proxy+}'; do
      if grep -Fq "$required_route" <<<"$route_keys"; then pass "Application route is deployed: $required_route"; else fail "Application route is missing: $required_route"; fi
    done
    if [[ -n "${TWILIO_ACCOUNT_SID:-}" && -n "${TWILIO_AUTH_TOKEN:-}" && -n "${TWILIO_FROM:-}" ]]; then
      if grep -Fq 'POST /api/webhooks/twilio/inbound' <<<"$route_keys" && grep -Fq 'POST /api/webhooks/twilio/status' <<<"$route_keys"; then pass 'Twilio webhook routes are deployed for the enabled SMS capability.'; else fail 'Twilio is configured but one or more webhook routes are missing.'; fi
    else
      if grep -Fq '/api/webhooks/twilio/' <<<"$route_keys"; then fail 'Twilio webhook routes remain deployed while SMS is disabled.'; else pass 'Twilio webhook routes are omitted while SMS is disabled.'; fi
    fi
  else warn "API Gateway routes cannot be read: $route_keys"; fi
done

section 'Lambda functions and recent runtime signals'
lambda_rows="$(printf '%s\n' "$resource_rows" | awk '$2=="AWS::Lambda::Function"{print $1"\t"$4}')"
if [[ -z "$lambda_rows" ]]; then fail 'No Lambda functions were discovered in the stack.'; fi
START_TIME="$(date -u -d "-${LOOKBACK_MINUTES} minutes" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"
END_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
while IFS=$'\t' read -r logical fn; do
  [[ -n "$fn" ]] || continue
  cfg=""
  if aws_capture cfg lambda get-function-configuration --function-name "$fn" --query '[State,LastUpdateStatus,PackageType]' --output text; then
    state="$(awk '{print $1}' <<<"$cfg")"; update="$(awk '{print $2}' <<<"$cfg")"
    [[ "$state" == Active && "$update" == Successful ]] && pass "$logical Lambda is Active/Successful: $fn" || fail "$logical Lambda unhealthy: $fn => $cfg"
  else fail "$logical Lambda configuration unavailable: $cfg"; fi
  if [[ "$MODE" == full ]]; then
    errors="" throttles=""
    if aws_capture errors cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value="$fn" --start-time "$START_TIME" --end-time "$END_TIME" --period 300 --statistics Sum --query 'sum(Datapoints[].Sum)' --output text; then
      errors="${errors:-0}"; awk -v v="$errors" 'BEGIN{exit !(v+0>0)}' && warn "$logical had $errors Lambda errors in the last ${LOOKBACK_MINUTES}m." || pass "$logical had no Lambda errors in the last ${LOOKBACK_MINUTES}m."
    else warn "$logical Lambda error metric unavailable: $errors"; fi
    if aws_capture throttles cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Throttles --dimensions Name=FunctionName,Value="$fn" --start-time "$START_TIME" --end-time "$END_TIME" --period 300 --statistics Sum --query 'sum(Datapoints[].Sum)' --output text; then
      throttles="${throttles:-0}"; awk -v v="$throttles" 'BEGIN{exit !(v+0>0)}' && warn "$logical had $throttles Lambda throttles in the last ${LOOKBACK_MINUTES}m." || pass "$logical had no Lambda throttles in the last ${LOOKBACK_MINUTES}m."
    fi
  fi
done <<< "$lambda_rows"

section 'Regional capture stacks'
IFS=',' read -r -a audit_regions <<<"${REGIONAL_CHECK_REGIONS:-$AWS_REGION}"
for audit_region in "${audit_regions[@]}"; do
  audit_region="${audit_region//[[:space:]]/}"
  [[ -n "$audit_region" && "$audit_region" != "$AWS_REGION" ]] || continue
  regional_stack="webwatch-${STAGE}-regional-${audit_region}"
  regional_status="$(awsq_region "$audit_region" cloudformation describe-stacks --stack-name "$regional_stack" --query 'Stacks[0].StackStatus' --output text 2>&1)"; regional_rc=$?
  if [[ $regional_rc -ne 0 ]]; then fail "Regional stack cannot be described in $audit_region: $regional_status"; continue; fi
  case "$regional_status" in CREATE_COMPLETE|UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE|IMPORT_COMPLETE) pass "Regional stack in $audit_region is $regional_status." ;; *) fail "Regional stack in $audit_region is unhealthy: $regional_status" ;; esac
  regional_fn="webwatch-${STAGE}-regional-capture"
  regional_lambda="$(awsq_region "$audit_region" lambda get-function-configuration --function-name "$regional_fn" --query '[State,LastUpdateStatus]' --output text 2>&1)"; regional_rc=$?
  if [[ $regional_rc -eq 0 && "$(awk '{print $1 $2}' <<<"$regional_lambda")" == ActiveSuccessful ]]; then pass "Regional capture Lambda is Active/Successful in $audit_region."; else fail "Regional capture Lambda is unhealthy in $audit_region: $regional_lambda"; fi
  regional_queue_url="$(awsq_region "$audit_region" cloudformation describe-stacks --stack-name "$regional_stack" --query "Stacks[0].Outputs[?OutputKey=='CaptureQueueUrl'].OutputValue | [0]" --output text 2>&1)"; regional_rc=$?
  if [[ $regional_rc -eq 0 && "$regional_queue_url" == https://* ]]; then
    regional_queue_attrs="$(awsq_region "$audit_region" sqs get-queue-attributes --queue-url "$regional_queue_url" --attribute-names VisibilityTimeout RedrivePolicy ApproximateNumberOfMessages --query 'Attributes' --output json 2>&1)"; regional_rc=$?
    if [[ $regional_rc -eq 0 && "$regional_queue_attrs" == *'"VisibilityTimeout": "1200"'* && "$regional_queue_attrs" == *'deadLetterTargetArn'* ]]; then pass "Regional capture queue has the expected visibility timeout and DLQ in $audit_region."; else fail "Regional capture queue attributes are invalid in $audit_region: $regional_queue_attrs"; fi
  else fail "Regional capture queue output is unavailable in $audit_region: $regional_queue_url"; fi
  regional_dlq_url="$(awsq_region "$audit_region" cloudformation describe-stacks --stack-name "$regional_stack" --query "Stacks[0].Outputs[?OutputKey=='CaptureDeadLetterQueueUrl'].OutputValue | [0]" --output text 2>&1)"; regional_rc=$?
  if [[ $regional_rc -eq 0 && "$regional_dlq_url" == https://* ]]; then
    regional_dlq_visible="$(awsq_region "$audit_region" sqs get-queue-attributes --queue-url "$regional_dlq_url" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text 2>&1)"; regional_rc=$?
    if [[ $regional_rc -eq 0 && "$regional_dlq_visible" == 0 ]]; then pass "Regional capture DLQ is empty in $audit_region."; else fail "Regional capture DLQ contains or could not report messages in $audit_region: $regional_dlq_visible"; fi
  else fail "Regional capture DLQ output is unavailable in $audit_region: $regional_dlq_url"; fi
  regional_bucket="$(awsq_region "$audit_region" cloudformation describe-stacks --stack-name "$regional_stack" --query "Stacks[0].Outputs[?OutputKey=='CaptureBucketName'].OutputValue | [0]" --output text 2>&1)"; regional_rc=$?
  if [[ $regional_rc -eq 0 && -n "$regional_bucket" && "$regional_bucket" != None ]]; then
    regional_role="$(awsq_region "$audit_region" cloudformation describe-stack-resource --stack-name "$regional_stack" --logical-resource-id RegionalCaptureRole --query 'StackResourceDetail.PhysicalResourceId' --output text 2>&1)"; regional_rc=$?
    if [[ $regional_rc -eq 0 && -n "$regional_role" && "$regional_role" != None ]]; then
      regional_policy="$(awsq_region "$audit_region" iam get-role-policy --role-name "$regional_role" --policy-name CaptureRuntime --query 'PolicyDocument.Statement' --output json 2>&1)"; regional_rc=$?
      if [[ $regional_rc -eq 0 ]] && REGIONAL_BUCKET_ARN="arn:aws:s3:::${regional_bucket}" node -e 'const fs=require("fs"); const statements=JSON.parse(fs.readFileSync(0,"utf8")); process.exit(statements.some(s=>s.Effect==="Allow" && [s.Action].flat().includes("s3:ListBucket") && [s.Resource].flat().includes(process.env.REGIONAL_BUCKET_ARN))?0:1)' <<<"$regional_policy"; then
        pass "Regional capture role permits s3:ListBucket on its capture bucket in $audit_region."
      else
        fail "Regional capture role lacks a verifiable s3:ListBucket grant on its capture bucket in $audit_region. Redeploy this region with npm run aws:deploy-regional; IAM lookup: ${regional_policy:0:180}"
      fi
    else fail "Regional capture role cannot be resolved in $audit_region: $regional_role"; fi
    regional_encryption="$(awsq_region "$audit_region" s3api get-bucket-encryption --bucket "$regional_bucket" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>&1)"; regional_rc=$?
    [[ $regional_rc -eq 0 && "$regional_encryption" == AES256 ]] && pass "Regional capture bucket encryption is enabled in $audit_region." || fail "Regional capture bucket encryption check failed in $audit_region: $regional_encryption"
    if [[ "$MODE" == full ]]; then
      regional_lifecycle="$(awsq_region "$audit_region" s3api get-bucket-lifecycle-configuration --bucket "$regional_bucket" --query '[TransitionDefaultMinimumObjectSize,Rules[?Status==`Enabled`].[ID,Expiration.Days,Transitions]]' --output json 2>&1)"; regional_rc=$?
      if [[ $regional_rc -eq 0 && "$regional_lifecycle" == *all_storage_classes_128K* && "$regional_lifecycle" == *ExpireHistory7Days* && "$regional_lifecycle" == *TierHistoryIndefinite* && "$regional_lifecycle" == *GLACIER_IR* ]]; then pass "Regional capture lifecycle tiers and explicit 128 KB transition floor are installed in $audit_region."; else fail "Regional capture lifecycle rules are incomplete in $audit_region: $regional_lifecycle"; fi
    fi
  else fail "Regional capture bucket output is unavailable in $audit_region: $regional_bucket"; fi
done

CAPTURE_FN="$(printf '%s\n' "$lambda_rows" | awk '$1=="CaptureFunction"{print $2}')"
if [[ -n "$CAPTURE_FN" ]]; then
  resolved=""
  if aws_capture resolved lambda get-function --function-name "$CAPTURE_FN" --query 'Code.ResolvedImageUri' --output text; then
    expected_digest="${WORKER_IMAGE_URI##*@}"
    if [[ -n "$expected_digest" && "$resolved" == *"$expected_digest"* ]]; then pass "CaptureFunction resolves the configured worker digest: $expected_digest"; else warn "CaptureFunction resolved image differs from local WORKER_IMAGE_URI: $resolved"; fi
  else warn "CaptureFunction resolved image cannot be read: $resolved"; fi
fi

section 'SQS queues and DLQs'
queue_rows="$(printf '%s\n' "$resource_rows" | awk '$2=="AWS::SQS::Queue"{print $1"\t"$4}')"
while IFS=$'\t' read -r logical queue_physical; do
  [[ -n "$queue_physical" ]] || continue
  qurl="" attrs=""
  if [[ "$queue_physical" == https://* || "$queue_physical" == http://* ]]; then
    qurl="$queue_physical"
  elif ! aws_capture qurl sqs get-queue-url --queue-name "$queue_physical" --query 'QueueUrl' --output text; then
    fail "$logical queue URL unavailable: $qurl"
    continue
  fi
  qname="${qurl##*/}"
  if aws_capture attrs sqs get-queue-attributes --queue-url "$qurl" --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible ApproximateNumberOfMessagesDelayed VisibilityTimeout RedrivePolicy --query 'Attributes' --output json; then
    visible="$(awsq sqs get-queue-attributes --queue-url "$qurl" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text 2>/dev/null || echo '?')"
    if [[ "$logical" == *DeadLetter* || "$logical" == *Dlq* || "$logical" == *DLQ* ]]; then
      if [[ "$visible" =~ ^[0-9]+$ && "$visible" -gt 0 ]]; then
        fail "$logical contains $visible visible DLQ message(s): $qname"
        oldest_age=""
        if aws_capture oldest_age cloudwatch get-metric-statistics --namespace AWS/SQS --metric-name ApproximateAgeOfOldestMessage --dimensions Name=QueueName,Value="$qname" --start-time "$START_TIME" --end-time "$END_TIME" --period 300 --statistics Maximum --query 'sort_by(Datapoints,&Timestamp)[-1].Maximum' --output text && [[ -n "$oldest_age" && "$oldest_age" != None ]]; then
          info "$logical oldest visible message age is approximately ${oldest_age%.*} seconds."
        fi
      else
        pass "$logical is empty: $qname"
        [[ "$logical" == BillingDeadLetterQueue ]] && BILLING_DLQ_EMPTY=true
        [[ "$logical" == CheckDeadLetterQueue ]] && CHECK_DLQ_EMPTY=true
        [[ "$logical" == ReportDeadLetterQueue ]] && REPORT_DLQ_EMPTY=true
        [[ "$logical" == CaptureDeadLetterQueue ]] && CAPTURE_DLQ_EMPTY=true
        [[ "$logical" == CaptureResultDeadLetterQueue ]] && CAPTURE_RESULT_DLQ_EMPTY=true
      fi
    else
      pass "$logical is reachable; visible messages=$visible: $qname"
    fi
    info "$logical queue attributes: $attrs"
  else fail "$logical queue attributes unavailable: $attrs"; fi
done <<< "$queue_rows"

section 'Operational alert delivery'
ops_topic="$(stack_output_audit OpsTopicArn || true)"
if [[ -n "$ops_topic" && "$ops_topic" != None ]]; then
  ops_subscriptions="" deployed_technical_alerts=""
  if aws_capture ops_subscriptions sns list-subscriptions-by-topic --topic-arn "$ops_topic" --query "[length(Subscriptions[?starts_with(SubscriptionArn, 'arn:')]),length(Subscriptions[?SubscriptionArn=='PendingConfirmation'])]" --output text; then
    read -r confirmed_subscriptions pending_subscriptions <<< "$ops_subscriptions"
    aws_capture deployed_technical_alerts cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Parameters[?ParameterKey=='TechnicalAlertsEnabled'].ParameterValue | [0]" --output text || deployed_technical_alerts="unknown"
    if [[ "$confirmed_subscriptions" =~ ^[0-9]+$ && "$confirmed_subscriptions" -gt 0 ]]; then
      pass "OpsTopic has $confirmed_subscriptions confirmed notification destination(s)."
    elif [[ "$confirmed_subscriptions" == 0 && "$deployed_technical_alerts" == true ]]; then
      fail "Technical alerts are enabled but OpsTopic has no confirmed subscription (pending=${pending_subscriptions:-unknown}). Check TECHNICAL_ALERT_EMAIL in .env and confirm the AWS SNS email subscription; alarms and SES failure events cannot reach an operator yet."
    elif [[ "$confirmed_subscriptions" == 0 ]]; then
      warn "OpsTopic has no confirmed subscription (deployed TechnicalAlertsEnabled=$deployed_technical_alerts, pending=${pending_subscriptions:-unknown}). For operational email alerts, set TECHNICAL_ALERTS_ENABLED=true with your intended TECHNICAL_ALERT_EMAIL in .env, deploy the primary stack, and confirm the AWS SNS subscription email."
    else
      warn "OpsTopic subscription counts could not be interpreted: $ops_subscriptions"
    fi
  else
    warn "OpsTopic subscriptions could not be inspected: $ops_subscriptions"
  fi
else
  warn 'OpsTopicArn output is unavailable; operational alarm delivery cannot be verified.'
fi

section 'CloudWatch alarms and EventBridge rules'
alarm_rows=""
if aws_capture alarm_rows cloudwatch describe-alarms --alarm-name-prefix "webwatch-${STAGE}" --query 'MetricAlarms[].[AlarmName,StateValue]' --output text; then
  if [[ -z "$alarm_rows" ]]; then warn 'No CloudWatch metric alarms found for the stage prefix.'; else
    while read -r name state; do
      [[ -n "$name" ]] || continue
      case "$state" in
        OK) pass "Alarm OK: $name" ;;
        ALARM)
          alarm_detail=""
          if aws_capture alarm_detail cloudwatch describe-alarms --alarm-names "$name" --query 'MetricAlarms[0].[StateUpdatedTimestamp,StateReason]' --output text; then
            if { [[ "$name" == *BillingDlqAlarm* && "$BILLING_DLQ_EMPTY" == true ]] || [[ "$name" == *CheckDlqAlarm* && "$CHECK_DLQ_EMPTY" == true ]] || [[ "$name" == *ReportDlqAlarm* && "$REPORT_DLQ_EMPTY" == true ]] || [[ "$name" == *CaptureDlqAlarm* && "$CAPTURE_DLQ_EMPTY" == true ]] || [[ "$name" == *CaptureResultDlqAlarm* && "$CAPTURE_RESULT_DLQ_EMPTY" == true ]]; }; then
              warn "Alarm has not refreshed after its DLQ became empty: $name ($alarm_detail)"
            else
              fail "Alarm is ALARM: $name ($alarm_detail)"
            fi
          else
            fail "Alarm is ALARM: $name"
          fi
          ;;
        INSUFFICIENT_DATA) warn "Alarm has insufficient data: $name" ;;
        *) warn "Alarm $name has state $state" ;;
      esac
    done <<< "$alarm_rows"
  fi
else warn "CloudWatch alarms unavailable: $alarm_rows"; fi
rule_rows=""
if aws_capture rule_rows events list-rules --name-prefix "webwatch-${STAGE}" --query 'Rules[].[Name,State,ScheduleExpression]' --output text; then
  if [[ -z "$rule_rows" ]]; then warn 'No EventBridge rules found for the stage prefix.'; else
    while read -r name state schedule; do [[ -n "$name" ]] || continue; [[ "$state" == ENABLED ]] && pass "EventBridge rule enabled: $name ${schedule:-}" || fail "EventBridge rule not enabled: $name state=$state"; done <<< "$rule_rows"
  fi
else warn "EventBridge rules unavailable: $rule_rows"; fi

section 'DynamoDB tables and KMS'
table_rows="$(printf '%s\n' "$resource_rows" | awk '$2=="AWS::DynamoDB::Table"{print $1"\t"$4}')"
while IFS=$'\t' read -r logical table; do
  [[ -n "$table" ]] || continue
  tstatus=""
  if aws_capture tstatus dynamodb describe-table --table-name "$table" --query 'Table.TableStatus' --output text; then [[ "$tstatus" == ACTIVE ]] && pass "$logical DynamoDB table is ACTIVE: $table" || fail "$logical DynamoDB table status: $tstatus"; else fail "$logical DynamoDB table unavailable: $tstatus"; fi
done <<< "$table_rows"
key_rows="$(printf '%s\n' "$resource_rows" | awk '$2=="AWS::KMS::Key"{print $1"\t"$4}')"
while IFS=$'\t' read -r logical key; do
  [[ -n "$key" ]] || continue
  kstate=""
  if aws_capture kstate kms describe-key --key-id "$key" --query 'KeyMetadata.KeyState' --output text; then [[ "$kstate" == Enabled ]] && pass "$logical KMS key is Enabled." || fail "$logical KMS key state: $kstate"; else fail "$logical KMS key unavailable: $kstate"; fi
done <<< "$key_rows"

section 'S3 storage controls'
bucket_rows="$(printf '%s\n' "$resource_rows" | awk '$2=="AWS::S3::Bucket"{print $1"\t"$4}')"
while IFS=$'\t' read -r logical bucket; do
  [[ -n "$bucket" ]] || continue
  enc="" pab=""
  if aws_capture enc s3api get-bucket-encryption --bucket "$bucket" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text; then pass "$logical bucket encryption enabled ($enc): $bucket"; else fail "$logical bucket encryption unavailable/not configured: $enc"; fi
  if aws_capture pab s3api get-public-access-block --bucket "$bucket" --query 'PublicAccessBlockConfiguration.[BlockPublicAcls,IgnorePublicAcls,BlockPublicPolicy,RestrictPublicBuckets]' --output text; then
    if [[ "$(tr '\t' ' ' <<<"$pab")" == 'True True True True' || "$(tr '\t' ' ' <<<"$pab")" == 'true true true true' ]]; then pass "$logical bucket public access block is fully enabled."; else fail "$logical bucket public access block is not fully enabled: $pab"; fi
  else fail "$logical bucket public access block unavailable: $pab"; fi
  if [[ "$MODE" == full ]]; then
    lifecycle=""
    if aws_capture lifecycle s3api get-bucket-lifecycle-configuration --bucket "$bucket" --query '[TransitionDefaultMinimumObjectSize,Rules[?Status==`Enabled`].[ID,Expiration.Days,NoncurrentVersionExpiration.NoncurrentDays,Transitions]]' --output text; then
      [[ -n "$lifecycle" && "$lifecycle" != None ]] && info "$logical lifecycle rules: $lifecycle" || info "$logical has no enabled lifecycle rules."
      if [[ "$logical" == SnapshotBucket ]]; then
        printf '%s\n' "$lifecycle" | grep -Eq '(^|[[:space:]])92($|[[:space:]])' && pass 'SnapshotBucket includes the 90-day class plus its two-day lifecycle safety buffer.' || fail "SnapshotBucket does not show the required 92-day physical expiration: $lifecycle"
        printf '%s\n' "$lifecycle" | grep -Eq 'ExpireGeneratedReports[[:space:]]+7' && pass 'SnapshotBucket expires generated reports after seven days.' || fail "SnapshotBucket does not show the required seven-day report expiration: $lifecycle"
        printf '%s\n' "$lifecycle" | grep -q 'TierCaptureHistoryIndefinite' && printf '%s\n' "$lifecycle" | grep -q 'GLACIER_IR' && pass 'SnapshotBucket includes long-retention storage tiering.' || fail "SnapshotBucket long-retention tiering is incomplete: $lifecycle"
        printf '%s\n' "$lifecycle" | grep -q 'all_storage_classes_128K' && pass 'SnapshotBucket explicitly excludes sub-128 KB lifecycle transitions.' || fail "SnapshotBucket transition-size default is not explicit: $lifecycle"
        printf '%s\n' "$lifecycle" | grep -q 'CleanupReplacedBaselines' && pass 'SnapshotBucket cleans replaced baseline versions.' || fail "SnapshotBucket baseline version cleanup is missing: $lifecycle"
      fi
    else
      if grep -qi 'NoSuchLifecycleConfiguration' <<<"$lifecycle"; then [[ "$logical" == SnapshotBucket ]] && fail 'SnapshotBucket has no lifecycle configuration.' || info "$logical has no lifecycle configuration."; else warn "$logical lifecycle check unavailable: $lifecycle"; fi
    fi
  fi
done <<< "$bucket_rows"

section 'Cognito identity pools'
for pair in "Customer:$(stack_output_audit CustomerUserPoolId || true)" "Steward:$(stack_output_audit StewardUserPoolId || true)"; do
  label="${pair%%:*}"; pool="${pair#*:}"; [[ -n "$pool" && "$pool" != None ]] || { fail "$label user pool output missing."; continue; }
  pinfo=""
  if aws_capture pinfo cognito-idp describe-user-pool --user-pool-id "$pool" --query 'UserPool.[Name,MfaConfiguration,EstimatedNumberOfUsers]' --output text; then pass "$label Cognito user pool is readable: $pinfo"; mfa="$(awk '{print $2}' <<<"$pinfo")"; [[ "$label" == Steward && "$mfa" == OFF ]] && warn 'Steward MFA is OFF; acceptable only while intentionally configured for staging.'; else fail "$label Cognito user pool unavailable: $pinfo"; fi
done

section 'Secrets Manager metadata'
check_secret_metadata 'Stripe' "$(stack_output_audit StripeSecretArn || true)"
if [[ -n "${TWILIO_ACCOUNT_SID:-}" && -n "${TWILIO_AUTH_TOKEN:-}" && -n "${TWILIO_FROM:-}" ]]; then
  check_secret_metadata 'Twilio' "$(stack_output_audit TwilioSecretArn || true)"
else
  info 'Twilio is intentionally disabled; no Twilio stack output or runtime secret access is expected.'
fi
check_secret_metadata 'Response signing' "$(stack_output_audit ResponseSecretArn || true)"
check_secret_metadata 'CloudFront origin verification' "$(stack_output_audit OriginVerifySecretArn || true)"

section 'SES sending and inbound receiving'
ses_identity="$(stack_output_audit SesIdentity || true)"
if [[ -n "$ses_identity" && "$ses_identity" != None ]]; then
  ses_info=""
  if aws_capture ses_info sesv2 get-email-identity --email-identity "$ses_identity" --query '[VerifiedForSendingStatus,DkimAttributes.Status,MailFromAttributes.MailFromDomainStatus]' --output text; then
    verified="$(awk '{print $1}' <<<"$ses_info")"; dkim="$(awk '{print $2}' <<<"$ses_info")"; mailfrom="$(awk '{print $3}' <<<"$ses_info")"
    [[ "$verified" == True || "$verified" == true ]] && pass "SES identity verified for sending: $ses_identity" || warn "SES identity not yet verified for sending: $ses_info"
    [[ "$dkim" == SUCCESS ]] && pass 'SES DKIM status is SUCCESS.' || warn "SES DKIM status: $dkim"
    [[ "$mailfrom" == SUCCESS ]] && pass 'SES custom MAIL FROM status is SUCCESS.' || warn "SES custom MAIL FROM status: $mailfrom"
  else warn "SES identity check unavailable: $ses_info"; fi
fi
ses_account=""
if aws_capture ses_account sesv2 get-account --query '[SendingEnabled,ProductionAccessEnabled,EnforcementStatus]' --output text; then
  sending="$(awk '{print $1}' <<<"$ses_account")"; production="$(awk '{print $2}' <<<"$ses_account")"
  [[ "$sending" == True || "$sending" == true ]] && pass 'SES account sending is enabled.' || warn "SES account sending is disabled: $ses_account"
  [[ "$production" == True || "$production" == true ]] && pass 'SES production access is enabled.' || warn 'SES is in sandbox: alerts to unverified customer recipients will be rejected. Verify each staging recipient or request production access.'
else warn "SES account status unavailable: $ses_account"; fi
expected_ruleset="$(stack_output_audit SesReceiptRuleSetOutput || true)"
active_ruleset=""
if aws_capture active_ruleset ses describe-active-receipt-rule-set --query 'Metadata.Name' --output text; then
  if [[ -n "$expected_ruleset" && "$expected_ruleset" != None && "$active_ruleset" == "$expected_ruleset" ]]; then pass "SES active receipt rule set matches stack output: $active_ruleset"; elif [[ "$active_ruleset" == None || -z "$active_ruleset" ]]; then warn "No SES receipt rule set is active; run aws:activate-ses when ready for inbound replies."; else warn "SES active receipt rule set is $active_ruleset; expected $expected_ruleset"; fi
else warn "SES active receipt rule set unavailable: $active_ruleset"; fi

if [[ "$MODE" == full ]]; then
  section 'CloudFormation drift'
  drift_id=""
  if aws_capture drift_id cloudformation detect-stack-drift --stack-name "$STACK_NAME" --query 'StackDriftDetectionId' --output text; then
    info "Started drift detection: $drift_id"
    detection="" drift="UNKNOWN"
    for _ in $(seq 1 60); do
      row=""
      if aws_capture row cloudformation describe-stack-drift-detection-status --stack-drift-detection-id "$drift_id" --query '[DetectionStatus,StackDriftStatus]' --output text; then
        detection="$(awk '{print $1}' <<<"$row")"; drift="$(awk '{print $2}' <<<"$row")"
        [[ "$detection" != DETECTION_IN_PROGRESS ]] && break
      fi
      sleep 5
    done
    case "$detection:$drift" in
      DETECTION_COMPLETE:IN_SYNC) pass 'CloudFormation drift status is IN_SYNC.' ;;
      DETECTION_COMPLETE:DRIFTED)
        fail 'CloudFormation stack is DRIFTED.'
        if aws_capture drifted cloudformation describe-stack-resource-drifts --stack-name "$STACK_NAME" --stack-resource-drift-status-filters MODIFIED DELETED --query 'StackResourceDrifts[].{LogicalResourceId:LogicalResourceId,ResourceType:ResourceType,Status:StackResourceDriftStatus,Differences:PropertyDifferences}' --output json; then
          info "Drifted resource details: ${drifted:-unavailable}"
        else
          info "Drifted resource details unavailable: ${drifted:-unknown error}"
        fi
        ;;
      DETECTION_FAILED:*)
        drift_reason=""
        aws_capture drift_reason cloudformation describe-stack-drift-detection-status --stack-drift-detection-id "$drift_id" --query 'DetectionStatusReason' --output text || true
        fail "CloudFormation drift detection failed: ${drift_reason:-reason unavailable}"
        ;;
      DETECTION_COMPLETE:*) warn "CloudFormation drift status: $drift" ;;
      DETECTION_IN_PROGRESS:*) warn "CloudFormation drift detection did not complete in the audit window: $detection $drift" ;;
      *) warn "CloudFormation drift detection returned an unexpected state: $detection $drift" ;;
    esac
  else warn "Unable to start CloudFormation drift detection: $drift_id"; fi
fi

section 'Audit summary'
printf 'Completed UTC: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf 'PASS=%d WARN=%d FAIL=%d INFO=%d\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT" "$INFO_COUNT"
printf 'Log file: %s\n' "$LOG_FILE"
if ((FAIL_COUNT > 0)); then printf 'RESULT=FAIL\n'; exit 1; fi
if [[ "$STRICT" == true && "$WARN_COUNT" -gt 0 ]]; then printf 'RESULT=WARN_STRICT\n'; exit 2; fi
printf 'RESULT=PASS\n'
exit 0
