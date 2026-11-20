import { CancellationService, assertBillingOpen } from './cancellation.mjs';
import { updateWatcherUsage, captureNotBefore } from '../domain/usage-guards.mjs';
import { scheduleAfterEdit } from '../monitoring/schedule.mjs';
import { carryCaptureUsage, applyPaidRenewalWindow } from './usage.mjs';
/** @module billing/service
 * @description Checkout, plan change, renewal and refund orchestration.
 */
import { id, ISO, addSeconds } from '../lib.mjs';
import { PLAN_CATALOG_VERSION, PLANS, entitlements, isRetiredPlan, captureCreditUsage } from '../domain/plans.mjs';
import { priceForPlan, proratedPlanChange, calculationEnvelope, verifyEnvelope, assertProviderBinding, assertRetryAllowed } from './safety.mjs';
import { appendAudit } from '../services/audit.mjs';
import { providerPaymentUrl } from './urls.mjs';

export class BillingService {
  constructor({ store, provider, config, logger, notifier = null }) {
    Object.assign(this, { store, provider, config, logger });
    this.cancellations = new CancellationService({ store, provider, config, logger, notifier });
  }
  requestCancellation(accountId, actor) { return this.cancellations.request(accountId, actor); }
  processCancellations() { return this.cancellations.processDue(); }

  async quotePlanChange(accountId, planId) {
    assertSelfServePlan(planId);
    const state = await this.store.read();
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
    assertBillingOpen(account);
    assertCurrentCatalogPlan(account);
    if (account.closureStatus !== 'active') throw Object.assign(new Error('Billing is disabled while the account is scheduled for closure.'), { statusCode: 403 });
    if (!account.providerCustomerId || !account.providerSubscriptionId) throw Object.assign(new Error('Start a subscription before using plan change.'), { statusCode: 409, code: 'SUBSCRIPTION_REQUIRED' });
    if (account.planId === planId) throw Object.assign(new Error('You are already subscribed to this plan.'), { statusCode: 409, code: 'ALREADY_SUBSCRIBED_TO_PLAN' });
    const { adjustments: watcherAdjustments } = planChangeCompatibility(state, account, planId);
    const price = priceForPlan(planId, this.config.billingCurrency);
    const calculatedAt = ISO();
    return {
      fromPlanId: account.planId,
      toPlanId: planId,
      calculatedAt,
      periodEnd: account.currentPeriodEnd,
      watcherAdjustments,
      capturesUsed: captureCreditUsage(account).used,
      captureCreditsCarryForward: true,
      renewalResets: true,
      ...proratedPlanChange({ currentPlanId: account.planId, newPlanId: planId, periodStart: account.currentPeriodStart, periodEnd: account.currentPeriodEnd, now: calculatedAt, currency: price.currency }),
    };
  }

