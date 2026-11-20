import { reserveDeliveryBudget, notificationPolicyFits } from './budgets.mjs';
import { boundedSms } from './sms.mjs';
/** @module notifications/service
 * @description Incident escalation, recipient delivery and response consensus.
 */
import { randomBytes } from 'node:crypto';
import { id, ISO, addSeconds, interpolate } from '../lib.mjs';
import { appendAudit } from '../services/audit.mjs';
import { createResponseToken } from './token.mjs';
import { extractResponseCode, normalizeEmail, parseReplyIntent } from './replies.mjs';
import { renderAlertEmail } from './alert-email.mjs';
import { incidentEmailSubject, notificationIncidentDetails } from './incident-summary.mjs';
import { customerWatcherCheckStatus } from '../monitoring/check-status.mjs';
import { entitlements } from '../domain/plans.mjs';

const DELIVERY_RETRY_DELAY_SECONDS = 300;
const STALE_DELIVERY_CLAIM_SECONDS = 300;
const TIER_SEND_CONCURRENCY = 4;
const EMAIL_UNSUBSCRIBE_LIFETIME_SECONDS = 365 * 86400;
const NOTIFICATION_RUNTIME_REVISION = '0.5.12';
// One reservation per provider attempt, including the single delivery retry.
// Product ceilings live in plans.mjs and are shown before checkout.

export class NotificationService {
  constructor({ store, providers, config, logger }) { Object.assign(this, { store, providers, config, logger }); this.onAllClear = null; }
  setAllClearHandler(handler) { this.onAllClear = handler; }

