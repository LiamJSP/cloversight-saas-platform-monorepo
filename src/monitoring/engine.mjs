import { claimCaptureAdmission, updateWatcherUsage, watcherUsage } from '../domain/usage-guards.mjs';
import { id, ISO, sha256, addSeconds } from '../lib.mjs';
import { capturePage } from './capture.mjs';
import { findBannedPhrases, looksLikeErrorPage, textChangePercent, summarizeTextChanges } from './text.mjs';
import { visualDiff, makeReviewPreview, imageDimensions } from './pixel.mjs';
import { snapshotPngKey, snapshotPreviewKey, snapshotDiffKey, snapshotTextKey, snapshotRegionTextKey, baselinePngKey, baselineTextKey } from './artifacts.mjs';
import { nextCheckAt } from './schedule.mjs';
import { applyExpiredFreeTrialWatcherPolicy, captureCreditUsage } from '../domain/plans.mjs';
import { appendAudit } from '../services/audit.mjs';
import { classifyIncident, incidentKind } from './outcomes.mjs';

const CHECK_LEASE_SECONDS = 660;
const MONITORING_RUNTIME_REVISION = '0.5.12';

function kindLabel(kind) { return ({ page_outage: 'Site outage', banned_phrase: 'Trigger phrase detected', text_change: 'Site change · text', pixel_change: 'Site change · visual', combined_change: 'Site change · text and visual' })[kind] ?? 'Site change'; }
export function isOperationalCaptureError(error) {
  if (error?.code === 'CAPTURE_TIMEOUT' && !error?.partialCapture && /page navigation/i.test(`${error?.stage ?? ''} ${error?.message ?? ''}`)) return false;
  return ['ENOENT', 'CAPTURE_ISOLATION_FAILED', 'CAPTURE_COMMAND_FAILED', 'CAPTURE_TIMEOUT', 'CAPTURE_LAMBDA_FAILED', 'BROWSER_DISCONNECTED', 'IMAGE_PROCESSING_FAILED', 'PRIVATE_TARGET', 'PAGE_TOO_LARGE', 'TooManyRequestsException', 'ResourceNotFoundException', 'AccessDeniedException', 'ServiceException', 'NetworkingError'].includes(error?.code)
    || /Chromium|DevTools|\bCDP\b|Capture Lambda|Capture timed out|Image comparison|Image processing|Pixel comparison|PNG|private or reserved address|target port is not allowed/i.test(error?.message ?? '');
}

export class MonitoringEngine {
  constructor({ store, assets, config, logger, notifier, capture = capturePage }) { Object.assign(this, { store, assets, config, logger, notifier, capture }); }

