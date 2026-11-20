import { ISO, sha256 } from '../lib.mjs';

export async function enforceCustomerRate(store, actor, method, path) {
  const identity = sha256(actor.accountId);
  const safetyAction = ['/api/billing/cancel', '/api/billing/cancellation', '/api/account/close'].includes(path);
  const limits = safetyAction ? [[method === 'GET' ? 'customer-cancellation-read' : 'customer-cancellation', method === 'GET' ? 60 : 10, 60]] : [['customer-api-burst', 60, 1], ['customer-api', 600, 60]];
  if (!safetyAction && !['GET', 'HEAD'].includes(method)) {
    limits.push(['customer-mutation', 60, 60]);
    limits.push(['customer-mutation-day', Math.max(100, Math.min(5000, Number(actor.apiDailyMutationLimit) || 100)), 86400]);
  }
  if (path === '/api/customer/bootstrap') limits.push(['customer-bootstrap', 60, 60]);
  if (!safetyAction && /^\/api\/(billing|transactions)(\/|$)/.test(path) && method !== 'GET') limits.push(['customer-billing', 20, 600]);
  for (const [scope, limit, seconds] of limits) {
    if (store.consumeRateLimit) await store.consumeRateLimit(scope, identity, limit, seconds);
    else await store.transact(`${scope}.rate`, (state) => {
      const now = Math.floor(Date.now() / 1000);
      const bucket = Math.floor(now / seconds);
      const key = `${scope}:${identity}:${bucket}`;
      let row = state.idempotency.find((item) => item.key === key);
      if (!row) { row = { key, scope, accountId: actor.accountId, attempts: 0, createdAt: ISO(), expiresAtEpoch: (bucket + 1) * seconds + 3600 }; state.idempotency.push(row); }
      if (row.attempts >= limit) throw Object.assign(new Error('Account request limit reached. Retry shortly.'), { statusCode: 429, code: 'ACCOUNT_RATE_LIMIT', retryAfterSeconds: seconds });
      row.attempts += 1;
      return null;
    });
  }
}

export function retryHeaders(error) {
  if (Number(error.statusCode) !== 429) return {};
  const until = Date.parse(error.retryAt ?? '');
  const seconds = Number.isFinite(until) ? Math.ceil((until - Date.now()) / 1000) : Number(error.retryAfterSeconds) || 60;
  return { 'retry-after': String(Math.max(1, Math.min(31 * 86400, seconds))) };
}
