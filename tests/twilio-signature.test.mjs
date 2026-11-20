import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validateTwilioRequest } from '../src/aws/twilio-webhooks.mjs';

function signature(url, params, token) {
  const canonical = url + Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('');
  return createHmac('sha1', token).update(canonical).digest('base64');
}

test('Twilio webhook signature binds the exact public URL and sorted parameters', () => {
  const url = 'https://api.example.test/api/webhooks/twilio/inbound';
  const params = { Body: 'ALL CLEAR WW-42A7', From: '+19025550123', MessageSid: 'SM123' };
  const token = 'twilio-test-token';
  assert.equal(validateTwilioRequest({ url, params, signature: signature(url, params, token), authToken: token }), true);
  assert.equal(validateTwilioRequest({ url: `${url}?changed=1`, params, signature: signature(url, params, token), authToken: token }), false);
});