  async acquire(watcherId, owner = `local-${process.pid}`, options = {}) {
    const now = ISO();
    return this.store.transact('watcher.acquire', (state) => {
      const watcher = state.watchers.find((item) => item.id === watcherId);
      if (watcher && options.accountId && watcher.accountId !== options.accountId) throw Object.assign(new Error('Queued check does not match its watcher account.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
      if (!watcher || !['active', 'checking'].includes(watcher.status)) return null;
      if (!options.force && watcher.status === 'active' && watcher.nextCheckAt && watcher.nextCheckAt > now) return null;
      if (watcher.status === 'checking' && watcher.leaseExpiresAt && watcher.leaseExpiresAt > now) return null;
      const account = state.accounts.find((item) => item.id === watcher.accountId && item.closureStatus === 'active');
      if (!account) return null;
      account.watcherUsage = watcherUsage(state, account);
      const policyBefore = structuredClone(watcher);
      const policyAdjustment = account ? applyExpiredFreeTrialWatcherPolicy(watcher, account, new Date(now)) : null;
      if (policyAdjustment) {
        updateWatcherUsage(account, policyBefore, watcher);
        watcher.configRevision = Number(watcher.configRevision ?? 1) + 1;
        appendAudit(state, { actorId: 'plan-entitlement-enforcement', role: 'system' }, 'watcher.plan_adjusted', {
          accountId: watcher.accountId,
          targetId: watcher.id,
          reason: policyAdjustment.reason,
          metadata: { before: policyBefore, afterSummary: { name: watcher.name, status: watcher.status, configRevision: watcher.configRevision, updatedAt: now, checkRegions: [...watcher.config.checkRegions] } },
        });
      }
      const regionCount = watcher.config.checkRegions?.length || 1;
      const usage = captureCreditUsage(account);
      if (usage.remaining < regionCount) { watcher.nextCheckAt = usage.periodEnd; watcher.lastDelayReason = 'capture-credit-allowance-exhausted'; return null; }
      const admission = claimCaptureAdmission(account, watcher, regionCount, now);
      if (!admission.allowed) { watcher.nextCheckAt = admission.retryAt; watcher.lastDelayReason = admission.reason; return null; }
      account.captureCreditsUsed = usage.used + regionCount;
      account.captureCreditPeriodStart = usage.periodStart; account.captureCreditPeriodEnd = usage.periodEnd;
      const previousNextCheckAt = watcher.nextCheckAt ?? null;
      // Keep the persisted lease beyond the Worker Lambda's ten-minute
      // ceiling so API polling cannot declare a valid, still-finishing check
      // dead at the exact runtime boundary.
      const leaseExpiresAt = addSeconds(now, CHECK_LEASE_SECONDS);
      watcher.status = 'checking'; watcher.leaseOwner = `${owner}:${id('lease')}`; watcher.leaseExpiresAt = leaseExpiresAt;
      // A checking watcher must not remain due in the schedule index. If the worker
      // disappears, the lease expiry makes it due again without duplicate dispatches.
      watcher.nextCheckAt = leaseExpiresAt; watcher.updatedAt = now;
      return { ...watcher, _previousNextCheckAt: previousNextCheckAt, _captureCreditPeriodStart: usage.periodStart, _reservedCredits: regionCount };
    });
  }

  async check(watcherId, options = {}) {
    // A manual queue item that has already reached a terminal persisted state
    // (for example, because its queue wait expired) must never wake up later and
    // perform a surprise capture if SQS eventually delivers an old message.
    if (options.jobId) {
      const state = await this.store.read();
      const queuedJob = state.jobs.find((item) => item.id === options.jobId && item.type === 'check');
      if (queuedJob && (queuedJob.watcherId !== watcherId || options.accountId && queuedJob.accountId !== options.accountId)) throw Object.assign(new Error('Queued check job does not match its watcher account.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
      if (queuedJob && ['completed', 'failed', 'skipped'].includes(queuedJob.status)) {
        return { watcherId, skipped: true, reason: 'job-no-longer-runnable', jobStatus: queuedJob.status };
      }
    }
    const leased = structuredClone(options.leasedWatcher ?? await this.acquire(watcherId, options.owner, { force: Boolean(options.manual), accountId: options.accountId }));
    if (!leased) {
      const result = { watcherId, skipped: true, reason: 'not-available' };
      await this.#finishJob(watcherId, options, 'skipped', result);
      return result;
    }
    if (leased.id !== watcherId || options.accountId && leased.accountId !== options.accountId) throw Object.assign(new Error('Leased check does not match its watcher account.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
    const jobStarted = await this.#markJobRunning(leased, options);
    if (!jobStarted) {
      await this.#releaseLease(leased);
      return { watcherId, skipped: true, reason: 'job-no-longer-runnable' };
    }
    const started = Date.now();
    this.logger.info('monitor.check.started', { watcherId, jobId: options.jobId ?? null, urlHost: safeHost(leased.config.url), manual: Boolean(options.manual) });
    try {
      const requestedRegions = [...new Set(leased.config.checkRegions?.length ? leased.config.checkRegions : [this.config.awsRegion])];
      let primaryRegion = requestedRegions[0];
      // Run all selected regions together. Besides reducing wall time, this
      // preserves the other regions' evidence when the full-capture region is
      // the one that cannot reach the target.
      const settled = await Promise.allSettled(requestedRegions.map((region) => this.capture(leased.config.url, leased.config, this.config, { region, metadataOnly: false })));
      let regionalChecks = settled.slice(1).map((result, index) => settledRegionalCheck(requestedRegions[index + 1], result));
      let capture;
      if (settled[0].status === 'rejected') {
        let primaryError = captureError(settled[0].reason);
        const fallbackIndex = settled.findIndex((result, index) => index > 0 && result.status === 'fulfilled');
        if (fallbackIndex > 0) {
          primaryRegion = requestedRegions[fallbackIndex];
          regionalChecks = settled.flatMap((result, index) => index === fallbackIndex ? [] : [settledRegionalCheck(requestedRegions[index], result)]);
          capture = { ...settled[fallbackIndex].value };
        } else {
          const targetFailureIndex = settled.findIndex((result) => result.status === 'rejected' && !isOperationalCaptureError(result.reason));
          if (targetFailureIndex > 0) {
            primaryRegion = requestedRegions[targetFailureIndex];
            primaryError = captureError(settled[targetFailureIndex].reason);
            regionalChecks = settled.flatMap((result, index) => index === targetFailureIndex ? [] : [settledRegionalCheck(requestedRegions[index], result)]);
          }
          primaryError.primaryRegion = primaryRegion;
          primaryError.regionalChecks = regionalChecks;
          throw primaryError;
        }
      } else {
        capture = { ...settled[0].value };
      }
      capture.region = primaryRegion;
      capture.regionalChecks = regionalChecks;
      const result = await this.#evaluate(leased, capture);
      await this.#finishJob(watcherId, options, result.skipped ? 'skipped' : 'completed', result);
      this.logger.info('monitor.check.completed', { watcherId, jobId: options.jobId ?? null, outcome: result.outcome, durationMs: Date.now() - started, snapshotId: result.snapshotId });
      return result;
    } catch (error) {
      if (isOperationalCaptureError(error)) {
        await this.#internalFailure(leased, error);
        await this.#finishJob(watcherId, options, 'failed', null, error);
        this.logger.error('monitor.check.internal_failure', { watcherId, jobId: options.jobId ?? null, message: error.message, code: error.code });
        // Manual checks are terminal from the customer's perspective; do not leave
        // an SQS record behind to surprise them with a delayed duplicate retry.
        if (options.manual) return { watcherId, failed: true, error: error.message, errorCode: error.code ?? 'CHECK_FAILED' };
        throw error;
      }
      const result = await this.#outageFailure(leased, error, error.primaryRegion ?? leased.config.checkRegions?.[0] ?? this.config.awsRegion, error.regionalChecks ?? []);
      await this.#finishJob(watcherId, options, result.skipped ? 'skipped' : 'completed', result);
      this.logger.warn('monitor.check.outage', { watcherId, jobId: options.jobId ?? null, message: error.message, snapshotId: result.snapshotId });
      return result;
    }
  }

  async #markJobRunning(watcher, options) {
    if (!options.jobId) return true;
    const now = ISO();
    return this.store.transact('monitor.check.job_running', (state) => {
      let job = state.jobs.find((item) => item.id === options.jobId && item.type === 'check');
      if (job && (job.accountId !== watcher.accountId || job.watcherId !== watcher.id)) throw Object.assign(new Error('Check job does not match its watcher account.'), { code: 'CHECK_ACCOUNT_BINDING_MISMATCH' });
      if (job && ['completed', 'failed', 'skipped'].includes(job.status)) return false;
      if (!job) {
        job = { id: options.jobId, type: 'check', accountId: watcher.accountId, watcherId: watcher.id, manual: Boolean(options.manual), requestedAt: options.requestedAt ?? now, queuedAt: options.requestedAt ?? now };
        state.jobs.push(job);
      }
      job.accountId = watcher.accountId; job.watcherId = watcher.id; job.manual = Boolean(options.manual);
      job.status = 'running'; job.startedAt = now; job.completedAt = null; job.outcome = null; job.snapshotId = null;
      job.error = null; job.errorCode = null; job.leaseOwner = watcher.leaseOwner;
      return true;
    });
  }

  async #releaseLease(watcher) {
    const now = ISO();
    await this.store.transact('monitor.check.release_unused_lease', (state) => {
      const target = state.watchers.find((item) => item.id === watcher.id);
      if (!target || target.status !== 'checking' || target.leaseOwner !== watcher.leaseOwner) return null;
      target.status = 'active'; target.leaseOwner = null; target.leaseExpiresAt = null;
      target.nextCheckAt = watcher._previousNextCheckAt ?? nextCheckAt(target, now); target.updatedAt = now;
      return null;
    });
  }

  async #finishJob(watcherId, options, status, result = null, error = null) {
    if (!options.jobId) return;
    const now = ISO();
    await this.store.transact('monitor.check.job_finished', (state) => {
      const watcher = state.watchers.find((item) => item.id === watcherId);
      let job = state.jobs.find((item) => item.id === options.jobId && item.type === 'check');
      if (job && ['completed', 'failed', 'skipped'].includes(job.status)) return null;
      if (!job) {
        job = { id: options.jobId, type: 'check', accountId: watcher?.accountId, watcherId, manual: Boolean(options.manual), requestedAt: options.requestedAt ?? now, queuedAt: options.requestedAt ?? now, startedAt: null };
        state.jobs.push(job);
      }
      job.status = status; job.completedAt = now; job.outcome = result?.outcome ?? null; job.snapshotId = result?.snapshotId ?? null;
      job.reason = result?.reason ?? null; job.error = error ? String(error.message).slice(0, 1000) : null; job.errorCode = error?.code ?? null;
      if (watcher?.activeCheckJobId === job.id) watcher.activeCheckJobId = null;
      return null;
    });
  }

  async #queueAlert(alert) {
    if (!alert) return;
    // The notification service owns the final atomic dispatch decision. Do not
    // silently gate existing incidents here: it prevents the service from both
    // reporting the durable reason and repairing a legacy zero-attempt round.
    this.logger.info('monitor.alert.notification_evaluating', {
      runtimeRevision: MONITORING_RUNTIME_REVISION,
      alertId: alert.id,
      watcherId: alert.watcherId,
      alertStatus: alert.status,
      notificationRound: alert.notificationRound ?? null,
      tierIndex: alert.currentTierIndex ?? 0,
      newlyOpened: Boolean(alert.newlyOpened),
      sendAgain: Boolean(alert.sendAgain),
      recoveryDetected: Boolean(alert.recoveryDetectedAt),
      activityCanceled: Boolean(alert.notificationControl?.canceledAt),
      roundOpenedReason: alert.notificationRoundOpenedReason ?? null,
    });
    try { await this.notifier.queueTier(alert.id, alert.currentTierIndex ?? 0); }
    catch (error) { this.logger.error('monitor.alert.notification_failed', { alertId: alert.id, watcherId: alert.watcherId, message: error.message, code: error.code }); }
  }

  async #evaluate(watcher, capture) {
    const now = capture.capturedAt;
    const snapshotId = id('snap');
    const textKey = snapshotTextKey(watcher.accountId, watcher.id, snapshotId);
    const state = await this.store.read();
    const current = state.watchers.find((item) => item.id === watcher.id);
    if (!current || current.accountId !== watcher.accountId || current.status !== 'checking' || current.leaseOwner !== watcher.leaseOwner || Number(current.configRevision ?? 1) !== Number(watcher.configRevision ?? 1)) {
      return { watcherId: watcher.id, outcome: 'discarded', skipped: true, reason: 'watcher-changed-during-capture' };
    }
    // Historical snapshots are the rolling comparison chain. The approved green
    // baseline remains separate and is still used by alert/all-clear promotion.
    const previous = state.snapshots
      .filter((item) => item.accountId === current.accountId && item.watcherId === current.id)
      .sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)))[0] ?? null;
    const reasons = [];
    const comparisonNotes = [];
    const primaryRegion = capture.region ?? current.config.checkRegions?.[0] ?? this.config.awsRegion;
    const outage = looksLikeErrorPage(capture.statusCode, capture.title, capture.visibleText);
    if (current.config.methods.includes('outage') && outage.outage) reasons.push({ method: 'outage', region: primaryRegion, message: `${primaryRegion}: ${outage.reason}`, value: capture.statusCode, threshold: null });
    const bannedMatches = current.config.methods.includes('banned_phrase') ? findBannedPhrases(capture.visibleText, current.config.bannedPhrases) : [];
    if (bannedMatches.length) reasons.push({ method: 'banned_phrase', region: primaryRegion, message: `${primaryRegion}: found banned phrase “${bannedMatches[0].phrase}”`, value: bannedMatches.length, threshold: 1 });
    const previousPrimaryEvidence = comparableRegionEvidence(state, current, primaryRegion, this.config.awsRegion);
    let textPercent = null; let textDiff = null; let textCompared = false;
    if (previous && current.config.methods.includes('text_change')) {
      if (previousPrimaryEvidence?.textKey) {
        try {
          const previousText = (await this.assets.read(previousPrimaryEvidence.textKey)).toString('utf8');
          textPercent = textChangePercent(previousText, capture.visibleText); textCompared = true;
          textDiff = summarizeTextChanges(previousText, capture.visibleText);
          if (textPercent > 0 && textPercent >= current.config.textThresholdPercent) reasons.push({ method: 'text_change', region: primaryRegion, message: `${primaryRegion}: ${textPercent}% of normalized text changed`, value: textPercent, threshold: current.config.textThresholdPercent });
        } catch (error) {
          comparisonNotes.push(`Text comparison unavailable for previous snapshot ${previous.id}: ${error.message}`);
          this.logger.warn('monitor.comparison.text_unavailable', { watcherId: current.id, previousSnapshotId: previous.id, message: error.message });
        }
      } else comparisonNotes.push(`Previous check ${previous.id} did not contain captured text for ${primaryRegion}.`);
    }
    const regionalResults = [{ region: primaryRegion, capturedAt: capture.capturedAt, status: outage.outage ? 'outage' : 'ok', httpStatus: capture.statusCode, finalUrl: capture.finalUrl, title: capture.title, durationMs: capture.durationMs, textHash: sha256(capture.visibleText), textKey, textChangePercent: textPercent, textComparisonAvailable: textCompared, comparisonSnapshotId: previousPrimaryEvidence?.snapshotId ?? null, comparisonCapturedAt: previousPrimaryEvidence?.capturedAt ?? null, baselineEstablished: !previousPrimaryEvidence, bannedMatches }];
    const regionalTextWrites = [];
    const regionalScreenshotWrites = [];
    for (const result of (capture.regionalChecks ?? []).filter((item) => item.region !== primaryRegion)) {
      if (result.error) {
        regionalResults.push({ region: result.region, status: result.operational ? 'internal_error' : 'outage', httpStatus: null, finalUrl: current.config.url, title: '', durationMs: null, textHash: null, textKey: null, textChangePercent: null, bannedMatches: [], error: result.error.message });
        if (!result.operational && current.config.methods.includes('outage')) reasons.push({ method: 'outage', region: result.region, message: `${result.region}: page could not be reached: ${result.error.message}`, value: null, threshold: null });
        else comparisonNotes.push(`${result.region} regional check was unavailable because of an internal capture error.`);
        continue;
      }
      const regional = result.capture;
      const regionalOutage = looksLikeErrorPage(regional.statusCode, regional.title, regional.visibleText);
      const regionalBanned = current.config.methods.includes('banned_phrase') ? findBannedPhrases(regional.visibleText, current.config.bannedPhrases) : [];
      if (current.config.methods.includes('outage') && regionalOutage.outage) reasons.push({ method: 'outage', region: result.region, message: `${result.region}: ${regionalOutage.reason}`, value: regional.statusCode, threshold: null });
      if (regionalBanned.length) reasons.push({ method: 'banned_phrase', region: result.region, message: `${result.region}: found banned phrase “${regionalBanned[0].phrase}”`, value: regionalBanned.length, threshold: 1 });
      let regionalTextPercent = null;
      let regionalTextCompared = false;
      const previousRegion = comparableRegionEvidence(state, current, result.region, this.config.awsRegion);
      if (previousRegion?.textKey && current.config.methods.includes('text_change')) {
        try {
          const previousText = (await this.assets.read(previousRegion.textKey)).toString('utf8');
          regionalTextPercent = textChangePercent(previousText, regional.visibleText); regionalTextCompared = true;
          if (regionalTextPercent > 0 && regionalTextPercent >= current.config.textThresholdPercent) reasons.push({ method: 'text_change', region: result.region, message: `${result.region}: ${regionalTextPercent}% of normalized text changed`, value: regionalTextPercent, threshold: current.config.textThresholdPercent });
        } catch (error) { comparisonNotes.push(`${result.region} text comparison unavailable: ${error.message}`); }
      }
      const regionalTextKey = snapshotRegionTextKey(watcher.accountId, watcher.id, snapshotId, result.region);
      regionalTextWrites.push(this.assets.put(regionalTextKey, Buffer.from(regional.visibleText)));
      const regionalScreenshots = [];
      for (const responsiveCapture of normalizedCaptureScreenshots(regional)) {
        const profile = responsiveCapture.profile;
        const storageProfile = `${result.region}-${profile}`;
        const pngKey = snapshotPngKey(watcher.accountId, watcher.id, snapshotId, storageProfile);
        const dimensions = imageDimensions(responsiveCapture.png);
        const previousScreenshot = previousRegion?.screenshots?.find((item) => item.profile === profile && item.fullPage !== false) ?? null;
        let profilePercent = null;
        let profileCompared = false;
        let dimensionsChanged = false;
        let dimensionChange = null;
        if (previous && current.config.methods.includes('pixel_change') && previousScreenshot?.pngKey) {
          try {
            const previousPng = await this.assets.read(previousScreenshot.pngKey);
            const visual = await visualDiff(previousPng, responsiveCapture.png, dimensions.width, dimensions.height);
            profilePercent = visual.percent; profileCompared = true; dimensionsChanged = visual.dimensionsChanged; dimensionChange = visual.dimensionChange;
          } catch (error) {
            comparisonNotes.push(`${result.region} ${responsiveCapture.label.toLowerCase()} visual comparison unavailable: ${error.message}`);
            this.logger.warn('monitor.comparison.regional_pixel_unavailable', { watcherId: current.id, previousSnapshotId: previous.id, region: result.region, profile, message: error.message });
          }
        } else if (previous && current.config.methods.includes('pixel_change')) comparisonNotes.push(`Previous check ${previous.id} did not contain a ${result.region} ${responsiveCapture.label.toLowerCase()} screenshot.`);
        regionalScreenshotWrites.push(this.assets.put(pngKey, responsiveCapture.png));
        regionalScreenshots.push({
          profile, label: responsiveCapture.label,
          viewportWidth: responsiveCapture.viewportWidth, viewportHeight: responsiveCapture.viewportHeight,
          width: dimensions.width, height: dimensions.height, fullPage: responsiveCapture.fullPage !== false,
          pngKey, screenshotHash: sha256(responsiveCapture.png), pixelChangePercent: profilePercent,
          comparisonAvailable: profileCompared, dimensionsChanged, dimensionChange,
        });
      }
      const regionalComparedProfiles = regionalScreenshots.filter((item) => item.comparisonAvailable);
      const regionalPixelPercent = regionalComparedProfiles.length ? Math.max(...regionalComparedProfiles.map((item) => item.pixelChangePercent)) : null;
      const regionalChangedProfiles = regionalScreenshots.filter((item) => item.pixelChangePercent > 0 && item.pixelChangePercent >= current.config.pixelThresholdPercent);
      if (regionalChangedProfiles.length) reasons.push({
        method: 'pixel_change', region: result.region,
        message: `${result.region}: visual change crossed the ${current.config.pixelThresholdPercent}% threshold: ${regionalChangedProfiles.map((item) => `${item.label} ${item.pixelChangePercent}%`).join(', ')}`,
        value: regionalPixelPercent,
        threshold: current.config.pixelThresholdPercent,
        profiles: regionalChangedProfiles.map((item) => ({ profile: item.profile, value: item.pixelChangePercent })),
      });
      regionalResults.push({ region: result.region, capturedAt: regional.capturedAt, status: regionalOutage.outage ? 'outage' : 'ok', httpStatus: regional.statusCode, finalUrl: regional.finalUrl, title: regional.title, durationMs: regional.durationMs, textHash: sha256(regional.visibleText), textKey: regionalTextKey, textChangePercent: regionalTextPercent, textComparisonAvailable: regionalTextCompared, pixelChangePercent: regionalPixelPercent, screenshots: regionalScreenshots, comparisonAvailable: regionalTextCompared || regionalComparedProfiles.length > 0, comparisonSnapshotId: previousRegion?.snapshotId ?? null, comparisonCapturedAt: previousRegion?.capturedAt ?? null, baselineEstablished: !previousRegion, bannedMatches: regionalBanned });
    }
    const screenshotWrites = [];
    const screenshots = [];
    for (const responsiveCapture of normalizedCaptureScreenshots(capture)) {
      const profile = responsiveCapture.profile;
      const pngKey = snapshotPngKey(watcher.accountId, watcher.id, snapshotId, profile);
      const previewKey = snapshotPreviewKey(watcher.accountId, watcher.id, snapshotId, profile);
      const diffKey = snapshotDiffKey(watcher.accountId, watcher.id, snapshotId, profile);
      const dimensions = imageDimensions(responsiveCapture.png);
      const previousScreenshot = previousPrimaryEvidence?.screenshots?.find((item) => item.profile === profile && item.fullPage !== false) ?? null;
      let profilePercent = null;
      let profileCompared = false;
      let dimensionsChanged = false;
      let dimensionChange = null;
      let overlay = null;
      if (previous && current.config.methods.includes('pixel_change') && previousScreenshot?.pngKey) {
        try {
          const previousPng = await this.assets.read(previousScreenshot.pngKey);
          const visual = await visualDiff(previousPng, responsiveCapture.png, dimensions.width, dimensions.height);
          profilePercent = visual.percent; profileCompared = true; dimensionsChanged = visual.dimensionsChanged; dimensionChange = visual.dimensionChange; overlay = visual.overlay;
        } catch (error) {
          comparisonNotes.push(`${responsiveCapture.label} visual comparison unavailable for previous snapshot ${previous.id}: ${error.message}`);
          this.logger.warn('monitor.comparison.pixel_unavailable', { watcherId: current.id, previousSnapshotId: previous.id, profile, message: error.message });
        }
      } else if (previous && current.config.methods.includes('pixel_change')) comparisonNotes.push(`Previous check ${previous.id} did not contain a ${primaryRegion} ${responsiveCapture.label.toLowerCase()} screenshot.`);
      screenshotWrites.push(this.assets.put(pngKey, responsiveCapture.png));
      screenshotWrites.push(makeReviewPreview(responsiveCapture.png).then((preview) => this.assets.put(previewKey, preview)));
      if (overlay) screenshotWrites.push(this.assets.put(diffKey, overlay));
      screenshots.push({
        profile, label: responsiveCapture.label,
        viewportWidth: responsiveCapture.viewportWidth, viewportHeight: responsiveCapture.viewportHeight,
        width: dimensions.width, height: dimensions.height, fullPage: responsiveCapture.fullPage !== false,
        pngKey, previewKey, diffKey: overlay ? diffKey : null,
        screenshotHash: sha256(responsiveCapture.png), pixelChangePercent: profilePercent,
        comparisonAvailable: profileCompared, dimensionsChanged, dimensionChange,
      });
    }
    await Promise.all([...screenshotWrites, ...regionalScreenshotWrites, ...regionalTextWrites, this.assets.put(textKey, Buffer.from(capture.visibleText))]);
    const comparedProfiles = screenshots.filter((item) => item.comparisonAvailable);
    const pixelPercent = comparedProfiles.length ? Math.max(...comparedProfiles.map((item) => item.pixelChangePercent)) : null;
    const changedProfiles = screenshots.filter((item) => item.pixelChangePercent > 0 && item.pixelChangePercent >= current.config.pixelThresholdPercent);
    if (changedProfiles.length) reasons.push({
      method: 'pixel_change', region: primaryRegion,
      message: `${primaryRegion}: visual change crossed the ${current.config.pixelThresholdPercent}% threshold: ${changedProfiles.map((item) => `${item.label} ${item.pixelChangePercent}%`).join(', ')}`,
      value: pixelPercent,
      threshold: current.config.pixelThresholdPercent,
      profiles: changedProfiles.map((item) => ({ profile: item.profile, value: item.pixelChangePercent })),
    });
    Object.assign(regionalResults[0], { screenshots, pixelChangePercent: pixelPercent, comparisonAvailable: textCompared || comparedProfiles.length > 0 });
    const expectedRegions = [...new Set(current.config.checkRegions?.length ? current.config.checkRegions : [this.config.awsRegion])];
    const evidenceComplete = expectedRegions.every((region) => regionalResults.some((row) => row.region === region && row.status !== 'internal_error'));
    for (const row of regionalResults) row.comparisonComplete = row.status === 'ok' && regionalComparisonComplete(row, current.config);
    const comparisonComplete = evidenceComplete && regionalResults.every((row) => row.comparisonComplete);
    const outcome = regionalResults.some((row) => row.status === 'outage') ? 'outage' : reasons.length ? 'changed' : 'green';
    const allBannedMatches = regionalResults.flatMap((row) => (row.bannedMatches ?? []).map((match) => ({ ...match, region: row.region })));
    const desktop = screenshots.find((item) => item.profile === 'desktop') ?? screenshots[0];
    const snapshot = {
      id: snapshotId, accountId: current.accountId, watcherId: current.id, capturedAt: now, outcome,
      httpStatus: capture.statusCode, finalUrl: capture.finalUrl, title: capture.title, durationMs: capture.durationMs,
      pngKey: desktop?.pngKey ?? null, previewKey: desktop?.previewKey ?? null, textKey,
      width: desktop?.width ?? null, height: desktop?.height ?? null, fullPage: true, screenshots,
      textHash: sha256(capture.visibleText), screenshotHash: desktop?.screenshotHash ?? null, textChangePercent: textPercent, textDiff,
      pixelChangePercent: pixelPercent, bannedMatches: allBannedMatches, reasons, regionalResults, expectedRegions, evidenceComplete, comparisonComplete, affectedRegions: [...new Set(reasons.map((item) => item.region).filter(Boolean))], regionScoped: Boolean(current.config.checkRegions?.length), primaryRegion, previousSnapshotId: previous?.id ?? null,
      comparisonSnapshotId: textCompared || comparedProfiles.length ? previousPrimaryEvidence?.snapshotId ?? null : null, comparisonNotes, promotedAt: null,
    };
    snapshot.incident = classifyIncident(snapshot);
    const shouldCreateBaseline = outcome === 'green' && evidenceComplete && !current.baselineSnapshotId && !current.openAlertId;
    if (shouldCreateBaseline) await this.#promote(current, snapshot);
    const result = await this.store.transact('watcher.evaluate', (draft) => {
      const target = draft.watchers.find((item) => item.id === current.id);
      if (!target || target.accountId !== watcher.accountId || target.status !== 'checking' || target.leaseOwner !== watcher.leaseOwner || Number(target.configRevision ?? 1) !== Number(watcher.configRevision ?? 1)) return { discarded: true, watcherId: current.id };
      updateWatcherUptimeStats(target, outcome === 'outage' ? 'outage' : 'up', now, draft.snapshots);
      draft.snapshots.push(snapshot);
      target.latestSnapshotId = snapshot.id;
      target.status = 'active';
      target.leaseOwner = null; target.leaseExpiresAt = null; target.lastCheckAt = now; target.lastOutcome = outcome;
      target.nextCheckAt = nextCheckAt(target, now); target.updatedAt = now; target.consecutiveInternalErrors = 0; target.captureRetryAfterAt = null; target.lastInternalError = null;
      let alert = null;
      if (outcome === 'green' && comparisonComplete && target.openAlertId) {
        alert = draft.alerts.find((item) => item.id === target.openAlertId && item.accountId === target.accountId && item.watcherId === target.id && ['open', 'acknowledged', 'resolving'].includes(item.status));
        if (alert) {
          alert.latestSnapshotId = snapshotId;
          alert.recoveryDetectedAt = now;
          alert.lastDetectedAt = now;
          alert.nextEscalationAt = null;
          alert.nextReAlertAt = null;
          alert.escalationCompletedAt = null;
          if (alert.notificationDispatch?.status === 'sending') {
            alert.notificationDispatch.status = 'canceled';
            alert.notificationDispatch.canceledAt = now;
          }
          alert.newlyOpened = false;
          alert.sendAgain = false;
          alert.updatedAt = now;
        }
      } else if (shouldCreateBaseline) {
        target.baselineSnapshotId = snapshotId; snapshot.promotedAt = now;
      } else if (reasons.length) {
        alert = openOrRefreshAlert(draft, target, snapshot, reasons, allBannedMatches, now);
        target.openAlertId = alert.id;
      }
      return { watcherId: target.id, snapshotId, outcome, alert, textChangePercent: textPercent, pixelChangePercent: pixelPercent, previousSnapshotId: previous?.id ?? null, comparisonSnapshotId: snapshot.comparisonSnapshotId, baselineCreated: shouldCreateBaseline };
    });
    if (result.discarded) {
      await Promise.allSettled([
        ...screenshots.flatMap((item) => [item.pngKey, item.previewKey, item.diffKey].filter(Boolean)).map((key) => this.assets.remove(key)),
        ...regionalResults.flatMap((item) => item.screenshots ?? []).map((item) => item.pngKey).filter(Boolean).map((key) => this.assets.remove(key)),
        ...regionalResults.map((item) => item.textKey).filter((key) => key && key !== textKey).map((key) => this.assets.remove(key)),
        this.assets.remove(textKey),
      ]);
      return { watcherId: current.id, outcome: 'discarded', skipped: true, reason: 'watcher-changed-during-evaluation' };
    }
    await this.#queueAlert(result.alert);
    return { watcherId: result.watcherId, snapshotId, outcome, alertId: result.alert?.id, textChangePercent: textPercent, pixelChangePercent: pixelPercent, previousSnapshotId: previous?.id ?? null, comparisonSnapshotId: snapshot.comparisonSnapshotId };
  }

  async #outageFailure(watcher, error, region = null, regionalChecks = []) {
    const now = ISO(); const snapshotId = id('snap');
    const affectedRegion = region ?? this.config.awsRegion;
    const reason = { method: 'outage', region: affectedRegion, message: `${affectedRegion}: page could not be reached: ${error.message}`, value: null, threshold: null };
    const reasons = [reason];
    const comparisonNotes = [];
    const regionalResults = [{ region: affectedRegion, status: 'outage', httpStatus: null, finalUrl: watcher.config.url, error: String(error.message).slice(0, 1000) }];
    const regionalAssetKeys = [];
    const allBannedMatches = [];
    const before = await this.store.read();
    const previous = before.snapshots.filter((item) => item.accountId === watcher.accountId && item.watcherId === watcher.id).sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)))[0] ?? null;
    for (const result of regionalChecks) {
      if (result.error) {
        regionalResults.push({ region: result.region, status: result.operational ? 'internal_error' : 'outage', httpStatus: null, finalUrl: watcher.config.url, title: '', durationMs: null, textHash: null, textKey: null, textChangePercent: null, bannedMatches: [], error: result.error.message });
        if (!result.operational && watcher.config.methods.includes('outage')) reasons.push({ method: 'outage', region: result.region, message: `${result.region}: page could not be reached: ${result.error.message}`, value: null, threshold: null });
        else comparisonNotes.push(`${result.region} regional check was unavailable because of an internal capture error.`);
        continue;
      }
      const capture = result.capture;
      const outage = looksLikeErrorPage(capture.statusCode, capture.title, capture.visibleText);
      const bannedMatches = watcher.config.methods.includes('banned_phrase') ? findBannedPhrases(capture.visibleText, watcher.config.bannedPhrases) : [];
      if (watcher.config.methods.includes('outage') && outage.outage) reasons.push({ method: 'outage', region: result.region, message: `${result.region}: ${outage.reason}`, value: capture.statusCode, threshold: null });
      if (bannedMatches.length) reasons.push({ method: 'banned_phrase', region: result.region, message: `${result.region}: found banned phrase “${bannedMatches[0].phrase}”`, value: bannedMatches.length, threshold: 1 });
      allBannedMatches.push(...bannedMatches.map((item) => ({ ...item, region: result.region })));
      let regionalTextPercent = null;
      const previousRegion = comparableRegionEvidence(before, watcher, result.region, this.config.awsRegion);
      if (previousRegion?.textKey && watcher.config.methods.includes('text_change')) {
        try {
          const previousText = (await this.assets.read(previousRegion.textKey)).toString('utf8');
          regionalTextPercent = textChangePercent(previousText, capture.visibleText);
          if (regionalTextPercent > 0 && regionalTextPercent >= watcher.config.textThresholdPercent) reasons.push({ method: 'text_change', region: result.region, message: `${result.region}: ${regionalTextPercent}% of normalized text changed`, value: regionalTextPercent, threshold: watcher.config.textThresholdPercent });
        } catch (readError) { comparisonNotes.push(`${result.region} text comparison unavailable: ${readError.message}`); }
      }
      const textKey = snapshotRegionTextKey(watcher.accountId, watcher.id, snapshotId, result.region);
      await this.assets.put(textKey, Buffer.from(capture.visibleText));
      regionalAssetKeys.push(textKey);
      const regionalScreenshots = [];
      for (const responsiveCapture of normalizedCaptureScreenshots(capture)) {
        const profile = responsiveCapture.profile;
        const pngKey = snapshotPngKey(watcher.accountId, watcher.id, snapshotId, `${result.region}-${profile}`);
        const dimensions = imageDimensions(responsiveCapture.png);
        const previousScreenshot = previousRegion?.screenshots?.find((item) => item.profile === profile && item.fullPage !== false) ?? null;
        let profilePercent = null;
        let profileCompared = false;
        let dimensionsChanged = false;
        let dimensionChange = null;
        if (previous && watcher.config.methods.includes('pixel_change') && previousScreenshot?.pngKey) {
          try {
            const previousPng = await this.assets.read(previousScreenshot.pngKey);
            const visual = await visualDiff(previousPng, responsiveCapture.png, dimensions.width, dimensions.height);
            profilePercent = visual.percent; profileCompared = true; dimensionsChanged = visual.dimensionsChanged; dimensionChange = visual.dimensionChange;
          } catch (readError) { comparisonNotes.push(`${result.region} ${responsiveCapture.label.toLowerCase()} visual comparison unavailable: ${readError.message}`); }
        } else if (previous && watcher.config.methods.includes('pixel_change')) comparisonNotes.push(`Previous check ${previous.id} did not contain a ${result.region} ${responsiveCapture.label.toLowerCase()} screenshot.`);
        await this.assets.put(pngKey, responsiveCapture.png);
        regionalAssetKeys.push(pngKey);
        regionalScreenshots.push({
          profile, label: responsiveCapture.label,
          viewportWidth: responsiveCapture.viewportWidth, viewportHeight: responsiveCapture.viewportHeight,
          width: dimensions.width, height: dimensions.height, fullPage: responsiveCapture.fullPage !== false,
          pngKey, screenshotHash: sha256(responsiveCapture.png), pixelChangePercent: profilePercent,
          comparisonAvailable: profileCompared, dimensionsChanged, dimensionChange,
        });
      }
      const regionalComparedProfiles = regionalScreenshots.filter((item) => item.comparisonAvailable);
      const regionalPixelPercent = regionalComparedProfiles.length ? Math.max(...regionalComparedProfiles.map((item) => item.pixelChangePercent)) : null;
      const regionalChangedProfiles = regionalScreenshots.filter((item) => item.pixelChangePercent > 0 && item.pixelChangePercent >= watcher.config.pixelThresholdPercent);
      if (regionalChangedProfiles.length) reasons.push({
        method: 'pixel_change', region: result.region,
        message: `${result.region}: visual change crossed the ${watcher.config.pixelThresholdPercent}% threshold: ${regionalChangedProfiles.map((item) => `${item.label} ${item.pixelChangePercent}%`).join(', ')}`,
        value: regionalPixelPercent,
        threshold: watcher.config.pixelThresholdPercent,
        profiles: regionalChangedProfiles.map((item) => ({ profile: item.profile, value: item.pixelChangePercent })),
      });
      regionalResults.push({ region: result.region, status: outage.outage ? 'outage' : 'ok', httpStatus: capture.statusCode, finalUrl: capture.finalUrl, title: capture.title, durationMs: capture.durationMs, textHash: sha256(capture.visibleText), textKey, textChangePercent: regionalTextPercent, pixelChangePercent: regionalPixelPercent, screenshots: regionalScreenshots, bannedMatches });
    }
    const result = await this.store.transact('watcher.outage', (state) => {
      const target = state.watchers.find((item) => item.id === watcher.id);
      if (!target || target.accountId !== watcher.accountId || target.status !== 'checking' || target.leaseOwner !== watcher.leaseOwner || Number(target.configRevision ?? 1) !== Number(watcher.configRevision ?? 1)) return { discarded: true };
      const snapshot = { id: snapshotId, accountId: target.accountId, watcherId: target.id, capturedAt: now, outcome: 'outage', httpStatus: null, finalUrl: target.config.url, title: '', durationMs: null, pngKey: null, previewKey: null, textKey: null, width: null, height: null, textHash: null, screenshotHash: null, textChangePercent: null, pixelChangePercent: null, bannedMatches: allBannedMatches, reasons, affectedRegions: [...new Set(reasons.map((item) => item.region).filter(Boolean))], regionScoped: Boolean(target.config.checkRegions?.length), primaryRegion: affectedRegion, regionalResults, previousSnapshotId: previous?.id ?? null, comparisonSnapshotId: null, comparisonNotes, promotedAt: null };
      snapshot.expectedRegions = [...new Set(target.config.checkRegions?.length ? target.config.checkRegions : [this.config.awsRegion])];
      snapshot.evidenceComplete = snapshot.expectedRegions.every((region) => regionalResults.some((row) => row.region === region && row.status !== 'internal_error'));
      snapshot.comparisonComplete = false;
      snapshot.incident = classifyIncident(snapshot);
      updateWatcherUptimeStats(target, 'outage', now, state.snapshots);
      state.snapshots.push(snapshot);
      target.latestSnapshotId = snapshot.id;
      target.status = 'active'; target.leaseOwner = null; target.leaseExpiresAt = null; target.lastCheckAt = now; target.lastOutcome = 'outage'; target.nextCheckAt = nextCheckAt(target, now); target.updatedAt = now; target.consecutiveInternalErrors = 0; target.captureRetryAfterAt = null; target.lastInternalError = null;
      const alert = openOrRefreshAlert(state, target, snapshot, reasons, allBannedMatches, now); target.openAlertId = alert.id;
      return { alert, previousSnapshotId: previous?.id ?? null };
    });
    if (result.discarded) { await Promise.allSettled(regionalAssetKeys.map((key) => this.assets.remove(key))); return { watcherId: watcher.id, outcome: 'discarded', skipped: true, reason: 'watcher-changed-during-capture' }; }
    await this.#queueAlert(result.alert);
    return { watcherId: watcher.id, snapshotId, outcome: 'outage', alertId: result.alert.id, previousSnapshotId: result.previousSnapshotId, comparisonSnapshotId: null };
  }

  async #internalFailure(watcher, error) {
    const now = ISO();
    await this.store.transact('watcher.internal_failure', (state) => {
      const target = state.watchers.find((item) => item.id === watcher.id);
      if (!target || target.status !== 'checking' || target.leaseOwner !== watcher.leaseOwner) return null;
      target.status = 'active'; target.leaseOwner = null; target.leaseExpiresAt = null; target.consecutiveInternalErrors = (target.consecutiveInternalErrors ?? 0) + 1; target.lastInternalError = String(error.message).slice(0, 1000); target.nextCheckAt = addSeconds(now, Math.min(3600, 60 * 2 ** target.consecutiveInternalErrors)); target.updatedAt = now;
      target.captureRetryAfterAt = target.nextCheckAt;
      const account = state.accounts.find((item) => item.id === target.accountId);
      if (account && account.captureCreditPeriodStart === watcher._captureCreditPeriodStart) account.captureCreditsUsed = Math.max(0, Number(account.captureCreditsUsed) - Number(watcher._reservedCredits || 0));
      return null;
    });
  }

  async #promote(watcher, snapshot) {
    if (!snapshot.pngKey || !snapshot.textKey) throw new Error('Only captured snapshots can become baselines.');
    await Promise.all([
      ...snapshotScreenshots(snapshot).map((item) => this.assets.copy(item.pngKey, baselinePngKey(watcher.accountId, watcher.id, item.profile))),
      this.assets.copy(snapshot.textKey, baselineTextKey(watcher.accountId, watcher.id)),
    ]);
  }

  async promoteAlert(alertId) {
    const state = await this.store.read();
    const alert = state.alerts.find((item) => item.id === alertId);
    const watcher = state.watchers.find((item) => item.id === alert?.watcherId);
    const latest = state.snapshots.find((item) => item.id === alert?.latestSnapshotId);
    const existingBaseline = state.snapshots.find((item) => item.id === watcher?.baselineSnapshotId);
    if (!alert || !watcher) throw new Error('Alert cannot be resolved because its watcher is missing.');
    if (watcher.accountId !== alert.accountId || latest && (latest.accountId !== alert.accountId || latest.watcherId !== watcher.id) || existingBaseline && (existingBaseline.accountId !== alert.accountId || existingBaseline.watcherId !== watcher.id)) throw Object.assign(new Error('Alert resolution evidence does not match its watcher account.'), { code: 'CAPTURE_ISOLATION_FAILED' });
    const promotable = latest?.pngKey && latest?.textKey ? latest : null;
    if (promotable) await this.#promote(watcher, promotable);
    await this.store.transact('alert.promote', (draft) => {
      const a = draft.alerts.find((item) => item.id === alertId); const w = draft.watchers.find((item) => item.id === watcher.id);
      if (!a || !w || a.status !== 'resolving') throw new Error('Alert is no longer ready for all-clear resolution.');
      a.status = 'all_clear'; a.resolvedAt = ISO(); w.openAlertId = null;
      if (promotable) { const s = draft.snapshots.find((item) => item.id === promotable.id); w.baselineSnapshotId = s.id; w.lastOutcome = 'green'; s.promotedAt = ISO(); }
      else if (existingBaseline) w.lastOutcome = 'green';
      else w.lastOutcome = 'never_checked';
      return null;
    });
  }
}

