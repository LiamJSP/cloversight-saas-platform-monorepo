/** Shared customer incident vocabulary. A missing regional result never proves recovery. */
export function classifyIncident(value = {}, configuredRegions = null) {
  const retainedRows = value.regionalResults ?? [];
  const legacyCapture = !retainedRows.length && value.capturedAt && value.primaryRegion
    && (value.httpStatus != null || value.pngKey || value.pngUrl || value.screenshots?.length || value.outcome === 'outage');
  const rows = legacyCapture ? [{ region: value.primaryRegion, status: value.outcome === 'outage' ? 'outage' : 'ok' }] : retainedRows;
  const reasons = value.reasons ?? [];
  const explicitRegions = value.expectedRegions?.length ? value.expectedRegions : configuredRegions;
  const checkedRegions = unique(explicitRegions?.length ? explicitRegions : [
    ...rows.map((row) => row.region), ...reasons.map((reason) => reason.region),
    ...(value.primaryRegion ? [value.primaryRegion] : []),
  ]);
  const outageReasons = reasons.filter((reason) => reason.method === 'outage');
  const outageRegions = unique([
    ...rows.filter((row) => ['outage', 'target_outage'].includes(row.status)).map((row) => row.region),
    ...outageReasons.map((reason) => reason.region),
  ]);
  const reachableRegions = unique(rows.filter((row) => ['ok', 'success'].includes(row.status)).map((row) => row.region));
  const unavailableRegions = checkedRegions.filter((region) => !outageRegions.includes(region) && !reachableRegions.includes(region));
  const triggerRegions = unique(reasons.filter((reason) => reason.method === 'banned_phrase').map((reason) => reason.region));
  const changeRegions = unique(reasons.filter((reason) => ['text_change', 'pixel_change'].includes(reason.method)).map((reason) => reason.region));
  const hasOutage = outageRegions.length > 0 || outageReasons.length > 0 || value.outcome === 'outage' || ['page_outage', 'outage'].includes(value.kind);
  const hasTrigger = triggerRegions.length > 0 || reasons.some((reason) => reason.method === 'banned_phrase') || value.kind === 'banned_phrase';
  const category = hasOutage ? 'outage' : hasTrigger ? 'trigger_phrase'
    : reasons.length || value.outcome === 'changed' || ['text_change', 'pixel_change', 'combined_change'].includes(value.kind) ? 'site_change' : 'none';
  // An old alert that retains only an outage reason has no evidence of the
  // other Regions. Require retained regional observations for a complete claim.
  const completeEvidence = checkedRegions.length > 0 && unavailableRegions.length === 0;
  const outageScope = category !== 'outage' ? null
    : completeEvidence && rows.length > 0 && checkedRegions.every((region) => outageRegions.includes(region)) ? 'complete'
    : reachableRegions.some((region) => checkedRegions.includes(region)) && outageRegions.length > 0 ? 'regional' : 'unconfirmed';
  const establishingBaseline = value.evidenceComplete !== false && rows.length > 0 && rows.every((row) => row.status === 'ok' && row.baselineEstablished);
  const label = category === 'outage'
    ? outageScope === 'complete' ? checkedRegions.length > 1 ? 'Complete site outage' : 'Site outage'
      : outageScope === 'regional' ? 'Regional site outage' : 'Site outage · extent unconfirmed'
    : category === 'trigger_phrase' ? 'Trigger phrase detected'
    : category === 'site_change' ? 'Site change'
    : establishingBaseline ? 'Baseline recorded'
    : value.evidenceComplete === false || value.comparisonComplete === false ? 'Check incomplete' : 'No change detected';
  return { category, label, outageScope, outageRegions, triggerRegions, changeRegions, unavailableRegions, checkedRegions, completeEvidence };
}

export function incidentKind(reasons = [], incident = null) {
  const category = incident?.category;
  if (category === 'outage' || reasons.some((reason) => reason.method === 'outage')) return 'page_outage';
  if (category === 'trigger_phrase' || reasons.some((reason) => reason.method === 'banned_phrase')) return 'banned_phrase';
  const methods = unique(reasons.map((reason) => reason.method));
  if (methods.length > 1) return 'combined_change';
  return methods[0] === 'pixel_change' ? 'pixel_change' : 'text_change';
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }
