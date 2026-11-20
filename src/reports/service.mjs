import { fairQueueGroupId, id, ISO } from '../lib.mjs';
import { renderMonitoringReport } from './pdf.mjs';
import { renderMonitoringReportHtml } from './html.mjs';
import { entitlements, historyCutoff } from '../domain/plans.mjs';

const PERIOD_DAYS = Object.freeze({ day: 1, week: 7, month: 31, year: 366 });

export class ReportService {
  constructor({ store, assets, config, logger }) { Object.assign(this, { store, assets, config, logger }); this.sqs = null; }

  async request(accountId, input, actor) {
    const period = String(input.period ?? 'week');
    if (!PERIOD_DAYS[period]) throw Object.assign(new Error('Report period must be day, week, month, or year.'), { statusCode: 400 });
    const domain = String(input.domain ?? 'all').trim().toLowerCase().slice(0, 253) || 'all';
    const now = ISO();
    const requestMutation = (state) => {
      const account = state.accounts.find((item) => item.id === accountId && item.closureStatus === 'active');
      if (!account) throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      const access = entitlements(account);
      if (!access.reportAllowance) throw Object.assign(new Error('PDF reports are not included on this plan.'), { statusCode: 403, code: 'REPORT_PLAN_REQUIRED' });
      const allowedDomains = new Set(state.watchers.filter((item) => item.accountId === accountId && item.status !== 'deleted').map((item) => safeDomain(item.config.url)));
      if (domain !== 'all' && !allowedDomains.has(domain)) throw Object.assign(new Error('The selected domain is not part of this account.'), { statusCode: 400 });
      const active = state.jobs.filter((item) => item.type === 'report' && item.accountId === accountId && ['queued', 'running'].includes(item.status));
      if (active.length >= 3) throw Object.assign(new Error('Three reports are already being prepared. Wait for one to finish.'), { statusCode: 429 });
      const recentCutoff = Date.now() - access.reportWindowSeconds * 1000;
      const recentCount = state.jobs.filter((item) => item.type === 'report' && item.accountId === accountId && Date.parse(item.requestedAt) >= recentCutoff).length;
      if (recentCount >= access.reportAllowance) {
        const windowLabel = access.reportWindowSeconds === 86400 ? 'rolling 24-hour' : 'monthly';
        throw Object.assign(new Error(`This account has reached its ${access.reportAllowance}-report ${windowLabel} allowance. Try again later or change plans.`), { statusCode: 429, code: 'REPORT_ALLOWANCE_EXHAUSTED' });
      }
      const value = { id: id('report'), type: 'report', accountId, requestedBy: actor.actorId, period, domain, status: 'queued', progress: 5, requestedAt: now, startedAt: null, completedAt: null, assetKey: null, htmlAssetKey: null, error: null, expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString() };
      state.jobs.push(value); return value;
    };
    // Allowance and active-report counts need a coherent history. An eventual
    // JOBS# index can miss a newly created job after its account revision has
    // advanced, so this command retains the strong compatibility transaction
    // until a direct conditional quota record replaces the count.
    const job = await this.store.transact('report.request', requestMutation);
    if (!this.config.reportQueueUrl) { await this.process(job.id); return this.status(accountId, job.id); }
    try {
      const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
      this.sqs ??= new SQSClient({ region: this.config.awsRegion });
      await this.sqs.send(new SendMessageCommand({ QueueUrl: this.config.reportQueueUrl, MessageGroupId: fairQueueGroupId(accountId), MessageBody: JSON.stringify({ type: 'report', jobId: job.id, requestedAt: now }) }));
    } catch (error) {
      await this.fail(job.id, error); throw error;
    }
    return job;
  }

  async status(accountId, jobId) {
    const job = typeof this.store.getEntity === 'function'
      ? await this.store.getEntity('jobs', jobId)
      : (await this.store.read()).jobs.find((item) => item.id === jobId);
    if (!job || job.type !== 'report' || job.accountId !== accountId) throw Object.assign(new Error('Report job not found.'), { statusCode: 404 });
    return reportStatus(job);
  }