function openOrRefreshAlert(state, watcher, snapshot, reasons, bannedMatches, now) {
  const incident = snapshot.incident ?? classifyIncident(snapshot, snapshot.expectedRegions ?? watcher.config.checkRegions);
  const existing = watcher.openAlertId && state.alerts.find((item) => item.id === watcher.openAlertId && item.accountId === watcher.accountId && item.watcherId === watcher.id && ['open', 'acknowledged'].includes(item.status));
  if (existing) {
    const recoveredBeforeRecurrence = Boolean(existing.recoveryDetectedAt);
    const priorAffectedRegions = [...new Set(existing.affectedRegions ?? [])].sort();
    const nextAffectedRegions = [...new Set(snapshot.affectedRegions ?? [])].sort();
    const affectedRegionsChanged = Boolean(snapshot.regionScoped) && JSON.stringify(priorAffectedRegions) !== JSON.stringify(nextAffectedRegions);
    const priorSnapshot = state.snapshots.find((item) => item.id === existing.latestSnapshotId && item.accountId === watcher.accountId && item.watcherId === watcher.id);
    const distinctChangeAfterCompletedRound = Boolean(existing.escalationCompletedAt)
      && detectedChangeFingerprint(priorSnapshot, existing.reasons, existing.bannedMatches) !== detectedChangeFingerprint(snapshot, reasons, bannedMatches)
      && !notificationWorkPending(state, existing);
    existing.latestSnapshotId = snapshot.id; existing.lastDetectedAt = now; existing.recoveryDetectedAt = null; existing.reasons = reasons; existing.bannedMatches = bannedMatches; existing.affectedRegions = snapshot.affectedRegions ?? []; existing.regionScoped = Boolean(snapshot.regionScoped); existing.incident = structuredClone(incident); existing.expectedRegions = [...incident.checkedRegions]; existing.summary = reasons.map((item) => item.message).join('; '); existing.kind = incidentKind(reasons, incident); existing.kindLabel = incident.category === 'site_change' ? kindLabel(existing.kind) : incident.label; existing.notificationPolicy ??= notificationPolicyFor(watcher); existing.updatedAt = now;
    if (recoveredBeforeRecurrence || affectedRegionsChanged || distinctChangeAfterCompletedRound) {
      for (const notice of state.notifications.filter((item) => item.alertId === existing.id && ['sending', 'retry_scheduled'].includes(item.status))) {
        notice.status = 'canceled'; notice.retryAt = null; notice.updatedAt = now; notice.error = 'Canceled because a new notification round superseded the prior incident evidence.';
      }
      restartNotificationRound(existing, watcher, snapshot, now, recoveredBeforeRecurrence ? 'change_after_recovery' : (affectedRegionsChanged ? 'affected_regions_changed' : 'new_change_after_completed_round'));
      return existing;
    }
    return existing;
  }
  const kind = incidentKind(reasons, incident);
  const alert = { id: id('alert'), accountId: watcher.accountId, watcherId: watcher.id, baselineSnapshotId: watcher.baselineSnapshotId, firstSnapshotId: snapshot.id, latestSnapshotId: snapshot.id, kind, kindLabel: incident.category === 'site_change' ? kindLabel(kind) : incident.label, incident: structuredClone(incident), expectedRegions: [...incident.checkedRegions], status: 'open', summary: reasons.map((item) => item.message).join('; '), reasons, bannedMatches, affectedRegions: snapshot.affectedRegions ?? [], regionScoped: Boolean(snapshot.regionScoped), openedAt: now, lastDetectedAt: now, resolvedAt: null, currentTierIndex: 0, notificationRound: 1, notificationRoundOpenedAt: now, notificationRoundSnapshotId: snapshot.id, notificationRoundOpenedReason: 'new_incident', nextEscalationAt: null, nextReAlertAt: null, escalationCompletedAt: null, responses: [], notificationPolicy: notificationPolicyFor(watcher), notificationControl: null, notificationDispatch: null, notificationDelivery: null, newlyOpened: true, sendAgain: false };
  state.alerts.push(alert); return alert;
}