  async sendTeamInvitation(email, teamName) {
    const portal = `${String(this.config.responseBaseUrl).replace(/\/$/, '')}/app/?action=login`;
    return this.#sendDirectEmail({
      to: email,
      subject: `${teamName} invited you to CLOVERSIGHT`,
      text: `${teamName} invited you to collaborate on its CLOVERSIGHT monitoring account. Sign in with this email address to accept the invitation: ${portal}\n\nThe invitation expires in 14 days.`,
      html: `<p><strong>${escapeHtml(teamName)}</strong> invited you to collaborate on its CLOVERSIGHT monitoring account.</p><p><a href="${escapeHtml(portal)}">Sign in with this email address to accept the invitation</a>.</p><p>The invitation expires in 14 days.</p>`,
      notificationId: `team_invite_${Date.now()}`,
    });
  }

  async listEmailSuppressions(query = '') {
    const normalizedQuery = String(query ?? '').trim().toLowerCase();
    const state = await this.store.read();
    return (state.emailSuppressions ?? [])
      .filter((item) => !normalizedQuery || item.email.includes(normalizedQuery))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((item) => ({ ...item }));
  }

  async addEmailSuppression(email, reason, actor, source = 'steward') {
    requireSuppressionOwner(actor);
    const normalized = validateEmailAddress(email);
    return this.store.transact('email.suppression.add', (state) => {
      state.emailSuppressions ??= [];
      const existing = findEmailSuppression(state, normalized);
      if (existing) return { ...existing, alreadyBlocked: true };
      const now = ISO();
      const suppression = { id: id('email_block'), email: normalized, scope: 'customer', source, reason: String(reason || '').trim().slice(0, 1000), createdAt: now, createdBy: actor.actorId, updatedAt: now };
      state.emailSuppressions.push(suppression);
      suppressPendingEmailDeliveries(state, normalized, now);
      appendAudit(state, actor, 'email.suppression_added', { targetId: suppression.id, reason: suppression.reason, requestId: actor.requestId, metadata: { source } });
      return suppression;
    });
  }

  async removeEmailSuppression(suppressionId, reason, actor) {
    requireSuppressionOwner(actor);
    return this.store.transact('email.suppression.remove', (state) => {
      state.emailSuppressions ??= [];
      const index = state.emailSuppressions.findIndex((item) => item.id === suppressionId);
      if (index < 0) throw Object.assign(new Error('Blocked email address not found.'), { statusCode: 404 });
      if (isProviderEmailSuppression(state.emailSuppressions[index])) throw Object.assign(new Error('Provider bounce or complaint restrictions must be resolved with the email provider.'), { statusCode: 409 });
      const [removed] = state.emailSuppressions.splice(index, 1);
      appendAudit(state, actor, 'email.suppression_removed', { targetId: removed.id, reason, requestId: actor.requestId, metadata: { source: removed.source } });
      return { id: removed.id, removed: true };
    });
  }

  async recordEmailUnsubscribe(tokenData) {
    if (tokenData?.purpose !== 'email_unsubscribe' || !tokenData.linkId) throw Object.assign(new Error('Invalid unsubscribe link.'), { statusCode: 400 });
    return this.store.transact('email.unsubscribe.record', (state) => {
      state.emailSuppressions ??= [];
      state.emailUnsubscribeLinks ??= [];
      const link = state.emailUnsubscribeLinks.find((item) => item.id === tokenData.linkId);
      if (!link || link.expiresAt < ISO()) throw Object.assign(new Error('This unsubscribe link is no longer available.'), { statusCode: 400 });
      const existing = findEmailSuppression(state, link.email);
      const now = ISO();
      link.usedAt ??= now;
      if (existing) return { status: 'already_unsubscribed', suppressionId: existing.id };
      const actor = { actorId: `recipient:${link.id}`, role: 'recipient', requestId: null };
      const suppression = { id: id('email_block'), email: link.email, scope: 'customer', source: 'recipient_link', reason: 'Recipient requested that CLOVERSIGHT stop sending customer alert and invitation email to this address.', createdAt: now, createdBy: actor.actorId, updatedAt: now };
      state.emailSuppressions.push(suppression);
      suppressPendingEmailDeliveries(state, link.email, now);
      appendAudit(state, actor, 'email.suppression_added', { targetId: suppression.id, reason: suppression.reason, metadata: { source: suppression.source, notificationId: link.notificationId } });
      return { status: 'unsubscribed', suppressionId: suppression.id };
    });
  }

  async getActivity(accountId, watcherId) {
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, {
      lookupPrefixes: ['WATCHERS#', 'JOBS#', 'ALERTS#', 'NOTIFICATIONS#', 'TEAMMEMBERS#'], followWatcherReferences: true,
    }) : await this.store.read();
    const watcher = state.watchers.find((item) => item.id === watcherId && item.accountId === accountId && item.status !== 'deleted');
    if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
    const alert = activeNotificationAlert(state, watcher);
    return notificationActivityView(state, watcher, alert, this.config);
  }

  async replaceTierRecipients(accountId, watcherId, tierId, inputRecipients, expectedRevision, actor) {
    const recipients = normalizeIncidentRecipients(inputRecipients, this.config);
    await this.store.transact('alert.notification_recipients.replace', (state) => {
      const { watcher, alert } = requireActiveNotificationAlert(state, accountId, watcherId);
      const basePolicy = basePolicyFor(alert, watcher);
      const tierIndex = basePolicy.recipientTiers.findIndex((item) => item.id === tierId);
      if (tierIndex < 0) throw Object.assign(new Error('Escalation level not found.'), { statusCode: 404 });
      if (tierWasActivated(state, alert, tierIndex)) throw Object.assign(new Error('Recipients cannot be changed after this escalation level has started. Changes to later queued levels are still available.'), { statusCode: 409, code: 'NOTIFICATION_TIER_ALREADY_ACTIVE' });
      if (recipients.filter(recipientIsEnabled).length < Number(basePolicy.recipientTiers[tierIndex].requiredAcknowledgements ?? 1)) {
        throw Object.assign(new Error('This level needs enough enabled recipients to satisfy its acknowledgement threshold.'), { statusCode: 400 });
      }
      const control = claimNotificationControl(alert, expectedRevision);
      control.recipientOverrides ??= {};
      control.recipientOverrides[tierId] = recipients;
      control.updatedAt = ISO();
      control.updatedBy = actor.actorId;
      control.revision += 1;
      const effectivePolicy = policyFor(alert, watcher);
      if (!notificationPolicyFits(effectivePolicy, state.accounts.find((item) => item.id === accountId))) throw Object.assign(new Error('Temporary recipients exceed the current plan limits.'), { statusCode: 400, code: 'NOTIFICATION_PLAN_LIMIT' });
      const recipientIds = effectivePolicy.recipientTiers.flatMap((tier) => tier.recipients).map((recipient) => recipient.id);
      if (new Set(recipientIds).size !== recipientIds.length) throw Object.assign(new Error('Recipient identifiers must remain unique across this incident.'), { statusCode: 400 });
      const enabledCount = effectivePolicy.recipientTiers.flatMap((tier) => tier.recipients).filter(recipientIsEnabled).length;
      if (enabledCount < effectivePolicy.allClearThreshold || enabledCount < effectivePolicy.alertReceivedThreshold) {
        throw Object.assign(new Error('The temporary recipient list would make the alert response threshold impossible to reach.'), { statusCode: 400 });
      }
      alert.updatedAt = control.updatedAt;
      appendAudit(state, actor, 'alert.notification_recipients_replaced', { accountId, targetId: alert.id, requestId: actor.requestId, metadata: { watcherId, tierId, tierIndex, recipientCount: recipients.length, controlRevision: control.revision } });
      return null;
    });
    return this.getActivity(accountId, watcherId);
  }

  async setTierMuted(accountId, watcherId, tierId, muted, expectedRevision, actor) {
    const advance = await this.store.transact('alert.notification_tier.mute', (state) => {
      const { watcher, alert } = requireActiveNotificationAlert(state, accountId, watcherId);
      const policy = regionPolicy(state, alert, policyFor(alert, watcher));
      const tierIndex = policy.recipientTiers.findIndex((item) => item.id === tierId);
      if (tierIndex < 0) throw Object.assign(new Error('Escalation level not found.'), { statusCode: 404 });
      const control = claimNotificationControl(alert, expectedRevision);
      const mutedIds = new Set(control.mutedTierIds ?? []);
      const activated = tierWasActivated(state, alert, tierIndex);
      const currentTierIndex = alert.newlyOpened ? -1 : Math.max(0, Number(alert.currentTierIndex ?? 0));
      const dispatching = alert.notificationDispatch?.status === 'sending' && Number(alert.notificationDispatch.round) === Number(alert.notificationRound) && Number(alert.notificationDispatch.tierIndex) === tierIndex;
      if (muted && watcher.status === 'paused' && tierIndex === currentTierIndex) {
        throw Object.assign(new Error('Resume this watcher before skipping its current escalation level. Future levels can still be muted while paused.'), { statusCode: 409, code: 'WATCHER_NOTIFICATIONS_PAUSED' });
      }
      if (muted && activated && !dispatching && (tierIndex !== currentTierIndex || alert.escalationCompletedAt)) {
        throw Object.assign(new Error('A completed escalation level can no longer be skipped for this incident.'), { statusCode: 409, code: 'NOTIFICATION_TIER_ALREADY_ACTIVE' });
      }
      if (!muted && (activated || tierIndex <= currentTierIndex)) {
        throw Object.assign(new Error('A level that has already started cannot be restored to this incident queue.'), { statusCode: 409, code: 'NOTIFICATION_TIER_ALREADY_ACTIVE' });
      }
      if (muted) mutedIds.add(tierId); else mutedIds.delete(tierId);
      control.mutedTierIds = [...mutedIds];
      const changedAt = ISO();
      control.updatedAt = changedAt;
      control.updatedBy = actor.actorId;
      control.revision += 1;

      if (muted) {
        for (const notice of state.notifications.filter((item) => item.alertId === alert.id && Number(item.round) === Number(alert.notificationRound) && item.tierId === tierId && ['sending', 'retry_scheduled'].includes(item.status))) {
          notice.status = 'canceled'; notice.retryAt = null; notice.updatedAt = changedAt; notice.error = 'Canceled because this escalation level was muted for the incident.';
        }
        if (alert.notificationDispatch?.tierIndex === tierIndex && alert.notificationDispatch.status === 'sending') {
          alert.notificationDispatch.status = 'canceled'; alert.notificationDispatch.canceledAt = changedAt;
        }
      }

      let nextTierIndex = null;
      if (muted && (tierIndex === currentTierIndex || (alert.newlyOpened && tierIndex === 0))) {
        nextTierIndex = nextEligibleTierIndex(policy, currentTierIndex, control);
        alert.newlyOpened = currentTierIndex < 0;
        alert.nextEscalationAt = nextTierIndex == null ? null : changedAt;
        alert.escalationCompletedAt = nextTierIndex == null ? changedAt : null;
      }
      alert.updatedAt = changedAt;
      appendAudit(state, actor, muted ? 'alert.notification_tier_muted' : 'alert.notification_tier_unmuted', { accountId, targetId: alert.id, requestId: actor.requestId, metadata: { watcherId, tierId, tierIndex, controlRevision: control.revision } });
      return { alertId: alert.id, nextTierIndex, nextTierId: nextTierIndex == null ? null : policy.recipientTiers[nextTierIndex]?.id ?? null };
    });
    if (advance?.nextTierIndex != null) await this.queueTier(advance.alertId, advance.nextTierIndex, advance.nextTierId);
    return this.getActivity(accountId, watcherId);
  }

  async cancelActivity(accountId, watcherId, expectedRevision, actor) {
    await this.store.transact('alert.notification_activity.cancel', (state) => {
      const { alert } = requireActiveNotificationAlert(state, accountId, watcherId);
      const control = claimNotificationControl(alert, expectedRevision);
      const canceledAt = ISO();
      control.canceledAt = canceledAt;
      control.canceledBy = actor.actorId;
      control.updatedAt = canceledAt;
      control.updatedBy = actor.actorId;
      control.revision += 1;
      alert.nextEscalationAt = null;
      alert.nextReAlertAt = null;
      alert.escalationCompletedAt = canceledAt;
      alert.newlyOpened = false;
      alert.sendAgain = false;
      if (alert.notificationDispatch?.status === 'sending') { alert.notificationDispatch.status = 'canceled'; alert.notificationDispatch.canceledAt = canceledAt; }
      for (const notice of state.notifications.filter((item) => item.alertId === alert.id && Number(item.round) === Number(alert.notificationRound) && ['sending', 'retry_scheduled'].includes(item.status))) {
        notice.status = 'canceled'; notice.retryAt = null; notice.updatedAt = canceledAt; notice.error = 'Canceled by the customer for this incident.';
      }
      alert.updatedAt = canceledAt;
      appendAudit(state, actor, 'alert.notification_activity_canceled', { accountId, targetId: alert.id, requestId: actor.requestId, metadata: { watcherId, controlRevision: control.revision } });
      return null;
    });
    return this.getActivity(accountId, watcherId);
  }

  async queueTier(alertId, tierIndex, expectedTierId = null) {
    tierIndex = Number(tierIndex);
    if (!Number.isInteger(tierIndex) || tierIndex < 0) {
      this.logger.warn('notification.tier.blocked', { runtimeRevision: NOTIFICATION_RUNTIME_REVISION, alertId, tierIndex, reason: 'invalid_tier_index' });
      return [];
    }
    const proposedDispatchId = id('dispatch');
    const claim = await this.store.transact('notification.tier.claim', (state) => {
      const alert = state.alerts.find((item) => item.id === alertId);
      const watcher = state.watchers.find((item) => item.id === alert?.watcherId);
      const account = state.accounts.find((item) => item.id === watcher?.accountId);
      if (!alert) return blockedTierClaim('alert_missing');
      if (!['open', 'acknowledged'].includes(alert.status)) return blockedTierClaim('alert_not_open', { alertStatus: alert.status ?? null });
      if (alert.recoveryDetectedAt) return blockedTierClaim('recovery_detected');
      if (notificationControlFor(alert).canceledAt) return blockedTierClaim('activity_canceled');
      if (!watcher) return blockedTierClaim('watcher_missing');
      if (!watcherMayNotify(watcher)) return blockedTierClaim('watcher_not_active', { watcherStatus: watcher.status ?? null });
      if (!account) return blockedTierClaim('account_missing');
      if (account.closureStatus !== 'active') return blockedTierClaim('account_not_active', { accountStatus: account.closureStatus ?? null });
      if (!notificationPolicyFits(policyFor(alert, watcher), account)) return blockedTierClaim('notification_plan_limit');
      const policy = regionPolicy(state, alert, policyFor(alert, watcher));
      const requestedTier = policy.recipientTiers[tierIndex];
      if (!requestedTier) return blockedTierClaim('tier_missing', { tierCount: policy.recipientTiers.length });
      if (expectedTierId && requestedTier.id !== expectedTierId) return blockedTierClaim('tier_identity_changed');
      while (tierIndex < policy.recipientTiers.length && !policy.recipientTiers[tierIndex].recipients.some((item) => recipientIsEnabled(item) && (item.channel !== 'sms' || this.config.smsEnabled !== false))) tierIndex += 1;
      const tier = policy.recipientTiers[tierIndex];
      if (!tier) return blockedTierClaim('tier_missing', { tierCount: policy.recipientTiers.length });
      if (tierIsMuted(alert, tier)) return blockedTierClaim('tier_muted');
      const eligibleRecipients = tier.recipients.filter((item) => recipientIsEnabled(item) && (item.channel !== 'sms' || this.config.smsEnabled !== false));
      if (!eligibleRecipients.length) return blockedTierClaim('no_eligible_recipients', { configuredRecipients: tier.recipients.length });
      const round = notificationRoundFor(alert);
      alert.notificationRound = round;
      let repairedZeroAttempt = false;
      const canRepairZeroAttempt = isZeroAttemptRepairCandidate(state, alert, round, tierIndex);
      if (canRepairZeroAttempt) {
        alert.notificationDispatch = null;
        alert.notificationDelivery = null;
        alert.nextEscalationAt = null;
        alert.nextReAlertAt = null;
        alert.escalationCompletedAt = null;
        alert.newlyOpened = true;
        alert.sendAgain = false;
        repairedZeroAttempt = true;
      }
      const activeDispatch = alert.notificationDispatch;
      if (Number(activeDispatch?.round) === round && Number(activeDispatch?.tierIndex) === tierIndex) {
        if (activeDispatch.status === 'completed') return blockedTierClaim('tier_already_completed', { round });
        if (activeDispatch.status === 'sending') {
          const staleBefore = addSeconds(ISO(), -STALE_DELIVERY_CLAIM_SECONDS);
          if ((activeDispatch.lastAttemptAt ?? activeDispatch.startedAt ?? '') > staleBefore) return { inProgress: true, reason: 'tier_dispatch_in_progress', dispatchId: activeDispatch.id, round };
          activeDispatch.attempts = Number(activeDispatch.attempts ?? 1) + 1;
          activeDispatch.lastAttemptAt = ISO();
          return { dispatchId: activeDispatch.id, alert: structuredClone(alert), watcher: structuredClone(watcher), policy, tier: structuredClone(tier), tierIndex, round, repairedZeroAttempt };
        }
      }
      if (tierIndex > 0) {
        const currentTierIndex = alert.newlyOpened ? -1 : Math.max(0, Number(alert.currentTierIndex ?? 0));
        if (tierIndex <= currentTierIndex) return blockedTierClaim('tier_already_activated', { currentTierIndex, round });
        if (alert.escalationCompletedAt) return blockedTierClaim('escalation_already_completed', { currentTierIndex, round });
        if (policy.recipientTiers.slice(currentTierIndex + 1, tierIndex).some((candidate) =>
          !tierIsMuted(alert, candidate) && candidate.recipients.some((item) => recipientIsEnabled(item) && (item.channel !== 'sms' || this.config.smsEnabled !== false)))) {
          return blockedTierClaim('earlier_tier_pending', { currentTierIndex, round });
        }
        if (alert.nextEscalationAt && alert.nextEscalationAt > ISO()) return blockedTierClaim('escalation_wait_active', { currentTierIndex, round, nextEscalationAt: alert.nextEscalationAt });
        const priorTier = currentTierIndex >= 0 ? policy.recipientTiers[currentTierIndex] : null;
        if (priorTier && !tierIsMuted(alert, priorTier)) {
          const responders = new Set(alert.responses.filter((response) => priorTier.recipients.some((recipient) => recipient.id === response.recipientId)).map((response) => response.recipientId));
          if (responders.size >= priorTier.requiredAcknowledgements) return blockedTierClaim('prior_tier_acknowledged', { currentTierIndex, round });
        }
      } else if (alert.notificationDelivery?.round === round && alert.notificationDelivery.tierIndex === 0 && !alert.newlyOpened && !alert.sendAgain) {
        return blockedTierClaim('initial_tier_already_delivered', { round });
      }
      const now = ISO();
      alert.currentTierIndex = tierIndex;
      alert.nextEscalationAt = null;
      alert.nextReAlertAt = null;
      alert.escalationCompletedAt = null;
      alert.notificationDispatch = { id: proposedDispatchId, round, tierIndex, status: 'sending', attempts: 1, startedAt: now, lastAttemptAt: now, completedAt: null, canceledAt: null };
      alert.updatedAt = now;
      return { dispatchId: proposedDispatchId, alert: structuredClone(alert), watcher: structuredClone(watcher), policy, tier: structuredClone(tier), tierIndex, round, repairedZeroAttempt };
    });
    if (!claim) {
      this.logger.warn('notification.tier.blocked', { runtimeRevision: NOTIFICATION_RUNTIME_REVISION, alertId, tierIndex, reason: 'claim_returned_empty' });
      return [];
    }
    if (claim.blocked || claim.inProgress) {
      const log = claim.inProgress ? this.logger.info.bind(this.logger) : this.logger.warn.bind(this.logger);
      log('notification.tier.blocked', { runtimeRevision: NOTIFICATION_RUNTIME_REVISION, alertId, tierIndex, reason: claim.reason, round: claim.round ?? null, currentTierIndex: claim.currentTierIndex ?? null, nextEscalationAt: claim.nextEscalationAt ?? null, watcherStatus: claim.watcherStatus ?? null, accountStatus: claim.accountStatus ?? null, tierCount: claim.tierCount ?? null, configuredRecipients: claim.configuredRecipients ?? null, dispatchId: claim.dispatchId ?? null });
      return [];
    }
    const { dispatchId, alert, watcher, policy, tier, round, repairedZeroAttempt } = claim;
    if (repairedZeroAttempt) this.logger.warn('notification.tier.zero_attempt_repaired', { runtimeRevision: NOTIFICATION_RUNTIME_REVISION, alertId: alert.id, watcherId: watcher.id, tierIndex, round, dispatchId });
    const enabledRecipients = tier.recipients.filter((item) => recipientIsEnabled(item) && (item.channel !== 'sms' || this.config.smsEnabled !== false));
    this.logger.info('notification.tier.started', { runtimeRevision: NOTIFICATION_RUNTIME_REVISION, alertId: alert.id, watcherId: watcher.id, tierIndex, round, dispatchId, enabledRecipients: enabledRecipients.length });
    const sends = await mapWithConcurrency(enabledRecipients, TIER_SEND_CONCURRENCY, (recipient) => this.#send(alert, watcher, policy, tier, tierIndex, recipient, dispatchId));
    await this.store.transact('notifications.tier.sent', (draft) => {
      const target = draft.alerts.find((item) => item.id === alert.id);
      const liveWatcher = draft.watchers.find((item) => item.id === alert.watcherId);
      const liveAccount = draft.accounts.find((item) => item.id === liveWatcher?.accountId);
      const dispatch = target?.notificationDispatch;
      if (!target || notificationRoundFor(target) !== round || dispatch?.id !== dispatchId || dispatch.status !== 'sending') return null;
      if (!alertMayNotify(target) || !watcherMayNotify(liveWatcher) || !liveAccount || liveAccount.closureStatus !== 'active') {
        dispatch.status = 'canceled'; dispatch.canceledAt = ISO(); target.updatedAt = dispatch.canceledAt;
        return null;
      }
      target.currentTierIndex = tierIndex; target.newlyOpened = false; target.sendAgain = false;
      const roundDeliveries = draft.notifications.filter((item) => item.alertId === alert.id && item.round === round && item.tierIndex === tierIndex);
      target.notificationDelivery = {
        dispatchId, tierIndex, round, attemptedAt: ISO(), attempted: enabledRecipients.length,
        sent: roundDeliveries.filter((item) => item.status === 'sent').length,
        failed: roundDeliveries.filter((item) => ['failed', 'retry_scheduled'].includes(item.status)).length,
        suppressed: roundDeliveries.filter((item) => item.status === 'suppressed').length,
      };
      const nextTierIndex = nextEligibleTierIndex(policy, tierIndex, notificationControlFor(target));
      const nextTier = nextTierIndex == null ? null : policy.recipientTiers[nextTierIndex];
      const completedAt = ISO();
      target.nextEscalationAt = target.status === 'open' && nextTier ? addSeconds(completedAt, Math.max(1, tier.delayMinutes) * 60) : null;
      // Notification escalation is a single forward-only pass. A level is
      // activated at most once for an incident round; finishing the final
      // level never creates a new level-one send.
      target.nextReAlertAt = null;
      target.escalationCompletedAt = target.status === 'open' && nextTier ? null : (target.escalationCompletedAt ?? completedAt);
      dispatch.status = 'completed'; dispatch.completedAt = completedAt;
      target.updatedAt = completedAt;
      return null;
    });
    this.logger.info('notification.tier.completed', { runtimeRevision: NOTIFICATION_RUNTIME_REVISION, alertId: alert.id, watcherId: watcher.id, tierIndex, round, dispatchId, attempted: enabledRecipients.length, sent: sends.filter((item) => item?.providerId).length, failed: sends.filter((item) => item?.failed).length });
    return sends;
  }

  async #send(alert, watcher, policy, tier, tierIndex, recipient, dispatchId) {
    const key = `${alert.id}:${alert.notificationRound}:${tierIndex}:${recipient.id}`;
    const claimed = await this.store.transact('notification.claim', (state) => {
      const liveAlert = state.alerts.find((item) => item.id === alert.id);
      const liveWatcher = state.watchers.find((item) => item.id === watcher.id && item.accountId === watcher.accountId);
      const liveAccount = state.accounts.find((item) => item.id === watcher.accountId);
      const dispatch = liveAlert?.notificationDispatch;
      if (liveAccount && liveAlert && liveWatcher && !notificationPolicyFits(policyFor(liveAlert, liveWatcher), liveAccount)) return null;
      if (!alertMayNotify(liveAlert) || !watcherMayNotify(liveWatcher) || !liveAccount || liveAccount.closureStatus !== 'active') return null;
      if (!recipientBelongsToActiveTeam(state, recipient, liveAlert.accountId)) return null;
      if (liveAlert.regionScoped && !recipientWatchesAffectedRegion(state, recipient, liveAlert.affectedRegions, liveAlert.accountId)) return null;
      if (liveAlert.notificationRound !== alert.notificationRound) return null;
      if (dispatch?.id !== dispatchId || dispatch.status !== 'sending' || dispatch.round !== alert.notificationRound || dispatch.tierIndex !== tierIndex) return null;
      if (state.idempotency.some((item) => item.key === key)) return null;
      state.idempotency.push({ key, scope: 'notification', createdAt: ISO(), expiresAtEpoch: Math.floor(Date.now() / 1000) + 180 * 86400 });
      const emailSuppression = recipient.channel === 'email' ? findEmailSuppression(state, recipient.destination) : null;
      const budgetAvailable = emailSuppression ? true : reserveDeliveryBudget(state, liveAccount, recipient.channel);
      const responseCode = uniqueCode(state);
      const now = ISO();
      const optedOut = Boolean(emailSuppression);
      const suppressed = optedOut || !budgetAvailable;
      const notification = { id: id('notice'), alertId: alert.id, watcherId: watcher.id, accountId: watcher.accountId, dispatchId, tierId: tier.id, tierIndex, recipientId: recipient.id, channel: recipient.channel, destination: recipient.destination, round: alert.notificationRound, status: suppressed ? 'suppressed' : 'sending', deliveryState: suppressed ? 'suppressed' : 'attempted', responseCode, responseExpiresAt: addSeconds(now, 90 * 86400), retryCount: 0, retryAt: null, attemptId: suppressed ? null : id('attempt'), attemptStartedAt: suppressed ? null : now, createdAt: now, updatedAt: now, providerId: null, error: optedOut ? emailSuppressionReason(emailSuppression) : !budgetAvailable ? 'Account daily notification limit reached.' : null };
      state.notifications.push(notification); return notification;
    });
    if (!claimed) return { duplicate: true };
    if (claimed.status === 'suppressed') {
      this.logger.info('notification.delivery.suppressed', { notificationId: claimed.id, alertId: alert.id, watcherId: watcher.id, channel: claimed.channel });
      return { notificationId: claimed.id, suppressed: true };
    }
    let providerResult = null;
    try {
      const result = providerResult = await this.#deliver(claimed, alert, watcher, policy, recipient);
      if (result.suppressed || result.canceled) {
        const stoppedState = result.canceled ? 'canceled' : 'suppressed';
        await this.store.transact(`notification.${stoppedState}`, (state) => { const notice = state.notifications.find((item) => item.id === claimed.id); if (!notice || notice.status !== 'sending' || notice.attemptId !== claimed.attemptId) return null; notice.status = stoppedState; notice.deliveryState = stoppedState; notice.retryAt = null; notice.updatedAt = ISO(); notice.error = result.reason ?? 'Customer alert email is blocked for this address.'; return null; });
        this.logger.info(`notification.delivery.${stoppedState}`, { notificationId: claimed.id, alertId: alert.id, watcherId: watcher.id, channel: claimed.channel });
        return { notificationId: claimed.id, [stoppedState]: true };
      }
      requireProviderAcceptance(result);
      await this.#recordAcceptedDelivery(claimed.id, claimed.attemptId, result, 'notification.sent');
      this.logger.info('notification.delivery.sent', { notificationId: claimed.id, alertId: alert.id, watcherId: watcher.id, channel: claimed.channel, providerId: result.providerId });
      return { notificationId: claimed.id, providerId: result.providerId };
    } catch (error) {
      if (providerResult?.providerId && !providerResult.failed && !providerResult.suppressed && providerResult.deliveryState !== 'ambiguous') {
        // A persistence error after known acceptance is not a failed send and
        // must not schedule another provider request. Retry the commit once.
        await this.#recordAcceptedDelivery(claimed.id, claimed.attemptId, providerResult, 'notification.acceptance.recover');
        this.logger.warn('notification.acceptance.persistence_recovered', { notificationId: claimed.id, providerId: providerResult.providerId });
        return { notificationId: claimed.id, providerId: providerResult.providerId };
      }
      await this.store.transact('notification.retry_scheduled', (state) => { const notice = state.notifications.find((item) => item.id === claimed.id); if (!notice || notice.status !== 'sending' || notice.attemptId !== claimed.attemptId) return null; notice.status = 'retry_scheduled'; notice.deliveryState = error.deliveryState ?? 'failed'; notice.retryAt = addSeconds(ISO(), DELIVERY_RETRY_DELAY_SECONDS); notice.updatedAt = ISO(); notice.error = String(error.message).slice(0, 1000); return null; });
      this.logger.error('notification.delivery.failed', { notificationId: claimed.id, alertId: alert.id, watcherId: watcher.id, channel: claimed.channel, name: error.name, code: error.code, requestId: error.$metadata?.requestId ?? null, message: error.message });
      return { notificationId: claimed.id, failed: true, retryScheduled: true };
    }
  }

  async #recordAcceptedDelivery(notificationId, attemptId, result, label) {
    return this.store.transact(label, (state) => {
      const notice = state.notifications.find((item) => item.id === notificationId);
      if (!notice || notice.status !== 'sending' || notice.attemptId !== attemptId) return null;
      notice.status = 'sent'; notice.deliveryState = result.deliveryState ?? 'accepted'; notice.providerId = result.providerId;
      notice.sentAt = ISO(); notice.providerAcceptedAt = notice.deliveryState === 'accepted' ? notice.sentAt : null;
      notice.updatedAt = notice.sentAt; notice.retryAt = null; notice.error = null;
      return null;
    });
  }

  async #deliver(notification, alert, watcher, policy, recipient) {
    const token = createResponseToken({ alertId: alert.id, recipientId: recipient.id, notificationId: notification.id, expiresAt: notification.responseExpiresAt }, this.config.integritySecret);
    const responseUrl = `${String(this.config.responseBaseUrl).replace(/\/$/, '')}/respond/${encodeURIComponent(token)}`;
    const context = { alert: { ...notificationIncidentDetails(alert, watcher), responseCode: notification.responseCode }, watcher: policy.watcher ?? { name: watcher.name, url: watcher.config.url }, recipient, responseCode: notification.responseCode, responseUrl };
    if (recipient.channel === 'sms') {
      if (!activeNotificationAccount(await this.store.read(), notification.accountId)) return closedAccountDelivery();
      return this.providers.sendSms({ to: recipient.destination, text: boundedSms(interpolate(policy.templates.sms, context), notification.responseCode), notificationId: notification.id });
    }
    const unsubscribeLink = await this.#ensureUnsubscribeLink(notification, recipient.destination);
    if (!unsubscribeLink) return closedAccountDelivery();
    const unsubscribeToken = createResponseToken({ purpose: 'email_unsubscribe', linkId: unsubscribeLink.id, expiresAt: unsubscribeLink.expiresAt }, this.config.integritySecret);
    const unsubscribeUrl = `${String(this.config.responseBaseUrl).replace(/\/$/, '')}/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
    context.unsubscribeUrl = unsubscribeUrl;
    const message = interpolate(policy.templates.text, context);
    let email;
    try {
      email = renderAlertEmail({ context, message });
    } catch (error) {
      // Presentation must never become a dependency of alert delivery. Keep a
      // complete, independently generated multipart fallback and expose the
      // renderer failure without leaking recipient or alert content.
      this.logger.error('notification.email.render_failed', { notificationId: notification.id, alertId: alert.id, watcherId: watcher.id, name: error.name, message: String(error.message).slice(0, 500) });
      email = fallbackAlertEmail(context, message);
    }
    // The check immediately before transport is intentional. It closes the
    // claim/render gap when a recipient opts out while a delivery is queued.
    const deliveryState = await this.store.read();
    if (!activeNotificationAccount(deliveryState, notification.accountId)) return closedAccountDelivery();
    const suppression = findEmailSuppression(deliveryState, recipient.destination);
    if (suppression) return { suppressed: true, deliveryState: 'suppressed', reason: emailSuppressionReason(suppression) };
    return this.providers.sendEmail({
      to: recipient.destination,
      subject: incidentEmailSubject(interpolate(policy.templates.subject === '[{{alert.kindLabel}}] {{watcher.name}} changed'
        ? '[{{alert.kindLabel}}] {{watcher.name}}' : policy.templates.subject, context), context.alert.kindLabel),
      text: email.text,
      html: email.html,
      replyTo: this.config.sesReplyDomain ? `reply+${notification.responseCode}@${this.config.sesReplyDomain}` : undefined,
      notificationId: notification.id,
      headers: [
        { name: 'List-Unsubscribe', value: `<${unsubscribeUrl}>` },
        { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
      ],
    });
  }

  async #ensureUnsubscribeLink(notification, destination) {
    return this.store.transact('email.unsubscribe_link.ensure', (state) => {
      state.emailUnsubscribeLinks ??= [];
      // Account erasure marks the tenant inactive before deleting links and
      // notices in separate bounded batches. An old delivery must not recreate
      // a link between those batches, including when its notice still exists.
      if (!activeNotificationAccount(state, notification.accountId)) return null;
      const existing = state.emailUnsubscribeLinks.find((item) => item.notificationId === notification.id);
      if (existing) { existing.accountId ??= notification.accountId; return existing; }
      const now = ISO();
      const link = { id: id('unsub'), notificationId: notification.id, accountId: notification.accountId, email: validateEmailAddress(destination), createdAt: now, expiresAt: addSeconds(now, EMAIL_UNSUBSCRIBE_LIFETIME_SECONDS), usedAt: null };
      state.emailUnsubscribeLinks.push(link);
      const notice = state.notifications.find((item) => item.id === notification.id);
      if (notice) notice.unsubscribeLinkId = link.id;
      return link;
    });
  }

  async recordResponse({ alertId, recipientId, response, source, notificationId = null }) {
    if (!['alert_received', 'all_clear'].includes(response)) throw Object.assign(new Error('Unknown alert response.'), { statusCode: 400 });
    const outcome = await this.store.transact('alert.response', (state) => {
      const alert = state.alerts.find((item) => item.id === alertId);
      const watcher = state.watchers.find((item) => item.id === alert?.watcherId);
      if (!alert || !watcher) throw Object.assign(new Error('Alert not found.'), { statusCode: 404 });
      if (notificationControlFor(alert).canceledAt) return { status: 'notifications_canceled', alertId };
      if (!['open', 'acknowledged'].includes(alert.status)) return { status: alert.status, alertId };
      const policy = regionPolicy(state, alert, policyFor(alert, watcher));
      const recipientTier = policy.recipientTiers.find((tier) => tier.recipients.some((item) => item.id === recipientId));
      const knownRecipient = recipientTier?.recipients.find((item) => item.id === recipientId);
      if (!knownRecipient) throw Object.assign(new Error('Recipient is not associated with this alert.'), { statusCode: 403 });
      if (tierIsMuted(alert, recipientTier)) return { status: 'tier_muted', alertId };
      if (notificationId) {
        const notification = state.notifications.find((item) => item.id === notificationId && item.alertId === alertId && item.recipientId === recipientId);
        if (!notification) throw Object.assign(new Error('The notification is not associated with this alert response.'), { statusCode: 403 });
        if (notification.round != null && Number(notification.round) !== Number(alert.notificationRound)) {
          throw Object.assign(new Error('This response belongs to an earlier notification round. Use the most recent alert message.'), { statusCode: 409, code: 'STALE_ALERT_RESPONSE' });
        }
      }
      const existing = alert.responses.find((item) => item.recipientId === recipientId);
      if (existing) { existing.response = response; existing.updatedAt = ISO(); existing.source = source; }
      else alert.responses.push({ id: id('resp'), recipientId, notificationId, response, source, createdAt: ISO(), updatedAt: ISO() });
      const clear = alert.responses.filter((item) => item.response === 'all_clear').length;
      const ack = alert.responses.filter((item) => item.response === 'alert_received').length;
      if (clear >= policy.allClearThreshold) { alert.status = 'resolving'; alert.nextEscalationAt = null; alert.escalationCompletedAt = ISO(); return { status: 'all_clear_consensus', alertId }; }
      if (ack >= policy.alertReceivedThreshold) { const acknowledgedAt = ISO(); alert.status = 'acknowledged'; alert.nextEscalationAt = null; alert.nextReAlertAt = null; alert.escalationCompletedAt = acknowledgedAt; return { status: 'acknowledged', alertId }; }
      return { status: 'recorded', alertId, clear, ack };
    });
    if (outcome.status === 'all_clear_consensus') {
      if (!this.onAllClear) throw new Error('All-clear handler is not configured.');
      await this.onAllClear(alertId);
      return { ...outcome, status: 'all_clear' };
    }
    return outcome;
  }

  async recordInboundReply({ channel, sender, body, code, providerMessageId }) {
    if (!['email', 'sms'].includes(channel)) throw Object.assign(new Error('Unsupported reply channel.'), { code: 'INVALID_REPLY', statusCode: 400 });
    const response = parseReplyIntent(body);
    if (!response) throw Object.assign(new Error('Reply must contain “Alert Received” or “All Clear”.'), { code: 'INVALID_REPLY', statusCode: 400 });
    const responseCode = String(code || extractResponseCode({ body })).trim().toUpperCase();
    if (!responseCode) throw Object.assign(new Error('Reply is missing its alert response code.'), { code: 'INVALID_REPLY', statusCode: 400 });
    const normalizedSender = channel === 'email' ? normalizeEmail(sender) : normalizePhone(sender);
    const state = await this.store.read();
    const candidates = state.notifications.filter((item) => item.channel === channel && item.responseCode === responseCode && (!item.responseExpiresAt || item.responseExpiresAt >= ISO()));
    const matches = candidates.filter((item) => (channel === 'email' ? normalizeEmail(item.destination) : normalizePhone(item.destination)) === normalizedSender);
    if (!matches.length) throw Object.assign(new Error('No active alert reply matches this sender and response code.'), { code: 'REPLY_NOT_FOUND', statusCode: 404 });
    if (matches.length > 1) throw Object.assign(new Error('The reply matches more than one active alert.'), { code: 'AMBIGUOUS_REPLY', statusCode: 409 });
    const notification = matches[0];
    const eventKey = `inbound:${channel}:${String(providerMessageId || '').trim()}`;
    if (!providerMessageId) throw Object.assign(new Error('Provider message ID is required for replay protection.'), { code: 'INVALID_REPLY', statusCode: 400 });
    const claimed = await this.store.transact('notification.inbound.claim', (draft) => {
      const existing = draft.providerEvents.find((item) => item.id === eventKey);
      const now = ISO();
      if (existing?.status === 'completed') return false;
      if (existing?.status === 'processing' && !isStaleProviderClaim(existing, now)) return false;
      if (existing) {
        existing.status = 'processing'; existing.attempts = Number(existing.attempts ?? 1) + 1;
        existing.lastAttemptAt = now; existing.error = null; return true;
      }
      draft.providerEvents.push({ id: eventKey, provider: channel === 'email' ? 'ses' : 'twilio', type: 'inbound_reply', status: 'processing', attempts: 1, createdAt: now, lastAttemptAt: now, completedAt: null, error: null, expiresAtEpoch: Math.floor(Date.now() / 1000) + 180 * 86400 });
      return true;
    });
    if (!claimed) return { duplicate: true, alertId: notification.alertId, status: 'duplicate' };
    try {
      const outcome = await this.recordResponse({ alertId: notification.alertId, recipientId: notification.recipientId, notificationId: notification.id, response, source: `${channel}_reply` });
      await this.store.transact('notification.inbound.complete', (draft) => {
        const event = draft.providerEvents.find((item) => item.id === eventKey);
        if (event) { event.status = 'completed'; event.completedAt = ISO(); event.error = null; }
        return null;
      });
      return outcome;
    } catch (error) {
      await this.store.transact('notification.inbound.failed', (draft) => {
        const event = draft.providerEvents.find((item) => item.id === eventKey);
        if (event) { event.status = 'failed'; event.error = String(error.message).slice(0, 1000); }
        return null;
      }).catch(() => undefined);
      throw error;
    }
  }

  async recordByCode(code, response, source = 'reply_code') {
    const state = await this.store.read();
    const notification = state.notifications.find((item) => item.responseCode === String(code).trim().toUpperCase());
    if (!notification) throw Object.assign(new Error('Response code was not found.'), { statusCode: 404 });
    if (notification.responseExpiresAt && notification.responseExpiresAt < ISO()) throw Object.assign(new Error('Response code expired.'), { statusCode: 400 });
    return this.recordResponse({ alertId: notification.alertId, recipientId: notification.recipientId, notificationId: notification.id, response, source });
  }

  async processTimers() {
    const now = ISO();
    const staleBefore = addSeconds(now, -STALE_DELIVERY_CLAIM_SECONDS);
    if (this.store.readCollection) {
      const [notices, alerts] = await Promise.all([this.store.readCollection('notifications'), this.store.readCollection('alerts')]);
      const pending = notices.some((item) => item.status === 'sending' && (item.attemptStartedAt ?? item.updatedAt ?? item.createdAt ?? '') <= staleBefore
        || item.status === 'retry_scheduled' && item.retryAt <= now && item.retryCount < 1);
      if (!pending && !alerts.some((item) => ['open', 'acknowledged'].includes(item.status))) return;
    }
    let state = await this.store.read();
    const staleIds = state.notifications
      .filter((item) => item.status === 'sending' && (item.attemptStartedAt ?? item.updatedAt ?? item.createdAt ?? '') <= staleBefore)
      .slice(0, 35)
      .map((item) => item.id);
    const reclaimed = staleIds.length ? await this.store.transact('notification.stale_delivery.reclaim', (draft) => {
      let count = 0;
      for (const target of draft.notifications.filter((item) => staleIds.includes(item.id) && item.status === 'sending')) {
        const startedAt = target.attemptStartedAt ?? target.updatedAt ?? target.createdAt;
        if (startedAt && startedAt > staleBefore) continue;
        target.updatedAt = now;
        target.error = 'The delivery worker stopped before recording the provider result.';
        target.deliveryState = 'ambiguous';
        target.ambiguousAttemptAt = target.attemptStartedAt ?? now;
        if (Number(target.retryCount ?? 0) < 1) {
          target.status = 'retry_scheduled';
          target.retryAt = now;
        } else {
          target.status = 'failed';
          target.retryAt = null;
        }
        count += 1;
      }
      return count;
    }) : 0;
    if (reclaimed) this.logger.warn('notification.stale_delivery.reclaimed', { count: reclaimed });
    if (reclaimed) state = await this.store.read();
    for (const notification of state.notifications.filter((item) => item.status === 'retry_scheduled' && item.retryAt <= now && item.retryCount < 1)) {
      if (notification.channel === 'sms' && this.config.smsEnabled === false) {
        await this.store.transact('notification.sms.disabled', (draft) => {
          const target = draft.notifications.find((item) => item.id === notification.id);
          if (!target || target.status !== 'retry_scheduled') return null;
          target.status = 'disabled'; target.retryAt = null; target.updatedAt = ISO(); target.error = 'SMS notifications are disabled for this deployment.';
          return null;
        });
        continue;
      }
      const alert = state.alerts.find((item) => item.id === notification.alertId);
      const watcher = state.watchers.find((item) => item.id === notification.watcherId);
      const account = state.accounts.find((item) => item.id === watcher?.accountId);
      const policy = alert && watcher ? policyFor(alert, watcher) : null;
      const recipient = policy?.recipientTiers.flatMap((tier) => tier.recipients).find((item) => item.id === notification.recipientId);
      const activeTeamRecipient = recipientBelongsToActiveTeam(state, recipient, alert?.accountId);
      const regionRecipientAllowed = !alert?.regionScoped || recipientWatchesAffectedRegion(state, recipient, alert.affectedRegions, alert.accountId);
      const policyChanged = Boolean(alert?.notificationPolicy && watcher && JSON.stringify(alert.notificationPolicy) !== JSON.stringify(notificationPolicyForWatcher(watcher)));
      if (!alertMayNotify(alert) || !watcherMayNotify(watcher) || !recipient || !activeTeamRecipient || !regionRecipientAllowed || !account || account.closureStatus !== 'active' || !notificationPolicyFits(policy, account) || notification.round !== alert.notificationRound || policyChanged) {
        await this.store.transact('notification.retry.cancel', (draft) => {
          const target = draft.notifications.find((item) => item.id === notification.id);
          if (!target || target.status !== 'retry_scheduled') return null;
          target.status = 'canceled'; target.retryAt = null; target.updatedAt = ISO();
          target.error = 'Delivery retry canceled because the alert round, watcher state, account state, or notification policy changed.';
          return null;
        });
        continue;
      }
      const retryAttemptId = await this.store.transact('notification.retry.claim', (draft) => {
        const target = draft.notifications.find((item) => item.id === notification.id);
        const liveAlert = draft.alerts.find((item) => item.id === notification.alertId);
        const liveWatcher = draft.watchers.find((item) => item.id === notification.watcherId);
        const liveAccount = draft.accounts.find((item) => item.id === liveWatcher?.accountId);
        if (!target || target.status !== 'retry_scheduled' || target.retryCount >= 1 || target.retryAt > ISO()) return null;
        if (liveAccount && liveAlert && liveWatcher && !notificationPolicyFits(policyFor(liveAlert, liveWatcher), liveAccount)) return null;
        const liveRecipient = policy?.recipientTiers.flatMap((tier) => tier.recipients).find((item) => item.id === target.recipientId);
        if (!alertMayNotify(liveAlert) || !watcherMayNotify(liveWatcher) || !liveAccount || liveAccount.closureStatus !== 'active' || target.round !== liveAlert.notificationRound || !recipientBelongsToActiveTeam(draft, liveRecipient, liveAlert.accountId) || (liveAlert.regionScoped && !recipientWatchesAffectedRegion(draft, liveRecipient, liveAlert.affectedRegions, liveAlert.accountId))) return null;
        const suppression = target.channel === 'email' ? findEmailSuppression(draft, target.destination) : null;
        if (suppression) {
          target.status = 'suppressed'; target.deliveryState = 'suppressed'; target.retryAt = null; target.updatedAt = ISO(); target.error = emailSuppressionReason(suppression);
          return null;
        }
        if (!reserveDeliveryBudget(draft, liveAccount, target.channel)) {
          target.status = 'suppressed'; target.deliveryState = 'suppressed'; target.retryAt = null; target.updatedAt = ISO(); target.error = 'Account daily notification limit reached.';
          return null;
        }
        target.status = 'sending'; target.deliveryState = 'attempted'; target.retryCount = Number(target.retryCount ?? 0) + 1; target.attemptId = id('attempt'); target.attemptStartedAt = ISO(); target.updatedAt = target.attemptStartedAt; return target.attemptId;
      });
      if (!retryAttemptId) continue;
      let providerResult = null;
      try {
        const result = providerResult = await this.#deliver(notification, alert, watcher, policy, recipient);
        if (result.suppressed || result.canceled) {
          const stoppedState = result.canceled ? 'canceled' : 'suppressed';
          await this.store.transact(`notification.retry.${stoppedState}`, (draft) => { const target = draft.notifications.find((item) => item.id === notification.id); if (!target || target.status !== 'sending' || target.attemptId !== retryAttemptId) return null; target.status = stoppedState; target.deliveryState = stoppedState; target.retryAt = null; target.updatedAt = ISO(); target.error = result.reason ?? 'Customer alert email is blocked for this address.'; return null; });
          this.logger.info(`notification.retry.${stoppedState}`, { notificationId: notification.id, alertId: alert.id, watcherId: watcher.id, channel: notification.channel });
          continue;
        }
        requireProviderAcceptance(result);
        await this.#recordAcceptedDelivery(notification.id, retryAttemptId, result, 'notification.retry.sent');
        this.logger.info('notification.retry.sent', { notificationId: notification.id, alertId: alert.id, watcherId: watcher.id, channel: notification.channel, providerId: result.providerId });
      } catch (error) {
        if (providerResult?.providerId && !providerResult.failed && !providerResult.suppressed && providerResult.deliveryState !== 'ambiguous') {
          await this.#recordAcceptedDelivery(notification.id, retryAttemptId, providerResult, 'notification.retry.acceptance.recover');
          this.logger.warn('notification.acceptance.persistence_recovered', { notificationId: notification.id, providerId: providerResult.providerId });
          continue;
        }
        await this.store.transact('notification.retry.failed', (draft) => { const target = draft.notifications.find((item) => item.id === notification.id); if (!target || target.status !== 'sending' || target.attemptId !== retryAttemptId) return null; target.status = 'failed'; target.deliveryState = error.deliveryState ?? 'failed'; target.retryAt = null; target.updatedAt = ISO(); target.error = String(error.message).slice(0, 1000); return null; });
        this.logger.error('notification.retry.failed', { notificationId: notification.id, message: error.message });
      }
    }
    state = await this.store.read();
    for (const observedAlert of state.alerts.filter((item) => ['open', 'acknowledged'].includes(item.status))) {
      let alert = observedAlert;
      const watcher = state.watchers.find((item) => item.id === alert.watcherId);
      const account = state.accounts.find((item) => item.id === watcher?.accountId);
      if (!alertMayNotify(alert) || !watcherMayNotify(watcher) || !account || account.closureStatus !== 'active') continue;
      const watcherPolicy = notificationPolicyForWatcher(watcher);
      const observedPolicyDiffers = !alert.notificationPolicy || JSON.stringify(alert.notificationPolicy) !== JSON.stringify(watcherPolicy);
      const observedTierIndex = activeTierIndex(state, alert, watcherPolicy);
      const observedNextTierIndex = nextEligibleTierIndex(regionPolicy(state, alert, policyFor(alert, watcher)), observedTierIndex, notificationControlFor(alert));
      const observedNextTier = observedNextTierIndex == null ? null : watcherPolicy.recipientTiers[observedNextTierIndex];
      const observedTierActivated = tierWasActivated(state, alert, observedTierIndex);
      const needsRepair = Boolean(
        alert.notificationPolicyRefreshPending
        || observedPolicyDiffers
        || alert.nextReAlertAt
        || Number(alert.currentTierIndex ?? 0) !== observedTierIndex
        || (alert.status === 'open' && observedTierActivated && observedNextTier && alert.escalationCompletedAt)
        || (alert.status === 'open' && observedTierActivated && !observedNextTier && !alert.escalationCompletedAt)
        || (alert.status === 'acknowledged' && (alert.nextEscalationAt || !alert.escalationCompletedAt))
      );
      if (needsRepair) {
        const repaired = await this.store.transact('alert.escalation.reconcile', (draft) => {
          const target = draft.alerts.find((item) => item.id === alert.id);
          const liveWatcher = draft.watchers.find((item) => item.id === alert.watcherId);
          if (!alertMayNotify(target) || !watcherMayNotify(liveWatcher)) return null;
          const livePolicy = notificationPolicyForWatcher(liveWatcher);
          target.notificationPolicy = livePolicy;
          target.nextReAlertAt = null;
          target.notificationPolicyRefreshPending = false;
          const tierIndex = activeTierIndex(draft, target, livePolicy);
          target.currentTierIndex = tierIndex;
          const currentTier = livePolicy.recipientTiers[tierIndex];
          const nextTierIndex = nextEligibleTierIndex(regionPolicy(draft, target, policyFor(target, liveWatcher)), tierIndex, notificationControlFor(target));
          const nextTier = nextTierIndex == null ? null : livePolicy.recipientTiers[nextTierIndex];
          const activated = tierWasActivated(draft, target, tierIndex);
          const repairedAt = ISO();
          if (target.status === 'acknowledged') {
            target.nextEscalationAt = null;
            target.escalationCompletedAt ??= repairedAt;
          } else if (activated && currentTier && nextTier) {
            target.escalationCompletedAt = null;
            target.nextEscalationAt ??= addSeconds(tierActivatedAt(draft, target, tierIndex, repairedAt), Math.max(1, currentTier.delayMinutes) * 60);
          } else if (activated) {
            target.nextEscalationAt = null;
            target.escalationCompletedAt ??= repairedAt;
          }
          target.updatedAt = repairedAt;
          return structuredClone(target);
        });
        if (!repaired) continue;
        alert = repaired;
        this.logger.info('notification.escalation.reconciled', { alertId: alert.id, watcherId: watcher.id, tierIndex: alert.currentTierIndex, policyUpdated: observedPolicyDiffers, repeatTimerRemoved: Boolean(observedAlert.nextReAlertAt) });
      }
      const policy = regionPolicy(state, alert, policyFor(alert, watcher));
      const activeDispatch = alert.notificationDispatch;
      const round = notificationRoundFor(alert);
      if (isZeroAttemptRepairCandidate(state, alert, round, 0)) {
        await this.queueTier(alert.id, 0);
        continue;
      }
      if (activeDispatch?.status === 'sending' && Number(activeDispatch.round) === round) {
        if ((activeDispatch.lastAttemptAt ?? activeDispatch.startedAt ?? '') <= staleBefore) await this.queueTier(alert.id, activeDispatch.tierIndex);
        continue;
      }
      if (alert.newlyOpened || alert.sendAgain) {
        // Initial delivery is performed inline with a check. If that Lambda is
        // interrupted, these durable flags let maintenance safely resume it;
        // per-recipient idempotency prevents duplicate accepted sends.
        const firstTierIndex = nextEligibleTierIndex(policy, -1, notificationControlFor(alert));
        if (firstTierIndex == null) await this.#clearEscalationTimer(alert);
        else await this.queueTier(alert.id, firstTierIndex);
      } else if (alert.status === 'open' && !alert.escalationCompletedAt) {
        // Maintenance is the sole owner of forward escalation. A missing
        // timestamp is repaired from durable tier-delivery evidence and is
        // never interpreted as permission to restart level one.
        const tierIndex = Math.max(0, Number(alert.currentTierIndex ?? 0));
        const currentTier = policy.recipientTiers[tierIndex];
        const nextTierIndex = nextEligibleTierIndex(policy, tierIndex, notificationControlFor(alert));
        const nextTier = nextTierIndex == null ? null : policy.recipientTiers[nextTierIndex];
        if (!currentTier || !nextTier) {
          await this.#clearEscalationTimer(alert);
          continue;
        }
        const escalationAt = alert.nextEscalationAt ?? addSeconds(alert.notificationDelivery?.attemptedAt ?? alert.updatedAt ?? alert.openedAt ?? now, Math.max(1, currentTier.delayMinutes) * 60);
        if (!alert.nextEscalationAt) await this.#setEscalationTimer(alert, escalationAt);
        if (escalationAt <= now) {
          const responders = new Set(alert.responses.filter((response) => currentTier.recipients.some((recipient) => recipient.id === response.recipientId)).map((response) => response.recipientId));
          if (tierIsMuted(alert, currentTier) || responders.size < currentTier.requiredAcknowledgements) await this.queueTier(alert.id, nextTierIndex);
          else await this.#clearEscalationTimer(alert);
        }
      }
    }
  }

  async #clearEscalationTimer(alert) {
    await this.store.transact('alert.escalation.complete', (draft) => {
      const target = draft.alerts.find((item) => item.id === alert.id);
      if (!target || target.notificationRound !== alert.notificationRound || target.currentTierIndex !== alert.currentTierIndex) return null;
      target.nextEscalationAt = null;
      target.nextReAlertAt = null;
      const completedAt = ISO();
      target.escalationCompletedAt = completedAt;
      target.updatedAt = completedAt;
      return null;
    });
  }

  async #setEscalationTimer(alert, escalationAt) {
    await this.store.transact('alert.escalation.repair', (draft) => {
      const target = draft.alerts.find((item) => item.id === alert.id);
      if (!target || target.notificationRound !== alert.notificationRound || target.currentTierIndex !== alert.currentTierIndex || target.escalationCompletedAt || target.nextEscalationAt) return null;
      target.nextEscalationAt = escalationAt;
      target.nextReAlertAt = null;
      target.updatedAt = ISO();
      return null;
    });
  }

  async sendStaffAction(subject, text) {
    if (!this.config.staffActionEmail) return { skipped: true, deliveryState: 'skipped' };
    try { return await this.#sendDirectEmail({ to: this.config.staffActionEmail, subject, text, html: `<pre>${escapeHtml(text)}</pre>` }, { operational: true }); }
    catch (error) { this.logger.error('staff.notice.failed', { message: error.message }); return { failed: true, deliveryState: error.deliveryState ?? 'failed' }; }
  }

  async sendStewardSecurityAlert(subject, text, { notificationId } = {}) {
    // This recipient is fixed by the owner policy and is independent of
    // configurable customer and technical-alert destinations.
    return this.#sendDirectEmail({ to: 'admin@redcloversoftware.ca', subject, text, html: `<pre>${escapeHtml(text)}</pre>`, notificationId }, { operational: true });
  }

  async sendTechnicalAlert(subject, text, { notificationId } = {}) {
    if (!this.config.technicalAlertsEnabled || !this.config.technicalAlertEmail) return { skipped: true, deliveryState: 'skipped' };
    try { return await this.#sendDirectEmail({ to: this.config.technicalAlertEmail, subject, text, html: `<pre>${escapeHtml(text)}</pre>`, notificationId }, { operational: true }); }
    catch (error) { this.logger.error('technical.notice.failed', { message: error.message }); return { failed: true, deliveryState: error.deliveryState ?? 'failed' }; }
  }

  async sendBillingCancellation(to, cancellation) {
    const scheduled = cancellation.status === 'scheduled';
    const subject = scheduled ? '[CLOVERSIGHT] Renewal cancellation confirmed' : '[CLOVERSIGHT] Subscription cancellation confirmed';
    const text = scheduled
      ? `Renewal cancellation is confirmed. Your paid subscription is scheduled to end at ${cancellation.effectiveAt}. Paid access continues through its paid period, subject to existing plan limits.`
      : 'Subscription cancellation is confirmed. No new subscription renewal will be initiated. Account closure, if requested, continues separately through its deletion grace period.';
    const details = 'Cancellation does not automatically refund payments or erase existing invoices. Reopening an account does not restart billing. Check Billing for status or contact support@websitemonitoringtool.com about an existing payment.';
    return this.#sendDirectEmail({ to, subject, text: `${text}\n\n${details}`, html: `<main><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(text)}</p><p>${escapeHtml(details)}</p></main>` }, { operational: true });
  }

  async sendAccountDeletionConfirmation(to, legalName) {
    const subject = '[CLOVERSIGHT] Account cleanup completed';
    const cleanup = "CLOVERSIGHT has completed the cleanup of your closed account's operational records and linked customer identity records covered by its cleanup process, and monitoring evidence in the platform's currently configured storage.";
    const retention = 'Some restricted financial, email opt-out, provider, backup or security records, and identity records outside that cleanup scope, may remain subject to applicable retention requirements and retention review.';
    const support = 'Contact Red Clover Software support for details of the cleanup scope and any retained records. No action is required.';
    const text = `Hello ${String(legalName || 'there')},\n\n${cleanup}\n\n${retention}\n\n${support}`;
    return this.#sendDirectEmail({ to, subject, text, html: `<main style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1C191B"><h1 style="color:#6B224F">Account cleanup completed</h1><p>Hello ${escapeHtml(legalName || 'there')},</p><p>${escapeHtml(cleanup)}</p><p>${escapeHtml(retention)}</p><p>${escapeHtml(support)}</p></main>` }, { operational: true });
  }

  async #sendDirectEmail(message, { operational = false } = {}) {
    const suppression = findEmailSuppression(await this.store.read(), message.to, { providerOnly: operational });
    if (suppression) {
      this.logger.info('notification.direct_email.suppressed', { category: operational ? 'operational' : 'customer', suppressionSource: suppression.source, destinationDomain: String(message.to).split('@').at(-1)?.toLowerCase() ?? null });
      return { suppressed: true, deliveryState: 'suppressed', suppressionSource: suppression.source };
    }
    const result = await this.providers.sendEmail(message);
    // A fulfilled transport promise proves neither provider acceptance nor
    // delivery. Acceptance requires the provider's message identity.
    if (result?.suppressed) return { ...result, deliveryState: 'suppressed' };
    if (result?.failed || result?.skipped) return { ...result, failed: true, deliveryState: 'failed' };
    if (!result?.providerId) return { ...result, failed: true, deliveryState: 'ambiguous' };
    return { ...result, deliveryState: this.config.emailProvider === 'local' ? 'local_queued' : 'accepted' };
  }
}

