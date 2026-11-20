import { requestCancellation, cancellationView, cancellationPaymentPending } from '../billing/cancellation.mjs';
import { reserveInvitationBudget } from '../notifications/budgets.mjs';
import { id, ISO, addDays, addSeconds, maskPayment, sha256 } from '../lib.mjs';
import { appendAudit } from './audit.mjs';
import { normalizeCheckRegions } from '../domain/regions.mjs';
import { entitlements, PLAN_CATALOG_VERSION } from '../domain/plans.mjs';

export class AccountService {
  constructor({ store, config, identityDirectory = null, notifier = null }) { Object.assign(this, { store, config, identityDirectory, notifier }); }

  async resolveCustomerContext(actor, { cancellationOnly = false } = {}) {
    if (!actor?.actorId || actor.role !== 'customer') throw Object.assign(new Error('Verified customer identity is required.'), { statusCode: 403 });
    if (typeof this.store.findActiveMembershipByUser === 'function') {
      const indexed = await this.store.findActiveMembershipByUser(actor.actorId);
      if (indexed) {
        // IdentityIndex is eventually consistent: it only locates a possible
        // membership. Read the source item strongly before granting access so
        // a revoked member cannot use a stale index entry to obtain evidence
        // URLs or retain the old owner/member permissions.
        const member = await this.store.getEntity('teamMembers', indexed.id);
        if (!member || member.id !== indexed.id || member.userId !== actor.actorId || member.status !== 'active' || !['owner', 'member'].includes(member.role)) {
          throw Object.assign(new Error('This identity is not an active member of the account.'), { statusCode: 403, code: 'TEAM_ACCESS_REVOKED' });
        }
        const account = await this.store.getEntity('accounts', member.accountId);
        if (!account || account.closureStatus !== 'active' && !(cancellationOnly && member.role === 'owner' && account.closureStatus === 'scheduled')) throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
        const profile = await this.store.getEntity('userProfiles', actor.actorId);
        return { accountId: account.id, teamRole: member.role, memberId: member.id, userProfile: profile ?? null, apiDailyMutationLimit: Math.max(100, Math.min(5000, entitlements(account).maxWatchers * 10)) };
      }
    }
    if (cancellationOnly) {
      const state = await this.store.read();
      const members = state.teamMembers.filter(m => m.userId === actor.actorId && m.status === 'active');
      if (members.length === 1 && members[0].role === 'owner') {
        const account = state.accounts.find(a => a.id === members[0].accountId && ['active', 'scheduled'].includes(a.closureStatus));
        if (account) return { accountId: account.id, teamRole: 'owner', memberId: members[0].id, apiDailyMutationLimit: 100 };
      }
    }
    const result = await this.ensureFederatedAccount(actor);
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(result.id, { lookupPrefixes: ['TEAMMEMBERS#'], directEntities: [{ collection: 'userProfiles', id: actor.actorId }] }) : await this.store.read();
    const member = state.teamMembers.find((item) => item.userId === actor.actorId && item.status === 'active');
    const profile = state.userProfiles.find((item) => item.id === actor.actorId);
    if (!member || member.accountId !== result.id) throw Object.assign(new Error('This identity is not an active member of the account.'), { statusCode: 403, code: 'TEAM_ACCESS_REVOKED' });
    await this.store.ensureMembershipIndex?.(member);
    return { accountId: result.id, teamRole: member.role, memberId: member.id, userProfile: profile ?? null, apiDailyMutationLimit: Math.max(100, Math.min(5000, entitlements(result).maxWatchers * 10)) };
  }

