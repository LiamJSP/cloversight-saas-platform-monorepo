import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { beginPortalAuth, createPortalAuth } from '../apps/shared/auth.js';
import { assertAwsConfiguration } from '../src/security/runtime-boundary.mjs';
import { loadDeploymentSettings } from '../src/deployment/settings.mjs';

test('both hosted portal entry points reject local demo configuration', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'cloversight.app' } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'location', previous) : delete globalThis.location);
  for (const role of ['customer', 'steward']) {
    const request = t.mock.method(globalThis, 'fetch', async () => Response.json({ mode: 'local', role }));
    await assert.rejects(createPortalAuth(role), /requires a Cognito/);
    await assert.rejects(beginPortalAuth(role), /requires a Cognito/);
    request.mock.restore();
  }
});

test('hosted authentication validates callback and API origins before starting OAuth', async t => {
  const origin = 'https://cloversight.app';
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'cloversight.app', origin } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'location', previous) : delete globalThis.location);
  const normal = { mode: 'cognito', role: 'customer', cognitoDomain: 'https://auth.cloversight.app',
    clientId: 'testclient', redirectUri: origin + '/app/', logoutUri: origin + '/' };
  for (const patch of [{ redirectUri: 'https://staging.example.test/app/' }, { apiBaseUrl: 'https://staging.example.test' }]) {
    const request = t.mock.method(globalThis, 'fetch', async () => Response.json({ ...normal, ...patch }));
    await assert.rejects(beginPortalAuth('customer'), /origin/);
    request.mock.restore();
  }
});

test('AWS rejects development providers and missing stage before initializing services', () => {
  const normal = { appEnv: 'prod', billingProvider: 'stripe', emailProvider: 'ses', sesFromAddress: 'alerts@example.test', smsProvider: 'disabled' };
  for (const mode of ['api', 'worker', 'billing']) {
    for (const key of ['appEnv', 'billingProvider', 'emailProvider', 'smsProvider']) {
      assert.throws(() => assertAwsConfiguration(mode, { ...normal, [key]: 'local' }));
    }
    assert.throws(() => assertAwsConfiguration(mode, { ...normal, sesFromAddress: undefined }));
    assert.doesNotThrow(() => assertAwsConfiguration(mode, normal));
    assert.doesNotThrow(() => assertAwsConfiguration(mode, { ...normal, appEnv: 'staging', smsProvider: 'twilio' }));
  }
});

test('the development HTTP server rejects a hosted stage or a public listener before startup', () => {
  const file = fileURLToPath(new URL('../src/server.mjs', import.meta.url));
  for (const env of [{ APP_ENV: 'prod', HOST: '127.0.0.1' }, { APP_ENV: 'local', HOST: '0.0.0.0' }]) {
    const run = spawnSync(process.execPath, [file], { env: { ...process.env, ...env }, encoding: 'utf8', timeout: 5000 });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /loopback HOST/);
  }
});

test('new environments default to the production brand and require an explicit technical-alert recipient', () => {
  const config = loadDeploymentSettings({ STAGE: 'beta' });
  assert.equal(config.baseDomain, 'cloversight.app');
  assert.equal(config.technicalAlertEmail, '');
  assert.throws(() => loadDeploymentSettings({ STAGE: 'beta', TECHNICAL_ALERTS_ENABLED: 'true' }), /TECHNICAL_ALERT_EMAIL/);
});
