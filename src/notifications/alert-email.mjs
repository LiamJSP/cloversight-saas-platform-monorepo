const logoPngDataUrl = "data:image/png;base64,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";
const COLORS = Object.freeze({
  canvas: '#F7F3F6',
  surface: '#FFFFFF',
  ink: '#1C191B',
  copy: '#5F5860',
  muted: '#766E76',
  line: '#E8DEE5',
  plum: '#6B224F',
  pink: '#C3267C',
  pinkSoft: '#FCEAF4',
  green: '#087A4A',
  greenSoft: '#E8F7F0',
});
const INCIDENT_TONES = Object.freeze({
  outage: { ink: '#B42318', surface: '#FFF0ED', badge: 'Outage alert' },
  trigger_phrase: { ink: '#8C4B00', surface: '#FFF4DD', badge: 'Trigger phrase alert' },
  site_change: { ink: '#2356A5', surface: '#EDF3FF', badge: 'Site change alert' },
});

/**
 * Build the multipart bodies for an alert email. The HTML intentionally uses
 * a conservative table layout and inline styles so the message remains useful
 * in Outlook, Gmail, Apple Mail, and clients that strip <style> blocks. Brand
 * art is an embedded PNG rather than a remote image: there is no tracking request and the
 * identity remains visible when image loading is disabled.
 */
export function renderAlertEmail({ context, message }) {
  const details = emailDetails(context);
  return {
    text: renderPlainText(context, message, details),
    html: renderHtml(context, message, details),
  };
}

function renderPlainText(context, message, details) {
  const recipientName = cleanLine(context.recipient?.name);
  const greeting = recipientName ? `Hello ${recipientName},\n\n` : '';
  return [
    'CLOVERSIGHT',
    details.alertHeading,
    '',
    details.incidentDescription,
    `Classification: ${details.scopeLabel}`,
    `Affected regions: ${details.affectedRegions}`,
    `Monitored regions: ${details.checkedRegions}`,
    ...(details.triggerMatches ? [`Trigger phrases: ${details.triggerMatches}`] : []),
    '',
    greeting + cleanText(message),
    '',
    `Watcher: ${details.watcherName}`,
    `Monitored URL: ${details.watcherUrl}`,
    `Detected: ${details.detectedAt}`,
    '',
    'RESPOND TO THIS ALERT',
    details.responseUrl,
    '',
    'You can also reply with “Alert Received” or “All Clear”.',
    `Keep this response code in your reply: ${details.responseCode}`,
    '',
    'This response link is unique to you. Please do not forward it.',
    '',
    '— CLOVERSIGHT by Red Clover Software',
    'You received this transactional message because you are configured as a notification recipient for this watcher.',
    '',
    'Do not want any email from CLOVERSIGHT?',
    `Unsubscribe this address from customer monitoring alerts and team invitations: ${details.unsubscribeUrl}`,
  ].join('\n');
}

function renderHtml(context, message, details) {
  const recipientName = cleanLine(context.recipient?.name);
  const greeting = recipientName ? `<p style="Margin:0 0 18px;color:${COLORS.copy};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px">Hello ${escapeHtml(recipientName)},</p>` : '';
  const preheader = `CLOVERSIGHT: ${details.alertHeading} on ${details.watcherName}. Your response is requested.`;
  const responseHref = safeHttpUrl(details.responseUrl);
  const watcherHref = safeHttpUrl(details.watcherUrl);
  const unsubscribeHref = safeHttpUrl(details.unsubscribeUrl);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(details.alertHeading)} | CLOVERSIGHT</title>
  <style>@media only screen and (max-width:620px){.email-shell{width:100%!important}.email-card{padding:28px 22px!important}.email-header{padding:20px 22px!important}.email-header-logo,.email-header-tone{display:block!important;width:100%!important;padding-left:0!important;text-align:left!important}.email-header-tone{padding-top:12px!important}.email-button{display:block!important;text-align:center!important}.detail-label,.detail-value{display:block!important;width:100%!important}.detail-label{padding-bottom:3px!important}.detail-value{padding-top:0!important}}</style>
