import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { demoState } from '../../src/seed.mjs';
import { testChromiumPath } from '../support/chromium.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
async function availablePort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

test('real local portals render the regional status, restore keyboard focus, and navigate staff pages', { timeout: 120000 }, async (t) => {
  const chromePath = await testChromiumPath();
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ww-browser-portals-'));
  let child;
  let browser;
  t.after(async () => {
    await browser?.close();
    if (child?.exitCode === null && !child.signalCode) child.kill('SIGTERM');
    if (child && child.exitCode === null && !child.signalCode) await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (child?.exitCode === null && !child.signalCode) child.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  });
  const state = demoState();
  const watcher = state.watchers[0];
  state.accounts[0].planId = 'professional';
  watcher.config.checkRegions = ['us-east-1', 'eu-west-1'];
  watcher.nextCheckAt = new Date(Date.now() + 86400_000).toISOString();
  watcher.activeCheckJobId = 'job_status_fixture';
  const now = new Date().toISOString();
  state.jobs.push({ id: watcher.activeCheckJobId, type: 'check', accountId: watcher.accountId, watcherId: watcher.id, status: 'running', requestedAt: now, startedAt: now, captureRun: { id: 'run_fixture' }, error: 'internal-secret-do-not-display' });
  // The local server runs maintenance at startup; capture results need real
  // creation times or that sweep removes them before the portal reads them.
  state.jobs.push({ id: 'capture_east', type: 'capture-result', accountId: watcher.accountId, watcherId: watcher.id, parentJobId: watcher.activeCheckJobId, runId: 'run_fixture', region: 'us-east-1', createdAt: now, result: { status: 'internal_error', error: 'private-worker-detail' } });
  state.jobs.push({ id: 'capture_europe', type: 'capture-result', accountId: watcher.accountId, watcherId: watcher.id, parentJobId: watcher.activeCheckJobId, runId: 'run_fixture', region: 'eu-west-1', createdAt: now, result: { status: 'target_outage', error: 'private-target-detail' } });
  await writeFile(path.join(directory, 'state.json'), JSON.stringify(state));
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: projectRoot,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, APP_ENV: 'local', HOST: '127.0.0.1', PORT: String(port), LOCAL_STATE_PATH: path.join(directory, 'state.json'), LOCAL_ASSET_PATH: path.join(directory, 'assets'), LOCAL_OUTBOX_PATH: path.join(directory, 'outbox'), BILLING_PROVIDER: 'local', EMAIL_PROVIDER: 'local', SMS_PROVIDER: 'disabled', AVAILABLE_CHECK_REGIONS: 'us-east-1,eu-west-1', LOG_LEVEL: 'error' },
    stdio: 'ignore',
  });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Local portal fixture exited before becoming healthy.');
    ready = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) }).then((r) => r.ok, () => false);
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'local portal fixture did not start');
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });

  await t.test('watcher modal shows both phases and safe regional outcomes, with Escape returning focus', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${base}/app/watchers/`);
      await page.locator('[data-watcher-row="watch_demo"]').waitFor();
      await page.locator('[data-watcher-row="watch_demo"] details.watcher-actions summary').click();
      const trigger = page.locator('[data-watcher-row="watch_demo"] [data-action="notification-activity"]');
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Check Status' });
      await dialog.waitFor();
      assert.equal(await dialog.locator('[data-check-status]').count(), 1);
      assert.equal(await dialog.locator('.check-phase-divider').count(), 1);
      assert.equal(await dialog.locator('.notification-phase').count(), 1);
      // textContent preserves the labels as written; innerText applies CSS
      // text-transform and makes this assertion depend on presentation.
      assert.match(await dialog.textContent(), /Phase A[\s\S]*Watcher error[\s\S]*Website issue[\s\S]*Phase B/);
      assert.deepEqual(await dialog.locator('.check-region .badge').allTextContents(), ['Watcher error', 'Website issue']);
      assert.doesNotMatch(await dialog.textContent(), /internal-secret|private-worker-detail|private-target-detail/);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog', { name: 'Check Status' }).count(), 0);
      await page.waitForFunction(() => document.activeElement?.dataset.action === 'notification-activity');
    } finally { await page.close(); }
  });

  await t.test('phone public menu keeps close in view while links scroll with 1rem spacing', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 480 } });
    try {
      await page.goto(`${base}/`);
      await page.evaluate(() => window.scrollTo(0, 800));
      const header = page.locator('.public-header');
      assert.ok(Math.abs((await header.boundingBox()).y) <= 1, 'phone navbar must stay at the viewport top');
      await page.locator('[data-public-menu]').click();
      const items = page.locator('.public-menu-items');
      const close = page.locator('[data-public-menu-close]');
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-public-menu-close'));
      // Wait for geometry, not a wall-clock sleep during the entrance animation.
      await page.waitForFunction(() => [...document.getAnimations()].every((animation) => animation.playState !== 'running' || animation.effect?.target?.closest?.('.public-nav-links') == null));
      const before = await close.boundingBox();
      const spacing = await items.evaluate((node) => {
        const [first, second] = node.querySelectorAll('a');
        return { actual: second.getBoundingClientRect().top - first.getBoundingClientRect().bottom, expected: parseFloat(getComputedStyle(document.documentElement).fontSize) };
      });
      assert.ok(Math.abs(spacing.actual - spacing.expected) <= 1, 'adjacent menu items must have 1rem vertical margin');
      const scrolled = await items.evaluate((node) => { node.scrollTop = node.scrollHeight; return node.scrollTop; });
      assert.ok(scrolled > 0, 'short portrait fixture must scroll the menu');
      const after = await close.boundingBox();
      assert.ok(Math.abs(after.y - before.y) <= 1 && after.y + after.height <= 480, 'close stays visible as menu links scroll');
      await close.click();
      assert.equal(await page.locator('[data-public-menu]').getAttribute('aria-expanded'), 'false');
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-public-menu'));
    } finally { await page.close(); }
  });

  await t.test('phone customer navigation keeps its close control while the page and menu scroll', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 480 } });
    try {
      await page.goto(`${base}/app/watchers/`);
      await page.locator('[data-watcher-row="watch_demo"]').waitFor();
      await page.evaluate(() => window.scrollTo(0, 800));
      const toggle = page.locator('#portal-menu-toggle');
      await toggle.click();
      const before = await toggle.boundingBox();
      const scroll = await page.locator('#portal-navigation').evaluate((node) => { node.scrollTop = node.scrollHeight; return node.scrollTop; });
      assert.ok(scroll > 0, 'phone customer menu fixture must scroll');
      const after = await toggle.boundingBox();
      assert.ok(Math.abs(after.y - before.y) <= 1 && after.y >= 0 && after.y + after.height <= 480);
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    } finally { await page.close(); }
  });

  await t.test('local steward session enters the console and browser history returns to the dashboard', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${base}/stewards/`);
      await page.locator('#steward-navigation [data-view="dashboard"]').waitFor();
      await page.locator('#steward-navigation [data-view="accounts"]').click();
      assert.match(new URL(page.url()).pathname, /\/stewards\/accounts\/$/);
      await page.goBack();
      await page.waitForURL(`${base}/stewards/`);
      assert.equal(await page.locator('#steward-navigation [data-view="dashboard"].active').count(), 1);
    } finally { await page.close(); }
  });
});
