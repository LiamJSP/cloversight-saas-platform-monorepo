import { CHECK_REGIONS } from '../domain/regions.mjs';

const REGION_NAMES = new Map(CHECK_REGIONS.map(({ id, name }) => [id, name]));
const TERMINAL = new Set(['completed', 'failed', 'skipped']);

// This is a customer-facing read model. Never copy a worker error, job reason,
// URL, bucket name, queue identifier, or capture configuration into it.
export function customerWatcherCheckStatus(state, watcher, defaultRegion) {
  const jobs = (state.jobs ?? []).filter((job) => job.type === 'check' && job.accountId === watcher.accountId && job.watcherId === watcher.id);
  const newest = jobs.sort((a, b) => String(b.requestedAt ?? '').localeCompare(String(a.requestedAt ?? '')))[0] ?? null;
  const active = watcher.activeCheckJobId ? jobs.find((job) => job.id === watcher.activeCheckJobId && !TERMINAL.has(job.status)) : null;
  const job = active ?? newest;
  const snapshot = (state.snapshots ?? []).filter((item) => item.accountId === watcher.accountId && item.watcherId === watcher.id)
    .sort((a, b) => String(b.capturedAt ?? '').localeCompare(String(a.capturedAt ?? '')))[0] ?? null;
  const jobIsNewest = job && (!snapshot || String(job.requestedAt ?? '') >= String(snapshot.capturedAt ?? ''));
  const currentJob = jobIsNewest ? job : null;
  const platformDeferred = currentJob?.status === 'skipped' && ['capture-capacity-deferred', 'check-queue-stale'].includes(currentJob.reason);
  const deferredDetail = currentJob?.reason === 'check-queue-stale' ? 'The platform deferred this queued check after waiting too long. No capture was attempted.' : 'The platform deferred this check because regional capacity is busy or unavailable. No capture was attempted.';
  const checkStarting = watcher.status === 'checking' && !currentJob;
  const currentSnapshot = currentJob?.snapshotId
    ? (state.snapshots ?? []).find((item) => item.id === currentJob.snapshotId && item.accountId === watcher.accountId && item.watcherId === watcher.id)
    : currentJob || checkStarting ? null : snapshot;
  const configuredRegions = watcher.config?.checkRegions?.length ? watcher.config.checkRegions : [defaultRegion];
  const regionSource = currentJob?.captureRun?.expectedRegions?.length ? currentJob.captureRun.expectedRegions
    : currentSnapshot?.expectedRegions?.length ? currentSnapshot.expectedRegions
    : currentSnapshot?.regionalResults?.length ? currentSnapshot.regionalResults.map((item) => item.region)
    : configuredRegions;
  const regions = [...new Set(regionSource)].filter(Boolean);
  const received = new Map();
  if (currentJob?.status === 'running') {
    for (const item of state.jobs ?? []) {
      if (item.type === 'capture-result' && item.accountId === watcher.accountId && item.watcherId === watcher.id &&
          item.parentJobId === currentJob.id && item.runId === currentJob.captureRun?.id && regions.includes(item.region)) {
        received.set(item.region, item.result);
      }
    }
  }
  const rows = regions.map((id) => {
    const result = currentSnapshot?.regionalResults?.find((item) => item.region === id) ??
      (currentSnapshot?.primaryRegion === id && !currentSnapshot.regionalResults?.length
        ? { status: currentSnapshot.outcome === 'outage' ? 'outage' : 'ok', capturedAt: currentSnapshot.capturedAt }
        : null);
    const status = result ? regionalOutcome(result.status, result.capturedAt ?? currentSnapshot.capturedAt, currentSnapshot, id, result)
      : received.has(id) ? regionalOutcome(received.get(id).status, received.get(id).capturedAt, null, id, { reasons: received.get(id).findings?.reasons ?? [] })
      : currentJob?.status === 'failed' ? entry('error', 'Watcher error', 'This check could not finish in this region.', currentJob.completedAt)
      : currentJob?.status === 'skipped' ? entry('skipped', platformDeferred ? 'Deferred' : 'Not run', platformDeferred ? deferredDetail : 'This check was not performed.', currentJob.completedAt)
      : currentJob?.status === 'completed' ? entry('unknown', 'Result unavailable', 'This region has finished, but its summary is not available yet.', currentJob.completedAt)
      : currentJob?.status === 'queued' ? entry('queued', 'Queued', 'Waiting to start.', currentJob.queuedAt)
      : currentJob?.status === 'running' || watcher.status === 'checking' ? entry('running', 'Checking', 'Waiting for this region.', currentJob?.startedAt ?? null)
      : currentSnapshot ? entry('unknown', 'Result unavailable', 'No regional result was retained.', currentSnapshot.capturedAt)
      : entry('idle', 'No check yet', 'Waiting for the first check.', null);
    return { id, name: REGION_NAMES.get(id) ?? id, ...status };
  });
  let phase = currentJob?.status === 'queued' ? 'queued' : currentJob?.status === 'running' || watcher.status === 'checking' ? 'running'
    : currentJob?.status === 'failed' ? 'error' : currentJob?.status === 'skipped' ? 'skipped'
    : currentJob?.status === 'completed' || currentSnapshot ? 'completed' : 'idle';
  const initialReference = currentSnapshot?.regionalResults?.length && currentSnapshot.regionalResults.every((row) => row.status === 'ok' && row.baselineEstablished);
  if(phase === 'completed' && (currentSnapshot?.evidenceComplete === false || currentSnapshot?.comparisonComplete === false && !initialReference)) phase = 'partial';
  return {
    phase,
    label: platformDeferred ? 'Deferred by platform' : ({ queued: 'Queued', running: 'Checking regions', error: 'Watcher error', skipped: 'Not run', completed: 'Check complete', partial: 'Check finished · evidence incomplete', idle: 'No check yet' })[phase],
    retryAt: platformDeferred && Number.isFinite(Date.parse(currentJob.retryAt)) ? currentJob.retryAt : null,
    updatedAt: currentJob?.completedAt ?? currentJob?.startedAt ?? currentJob?.queuedAt ?? currentSnapshot?.capturedAt ?? null,
    regions: rows,
  };
}

