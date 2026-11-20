import { updateWatcherUsage, captureNotBefore, releaseFundedCaptureHold } from '../domain/usage-guards.mjs';
import { scheduleAfterEdit } from '../monitoring/schedule.mjs';
import { ISO, addSeconds } from '../lib.mjs';
import { appendAudit } from './audit.mjs';
import { entitlements, validateWatcherForPlan } from '../domain/plans.mjs';
import { normalizeCheckRegions } from '../domain/regions.mjs';

export class ActionLogService {
  constructor({ store, config = {} }) { Object.assign(this, { store, config }); }

  async list(accountId, actor, limit = 100) {
    const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: ['TEAMMEMBERS#', 'AUDITEVENTS#'] }) : await this.store.read(); requireOwner(state, accountId, actor.actorId);
    const account = state.accounts.find((item) => item.id === accountId);
    const days = account ? entitlements(account).actionHistoryDays : 0;
    const cutoff = Number.isFinite(days) ? new Date(Date.now() - days * 86400_000).toISOString() : null;
    return state.auditEvents.filter((item) => item.accountId === accountId && item.action.startsWith('watcher.') && (!cutoff || item.at >= cutoff)).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, Math.max(1, Math.min(200, Number(limit) || 100))).map(actionEventView);
  }

  async revert(accountId, eventId, actor) {
    return this.store.transact('watcher.audit.revert', (state) => {
      requireOwner(state, accountId, actor.actorId);
      const event = state.auditEvents.find((item) => item.id === eventId && item.accountId === accountId && item.action.startsWith('watcher.'));
      if (!event) throw Object.assign(new Error('Action-log event not found.'), { statusCode: 404 });
      const account = state.accounts.find((item) => item.id === accountId);
      const days = account ? entitlements(account).actionHistoryDays : 0;
      const cutoff = Number.isFinite(days) ? Date.now() - days * 86400_000 : null;
      if (cutoff != null && Date.parse(event.at ?? 0) < cutoff) throw Object.assign(new Error('Action-log event is outside this plan’s retention window.'), { statusCode: 404, code: 'ACTION_EVENT_EXPIRED' });
      if (event.revertedAt) throw Object.assign(new Error('This action has already been reverted.'), { statusCode: 409 });
      const current = state.watchers.find((item) => item.id === event.targetId && item.accountId === accountId);
      const before = event.metadata?.before ? structuredClone(event.metadata.before) : null;
      const currentSnapshot = current ? structuredClone(current) : null;
      let restored;
      if (!before && event.action === 'watcher.created') {
        if (!current || current.status === 'deleted') throw Object.assign(new Error('This creation has already been reverted.'), { statusCode: 409 });
        const now = ISO(); current.previousStatusBeforeDelete = current.status; current.status = 'deleted'; current.deletedAt = now; current.deletedBy = actor.actorId; current.nextCheckAt = null; current.leaseOwner = null; current.leaseExpiresAt = null; current.configRevision = Number(current.configRevision ?? 1) + 1; current.updatedAt = now; closeWatcherAlerts(state, current.id, now); restored = current;
      } else if (before) {
        const revision = Number(current?.configRevision ?? before.configRevision ?? 1) + 1;
        restored = { ...(current ?? before), name: before.name, config: structuredClone(before.config), status: before.status, id: event.targetId, accountId, configRevision: revision, updatedAt: ISO() };
        if (restored.status !== 'deleted') { restored.deletedAt = null; restored.deletedBy = null; }
        if (restored.status === 'checking') { restored.status = 'active'; restored.leaseOwner = null; restored.leaseExpiresAt = null; }
        if (restored.status !== 'deleted') assertRevertEntitlements(state, accountId, current, restored, this.config);
        const index = state.watchers.findIndex((item) => item.id === event.targetId && item.accountId === accountId);
        if (index >= 0) state.watchers[index] = restored; else state.watchers.push(restored);
        synchronizeRestoredWatcher(state, restored, restored.updatedAt);
      } else throw Object.assign(new Error('This event does not contain a reversible watcher snapshot.'), { statusCode: 409 });
      updateWatcherUsage(account, currentSnapshot, restored);
      event.revertedAt = ISO(); event.revertedBy = actor.actorId;
      appendAudit(state, actor, 'watcher.reverted', { accountId, targetId: event.targetId, requestId: actor.requestId, metadata: { revertedEventId: event.id, before: currentSnapshot, afterSummary: { name: restored.name, status: restored.status, configRevision: restored.configRevision, updatedAt: restored.updatedAt, checkRegions: [...(restored.config?.checkRegions ?? [])] } } });
      return restored;
    });
  }
}