  async ensureFederatedAccount(actor) {
    if (!actor?.actorId || actor.role !== 'customer') throw Object.assign(new Error('Verified customer identity is required.'), { statusCode: 403 });
    return this.store.transact('account.federated.ensure', (state) => {
      state.teamMembers ??= []; state.teamInvitations ??= []; state.userProfiles ??= [];
      const email = String(actor.email ?? '').trim().toLowerCase();
      const activeMemberships = state.teamMembers.filter((item) => item.userId === actor.actorId && item.status === 'active');
      if (activeMemberships.length > 1) throw Object.assign(new Error('Identity has multiple active memberships; account access requires support review.'), { statusCode: 403, code: 'TEAM_MEMBERSHIP_CONFLICT' });
      let membership = activeMemberships[0];
      if (membership) {
        const account = state.accounts.find((item) => item.id === membership.accountId);
        if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
        ensureUserProfile(state, actor, membership, this.config);
        bindCustomerIdentity(membership, actor);
        return account;
      }
      // A JWT can remain valid after directory deletion. Do not let that
      // same erased subject silently recreate an account during a replay.
      // A genuinely new Cognito subject is a separate registration.
      const erasedSubject = subjectFence(actor.actorId);
      if (state.closedAccounts.some((item) => item.id === actor.actorId || item.erasedSubjectHash === erasedSubject || item.erasedSubjectHashes?.includes(erasedSubject))) {
        throw Object.assign(new Error('This identity belonged to a closed account. Sign out before registering again, or contact support.'), { statusCode: 403, code: 'ACCOUNT_IDENTITY_CLOSED' });
      }
      const pending = email ? state.teamInvitations.find((item) => item.email === email && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO())) : null;
      if (pending) {
        const account = state.accounts.find((item) => item.id === pending.accountId && item.closureStatus === 'active');
        if (!account) throw Object.assign(new Error('The inviting account is unavailable.'), { statusCode: 403 });
        const activeMemberCount = state.teamMembers.filter((item) => item.accountId === account.id && item.status === 'active').length;
        if (activeMemberCount >= entitlements(account).maxUsers) throw Object.assign(new Error('This team has reached its plan user limit. Ask the owner to upgrade or remove a member.'), { statusCode: 409, code: 'TEAM_PLAN_LIMIT' });
        const revoked = state.teamMembers.find((item) => item.accountId === account.id && (item.userId === actor.actorId || item.email === email));
        if (revoked) {
          Object.assign(revoked, { userId: actor.actorId, email, status: 'active', role: 'member', joinedAt: ISO(), revokedAt: null, revokedBy: null });
          membership = revoked;
        } else {
          membership = { id: id('member'), accountId: account.id, userId: actor.actorId, email, firstName: '', lastName: '', role: 'member', status: 'active', invitedBy: pending.invitedBy, invitedAt: pending.createdAt, joinedAt: ISO(), revokedAt: null, revokedBy: null };
          state.teamMembers.push(membership);
        }
        pending.status = 'accepted'; pending.acceptedAt = ISO(); pending.acceptedBy = actor.actorId;
        bindCustomerIdentity(membership, actor);
        ensureUserProfile(state, actor, membership, this.config);
        appendAudit(state, actor, 'team.invitation_accepted', { accountId: account.id, targetId: membership.id, requestId: actor.requestId });
        return account;
      }
      const revoked = state.teamMembers.find((item) => item.status === 'revoked' && (item.userId === actor.actorId || (email && item.email === email)));
      if (revoked) throw Object.assign(new Error('Your access to this team was revoked. Ask the account owner for a new invitation.'), { statusCode: 403, code: 'TEAM_ACCESS_REVOKED' });
      let account = state.accounts.find((item) => item.id === actor.actorId);
      const duplicate = email ? state.accounts.find((item) => item.contactEmail?.toLowerCase() === email) : null;
      if (!account && duplicate) {
        const existingOwner = state.teamMembers.find((item) => item.accountId === duplicate.id && item.role === 'owner' && item.status === 'active');
        // Legacy accounts can predate team-membership records. Absence of an
        // owner record is not proof that a new Cognito identity owns the
        // account, so recovery must fail closed unless the existing owner is
        // explicitly bound to this subject.
        if (!existingOwner || existingOwner.userId !== actor.actorId) throw Object.assign(new Error('This verified email is already bound to another identity. Contact support.'), { statusCode: 409, code: 'EMAIL_ACCOUNT_CONFLICT' });
        account = duplicate;
      }
      if (account) {
        const owner = { id: stableOwnerMemberId(account.id), accountId: account.id, userId: actor.actorId, email: email || account.contactEmail, firstName: account.contactName || '', lastName: '', role: 'owner', status: 'active', invitedBy: null, invitedAt: null, joinedAt: account.createdAt ?? ISO(), revokedAt: null, revokedBy: null };
        if (!state.teamMembers.some((item) => item.id === owner.id)) state.teamMembers.push(owner);
        bindCustomerIdentity(state.teamMembers.find((item) => item.id === owner.id), actor);
        ensureUserProfile(state, actor, owner, this.config);
        return account;
      }
      if (!email) throw Object.assign(new Error('A verified email address is required to create an account.'), { statusCode: 403, code: 'VERIFIED_EMAIL_REQUIRED' });
      const now = ISO();
      account = {
        id: actor.actorId,
        legalName: actor.email.split('@')[0],
        contactName: '',
        contactEmail: actor.email.toLowerCase(),
        country: '',
        region: '',
        postalCode: '',
        profileComplete: false,
        taxIds: [],
        planId: 'free',
        trialEndsAt: addDays(now, 30),
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, 30),
        captureCreditsUsed: 0,
        captureCreditPeriodStart: now,
        captureCreditPeriodEnd: addDays(now, 30),
        prepaidCaptureCredits: 0,
        planCatalogVersion: PLAN_CATALOG_VERSION,
        billingCurrency: 'USD',
        provider: this.config.billingProvider,
        providerCustomerId: null,
        providerSubscriptionId: null,
        closureStatus: 'active',
        disabledAt: null,
        closureScheduledAt: null,
        deleteAfter: null,
        createdAt: now,
        updatedAt: now,
      };
      state.accounts.push(account);
      const owner = { id: stableOwnerMemberId(account.id), accountId: account.id, userId: actor.actorId, email, firstName: '', lastName: '', role: 'owner', status: 'active', invitedBy: null, invitedAt: null, joinedAt: now, revokedAt: null, revokedBy: null };
      state.teamMembers.push(owner);
      bindCustomerIdentity(owner, actor);
      ensureUserProfile(state, actor, owner, this.config);
      appendAudit(state, actor, 'account.federated_registered', { accountId: account.id, requestId: actor.requestId });
      return account;
    });
  }

  async updateUserProfile(accountId, input, actor) {
    return this.store.transact('user.profile.update', (state) => {
      const member = requireActiveMember(state, accountId, actor.actorId);
      bindCustomerIdentity(member, actor);
      const profile = ensureUserProfile(state, actor, member, this.config);
      const firstName = String(input.firstName ?? '').trim().slice(0, 80);
      const lastName = String(input.lastName ?? '').trim().slice(0, 80);
      if (!firstName) throw Object.assign(new Error('First name is required.'), { statusCode: 400 });
      const watchingRegions = normalizeCheckRegions(input.watchingRegions, availableRegions(this.config));
      Object.assign(profile, { firstName, lastName, watchingRegions, updatedAt: ISO() });
      Object.assign(member, { firstName, lastName });
      appendAudit(state, actor, 'user.profile_updated', { accountId, targetId: profile.id, requestId: actor.requestId, metadata: { watchingRegions } });
      return profile;
    });
  }

  async listTeam(accountId, actor) {
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: ['TEAMMEMBERS#', 'TEAMINVITATIONS#'] }) : await this.store.read();
    requireOwner(state, accountId, actor.actorId);
    return {
      members: state.teamMembers.filter((item) => item.accountId === accountId && item.status === 'active').map(publicMember),
      invitations: state.teamInvitations.filter((item) => item.accountId === accountId && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO())).map(publicInvitation),
    };
  }

  async exportPersonalData(accountId, actor) {
    if (!actor?.actorId || actor.role !== 'customer') throw Object.assign(new Error('Verified customer identity is required.'), { statusCode: 403 });
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: actor.memberId ? [] : ['TEAMMEMBERS#'], directEntities: [{ collection: 'userProfiles', id: actor.actorId }, ...(actor.memberId ? [{ collection: 'teamMembers', id: actor.memberId }] : [])] }) : await this.store.read();
    const account = state.accounts.find((item) => item.id === accountId && item.closureStatus === 'active');
    const member = requireActiveMember(state, accountId, actor.actorId);
    if (!account) throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
    const profile = state.userProfiles.find((item) => item.id === actor.actorId);
    // Explicit fields avoid disclosing a tenant's other members, private staff
    // notes, captured third-party data, or future internal profile attributes.
    const profileData = profile ? { userId: profile.id, email: profile.email, firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', watchingRegions: [...(profile.watchingRegions ?? [])], createdAt: profile.createdAt, updatedAt: profile.updatedAt } : null;
    return {
      schema: 'webwatch.personal-profile-export.v1', generatedAt: ISO(),
      scope: 'Your current CLOVERSIGHT profile and active account membership. This is a limited self-service copy; contact support for a wider individual-rights request.',
      profile: profileData,
      membership: { accountId, ...publicMember(member), invitedAt: member.invitedAt ?? null },
    };
  }

  async invite(accountId, input, actor) {
    const email = String(input.email ?? '').trim().toLowerCase().slice(0, 254);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Object.assign(new Error('A valid email address is required.'), { statusCode: 400 });
    const invitation = await this.store.transact('team.invite', (state) => {
      const owner = requireOwner(state, accountId, actor.actorId);
      const account = state.accounts.find((item) => item.id === accountId && item.closureStatus === 'active');
      if (!account) throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      if (this.config.billingProvider !== 'local' && (account.planId === 'free' || !account.providerSubscriptionId)) throw Object.assign(new Error('Team invitations require an active paid account.'), { statusCode: 409, code: 'PAID_TEAM_REQUIRED' });
      if (email === owner.email) throw Object.assign(new Error('The account owner is already on this team.'), { statusCode: 409 });
      const existingAccount = state.accounts.find((item) => item.id !== accountId && item.contactEmail?.toLowerCase() === email && item.closureStatus !== 'closed');
      if (existingAccount) throw Object.assign(new Error('This email already owns another CLOVERSIGHT account.'), { statusCode: 409, code: 'TEAM_MEMBERSHIP_CONFLICT' });
      const active = state.teamMembers.find((item) => item.email === email && item.status === 'active');
      if (active) throw Object.assign(new Error(active.accountId === accountId ? 'This person is already on the team.' : 'This email already belongs to another team.'), { statusCode: 409, code: 'TEAM_MEMBERSHIP_CONFLICT' });
      const foreignPending = state.teamInvitations.find((item) => item.email === email && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO()) && item.accountId !== accountId);
      if (foreignPending) throw Object.assign(new Error('This email already has a pending invitation to another team.'), { statusCode: 409, code: 'TEAM_INVITATION_CONFLICT' });
      const currentCount = state.teamMembers.filter((item) => item.accountId === accountId && item.status === 'active').length + state.teamInvitations.filter((item) => item.accountId === accountId && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO())).length;
      const maxUsers = entitlements(account).maxUsers;
      const existingInvite = state.teamInvitations.find((item) => item.accountId === accountId && item.email === email && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO()));
      if (!existingInvite && currentCount >= maxUsers) throw Object.assign(new Error(`The ${entitlements(account).name} plan supports ${maxUsers} total user(s), including pending invitations.`), { statusCode: 400, code: 'TEAM_PLAN_LIMIT' });
      const now = ISO();
      if ((state.emailSuppressions ?? []).some((item) => item.email === email)) throw Object.assign(new Error('This address is opted out or suppressed and cannot receive invitations.'), { statusCode: 403, code: 'EMAIL_SUPPRESSED' });
      reserveInvitationBudget(state, account, email, now);
      let invite = state.teamInvitations.find((item) => item.accountId === accountId && item.email === email && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO()));
      if (!invite) { invite = { id: id('invite'), accountId, email, status: 'pending', invitedBy: actor.actorId, createdAt: now, expiresAt: addDays(now, 14), acceptedAt: null, acceptedBy: null, revokedAt: null, revokedBy: null }; state.teamInvitations.push(invite); }
      else Object.assign(invite, { invitedBy: actor.actorId, createdAt: now, expiresAt: addDays(now, 14) });
      appendAudit(state, actor, 'team.member_invited', { accountId, targetId: invite.id, requestId: actor.requestId, metadata: { emailHash: sha256(email).slice(0, 16) } });
      return invite;
    });
    let delivery = 'pending';
    try {
      if (this.identityDirectory) {
        const directoryResult = await this.identityDirectory.invite(email);
        if (directoryResult?.existing && this.notifier?.sendTeamInvitation) { const state = await this.store.read(); const account = state.accounts.find((item) => item.id === accountId); await this.notifier.sendTeamInvitation(email, account?.legalName ?? 'your CLOVERSIGHT team'); }
      }
      else if (this.notifier?.sendTeamInvitation) {
        const state = await this.store.read(); const account = state.accounts.find((item) => item.id === accountId);
        await this.notifier.sendTeamInvitation(email, account?.legalName ?? 'your CLOVERSIGHT team');
      }
      delivery = 'sent';
    } catch (error) {
      delivery = 'failed';
      await this.store.transact('team.invite.delivery_failed', (state) => { const target = state.teamInvitations.find((item) => item.id === invitation.id); if (target) { target.deliveryStatus = 'failed'; target.deliveryError = String(error.message).slice(0, 500); } return null; });
    }
    return { ...publicInvitation(invitation), delivery };
  }

  async revokeMember(accountId, memberId, actor) {
    return this.store.transact('team.member.revoke', (state) => {
      requireOwner(state, accountId, actor.actorId);
      const member = state.teamMembers.find((item) => item.id === memberId && item.accountId === accountId && item.status === 'active');
      if (!member) throw Object.assign(new Error('Team member not found.'), { statusCode: 404 });
      if (member.role === 'owner') throw Object.assign(new Error('The account owner cannot be removed.'), { statusCode: 400 });
      member.status = 'revoked'; member.revokedAt = ISO(); member.revokedBy = actor.actorId;
      for (const invitation of state.teamInvitations.filter((item) => item.accountId === accountId && item.email === member.email && item.status === 'pending')) { invitation.status = 'revoked'; invitation.revokedAt = member.revokedAt; invitation.revokedBy = actor.actorId; }
      appendAudit(state, actor, 'team.member_revoked', { accountId, targetId: member.id, requestId: actor.requestId, metadata: { emailHash: sha256(member.email).slice(0, 16) } });
      return { id: member.id, revoked: true };
    });
  }

  async revokeInvitation(accountId, invitationId, actor) {
    return this.store.transact('team.invitation.revoke', (state) => {
      requireOwner(state, accountId, actor.actorId);
      const invitation = state.teamInvitations.find((item) => item.id === invitationId && item.accountId === accountId && item.status === 'pending');
      if (!invitation) throw Object.assign(new Error('Pending invitation not found.'), { statusCode: 404 });
      invitation.status = 'revoked'; invitation.revokedAt = ISO(); invitation.revokedBy = actor.actorId;
      appendAudit(state, actor, 'team.invitation_revoked', { accountId, targetId: invitation.id, requestId: actor.requestId });
      return { id: invitation.id, revoked: true };
    });
  }

  async searchRecipients(accountId, query, actor) {
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId) : await this.store.read(); requireActiveMember(state, accountId, actor.actorId);
    const terms = normalizeNameTerms(query);
    if (!terms.length || terms.join('').length < 2) return [];
    const candidates = state.teamMembers.filter((item) => item.accountId === accountId && item.status === 'active').map((member) => {
      const profile = state.userProfiles.find((item) => item.id === member.userId);
      const firstName = profile?.firstName || member.firstName || member.email.split('@')[0];
      const lastName = profile?.lastName || member.lastName || '';
      return { member, firstName, lastName, score: nameScore(firstName, lastName, terms) };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName)).slice(0, 8);
    return candidates.map(({ member, firstName, lastName }) => ({ id: member.id, name: `${firstName} ${lastName}`.trim() }));
  }

  async recipient(accountId, memberId, actor) {
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId) : await this.store.read(); requireActiveMember(state, accountId, actor.actorId);
    const member = state.teamMembers.find((item) => item.id === memberId && item.accountId === accountId && item.status === 'active');
    if (!member) throw Object.assign(new Error('Team recipient not found.'), { statusCode: 404 });
    const profile = state.userProfiles.find((item) => item.id === member.userId);
    return { id: member.id, userId: member.userId, name: `${profile?.firstName || member.firstName || member.email.split('@')[0]} ${profile?.lastName || member.lastName || ''}`.trim(), email: member.email };
  }

  async registerLocal(input, actor = { actorId: 'local-registration', role: 'system' }) {
    if (this.config.appEnv !== 'local') throw Object.assign(new Error('Local registration is disabled outside local development.'), { statusCode: 404 });
    const profile = normalizeProfile(input);
    return this.store.transact('account.local.register', (state) => {
      if (state.accounts.some((item) => item.contactEmail.toLowerCase() === profile.contactEmail.toLowerCase())) throw Object.assign(new Error('An account with this email already exists.'), { statusCode: 409 });
      const now = ISO(); const accountId = id('acct');
      const account = { id: accountId, ...profile, taxIds: [], planId: 'free', planCatalogVersion: PLAN_CATALOG_VERSION, billingCurrency: 'USD', trialEndsAt: addDays(now, 30), currentPeriodStart: now, currentPeriodEnd: addDays(now, 30), captureCreditsUsed: 0, captureCreditPeriodStart: now, captureCreditPeriodEnd: addDays(now, 30), prepaidCaptureCredits: 0, provider: 'local', providerCustomerId: null, providerSubscriptionId: null, closureStatus: 'active', disabledAt: null, closureScheduledAt: null, deleteAfter: null, createdAt: now, updatedAt: now };
      state.accounts.push(account);
      state.teamMembers.push({ id: stableOwnerMemberId(accountId), accountId, userId: accountId, email: profile.contactEmail, firstName: profile.contactName, lastName: '', role: 'owner', status: 'active', invitedBy: null, invitedAt: null, joinedAt: now, revokedAt: null, revokedBy: null });
      state.userProfiles.push({ id: accountId, email: profile.contactEmail, firstName: profile.contactName || profile.contactEmail.split('@')[0], lastName: '', watchingRegions: [this.config.awsRegion].filter((item) => availableRegions(this.config).includes(item)), createdAt: now, updatedAt: now });
      appendAudit(state, actor, 'account.local_registered', { accountId, requestId: actor.requestId });
      return account;
    });
  }
  async updateProfile(accountId, input, actor) {
    const profile = normalizeProfile(input);
    return this.store.transact('account.profile.update', (state) => {
      requireOwner(state, accountId, actor.actorId);
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      if (account.profileComplete === false) throw Object.assign(new Error('Complete your registration in My profile before editing account details.'), { statusCode: 409 });
      if (state.accounts.some((item) => item.id !== accountId && item.contactEmail.toLowerCase() === profile.contactEmail.toLowerCase())) throw Object.assign(new Error('That contact email is already registered.'), { statusCode: 409 });
      Object.assign(account, profile, { profileComplete: true, updatedAt: ISO() });
      appendAudit(state, actor, 'account.profile_updated', { accountId, requestId: actor.requestId, metadata: { country: account.country, region: account.region } });
      return account;
    });
  }
  async saveOwnerProfile(accountId, input, actor) {
    const billing = normalizeProfile(input);
    const firstName = String(input.firstName ?? '').trim().slice(0, 80);
    const lastName = String(input.lastName ?? '').trim().slice(0, 80);
    if (!firstName || !lastName || !billing.contactName) throw Object.assign(new Error('First name, last name, and contact name are required.'), { statusCode: 400 });
    const watchingRegions = normalizeCheckRegions(input.watchingRegions, availableRegions(this.config));
    if (!watchingRegions.length) throw Object.assign(new Error('Select at least one watching region.'), { statusCode: 400 });
    return this.store.transact('account.owner_profile.save', (state) => {
      const member = requireOwner(state, accountId, actor.actorId);
      const account = state.accounts.find((item) => item.id === accountId && item.closureStatus === 'active');
      if (!account) throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      if (state.accounts.some((item) => item.id !== accountId && item.contactEmail?.toLowerCase() === billing.contactEmail)) throw Object.assign(new Error('That contact email is already registered.'), { statusCode: 409 });
      const profile = ensureUserProfile(state, actor, member, this.config);
      const now = ISO();
      Object.assign(account, billing, { profileComplete: true, updatedAt: now });
      Object.assign(profile, { firstName, lastName, watchingRegions, updatedAt: now });
      Object.assign(member, { firstName, lastName });
      appendAudit(state, actor, 'account.owner_profile_saved', { accountId, requestId: actor.requestId, metadata: { country: account.country, region: account.region, watchingRegions } });
      return account;
    });
  }
  async scheduleClosure(accountId, reason, actor) {
    reason = String(reason ?? 'Requested by customer').slice(0, 1000);
    return this.store.transact('account.close.schedule', (state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
      if (account.closureStatus === 'purging') throw Object.assign(new Error('Account erasure has started and cannot be rescheduled.'), { statusCode: 409, code: 'ACCOUNT_PURGE_STARTED' });
      if (account.closureStatus === 'scheduled') return account;
      const now = ISO(); account.closureStatus = 'scheduled'; account.disabledAt = now; account.closureScheduledAt = now; account.deleteAfter = addDays(now, this.config.closureGraceDays); account.closureReason = reason; account.updatedAt = now;
      requestCancellation(state, account, 'immediate', actor);
      account.closureWork = 'pause';
      applyClosureBatch(state, account);
      appendAudit(state, actor, 'account.closure_scheduled', { accountId, reason, requestId: actor.requestId }); return account;
    });
  }
  async cancelClosure(accountId, reason, actor) {
    return this.store.transact('account.close.cancel', (state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || account.closureStatus !== 'scheduled') throw Object.assign(new Error('Account is not scheduled for closure.'), { statusCode: 400 });
      account.closureStatus = 'active'; account.disabledAt = null; account.closureScheduledAt = null; account.deleteAfter = null; account.closureReason = null; account.updatedAt = ISO();
      account.closureWork = 'restore';
      applyClosureBatch(state, account);
      appendAudit(state, actor, 'account.closure_cancelled', { accountId, reason, requestId: actor.requestId }); return account;
    });
  }
  async processClosureTransitions() {
    const candidates = this.store.readCollection ? await this.store.readCollection('accounts') : (await this.store.read()).accounts;
    let batches = 0;
    for (const candidate of candidates.filter(a => a.closureWork).slice(0, 5)) {
      for (let batch = 0; batch < 15; batch += 1) {
        const remaining = await this.store.transact('account.closure.batch', state => {
          const account = state.accounts.find(a => a.id === candidate.id);
          if (!account?.closureWork) return false;
          applyClosureBatch(state, account); return Boolean(account.closureWork);
        });
        batches += 1; if (!remaining) break;
      }
    }
    return { batches };
  }

  async purgeDue() {
    if (this.store.readCollection) {
      const accounts = await this.store.readCollection('accounts');
      if (!accounts.some((item) => item.closureStatus === 'purging' || item.closureStatus === 'scheduled' && item.deleteAfter <= ISO())) return [];
    }
    return this.store.transact('account.close.purge', (state) => {
      const now = ISO();
      const due = state.accounts.filter((item) => item.closureStatus === 'purging' || item.closureStatus === 'scheduled' && item.deleteAfter <= now)
        .sort((left, right) => String(left.deleteAfter ?? left.createdAt).localeCompare(String(right.deleteAfter ?? right.createdAt)));
      let account = null; let blockedChanges = 0; let blockedBytes = 0;
      for (const candidate of due) {
        const unresolvedPayments = state.transactions.some((item) => item.accountId === candidate.id && cancellationPaymentPending(item));
        const unresolvedRefunds = state.refunds.some((item) => item.accountId === candidate.id && !['completed', 'failed', 'canceled', 'cancelled'].includes(item.status));
        const subscriptionPending = candidate.closureWork || candidate.billingCancellation?.status !== 'completed' || candidate.provider === 'stripe' && candidate.providerSubscriptionId && !['canceled', 'incomplete_expired'].includes(candidate.billingStatus);
        const blockedReason = subscriptionPending ? 'provider_subscription_cancellation_pending' : unresolvedPayments || unresolvedRefunds ? 'billing_reconciliation_pending' : null;
        if (blockedReason) {
          // A masked archive is insufficient to recover an unsettled provider
          // operation. Keep the original ledger under restricted access until
          // reconciliation instead of discarding its payment references.
          if (candidate.purgeBlockedReason !== blockedReason) {
            if (blockedChanges >= 10 || blockedBytes + jsonBytes(candidate) > 500_000) break;
            candidate.purgeBlockedReason = blockedReason; candidate.purgeBlockedAt = now; candidate.updatedAt = now; blockedChanges += 1;
            blockedBytes += jsonBytes(candidate);
          }
          continue;
        }
        candidate.purgeBlockedReason = null;
        account = candidate; break;
      }
      if (!account) return [];
      let closed = state.closedAccounts.find((item) => item.id === account.id);
      if (!closed) {
        closed = { cancellation: cancellationView(account), id: account.id, kind: 'closed_account', accountId: account.id, legalName: account.legalName, contactEmail: account.contactEmail, country: account.country, region: account.region, taxIds: account.taxIds ?? [], providerCustomerId: maskPayment(account.providerCustomerId), transactions: [], financialRetentionMode: 'partitioned', closedAt: null, purgeStartedAt: now, originalCreatedAt: account.createdAt, deletionConfirmationStatus: 'operational_pending', deletionConfirmedAt: null, deletionNotificationSentAt: null, identityManifestVersion: 2, identityDeletionStatus: 'pending', ownerIdentityRequired: !state.teamMembers.some((item) => item.accountId === account.id && item.role === 'owner'), deletionManifest: { operationalRecords: { status: 'pending', removedRecords: 0 }, identity: { status: 'pending' }, configuredAssets: { status: 'pending' }, retainedExceptions: ['restricted_financial_records', 'email_opt_out_suppressions', 'provider_records', 'backup_and_security_record_policy_review', 'unaccepted_invitation_identity_policy_review'] } };
        if (jsonBytes(closed) > 200_000) throw Object.assign(new Error('Restricted account header requires a manual size/minimization review before erasure.'), { code: 'CLOSED_ACCOUNT_HEADER_TOO_LARGE' });
        state.closedAccounts.push(closed);
        account.closureStatus = 'purging'; account.purgeStartedAt = now; account.updatedAt = now;
      }
      if (closed.deletionManifest?.operationalRecords?.status === 'completed' || closed.identityManifestVersion !== 2) throw Object.assign(new Error('Account erasure state requires review before further cleanup.'), { code: 'ACCOUNT_PURGE_STATE_CONFLICT' });
      // Reserve room for the header, final account removal and final audit.
      // Count archived puts + operational deletes together, and also bound
      // approximate payload bytes for whole-value DynamoDB conditions.
      let mutations = 4 + blockedChanges; let bytes = jsonBytes(closed) + jsonBytes(account) + blockedBytes; let removed = 0;
      const reserve = (...items) => {
        const extraBytes = items.reduce((total, item) => total + jsonBytes(item), 0);
        if (mutations + items.length > 80 || bytes + extraBytes > 1_500_000) return false;
        mutations += items.length; bytes += extraBytes; return true;
      };
      const erase = (collection, item) => { state[collection] = state[collection].filter((candidate) => candidate.id !== item.id); removed += 1; };
      const notificationIds = new Set(state.notifications.filter((item) => item.accountId === account.id).map((item) => item.id));
      for (const link of (state.emailUnsubscribeLinks ?? []).filter((item) => item.accountId === account.id || notificationIds.has(item.notificationId))) {
        if (!reserve(link)) break;
        erase('emailUnsubscribeLinks', link);
      }
      const linksRemain = (state.emailUnsubscribeLinks ?? []).some((item) => item.accountId === account.id || notificationIds.has(item.notificationId));
      // Keep notifications until every legacy link has been found and removed;
      // the next batch still has its authoritative notification-to-account map.
      if (!linksRemain) {
        for (const transaction of state.transactions.filter((item) => item.accountId === account.id)) {
          const summary = closedTransactionSummary(transaction, account.id);
          const archive = { id: `closed-transaction:${sha256(`${account.id}:${transaction.id}`)}`, kind: 'closed_financial_transaction', accountId: account.id, transactions: [summary], retainedAt: now };
          if (!reserve(transaction, archive)) break;
          if (!state.closedAccounts.some((item) => item.id === archive.id)) state.closedAccounts.push(archive);
          erase('transactions', transaction);
        }
        for (const member of state.teamMembers.filter((item) => item.accountId === account.id)) {
          const identity = deletionIdentity(state, account, member, now);
          const archive = identityDeletionRow(account.id, identity);
          const shared = identity.status === 'retained_shared_identity';
          const profile = !shared ? state.userProfiles.find((item) => item.id === member.userId) : null;
          if (!reserve(member, archive, ...(profile ? [profile] : []))) break;
          if (!state.closedAccounts.some((item) => item.id === archive.id)) state.closedAccounts.push(archive);
          if (profile) erase('userProfiles', profile);
          erase('teamMembers', member);
        }
        if (closed.ownerIdentityRequired) {
          const identity = deletionIdentity(state, account, { userId: account.id, email: account.contactEmail }, now);
          const archive = identityDeletionRow(account.id, identity);
          const profile = identity.status !== 'retained_shared_identity' ? state.userProfiles.find((item) => item.id === account.id) : null;
          if (reserve(archive, ...(profile ? [profile] : []))) {
            if (!state.closedAccounts.some((item) => item.id === archive.id)) state.closedAccounts.push(archive);
            if (profile) erase('userProfiles', profile);
            closed.ownerIdentityRequired = false;
          }
        }
        for (const collection of ['watchers', 'snapshots', 'alerts', 'notifications', 'refunds', 'staffNotes', 'jobs', 'auditEvents', 'teamInvitations']) {
          for (const item of state[collection].filter((candidate) => candidate.accountId === account.id)) {
            if (!reserve(item)) break;
            erase(collection, item);
          }
        }
      }
      closed.deletionManifest.operationalRecords.removedRecords = Number(closed.deletionManifest.operationalRecords.removedRecords ?? 0) + removed;
      closed.deletionManifest.operationalRecords.lastProgressAt = now;
      const collections = ['watchers', 'snapshots', 'alerts', 'notifications', 'transactions', 'refunds', 'staffNotes', 'jobs', 'auditEvents', 'teamMembers', 'teamInvitations', 'emailUnsubscribeLinks'];
      const pending = linksRemain || closed.ownerIdentityRequired || collections.some((collection) => state[collection].some((item) => item.accountId === account.id));
      if (pending) return [];
      closed.closedAt = now; closed.deletionConfirmationStatus = 'assets_pending';
      closed.deletionManifest.operationalRecords.status = 'completed'; closed.deletionManifest.operationalRecords.completedAt = now;
      const identities = deletionIdentityEntries(state, closed);
      closed.identityDeletionStatus = identities.every(identityFinished) ? 'completed' : 'pending';
      closed.deletionManifest.identity.status = closed.identityDeletionStatus;
      state.accounts = state.accounts.filter((item) => item.id !== account.id);
      appendAudit(state, { actorId: 'system', role: 'system' }, 'account.purged', { accountId: account.id, metadata: { removedRecords: closed.deletionManifest.operationalRecords.removedRecords } });
      return [{ accountId: account.id, watcherIds: [], alertIds: [] }];
    });
  }

  async pendingDeletionConfirmations() {
    const before = this.store.readCollection ? { closedAccounts: await this.store.readCollection('closedAccounts') } : await this.store.read();
    const recover = before.closedAccounts.some((item) => item.deletionConfirmationStatus === 'notification_pending' && item.deletionNotification?.state === 'attempted' && item.deletionNotification.attemptExpiresAt <= ISO());
    if (recover) await this.store.transact('account.close.notice_recover', (state) => {
      const now = ISO();
      for (const account of state.closedAccounts.filter((item) => item.deletionConfirmationStatus === 'notification_pending' && item.deletionNotification?.state === 'attempted' && item.deletionNotification.attemptExpiresAt <= now).slice(0, 10)) {
        Object.assign(account.deletionNotification, { state: 'ambiguous', nextAttemptAt: null, requiresReview: true, reason: 'PRIOR_SEND_OUTCOME_UNKNOWN', outcomeRecordedAt: now });
      }
      return null;
    });
    const state = recover ? await this.store.read() : before;
    return state.closedAccounts
      .filter((item) => ['assets_pending', 'notification_pending'].includes(item.deletionConfirmationStatus))
      .filter((item) => item.deletionManifest?.operationalRecords?.status === 'completed' || !item.deletionManifest)
      .filter((item) => item.identityDeletionStatus !== 'manual_review_required' && (!item.identityDeletionNextAttemptAt || item.identityDeletionNextAttemptAt <= ISO()))
      .filter((item) => item.deletionConfirmationStatus === 'assets_pending' || ((!item.deletionNotification || item.deletionNotification.state === 'failed') && !item.deletionNotification?.requiresReview && Number(item.deletionNotification?.attempts ?? 0) < 5 && (!item.deletionNotification?.nextAttemptAt || item.deletionNotification.nextAttemptAt <= ISO())))
      .sort((left, right) => String(left.identityDeletionLastAttemptAt ?? '').localeCompare(String(right.identityDeletionLastAttemptAt ?? '')) || String(left.closedAt ?? '').localeCompare(String(right.closedAt ?? '')))
      .slice(0, 10)
      .map((item) => ({ accountId: item.id, legalName: item.legalName, contactEmail: item.contactEmail, status: item.deletionConfirmationStatus, identityStatus: item.identityDeletionStatus ?? 'legacy_review_required', notificationState: item.deletionNotification?.state ?? 'pending' }));
  }

  async purgeDeletionIdentities(accountId) {
    const state = await this.store.read();
    const closed = state.closedAccounts.find((item) => item.id === accountId);
    if (!closed) throw new Error('Closed account record is missing.');
    // Older closures discarded membership-to-Cognito bindings. Do not claim
    // identity deletion or guess which user to delete from a contact address.
    if (!Array.isArray(closed.identityDeletions) && closed.identityManifestVersion !== 2) {
      await this.store.transact('account.close.legacy_identity_review', (draft) => {
        const record = draft.closedAccounts.find((item) => item.id === accountId);
        record.identityDeletionStatus = 'manual_review_required'; record.identityDeletionLastAttemptAt = ISO(); record.identityDeletionNextAttemptAt = null;
        record.deletionManifest ??= {};
        record.deletionManifest.identity = { status: 'manual_review_required', reason: 'legacy_identity_manifest_missing' };
        return null;
      });
      return { accountId, status: 'pending', reason: 'legacy_identity_manifest_missing' };
    }
    if (closed.deletionManifest?.operationalRecords?.status !== 'completed') return { accountId, status: 'pending', reason: 'operational_purge_pending' };
    for (const identity of deletionIdentityEntries(state, closed).filter(identityEligible).slice(0, 3)) {
      const live = await this.store.read();
      const shared = live.teamMembers.some((item) => item.userId === identity.userId && item.status === 'active' && live.accounts.some((account) => account.id === item.accountId));
      if (shared) {
        await this.#recordIdentityOutcome(accountId, identity.subjectHash, { status: 'retained_shared_identity', completedAt: ISO() });
        continue;
      }
      if (!this.identityDirectory?.erase) {
        const localOnly = !this.config.customerUserPoolId && this.config.billingProvider === 'local';
        await this.#recordIdentityOutcome(accountId, identity.subjectHash, { status: localOnly ? 'local_not_applicable' : 'manual_review_required', reason: localOnly ? 'local_development_identity' : 'identity_directory_unavailable', completedAt: localOnly ? ISO() : null });
        continue;
      }
      const attempts = Number(identity.attempts ?? 0) + 1;
      await this.#recordIdentityOutcome(accountId, identity.subjectHash, { status: 'processing', attempts, attemptedAt: ISO(), nextAttemptAt: null });
      try {
        const outcome = await this.identityDirectory.erase(identity, async (resolved) => {
          // Persist the resolved immutable binding before disabling/deleting;
          // a retry can then establish an already-deleted user idempotently.
          await this.#recordIdentityOutcome(accountId, identity.subjectHash, { ...resolved, status: 'processing' });
        });
        await this.#recordIdentityOutcome(accountId, identity.subjectHash, { status: 'deleted', completedAt: ISO(), reason: outcome.alreadyAbsent ? 'already_absent' : 'provider_deleted' });
      } catch (error) {
        const errorCode = String(error.code ?? error.name ?? 'IDENTITY_DELETION_FAILED').slice(0, 100);
        const manualReview = attempts >= 5 || errorCode === 'CUSTOMER_IDENTITY_BINDING_FAILED';
        await this.#recordIdentityOutcome(accountId, identity.subjectHash, { status: manualReview ? 'manual_review_required' : 'failed', attemptedAt: ISO(), errorCode, nextAttemptAt: manualReview ? null : addSeconds(ISO(), [60, 300, 1800, 7200][Math.min(3, attempts - 1)]) });
      }
    }
    return this.store.transact('account.close.identities_status', (draft) => {
      const record = draft.closedAccounts.find((item) => item.id === accountId);
      const unresolved = deletionIdentityEntries(draft, record).filter((item) => !identityFinished(item));
      record.identityDeletionStatus = !unresolved.length ? 'completed' : unresolved.every((item) => item.status === 'manual_review_required') ? 'manual_review_required' : 'pending';
      record.identityDeletionLastAttemptAt = ISO();
      record.identityDeletionNextAttemptAt = unresolved.some((item) => item.status !== 'manual_review_required' && !item.nextAttemptAt) ? null : unresolved.filter((item) => item.nextAttemptAt).map((item) => item.nextAttemptAt).sort()[0] ?? null;
      record.deletionManifest ??= {};
      record.deletionManifest.identity = { status: record.identityDeletionStatus, ...(record.identityDeletionStatus === 'completed' ? { completedAt: ISO() } : {}) };
      return { accountId, status: record.identityDeletionStatus };
    });
  }

  async #recordIdentityOutcome(accountId, subjectHash, outcome) {
    return this.store.transact('account.close.identity_outcome', (state) => {
      const closed = state.closedAccounts.find((item) => item.id === accountId);
      const identity = closed ? deletionIdentityEntries(state, closed).find((item) => item.subjectHash === subjectHash) : null;
      if (!identity) throw new Error('Identity deletion manifest is missing.');
      Object.assign(identity, outcome);
      if (identityFinished(identity)) {
        delete identity.userId; delete identity.email; delete identity.cognitoSubject; delete identity.cognitoUsername; delete identity.errorCode;
      }
      return null;
    });
  }

  async confirmDeletionAssets(accountId) {
    return this.store.transact('account.close.assets_confirmed', (state) => {
      const account = state.closedAccounts.find((item) => item.id === accountId);
      if (!account) throw new Error('Closed account record is missing.');
      if (account.deletionManifest?.operationalRecords?.status !== 'completed') throw Object.assign(new Error('Operational account purge is not complete.'), { code: 'OPERATIONAL_DELETION_PENDING' });
      if (account.identityDeletionStatus !== 'completed') throw Object.assign(new Error('Customer identity cleanup is not complete.'), { code: 'IDENTITY_DELETION_PENDING' });
      if (account.deletionConfirmationStatus === 'assets_pending') {
        account.deletionConfirmationStatus = 'notification_pending'; account.deletionConfirmedAt = ISO();
        account.deletionManifest ??= {};
        account.deletionManifest.configuredAssets = { status: 'completed', completedAt: account.deletionConfirmedAt };
      }
      return { accountId, status: account.deletionConfirmationStatus };
    });
  }

  async beginDeletionNotification(accountId) {
    return this.store.transact('account.close.notice_claim', (state) => {
      const account = state.closedAccounts.find((item) => item.id === accountId);
      if (!account) throw new Error('Closed account record is missing.');
      if (account.deletionConfirmationStatus !== 'notification_pending' || account.identityDeletionStatus !== 'completed' || account.deletionManifest?.operationalRecords?.status !== 'completed') return { claimed: false };
      const now = ISO(); const notice = account.deletionNotification;
      if (notice?.state === 'attempted') {
        if (notice.attemptExpiresAt <= now) Object.assign(notice, { state: 'ambiguous', nextAttemptAt: null, requiresReview: true, reason: 'PRIOR_SEND_OUTCOME_UNKNOWN', outcomeRecordedAt: now });
        return { claimed: false };
      }
      if (notice && notice.state !== 'failed' || notice?.requiresReview || Number(notice?.attempts ?? 0) >= 5 || notice?.nextAttemptAt && notice.nextAttemptAt > now) return { claimed: false };
      const attemptId = id('deletion-notice');
      account.deletionNotification = { state: 'attempted', attemptId, attempts: Number(notice?.attempts ?? 0) + 1, attemptedAt: now, attemptExpiresAt: addSeconds(now, 180), nextAttemptAt: null, providerMessageId: null, requiresReview: false };
      return { claimed: true, attemptId };
    });
  }

  async recordDeletionNotificationOutcome(accountId, outcome, attemptId) {
    return this.store.transact('account.close.notification_outcome', (state) => {
      const account = state.closedAccounts.find((item) => item.id === accountId);
      if (!account) throw new Error('Closed account record is missing.');
      const notice = account.deletionNotification;
      if (!attemptId || notice?.attemptId !== attemptId || notice.state !== 'attempted') return { recorded: false, reason: 'stale_notice_attempt' };
      const attempts = Number(notice.attempts ?? 1);
      const deliveryState = outcome?.deliveryState ?? 'ambiguous';
      const retryable = deliveryState === 'failed' && attempts < 5;
      account.deletionNotification = { ...notice, state: deliveryState, outcomeRecordedAt: ISO(), providerMessageId: outcome?.providerMessageId ?? null, reason: outcome?.reason ?? null, nextAttemptAt: retryable ? addSeconds(ISO(), [60, 300, 1800, 7200][Math.min(3, attempts - 1)]) : null, requiresReview: !retryable };
      return { recorded: true };
    });
  }

  async confirmDeletionNotification(accountId, outcome, attemptId) {
    if (!['accepted', 'local_queued'].includes(outcome?.deliveryState)) throw Object.assign(new Error('Deletion notice has not been accepted for sending.'), { code: 'DELETION_NOTICE_NOT_ACCEPTED' });
    return this.store.transact('account.close.notification_confirmed', (state) => {
      const account = state.closedAccounts.find((item) => item.id === accountId);
      if (!account) throw new Error('Closed account record is missing.');
      if (!attemptId || account.deletionNotification?.attemptId !== attemptId || account.deletionNotification?.state !== 'attempted') return { accountId, status: account.deletionConfirmationStatus, recorded: false, reason: 'stale_notice_attempt' };
      if (account.deletionConfirmationStatus === 'notification_pending') {
        account.deletionConfirmationStatus = 'completed'; account.deletionNotificationSentAt = ISO();
        account.deletionNotification = { ...account.deletionNotification, state: outcome.deliveryState, acceptedAt: account.deletionNotificationSentAt, providerMessageId: outcome.providerMessageId ?? null, nextAttemptAt: null };
      }
      return { accountId, status: account.deletionConfirmationStatus, recorded: true };
    });
  }
}

