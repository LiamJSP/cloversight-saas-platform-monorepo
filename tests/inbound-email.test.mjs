import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInboundEmail } from '../src/notifications/inbound-email.mjs';

const message = Buffer.from([
  'From: "Ops Person" <ops@example.com>',
  'To: replies@reply.staging.websitemonitoringtool.com',
  'Subject: Re: [Page Outage] Homepage',
  'Message-ID: <reply-123@example.com>',
  'Content-Type: multipart/alternative; boundary="part"',
  '',
  '--part',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'All Clear',
  'Code: WW-42A7',
  '',
  '> quoted alert content',
  '--part--',
].join('\r\n'));

test('inbound email extracts verified sender-facing reply text and response code', () => {
  const parsed = parseInboundEmail(message);
  assert.equal(parsed.from, 'ops@example.com');
  assert.equal(parsed.messageId, 'reply-123@example.com');
  assert.match(parsed.text, /All Clear/);
  assert.equal(parsed.responseCode, 'WW-42A7');
});

test('inbound parser rejects oversized messages', () => {
  assert.throws(() => parseInboundEmail(Buffer.alloc(5_000_001)), /maximum size/i);
});
