import { retryHeaders } from './security/customer-rate.mjs';
/** @module server
 * @description Local HTTP entry point for public, customer and steward static surfaces plus the API.
 */
import http from 'node:http';
import path from 'node:path';
import { loadEnvFile } from './env.mjs';
loadEnvFile();
import { loadConfig } from './config.mjs';
import { createLogger } from './logger.mjs';
import { FileStore } from './storage/file-store.mjs';
import { LocalAssets } from './storage/assets.mjs';
import { NotificationProviders } from './notifications/providers.mjs';
import { NotificationService } from './notifications/service.mjs';
import { MonitoringEngine } from './monitoring/engine.mjs';
import { Scheduler } from './monitoring/scheduler.mjs';
import { BillingService } from './billing/service.mjs';
import { LocalBillingProvider, StripeBillingProvider, UnsupportedBillingProvider } from './billing/providers.mjs';
import { AccountService } from './services/accounts.mjs';
import { WatcherService } from './services/watchers.mjs';
import { MaintenanceService } from './services/maintenance.mjs';
import { ActionLogService } from './services/action-log.mjs';
import { StewardSecurity } from './services/steward-security.mjs';
import { ReportService } from './reports/service.mjs';
import { createRouter } from './api/routes.mjs';
import { requestContext } from './api/context.mjs';
import { serveStatic, secureHeaders } from './static.mjs';
import { json } from './lib.mjs';
import { demoState } from './seed.mjs';
import { renderResponsePrompt, renderResponseRecorded, renderUnsubscribePrompt, renderUnsubscribeRecorded } from './notifications/response-page.mjs';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const store = new FileStore(config.statePath, logger);
const assets = new LocalAssets(config.assetPath);
const providers = new NotificationProviders(config, logger);
await Promise.all([store.initialize(), assets.initialize(), providers.initialize()]);
if (config.appEnv === 'local') {
  const state = await store.read();
  if (!state.accounts.length) await store.transact('local.auto_seed', (draft) => Object.assign(draft, demoState()));
}
const notifier = new NotificationService({ store, providers, config, logger });
const monitoring = new MonitoringEngine({ store, assets, config, logger, notifier });
notifier.setAllClearHandler((alertId) => monitoring.promoteAlert(alertId));
const billingProvider = config.billingProvider === 'stripe' ? new StripeBillingProvider(config) : config.billingProvider === 'local' ? new LocalBillingProvider() : new UnsupportedBillingProvider(config.billingProvider);
const billing = new BillingService({ store, provider: billingProvider, config, logger, notifier });
const accounts = new AccountService({ store, config, notifier });
const watcherService = new WatcherService({ store, config, assets });
const actionLog = new ActionLogService({ store, config });
const stewardSecurity = new StewardSecurity({ store, config, notifier, logger });
const reports = new ReportService({ store, assets, config, logger });
const scheduler = new Scheduler({ store, engine: monitoring, logger });
const maintenance = new MaintenanceService({ notifier, billing, accounts, assets, store, config, logger });
const router = createRouter({ config, store, assets, watcherService, monitoring, billing, accounts, actionLog, stewardSecurity, reports, notifier, logger });
const staticRoot = path.resolve('apps');
const vendorStatic = Object.freeze({
  '/static/pico.css': path.resolve('node_modules/@picocss/pico/css/pico.conditional.min.css'),
  '/static/manrope.woff2': path.resolve('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'),
});

const server = http.createServer(async (req, res) => {
  const started = Date.now(); const actor = requestContext(req, config); res.setHeader('x-request-id', actor.requestId);
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      const handled = await router(req, res, url, actor);
      if (handled === false) json(res, 404, { error: 'Route not found.', requestId: actor.requestId });
    } else if (url.pathname.startsWith('/assets/')) {
      const key = decodeURIComponent(url.pathname.slice('/assets/'.length)); const file = assets.resolve(key);
      if (!await serveStatic(res, file, 'private, max-age=300')) json(res, 404, { error: 'Asset not found.', requestId: actor.requestId });
    } else if (url.pathname.startsWith('/respond/')) {
      await responsePage(req, res, url.pathname.slice('/respond/'.length), notifier, config);
    } else if (url.pathname.startsWith('/unsubscribe/')) {
      await unsubscribePage(req, res, url.pathname.slice('/unsubscribe/'.length), notifier, config);
    } else if (url.pathname === '/home' || url.pathname === '/home/') {
      res.writeHead(308, { ...secureHeaders(), location: '/' }); res.end();
    } else {
      const file = routeStatic(url.pathname);
      if (!file || !await serveStatic(res, file, /\.(css|js|svg|woff2)$/.test(file) ? 'public, max-age=3600' : 'no-cache')) json(res, 404, { error: 'Page not found.', requestId: actor.requestId }, secureHeaders());
    }
    logger.info('http.request', { requestId: actor.requestId, method: req.method, path: url.pathname, statusCode: res.statusCode, durationMs: Date.now() - started, actorRole: actor.role });
  } catch (error) {
    const status = Number(error.statusCode) || 500;
    logger[status >= 500 ? 'error' : 'warn']('http.request.failed', { requestId: actor.requestId, method: req.method, path: req.url, statusCode: status, message: error.message, stack: config.debugInternals ? error.stack : undefined });
    if (!res.headersSent) json(res, status, { error: status >= 500 && !config.debugInternals ? 'Internal server error.' : error.message, details: status < 500 ? error.details : undefined, code: error.code, requestId: actor.requestId }, retryHeaders(error)); else res.end();
  }
});