function restartNotificationRound(alert, watcher, snapshot, now, reason) {
  const previousRound = Number(alert.notificationRound);
  alert.status = 'open';
  alert.notificationRound = Number.isSafeInteger(previousRound) && previousRound >= 1 ? previousRound + 1 : 2;
  alert.notificationRoundOpenedAt = now;
  alert.notificationRoundSnapshotId = snapshot.id;
  alert.notificationRoundOpenedReason = reason;
  alert.currentTierIndex = 0;
  alert.nextEscalationAt = null;
  alert.nextReAlertAt = null;
  alert.escalationCompletedAt = null;
  alert.responses = [];
  alert.notificationPolicy = notificationPolicyFor(watcher);
  alert.notificationPolicyRefreshPending = false;
  alert.notificationDispatch = null;
  alert.notificationDelivery = null;
  alert.notificationControl = null;
  alert.notificationsPausedAt = null;
  alert.remainingEscalationSecondsBeforeWatcherPause = null;
  alert.remainingReAlertSecondsBeforeWatcherPause = null;
  alert.newlyOpened = true;
  alert.sendAgain = false;
}

function notificationWorkPending(state, alert) {
  const storedRound = Number(alert.notificationRound);
  const round = Number.isSafeInteger(storedRound) && storedRound >= 1 ? storedRound : 1;
  if (Number(alert.notificationDispatch?.round) === round && alert.notificationDispatch?.status === 'sending') return true;
  return state.notifications.some((item) => item.alertId === alert.id && Number(item.round ?? round) === round && ['sending', 'retry_scheduled'].includes(item.status));
}