  async createCheckout(accountId, planId, actor, urls) {
    assertSelfServePlan(planId);
    let state = await this.store.read(); let account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
    assertBillingOpen(account);
    assertCurrentCatalogPlan(account);
    if (account.closureStatus !== 'active') throw Object.assign(new Error('Billing is disabled while the account is scheduled for closure.'), { statusCode: 403 });
    assertBillingProfile(account);
    if (account.providerSubscriptionId) throw Object.assign(new Error('This account already has a subscription. Use plan change instead.'), { statusCode: 409 });
    if (state.transactions.some((item) => item.accountId === accountId && item.type === 'subscription_start' && item.status === 'reconciliation_required')) throw Object.assign(new Error('A prior checkout requires staff reconciliation before another session can be created.'), { statusCode: 409, code: 'CHECKOUT_RECONCILIATION_REQUIRED' });
    const priorCheckout = state.transactions
      .filter((item) => item.accountId === accountId && item.type === 'subscription_start' && ['pending_checkout', 'expired', 'completed'].includes(item.status) && item.providerCheckoutId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (priorCheckout && typeof this.provider.retrieveCheckout === 'function') {
      const recovered = await this.reconcileCheckout(accountId, priorCheckout.providerCheckoutId, actor);
      if (recovered.status === 'completed') throw alreadySubscribedError(recovered.planId === planId);
    }
    state = await this.store.read(); account = state.accounts.find((item) => item.id === accountId);
    if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
    if (!account.providerSubscriptionId && account.providerCustomerId && typeof this.provider.findActiveSubscription === 'function') {
      const providerSubscription = await this.provider.findActiveSubscription({ customerId: account.providerCustomerId, accountId });
      if (providerSubscription) {
        const recovered = await this.#recoverSubscription(accountId, providerSubscription, actor);
        throw alreadySubscribedError(recovered.planId === planId);
      }
    }
    const price = priceForPlan(planId, this.config.billingCurrency); const transactionId = id('txn');
    const envelope = calculationEnvelope({ accountId, transactionId, operation: 'subscription_start', planId, amountMinor: price.amountMinor, currency: price.currency, providerCustomerId: account.providerCustomerId ?? null }, this.config.integritySecret);
    const checkoutRequest = { accountId, transactionId, planId, fullPlanPriceMinor: price.amountMinor, amountMinor: price.amountMinor, currency: price.currency, providerCustomerId: account.providerCustomerId, email: account.contactEmail, successUrl: urls.successUrl, cancelUrl: urls.cancelUrl, idempotencyKey: `checkout:${transactionId}` };
    const claim = await this.store.transact('billing.checkout.create', (draft) => {
      const liveAccount = draft.accounts.find((item) => item.id === accountId);
      if (!liveAccount || liveAccount.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      assertBillingOpen(liveAccount);
      if (liveAccount.providerSubscriptionId) throw Object.assign(new Error('This account already has a subscription. Use plan change instead.'), { statusCode: 409 });
      const cutoff = Date.now() - 24 * 3600_000;
      const replacements = [];
      for (const pending of draft.transactions.filter((item) => item.accountId === accountId && item.type === 'subscription_start' && item.status === 'pending_checkout')) {
        if (Date.parse(pending.createdAt) < cutoff) { pending.status = 'expired'; pending.updatedAt = ISO(); continue; }
        if (pending.planId === planId) return { existing: true, transactionId: pending.id, checkoutUrl: pending.checkoutUrl ?? null };
        if (!pending.providerCheckoutId || !pending.checkoutUrl) return { blockedByPending: true, planId: pending.planId };
        replacements.push({ transactionId: pending.id, providerCheckoutId: pending.providerCheckoutId, planId: pending.planId });
      }
      if (replacements.length) return { replace: true, replacements };
      draft.transactions.push({ id: transactionId, accountId, provider: this.config.billingProvider, type: 'subscription_start', checkoutRequest, planId, amountMinor: price.amountMinor, taxMinor: null, currency: price.currency, status: 'pending_checkout', outcomeReason: null, providerCustomerId: liveAccount.providerCustomerId ?? null, providerPaymentId: null, providerInvoiceId: null, paymentReference: null, envelope, retryCount: 0, retryMode: null, automaticRetryAt: null, createdAt: ISO(), updatedAt: ISO() });
      appendAudit(draft, actor, 'billing.checkout_created', { accountId, transactionId, requestId: actor.requestId });
      return { existing: false, transactionId };
    });
    if (claim.blockedByPending) throw Object.assign(new Error(`A ${claim.planId} checkout is still being prepared. Retry shortly.`), { statusCode: 409, code: 'CHECKOUT_IN_PROGRESS' });
    if (claim.replace) {
      if (typeof this.provider.expireCheckout !== 'function') throw Object.assign(new Error('The billing provider cannot safely replace an existing checkout.'), { statusCode: 409, code: 'CHECKOUT_REPLACEMENT_UNSUPPORTED' });
      for (const pending of claim.replacements) {
        await this.provider.expireCheckout({ checkoutId: pending.providerCheckoutId, idempotencyKey: `checkout-expire:${pending.transactionId}` });
        await this.store.transact('billing.checkout.superseded', (draft) => {
          const txn = draft.transactions.find((item) => item.id === pending.transactionId && item.accountId === accountId);
          if (txn?.status === 'pending_checkout' && txn.providerCheckoutId === pending.providerCheckoutId) { txn.status = 'superseded'; txn.outcomeReason = `replaced_by_checkout:${planId}`; txn.updatedAt = ISO(); }
          return null;
        });
      }
      return this.createCheckout(accountId, planId, actor, urls);
    }
    if (claim.existing) {
      if (claim.checkoutUrl) return { transactionId: claim.transactionId, checkoutUrl: providerPaymentUrl(claim.checkoutUrl, this.config, { required: true }), reused: true };
      throw Object.assign(new Error('A checkout is already being prepared. Retry after it finishes.'), { statusCode: 409 });
    }
    let checkoutResult;
    try {
      const result = checkoutResult = await this.provider.createCheckout(checkoutRequest);
      result.url = providerPaymentUrl(result.url, this.config, { required: true });
      await this.store.transact('billing.checkout.bound', (draft) => {
        const txn = draft.transactions.find((item) => item.id === transactionId);
        if (!txn || txn.status !== 'pending_checkout') throw new Error('Checkout transaction is no longer pending.');
        txn.providerCheckoutId = result.checkoutId; txn.checkoutUrl = result.url; txn.updatedAt = ISO();
        const acct = draft.accounts.find((item) => item.id === accountId);
        if (!acct.providerCustomerId && result.customerId) acct.providerCustomerId = result.customerId;
        wakeCancellation(acct);
        if (result.status === 'completed' && acct.closureStatus === 'active' && !acct.billingCancellation) {
          txn.status = 'completed'; txn.providerCustomerId = result.customerId ?? txn.providerCustomerId;
          txn.providerPaymentId = result.providerPaymentId ?? result.operationId ?? null; txn.paymentReference = result.paymentReference ?? null;
          txn.taxMinor = result.taxMinor ?? 0; txn.updatedAt = ISO();
          acct.providerSubscriptionId = result.subscriptionId ?? acct.providerSubscriptionId ?? `local:${transactionId}`;
          markCurrentCatalogPlan(acct, planId); acct.currentPeriodStart = result.periodStart ?? acct.currentPeriodStart;
          acct.currentPeriodEnd = result.periodEnd ?? acct.currentPeriodEnd; acct.updatedAt = ISO();
          resumeCreditDelayedWatchers(draft, accountId, acct.updatedAt);
          appendAudit(draft, actor, 'billing.checkout_completed', { accountId, transactionId, requestId: actor.requestId });
        }
        return null;
      });
      return { transactionId, checkoutUrl: result.url, status: result.status ?? 'pending_checkout' };
    } catch (error) {
      await this.store.transact('billing.checkout.failed', (draft) => {
        const txn = draft.transactions.find((item) => item.id === transactionId);
        if (txn?.status === 'pending_checkout') {
          txn.status = checkoutResult || ['PAYMENT_URL_NOT_APPROVED', 'STRIPE_NETWORK_ERROR', 'STRIPE_INVALID_RESPONSE'].includes(error.code) ? 'reconciliation_required' : 'failed';
          txn.outcomeReason = error.code ?? error.message; txn.updatedAt = ISO();
          txn.providerCheckoutId = checkoutResult?.checkoutId ?? error.providerCheckoutId ?? txn.providerCheckoutId;
          txn.providerCustomerId = checkoutResult?.customerId ?? error.providerCustomerId ?? txn.providerCustomerId;
        }
        wakeCancellation(draft.accounts.find(item => item.id === accountId));
        appendAudit(draft, actor, 'billing.checkout_failed', { accountId, transactionId, reason: error.code ?? error.message, requestId: actor.requestId });
        return null;
      });
      throw error;
    }
  }

  async reconcileCheckout(accountId, checkoutId, actor) {
    const state = await this.store.read();
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
    if (account.billingCancellation || account.closureStatus !== 'active') return { status: 'cancellation_pending', cancellation: account.billingCancellation?.status ?? 'requested' };
    let transaction = checkoutId
      ? state.transactions.find((item) => item.accountId === accountId && item.providerCheckoutId === checkoutId)
      : state.transactions.filter((item) => item.accountId === accountId && item.type === 'subscription_start' && ['pending_checkout', 'expired', 'completed'].includes(item.status) && item.providerCheckoutId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (!transaction && !checkoutId && account.providerSubscriptionId && !entitlements(account).billingRestricted) return { status: 'completed', planId: account.planId, alreadyReconciled: true };
    if (!transaction) throw Object.assign(new Error('No pending subscription checkout was found for this account.'), { statusCode: 404, code: 'CHECKOUT_NOT_FOUND' });
    if (!['pending_checkout', 'expired', 'completed'].includes(transaction.status)) throw Object.assign(new Error('The checkout is not eligible for automatic reconciliation. Contact support before retrying payment.'), { statusCode: 409, code: 'CHECKOUT_RECONCILIATION_REQUIRED' });
    if (typeof this.provider.retrieveCheckout !== 'function') throw Object.assign(new Error('The billing provider cannot reconcile Checkout Sessions.'), { statusCode: 503, code: 'CHECKOUT_RECONCILIATION_UNAVAILABLE' });
    const providerCheckout = await this.provider.retrieveCheckout({ checkoutId: transaction.providerCheckoutId, planId: transaction.planId });
    if (!providerCheckout) return { status: transaction.status, planId: transaction.planId };
    if (providerCheckout.checkoutId !== transaction.providerCheckoutId
      || providerCheckout.metadataAccountId !== accountId
      || providerCheckout.metadataTransactionId !== transaction.id
      || providerCheckout.metadataSubscriptionAccountId !== accountId
      || providerCheckout.customerId == null
      || providerCheckout.subscriptionId == null) {
      throw Object.assign(new Error('Stripe Checkout Session failed account and transaction binding.'), { statusCode: 409, code: 'CUSTOMER_BINDING_FAILED' });
    }
    if (providerCheckout.mode !== 'subscription' || providerCheckout.status !== 'complete' || providerCheckout.paymentStatus !== 'paid') {
      return { status: providerCheckout.status === 'complete' ? 'payment_pending' : providerCheckout.status, planId: transaction.planId };
    }
    if (providerCheckout.subscriptionStatus !== 'active' || providerCheckout.subscriptionItemCount !== 1 || providerCheckout.subscriptionPlanId !== transaction.planId) {
      throw Object.assign(new Error('Stripe Checkout Session subscription state or Price does not match the requested plan.'), { statusCode: 409, code: 'STRIPE_CURRENT_PRICE_MISMATCH' });
    }
    if (providerCheckout.metadataSubscriptionTransactionId !== transaction.id || !providerCheckout.periodStart || !providerCheckout.periodEnd || providerCheckout.periodEnd <= providerCheckout.periodStart) {
      throw Object.assign(new Error('Stripe subscription metadata or billing period failed reconciliation.'), { statusCode: 409, code: 'CUSTOMER_BINDING_FAILED' });
    }
    if (providerCheckout.amountMinor !== transaction.amountMinor || providerCheckout.currency !== transaction.currency) {
      throw Object.assign(new Error('Stripe Checkout Session amount failed server reconciliation.'), { statusCode: 409, code: 'AMOUNT_MISMATCH' });
    }
    if (account.providerCustomerId && account.providerCustomerId !== providerCheckout.customerId) {
      throw Object.assign(new Error('Stripe Checkout Session customer does not match this account.'), { statusCode: 409, code: 'CUSTOMER_BINDING_FAILED' });
    }
    return this.store.transact('billing.checkout.reconcile', (draft) => {
      const liveAccount = draft.accounts.find((item) => item.id === accountId);
      const liveTransaction = draft.transactions.find((item) => item.id === transaction.id && item.accountId === accountId);
      if (!liveAccount || liveAccount.billingCancellation || liveAccount.closureStatus !== 'active' || !liveTransaction) throw Object.assign(new Error('Account or checkout became unavailable during reconciliation.'), { statusCode: 409 });
      if (!['pending_checkout', 'expired', 'completed'].includes(liveTransaction.status)) throw Object.assign(new Error('Checkout requires staff reconciliation.'), { statusCode: 409, code: 'CHECKOUT_RECONCILIATION_REQUIRED' });
      if (liveAccount.providerSubscriptionId && liveAccount.providerSubscriptionId !== providerCheckout.subscriptionId) throw Object.assign(new Error('A different Stripe subscription is already bound to this account.'), { statusCode: 409, code: 'MULTIPLE_SUBSCRIPTIONS_DETECTED' });
      liveTransaction.status = 'completed'; liveTransaction.providerCustomerId = providerCheckout.customerId;
      liveTransaction.providerPaymentId = providerCheckout.providerPaymentId ?? liveTransaction.providerPaymentId;
      liveTransaction.providerInvoiceId = providerCheckout.providerInvoiceId ?? liveTransaction.providerInvoiceId;
      liveTransaction.taxMinor = providerCheckout.taxMinor; liveTransaction.outcomeReason = null; liveTransaction.updatedAt = ISO();
      liveAccount.providerCustomerId = providerCheckout.customerId; liveAccount.providerSubscriptionId = providerCheckout.subscriptionId; liveAccount.billingStatus = 'active';
      markCurrentCatalogPlan(liveAccount, liveTransaction.planId);
      if (providerCheckout.periodStart) liveAccount.currentPeriodStart = providerCheckout.periodStart;
      if (providerCheckout.periodEnd) liveAccount.currentPeriodEnd = providerCheckout.periodEnd;
      liveAccount.updatedAt = ISO();
      resumeCreditDelayedWatchers(draft, accountId, liveAccount.updatedAt);
      appendAudit(draft, actor, 'billing.checkout_reconciled', { accountId, transactionId: liveTransaction.id, requestId: actor.requestId });
      return { status: 'completed', planId: liveAccount.planId, transactionId: liveTransaction.id, hasSubscription: true };
    });
  }

  async #recoverSubscription(accountId, providerSubscription, actor) {
    const state = await this.store.read();
    const account = state.accounts.find((item) => item.id === accountId);
    const transaction = state.transactions.find((item) => item.id === providerSubscription.metadataTransactionId
      && item.accountId === accountId && item.type === 'subscription_start' && item.providerCheckoutId);
    if (!account || providerSubscription.status !== 'active' || providerSubscription.customerId !== account.providerCustomerId
      || providerSubscription.metadataAccountId !== accountId || !transaction || transaction.planId !== providerSubscription.planId) {
      throw Object.assign(new Error('An existing Stripe subscription requires staff reconciliation before access can change.'), { statusCode: 409, code: 'CUSTOMER_BINDING_FAILED' });
    }
    const result = await this.reconcileCheckout(accountId, transaction.providerCheckoutId, actor);
    if (result.status !== 'completed') throw Object.assign(new Error('Existing subscription payment is awaiting reconciliation.'), { statusCode: 409, code: 'CHECKOUT_RECONCILIATION_REQUIRED' });
    return { planId: result.planId, subscriptionId: providerSubscription.subscriptionId };
  }

  async changePlan(accountId, planId, actor, options = {}) {
    assertSelfServePlan(planId);
    let state = await this.store.read(); let account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
    assertBillingOpen(account);
    assertCurrentCatalogPlan(account);
    if (account.closureStatus !== 'active') throw Object.assign(new Error('Billing is disabled while the account is scheduled for closure.'), { statusCode: 403 });
    assertBillingProfile(account);
    if (!account.providerCustomerId || !account.providerSubscriptionId) throw Object.assign(new Error('Start a subscription before using plan change.'), { statusCode: 409, code: 'SUBSCRIPTION_REQUIRED' });
    await this.#reconcilePlanChangeBlockers(accountId, actor);
    state = await this.store.read(); account = state.accounts.find((item) => item.id === accountId);
    if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
    assertBillingOpen(account);
    assertCurrentCatalogPlan(account);
    if (account.planId === planId) throw Object.assign(new Error('You are already subscribed to this plan.'), { statusCode: 409, code: 'ALREADY_SUBSCRIBED_TO_PLAN' });
    planChangeCompatibility(state, account, planId);
    const newPrice = priceForPlan(planId, this.config.billingCurrency); const transactionId = id('txn');
    const calculationTime = ISO();
    const prorationDateEpoch = Math.floor(Date.parse(calculationTime) / 1000);
    const proration = proratedPlanChange({ currentPlanId: account.planId, newPlanId: planId, periodStart: account.currentPeriodStart, periodEnd: account.currentPeriodEnd, now: calculationTime, currency: newPrice.currency });
    const envelope = calculationEnvelope({ accountId, transactionId, operation: 'plan_change', planId, amountMinor: proration.amountDueMinor, currency: newPrice.currency, providerCustomerId: account.providerCustomerId }, this.config.integritySecret);
    await this.store.transact('billing.plan_change.claim', (draft) => {
      const liveAccount = draft.accounts.find((item) => item.id === accountId);
      if (!liveAccount || liveAccount.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      assertBillingOpen(liveAccount);
      assertCurrentCatalogPlan(liveAccount);
      if (liveAccount?.planId === planId) throw Object.assign(new Error('You are already subscribed to this plan.'), { statusCode: 409, code: 'ALREADY_SUBSCRIBED_TO_PLAN' });
      const { adjustments: watcherAdjustments } = planChangeCompatibility(draft, liveAccount, planId);
      const duplicate = draft.transactions.find((item) => item.accountId === accountId && item.type === 'plan_change' && ['processing', 'retry_processing', 'retry_scheduled', 'payment_required', 'reconciliation_required'].includes(item.status));
      if (duplicate) throw Object.assign(new Error('Another plan change still requires payment or provider reconciliation.'), { statusCode: 409, code: 'PLAN_CHANGE_RECONCILIATION_REQUIRED' });
      for (const prior of draft.transactions.filter((item) => item.accountId === accountId && item.type === 'plan_change' && ['failed', 'declined'].includes(item.status))) { prior.status = 'superseded'; prior.automaticRetryAt = null; prior.updatedAt = ISO(); }
      draft.transactions.push({ id: transactionId, accountId, provider: this.config.billingProvider, type: 'plan_change', planId, amountMinor: proration.amountDueMinor, fullPlanPriceMinor: newPrice.amountMinor, creditMinor: proration.unusedCreditMinor, taxMinor: null, currency: newPrice.currency, prorationDateEpoch, periodStart: account.currentPeriodStart, periodEnd: account.currentPeriodEnd, watcherAdjustments, status: 'processing', outcomeReason: null, providerCustomerId: account.providerCustomerId, providerPaymentId: null, providerInvoiceId: null, paymentReference: null, envelope, retryCount: 0, retryMode: null, automaticRetryAt: null, createdAt: ISO(), updatedAt: ISO() });
      appendAudit(draft, actor, 'billing.plan_change_started', { accountId, transactionId, requestId: actor.requestId, metadata: { from: account.planId, to: planId, proration } }); return null;
    });
    let result;
    try {
      const signed = verifyEnvelope(envelope, this.config.integritySecret);
      result = await this.provider.changePlan({ ...signed, currentPlanId: account.planId, currentPlanPriceMinor: PLANS[account.planId].priceMinor, fullPlanPriceMinor: newPrice.amountMinor, subscriptionId: account.providerSubscriptionId, periodStart: account.currentPeriodStart, periodEnd: account.currentPeriodEnd, prorationDateEpoch, idempotencyKey: `plan-change:${transactionId}`, simulateDecline: options.simulateDecline });
      assertProviderBinding(signed, result);
      if (result.status !== 'completed') {
        const error = Object.assign(new Error(result.status === 'declined' ? 'The payment provider declined the plan change.' : 'The plan change did not complete synchronously.'), { code: result.status === 'declined' ? 'PAYMENT_DECLINED' : 'PAYMENT_INCOMPLETE', declineCode: result.status });
        throw error;
      }
    } catch (error) {
      const failure = await this.#fail(transactionId, error, actor, result);
      return { transactionId, status: failure.status, error: error.message, paymentActionUrl: result?.paymentActionUrl ?? null, proration };
    }
    try {
      await this.#complete(transactionId, result, actor);
      return { transactionId, status: result.status, paymentActionUrl: result.paymentActionUrl ?? null, proration };
    } catch (error) {
      await this.#markReconciliationRequired(transactionId, result, error, actor, { phase: 'plan_change_finalize' });
      return { transactionId, status: 'reconciliation_required', error: 'The provider completed the payment, but local finalization needs staff reconciliation.', proration };
    }
  }

  async retry(transactionId, actor, mode = 'manual') {
    const transaction = await this.store.transact('billing.retry.claim', (state) => {
      const txn = state.transactions.find((item) => item.id === transactionId);
      const account = state.accounts.find((item) => item.id === txn?.accountId);
      if (!txn) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 });
      if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Billing retry is disabled while the account is unavailable.'), { statusCode: 403 });
      assertBillingOpen(account);
      const staleCutoff = Date.now() - 15 * 60_000;
      if (txn.status === 'retry_processing' && Date.parse(txn.retryStartedAt ?? txn.updatedAt) < staleCutoff) {
        txn.status = txn.retryMode === 'automatic' ? 'retry_scheduled' : 'failed';
        txn.retryStartedAt = null;
        txn.updatedAt = ISO();
      }
      if (txn.type === 'plan_change') txn.watcherAdjustments = planChangeCompatibility(state, account, txn.planId).adjustments;
      assertRetryAllowed({ ...txn, retryMode: mode });
      txn.status = 'retry_processing'; txn.retryMode = mode; txn.retryStartedAt = ISO(); txn.updatedAt = ISO();
      return { ...txn };
    });
    let result;
    try {
      const signed = verifyEnvelope(transaction.envelope, this.config.integritySecret);
      result = await this.provider.retry({ ...signed, fullPlanPriceMinor: PLANS[transaction.planId].priceMinor, providerInvoiceId: transaction.providerInvoiceId, periodStart: transaction.periodStart, periodEnd: transaction.periodEnd, idempotencyKey: `retry:${transaction.id}:${transaction.retryCount + 1}` });
      assertProviderBinding(signed, result);
      if (result.status !== 'completed') throw Object.assign(new Error('The retry did not complete.'), { code: result.status === 'declined' ? 'PAYMENT_DECLINED' : 'PAYMENT_INCOMPLETE', declineCode: result.status });
    } catch (error) {
      await this.store.transact('billing.retry.failed', (draft) => {
        const txn = draft.transactions.find((item) => item.id === transactionId);
        if (txn?.status === 'retry_processing') {
          wakeCancellation(draft.accounts.find(a => a.id === txn.accountId));
          txn.retryCount += 1; txn.retryMode = mode;
          txn.status = result?.status === 'pending' && result.providerInvoiceId ? 'payment_required' : ['STRIPE_NETWORK_ERROR', 'STRIPE_INVALID_RESPONSE'].includes(error.code) ? 'reconciliation_required' : 'failed'; txn.automaticRetryAt = null;
          txn.outcomeReason = error.declineCode ?? error.code ?? error.message; txn.retryStartedAt = null;
          txn.providerPaymentId = result?.providerPaymentId ?? result?.operationId ?? txn.providerPaymentId;
          txn.providerInvoiceId = result?.providerInvoiceId ?? txn.providerInvoiceId;
          txn.paymentReference = result?.paymentReference ?? txn.paymentReference;
          txn.paymentActionUrl = result?.paymentActionUrl ?? txn.paymentActionUrl ?? null;
          txn.taxMinor = result?.taxMinor ?? txn.taxMinor; txn.updatedAt = ISO();
          appendAudit(draft, actor, 'billing.transaction_retry_failed', { accountId: txn.accountId, transactionId, reason: txn.outcomeReason, requestId: actor.requestId, metadata: { mode } });
        }
        return null;
      });
      throw error;
    }
    try {
      await this.store.transact('billing.retry.complete', (draft) => {
        const txn = draft.transactions.find((item) => item.id === transactionId);
        if (!txn || txn.status !== 'retry_processing') throw new Error('Billing retry lost its single-flight claim.');
        txn.retryCount += 1; txn.retryMode = mode; txn.status = 'completed'; txn.automaticRetryAt = null; txn.outcomeReason = null;
        txn.providerPaymentId = result.providerPaymentId ?? result.operationId; txn.providerInvoiceId = result.providerInvoiceId ?? txn.providerInvoiceId;
        txn.paymentReference = result.paymentReference; txn.paymentActionUrl = null; txn.taxMinor = result.taxMinor ?? txn.taxMinor; txn.retryStartedAt = null; txn.updatedAt = ISO();
        const cancellationAccount = draft.accounts.find(a => a.id === txn.accountId);
        if (cancellationAccount?.billingCancellation || cancellationAccount?.closureStatus !== 'active') { wakeCancellation(cancellationAccount); appendAudit(draft, actor, 'billing.payment_settled_during_cancellation', { accountId: txn.accountId, transactionId }); return null; }
        if (txn.type === 'plan_change') {
          const liveAccount = draft.accounts.find((item) => item.id === txn.accountId);
          if (!liveAccount || liveAccount.closureStatus !== 'active') throw new Error('Account disappeared during billing retry.');
          carryCaptureUsage(liveAccount, txn, result);
          markCurrentCatalogPlan(liveAccount, txn.planId); if (result.periodStart) liveAccount.currentPeriodStart = result.periodStart; if (result.periodEnd) liveAccount.currentPeriodEnd = result.periodEnd; liveAccount.updatedAt = ISO();
          applyPlanWatcherAdjustments(draft, txn);
          resumeCreditDelayedWatchers(draft, txn.accountId, liveAccount.updatedAt);
        } else if (txn.type === 'subscription_renewal') {
          const liveAccount = draft.accounts.find((item) => item.id === txn.accountId);
          if (applyPaidRenewalWindow(liveAccount, txn, { periodStart: result.periodStart ?? txn.periodStart, periodEnd: result.periodEnd ?? txn.periodEnd })) {
            liveAccount.billingStatus = 'active';
            resumeCreditDelayedWatchers(draft, liveAccount.id, ISO());
          }
        }
        appendAudit(draft, actor, 'billing.transaction_retried', { accountId: txn.accountId, transactionId, reason: actor.reason, requestId: actor.requestId, metadata: { mode } });
        return null;
      });
      return { transactionId, status: 'completed' };
    } catch (error) {
      await this.#markReconciliationRequired(transactionId, result, error, actor, { phase: 'retry_finalize', mode, incrementRetry: true });
      return { transactionId, status: 'reconciliation_required', error: 'The provider completed the retry, but local finalization needs staff reconciliation.' };
    }
  }

  async processCaptureResumptions() {
    const accounts = this.store.readCollection ? await this.store.readCollection('accounts') : (await this.store.read()).accounts;
    for (const candidate of accounts.filter((item) => item.closureStatus === 'active' && item.pendingCaptureResumptions?.length && captureCreditUsage(item).remaining > 0).slice(0, 5)) {
      for (let batch = 0; batch < 10; batch++) {
        const current = this.store.getEntity ? await this.store.getEntity('accounts', candidate.id) : (await this.store.read()).accounts.find((item) => item.id === candidate.id);
        if (!current || current.closureStatus !== 'active' || !current.pendingCaptureResumptions?.length || !captureCreditUsage(current).remaining) break;
        const ids = current.pendingCaptureResumptions.slice(0, 50);
        const mutate = (state) => {
          const account = state.accounts.find((item) => item.id === candidate.id);
          if (!account || account.closureStatus !== 'active' || account.billingCancellation?.mode === 'immediate' || account.billingCancellation?.status === 'completed' || !captureCreditUsage(account).remaining) return null;
          const pending = new Set(account.pendingCaptureResumptions ?? []);
          const now = ISO();
          const found = new Map(state.watchers.filter((item) => item.accountId === account.id && ids.includes(item.id)).map((item) => [item.id, item]));
          const processed = new Set();
          let bytes = 0;
          for (const id of ids) {
            if (!pending.has(id)) continue;
            const watcher = found.get(id);
            if (watcher?.status === 'active' && watcher.lastDelayReason === 'capture-credit-allowance-exhausted') {
              const size = Buffer.byteLength(JSON.stringify(watcher), 'utf8') + 1024;
              if (bytes + size > 3_000_000) break;
              bytes += size;
              resumeCreditWatcher(watcher, account, now);
            }
            processed.add(id);
          }
          account.pendingCaptureResumptions = [...pending].filter((id) => !processed.has(id));
          return null;
        };
        if (this.store.transactAccount) await this.store.transactAccount(candidate.id, 'billing.capture_resume', mutate, { lookupPrefixes: [], directEntities: ids.map((id) => ({ collection: 'watchers', id })) });
        else await this.store.transact('billing.capture_resume', mutate);
      }
    }
  }

  async scheduleRefund(transactionId, amountMinor, reason, actor) {
    return this.store.transact('billing.refund.schedule', (state) => {
      const transaction = state.transactions.find((item) => item.id === transactionId);
      if (!transaction || transaction.status !== 'completed') throw Object.assign(new Error('Only completed transactions can be refunded.'), { statusCode: 400 });
      const refunded = state.refunds.filter((item) => item.transactionId === transactionId && ['scheduled', 'processing', 'completed'].includes(item.status)).reduce((sum, item) => sum + item.amountMinor, 0);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > transaction.amountMinor - refunded) throw Object.assign(new Error('Refund amount exceeds the refundable balance.'), { statusCode: 400 });
      const refund = { id: id('refund'), accountId: transaction.accountId, transactionId, amountMinor, currency: transaction.currency, reason, status: 'scheduled', providerRefundId: null, createdAt: ISO(), updatedAt: ISO() };
      state.refunds.push(refund); appendAudit(state, actor, 'billing.refund_scheduled', { accountId: transaction.accountId, transactionId, targetId: refund.id, reason, requestId: actor.requestId }); return refund;
    });
  }

