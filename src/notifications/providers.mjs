import { fitsSingleSms } from './sms.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { id, ISO } from '../lib.mjs';

const SES_TRANSPORT_REVISION = '0.5.0';

export class NotificationProviders {
  constructor(config, logger) { this.config = config; this.logger = logger; this.phoneCache = new Map(); this.sesClient = null; }
  async initialize() {
    if (this.config.emailProvider === 'local' || this.config.smsProvider === 'local') await fs.mkdir(this.config.outboxPath, { recursive: true });
  }

  async sendEmail(message) {
    if (this.config.emailProvider === 'local') return this.#outbox('email', message);
    if (this.config.emailProvider === 'ses') {
      const { SESv2Client, SendEmailCommand } = await import('@aws-sdk/client-sesv2');
      // The incident service owns its bounded retry and attempt budget. Do not
      // let an SDK retry hide an additional physical SES send or acceptance.
      this.sesClient ??= new SESv2Client({ region: this.config.sesRegion, maxAttempts: 1 });
      this.logger.info('notification.email.ses.requested', { transportRevision: SES_TRANSPORT_REVISION, notificationId: message.notificationId ?? null, to: redact(message.to), fromDomain: emailDomain(this.config.sesFromAddress), region: this.config.sesRegion, configurationSet: this.config.sesConfigurationSet });
      try {
        const result = await this.sesClient.send(new SendEmailCommand({
          // SES v2 documents this field as the verified email address. Keep it
          // byte-for-byte aligned with the CloudFormation-provisioned identity;
          // branding belongs in the message body, not in this transport field.
          FromEmailAddress: this.config.sesFromAddress,
          ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
          Destination: { ToAddresses: [message.to] },
          Content: { Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Headers: Array.isArray(message.headers) ? message.headers.map((header) => ({ Name: header.name, Value: header.value })) : undefined,
            Body: {
              Text: { Data: message.text, Charset: 'UTF-8' },
              Html: { Data: message.html ?? `<pre>${escapeHtml(message.text)}</pre>`, Charset: 'UTF-8' },
            },
          } },
          ConfigurationSetName: this.config.sesConfigurationSet,
          EmailTags: message.notificationId ? [{ Name: 'notification_id', Value: safeTag(message.notificationId) }] : undefined,
        }), { abortSignal: AbortSignal.timeout(15_000) });
        this.logger.info(result.MessageId ? 'notification.email.ses.accepted' : 'notification.email.ses.ambiguous', { transportRevision: SES_TRANSPORT_REVISION, notificationId: message.notificationId ?? null, providerId: result.MessageId ?? null, requestId: result.$metadata?.requestId ?? null });
        return { providerId: result.MessageId, deliveryState: result.MessageId ? 'accepted' : 'ambiguous' };
      } catch (error) {
        const status = Number(error.$metadata?.httpStatusCode);
        // An explicit client rejection is a known failure. A timeout, lost
        // response or server error can leave acceptance unknown.
        error.deliveryState = status >= 400 && status < 500 ? 'failed' : 'ambiguous';
        this.logger.error('notification.email.ses.rejected', { transportRevision: SES_TRANSPORT_REVISION, notificationId: message.notificationId ?? null, name: error.name, code: error.code, requestId: error.$metadata?.requestId ?? null, message: error.message });
        throw error;
      }
    }
    throw new Error(`Unsupported email provider ${this.config.emailProvider}.`);
  }

  async sendSms(message) {
    if (!fitsSingleSms(message.text)) throw Object.assign(new Error('SMS exceeds the single-segment limit.'), { code: 'SMS_SEGMENT_LIMIT' });
    if (this.config.smsEnabled === false || this.config.smsProvider === 'disabled') {
      throw Object.assign(new Error('SMS notifications are disabled for this deployment.'), { code: 'SMS_DISABLED' });
    }
    if (this.config.smsProvider === 'local') return this.#outbox('sms', message);
    if (this.config.smsProvider === 'twilio') {
      const destination = await this.#validatedPhone(message.to);
      if (!this.config.twilioFrom) throw new Error('TWILIO_FROM is required.');
      const result = await this.#twilioRequest(`/2010-04-01/Accounts/${encodeURIComponent(this.config.twilioAccountSid)}/Messages.json`, 'POST', {
        To: destination,
        From: this.config.twilioFrom,
        Body: message.text,
        SmartEncoded: 'false',
        ...(this.config.twilioStatusCallbackUrl ? { StatusCallback: this.config.twilioStatusCallbackUrl } : {}),
      });
      return { providerId: result.sid };
    }
    throw new Error(`Unsupported SMS provider ${this.config.smsProvider}.`);
  }

  async #twilioRequest(path, method = 'GET', body = null, baseUrl = 'https://api.twilio.com') {
    const { twilioAccountSid: sid, twilioAuthToken: token } = this.config;
    if (!sid || !token) throw new Error('Twilio credentials are incomplete.');
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(15_000),
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: body ? new URLSearchParams(body) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(`Twilio rejected operation: ${result.message ?? response.status}`), { code: result.code ?? 'TWILIO_ERROR', providerResponse: result });
    return result;
  }

  async #validatedPhone(raw) {
    const input = String(raw).trim();
    const cached = this.phoneCache.get(input);
    if (cached && cached.expiresAt > Date.now()) return cached.phoneNumber;
    const result = await this.#twilioRequest(`/v2/PhoneNumbers/${encodeURIComponent(input)}`, 'GET', null, 'https://lookups.twilio.com');
    if (!result.valid || !this.config.twilioAllowedCountries.includes(String(result.country_code ?? '').toUpperCase())) {
      throw Object.assign(new Error('SMS destinations are currently limited to valid United States and Canadian numbers.'), { code: 'UNSUPPORTED_SMS_COUNTRY' });
    }
    const phoneNumber = result.phone_number ?? input;
    this.phoneCache.set(input, { phoneNumber, expiresAt: Date.now() + 24 * 3600_000 });
    return phoneNumber;
  }

  async #outbox(channel, message) {
    const providerId = id(`local_${channel}`);
    const record = { providerId, channel, createdAt: ISO(), ...message };
    await fs.writeFile(path.join(this.config.outboxPath, `${providerId}.json`), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    this.logger.info('notification.local_outbox', { channel, providerId, to: redact(message.to) });
    return { providerId, deliveryState: 'local_queued' };
  }
}
function safeTag(value) { return String(value).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256); }
function redact(value) { const text = String(value); return text.length < 6 ? '***' : `${text.slice(0, 2)}***${text.slice(-2)}`; }
function emailDomain(value) { return String(value).match(/@([^>\s]+)>?$/)?.[1] ?? 'invalid'; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
