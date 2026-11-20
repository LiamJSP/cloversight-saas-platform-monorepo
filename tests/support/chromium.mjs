import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { loadEnvFile } from '../../src/env.mjs';
import { loadConfig } from '../../src/config.mjs';

export async function testChromiumPath() {
  loadEnvFile();
  // The official Playwright container already carries the matching browser.
  // Native runs retain the explicitly installed browser from the local .env.
  const chromePath = process.env.WEBWATCH_TEST_BROWSER_MODE === 'bundled'
    ? chromium.executablePath()
    : loadConfig().chromePath;
  await access(chromePath);
  return chromePath;
}
