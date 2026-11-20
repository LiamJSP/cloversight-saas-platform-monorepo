import { randomUUID } from 'node:crypto';
import { loadConfig } from '../config.mjs';
import { capturePage } from '../monitoring/capture.mjs';
import { S3Assets } from '../storage/s3-assets.mjs';

let assets;

export async function handler(event) {
  const config = loadConfig();
  assets ??= new S3Assets({ bucketName: config.snapshotBucketName, region: config.snapshotBucketRegion });
  const jobId = String(event?.jobId ?? '');
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(jobId)) throw new Error('Invalid capture job ID.');
  const requestNonce = String(event?.requestNonce ?? '');
  if (!/^[A-Za-z0-9_-]{16,120}$/.test(requestNonce)) throw new Error('Invalid capture request nonce.');
  const watcherConfig = sanitizeWatcherConfig(event?.watcherConfig);
  const metadataOnly = event?.metadataOnly === true;
  const capture = await capturePage(String(event?.url ?? ''), watcherConfig, config, { metadataOnly });
  if (!Array.isArray(capture.screenshots) || (metadataOnly ? capture.screenshots.length !== 0 : capture.screenshots.length !== 3)) throw new Error('Capture did not return the required responsive artifact set.');
  // Even duplicate invokes of the same requested job get distinct artifacts.
  // The caller verifies this binding before reading or deleting anything.
  const executionId = randomUUID();
  const artifactPrefix = `capture-tmp/${jobId}/${requestNonce}/${executionId}`;
  const screenshotKeys = Object.fromEntries(capture.screenshots.map((item) => [item.profile, `${artifactPrefix}/${item.profile}.png`]));
  const textKey = `${artifactPrefix}/visible.txt`;
  await Promise.all([
    ...(!metadataOnly ? capture.screenshots.map((item) => assets.put(screenshotKeys[item.profile], item.png, { contentType: 'image/png', cacheControl: 'no-store' })) : []),
    assets.put(textKey, Buffer.from(capture.visibleText), { contentType: 'text/plain; charset=utf-8', cacheControl: 'no-store' }),
  ]);
  const { screenshots, visibleText, html, ...metadata } = capture;
  return {
    jobId, requestNonce, executionId,
    screenshotKeys: metadataOnly ? {} : screenshotKeys,
    textKey,
    capture: { ...metadata, region: process.env.AWS_REGION ?? null, screenshots: metadataOnly ? [] : screenshots.map(({ png, ...item }) => item) },
  };
}

function sanitizeWatcherConfig(input = {}) {
  return {
    ignoredSelectors: Array.isArray(input.ignoredSelectors) ? input.ignoredSelectors.map(String).slice(0, 100) : [],
  };
}
