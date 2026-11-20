import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const ISO = () => new Date().toISOString();
export const id = (prefix) => `${prefix}_${Date.now().toString(36)}_${randomBytes(5).toString('hex')}`;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
// DynamoDB Maps are unordered. Durable identity hashes must depend on values,
// rather than whichever property order an adapter happens to deserialize.
export function canonicalJson(value) {
  const ordered = (item) => Array.isArray(item) ? item.map(ordered)
    : item !== null && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, ordered(item[key])])) : item;
  return JSON.stringify(ordered(value));
}
export const clone = (value) => structuredClone(value);
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const requestId = () => randomUUID();
// Standard SQS queues use MessageGroupId for fair-queue scheduling. Hash the
// tenant key so provider-visible group IDs remain bounded and non-identifying.
export const fairQueueGroupId = (accountId) => `account-${sha256(String(accountId ?? 'system')).slice(0, 40)}`;

export function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function addSeconds(iso, seconds) {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

export function addDays(iso, days) {
  return addSeconds(iso, days * 86400);
}

export function parseCsvPhrases(input) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && input[i + 1] === '"' && quoted) { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if ((char === ',' || char === '\n' || char === '\r') && !quoted) {
      if (current.trim()) values.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) values.push(current.trim());
  return [...new Set(values)].slice(0, 1000);
}

export function json(res, status, value, headers = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...headers });
  res.end(body);
}

export function maskEmail(value) {
  const [local = '', domain = ''] = String(value).split('@');
  const shown = local.slice(0, Math.min(2, local.length));
  const dparts = domain.split('.');
  const host = dparts[0] ?? '';
  const suffix = dparts.length > 1 ? `.${dparts.at(-1)}` : '';
  return `${shown}${'*'.repeat(Math.max(3, local.length - shown.length))}@${host.slice(0, 2)}***${suffix}`;
}

export function maskUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    const visible = host.length <= 6 ? host.slice(0, 2) : `${host.slice(0, 3)}…${host.slice(-4)}`;
    const path = url.pathname === '/' ? '/' : `${url.pathname.slice(0, 2)}…`;
    return `${url.protocol}//${visible}${path}`;
  } catch { return 'invalid-url'; }
}

export function maskPayment(value) {
  const text = String(value ?? '');
  if (!text) return 'not available';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

export async function readBody(req, maxBytes = 1_000_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error('Request body too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req, maxBytes) {
  const raw = await readBody(req, maxBytes);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON body.'), { statusCode: 400 }); }
}

export function interpolate(template, context) {
  return String(template).replace(/{{\s*([\w.]+)\s*}}/g, (_, path) => {
    const result = path.split('.').reduce((value, key) => value && value[key], context);
    return result == null ? '' : String(result);
  });
}
