const RESPONSE_CODE = /\b(?=[A-Z0-9-]{6,16}\b)(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/[^+\d]/g, '');
}

export function stripQuotedReply(value) {
  const lines = String(value ?? '').replace(/\r/g, '').split('\n');
  const kept = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*On .+wrote:\s*$/i.test(line)) break;
    if (/^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i.test(line)) break;
    if (/^\s*From:\s.+$/i.test(line) && kept.length) break;
    kept.push(line);
  }
  return kept.join('\n').trim();
}

export function extractResponseCode({ body = '', destinations = [], subject = '' } = {}) {
  for (const destination of destinations) {
    const match = String(destination).match(/\+([A-Z0-9-]{6,16})@/i);
    if (match) return match[1].toUpperCase();
  }
  const labeled = `${subject}\n${body}`.match(/(?:response\s+code|code)\s*[:#-]?\s*((?=[A-Z0-9-]{6,16}\b)(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*)\b/i);
  if (labeled) return labeled[1].toUpperCase();
  const tokens = stripQuotedReply(`${subject}\n${body}`).match(new RegExp(RESPONSE_CODE.source, 'ig')) ?? [];
  return tokens.length === 1 ? tokens[0].toUpperCase() : null;
}

export function parseReplyIntent(value) {
  const clean = stripQuotedReply(value)
    .replace(/\b(?:response\s+code|code)\s*[:#-]?\s*(?=[A-Z0-9-]{6,16}\b)(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/ig, '')
    .replace(/\b(?=[A-Z0-9-]{6,16}\b)(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/ig, '')
    .replace(/[“”"'`*_#.,!?:;()[\]{}<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (clean === 'alert received') return 'alert_received';
  if (clean === 'all clear') return 'all_clear';
  return null;
}

export function sameDestination(channel, configured, sender) {
  return channel === 'email'
    ? normalizeEmail(configured) === normalizeEmail(sender)
    : normalizePhone(configured) === normalizePhone(sender);
}

export function responseGuidance(channel) {
  return channel === 'sms'
    ? 'Reply exactly ALERT RECEIVED or ALL CLEAR. Include the response code when more than one alert is open.'
    : 'Reply exactly “Alert Received” or “All Clear” to the alert-specific reply address.';
}
