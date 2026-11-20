import { ensureWatcherUsage, watcherUsage, updateWatcherUsage, captureNotBefore, releaseFundedCaptureHold } from '../domain/usage-guards.mjs';
import { scheduleAfterEdit } from '../monitoring/schedule.mjs';
import { id, ISO, addSeconds, parseCsvPhrases } from '../lib.mjs';
import { defaultWatcher } from '../domain/defaults.mjs';
import { validateWatcherForPlan } from '../domain/plans.mjs';
import { assertSafeTarget } from '../security/ssrf.mjs';
import { appendAudit } from './audit.mjs';
import { normalizeCheckRegions } from '../domain/regions.mjs';

const SUPPORTED_METHODS = new Set(['outage', 'banned_phrase', 'text_change', 'pixel_change']);
const MAX_RECIPIENTS = 100;
const WATCHER_EDIT_PREFIXES = Object.freeze(['WATCHERS#', 'TEAMMEMBERS#', 'ALERTS#']);

function clone(value) { return value == null ? value : structuredClone(value); }

function normalizeRecipientTiers(tiers) {
  if (!Array.isArray(tiers)) return [];
  if (tiers.length > 10) throw Object.assign(new Error('No more than 10 recipient tiers are allowed.'), { statusCode: 400 });
  return tiers.map((tier) => ({
    id: tier?.id == null ? '' : String(tier.id), name: String(tier?.name ?? ''),
    delayMinutes: tier?.delayMinutes, requiredAcknowledgements: tier?.requiredAcknowledgements,
    recipients: (Array.isArray(tier?.recipients) ? tier.recipients : []).map((recipient) => ({
      id: recipient?.id == null ? '' : String(recipient.id), name: String(recipient?.name ?? ''),
      channel: String(recipient?.channel ?? ''), destination: String(recipient?.destination ?? ''),
      userId: recipient?.userId ? String(recipient.userId) : null, enabled: recipient?.enabled !== false,
    })),
  }));
}

function normalizeConfig(base, incoming = {}, availableCheckRegions = []) {
  const source = { ...base, ...incoming };
  return {
    url: typeof source.url === 'string' ? source.url.trim() : '',
    checkRegions: normalizeCheckRegions(source.checkRegions, availableCheckRegions),
    checkIntervalSeconds: Number(source.checkIntervalSeconds),
    methods: Array.isArray(source.methods) ? [...new Set(source.methods.map(String))] : [],
    bannedPhrases: Array.isArray(source.bannedPhrases) ? source.bannedPhrases.map((item) => String(item).trim()).filter(Boolean) : [],
    textThresholdPercent: Number(source.textThresholdPercent),
    pixelThresholdPercent: Number(source.pixelThresholdPercent),
    ignoredSelectors: Array.isArray(source.ignoredSelectors) ? source.ignoredSelectors.map((item) => String(item).trim()).filter(Boolean) : [],
    // Custom request headers are intentionally not accepted in the initial release. They can contain credentials and require a separate encrypted-secret design.
    requestHeaders: {},
    timeoutMs: Number(source.timeoutMs),
    recipientTiers: normalizeRecipientTiers(source.recipientTiers),
    allClearThreshold: Number(source.allClearThreshold),
    alertReceivedThreshold: Number(source.alertReceivedThreshold),
    reAlertMinutes: Number(source.reAlertMinutes),
    templates: {
      subject: String(source.templates?.subject ?? ''),
      text: String(source.templates?.text ?? ''),
      sms: String(source.templates?.sms ?? ''),
    },
  };
}

