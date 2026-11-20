import { classifyIncident } from '../monitoring/outcomes.mjs';

/** A customer-safe presentation of the captured evidence, shared by email and activity. */
export function notificationIncidentDetails(alert, watcher) {
  const incident = alert.incident ?? classifyIncident(alert, watcher.config?.checkRegions);
  const reasons = (alert.reasons ?? []).map((reason) => reason.method === 'outage'
    ? { ...reason, message: `${reason.region ? `${reason.region}: ` : ''}the website was unavailable during this check` }
    : reason.method === 'banned_phrase'
      ? { ...reason, message: `${reason.region ? `${reason.region}: ` : ''}a configured trigger phrase was found` }
      : reason);
  const outageRegions = regions(incident.outageRegions);
  const triggerRegions = regions(incident.triggerRegions);
  const changeRegions = regions(incident.changeRegions);
  const checkedRegions = regions(incident.checkedRegions);
  const unavailableRegions = regions(incident.unavailableRegions);
  const affectedRegions = regions([...outageRegions, ...triggerRegions, ...changeRegions]);
  const triggerPhrases = [...new Set((alert.bannedMatches ?? []).map((match) => cleanLine(match.phrase || match.quote)).filter(Boolean))].slice(0, 5);
  let description;
  let scopeLabel;
  if (incident.category === 'outage') {
    scopeLabel = incident.outageScope === 'complete' ? 'Complete across monitored regions'
      : incident.outageScope === 'regional' ? 'Regional outage' : 'Outage extent unconfirmed';
    description = incident.outageScope === 'complete'
      ? `The website was unavailable from every monitored region${checkedRegions.length ? ` (${checkedRegions.length})` : ''} during this check.`
      : incident.outageScope === 'regional'
        ? 'The website was unavailable from some monitored regions while at least one other monitored region responded.'
        : 'The website was unavailable during this check, but the available evidence cannot confirm the full extent of the outage.';
    if (unavailableRegions.length) description += ` Check results were unavailable for: ${unavailableRegions.join(', ')}.`;
    if (triggerRegions.length || triggerPhrases.length) description += ' A configured trigger phrase was also found in reachable content.';
    if (changeRegions.length) description += ' Other reachable content also changed.';
  } else if (incident.category === 'trigger_phrase') {
    scopeLabel = 'Configured trigger phrase detected';
    description = 'A configured trigger phrase was found in the captured website content.';
    if (changeRegions.length) description += ' Text or visual changes were also detected.';
  } else {
    scopeLabel = 'Text or visual change';
    description = 'The captured website content changed beyond a configured text or visual threshold.';
  }
  const reasonSummary = reasons.map((reason) => cleanLine(reason.message)).filter(Boolean).join('; ');
  return {
    ...alert,
    incident,
    kindLabel: incident.label || alert.kindLabel || 'Site change',
    reasons,
    summary: reasonSummary || description,
    incidentDescription: description,
    outageScopeLabel: scopeLabel,
    affectedRegionsLabel: affectedRegions.length ? affectedRegions.join(', ') : 'Region details unavailable',
    checkedRegionsLabel: checkedRegions.length ? checkedRegions.join(', ') : 'Region details unavailable',
    triggerMatchesLabel: triggerPhrases.map((phrase) => `“${phrase}”`).join(', '),
    quotedMatch: alert.bannedMatches?.[0] ? `“${cleanLine(alert.bannedMatches[0].quote || alert.bannedMatches[0].phrase)}”` : 'none',
  };
}

/** Keep the incident classification visible even when a customer customizes its subject. */
export function incidentEmailSubject(subject, kindLabel) {
  const label = cleanLine(kindLabel) || 'Site change';
  const rendered = cleanLine(subject);
  const prefixed = rendered.slice(0, 200).toLowerCase().includes(label.toLowerCase()) ? rendered : `[${label}] ${rendered}`;
  return prefixed.slice(0, 200);
}

function regions(values) { return [...new Set((values ?? []).map(cleanLine).filter(Boolean))]; }
function cleanLine(value) { return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim(); }