function assertRevertEntitlements(state, accountId, current, restored, config) {
  const account = state.accounts.find((item) => item.id === accountId && item.closureStatus === 'active');
  if (!account) throw Object.assign(new Error('The account is unavailable for watcher recovery.'), { statusCode: 409, code: 'ACTION_REVERT_ACCOUNT_UNAVAILABLE' });
  const availableRegions = Array.isArray(config.availableCheckRegions) && config.availableCheckRegions.length ? config.availableCheckRegions : [config.awsRegion ?? 'us-east-1'];
  const configuredRegions = restored.config?.checkRegions ?? [];
  if (normalizeCheckRegions(configuredRegions, availableRegions).length !== configuredRegions.length) {
    throw Object.assign(new Error('This watcher used a regional location that is no longer deployed.'), { statusCode: 409, code: 'ACTION_REVERT_REGION_UNAVAILABLE' });
  }
  const liveWatchers = state.watchers.filter((item) => item.accountId === accountId && item.status !== 'deleted');
  const currentIsLive = Boolean(current && current.status !== 'deleted');
  const regionalOtherCount = liveWatchers.filter((item) => item.id !== restored.id && item.config?.checkRegions?.length).length;
  const result = validateWatcherForPlan(restored.config, account, liveWatchers.length, !currentIsLive, new Date(), regionalOtherCount, Boolean(currentIsLive && current.config?.checkRegions?.length));
  if (result.errors.length) {
    throw Object.assign(new Error(`This watcher cannot be restored under the current plan: ${result.errors.join(' ')}`), { statusCode: 409, code: 'ACTION_REVERT_PLAN_CONFLICT', details: result.errors });
  }
}

function requireOwner(state, accountId, userId) {
  const member = state.teamMembers.find((item) => item.accountId === accountId && item.userId === userId && item.status === 'active' && item.role === 'owner');
  if (!member) throw Object.assign(new Error('Only the account owner can access the action log.'), { statusCode: 403, code: 'OWNER_REQUIRED' });
}

function actionEventView(event) {
  const metadata = structuredClone(event.metadata ?? {});
  const before = metadata.before;
  const after = metadata.after;
  delete metadata.before;
  delete metadata.after;
  if (before) metadata.beforeSummary = watcherSummary(before);
  if (after && !metadata.afterSummary) metadata.afterSummary = watcherSummary(after);
  return { ...event, metadata, reversible: !event.revertedAt && Boolean(before || event.action === 'watcher.created') };
}

function watcherSummary(watcher) {
  return { name: watcher.name, status: watcher.status, configRevision: watcher.configRevision, updatedAt: watcher.updatedAt, checkRegions: [...(watcher.config?.checkRegions ?? [])] };
}