  async list(accountId) { const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(accountId, { lookupPrefixes: ['JOBS#'] }) : await this.store.read(); return state.jobs.filter((item) => item.type === 'report' && item.accountId === accountId).sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt))).slice(0, 20).map(reportStatus); }

  async #mutateJob(jobId, label, mutate) {
    if (typeof this.store.getEntity !== 'function' || typeof this.store.transactAccount !== 'function') return this.store.transact(label, mutate);
    const job = await this.store.getEntity('jobs', jobId);
    if (!job || job.type !== 'report') return null;
    return this.store.transactAccount(job.accountId, label, mutate, { lookupPrefixes: [], directEntities: [{ collection: 'jobs', id: jobId }] });
  }

  async process(jobId) {
    const claimed = await this.#mutateJob(jobId, 'report.start', (state) => { const job = state.jobs.find((item) => item.id === jobId && item.type === 'report'); if (!job || job.status === 'completed' || !state.accounts.some((account) => account.id === job.accountId && account.closureStatus === 'active')) return null; if (job.status === 'running' && job.startedAt > new Date(Date.now() - 10 * 60_000).toISOString()) return null; job.status = 'running'; job.progress = 20; job.startedAt = ISO(); job.error = null; return structuredClone(job); });
    if (!claimed) return null;
    try {
      await this.#mutateJob(claimed.id, 'report.progress', (state) => { const job = state.jobs.find((item) => item.id === claimed.id && item.status === 'running'); if (job) job.progress = 55; return null; });
      const state = typeof this.store.readAccount === 'function' ? await this.store.readAccount(claimed.accountId, { lookupPrefixes: ['WATCHERS#', 'SNAPSHOTS#'] }) : await this.store.read();
      const account = state.accounts.find((item) => item.id === claimed.accountId && item.closureStatus === 'active');
      if (!account || !entitlements(account).reportAllowance) throw new Error('Report generation is unavailable while paid access is inactive.');
      const model = reportModel(state, claimed); const pdf = renderMonitoringReport(model); const key = `reports/${claimed.accountId}/${claimed.id}.pdf`;
      await this.#requireActiveAccount(claimed.accountId);
      await this.assets.put(key, pdf, { contentType: 'application/pdf', cacheControl: 'private, max-age=300' });
      const htmlKey = `reports/${claimed.accountId}/${claimed.id}.html`;
      const html = renderMonitoringReportHtml(model);
      await this.#requireActiveAccount(claimed.accountId);
      await this.assets.put(htmlKey, html, { contentType: 'text/html; charset=utf-8', cacheControl: 'private, max-age=300' });
      return await this.#mutateJob(claimed.id, 'report.complete', (draft) => { const job = draft.jobs.find((item) => item.id === claimed.id); if (!job || !draft.accounts.some((account) => account.id === claimed.accountId && account.closureStatus === 'active')) throw Object.assign(new Error('Account closed before report completion.'), { code: 'REPORT_ACCOUNT_INACTIVE' }); job.status = 'completed'; job.progress = 100; job.completedAt = ISO(); job.assetKey = key; job.htmlAssetKey = htmlKey; job.sizeBytes = pdf.length; job.htmlSizeBytes = html.length; return job; });
    } catch (error) { await this.fail(claimed.id, error); throw error; }
  }

  async #requireActiveAccount(accountId) {
    const account = typeof this.store.getEntity === 'function'
      ? await this.store.getEntity('accounts', accountId)
      : (await this.store.read()).accounts.find((item) => item.id === accountId);
    if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account closed before report generation.'), { code: 'REPORT_ACCOUNT_INACTIVE' });
  }

  async fail(jobId, error) { return this.#mutateJob(jobId, 'report.fail', (state) => { const job = state.jobs.find((item) => item.id === jobId && item.type === 'report'); if (!job) return null; job.status = 'failed'; job.progress = 100; job.completedAt = ISO(); job.error = String(error.message).slice(0, 1000); return null; }); }
}

function reportStatus(job) { return { id: job.id, period: job.period, domain: job.domain, status: job.status, progress: job.progress, requestedAt: job.requestedAt, startedAt: job.startedAt, completedAt: job.completedAt, expiresAt: job.expiresAt, assetKey: job.assetKey, htmlAssetKey: job.htmlAssetKey ?? null, error: job.error }; }

