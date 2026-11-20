import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { stagingTarget } from './staging-test-client.mjs';

function jwtClaims(value) {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value))) throw new Error('Cognito did not return a JWT access token.');
  const parts = String(value).split('.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

export function refreshConfiguration(env = process.env) {
  const domain = String(env.WEBWATCH_TEST_COGNITO_DOMAIN ?? '');
  const expectedHost = String(env.WEBWATCH_TEST_COGNITO_HOST ?? '').toLowerCase();
  const clientId = String(env.WEBWATCH_TEST_COGNITO_CLIENT_ID ?? '');
  const issuer = String(env.WEBWATCH_TEST_COGNITO_ISSUER ?? '');
  let parsed;
  try { parsed = new URL(domain); } catch { throw new Error('Configure the exact Cognito HTTPS domain.'); }
  if (parsed.protocol !== 'https:' || !expectedHost.includes('.') || parsed.hostname.toLowerCase() !== expectedHost ||
      parsed.port || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash ||
      !/^https:\/\/cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/[A-Za-z0-9_-]+$/.test(issuer) ||
      !/^[A-Za-z0-9]{10,128}$/.test(clientId)) throw new Error('Cognito domain, host, issuer, and public app client must match the staging fixture.');
  return { origin: parsed.origin, clientId, issuer };
}

export async function refreshStagingTokens(env = process.env, { fetchFn = fetch } = {}) {
  const config = refreshConfiguration(env);
  const out = {};
  for (const suffix of ['A', 'B']) {
    const refreshToken = String(env[`WEBWATCH_TEST_REFRESH_TOKEN_${suffix}`] ?? '');
    if (refreshToken.length < 24 || /\s/.test(refreshToken)) throw new Error(`Provide a valid staging refresh token for account ${suffix}.`);
    const response = await fetchFn(`${config.origin}/oauth2/token`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, refresh_token: refreshToken }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 200) throw new Error(`Cognito refresh failed for account ${suffix} (HTTP ${response.status}); obtain a new consented test session.`);
    const payload = await response.json();
    if (payload.refresh_token && payload.refresh_token !== refreshToken) throw new Error('Refresh token rotation is enabled; this workflow needs an approved rotating secret store before use.');
    const claims = jwtClaims(payload.access_token);
    if (claims.token_use !== 'access' || claims.client_id !== config.clientId || claims.iss !== config.issuer ||
        claims.webwatch_role !== 'customer' || String(claims.email_verified) !== 'true' || !claims.sub ||
        !Number.isFinite(claims.exp) || claims.exp * 1000 < Date.now() + 12 * 60_000) {
      throw new Error(`Refreshed account ${suffix} token lacks the required role, issuer, or validity period.`);
    }
    out[suffix] = { token: payload.access_token, sub: claims.sub };
  }
  if (out.A.sub === out.B.sub || out.A.token === out.B.token) throw new Error('Staging fixtures must use distinct identities.');
  stagingTarget({ ...env, WEBWATCH_TEST_TOKEN_A: out.A.token });
  return { A: out.A.token, B: out.B.token };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const outputFile = process.env.GITHUB_ENV;
    if (!outputFile) throw new Error('This command writes masked access tokens only to the GitHub Actions environment file.');
    const { A, B } = await refreshStagingTokens();
    // GitHub runner workflow commands mask tokens before any subsequent logs.
    process.stdout.write(`::add-mask::${A}\n::add-mask::${B}\n`);
    await appendFile(outputFile, `WEBWATCH_TEST_TOKEN_A=${A}\nWEBWATCH_TEST_TOKEN_B=${B}\n`, { mode: 0o600 });
    console.log('Staging access tokens refreshed for two distinct customer accounts.');
  } catch (error) { console.error(`Staging token setup failed: ${error.message}`); process.exitCode = 1; }
}
