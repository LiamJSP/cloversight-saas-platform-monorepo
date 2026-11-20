import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { startPinnedEgressProxy, egressProxyInternals } from '../src/security/egress-proxy.mjs';

async function listen(server, host = '127.0.0.1') {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => { server.off('error', reject); resolve(); });
  });
  return server.address().port;
}
async function close(server) {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

test('CONNECT authority parser rejects malformed or out-of-range targets', () => {
  assert.deepEqual(egressProxyInternals.parseConnectAuthority('example.com:443'), { hostname: 'example.com', port: 443 });
  assert.throws(() => egressProxyInternals.parseConnectAuthority('example.com:70000'));
  assert.throws(() => egressProxyInternals.parseConnectAuthority('https://example.com:443/path'));
});

test('pinned egress proxy forwards HTTP to an allowed resolved address', async () => {
  const upstream = http.createServer((request, response) => {
    assert.equal(request.headers.host, 'localhost:' + upstream.address().port);
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end(`ok:${request.url}`);
  });
  const upstreamPort = await listen(upstream);
  const proxy = await startPinnedEgressProxy({ allowPrivate: true });
  try {
    const body = await new Promise((resolve, reject) => {
      const request = http.request({
        host: proxy.host,
        port: proxy.port,
        method: 'GET',
        path: `http://localhost:${upstreamPort}/probe?x=1`,
        headers: { host: `localhost:${upstreamPort}` },
      }, (response) => {
        let value = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { value += chunk; });
        response.on('end', () => response.statusCode === 200 ? resolve(value) : reject(new Error(`Unexpected ${response.statusCode}: ${value}`)));
      });
      request.on('error', reject);
      request.end();
    });
    assert.equal(body, 'ok:/probe?x=1');
  } finally {
    await proxy.close();
    await close(upstream);
  }
});

test('pinned egress proxy blocks CONNECT to private destinations in production mode', async () => {
  const proxy = await startPinnedEgressProxy({ allowPrivate: false });
  try {
    const response = await new Promise((resolve, reject) => {
      const socket = net.connect(proxy.port, proxy.host);
      let value = '';
      socket.setEncoding('utf8');
      socket.once('connect', () => socket.write('CONNECT 127.0.0.1:443 HTTP/1.1\r\nHost: 127.0.0.1:443\r\n\r\n'));
      socket.on('data', (chunk) => { value += chunk; });
      socket.once('end', () => resolve(value));
      socket.once('error', reject);
    });
    assert.match(response, /^HTTP\/1\.1 403 Forbidden/);
  } finally {
    await proxy.close();
  }
});