function validateConfig(config, incoming = {}, capabilities = {}) {
  const errors = [];
  const smsEnabled = capabilities.sms !== false;
  if (!config.url) errors.push('URL is required.');
  if (config.url.length > 2048) errors.push('URL must not exceed 2,048 characters.');
  try { const parsed = new URL(config.url); if (!['http:', 'https:'].includes(parsed.protocol)) errors.push('URL must use HTTP or HTTPS.'); } catch { errors.push('URL must be valid.'); }
  if (!Array.isArray(config.methods) || !config.methods.length) errors.push('At least one detection method is required.');
  for (const method of config.methods ?? []) if (!SUPPORTED_METHODS.has(method)) errors.push(`Unsupported detection method: ${method}.`);
  if (!Number.isInteger(config.checkIntervalSeconds) || config.checkIntervalSeconds < 120 || config.checkIntervalSeconds > 31_536_000) errors.push('Check interval must be between 2 minutes and 365 days.');
  if (!Number.isFinite(config.textThresholdPercent) || config.textThresholdPercent < 0 || config.textThresholdPercent > 100) errors.push('Text threshold must be between 0 and 100.');
  if (!Number.isFinite(config.pixelThresholdPercent) || config.pixelThresholdPercent < 0 || config.pixelThresholdPercent > 100) errors.push('Pixel threshold must be between 0 and 100.');
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 3000 || config.timeoutMs > 120000) errors.push('Timeout must be between 3 and 120 seconds.');
  if (incoming?.requestHeaders && Object.keys(incoming.requestHeaders).length) errors.push('Custom request headers are not supported in this release.');

  if (config.bannedPhrases.length > 1000) errors.push('No more than 1,000 banned phrases are allowed.');
  if (config.bannedPhrases.some((phrase) => phrase.length > 500)) errors.push('Banned phrases must not exceed 500 characters each.');
  if (config.bannedPhrases.reduce((sum, phrase) => sum + phrase.length, 0) > 100_000) errors.push('Banned phrases exceed the 100,000-character limit.');

  if (config.ignoredSelectors.length > 100) errors.push('No more than 100 ignored DOM selectors are allowed.');
  for (const selector of config.ignoredSelectors) if (selector.length > 500) errors.push('Ignored selectors must not exceed 500 characters.');

  if (!Array.isArray(config.recipientTiers) || !config.recipientTiers.length) errors.push('At least one recipient tier is required.');
  if (config.recipientTiers.length > 10) errors.push('No more than 10 recipient tiers are allowed.');
  const recipientIds = new Set();
  const tierIds = new Set();
  let recipientCount = 0;
  for (const tier of config.recipientTiers) {
    const tierName = String(tier?.name ?? 'unnamed').slice(0, 80);
    if (!tier?.id || tierIds.has(tier.id)) errors.push('Recipient tier IDs must be present and unique.'); else tierIds.add(tier.id);
    if (String(tier?.id ?? '').length > 128) errors.push('Recipient tier IDs must not exceed 128 characters.');
    if (String(tier?.name ?? '').length > 80) errors.push('Recipient tier names must not exceed 80 characters.');
    const recipients = Array.isArray(tier?.recipients) ? tier.recipients : [];
    recipientCount += recipients.length;
    if (recipients.length > 50) errors.push(`Tier ${tierName} has more than 50 recipients.`);
    if (!Number.isInteger(tier?.delayMinutes) || tier.delayMinutes < 1 || tier.delayMinutes > 10080) errors.push(`Tier ${tierName} delay must be between 1 minute and 7 days.`);
    const enabledCount = recipients.filter((item) => item?.enabled !== false).length;
    if (!Number.isInteger(tier?.requiredAcknowledgements) || tier.requiredAcknowledgements < 1 || tier.requiredAcknowledgements > enabledCount) errors.push(`Tier ${tierName} has an impossible acknowledgement threshold.`);
    for (const recipient of recipients) {
      if (!recipient?.id || recipientIds.has(recipient.id)) errors.push('Recipient IDs must be present and unique across tiers.'); else recipientIds.add(recipient.id);
      if (String(recipient?.id ?? '').length > 128 || String(recipient?.userId ?? '').length > 180) errors.push('Recipient identifiers exceed the supported length.');
      if (String(recipient?.name ?? '').length > 120) errors.push('Recipient names must not exceed 120 characters.');
      if (!['email', 'sms'].includes(recipient?.channel)) errors.push('Recipient channel must be email or SMS.');
      if (!recipient?.destination) errors.push('Recipient destination is required.');
      else if (recipient.channel === 'email' && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient.destination) || recipient.destination.length > 320)) errors.push(`Recipient ${recipient.name || recipient.id} needs a valid email address.`);
      else if (recipient.channel === 'sms' && !/^\+[1-9]\d{7,14}$/.test(recipient.destination)) errors.push(`Recipient ${recipient.name || recipient.id} needs an E.164 phone number.`);
    }
  }
  if (recipientCount > MAX_RECIPIENTS) errors.push(`No more than ${MAX_RECIPIENTS} recipients are allowed per watcher.`);
  const enabledRecipients = config.recipientTiers.flatMap((tier) => tier.recipients ?? []).filter((recipient) => recipient?.enabled !== false).length;
  if (!Number.isInteger(config.allClearThreshold) || config.allClearThreshold < 1 || config.allClearThreshold > enabledRecipients) errors.push('All-clear consensus must be reachable by enabled recipients.');
  if (!Number.isInteger(config.alertReceivedThreshold) || config.alertReceivedThreshold < 1 || config.alertReceivedThreshold > enabledRecipients) errors.push('Alert-received consensus must be reachable by enabled recipients.');
  if (!Number.isInteger(config.reAlertMinutes) || config.reAlertMinutes < 1 || config.reAlertMinutes > 10080) errors.push('Re-alert interval must be between 1 minute and 7 days.');

  if (!config.templates.subject.trim() || config.templates.subject.length > 200) errors.push('Email subject template is required and must not exceed 200 characters.');
  if (!config.templates.text.trim() || config.templates.text.length > 10_000) errors.push('Email text template is required and must not exceed 10,000 characters.');
  const hasSms = config.recipientTiers.some((tier) => (tier.recipients ?? []).some((recipient) => recipient?.channel === 'sms'));
  if (hasSms && !smsEnabled) errors.push('SMS notifications are not available for this deployment. Replace SMS recipients with email recipients.');
  if (smsEnabled && (!config.templates.sms.trim() || config.templates.sms.length > 1_600)) errors.push('SMS template is required and must not exceed 1,600 characters.');
  const hasEnabledSms = config.recipientTiers.some((tier) => (tier.recipients ?? []).some((recipient) => recipient?.enabled !== false && recipient.channel === 'sms'));
  if (smsEnabled && hasEnabledSms && !config.templates.sms.includes('{{responseCode}}')) errors.push('SMS templates must include {{responseCode}} so inbound replies can be matched safely.');
  return [...new Set(errors)];
}