function activeTierIndex(state, alert, policy) {
  const lastIndex = Math.max(0, (policy.recipientTiers?.length ?? 0) - 1);
  const round = notificationRoundFor(alert);
  const evidence = state.notifications
    .filter((item) => item.alertId === alert.id && Number(item.round ?? round) === round && !['canceled', 'disabled'].includes(item.status))
    .map((item) => Number(item.tierIndex))
    .filter(Number.isInteger);
  if (Number(alert.notificationDelivery?.round) === round && Number.isInteger(Number(alert.notificationDelivery?.tierIndex))) evidence.push(Number(alert.notificationDelivery.tierIndex));
  if (Number(alert.notificationDispatch?.round) === round && alert.notificationDispatch?.status !== 'canceled' && Number.isInteger(Number(alert.notificationDispatch?.tierIndex))) evidence.push(Number(alert.notificationDispatch.tierIndex));
  const stored = Number(alert.currentTierIndex ?? 0);
  const candidate = evidence.length ? Math.max(...evidence) : (Number.isInteger(stored) ? stored : 0);
  return Math.min(lastIndex, Math.max(0, candidate));
}

function tierWasActivated(state, alert, tierIndex) {
  const round = notificationRoundFor(alert);
  if (state.notifications.some((item) => item.alertId === alert.id && Number(item.round ?? round) === round && Number(item.tierIndex) === tierIndex && !['canceled', 'disabled'].includes(item.status))) return true;
  if (Number(alert.notificationDelivery?.round) === round && Number(alert.notificationDelivery?.tierIndex) === tierIndex) return true;
  if (Number(alert.notificationDispatch?.round) === round && Number(alert.notificationDispatch?.tierIndex) === tierIndex && alert.notificationDispatch?.status !== 'canceled') return true;
  return !alert.newlyOpened && Number(alert.currentTierIndex ?? 0) === tierIndex;
}

