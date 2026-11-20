import { logoDarkPdfCommands } from '../brand/assets.mjs';
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const COLORS = Object.freeze({ ink: '0.13 0.08 0.12', muted: '0.38 0.31 0.36', plum: '0.42 0.13 0.31', pink: '0.88 0.24 0.58', blush: '0.98 0.93 0.96', gold: '0.86 0.58 0.15', green: '0.16 0.55 0.40', line: '0.86 0.80 0.84', white: '1 1 1' });

export function renderMonitoringReport(model) {
  const pdf = new PdfDocument();
  renderCover(pdf, model);
  renderOverview(pdf, model);
  renderDomains(pdf, model);
  renderWatchers(pdf, model);
  renderIncidents(pdf, model);
  return pdf.build({ title: `${model.teamName} monitoring report`, author: 'CLOVERSIGHT by Red Clover Software' });
}

function renderCover(pdf, model) {
  pdf.page();
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.plum, true);
  pdf.circle(500, 115, 92, COLORS.pink, true); pdf.circle(520, 95, 26, COLORS.gold, true);
  brandLogo(pdf, MARGIN, 52, 240);
  pdf.text('Monitoring report', MARGIN, 235, { size: 34, bold: true, color: COLORS.white });
  pdf.text(model.teamName, MARGIN, 286, { size: 19, bold: true, color: COLORS.white });
  pdf.text(model.scopeLabel, MARGIN, 326, { size: 13, color: COLORS.white });
  pdf.text(`${model.periodLabel} · ${model.rangeLabel}`, MARGIN, 352, { size: 11, color: COLORS.white });
  pdf.line(MARGIN, 400, PAGE_WIDTH - MARGIN, 400, COLORS.pink, 2);
  pdf.text('Prepared for operational review', MARGIN, 430, { size: 12, bold: true, color: COLORS.white });
  pdf.text(`Generated ${model.generatedLabel}`, MARGIN, 454, { size: 10, color: COLORS.white });
  pdf.text('CLOVERSIGHT by Red Clover Software', MARGIN, 720, { size: 10, color: COLORS.white });
}

function renderOverview(pdf, model) {
  pageHeader(pdf, model, 'Executive overview', 'The signals most useful for a standup or leadership review.');
  const cards = [
    ['Availability', model.availabilityLabel, COLORS.green],
    ['Completed checks', String(model.totalChecks), COLORS.plum],
    ['Outage results', String(model.outageChecks), model.outageChecks ? COLORS.pink : COLORS.green],
    ['Change results', String(model.changedChecks), model.changedChecks ? COLORS.gold : COLORS.green],
  ];
  cards.forEach(([label, value, color], index) => metricCard(pdf, MARGIN + (index % 2) * 258, 150 + Math.floor(index / 2) * 100, 240, 78, label, value, color));
  pdf.text('Operational interpretation', MARGIN, 380, { size: 16, bold: true, color: COLORS.ink });
  const notes = model.notes.length ? model.notes : ['No material outage or change patterns were identified in the selected period.'];
  let y = 414;
  for (const note of notes.slice(0, 7)) { pdf.circle(MARGIN + 5, y + 5, 3, COLORS.pink, true); y = pdf.paragraph(note, MARGIN + 18, y, 490, { size: 10, color: COLORS.ink, leading: 15 }) + 9; }
  footer(pdf, model);
}

function renderDomains(pdf, model) {
  pageHeader(pdf, model, 'Domain performance', 'Availability and detected-change volume by monitored domain.');
  tableHeader(pdf, 150, [['Domain', 196], ['Checks', 68], ['Uptime', 80], ['Outages', 80], ['Changes', 72]]);
  let y = 177;
  for (const row of model.domains.slice(0, 18)) {
    if (y > 700) { footer(pdf, model); pageHeader(pdf, model, 'Domain performance (continued)', 'Additional monitored domains.'); tableHeader(pdf, 150, [['Domain', 196], ['Checks', 68], ['Uptime', 80], ['Outages', 80], ['Changes', 72]]); y = 177; }
    tableRow(pdf, y, [[row.domain, 196], [row.totalChecks, 68], [row.availabilityLabel, 80], [row.outageChecks, 80], [row.changedChecks, 72]]); y += 28;
  }
  if (!model.domains.length) pdf.text('No completed checks were recorded for this scope.', MARGIN, 185, { size: 11, color: COLORS.muted });
  footer(pdf, model);
}

