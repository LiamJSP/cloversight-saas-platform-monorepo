import { loadEnvFile } from '../src/env.mjs';
import { assertDeployableAllowlist, loadDeploymentSettings, requiredDeploymentValues } from '../src/deployment/settings.mjs';
import { stripeSecretConfig } from './stripe-secret-config.mjs';

loadEnvFile();
const settings = loadDeploymentSettings();
const missing = requiredDeploymentValues(settings).filter((name) => name !== 'WORKER_IMAGE_URI');
if (!process.env.AWS_DEPLOYMENT_ROLE_ARN) missing.push('AWS_DEPLOYMENT_ROLE_ARN');
if (settings.isStaging) assertDeployableAllowlist(settings.allowlist);
if (missing.length) throw new Error(`Missing deployment inputs: ${missing.join(', ')}. Run npm run aws:bootstrap first if access/artifact outputs are absent.`);
if (!process.argv.includes('--skip-secrets')) {
  const stripe = stripeSecretConfig({ ...process.env, STAGE: settings.stage });
  console.log(`Stripe ${stripe.mode.toUpperCase()} mode selected for AWS stage ${settings.stage}.`);
}
console.log('Deployment configuration preflight passed. No credential values printed.');