function tierActivatedAt(state, alert, tierIndex, fallback) {
  const round = notificationRoundFor(alert);
  if (Number(alert.notificationDelivery?.round) === round && Number(alert.notificationDelivery?.tierIndex) === tierIndex && alert.notificationDelivery?.attemptedAt) return alert.notificationDelivery.attemptedAt;
  if (Number(alert.notificationDispatch?.round) === round && Number(alert.notificationDispatch?.tierIndex) === tierIndex) {
    const dispatchAt = alert.notificationDispatch.completedAt ?? alert.notificationDispatch.lastAttemptAt ?? alert.notificationDispatch.startedAt;
    if (dispatchAt) return dispatchAt;
  }
  const notificationAt = state.notifications
    .filter((notice) => notice.alertId === alert.id && Number(notice.round ?? round) === round && Number(notice.tierIndex) === tierIndex)
    .map((item) => item.sentAt ?? item.updatedAt ?? item.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  return notificationAt ?? alert.updatedAt ?? alert.openedAt ?? fallback;
}

function policyFor(alert, watcher) {
  const config = basePolicyFor(alert, watcher);
  const recipientOverrides = notificationControlFor(alert).recipientOverrides ?? {};
  return {
    recipientTiers: (config.recipientTiers ?? []).map((tier) => ({ ...tier, recipients: normalizePolicyRecipients(recipientOverrides[tier.id] ?? tier.recipients ?? []) })),
    allClearThreshold: Number(config.allClearThreshold ?? 1),
    alertReceivedThreshold: Number(config.alertReceivedThreshold ?? 1),
    reAlertMinutes: Number(config.reAlertMinutes ?? 30),
    templates: config.templates ?? watcher.config.templates ?? {},
    watcher: config.watcher ?? { name: watcher.name, url: watcher.config.url },
  };
}

function regionPolicy(state, alert, policy) {
  const recipientTiers = policy.recipientTiers.map((tier) => ({ ...tier, recipients: tier.recipients.filter((recipient) => {
    if (!recipientBelongsToActiveTeam(state, recipient, alert?.accountId)) return false;
    return !alert?.regionScoped || !(alert.affectedRegions ?? []).length || recipientWatchesAffectedRegion(state, recipient, alert.affectedRegions, alert.accountId);
  }) }));
  const enabled = recipientTiers.flatMap((tier) => tier.recipients).filter(recipientIsEnabled).length;
  return { ...policy, recipientTiers, allClearThreshold: Math.max(1, Math.min(policy.allClearThreshold, enabled || 1)), alertReceivedThreshold: Math.max(1, Math.min(policy.alertReceivedThreshold, enabled || 1)) };
}

function recipientBelongsToActiveTeam(state, recipient, accountId) {
  if (!recipient?.userId) return true;
  return Boolean(accountId && state.teamMembers?.some((item) => item.accountId === accountId && item.userId === recipient.userId && item.status === 'active'));
}

function recipientWatchesAffectedRegion(state, recipient, affectedRegions, accountId) {
  if (!recipient) return false;
  // An address explicitly added to a watcher tier is not a team member and
  // has no watchingRegions profile. Its owner chose it for this watcher.
  if (!recipient.userId) return true;
  if (!recipientBelongsToActiveTeam(state, recipient, accountId)) return false;
  if (!(affectedRegions ?? []).length) return true;
  const profile = state.userProfiles?.find((item) => item.id === recipient.userId);
  const watched = new Set(profile?.watchingRegions ?? []);
  return affectedRegions.some((region) => watched.has(region));
}

function notificationPolicyForWatcher(watcher) {
  return {
    recipientTiers: (watcher.config.recipientTiers ?? []).map((tier) => ({ ...structuredClone(tier), recipients: normalizePolicyRecipients(tier.recipients ?? []) })),
    allClearThreshold: watcher.config.allClearThreshold,
    alertReceivedThreshold: watcher.config.alertReceivedThreshold,
    reAlertMinutes: watcher.config.reAlertMinutes,
    templates: structuredClone(watcher.config.templates ?? {}),
    watcher: { name: watcher.name, url: watcher.config.url },
  };
}

function basePolicyFor(alert, watcher) {
  return alert.notificationPolicy ?? watcher.config;
}

function notificationControlFor(alert) {
  return alert?.notificationControl ?? { revision: 0, mutedTierIds: [], recipientOverrides: {}, canceledAt: null };
}

function claimNotificationControl(alert, expectedRevision) {
  const current = notificationControlFor(alert);
  const revision = Number(current.revision ?? 0);
  if (!Number.isInteger(Number(expectedRevision)) || Number(expectedRevision) !== revision) {
    throw Object.assign(new Error('Notification activity changed in another tab or worker. Reload it before making another change.'), { statusCode: 409, code: 'NOTIFICATION_ACTIVITY_VERSION_CONFLICT', details: { currentRevision: revision } });
  }
  alert.notificationControl ??= { revision: 0, mutedTierIds: [], recipientOverrides: {}, canceledAt: null, canceledBy: null, updatedAt: null, updatedBy: null };
  alert.notificationControl.mutedTierIds ??= [];
  alert.notificationControl.recipientOverrides ??= {};
  return alert.notificationControl;
}

function tierIsMuted(alert, tier) {
  return Boolean(tier?.id) && (notificationControlFor(alert).mutedTierIds ?? []).includes(tier.id);
}

function nextEligibleTierIndex(policy, afterIndex, control) {
  const muted = new Set(control?.mutedTierIds ?? []);
  for (let index = Math.max(-1, Number(afterIndex)) + 1; index < (policy.recipientTiers?.length ?? 0); index += 1) {
    if (!muted.has(policy.recipientTiers[index]?.id) && (policy.recipientTiers[index]?.recipients ?? []).some(recipientIsEnabled)) return index;
  }
  return null;
}

function activeNotificationAlert(state, watcher) {
  if (!watcher?.openAlertId) return null;
  return state.alerts.find((item) => item.id === watcher.openAlertId && item.watcherId === watcher.id && ['open', 'acknowledged'].includes(item.status)) ?? null;
}

function requireActiveNotificationAlert(state, accountId, watcherId) {
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
  const watcher = state.watchers.find((item) => item.id === watcherId && item.accountId === accountId);
  if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
  const alert = activeNotificationAlert(state, watcher);
  if (!alert || alert.status !== 'open' || alert.recoveryDetectedAt) throw Object.assign(new Error('This watcher has no active notification queue.'), { statusCode: 409, code: 'NO_ACTIVE_NOTIFICATION_ACTIVITY' });
  if (notificationControlFor(alert).canceledAt) throw Object.assign(new Error('Notification activity for this incident has already been canceled.'), { statusCode: 409, code: 'NOTIFICATION_ACTIVITY_CANCELED' });
  return { account, watcher, alert };
}

function normalizeIncidentRecipients(input, config) {
  if (!Array.isArray(input) || !input.length || input.length > 50) throw Object.assign(new Error('Provide between 1 and 50 temporary recipients for this level.'), { statusCode: 400 });
  const seen = new Set();
  return input.map((source, index) => {
    const name = String(source?.name ?? '').trim().slice(0, 120) || `Recipient ${index + 1}`;
    const channel = String(source?.channel ?? 'email');
    if (!['email', 'sms'].includes(channel)) throw Object.assign(new Error(`Recipient ${name} must use email or SMS.`), { statusCode: 400 });
    if (channel === 'sms' && config.smsEnabled === false) throw Object.assign(new Error('SMS notifications are disabled for this deployment.'), { statusCode: 400 });
    const destination = channel === 'email' ? normalizeEmail(source?.destination) : String(source?.destination ?? '').trim();
    if (channel === 'email' && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destination) || destination.length > 320)) throw Object.assign(new Error(`Recipient ${name} needs a valid email address.`), { statusCode: 400 });
    if (channel === 'sms' && !/^\+[1-9]\d{7,14}$/.test(destination)) throw Object.assign(new Error(`Recipient ${name} needs an E.164 phone number.`), { statusCode: 400 });
    let recipientId = /^[A-Za-z0-9_-]{1,128}$/.test(String(source?.id ?? '')) ? String(source.id) : id('temp_rcpt');
    if (seen.has(recipientId)) recipientId = id('temp_rcpt');
    seen.add(recipientId);
    return { id: recipientId, name, channel, destination, enabled: source?.enabled !== false };
  });
}

