import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { testChromiumPath } from '../support/chromium.mjs';
import { stagingTarget, stagingGet, expectStagingStatus } from '../../scripts/staging-test-client.mjs';

test('staging customer portal loads the correct team and shows Check Status without mutating state', { timeout: 60000 }, async () => {
  const chromePath = await testChromiumPath();
  const target = stagingTarget();
  const bootstrap = expectStagingStatus(await stagingGet(target, '/api/customer/bootstrap'), [200], 'browser staging bootstrap');
  if (bootstrap.account?.id !== target.accountId || !bootstrap.watchers?.length) throw new Error('Browser staging fixture must belong to the expected account and have a watcher.');
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    try {
      await page.addInitScript((accessToken) => {
        sessionStorage.setItem('webwatch.customer.oauth.tokens', JSON.stringify({ access_token: accessToken }));
      }, target.token);
      let count = 1, exceeded = false;
      await page.route('**/api/**', async (route) => {
        const req = route.request();
        if (req.method() !== 'GET' || new URL(req.url()).hostname !== target.host || ++count > 20) {
          exceeded = true;
          await route.abort();
        } else await route.continue();
      });
      await page.goto(`${target.baseUrl}/app/watchers/`, { waitUntil: 'domcontentloaded' });
      const watcher = page.locator(`[data-watcher-row="${bootstrap.watchers[0].id}"]`);
      await watcher.waitFor();
      await watcher.locator('details.watcher-actions summary').click();
      await watcher.locator('[data-action="notification-activity"]').click();
      const dialog = page.getByRole('dialog', { name: 'Check Status' });
      await dialog.waitFor();
      assert.match(await dialog.textContent(), /Phase A[\s\S]*Phase B/);
      assert.equal(await dialog.locator('.check-phase-divider').count(), 1);
      assert.equal(exceeded, false, 'browser exceeded the read-only 20-request ceiling or attempted a mutation');
    } finally { await page.close(); }
  } finally { await browser.close(); }
});