export class WatcherService {
  constructor({ store, config, assets = null }) { Object.assign(this, { store, config, assets }); }
  async createDraft(accountId) {
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: [] }) : await this.store.read(); const account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
    if (account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
    // This endpoint returns an unsaved template. A generated ID makes the
    // customer client issue PUT and causes save() to treat the template as a
    // missing persisted watcher. Keep identity absent until the POST commits.
    const draft = defaultWatcher(accountId, account.contactEmail);
    draft.id = null;
    draft.configRevision = 0;
    return draft;
  }
  async save(accountId, input, actor, options = {}) {
    await ensureWatcherUsage(this.store, accountId);
    const before = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: WATCHER_EDIT_PREFIXES, directEntities: input.id ? [{ collection: 'watchers', id: input.id }] : [] }) : await this.store.read();
    const account = before.accounts.find((item) => item.id === accountId);
    if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
    const existing = input.id ? before.watchers.find((item) => item.id === input.id && item.accountId === accountId && item.status !== 'deleted') : null;
    if (input.id && !existing) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
    const baseConfig = existing?.config ?? defaultWatcher(accountId, account.contactEmail).config;
    const config = normalizeConfig(baseConfig, input.config, this.config.availableCheckRegions ?? [this.config.awsRegion ?? 'us-east-1']);
    bindTeamRecipients(config, before, accountId);
    const smsEnabled = this.config.smsEnabled !== false && this.config.smsProvider !== 'disabled';
    const errors = validateConfig(config, input.config, { sms: smsEnabled });
    const preliminary = validateWatcherForPlan(config, account, watcherUsage(before, account).total, !existing, new Date(), watcherUsage(before, account).regional, Boolean(existing?.config?.checkRegions?.length));
    errors.push(...preliminary.errors);
    if (options.publish) await assertSafeTarget(config.url, this.config.allowPrivateTargets);
    if (errors.length) throw Object.assign(new Error([...new Set(errors)].join(' ')), { statusCode: 400, details: [...new Set(errors)] });

    return this.#transact(accountId, 'watcher.save', (draft) => {
      const liveAccount = draft.accounts.find((item) => item.id === accountId);
      if (!liveAccount || liveAccount.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      let watcher = input.id ? draft.watchers.find((item) => item.id === input.id && item.accountId === accountId && item.status !== 'deleted') : null;
      // An edit is never a create: a concurrent delete must not let a stale
      // draft resurrect the same watcher ID during a transaction retry.
      if (input.id && !watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      if (watcher && Number(input.configRevision ?? 0) !== Number(watcher.configRevision ?? 1)) {
        throw Object.assign(new Error('This watcher changed in another tab or session. Your local draft was preserved; reload before publishing.'), { statusCode: 409, code: 'WATCHER_VERSION_CONFLICT', details: { currentRevision: watcher.configRevision ?? 1 } });
      }
      // Membership can change between the preliminary read and this commit.
      // Recheck every team recipient against the same tenant state being saved.
      bindTeamRecipients(config, draft, accountId);
      const livePlan = validateWatcherForPlan(config, liveAccount, watcherUsage(draft, liveAccount).total, !watcher, new Date(), watcherUsage(draft, liveAccount).regional, Boolean(watcher?.config?.checkRegions?.length));
      if (livePlan.errors.length) throw Object.assign(new Error(livePlan.errors.join(' ')), { statusCode: 400, details: livePlan.errors });
      const now = ISO();
      const previousNotificationPolicy = watcher ? notificationPolicyFor(watcher) : null;
      const auditBefore = watcher ? clone(watcher) : null;
      if (!watcher) { watcher = defaultWatcher(accountId, liveAccount.contactEmail); watcher.id = input.id || id('watch'); watcher.configRevision = 1; draft.watchers.push(watcher); }
      else watcher.configRevision = Number(watcher.configRevision ?? 1) + 1;
      watcher.name = String(input.name ?? watcher.name).trim().slice(0, 120) || 'Untitled watcher';
      watcher.config = config;
      watcher.status = options.publish ? (watcher.status === 'paused' ? 'paused' : 'active') : 'draft';
      if (options.publish) releaseFundedCaptureHold(watcher, liveAccount);
      watcher.nextCheckAt = options.publish ? scheduleAfterEdit(watcher, now, captureNotBefore(watcher, liveAccount)) : watcher.nextCheckAt;
      updateWatcherUsage(liveAccount, auditBefore, watcher);
      watcher.updatedAt = now;
      const nextNotificationPolicy = notificationPolicyFor(watcher);
      if (previousNotificationPolicy && JSON.stringify(previousNotificationPolicy) !== JSON.stringify(nextNotificationPolicy)) {
        for (const alert of draft.alerts.filter((item) => item.watcherId === watcher.id && ['open', 'acknowledged'].includes(item.status))) {
          // Apply the new policy without rewinding the active incident. The
          // maintenance pass preserves the highest durably activated tier and
          // repairs its next deadline; it never re-sends level one merely
          // because recipients, templates, or consensus settings changed.
          alert.notificationPolicy = clone(nextNotificationPolicy);
          alert.nextEscalationAt = null;
          alert.nextReAlertAt = null;
          alert.notificationPolicyRefreshPending = true;
          alert.updatedAt = now;
        }
      }
      appendAudit(draft, actor, options.auditAction ?? (auditBefore ? (options.publish ? 'watcher.updated' : 'watcher.draft_saved') : 'watcher.created'), { accountId, targetId: watcher.id, requestId: actor.requestId, reason: actor.reason, metadata: { configRevision: watcher.configRevision, before: auditBefore, afterSummary: watcherAuditSummary(watcher) } });
      return watcher;
    }, WATCHER_EDIT_PREFIXES, input.id ? [{ collection: 'watchers', id: input.id }] : []);
  }

  async setStatus(accountId, watcherId, status, actor) {
    await ensureWatcherUsage(this.store, accountId);
    if (!['active', 'paused'].includes(status)) throw Object.assign(new Error('Invalid watcher status.'), { statusCode: 400 });
    return this.#transact(accountId, 'watcher.status', (state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      const watcher = state.watchers.find((item) => item.id === watcherId && item.accountId === accountId);
      if (!watcher || watcher.status === 'deleted') throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      if (status === 'active') {
        if (!['paused', 'active'].includes(watcher.status)) throw Object.assign(new Error('Publish a draft through the watcher editor before activating it.'), { statusCode: 409 });
        const watchers = state.watchers.filter((item) => item.accountId === accountId && item.status !== 'deleted');
        const regionalCount = watchers.filter((item) => item.config?.checkRegions?.length).length;
        const { access, errors } = validateWatcherForPlan(watcher.config, account, watchers.length, false, new Date(), regionalCount, Boolean(watcher.config?.checkRegions?.length));
        const quota = watcherUsage(state, account);
        if (quota.total > access.maxWatchers || quota.regional > access.maxRegionalWatchers) errors.push('Reduce the saved watcher count or regional watcher count to the current plan limits before activating.');
        const activeCount = watchers.filter((item) => ['active', 'checking'].includes(item.status)).length;
        if (watcher.status !== 'active' && activeCount >= access.maxWatchers) errors.push(`This plan supports ${access.maxWatchers} active watcher(s).`);
        if (errors.length) throw Object.assign(new Error(errors.join(' ')), { statusCode: 400, details: errors });
      }
      const now = ISO();
      const auditBefore = clone(watcher);
      watcher.status = status;
      watcher.configRevision = Number(watcher.configRevision ?? 1) + 1;
      watcher.updatedAt = now;
      if (status === 'paused') {
        watcher.leaseOwner = null;
        watcher.leaseExpiresAt = null;
        for (const alert of state.alerts.filter((item) => item.watcherId === watcherId && ['open', 'acknowledged'].includes(item.status))) {
          if (!alert.notificationsPausedAt) {
            alert.remainingEscalationSecondsBeforeWatcherPause = remainingSeconds(alert.nextEscalationAt, now);
            alert.remainingReAlertSecondsBeforeWatcherPause = remainingSeconds(alert.nextReAlertAt, now);
            // Advance the round once so queued claims and provider retries from
            // before the pause can never become deliverable after a quick resume.
            alert.notificationRound = Number(alert.notificationRound ?? 0) + 1;
          }
          alert.notificationsPausedAt = now;
          alert.nextEscalationAt = null;
          alert.nextReAlertAt = null;
          alert.notificationDispatch = null;
          alert.notificationDelivery = null;
          alert.newlyOpened = false;
          alert.sendAgain = false;
          alert.responses = [];
          alert.updatedAt = now;
        }
      } else {
        releaseFundedCaptureHold(watcher, account);
        watcher.nextCheckAt = scheduleAfterEdit(watcher, now, captureNotBefore(watcher, account));
        for (const alert of state.alerts.filter((item) => item.watcherId === watcherId && item.notificationsPausedAt)) {
          if (!alert.recoveryDetectedAt) {
            alert.nextEscalationAt = restoreTimer(now, alert.remainingEscalationSecondsBeforeWatcherPause);
            alert.nextReAlertAt = restoreTimer(now, alert.remainingReAlertSecondsBeforeWatcherPause);
          }
          alert.notificationsPausedAt = null;
          alert.remainingEscalationSecondsBeforeWatcherPause = null;
          alert.remainingReAlertSecondsBeforeWatcherPause = null;
          alert.updatedAt = now;
        }
      }
      appendAudit(state, actor, `watcher.${status}`, { accountId, targetId: watcherId, requestId: actor.requestId, reason: actor.reason, metadata: { before: auditBefore, afterSummary: watcherAuditSummary(watcher) } });
      return watcher;
    }, ['WATCHERS#', 'ALERTS#'], [{ collection: 'watchers', id: watcherId }]);
  }
  async remove(accountId, watcherId, actor) {
    await ensureWatcherUsage(this.store, accountId);
    if (actor.teamRole && actor.teamRole !== 'owner' && actor.role !== 'steward') throw Object.assign(new Error('Only the account owner can delete watchers.'), { statusCode: 403, code: 'OWNER_REQUIRED' });
    return this.#transact(accountId, 'watcher.delete', (state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      const watcher = state.watchers.find((item) => item.id === watcherId && item.accountId === accountId && item.status !== 'deleted');
      if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      const auditBefore = clone(watcher); const now = ISO();
      watcher.previousStatusBeforeDelete = watcher.status; watcher.status = 'deleted'; watcher.deletedAt = now; watcher.deletedBy = actor.actorId; watcher.nextCheckAt = null; watcher.leaseOwner = null; watcher.leaseExpiresAt = null; watcher.configRevision = Number(watcher.configRevision ?? 1) + 1; watcher.updatedAt = now;
      for (const alert of state.alerts.filter((item) => item.watcherId === watcherId && ['open', 'acknowledged', 'resolving'].includes(item.status))) {
        alert.status = 'closed_by_watcher_delete'; alert.resolvedAt = now; alert.nextEscalationAt = null; alert.nextReAlertAt = null; alert.updatedAt = now;
        if (alert.notificationDispatch?.status === 'sending') { alert.notificationDispatch.status = 'canceled'; alert.notificationDispatch.canceledAt = now; }
      }
      for (const notice of state.notifications.filter((item) => item.watcherId === watcherId && ['sending', 'retry_scheduled'].includes(item.status))) {
        notice.status = 'canceled'; notice.retryAt = null; notice.updatedAt = now; notice.error = 'Canceled because the watcher was deleted.';
      }
      updateWatcherUsage(account, auditBefore, watcher);
      appendAudit(state, actor, 'watcher.deleted', { accountId, targetId: watcherId, requestId: actor.requestId, reason: actor.reason, metadata: { before: auditBefore, afterSummary: watcherAuditSummary(watcher) } });
      return { deleted: true, accountId, watcherId };
    }, ['WATCHERS#', 'ALERTS#', 'NOTIFICATIONS#'], [{ collection: 'watchers', id: watcherId }]);
  }
  async #transact(accountId, label, mutate, lookupPrefixes, directEntities = []) {
    if (typeof this.store.transactAccount === 'function') return this.store.transactAccount(accountId, label, mutate, { lookupPrefixes, directEntities });
    return this.store.transact(label, mutate);
  }
  parsePhrases(csv) { return parseCsvPhrases(csv); }
}