  async processRefunds(actor = { actorId: 'system', role: 'system' }) {
    const state = this.store.readCollection ? { refunds: await this.store.readCollection('refunds') } : await this.store.read();
    const staleCutoff = Date.now() - 15 * 60_000;
    const candidates = state.refunds.filter((item) => item.status === 'scheduled' || (item.status === 'processing' && Date.parse(item.processingStartedAt ?? item.updatedAt) < staleCutoff));
    for (const refund of candidates) {
      const claimed = await this.store.transact('billing.refund.processing', (draft) => {
        const item = draft.refunds.find((entry) => entry.id === refund.id);
        const stale = item?.status === 'processing' && Date.parse(item.processingStartedAt ?? item.updatedAt) < staleCutoff;
        if (!item || (!stale && item.status !== 'scheduled')) return null;
        const transaction = draft.transactions.find((entry) => entry.id === item.transactionId);
        if (!transaction || transaction.status !== 'completed') {
          item.status = 'failed'; item.error = 'Source transaction is unavailable or no longer completed.'; item.updatedAt = ISO();
          return null;
        }
        item.status = 'processing'; item.processingStartedAt = ISO(); item.updatedAt = ISO();
        return { refund: { ...item }, transaction: { ...transaction } };
      });
      if (!claimed) continue;
      let result;
      try {
        result = await this.provider.refund({ accountId: claimed.refund.accountId, transactionId: claimed.transaction.id, providerPaymentId: claimed.transaction.providerPaymentId, amountMinor: claimed.refund.amountMinor, idempotencyKey: `refund:${claimed.refund.id}` });
      } catch (error) {
        await this.store.transact('billing.refund.failed', (draft) => {
          const item = draft.refunds.find((entry) => entry.id === claimed.refund.id);
          if (item?.status === 'processing') { item.status = 'failed'; item.error = error.message; item.processingStartedAt = null; item.updatedAt = ISO(); }
          return null;
        });
        continue;
      }
      try {
        await this.store.transact('billing.refund.completed', (draft) => {
          const item = draft.refunds.find((entry) => entry.id === claimed.refund.id);
          if (!item || item.status !== 'processing') throw new Error('Refund lost its single-flight claim.');
          item.status = result.status; item.providerRefundId = result.providerRefundId; item.processingStartedAt = null; item.updatedAt = ISO();
          appendAudit(draft, actor, 'billing.refund_completed', { accountId: claimed.refund.accountId, transactionId: claimed.transaction.id, targetId: claimed.refund.id });
          return null;
        });
      } catch (error) {
        await this.store.transact('billing.refund.reconciliation', (draft) => {
          const item = draft.refunds.find((entry) => entry.id === claimed.refund.id);
          if (item) { item.status = 'reconciliation_required'; item.providerRefundId = result.providerRefundId ?? item.providerRefundId; item.error = `LOCAL_FINALIZATION_FAILED: ${error.message}`; item.processingStartedAt = null; item.updatedAt = ISO(); }
          appendAudit(draft, actor, 'billing.refund_reconciliation_required', { accountId: claimed.refund.accountId, transactionId: claimed.transaction.id, targetId: claimed.refund.id, reason: error.message });
          return null;
        });
      }
    }
  }

