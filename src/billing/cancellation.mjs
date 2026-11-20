/** @module billing/cancellation
 * @description Durable subscription cancellation, provider reconciliation and confirmation.
 */
import { id, ISO, addSeconds } from '../lib.mjs';
import { appendAudit } from '../services/audit.mjs';
import { subscriptionEnd } from './providers.mjs';

const terminal = status => ['canceled', 'incomplete_expired'].includes(status);
const error = (code, message) => Object.assign(new Error(message), { code, statusCode: 409 });
const systemActor = { actorId: 'billing-cancellation', role: 'system' };

export function requestCancellation(state, account, mode, actor) {
  if (!['period_end', 'immediate'].includes(mode)) throw error('CANCELLATION_MODE_INVALID', 'Invalid cancellation mode.');
  const prior = account.billingCancellation;
  if (prior && (prior.mode === 'immediate' || mode === 'period_end')) return cancellationView(account);
  const now = ISO();
  account.billingCancellation = { id: id('cancel'), mode, status: 'requested', requestedAt: now, updatedAt: now, nextAttemptAt: now, attempts: 0, notice: null };
  account.updatedAt = now;
  appendAudit(state, actor, 'billing.cancellation_requested', { accountId: account.id, targetId: account.billingCancellation.id, reason: mode });
  return cancellationView(account);
}

export function assertBillingOpen(account) {
  if (account?.billingCancellation) throw error('BILLING_CANCELLATION_PENDING', 'Renewal cancellation is recorded. New charges and plan changes are disabled.');
}

export function cancellationPaymentPending(transaction) {
  return ['pending_checkout', 'processing', 'retry_processing', 'retry_scheduled', 'reconciliation_required', 'payment_required'].includes(transaction.status)
    || Boolean(transaction.providerInvoiceId && transaction.status !== 'completed' && !['paid', 'void', 'uncollectible'].includes(transaction.cancellationInvoiceStatus));
}

export function cancellationView(account) {
  const value = account?.billingCancellation;
  if (!value) return null;
  return { id: value.id, mode: value.mode, status: value.status, requestedAt: value.requestedAt, effectiveAt: value.effectiveAt ?? null,
    confirmedAt: value.confirmedAt ?? null, nextAttemptAt: value.nextAttemptAt ?? null,
    needsAttention: value.status === 'attention' || ['ambiguous', 'suppressed', 'failed'].includes(value.notice?.status),
    confirmationEmail: value.notice?.status ?? 'pending', financialReview: value.financialReview === true };
}

export class CancellationService {
  constructor({ store, provider, config, logger, notifier }) { Object.assign(this, { store, provider, config, logger, notifier }); }

  async request(accountId, actor, mode = 'period_end') {
    return this.store.transact('billing.cancellation.request', state => {
      const account = state.accounts.find(item => item.id === accountId);
      if (!account || !['active', 'scheduled'].includes(account.closureStatus)) throw error('ACCOUNT_UNAVAILABLE', 'Account is unavailable.');
      return requestCancellation(state, account, account.closureStatus === 'scheduled' ? 'immediate' : mode, actor);
    });
  }

  async retry(accountId, actor, reason) {
    return this.store.transact('billing.cancellation.manual_retry', state => {
      const account = state.accounts.find(a => a.id === accountId); const c = account?.billingCancellation;
      if (!c || !['attention', 'retry_scheduled'].includes(c.status) || c.leaseUntil > ISO()) throw error('CANCELLATION_NOT_RETRYABLE', 'Cancellation is not waiting for a retry.');
      c.status = 'requested'; c.attempts = 0; c.nextAttemptAt = ISO(); c.leaseToken = null; c.leaseUntil = null;
      appendAudit(state, actor, 'billing.cancellation_retried', { accountId, targetId: c.id, reason: String(reason).slice(0, 1000) });
      return cancellationView(account);
    });
  }