export function customerNotificationStatus(state, watcher) {
  const alert = activeNotificationAlert(state, watcher);
  if (!alert || alert.status !== 'open' || alert.recoveryDetectedAt || notificationControlFor(alert).canceledAt) return { phase: 'none', label: 'None', alertId: null, tierIndex: null, tierName: null, nextActionAt: null };
  const policy = regionPolicy(state, alert, policyFor(alert, watcher));
  const round = notificationRoundFor(alert);
  const activeNotice = state.notifications.find((item) => item.alertId === alert.id && Number(item.round ?? round) === round && ['sending', 'retry_scheduled'].includes(item.status));
  if (activeNotice) {
    const tier = policy.recipientTiers[Number(activeNotice.tierIndex)];
    const phase = activeNotice.status === 'retry_scheduled' ? 'retrying' : 'notifying';
    return { phase, label: `${tier?.name ?? `Level ${Number(activeNotice.tierIndex) + 1}`} · ${phase === 'retrying' ? 'Retrying' : 'Notifying'}`, alertId: alert.id, tierIndex: Number(activeNotice.tierIndex), tierName: tier?.name ?? null, nextActionAt: activeNotice.retryAt ?? null };
  }
  if (alert.notificationDispatch?.status === 'sending' && Number(alert.notificationDispatch.round) === round) {
    const tierIndex = Number(alert.notificationDispatch.tierIndex);
    const tier = policy.recipientTiers[tierIndex];
    return { phase: 'notifying', label: `${tier?.name ?? `Level ${tierIndex + 1}`} · Notifying`, alertId: alert.id, tierIndex, tierName: tier?.name ?? null, nextActionAt: null };
  }
  if (alert.newlyOpened) {
    const tierIndex = nextEligibleTierIndex(policy, -1, notificationControlFor(alert));
    const tier = tierIndex == null ? null : policy.recipientTiers[tierIndex];
    return tier ? { phase: 'queued', label: `${tier.name || `Level ${tierIndex + 1}`} · Queued`, alertId: alert.id, tierIndex, tierName: tier.name, nextActionAt: null } : { phase: 'none', label: 'None', alertId: alert.id, tierIndex: null, tierName: null, nextActionAt: null };
  }
  if (watcher.status === 'paused' && !alert.escalationCompletedAt && alert.remainingEscalationSecondsBeforeWatcherPause != null) {
    const tierIndex = Math.max(0, Number(alert.currentTierIndex ?? 0));
    const tier = policy.recipientTiers[tierIndex];
    return { phase: 'paused', label: `${tier?.name ?? `Level ${tierIndex + 1}`} · Paused`, alertId: alert.id, tierIndex, tierName: tier?.name ?? null, nextActionAt: null };
  }
  if (!alert.escalationCompletedAt && alert.nextEscalationAt) {
    const tierIndex = Math.max(0, Number(alert.currentTierIndex ?? 0));
    const tier = policy.recipientTiers[tierIndex];
    const phase = watcher.status === 'paused' ? 'paused' : 'waiting';
    return { phase, label: `${tier?.name ?? `Level ${tierIndex + 1}`} · ${phase === 'paused' ? 'Paused' : 'Waiting'}`, alertId: alert.id, tierIndex, tierName: tier?.name ?? null, nextActionAt: alert.nextEscalationAt };
  }
  return { phase: 'none', label: 'None', alertId: alert.id, tierIndex: null, tierName: null, nextActionAt: null };
}

