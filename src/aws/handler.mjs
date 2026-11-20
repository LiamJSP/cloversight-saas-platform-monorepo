import { retryHeaders } from '../security/customer-rate.mjs';
/** @module aws/handler
 * @description AWS HTTP API Lambda adapter and CloudFront origin boundary.
 */
import { Readable } from 'node:stream';
import { getAwsRuntime } from './runtime.mjs';
import { actorFromApiGateway } from './identity.mjs';
import { createRouter } from '../api/routes.mjs';
import { handleTwilioWebhook } from './twilio-webhooks.mjs';
import { constantTimeEqual } from '../lib.mjs';
import { createLogger } from '../logger.mjs';
import { renderResponsePrompt, renderResponseRecorded, renderUnsubscribePrompt, renderUnsubscribeRecorded } from '../notifications/response-page.mjs';

let routerPromise;
let routerRuntime;
const fallbackLogger = createLogger();

export async function handler(event) {
  const started = Date.now();
  const requestId = event?.requestContext?.requestId ?? crypto.randomUUID();
  try {
    const runtime = await getAwsRuntime('api');
    const path = event?.rawPath ?? '/';
    if (path.startsWith('/api/webhooks/twilio/') && runtime.config.smsEnabled !== true) return response(404, { error: 'Route not found.', requestId });
    if (path === '/api/webhooks/twilio/inbound') return await handleTwilioWebhook({ event, runtime, kind: 'inbound' });
    if (path === '/api/webhooks/twilio/status') return await handleTwilioWebhook({ event, runtime, kind: 'status' });

    if (requiresCloudFrontOrigin(path) && !constantTimeEqual(header(event.headers, 'x-webwatch-origin'), runtime.config.originVerifySecret)) {
      return response(403, { error: 'Direct API access is disabled.', requestId });
    }

    if (path.startsWith('/respond/')) return await responsePage(event, runtime, path.slice('/respond/'.length));
    if (path.startsWith('/unsubscribe/')) return await unsubscribePage(event, runtime, path.slice('/unsubscribe/'.length));

    const actor = await actorFromApiGateway(event);
    const req = lambdaRequest(event);
    const res = lambdaResponse(requestId);
    const url = new URL(`${path}${event.rawQueryString ? `?${event.rawQueryString}` : ''}`, `https://${header(event.headers, 'host') || 'localhost'}`);
    // A refreshed runtime carries refreshed provider credentials. Retaining
    // the first router would otherwise keep its old provider graph forever.
    if (routerRuntime !== runtime) routerPromise = Promise.resolve(createRouter({
      config: runtime.config,
      store: runtime.store,
      assets: runtime.assets,
      watcherService: runtime.watcherService,
      monitoring: runtime.apiMonitoring,
      billing: runtime.billing,
      accounts: runtime.accounts,
      actionLog: runtime.actionLog,
      stewardSecurity: runtime.stewardSecurity,
      reports: runtime.reports,
      notifier: runtime.notifier,
      logger: runtime.logger,
    }));
    routerRuntime = runtime;
    const handled = await (await routerPromise)(req, res, url, actor);
    if (handled === false) return response(404, { error: 'Route not found.', requestId });
    const result = res.result();
    runtime.logger.info('lambda.http.completed', { requestId, path, method: req.method, statusCode: result.statusCode, durationMs: Date.now() - started, actorRole: actor.role });
    return result;
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    fallbackLogger[statusCode >= 500 ? 'error' : 'warn']('lambda.http.failed', { requestId, path: event?.rawPath, statusCode, code: error.code, message: error.message });
    return response(statusCode, { error: statusCode >= 500 ? 'Internal server error.' : error.message, code: error.code, details: statusCode < 500 ? error.details : undefined, requestId }, retryHeaders(error));
  }
}

function requiresCloudFrontOrigin(path) {
  return ![
    '/api/health', '/api/webhooks/stripe', '/api/webhooks/twilio/inbound', '/api/webhooks/twilio/status',
    '/api/alerts/respond', '/api/alerts/respond-code', '/api/assets',
  ].includes(path) && !path.startsWith('/respond/') && !path.startsWith('/unsubscribe/');
}

function lambdaRequest(event) {
  const body = event.body ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8') : Buffer.alloc(0);
  const req = Readable.from(body.length ? [body] : []);
  req.method = event.requestContext?.http?.method ?? 'GET';
  req.url = `${event.rawPath ?? '/'}${event.rawQueryString ? `?${event.rawQueryString}` : ''}`;
  req.headers = lowerHeaders(event.headers);
  req.socket = { encrypted: true, remoteAddress: event.requestContext?.http?.sourceIp ?? 'unknown' };
  return req;
}

function lambdaResponse(requestId) {
  let statusCode = 200;
  const headers = { 'x-request-id': requestId, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  const chunks = [];
  return {
    get statusCode() { return statusCode; },
    get headersSent() { return chunks.length > 0; },
    setHeader(name, value) { headers[String(name).toLowerCase()] = String(value); },
    writeHead(status, values = {}) { statusCode = Number(status); for (const [name, value] of Object.entries(values)) headers[name.toLowerCase()] = String(value); },
    write(value) { chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value))); },
    end(value) { if (value != null) chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value))); },
    result() {
      const body = Buffer.concat(chunks);
      const contentType = headers['content-type'] ?? '';
      const binary = !contentType.startsWith('text/') && !contentType.includes('json') && !contentType.includes('xml') && body.length > 0;
      delete headers['content-length'];
      return { statusCode, headers, body: binary ? body.toString('base64') : body.toString('utf8'), isBase64Encoded: binary };
    },
  };
}

async function responsePage(event, runtime, encodedToken) {
  const token = decodeURIComponent(encodedToken);
  const method = event.requestContext?.http?.method ?? 'GET';
  if (method === 'GET') return html(200, renderResponsePrompt(token));
  if (method !== 'POST') return { statusCode: 405, headers: { allow: 'GET, POST', 'cache-control': 'no-store' }, body: '' };
  const raw = event.body ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8').toString('utf8') : '';
  if (raw.length > 10_000) return response(413, { error: 'Form too large.' });
  const form = new URLSearchParams(raw);
  const { verifyResponseToken } = await import('../notifications/token.mjs');
  const data = verifyResponseToken(form.get('token'), runtime.config.integritySecret);
  const outcome = await runtime.notifier.recordResponse({ ...data, response: form.get('response'), source: 'signed_link' });
  return html(200, renderResponseRecorded(outcome.status));
}

async function unsubscribePage(event, runtime, encodedToken) {
  const token = decodeURIComponent(encodedToken);
  const method = event.requestContext?.http?.method ?? 'GET';
  if (method === 'GET') return html(200, renderUnsubscribePrompt(token));
  if (method !== 'POST') return { statusCode: 405, headers: { allow: 'GET, POST', 'cache-control': 'no-store' }, body: '' };
  const { verifyResponseToken } = await import('../notifications/token.mjs');
  const data = verifyResponseToken(token, runtime.config.integritySecret);
  const outcome = await runtime.notifier.recordEmailUnsubscribe(data);
  return html(200, renderUnsubscribeRecorded(outcome.status));
}

function response(statusCode, body, headers = {}) { return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers }, body: JSON.stringify(body) }; }
function html(statusCode, body) { return { statusCode, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff' }, body }; }
function lowerHeaders(headers = {}) { return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])); }
function header(headers = {}, name) { return String(Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? ''); }
export const handlerInternals = Object.freeze({ requiresCloudFrontOrigin, lambdaRequest, lambdaResponse, lowerHeaders });
