export type ContentState = 'green' | 'changed' | 'unknown';
export type PinState = 'healthy' | 'changed' | 'degraded' | 'outage' | 'unknown';
export interface RegionCheck {
  /** Unique AWS region ID, e.g. eu-west-1. */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** ISO 8601 timestamp including timezone. */
  checkedAt: string;
  /** null means no HTTP response was received. */
  statusCode: number | null;
  content: ContentState;
  latencyMs?: number;
  /** Optional policy override, e.g. slow HTTP 200 => degraded. */
  state?: PinState;
  error?: string;
}
export interface RegionAction {
  kind: 'screenshots' | 'diff';
  region: RegionCheck;
}
export function pinState(check: RegionCheck): PinState {
  if (check.state) return check.state;
  if (check.statusCode === null || check.statusCode >= 400) return 'outage';
  if (check.statusCode >= 300) return 'degraded';
  if (check.content === 'changed') return 'changed';
  return check.content === 'green' ? 'healthy' : 'unknown';
}
export const stateLabels: Record<PinState, string> = {
  healthy: 'Healthy', changed: 'Changed', degraded: 'Degraded', outage: 'Outage', unknown: 'Unknown',
};
/** Invalid coordinates and duplicate IDs never enter the renderer or selection UI. */
export function validChecks(checks: RegionCheck[]): RegionCheck[] {
  const ids = new Set<string>();
  return checks.filter(c => {
    if (!c.id || ids.has(c.id) || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)
      || Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) return false;
    ids.add(c.id);
    return true;
  });
}
export function formatCheckTime(iso: string, locale = 'en-GB', timeZone = 'UTC') {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone, timeZoneName: 'short',
  }).format(date);
}
