import test from 'node:test';
import assert from 'node:assert/strict';
import { safeSesReceiptVerdicts } from '../src/notifications/ses-verdicts.mjs';

const base = {
  virusVerdict: { status: 'PASS' },
  spamVerdict: { status: 'PASS' },
  spfVerdict: { status: 'PASS' },
  dkimVerdict: { status: 'PASS' },
  dmarcVerdict: { status: 'PASS' },
};

test('SES automatic replies require aligned DMARC and clean content verdicts', () => {
  assert.equal(safeSesReceiptVerdicts(base), true);
  assert.equal(safeSesReceiptVerdicts({ ...base, dmarcVerdict: { status: 'FAIL' } }), false);
  assert.equal(safeSesReceiptVerdicts({ ...base, dmarcVerdict: { status: 'GRAY' } }), false);
  assert.equal(safeSesReceiptVerdicts({ ...base, dmarcVerdict: undefined }), false);
  assert.equal(safeSesReceiptVerdicts({ ...base, spamVerdict: { status: 'FAIL' } }), false);
  assert.equal(safeSesReceiptVerdicts({ ...base, virusVerdict: { status: 'FAIL' } }), false);
});
