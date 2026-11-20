import { entitlements } from '../domain/plans.mjs';
import { id, ISO } from '../lib.mjs';

export class MaintenanceService {
  constructor({ notifier, billing, accounts, assets, store, config, logger, monitoring = null, taskState = null }) { Object.assign(this, { notifier, billing, accounts, assets, store, config, logger, monitoring, taskState }); this.running = false; this.lastTechnicalAlertAt = 0; }

  async #cleanupExpiredRecords() {
    if (!this.store) return 0;
    const nowMs = Date.now();
    const nowEpoch = Math.floor(nowMs / 1000);
    return this.store.transact('maintenance.expired_records', (state) => {
      const accounts = new Map(state.accounts.map((account) => [account.id, account]));
      const expirations = {
        idempotency: (item) => Number(item.expiresAtEpoch ?? Infinity) * 1000,
        providerEvents: (item) => Number(item.expiresAtEpoch ?? Infinity) * 1000,
        emailUnsubscribeLinks: (item) => Math.min(Number(item.expiresAtEpoch ?? Infinity) * 1000, Number.isFinite(Date.parse(item.expiresAt ?? '')) ? Date.parse(item.expiresAt) : Infinity),
        jobs: (item) => item.type === 'capture-result' ? Date.parse(item.createdAt ?? '') + 2 * 86400_000
          : ['completed', 'failed', 'skipped'].includes(item.status) ? Date.parse(item.completedAt ?? item.requestedAt ?? '') + 30 * 86400_000 : Infinity,
        auditEvents: (item) => {
          if (!item.action?.startsWith('watcher.')) return Infinity;
          const account = accounts.get(item.accountId);
          if (!account) return Infinity;
          const days = entitlements(account).actionHistoryDays;
          return Number.isFinite(days) ? Date.parse(item.at ?? '') + days * 86400_000 : Infinity;
        },
      };
      const queues = Object.entries(expirations).map(([collection, expiresAt]) => ({ collection, candidates: (state[collection] ?? []).map((item) => ({ item, expiresAt: expiresAt(item) })).filter((row) => row.expiresAt <= nowEpoch * 1000).sort((left, right) => left.expiresAt - right.expiresAt), selected: new Set() }));
      const eligibleBefore = queues.reduce((sum, queue) => sum + queue.candidates.length, 0);
      const oldestExpiry = Math.min(...queues.filter((queue) => queue.candidates.length).map((queue) => queue.candidates[0].expiresAt));
      // Share the transaction budget across classes, then reuse any spare
      // capacity. One busy class no longer has a permanent four/25-item ceiling.
      let removed = 0;
      while (removed < 90) {
        let progressed = false;
        for (const queue of queues) {
          if (removed >= 90 || !queue.candidates.length) continue;
          const { item } = queue.candidates.shift();
          queue.selected.add(queue.collection === 'idempotency' ? item.key : item.id);
          removed += 1; progressed = true;
        }
        if (!progressed) break;
      }
      for (const queue of queues) state[queue.collection] = (state[queue.collection] ?? []).filter((item) => !queue.selected.has(queue.collection === 'idempotency' ? item.key : item.id));
      return { removed, eligibleBefore, remaining: eligibleBefore - removed, oldestExpiredAgeSeconds: Number.isFinite(oldestExpiry) ? Math.max(0, Math.floor((nowMs - oldestExpiry) / 1000)) : 0 };
    });
  }

  async #cleanupSnapshotMetadata() {
    if (!this.store) return 0;
    return this.store.transact('maintenance.snapshot_metadata', (state) => {
      const protectedIds = new Set();
      for (const watcher of state.watchers) {
        if (watcher.baselineSnapshotId) protectedIds.add(watcher.baselineSnapshotId);
        // Keep the latest metadata pointer for every live/paused watcher even
        // after its customer-visible history horizon. Its durable regional
        // evidence pointer remains the next capture's hot comparison source.
        if (watcher.status !== 'deleted' && watcher.latestSnapshotId) protectedIds.add(watcher.latestSnapshotId);
      }
      for (const alert of state.alerts) for (const snapshotId of [alert.baselineSnapshotId, alert.firstSnapshotId, alert.latestSnapshotId]) if (snapshotId) protectedIds.add(snapshotId);
      const accounts = new Map(state.accounts.map((account) => [account.id, account]));
      const nowMs = Date.now();
      const candidates = state.snapshots.map((item) => {
        const account = accounts.get(item.accountId);
        const days = account ? entitlements(account).historyDays : this.config.snapshotRetentionDays;
        return { item, expiresAt: Number.isFinite(days) ? Date.parse(item.capturedAt) + days * 86400_000 : Infinity };
      }).filter((row) => row.expiresAt < nowMs && !protectedIds.has(row.item.id)).sort((left, right) => left.expiresAt - right.expiresAt);
      const expired = new Set(candidates.slice(0, 90).map((row) => row.item.id));
      state.snapshots = state.snapshots.filter((item) => !expired.has(item.id));
      return { removed: expired.size, eligibleBefore: candidates.length, remaining: candidates.length - expired.size, oldestExpiredAgeSeconds: candidates.length ? Math.max(0, Math.floor((nowMs - candidates[0].expiresAt) / 1000)) : 0 };
    });
  }

  async #deletionConfirmations() {
    let completed = 0;
    const failures = [];
    for (const account of await this.accounts.pendingDeletionConfirmations()) {
      try {
        if (account.status === 'assets_pending') {
          if (typeof this.accounts.purgeDeletionIdentities === 'function') {
            const identities = await this.accounts.purgeDeletionIdentities(account.accountId);
            if (identities.status !== 'completed') throw Object.assign(new Error('Account identity deletion requires retry or review.'), { code: 'DELETION_IDENTITY_PENDING' });
          }
          await this.assets.removeAccount(account.accountId);
          await this.accounts.confirmDeletionAssets(account.accountId);
        }
        if (['ambiguous', 'manual_review'].includes(account.notificationState)) continue;
        const attempt = await this.accounts.beginDeletionNotification(account.accountId);
        if (!attempt.claimed) continue;
        const attemptId = attempt.attemptId;
        let outcome;
        try { outcome = await this.notifier.sendAccountDeletionConfirmation(account.contactEmail, account.legalName); }
        catch (error) {
          outcome = { deliveryState: error.deliveryState ?? 'failed', reason: error.code ?? error.name ?? 'DELETION_NOTIFICATION_FAILED' };
          await this.accounts.recordDeletionNotificationOutcome(account.accountId, outcome, attemptId);
          throw error;
        }
        if (!['accepted', 'local_queued'].includes(outcome?.deliveryState)) {
          await this.accounts.recordDeletionNotificationOutcome(account.accountId, outcome ?? { deliveryState: 'ambiguous', reason: 'MISSING_PROVIDER_OUTCOME' }, attemptId);
          throw Object.assign(new Error('Deletion confirmation was not accepted by its transport.'), { code: 'DELETION_NOTIFICATION_NOT_ACCEPTED' });
        }
        const providerMessageId = outcome.providerMessageId ?? outcome.providerId ?? null;
        let confirmation;
        try { confirmation = await this.accounts.confirmDeletionNotification(account.accountId, { ...outcome, providerMessageId }, attemptId); }
        catch (error) {
          await this.accounts.recordDeletionNotificationOutcome(account.accountId, { deliveryState: 'ambiguous', providerMessageId, reason: 'LOCAL_ACCEPTANCE_COMMIT_FAILED' }, attemptId);
          throw error;
        }
        if (confirmation?.recorded === false) {
          this.logger.warn('maintenance.deletion.notice_claim_lost', { accountId: account.accountId, code: 'STALE_NOTICE_ATTEMPT' });
          continue;
        }
        completed += 1;
      } catch (error) {
        this.logger.error('maintenance.deletion.failed', { accountId: account.accountId, code: error.code ?? error.name });
        failures.push(error);
      }
    }
    if (failures.length) throw Object.assign(new AggregateError(failures, `${failures.length} account deletion stages require retry or review.`), { code: 'DELETION_STAGES_PENDING' });
    return { deletionConfirmations: completed };
  }

  async #task(task, execute, options) {
    let claim;
    let result;
    try {
      claim = this.taskState ? await this.taskState.claim(task, options) : { claimed: true };
      if (!claim.claimed) {
        this.logger.info('maintenance.task.deferred', { task, reason: claim.reason, retryAt: claim.state?.retryAt ?? null, lastSucceededAt: claim.state?.lastSucceededAt ?? null });
        return { task, status: claim.reason === 'already-completed' ? 'completed' : 'deferred', lastSucceededAt: claim.state?.lastSucceededAt ?? null };
      }
      result = await execute();
      const state = this.taskState ? await this.taskState.finish(task, { leaseToken: claim.leaseToken, success: true, state: claim.state, deliveryState: result?.deliveryState, providerMessageId: result?.providerMessageId ?? result?.providerId ?? null }) : null;
      this.logger.info('maintenance.task.succeeded', { task, scheduledAt: options.scheduledAt, lastSucceededAt: state?.lastSucceededAt ?? ISO(), ...(result && typeof result === 'object' && !Array.isArray(result) ? result : { count: Array.isArray(result) ? result.length : Number(result) || 0 }) });
      return { task, status: 'completed', lastSucceededAt: state?.lastSucceededAt ?? ISO() };
    } catch (error) {
      if (task === 'failure-notice' && ['accepted', 'local_queued'].includes(result?.deliveryState)) error.deliveryState = 'ambiguous';
      let retryAt = null;
      if (claim?.claimed && this.taskState) {
        try { retryAt = (await this.taskState.finish(task, { leaseToken: claim.leaseToken, success: false, error, state: claim.state, providerMessageId: result?.providerMessageId ?? result?.providerId ?? null })).retryAt; }
        catch (stateError) { this.logger.error('maintenance.task.state_failed', { task, code: stateError.code ?? stateError.name }); }
      }
      this.logger.error('maintenance.task.failed', { task, code: error.code ?? error.name, retryAt });
      return { task, status: 'failed', error };
    }
  }

  async #failureNotice(tasks, options) {
    const hour = new Date(Math.floor(Date.now() / 3600_000) * 3600_000).toISOString();
    if (!this.taskState && Date.now() - this.lastTechnicalAlertAt <= 3600_000) return;
    const notice = await this.#task('failure-notice', async () => {
      const result = await this.notifier.sendTechnicalAlert('[CLOVERSIGHT] Maintenance pipeline failure', `Maintenance tasks require attention: ${tasks.map((item) => item.task).join(', ')}.\n\nInspect the maintenance task failure logs and durable retry state. Notices are limited to one accepted message per hour.`, { notificationId: `maintenance:${hour}` });
      if (!['accepted', 'local_queued'].includes(result?.deliveryState)) throw Object.assign(new Error('Maintenance notice was not accepted.'), { code: result?.skipped ? 'TECHNICAL_ALERT_DISABLED' : 'TECHNICAL_ALERT_NOT_ACCEPTED', deliveryState: result?.deliveryState ?? 'ambiguous' });
      this.lastTechnicalAlertAt = Date.now();
      return { deliveryState: result.deliveryState, providerMessageId: result.providerId ?? null };
    }, { ...options, scheduledAt: hour });
    if (notice.status !== 'completed') this.logger.error('maintenance.alert.failed', { status: notice.status });
  }

  async tick({ runCleanup = true, requestedAt = ISO(), owner = id('maintenance'), strict = false } = {}) {
    if (this.running) {
      if (strict) throw Object.assign(new Error('Maintenance is already running in this worker.'), { code: 'MAINTENANCE_BUSY' });
      return { healthy: false, deferred: true };
    }
    this.running = true;
    try {
      const scheduledAt = new Date(Math.floor(Date.parse(requestedAt) / 60_000) * 60_000).toISOString();
      const options = { scheduledAt, owner, leaseSeconds: 660 };
      const tasks = [];
      // Independent claims keep notification failure from hiding deadline,
      // financial or erasure work. Existing services retain their own durable
      // provider/idempotency decisions; these leases do not imply exactly once.
      const urgent = [
        ['billing-cancellations', () => this.billing.processCancellations?.() ?? 0],
        ['closure-transitions', () => this.accounts.processClosureTransitions?.() ?? 0],
        ['notifications', () => this.notifier.processTimers()],
        ['billing-retries', () => this.billing.processRetries()],
        ['billing-refunds', () => this.billing.processRefunds()],
        ['capture-resumptions', () => this.billing.processCaptureResumptions?.() ?? 0],
        ['capture-deadlines', () => this.monitoring?.expireRuns?.() ?? 0],
        ['account-purge', () => this.accounts.purgeDue()],
        ['deletion-confirmations', () => this.#deletionConfirmations()],
      ];
      for (const [task, execute] of urgent) tasks.push(await this.#task(task, execute, options));
      const cleanup = [
        ['history-assets', () => this.assets.cleanupHistory(new Date(Date.now() - this.config.snapshotRetentionDays * 86400_000))],
        ['snapshot-metadata', () => this.#cleanupSnapshotMetadata()],
        ['expired-records', () => this.#cleanupExpiredRecords()],
      ];
      let retryCleanup = [];
      if (!runCleanup && this.taskState?.pendingTasks) {
        try { retryCleanup = await this.taskState.pendingTasks(cleanup.map(([task]) => task)); }
        catch (error) {
          this.logger.error('maintenance.task.state_failed', { task: 'cleanup-retry-discovery', code: error.code ?? error.name });
          tasks.push({ task: 'cleanup-retry-discovery', status: 'failed', error });
        }
      }
      if (runCleanup || retryCleanup.length) {
        const cleanupOptions = { ...options, scheduledAt: new Date(Math.floor(Date.parse(scheduledAt) / 900_000) * 900_000).toISOString() };
        for (const [task, execute] of cleanup) if (runCleanup || retryCleanup.includes(task)) tasks.push(await this.#task(task, execute, cleanupOptions));
      }
      const failures = tasks.filter((item) => item.status === 'failed');
      const deferred = tasks.filter((item) => item.status === 'deferred');
      const staleSuccess = tasks.some((item) => item.status === 'completed' && (!item.lastSucceededAt || Date.now() - Date.parse(item.lastSucceededAt) > (cleanup.some(([task]) => task === item.task) ? 20 * 60_000 : 5 * 60_000)));
      const result = { healthy: failures.length === 0 && deferred.length === 0 && !staleSuccess, failedTasks: failures.map((item) => item.task), deferredTasks: deferred.map((item) => item.task), staleSuccess, completedTasks: tasks.filter((item) => item.status === 'completed').length, runCleanup };
      // This positive quiet-tick heartbeat must not depend on deleted counts.
      this.logger.info('maintenance.completed', result);
      if (result.healthy) this.logger.info('maintenance.healthy', { completedTasks: result.completedTasks, runCleanup });
      if (failures.length) {
        this.logger.error('maintenance.failed', { failedTasks: result.failedTasks });
        await this.#failureNotice(failures, options);
        if (strict) throw Object.assign(new AggregateError(failures.map((item) => item.error), 'One or more maintenance tasks failed.'), { code: 'MAINTENANCE_TASKS_FAILED' });
      }
      return result;
    }
    finally { this.running = false; }
  }
}
