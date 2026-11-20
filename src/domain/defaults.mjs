import { id, ISO } from '../lib.mjs';

export function defaultWatcher(accountId, email) {
  const now = ISO();
  return {
    id: id('watch'), accountId, name: 'Homepage watch', status: 'draft', configRevision: 1, createdAt: now, updatedAt: now,
    nextCheckAt: now, previousStatusBeforeClosure: null, consecutiveInternalErrors: 0,
    config: {
      url: 'https://example.com/', checkIntervalSeconds: 604800,
      checkRegions: [],
      methods: ['outage', 'banned_phrase', 'text_change'], bannedPhrases: [], textThresholdPercent: 5,
      pixelThresholdPercent: 3, ignoredSelectors: [], requestHeaders: {}, timeoutMs: 30000,
      recipientTiers: [{ id: id('tier'), name: 'Primary', delayMinutes: 15, requiredAcknowledgements: 1, recipients: [{ id: id('rcpt'), name: 'Account owner', channel: 'email', destination: email, enabled: true }] }],
      allClearThreshold: 1, alertReceivedThreshold: 1, reAlertMinutes: 60,
      templates: {
        subject: '[{{alert.kindLabel}}] {{watcher.name}}',
        text: 'CLOVERSIGHT detected {{alert.summary}} at {{watcher.url}}. Matched phrase: {{alert.quotedMatch}}. Reply with “Alert Received” or “All Clear”, or use {{responseUrl}}.',
        sms: 'CLOVERSIGHT: {{watcher.name}} — {{alert.summary}}. Reply ALERT RECEIVED or ALL CLEAR. Code {{responseCode}}.'
      }
    },
    baselineSnapshotId: null, lastCheckAt: null, lastOutcome: 'never_checked', openAlertId: null,
  };
}

export function emptyState(now = ISO()) {
  return { schemaVersion: 2, revision: 0, createdAt: now, updatedAt: now, accounts: [], closedAccounts: [], teamMembers: [], teamInvitations: [], userProfiles: [], watchers: [], snapshots: [], alerts: [], transactions: [], refunds: [], notifications: [], emailSuppressions: [], emailUnsubscribeLinks: [], staffNotes: [], auditEvents: [], stewardUsers: [], stewardSettings: [], stewardRequestEvents: [], stewardAlertMarkers: [], idempotency: [], providerEvents: [], jobs: [] };
}