function stableOwnerMemberId(accountId) { return `member_${sha256(`owner:${accountId}`).slice(0, 24)}`; }

function subjectFence(userId) { return sha256(`erased-customer-subject:${String(userId)}`); }
function identityFinished(identity) { return ['deleted', 'local_not_applicable', 'retained_shared_identity'].includes(identity.status); }
function identityEligible(identity) { return !identityFinished(identity) && identity.status !== 'manual_review_required' && Number(identity.attempts ?? 0) < 5 && (!identity.nextAttemptAt || identity.nextAttemptAt <= ISO()); }
function bindCustomerIdentity(member, actor) {
  const subject = String(actor.claims?.sub ?? '');
  // Bind only the subject authenticated by the existing gateway identity
  // mapper. Neither an email address nor a caller-supplied profile is proof.
  if (!member || !subject || `acct_${sha256(subject).slice(0, 24)}` !== actor.actorId) return;
  member.cognitoSubject = subject;
  const username = actor.claims?.['cognito:username'] ?? actor.claims?.username;
  if (username) member.cognitoUsername = String(username).slice(0, 128);
}
function deletionIdentity(state, account, member, now) {
  const shared = state.teamMembers.some((item) => item.accountId !== account.id && item.userId === member.userId && item.status === 'active' && state.accounts.some((candidate) => candidate.id === item.accountId));
  const common = { subjectHash: subjectFence(member.userId), status: shared ? 'retained_shared_identity' : 'pending', createdAt: now };
  return shared ? { ...common, completedAt: now } : { ...common, userId: member.userId, email: member.email ?? '', cognitoSubject: member.cognitoSubject ?? null, cognitoUsername: member.cognitoUsername ?? null };
}
function identityDeletionRow(accountId, identity) {
  return { id: `closed-identity:${sha256(`${accountId}:${identity.subjectHash}`)}`, kind: 'customer_identity_deletion', accountId, transactions: [], ...identity, ...(identity.status !== 'retained_shared_identity' ? { erasedSubjectHash: identity.subjectHash } : {}) };
}
function deletionIdentityEntries(state, closed) {
  return closed.identityManifestVersion === 2
    ? state.closedAccounts.filter((item) => item.kind === 'customer_identity_deletion' && item.accountId === closed.id)
    : closed.identityDeletions ?? [];
}
function closedTransactionSummary(item, accountId) {
  return { id: item.id, accountId, provider: item.provider, type: item.type, planId: item.planId, amountMinor: item.amountMinor, taxMinor: item.taxMinor, currency: item.currency, status: item.status, outcomeReason: item.outcomeReason, paymentReference: maskPayment(item.paymentReference), providerCustomerId: maskPayment(item.providerCustomerId), createdAt: item.createdAt, updatedAt: item.updatedAt };
}
function jsonBytes(value) { return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8'); }

function ensureUserProfile(state, actor, member, config) {
  let profile = state.userProfiles.find((item) => item.id === actor.actorId);
  if (!profile) {
    const now = ISO();
    profile = { id: actor.actorId, email: String(actor.email || member.email).toLowerCase(), firstName: member.firstName || String(actor.email || member.email).split('@')[0], lastName: member.lastName || '', watchingRegions: [config.awsRegion].filter((item) => availableRegions(config).includes(item)), createdAt: now, updatedAt: now };
    state.userProfiles.push(profile);
  }
  return profile;
}

function availableRegions(config) { return Array.isArray(config.availableCheckRegions) && config.availableCheckRegions.length ? config.availableCheckRegions : [config.awsRegion || 'us-east-1']; }

function requireActiveMember(state, accountId, userId) {
  const member = state.teamMembers.find((item) => item.accountId === accountId && item.userId === userId && item.status === 'active');
  if (!member) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 });
  return member;
}

