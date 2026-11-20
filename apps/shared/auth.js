/** @module shared/auth
 * @description Browser Cognito PKCE, session and refresh helpers.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const encoder = new TextEncoder();

export async function createPortalAuth(role) {
  if (!['customer', 'steward'].includes(role)) throw new Error('Unknown portal role.');
  const config = await loadPortalConfig(role);
  const local = config.mode === 'local';

  if (local) return localAuth(role, config);
  validateCognitoConfig(config);
  const storageKey = `webwatch.${role}.oauth.tokens`;
  const transactionKey = `webwatch.${role}.oauth.transaction`;
  let tokens = readJson(sessionStorage.getItem(storageKey));

  const query = new URLSearchParams(location.search);
  if (query.has('error')) {
    const description = query.get('error_description') || query.get('error');
    clearOAuthQuery();
    throw new Error(`Sign-in failed: ${description}`);
  }
  if (query.has('code')) {
    const transaction = readJson(sessionStorage.getItem(transactionKey));
    if (!transaction || transaction.state !== query.get('state')) {
      clearOAuthQuery();
      throw new Error('Sign-in state could not be verified. Start sign-in again.');
    }
    if (Date.now() - Number(transaction.startedAt || 0) > 10 * 60_000) {
      sessionStorage.removeItem(transactionKey);
      clearOAuthQuery();
      throw new Error('The sign-in attempt expired. Start sign-in again.');
    }
    tokens = await exchangeCode(config, query.get('code'), transaction.verifier);
    assertAccessToken(tokens.access_token, role);
    sessionStorage.setItem(storageKey, JSON.stringify(tokens));
    sessionStorage.removeItem(transactionKey);
    clearOAuthQuery(role === 'steward' ? transaction.returnTo : null);
  }

  async function accessToken({ forceRefresh = false } = {}) {
    if (!tokens?.access_token) return null;
    const claims = parseJwt(tokens.access_token);
    const expiring = Number(claims.exp || 0) * 1000 <= Date.now() + 60_000;
    if (forceRefresh || expiring) {
      if (!tokens.refresh_token) {
        sessionStorage.removeItem(storageKey);
        tokens = null;
        return null;
      }
      try {
        const refreshed = await refreshTokens(config, tokens.refresh_token);
        tokens = { ...tokens, ...refreshed, refresh_token: refreshed.refresh_token || tokens.refresh_token };
        assertAccessToken(tokens.access_token, role);
        sessionStorage.setItem(storageKey, JSON.stringify(tokens));
      } catch (error) {
        sessionStorage.removeItem(storageKey);
        tokens = null;
        throw Object.assign(new Error('Your session could not be refreshed. Sign in again.'), { cause: error, code: 'SESSION_REFRESH_FAILED' });
      }
    }
    return tokens.access_token;
  }

  return {
    config,
    role,
    mode: 'cognito',
    get authenticated() { return Boolean(tokens?.access_token) && tokenIsUsable(tokens.access_token, role); },
    get user() { return tokens?.access_token ? parseJwt(tokens.access_token) : null; },
    async signIn({ screenHint } = {}) { return beginCognitoAuthorization(role, config, { screenHint }); },
    async signOut() {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(transactionKey);
      tokens = null;
      const url = new URL('/logout', config.cognitoDomain);
      url.search = new URLSearchParams({ client_id: config.clientId, logout_uri: config.logoutUri }).toString();
      location.assign(url);
    },
    async fetch(path, options = {}) {
      const perform = async (retry) => {
        const token = await accessToken({ forceRefresh: retry });
        if (!token) throw Object.assign(new Error('Sign in is required.'), { status: 401, code: 'AUTH_REQUIRED' });
        const response = await fetch(portalApiUrl(path, config), {
          ...options,
          headers: { ...options.headers, authorization: `Bearer ${token}` },
        });
        if (response.status === 401 && !retry && tokens?.refresh_token) return perform(true);
        return response;
      };
      return perform(false);
    },
  };
}

async function loadPortalConfig(role) {
  if (!['customer', 'steward'].includes(role)) throw new Error('Unknown portal role.');
  const local = LOCAL_HOSTS.has(location.hostname);
  const configPath = local
    ? (role === 'customer' ? '/app-static/runtime-config.json' : '/steward-static/runtime-config.json')
    : '/runtime-config.json';
  const response = await fetch(configPath, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Portal configuration could not be loaded (${response.status}).`);
  const config = await response.json();
  if (config.role !== role) throw new Error('Portal configuration role mismatch.');
  if (config.mode === 'local' && local) return config;
  if (config.mode !== 'cognito') throw new Error('This portal requires a Cognito sign-in configuration.');
  return config;
}

export async function beginPortalAuth(role, { screenHint } = {}) {
  const config = await loadPortalConfig(role);
  if (config.mode === 'local') {
    location.assign(role === 'customer' ? `/app/?action=${screenHint === 'signup' ? 'signup' : 'login'}` : '/stewards/');
    return;
  }
  validateCognitoConfig(config);
  return beginCognitoAuthorization(role, config, { screenHint });
}

async function beginCognitoAuthorization(role, config, { screenHint } = {}) {
  const verifier = randomBase64Url(64);
  const state = randomBase64Url(32);
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
  const returnTo = role === 'steward' ? `${location.pathname}${location.search}${location.hash}` : null;
  sessionStorage.setItem(`webwatch.${role}.oauth.transaction`, JSON.stringify({ verifier, state, startedAt: Date.now(), returnTo }));
  const url = new URL(screenHint === 'signup' ? '/signup' : '/oauth2/authorize', config.cognitoDomain);
  url.search = new URLSearchParams({
    response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri,
    scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256',
  }).toString();
  location.assign(url);
}

function portalApiUrl(path, config) {
  const url = new URL(path, config.apiBaseUrl || location.origin);
  if (url.origin !== location.origin) throw new Error('Portal API requests must use the portal origin.');
  return url;
}

function localAuth(role, config) {
  const account = localStorage.getItem('webwatch-local-account') || 'acct_demo';
  return {
    config, role, mode: 'local', authenticated: true,
    user: { email: role === 'customer' ? 'owner@example.test' : 'steward@example.test', webwatch_role: role },
    async signIn() {},
    async signOut() {},
    fetch(path, options = {}) {
      return fetch(portalApiUrl(path, config), {
        ...options,
        headers: {
          ...options.headers,
          'x-local-role': role,
          'x-local-user': role === 'customer' ? account : 'staff_demo',
        },
      });
    },
  };
}

async function exchangeCode(config, code, verifier) {
  return tokenRequest(config, {
    grant_type: 'authorization_code', client_id: config.clientId, code,
    redirect_uri: config.redirectUri, code_verifier: verifier,
  });
}
async function refreshTokens(config, refreshToken) {
  return tokenRequest(config, { grant_type: 'refresh_token', client_id: config.clientId, refresh_token: refreshToken });
}
async function tokenRequest(config, fields) {
  const response = await fetch(new URL('/oauth2/token', config.cognitoDomain), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description || body.error || `Token endpoint failed (${response.status}).`);
  return { ...body, obtained_at: Date.now() };
}
function validateCognitoConfig(config) {
  for (const field of ['cognitoDomain', 'clientId', 'redirectUri', 'logoutUri']) {
    if (!config[field]) throw new Error(`Portal configuration is missing ${field}.`);
  }
  const domain = new URL(config.cognitoDomain);
  if (domain.protocol !== 'https:') throw new Error('Cognito domain must use HTTPS.');
  for (const name of ['redirectUri', 'logoutUri']) {
    if (new URL(config[name]).origin !== location.origin) throw new Error('Sign-in configuration belongs to another portal origin.');
  }
  portalApiUrl('/api/health', config);
}
function assertAccessToken(token, role) {
  const claims = parseJwt(token);
  if (claims.token_use !== 'access') throw new Error('Cognito did not return an access token.');
  if (claims.webwatch_role !== role) throw new Error('The signed-in identity belongs to another portal.');
  if (String(claims.email_verified).toLowerCase() !== 'true' || !claims.email) throw new Error('A verified email is required.');
}
function tokenIsUsable(token, role) {
  try {
    const claims = parseJwt(token);
    return claims.token_use === 'access' && claims.webwatch_role === role && Number(claims.exp || 0) * 1000 > Date.now();
  } catch { return false; }
}
function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Identity token is malformed.');
  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
  return JSON.parse(decodeURIComponent([...atob(normalized)].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
}
function randomBase64Url(bytes) { const value = new Uint8Array(bytes); crypto.getRandomValues(value); return base64Url(value); }
function base64Url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function clearOAuthQuery(returnTo = null) {
  let target = `${location.pathname}${location.hash || ''}`;
  if (returnTo) {
    try {
      const candidate = new URL(returnTo, location.origin);
      if (candidate.origin === location.origin) target = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    } catch {}
  }
  history.replaceState({}, document.title, target);
}
function readJson(value) { try { return value ? JSON.parse(value) : null; } catch { return null; } }

export const authInternals = Object.freeze({ parseJwt, tokenIsUsable, base64Url });
