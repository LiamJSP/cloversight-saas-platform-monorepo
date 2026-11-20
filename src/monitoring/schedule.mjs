import { addSeconds, sha256 } from '../lib.mjs';
export function schedulingOffset(watcher, seconds = 60) {
  return parseInt(sha256(`${watcher.accountId}:${watcher.id}`).slice(0, 8), 16) % Math.max(1, seconds);
}
export function scheduleAfterEdit(watcher, nowIso, minimumMs = 0) {
  const now = Date.parse(nowIso);
  const existing = Date.parse(watcher.nextCheckAt ?? '');
  if (existing > now) return new Date(Math.max(existing, minimumMs)).toISOString();
  const interval = Math.max(1, Number(watcher.config.checkIntervalSeconds));
  return new Date(Math.max(now + schedulingOffset(watcher, Math.min(120, interval)) * 1000, minimumMs)).toISOString();
}
export function nextCheckAt(watcher, nowIso) {
  const interval = watcher.config.checkIntervalSeconds;
  const jitterRange = Math.min(60, Math.max(1, Math.floor(interval * 0.03)));
  let hash = 0;
  for (const char of watcher.id) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  const jitter = Math.abs(hash) % jitterRange;
  return addSeconds(nowIso, interval + jitter);
}

// Preserve a watcher's existing phase across captures. Completion-relative
// delays plus jitter can turn a two-minute cadence into three minutes with a
// minute dispatcher. Skip missed slots instead of creating a catch-up storm.
export function nextScheduledCheckAt(watcher, scheduledFor, completedAt) {
  const anchor = Math.max(Date.parse(scheduledFor), Date.parse(watcher.lastCaptureStartedAt ?? scheduledFor));
  const completed = Date.parse(completedAt);
  const interval = Number(watcher.config.checkIntervalSeconds) * 1000;
  if (!Number.isFinite(anchor) || !Number.isFinite(completed) || !Number.isFinite(interval) || interval <= 0) return nextCheckAt(watcher, completedAt);
  const periods = Math.max(1, Math.floor((completed - anchor) / interval) + 1);
  return new Date(anchor + periods * interval).toISOString();
}
