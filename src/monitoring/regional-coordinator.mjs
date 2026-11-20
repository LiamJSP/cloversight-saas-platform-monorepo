import { ensureWatcherUsage, claimCaptureAdmission, updateWatcherUsage } from '../domain/usage-guards.mjs';
/** @module monitoring/regional-coordinator
 * @description Durable multi-region check orchestration, result settlement and credit accounting.
 */
import { addSeconds, canonicalJson, id, ISO, sha256 } from '../lib.mjs';
import { applyExpiredFreeTrialWatcherPolicy, captureCreditUsage, entitlements } from '../domain/plans.mjs';
import { nextCheckAt, nextScheduledCheckAt } from './schedule.mjs';
import { monitoringEngineInternals } from './engine.mjs';
import { appendAudit } from '../services/audit.mjs';
import { classifyIncident } from './outcomes.mjs';

const { openOrRefreshAlert, updateWatcherUptimeStats } = monitoringEngineInternals;

export class RegionalMonitoringCoordinator {
  constructor({ store, assets, config, logger, notifier, dispatcher }) {
    Object.assign(this, { store, assets, config, logger, notifier, dispatcher });
  }

  async check(watcherId, options = {}) {
    const directWatcher = await this.store.getEntity?.('watchers', watcherId);
    if (directWatcher && options.accountId && directWatcher.accountId !== options.accountId) {
      throw Object.assign(new Error('Queued check does not match the watcher account binding.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
    }
    const accountId = directWatcher?.accountId ?? options.accountId ?? null;
    if (accountId) await ensureWatcherUsage(this.store, accountId);
    const directJob = options.jobId ? await this.store.getEntity?.('jobs', options.jobId) : null;
    if (directJob && (directJob.watcherId !== watcherId || accountId && directJob.accountId !== accountId)) throw Object.assign(new Error('Queued check job does not match the watcher account binding.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
    if (directJob?.status === 'running' && directJob.captureRun?.deadlineAt <= ISO()) {
      await this.#expireJob(directJob, ISO());
      return { watcherId, jobId: directJob.id, skipped: true, reason: 'capture-deadline-elapsed', errorCode: 'CAPTURE_DEADLINE_EXCEEDED' };
    }
    const candidateRegions = directWatcher?.config?.checkRegions?.length ? directWatcher.config.checkRegions : [this.config.awsRegion];
    const queueAdmission = directJob?.status !== 'running' && typeof this.dispatcher.admission === 'function'
      ? await this.dispatcher.admission(candidateRegions) : null;
    const directEntities = [
      { collection: 'watchers', id: watcherId },
      ...(directWatcher?.latestSnapshotId ? [{ collection: 'snapshots', id: directWatcher.latestSnapshotId }] : []),
      ...(options.jobId ? [{ collection: 'jobs', id: options.jobId }] : []),
      ...(directJob?.captureRun?.expectedRegions ?? []).map((region) => ({ collection: 'jobs', id: captureResultEntityId(directJob.id, directJob.captureRun.id, region) })),
    ];
    const prepared = await this.#transact(accountId, 'capture.run.prepare', (state) => prepareRun(state, watcherId, { ...options, queueAdmission }, this.config), directEntities, { followWatcherReferences: true });
    if (prepared?.deferred) this.logger.info('capture.admission.deferred', { watcherId, accountId, jobId: prepared.jobId, reason: prepared.reason, blockedRegions: prepared.blockedRegions, retryAt: prepared.retryAt });
    if (!prepared || prepared.skipped) return prepared ?? { watcherId, skipped: true, reason: 'not-available' };
    const dispatchRegions = prepared.dispatchRegions ?? prepared.expectedRegions;
    const dispatches = await Promise.allSettled(dispatchRegions.map((region) => this.dispatcher.send(region, {
      jobId: prepared.jobId,
      runId: prepared.runId,
      snapshotId: prepared.snapshotId,
      accountId: prepared.accountId,
      watcherId: prepared.watcherId,
      scheduledAt: prepared.requestedAt,
      deadlineAt: prepared.deadlineAt,
      primary: region === prepared.expectedRegions[0],
      watcherConfig: prepared.watcherConfig,
      watcherConfigHash: prepared.watcherConfigHash,
      previousEvidence: prepared.previousEvidence[region] ?? null,
      retentionDays: prepared.retentionDays,
    })));
    const failures = dispatches.flatMap((result, index) => result.status === 'rejected' ? [{ region: dispatchRegions[index], error: result.reason }] : []);
    if (failures.length) {
      this.logger.error('capture.run.dispatch_failed', { runId: prepared.runId, jobId: prepared.jobId, failures: failures.map((item) => ({ region: item.region, message: String(item.error?.message ?? item.error).slice(0, 500) })) });
      throw Object.assign(new Error(`Regional capture dispatch failed in ${failures.map((item) => item.region).join(', ')}.`), { code: 'CAPTURE_DISPATCH_FAILED', failures });
    }
    return {
      id: prepared.jobId, type: 'check', accountId: prepared.accountId, watcherId,
      manual: Boolean(options.manual), status: 'running', requestedAt: prepared.requestedAt,
      queuedAt: prepared.requestedAt, startedAt: prepared.startedAt, completedAt: null,
      outcome: null, snapshotId: null, error: null, errorCode: null,
      jobId: prepared.jobId, runId: prepared.runId, queued: true,
      expectedRegions: prepared.expectedRegions,
    };
  }

  async status(jobId, accountId) {
    const job = typeof this.store.getEntity === 'function'
      ? await this.store.getEntity('jobs', jobId)
      : (await this.store.read()).jobs.find((item) => item.id === jobId);
    if (!job || job.type !== 'check' || job.accountId !== accountId) throw Object.assign(new Error('Check job not found.'), { statusCode: 404 });
    return job;
  }

  async acceptResult(message) {
    const result = sanitizeCaptureResult(message);
    const directJob = await this.store.getEntity?.('jobs', result.jobId);
    const transactionAccountId = directJob?.accountId ?? result.accountId;
    const transactionWatcherId = directJob?.watcherId ?? result.watcherId;
    const directWatcher = await this.store.getEntity?.('watchers', transactionWatcherId);
    const resultEntityReads = (directJob?.captureRun?.id === result.runId
      ? directJob.captureRun.expectedRegions ?? []
      : [result.region]
    ).map((region) => ({ collection: 'jobs', id: captureResultEntityId(result.jobId, result.runId, region) }));
    const finalized = await this.#transact(transactionAccountId, 'capture.result.accept', (state) => {
      const job = state.jobs.find((item) => item.id === result.jobId && item.type === 'check');
      if (!job || job.captureRun?.id !== result.runId) return { ignored: true, reason: 'run-not-found' };
      if (job.accountId !== result.accountId || job.watcherId !== result.watcherId || job.captureRun.snapshotId !== result.snapshotId) {
        throw Object.assign(new Error('Regional capture result does not match its durable run binding.'), { code: 'CAPTURE_RESULT_BINDING_MISMATCH' });
      }
      if (!job.captureRun.expectedRegions.includes(result.region)) return { ignored: true, reason: 'unexpected-region' };
      const account = state.accounts.find((item) => item.id === job.accountId);
      if (!account || account.closureStatus !== 'active') return settleUnavailableRun(state, job, ISO());
      validateResultEvidence(result, this.config);
      if (job.captureRun.watcherConfigHash && result.watcherConfigHash && job.captureRun.watcherConfigHash !== result.watcherConfigHash) throw Object.assign(new Error('Regional capture result used a different frozen configuration.'), { code: 'CAPTURE_RESULT_BINDING_MISMATCH' });
      const previous = job.captureRun.previousEvidence?.[result.region];
      if (result.findings?.comparisonSnapshotId && result.findings.comparisonSnapshotId !== previous?.snapshotId) throw Object.assign(new Error('Regional comparison does not match the baseline frozen for this run.'), { code: 'CAPTURE_RESULT_BINDING_MISMATCH' });
      if (['completed', 'failed', 'skipped'].includes(job.status)) {
        const snapshot = state.snapshots.find((item) => item.id === job.snapshotId);
        const alert = snapshot ? state.alerts.find((item) => item.latestSnapshotId === snapshot.id && ['open', 'acknowledged', 'resolving'].includes(item.status)) : null;
        return snapshot?.comparisonBaselineStatus === 'pending' || alert
          ? { completed: true, replay: true, watcherId: job.watcherId, snapshotId: snapshot?.id ?? null, comparisonSnapshotId: snapshot?.comparisonBaselineStatus === 'pending' ? snapshot.id : null, alert }
          : { ignored: true, reason: 'run-terminal' };
      }
      const resultEntities = state.jobs.filter((item) => item.type === 'capture-result' && item.parentJobId === job.id && item.runId === result.runId);
      const alreadyEmbedded = job.captureRun.results?.[result.region];
      const existingResult = alreadyEmbedded ?? resultEntities.find((item) => item.region === result.region)?.result;
      if (existingResult && result.error?.code !== 'CAPTURE_DEADLINE_EXCEEDED' && sha256(canonicalJson(existingResult)) !== sha256(canonicalJson(result))) throw Object.assign(new Error('A regional result cannot replace evidence already accepted for this run.'), { code: 'CAPTURE_RESULT_CONFLICT' });
      if (!alreadyEmbedded && !resultEntities.some((item) => item.region === result.region)) {
        state.jobs.push(captureResultEntity(result));
        resultEntities.push(state.jobs.at(-1));
      }
      const acceptedResults = { ...(job.captureRun.results ?? {}) };
      for (const entity of resultEntities) acceptedResults[entity.region] ??= entity.result;
      const ready = job.captureRun.expectedRegions.every((region) => acceptedResults[region]);
      if (!ready) return { accepted: true, ready: false, received: Object.keys(acceptedResults).length, expected: job.captureRun.expectedRegions.length };
      // Results are separate temporary items so a five-Region run cannot push
      // the durable check job beyond DynamoDB's 400 KB item limit. Attach them
      // only to the in-memory draft while deriving the compact snapshot.
      job.captureRun.results = acceptedResults;
      const finalized = finalizeRun(state, job, this.config);
      delete job.captureRun.results;
      state.jobs = state.jobs.filter((item) => item.type !== 'capture-result' || item.parentJobId !== job.id || item.runId !== result.runId);
      return finalized;
    }, [
      { collection: 'jobs', id: result.jobId },
      { collection: 'watchers', id: transactionWatcherId },
      ...resultEntityReads,
    ], {
      followWatcherReferences: true,
      lookupPrefixes: directWatcher?.openAlertId ? ['NOTIFICATIONS#'] : [],
    });
    if (finalized?.operationalFailedRegions?.length || finalized?.comparisonUnavailableRegions?.length) {
      this.logger.warn('capture.run.incomplete', {
        jobId: result.jobId, runId: result.runId, watcherId: finalized.watcherId,
        snapshotId: finalized.snapshotId ?? null,
        operationalFailedRegions: finalized.operationalFailedRegions ?? [],
        comparisonUnavailableRegions: finalized.comparisonUnavailableRegions ?? [],
      });
    }
    if (finalized?.comparisonSnapshotId) await this.#preserveComparisonBaseline(finalized.comparisonSnapshotId, transactionAccountId);
    if (finalized?.alert) await this.#queueAlert(finalized.alert);
    if (finalized?.completed) this.logger.info('capture.run.completed', { jobId: result.jobId, runId: result.runId, watcherId: finalized.watcherId, snapshotId: finalized.snapshotId, outcome: finalized.outcome });
    return finalized;
  }

  async expireRuns(limit = 20) {
    const now = ISO();
    const expired = typeof this.store.dueCaptureRuns === 'function'
      ? await this.store.dueCaptureRuns(now, limit)
      : (await this.store.read()).jobs.filter((job) => job.type === 'check' && job.status === 'running' && job.captureRun?.deadlineAt && job.captureRun.deadlineAt <= now).slice(0, limit);
    let finalized = 0;
    for (const job of expired) finalized += await this.#expireJob(job, now);
    return finalized;
  }

  async #expireJob(job, now) {
    for (const region of job.captureRun.expectedRegions) {
      if (job.captureRun.results?.[region]) continue;
      const value = await this.acceptResult({
        type: 'regional-capture-result', contractVersion: 1,
        jobId: job.id, runId: job.captureRun.id, snapshotId: job.captureRun.snapshotId,
        accountId: job.accountId, watcherId: job.watcherId, region,
        status: 'internal_error', capturedAt: now,
        error: { code: 'CAPTURE_DEADLINE_EXCEEDED', message: 'The regional capture did not produce a result before the infrastructure deadline.' },
      });
      if (value?.completed) return 1;
    }
    return 0;
  }

  async promoteAlert(alertId) {
    const directAlert = await this.store.getEntity?.('alerts', alertId);
    return this.#transact(directAlert?.accountId ?? null, 'alert.promote.regional', (state) => {
      const alert = state.alerts.find((item) => item.id === alertId);
      const watcher = state.watchers.find((item) => item.id === alert?.watcherId);
      const latest = state.snapshots.find((item) => item.id === alert?.latestSnapshotId);
      const existingBaseline = state.snapshots.find((item) => item.id === watcher?.baselineSnapshotId);
      if (!alert || !watcher) throw new Error('Alert cannot be resolved because its watcher is missing.');
      if (!state.accounts.some((account) => account.id === alert.accountId && account.closureStatus === 'active')) throw Object.assign(new Error('Account is unavailable for baseline approval.'), { code: 'ACCOUNT_UNAVAILABLE', statusCode: 409 });
      if (watcher.accountId !== alert.accountId || latest && (latest.accountId !== alert.accountId || latest.watcherId !== watcher.id) || existingBaseline && (existingBaseline.accountId !== alert.accountId || existingBaseline.watcherId !== watcher.id)) throw Object.assign(new Error('Alert resolution evidence does not match its watcher account.'), { code: 'CAPTURE_ISOLATION_FAILED' });
      if (alert.status !== 'resolving') throw new Error('Alert is no longer ready for all-clear resolution.');
      alert.status = 'all_clear'; alert.resolvedAt = ISO(); watcher.openAlertId = null;
      if (latest?.regionalResults?.some((item) => item.status === 'ok')) {
        watcher.baselineSnapshotId = latest.id; watcher.lastOutcome = 'green'; latest.promotedAt = ISO();
      } else if (existingBaseline) watcher.lastOutcome = 'green';
      else watcher.lastOutcome = 'never_checked';
      return null;
    }, [
      { collection: 'alerts', id: alertId },
      ...(directAlert?.watcherId ? [{ collection: 'watchers', id: directAlert.watcherId }] : []),
      ...(directAlert?.latestSnapshotId ? [{ collection: 'snapshots', id: directAlert.latestSnapshotId }] : []),
    ], { followWatcherReferences: true });
  }

  async #transact(accountId, label, mutate, directEntities = [], options = {}) {
    if (accountId && typeof this.store.transactAccount === 'function') {
      return this.store.transactAccount(accountId, label, mutate, {
        lookupPrefixes: [],
        ...options,
        directEntities,
      });
    }
    return this.store.transact(label, mutate);
  }

  async #queueAlert(alert) {
    try { await this.notifier.queueTier(alert.id, alert.currentTierIndex ?? 0); }
    catch (error) { this.logger.error('capture.alert.notification_failed', { alertId: alert.id, watcherId: alert.watcherId, message: error.message, code: error.code }); }
  }

  async #preserveComparisonBaseline(snapshotId, accountId) {
    if (!this.assets?.copyReference) throw new Error('Regional baseline preservation requires a reference-aware asset adapter.');
    let snapshot;
    let watcher;
    if (typeof this.store.getEntity === 'function') {
      snapshot = await this.store.getEntity('snapshots', snapshotId);
      watcher = snapshot ? await this.store.getEntity('watchers', snapshot.watcherId) : null;
    } else {
      const state = await this.store.read();
      snapshot = state.snapshots.find((item) => item.id === snapshotId);
      watcher = state.watchers.find((item) => item.id === snapshot?.watcherId);
    }
    if (!snapshot || snapshot.accountId !== accountId || !watcher || watcher.accountId !== accountId) throw new Error('Baseline snapshot is unavailable for this watcher account.');
    const account = typeof this.store.getEntity === 'function' ? await this.store.getEntity('accounts', accountId)
      : (await this.store.read()).accounts.find((item) => item.id === accountId);
    if (!account || account.closureStatus !== 'active') return;
    if (snapshot.comparisonBaselineStatus === 'completed') return;
    const references = baselineEvidenceReferences(snapshot, watcher?.comparisonBaseline);
    for (const item of references) {
      for (const reference of [item.reference, item.target].filter(Boolean)) {
        const parts = String(reference.key ?? '').split('/');
        const ownerBound = parts[0] === 'capture-history' ? parts[2] === accountId && parts[3] === snapshot.watcherId && parts[4] === item.region
          : ['history', 'baselines'].includes(parts[0]) && parts[1] === accountId && parts[2] === snapshot.watcherId;
        if (!ownerBound || parts.some((part) => !part || part === '.' || part === '..')) throw Object.assign(new Error('Comparison reference does not match its watcher account and Region.'), { code: 'CAPTURE_ISOLATION_FAILED' });
        if (parts[0] === 'baselines' && /^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(parts[3]) && parts[3] !== item.region) throw Object.assign(new Error('Comparison baseline belongs to another Region.'), { code: 'CAPTURE_ISOLATION_FAILED' });
      }
    }
    if (!references.length) {
      const markUnavailable = (state) => {
        if (!state.accounts.some((item) => item.id === accountId && item.closureStatus === 'active')) return null;
        const target = state.snapshots.find((item) => item.id === snapshotId && item.accountId === accountId);
        if (target) { target.comparisonBaselineStatus = 'not_applicable'; target.comparisonBaselineAt = ISO(); }
        return null;
      };
      if (typeof this.store.transactAccount === 'function') await this.store.transactAccount(accountId, 'comparison.baseline.unavailable', markUnavailable, { directEntities: [{ collection: 'snapshots', id: snapshotId }] });
      else await this.store.transact('comparison.baseline.unavailable', markUnavailable);
      return;
    }
    const copied = await Promise.all(references.map(async (item) => item.target
      ? { ...item, copiedForThisAttempt: false }
      : {
        ...item,
        target: await this.assets.copyReference(item.reference, item.targetKey),
        copiedForThisAttempt: true,
      }));
    const baseline = comparisonBaselineFrom(snapshot, copied);
    const complete = (state) => {
      const target = state.snapshots.find((item) => item.id === snapshotId && item.accountId === accountId);
      const watcher = state.watchers.find((item) => item.id === snapshot.watcherId && item.accountId === accountId);
      if (!state.accounts.some((item) => item.id === accountId && item.closureStatus === 'active')) return { activated: false, obsolete: null, protectedBaselines: [watcher?.comparisonBaseline, watcher?.comparisonBaselinePrevious].filter(Boolean) };
      if (!target || !watcher) return { activated: false, obsolete: null, protectedBaselines: [] };
      if (target.comparisonBaselineStatus === 'completed') {
        return { activated: watcher.comparisonBaseline?.snapshotId === snapshotId, duplicate: true, obsolete: null, protectedBaselines: [watcher.comparisonBaseline, watcher.comparisonBaselinePrevious].filter(Boolean) };
      }
      target.comparisonBaselineStatus = 'completed'; target.comparisonBaselineAt = ISO();
      if (watcher.latestSnapshotId !== snapshotId) return { activated: false, obsolete: null, protectedBaselines: [watcher.comparisonBaseline, watcher.comparisonBaselinePrevious].filter(Boolean) };
      const obsolete = watcher.comparisonBaselinePrevious ?? null;
      watcher.comparisonBaselinePrevious = watcher.comparisonBaseline ?? null;
      watcher.comparisonBaseline = baseline;
      watcher.updatedAt = ISO();
      return { activated: true, obsolete, protectedBaselines: [watcher.comparisonBaseline, watcher.comparisonBaselinePrevious].filter(Boolean) };
    };
    const result = typeof this.store.transactAccount === 'function'
      ? await this.store.transactAccount(accountId, 'comparison.baseline.preserved', complete, { directEntities: [{ collection: 'snapshots', id: snapshotId }, { collection: 'watchers', id: snapshot.watcherId }] })
      : await this.store.transact('comparison.baseline.preserved', complete);
    if (result && this.assets?.removeReference) {
      const protectedIds = new Set((result.protectedBaselines ?? []).flatMap(comparisonBaselineReferences).map(referenceIdentity));
      const removable = [
        ...(result.activated && !result.duplicate && result.obsolete ? comparisonBaselineReferences(result.obsolete) : []),
        ...copied.filter((item) => item.copiedForThisAttempt).map((item) => item.target),
      ].filter((reference) => !protectedIds.has(referenceIdentity(reference)));
      const unique = [...new Map(removable.map((reference) => [referenceIdentity(reference), reference])).values()];
      await Promise.allSettled(unique.map((reference) => this.assets.removeReference(reference)));
    }
  }
}

