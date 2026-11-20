import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResponsePrompt, renderResponseRecorded, renderUnsubscribePrompt, renderUnsubscribeRecorded } from '../src/notifications/response-page.mjs';

test('alert response pages use the public brand navigation and escape signed tokens', () => {
  const page = renderResponsePrompt('signed"><token');
  assert.match(page, /class="site-header"/);
  assert.match(page, /href="\/app\/\?action=login">Log in/);
  assert.match(page, /value="signed&quot;&gt;&lt;token"/);
  assert.doesNotMatch(page, /value="signed"><token"/);
});

test('recorded response page presents human-readable alert status', () => {
  const page = renderResponseRecorded('all_clear');
  assert.match(page, /All clear\./);
  assert.match(page, /New green baseline approved/);
  assert.doesNotMatch(page, />all_clear</);
});

test('unsubscribe GET is a confirmation page and the recorded page explains the global block', () => {
  const prompt = renderUnsubscribePrompt('signed"><token');
  assert.match(prompt, /Opening this page did not change your preference/);
  assert.match(prompt, /Stop customer alert email/);
  assert.match(prompt, /value="signed&quot;&gt;&lt;token"/);
  const recorded = renderUnsubscribeRecorded('unsubscribed');
  assert.match(recorded, /Customer alerts blocked platform-wide/);
  assert.match(recorded, /Customer notification settings cannot override your choice/);
});
