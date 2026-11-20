import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertSafeTarget } from '../security/ssrf.mjs';
import { startPinnedEgressProxy } from '../security/egress-proxy.mjs';
import { browserEnvironment } from '../security/runtime-boundary.mjs';
import { normalizeText } from './text.mjs';
import { createLogger } from '../logger.mjs';

const captureLogger = createLogger('info');

const RESPONSIVE_PROFILES = Object.freeze([
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { id: 'tablet', label: 'Tablet', width: 1024, height: 1366 },
  { id: 'mobile', label: 'Mobile', width: 390, height: 844 },
]);

// Only retired sessions are retained here, never a reusable browser/context.
// A warm runtime must fail closed until an earlier launch/shutdown has settled.
const retiredSessions = new Set();

function isolationError(message, cause) {
  return Object.assign(new Error(`Chromium capture isolation failed: ${message}`), { code: 'CAPTURE_ISOLATION_FAILED', cause });
}

async function closeBrowserSession(session) {
  session.retired = true;
  retiredSessions.add(session);
  if (session.cleanupPromise) return session.cleanupPromise;
  session.cleanupPromise = (async () => {
    // Promise.race does not cancel launchPersistentContext. Await its settlement
    // before deleting the profile, including when the outer capture timed out.
    const shutdownDeadline = Date.now() + 8_000;
    await withinDeadline(Promise.resolve(session.launchPromise).catch(() => null), shutdownDeadline, 'pending Chromium startup shutdown', 8_000);
    const { browser, context, disconnectHandler } = session;
    if (disconnectHandler) browser?.off('disconnected', disconnectHandler);
    let contextFailure;
    if (context) {
      try { await withinDeadline(context.close(), shutdownDeadline, 'browser context shutdown', 5_000); }
      catch (error) { if (!browserClosedError(error)) contextFailure = error; }
    }
    if (browser?.isConnected()) {
      await withinDeadline(browser.close(), shutdownDeadline, 'browser shutdown', 5_000);
    }
    if (browser?.isConnected() || (!browser && contextFailure)) throw contextFailure ?? isolationError('browser remained connected after shutdown.');
    await withinDeadline(fs.rm(session.userDataDir, { recursive: true, force: true }), Date.now() + 2_000, 'browser profile cleanup', 2_000);
    retiredSessions.delete(session);
  })();
  try { await session.cleanupPromise; }
  catch (error) { throw isolationError('a disposable browser session could not be retired safely.', error); }
  finally { session.cleanupPromise = null; }
}

async function retirePendingSessions() {
  const results = await Promise.allSettled([...retiredSessions].map((session) => closeBrowserSession(session)));
  const failure = results.find((result) => result.status === 'rejected');
  if (failure || retiredSessions.size) throw isolationError('an earlier session is still awaiting cleanup; refusing a new check.', failure?.reason);
}

async function acquireProxy(options, deadline) {
  let expired = false;
  const opening = startPinnedEgressProxy(options).then(async (proxy) => {
    if (expired) await proxy.close();
    return proxy;
  });
  try { return await withinDeadline(opening, deadline, 'egress proxy startup', 5_000); }
  catch (error) {
    expired = true;
    // Dispose a proxy that binds after the deadline race has already rejected.
    void opening.then((proxy) => proxy.close()).catch(() => undefined);
    throw error;
  }
}

function captureTimeout(stage) {
  return Object.assign(new Error(`Capture timed out during ${stage}.`), { code: 'CAPTURE_TIMEOUT', stage });
}

function remainingMs(deadline, stage, ceilingMs = Number.POSITIVE_INFINITY) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw captureTimeout(stage);
  return Math.max(1, Math.min(remaining, ceilingMs));
}

