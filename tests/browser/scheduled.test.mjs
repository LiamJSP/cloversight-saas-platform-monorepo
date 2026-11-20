import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { demoState } from '../../src/seed.mjs';
import { testChromiumPath } from '../support/chromium.mjs';

test('a due watcher reaches Chromium, the credit ledger and a readable customer snapshot', { timeout: 90000 }, async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloversight-schedule-'));
  const fixture = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' }); res.end('<title>Scheduled fixture</title><main>Available for this run</main>');
  });
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  t.after(() => fixture.close());
  const reservation = http.createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const state = demoState(), w = state.watchers[0];
  w.status = 'active'; w.nextCheckAt = new Date().toISOString();
  w.config.url = 'http://127.0.0.1:' + fixture.address().port + '/';
  w.config.methods = ['outage', 'text_change']; w.config.checkIntervalSeconds = 86400;
  await fs.writeFile(path.join(dir, 'state.json'), JSON.stringify(state));
  const child = spawn(process.execPath, ['src/server.mjs'], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: dir, APP_ENV: 'local', HOST: '127.0.0.1', PORT: String(port),
      LOCAL_STATE_PATH: path.join(dir, 'state.json'), LOCAL_ASSET_PATH: path.join(dir, 'assets'), LOCAL_OUTBOX_PATH: path.join(dir, 'outbox'),
      ALLOWED_PRIVATE_TARGETS: 'true', CHROME_EXECUTABLE_PATH: await testChromiumPath(), BILLING_PROVIDER: 'local', EMAIL_PROVIDER: 'local', SMS_PROVIDER: 'disabled' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = ''; child.stderr.on('data', bytes => { stderr = (stderr + bytes).slice(-3000); });
  t.after(async () => {
    if (child.exitCode === null && !child.signalCode) { const done = once(child, 'exit'); child.kill('SIGKILL'); await done; }
    await fs.rm(dir, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + port;
  let view;
  for (let attempt = 0; attempt < 150; attempt++) {
    assert.equal(child.exitCode, null, stderr);
    const response = await fetch(base + '/api/customer/bootstrap', { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (response?.ok) {
      view = await response.json();
      if (view.snapshots?.length) break;
    }
    await wait(400);
  }
  const snapshot = view?.snapshots?.find(s => s.watcherId === w.id);
  assert.ok(snapshot, 'scheduler must publish new customer evidence');
  assert.equal(snapshot.outcome, 'green');
  assert.ok(Date.parse(snapshot.capturedAt) >= Date.parse(w.nextCheckAt));
  const durable = JSON.parse(await fs.readFile(path.join(dir, 'state.json'), 'utf8'));
  assert.equal(durable.accounts[0].captureCreditsUsed, 1);
  assert.deepEqual(snapshot.screenshots.map(s => s.profile), ['desktop', 'tablet', 'mobile']);
  const png = await fetch(new URL(snapshot.screenshots[0].pngUrl, base));
  assert.equal(png.status, 200);
  assert.equal(Buffer.from(await png.arrayBuffer()).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});