function reportModel(state, job) {
  const account = state.accounts.find((item) => item.id === job.accountId); const to = new Date(job.requestedAt); const requestedFrom = new Date(to.getTime() - PERIOD_DAYS[job.period] * 86400_000);
  const retainedFrom = account ? historyCutoff(entitlements(account), to.getTime()) : null;
  const from = retainedFrom && retainedFrom > requestedFrom.toISOString() ? new Date(retainedFrom) : requestedFrom;
  const scopedWatchers = state.watchers.filter((item) => item.accountId === job.accountId && item.status !== 'deleted' && (job.domain === 'all' || safeDomain(item.config.url) === job.domain)); const ids = new Set(scopedWatchers.map((item) => item.id));
  const allSnapshots = state.snapshots.filter((item) => item.accountId === job.accountId && ids.has(item.watcherId) && Date.parse(item.capturedAt) >= from.getTime() && Date.parse(item.capturedAt) <= to.getTime()).sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt))); const truncated = allSnapshots.length > 5000; const snapshots = allSnapshots.slice(0, 5000);
  const up = snapshots.filter(snapshotIsUp).length; const outages = snapshots.length - up; const changed = snapshots.filter((item) => item.outcome === 'changed').length;
  const domainMap = new Map();
  for (const watcher of scopedWatchers) { const domain = safeDomain(watcher.config.url); const rows = snapshots.filter((item) => item.watcherId === watcher.id); const row = domainMap.get(domain) ?? { domain, totalChecks: 0, upChecks: 0, outageChecks: 0, changedChecks: 0 }; row.totalChecks += rows.length; row.upChecks += rows.filter(snapshotIsUp).length; row.outageChecks += rows.filter((item) => !snapshotIsUp(item)).length; row.changedChecks += rows.filter((item) => item.outcome === 'changed').length; domainMap.set(domain, row); }
  const domains = [...domainMap.values()].map((row) => ({ ...row, availabilityLabel: percent(row.upChecks, row.totalChecks) })).sort((a, b) => b.outageChecks - a.outageChecks || b.changedChecks - a.changedChecks || a.domain.localeCompare(b.domain));
  const watchers = scopedWatchers.map((watcher) => { const rows = snapshots.filter((item) => item.watcherId === watcher.id); return { name: watcher.name, totalChecks: rows.length, outageChecks: rows.filter((item) => !snapshotIsUp(item)).length, latestOutcome: rows[0]?.outcome ?? watcher.lastOutcome ?? 'none', regions: watcher.config.checkRegions?.length || 1 }; }).sort((a, b) => b.outageChecks - a.outageChecks || a.name.localeCompare(b.name));
  const incidents = snapshots.filter((item) => item.outcome === 'outage' || item.outcome === 'changed').slice(0, 20).map((item) => ({ kind: item.outcome === 'outage' ? 'OUTAGE' : 'CHANGE', watcher: scopedWatchers.find((watcher) => watcher.id === item.watcherId)?.name ?? 'Watcher', at: new Date(item.capturedAt).toISOString().slice(0, 16).replace('T', ' '), summary: (item.reasons ?? []).map((reason) => reason.method === 'outage' ? 'The target did not respond as expected.' : reason.message).join('; ') || item.outcome }));
  const notes = []; if (outages) notes.push(`${outages} outage result${outages === 1 ? '' : 's'} occurred; review the incident digest and affected regions.`); if (changed) notes.push(`${changed} content or visual change result${changed === 1 ? '' : 's'} crossed configured thresholds.`); const risky = domains.filter((item) => item.outageChecks).slice(0, 3); if (risky.length) notes.push(`Domains with outage results: ${risky.map((item) => item.domain).join(', ')}.`); if (truncated) notes.push('The selected range exceeded 5,000 retained results; the newest 5,000 were summarized to bound processing time and PDF size.');
  return { teamName: account?.legalName ?? 'CLOVERSIGHT account', scopeLabel: job.domain === 'all' ? 'All monitored domains' : job.domain, periodLabel: ({ day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Annual' })[job.period], rangeLabel: `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)} UTC`, generatedLabel: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC', totalChecks: snapshots.length, outageChecks: outages, changedChecks: changed, availabilityLabel: percent(up, snapshots.length), domains, watchers, incidents, notes, truncated };
}
function safeDomain(value) { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'invalid-target'; } }
function snapshotIsUp(snapshot) { return snapshot.outcome !== 'outage' && !(snapshot.reasons ?? []).some((reason) => reason.method === 'outage'); }
function percent(up, total) { return total ? `${(up / total * 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%` : 'No data'; }
