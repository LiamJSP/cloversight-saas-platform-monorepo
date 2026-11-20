import fs from 'node:fs/promises';
import path from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(self)', 'cross-origin-opener-policy': 'same-origin', 'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-32RuHoYSuTT5A2OV5nNlgOf+B60deM6bz8/lCRx/CSI='; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" };

export async function serveStatic(res, filePath, cache = 'no-cache') {
  try {
    const stat = await fs.stat(filePath); if (!stat.isFile()) return false;
    const body = await fs.readFile(filePath); const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { ...HEADERS, 'content-type': TYPES[ext] ?? 'application/octet-stream', 'content-length': body.length, 'cache-control': cache }); res.end(body); return true;
  } catch { return false; }
}
export function secureHeaders() { return HEADERS; }
