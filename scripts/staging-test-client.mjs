// Shared by opt-in staging checks. Importing this module never sends requests.
export function stagingTarget(env = process.env) {
  const source = String(env.WEBWATCH_TEST_BASE_URL ?? '');
  const expectedHost = String(env.WEBWATCH_TEST_EXPECTED_HOST ?? '').trim().toLowerCase();
  const accountId = String(env.WEBWATCH_TEST_ACCOUNT_A ?? '').trim();
  const token = String(env.WEBWATCH_TEST_TOKEN_A ?? '').trim();
  if (!source || !expectedHost || !accountId || !token) throw new Error('Set WEBWATCH_TEST_BASE_URL, WEBWATCH_TEST_EXPECTED_HOST, WEBWATCH_TEST_ACCOUNT_A and WEBWATCH_TEST_TOKEN_A.');
  const url = new URL(source);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || url.hostname.toLowerCase() !== expectedHost || !expectedHost.includes('.')) {
    throw new Error('Staging URL must be HTTPS at the exact expected hostname, with no credentials, port, path, query or fragment.');
  }
  if (!/^[-_A-Za-z0-9]{3,128}$/.test(accountId)) throw new Error('Staging account ID is invalid.');
  if (token.length < 24 || /\s/.test(token)) throw new Error('A valid staging access token is required.');
  return { baseUrl: url.origin, host: expectedHost, accountId, token };
}

export async function stagingGet(target, route, { token = target.token, timeoutMs = 8000, fetchFn = fetch } = {}) {
  if (!/^\/[A-Za-z0-9_/?=&.%-]+$/.test(route) || route.includes('..') || route.startsWith('//')) throw new Error('Invalid fixed staging route.');
  const response = await fetchFn(`${target.baseUrl}${route}`, {
    method: 'GET', redirect: 'manual', cache: 'no-store',
    headers: token ? { authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status >= 300 && response.status < 400) throw new Error(`Unexpected redirect from ${route}.`);
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > 2_000_000) throw new Error(`Staging response too large at ${route}.`);
  const content = await response.text();
  if (content.length > 2_000_000) throw new Error(`Staging response too large at ${route}.`);
  // A gateway, WAF, or edge may send an HTML/plain-text error during a brief
  // throttle or rollout. Surface the status so bounded GET retries can decide.
  if ([429, 502, 503, 504].includes(response.status)) return { status: response.status, body: {} };
  // Edge authentication can deny a public request before the JSON API runs.
  // The anonymous check needs the denial status, not an error-page format.
  if (token === null && route === '/api/customer/bootstrap' && [401, 403].includes(response.status)) return { status: response.status, body: {} };
  let body;
  try { body = JSON.parse(content); } catch { throw new Error(`Expected JSON from ${route}, got HTTP ${response.status}.`); }
  return { status: response.status, body };
}

// Used only by explicitly opted-in CI fixtures. Never retry a POST: the server
// might have committed the check even if its HTTP response was lost.
export async function stagingPost(target, route, body, { timeoutMs = 15000, fetchFn = fetch } = {}) {
  if (!/^\/[A-Za-z0-9_/?=&.%-]+$/.test(route) || route.includes('..') || route.startsWith('//')) throw new Error('Invalid fixed staging route.');
  const response = await fetchFn(`${target.baseUrl}${route}`, {
    method: 'POST', redirect: 'manual', cache: 'no-store',
    headers: { authorization: `Bearer ${target.token}`, accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status >= 300 && response.status < 400) throw new Error(`Unexpected redirect from ${route}.`);
  if (Number(response.headers.get('content-length') ?? 0) > 2_000_000) throw new Error('Staging response too large.');
  const content = await response.text();
  if (content.length > 2_000_000) throw new Error('Staging response too large.');
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error(`Expected JSON from ${route}, got HTTP ${response.status}.`); }
  return { status: response.status, body: parsed };
}

// Only GETs are retried. A brief API Gateway/Lambda throttle during rollout
// should not create a false release failure, but three bad reads still fail.
export async function stagingReadWithRetry(target, route, options = {}, { get = stagingGet, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await get(target, route, options);
      if (![429, 502, 503, 504].includes(result.status) || attempt === 2) return result;
    } catch (error) {
      if (attempt === 2 || !/(?:HTTP (?:429|502|503|504)|AbortError|TimeoutError|fetch failed)/.test(`${error.name} ${error.message}`)) throw error;
    }
    await wait(500 * (attempt + 1));
  }
  throw new Error('Staging GET retry limit reached.');
}

export function expectStagingStatus(result, expected, route) {
  if (!expected.includes(result.status)) throw new Error(`${route}: expected HTTP ${expected.join('/')} but received ${result.status}.`);
  return result.body;
}
