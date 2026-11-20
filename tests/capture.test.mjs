import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveCaptureTimeoutMs } from '../src/monitoring/capture.mjs';

test('watcher capture timeout is honored without exceeding the worker ceiling', () => {
  assert.equal(effectiveCaptureTimeoutMs(30000, 150000), 30000);
  assert.equal(effectiveCaptureTimeoutMs(120000, 90000), 90000);
  assert.equal(effectiveCaptureTimeoutMs(undefined, 150000), 150000);
});