async function withinDeadline(promise, deadline, stage, ceilingMs = Number.POSITIVE_INFINITY) {
  const timeoutMs = remainingMs(deadline, stage, ceilingMs);
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(captureTimeout(stage)), timeoutMs); }),
    ]);
  } catch (error) {
    if (error?.name === 'TimeoutError' || /timed out after \d+ms/i.test(String(error?.message ?? ''))) throw captureTimeout(stage);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function stageLog(stage, started, extra = {}) {
  captureLogger.info('capture.stage', { stage, elapsedMs: Date.now() - started, ...extra });
}

function browserLaunchOptions(driver, proxyPort, deadline) {
  const options = {
    headless: true,
    env: browserEnvironment(),
    chromiumSandbox: false,
    handleSIGHUP: false,
    handleSIGINT: false,
    handleSIGTERM: false,
    timeout: remainingMs(deadline, 'Chromium startup', 20_000),
    proxy: { server: `http://127.0.0.1:${proxyPort}` },
    // The profile, proxy and debugger endpoint are owned by this invocation.
    // Never accept driver defaults that request resuming a saved session.
    args: driver.args.filter((argument) => !/^--(?:user-data-dir|profile-directory|restore-last-session|proxy-server|remote-debugging-port|remote-debugging-address)(?:=|$)/i.test(argument)),
  };
  if (driver.executablePath) options.executablePath = driver.executablePath;
  return options;
}

async function loadBrowserDriver(runtime, deadline) {
  if (process.env.WEBWATCH_SERVERLESS_CHROMIUM === '1') {
    const [{ chromium }, chromiumModule] = await withinDeadline(Promise.all([
      import('playwright-core'),
      import('@sparticuz/chromium'),
    ]), deadline, 'Lambda Chromium initialization', 20_000);
    const lambdaChromium = chromiumModule.default ?? chromiumModule;
    // CLOVERSIGHT does not use WebGL. Avoid a separate graphics process in the
    // Lambda sandbox and use the serverless project's complete launch profile.
    lambdaChromium.setGraphicsMode = false;
    const executablePath = await withinDeadline(lambdaChromium.executablePath(), deadline, 'Lambda Chromium extraction', 20_000);
    return { chromium, executablePath, args: [...lambdaChromium.args], name: 'sparticuz-chromium', persistentContext: true };
  }
  const { chromium } = await withinDeadline(import('playwright'), deadline, 'Playwright initialization', 10_000);
  return { chromium, executablePath: runtime.chromePath, args: ['--disable-dev-shm-usage'], name: 'system-chromium', persistentContext: true };
}

function safeRequestScheme(value) {
  try { return new URL(value).protocol; }
  catch { return ''; }
}

async function inspectPage(page, ignoredSelectors) {
  return page.evaluate(async (selectors) => {
    for (const selector of selectors) {
      try { document.querySelectorAll(selector).forEach((node) => node.remove()); } catch {}
    }
    const style = document.createElement('style');
    style.dataset.webwatch = 'stability';
    style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important} video,canvas{visibility:hidden!important}';
    document.documentElement?.append(style);
    // Let web fonts and lazy media settle before capturing. Full-page
    // screenshots without this pass can compare a loaded image with its lazy
    // placeholder and produce a page-wide false heatmap.
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    const scrollLimit = Math.min(document.documentElement?.scrollHeight ?? 0, 20_000);
    const step = Math.max(500, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < scrollLimit; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    window.scrollTo(0, 0);
    const pendingImages = [...document.images].filter((image) => !image.complete).map((image) => new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    }));
    await Promise.race([Promise.allSettled(pendingImages), new Promise((resolve) => setTimeout(resolve, 2500))]);
    await new Promise((resolve) => setTimeout(resolve, 120));
    window.scrollTo(0, 0);
    return {
      title: document.title || '',
      text: document.body?.innerText || '',
      html: document.documentElement?.outerHTML || '',
      url: location.href,
      scrollHeight: Math.max(document.body?.scrollHeight ?? 0, document.documentElement?.scrollHeight ?? 0),
      scrollWidth: Math.max(document.body?.scrollWidth ?? 0, document.documentElement?.scrollWidth ?? 0),
    };
  }, (ignoredSelectors ?? []).slice(0, 100));
}

function browserClosedError(error) {
  return /target page, context or browser has been closed|browser has been closed|browser closed|connection closed|disconnected/i.test(String(error?.message ?? ''));
}

