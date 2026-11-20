import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { capturePage } from '../../src/monitoring/capture.mjs';
import { testChromiumPath } from '../support/chromium.mjs';

test('browser captures three full-page views and excludes ignored text', { timeout: 180000 }, async () => {
  const chromePath = await testChromiumPath(); // Fail when Chromium is missing; never skip this gate.
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end('<title>Fixture</title><h1>Stable</h1><div id="clock">12:34</div><div style="height:1600px">Tall page</div>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const result = await capturePage(`http://127.0.0.1:${port}`, { ignoredSelectors: ['#clock'], timeoutMs: 10000 }, {
      allowPrivateTargets: true, captureTimeoutMs: 150000, maxPageBytes: 1000000,
      chromePath, captureWidth: 800, captureHeight: 600,
    });
    assert.match(result.visibleText, /Stable/);
    assert.doesNotMatch(result.visibleText, /12:34/);
    assert.deepEqual(result.screenshots.map((item) => item.profile), ['desktop', 'tablet', 'mobile']);
    const { PNG } = await import('pngjs');
    for (const screenshot of result.screenshots) {
      const decoded = PNG.sync.read(screenshot.png);
      assert.ok(decoded.height > screenshot.viewportHeight);
    }
    assert.equal(result.width, 800);
    assert.equal(result.fullPage, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
