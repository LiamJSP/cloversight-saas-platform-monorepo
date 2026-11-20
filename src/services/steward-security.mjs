import { ISO, id, sha256 } from '../lib.mjs';
import { appendAudit } from './audit.mjs';

export const DEFAULT_STEWARD_LIMITS = Object.freeze({ searchCount: 20, searchWindowMinutes: 5, closureCount: 5, closureWindowMinutes: 60, refundCount: 5, refundWindowMinutes: 60, singleRefundMinor: 50000 });
const LIMIT_RANGES = { searchCount: [1, 500], searchWindowMinutes: [1, 1440], closureCount: [1, 100], closureWindowMinutes: [1, 1440], refundCount: [1, 100], refundWindowMinutes: [1, 1440], singleRefundMinor: [1, 100000000] };
const forbidden = (message = 'Steward access is unavailable.') => Object.assign(new Error(message), { statusCode: 403 });
const invalid = (message) => Object.assign(new Error(message), { statusCode: 400 });

// The configured immutable Cognito subject, never an email or browser claim,
// identifies the one platform owner. Staff invitations bind to Cognito sub.
export class StewardSecurity {
  constructor({ store, config, notifier, logger, client = null }) { Object.assign(this, { store, config, notifier, logger, client }); }
  async authorize(actor) {
    if (actor.role !== 'steward') throw forbidden();
    if (this.config.appEnv === 'local' && actor.actorId === this.config.stewardId) return { role: 'owner', email: actor.email || 'local-owner', actorId: actor.actorId };
    if (this.config.stewardOwnerSub && actor.claims?.sub === this.config.stewardOwnerSub) return { role: 'owner', email: actor.email, actorId: actor.actorId };
    const state = await this.store.read();
    const staff = state.stewardUsers.find((user) => user.subject === (this.config.appEnv === 'local' ? `local:${actor.email}` : actor.claims?.sub) && user.email === actor.email && user.status === 'active' && (this.config.appEnv !== 'local' || actor.actorId === `staff_${sha256(user.subject).slice(0, 24)}`));
    if (!staff) throw forbidden('This steward account is disabled or has not been invited.');
    return { role: 'steward', email: staff.email, actorId: actor.actorId };
  }
  requireOwner(actor) { if (actor.stewardRole !== 'owner') throw forbidden('Platform owner access is required.'); }
  async roster() {
    const state = await this.store.read();
    return { owner: { actorId: this.config.stewardOwnerSub ? `staff_${sha256(this.config.stewardOwnerSub).slice(0, 24)}` : this.config.stewardId }, users: state.stewardUsers.map(({ id, email, subject, status, invitedAt, disabledAt }) => ({ id, email, actorId: subject ? `staff_${sha256(subject).slice(0, 24)}` : null, status, invitedAt, disabledAt: disabledAt ?? null })), limits: this.limits(state) };
  }
  limits(state) { return { ...DEFAULT_STEWARD_LIMITS, ...(state.stewardSettings.find((item) => item.id === 'global')?.limits ?? {}) }; }
  async updateLimits(input, actor) {
    this.requireOwner(actor);
    const limits = {};
    for (const [key, [low, high]] of Object.entries(LIMIT_RANGES)) {
      const value = Number(input?.[key]);
      if (!Number.isInteger(value) || value < low || value > high) throw invalid(`${key} must be an integer from ${low} to ${high}.`);
      limits[key] = value;
    }
    await this.store.transact('steward.limits.update', (state) => {
      const previous = state.stewardSettings.find((item) => item.id === 'global');
      const oldLimits = this.limits(state);
      if (previous) { previous.limits = limits; previous.updatedAt = ISO(); }
      else state.stewardSettings.push({ id: 'global', limits, updatedAt: ISO() });
      appendAudit(state, actor, 'steward.limits_updated', { requestId: actor.requestId, metadata: { previous: oldLimits, limits } });
    });
    return limits;
  }
  async #cognito() {
    if (!this.config.stewardUserPoolId) throw new Error('Steward user pool is not configured.');
    if (!this.client) { const { CognitoIdentityProviderClient } = await import('@aws-sdk/client-cognito-identity-provider'); this.client = new CognitoIdentityProviderClient({ region: this.config.awsRegion }); }
    return this.client;
  }
  async invite(emailInput, actor) {
    const email = String(emailInput ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw invalid('Enter a valid steward email address.');
    if (email === actor.email) throw invalid('The platform owner cannot invite their own identity.');
    const state = await this.store.read();
    if (state.stewardUsers.some((item) => item.email === email && item.status !== 'deleted')) throw invalid('This steward is already invited.');
    let subject = `local:${email}`;
    if (this.config.appEnv !== 'local') {
      const { AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      const result = await (await this.#cognito()).send(new AdminCreateUserCommand({ UserPoolId: this.config.stewardUserPoolId, Username: email, UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }], DesiredDeliveryMediums: ['EMAIL'] }));
      subject = result.User?.Attributes?.find((attribute) => attribute.Name === 'sub')?.Value;
    }
    if (!subject) throw new Error('Cognito did not return a steward subject; revoke this invitation before retrying.');
    await this.store.transact('steward.invite', (draft) => {
      if (draft.stewardUsers.some((item) => item.email === email && item.status !== 'deleted')) throw invalid('This steward is already invited.');
      draft.stewardUsers = draft.stewardUsers.filter((item) => item.email !== email);
      draft.stewardUsers.push({ id: id('staff'), email, subject, status: 'active', invitedAt: ISO(), invitedBy: actor.actorId });
      appendAudit(draft, actor, 'steward.invited', { requestId: actor.requestId, metadata: { email, subject } });
    });
    return { email, status: 'active' };
  }
  async changeStatus(emailInput, status, actor, reason) {
    if (!['active', 'disabled', 'deleted'].includes(status)) throw invalid('Unsupported steward state.');
    const email = String(emailInput ?? '').trim().toLowerCase();
    const state = await this.store.read(); const user = state.stewardUsers.find((item) => item.email === email && (item.status !== 'deleted' || status === 'deleted'));
    if (!user || email === actor.email || user.subject === this.config.stewardOwnerSub) throw forbidden('This steward cannot be changed.');
    if (status !== 'active') {
      // Revocation in the application is first, so existing access tokens stop working.
      await this.store.transact('steward.revoke', (draft) => { const target = draft.stewardUsers.find((item) => item.email === email && item.subject === user.subject); if (!target) throw forbidden(); target.status = status; target.disabledAt = ISO(); appendAudit(draft, actor, `steward.${status}`, { requestId: actor.requestId, reason, metadata: { email, subject: user.subject } }); });
    }
    if (this.config.appEnv !== 'local') {
      const { AdminDisableUserCommand, AdminEnableUserCommand, AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      const Command = status === 'deleted' ? AdminDeleteUserCommand : status === 'disabled' ? AdminDisableUserCommand : AdminEnableUserCommand;
      try { await (await this.#cognito()).send(new Command({ UserPoolId: this.config.stewardUserPoolId, Username: email })); }
      catch (error) { if (!(status === 'deleted' && error.name === 'UserNotFoundException')) throw error; }
    }
    if (status === 'active') await this.store.transact('steward.enable', (draft) => { const target = draft.stewardUsers.find((item) => item.email === email && item.subject === user.subject); if (!target || target.status === 'deleted') throw forbidden(); target.status = 'active'; target.disabledAt = null; appendAudit(draft, actor, 'steward.enabled', { requestId: actor.requestId, reason, metadata: { email, subject: user.subject } }); });
    return { email, status };
  }
  async #document() {
    if (this.auditClient) return this.auditClient;
    const [{ DynamoDBClient }, { DynamoDBDocumentClient }] = await Promise.all([import('@aws-sdk/client-dynamodb'), import('@aws-sdk/lib-dynamodb')]);
    this.auditClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.config.awsRegion }));
    return this.auditClient;
  }
  async begin(actor, req, path, search = '') {
    const entry = { actorId: actor.actorId, eventKey: `${ISO()}#${id('request')}`, requestId: actor.requestId || id('local'), email: actor.email || null, method: req.method, path, queryHash: search ? sha256(search) : null, ipHash: sha256(String(actor.ip || 'unknown')).slice(0, 24), userAgent: String(actor.userAgent || '').slice(0, 256), startedAt: ISO(), status: 'started' };
    if (!this.config.stewardAuditTableName) { await this.store.transact('steward.request.start', (state) => { state.stewardRequestEvents.push(entry); }); return entry; }
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    await (await this.#document()).send(new PutCommand({ TableName: this.config.stewardAuditTableName, Item: entry, ConditionExpression: 'attribute_not_exists(actorId)' }));
    return entry;
  }
  async complete(entry, statusCode, details = {}) {
    const updates = { status: statusCode < 400 ? 'completed' : 'denied_or_failed', statusCode, completedAt: ISO(), ...details };
    if (!this.config.stewardAuditTableName) { await this.store.transact('steward.request.complete', (state) => { const target = state.stewardRequestEvents.find((item) => item.eventKey === entry.eventKey && item.actorId === entry.actorId); if (target) Object.assign(target, updates); }); return; }
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await (await this.#document()).send(new UpdateCommand({ TableName: this.config.stewardAuditTableName, Key: { actorId: entry.actorId, eventKey: entry.eventKey }, UpdateExpression: 'SET #status = :status, statusCode = :code, completedAt = :at, details = :details', ConditionExpression: 'attribute_exists(actorId)', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': updates.status, ':code': statusCode, ':at': updates.completedAt, ':details': details } }));
  }
  async activity(actorId, limit = 100, before = null) {
    const size = Math.min(200, Math.max(1, Number(limit) || 100));
    if (before && !/^\d{4}-\d\d-\d\dT[\d:.]+Z#[\w-]+$/.test(before)) throw invalid('Invalid activity cursor.');
    if (!this.config.stewardAuditTableName) {
      const rows = (await this.store.read()).stewardRequestEvents.filter((item) => item.actorId === actorId && (!before || item.eventKey < before)).slice(-(size + 1)).reverse();
      return { events: await this.#withActionDetails(rows.slice(0, size)), nextBefore: rows.length > size ? rows[size - 1].eventKey : null };
    }
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const response = await (await this.#document()).send(new QueryCommand({ TableName: this.config.stewardAuditTableName, KeyConditionExpression: before ? 'actorId = :actor AND eventKey < :before' : 'actorId = :actor', ExpressionAttributeValues: before ? { ':actor': actorId, ':before': before } : { ':actor': actorId }, ScanIndexForward: false, Limit: size + 1, ConsistentRead: true }));
    const rows = response.Items ?? [];
    return { events: await this.#withActionDetails(rows.slice(0, size)), nextBefore: rows.length > size || response.LastEvaluatedKey ? rows[size - 1]?.eventKey ?? null : null };
  }
  async #withActionDetails(events) {
    const requestIds = new Set(events.map((item) => item.requestId));
    const actors = new Set(events.map((item) => item.actorId));
    const audit = (await this.store.read()).auditEvents.filter((item) => actors.has(item.actorId) && requestIds.has(item.requestId));
    return events.map((item) => ({ ...item, actions: audit.filter((action) => action.actorId === item.actorId && action.requestId === item.requestId).map((action) => ({ action: action.action, accountId: action.accountId, transactionId: action.transactionId, targetId: action.targetId, reason: action.reason, metadata: action.metadata })) }));
  }
  async #recent(actorId, after) {
    if (!this.config.stewardAuditTableName) return (await this.store.read()).stewardRequestEvents.filter((item) => item.actorId === actorId && item.eventKey >= after);
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb'); const rows = []; let cursor;
    do { const result = await (await this.#document()).send(new QueryCommand({ TableName: this.config.stewardAuditTableName, KeyConditionExpression: 'actorId = :actor AND eventKey >= :after', ExpressionAttributeValues: { ':actor': actorId, ':after': after }, ConsistentRead: true, ExclusiveStartKey: cursor })); rows.push(...(result.Items ?? [])); cursor = result.LastEvaluatedKey; } while (cursor);
    return rows;
  }
  async detect(entry, details = {}) {
    if (entry.statusCode >= 400 && !/^GET \/api\/steward\/accounts\/(lookup|search)$/.test(`${entry.method} ${entry.path}`)) return;
    const state = await this.store.read(); const limits = this.limits(state);
    const rules = [
      { type: 'account_search', pattern: /^GET \/api\/steward\/accounts\/(lookup|search)$/, count: limits.searchCount, minutes: limits.searchWindowMinutes },
      { type: 'account_closure', pattern: /^POST \/api\/steward\/accounts\/[^/]+\/close$/, count: limits.closureCount, minutes: limits.closureWindowMinutes },
      { type: 'refund_count', pattern: /^POST \/api\/steward\/transactions\/[^/]+\/refund$/, count: limits.refundCount, minutes: limits.refundWindowMinutes },
    ];
    const action = `${entry.method} ${entry.path}`;
    for (const rule of rules) {
      if (!rule.pattern.test(action)) continue;
      const after = new Date(Date.now() - rule.minutes * 60000).toISOString();
      const recent = await this.#recent(entry.actorId, after);
      const matching = recent.filter((item) => (item.status === 'completed' || rule.type === 'account_search' && item.statusCode === 404) && rule.pattern.test(`${item.method} ${item.path}`));
      const count = rule.type === 'account_closure' ? new Set(matching.map((item) => item.path)).size : matching.length;
      if (count > rule.count) await this.#alert(entry, rule.type, `${count} actions within ${rule.minutes} minutes (limit ${rule.count})`, rule.minutes);
    }
    if (action.match(/^POST \/api\/steward\/transactions\/[^/]+\/refund$/) && Number(details.amountMinor) > limits.singleRefundMinor) await this.#alert(entry, 'single_refund', `${details.amountMinor} ${details.currency || 'USD'} minor units (limit ${limits.singleRefundMinor})`, 60);
  }
  async #alert(entry, category, evidence, windowMinutes) {
    const bucket = Math.floor(Date.parse(entry.startedAt) / (windowMinutes * 60000));
    const now = ISO();
    const marker = { actorId: `ALERT#${entry.actorId}#${category}`, eventKey: String(bucket), requestId: entry.requestId, createdAt: now, category, evidence, deliveryState: 'attempted', deliveryUpdatedAt: now, attemptId: id('security_attempt'), attemptCount: 1, attemptStartedAt: now, providerId: null };
    if (this.config.stewardAuditTableName) {
      const { PutCommand, GetCommand, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
      try { await (await this.#document()).send(new PutCommand({ TableName: this.config.stewardAuditTableName, Item: marker, ConditionExpression: 'attribute_not_exists(actorId)' })); }
      catch (error) {
        if (error.name !== 'ConditionalCheckFailedException') throw error;
        const key = { actorId: marker.actorId, eventKey: marker.eventKey };
        const previous = (await (await this.#document()).send(new GetCommand({ TableName: this.config.stewardAuditTableName, Key: key, ConsistentRead: true }))).Item;
        if (!previous) return;
        const stale = securityAttemptIsStale(previous);
        if (!securityAttemptMayRetry(previous)) {
          // An interrupted final attempt may already have been accepted by
          // SES. Keep that uncertainty visible instead of labeling it failed.
          if (stale) {
            try { await (await this.#document()).send(new UpdateCommand({ TableName: this.config.stewardAuditTableName, Key: key, UpdateExpression: 'SET deliveryState = :ambiguous, deliveryUpdatedAt = :now', ConditionExpression: 'deliveryState = :previousState AND (attribute_not_exists(attemptId) OR attemptId = :previousAttempt)', ExpressionAttributeValues: { ':ambiguous': 'ambiguous', ':now': now, ':previousState': previous.deliveryState, ':previousAttempt': previous.attemptId ?? null } })); }
            catch (updateError) { if (updateError.name !== 'ConditionalCheckFailedException') throw updateError; }
          }
          return;
        }
        marker.attemptCount = Number(previous.attemptCount ?? 1) + 1;
        marker.ambiguousPreviousAttempt = stale || previous.deliveryState === 'ambiguous';
        try { await (await this.#document()).send(new UpdateCommand({ TableName: this.config.stewardAuditTableName, Key: key, UpdateExpression: 'SET deliveryState = :attempted, deliveryUpdatedAt = :now, attemptStartedAt = :now, attemptId = :attempt, attemptCount = :count, providerId = :empty, ambiguousPreviousAttempt = :ambiguousPrevious', ConditionExpression: 'deliveryState = :previousState AND (attribute_not_exists(attemptId) OR attemptId = :previousAttempt)', ExpressionAttributeValues: { ':attempted': 'attempted', ':now': now, ':attempt': marker.attemptId, ':count': marker.attemptCount, ':empty': null, ':ambiguousPrevious': marker.ambiguousPreviousAttempt, ':previousState': previous.deliveryState, ':previousAttempt': previous.attemptId ?? null } })); }
        catch (retryError) { if (retryError.name === 'ConditionalCheckFailedException') return; throw retryError; }
      }
    } else {
      const claimed = await this.store.transact('steward.alert.claim', (state) => {
        const previous = state.stewardAlertMarkers.find((item) => item.actorId === marker.actorId && item.eventKey === marker.eventKey);
        if (previous) {
          if (!securityAttemptMayRetry(previous)) { if (securityAttemptIsStale(previous)) { previous.deliveryState = 'ambiguous'; previous.deliveryUpdatedAt = now; } return false; }
          marker.attemptCount = Number(previous.attemptCount ?? 1) + 1;
          marker.ambiguousPreviousAttempt = securityAttemptIsStale(previous) || previous.deliveryState === 'ambiguous';
          Object.assign(previous, { deliveryState: marker.deliveryState, deliveryUpdatedAt: now, attemptStartedAt: now, attemptId: marker.attemptId, attemptCount: marker.attemptCount, providerId: null, ambiguousPreviousAttempt: marker.ambiguousPreviousAttempt });
          return true;
        }
        state.stewardAlertMarkers.push(marker); return true;
      });
      if (!claimed) return;
    }
    let outcome;
    try {
      const result = await this.notifier.sendStewardSecurityAlert(`[CLOVERSIGHT] Steward activity: ${category} [${bucket}]`, `Actor: ${entry.actorId}\nEmail: ${entry.email}\nCategory: ${category}\nEvidence: ${evidence}\nRequest ID: ${entry.requestId}\nTime: ${ISO()}`, { notificationId: `security_${entry.actorId}_${category}_${bucket}` });
      const deliveryState = result?.suppressed ? 'suppressed' : result?.failed || result?.skipped ? (result.deliveryState === 'ambiguous' ? 'ambiguous' : 'failed') : result?.providerId ? (result.deliveryState === 'local_queued' ? 'local_queued' : 'accepted') : 'ambiguous';
      outcome = { deliveryState, providerId: result?.providerId ?? null, suppressionSource: result?.suppressionSource ?? null, deliveryError: null };
      if (['failed', 'suppressed', 'ambiguous'].includes(deliveryState)) this.logger.error('steward.security_alert.failed', { requestId: entry.requestId, category, deliveryState, suppressionSource: outcome.suppressionSource });
    }
    catch (error) { outcome = { deliveryState: error.deliveryState === 'ambiguous' ? 'ambiguous' : 'failed', providerId: null, suppressionSource: null, deliveryError: String(error.name || 'EmailSendFailed').slice(0, 100) }; this.logger.error('steward.security_alert.failed', { requestId: entry.requestId, category, deliveryState: outcome.deliveryState, message: error.message }); }
    if (this.config.stewardAuditTableName) {
      const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
      try { await (await this.#document()).send(new UpdateCommand({ TableName: this.config.stewardAuditTableName, Key: { actorId: marker.actorId, eventKey: marker.eventKey }, UpdateExpression: 'SET deliveryState = :state, deliveryUpdatedAt = :at, providerId = :provider, suppressionSource = :source, deliveryError = :error', ConditionExpression: 'attemptId = :attempt AND deliveryState = :attempted', ExpressionAttributeValues: { ':state': outcome.deliveryState, ':at': ISO(), ':provider': outcome.providerId, ':source': outcome.suppressionSource, ':error': outcome.deliveryError, ':attempt': marker.attemptId, ':attempted': 'attempted' } })); }
      catch (error) { if (error.name !== 'ConditionalCheckFailedException') throw error; this.logger.warn('steward.security_alert.superseded_attempt', { requestId: entry.requestId, category, attemptId: marker.attemptId }); }
    } else await this.store.transact('steward.alert.delivery', (state) => { const target = state.stewardAlertMarkers.find((item) => item.actorId === marker.actorId && item.eventKey === marker.eventKey); if (target?.attemptId === marker.attemptId && target.deliveryState === 'attempted') Object.assign(target, outcome, { deliveryUpdatedAt: ISO() }); });
  }
}

function securityAttemptIsStale(marker) {
  return ['pending', 'attempted'].includes(marker.deliveryState) && String(marker.attemptStartedAt ?? marker.deliveryUpdatedAt ?? marker.createdAt) < new Date(Date.now() - 120000).toISOString();
}

function securityAttemptMayRetry(marker) {
  return Number(marker.attemptCount ?? 1) < 2 && (['failed', 'ambiguous'].includes(marker.deliveryState) || securityAttemptIsStale(marker));
}