function closeWatcherAlerts(state, watcherId, now) {
  for (const alert of state.alerts.filter((item) => item.watcherId === watcherId && ['open', 'acknowledged', 'resolving'].includes(item.status))) {
    alert.status = 'closed_by_watcher_delete'; alert.resolvedAt = now; alert.nextEscalationAt = null; alert.nextReAlertAt = null; alert.updatedAt = now;
    if (alert.notificationDispatch?.status === 'sending') { alert.notificationDispatch.status = 'canceled'; alert.notificationDispatch.canceledAt = now; }
  }
  for (const notice of state.notifications.filter((item) => item.watcherId === watcherId && ['sending', 'retry_scheduled'].includes(item.status))) {
    notice.status = 'canceled'; notice.retryAt = null; notice.updatedAt = now; notice.error = 'Canceled because the watcher was removed by an action-log revert.';
  }
}

function synchronizeRestoredWatcher(state, watcher, now) {
  if (watcher.status === 'deleted') { closeWatcherAlerts(state, watcher.id, now); return; }
  const policy = notificationPolicyFor(watcher);
  const activeAlerts = state.alerts.filter((item) => item.watcherId === watcher.id && ['open', 'acknowledged'].includes(item.status));
  if (watcher.status !== 'active') {
    watcher.leaseOwner = null;
    watcher.leaseExpiresAt = null;
    for (const alert of activeAlerts) {
      if (!alert.notificationsPausedAt) {
        alert.remainingEscalationSecondsBeforeWatcherPause = remainingSeconds(alert.nextEscalationAt, now);
        alert.remainingReAlertSecondsBeforeWatcherPause = remainingSeconds(alert.nextReAlertAt, now);
        alert.notificationRound = Number(alert.notificationRound ?? 0) + 1;
      }
      alert.notificationPolicy = structuredClone(policy);
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
    cancelPendingNotices(state, watcher.id, now, 'Canceled because an action-log revert restored a non-active watcher state.');
    return;
  }
  const account = state.accounts.find((item) => item.id === watcher.accountId);
  if (account) releaseFundedCaptureHold(watcher, account);
  watcher.nextCheckAt = scheduleAfterEdit(watcher, now, account ? captureNotBefore(watcher, account) : 0);
  for (const alert of activeAlerts) {
    alert.notificationPolicy = structuredClone(policy);
    alert.notificationPolicyRefreshPending = true;
    if (alert.notificationsPausedAt) {
      if (!alert.recoveryDetectedAt) {
        alert.nextEscalationAt = restoreTimer(now, alert.remainingEscalationSecondsBeforeWatcherPause);
        alert.nextReAlertAt = restoreTimer(now, alert.remainingReAlertSecondsBeforeWatcherPause);
      }
      alert.notificationsPausedAt = null;
      alert.remainingEscalationSecondsBeforeWatcherPause = null;
      alert.remainingReAlertSecondsBeforeWatcherPause = null;
    } else {
      alert.nextEscalationAt = null;
      alert.nextReAlertAt = null;
    }
    alert.updatedAt = now;
  }
}

function cancelPendingNotices(state, watcherId, now, reason) {
  for (const notice of state.notifications.filter((item) => item.watcherId === watcherId && ['sending', 'retry_scheduled'].includes(item.status))) {
    notice.status = 'canceled'; notice.retryAt = null; notice.updatedAt = now; notice.error = reason;
  }
}

function notificationPolicyFor(watcher) {
  return {
    recipientTiers: structuredClone(watcher.config?.recipientTiers ?? []),
    allClearThreshold: watcher.config?.allClearThreshold,
    alertReceivedThreshold: watcher.config?.alertReceivedThreshold,
    reAlertMinutes: watcher.config?.reAlertMinutes,
    templates: structuredClone(watcher.config?.templates ?? {}),
    watcher: { name: watcher.name, url: watcher.config?.url },
  };
}

function remainingSeconds(target, now) {
  if (!target) return null;
  const seconds = Math.ceil((Date.parse(target) - Date.parse(now)) / 1000);
  return Number.isFinite(seconds) ? Math.max(60, seconds) : null;
}

function restoreTimer(now, seconds) {
  return Number.isFinite(seconds) ? addSeconds(now, Math.max(60, seconds)) : null;
}
