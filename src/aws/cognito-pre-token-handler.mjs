/**
 * Cognito Pre Token Generation V2 trigger.
 *
 * The browser sends an access token to API Gateway. Access tokens do not
 * reliably include profile claims unless they are added here, so this trigger
 * contributes the verified email and an explicit portal role. Never infer a
 * steward role from a URL or a mutable client-supplied value.
 */
export async function handler(event) {
  const role = process.env.TOKEN_ROLE;
  if (!['customer', 'steward'].includes(role)) throw new Error('TOKEN_ROLE must be customer or steward.');

  const attributes = event?.request?.userAttributes ?? {};
  const email = String(attributes.email ?? '').trim().toLowerCase();
  const verified = String(attributes.email_verified ?? '').toLowerCase() === 'true';
  if (!email || !verified) throw new Error('A verified email is required before tokens can be issued.');

  event.response ??= {};
  event.response.claimsAndScopeOverrideDetails ??= {};
  event.response.claimsAndScopeOverrideDetails.accessTokenGeneration = {
    claimsToAddOrOverride: {
      email,
      email_verified: 'true',
      webwatch_role: role,
    },
  };
  return event;
}