  async processDue() {
    const state = await this.store.read(); const now = ISO();
    const deadline = Date.now() + 60_000;
    // Include previously deployed closures, which did not record a provider intent.
    for (const account of state.accounts.filter(a => a.closureStatus === 'scheduled' && !a.billingCancellation).slice(0, 5)) await this.request(account.id, systemActor, 'immediate');
    const accounts = (await this.store.read()).accounts.filter(a => a.billingCancellation)
      .sort((a, b) => String(a.billingCancellation.lastAttemptAt ?? '').localeCompare(String(b.billingCancellation.lastAttemptAt ?? '')));
    let processed = 0; let attention = 0; let financialProcessed = 0;
    for (const account of accounts) {
      const c = account.billingCancellation;
      if (Date.now() < deadline && financialProcessed < 2 && c.financialReview && ['completed', 'scheduled'].includes(c.status) && (!c.lastFinancialAttemptAt || c.lastFinancialAttemptAt < addSeconds(now, -3600))) {
        financialProcessed += 1; await this.reconcileCompletedFinancial(account.id, deadline);
      }
      if (c.status === 'attention' || ['ambiguous', 'suppressed', 'failed'].includes(c.notice?.status)) attention += 1;
      if (Date.now() < deadline && processed < 2 && !['completed', 'attention'].includes(c.status) && (!c.nextAttemptAt || c.nextAttemptAt <= now) && (!c.leaseUntil || c.leaseUntil <= now)) {
        await this.process(account.id, { deadline }); processed += 1;
      }
    }
    for (const account of accounts.filter(a => ['scheduled', 'completed'].includes(a.billingCancellation.status) && ['pending', 'retry', 'attempted'].includes(a.billingCancellation.notice?.status)).slice(0, 10)) {
      if (Date.now() >= deadline) break;
      await this.sendNotice(account.id);
    }
    if (attention) throw error('CANCELLATION_ATTENTION_REQUIRED', `${attention} cancellation request(s) require reconciliation; monitoring remains protected.`);
    return { processed };
  }