function detectedChangeFingerprint(snapshot, reasons = [], bannedMatches = []) {
  if (!snapshot) return null;
  const screenshotHashes = (snapshot.screenshots ?? [])
    .map((item) => [String(item.profile ?? ''), item.screenshotHash ?? null])
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    outcome: snapshot.outcome ?? null,
    httpStatus: snapshot.httpStatus ?? null,
    finalUrl: snapshot.finalUrl ?? null,
    textHash: snapshot.textHash ?? null,
    screenshotHash: snapshot.screenshotHash ?? null,
    screenshotHashes,
    regionalEvidence: (snapshot.regionalResults ?? []).map((row) => ({
      region: row.region, status: row.status, httpStatus: row.httpStatus ?? null, textHash: row.textHash ?? null,
      screenshots: (row.screenshots ?? []).map((screen) => [screen.profile, screen.screenshotHash ?? null]).sort(([left], [right]) => String(left).localeCompare(String(right))),
    })).sort((left, right) => String(left.region).localeCompare(String(right.region))),
    reasons: reasons.map((item) => ({ method: item.method ?? null, region: item.region ?? null, message: item.message ?? null, value: item.value ?? null, threshold: item.threshold ?? null, profiles: item.profiles ?? null })),
    bannedMatches: bannedMatches.map((item) => ({ phrase: item.phrase ?? null, count: item.count ?? null })),
  });
}