</head>
<body style="Margin:0;padding:0;background:${COLORS.canvas};color:${COLORS.ink};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:${COLORS.canvas}">
    <tr>
      <td align="center" style="padding:34px 12px">
        <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border-collapse:separate">
          <tr>
            <td class="email-header" style="padding:22px 30px;border:1px solid ${COLORS.line};border-bottom:0;border-radius:18px 18px 0 0;background:${COLORS.surface}">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">
                <tr>
                  <td class="email-header-logo" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse">
                      <tr>
                        <td><img src="${logoPngDataUrl}" width="258" height="36" alt="CLOVERSIGHT" style="display:block;width:258px;max-width:100%;height:auto;border:0"><span style="display:block;margin-top:6px;color:${COLORS.ink};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700">CLOVERSIGHT</span></td>
                      </tr>
                    </table>
                  </td>
                  <td class="email-header-tone" align="right" valign="middle" style="padding-left:12px">
                    <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${details.tone.surface};color:${details.tone.ink};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.8px;line-height:14px;text-transform:uppercase">${escapeHtml(details.tone.badge)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="padding:42px 38px 36px;border:1px solid ${COLORS.line};border-radius:0 0 18px 18px;background:${COLORS.surface};box-shadow:0 12px 34px rgba(72,32,58,.08)">
              <p style="Margin:0 0 10px;color:${COLORS.pink};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.4px;line-height:18px;text-transform:uppercase">Response requested</p>
              <h1 style="Margin:0 0 20px;color:${COLORS.ink};font-family:Arial,Helvetica,sans-serif;font-size:31px;font-weight:700;letter-spacing:-.8px;line-height:38px">${escapeHtml(details.alertHeading)}</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:24px;border-collapse:separate;border-radius:12px;background:${details.tone.surface}"><tr><td style="padding:17px 18px;color:${details.tone.ink};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px"><strong>${escapeHtml(details.scopeLabel)}</strong><br>${escapeHtml(details.incidentDescription)}</td></tr></table>
              ${greeting}
              <div style="color:${COLORS.copy};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;overflow-wrap:anywhere;word-break:break-word">${messageHtml(message)}</div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:26px;border:1px solid ${COLORS.line};border-radius:12px;border-collapse:separate;background:#FCFAFB">
                ${detailRow('Watcher', details.watcherName)}
                ${detailRow('Monitored URL', details.watcherUrl, watcherHref)}
                ${detailRow('Affected regions', details.affectedRegions)}
                ${detailRow('Monitored regions', details.checkedRegions)}
                ${details.triggerMatches ? detailRow('Trigger phrases', details.triggerMatches) : ''}
                ${detailRow('Detected', details.detectedAt, null, true)}
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:28px;border-collapse:collapse">
                <tr>
                  <td>
                    <a class="email-button" href="${escapeHtml(responseHref)}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:${COLORS.green};color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none">Respond to alert</a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:26px;border-collapse:separate;border-radius:12px;background:${COLORS.greenSoft}">
                <tr>
                  <td style="padding:17px 18px;color:#285B46;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px">
                    <strong style="color:${COLORS.green}">Prefer email?</strong> Reply with <strong>Alert Received</strong> or <strong>All Clear</strong>, and keep this response code in the reply:<br>
                    <span style="display:inline-block;margin-top:7px;padding:4px 8px;border:1px solid #B8DFCD;border-radius:6px;background:#FFFFFF;color:${COLORS.ink};font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;letter-spacing:1px">${escapeHtml(details.responseCode)}</span>
                  </td>
                </tr>
              </table>

              <p style="Margin:22px 0 0;color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px">This signed response link is unique to you. Please do not forward it. If the button does not work, copy and paste this address into your browser:<br><a href="${escapeHtml(responseHref)}" style="color:${COLORS.plum};text-decoration:underline;word-break:break-all">${escapeHtml(details.responseUrl)}</a></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 24px 6px;color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px">
              <strong style="color:${COLORS.plum}">CLOVERSIGHT</strong> by Red Clover Software<br>
              You received this transactional message because you are configured as a notification recipient for this watcher.<br>
              <a href="${escapeHtml(unsubscribeHref)}" style="color:${COLORS.plum};font-weight:700;text-decoration:underline;text-underline-offset:2px">Unsubscribe this address from customer monitoring alerts</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label, value, href = null, last = false) {
  const content = href
    ? `<a href="${escapeHtml(href)}" style="color:${COLORS.plum};font-weight:700;text-decoration:underline;word-break:break-word">${escapeHtml(value)}</a>`
    : escapeHtml(value);
  const border = last ? '' : `border-bottom:1px solid ${COLORS.line};`;
  return `<tr><td class="detail-label" width="118" valign="top" style="width:118px;padding:12px 10px 12px 15px;${border}color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;line-height:19px;text-transform:uppercase">${escapeHtml(label)}</td><td class="detail-value" valign="top" style="padding:12px 15px 12px 4px;${border}color:${COLORS.ink};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;word-break:break-word">${content}</td></tr>`;
}

function emailDetails(context) {
  const alertType = cleanLine(context.alert?.kindLabel) || 'Site change';
  const category = context.alert?.incident?.category;
  return {
    alertType,
    alertHeading: category === 'outage' || /\bdetected$/i.test(alertType) ? alertType : `${alertType} detected`,
    tone: INCIDENT_TONES[category] ?? INCIDENT_TONES.site_change,
    incidentDescription: cleanLine(context.alert?.incidentDescription) || 'A monitored website change needs your review.',
    scopeLabel: cleanLine(context.alert?.outageScopeLabel) || alertType,
    affectedRegions: cleanLine(context.alert?.affectedRegionsLabel) || 'Region details unavailable',
    checkedRegions: cleanLine(context.alert?.checkedRegionsLabel) || 'Region details unavailable',
    triggerMatches: cleanLine(context.alert?.triggerMatchesLabel),
    watcherName: cleanLine(context.watcher?.name) || 'Website watcher',
    watcherUrl: cleanLine(context.watcher?.url) || 'Unavailable',
    detectedAt: formatTimestamp(context.alert?.openedAt),
    responseCode: cleanLine(context.responseCode) || 'Unavailable',
    responseUrl: cleanLine(context.responseUrl),
    unsubscribeUrl: cleanLine(context.unsubscribeUrl),
  };
}

function messageHtml(value) {
  const text = cleanText(value);
  if (!text) return `<p style="Margin:0">CLOVERSIGHT detected a change that needs your review.</p>`;
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="Margin:0 0 14px">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatTimestamp(value) {
  const text = cleanLine(value);
  const timestamp = Date.parse(text);
  if (!text || !Number.isFinite(timestamp)) return 'Time unavailable';
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/:\d{2}\.\d{3}Z$/, ' UTC');
}

function safeHttpUrl(value) {
  const input = cleanLine(value);
  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
  } catch {
    return '#';
  }
}

function cleanText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function cleanLine(value) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
