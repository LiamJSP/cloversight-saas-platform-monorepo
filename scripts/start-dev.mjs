import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadEnvFile } from '../src/env.mjs';

// Create local configuration once. Existing private configuration and state survive.
if (!fs.existsSync('.env')) {
  const template = fs.readFileSync('.env.example', 'utf8');
  const secret = crypto.randomBytes(48).toString('base64');
  fs.writeFileSync('.env', template.replace(/^PRICE_INTEGRITY_SECRET=.*$/m, `PRICE_INTEGRITY_SECRET=${secret}`), { flag: 'wx', mode: 0o600 });
}
loadEnvFile();
function executable(file) { try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch { return false; } }
// Resolve this Playwright revision instead of selecting an older downloaded
// executable merely because its directory sorts first after an upgrade.
const browsersDir = path.resolve('.local-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersDir;
const { chromium } = await import('playwright');
function bundledBrowser() { const file = chromium.executablePath(); return executable(file) ? file : null; }
const configured = process.env.CHROME_EXECUTABLE_PATH;
// A previously installed project-local path follows the new driver revision.
// Explicit system/custom executables remain deliberate owner overrides.
const configuredProjectBrowser = configured && path.resolve(configured).startsWith(`${browsersDir}${path.sep}`);
if (configured && !configuredProjectBrowser && configured !== '/usr/bin/chromium' && !executable(configured)) throw new Error('Configured CHROME_EXECUTABLE_PATH is unavailable; correct it in .env before starting dev.');
let browser = configuredProjectBrowser ? bundledBrowser() : [configured, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean).find(executable) || bundledBrowser();
function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!browser) {
  console.log('No system Chromium found; installing the browser pinned by the project lock.');
  run(['node_modules/playwright/cli.js', 'install', 'chromium'], { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersDir });
  browser = bundledBrowser();
  if (!browser) throw new Error('Chromium installation did not produce an executable; see README.md for browser OS prerequisites.');
}
run(['node_modules/astro/bin/astro.mjs', 'build', '--root', 'apps/public']);
run(['scripts/build-regional-globe.mjs']);
// Explicitly local providers and loopback binding prevent a copied deployment
// .env from turning dev startup into a live payment/email/SMS operation.
run(['src/server.mjs'], { ...process.env, APP_ENV: 'local', HOST: '127.0.0.1', BILLING_PROVIDER: 'local', EMAIL_PROVIDER: 'local', SMS_PROVIDER: 'disabled', CHROME_EXECUTABLE_PATH: browser });