function routeStatic(urlPath) {
  const map = { '/': 'public/index.html', '/pricing': 'public/pricing.html', '/support': 'public/support.html', '/security': 'public/security.html', '/status': 'public/status.html', '/privacy': 'public/privacy.html', '/terms': 'public/terms.html', '/public.css': 'public/public.css', '/hero-globe.js': 'public/hero-globe.js', '/stage-globe.js': 'steward/stage-globe.js', '/app': 'customer/index.html', '/app/': 'customer/index.html', '/stewards': 'steward/index.html', '/stewards/': 'steward/index.html', '/robots.txt': 'public/robots.txt', '/sitemap.xml': 'public/sitemap.xml', '/favicon.svg': 'shared/favicon.svg', '/favicon-dark.svg': 'shared/favicon-dark.svg' };
  if (map[urlPath]) return path.join(staticRoot, map[urlPath]);
  if (urlPath.startsWith('/app/')) return path.join(staticRoot, 'customer/index.html');
  if (urlPath.startsWith('/stewards/')) return path.join(staticRoot, 'steward/index.html');
  if (vendorStatic[urlPath]) return vendorStatic[urlPath];
  if (urlPath.startsWith('/static/')) return safeStatic(path.join(staticRoot, 'shared'), urlPath.slice('/static/'.length));
  if (urlPath.startsWith('/app-static/')) return safeStatic(path.join(staticRoot, 'customer'), urlPath.slice('/app-static/'.length));
  if (urlPath.startsWith('/steward-static/')) return safeStatic(path.join(staticRoot, 'steward'), urlPath.slice('/steward-static/'.length));
  return null;
}
function safeStatic(root, relative) {
  const base = path.resolve(root);
  const candidate = path.resolve(base, String(relative));
  return candidate === base || candidate.startsWith(`${base}${path.sep}`) ? candidate : null;
}

async function responsePage(req, res, encodedToken, notifier, runtime) {
  const token = decodeURIComponent(encodedToken);
  if (req.method === 'GET') {
    const body = renderResponsePrompt(token);
    res.writeHead(200, { ...secureHeaders(), 'content-type': 'text/html; charset=utf-8' }); return res.end(body);
  }
  if (req.method === 'POST') {
    const raw = await new Promise((resolve, reject) => { const parts=[]; let n=0; req.on('data',(c)=>{n+=c.length;if(n>10000)reject(new Error('Form too large.'));else parts.push(c)}); req.on('end',()=>resolve(Buffer.concat(parts).toString('utf8'))); req.on('error',reject); });
    const form = new URLSearchParams(raw); const response = form.get('response'); const { verifyResponseToken } = await import('./notifications/token.mjs'); const data = verifyResponseToken(form.get('token'), runtime.integritySecret); const outcome = await notifier.recordResponse({ ...data, response, source: 'signed_link' });
    const body = renderResponseRecorded(outcome.status);
    res.writeHead(200, { ...secureHeaders(), 'content-type': 'text/html; charset=utf-8' }); return res.end(body);
  }
  res.writeHead(405, secureHeaders()); res.end();
}

async function unsubscribePage(req, res, encodedToken, notifier, runtime) {
  const token = decodeURIComponent(encodedToken);
  if (req.method === 'GET') {
    res.writeHead(200, { ...secureHeaders(), 'content-type': 'text/html; charset=utf-8' });
    return res.end(renderUnsubscribePrompt(token));
  }
  if (req.method === 'POST') {
    const { verifyResponseToken } = await import('./notifications/token.mjs');
    const data = verifyResponseToken(token, runtime.integritySecret);
    const outcome = await notifier.recordEmailUnsubscribe(data);
    res.writeHead(200, { ...secureHeaders(), 'content-type': 'text/html; charset=utf-8' });
    return res.end(renderUnsubscribeRecorded(outcome.status));
  }
  res.writeHead(405, { ...secureHeaders(), allow: 'GET, POST' }); res.end();
}
scheduler.start();
const maintenanceTimer = setInterval(() => void maintenance.tick(), 60_000); maintenanceTimer.unref(); void maintenance.tick();
server.listen(config.port, config.host, () => logger.info('server.started', { environment: config.appEnv, url: `http://${config.host}:${config.port}`, statePath: config.statePath, billingProvider: config.billingProvider }));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { logger.info('server.stopping', { signal }); scheduler.stop(); clearInterval(maintenanceTimer); server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10_000).unref(); });