function prepareRun(state, watcherId, options, config) {
  const now = ISO();
  let job = options.jobId ? state.jobs.find((item) => item.id === options.jobId && item.type === 'check') : null;
  if (job && (job.watcherId !== watcherId || options.accountId && job.accountId !== options.accountId)) throw Object.assign(new Error('Queued check does not match its durable watcher account binding.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
  if (job && ['completed', 'failed', 'skipped'].includes(job.status)) return { watcherId, skipped: true, reason: 'job-no-longer-runnable', jobStatus: job.status };
  const watcher = state.watchers.find((item) => item.id === watcherId);
  if (watcher && options.accountId && watcher.accountId !== options.accountId) throw Object.assign(new Error('Queued check does not match the watcher account binding.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
  const admissionAccountId = job?.accountId ?? watcher?.accountId ?? options.accountId;
  const admissionAccount = state.accounts.find((item) => item.id === admissionAccountId);
  if (!admissionAccount || admissionAccount.closureStatus !== 'active') {
    if (job?.captureRun && job.status === 'running') return settleUnavailableRun(state, job, now);
    if (job) Object.assign(job, { status: 'skipped', completedAt: now, reason: 'account-unavailable', error: null, errorCode: null });
    if (job && watcher?.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    // A stale queue delivery cannot create a replacement job after erasure.
    return { watcherId, jobId: job?.id ?? null, skipped: true, reason: 'account-unavailable' };
  }
  if (job?.captureRun && job.status === 'running') {
    const account = state.accounts.find((item) => item.id === job.accountId && item.closureStatus === 'active');
    const stillCurrent = account && watcher?.accountId === job.accountId && watcher.status === 'checking'
      && watcher.leaseOwner === job.leaseOwner && Number(watcher.configRevision ?? 1) === Number(job.captureRun.configRevision);
    if (stillCurrent) return dispatchView(state, job, config);
    const received = { ...(job.captureRun.results ?? {}) };
    for (const entity of state.jobs) {
      if (entity.type === 'capture-result' && entity.accountId === job.accountId && entity.watcherId === watcherId && entity.parentJobId === job.id && entity.runId === job.captureRun.id) received[entity.region] ??= entity.result;
    }
    refundInfrastructureCredits(state.accounts.find((item) => item.id === job.accountId), { ...job.captureRun, results: received });
    Object.assign(job, { status: 'skipped', completedAt: now, reason: 'watcher-changed-during-capture', error: null, errorCode: null });
    delete job.captureRun.results;
    state.jobs = state.jobs.filter((item) => item.type !== 'capture-result' || item.parentJobId !== job.id || item.runId !== job.captureRun.id);
    if (watcher?.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    if (job.leaseOwner && watcher?.leaseOwner === job.leaseOwner) {
      watcher.leaseOwner = null; watcher.leaseExpiresAt = null;
      if (watcher.status === 'checking') { watcher.status = 'active'; watcher.nextCheckAt = nextCheckAt(watcher, now); watcher.updatedAt = now; }
    }
    return { watcherId, jobId: job.id, skipped: true, reason: job.reason };
  }
  if (!watcher || !['active', 'checking'].includes(watcher.status)) return finishUnavailableJob(state, job, watcherId, options, now);
  if (!options.manual && watcher.status === 'active' && watcher.nextCheckAt && watcher.nextCheckAt > now) return finishUnavailableJob(state, job, watcherId, options, now);
  if (watcher.status === 'checking' && watcher.leaseExpiresAt && watcher.leaseExpiresAt > now) return finishUnavailableJob(state, job, watcherId, options, now);
  const account = state.accounts.find((item) => item.id === watcher.accountId && item.closureStatus === 'active');
  if (!account) return finishUnavailableJob(state, job, watcherId, options, now, 'account-unavailable');
  const queuedAt = job?.requestedAt ?? options.requestedAt;
  // Match the existing manual-check stale-queue horizon. A late scheduled
  // delivery must not create fresh expensive work from obsolete backlog.
  if (queuedAt && Date.parse(now) - Date.parse(queuedAt) >= 10 * 60_000) {
    job ??= createJob(state, watcher, options, now);
    const retryAt = addSeconds(now, Number(config.captureQueueDeferralSeconds ?? 60) + parseInt(sha256(watcher.id).slice(0, 8), 16) % 30);
    Object.assign(job, { status: 'skipped', completedAt: now, reason: 'check-queue-stale', retryAt, outcome: null, snapshotId: null, error: 'The platform deferred a queued check that did not start within ten minutes.', errorCode: 'CHECK_QUEUE_STALE' });
    watcher.status = 'active'; watcher.leaseOwner = null; watcher.leaseExpiresAt = null;
    watcher.nextCheckAt = retryAt; watcher.lastDelayReason = job.reason; watcher.updatedAt = now;
    if (watcher.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    return { watcherId, jobId: job.id, skipped: true, deferred: true, reason: job.reason, retryAt, blockedRegions: [], errorCode: job.errorCode };
  }
  const access = entitlements(account, new Date(now));
  const policyBefore = structuredClone(watcher);
  const policyAdjustment = applyExpiredFreeTrialWatcherPolicy(watcher, account, new Date(now));
  if (policyAdjustment) {
    updateWatcherUsage(account, policyBefore, watcher);
    watcher.configRevision = Number(watcher.configRevision ?? 1) + 1;
    watcher.updatedAt = now;
    appendAudit(state, { actorId: 'plan-entitlement-enforcement', role: 'system' }, 'watcher.plan_adjusted', {
      accountId: watcher.accountId,
      targetId: watcher.id,
      reason: policyAdjustment.reason,
      metadata: { before: policyBefore, afterSummary: { name: watcher.name, status: watcher.status, configRevision: watcher.configRevision, updatedAt: watcher.updatedAt, checkRegions: [...watcher.config.checkRegions] } },
    });
  }
  const expectedRegions = [...new Set(watcher.config.checkRegions?.length ? watcher.config.checkRegions : [config.awsRegion])];
  if (options.queueAdmission) {
    const blockedRegions = expectedRegions.filter((region) => options.queueAdmission.byRegion?.[region]?.allowed !== true);
    if (blockedRegions.length) {
      const jitter = parseInt(sha256(watcher.id).slice(0, 8), 16) % 30;
      const retryAt = addSeconds(now, Number(config.captureQueueDeferralSeconds ?? 60) + jitter);
      job ??= createJob(state, watcher, options, now);
      Object.assign(job, { status: 'skipped', completedAt: now, reason: 'capture-capacity-deferred', retryAt, outcome: null, snapshotId: null, error: 'The platform deferred this unstarted check because regional capture capacity is busy or its health is unavailable.', errorCode: 'CAPTURE_CAPACITY_DEFERRED' });
      watcher.status = 'active'; watcher.leaseOwner = null; watcher.leaseExpiresAt = null;
      watcher.nextCheckAt = retryAt; watcher.lastDelayReason = job.reason; watcher.updatedAt = now;
      if (watcher.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
      return { watcherId, jobId: job.id, skipped: true, deferred: true, reason: job.reason, blockedRegions, retryAt, errorCode: job.errorCode };
    }
  }
  const usage = captureCreditUsage(account, access, now);
  if (usage.used + expectedRegions.length > usage.allowance) {
    const retryAt = usage.periodEnd > now ? usage.periodEnd : addSeconds(now, 3600);
    watcher.nextCheckAt = retryAt; watcher.lastDelayReason = 'capture-credit-allowance-exhausted'; watcher.updatedAt = now;
    job ??= createJob(state, watcher, options, now);
    Object.assign(job, { status: 'skipped', completedAt: now, reason: 'capture-credit-allowance-exhausted', error: 'Monthly regional capture allowance exhausted.', errorCode: 'CAPTURE_CREDITS_EXHAUSTED' });
    if (watcher.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    return { watcherId, jobId: job.id, skipped: true, reason: job.reason, error: job.error, errorCode: job.errorCode, captureUsage: usage };
  }
  const admission = claimCaptureAdmission(account, watcher, expectedRegions.length, now);
  if (!admission.allowed) {
    job ??= createJob(state, watcher, options, now);
    Object.assign(job, { status: 'skipped', completedAt: now, reason: admission.reason, retryAt: admission.retryAt, errorCode: admission.code, error: null });
    watcher.status = 'active'; watcher.leaseOwner = null; watcher.leaseExpiresAt = null;
    watcher.nextCheckAt = admission.retryAt; watcher.lastDelayReason = admission.reason; watcher.updatedAt = now;
    if (watcher.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    return { watcherId, jobId: job.id, skipped: true, deferred: true, reason: admission.reason, retryAt: admission.retryAt, errorCode: admission.code };
  }
  const previous = state.snapshots.filter((item) => item.accountId === watcher.accountId && item.watcherId === watcher.id).sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt)))[0] ?? null;
  job ??= createJob(state, watcher, options, now);
  const runId = id('run');
  const snapshotId = id('snap');
  const deadlineSeconds = Math.max(300, Number(config.captureResultDeadlineSeconds ?? 900));
  const deadlineAt = addSeconds(now, deadlineSeconds);
  const leaseExpiresAt = addSeconds(deadlineAt, 120);
  const scheduledFor = options.manual ? now : watcher.nextCheckAt;
  watcher.status = 'checking'; watcher.leaseOwner = `${options.owner ?? job.id}:${runId}`; watcher.leaseExpiresAt = leaseExpiresAt; watcher.nextCheckAt = leaseExpiresAt; watcher.updatedAt = now; watcher.lastDelayReason = null;
  watcher.activeCheckJobId = job.id;
  account.captureCreditsUsed = usage.used + expectedRegions.length;
  account.captureCreditPeriodStart = usage.periodStart;
  account.captureCreditPeriodEnd = usage.periodEnd;
  account.updatedAt = now;
  Object.assign(job, {
    accountId: watcher.accountId, watcherId: watcher.id, manual: Boolean(options.manual), status: 'running',
    startedAt: now, completedAt: null, outcome: null, snapshotId: null, error: null, errorCode: null,
    leaseOwner: watcher.leaseOwner,
    captureRun: {
      id: runId, snapshotId, requestedAt: job.requestedAt, deadlineAt, scheduledFor,
      configRevision: Number(watcher.configRevision ?? 1), expectedRegions,
      watcherConfig: captureConfiguration(watcher.config),
      watcherConfigHash: sha256(canonicalJson(captureConfiguration(watcher.config))),
      previousSnapshotId: previous?.id ?? null,
      previousEvidence: Object.fromEntries(expectedRegions.map((region) => [region, evidenceForRegion(previous, region, config, watcher)])),
      retentionDays: access.historyDays, reservedCredits: expectedRegions.length,
      creditPeriodStart: usage.periodStart, creditPeriodEnd: usage.periodEnd,
    },
  });
  return dispatchView(state, job, config);
}

function createJob(state, watcher, options, now) {
  const job = {
    id: options.jobId ?? id('job'), type: 'check', accountId: watcher.accountId, watcherId: watcher.id,
    manual: Boolean(options.manual), status: 'queued', requestedAt: options.requestedAt ?? now, queuedAt: options.requestedAt ?? now,
    startedAt: null, completedAt: null, outcome: null, snapshotId: null, error: null, errorCode: null, leaseOwner: null,
  };
  state.jobs.push(job);
  return job;
}

function finishUnavailableJob(state, job, watcherId, options, now, reason = 'not-available') {
  const watcher = state.watchers.find((item) => item.id === watcherId);
  if (!job && options.jobId) {
    job = { id: options.jobId, type: 'check', accountId: watcher?.accountId ?? options.accountId ?? null, watcherId, manual: Boolean(options.manual), requestedAt: options.requestedAt ?? now, queuedAt: options.requestedAt ?? now };
    state.jobs.push(job);
  }
  if (job) Object.assign(job, { status: 'skipped', completedAt: now, reason });
  if (watcher?.activeCheckJobId === job?.id) watcher.activeCheckJobId = null;
  return { watcherId, jobId: job?.id ?? null, skipped: true, reason };
}

function dispatchView(state, job, config) {
  const watcher = state.watchers.find((item) => item.id === job.watcherId && item.accountId === job.accountId);
  const account = state.accounts.find((item) => item.id === job.accountId);
  if (!account || account.closureStatus !== 'active') return settleUnavailableRun(state, job, ISO());
  const run = job.captureRun;
  // Legacy in-flight runs may lack a frozen configuration. They can adopt it
  // only while the watcher revision still matches their acquisition revision.
  if (!run.watcherConfig) {
    if (!watcher || Number(watcher.configRevision ?? 1) !== Number(run.configRevision)) throw Object.assign(new Error('The old capture run no longer has a reproducible configuration.'), { code: 'CAPTURE_ISOLATION_FAILED' });
    run.watcherConfig = captureConfiguration(watcher.config);
    run.watcherConfigHash = sha256(canonicalJson(run.watcherConfig));
  }
  const configHash = sha256(canonicalJson(run.watcherConfig));
  if (run.watcherConfigHash && run.watcherConfigHash !== configHash) throw Object.assign(new Error('The frozen capture configuration changed.'), { code: 'CAPTURE_ISOLATION_FAILED' });
  run.watcherConfigHash = configHash;
  return {
    jobId: job.id, runId: run.id, snapshotId: run.snapshotId, accountId: job.accountId, watcherId: job.watcherId,
    requestedAt: run.requestedAt, startedAt: job.startedAt, deadlineAt: run.deadlineAt, expectedRegions: [...run.expectedRegions],
    watcherConfig: structuredClone(run.watcherConfig), watcherConfigHash: configHash, previousEvidence: structuredClone(run.previousEvidence ?? {}),
    retentionDays: run.retentionDays, planId: account?.planId ?? null, awsRegion: config.awsRegion,
    dispatchRegions: run.expectedRegions.filter((region) => !run.results?.[region] && !state.jobs.some((item) => item.type === 'capture-result' && item.parentJobId === job.id && item.runId === run.id && item.region === region)),
  };
}

function captureConfiguration(value = {}) {
  return {
    url: String(value.url ?? ''),
    timeoutMs: Math.max(3000, Math.min(120000, Number(value.timeoutMs) || 120000)),
    ignoredSelectors: Array.isArray(value.ignoredSelectors) ? value.ignoredSelectors.map(String).slice(0, 100) : [],
    methods: Array.isArray(value.methods) ? value.methods.map(String) : [],
    bannedPhrases: Array.isArray(value.bannedPhrases) ? structuredClone(value.bannedPhrases) : [],
    textThresholdPercent: Number(value.textThresholdPercent ?? 0),
    pixelThresholdPercent: Number(value.pixelThresholdPercent ?? 0),
  };
}

function evidenceForRegion(snapshot, region, config, watcher = null) {
  if (!snapshot) return null;
  if (watcher && (snapshot.accountId !== watcher.accountId || snapshot.watcherId !== watcher.id)) throw Object.assign(new Error('Comparison snapshot belongs to another watcher.'), { code: 'CAPTURE_ISOLATION_FAILED' });
  const baselines = [watcher?.comparisonBaseline, watcher?.comparisonBaselinePrevious].filter(Boolean);
  const matching = baselines.find((item) => item.snapshotId === snapshot.id)?.regions?.[region];
  if (matching) return structuredClone(matching);
  const primaryRegion = snapshot.primaryRegion ?? config.awsRegion;
  const regionalRow = snapshot.regionalResults?.find((item) => item.region === region);
  const evidence = primaryRegion === region
    ? { ...regionalRow, textKey: regionalRow?.textKey ?? snapshot.textKey, textHash: regionalRow?.textHash ?? snapshot.textHash, screenshots: regionalRow?.screenshots?.length ? regionalRow.screenshots : snapshot.screenshots, bucketName: regionalRow?.bucketName ?? snapshot.artifactBucketName, artifactRegion: regionalRow?.artifactRegion ?? snapshot.artifactRegion }
    : regionalRow;
  const healthy = evidence && (evidence.status ? evidence.status === 'ok' : snapshot.outcome !== 'outage');
  if (!healthy || !evidence.textKey && !evidence.screenshots?.length) {
    const preserved = baselines.map((baseline) => baseline.regions?.[region]).find(Boolean);
    return preserved ? structuredClone(preserved) : null;
  }
  const bucketName = evidence.bucketName ?? evidence.artifactBucketName ?? snapshot.artifactBucketName ?? config.snapshotBucketName;
  const artifactRegion = evidence.artifactRegion ?? (bucketName === config.snapshotBucketName ? config.snapshotBucketRegion ?? config.awsRegion : evidence.region ?? region);
  return {
    snapshotId: snapshot.id,
    capturedAt: regionalRow?.capturedAt ?? snapshot.capturedAt,
    textKey: evidence.textKey ?? null,
    textHash: evidence.textHash ?? null,
    bucketName,
    region: artifactRegion,
    screenshots: (evidence.screenshots ?? []).map((item) => ({
      profile: item.profile, pngKey: item.pngKey, screenshotHash: item.screenshotHash,
      width: item.width, height: item.height, fullPage: item.fullPage !== false,
      bucketName: item.bucketName ?? bucketName,
      region: item.region ?? artifactRegion,
    })),
  };
}

function finalizeRun(state, job, config) {
  const now = ISO();
  const run = job.captureRun;
  if (run.watcherConfigHash && sha256(canonicalJson(run.watcherConfig)) !== run.watcherConfigHash) throw Object.assign(new Error('The frozen capture configuration changed before result settlement.'), { code: 'CAPTURE_ISOLATION_FAILED' });
  const watcher = state.watchers.find((item) => item.id === job.watcherId && item.accountId === job.accountId);
  const account = state.accounts.find((item) => item.id === job.accountId);
  if (!account || account.closureStatus !== 'active') return settleUnavailableRun(state, job, now);
  if (!watcher || watcher.status !== 'checking' || watcher.leaseOwner !== job.leaseOwner || Number(watcher.configRevision ?? 1) !== Number(run.configRevision)) {
    Object.assign(job, { status: 'skipped', completedAt: now, reason: 'watcher-changed-during-capture', error: null, errorCode: null });
    if (watcher?.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    if (watcher?.leaseOwner === job.leaseOwner) { watcher.leaseOwner = null; watcher.leaseExpiresAt = null; }
    refundInfrastructureCredits(account, run);
    return { completed: true, watcherId: job.watcherId, skipped: true, reason: job.reason };
  }
  const ordered = run.expectedRegions.map((region) => run.results[region]);
  const internal = ordered.filter((item) => item.status === 'internal_error');
  refundCredits(account, run, internal.length);
  const chargeable = ordered.filter((item) => item.status !== 'internal_error');
  if (!chargeable.length) {
    watcher.status = 'active'; watcher.leaseOwner = null; watcher.leaseExpiresAt = null;
    if (watcher.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
    watcher.consecutiveInternalErrors = Number(watcher.consecutiveInternalErrors ?? 0) + 1;
    watcher.lastInternalError = internal.map((item) => `${item.region}: ${item.error?.message ?? 'capture failed'}`).join('; ').slice(0, 1000);
    watcher.nextCheckAt = addSeconds(now, Math.min(3600, 60 * 2 ** watcher.consecutiveInternalErrors)); watcher.captureRetryAfterAt = watcher.nextCheckAt; watcher.updatedAt = now;
    Object.assign(job, { status: 'failed', completedAt: now, error: watcher.lastInternalError, errorCode: 'REGIONAL_CAPTURE_FAILED', outcome: null, snapshotId: null });
    return { completed: true, watcherId: watcher.id, failed: true, error: job.error, errorCode: job.errorCode, operationalFailedRegions: internal.map((item) => item.region), comparisonUnavailableRegions: [] };
  }
  const primary = ordered.find((item) => item.status === 'success') ?? chargeable[0];
  const reasons = chargeable.flatMap((item) => (item.findings?.reasons ?? []).map((reason) => ({ ...reason, region: item.region })));
  const bannedMatches = chargeable.flatMap((item) => (item.findings?.bannedMatches ?? []).map((match) => ({ ...match, region: match.region ?? item.region })));
  const comparisonNotes = ordered.flatMap((item) => item.comparisonNotes ?? (item.status === 'internal_error' ? [`${item.region} capture was unavailable because of an internal error.`] : []));
  const outcome = chargeable.some((item) => item.status === 'target_outage' || item.findings?.outage) ? 'outage' : reasons.length ? 'changed' : 'green';
  const primaryScreens = primary.evidence?.screenshots ?? [];
  const desktop = primaryScreens.find((item) => item.profile === 'desktop') ?? primaryScreens[0] ?? null;
  const regionalResults = ordered.map((item) => ({
    region: item.region,
    capturedAt: item.capturedAt ?? null,
    status: item.status === 'internal_error' ? 'internal_error' : item.status === 'target_outage' || item.findings?.outage ? 'outage' : 'ok',
    httpStatus: item.capture?.statusCode ?? null, finalUrl: item.capture?.finalUrl ?? watcher.config.url,
    title: item.capture?.title ?? '', durationMs: item.capture?.durationMs ?? null,
    textHash: item.evidence?.textHash ?? null, textKey: item.evidence?.textKey ?? null,
    textChangePercent: item.findings?.textChangePercent ?? null, pixelChangePercent: item.findings?.pixelChangePercent ?? null,
    textComparisonAvailable: item.findings?.textComparisonAvailable ?? item.findings?.textChangePercent != null,
    comparisonAvailable: Boolean(item.findings?.comparisonAvailable),
    comparisonSnapshotId: item.findings?.comparisonSnapshotId ?? run.previousEvidence?.[item.region]?.snapshotId ?? null,
    comparisonCapturedAt: item.findings?.comparisonCapturedAt ?? run.previousEvidence?.[item.region]?.capturedAt ?? null,
    baselineEstablished: item.status === 'success' && !run.previousEvidence?.[item.region],
    reasons: (item.findings?.reasons ?? []).map((reason) => ({ ...reason, region: item.region })),
    bannedMatches: item.findings?.bannedMatches ?? [],
    screenshots: item.evidence?.screenshots ?? [],
    bucketName: item.evidence?.bucketName ?? null, artifactRegion: item.region,
    error: item.error?.message ?? null,
  }));
  const methods = run.watcherConfig?.methods ?? watcher.config.methods;
  for (const row of regionalResults) row.comparisonComplete = row.status === 'ok'
    && (!methods.includes('text_change') || row.textComparisonAvailable)
    && (!methods.includes('pixel_change') || ['desktop', 'tablet', 'mobile'].every((profile) => row.screenshots.some((screen) => screen.profile === profile && screen.comparisonAvailable === true)));
  const evidenceComplete = internal.length === 0;
  const comparisonComplete = evidenceComplete && regionalResults.every((row) => row.comparisonComplete);
  const snapshot = {
    id: run.snapshotId, accountId: watcher.accountId, watcherId: watcher.id, capturedAt: primary.capturedAt ?? now, outcome,
    httpStatus: primary.capture?.statusCode ?? null, finalUrl: primary.capture?.finalUrl ?? watcher.config.url,
    title: primary.capture?.title ?? '', durationMs: primary.capture?.durationMs ?? null,
    pngKey: desktop?.pngKey ?? null, previewKey: desktop?.previewKey ?? null, textKey: primary.evidence?.textKey ?? null,
    width: desktop?.width ?? null, height: desktop?.height ?? null, fullPage: true, screenshots: primaryScreens,
    artifactBucketName: primary.evidence?.bucketName ?? null, artifactRegion: primary.region,
    textHash: primary.evidence?.textHash ?? null, screenshotHash: desktop?.screenshotHash ?? null,
    textChangePercent: primary.findings?.textChangePercent ?? null, textDiff: primary.findings?.textDiff ?? null,
    pixelChangePercent: primary.findings?.pixelChangePercent ?? null, bannedMatches,
    reasons, regionalResults, affectedRegions: [...new Set(reasons.map((item) => item.region).filter(Boolean))],
    expectedRegions: [...run.expectedRegions], evidenceComplete, comparisonComplete,
    regionScoped: Boolean(watcher.config.checkRegions?.length), primaryRegion: primary.region,
    previousSnapshotId: run.previousSnapshotId, comparisonSnapshotId: primary.findings?.comparisonAvailable ? run.previousEvidence?.[primary.region]?.snapshotId ?? null : null,
    comparisonNotes, promotedAt: null,
    comparisonBaselineStatus: 'pending', comparisonBaselineAt: null,
  };
  snapshot.incident = classifyIncident(snapshot);
  updateWatcherUptimeStats(watcher, outcome === 'outage' ? 'outage' : 'up', snapshot.capturedAt, state.snapshots);
  state.snapshots.push(snapshot);
  watcher.status = 'active'; watcher.leaseOwner = null; watcher.leaseExpiresAt = null; watcher.lastCheckAt = snapshot.capturedAt;
  if (watcher.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
  watcher.latestSnapshotId = snapshot.id;
  watcher.lastOutcome = outcome; watcher.nextCheckAt = nextScheduledCheckAt(watcher, run.scheduledFor ?? job.startedAt, now); watcher.updatedAt = now;
  watcher.consecutiveInternalErrors = 0; watcher.lastInternalError = internal.length ? `${internal.length} region(s) returned internal capture errors.` : null;
  watcher.consecutiveRegionalInternalErrors = internal.length ? Number(watcher.consecutiveRegionalInternalErrors ?? 0) + 1 : 0;
  if (internal.length) {
    const retryAt = addSeconds(now, Math.min(3600, 60 * 2 ** Math.min(6, watcher.consecutiveRegionalInternalErrors)));
    watcher.captureRetryAfterAt = retryAt;
    if (retryAt > watcher.nextCheckAt) watcher.nextCheckAt = retryAt;
    watcher.lastDelayReason = 'regional-infrastructure-backoff';
  } else { watcher.lastDelayReason = null; watcher.captureRetryAfterAt = null; }
  let alert = null;
  if (outcome === 'green' && comparisonComplete && watcher.openAlertId) {
    alert = state.alerts.find((item) => item.id === watcher.openAlertId && item.accountId === watcher.accountId && item.watcherId === watcher.id && ['open', 'acknowledged', 'resolving'].includes(item.status));
    if (alert) {
      alert.latestSnapshotId = snapshot.id; alert.recoveryDetectedAt = now; alert.lastDetectedAt = now;
      alert.nextEscalationAt = null; alert.nextReAlertAt = null; alert.escalationCompletedAt = null;
      if (alert.notificationDispatch?.status === 'sending') { alert.notificationDispatch.status = 'canceled'; alert.notificationDispatch.canceledAt = now; }
      alert.newlyOpened = false; alert.sendAgain = false; alert.updatedAt = now;
    }
  } else if (outcome === 'green' && evidenceComplete && !watcher.openAlertId && !watcher.baselineSnapshotId) {
    watcher.baselineSnapshotId = snapshot.id; snapshot.promotedAt = now;
  } else if (reasons.length) {
    alert = openOrRefreshAlert(state, watcher, snapshot, reasons, snapshot.bannedMatches, now);
    watcher.openAlertId = alert.id;
  }
  Object.assign(job, { status: 'completed', completedAt: now, outcome, snapshotId: snapshot.id, reason: null, error: null, errorCode: null });
  return {
    completed: true, watcherId: watcher.id, snapshotId: snapshot.id, outcome, alert, comparisonSnapshotId: snapshot.id,
    operationalFailedRegions: internal.map((item) => item.region),
    comparisonUnavailableRegions: regionalResults.filter((row) => row.status === 'ok' && !row.baselineEstablished && !row.comparisonComplete).map((row) => row.region),
  };
}

function baselineEvidenceReferences(snapshot, fallbackBaseline = null) {
  if (!snapshot) return [];
  const rows = [];
  const seen = new Set();
  const addEvidence = (region, bucketName, textKey, screenshots = [], textHash = null, sourceSnapshotId = snapshot.id, sourceCapturedAt = snapshot.capturedAt) => {
    const safeRegion = String(region ?? snapshot.artifactRegion ?? 'unknown').replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'unknown';
    const prefix = `baselines/${snapshot.accountId}/${snapshot.watcherId}/${safeRegion}`;
    const fallback = fallbackBaseline?.regions?.[safeRegion];
    if (textKey) {
      const identity = `${bucketName ?? ''}:${textKey}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        const reuse = fallback?.textKey && textHash && fallback.textHash === textHash
          ? { key: fallback.textKey, bucketName: fallback.bucketName, region: fallback.region }
          : null;
        rows.push({
          kind: 'text', region: safeRegion, textHash, sourceSnapshotId, sourceCapturedAt,
          reference: { key: textKey, bucketName, region },
          ...(reuse ? { target: reuse } : { targetKey: `${prefix}/text/${safeContentHash(textHash, snapshot.id)}.txt` }),
        });
      }
    }
    for (const screen of screenshots) {
      if (!screen?.pngKey) continue;
      const identity = `${screen.bucketName ?? bucketName ?? ''}:${screen.pngKey}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      const profile = String(screen.profile ?? 'desktop').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'desktop';
      const priorScreen = fallback?.screenshots?.find((item) => item.profile === screen.profile && item.screenshotHash && item.screenshotHash === screen.screenshotHash);
      rows.push({
        kind: 'screenshot', region: safeRegion, screen: structuredClone(screen), sourceSnapshotId, sourceCapturedAt,
        reference: { key: screen.pngKey, bucketName: screen.bucketName ?? bucketName, region: screen.region ?? region },
        ...(priorScreen
          ? { target: { key: priorScreen.pngKey, bucketName: priorScreen.bucketName ?? fallback.bucketName, region: priorScreen.region ?? fallback.region } }
          : { targetKey: `${prefix}/screenshots/${profile}/${safeContentHash(screen.screenshotHash, snapshot.id)}.png` }),
      });
    }
  };
  const primary = snapshot.regionalResults?.find((row) => row.region === snapshot.primaryRegion);
  if (primary?.status === 'ok' || !primary && snapshot.outcome !== 'outage') addEvidence(snapshot.artifactRegion ?? snapshot.primaryRegion, snapshot.artifactBucketName, snapshot.textKey, snapshot.screenshots ?? [], snapshot.textHash);
  for (const evidence of snapshot.regionalResults ?? []) {
    if (evidence.status === 'ok') addEvidence(evidence.artifactRegion ?? evidence.region, evidence.bucketName, evidence.textKey, evidence.screenshots ?? [], evidence.textHash, snapshot.id, evidence.capturedAt ?? snapshot.capturedAt);
  }
  const represented = new Set(rows.map((item) => item.region));
  for (const expected of snapshot.regionalResults ?? []) {
    const safeRegion = String(expected.region ?? '').replace(/[^a-z0-9-]/g, '').slice(0, 32);
    if (!safeRegion || represented.has(safeRegion)) continue;
    const fallback = fallbackBaseline?.regions?.[safeRegion];
    if (fallback) addEvidence(safeRegion, fallback.bucketName, fallback.textKey, fallback.screenshots ?? [], fallback.textHash, fallback.snapshotId, fallback.capturedAt);
  }
  return rows;
}

function comparisonBaselineFrom(snapshot, copied) {
  const regions = {};
  for (const item of copied) {
    const value = regions[item.region] ??= { snapshotId: item.sourceSnapshotId ?? snapshot.id, capturedAt: item.sourceCapturedAt ?? snapshot.capturedAt, textKey: null, textHash: null, bucketName: item.target.bucketName, region: item.target.region, screenshots: [] };
    if (item.kind === 'text') {
      value.textKey = item.target.key;
      value.textHash = item.textHash ?? null;
    } else {
      value.screenshots.push({
        ...item.screen,
        pngKey: item.target.key,
        bucketName: item.target.bucketName,
        region: item.target.region,
      });
    }
  }
  return { snapshotId: snapshot.id, capturedAt: snapshot.capturedAt, regions };
}

function comparisonBaselineReferences(baseline) {
  const unique = new Map();
  for (const evidence of Object.values(baseline?.regions ?? {})) {
    for (const reference of [
      evidence?.textKey ? { key: evidence.textKey, bucketName: evidence.bucketName, region: evidence.region } : null,
      ...(evidence?.screenshots ?? []).map((item) => ({ key: item.pngKey, bucketName: item.bucketName ?? evidence.bucketName, region: item.region ?? evidence.region })),
    ].filter(Boolean)) unique.set(`${reference.bucketName}:${reference.key}`, reference);
  }
  return [...unique.values()];
}

function referenceIdentity(reference) { return `${reference?.bucketName ?? ''}:${reference?.region ?? ''}:${reference?.key ?? ''}`; }
function safeContentHash(value, fallback) { return String(value || fallback).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96) || 'artifact'; }

function refundInfrastructureCredits(account, run) {
  // Unknown in-flight work was admitted and may have incurred its full cost.
  refundCredits(account, run, Object.values(run.results ?? {}).filter((item) => item.status === 'internal_error').length);
}

function settleUnavailableRun(state, job, now) {
  if (['completed', 'failed', 'skipped'].includes(job.status)) return { ignored: true, reason: 'account-unavailable' };
  const run = job.captureRun;
  const received = { ...(run.results ?? {}) };
  for (const entity of state.jobs) if (entity.type === 'capture-result' && entity.accountId === job.accountId && entity.parentJobId === job.id && entity.runId === run.id) received[entity.region] ??= entity.result;
  refundInfrastructureCredits(state.accounts.find((item) => item.id === job.accountId), { ...run, results: received });
  Object.assign(job, { status: 'skipped', completedAt: now, reason: 'account-unavailable', error: null, errorCode: null, outcome: null, snapshotId: null });
  delete run.results;
  state.jobs = state.jobs.filter((item) => item.type !== 'capture-result' || item.accountId !== job.accountId || item.parentJobId !== job.id || item.runId !== run.id);
  const watcher = state.watchers.find((item) => item.id === job.watcherId && item.accountId === job.accountId);
  if (watcher?.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
  if (watcher && watcher.leaseOwner === job.leaseOwner) { watcher.leaseOwner = null; watcher.leaseExpiresAt = null; }
  // Closure owns the watcher status: settlement must never reactivate it.
  return { completed: true, watcherId: job.watcherId, skipped: true, reason: job.reason };
}

function refundCredits(account, run, count) {
  if (!account || count <= 0) return;
  if (account.captureCreditPeriodStart !== run.creditPeriodStart) return;
  account.captureCreditsUsed = Math.max(0, Number(account.captureCreditsUsed ?? 0) - count);
}

function captureResultEntity(result) {
  return {
    id: captureResultEntityId(result.jobId, result.runId, result.region),
    type: 'capture-result', accountId: result.accountId, watcherId: result.watcherId,
    parentJobId: result.jobId, runId: result.runId, region: result.region,
    result, createdAt: ISO(),
  };
}

function captureResultEntityId(jobId, runId, region) {
  return `capture_result_${sha256(`${jobId}:${runId}:${region}`).slice(0, 40)}`;
}

function sanitizeCaptureResult(message) {
  const value = structuredClone(message ?? {});
  for (const field of ['jobId', 'runId', 'snapshotId', 'accountId', 'watcherId']) if (!/^[A-Za-z0-9_-]{3,180}$/.test(String(value[field] ?? ''))) throw new Error(`Capture result has an invalid ${field}.`);
  if (!/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(String(value.region ?? ''))) throw new Error('Capture result has an invalid region.');
  if (!['success', 'target_outage', 'internal_error'].includes(value.status)) throw new Error('Capture result has an invalid status.');
  if (Buffer.byteLength(JSON.stringify(value)) > 240_000) throw new Error('Capture result exceeds the metadata size limit.');
  value.type = 'regional-capture-result'; value.contractVersion = 1;
  return value;
}

function validateResultEvidence(result, config) {
  const failure = (message) => { throw Object.assign(new Error(message), { code: 'CAPTURE_ISOLATION_FAILED' }); };
  const evidence = result.evidence ?? {};
  if (evidence.region && evidence.region !== result.region) failure('Regional evidence does not match its capture Region.');
  const expectedBucket = result.region === config.awsRegion ? config.snapshotBucketName
    : config.awsAccountId && config.appEnv ? `webwatch-${config.appEnv}-${config.awsAccountId}-${result.region}-captures` : null;
  const screens = evidence.screenshots ?? [];
  if (!Array.isArray(screens)) failure('Regional evidence screenshots must be a list.');
  if (result.status === 'success' && (!evidence.bucketName || !evidence.textKey || !['desktop', 'tablet', 'mobile'].every((profile) => screens.some((screen) => screen.profile === profile)))) failure('Successful regional capture must contain its own text and all responsive profiles.');
  if (evidence.bucketName && expectedBucket && evidence.bucketName !== expectedBucket) failure('Regional evidence bucket is not the configured bucket for its Region.');
  if (config.appEnv && config.appEnv !== 'local' && !expectedBucket) failure('The capture Region has no configured evidence bucket binding.');
  const keyFor = (key, kind, profile = null, hash = null) => {
    if (!key) return;
    const parts = String(key).split('/');
    if (parts.some((part) => !part || part === '.' || part === '..' || /[\u0000-\u001f]/.test(part))) failure('Regional evidence contains an unsafe object key.');
    const modern = parts[0] === 'capture-history' && ['7', '30', '90', '180', '365', 'indefinite'].includes(parts[1])
      && parts[2] === result.accountId && parts[3] === result.watcherId && parts[4] === result.region && /^\d{4}-\d{2}$/.test(parts[5]);
    if (modern) {
      const collection = ({ text: 'text', png: 'screenshots', preview: 'previews', diff: 'diffs' })[kind];
      const suffix = kind === 'text' ? 'txt' : 'png';
      const file = parts.at(-1);
      const valid = parts[6] === collection && new RegExp(`^[a-f0-9]{64}\\.${suffix}$`).test(file)
        && (kind === 'text' ? parts.length === 8 : parts.length === 9 && parts[7] === profile);
      if (!valid || hash && kind !== 'diff' && file !== `${hash}.${suffix}`) failure('Regional evidence object does not match its responsive profile and content identity.');
      return;
    }
    // The compatibility engine stores snapshot-bound objects in the primary
    // bucket. Permit that layout only for the exact captured snapshot and Region.
    const legacy = parts.length === 5 && parts[0] === 'history' && parts[1] === result.accountId && parts[2] === result.watcherId && parts[3] === result.snapshotId
      && result.region === config.awsRegion && (!config.snapshotBucketName || evidence.bucketName === config.snapshotBucketName);
    const file = kind === 'text' ? `visible(?:-${result.region})?\\.txt`
      : `${({ png: 'source', preview: 'preview', diff: 'diff' })[kind]}${profile === 'desktop' ? '' : `-${profile}`}\\.png`;
    if (!legacy || !new RegExp(`^${file}$`).test(parts[4])) failure('Regional evidence is outside its exact account, watcher, snapshot, and Region binding.');
  };
  keyFor(evidence.textKey, 'text', null, evidence.textHash);
  const profiles = new Set();
  for (const screen of screens) {
    if (!['desktop', 'tablet', 'mobile'].includes(screen.profile) || profiles.has(screen.profile)) failure('Regional evidence contains an invalid or duplicate responsive profile.');
    profiles.add(screen.profile);
    if (screen.region && screen.region !== result.region || screen.bucketName && screen.bucketName !== evidence.bucketName) failure('Responsive evidence does not match its regional result location.');
    if (!screen.pngKey) failure('A responsive evidence profile is missing its screenshot key.');
    keyFor(screen.pngKey, 'png', screen.profile, screen.screenshotHash);
    keyFor(screen.previewKey, 'preview', screen.profile, screen.screenshotHash);
    keyFor(screen.diffKey, 'diff', screen.profile);
  }
  for (const reason of result.findings?.reasons ?? []) {
    if (reason.region && reason.region !== result.region || !['outage', 'banned_phrase', 'text_change', 'pixel_change'].includes(reason.method)) failure('Regional finding does not match its capture Region and method.');
    for (const profile of reason.profiles ?? []) if (!['desktop', 'tablet', 'mobile'].includes(profile.profile)) failure('Regional finding contains an invalid responsive profile.');
  }
  for (const match of result.findings?.bannedMatches ?? []) if (match.region && match.region !== result.region) failure('Trigger phrase evidence belongs to another Region.');
}