function renderWatchers(pdf, model) {
  pageHeader(pdf, model, 'Watcher health', 'Latest result and activity for each watcher in scope.');
  tableHeader(pdf, 150, [['Watcher', 196], ['Checks', 64], ['Latest', 96], ['Outages', 72], ['Regions', 68]]);
  let y = 177;
  for (const row of model.watchers.slice(0, 36)) {
    if (y > 700) { footer(pdf, model); pageHeader(pdf, model, 'Watcher health (continued)', 'Additional watcher rows.'); tableHeader(pdf, 150, [['Watcher', 196], ['Checks', 64], ['Latest', 96], ['Outages', 72], ['Regions', 68]]); y = 177; }
    tableRow(pdf, y, [[row.name, 196], [row.totalChecks, 64], [row.latestOutcome, 96], [row.outageChecks, 72], [row.regions, 68]]); y += 28;
  }
  footer(pdf, model);
}

function renderIncidents(pdf, model) {
  pageHeader(pdf, model, 'Incident digest', 'The most recent outage and change events in the selected period.');
  let y = 150;
  for (const item of model.incidents.slice(0, 20)) {
    if (y > 685) { footer(pdf, model); pageHeader(pdf, model, 'Incident digest (continued)', 'Additional recent events.'); y = 150; }
    pdf.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 74, COLORS.blush, true);
    pdf.text(item.kind, MARGIN + 14, y + 14, { size: 10, bold: true, color: COLORS.pink });
    pdf.text(item.watcher, MARGIN + 125, y + 14, { size: 10, bold: true, color: COLORS.ink, maxWidth: 285 });
    pdf.text(item.at, PAGE_WIDTH - MARGIN - 135, y + 14, { size: 9, color: COLORS.muted, maxWidth: 125, align: 'right' });
    pdf.paragraph(item.summary, MARGIN + 14, y + 37, PAGE_WIDTH - MARGIN * 2 - 28, { size: 9, color: COLORS.ink, leading: 12, maxLines: 2 });
    y += 86;
  }
  if (!model.incidents.length) pdf.text('No outage or change incidents were recorded for this scope.', MARGIN, 170, { size: 11, color: COLORS.muted });
  if (model.truncated) pdf.text('This report uses the newest 5,000 retained results in the requested range to keep generation bounded.', MARGIN, 720, { size: 8, color: COLORS.muted });
  footer(pdf, model);
}

function pageHeader(pdf, model, title, subtitle) { pdf.page(); pdf.rect(0, 0, PAGE_WIDTH, 92, COLORS.plum, true); brandLogo(pdf, MARGIN, 25, 190); pdf.text(title, MARGIN, 112, { size: 23, bold: true, color: COLORS.ink }); pdf.text(subtitle, MARGIN, 137, { size: 10, color: COLORS.muted }); pdf.text(model.scopeLabel, PAGE_WIDTH - MARGIN - 180, 36, { size: 9, color: COLORS.white, maxWidth: 180, align: 'right' }); }
function brandLogo(pdf, x, top, width) { const scale = width / 516; pdf.command(`q ${n(scale)} 0 0 ${n(-scale)} ${n(x)} ${n(PAGE_HEIGHT - top)} cm
${logoDarkPdfCommands}
Q`); }
function footer(pdf, model) { pdf.line(MARGIN, 752, PAGE_WIDTH - MARGIN, 752, COLORS.line, 0.7); pdf.text(model.rangeLabel, MARGIN, 764, { size: 8, color: COLORS.muted }); pdf.text('Confidential · CLOVERSIGHT', PAGE_WIDTH - MARGIN - 160, 764, { size: 8, color: COLORS.muted, maxWidth: 160, align: 'right' }); }
function metricCard(pdf, x, y, width, height, label, value, color) { pdf.rect(x, y, width, height, COLORS.blush, true); pdf.rect(x, y, 5, height, color, true); pdf.text(label, x + 18, y + 17, { size: 9, bold: true, color: COLORS.muted }); pdf.text(value, x + 18, y + 40, { size: 20, bold: true, color }); }
function tableHeader(pdf, y, columns) { pdf.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 24, COLORS.plum, true); let x = MARGIN + 8; for (const [label, width] of columns) { pdf.text(label, x, y + 7, { size: 8, bold: true, color: COLORS.white, maxWidth: width - 12 }); x += width; } }
function tableRow(pdf, y, values) { if (Math.floor((y - 177) / 28) % 2) pdf.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 28, COLORS.blush, true); let x = MARGIN + 8; for (const [value, width] of values) { pdf.text(String(value ?? '—'), x, y + 9, { size: 8.5, color: COLORS.ink, maxWidth: width - 12 }); x += width; } pdf.line(MARGIN, y + 28, PAGE_WIDTH - MARGIN, y + 28, COLORS.line, 0.35); }