function requireOwner(state, accountId, userId) {
  const member = requireActiveMember(state, accountId, userId);
  if (member.role !== 'owner') throw Object.assign(new Error('Only the account owner can perform this action.'), { statusCode: 403, code: 'OWNER_REQUIRED' });
  return member;
}

function publicMember(member) { return { id: member.id, userId: member.userId, email: member.email, firstName: member.firstName || '', lastName: member.lastName || '', role: member.role, joinedAt: member.joinedAt }; }
function publicInvitation(invitation) { return { id: invitation.id, email: invitation.email, status: invitation.status, createdAt: invitation.createdAt, expiresAt: invitation.expiresAt }; }
function normalizeNameTerms(value) { return normalizeNameValue(value).split(/\s+/).filter(Boolean).slice(0, 4); }
function nameScore(firstName, lastName, terms) {
  const first = normalizeNameValue(firstName); const last = normalizeNameValue(lastName); const combined = `${first} ${last}`.trim();
  if (terms.length === 1) {
    const firstStrength = fuzzyTokenStrength(first, terms[0]);
    if (firstStrength) return 200 + firstStrength;
    const lastStrength = fuzzyTokenStrength(last, terms[0]);
    return lastStrength ? 100 + lastStrength : 0;
  }
  let score = 0;
  for (const term of terms) {
    const strength = Math.max(fuzzyTokenStrength(first, term), fuzzyTokenStrength(last, term));
    if (!strength) return 0;
    score += strength;
  }
  if (combined.startsWith(terms.join(' '))) score += 80;
  if (`${last} ${first}`.trim().startsWith(terms.join(' '))) score += 60;
  return score;
}

