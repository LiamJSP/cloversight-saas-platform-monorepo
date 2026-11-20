import http from 'node:http';
import net from 'node:net';
import { Transform } from 'node:stream';
import { resolveSafeTarget } from './ssrf.mjs';

/**
 * Starts a loopback-only HTTP CONNECT proxy for the browser worker.
 *
 * Every outbound socket is opened to the exact IP address returned by the
 * security resolver. Chromium never performs external DNS resolution itself,
 * closing the DNS-rebinding gap between URL validation and connection.
 */
export async function startPinnedEgressProxy({ allowPrivate = false, connectTimeoutMs = 15_000, logger = null, maxTransferBytes = 30_000_000, maxRequests = 1_500, maxConnections = 128 } = {}) {
  const limits = {
    transferBytes: boundedInteger(maxTransferBytes, 30_000_000, 500_000_000),
    requests: boundedInteger(maxRequests, 1_500, 10_000),
    connections: boundedInteger(maxConnections, 128, 512),
  };
  const clients = new Set();
  const resources = new Set();
  let closed = false;
  let limitError = null;
  let transferredBytes = 0;
  let proxyRequests = 0;
  let browserRequests = 0;
  let totalConnections = 0;
  const fail = (limit) => {
    limitError ??= Object.assign(new Error(`Capture session exceeds its ${limit} limit.`), { code: 'PAGE_TOO_LARGE', resourceLimit: limit });
    logger?.warn?.('capture.proxy.resource_limit', { limit, transferredBytes, proxyRequests, browserRequests, totalConnections });
    for (const resource of resources) resource.destroy();
    return false;
  };
  const budget = {
    active: () => !closed && !limitError,
    track(resource) {
      if (!budget.active()) { resource.destroy(); return; }
      resources.add(resource);
      resource.once('close', () => resources.delete(resource));
    },
    admitProxyRequest() {
      if (!budget.active()) return false;
      return ++proxyRequests <= limits.requests || fail('proxy request/CONNECT count');
    },
    consume(bytes) {
      if (!budget.active()) return false;
      if (transferredBytes + bytes > limits.transferBytes) return fail('cumulative wire-byte');
      transferredBytes += bytes;
      return true;
    },
    meter() {
      // A Transform drops the offending chunk before it can reach the browser
      // or target. Measuring data events alone would forward that same chunk.
      return new Transform({ transform(chunk, _encoding, done) { done(null, budget.consume(chunk.length) ? chunk : undefined); } });
    },
  };
  const options = { allowPrivate, connectTimeoutMs, logger, budget };
  const server = http.createServer((request, response) => {
    if (!budget.admitProxyRequest()) { request.socket.destroy(); return; }
    void proxyHttpRequest(request, response, options);
  });
  server.on('connect', (request, clientSocket, head) => {
    if (!budget.admitProxyRequest()) { clientSocket.destroy(); return; }
    void proxyConnect(request, clientSocket, head, options);
  });
  server.on('upgrade', (_request, socket) => denySocket(socket, 501, 'WebSocket proxy upgrades are disabled.'));
  server.on('clientError', (_error, socket) => denySocket(socket, 400, 'Malformed proxy request.'));
  server.on('connection', (socket) => {
    if (!budget.active()) { socket.destroy(); return; }
    if (clients.size >= limits.connections || ++totalConnections > limits.requests) {
      fail('connection count');
      socket.destroy();
      return;
    }
    clients.add(socket);
    budget.track(socket);
    socket.once('close', () => clients.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Pinned egress proxy did not bind a TCP port.');
  return {
    host: '127.0.0.1',
    port: address.port,
    get limitError() { return limitError; },
    statistics: () => ({ transferredBytes, proxyRequests, browserRequests, totalConnections, activeConnections: clients.size }),
    admitBrowserRequest() {
      if (!budget.active()) return false;
      return ++browserRequests <= limits.requests || fail('browser request count');
    },
    assertWithinLimits() { if (limitError) throw limitError; },
    async close() {
      closed = true;
      const closing = new Promise((resolve) => server.close(() => resolve()));
      for (const resource of resources) resource.destroy();
      server.closeAllConnections?.();
      await Promise.race([closing, new Promise((resolve) => setTimeout(resolve, 1000))]);
    },
  };
}

async function proxyConnect(request, clientSocket, head, options) {
  try {
    const authority = parseConnectAuthority(request.url);
    const target = await resolveSafeTarget(`https://${authority.hostname}:${authority.port}/`, options.allowPrivate);
    if (!options.budget.active() || clientSocket.destroyed) return;
    const address = chooseAddress(target.addresses);
    const upstream = net.connect({ host: address.address, port: authority.port, family: address.family });
    options.budget.track(upstream);
    let connected = false;
    const timer = setTimeout(() => upstream.destroy(Object.assign(new Error('Proxy connection timed out.'), { code: 'EGRESS_TIMEOUT' })), options.connectTimeoutMs);
    upstream.once('connect', () => {
      connected = true;
      clearTimeout(timer);
      clientSocket.write('HTTP/1.1 200 Connection Established\r\nProxy-Agent: CLOVERSIGHT\r\n\r\n');
      if (head?.length) {
        if (!options.budget.consume(head.length)) return;
        upstream.write(head);
      }
      upstream.pipe(options.budget.meter()).pipe(clientSocket);
      clientSocket.pipe(options.budget.meter()).pipe(upstream);
    });
    upstream.once('error', (error) => {
      clearTimeout(timer);
      options.logger?.warn?.('capture.proxy.connect_failed', { host: authority.hostname, port: authority.port, code: error.code });
      if (!clientSocket.destroyed) {
        if (connected) clientSocket.destroy();
        else denySocket(clientSocket, 502, 'Upstream connection failed.');
      }
    });
    clientSocket.once('error', () => upstream.destroy());
    clientSocket.once('close', () => { clearTimeout(timer); upstream.destroy(); });
    upstream.once('close', () => { clearTimeout(timer); if (!clientSocket.destroyed) clientSocket.destroy(); });
  } catch (error) {
    options.logger?.warn?.('capture.proxy.blocked', { method: 'CONNECT', target: redactAuthority(request.url), code: error.code, message: error.message });
    denySocket(clientSocket, Number(error.statusCode) === 400 ? 403 : 502, 'Outbound target blocked.');
  }
}

async function proxyHttpRequest(request, response, options) {
  try {
    const url = absoluteProxyUrl(request);
    if (url.protocol !== 'http:') throw Object.assign(new Error('Only HTTP proxy requests are accepted outside CONNECT.'), { statusCode: 400 });
    const target = await resolveSafeTarget(url.toString(), options.allowPrivate);
    if (!options.budget.active() || request.socket.destroyed || response.destroyed) return;
    const address = chooseAddress(target.addresses);
    const headers = sanitizeHeaders(request.headers, url.host);
    const upstream = http.request({
      host: address.address,
      family: address.family,
      port: Number(url.port || 80),
      method: request.method,
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: options.connectTimeoutMs,
    }, (upstreamResponse) => {
      upstreamResponse.on('error', () => response.destroy());
      if (!options.budget.active() || response.destroyed) { upstreamResponse.destroy(); return; }
      response.writeHead(upstreamResponse.statusCode ?? 502, sanitizeResponseHeaders(upstreamResponse.headers));
      upstreamResponse.pipe(options.budget.meter()).pipe(response);
    });
    options.budget.track(upstream);
    upstream.once('socket', (socket) => options.budget.track(socket));
    upstream.on('timeout', () => upstream.destroy(Object.assign(new Error('Proxy request timed out.'), { code: 'EGRESS_TIMEOUT' })));
    upstream.on('error', (error) => {
      options.logger?.warn?.('capture.proxy.http_failed', { host: url.hostname, code: error.code });
      if (response.destroyed) return;
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain', connection: 'close' });
      response.end('Upstream request failed.');
    });
    request.once('aborted', () => upstream.destroy());
    request.on('error', () => upstream.destroy());
    response.once('close', () => { if (!response.writableEnded) upstream.destroy(); });
    request.pipe(options.budget.meter()).pipe(upstream);
  } catch (error) {
    options.logger?.warn?.('capture.proxy.blocked', { method: request.method, target: redactAuthority(request.url), code: error.code, message: error.message });
    if (response.destroyed) return;
    if (!response.headersSent) response.writeHead(403, { 'content-type': 'text/plain', connection: 'close' });
    response.end('Outbound target blocked.');
  }
}

function boundedInteger(value, fallback, ceiling) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(ceiling, Math.max(1, Math.trunc(number))) : fallback;
}

function parseConnectAuthority(value) {
  const authority = String(value ?? '').trim();
  if (!authority || authority.includes('://') || /[/?#@\s]/.test(authority)) {
    throw Object.assign(new Error('Invalid CONNECT authority.'), { statusCode: 400 });
  }
  let parsed;
  try { parsed = new URL(`https://${authority}`); }
  catch { throw Object.assign(new Error('Invalid CONNECT authority.'), { statusCode: 400 }); }
  const port = Number(parsed.port || 443);
  if (!parsed.hostname || !Number.isInteger(port) || port < 1 || port > 65535) throw Object.assign(new Error('Invalid CONNECT target.'), { statusCode: 400 });
  return { hostname: parsed.hostname, port };
}

function absoluteProxyUrl(request) {
  try {
    if (/^https?:\/\//i.test(String(request.url))) return new URL(request.url);
    return new URL(request.url || '/', `http://${request.headers.host ?? ''}`);
  } catch { throw Object.assign(new Error('Invalid proxy URL.'), { statusCode: 400 }); }
}

function chooseAddress(addresses) {
  const address = addresses?.find((item) => item.family === 4) ?? addresses?.[0];
  if (!address) throw new Error('Target did not resolve to an address.');
  return address;
}

function sanitizeHeaders(headers, host) {
  const result = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (['proxy-authorization', 'proxy-connection', 'connection'].includes(name.toLowerCase())) continue;
    if (value != null) result[name] = value;
  }
  result.host = host;
  result.connection = 'close';
  return result;
}

function sanitizeResponseHeaders(headers) {
  const result = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (['proxy-authenticate', 'proxy-connection', 'connection', 'transfer-encoding'].includes(name.toLowerCase())) continue;
    if (value != null) result[name] = value;
  }
  result.connection = 'close';
  return result;
}

function denySocket(socket, status, message) {
  if (!socket || socket.destroyed) return;
  const reason = status === 403 ? 'Forbidden' : status === 400 ? 'Bad Request' : status === 501 ? 'Not Implemented' : 'Bad Gateway';
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
}
function redactAuthority(value) { return String(value ?? '').replace(/[^A-Za-z0-9.:[\]_-]/g, '').slice(0, 200); }

export const egressProxyInternals = Object.freeze({ parseConnectAuthority, absoluteProxyUrl, chooseAddress, sanitizeHeaders, sanitizeResponseHeaders });