  async process(accountId, { deadline = Date.now() + 60_000 } = {}) {
    const token = id('cancellease'); const now = ISO();
    const claim = await this.store.transact('billing.cancellation.claim', state => {
      const account = state.accounts.find(a => a.id === accountId); const c = account?.billingCancellation;
      if (!c || ['completed', 'attention'].includes(c.status) || c.nextAttemptAt > now || c.leaseUntil > now) return null;
      c.status = 'processing'; c.leaseToken = token; c.leaseUntil = addSeconds(now, 600); c.lastAttemptAt = now; c.attempts += 1;
      return { account: structuredClone(account), intent: structuredClone(c) };
    });
    if (!claim) return null;
    const { account, intent } = claim;
    const timeRemaining = () => { if (Date.now() >= deadline) throw error('CANCELLATION_DEFERRED', 'Continue cancellation in the next bounded worker pass.'); };
    const mutate = async (label, fn) => this.store.transact(label, state => {
      const current = state.accounts.find(a => a.id === accountId); const c = current?.billingCancellation;
      if (!c || c.id !== intent.id || c.leaseToken !== token) throw error('CANCELLATION_CLAIM_LOST', 'Cancellation changed while processing.');
      return fn(state, current, c);
    });
    try {
      timeRemaining();
      const stripe = account.provider === 'stripe' || this.config.billingProvider === 'stripe';
      // An old ambiguous Checkout must not prevent stopping a known renewal.
      if (stripe && account.providerSubscriptionId && account.providerCustomerId) await this.provider.cancelSubscription({ accountId,
        providerCustomerId: account.providerCustomerId, subscriptionId: account.providerSubscriptionId,
        allowLegacyBinding: true, mode: intent.mode, idempotencyKey: `cancel:${intent.id}:${account.providerSubscriptionId}` });
      await mutate('billing.cancellation.stop_retries', state => {
        let bytes = 0;
        for (const t of state.transactions.filter(t => t.accountId === accountId && t.status === 'retry_scheduled').slice(0, 5)) {
          bytes += Buffer.byteLength(JSON.stringify(t)) * 2;
          if (bytes > 1_500_000) break;
          t.status = t.providerInvoiceId ? 'payment_required' : t.type === 'plan_change' ? 'reconciliation_required' : 'cancellation_stopped'; t.automaticRetryAt = null; t.updatedAt = ISO();
        }
      });
      const initial = await this.store.read();
      const checkouts = initial.transactions.filter(t => t.accountId === accountId && t.type === 'subscription_start' && t.cancellationSettledId !== intent.id
        && (t.providerCheckoutId || ['pending_checkout', 'reconciliation_required'].includes(t.status) || /STRIPE_(NETWORK|INVALID_RESPONSE)/.test(t.outcomeReason ?? '')));
      let checkoutProgress = 0;
      for (const txn of checkouts.slice(0, 5)) {
        timeRemaining();
        let checkoutId = txn.providerCheckoutId;
        if (stripe && !checkoutId) {
          if (!txn.checkoutRequest || Date.now() - Date.parse(txn.createdAt) >= 23 * 3600_000) throw error('CHECKOUT_RECONCILIATION_REQUIRED', 'An unbound Checkout request needs support reconciliation; it cannot safely be replayed.');
          const recovered = await this.provider.createCheckout(txn.checkoutRequest);
          checkoutId = recovered.checkoutId;
          await mutate('billing.cancellation.checkout_recovered', state => {
            const t = state.transactions.find(t => t.id === txn.id); t.providerCheckoutId = checkoutId;
            if (recovered.customerId) t.providerCustomerId = recovered.customerId;
          });
        }
        let session = stripe ? await this.provider.retrieveCheckout({ checkoutId }) : null;
        if (session) {
          if (session.checkoutId !== checkoutId || session.metadataAccountId !== accountId || session.metadataTransactionId !== txn.id || session.mode !== 'subscription'
            || account.providerCustomerId && session.customerId && account.providerCustomerId !== session.customerId) throw error('CUSTOMER_BINDING_FAILED', 'Checkout cancellation binding failed.');
          if (session.status === 'open') {
            await this.provider.expireCheckout({ checkoutId, idempotencyKey: `cancel-checkout:${intent.id}:${txn.id}` });
            session = await this.provider.retrieveCheckout({ checkoutId });
          }
          if (!['expired', 'complete'].includes(session.status)) throw error('CHECKOUT_RECONCILIATION_REQUIRED', 'Checkout has not reached a stable state.');
          if (session.subscriptionId) {
            if (session.metadataSubscriptionAccountId !== accountId || !session.customerId) throw error('CUSTOMER_BINDING_FAILED', 'Checkout subscription binding failed.');
            // New subscriptions created by a racing Checkout must end immediately,
            // even when the user's original request was to stop the old renewal.
            await this.provider.cancelSubscription({ accountId, providerCustomerId: session.customerId, subscriptionId: session.subscriptionId,
              mode: session.subscriptionId === account.providerSubscriptionId ? intent.mode : 'immediate', idempotencyKey: `cancel:${intent.id}:${session.subscriptionId}` });
          }
        }
        await mutate('billing.cancellation.checkout_settled', (state, current) => {
          const t = state.transactions.find(t => t.id === txn.id);
          if (session?.subscriptionId) t.providerSubscriptionId = session.subscriptionId;
          if (session?.customerId) { t.providerCustomerId = session.customerId; current.providerCustomerId ??= session.customerId; }
          if (session?.paymentStatus === 'paid') {
            if (session.amountMinor !== t.amountMinor || session.currency !== t.currency) throw error('AMOUNT_MISMATCH', 'Checkout payment requires financial reconciliation.');
            t.status = 'completed'; t.providerPaymentId = session.providerPaymentId ?? t.providerPaymentId;
            t.providerInvoiceId = session.providerInvoiceId ?? t.providerInvoiceId; t.taxMinor = session.taxMinor;
          } else if (t.status !== 'completed') t.status = session?.status === 'complete' ? 'reconciliation_required' : 'cancellation_stopped';
          t.cancellationSettledId = intent.id; t.automaticRetryAt = null; t.checkoutUrl = null; t.updatedAt = ISO();
        });
        checkoutProgress += 1;
      }
      const fresh = (await this.store.read()).accounts.find(a => a.id === accountId);
      let subscriptions = [];
      if (stripe && (fresh.providerCustomerId || fresh.providerSubscriptionId)) {
        timeRemaining();
        subscriptions = await this.provider.cancellationSubscriptions({ accountId, providerCustomerId: fresh.providerCustomerId, subscriptionId: fresh.providerSubscriptionId });
        if (subscriptions.filter(s => !terminal(s.status)).length > 10) throw error('CANCELLATION_INVENTORY_LIMIT', 'Too many bound subscriptions require assisted reconciliation.');
        const results = [];
        for (const sub of subscriptions.filter(s => !terminal(s.status))) {
          timeRemaining();
          if (sub.id === fresh.providerSubscriptionId && intent.mode === 'period_end' && sub.cancel_at_period_end) { results.push(sub); continue; }
          results.push(await this.provider.cancelSubscription({ accountId, providerCustomerId: fresh.providerCustomerId, subscriptionId: sub.id,
            allowLegacyBinding: sub.id === fresh.providerSubscriptionId, mode: sub.id === fresh.providerSubscriptionId ? intent.mode : 'immediate', idempotencyKey: `cancel:${intent.id}:${sub.id}` }));
        }
        subscriptions = [...subscriptions.filter(s => terminal(s.status)), ...results];
      }
      try { await this.reconcileFinancial(accountId, mutate, timeRemaining); } catch (cause) { if (cause.code === 'CANCELLATION_CLAIM_LOST') throw cause; this.logger?.warn?.('billing.cancellation.financial_pending', { accountId }); }
      const pending = subscriptions.filter(s => !terminal(s.status));
      const localEnd = !stripe && intent.mode === 'period_end' && fresh.providerSubscriptionId && Date.parse(fresh.currentPeriodEnd) > Date.now() ? Date.parse(fresh.currentPeriodEnd) : 0;
      const effective = Math.max(localEnd, ...pending.map(s => Number(s.cancel_at) * 1000 || subscriptionEnd(s)), 0);
      await mutate('billing.cancellation.confirm', (state, current, c) => {
        const remaining = state.transactions.some(t => t.accountId === accountId && t.type === 'subscription_start' && t.cancellationSettledId !== intent.id
          && (t.providerCheckoutId || ['pending_checkout', 'reconciliation_required'].includes(t.status) || /STRIPE_(NETWORK|INVALID_RESPONSE)/.test(t.outcomeReason ?? '')));
        c.leaseUntil = null; c.leaseToken = null; c.updatedAt = ISO();
        if (remaining || checkouts.length > checkoutProgress || state.transactions.some(t => t.accountId === accountId && t.status === 'retry_scheduled')) { c.status = 'requested'; c.attempts = 0; c.nextAttemptAt = addSeconds(ISO(), 60); return; }
        const status = effective > Date.now() ? 'scheduled' : 'completed';
        const noticePhase = `${status}:${effective}`;
        if (c.notice?.phase !== noticePhase) c.notice = { phase: noticePhase, status: 'pending', attempts: 0 };
        c.status = status; c.confirmedAt = ISO(); c.effectiveAt = effective ? new Date(effective).toISOString() : subscriptions.find(s => s.id === current.providerSubscriptionId)?.ended_at ? new Date(subscriptions.find(s => s.id === current.providerSubscriptionId).ended_at * 1000).toISOString() : c.effectiveAt ?? ISO();
        c.nextAttemptAt = status === 'scheduled' ? new Date(Math.min(effective, Date.now() + 6 * 3600_000)).toISOString() : null; c.attempts = 0;
        c.financialReview = state.transactions.some(t => t.accountId === accountId && cancellationPaymentPending(t));
        if (status === 'completed') { current.billingStatus = 'canceled'; current.terminalSubscriptionId = current.providerSubscriptionId ?? null; }
        appendAudit(state, systemActor, 'billing.cancellation_confirmed', { accountId, targetId: c.id, reason: status });
      });
    } catch (cause) {
      if (cause.code === 'CANCELLATION_CLAIM_LOST') return null;
      await mutate('billing.cancellation.retry', (_state, _account, c) => {
        if (cause.code === 'CANCELLATION_DEFERRED') c.attempts = Math.max(0, c.attempts - 1);
        c.status = c.attempts >= 8 ? 'attention' : 'retry_scheduled'; c.lastError = String(cause.code ?? 'CANCELLATION_PROVIDER_ERROR');
        c.nextAttemptAt = addSeconds(ISO(), Math.min(3600, 30 * 2 ** Math.min(c.attempts, 7))); c.leaseToken = null; c.leaseUntil = null; c.updatedAt = ISO();
      });
      this.logger?.error?.('billing.cancellation.retry', { accountId, code: cause.code ?? 'CANCELLATION_PROVIDER_ERROR' });
    }
    return cancellationView((await this.store.read()).accounts.find(a => a.id === accountId));
  }

