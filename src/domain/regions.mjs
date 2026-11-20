export const CHECK_REGIONS = Object.freeze([
  Object.freeze({ id: 'us-east-1', name: 'US East (N. Virginia)' }),
  Object.freeze({ id: 'us-east-2', name: 'US East (Ohio)' }),
  Object.freeze({ id: 'us-west-2', name: 'US West (Oregon)' }),
  Object.freeze({ id: 'ca-central-1', name: 'Canada (Central)' }),
  Object.freeze({ id: 'eu-west-1', name: 'Europe (Ireland)' }),
]);

const REGION_IDS = new Set(CHECK_REGIONS.map((item) => item.id));

export function normalizeCheckRegions(input, available = CHECK_REGIONS.map((item) => item.id)) {
  const allowed = new Set(available.filter((item) => REGION_IDS.has(item)));
  return [...new Set((Array.isArray(input) ? input : []).map((item) => String(item).trim()).filter((item) => allowed.has(item)))];
}

export function publicCheckRegions(available = CHECK_REGIONS.map((item) => item.id)) {
  const enabled = new Set(available);
  return CHECK_REGIONS.filter((item) => enabled.has(item.id));
}
