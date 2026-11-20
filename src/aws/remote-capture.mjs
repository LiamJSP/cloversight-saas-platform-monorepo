import { randomUUID } from 'node:crypto';
import { id } from '../lib.mjs';

export function createRemoteCapture({ functionName, regionalFunctionName = null, assets, region = process.env.AWS_REGION ?? 'us-east-1', client = null }) {
  if (!functionName) throw new Error('CAPTURE_FUNCTION_NAME is required for remote capture.');
  const clients = new Map();
  if (client) clients.set(region, client);
  return async function remoteCapture(url, watcherConfig, _runtimeConfig = null, options = {}) {
    const { InvokeCommand, LambdaClient } = await import('@aws-sdk/client-lambda');
    const targetRegion = String(options.region || region);
    let lambda = clients.get(targetRegion);
    if (!lambda) { lambda = new LambdaClient({ region: targetRegion }); clients.set(targetRegion, lambda); }
    const targetFunction = targetRegion === region ? functionName : (regionalFunctionName || functionName.replace(/-capture$/, '-regional-capture'));
    const jobId = id('capture');
    const requestNonce = randomUUID();
    const result = await lambda.send(new InvokeCommand({
      FunctionName: targetFunction,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify({ jobId, requestNonce, url, watcherConfig, metadataOnly: options.metadataOnly === true })),
    }));
    const rawPayload = Buffer.from(result.Payload ?? []).toString('utf8');
    let payload;
    try { payload = JSON.parse(rawPayload || '{}'); }
    catch { payload = {}; }
    if (result.FunctionError) {
      const message = String(payload.errorMessage ?? rawPayload ?? 'Unknown capture Lambda failure').slice(0, 2000);
      const code = /net::ERR_|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED/i.test(message)
        ? 'TARGET_UNREACHABLE'
        : (/timed out during .*page navigation/i.test(message)
          ? 'TARGET_UNREACHABLE'
          : (/timed out/i.test(message)
          ? 'CAPTURE_TIMEOUT'
          : (/BrowserDisconnected/i.test(String(payload.errorType ?? '')) ? 'BROWSER_DISCONNECTED' : 'CAPTURE_LAMBDA_FAILED')));
      throw Object.assign(new Error(`Capture Lambda failed: ${message}`), { code, remoteErrorType: payload.errorType ?? null });
    }
    if (payload.errorMessage) throw Object.assign(new Error(payload.errorMessage), { code: /timed out/i.test(payload.errorMessage) ? 'CAPTURE_TIMEOUT' : (payload.errorType ?? 'CAPTURE_LAMBDA_FAILED') });
    const response = payload.body ? JSON.parse(payload.body) : payload;
    const screenshotEntries = Object.entries(response.screenshotKeys ?? {});
    const metadataOnly = options.metadataOnly === true;
    if ((!metadataOnly && screenshotEntries.length !== 3) || !response.textKey || !Array.isArray(response.capture?.screenshots)) throw new Error('Capture Lambda returned an incomplete responsive artifact set.');
    if (response.jobId !== jobId || response.requestNonce !== requestNonce || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(response.executionId ?? ''))) {
      throw Object.assign(new Error('Capture Lambda returned evidence for a different invocation.'), { code: 'CAPTURE_ISOLATION_FAILED' });
    }
    const artifactPrefix = `capture-tmp/${jobId}/${requestNonce}/${response.executionId}`;
    const expectedProfiles = metadataOnly ? [] : ['desktop', 'tablet', 'mobile'];
    if (response.textKey !== `${artifactPrefix}/visible.txt`
      || screenshotEntries.length !== expectedProfiles.length
      || screenshotEntries.some(([profile, key]) => !expectedProfiles.includes(profile) || key !== `${artifactPrefix}/${profile}.png`)
      || response.capture.screenshots.length !== expectedProfiles.length
      || new Set(response.capture.screenshots.map((item) => item.profile)).size !== expectedProfiles.length
      || response.capture.screenshots.some((item) => !expectedProfiles.includes(item.profile))) {
      throw Object.assign(new Error('Capture Lambda returned evidence outside the requested invocation artifact scope.'), { code: 'CAPTURE_ISOLATION_FAILED' });
    }
    try {
      const [text, ...images] = await Promise.all([assets.read(response.textKey), ...screenshotEntries.map(([, key]) => assets.read(key))]);
      const imageByProfile = Object.fromEntries(screenshotEntries.map(([profile], index) => [profile, images[index]]));
      return {
        ...response.capture,
        region: targetRegion,
        screenshots: response.capture.screenshots.map((item) => ({ ...item, png: imageByProfile[item.profile] })),
        visibleText: text.toString('utf8'),
      };
    } finally {
      await Promise.allSettled([...screenshotEntries.map(([, key]) => assets.remove(key)), assets.remove(response.textKey)]);
    }
  };
}