  async processRetries() {
    const state = this.store.readCollection ? { transactions: await this.store.readCollection('transactions') } : await this.store.read();
    for (const transaction of state.transactions.filter((item) => item.status === 'retry_scheduled' && item.automaticRetryAt <= ISO())) {
      try { await this.retry(transaction.id, { actorId: 'system', role: 'system', requestId: `auto-${transaction.id}` }, 'automatic'); }
      catch (error) { this.logger.error('billing.auto_retry.failed', { transactionId: transaction.id, message: error.message }); }
    }
  }

  async #reconcilePlanChangeBlockers(accountId, actor) {
    const state = await this.store.read();
    const account = state.accounts.find((item) => item.id === accountId);
    const blockingStatuses = ['processing', 'retry_processing', 'retry_scheduled', 'payment_required', 'reconciliation_required'];
    const blockers = state.transactions
      .filter((item) => item.accountId === accountId && item.type === 'plan_change' && blockingStatuses.includes(item.status))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    if (!blockers.length) return;
    if (!account?.providerCustomerId || !account.providerSubscriptionId || typeof this.provider.retrievePlanChangeState !== 'function') {
      throw Object.assign(new Error('The existing plan change cannot be reconciled automatically. Contact support before another charge is attempted.'), { statusCode: 409, code: 'PLAN_CHANGE_RECONCILIATION_REQUIRED' });
    }
    for (const transaction of blockers) {
      let signed;
      try { signed = verifyEnvelope(transaction.envelope, this.config.integritySecret); }
      catch { continue; }
      const providerState = await this.provider.retrievePlanChangeState({
        ...signed,
        transactionId: transaction.id,
        planId: transaction.planId,
        subscriptionId: account.providerSubscriptionId,
        providerCustomerId: account.providerCustomerId,
      });
      if (!providerState) continue;
      if (providerState.subscriptionId !== account.providerSubscriptionId
        || providerState.customerId !== account.providerCustomerId
        || providerState.metadataAccountId !== accountId) {
        throw Object.assign(new Error('The provider subscription failed account binding during plan-change recovery.'), { statusCode: 409, code: 'CUSTOMER_BINDING_FAILED' });
      }
      if (providerState.result) {
        assertProviderBinding(signed, providerState.result);
        await this.store.transact('billing.plan_change.recovered', (draft) => {
          const txn = draft.transactions.find((item) => item.id === transaction.id && item.accountId === accountId);
          const liveAccount = draft.accounts.find((item) => item.id === accountId);
          if (!txn || !blockingStatuses.includes(txn.status) || !liveAccount) return null;
          const result = providerState.result;
          txn.providerPaymentId = result.providerPaymentId ?? result.operationId ?? txn.providerPaymentId;
          txn.providerInvoiceId = result.providerInvoiceId ?? txn.providerInvoiceId;
          txn.paymentReference = result.paymentReference ?? txn.paymentReference;
          txn.paymentActionUrl = result.paymentActionUrl ?? null;
          txn.taxMinor = result.taxMinor ?? txn.taxMinor;
          txn.automaticRetryAt = null; txn.retryStartedAt = null; txn.updatedAt = ISO();
          wakeCancellation(liveAccount);
          if (result.status === 'completed') {
            txn.status = 'completed'; txn.outcomeReason = null;
            if (liveAccount.closureStatus !== 'active' || liveAccount.billingCancellation) { appendAudit(draft, actor, 'billing.payment_settled_during_cancellation', { accountId, transactionId: txn.id }); return null; }
            carryCaptureUsage(liveAccount, txn, result);
            if (liveAccount.closureStatus === 'active') markCurrentCatalogPlan(liveAccount, txn.planId);
            applyPlanWatcherAdjustments(draft, txn);
            if (result.periodStart) liveAccount.currentPeriodStart = result.periodStart;
            if (result.periodEnd) liveAccount.currentPeriodEnd = result.periodEnd;
            liveAccount.updatedAt = ISO();
            appendAudit(draft, actor, 'billing.plan_change_recovered', { accountId, transactionId: txn.id, requestId: actor.requestId });
          } else if (result.status === 'pending') {
            txn.status = 'payment_required'; txn.outcomeReason = 'PAYMENT_ACTION_REQUIRED';
            appendAudit(draft, actor, 'billing.plan_change_payment_required', { accountId, transactionId: txn.id, requestId: actor.requestId });
          } else {
            txn.status = 'failed'; txn.outcomeReason = 'PAYMENT_DECLINED';
            appendAudit(draft, actor, 'billing.plan_change_failed', { accountId, transactionId: txn.id, reason: txn.outcomeReason, requestId: actor.requestId });
          }
          return null;
        });
        continue;
      }
      const providerUnchanged = providerState.planId === account.planId && !providerState.pendingPlanId;
      const stale = Date.parse(transaction.updatedAt ?? transaction.createdAt) < Date.now() - 90_000;
      const knownFailed = transaction.status === 'retry_scheduled';
      if (providerUnchanged && (knownFailed || stale)) {
        await this.store.transact('billing.plan_change.stale_released', (draft) => {
          const txn = draft.transactions.find((item) => item.id === transaction.id && item.accountId === accountId);
          if (!txn || !blockingStatuses.includes(txn.status)) return null;
          txn.status = 'failed'; txn.outcomeReason = 'PROVIDER_CHANGE_NOT_APPLIED';
          txn.automaticRetryAt = null; txn.retryStartedAt = null; txn.updatedAt = ISO();
          appendAudit(draft, actor, 'billing.plan_change_stale_released', { accountId, transactionId: txn.id, reason: txn.outcomeReason, requestId: actor.requestId });
          return null;
        });
      }
    }
    const refreshed = await this.store.read();
    const remaining = refreshed.transactions.find((item) => item.accountId === accountId && item.type === 'plan_change' && blockingStatuses.includes(item.status));
    if (remaining) {
      const paymentRequired = remaining.status === 'payment_required';
      throw Object.assign(new Error(paymentRequired
        ? 'A prior plan change is waiting for payment. Complete or resolve that invoice before selecting another plan.'
        : 'A prior plan change is still being reconciled with Stripe. No new charge was attempted.'), {
        statusCode: 409,
        code: paymentRequired ? 'PLAN_CHANGE_PAYMENT_REQUIRED' : 'PLAN_CHANGE_RECONCILIATION_REQUIRED',
      });
    }
  }

  async #complete(transactionId, result, actor) {
    await this.store.transact('billing.transaction.complete', (state) => {
      const txn = state.transactions.find((item) => item.id === transactionId);
      if (txn?.status === 'completed') return null;
      if (!txn || txn.status !== 'processing') throw new Error('Billing transaction lost its single-flight claim.');
      txn.status = result.status; txn.providerPaymentId = result.providerPaymentId ?? result.operationId; txn.providerInvoiceId = result.providerInvoiceId ?? txn.providerInvoiceId; txn.paymentReference = result.paymentReference; txn.paymentActionUrl = result.paymentActionUrl ?? null; txn.taxMinor = result.taxMinor ?? txn.taxMinor; txn.updatedAt = ISO();
      if (txn.type === 'plan_change') { const account = state.accounts.find((item) => item.id === txn.accountId); if (!account) throw new Error('Account is unavailable while completing the plan change.'); if (account.closureStatus !== 'active' || account.billingCancellation) { wakeCancellation(account); appendAudit(state, actor, 'billing.payment_settled_during_cancellation', { accountId: txn.accountId, transactionId }); return null; } carryCaptureUsage(account, txn, result); markCurrentCatalogPlan(account, txn.planId); if (result.periodStart) account.currentPeriodStart = result.periodStart; if (result.periodEnd) account.currentPeriodEnd = result.periodEnd; account.updatedAt = ISO(); applyPlanWatcherAdjustments(state, txn); resumeCreditDelayedWatchers(state, txn.accountId, account.updatedAt); }
      appendAudit(state, actor, 'billing.transaction_completed', { accountId: txn.accountId, transactionId, requestId: actor.requestId }); return null;
    });
  }
  async #markReconciliationRequired(transactionId, result, error, actor, metadata = {}) {
    await this.store.transact('billing.transaction.reconciliation', (state) => {
      const txn = state.transactions.find((item) => item.id === transactionId);
      if (txn) wakeCancellation(state.accounts.find(a => a.id === txn.accountId));
      if (!txn) return null;
      if (metadata.incrementRetry && txn.status === 'retry_processing') txn.retryCount += 1;
      txn.status = 'reconciliation_required'; txn.automaticRetryAt = null; txn.retryStartedAt = null;
      txn.providerPaymentId = result?.providerPaymentId ?? result?.operationId ?? txn.providerPaymentId;
      txn.providerInvoiceId = result?.providerInvoiceId ?? txn.providerInvoiceId;
      txn.paymentReference = result?.paymentReference ?? txn.paymentReference;
      txn.paymentActionUrl = result?.paymentActionUrl ?? txn.paymentActionUrl ?? null; txn.taxMinor = result?.taxMinor ?? txn.taxMinor;
      txn.outcomeReason = `LOCAL_FINALIZATION_FAILED: ${error.message}`; txn.updatedAt = ISO();
      appendAudit(state, actor, 'billing.reconciliation_required', { accountId: txn.accountId, transactionId, reason: error.message, requestId: actor.requestId, metadata });
      return null;
    });
    this.logger.error('billing.reconciliation_required', { transactionId, message: error.message, ...metadata });
  }

  async #fail(transactionId, error, actor, result = null) {
    const failure = await this.store.transact('billing.transaction.fail', (state) => {
      const txn = state.transactions.find((item) => item.id === transactionId);
      const code = error.declineCode ?? error.code ?? error.message;
      const paymentRequired = result?.status === 'pending' && Boolean(result.providerInvoiceId);
      const terminal = ['PAYMENT_DECLINED', 'PRICE_INTEGRITY_FAILED', 'CUSTOMER_BINDING_FAILED', 'AMOUNT_RECONCILIATION_FAILED', 'STRIPE_PRICE_MISSING', 'STRIPE_PRICE_MISMATCH', 'STRIPE_CURRENT_PRICE_MISMATCH', 'STRIPE_INVOICE_MISSING', 'STRIPE_PREVIEW_MISMATCH', 'CURRENCY_MISMATCH', 'PRORATION_TIMESTAMP_INVALID', 'SUBSCRIPTION_STATE_UNSUPPORTED', 'SUBSCRIPTION_ITEMS_UNSUPPORTED', 'SUBSCRIPTION_UPDATE_PENDING', 'parameter_unknown'].includes(error.code)
        || error.providerResponse?.error?.type === 'invalid_request_error';
      txn.status = paymentRequired ? 'payment_required' : terminal ? 'failed' : 'retry_scheduled'; txn.outcomeReason = paymentRequired ? 'PAYMENT_ACTION_REQUIRED' : code; txn.automaticRetryAt = paymentRequired || terminal ? null : addSeconds(ISO(), 86400); txn.providerPaymentId = result?.providerPaymentId ?? txn.providerPaymentId; txn.providerInvoiceId = result?.providerInvoiceId ?? txn.providerInvoiceId; txn.paymentReference = result?.paymentReference ?? txn.paymentReference; txn.paymentActionUrl = result?.paymentActionUrl ?? null; txn.taxMinor = result?.taxMinor ?? txn.taxMinor; txn.updatedAt = ISO();
      const account = state.accounts.find(a => a.id === txn.accountId);
      if (account?.billingCancellation) {
        wakeCancellation(account); txn.automaticRetryAt = null;
        if (!terminal && !paymentRequired) txn.status = 'reconciliation_required';
      }
      appendAudit(state, actor, 'billing.transaction_failed', { accountId: txn.accountId, transactionId, reason: txn.outcomeReason, requestId: actor.requestId, metadata: { terminal, paymentRequired } }); return { status: txn.status };
    });
    const providerError = error.providerResponse?.error ?? {};
    this.logger.error('billing.transaction.failed', {
      transactionId, status: failure.status, code: error.code ?? null, declineCode: error.declineCode ?? null,
      providerType: providerError.type ?? null, providerCode: providerError.code ?? null, providerParam: providerError.param ?? null,
      providerOperation: error.providerOperation ?? null, stripeRequestId: error.stripeRequestId ?? null, message: error.message,
    });
    return failure;
  }
}

