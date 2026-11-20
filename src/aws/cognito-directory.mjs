import { sha256 } from '../lib.mjs';

export class CognitoCustomerDirectory {
  constructor({ userPoolId, region, client = null }) { Object.assign(this, { userPoolId, region, client }); }
  async invite(email) {
    if (!this.userPoolId) throw new Error('Customer user pool is not configured.');
    const { CognitoIdentityProviderClient, AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    this.client ??= new CognitoIdentityProviderClient({ region: this.region, maxAttempts: 1 });
    try {
      await this.#send(new AdminCreateUserCommand({ UserPoolId: this.userPoolId, Username: email, UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }], DesiredDeliveryMediums: ['EMAIL'] }));
      return { created: true };
    } catch (error) {
      if (error?.name === 'UsernameExistsException') return { created: false, existing: true };
      throw error;
    }
  }

  async erase(identity, rememberBinding = async () => {}) {
    if (!this.userPoolId) throw Object.assign(new Error('Customer user pool is not configured.'), { code: 'CUSTOMER_POOL_MISSING' });
    const { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand, AdminDisableUserCommand, AdminUserGlobalSignOutCommand, AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    this.client ??= new CognitoIdentityProviderClient({ region: this.region, maxAttempts: 1 });
    let username = identity.cognitoUsername;
    let subject = identity.cognitoSubject;
    const trustedBinding = Boolean(username && subject && customerId(subject) === identity.userId);
    if (!trustedBinding) {
      const email = String(identity.email ?? '').trim().toLowerCase();
      const knownSubject = subject && customerId(subject) === identity.userId ? String(subject) : null;
      const filterValue = knownSubject ?? email;
      if (!filterValue || /[\r\n]/.test(filterValue)) throw identityLookupError();
      // Local application IDs are hashed sub values. Never pass them to a
      // Cognito deletion API as though they were directory usernames.
      const escapedValue = filterValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const matches = []; let token; let pages = 0;
      do {
        const result = await this.#send(new ListUsersCommand({ UserPoolId: this.userPoolId, Filter: `${knownSubject ? 'sub' : 'email'} = "${escapedValue}"`, Limit: 60, ...(token ? { PaginationToken: token } : {}) }));
        pages += 1;
        for (const user of result.Users ?? []) {
          const candidateSubject = user.Attributes?.find((item) => item.Name === 'sub')?.Value;
          if (candidateSubject && customerId(candidateSubject) === identity.userId) matches.push({ username: user.Username, subject: candidateSubject });
        }
        token = result.PaginationToken;
      } while (token && matches.length < 2 && pages < 3);
      if (token) throw identityLookupError();
      if (matches.length !== 1 || !matches[0].username) throw identityLookupError();
      ({ username, subject } = matches[0]);
    }
    const parameters = { UserPoolId: this.userPoolId, Username: username };
    let current;
    try { current = await this.#send(new AdminGetUserCommand(parameters)); }
    catch (error) {
      if (error?.name === 'UserNotFoundException' && trustedBinding) return { deleted: true, alreadyAbsent: true };
      throw error;
    }
    const actualSubject = current.UserAttributes?.find((item) => item.Name === 'sub')?.Value;
    if (!actualSubject || actualSubject !== subject || customerId(actualSubject) !== identity.userId) throw Object.assign(new Error('Customer directory binding does not match the erasure subject.'), { code: 'CUSTOMER_IDENTITY_BINDING_FAILED' });
    // A username is reusable after deletion; persist its immutable sub too so
    // a retry cannot disable a newly registered user with the same username.
    await rememberBinding({ cognitoUsername: current.Username ?? username, cognitoSubject: actualSubject });
    const verifiedParameters = { UserPoolId: this.userPoolId, Username: current.Username ?? username };
    try {
      await this.#send(new AdminDisableUserCommand(verifiedParameters));
      await this.#send(new AdminUserGlobalSignOutCommand(verifiedParameters));
      await this.#send(new AdminDeleteUserCommand(verifiedParameters));
    } catch (error) {
      if (error?.name !== 'UserNotFoundException') throw error;
    }
    return { deleted: true, alreadyAbsent: false };
  }

  async #send(command) { return this.client.send(command, { abortSignal: AbortSignal.timeout(15_000) }); }
}

function customerId(subject) { return `acct_${sha256(String(subject)).slice(0, 24)}`; }
function identityLookupError() { return Object.assign(new Error('An immutable customer directory binding could not be established. Identity cleanup requires review.'), { code: 'CUSTOMER_IDENTITY_LOOKUP_UNRESOLVED' }); }
