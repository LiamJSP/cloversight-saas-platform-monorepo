import { assertManualCaptureAllowed } from '../domain/usage-guards.mjs';
/** @module aws/runtime
 * @description Mode-specific AWS runtime composition for API, worker and billing handlers.
 */
import { loadConfig } from '../config.mjs';
import { assertAwsSecrets } from '../security/runtime-boundary.mjs';
import { createLogger } from '../logger.mjs';
import { DynamoStateStore } from '../storage/dynamo-store.mjs';
import { S3Assets } from '../storage/s3-assets.mjs';
import { NotificationProviders } from '../notifications/providers.mjs';
import { NotificationService } from '../notifications/service.mjs';
import { MonitoringEngine } from '../monitoring/engine.mjs';
import { RegionalMonitoringCoordinator } from '../monitoring/regional-coordinator.mjs';
import { BillingService } from '../billing/service.mjs';
import { StripeBillingProvider, UnsupportedBillingProvider } from '../billing/providers.mjs';
import { AccountService } from '../services/accounts.mjs';
import { WatcherService } from '../services/watchers.mjs';
import { MaintenanceService } from '../services/maintenance.mjs';
import { MaintenanceTaskState } from './maintenance-task-state.mjs';
import { createRemoteCapture } from './remote-capture.mjs';
import { RegionalCaptureDispatcher } from './regional-capture-dispatcher.mjs';
import { CognitoCustomerDirectory } from './cognito-directory.mjs';
import { ActionLogService } from '../services/action-log.mjs';
import { StewardSecurity } from '../services/steward-security.mjs';
import { ReportService } from '../reports/service.mjs';
import { fairQueueGroupId, ISO, id } from '../lib.mjs';

const runtimes = new Map();
const secretCache = new Map();
const RUNTIME_REFRESH_MS = 5 * 60_000;

export async function getAwsRuntime(mode = 'api') {
  let entry = runtimes.get(mode);
  if (!entry || entry.expiresAt <= Date.now()) {
    entry = { expiresAt: Infinity, promise: null };
    entry.promise = buildRuntime(mode).then((runtime) => {
      entry.expiresAt = Date.now() + RUNTIME_REFRESH_MS;
      return runtime;
    }).catch((error) => {
      // A transient secret/table failure must not poison every subsequent
      // invocation in this warm environment. Only evict this exact attempt.
      if (runtimes.get(mode) === entry) runtimes.delete(mode);
      throw error;
    });
    runtimes.set(mode, entry);
  }
  return entry.promise;
}

