import path from 'node:path';
import { normalizeCheckRegions } from './domain/regions.mjs';
import { normalizeStripePaymentOrigins } from './billing/urls.mjs';

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function integer(name, fallback, min, max) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

export function loadConfig() {
  const root = process.cwd();
  const smsProvider = process.env.SMS_PROVIDER ?? 'local';
  const localTwilioReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  const availableCheckRegions = normalizeCheckRegions(String(process.env.AVAILABLE_CHECK_REGIONS ?? process.env.REGIONAL_CHECK_REGIONS ?? process.env.AWS_REGION ?? 'us-east-1').split(','));
  return Object.freeze({
    appEnv: process.env.APP_ENV ?? 'local',
    awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    awsAccountId: process.env.AWS_ACCOUNT_ID || undefined,
    coreTableName: process.env.CORE_TABLE_NAME || undefined,
    idempotencyTableName: process.env.IDEMPOTENCY_TABLE_NAME || undefined,
    closedAccountsTableName: process.env.CLOSED_ACCOUNTS_TABLE_NAME || undefined,
    snapshotBucketName: process.env.SNAPSHOT_BUCKET_NAME || undefined,
    inboundMailBucketName: process.env.INBOUND_MAIL_BUCKET_NAME || undefined,
    checkQueueUrl: process.env.CHECK_QUEUE_URL || undefined,
    captureQueueName: process.env.CAPTURE_QUEUE_NAME || undefined,
    captureResultQueueUrl: process.env.CAPTURE_RESULT_QUEUE_URL || undefined,
    captureResultQueueRegion: process.env.CAPTURE_RESULT_QUEUE_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    captureResultDeadlineSeconds: integer('CAPTURE_RESULT_DEADLINE_SECONDS', 900, 300, 3600),
    captureQueueMaxOutstanding: integer('CAPTURE_QUEUE_MAX_OUTSTANDING', 256, 1, 1000),
    captureQueueHealthCacheSeconds: integer('CAPTURE_QUEUE_HEALTH_CACHE_SECONDS', 10, 0, 60),
    captureQueueDeferralSeconds: integer('CAPTURE_QUEUE_DEFERRAL_SECONDS', 60, 15, 900),
    checkQueueMaxOutstanding: integer('CHECK_QUEUE_MAX_OUTSTANDING', 500, 1, 1000),
    dispatchBatchSize: integer('DISPATCH_BATCH_SIZE', 500, 1, 1000),
    billingQueueUrl: process.env.BILLING_QUEUE_URL || undefined,
    captureFunctionName: process.env.CAPTURE_FUNCTION_NAME || undefined,
    regionalCaptureFunctionName: process.env.REGIONAL_CAPTURE_FUNCTION_NAME || undefined,
    reportQueueUrl: process.env.REPORT_QUEUE_URL || undefined,
    availableCheckRegions: Object.freeze(availableCheckRegions.length ? availableCheckRegions : [process.env.AWS_REGION ?? 'us-east-1']),
    snapshotBucketRegion: process.env.SNAPSHOT_BUCKET_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    customerUserPoolId: process.env.CUSTOMER_USER_POOL_ID || undefined,
    host: process.env.HOST ?? '127.0.0.1',
    port: integer('PORT', 4010, 1, 65535),
    responseBaseUrl: process.env.RESPONSE_BASE_URL ?? `http://${process.env.HOST ?? '127.0.0.1'}:${integer('PORT', 4010, 1, 65535)}`,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    debugInternals: bool('DEBUG_INTERNALS'),
    statePath: path.resolve(root, process.env.LOCAL_STATE_PATH ?? '.local/state.json'),
    assetPath: path.resolve(root, process.env.LOCAL_ASSET_PATH ?? '.local/assets'),
    outboxPath: path.resolve(root, process.env.LOCAL_OUTBOX_PATH ?? '.local/outbox'),
    customerId: process.env.LOCAL_CUSTOMER_ID ?? 'acct_demo',
    customerEmail: process.env.LOCAL_CUSTOMER_EMAIL ?? 'demo@example.com',
    stewardOwnerSub: process.env.STEWARD_OWNER_SUB || undefined,
    stewardAuditTableName: process.env.STEWARD_AUDIT_TABLE_NAME || undefined,
    stewardUserPoolId: process.env.STEWARD_USER_POOL_ID || undefined,
    stewardId: process.env.LOCAL_STEWARD_ID ?? 'staff_demo',
    fakeNow: process.env.LOCAL_FAKE_NOW || undefined,
    chromePath: process.env.CHROME_EXECUTABLE_PATH ?? '/usr/bin/chromium',
    captureWidth: integer('CAPTURE_WIDTH', 1440, 640, 3840),
    captureHeight: integer('CAPTURE_HEIGHT', 900, 480, 2160),
    captureTimeoutMs: integer('CAPTURE_TIMEOUT_MS', 150000, 3000, 165000),
    maxPageBytes: integer('MAX_PAGE_BYTES', 10000000, 100000, 50000000),
    allowPrivateTargets: bool('ALLOWED_PRIVATE_TARGETS'),
    billingProvider: process.env.BILLING_PROVIDER ?? 'local',
    billingCurrency: process.env.BILLING_CURRENCY ?? 'USD',
    integritySecret: process.env.PRICE_INTEGRITY_SECRET ?? 'local-only-development-secret-change-me',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || undefined,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    // Keep the wire contract deterministic. Flexible billing-mode subscriptions
    // require Basil and the Create Preview Invoice / Invoice Payments models.
    stripeApiVersion: process.env.STRIPE_API_VERSION || '2025-06-30.basil',
    stripeRequestThreeDSecure: process.env.STRIPE_REQUEST_3DS ?? 'automatic',
    stripePaymentOrigins: Object.freeze(normalizeStripePaymentOrigins(String(process.env.STRIPE_PAYMENT_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean))),
    stripePriceIds: Object.freeze({
      free: process.env.STRIPE_PRICE_FREE || undefined,
      essentials: process.env.STRIPE_PRICE_ESSENTIALS || undefined,
      professional: process.env.STRIPE_PRICE_PROFESSIONAL || undefined,
      team: process.env.STRIPE_PRICE_TEAM || undefined,
      business: process.env.STRIPE_PRICE_BUSINESS || undefined,
      scale: process.env.STRIPE_PRICE_SCALE || undefined,
    }),
    emailProvider: process.env.EMAIL_PROVIDER ?? 'local',
    smsProvider,
    smsEnabled: smsProvider === 'local' || (smsProvider === 'twilio' && localTwilioReady),
    sesRegion: process.env.SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    sesFromAddress: process.env.SES_FROM_ADDRESS ?? 'alerts@websitemonitoringtool.com',
    sesReplyDomain: process.env.SES_REPLY_DOMAIN || undefined,
    sesConfigurationSet: process.env.SES_CONFIGURATION_SET || undefined,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || undefined,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || undefined,
    twilioFrom: process.env.TWILIO_FROM || undefined,
    twilioAllowedCountries: Object.freeze(String(process.env.TWILIO_ALLOWED_COUNTRIES ?? 'US,CA').split(',').map((value) => value.trim().toUpperCase()).filter(Boolean)),
    twilioInboundWebhookUrl: process.env.TWILIO_INBOUND_WEBHOOK_URL || undefined,
    twilioStatusWebhookUrl: process.env.TWILIO_STATUS_WEBHOOK_URL || undefined,
    twilioStatusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL || undefined,
    staffActionEmail: process.env.STAFF_ACTION_EMAIL || undefined,
    technicalAlertsEnabled: bool('TECHNICAL_ALERTS_ENABLED'),
    technicalAlertEmail: process.env.TECHNICAL_ALERT_EMAIL ?? 'liam@redcloversoftware.ca',
    snapshotRetentionDays: integer('SNAPSHOT_RETENTION_DAYS', 90, 1, 3650),
    closureGraceDays: integer('ACCOUNT_CLOSURE_GRACE_DAYS', 30, 1, 365),
    adminIdleMinutes: integer('ADMIN_IDLE_TIMEOUT_MINUTES', 30, 1, 240),
  });
}