function assertSelfServePlan(planId) {
  const plan = PLANS[planId];
  if (!plan) throw Object.assign(new Error('Unknown plan.'), { statusCode: 400 });
  if (plan && plan.selfServe === false) throw Object.assign(new Error(`${plan.name} requires a sales-assisted activation while retained-storage metering is finalized.`), { statusCode: 409, code: 'SALES_ASSISTED_PLAN' });
}

function assertCurrentCatalogPlan(account) {
  if (PLANS[account?.planId] && !isRetiredPlan(account)) return;
  throw Object.assign(new Error('This retired subscription must be moved to the USD price book by support before another plan change can be calculated.'), {
    statusCode: 409,
    code: 'LEGACY_PLAN_MIGRATION_REQUIRED',
  });
}

function markCurrentCatalogPlan(account, planId) {
  account.planId = planId;
  account.planCatalogVersion = PLAN_CATALOG_VERSION;
  account.billingCurrency = 'USD';
}


function assertBillingProfile(account) {
  if (account.profileComplete === false || !account.country || !account.region || !account.postalCode) throw Object.assign(new Error('Complete the account billing address before starting or changing a paid plan.'), { statusCode: 409, code: 'BILLING_PROFILE_INCOMPLETE' });
}

function alreadySubscribedError(samePlan) {
  return Object.assign(new Error(samePlan
    ? 'You are already subscribed to this plan.'
    : 'An existing Stripe subscription was recovered. Review the current plan before changing it.'), {
    statusCode: 409,
    code: samePlan ? 'ALREADY_SUBSCRIBED_TO_PLAN' : 'SUBSCRIPTION_RECOVERED',
  });
}