function bindTeamRecipients(config, state, accountId) {
  for (const recipient of config.recipientTiers.flatMap((tier) => tier.recipients ?? [])) {
    if (!recipient.userId && recipient.channel === 'email') {
      const exactMember = state.teamMembers.find((item) => item.accountId === accountId && item.status === 'active' && item.email.toLowerCase() === String(recipient.destination ?? '').trim().toLowerCase());
      if (exactMember) recipient.userId = exactMember.userId;
    }
    if (!recipient.userId) continue;
    const member = state.teamMembers.find((item) => item.accountId === accountId && item.userId === recipient.userId && item.status === 'active');
    if (!member) throw Object.assign(new Error('A selected team recipient is no longer available.'), { statusCode: 400 });
    const profile = state.userProfiles.find((item) => item.id === member.userId);
    recipient.channel = 'email'; recipient.destination = member.email;
    recipient.name = `${profile?.firstName || member.firstName || member.email.split('@')[0]} ${profile?.lastName || member.lastName || ''}`.trim().slice(0, 120);
  }
}

function watcherAuditSummary(watcher) { return { name: watcher.name, status: watcher.status, configRevision: watcher.configRevision, updatedAt: watcher.updatedAt, checkRegions: [...(watcher.config?.checkRegions ?? [])] }; }

function remainingSeconds(target, now) {
  if (!target) return null;
  const seconds = Math.ceil((Date.parse(target) - Date.parse(now)) / 1000);
  return Number.isFinite(seconds) ? Math.max(60, seconds) : null;
}

function restoreTimer(now, seconds) {
  return Number.isFinite(seconds) ? addSeconds(now, Math.max(60, seconds)) : null;
}

function notificationPolicyFor(watcher) {
  return {
    recipientTiers: clone(watcher.config.recipientTiers ?? []),
    allClearThreshold: watcher.config.allClearThreshold,
    alertReceivedThreshold: watcher.config.alertReceivedThreshold,
    reAlertMinutes: watcher.config.reAlertMinutes,
    templates: clone(watcher.config.templates ?? {}),
    watcher: { name: watcher.name, url: watcher.config.url },
  };
}