  async reconcileCompletedFinancial(accountId, deadline = Date.now() + 60_000) {
    const mutate = (label, fn) => this.store.transact(label, state => {
      const account = state.accounts.find(a => a.id === accountId);
      if (!account?.billingCancellation) return;
      return fn(state, account, account.billingCancellation);
    });
    await mutate('billing.cancellation.financial_claim', (_s, _a, c) => { c.lastFinancialAttemptAt = ISO(); });
    try {
      await this.reconcileFinancial(accountId, mutate, () => { if (Date.now() >= deadline) throw error('CANCELLATION_DEFERRED', 'Continue financial reconciliation in the next worker pass.'); });
      await mutate('billing.cancellation.financial_check', (s, a, c) => {
        c.financialReview = s.transactions.some(t => t.accountId === a.id && cancellationPaymentPending(t));
      });
    } catch { this.logger?.warn?.('billing.cancellation.financial_pending', { accountId }); }
  }

  async reconcileFinancial(accountId, mutate, timeRemaining) {
    const state = await this.store.read(); const account = state.accounts.find(a => a.id === accountId);
    const transactions = state.transactions.filter(t => t.accountId === accountId && cancellationPaymentPending(t))
      .sort((a, b) => String(a.lastCancellationReconciledAt ?? '').localeCompare(String(b.lastCancellationReconciledAt ?? '')));
    for (const t of transactions.slice(0, 5)) {
      timeRemaining();
      await mutate('billing.cancellation.invoice_attempt', state => {
        const current = state.transactions.find(item => item.id === t.id);
        if (current) current.lastCancellationReconciledAt = ISO();
      });
      if (!t.providerInvoiceId && t.type === 'plan_change' && account.providerSubscriptionId && this.provider.retrievePlanChangeState) {
        const observed = await this.provider.retrievePlanChangeState({ accountId, providerCustomerId: account.providerCustomerId, subscriptionId: account.providerSubscriptionId, transactionId: t.id, planId: t.planId });
        const result = observed?.result;
        if (observed?.subscriptionId !== account.providerSubscriptionId || observed?.customerId !== account.providerCustomerId || observed?.metadataAccountId !== accountId) continue;
        if (result?.providerInvoiceId) {
          t.providerInvoiceId = result.providerInvoiceId;
          await mutate('billing.cancellation.invoice_bound', state => { state.transactions.find(item => item.id === t.id).providerInvoiceId = t.providerInvoiceId; });
        }
      }
      if (!t.providerInvoiceId || !this.provider.retrieveCancellationInvoice) continue;
      const invoice = await this.provider.retrieveCancellationInvoice({ accountId, providerCustomerId: account.providerCustomerId, invoiceId: t.providerInvoiceId });
      if (!['paid', 'void', 'uncollectible'].includes(invoice.status)) continue;
      if (invoice.status === 'paid' && (invoice.amountMinor !== t.amountMinor || invoice.currency !== t.currency)) continue;
      await mutate('billing.cancellation.invoice_reconciled', state => {
        const target = state.transactions.find(item => item.id === t.id);
        if (!target || target.status === 'completed') return;
        target.status = invoice.status === 'paid' ? 'completed' : 'cancellation_stopped';
        target.cancellationInvoiceStatus = invoice.status;
        target.outcomeReason = `cancellation_invoice_${invoice.status}`; target.automaticRetryAt = null;
        target.providerPaymentId = invoice.providerPaymentId ?? target.providerPaymentId; target.updatedAt = ISO();
      });
    }
  }