function notificationActivityView(state, watcher, alert, config) {
  if (!alert) return { active: false, watcherId: watcher.id, watcherName: watcher.name, status: customerNotificationStatus(state, watcher), checkStatus: customerWatcherCheckStatus(state, watcher, config.awsRegion), alert: null, revision: 0, tiers: [], canCancel: false };
  const incidentDetails = notificationIncidentDetails(alert, watcher);
  const policy = policyFor(alert, watcher);
  const eligiblePolicy = regionPolicy(state, alert, policy);
  const control = notificationControlFor(alert);
  const round = notificationRoundFor(alert);
  const currentTierIndex = alert.newlyOpened ? -1 : Math.max(0, Number(alert.currentTierIndex ?? 0));
  const canceled = Boolean(control.canceledAt);
  const active = alert.status === 'open' && !alert.recoveryDetectedAt && !canceled;
  const tiers = policy.recipientTiers.map((tier, tierIndex) => {
    const activated = tierWasActivated(state, alert, tierIndex);
    const muted = tierIsMuted(alert, tier);
    const deliveries = state.notifications
      .filter((item) => item.alertId === alert.id && Number(item.round ?? round) === round && Number(item.tierIndex) === tierIndex)
      .map((notice) => ({ id: notice.id, recipientId: notice.recipientId, channel: notice.channel, destination: notice.destination, status: notice.status,
        detail: notice.status === 'suppressed' && notice.error === 'Account daily notification limit reached.' ? notice.error : null,
        createdAt: notice.createdAt ?? null, sentAt: notice.sentAt ?? null, retryAt: notice.retryAt ?? null }));
    let stateName = 'queued';
    if (canceled) stateName = 'canceled';
    else if (muted) stateName = 'muted';
    else if (alert.notificationDispatch?.status === 'sending' && Number(alert.notificationDispatch.round) === round && Number(alert.notificationDispatch.tierIndex) === tierIndex) stateName = 'notifying';
    else if (deliveries.some((item) => item.status === 'retry_scheduled')) stateName = 'retrying';
    else if (tierIndex === currentTierIndex && watcher.status === 'paused' && alert.remainingEscalationSecondsBeforeWatcherPause != null) stateName = 'paused';
    else if (tierIndex === currentTierIndex && alert.nextEscalationAt) stateName = 'waiting';
    else if (deliveries.length && deliveries.every((item) => item.status === 'suppressed')) stateName = 'suppressed';
    else if (activated) stateName = 'notified';
    else if (active && !eligiblePolicy.recipientTiers[tierIndex].recipients.some(recipientIsEnabled)) stateName = 'ineligible';
    const dispatching = alert.notificationDispatch?.status === 'sending' && Number(alert.notificationDispatch.round) === round && Number(alert.notificationDispatch.tierIndex) === tierIndex;
    const canEdit = active && !muted && !activated;
    const canUnmute = active && muted && !activated && tierIndex > currentTierIndex;
    const canMute = active && !muted && (!activated || dispatching || (tierIndex === currentTierIndex && watcher.status !== 'paused' && !alert.escalationCompletedAt));
    return {
      id: tier.id,
      index: tierIndex,
      name: tier.name || `Level ${tierIndex + 1}`,
      delayMinutes: Number(tier.delayMinutes ?? 1),
      requiredAcknowledgements: Number(tier.requiredAcknowledgements ?? 1),
      state: stateName,
      scheduledFor: tierIndex === nextEligibleTierIndex(eligiblePolicy, currentTierIndex, control) ? alert.nextEscalationAt ?? null : null,
      recipients: tier.recipients.map((recipient) => ({ id: recipient.id, name: recipient.name, channel: recipient.channel, destination: recipient.destination, enabled: recipient.enabled !== false })),
      deliveries,
      canEdit,
      canMute,
      canUnmute,
      isTemporary: Object.prototype.hasOwnProperty.call(control.recipientOverrides ?? {}, tier.id),
    };
  });
  return {
    active,
    watcherId: watcher.id,
    watcherName: watcher.name,
    status: customerNotificationStatus(state, watcher),
    checkStatus: customerWatcherCheckStatus(state, watcher, config.awsRegion),
    alert: { id: alert.id, kind: alert.kind, kindLabel: incidentDetails.kindLabel,
      incident: incidentDetails.incident,
      summary: incidentDetails.summary,
      openedAt: alert.openedAt, status: alert.status, round, canceledAt: control.canceledAt ?? null, canceledBy: control.canceledBy ?? null },
    revision: Number(control.revision ?? 0),
    tiers,
    canCancel: active,
    capabilities: { sms: config.smsEnabled !== false },
  };
}