class PdfDocument {
  constructor() { this.pages = []; this.current = null; }
  page() { this.current = []; this.pages.push(this.current); }
  command(value) { if (!this.current) this.page(); this.current.push(value); }
  rect(x, top, width, height, color, fill = false) { this.command(`${color} ${fill ? 'rg' : 'RG'} ${n(x)} ${n(PAGE_HEIGHT - top - height)} ${n(width)} ${n(height)} re ${fill ? 'f' : 'S'}`); }
  line(x1, top1, x2, top2, color, width = 1) { this.command(`${color} RG ${n(width)} w ${n(x1)} ${n(PAGE_HEIGHT - top1)} m ${n(x2)} ${n(PAGE_HEIGHT - top2)} l S`); }
  circle(cx, top, radius, color, fill = false) { const cy = PAGE_HEIGHT - top; const k = radius * 0.55228475; this.command(`${color} ${fill ? 'rg' : 'RG'} ${n(cx + radius)} ${n(cy)} m ${n(cx + radius)} ${n(cy + k)} ${n(cx + k)} ${n(cy + radius)} ${n(cx)} ${n(cy + radius)} c ${n(cx - k)} ${n(cy + radius)} ${n(cx - radius)} ${n(cy + k)} ${n(cx - radius)} ${n(cy)} c ${n(cx - radius)} ${n(cy - k)} ${n(cx - k)} ${n(cy - radius)} ${n(cx)} ${n(cy - radius)} c ${n(cx + k)} ${n(cy - radius)} ${n(cx + radius)} ${n(cy - k)} ${n(cx + radius)} ${n(cy)} c ${fill ? 'f' : 'S'}`); }
  text(value, x, top, options = {}) { const size = options.size ?? 10; const bold = options.bold ? 'F2' : 'F1'; const maxWidth = options.maxWidth; let text = sanitize(value); if (maxWidth) text = truncate(text, Math.max(1, Math.floor(maxWidth / (size * 0.52)))); let tx = x; if (options.align === 'right' && maxWidth) tx += Math.max(0, maxWidth - text.length * size * 0.5); this.command(`BT ${options.color ?? COLORS.ink} rg /${bold} ${n(size)} Tf ${n(options.tracking ?? 0)} Tc 1 0 0 1 ${n(tx)} ${n(PAGE_HEIGHT - top - size)} Tm (${escapePdf(text)}) Tj ET`); }
  paragraph(value, x, top, width, options = {}) { const size = options.size ?? 10; const leading = options.leading ?? size * 1.35; const lines = wrap(sanitize(value), Math.max(4, Math.floor(width / (size * 0.52)))).slice(0, options.maxLines ?? 100); lines.forEach((line, index) => this.text(line, x, top + index * leading, options)); return top + lines.length * leading; }
  build(meta = {}) {
    const objects = [null, '<< /Type /Catalog /Pages 2 0 R >>', null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
    const kids = [];
    for (const commands of this.pages.slice(0, 40)) { const pageId = objects.length; const contentId = pageId + 1; kids.push(`${pageId} 0 R`); objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`); const stream = commands.join('\n'); objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`); }
    objects[2] = `<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(' ')}] >>`;
    const infoId = objects.length; objects.push(`<< /Title (${escapePdf(meta.title ?? 'CLOVERSIGHT report')}) /Author (${escapePdf(meta.author ?? 'CLOVERSIGHT')}) /Producer (CLOVERSIGHT) >>`);
    let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0];
    for (let i = 1; i < objects.length; i += 1) { offsets[i] = Buffer.byteLength(output, 'binary'); output += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
    const xref = Buffer.byteLength(output, 'binary'); output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`; for (let i = 1; i < objects.length; i += 1) output += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`; output += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(output, 'binary');
  }
}

function sanitize(value) { return String(value ?? '').replace(/[\u2013\u2014\u2019\u201c\u201d\u00b7]/g, (char) => ({ '–': '-', '—': '-', '’': "'", '“': '"', '”': '"', '·': ' | ' })[char]).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?'); }
function escapePdf(value) { return String(value).replace(/([\\()])/g, '\\$1'); }
function truncate(value, max) { return value.length <= max ? value : `${value.slice(0, Math.max(1, max - 3))}...`; }
function wrap(value, max) { const words = value.split(/\s+/); const lines = []; let line = ''; for (const word of words) { if (!line) line = word; else if (`${line} ${word}`.length <= max) line += ` ${word}`; else { lines.push(line); line = word; } } if (line) lines.push(line); return lines; }
function n(value) { return Number(value).toFixed(2).replace(/\.00$/, ''); }
