import { PLANS } from '../../../../src/domain/plans.mjs';
import labels from './labels.json' with { type: 'json' };

const ui = labels.pricing;
const fmt = (n) => n.toLocaleString('en-US');
const plural = (n, name) => fmt(n) + ' ' + name + (n === 1 ? '' : 's');
const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key]);

export const offers = Object.values(PLANS).map(p => {
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency, minimumFractionDigits: p.priceMinor % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(p.priceMinor / 100);
  const free = p.id === 'free';
  const regional = p.maxRegionalWatchers > 0;
  const all = p.maxRegionalWatchers === p.maxWatchers;
  const regions = regional ? p.maxCheckRegions + ' / ' + (all ? ui.allWatchers : plural(p.maxRegionalWatchers, 'watcher')) : '1 region';
  const cadence = p.minIntervalSeconds === 604800 ? ui.weekly : p.minIntervalSeconds === 3600 ? ui.hourly : plural(p.minIntervalSeconds / 60, 'minute');
  const hours = p.reportWindowSeconds / 3600;
  const window = hours >= 48 ? plural(hours / 24, 'day') : plural(hours, 'hour');
  const history = p.historyDays === null ? ui.indefinite : p.historyDays === 365 ? '1 year' : plural(p.historyDays, 'day');
  const email = fmt(p.dailyDeliveryLimits.email);
  const sms = p.dailyDeliveryLimits.sms;
  const limits = {
    price, credits: fmt(p.captureCredits), watchers: fmt(p.maxWatchers), cadence: cadence + (free ? '*' : ''), regions,
    core: ['outage', 'banned_phrase', 'text_change'].every(method => p.methods.includes(method)) ? ui.included : ui.excluded,
    visual: p.methods.includes('pixel_change') ? ui.included : (free ? ui.trial : ui.excluded),
    users: fmt(p.maxUsers), tiers: fmt(p.maxRecipientTiers), recipients: fmt(p.maxRecipients), email,
    sms: sms ? fmt(sms) : ui.excluded, history,
    reports: p.reportAllowance ? p.reportAllowance + ' / ' + ui.rolling + ' ' + window : ui.none,
    support: ui.supportLevels[p.id],
  };
  const retention = p.historyDays === null ? ui.storageAgreement : format(ui.retention, { time: history.replace(/ (days?|years?)$/, (_, unit) => '-' + unit.replace(/s$/, '')) });
  const highlights = [
    format(ui.monthCredits, { credits: fmt(p.captureCredits) }),
    plural(p.maxWatchers, 'watcher') + (regional ? ' and ' : ', ') + plural(p.maxUsers, 'user') + (regional ? '' : ', 1 region'),
    regional ? format(ui.regionOn, { regions: plural(p.maxCheckRegions, 'region'), watchers: all ? ui.everyWatcher : plural(p.maxRegionalWatchers, 'watcher') }) + ' · ' + retention :
      retention + ' · ' + (p.reportAllowance ? plural(p.reportAllowance, 'report') + ' / ' + ui.rolling + ' ' + window : ui.noPdf),
    format(ui.dayEmail, { email }) + (sms ? ' · ' + format(ui.daySms, { sms: fmt(sms) }) : ''),
  ];
  return { id: p.id, name: p.name, selfServe: p.selfServe, price, limits, highlights, free,
    cadence: free ? format(ui.trialCadence, { cadence }) : format(ui.paidCadence, { cadence: p.minIntervalSeconds === 3600 ? ui.hourly.toLowerCase() : format(ui.rate, { cadence }) }) };
});