function notificationPolicyFor(watcher) {
  return {
    recipientTiers: structuredClone(watcher.config.recipientTiers ?? []),
    allClearThreshold: watcher.config.allClearThreshold,
    alertReceivedThreshold: watcher.config.alertReceivedThreshold,
    reAlertMinutes: watcher.config.reAlertMinutes,
    templates: structuredClone(watcher.config.templates ?? {}),
    watcher: { name: watcher.name, url: watcher.config.url },
  };
}

function safeHost(value) { try { return new URL(value).hostname; } catch { return 'invalid'; } }

function settledRegionalCheck(region, result) {
  if (result.status === 'fulfilled') return { region, capture: result.value };
  return { region, error: { message: String(result.reason?.message ?? result.reason).slice(0, 1000), code: result.reason?.code ?? null, stage: result.reason?.stage ?? null }, operational: isOperationalCaptureError(result.reason) };
}

function captureError(value) {
  return value instanceof Error ? value : Object.assign(new Error(String(value ?? 'Capture failed.')), { code: 'CAPTURE_LAMBDA_FAILED' });
}

function normalizedCaptureScreenshots(capture) {
  if (Array.isArray(capture.screenshots) && capture.screenshots.length) return capture.screenshots.map((item) => ({
    ...item,
    profile: String(item.profile),
    label: String(item.label ?? item.profile),
    fullPage: item.fullPage ?? capture.fullPage ?? true,
  }));
  if (capture.screenshot) return [{ profile: 'desktop', label: 'Desktop', viewportWidth: capture.width, viewportHeight: capture.height, fullPage: Boolean(capture.fullPage), png: capture.screenshot }];
  throw Object.assign(new Error('Capture did not contain a screenshot.'), { code: 'IMAGE_PROCESSING_FAILED' });
}

