import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationProviders } from '../src/notifications/providers.mjs';

const logger = { debug() {}, info() {}, warn() {}, error() {} };

test('Twilio outbound validation uses Lookup v2 and limits destinations to US/CA', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith('https://lookups.twilio.com/v2/PhoneNumbers/')) {
      return new Response(JSON.stringify({ valid: true, country_code: 'CA', phone_number: '+19025550123' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ sid: 'SM123' }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  try {
    const providers = new NotificationProviders({
      emailProvider: 'local', smsProvider: 'twilio', outboxPath: '/tmp/unused',
      twilioAccountSid: 'AC123', twilioAuthToken: 'secret', twilioFrom: '+19025550000',
      twilioAllowedCountries: ['US', 'CA'], twilioStatusCallbackUrl: 'https://api.example.test/api/webhooks/twilio/status',
    }, logger);
    const result = await providers.sendSms({ to: '+19025550123', text: 'Code WW1234' });
    assert.equal(result.providerId, 'SM123');
    assert.equal(calls[1].options.body.get('SmartEncoded'), 'false');
    assert.ok(calls[1].options.signal instanceof AbortSignal);
    assert.match(calls[0].url, /^https:\/\/lookups\.twilio\.com\/v2\/PhoneNumbers\//);
    assert.match(calls[1].url, /^https:\/\/api\.twilio\.com\/2010-04-01\/Accounts\/AC123\/Messages\.json$/);
  } finally { globalThis.fetch = originalFetch; }
});

test('Twilio destination outside the allowlist fails before sending', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ valid: true, country_code: 'GB', phone_number: '+442071234567' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const providers = new NotificationProviders({ smsProvider: 'twilio', twilioAccountSid: 'AC123', twilioAuthToken: 'secret', twilioFrom: '+19025550000', twilioAllowedCountries: ['US', 'CA'] }, logger);
    await assert.rejects(() => providers.sendSms({ to: '+442071234567', text: 'Code WW1234' }), (error) => error.code === 'UNSUPPORTED_SMS_COUNTRY');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('disabled SMS fails before any provider request', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('fetch should not run'); };
  try {
    const providers = new NotificationProviders({ smsProvider: 'disabled', smsEnabled: false }, logger);
    await assert.rejects(() => providers.sendSms({ to: '+19025550123', text: 'Code WW1234' }), (error) => error.code === 'SMS_DISABLED');
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});
