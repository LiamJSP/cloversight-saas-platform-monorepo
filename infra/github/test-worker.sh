#!/usr/bin/env bash
# Exercise Chromium in the actual Lambda-format worker without AWS credentials.
set -euo pipefail
node scripts/worker-base.mjs
docker buildx build --platform linux/amd64 --provenance=false --sbom=false --load \
  --build-arg WEBWATCH_REQUIRE_DEPENDENCY_LOCKS=1 \
  --build-arg WEBWATCH_CAPTURE_RELEASE=ci --build-arg WEBWATCH_CAPTURE_SOURCE_SHA256=ci \
  --file infra/docker/browser-worker/Dockerfile --tag cloversight-worker:ci .
docker run --rm -i --network none --entrypoint node cloversight-worker:ci --input-type=module - <<'JS'
import serverless from '@sparticuz/chromium';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: await serverless.executablePath(), args: serverless.args });
try {
  const page = await browser.newPage();
  await page.setContent('<h1>Cloversight capture fixture</h1>');
  if (await page.locator('h1').textContent() !== 'Cloversight capture fixture') throw new Error('DOM capture failed.');
  if ((await page.screenshot()).length < 100) throw new Error('Screenshot capture failed.');
} finally {
  await browser.close();
}
JS