function entry(phase, label, detail, checkedAt) { return { phase, label, detail, checkedAt: checkedAt ?? null }; }
function regionalOutcome(status, checkedAt, snapshot, id, result = null) {
  if (status === 'internal_error') return entry('error', 'Watcher error', 'Our check could not finish in this region.', checkedAt);
  if (status === 'target_outage' || status === 'outage') return entry('website', 'Site outage', 'The target did not respond as expected in this region.', checkedAt);
  if (status === 'success' || status === 'ok') {
    const reasons = result?.reasons ?? snapshot?.reasons?.filter((reason) => reason.region === id || (!reason.region && id === snapshot.primaryRegion)) ?? [];
    if (reasons.some((reason) => reason.method === 'outage')) return entry('website', 'Site outage', 'The target returned an outage response in this region.', checkedAt);
    if (reasons.some((reason) => reason.method === 'banned_phrase')) return entry('trigger', 'Trigger phrase detected', 'A configured trigger phrase was detected in this region.', checkedAt);
    if (reasons.some((reason) => ['text_change', 'pixel_change'].includes(reason.method))) return entry('changed', 'Site change detected', 'A configured content or visual change was detected in this region.', checkedAt);
    if (result?.comparisonComplete === false && !result?.baselineEstablished) return entry('partial', 'Comparison unavailable', 'The page was reached, but some comparison evidence is unavailable.', checkedAt);
    return entry('complete', result?.baselineEstablished ? 'Reference established' : 'Checked', result?.baselineEstablished ? 'This region saved its first reference for future comparisons.' : 'Check finished.', checkedAt);
  }
  return entry('unknown', 'Result unavailable', 'The regional outcome is unavailable.', checkedAt);
}
