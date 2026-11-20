import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDeploymentSettings } from '../src/deployment/settings.mjs';

const productionEnv = {
  STAGE: 'prod',
  COGNITO_STEWARD_MFA: 'ON',
  TECHNICAL_ALERTS_ENABLED: 'true',
  TECHNICAL_ALERT_EMAIL: 'technical@example.com',
  OPS_ALERT_EMAIL: 'ops@example.com',
  BUDGET_ALERT_EMAIL: 'budget@example.com',
};

test('Twilio is disabled when all optional credentials are blank', () => {
  const settings = loadDeploymentSettings({ ...productionEnv, TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '', TWILIO_FROM: '' });
  assert.equal(settings.twilioEnabled, false);
});

test('Twilio is enabled only when all three credentials are configured', () => {
  const settings = loadDeploymentSettings({ ...productionEnv, TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'secret', TWILIO_FROM: '+19025550123' });
  assert.equal(settings.twilioEnabled, true);
});

test('a partial Twilio configuration fails closed', () => {
  assert.throws(
    () => loadDeploymentSettings({ ...productionEnv, TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: '', TWILIO_FROM: '' }),
    /must either all be configured or all be blank/,
  );
});

test('worker concurrency reserves capacity for both check and result queues', () => {
  const settings = loadDeploymentSettings(productionEnv);
  assert.equal(settings.reservedCheckConcurrency, 2);
  assert.equal(settings.workerReservedConcurrency, 4);
  assert.throws(
    () => loadDeploymentSettings({ ...productionEnv, RESERVED_CHECK_CONCURRENCY: '3', WORKER_RESERVED_CONCURRENCY: '4' }),
    /must be at least RESERVED_CHECK_CONCURRENCY \+ 2/,
  );
});

test('the advertised Team plan cannot deploy with only one configured capture region', () => {
  assert.throws(
    () => loadDeploymentSettings({ ...productionEnv, REGIONAL_CHECK_REGIONS: 'us-east-1' }),
    /at least three supported AWS regions/,
  );
});