function alertMayNotify(alert) {
  return Boolean(alert) && ['open', 'acknowledged'].includes(alert.status) && !alert.recoveryDetectedAt && !notificationControlFor(alert).canceledAt;
}

function blockedTierClaim(reason, details = {}) {
  return { blocked: true, reason, ...details };
}

function notificationRoundFor(alert) {
  const round = Number(alert?.notificationRound);
  return Number.isSafeInteger(round) && round >= 1 ? round : 1;
}

function notificationAttemptEvidence(state, alert, round) {
  const notificationCount = state.notifications.filter((item) => item.alertId === alert.id && Number(item.round ?? round) === round).length;
  const deliveryAttempts = Number(alert.notificationDelivery?.round) === round ? Math.max(0, Number(alert.notificationDelivery?.attempted ?? 0) || 0) : 0;
  const keyPrefix = `${alert.id}:${round}:`;
  const recipientClaimCount = state.idempotency.filter((item) => item.scope === 'notification' && String(item.key ?? '').startsWith(keyPrefix)).length;
  return { notificationCount, deliveryAttempts, recipientClaimCount };
}

function isZeroAttemptRepairCandidate(state, alert, round, tierIndex) {
  const attemptEvidence = notificationAttemptEvidence(state, alert, round);
  const storedTierIndex = Math.max(0, Number(alert.currentTierIndex ?? 0));
  const dispatchForRound = Number(alert.notificationDispatch?.round) === round ? alert.notificationDispatch : null;
  const dispatchIsInactive = !dispatchForRound || ['completed', 'canceled'].includes(dispatchForRound.status);
  return alert.status === 'open'
    && !alert.newlyOpened
    && !alert.sendAgain
    && !alert.recoveryDetectedAt
    && !notificationControlFor(alert).canceledAt
    && !(alert.responses ?? []).length
    && tierIndex === 0
    && tierIndex === storedTierIndex
    && dispatchIsInactive
    && attemptEvidence.notificationCount === 0
    && attemptEvidence.deliveryAttempts === 0
    && attemptEvidence.recipientClaimCount === 0;
}