async function buildRuntime(mode) {
  const base = loadConfig();
  const logger = createLogger(base.logLevel);
  const reportOnly = mode === 'report';
  const [stripeSecret, twilioSecret, responseSecret, originSecret] = await Promise.all([
    secretJson(process.env.STRIPE_SECRET_ARN, base.awsRegion, reportOnly || mode === 'inbound-email' || mode === 'dispatcher'),
    secretJson(process.env.TWILIO_SECRET_ARN, base.awsRegion, reportOnly || base.smsProvider !== 'twilio' || mode === 'inbound-email' || mode === 'dispatcher'),
    // Signing and edge-origin keys require coordinated rollout. Refreshing
    // provider credentials must not silently rotate these verification keys.
    secretJson(process.env.RESPONSE_SECRET_ARN, base.awsRegion, reportOnly, { refreshable: false }),
    secretJson(process.env.ORIGIN_VERIFY_SECRET_ARN, base.awsRegion, mode !== 'api', { refreshable: false }),
  ]);
  const twilioAccountSid = twilioSecret.accountSid ?? base.twilioAccountSid;
  assertAwsSecrets(mode, { responseSecret, originSecret });
  if (base.allowPrivateTargets) throw new Error('Private capture targets are forbidden in the AWS runtime.');
  const twilioAuthToken = twilioSecret.authToken ?? base.twilioAuthToken;
  const twilioFrom = twilioSecret.from ?? base.twilioFrom;
  const twilioReady = Boolean(twilioAccountSid && twilioAuthToken && twilioFrom);
  const smsProvider = reportOnly
    ? 'disabled'
    : base.smsProvider === 'local' ? 'local' : base.smsProvider === 'twilio' && twilioReady ? 'twilio' : 'disabled';
  const config = Object.freeze({
    ...base,
    // Report generation is deliberately unable to communicate with customers.
    // Besides reducing privilege, this prevents Lambda from treating the local
    // development outbox as writable application storage.
    emailProvider: reportOnly ? 'disabled' : base.emailProvider,
    integritySecret: responseSecret.integritySecret ?? base.integritySecret,
    originVerifySecret: originSecret.originVerifySecret,
    stripeSecretKey: stripeSecret.secretKey ?? base.stripeSecretKey,
    stripeWebhookSecret: stripeSecret.webhookSecret ?? base.stripeWebhookSecret,
    // Older secrets may contain an intentionally blank apiVersion. Do not let
    // that silently fall back to an account-wide Stripe default that can
    // change the response schema underneath the provider adapter.
    stripeApiVersion: stripeSecret.apiVersion || base.stripeApiVersion,
    stripePriceIds: Object.freeze({ ...base.stripePriceIds, ...(stripeSecret.priceIds ?? {}) }),
    smsProvider,
    smsEnabled: smsProvider === 'local' || smsProvider === 'twilio',
    twilioAccountSid,
    twilioAuthToken,
    twilioFrom,
  });
  if (!reportOnly && base.smsProvider === 'twilio' && !twilioReady) logger.warn('notification.sms.disabled', { reason: 'Twilio credentials are incomplete.' });
  if (!config.integritySecret || config.integritySecret.length < 32) throw new Error('Response/integrity secret is missing or too short.');

  const store = new DynamoStateStore({
    coreTableName: config.coreTableName,
    idempotencyTableName: config.idempotencyTableName,
    closedAccountsTableName: config.closedAccountsTableName,
    region: config.awsRegion,
    logger,
  });
  const assets = new S3Assets({
    bucketName: config.snapshotBucketName,
    region: config.snapshotBucketRegion,
    accountId: config.awsAccountId,
    stage: config.appEnv,
    availableRegions: config.availableCheckRegions,
  });
  const providers = new NotificationProviders(config, logger);
  await Promise.all([store.initialize(), assets.initialize(), providers.initialize()]);
  const notifier = new NotificationService({ store, providers, config, logger });
  const capture = config.captureFunctionName ? createRemoteCapture({ functionName: config.captureFunctionName, regionalFunctionName: config.regionalCaptureFunctionName, assets, region: config.awsRegion }) : undefined;
  const legacyMonitoring = new MonitoringEngine({ store, assets, config, logger, notifier, ...(capture ? { capture } : {}) });
  const durableRegionalCaptureReady = Boolean(config.captureQueueName && config.awsAccountId && config.captureResultQueueUrl && config.captureResultQueueRegion);
  const dispatcher = durableRegionalCaptureReady ? new RegionalCaptureDispatcher({
    queueName: config.captureQueueName,
    accountId: config.awsAccountId,
    resultQueueUrl: config.captureResultQueueUrl,
    resultQueueRegion: config.captureResultQueueRegion,
    logger,
    config,
  }) : null;
  const monitoring = dispatcher
    ? new RegionalMonitoringCoordinator({ store, assets, config, logger, notifier, dispatcher })
    : legacyMonitoring;
  if (!dispatcher && !reportOnly) logger.warn('capture.durable_regional.disabled', { reason: 'Regional queue configuration is incomplete; using the compatibility capture path.' });
  notifier.setAllClearHandler((alertId) => monitoring.promoteAlert(alertId));

  const billingProvider = createBillingProvider(mode, config);
  const billing = new BillingService({ store, provider: billingProvider, config, logger, notifier });
  const identityDirectory = ['api', 'worker'].includes(mode) && config.customerUserPoolId ? new CognitoCustomerDirectory({ userPoolId: config.customerUserPoolId, region: config.awsRegion }) : null;
  const accounts = new AccountService({ store, config, identityDirectory, notifier });
  const watcherService = new WatcherService({ store, config, assets });
  const actionLog = new ActionLogService({ store, config });
  const stewardSecurity = mode === 'api' ? new StewardSecurity({ store, config, notifier, logger }) : null;
  const reports = new ReportService({ store, assets, config, logger });
  const taskState = mode === 'worker' ? new MaintenanceTaskState({ tableName: config.coreTableName, region: config.awsRegion }) : null;
  const maintenance = new MaintenanceService({ notifier, billing, accounts, assets, store, config, logger, monitoring, taskState });
  const queuedMonitoring = new QueueMonitoringProxy({ queueUrl: config.checkQueueUrl, region: config.awsRegion, logger, store });
  return {
    mode, config, logger, store, assets, providers, notifier, monitoring,
    apiMonitoring: queuedMonitoring, billing, accounts, watcherService, actionLog, stewardSecurity, reports, maintenance,
  };
}


function createBillingProvider(mode, config) {
  // Inbound SES replies only mutate alert consensus/baselines. Constructing a
  // live payment adapter there would unnecessarily grant billing-secret access.
  if (mode === 'inbound-email' || mode === 'dispatcher' || mode === 'report') return new UnsupportedBillingProvider(`billing-disabled-for-${mode}`);
  return config.billingProvider === 'stripe'
    ? new StripeBillingProvider(config)
    : new UnsupportedBillingProvider(config.billingProvider || 'disabled');
}

class QueueMonitoringProxy {
  constructor({ queueUrl, region, logger, store }) { Object.assign(this, { queueUrl, region, logger, store }); this.client = null; }

