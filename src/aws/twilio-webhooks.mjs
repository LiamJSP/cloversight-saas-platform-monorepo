import { createHmac, timingSafeEqual } from 'node:crypto';
import { extractResponseCode } from '../notifications/replies.mjs';
import { ISO } from '../lib.mjs';

export async function handleTwilioWebhook({ event, runtime, kind }) {
  const raw = event.body ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8').toString('utf8') : '';
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = header(event.headers, 'x-twilio-signature');
  const expectedUrl = kind === 'status' ? runtime.config.twilioStatusWebhookUrl : runtime.config.twilioInboundWebhookUrl;
  if (!runtime.config.twilioAuthToken || !expectedUrl) throw Object.assign(new Error('Twilio webhook verification is not configured.'), { statusCode: 503 });
  if (!validateTwilioRequest(runtime.config.twilioAuthToken, signature, expectedUrl, params)) throw Object.assign(new Error('Twilio webhook signature is invalid.'), { statusCode: 403 });

  if (kind === 'status') {
    const messageSid = String(params.MessageSid ?? '');
    const status = String(params.MessageStatus ?? '').toLowerCase();
    await runtime.store.transact('twilio.delivery.status', (state) => {
      const notification = state.notifications.find((item) => item.providerId === messageSid);
      if (!notification) return null;
      notification.deliveryStatus = status;
      notification.deliveryUpdatedAt = ISO();
      if (params.ErrorCode) notification.deliveryError = `${params.ErrorCode}: ${params.ErrorMessage ?? ''}`.slice(0, 1000);
      if (['failed', 'undelivered'].includes(status) && notification.status === 'sent') notification.status = 'delivery_failed';
      return null;
    });
    return twiml();
  }

  const country = String(params.FromCountry ?? '').toUpperCase();
  if (country && !runtime.config.twilioAllowedCountries.includes(country)) {
    runtime.logger.warn('twilio.inbound.unsupported_country', { country, messageSid: params.MessageSid });
    return twiml();
  }
  const body = String(params.Body ?? '');
  try {
    const result = await runtime.notifier.recordInboundReply({
      channel: 'sms',
      sender: params.From,
      body,
      code: extractResponseCode({ body }),
      providerMessageId: params.MessageSid,
    });
    runtime.logger.info('twilio.inbound.recorded', { messageSid: params.MessageSid, alertId: result.alertId, duplicate: Boolean(result.duplicate) });
  } catch (error) {
    if (['INVALID_REPLY', 'REPLY_NOT_FOUND', 'AMBIGUOUS_REPLY'].includes(error.code) || [400, 404, 409].includes(error.statusCode)) {
      runtime.logger.warn('twilio.inbound.rejected', { messageSid: params.MessageSid, code: error.code, message: error.message });
      return twiml();
    }
    throw error;
  }
  return twiml();
}

export function validateTwilioRequest(authTokenOrInput, signatureArg, urlArg, paramsArg) {
  const input = typeof authTokenOrInput === 'object' && authTokenOrInput !== null
    ? authTokenOrInput
    : { authToken: authTokenOrInput, signature: signatureArg, url: urlArg, params: paramsArg };
  const { authToken, signature, url, params = {} } = input;
  const payload = String(url) + Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('');
  const expected = createHmac('sha1', String(authToken ?? '')).update(payload, 'utf8').digest('base64');
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature ?? ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function twiml() {
  return { statusCode: 200, headers: { 'content-type': 'text/xml; charset=utf-8', 'cache-control': 'no-store' }, body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>' };
}
function header(headers = {}, name) {
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return String(found?.[1] ?? '');
}