function planChangeCompatibility(state, account, planId) {
  if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
  const access = entitlements({ ...account, planId, planCatalogVersion: PLAN_CATALOG_VERSION, billingCurrency: 'USD' });
  const watchers = state.watchers.filter((item) => item.accountId === account.id && item.status !== 'deleted');
  const errors = [];
  const used = captureCreditUsage(account).used;
  if (used > access.captureCredits + Math.max(0, Number(account.prepaidCaptureCredits) || 0)) errors.push(`The current capture window has ${used} credits used, above the ${access.name} allowance. Wait for a paid renewal before downgrading.`);
  if (watchers.length > access.maxWatchers) errors.push(`Reduce the account to ${access.maxWatchers} watcher(s) before changing to ${access.name}.`);
  const activeUsers = state.teamMembers.filter((item) => item.accountId === account.id && item.status === 'active').length;
  const pendingInvitations = state.teamInvitations.filter((item) => item.accountId === account.id && item.status === 'pending' && (!item.expiresAt || item.expiresAt > ISO())).length;
  if (activeUsers + pendingInvitations > access.maxUsers) errors.push(`Reduce the team and pending invitations to ${access.maxUsers} user(s) before changing to ${access.name}.`);
  const tierConflict = watchers.find((watcher) => (watcher.config.recipientTiers?.length ?? 0) > access.maxRecipientTiers);
  if (tierConflict) errors.push(`Reduce ${tierConflict.name} to ${access.maxRecipientTiers} recipient escalation tier(s) before changing to ${access.name}.`);
  const recipientConflict = watchers.find((watcher) => (watcher.config.recipientTiers ?? []).reduce((sum, tier) => sum + (tier.recipients?.length ?? 0), 0) > access.maxRecipients);
  if (recipientConflict) errors.push(`Reduce ${recipientConflict.name} to ${access.maxRecipients} recipients before changing to ${access.name}.`);
  let retainedRegionalWatchers = 0;
  const adjustments = watchers.flatMap((watcher) => {
    const removedMethods = (watcher.config.methods ?? []).filter((method) => !access.methods.includes(method));
    const retainedMethods = (watcher.config.methods ?? []).filter((method) => access.methods.includes(method));
    const methods = retainedMethods.length ? retainedMethods : ['outage'];
    const fromIntervalSeconds = Number(watcher.config.checkIntervalSeconds);
    const toIntervalSeconds = Math.max(fromIntervalSeconds, access.minIntervalSeconds);
    const fromCheckRegions = [...(watcher.config.checkRegions ?? [])];
    let checkRegions = fromCheckRegions.slice(0, access.maxCheckRegions);
    if (checkRegions.length && retainedRegionalWatchers >= access.maxRegionalWatchers) checkRegions = [];
    if (checkRegions.length) retainedRegionalWatchers += 1;
    if (!removedMethods.length && toIntervalSeconds === fromIntervalSeconds && JSON.stringify(checkRegions) === JSON.stringify(fromCheckRegions)) return [];
    return [{ watcherId: watcher.id, name: watcher.name, fromIntervalSeconds, toIntervalSeconds, removedMethods, methods, fromCheckRegions, checkRegions }];
  });
  const adjustedIds = new Set(adjustments.map((item) => item.watcherId));
  const resumedOthers = watchers.filter((item) => !adjustedIds.has(item.id) && item.status === 'active' && item.lastDelayReason === 'capture-credit-allowance-exhausted').length;
  if (adjustments.length * 2 + Math.min(20, resumedOthers) + 6 > 99) errors.push('This plan change would update too many watchers in one transaction. Adjust cadence/regions/methods in smaller batches before retrying, or request an assisted migration. No charge was attempted.');
  // DynamoDB also has a 4 MB transaction ceiling. Large rule sets make the
  // watcher plus reversible audit snapshot expensive even below 99 entities.
  // Leave at least 1 MB for account, ledger, attributes and event metadata.
  const estimatedBytes = watchers.reduce((bytes, watcher) => bytes + (adjustedIds.has(watcher.id) ? 2 * Buffer.byteLength(JSON.stringify(watcher), 'utf8') + 4096 : 0), 0)
    + watchers.filter((item) => !adjustedIds.has(item.id) && item.status === 'active' && item.lastDelayReason === 'capture-credit-allowance-exhausted').slice(0, 20).reduce((bytes, watcher) => bytes + Buffer.byteLength(JSON.stringify(watcher), 'utf8') + 1024, 0);
  if (estimatedBytes > 3_000_000) errors.push('This plan change would exceed the safe transaction byte budget. Reduce large rule sets or adjust watcher settings in smaller batches before retrying. No charge was attempted.');
  if (errors.length) throw Object.assign(new Error(errors.join(' ')), { statusCode: 409, code: 'PLAN_DOWNGRADE_BLOCKED', details: errors });
  return { access, adjustments };
}