async function openBrowserSession(driver, runtime, proxyPort, deadline, started, targetHost) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let session;
    try {
      const contextOptions = {
        viewport: { width: runtime.captureWidth, height: runtime.captureHeight },
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
        acceptDownloads: false,
      };
      const sessionMode = 'disposable-profile';
      stageLog('chromium-launching', started, { host: targetHost, attempt, sessionMode });
      // Lambda Chromium requires its default context. Both drivers use an
      // atomically created, private profile with a never-reused path. There is
      // no connect(), shared browser, stored storageState, or warm profile.
      const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), `webwatch-pw-${randomUUID()}-`));
      session = { userDataDir, browser: null, context: null, retired: false, cleanupPromise: null };
      session.launchPromise = driver.chromium.launchPersistentContext(userDataDir, {
        ...browserLaunchOptions(driver, proxyPort, deadline),
        ...contextOptions,
      }).then((context) => {
        session.context = context;
        session.browser = context.browser();
        return context;
      });
      // If launch resolves late, close it even after the capture's deadline.
      void session.launchPromise.finally(() => {
        if (session.retired && !session.cleanupPromise) void closeBrowserSession(session).catch((error) => {
          captureLogger.error('capture.cleanup.failed', { code: error.code, message: error.message });
        });
      }).catch(() => undefined);
      const context = await withinDeadline(session.launchPromise, deadline, 'Chromium persistent-context startup', 20_000);
      const browser = session.browser;
      if (!browser) throw Object.assign(new Error('Chromium persistent context did not expose its browser process.'), { code: 'BROWSER_DISCONNECTED' });
      const disconnectHandler = () => {
        captureLogger.error('capture.browser.disconnected', { elapsedMs: Date.now() - started, host: targetHost, attempt, sessionMode });
      };
      session.disconnectHandler = disconnectHandler;
      browser.on('disconnected', disconnectHandler);
      if (!browser.isConnected()) throw Object.assign(new Error('Chromium disconnected immediately after launch.'), { code: 'BROWSER_DISCONNECTED' });
      stageLog('chromium-ready', started, { host: targetHost, attempt, driver: driver.name, sessionMode, version: browser.version() });
      const startupPages = context.pages().filter((candidate) => !candidate.isClosed());
      if (startupPages.some((candidate) => !['about:blank', 'chrome://newtab/', 'chrome://new-tab-page/'].includes(candidate.url()))) {
        throw isolationError('a new profile unexpectedly opened an existing page.');
      }
      const page = startupPages[0] ?? await withinDeadline(context.newPage(), deadline, 'page initialization', 10_000);
      for (const extraPage of startupPages.slice(1)) await extraPage.close();
      // Popups never become capture evidence or survive into another viewport.
      context.on('page', (candidate) => { if (candidate !== page) void candidate.close().catch(() => undefined); });
      if (!browser.isConnected() || page.isClosed()) throw Object.assign(new Error('Chromium disconnected while creating the capture page.'), { code: 'BROWSER_DISCONNECTED' });
      stageLog('capture-page-ready', started, { host: targetHost, attempt, sessionMode, freshStartupPage: startupPages.length > 0 });
      return { browser, context, page, session };
    } catch (error) {
      lastError = error;
      if (session) await closeBrowserSession(session);
      if (!browserClosedError(error) || attempt === 2 || deadline - Date.now() < 2_000) break;
      captureLogger.warn('capture.browser.retry', { elapsedMs: Date.now() - started, host: targetHost, attempt, message: String(error.message).slice(0, 1000) });
      await withinDeadline(new Promise((resolve) => setTimeout(resolve, 250)), deadline, 'Chromium restart', 500);
    }
  }
  if (browserClosedError(lastError)) {
    const failure = Object.assign(new Error(`Chromium exited while creating the capture page after two launch attempts: ${String(lastError.message).slice(0, 1500)}`), {
      code: 'BROWSER_DISCONNECTED',
      stage: 'page initialization',
      cause: lastError,
    });
    failure.name = 'BrowserDisconnectedError';
    throw failure;
  }
  throw lastError;
}

