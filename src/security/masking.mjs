import { cancellationView } from '../billing/cancellation.mjs';
import { maskEmail, maskPayment, maskUrl } from '../lib.mjs';

export function stewardAccountSummary(account) {
  return {
    id: account.id,
    legalName: account.legalName,
    contactName: account.contactName ?? null,
    contactEmail: account.contactEmail,
    country: account.country,
    region: account.region,
    postalCode: account.postalCode,
    planId: account.planId,
    cancellation: cancellationView(account),
    provider: account.provider,
    providerCustomerId: maskPayment(account.providerCustomerId),
    closureStatus: account.closureStatus,
    closureScheduledAt: account.closureScheduledAt,
    deleteAfter: account.deleteAfter,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export function stewardTransactionSummary(transaction) {
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    provider: transaction.provider,
    type: transaction.type,
    planId: transaction.planId,
    amountMinor: transaction.amountMinor,
    creditMinor: transaction.creditMinor ?? 0,
    taxMinor: transaction.taxMinor,
    currency: transaction.currency,
    status: transaction.status,
    outcomeReason: transaction.outcomeReason,
    retryCount: transaction.retryCount ?? 0,
    automaticRetryAt: transaction.automaticRetryAt ?? null,
    paymentReference: maskPayment(transaction.paymentReference),
    providerCustomerId: maskPayment(transaction.providerCustomerId),
    providerInvoiceId: maskPayment(transaction.providerInvoiceId),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

export function stewardAuditEventSummary(event) {
  return {
    id: event.id,
    at: event.at,
    actorId: event.actorId,
    actorRole: event.actorRole,
    action: event.action,
    accountId: event.accountId,
    transactionId: event.transactionId,
    targetId: event.targetId,
    reason: event.reason,
    requestId: event.requestId,
  };
}

function stewardWatcherSummary(watcher) {
  const config = watcher.config;
  return {
    id: watcher.id,
    accountId: watcher.accountId,
    name: watcher.name,
    status: watcher.status,
    configRevision: watcher.configRevision,
    lastCheckAt: watcher.lastCheckAt,
    lastOutcome: watcher.lastOutcome,
    nextCheckAt: watcher.nextCheckAt,
    openAlertId: watcher.openAlertId,
    createdAt: watcher.createdAt,
    updatedAt: watcher.updatedAt,
    config: {
      url: maskUrl(config.url),
      checkIntervalSeconds: config.checkIntervalSeconds,
      methods: structuredClone(config.methods ?? []),
      textThresholdPercent: config.textThresholdPercent,
      pixelThresholdPercent: config.pixelThresholdPercent,
      ignoredSelectorCount: config.ignoredSelectors?.length ?? 0,
      bannedPhraseCount: config.bannedPhrases?.length ?? 0,
      recipientTiers: (config.recipientTiers ?? []).map((tier) => ({
        id: tier.id,
        name: tier.name,
        delayMinutes: tier.delayMinutes,
        requiredAcknowledgements: tier.requiredAcknowledgements,
        recipients: (tier.recipients ?? []).map((recipient) => ({
          id: recipient.id,
          name: recipient.name,
          channel: recipient.channel,
          destination: recipient.channel === 'email' ? maskEmail(recipient.destination) : maskPayment(recipient.destination),
          enabled: recipient.enabled,
        })),
      })),
      allClearThreshold: config.allClearThreshold,
      alertReceivedThreshold: config.alertReceivedThreshold,
      reAlertMinutes: config.reAlertMinutes,
    },
  };
}

export function stewardAccountView(state, account) {
  return {
    account: stewardAccountSummary(account),
    watchers: state.watchers.filter((watcher) => watcher.accountId === account.id).map(stewardWatcherSummary),
    transactions: state.transactions.filter((transaction) => transaction.accountId === account.id).map(stewardTransactionSummary),
    notes: state.staffNotes.filter((note) => note.accountId === account.id),
    events: state.auditEvents.filter((event) => event.accountId === account.id && !event.action.startsWith('watcher.')).slice(-100).reverse().map(stewardAuditEventSummary),
  };
}