function normalizeNameValue(value) { return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim(); }
function fuzzyTokenStrength(value, term) {
  if (!value || !term) return 0;
  if (value === term) return 70;
  if (value.startsWith(term)) return 60;
  if (value.includes(term)) return 48;
  const words = value.split(/[\s'-]+/).filter(Boolean);
  const tolerance = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
  if (!tolerance) return 0;
  let closest = Infinity;
  for (const word of words) closest = Math.min(closest, boundedEditDistance(word, term, tolerance));
  return closest <= tolerance ? 34 - closest * 6 : 0;
}
function boundedEditDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row]; let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
      rowMinimum = Math.min(rowMinimum, current[column]);
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length];
}


function remainingSeconds(target, now) {
  if (!target) return null;
  const seconds = Math.ceil((Date.parse(target) - Date.parse(now)) / 1000);
  return Number.isFinite(seconds) ? Math.max(60, seconds) : null;
}
function restoreTimer(now, seconds) { return Number.isFinite(seconds) ? addSeconds(now, Math.max(60, seconds)) : null; }

function normalizeProfile(input) {
  const profile = {
    legalName: String(input.legalName ?? '').trim().slice(0, 200),
    contactName: String(input.contactName ?? '').trim().slice(0, 120),
    contactEmail: String(input.contactEmail ?? '').trim().toLowerCase().slice(0, 254),
    country: String(input.country ?? '').trim().toUpperCase().slice(0, 2),
    region: String(input.region ?? '').trim().slice(0, 100),
    postalCode: String(input.postalCode ?? '').trim().toUpperCase().slice(0, 20),
  };
  const errors = [];
  if (profile.legalName.length < 2) errors.push('Legal or business name is required.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.contactEmail)) errors.push('A valid contact email is required.');
  if (!/^[A-Z]{2}$/.test(profile.country)) errors.push('Country must be a two-letter ISO code.');
  if (!profile.region) errors.push('State or province is required.');
  if (!profile.postalCode) errors.push('Postal or ZIP code is required.');
  if (errors.length) throw Object.assign(new Error(errors.join(' ')), { statusCode: 400, details: errors });
  return profile;
}

// The account closure flag is the immediate admission fence. Secondary records
// are changed in bounded, restartable transactions, including on reopening.
function applyClosureBatch(state, account) {
  const pausing = account.closureWork === 'pause'; const now = ISO();
  let changed = 0; let bytes = 0; let remaining = false;
  const apply = (item, fn) => {
    const size = jsonBytes(item) * 2 + 1024;
    if (changed >= 40 || bytes + size > 1_500_000) { remaining = true; return; }
    fn(); changed += 1; bytes += size;
  };
  for (const w of state.watchers.filter(w => w.accountId === account.id && (pausing ? !['account_paused', 'deleted'].includes(w.status) : w.status === 'account_paused'))) {
    apply(w, () => {
      if (pausing) { w.previousStatusBeforeClosure = w.status; w.status = 'account_paused'; }
      else { w.status = w.previousStatusBeforeClosure ?? 'paused'; w.previousStatusBeforeClosure = null; }
      w.updatedAt = now;
    });
  }
  for (const a of state.alerts.filter(a => a.accountId === account.id && (pausing ? ['open', 'acknowledged'].includes(a.status) : a.status === 'account_paused'))) {
    apply(a, () => {
      if (pausing) {
        a.previousStatusBeforeClosure = a.status; a.remainingEscalationSecondsBeforeClosure = remainingSeconds(a.nextEscalationAt, account.closureScheduledAt);
        a.remainingReAlertSecondsBeforeClosure = remainingSeconds(a.nextReAlertAt, account.closureScheduledAt);
        a.status = 'account_paused'; a.nextEscalationAt = null; a.nextReAlertAt = null;
      } else {
        a.status = a.previousStatusBeforeClosure ?? 'open'; a.nextEscalationAt = restoreTimer(now, a.remainingEscalationSecondsBeforeClosure);
        a.nextReAlertAt = restoreTimer(now, a.remainingReAlertSecondsBeforeClosure); a.previousStatusBeforeClosure = null;
        a.remainingEscalationSecondsBeforeClosure = null; a.remainingReAlertSecondsBeforeClosure = null;
      }
      a.updatedAt = now;
    });
  }
  if (pausing) for (const t of state.transactions.filter(t => t.accountId === account.id && t.status === 'retry_scheduled')) {
    apply(t, () => { t.status = t.providerInvoiceId ? 'payment_required' : t.type === 'plan_change' ? 'reconciliation_required' : 'cancellation_stopped'; t.automaticRetryAt = null; t.cancellationPreviousOutcomeReason = t.outcomeReason; t.outcomeReason = 'account_closure_cancelled_retry'; t.updatedAt = now; });
  }
  account.closureWork = remaining ? account.closureWork : null; account.updatedAt = now;
}