export function applyPlanWatcherAdjustments(state, transaction, changedAt = ISO()) {
  for (const adjustment of transaction?.watcherAdjustments ?? []) {
    const watcher = state.watchers.find((item) => item.id === adjustment.watcherId && item.accountId === transaction.accountId);
    if (!watcher) continue;
    const methodsAlreadyApplied = watcher.config.methods?.length === adjustment.methods.length && watcher.config.methods.every((method, index) => method === adjustment.methods[index]);
    const hasRegionAdjustment = Array.isArray(adjustment.checkRegions);
    const regionsAlreadyApplied = !hasRegionAdjustment || JSON.stringify(watcher.config.checkRegions ?? []) === JSON.stringify(adjustment.checkRegions);
    if (watcher.config.checkIntervalSeconds === adjustment.toIntervalSeconds && methodsAlreadyApplied && regionsAlreadyApplied) continue;
    const before = structuredClone(watcher);
    watcher.config.checkIntervalSeconds = adjustment.toIntervalSeconds;
    watcher.config.methods = [...adjustment.methods];
    if (hasRegionAdjustment) watcher.config.checkRegions = [...adjustment.checkRegions];
    updateWatcherUsage(state.accounts.find((item) => item.id === watcher.accountId), before, watcher);
    watcher.configRevision = Number(watcher.configRevision ?? 1) + 1;
    watcher.updatedAt = changedAt;
    if (watcher.status === 'active') watcher.nextCheckAt = addSeconds(changedAt, adjustment.toIntervalSeconds);
    appendAudit(state, { actorId: 'billing-plan-enforcement', role: 'system' }, 'watcher.plan_adjusted', {
      accountId: watcher.accountId,
      targetId: watcher.id,
      transactionId: transaction.id,
      metadata: {
        before,
        afterSummary: { name: watcher.name, status: watcher.status, configRevision: watcher.configRevision, updatedAt: watcher.updatedAt, checkRegions: [...(watcher.config.checkRegions ?? [])] },
      },
    });
  }
}