  async sendNotice(accountId) {
    if (!this.notifier?.sendBillingCancellation) return;
    const token = id('cancelnotice'); const now = ISO();
    const claim = await this.store.transact('billing.cancellation.notice_claim', state => {
      const account = state.accounts.find(a => a.id === accountId); const c = account?.billingCancellation; const notice = c?.notice;
      if (!notice || !['scheduled', 'completed'].includes(c.status)) return null;
      if (notice.status === 'attempted' && notice.attemptedAt < addSeconds(now, -180)) { notice.status = 'ambiguous'; return null; }
      if (!['pending', 'retry'].includes(notice.status) || notice.nextAttemptAt > now) return null;
      notice.status = 'attempted'; notice.attemptId = token; notice.attemptedAt = now; notice.attempts += 1;
      return { to: account.contactEmail, intentId: c.id, view: cancellationView(account), phase: notice.phase };
    });
    if (!claim) return;
    let result;
    try { result = await this.notifier.sendBillingCancellation(claim.to, claim.view); }
    catch (cause) { result = { deliveryState: cause.deliveryState ?? 'ambiguous' }; }
    await this.store.transact('billing.cancellation.notice_result', state => {
      const c = state.accounts.find(a => a.id === accountId)?.billingCancellation; const n = c?.notice;
      if (c?.id !== claim.intentId || n?.attemptId !== token) return;
      n.status = result.deliveryState ?? 'ambiguous';
      if (n.status === 'failed' && n.attempts < 3) { n.status = 'retry'; n.nextAttemptAt = addSeconds(ISO(), 300); }
    });
  }
}