export async function capturePage(rawUrl, watcherConfig, runtime, options = {}) {
  // Snapshot mutable caller inputs before the first await. A running check
  // cannot inherit an in-place watcher/runtime edit from another request.
  watcherConfig = structuredClone(watcherConfig ?? {});
  runtime = structuredClone(runtime ?? {});
  options = structuredClone(options ?? {});
  const started = Date.now();
  // Chromium's executable extraction is infrastructure setup, not target page
  // work. Give it one bounded allowance so cold starts cannot consume the
  // watcher's entire responsive capture budget. The absolute ceiling still
  // includes setup and all three views, leaving the worker time to persist.
  const overallBudgetMs = Math.min(150_000, effectiveCaptureTimeoutMs(undefined, runtime.captureTimeoutMs));
  const captureTimeoutMs = effectiveCaptureTimeoutMs(watcherConfig?.timeoutMs, overallBudgetMs);
  const absoluteDeadline = started + overallBudgetMs;
  const setupBudgetMs = Math.min(40_000, overallBudgetMs);
  let deadline = Math.min(absoluteDeadline, started + setupBudgetMs);
  const targetHost = (() => { try { return new URL(rawUrl).hostname; } catch { return 'invalid'; } })();
  const configuredDriver = process.env.WEBWATCH_SERVERLESS_CHROMIUM === '1' ? 'sparticuz-chromium' : 'system-chromium';
  stageLog('start', started, {
    host: targetHost,
    budgetMs: captureTimeoutMs,
    setupBudgetMs,
    overallBudgetMs,
    driver: configuredDriver,
    release: process.env.WEBWATCH_CAPTURE_RELEASE ?? null,
    imageSourceSha256: process.env.WEBWATCH_CAPTURE_SOURCE_SHA256 ?? null,
    metadataOnly: options.metadataOnly === true,
  });
  await withinDeadline(retirePendingSessions(), deadline, 'previous browser retirement', 8_000);
  const initialUrl = await withinDeadline(assertSafeTarget(rawUrl, runtime.allowPrivateTargets), deadline, 'initial target validation', 10_000);
  const proxyLogger = {
    warn(event, details = {}) { captureLogger.warn(event, { elapsedMs: Date.now() - started, ...details }); },
  };
  const profiles = options.metadataOnly === true ? responsiveProfiles(runtime).slice(0, 1) : responsiveProfiles(runtime);
  const proxy = await acquireProxy({
    allowPrivate: runtime.allowPrivateTargets,
    connectTimeoutMs: Math.min(captureTimeoutMs, 15_000),
    logger: proxyLogger,
    maxTransferBytes: Math.max(100_000, Number(runtime.maxPageBytes) || 10_000_000) * profiles.length,
    maxRequests: 1_500,
    maxConnections: 128,
  }, deadline);
  let browser;
  let context;
  let page;
  let session;
  let completedProfiles = [];
  let firstHttpStatus = null;
  try {
    stageLog('proxy-ready', started, { host: targetHost });
    const driver = await loadBrowserDriver(runtime, deadline);
    stageLog('browser-driver-ready', started, { host: targetHost, driver: driver.name });
    ({ browser, context, page, session } = await openBrowserSession(driver, runtime, proxy.port, deadline, started, targetHost));
    deadline = Math.min(absoluteDeadline, Date.now() + captureTimeoutMs);
    stageLog('page-budget-started', started, { host: targetHost, remainingBudgetMs: remainingMs(deadline, 'page initialization') });
    page.setDefaultTimeout(Math.min(15_000, remainingMs(deadline, 'page initialization')));
    page.setDefaultNavigationTimeout(Math.min(45_000, remainingMs(deadline, 'page initialization')));

    // The proxy pins every TCP connection to an address that passed the SSRF
    // resolver. Routing also rejects browser-internal or redirect schemes before
    // Chromium can hand them to another protocol handler.
    await context.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      const protocol = safeRequestScheme(requestUrl);
      try {
        if (protocol === 'http:' || protocol === 'https:') {
          if (!proxy.admitBrowserRequest()) { await route.abort('blockedbyclient'); return; }
          await withinDeadline(assertSafeTarget(requestUrl, runtime.allowPrivateTargets), deadline, 'subresource validation', 10_000);
          await route.continue();
        } else if (protocol === 'data:' || protocol === 'blob:' || protocol === 'about:') {
          await route.continue();
        } else {
          await route.abort('blockedbyclient');
        }
      } catch {
        await route.abort('blockedbyclient').catch(() => undefined);
      }
    });

    let transferredBytes = 0;
    const transferAccounting = new Set();
    page.on('requestfinished', (request) => {
      const accounting = request.sizes().then((sizes) => {
        transferredBytes += Math.max(0, Number(sizes.responseBodySize ?? 0));
      }).catch(() => undefined).finally(() => transferAccounting.delete(accounting));
      transferAccounting.add(accounting);
    });

    stageLog('browser-ready', started, { host: targetHost });
    const screenshots = [];
    let primary = null;
    let statusCode = null;
    for (const [index, profile] of profiles.entries()) {
      const profileTransferStart = transferredBytes;
      await withinDeadline(page.setViewportSize({ width: profile.width, height: profile.height }), deadline, `${profile.id} viewport`, 5_000);
      const navigationResponse = await withinDeadline(page.goto(initialUrl.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: remainingMs(deadline, `${profile.id} page navigation`, 45_000),
      }), deadline, `${profile.id} page navigation`, 45_000);
      stageLog('page-loaded', started, { host: targetHost, profile: profile.id, statusCode: navigationResponse?.status() ?? null });
      await withinDeadline(page.waitForTimeout(index === 0 ? 800 : 500), deadline, `${profile.id} page stabilization`, 1_000);
      const accountingSnapshot = [...transferAccounting];
      if (accountingSnapshot.length) await withinDeadline(Promise.allSettled(accountingSnapshot), deadline, `${profile.id} transfer accounting`, 3_000);
      proxy.assertWithinLimits();
      if (transferredBytes - profileTransferStart > runtime.maxPageBytes) throw Object.assign(new Error(`${profile.label} page transfer exceeds configured byte limit.`), { code: 'PAGE_TOO_LARGE' });

      const value = await withinDeadline(inspectPage(page, watcherConfig.ignoredSelectors), deadline, `${profile.id} DOM evaluation`, 15_000);
      const htmlBytes = Buffer.byteLength(value.html ?? '');
      if (htmlBytes > runtime.maxPageBytes) throw Object.assign(new Error('Rendered page exceeds configured byte limit.'), { code: 'PAGE_TOO_LARGE' });
      if (value.scrollHeight > 20_000 || value.scrollWidth > 4_096) throw Object.assign(new Error('Rendered page dimensions exceed the supported capture limit.'), { code: 'PAGE_TOO_LARGE' });
      if (options.metadataOnly !== true) {
        const png = await withinDeadline(page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', fullPage: true }), deadline, `${profile.id} full-page screenshot`, 30_000);
        if (png.length > runtime.maxPageBytes) throw Object.assign(new Error('Rendered screenshot exceeds configured byte limit.'), { code: 'PAGE_TOO_LARGE' });
        screenshots.push({ profile: profile.id, label: profile.label, viewportWidth: profile.width, viewportHeight: profile.height, png });
        stageLog('screenshot-complete', started, { host: targetHost, profile: profile.id, bytes: png.length, fullPage: true });
      }
      if (!primary) {
        primary = value;
        const responseStatus = navigationResponse?.status();
        statusCode = Number.isFinite(responseStatus) ? responseStatus : null;
        firstHttpStatus = statusCode;
      }
      completedProfiles.push(profile.id);
    }
    proxy.assertWithinLimits();
    stageLog('complete', started, { host: targetHost, statusCode, transferredBytes, proxyResources: proxy.statistics(), profiles: screenshots.map((item) => item.profile) });
    return {
      capturedAt: new Date().toISOString(), statusCode,
      finalUrl: primary?.url || page.url(), title: normalizeText(primary?.title ?? ''),
      visibleText: normalizeText(primary?.text ?? ''), html: primary?.html ?? '', screenshots,
      width: screenshots[0]?.viewportWidth ?? profiles[0].width, height: screenshots[0]?.viewportHeight ?? profiles[0].height, fullPage: options.metadataOnly !== true,
      durationMs: Date.now() - started, ignoredSelectors: watcherConfig.ignoredSelectors ?? [],
    };
  } catch (error) {
    // Preserve the resource-limit outcome when socket retirement makes
    // navigation fail with a generic browser/network error.
    error = proxy.limitError ?? error;
    // A later viewport failing after an HTTP response is an incomplete
    // capture, not proof that this regional endpoint has gone offline.
    if (completedProfiles.length) {
      error.partialCapture = true;
      error.completedProfiles = completedProfiles;
      error.primaryStatusCode = firstHttpStatus;
    }
    captureLogger.error('capture.failed', {
      elapsedMs: Date.now() - started,
      host: targetHost,
      code: error?.code ?? null,
      stage: error?.stage ?? null,
      completedProfiles,
      firstHttpStatus,
      message: String(error?.message ?? error).slice(0, 3000),
      stack: String(error?.stack ?? '').slice(0, 6000),
    });
    throw error;
  } finally {
    let cleanupFailure;
    try { if (session) await closeBrowserSession(session); }
    catch (error) { cleanupFailure = error; }
    try { await withinDeadline(proxy.close(), Date.now() + 2_000, 'egress proxy shutdown', 2_000); }
    catch (error) { cleanupFailure ??= isolationError('egress proxy shutdown did not complete.', error); }
    if (cleanupFailure) {
      captureLogger.error('capture.cleanup.failed', { code: cleanupFailure.code, message: cleanupFailure.message });
      throw cleanupFailure;
    }
    stageLog('cleanup-complete', started, { host: targetHost });
  }
}

export function effectiveCaptureTimeoutMs(requestedTimeoutMs, runtimeCeilingMs) {
  const ceiling = Math.max(1, Math.trunc(Number(runtimeCeilingMs) || 150000));
  const requested = Number(requestedTimeoutMs);
  if (!Number.isFinite(requested) || requested < 3000) return ceiling;
  return Math.min(ceiling, Math.max(3000, Math.trunc(requested)));
}

function responsiveProfiles(runtime) {
  return RESPONSIVE_PROFILES.map((profile) => profile.id === 'desktop'
    ? { ...profile, width: runtime.captureWidth, height: runtime.captureHeight }
    : { ...profile });
}