  async check(watcherId, options = {}) {
    if (!this.queueUrl) throw Object.assign(new Error('Check queue is not configured.'), { statusCode: 503 });
    const requestedAt = ISO();
    const staleQueuedCutoff = Date.now() - 10 * 60_000;
    const directWatcher = await this.store.getEntity?.('watchers', watcherId);
    if (directWatcher && options.accountId && directWatcher.accountId !== options.accountId) {
      throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
    }
    const accountId = directWatcher?.accountId ?? options.accountId ?? null;
    const directEntities = [
      { collection: 'watchers', id: watcherId },
      ...(directWatcher?.activeCheckJobId ? [{ collection: 'jobs', id: directWatcher.activeCheckJobId }] : []),
    ];
    const mutate = (state) => {
      const watcher = state.watchers.find((item) => item.id === watcherId);
      if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      if (accountId && watcher.accountId !== accountId) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      if (!['active', 'checking'].includes(watcher.status)) throw Object.assign(new Error('Only active watchers can be checked.'), { statusCode: 409, code: 'WATCHER_NOT_ACTIVE' });
      if (options.manual) assertManualCaptureAllowed(watcher, state.accounts.find((item) => item.id === watcher.accountId));
      const pointedJob = state.jobs.find((item) => item.id === watcher.activeCheckJobId && item.type === 'check');
      const existing = (['queued', 'running'].includes(pointedJob?.status) ? pointedJob : null) ?? state.jobs
        .filter((item) => item.type === 'check' && item.watcherId === watcherId && ['queued', 'running'].includes(item.status))
        .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))[0];
      const runningLeaseLive = existing?.status === 'running'
        && watcher.status === 'checking'
        && watcher.leaseOwner === existing.leaseOwner
        && watcher.leaseExpiresAt
        && watcher.leaseExpiresAt > requestedAt;
      const queuedFresh = existing?.status === 'queued' && Date.parse(existing.requestedAt) >= staleQueuedCutoff;
      if (existing && (runningLeaseLive || queuedFresh)) return { job: existing, existing: true };
      if (existing) {
        const staleStatus = existing.status;
        existing.status = 'failed';
        existing.completedAt = requestedAt;
        existing.errorCode = staleStatus === 'running' ? 'CHECK_WORKER_LEASE_EXPIRED' : 'CHECK_QUEUE_STALE';
        existing.error = staleStatus === 'running'
          ? 'The previous check worker stopped responding before it could finish.'
          : 'The previous queued check did not start within ten minutes.';
        if (staleStatus === 'running' && watcher.status === 'checking' && (!watcher.leaseExpiresAt || watcher.leaseExpiresAt <= requestedAt)) {
          watcher.status = 'active'; watcher.leaseOwner = null; watcher.leaseExpiresAt = null;
          watcher.lastInternalError = existing.error; watcher.nextCheckAt = requestedAt; watcher.updatedAt = requestedAt;
        }
      }
      const job = {
        id: id('job'), type: 'check', accountId: watcher.accountId, watcherId: watcher.id,
        manual: Boolean(options.manual), status: 'queued', requestedAt, queuedAt: requestedAt,
        startedAt: null, completedAt: null, outcome: null, snapshotId: null,
        error: null, errorCode: null, leaseOwner: null,
      };
      state.jobs.push(job);
      watcher.activeCheckJobId = job.id;
      watcher.updatedAt = requestedAt;
      return { job, existing: false };
    };
    const claim = accountId && typeof this.store.transactAccount === 'function'
      ? await this.store.transactAccount(accountId, 'monitor.check.queue', mutate, { lookupPrefixes: [], directEntities, followWatcherReferences: true })
      : await this.store.transact('monitor.check.queue', mutate);
    if (claim.existing) return { ...claim.job, queued: claim.job.status === 'queued', deduplicated: true };

    const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
    this.client ??= new SQSClient({ region: this.region });
    try {
      await this.client.send(new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageGroupId: fairQueueGroupId(claim.job.accountId),
        MessageBody: JSON.stringify({ type: 'check', jobId: claim.job.id, accountId: claim.job.accountId, watcherId, manual: Boolean(options.manual), requestedAt }),
      }));
      this.logger.info('monitor.check.queued', { watcherId, jobId: claim.job.id, manual: Boolean(options.manual) });
      return { ...claim.job, queued: true, deduplicated: false };
    } catch (error) {
      const failMutation = (state) => {
        const job = state.jobs.find((item) => item.id === claim.job.id);
        if (job?.status === 'queued') {
          job.status = 'failed'; job.completedAt = ISO(); job.error = String(error.message).slice(0, 1000); job.errorCode = error.code ?? 'CHECK_QUEUE_SEND_FAILED';
        }
        const watcher = state.watchers.find((item) => item.id === watcherId);
        if (watcher?.activeCheckJobId === claim.job.id) watcher.activeCheckJobId = null;
        return null;
      };
      if (claim.job.accountId && typeof this.store.transactAccount === 'function') {
        await this.store.transactAccount(claim.job.accountId, 'monitor.check.queue_failed', failMutation, { lookupPrefixes: [], directEntities: [{ collection: 'jobs', id: claim.job.id }, { collection: 'watchers', id: watcherId }] });
      } else await this.store.transact('monitor.check.queue_failed', failMutation);
      throw error;
    }
  }

  async status(jobId, accountId) {
    let job = typeof this.store.getEntity === 'function' ? await this.store.getEntity('jobs', jobId) : null;
    let state;
    if (!job) {
      state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: [], directEntities: [{ collection: 'jobs', id: jobId }] }) : await this.store.read();
      job = state.jobs.find((item) => item.id === jobId);
    }
    if (!job) throw Object.assign(new Error('Check job not found.'), { statusCode: 404 });
    if (job.type !== 'check' || job.accountId !== accountId) throw Object.assign(new Error('Check job not found.'), { statusCode: 404 });
    const now = ISO();
    const watcher = typeof this.store.getEntity === 'function'
      ? await this.store.getEntity('watchers', job.watcherId)
      : state.watchers.find((item) => item.id === job.watcherId && item.accountId === accountId);
    const queuedStale = job.status === 'queued' && Date.parse(job.requestedAt) < Date.now() - 10 * 60_000;
    const runningStale = job.status === 'running' && (!watcher || watcher.status !== 'checking' || watcher.leaseOwner !== job.leaseOwner || !watcher.leaseExpiresAt || watcher.leaseExpiresAt <= now);
    if (queuedStale || runningStale) {
      const reconcile = (draft) => {
        const targetJob = draft.jobs.find((item) => item.id === jobId && item.accountId === accountId);
        const targetWatcher = draft.watchers.find((item) => item.id === targetJob?.watcherId && item.accountId === accountId);
        if (!targetJob || !['queued', 'running'].includes(targetJob.status)) return targetJob;
        const currentNow = ISO();
        const isQueuedStale = targetJob.status === 'queued' && Date.parse(targetJob.requestedAt) < Date.now() - 10 * 60_000;
        const isRunningStale = targetJob.status === 'running' && (!targetWatcher || targetWatcher.status !== 'checking' || targetWatcher.leaseOwner !== targetJob.leaseOwner || !targetWatcher.leaseExpiresAt || targetWatcher.leaseExpiresAt <= currentNow);
        if (!isQueuedStale && !isRunningStale) return targetJob;
        targetJob.status = 'failed'; targetJob.completedAt = currentNow;
        targetJob.errorCode = isQueuedStale ? 'CHECK_QUEUE_STALE' : 'CHECK_WORKER_LEASE_EXPIRED';
        targetJob.error = isQueuedStale ? 'The queued check did not start within ten minutes.' : 'The check worker stopped responding before it could finish.';
        if (isRunningStale && targetWatcher?.status === 'checking' && targetWatcher.leaseOwner === targetJob.leaseOwner) {
          targetWatcher.status = 'active'; targetWatcher.leaseOwner = null; targetWatcher.leaseExpiresAt = null;
          targetWatcher.lastInternalError = targetJob.error; targetWatcher.nextCheckAt = currentNow; targetWatcher.updatedAt = currentNow;
        }
        if (targetWatcher?.activeCheckJobId === targetJob.id) targetWatcher.activeCheckJobId = null;
        return targetJob;
      };
      job = typeof this.store.transactAccount === 'function'
        ? await this.store.transactAccount(accountId, 'monitor.check.reconcile_stale', reconcile, { lookupPrefixes: [], directEntities: [{ collection: 'jobs', id: jobId }, { collection: 'watchers', id: job.watcherId }] })
        : await this.store.transact('monitor.check.reconcile_stale', reconcile);
    }
    return job;
  }
}

async function secretJson(arn, region, optional, { refreshable = true } = {}) {
  if (!arn) {
    if (optional) return {};
    throw new Error('Required Secrets Manager ARN is missing.');
  }
  const key = `${region}:${arn}:${refreshable ? 'refreshable' : 'deployment'}`;
  const cached = secretCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({ region });
  const response = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  const raw = response.SecretString ?? Buffer.from(response.SecretBinary ?? []).toString('utf8');
  let value;
  try { value = JSON.parse(raw || '{}'); }
  catch { value = { value: raw }; }
  secretCache.set(key, { value, expiresAt: refreshable ? Date.now() + RUNTIME_REFRESH_MS : Infinity });
  return value;
}

export const awsRuntimeInternals = Object.freeze({ QueueMonitoringProxy, secretJson, createBillingProvider });