function snapshotScreenshots(snapshot) {
  if (Array.isArray(snapshot?.screenshots) && snapshot.screenshots.length) return snapshot.screenshots;
  return snapshot?.pngKey ? [{ profile: 'desktop', label: 'Desktop', pngKey: snapshot.pngKey, previewKey: snapshot.previewKey ?? null, diffKey: null, pixelChangePercent: snapshot.pixelChangePercent ?? null }] : [];
}

function previousScreenshotFor(snapshot, profile) {
  // Pre-0.3.37 snapshots contain one viewport-only image and no responsive
  // profile metadata. Keep them visible in history, but never classify the
  // first full-page capture as a 100% change merely because its height differs.
  if (!Array.isArray(snapshot?.screenshots) || !snapshot.screenshots.length) return null;
  return snapshot.screenshots.find((item) => item.profile === profile && item.fullPage !== false) ?? null;
}

function comparableRegionEvidence(state, watcher, region, defaultRegion) {
  const snapshots = state.snapshots.filter((item) => item.accountId === watcher.accountId && item.watcherId === watcher.id)
    .sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt)));
  for (const snapshot of snapshots) {
    const primary = (snapshot.primaryRegion ?? defaultRegion) === region;
    const row = snapshot.regionalResults?.find((item) => item.region === region);
    if (row && row.status !== 'ok' || !row && (!primary || !snapshotIsUp(snapshot))) continue;
    const evidence = primary ? {
      textKey: row?.textKey ?? snapshot.textKey,
      screenshots: row?.screenshots?.length ? row.screenshots : Array.isArray(snapshot.screenshots) ? snapshot.screenshots : [],
    } : row;
    if (evidence?.textKey || evidence?.screenshots?.length) return { ...evidence, snapshotId: snapshot.id, capturedAt: row?.capturedAt ?? snapshot.capturedAt };
  }
  return null;
}