function recipientIsEnabled(recipient) {
  return Boolean(recipient) && recipient.enabled !== false;
}

function normalizePolicyRecipients(recipients) {
  return structuredClone(recipients).map((recipient) => ({ ...recipient, enabled: recipient?.enabled !== false }));
}

function watcherMayNotify(watcher) {
  // A check owns the watcher capture lease, not the notification state. Treating
  // `checking` as paused used to discard tier-completion commits whenever a
  // second check began while SES was still accepting the first alert emails.
  return Boolean(watcher) && ['active', 'checking'].includes(watcher.status);
}

async function mapWithConcurrency(items, concurrency, worker) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, run));
  return results;
}

function uniqueCode(state) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomBytes(6).toString('base64url').replace(/[-_]/g, '').slice(0, 8).toUpperCase();
    if (code.length >= 6 && !state.notifications.some((item) => item.responseCode === code)) return code;
  }
  throw new Error('Could not allocate a unique alert response code.');
}
function fallbackAlertEmail(context, message) {
  const alertType = String(context.alert?.kindLabel || 'Website change');
  const watcherName = String(context.watcher?.name || 'Website watcher');
  const watcherUrl = String(context.watcher?.url || 'Unavailable');
  const responseUrl = String(context.responseUrl || '');
  const responseCode = String(context.responseCode || 'Unavailable');
  const unsubscribeUrl = String(context.unsubscribeUrl || '');
  const incidentDetails = [context.alert?.incidentDescription, context.alert?.outageScopeLabel ? `Coverage: ${context.alert.outageScopeLabel}` : '', context.alert?.affectedRegionsLabel ? `Affected regions: ${context.alert.affectedRegionsLabel}` : '', context.alert?.triggerMatchesLabel ? `Trigger phrases: ${context.alert.triggerMatchesLabel}` : ''].filter(Boolean).join('\n');
  const text = `CLOVERSIGHT — ${alertType}\n\n${incidentDetails}\n\n${message}\n\nWatcher: ${watcherName}\nMonitored URL: ${watcherUrl}\n\nRespond: ${responseUrl}\nReply with “Alert Received” or “All Clear”.\nResponse code: ${responseCode}\n\nUnsubscribe from customer monitoring alerts and team invitations: ${unsubscribeUrl}`;
  const html = `<main style="max-width:640px;margin:24px auto;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1C191B"><p style="color:#6B224F;font-weight:700">CLOVERSIGHT</p><h1>${escapeHtml(alertType)}</h1><p style="white-space:pre-wrap">${escapeHtml(incidentDetails)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p><p><strong>Watcher:</strong> ${escapeHtml(watcherName)}<br><strong>Monitored URL:</strong> ${escapeHtml(watcherUrl)}</p><p><a href="${escapeHtml(responseUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#087A4A;color:#FFFFFF;text-decoration:none;font-weight:700">Respond to alert</a></p><p>Reply with <strong>Alert Received</strong> or <strong>All Clear</strong>.<br>Response code: <strong>${escapeHtml(responseCode)}</strong></p><hr><p style="font-size:12px;color:#766E76">Do not want customer monitoring alert email? <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe this address</a>.</p></main>`;
  return { text, html };
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

function normalizePhone(value) { return `+${String(value ?? '').replace(/\D/g, '')}`; }

function isStaleProviderClaim(event, nowIso = ISO()) {
  if (!event?.lastAttemptAt) return true;
  return Date.parse(nowIso) - Date.parse(event.lastAttemptAt) >= 5 * 60_000;
}

function validateEmailAddress(value) {
  const email = normalizeEmail(value);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 320) throw Object.assign(new Error('Enter a valid email address.'), { statusCode: 400 });
  return email;
}

function requireSuppressionOwner(actor) {
  if (actor?.role !== 'steward' || actor.stewardRole !== 'owner') throw Object.assign(new Error('Platform owner access is required to change the email block list.'), { statusCode: 403 });
}

function requireProviderAcceptance(result) {
  if (!result?.providerId || result.failed || result.deliveryState === 'ambiguous') throw Object.assign(new Error('The provider did not confirm message acceptance.'), { deliveryState: result?.deliveryState === 'failed' ? 'failed' : 'ambiguous' });
}

function activeNotificationAccount(state, accountId) {
  return state.accounts.some((item) => item.id === accountId && item.closureStatus === 'active');
}

function closedAccountDelivery() {
  return { canceled: true, deliveryState: 'canceled', reason: 'Delivery canceled because the monitoring account is no longer active.' };
}

function emailSuppressionReason(suppression) {
  return isProviderEmailSuppression(suppression) ? 'The email provider has restricted this address after a bounce or complaint.' : 'Customer alert and invitation email is blocked for this address.';
}

function isProviderEmailSuppression(item) {
  return item.scope === 'provider' || ['ses_bounce', 'ses_complaint', 'provider_bounce', 'provider_complaint'].includes(item.source);
}

function findEmailSuppression(state, value, { providerOnly = false } = {}) {
  const email = normalizeEmail(value);
  // Legacy steward/recipient-link records remain customer blocks. Operational
  // notices only consult explicit provider restrictions; SES also retains its
  // own account-level suppression and bounce/complaint enforcement.
  return (state.emailSuppressions ?? []).find((item) => item.email === email && (!providerOnly || isProviderEmailSuppression(item))) ?? null;
}

function suppressPendingEmailDeliveries(state, email, now = ISO(), limit = 75) {
  let count = 0;
  for (const notice of state.notifications.filter((item) => item.channel === 'email' && normalizeEmail(item.destination) === email && ['sending', 'retry_scheduled'].includes(item.status))) {
    notice.status = 'suppressed'; notice.deliveryState = 'suppressed'; notice.retryAt = null; notice.updatedAt = now; notice.error = 'Customer alert and invitation email is blocked for this address.'; count += 1;
    // Keep this global command inside DynamoDB's transaction item limit. Any
    // additional delivery is still blocked by the final pre-transport check.
    if (count >= limit) break;
  }
  return count;
}
