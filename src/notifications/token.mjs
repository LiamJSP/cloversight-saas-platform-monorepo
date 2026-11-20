import { createHmac } from 'node:crypto';
import { constantTimeEqual } from '../lib.mjs';
function sign(payload, secret) { return createHmac('sha256', secret).update(payload).digest('base64url'); }
export function createResponseToken(data, secret) { const payload = Buffer.from(JSON.stringify(data)).toString('base64url'); return `${payload}.${sign(payload, secret)}`; }
export function verifyResponseToken(token, secret) {
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature || !constantTimeEqual(signature, sign(payload, secret))) throw Object.assign(new Error('Invalid response token.'), { statusCode: 400 });
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (new Date(data.expiresAt).getTime() < Date.now()) throw Object.assign(new Error('Response token expired.'), { statusCode: 400 });
  return data;
}