function regionalComparisonComplete(row, config) {
  if (config.methods.includes('text_change') && row.textComparisonAvailable !== true) return false;
  if (config.methods.includes('pixel_change')) {
    const profiles = ['desktop', 'tablet', 'mobile'];
    if (!profiles.every((profile) => row.screenshots?.some((screen) => screen.profile === profile && screen.comparisonAvailable === true))) return false;
  }
  return true;
}

function updateWatcherUptimeStats(watcher, outcome, capturedAt, snapshots) {
  const year = new Date(capturedAt).getUTCFullYear();
  let stats = watcher.uptimeStats?.year === year ? { ...watcher.uptimeStats } : null;
  if (!stats) {
    const historical = snapshots.filter((item) => item.watcherId === watcher.id && new Date(item.capturedAt).getUTCFullYear() === year);
    stats = {
      year,
      totalChecks: historical.length,
      upChecks: historical.filter(snapshotIsUp).length,
      outageChecks: historical.filter((item) => !snapshotIsUp(item)).length,
      firstRecordedAt: historical.map((item) => item.capturedAt).sort()[0] ?? capturedAt,
      lastRecordedAt: historical.map((item) => item.capturedAt).sort().at(-1) ?? null,
    };
  }
  stats.totalChecks += 1;
  if (outcome !== 'outage') stats.upChecks += 1;
  else stats.outageChecks = Number(stats.outageChecks ?? Math.max(0, stats.totalChecks - 1 - stats.upChecks)) + 1;
  stats.firstRecordedAt ??= capturedAt;
  stats.lastRecordedAt = capturedAt;
  watcher.uptimeStats = stats;
}

function snapshotIsUp(snapshot) {
  return snapshot.outcome !== 'outage' && !(snapshot.reasons ?? []).some((reason) => reason.method === 'outage');
}

export const monitoringEngineInternals = Object.freeze({ openOrRefreshAlert, notificationWorkPending, detectedChangeFingerprint, updateWatcherUptimeStats, snapshotIsUp });
