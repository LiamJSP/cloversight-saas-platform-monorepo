import { sha256 } from '../lib.mjs';

export async function actorFromApiGateway(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
  const path = event.rawPath ?? '/';
  const requestId = event.requestContext?.requestId ?? crypto.randomUUID();
  const base = {
    requestId,
    ip: event.requestContext?.http?.sourceIp ?? 'unknown',
    userAgent: event.requestContext?.http?.userAgent ?? '',
    issuer: claims.iss ?? null,
  };
  if (!claims.sub) return { ...base, role: 'anonymous', actorId: 'anonymous' };

  const expectedRole = path.startsWith('/api/steward/') ? 'steward' : 'customer';
  if (String(claims.webwatch_role ?? '') !== expectedRole) {
    throw Object.assign(new Error('This token is not authorized for the requested portal.'), {
      statusCode: 403,
      code: 'PORTAL_ROLE_MISMATCH',
    });
  }

  const email = String(claims.email ?? '').trim().toLowerCase();
  const verified = claims.email_verified === true || String(claims.email_verified).toLowerCase() === 'true';
  if (!email || !verified) {
    throw Object.assign(new Error('The access token must contain a verified email address.'), {
      statusCode: 403,
      code: 'VERIFIED_EMAIL_REQUIRED',
    });
  }

  return expectedRole === 'steward'
    ? { ...base, role: 'steward', actorId: `staff_${sha256(String(claims.sub)).slice(0, 24)}`, email, claims }
    : { ...base, role: 'customer', actorId: `acct_${sha256(String(claims.sub)).slice(0, 24)}`, email, claims };
}
