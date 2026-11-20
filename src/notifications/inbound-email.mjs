import { extractResponseCode, normalizeEmail, parseReplyIntent } from './replies.mjs';

/**
 * Minimal defensive MIME parser for alert replies.
 *
 * The parser intentionally ignores attachments, embedded images, and arbitrary
 * MIME nesting beyond the textual leaf parts needed for reply commands. It caps
 * decoded text and never executes or renders HTML.
 */
export function parseInboundEmail(rawMessage) {
  const raw = Buffer.isBuffer(rawMessage) ? rawMessage : Buffer.from(rawMessage ?? '');
  if (raw.length > 5_000_000) throw Object.assign(new Error('Inbound email exceeds the maximum size.'), { code: 'INVALID_REPLY', statusCode: 400 });
  const source = raw.toString('utf8');
  const split = splitHeaders(source);
  const headers = parseHeaders(split.headers);
  const contentType = parseContentType(headers.get('content-type') ?? 'text/plain; charset=utf-8');
  const transferEncoding = String(headers.get('content-transfer-encoding') ?? '').toLowerCase();
  const textParts = collectTextParts(split.body, contentType, transferEncoding, 0);
  const plain = textParts.filter((part) => part.type === 'text/plain').map((part) => part.text).join('\n');
  const html = textParts.filter((part) => part.type === 'text/html').map((part) => htmlToText(part.text)).join('\n');
  const text = normalizeReplyText(plain || html).slice(0, 100_000);
  const subject = decodeHeader(headers.get('subject') ?? '').slice(0, 1000);
  const sender = normalizeEmail(firstAddress(headers.get('from') ?? headers.get('return-path') ?? ''));
  const destinations = ['to', 'cc', 'delivered-to', 'x-original-to']
    .flatMap((name) => addressList(headers.get(name) ?? ''))
    .map(normalizeEmail)
    .filter(Boolean);
  return {
    messageId: stripAngles(headers.get('message-id') ?? ''),
    sender,
    from: sender,
    destinations: [...new Set(destinations)],
    subject,
    text,
    responseCode: extractResponseCode({ body: text, destinations, subject }),
    response: parseReplyIntent(text || subject),
  };
}

function splitHeaders(source) {
  const match = source.match(/\r?\n\r?\n/);
  if (!match) return { headers: source, body: '' };
  return { headers: source.slice(0, match.index), body: source.slice(match.index + match[0].length) };
}

function parseHeaders(source) {
  const unfolded = String(source).replace(/\r?\n[ \t]+/g, ' ');
  const map = new Map();
  for (const line of unfolded.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    map.set(name, map.has(name) ? `${map.get(name)}, ${value}` : value);
  }
  return map;
}

function parseContentType(value) {
  const [rawType, ...parameters] = String(value).split(';');
  const params = {};
  for (const parameter of parameters) {
    const match = parameter.match(/^\s*([^=]+)=\s*(?:"([^"]*)"|([^\s]+))\s*$/);
    if (match) params[match[1].trim().toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return { type: rawType.trim().toLowerCase() || 'text/plain', params };
}

function collectTextParts(body, contentType, transferEncoding, depth) {
  if (depth > 8) return [];
  if (contentType.type.startsWith('multipart/')) {
    const boundary = contentType.params.boundary;
    if (!boundary || boundary.length > 200) return [];
    const marker = `--${boundary}`;
    const results = [];
    for (const piece of String(body).split(marker).slice(1)) {
      if (piece.startsWith('--')) break;
      const trimmed = piece.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      const split = splitHeaders(trimmed);
      const headers = parseHeaders(split.headers);
      const childType = parseContentType(headers.get('content-type') ?? 'text/plain; charset=utf-8');
      const childEncoding = String(headers.get('content-transfer-encoding') ?? '').toLowerCase();
      results.push(...collectTextParts(split.body, childType, childEncoding, depth + 1));
    }
    return results;
  }
  if (!['text/plain', 'text/html'].includes(contentType.type)) return [];
  const decoded = decodeTransfer(String(body), transferEncoding).slice(0, 1_000_000);
  return [{ type: contentType.type, text: decoded }];
}

function decodeTransfer(value, encoding) {
  if (encoding === 'base64') {
    try { return Buffer.from(value.replace(/\s/g, ''), 'base64').toString('utf8'); } catch { return ''; }
  }
  if (encoding === 'quoted-printable') {
    const joined = value.replace(/=\r?\n/g, '');
    return joined.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  }
  return value;
}

function decodeHeader(value) {
  return String(value).replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_, charset, mode, data) => {
    try {
      if (mode.toLowerCase() === 'b') return Buffer.from(data, 'base64').toString('utf8');
      const qp = data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (m, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
      return Buffer.from(qp, 'binary').toString(/utf-?8/i.test(charset) ? 'utf8' : 'latin1');
    } catch { return ''; }
  });
}

function htmlToText(value) {
  return String(value)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeReplyText(value) {
  return String(value)
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => !/^>/.test(line.trim()) && !/^on .+ wrote:$/i.test(line.trim()))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function stripAngles(value) { return String(value).trim().replace(/^<|>$/g, ''); }
function firstAddress(value) { return addressList(value)[0] ?? ''; }
function addressList(value) {
  const matches = String(value).match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi);
  return matches ?? [];
}

export const inboundEmailInternals = Object.freeze({ splitHeaders, parseHeaders, parseContentType, decodeTransfer, decodeHeader, htmlToText, normalizeReplyText, addressList });
