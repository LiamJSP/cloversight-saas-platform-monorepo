#!/usr/bin/env bash
# Read-only AWS evidence collector. Python is standard-library only; no project code runs.
# Every AWS request explicitly selects the source SSO profile. Nothing is deployed/invoked.
set -euo pipefail
umask 077
command -v aws >/dev/null 2>&1 || { printf 'AWS CLI v2 is required.\n' >&2; exit 64; }
command -v python3 >/dev/null 2>&1 || { printf 'Python 3.9+ is required.\n' >&2; exit 64; }
export AWS_PAGER="" AWS_CLI_AUTO_PROMPT=off
python3 - "${BASH_SOURCE[0]}" "$@" <<'PYTHON'
import argparse
import collections
import datetime as dt
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import zipfile

UTC = dt.timezone.utc
SCRIPT_PATH = Path(sys.argv.pop(1)).resolve()
DEFAULT_REGIONS = 'us-east-1,us-east-2,us-west-2,ca-central-1,eu-west-1'
CONFIG_KEYS = {'STAGE', 'STACK_NAME', 'AWS_REGION', 'AWS_ACCOUNT_ID', 'BOOTSTRAP_STACK_NAME', 'REGIONAL_CHECK_REGIONS', 'SES_REGION', 'SES_FROM_ADDRESS', 'SES_RECEIPT_RULE_SET_NAME', 'WORKER_ECR_REPOSITORY'}


def local_defaults(root):
    # Parse only literal allowlisted settings. Never source/evaluate .env or save its contents.
    settings = {}
    path = root / '.env'
    if path.is_file():
        for line in path.read_text(encoding='utf-8').splitlines():
            match = re.match(r'^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$', line)
            if not match or match[1] not in CONFIG_KEYS:
                continue
            value = match[2]
            if value[:1] in {'"', "'"}:
                quote = value[0]
                end = value.find(quote, 1)
                value = value[1:end] if end >= 1 else ''
            else:
                value = re.split(r'\s+#', value, maxsplit=1)[0].strip()
            if value and not any(c in value for c in ('$', '`', '\n', '\r')):
                settings[match[1]] = value
    for key in CONFIG_KEYS:
        if os.environ.get(key):
            settings[key] = os.environ[key]
    return settings


def timestamp(value):
    try:
        parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            raise ValueError('include Z or a timezone offset')
        return parsed.astimezone(UTC)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f'Invalid ISO timestamp {value!r}: {exc}') from exc


def iso(value):
    return value.astimezone(UTC).isoformat(timespec='seconds').replace('+00:00', 'Z')


parser = argparse.ArgumentParser(description='Collect app-scoped AWS audit evidence into a ZIP using read-only APIs. Requires AWS CLI v2 and Python 3.9+.')
parser.add_argument('--project-root', type=Path, help='Project directory containing private .env; defaults to this repository or the working directory.')
parser.add_argument('--profile', default='saas-admin')
parser.add_argument('--stack', help='Primary stack; defaults to STACK_NAME or webwatch-staging.')
parser.add_argument('--stage', help='Stage for regional stack discovery; defaults to STAGE or staging.')
parser.add_argument('--region', help='Primary region; defaults to AWS_REGION or us-east-1.')
parser.add_argument('--regions', help='Comma-separated regions; defaults to REGIONAL_CHECK_REGIONS plus primary region.')
parser.add_argument('--regional-stack-prefix', help='Regional stack prefix; defaults to webwatch-STAGE-regional-.')
parser.add_argument('--expected-account', help='Refuse a different AWS account; defaults to AWS_ACCOUNT_ID when set.')
parser.add_argument('--hours', type=float, default=24, help='Lookback in hours (default: 24); ignored with --since.')
parser.add_argument('--since', type=timestamp, help='Inclusive UTC/offset start, e.g. 2026-10-08T00:00:00Z.')
parser.add_argument('--until', type=timestamp, help='UTC/offset end; defaults to collection start time.')
parser.add_argument('--output-dir', type=Path, help='Output directory; defaults to PROJECT/.local/cloud-audits.')
parser.add_argument('--max-log-events', type=int, default=0, help='Per-log-group event cap; 0 collects all pages (default). Truncation is recorded.')
parser.add_argument('--cloudtrail-mode', choices=('changes', 'all', 'off'), default='changes', help='History selection: changes uses AWS ReadOnly=false filtering (default); all includes reads; off skips history.')
parser.add_argument('--max-cloudtrail-pages', type=int, default=5, help='Per-region 50-event page cap (default: 5, at most 250 examined events); 0 removes the page cap.')
parser.add_argument('--cloudtrail-budget-seconds', type=int, default=60, help='Shared time budget for event-history scanning across all regions (default: 60); 0 disables this budget.')
parser.add_argument('--skip-cloudtrail', action='store_true', help='Skip CloudTrail event-history collection, but still inspect trail configuration.')
parser.add_argument('--include-s3-access-logs', action='store_true', help='Download text log objects only from discovered CloudFront/WAF/S3 logging destinations, by delivery time.')
parser.add_argument('--max-s3-log-objects', type=int, default=1000, help='Maximum downloaded S3 log objects per destination (default: 1000); 0 means no cap.')
parser.add_argument('--timeout-seconds', type=int, default=120, help='Timeout per AWS CLI call/page (default: 120).')
args = parser.parse_args()
if sys.version_info < (3, 9):
    parser.error('Python 3.9+ is required.')
if min(args.max_log_events, args.max_cloudtrail_pages, args.max_s3_log_objects, args.cloudtrail_budget_seconds) < 0 or args.timeout_seconds < 10 or not math.isfinite(args.hours) or args.hours <= 0:
    parser.error('Caps must be nonnegative; timeout must be >=10 seconds; hours must be positive and finite.')
repo_root = SCRIPT_PATH.parents[2] if SCRIPT_PATH.parent.name == 'scripts' and SCRIPT_PATH.parent.parent.name == 'infra' else Path.cwd()
root = (args.project_root or repo_root).resolve()
cfg = local_defaults(root)
stage = args.stage or cfg.get('STAGE', 'staging')
primary = args.region or cfg.get('AWS_REGION', 'us-east-1')
stack_name = args.stack or cfg.get('STACK_NAME', f'webwatch-{stage}')
regional_prefix = args.regional_stack_prefix or f'webwatch-{stage}-regional-'
regions = sorted(set([primary] + [x.strip() for x in (args.regions or cfg.get('REGIONAL_CHECK_REGIONS', DEFAULT_REGIONS)).split(',') if x.strip()]))
expected_account = args.expected_account or cfg.get('AWS_ACCOUNT_ID')
now = dt.datetime.now(UTC).replace(microsecond=0)
end = args.until or now
try:
    start = args.since or end - dt.timedelta(hours=args.hours)
except OverflowError:
    parser.error('Lookback is too large.')
if start >= end or end > now:
    parser.error('The start must precede the end, and the end cannot be in the future.')
if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]*', stack_name) or not re.fullmatch(r'[A-Za-z0-9-]+', regional_prefix):
    parser.error('Use stack names and a regional name prefix, not stack ARNs.')
for region in regions:
    if not re.fullmatch(r'[a-z]{2}(?:-[a-z]+)+-\d+', region):
        parser.error(f'Invalid region: {region}')
output_dir = (args.output_dir or root / '.local' / 'cloud-audits').resolve()
output_dir.mkdir(parents=True, exist_ok=True)
work = Path(tempfile.mkdtemp(prefix=f'{stack_name}-audit-{now.strftime("%Y%m%dT%H%M%SZ")}-', dir=output_dir))
archive = work.with_suffix('.zip')
os.chmod(work, 0o700)
env = os.environ.copy()
env.update(AWS_PAGER='', AWS_CLI_AUTO_PROMPT='off', AWS_RETRY_MODE='standard', AWS_MAX_ATTEMPTS='4')
# Explicit --profile must not accidentally use leftover assumed-role environment credentials.
for key in ('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_SECURITY_TOKEN'):
    env.pop(key, None)
calls = []
gaps = []
findings = []
resources = []
stacks = []
hosted_zones = set()
domain_names = set()
log_groups = {}
log_summaries = []
cloudtrail_summaries = []
s3_destinations = {}
metric_requests = collections.defaultdict(dict)
scoped_values = collections.defaultdict(set)
all_ids = {stack_name, regional_prefix.rstrip('-')}
identity = {}
technical_alerts_enabled = None

SENSITIVE_KEYS = {'password', 'temporarypassword', 'clientsecret', 'secretstring', 'secretbinary', 'secretaccesskey', 'awssecretaccesskey', 'sessiontoken', 'accesskeyid', 'awsaccesskeyid', 'accesstoken', 'idtoken', 'refreshtoken', 'authorization', 'cookie', 'cookies', 'setcookie', 'headervalue', 'privatekey', 'credentials', 'credential', 'xamzsignature', 'xamzsecuritytoken', 'stripe_secret_key', 'stripe_webhook_secret', 'twilio_auth_token', 'price_integrity_secret', 'originverifysecret', 'responsesecret'}
SECRET_NAME = re.compile(r'password|secret|token|credential|private.?key|origin.?verify', re.I)


