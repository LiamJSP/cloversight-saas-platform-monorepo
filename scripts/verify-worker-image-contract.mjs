import { workerBase } from './worker-base.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workerImageSourceHash } from './worker-image-source-hash.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = path.join(projectRoot, '.local', 'worker-image.env');

function parseEnvironment(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => {
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`Malformed worker-image contract line: ${line}`);
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

const configuredUri = String(process.env.WW_WORKER_IMAGE_URI ?? '').trim();
if (!configuredUri) throw new Error('WW_WORKER_IMAGE_URI is unavailable while verifying the worker-image contract.');

let contractText;
try { contractText = await fs.readFile(contractPath, 'utf8'); }
catch (error) {
  if (error?.code === 'ENOENT') throw new Error('Missing .local/worker-image.env. Run npm run aws:build-worker from this release directory before deployment.');
  throw error;
}

const contract = parseEnvironment(contractText);
const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const currentSourceHash = await workerImageSourceHash();
if (contract.LAMBDA_NODE_BASE_IMAGE_DIGEST !== workerBase()) throw new Error('Worker base pin changed. Build the worker from this checkout.');
if (contract.WORKER_IMAGE_URI !== configuredUri) throw new Error('The configured WORKER_IMAGE_URI does not match the image built from this checkout. Copy the URI from .local/worker-image.env into .env.');
if (contract.WORKER_IMAGE_RELEASE_VERSION !== packageJson.version) throw new Error(`The worker image was built for release ${contract.WORKER_IMAGE_RELEASE_VERSION || 'unknown'}, not ${packageJson.version}. Rebuild it from this checkout.`);
if (contract.WORKER_IMAGE_SOURCE_SHA256 !== currentSourceHash) throw new Error('Capture/image source changed after the worker image was built. Run npm run aws:build-worker again and update WORKER_IMAGE_URI before deploying.');
console.log(`Worker image contract verified for release ${packageJson.version} and source ${currentSourceHash}.`);