export function resumeCreditDelayedWatchers(state, accountId, changedAt = ISO()) {
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account || account.closureStatus !== 'active' || account.billingCancellation?.mode === 'immediate' || account.billingCancellation?.status === 'completed' || !captureCreditUsage(account).remaining) return;
  const held = state.watchers.filter((item) => item.accountId === accountId && item.status === 'active' && item.lastDelayReason === 'capture-credit-allowance-exhausted');
  let resumed = 0;
  let bytes = 0;
  for (const watcher of held.slice(0, 20)) {
    const size = Buffer.byteLength(JSON.stringify(watcher), 'utf8') + 1024;
    if (bytes + size > 1_000_000) break;
    bytes += size;
    resumeCreditWatcher(watcher, account, changedAt);
    resumed++;
  }
  account.pendingCaptureResumptions = held.slice(resumed).map((item) => item.id);
}
function resumeCreditWatcher(watcher, account, now) {
  if (watcher.status !== 'active' || watcher.lastDelayReason !== 'capture-credit-allowance-exhausted') return;
  watcher.nextCheckAt = null;
  watcher.nextCheckAt = scheduleAfterEdit(watcher, now, captureNotBefore(watcher, account));
  watcher.lastDelayReason = null;
  watcher.updatedAt = now;
}

function wakeCancellation(account) {
  const c = account?.billingCancellation;
  if (!c) return;
  if (!c.leaseToken) c.status = 'requested';
  c.nextAttemptAt = ISO();
}