def scrub_text(value):
    value = re.sub(r'(?i)(X-Amz-(?:Signature|Security-Token|Credential)|access_token|id_token|refresh_token|client_secret|password)=([^&\s"<>]+)', r'\1=[REDACTED]', value)
    value = re.sub(r'(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*', 'Bearer [REDACTED]', value)
    value = re.sub(r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b', '[REDACTED JWT]', value)
    value = re.sub(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b', '[REDACTED ACCESS KEY]', value)
    value = re.sub(r'\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+\b', '[REDACTED PAYMENT KEY]', value)
    return value


def scrub(value):
    if isinstance(value, dict):
        result = {}
        secret_setting = value.get('ParameterKey') or value.get('Key') or value.get('Name')
        header_name = str(value.get('name') or value.get('Name') or '').lower()
        for key, item in value.items():
            normalized = re.sub(r'[^a-z0-9_]', '', key.lower())
            hide_value = key in {'ParameterValue', 'Value', 'value'} and secret_setting and SECRET_NAME.search(str(secret_setting))
            hide_header = key.lower() == 'value' and (header_name in {'authorization', 'cookie', 'set-cookie', 'x-api-key'} or 'origin-verify' in header_name)
            result[key] = '[REDACTED]' if normalized in SENSITIVE_KEYS or hide_value or hide_header else scrub(item)
        return result
    if isinstance(value, list):
        return [scrub(item) for item in value]
    if isinstance(value, str):
        candidate = value.strip()
        if candidate.startswith(('{', '[')):
            try:
                return json.dumps(scrub(json.loads(candidate)), ensure_ascii=False)
            except (ValueError, RecursionError):
                pass
        # Lambda text logs prepend metadata to console JSON. Scrub secret keys
        # inside the body as well as token/query patterns in the original line.
        body_start = value.find('{')
        if body_start > 0:
            try:
                body = json.loads(value[body_start:])
                return scrub_text(value[:body_start]) + json.dumps(scrub(body), ensure_ascii=False)
            except (ValueError, RecursionError):
                pass
        return scrub_text(value)
    return value


def safe_name(value):
    text = re.sub(r'[^A-Za-z0-9._-]+', '_', str(value)).strip('._')[:100] or 'resource'
    return text + '-' + hashlib.sha256(str(value).encode()).hexdigest()[:10]


def save(relative, value):
    path = work / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(scrub(value), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def gap(kind, detail, **fields):
    gaps.append({'kind': kind, 'detail': detail, **fields})


def finding(kind, detail, **fields):
    findings.append({'kind': kind, 'detail': detail, **fields})


def aws(region, service, operation, payload=None, relative=None, query=None, page=False, expected=(), timeout_seconds=None):
    command = ['aws', '--profile', args.profile, '--region', region, '--no-cli-pager', '--color', 'off', '--output', 'json', '--cli-connect-timeout', '10', '--cli-read-timeout', '60', service, operation]
    if payload:
        command += ['--cli-input-json', json.dumps(payload, separators=(',', ':'))]
    if query:
        command += ['--query', query]
    if page:
        command.append('--no-paginate')
    began = time.monotonic()
    record = {'time': iso(dt.datetime.now(UTC)), 'region': region, 'service': service, 'operation': operation, 'request': scrub(payload or {}), 'output': str(relative) if relative else None}
    try:
        result = subprocess.run(command, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout_seconds if timeout_seconds is not None else args.timeout_seconds, check=False)
        if result.returncode:
            message = scrub_text(result.stderr.strip())
            code_match = re.search(r'\(([^)]+)\) when calling', message)
            code = code_match[1] if code_match else 'CLI_ERROR'
            record.update(status='absent' if code in expected else 'failed', exitCode=result.returncode, errorCode=code, error=message)
            if code not in expected:
                gap('aws_request_failed', message[:2500], region=region, service=service, operation=operation, output=relative)
                print(f'  ! {region} {service} {operation}: {code}', flush=True)
            if relative:
                save(str(relative) + '.error.json', record)
            return None
        try:
            data = json.loads(result.stdout) if result.stdout.strip() else {}
        except ValueError:
            raise RuntimeError('AWS CLI returned invalid JSON; output was not included.')
        record['status'] = 'ok'
        if result.stderr.strip():
            record['warning'] = scrub_text(result.stderr.strip())
        if relative:
            save(relative, data)
        return data
    except (subprocess.TimeoutExpired, OSError, RuntimeError) as exc:
        record.update(status='failed', error=type(exc).__name__ + ': ' + str(exc))
        gap('aws_request_failed', record['error'], region=region, service=service, operation=operation, output=relative)
        if relative:
            save(str(relative) + '.error.json', record)
        return None
    finally:
        record['seconds'] = round(time.monotonic() - began, 3)
        calls.append(record)
        with (work / 'commands.ndjson').open('a', encoding='utf-8') as handle:
            handle.write(json.dumps(scrub(record), ensure_ascii=False) + '\n')


def metric(region, namespace, name, dimensions, stats=('Sum', 'Maximum'), period=None):
    dimensions = sorted(dimensions, key=lambda d: d['Name'])
    if period is None:
        age_days = (now - start).total_seconds() / 86400
        period = 3600 if age_days > 63 else 300
    for stat in stats:
        item = {'MetricStat': {'Metric': {'Namespace': namespace, 'MetricName': name, 'Dimensions': dimensions}, 'Period': period, 'Stat': stat}, 'ReturnData': True}
        metric_requests[region][json.dumps(item, sort_keys=True)] = item


def register_log(region, name, source):
    if not name:
        return
    if name.startswith('arn:') and ':log-group:' in name:
        region = name.split(':')[3]
        name = name.split(':log-group:', 1)[1].removesuffix(':*')
    if ':' in name or not re.fullmatch(r'[.\-_/A-Za-z0-9#]+', name):
        gap('unrecognized_log_destination', str(name), source=source)
        return
    log_groups.setdefault((region, name), set()).add(source)


def discover_destinations(value, source):
    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, str) and item.startswith('arn:') and ':log-group:' in item:
                register_log(item.split(':')[3], item, source)
            elif isinstance(item, str) and ':deliverystream/' in item:
                gap('firehose_delivery_not_exported', item, source=source)
            discover_destinations(item, source)
    elif isinstance(value, list):
        for item in value:
            discover_destinations(item, source)


def stack(region, name, required=False):
    global technical_alerts_enabled
    base = f'configuration/{region}/stacks/{safe_name(name)}'
    details = aws(region, 'cloudformation', 'describe-stacks', {'StackName': name}, base + '/stack.json')
    if not details or not details.get('Stacks'):
        if required:
            raise RuntimeError(f'Cannot read required stack {name}. Check the profile, account, region and stack name.')
        return []
    current = details['Stacks'][0]
    parameters = {p['ParameterKey']: p.get('ParameterValue', '') for p in current.get('Parameters', [])}
    if required:
        technical_alerts_enabled = parameters.get('TechnicalAlertsEnabled', '').lower() == 'true'
    if parameters.get('HostedZoneId'):
        hosted_zones.add(parameters['HostedZoneId'])
    for key, value in parameters.items():
        if key.endswith('DomainName') and value and value != '****':
            domain_names.add(value.rstrip('.').lower())
    if required and not args.regions and parameters.get('AvailableCheckRegions'):
        # CloudFormation is the authoritative deployed region list, even when no .env is present.
        regions[:] = sorted(set(regions + [r.strip() for r in parameters['AvailableCheckRegions'].split(',') if r.strip()]))
    stacks.append({'region': region, 'name': name, 'id': current.get('StackId'), 'status': current.get('StackStatus')})
    all_ids.update([name, current.get('StackId', name)])
    if not current.get('StackStatus', '').endswith('_COMPLETE') or 'ROLLBACK' in current.get('StackStatus', ''):
        finding('stack_status', current.get('StackStatus'), region=region, stack=name)
    aws(region, 'cloudformation', 'describe-stack-events', {'StackName': name}, base + '/events.json')
    aws(region, 'cloudformation', 'describe-stack-resource-drifts', {'StackName': name}, base + '/last-recorded-drift.json')
    result = aws(region, 'cloudformation', 'list-stack-resources', {'StackName': name}, base + '/resources.json') or {}
    rows = result.get('StackResourceSummaries', [])
    for row in rows:
        if not row.get('PhysicalResourceId') or row.get('ResourceStatus') == 'DELETE_COMPLETE':
            continue
        item = {'region': region, 'stack': name, **row}
        resources.append(item)
        all_ids.add(row['PhysicalResourceId'])
        if row.get('ResourceType') == 'AWS::CloudFormation::Stack':
            stack(region, row['PhysicalResourceId'])
    return rows


def inspect_resources():
    seen = set()
    role_names = set()
    image_refs = set()
    certificates = set()
    for row in resources:
        region, kind, physical, logical = row['region'], row['ResourceType'], row['PhysicalResourceId'], row['LogicalResourceId']
        if (region, kind, physical) in seen:
            continue
        seen.add((region, kind, physical))
        base = f'configuration/{region}/resources/{safe_name(logical + "-" + physical)}'
        print(f'Inspecting {region} {logical} ({kind})', flush=True)
        if kind == 'AWS::Logs::LogGroup':
            register_log(region, physical, logical)
        elif kind == 'AWS::Lambda::Function':
            scoped_values[region].add(physical)
            register_log(region, '/aws/lambda/' + physical, logical)
            query = '{FunctionName:FunctionName,FunctionArn:FunctionArn,Runtime:Runtime,Role:Role,Handler:Handler,CodeSize:CodeSize,CodeSha256:CodeSha256,Description:Description,Timeout:Timeout,MemorySize:MemorySize,LastModified:LastModified,Version:Version,VpcConfig:VpcConfig,TracingConfig:TracingConfig,RevisionId:RevisionId,Layers:Layers,State:State,StateReason:StateReason,StateReasonCode:StateReasonCode,LastUpdateStatus:LastUpdateStatus,LastUpdateStatusReason:LastUpdateStatusReason,LastUpdateStatusReasonCode:LastUpdateStatusReasonCode,PackageType:PackageType,Architectures:Architectures,EphemeralStorage:EphemeralStorage,LoggingConfig:LoggingConfig,RuntimeVersionConfig:RuntimeVersionConfig,Environment:{Error:Environment.Error,Variables:Environment.Variables.{APP_ENV:APP_ENV,LOG_LEVEL:LOG_LEVEL,AVAILABLE_CHECK_REGIONS:AVAILABLE_CHECK_REGIONS,CAPTURE_WIDTH:CAPTURE_WIDTH,CAPTURE_HEIGHT:CAPTURE_HEIGHT,CAPTURE_TIMEOUT_MS:CAPTURE_TIMEOUT_MS,MAX_PAGE_BYTES:MAX_PAGE_BYTES,ALLOWED_PRIVATE_TARGETS:ALLOWED_PRIVATE_TARGETS,CAPTURE_BUCKET_NAME:CAPTURE_BUCKET_NAME,SNAPSHOT_BUCKET_NAME:SNAPSHOT_BUCKET_NAME,SNAPSHOT_BUCKET_REGION:SNAPSHOT_BUCKET_REGION,LEGACY_SNAPSHOT_BUCKET_NAME:LEGACY_SNAPSHOT_BUCKET_NAME,LEGACY_SNAPSHOT_BUCKET_REGION:LEGACY_SNAPSHOT_BUCKET_REGION,CAPTURE_RESULT_QUEUE_URL:CAPTURE_RESULT_QUEUE_URL,CAPTURE_RESULT_QUEUE_REGION:CAPTURE_RESULT_QUEUE_REGION,EMAIL_PROVIDER:EMAIL_PROVIDER,SES_REGION:SES_REGION,SES_FROM_ADDRESS:SES_FROM_ADDRESS,SES_CONFIGURATION_SET:SES_CONFIGURATION_SET,SMS_PROVIDER:SMS_PROVIDER,ORIGIN_VERIFY_REVISION:ORIGIN_VERIFY_REVISION}}}'
            config = aws(region, 'lambda', 'get-function-configuration', {'FunctionName': physical}, base + '/function.json', query=query) or {}
            register_log(region, (config.get('LoggingConfig') or {}).get('LogGroup'), logical)
            if config.get('Role'):
                role_names.add(config['Role'].split('/')[-1])
            if config.get('State') not in {None, 'Active'} or config.get('LastUpdateStatus') not in {None, 'Successful'}:
                finding('lambda_status', 'Function is not active or its latest update was unsuccessful.', region=region, function=physical, state=config.get('State'), update=config.get('LastUpdateStatus'))
            image = aws(region, 'lambda', 'get-function', {'FunctionName': physical}, base + '/deployment.json', query='{Code:{ImageUri:Code.ImageUri,ResolvedImageUri:Code.ResolvedImageUri},Concurrency:Concurrency,Tags:Tags,Configuration:{Version:Configuration.Version,CodeSha256:Configuration.CodeSha256,LastModified:Configuration.LastModified,RevisionId:Configuration.RevisionId}}') or {}
            uri = image.get('Code', {}).get('ResolvedImageUri') or image.get('Code', {}).get('ImageUri')
            if uri and '@sha256:' in uri:
                image_refs.add((region, uri))
            aws(region, 'lambda', 'get-function-concurrency', {'FunctionName': physical}, base + '/concurrency.json')
            mappings = aws(region, 'lambda', 'list-event-source-mappings', {'FunctionName': physical}, base + '/event-source-mappings.json') or {}
            for mapping in mappings.get('EventSourceMappings', []):
                if mapping.get('State') != 'Enabled':
                    finding('event_source_mapping_state', mapping.get('State'), region=region, function=physical, mapping=mapping.get('UUID'), reason=mapping.get('StateTransitionReason'))
            aws(region, 'lambda', 'get-policy', {'FunctionName': physical}, base + '/resource-policy.json', expected=('ResourceNotFoundException',))
            dims = [{'Name': 'FunctionName', 'Value': physical}]
            for name in ('Invocations', 'Errors', 'Throttles', 'ConcurrentExecutions', 'AsyncEventsDropped', 'AsyncEventAge'):
                metric(region, 'AWS/Lambda', name, dims)
            metric(region, 'AWS/Lambda', 'Duration', dims, ('Average', 'Maximum'))
        elif kind == 'AWS::SQS::Queue':
            attributes = aws(region, 'sqs', 'get-queue-attributes', {'QueueUrl': physical, 'AttributeNames': ['All']}, base + '/queue.json') or {}
            name = physical.rstrip('/').split('/')[-1]
            scoped_values[region].add(name)
            for name_key in ('ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesDelayed'):
                count = attributes.get('Attributes', {}).get(name_key)
                if count and int(count) > 0 and ('DeadLetter' in logical or 'dlq' in name.lower()):
                    finding('nonempty_dlq', 'Dead-letter queue has messages; none were received or deleted.', region=region, queue=name, attribute=name_key, count=int(count))
            dims = [{'Name': 'QueueName', 'Value': name}]
            for item in ('ApproximateNumberOfMessagesVisible', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesDelayed', 'ApproximateAgeOfOldestMessage', 'NumberOfMessagesSent', 'NumberOfMessagesReceived', 'NumberOfMessagesDeleted', 'NumberOfEmptyReceives'):
                metric(region, 'AWS/SQS', item, dims)
        elif kind == 'AWS::DynamoDB::Table':
            scoped_values[region].add(physical)
            aws(region, 'dynamodb', 'describe-table', {'TableName': physical}, base + '/table.json')
            aws(region, 'dynamodb', 'describe-continuous-backups', {'TableName': physical}, base + '/backups.json')
            aws(region, 'dynamodb', 'describe-time-to-live', {'TableName': physical}, base + '/ttl.json')
            dims = [{'Name': 'TableName', 'Value': physical}]
            for name in ('ReadThrottleEvents', 'WriteThrottleEvents', 'ConsumedReadCapacityUnits', 'ConsumedWriteCapacityUnits'):
                metric(region, 'AWS/DynamoDB', name, dims)
        elif kind == 'AWS::S3::Bucket':
            scoped_values[region].add(physical)
            for operation in ('get-bucket-versioning', 'get-bucket-encryption', 'get-bucket-lifecycle-configuration', 'get-public-access-block', 'get-bucket-policy-status', 'get-bucket-policy', 'get-bucket-logging', 'get-bucket-notification-configuration'):
                result = aws(region, 's3api', operation, {'Bucket': physical, 'ExpectedBucketOwner': identity['Account']}, base + '/' + operation + '.json', expected=('NoSuchLifecycleConfiguration', 'NoSuchBucketPolicy'))
                if operation == 'get-bucket-logging' and result and result.get('LoggingEnabled'):
                    dest = result['LoggingEnabled']
                    s3_destinations[(region, dest['TargetBucket'], dest.get('TargetPrefix', ''))] = logical + ' S3 access logging'
            metric(region, 'AWS/S3', 'BucketSizeBytes', [{'Name': 'BucketName', 'Value': physical}, {'Name': 'StorageType', 'Value': 'StandardStorage'}], ('Average',), 86400)
            metric(region, 'AWS/S3', 'NumberOfObjects', [{'Name': 'BucketName', 'Value': physical}, {'Name': 'StorageType', 'Value': 'AllStorageTypes'}], ('Average',), 86400)
        elif kind == 'AWS::CloudWatch::Alarm':
            alarm = aws(region, 'cloudwatch', 'describe-alarms', {'AlarmNames': [physical]}, base + '/alarm.json') or {}
            aws(region, 'cloudwatch', 'describe-alarm-history', {'AlarmName': physical, 'StartDate': iso(start), 'EndDate': iso(end)}, base + '/history.json')
            for item in alarm.get('MetricAlarms', []) + alarm.get('CompositeAlarms', []):
                if item.get('StateValue') != 'OK':
                    finding('alarm_state', item.get('StateValue'), region=region, alarm=physical, reason=item.get('StateReason'))
                # App custom metrics have no resource dimension for inventory
                # matching. Bind them to the exact stack-owned alarm instead.
                if item.get('Namespace', '').startswith('WebWatch/') and item.get('MetricName'):
                    metric(region, item['Namespace'], item['MetricName'], item.get('Dimensions', []), (item.get('Statistic') or item.get('ExtendedStatistic') or 'Sum',))
        elif kind == 'AWS::Events::Rule':
            scoped_values[region].add(physical)
            aws(region, 'events', 'describe-rule', {'Name': physical}, base + '/rule.json')
            aws(region, 'events', 'list-targets-by-rule', {'Rule': physical}, base + '/targets.json')
        elif kind == 'AWS::ApiGatewayV2::Api':
            scoped_values[region].add(physical)
            aws(region, 'apigatewayv2', 'get-api', {'ApiId': physical}, base + '/api.json')
            for operation in ('get-stages', 'get-routes', 'get-integrations', 'get-authorizers'):
                result = aws(region, 'apigatewayv2', operation, {'ApiId': physical}, base + '/' + operation + '.json') or {}
                discover_destinations(result, logical)
            dims = [{'Name': 'ApiId', 'Value': physical}]
            for name in ('Count', '4xx', '5xx'):
                metric(region, 'AWS/ApiGateway', name, dims)
            for name in ('Latency', 'IntegrationLatency'):
                metric(region, 'AWS/ApiGateway', name, dims, ('Average', 'Maximum'))
        elif kind == 'AWS::CloudFront::Distribution':
            scoped_values['us-east-1'].add(physical)
            result = aws('us-east-1', 'cloudfront', 'get-distribution', {'Id': physical}, base + '/distribution.json') or {}
            distribution = result.get('Distribution', {})
            if distribution.get('ARN'):
                all_ids.add(distribution['ARN'])
            config = distribution.get('DistributionConfig', {})
            arn = config.get('ViewerCertificate', {}).get('ACMCertificateArn')
            if arn:
                certificates.add(arn)
            logging = config.get('Logging', {})
            if logging.get('Enabled'):
                bucket = re.sub(r'\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com(?:\.cn)?$', '', logging.get('Bucket', ''))
                if bucket:
                    # Legacy CloudFront files begin with the distribution ID after the configured prefix.
                    s3_destinations[('us-east-1', bucket, logging.get('Prefix', '') + physical + '.')] = logical + ' CloudFront logging'
            else:
                gap('cloudfront_access_logs_disabled', 'Standard legacy access logging is disabled; v2 delivery configuration is checked separately.', distribution=physical)
            aws('us-east-1', 'cloudfront', 'list-invalidations', {'DistributionId': physical}, base + '/invalidations.json')
            behaviors = [config.get('DefaultCacheBehavior', {})] + config.get('CacheBehaviors', {}).get('Items', [])
            for behavior in behaviors:
                realtime = behavior.get('RealtimeLogConfigArn')
                if realtime:
                    aws('us-east-1', 'cloudfront', 'get-realtime-log-config', {'ARN': realtime}, base + '/realtime-' + safe_name(realtime) + '.json')
                    gap('cloudfront_realtime_payloads_not_exported', 'Real-time logging configuration is collected; Kinesis records are not consumed.', distribution=physical, config=realtime)
            dims = [{'Name': 'DistributionId', 'Value': physical}, {'Name': 'Region', 'Value': 'Global'}]
            for name in ('Requests', 'BytesDownloaded', 'BytesUploaded'):
                metric('us-east-1', 'AWS/CloudFront', name, dims, ('Sum',))
            for name in ('4xxErrorRate', '5xxErrorRate', 'TotalErrorRate'):
                metric('us-east-1', 'AWS/CloudFront', name, dims, ('Average',))
        elif kind == 'AWS::CloudFront::Function':
            # CloudFormation returns an ARN; the APIs, metrics and log group use its name.
            function_name = physical.rsplit('/', 1)[-1]
            scoped_values['us-east-1'].add(function_name)
            aws('us-east-1', 'cloudfront', 'describe-function', {'Name': function_name, 'Stage': 'LIVE'}, base + '/function-live.json')
            register_log('us-east-1', '/aws/cloudfront/function/' + function_name, logical)
            for name in ('FunctionInvocations', 'FunctionValidationErrors', 'FunctionExecutionErrors'):
                metric('us-east-1', 'AWS/CloudFront', name, [{'Name': 'FunctionName', 'Value': function_name}, {'Name': 'Region', 'Value': 'Global'}], ('Sum',))
        elif kind == 'AWS::Route53::RecordSet':
            name = physical.split('|', 1)[0].rstrip('.').lower()
            if '.' in name and not name.startswith('arn:'):
                domain_names.add(name)
        elif kind == 'AWS::Cognito::UserPool':
            scoped_values[region].add(physical)
            result = aws(region, 'cognito-idp', 'describe-user-pool', {'UserPoolId': physical}, base + '/pool.json') or {}
            for key in ('CustomDomain', 'Domain'):
                domain = result.get('UserPool', {}).get(key)
                if domain:
                    aws(region, 'cognito-idp', 'describe-user-pool-domain', {'Domain': domain}, base + '/' + key + '.json')
            aws(region, 'cognito-idp', 'get-user-pool-mfa-config', {'UserPoolId': physical}, base + '/mfa.json')
            logging = aws(region, 'cognito-idp', 'get-log-delivery-configuration', {'UserPoolId': physical}, base + '/log-delivery.json') or {}
            discover_destinations(logging, logical)
            if not logging.get('LogDeliveryConfiguration', {}).get('LogConfigurations'):
                gap('cognito_detailed_logs_not_configured', 'No configured pool log delivery was returned; pre-token Lambda logs and CloudTrail are collected separately.', pool=physical)
            for config in logging.get('LogDeliveryConfiguration', {}).get('LogConfigurations', []):
                if config.get('S3Configuration'):
                    gap('cognito_s3_log_objects_not_exported', 'S3 log destination configuration is captured; targeted auth evidence is available through CloudTrail/pre-token logs. No undocumented object-prefix assumption is made.', pool=physical, destination=config['S3Configuration'])
        elif kind == 'AWS::Cognito::UserPoolClient':
            pool_logical = logical.removesuffix('Client')
            pool = next((r['PhysicalResourceId'] for r in resources if r['region'] == region and r['stack'] == row['stack'] and r['LogicalResourceId'] == pool_logical and r['ResourceType'] == 'AWS::Cognito::UserPool'), None)
            if pool:
                aws(region, 'cognito-idp', 'describe-user-pool-client', {'UserPoolId': pool, 'ClientId': physical}, base + '/client.json')
            else:
                gap('cognito_client_pool_unresolved', 'Could not resolve client to the exact stack pool.', region=region, client=physical)
        elif kind == 'AWS::WAFv2::IPSet':
            parts = physical.split('|')
            scope = parts[2] if len(parts) == 3 else ('CLOUDFRONT' if logical.startswith('Edge') else 'REGIONAL')
            endpoint = 'us-east-1' if scope == 'CLOUDFRONT' else region
            sets = aws(endpoint, 'wafv2', 'list-ip-sets', {'Scope': scope}) or {}
            item = next((s for s in sets.get('IPSets', []) if s.get('Id') in parts or s.get('Name') in parts or s.get('ARN') == physical), None)
            if item:
                aws(endpoint, 'wafv2', 'get-ip-set', {'Name': item['Name'], 'Id': item['Id'], 'Scope': scope}, base + '/ip-set.json')
            else:
                gap('waf_ip_set_unresolved', 'Could not bind the physical resource to its IP set.', physicalId=physical)
        elif kind == 'AWS::WAFv2::WebACL':
            # Physical ID is normally NAME|ID|SCOPE. Resolve from exact stack outputs or list by ID/name.
            parts = physical.split('|')
            scope = parts[2] if len(parts) == 3 else ('CLOUDFRONT' if logical.startswith('Edge') else 'REGIONAL')
            endpoint = 'us-east-1' if scope == 'CLOUDFRONT' else region
            acls = aws(endpoint, 'wafv2', 'list-web-acls', {'Scope': scope}, base + '/acl-inventory.json') or {}
            acl = next((a for a in acls.get('WebACLs', []) if a.get('Id') in parts or a.get('Name') in parts or a.get('ARN') == physical), None)
            if not acl:
                gap('waf_acl_unresolved', 'Could not bind physical resource to WAF ACL.', region=endpoint, physicalId=physical)
                continue
            scoped_values[endpoint].add(acl['Name'])
            all_ids.update([acl['Name'], acl['ARN']])
            result = aws(endpoint, 'wafv2', 'get-web-acl', {'Name': acl['Name'], 'Id': acl['Id'], 'Scope': scope}, base + '/acl.json') or {}
            logging = aws(endpoint, 'wafv2', 'get-logging-configuration', {'ResourceArn': acl['ARN']}, base + '/logging.json', expected=('WAFNonexistentItemException',))
            if logging:
                discover_destinations(logging, logical)
                for dest in logging.get('LoggingConfiguration', {}).get('LogDestinationConfigs', []):
                    if ':s3:::' in dest:
                        path = dest.split(':s3:::', 1)[1].split('/', 1)
                        prefix = path[1].rstrip('/') + '/' if len(path) > 1 else ''
                        s3_destinations[(endpoint, path[0], prefix + f'AWSLogs/{identity["Account"]}/WAFLogs/{endpoint}/{acl["Name"]}/')] = logical + ' WAF logging'
            else:
                gap('waf_full_logs_unavailable', 'No readable full-log delivery configuration; bounded recent samples are collected when enabled.', acl=acl['ARN'])
            sample_start = max(start, dt.datetime.now(UTC) - dt.timedelta(hours=2, minutes=55))
            sample_end = min(end, dt.datetime.now(UTC))
            web_acl = result.get('WebACL', {})
            visible = [web_acl.get('VisibilityConfig', {})] + [r.get('VisibilityConfig', {}) for r in web_acl.get('Rules', [])]
            if sample_start < sample_end:
                for visibility in visible:
                    if visibility.get('SampledRequestsEnabled') and visibility.get('MetricName'):
                        aws(endpoint, 'wafv2', 'get-sampled-requests', {'WebAclArn': acl['ARN'], 'RuleMetricName': visibility['MetricName'], 'Scope': scope, 'TimeWindow': {'StartTime': iso(sample_start), 'EndTime': iso(sample_end)}, 'MaxItems': 100}, base + '/samples-' + safe_name(visibility['MetricName']) + '.json')
            else:
                gap('waf_sample_window_unavailable', 'Requested end is older than the WAF sampling window.', acl=acl['ARN'])
        elif kind == 'AWS::SNS::Topic':
            scoped_values[region].add(physical.split(':')[-1])
            aws(region, 'sns', 'get-topic-attributes', {'TopicArn': physical}, base + '/topic.json')
            subscriptions = aws(region, 'sns', 'list-subscriptions-by-topic', {'TopicArn': physical}, base + '/subscriptions.json')
            if logical == 'OpsTopic' and subscriptions is not None:
                confirmed = [s for s in subscriptions.get('Subscriptions', []) if str(s.get('SubscriptionArn', '')).startswith('arn:')]
                pending = [s for s in subscriptions.get('Subscriptions', []) if s.get('SubscriptionArn') == 'PendingConfirmation']
                if not confirmed:
                    finding('ops_alerts_without_confirmed_subscriber', 'CloudWatch alarm and SES failure publications have no confirmed destination. Enable TECHNICAL_ALERTS_ENABLED, configure TECHNICAL_ALERT_EMAIL and confirm its SNS subscription when alerts are desired.', region=region, topic=physical, technicalAlertsEnabled=technical_alerts_enabled, pendingSubscriptions=len(pending))
            inventory = aws(region, 'logs', 'describe-log-groups', {'logGroupNamePrefix': f'sns/{region}/{identity["Account"]}/{physical.split(":")[-1]}'}, base + '/delivery-log-groups.json') or {}
            for item in inventory.get('logGroups', []):
                register_log(region, item['logGroupName'], logical)
        elif kind == 'AWS::SES::ConfigurationSet':
            scoped_values[region].add(physical)
            aws(region, 'sesv2', 'get-configuration-set', {'ConfigurationSetName': physical}, base + '/configuration-set.json')
            aws(region, 'sesv2', 'get-configuration-set-event-destinations', {'ConfigurationSetName': physical}, base + '/event-destinations.json')
        elif kind == 'AWS::SES::EmailIdentity':
            aws(region, 'sesv2', 'get-email-identity', {'EmailIdentity': physical}, base + '/identity.json')
        elif kind == 'AWS::IAM::Role':
            role_names.add(physical)
        elif kind == 'AWS::KMS::Key':
            aws(region, 'kms', 'describe-key', {'KeyId': physical}, base + '/key.json')
            aws(region, 'kms', 'get-key-rotation-status', {'KeyId': physical}, base + '/rotation.json')
            aws(region, 'kms', 'get-key-policy', {'KeyId': physical, 'PolicyName': 'default'}, base + '/policy.json')
        elif kind == 'AWS::SecretsManager::Secret':
            aws(region, 'secretsmanager', 'describe-secret', {'SecretId': physical}, base + '/metadata.json')
        elif kind == 'AWS::Budgets::Budget':
            aws('us-east-1', 'budgets', 'describe-budget', {'AccountId': identity['Account'], 'BudgetName': physical}, base + '/budget.json')
            aws('us-east-1', 'budgets', 'describe-notifications-for-budget', {'AccountId': identity['Account'], 'BudgetName': physical}, base + '/notifications.json')
    for role in sorted(role_names):
        base = 'configuration/iam/' + safe_name(role)
        aws(primary, 'iam', 'get-role', {'RoleName': role}, base + '/role.json')
        inline = aws(primary, 'iam', 'list-role-policies', {'RoleName': role}, base + '/inline-policy-names.json') or {}
        for policy in inline.get('PolicyNames', []):
            aws(primary, 'iam', 'get-role-policy', {'RoleName': role, 'PolicyName': policy}, base + '/inline-' + safe_name(policy) + '.json')
        attached = aws(primary, 'iam', 'list-attached-role-policies', {'RoleName': role}, base + '/attached-policies.json') or {}
        for policy in attached.get('AttachedPolicies', []):
            arn = policy['PolicyArn']
            details = aws(primary, 'iam', 'get-policy', {'PolicyArn': arn}, base + '/managed-' + safe_name(arn) + '.json') or {}
            version = details.get('Policy', {}).get('DefaultVersionId')
            if version:
                aws(primary, 'iam', 'get-policy-version', {'PolicyArn': arn, 'VersionId': version}, base + '/managed-version-' + safe_name(arn) + '.json')
    inspected_repositories = set()
    for region, uri in sorted(image_refs):
        repo_and_digest = uri.split('/', 1)[1]
        repository, digest = repo_and_digest.split('@', 1)
        registry = uri.split('.', 1)[0]
        base = f'configuration/{region}/images/{safe_name(uri)}'
        if (region, registry, repository) not in inspected_repositories:
            inspected_repositories.add((region, registry, repository))
            repository_base = f'configuration/{region}/repositories/{safe_name(registry + "/" + repository)}'
            aws(region, 'ecr', 'describe-repositories', {'registryId': registry, 'repositoryNames': [repository]}, repository_base + '/repository.json')
            lifecycle = aws(region, 'ecr', 'get-lifecycle-policy', {'registryId': registry, 'repositoryName': repository}, repository_base + '/lifecycle.json', expected=('LifecyclePolicyNotFoundException',))
            if lifecycle and lifecycle.get('lifecyclePolicyText'):
                try:
                    rules = json.loads(lifecycle['lifecyclePolicyText']).get('rules', [])
                    if any(rule.get('action', {}).get('type') == 'expire' and rule.get('selection', {}).get('tagStatus') != 'untagged' for rule in rules):
                        finding('tagged_worker_images_auto_expire', 'A worker repository automatically expires tagged images. Verify all deployed Lambda digests and rollback releases are protected; image age/count does not establish that a deployed release is unused.', region=region, repository=repository)
                except ValueError:
                    gap('ecr_lifecycle_unreadable', 'Repository returned an invalid lifecycle policy document.', region=region, repository=repository)
            elif lifecycle is None:
                gap('ecr_lifecycle_unavailable', 'No readable lifecycle policy was returned; repository retention cannot be verified.', region=region, repository=repository)
        aws(region, 'ecr', 'describe-images', {'registryId': registry, 'repositoryName': repository, 'imageIds': [{'imageDigest': digest}]}, base + '/image.json')
        scans = aws(region, 'ecr', 'describe-image-scan-findings', {'registryId': registry, 'repositoryName': repository, 'imageId': {'imageDigest': digest}}, base + '/scan.json', expected=('ScanNotFoundException',))
        if scans is None:
            gap('worker_image_scan_unavailable', 'No readable existing scan result was returned. This does not establish that the deployed image has no vulnerabilities; no scan is started by this collector.', region=region, image=uri)
    for arn in sorted(certificates):
        aws(arn.split(':')[3], 'acm', 'describe-certificate', {'CertificateArn': arn}, 'configuration/certificates/' + safe_name(arn) + '.json')
    for zone in sorted(hosted_zones):
        base = 'configuration/route53/' + safe_name(zone)
        aws(primary, 'route53', 'get-hosted-zone', {'Id': zone}, base + '/zone.json')
        result = aws(primary, 'route53', 'list-resource-record-sets', {'HostedZoneId': zone}) or {}
        selected = [r for r in result.get('ResourceRecordSets', []) if r['Name'].rstrip('.').lower() in domain_names]
        save(base + '/app-records.json', selected)


def collect_metrics():
    namespaces = ('AWS/Lambda', 'AWS/SQS', 'AWS/DynamoDB', 'AWS/ApiGateway', 'AWS/CloudFront', 'AWS/WAFV2', 'AWS/SNS', 'AWS/SES', 'AWS/Cognito', 'AWS/Events', 'AWS/S3')
    for region in sorted(set(regions) | set(metric_requests)):
        print(f'Collecting CloudWatch metrics in {region}', flush=True)
        for namespace in namespaces:
            inventory = aws(region, 'cloudwatch', 'list-metrics', {'Namespace': namespace}) or {}
            selected = []
            for item in inventory.get('Metrics', []):
                dimensions = item.get('Dimensions', [])
                # Exact resource dimensions prevent collecting other applications' metrics.
                if not any(d.get('Value') in scoped_values[region] for d in dimensions):
                    if namespace != 'AWS/SES' or dimensions:
                        continue
                selected.append(item)
                stats = ('Average', 'Maximum') if any(word in item['MetricName'].lower() for word in ('latency', 'duration', 'rate', 'size', 'utilization')) else ('Sum', 'Maximum')
                if namespace == 'AWS/CloudFront':
                    stats = ('p95',) if item['MetricName'] == 'OriginLatency' else (('Average',) if any(word in item['MetricName'].lower() for word in ('rate', 'utilization', 'duration', 'latency')) else ('Sum',))
                metric(region, namespace, item['MetricName'], dimensions, stats, 86400 if namespace == 'AWS/S3' and item['MetricName'] in {'BucketSizeBytes', 'NumberOfObjects'} else None)
            save(f'metrics/{region}/inventory-{safe_name(namespace)}.json', selected)
        queries = list(metric_requests[region].values())
        for offset in range(0, len(queries), 100):
            batch = [{**item, 'Id': f'm{index}'} for index, item in enumerate(queries[offset:offset + 100])]
            name = f'metrics/{region}/batch-{offset // 100:04d}'
            save(name + '-queries.json', batch)
            # Native service pagination via input JSON; do not confuse service tokens with CLI tokens.
            payload = {'MetricDataQueries': batch, 'StartTime': iso(start), 'EndTime': iso(end), 'ScanBy': 'TimestampAscending', 'MaxDatapoints': 100800}
            tokens = set()
            page_index = 0
            while True:
                result = aws(region, 'cloudwatch', 'get-metric-data', payload, name + f'-page-{page_index:04d}.json', page=True)
                if result is None:
                    break
                for item in result.get('MetricDataResults', []):
                    if item.get('StatusCode') in {'Forbidden', 'InternalError'}:
                        gap('metric_series_unavailable', item.get('Messages', []), region=region, batch=name, id=item.get('Id'), status=item.get('StatusCode'))
                token = result.get('NextToken')
                if not token:
                    if any(item.get('StatusCode') == 'PartialData' for item in result.get('MetricDataResults', [])):
                        gap('metric_series_partial', 'PartialData without a continuation token.', region=region, batch=name)
                    break
                if token in tokens:
                    gap('pagination_stalled', 'Repeated CloudWatch metric token.', region=region, batch=name)
                    break
                tokens.add(token)
                payload['NextToken'] = token
                page_index += 1


SUSPECT = re.compile(r'\b(?:error|fatal|exception|denied|throttl\w*|failed|failure|timeout|timed out|outofmemory|task timed out|reconciliation_required)\b|CAPTURE_ISOLATION_FAILED|CAPTURE_DEADLINE_EXCEEDED|(?:isolation|ownership|fingerprint|binding|nonce).*?(?:reject|mismatch|fail)', re.I)


def collect_logs():
    suspects_path = work / 'logs' / 'suspected-issues.ndjson.gz'
    suspects_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(suspects_path, 'wt', encoding='utf-8') as suspect_file:
        for (region, name), sources in sorted(log_groups.items()):
            print(f'Collecting logs {region} {name}', flush=True)
            base = f'logs/{region}/{safe_name(name)}'
            metadata = aws(region, 'logs', 'describe-log-groups', {'logGroupNamePrefix': name}, base + '/group.json')
            exact = next((item for item in (metadata or {}).get('logGroups', []) if item.get('logGroupName') == name), None)
            if not exact:
                gap('log_group_unavailable', 'Group was not returned by describe-log-groups.', region=region, logGroup=name)
            summary = {'region': region, 'logGroup': name, 'sources': sorted(sources), 'events': 0, 'suspectEvents': 0, 'pages': 0, 'complete': False, 'firstTimestamp': None, 'lastTimestamp': None, 'eventNames': {}, 'retentionDays': exact.get('retentionInDays') if exact else None}
            log_summaries.append(summary)
            if metadata is not None and exact is None:
                # An edge function with no console output need not have a log group at all.
                save(base + '/coverage.json', summary)
                continue
            aws(region, 'logs', 'describe-metric-filters', {'logGroupName': name}, base + '/metric-filters.json')
            aws(region, 'logs', 'describe-subscription-filters', {'logGroupName': name}, base + '/subscriptions.json')
            counts = collections.Counter()
            payload = {'logGroupName': name, 'startTime': int(start.timestamp() * 1000), 'endTime': int(end.timestamp() * 1000), 'limit': 10000}
            tokens = set()
            stream = work / (base + '/events.ndjson.gz')
            stream.parent.mkdir(parents=True, exist_ok=True)
            with gzip.open(stream, 'wt', encoding='utf-8') as handle:
                while True:
                    if args.max_log_events:
                        payload['limit'] = min(10000, max(1, args.max_log_events - summary['events']))
                    result = aws(region, 'logs', 'filter-log-events', payload, page=True)
                    if result is None:
                        break
                    summary['pages'] += 1
                    events = result.get('events', [])
                    if args.max_log_events:
                        events = events[:max(0, args.max_log_events - summary['events'])]
                    for event in events:
                        item = scrub(event)
                        item['timestampUtc'] = iso(dt.datetime.fromtimestamp(event['timestamp'] / 1000, UTC))
                        handle.write(json.dumps(item, ensure_ascii=False) + '\n')
                        summary['events'] += 1
                        summary['firstTimestamp'] = min(summary['firstTimestamp'] or event['timestamp'], event['timestamp'])
                        summary['lastTimestamp'] = max(summary['lastTimestamp'] or event['timestamp'], event['timestamp'])
                        message = event.get('message', '')
                        try:
                            # Lambda text logging prefixes console JSON with time, request ID
                            # and severity. Preserve the raw line, but summarize its JSON body.
                            structured_message = message[message.find('{'):] if '{' in message else message
                            parsed = json.loads(structured_message)
                        except ValueError:
                            parsed = None
                        if isinstance(parsed, dict):
                            label = parsed.get('event') or parsed.get('message')
                            if isinstance(label, str) and len(label) < 160:
                                counts[label] += 1
                        if SUSPECT.search(message) or (isinstance(parsed, dict) and str(parsed.get('level', '')).lower() in {'error', 'warn', 'warning', 'fatal'}) or (isinstance(parsed, dict) and str(parsed.get('status', '')).startswith(('4', '5'))):
                            summary['suspectEvents'] += 1
                            suspect_file.write(json.dumps({'region': region, 'logGroup': name, **item}, ensure_ascii=False) + '\n')
                    token = result.get('nextToken')
                    if args.max_log_events and summary['events'] >= args.max_log_events and (token or len(events) < len(result.get('events', []))):
                        gap('log_events_truncated', 'Per-group event cap reached; increase cap or use 0.', region=region, logGroup=name, cap=args.max_log_events)
                        break
                    if not token:
                        summary['complete'] = True
                        break
                    if token in tokens:
                        gap('pagination_stalled', 'Repeated log token; group is incomplete.', region=region, logGroup=name)
                        break
                    tokens.add(token)
                    payload['nextToken'] = token
                    if summary['pages'] % 20 == 0:
                        print(f'  {name}: {summary["events"]} events so far', flush=True)
            summary['eventNames'] = dict(counts)
            if summary['events'] == 0:
                gap('empty_log_window', 'No events returned. This alone does not prove a healthy component.', region=region, logGroup=name)
            save(base + '/coverage.json', summary)


def collect_cloudtrail():
    # Runtime errors are in CloudWatch. CloudTrail is a bounded supplemental history.
    trail_regions = [primary] + sorted((set(regions) | {'us-east-1'}) - {primary})
    budget_started = None
    simple_ids = {value for value in all_ids if len(value) >= 6 and not any(c in value for c in '/:')}
    app_roles = {r['PhysicalResourceId'] for r in resources if r['ResourceType'] == 'AWS::IAM::Role'}
    mode = 'off' if args.skip_cloudtrail else args.cloudtrail_mode

    def references_app(value):
        if isinstance(value, dict):
            return any(references_app(item) for item in value.values())
        if isinstance(value, list):
            return any(references_app(item) for item in value)
        if not isinstance(value, str):
            return False
        if value in all_ids:
            return True
        return value.startswith('arn:') and any(value.endswith('/' + marker) or value.endswith(':' + marker) for marker in simple_ids)

    for region in trail_regions:
        print(f'Collecting bounded CloudTrail {mode} history in {region}', flush=True)
        base = f'cloudtrail/{region}'
        metadata_started = time.monotonic()
        trails = aws(region, 'cloudtrail', 'describe-trails', {'includeShadowTrails': False}, base + '/trails.json') or {}
        for trail in trails.get('trailList', []):
            arn = trail['TrailARN']
            aws(region, 'cloudtrail', 'get-trail-status', {'Name': arn}, base + '/status-' + safe_name(arn) + '.json')
            aws(region, 'cloudtrail', 'get-event-selectors', {'TrailName': arn}, base + '/selectors-' + safe_name(arn) + '.json')
        if budget_started is not None:
            budget_started += time.monotonic() - metadata_started
        summary = {'region': region, 'mode': mode, 'examined': 0, 'included': 0, 'pages': 0, 'complete': False, 'selection': 'Exact resource IDs and ARN suffixes in resources/request/response; app-role or caller errors.', 'pageCap': args.max_cloudtrail_pages, 'sharedBudgetSeconds': args.cloudtrail_budget_seconds}
        cloudtrail_summaries.append(summary)
        if mode == 'off':
            gap('cloudtrail_history_skipped', 'Requested --skip-cloudtrail or --cloudtrail-mode off.', region=region)
            save(base + '/coverage.json', summary)
            continue
        trail_start = max(start, now - dt.timedelta(days=89, hours=23))
        if trail_start != start:
            gap('cloudtrail_history_window_limited', 'Event history is restricted to the last 90 days.', region=region)
        if trail_start >= end:
            save(base + '/coverage.json', summary)
            continue
        payload = {'StartTime': iso(trail_start), 'EndTime': iso(end), 'MaxResults': 50}
        if mode == 'changes':
            payload['LookupAttributes'] = [{'AttributeKey': 'ReadOnly', 'AttributeValue': 'false'}]
            gap('cloudtrail_read_events_excluded', 'Routine read events, including their failures, are excluded by the default AWS ReadOnly=false filter. Use all mode for a targeted follow-up.', region=region)
        tokens = set()
        last_call = 0.0
        path = work / (base + '/events.ndjson.gz')
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with gzip.open(path, 'wt', encoding='utf-8') as handle:
                while True:
                    if budget_started is None:
                        budget_started = time.monotonic()
                    delay = max(0, 0.6 - (time.monotonic() - last_call))
                    remaining = args.cloudtrail_budget_seconds - (time.monotonic() - budget_started) if args.cloudtrail_budget_seconds else float('inf')
                    if remaining <= delay + 1:
                        gap('cloudtrail_history_budget_reached', 'Shared event-history time budget reached; remaining history is intentionally omitted.', region=region, budgetSeconds=args.cloudtrail_budget_seconds)
                        break
                    if delay:
                        time.sleep(delay)
                    timeout = min(args.timeout_seconds, remaining - delay)
                    result = aws(region, 'cloudtrail', 'lookup-events', payload, page=True, timeout_seconds=timeout)
                    last_call = time.monotonic()
                    if result is None:
                        break
                    summary['pages'] += 1
                    for event in result.get('Events', []):
                        summary['examined'] += 1
                        try:
                            detail = json.loads(event.get('CloudTrailEvent', '{}'))
                        except ValueError:
                            detail = {}
                        if not isinstance(detail, dict):
                            detail = {}
                        resource_match = references_app(event.get('Resources', [])) or references_app(detail.get('resources')) or references_app(detail.get('requestParameters')) or references_app(detail.get('responseElements'))
                        user = detail.get('userIdentity') or {}
                        principal = user.get('arn') or ''
                        issuer = ((user.get('sessionContext') or {}).get('sessionIssuer') or {}).get('arn') or ''
                        issuer_role = issuer.rsplit('/', 1)[-1] if issuer else None
                        assumed = re.search(r':assumed-role/([^/]+)/', principal)
                        app_role_match = issuer_role in app_roles or bool(assumed and assumed[1] in app_roles)
                        caller_match = principal == identity.get('Arn') or bool(issuer_role and f':assumed-role/{issuer_role}/' in identity.get('Arn', ''))
                        if not resource_match and not (detail.get('errorCode') and (caller_match or app_role_match)):
                            continue
                        summary['included'] += 1
                        handle.write(json.dumps(scrub({**event, 'CloudTrailEvent': detail}), ensure_ascii=False) + '\n')
                        if detail.get('errorCode'):
                            finding('cloudtrail_error', detail.get('errorMessage', detail['errorCode']), region=region, event=event.get('EventName'), eventId=event.get('EventId'), code=detail['errorCode'])
                    print(f'  {region}: examined {summary["examined"]} events; included {summary["included"]} (page {summary["pages"]})', flush=True)
                    token = result.get('NextToken')
                    if not token:
                        summary['complete'] = True
                        break
                    if args.max_cloudtrail_pages and summary['pages'] >= args.max_cloudtrail_pages:
                        gap('cloudtrail_history_truncated', 'Page cap reached; most recent events were examined first.', region=region, cap=args.max_cloudtrail_pages)
                        break
                    if token in tokens:
                        gap('pagination_stalled', 'Repeated CloudTrail token.', region=region)
                        break
                    tokens.add(token)
                    payload['NextToken'] = token
        finally:
            save(base + '/coverage.json', summary)


def collect_s3_logs():
    save('s3-access-logs/destinations.json', [{'region': r, 'bucket': b, 'prefix': p, 'source': s} for (r, b, p), s in sorted(s3_destinations.items())])
    if not args.include_s3_access_logs:
        if s3_destinations:
            gap('s3_access_log_objects_skipped', 'Use --include-s3-access-logs to download discovered text logging destinations.', destinations=len(s3_destinations))
        return
    for (region, bucket, prefix), source in sorted(s3_destinations.items()):
        base = 's3-access-logs/' + safe_name(bucket + '/' + prefix)
        location = aws(region, 's3api', 'get-bucket-location', {'Bucket': bucket}, base + '/location.json')
        bucket_region = (location.get('LocationConstraint') or 'us-east-1') if location is not None else region
        if bucket_region == 'EU':
            bucket_region = 'eu-west-1'
        payload = {'Bucket': bucket, 'Prefix': prefix, 'MaxKeys': 1000}
        selected = []
        tokens = set()
        complete = False
        while True:
            listing = aws(bucket_region, 's3api', 'list-objects-v2', payload, page=True)
            if listing is None:
                break
            for item in listing.get('Contents', []):
                delivered = timestamp(item['LastModified'])
                if start <= delivered <= end:
                    selected.append(item)
                    if args.max_s3_log_objects and len(selected) >= args.max_s3_log_objects:
                        break
            if args.max_s3_log_objects and len(selected) >= args.max_s3_log_objects:
                gap('s3_log_objects_truncated', 'Object cap reached; selection uses delivery time, not request time.', bucket=bucket, prefix=prefix, cap=args.max_s3_log_objects)
                break
            token = listing.get('NextContinuationToken')
            if not token:
                complete = True
                break
            if token in tokens:
                gap('pagination_stalled', 'Repeated S3 listing token.', bucket=bucket, prefix=prefix)
                break
            tokens.add(token)
            payload['ContinuationToken'] = token
        save(base + '/objects.json', {'source': source, 'selection': 'Object delivery LastModified in requested window; requests may be older.', 'listingComplete': complete, 'objects': selected})
        for item in selected:
            key = item['Key']
            # Restrict the optional raw transport to configured log prefixes and text logs.
            if not key.startswith(prefix) or (not key.endswith(('.gz', '.log', '.json', '.jsonl', '.txt')) and not source.endswith('S3 access logging')):
                gap('s3_log_object_format_skipped', 'Only known text-log extensions are downloaded.', bucket=bucket, key=key)
                continue
            if item.get('Size', 0) > 64 * 1024 * 1024:
                gap('s3_log_object_too_large', 'Compressed object exceeds 64 MiB.', bucket=bucket, key=key)
                continue
            fd, raw_name = tempfile.mkstemp(prefix='aws-log-transport-')
            os.close(fd)
            raw = Path(raw_name)
            command = ['aws', '--profile', args.profile, '--region', bucket_region, '--no-cli-pager', '--color', 'off', '--cli-connect-timeout', '10', '--cli-read-timeout', '60', 's3api', 'get-object', '--bucket', bucket, '--key', key, str(raw)]
            record = {'region': bucket_region, 'service': 's3api', 'operation': 'get-object', 'request': {'Bucket': bucket, 'Key': key}}
            try:
                result = subprocess.run(command, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=args.timeout_seconds, check=False)
                record['status'] = 'ok' if result.returncode == 0 else 'failed'
                if result.returncode:
                    gap('s3_log_download_failed', scrub_text(result.stderr), bucket=bucket, key=key)
                    continue
                destination = work / (base + '/objects/' + safe_name(key) + '.ndjson.gz')
                destination.parent.mkdir(parents=True, exist_ok=True)
                reader = gzip.open(raw, 'rt', encoding='utf-8', errors='replace') if key.endswith('.gz') else raw.open('r', encoding='utf-8', errors='replace')
                with reader as source_file, gzip.open(destination, 'wt', encoding='utf-8') as target:
                    for line in source_file:
                        # NDJSON wrapping preserves legacy tab-separated access-log lines too.
                        target.write(json.dumps({'line': scrub(line.rstrip('\n'))}, ensure_ascii=False) + '\n')
            except (OSError, EOFError, subprocess.TimeoutExpired) as exc:
                record.update(status='failed', error=type(exc).__name__ + ': ' + str(exc))
                gap('s3_log_download_failed', record['error'], bucket=bucket, key=key)
            finally:
                raw.unlink(missing_ok=True)
                calls.append(record)
                with (work / 'commands.ndjson').open('a', encoding='utf-8') as handle:
                    handle.write(json.dumps(scrub(record), ensure_ascii=False) + '\n')


def finalise(interrupted=False):
    save('resource-inventory.json', {'stacks': stacks, 'resources': resources})
    save('log-coverage.json', log_summaries)
    save('cloudtrail-coverage.json', cloudtrail_summaries)
    save('collection-gaps.json', gaps)
    save('indicators.json', findings)
    summary = {'collectorVersion': '1.2.0', 'startedUtc': iso(now), 'finishedUtc': iso(dt.datetime.now(UTC)), 'requestedWindow': {'start': iso(start), 'end': iso(end)}, 'profile': args.profile, 'account': identity.get('Account'), 'callerArn': identity.get('Arn'), 'primaryStack': stack_name, 'stage': stage, 'regions': regions, 'interrupted': interrupted, 'stacks': len(stacks), 'resources': len(resources), 'awsCalls': len(calls), 'failedAwsCalls': sum(c.get('status') == 'failed' for c in calls), 'logGroups': len(log_summaries), 'logEvents': sum(s['events'] for s in log_summaries), 'suspectLogEvents': sum(s['suspectEvents'] for s in log_summaries), 'indicators': len(findings), 'collectionGaps': len(gaps), 'caps': {'logEventsPerGroup': args.max_log_events, 'cloudtrailPagesPerRegion': args.max_cloudtrail_pages, 'cloudtrailHistoryBudgetSeconds': args.cloudtrail_budget_seconds, 's3LogObjectsPerDestination': args.max_s3_log_objects}, 'cloudtrailMode': 'off' if args.skip_cloudtrail else args.cloudtrail_mode, 'secretValuesRequested': False}
    save('manifest.json', summary)
    readme = f'''CLOVERSIGHT AWS audit bundle

Window: {iso(start)} through {iso(end)} (UTC)
Account: {identity.get('Account', 'unresolved')}; source profile: {args.profile}
Primary stack: {stack_name}; regions: {', '.join(regions)}
Read manifest.json, collection-gaps.json, indicators.json and log-coverage.json first.
Full CloudWatch events and suspected-issues excerpts are compressed NDJSON (.ndjson.gz).
The excerpt is a heuristic index: target outages, expected rejections and retries can match.
No error excerpt, empty logs, or missing metric series is proof of healthy operation.
Configuration files include Lambda code hashes/image digests, queue settings, IAM policies,
event-source mappings, API/Cognito/WAF/CloudFront delivery settings, storage and email config.
CloudTrail files contain app-matched management events and caller errors, not historical
S3/DynamoDB data events. Existing trail selectors are recorded; no logging is enabled here.
CloudTrail mode: {'off' if args.skip_cloudtrail else args.cloudtrail_mode}; default changes
filters ReadOnly=false at AWS. Routine read events and their errors are omitted in this mode.
CloudTrail page cap per region: {args.max_cloudtrail_pages}; shared history budget:
{args.cloudtrail_budget_seconds} seconds. CloudTrail coverage is intentionally bounded.
CloudFormation drift files are existing recorded results; no new drift scan was started.
Configuration, queue depths and service settings are current observations; logs/metrics use
the requested historical window. This is not an atomic backup or a table/object export.
SQS messages were never received, peeked, redriven, deleted or purged. No DynamoDB rows,
captured screenshots, inbound emails, user lists, secret values or local .env were copied.
Known credentials, sensitive headers, JWTs and signed-link credentials are redacted on write.
Redaction is best effort: operational logs can still contain emails, IPs, URLs and account IDs.
Disabled/expired logging, permissions, unsupported destinations and caps are reported as gaps.
SES acceptance does not establish delivery; feedback sent only to SNS email has no replay API.
No Lambda/application invocation, build, deployment, mutation, logging enablement or new IAM
permission was performed. AWS read APIs and metric retrieval may have normal AWS charges.
Collection interrupted: {interrupted}
'''
    (work / 'README.txt').write_text(readme, encoding='utf-8')
    checksums = []
    for path in sorted(work.rglob('*')):
        if path.is_file():
            digest = hashlib.sha256()
            with path.open('rb') as handle:
                for block in iter(lambda: handle.read(1024 * 1024), b''):
                    digest.update(block)
            checksums.append(f'{digest.hexdigest()}  {path.relative_to(work).as_posix()}')
    (work / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n', encoding='utf-8')
    with archive.open('xb') as archive_file:
        with zipfile.ZipFile(archive_file, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as output:
            for path in sorted(work.rglob('*')):
                if path.is_file():
                    output.write(path, (Path(work.name) / path.relative_to(work)).as_posix())
    os.chmod(archive, 0o600)
    print(f'\nAudit ZIP: {archive}\nWorking evidence directory retained: {work}', flush=True)
    print(f'{summary["logEvents"]} log events; {summary["suspectLogEvents"]} heuristic matches; {summary["failedAwsCalls"]} failed API calls; {len(gaps)} collection gaps.', flush=True)


exit_code = 0
interrupted = False
try:
    print(f'Collecting {stack_name} using --profile {args.profile}; {iso(start)} to {iso(end)}', flush=True)
    version = subprocess.run(['aws', '--profile', args.profile, '--version'], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=10, check=False)
    save('collector-tools.json', {'awsCli': version.stdout.strip(), 'python': sys.version.split()[0]})
    if version.returncode or not version.stdout.startswith('aws-cli/2.'):
        raise RuntimeError('AWS CLI v2 is required; no app data collected.')
    identity = aws(primary, 'sts', 'get-caller-identity', relative='identity.json') or {}
    if not identity.get('Account'):
        raise RuntimeError(f'No AWS identity. Run aws sso login --profile {args.profile}, then retry.')
    if expected_account and identity['Account'] != expected_account:
        raise RuntimeError(f'Account mismatch: expected {expected_account}, got {identity["Account"]}. No app data collected.')
    stack(primary, stack_name, required=True)
    # Region inventory allows discovery of existing secondary stacks without assuming all were deployed.
    for region in regions:
        listing = aws(region, 'cloudformation', 'list-stacks') or {}
        selected = [s for s in listing.get('StackSummaries', []) if s['StackName'].startswith(regional_prefix) and s.get('StackStatus') != 'DELETE_COMPLETE']
        names = [s['StackName'] for s in selected]
        save(f'discovery/{region}/regional-stacks.json', selected)
        if region != primary and not names:
            gap('regional_stack_not_found', 'No matching regional stack was returned; check configured region/prefix or deployment.', region=region, prefix=regional_prefix)
        for name in sorted(names):
            stack(region, name)
    bootstrap_name = cfg.get('BOOTSTRAP_STACK_NAME', 'webwatch-deployment-bootstrap')
    stack(primary, bootstrap_name)
    inspect_resources()
    # Read application-selected email account settings; identities themselves are stack-scoped above.
    for ses_region in sorted({primary, cfg.get('SES_REGION', primary)}):
        aws(ses_region, 'sesv2', 'get-account', relative=f'configuration/{ses_region}/ses-account.json')
        aws(ses_region, 'ses', 'describe-active-receipt-rule-set', relative=f'configuration/{ses_region}/ses-receipt-rules.json')
    # CloudFront standard logging v2 is managed through CloudWatch Logs deliveries, not Distribution.Logging.
    deliveries = aws('us-east-1', 'logs', 'describe-delivery-sources') or {}
    connections = aws('us-east-1', 'logs', 'describe-deliveries') or {}
    chosen = []
    for item in deliveries.get('deliverySources', []):
        if any(value in all_ids for value in item.get('resourceArns', [])):
            chosen.append(item)
            detail = {'deliveries': [d for d in connections.get('deliveries', []) if d.get('deliverySourceName') == item['name']]}
            save('configuration/cloudfront-log-deliveries/' + safe_name(item['name']) + '.json', detail)
            for delivery in detail.get('deliveries', []):
                dest_arn = delivery.get('deliveryDestinationArn')
                if dest_arn:
                    destination = aws(dest_arn.split(':')[3], 'logs', 'get-delivery-destination', {'name': dest_arn.split(':')[-1]}) or {}
                    save('configuration/cloudfront-log-deliveries/destination-' + safe_name(dest_arn) + '.json', destination)
                    discover_destinations(destination, item['name'])
                    resource = destination.get('deliveryDestination', {}).get('deliveryDestinationConfiguration', {}).get('destinationResourceArn', '')
                    if ':s3:::' in resource:
                        bucket_path = resource.split(':s3:::', 1)[1].split('/', 1)
                        prefix = bucket_path[1] if len(bucket_path) > 1 else f'AWSLogs/{identity["Account"]}/CloudFront/'
                        s3_destinations[('us-east-1', bucket_path[0], prefix)] = item['name'] + ' CloudFront v2 logging'
    save('configuration/cloudfront-log-deliveries/sources.json', chosen)
    # Collect recent AWS infrastructure service incidents if the caller's support plan permits it.
    health = aws('us-east-1', 'health', 'describe-events', {'filter': {'regions': regions + ['global'], 'services': ['LAMBDA', 'SQS', 'DYNAMODB', 'S3', 'CLOUDFRONT', 'API_GATEWAY', 'COGNITO', 'SES', 'CLOUDWATCH', 'KMS'], 'lastUpdatedTimes': [{'from': iso(start), 'to': iso(end)}]}}, 'aws-health/events.json') or {}
    for item in health.get('events', []):
        arn = item['arn']
        aws('us-east-1', 'health', 'describe-event-details', {'eventArns': [arn]}, 'aws-health/details-' + safe_name(arn) + '.json')
    collect_metrics()
    collect_logs()
    collect_cloudtrail()
    collect_s3_logs()
except KeyboardInterrupt:
    interrupted = True
    exit_code = 130
    gap('collection_interrupted', 'User interrupted the run. Partial evidence is retained and packaged.')
except Exception as exc:
    interrupted = True
    exit_code = 1
    gap('collection_stopped', type(exc).__name__ + ': ' + str(exc))
    print(str(exc), file=sys.stderr, flush=True)
finally:
    finalise(interrupted)
if exit_code == 0 and any(c.get('status') == 'failed' for c in calls):
    exit_code = 2
sys.exit(exit_code)
PYTHON
