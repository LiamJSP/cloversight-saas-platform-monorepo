import { createHmac } from 'node:crypto';
import { id, constantTimeEqual } from '../lib.mjs';
import { providerPaymentUrl, optionalProviderPaymentUrl } from './urls.mjs';

export class LocalBillingProvider {
  async createCheckout(input) { const start = new Date(); const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1); return { provider: 'local', checkoutId: id('checkout'), url: '/app/billing/?checkout=success', customerId: input.providerCustomerId ?? id('cus_local'), subscriptionId: id('sub_local'), providerPaymentId: id('pi_local'), paymentReference: 'pm_local_4242', amountMinor: input.amountMinor, taxMinor: 0, currency: input.currency, metadataAccountId: input.accountId, status: 'completed', periodStart: start.toISOString(), periodEnd: end.toISOString() }; }
  async retrieveCheckout() { return null; }
  async findActiveSubscription() { return null; }
  async retrievePlanChangeState() { return null; }
  async expireCheckout() { return { status: 'expired' }; }
  async changePlan(input) {
    const operationId = id('sub_local');
    const periodStart = new Date((input.prorationDateEpoch ?? Math.floor(Date.now() / 1000)) * 1000);
    const periodEnd = new Date(periodStart); periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    return {
      provider: 'local', operationId, providerInvoiceId: id('in_local'), providerPaymentId: id('pi_local'),
      status: input.simulateDecline ? 'declined' : 'completed', amountMinor: input.amountMinor, taxMinor: 0,
      currency: input.currency, customerId: input.providerCustomerId, metadataAccountId: input.accountId,
      paymentReference: 'pm_local_4242', periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(),
    };
  }
  async retry(input) { return this.changePlan(input); }
  async refund(input) { return { providerRefundId: id('re_local'), status: 'completed', amountMinor: input.amountMinor }; }
}

export class StripeBillingProvider {
  constructor(config) { this.config = config; if (!config.stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is required for Stripe mode.'); }

  async request(method, resource, body, idempotencyKey) {
    const params = body ? encode(body) : null;
    const url = new URL(`https://api.stripe.com/v1${resource}`);
    if (method === 'GET' && params) for (const [key, value] of params) url.searchParams.append(key, value);
    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        method,
        headers: {
          authorization: `Bearer ${this.config.stripeSecretKey}`,
          ...(method !== 'GET' && params ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
          ...(idempotencyKey && method === 'POST' ? { 'idempotency-key': idempotencyKey } : {}),
          ...(this.config.stripeApiVersion ? { 'Stripe-Version': this.config.stripeApiVersion } : {}),
        },
        body: method !== 'GET' && params ? params : undefined,
      });
    } catch (error) {
      throw Object.assign(new Error(`Stripe could not be reached: ${error.message}`), { code: 'STRIPE_NETWORK_ERROR', cause: error, providerOperation: stripeOperation(method, resource) });
    }
    let raw;
    try { raw = await response.text(); } catch (cause) { throw Object.assign(new Error('Stripe response was interrupted.'), { code: 'STRIPE_NETWORK_ERROR', cause, providerOperation: stripeOperation(method, resource) }); }
    let result = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch {}
    if (!response.ok) {
      const providerMessage = result.error?.message ?? `HTTP ${response.status}`;
      throw Object.assign(new Error(`Stripe rejected operation: ${providerMessage}`), {
        code: result.error?.code ?? result.error?.type ?? `STRIPE_HTTP_${response.status}`,
        declineCode: result.error?.decline_code,
        providerResponse: result,
        providerOperation: stripeOperation(method, resource),
        stripeRequestId: response.headers.get('request-id'),
      });
    }
    if (!raw || !Object.keys(result).length) throw Object.assign(new Error('Stripe returned an empty or invalid response.'), { code: 'STRIPE_INVALID_RESPONSE' });
    return result;
  }

  async retrieveSubscription(input) {
    const subscription = await this.request('GET', `/subscriptions/${encodeURIComponent(input.subscriptionId)}`);
    assertCancellationBinding(subscription, input);
    return subscription;
  }

  async retrieveCancellationInvoice(input) {
    const invoice = await this.request('GET', `/invoices/${encodeURIComponent(input.invoiceId)}`, { 'expand[0]': 'payments' });
    if (invoice.id !== input.invoiceId || invoice.customer !== input.providerCustomerId
      || invoiceAccountId(invoice) && invoiceAccountId(invoice) !== input.accountId) throw Object.assign(new Error('Invoice cancellation reconciliation binding failed.'), { code: 'CUSTOMER_BINDING_FAILED' });
    return { status: invoice.status, amountMinor: Number(invoice.subtotal), currency: String(invoice.currency).toUpperCase(), providerPaymentId: invoicePaymentIntent(invoice)?.id };
  }

  async cancellationSubscriptions(input) {
    const subscriptions = new Map();
    if (input.subscriptionId) {
      const current = await this.retrieveSubscription({ ...input, allowLegacyBinding: true });
      subscriptions.set(current.id, current);
    }
    if (!input.providerCustomerId) return [...subscriptions.values()];
    let cursor;
    for (let page = 0; page < 5; page += 1) {
      const result = await this.request('GET', '/subscriptions', { customer: input.providerCustomerId, status: 'all', limit: '100', ...(cursor ? { starting_after: cursor } : {}) });
      for (const sub of result.data ?? []) {
        if (sub.metadata?.accountId !== input.accountId && sub.id !== input.subscriptionId) continue;
        assertCancellationBinding(sub, { ...input, subscriptionId: sub.id, allowLegacyBinding: sub.id === input.subscriptionId });
        subscriptions.set(sub.id, sub);
      }
      if (!result.has_more) return [...subscriptions.values()];
      cursor = result.data?.at(-1)?.id;
      if (!cursor) break;
    }
    throw Object.assign(new Error('Subscription inventory requires support reconciliation.'), { code: 'CANCELLATION_INVENTORY_LIMIT' });
  }

  async cancelSubscription(input) {
    let sub = await this.retrieveSubscription(input);
    if (['canceled', 'incomplete_expired'].includes(sub.status)) return sub;
    // Release future schedule phases before stopping renewal. Never alter an
    // unrelated customer's schedule or rely on the current price catalog.
    const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule?.id;
    if (scheduleId) {
      const released = await this.request('POST', `/subscription_schedules/${encodeURIComponent(scheduleId)}/release`, { preserve_cancel_date: 'true' }, `${input.idempotencyKey}:release:${scheduleId}`);
      if (released.released_subscription !== sub.id) throw Object.assign(new Error('Released schedule did not match the subscription.'), { code: 'CUSTOMER_BINDING_FAILED' });
      sub = await this.retrieveSubscription(input);
    }
    const end = subscriptionEnd(sub);
    const immediate = input.mode === 'immediate' || sub.status === 'incomplete' || !end || end <= Date.now();
    if (immediate) {
      await this.request('DELETE', `/subscriptions/${encodeURIComponent(sub.id)}`, { prorate: 'false', invoice_now: 'false' });
    } else if (!sub.cancel_at_period_end) {
      await this.request('POST', `/subscriptions/${encodeURIComponent(sub.id)}`, { cancel_at_period_end: 'true' }, input.idempotencyKey);
    }
    const confirmed = await this.retrieveSubscription(input);
    if (!['canceled', 'incomplete_expired'].includes(confirmed.status) && (immediate || !confirmed.cancel_at_period_end)) {
      throw Object.assign(new Error('Stripe cancellation is not confirmed.'), { code: 'CANCELLATION_NOT_CONFIRMED' });
    }
    return confirmed;
  }

  async verifyPrice(planId, expectedMinor, currency) {
    const priceId = this.config.stripePriceIds[planId];
    if (!priceId) throw Object.assign(new Error(`Stripe Price ID is not configured for ${planId}.`), { code: 'STRIPE_PRICE_MISSING' });
    const price = await this.request('GET', `/prices/${encodeURIComponent(priceId)}`);
    if (price.unit_amount !== expectedMinor || price.currency !== currency.toLowerCase() || price.type !== 'recurring' || price.recurring?.interval !== 'month') {
      throw Object.assign(new Error('Stripe Price object does not match the server monthly price book.'), { code: 'STRIPE_PRICE_MISMATCH' });
    }
    return priceId;
  }

  async createCheckout(input) {
    const priceId = await this.verifyPrice(input.planId, input.fullPlanPriceMinor, input.currency);
    const session = await this.request('POST', '/checkout/sessions', {
      mode: 'subscription', success_url: checkoutSuccessUrl(input.successUrl), cancel_url: input.cancelUrl,
      'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
      client_reference_id: input.accountId, 'metadata[accountId]': input.accountId, 'metadata[transactionId]': input.transactionId,
      'subscription_data[metadata][accountId]': input.accountId, 'subscription_data[metadata][transactionId]': input.transactionId,
      'automatic_tax[enabled]': 'true', billing_address_collection: 'required', 'tax_id_collection[enabled]': 'true',
      // Let Stripe Checkout select the account-enabled methods that are valid
      // for this customer's region, currency, and recurring Price. Hard-coding
      // `card` suppressed eligible PayPal/Alipay/WeChat Pay options even when
      // they were enabled in the Stripe payment-method dashboard.
      'payment_method_options[card][request_three_d_secure]': this.config.stripeRequestThreeDSecure ?? 'automatic',
      ...(input.providerCustomerId ? { customer: input.providerCustomerId } : { customer_email: input.email }),
    }, input.idempotencyKey);
    const result = { provider: 'stripe', checkoutId: session.id, customerId: session.customer ?? input.providerCustomerId ?? null };
    try { return { ...result, url: providerPaymentUrl(session.url, this.config, { required: true }) }; }
    catch (error) { error.providerCheckoutId = session.id; error.providerCustomerId = result.customerId; throw error; }
  }

  async retrieveCheckout(input) {
    const session = await this.request('GET', `/checkout/sessions/${encodeURIComponent(input.checkoutId)}`, {
      'expand[0]': 'subscription.items.data.price',
      'expand[1]': 'payment_intent',
      'expand[2]': 'subscription.latest_invoice.payments',
    });
    const subscription = typeof session.subscription === 'object' ? session.subscription : null;
    const subscriptionItem = subscription?.items?.data?.[0];
    return {
      provider: 'stripe', checkoutId: session.id, status: session.status, paymentStatus: session.payment_status,
      mode: session.mode, amountMinor: Number(session.amount_subtotal), taxMinor: Math.max(0, Number(session.amount_total ?? session.amount_subtotal) - Number(session.amount_subtotal)),
      currency: String(session.currency ?? '').toUpperCase(), customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : subscription?.id,
      providerInvoiceId: typeof subscription?.latest_invoice === 'string' ? subscription.latest_invoice : subscription?.latest_invoice?.id,
      subscriptionStatus: subscription?.status ?? null,
      subscriptionItemCount: subscription?.items?.data?.length ?? 0,
      subscriptionPlanId: Object.entries(this.config.stripePriceIds).find(([, priceId]) => priceId === (subscriptionItem?.price?.id ?? subscriptionItem?.price))?.[0] ?? null,
      metadataSubscriptionAccountId: subscription?.metadata?.accountId ?? null,
      metadataSubscriptionTransactionId: subscription?.metadata?.transactionId ?? null,
      providerPaymentId: (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id)
        ?? invoicePaymentIntent(subscription?.latest_invoice)?.id,
      metadataAccountId: session.metadata?.accountId ?? session.client_reference_id ?? null,
      metadataTransactionId: session.metadata?.transactionId ?? null,
      periodStart: epochIso(subscriptionItem?.current_period_start ?? subscription?.current_period_start),
      periodEnd: epochIso(subscriptionItem?.current_period_end ?? subscription?.current_period_end),
    };
  }

  async findActiveSubscription(input) {
    const result = await this.request('GET', '/subscriptions', { customer: input.customerId, status: 'all', limit: '100', 'expand[0]': 'data.items.data.price' });
    const active = (result.data ?? []).filter((item) => !['canceled', 'incomplete_expired'].includes(item.status));
    if (active.length > 1) throw Object.assign(new Error('More than one live Stripe subscription exists for this customer. Staff reconciliation is required.'), { code: 'MULTIPLE_SUBSCRIPTIONS_DETECTED' });
    const subscription = active[0];
    if (!subscription) return null;
    if (subscription.customer !== input.customerId || subscription.metadata?.accountId !== input.accountId) throw Object.assign(new Error('The existing Stripe subscription is not bound to this account.'), { code: 'CUSTOMER_BINDING_FAILED' });
    if (subscription.status !== 'active') throw Object.assign(new Error(`An existing Stripe subscription is ${subscription.status}; resolve it before starting another subscription.`), { code: 'SUBSCRIPTION_STATE_UNSUPPORTED' });
    if (subscription.items?.data?.length !== 1) throw Object.assign(new Error('The existing Stripe subscription has an unsupported item configuration.'), { code: 'SUBSCRIPTION_ITEMS_UNSUPPORTED' });
    const item = subscription.items.data[0];
    const priceId = item.price?.id ?? item.price;
    const planId = Object.entries(this.config.stripePriceIds).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0];
    if (!planId) throw Object.assign(new Error('The existing Stripe subscription price is not in the server plan catalogue.'), { code: 'STRIPE_CURRENT_PRICE_MISMATCH' });
    return {
      subscriptionId: subscription.id, customerId: subscription.customer, planId, status: subscription.status,
      metadataAccountId: subscription.metadata?.accountId, metadataTransactionId: subscription.metadata?.transactionId ?? null,
      periodStart: epochIso(item.current_period_start ?? subscription.current_period_start),
      periodEnd: epochIso(item.current_period_end ?? subscription.current_period_end),
    };
  }

  async retrievePlanChangeState(input) {
    const subscription = await this.request('GET', `/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
      'expand[0]': 'items.data.price', 'expand[1]': 'latest_invoice.payments',
    });
    if (subscription.customer !== input.providerCustomerId || subscription.metadata?.accountId !== input.accountId) {
      throw Object.assign(new Error('Stripe subscription is not bound to this account.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }
    if (subscription.items?.data?.length !== 1) throw Object.assign(new Error('Plan changes require exactly one Stripe subscription item.'), { code: 'SUBSCRIPTION_ITEMS_UNSUPPORTED' });
    const item = subscription.items.data[0];
    const planForPrice = (price) => Object.entries(this.config.stripePriceIds).find(([, configured]) => configured === (price?.id ?? price))?.[0] ?? null;
    const planId = planForPrice(item.price);
    const pendingItem = subscription.pending_update?.subscription_items?.find((entry) => entry.id === item.id)
      ?? subscription.pending_update?.subscription_items?.[0];
    const pendingPlanId = planForPrice(pendingItem?.price);
    const invoice = typeof subscription.latest_invoice === 'string'
      ? await this.request('GET', `/invoices/${encodeURIComponent(subscription.latest_invoice)}`, { 'expand[0]': 'payments' })
      : subscription.latest_invoice;
    const transactionMatches = subscription.metadata?.transactionId === input.transactionId;
    let result = null;
    if (transactionMatches && invoice?.id && (planId === input.planId || pendingPlanId === input.planId)) {
      reconcileInvoice(invoice, input, 'recovery');
      const payment = invoicePaymentIntent(invoice);
      const status = invoiceIsPaid(invoice) && planId === input.planId
        ? 'completed'
        : ['void', 'uncollectible'].includes(invoice.status) ? 'declined' : 'pending';
      result = {
        provider: 'stripe', operationId: invoice.id, providerInvoiceId: invoice.id,
        providerPaymentId: payment?.id,
        status, amountMinor: billableSubtotal(invoice), providerCreditMinor: Math.max(0, -invoiceSubtotal(invoice)),
        taxMinor: invoiceTax(invoice), currency: String(invoice.currency ?? input.currency).toUpperCase(),
        customerId: subscription.customer, metadataAccountId: subscription.metadata?.accountId,
        paymentReference: payment?.payment_method ?? subscription.default_payment_method ?? 'stripe-managed',
        paymentActionUrl: status === 'pending' ? optionalProviderPaymentUrl(invoice.hosted_invoice_url, this.config) : null,
        periodStart: epochIso(item.current_period_start ?? subscription.current_period_start),
        periodEnd: epochIso(item.current_period_end ?? subscription.current_period_end),
      };
    }
    return {
      subscriptionId: subscription.id, customerId: subscription.customer, status: subscription.status,
      metadataAccountId: subscription.metadata?.accountId, metadataTransactionId: subscription.metadata?.transactionId ?? null,
      planId, pendingPlanId, pendingExpiresAt: epochIso(subscription.pending_update?.expires_at),
      providerInvoiceId: invoice?.id ?? null, invoiceStatus: invoice?.status ?? null, result,
    };
  }

  async expireCheckout(input) {
    const checkoutId = String(input.checkoutId ?? '');
    if (!checkoutId) throw Object.assign(new Error('Checkout session ID is required for expiry.'), { code: 'CHECKOUT_ID_REQUIRED' });
    const resource = `/checkout/sessions/${encodeURIComponent(checkoutId)}`;
    const current = await this.request('GET', resource);
    if (current.status === 'expired') return { status: 'expired', checkoutId };
    if (current.status === 'complete') throw Object.assign(new Error('The existing Stripe Checkout Session has already completed and cannot be replaced.'), { statusCode: 409, code: 'CHECKOUT_ALREADY_COMPLETED' });
    const expired = await this.request('POST', `${resource}/expire`, null, input.idempotencyKey);
    return { status: expired.status ?? 'expired', checkoutId: expired.id ?? checkoutId };
  }

  async changePlan(input) {
    const [newPriceId, currentPriceId] = await Promise.all([
      this.verifyPrice(input.planId, input.fullPlanPriceMinor, input.currency),
      this.verifyPrice(input.currentPlanId, input.currentPlanPriceMinor, input.currency),
    ]);
    const subscription = await this.request('GET', `/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
      'expand[0]': 'items.data.price',
    });
    assertStripeSubscription(subscription, input, currentPriceId);
    const item = subscription.items.data[0];
    const prorationDate = Number(input.prorationDateEpoch);
    if (!Number.isInteger(prorationDate) || prorationDate <= 0) throw Object.assign(new Error('Plan change has no stable proration timestamp.'), { code: 'PRORATION_TIMESTAMP_INVALID' });

    // Flexible billing-mode subscriptions cannot use the legacy upcoming
    // invoice endpoint. Create Preview Invoice accepts subscription_details.
    // A billing-cycle reset to "now" cannot be combined with proration_date
    // on either the preview or the final subscription update. The signed
    // server calculation still retains its timestamp for local audit and
    // amount reconciliation; Stripe owns the effective "now" timestamp.
    const preview = await this.request('POST', '/invoices/create_preview', {
      customer: input.providerCustomerId,
      subscription: input.subscriptionId,
      'subscription_details[items][0][id]': item.id,
      'subscription_details[items][0][price]': newPriceId,
      'subscription_details[proration_behavior]': 'always_invoice',
      'subscription_details[billing_cycle_anchor]': 'now',
      'automatic_tax[enabled]': 'true',
      'expand[0]': 'lines.data',
    });
    reconcileInvoice(preview, input, 'preview');

    // pending_if_incomplete accepts only Stripe's pending-update attribute set;
    // metadata must be bound in a separate idempotent update. This marker makes
    // a timed-out request safely recoverable before any new charge is attempted.
    const bound = await this.request('POST', `/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
      'metadata[accountId]': input.accountId,
      'metadata[transactionId]': input.transactionId,
    }, `${input.idempotencyKey}:metadata`);
    if (bound.customer !== input.providerCustomerId || bound.metadata?.accountId !== input.accountId || bound.metadata?.transactionId !== input.transactionId) {
      throw Object.assign(new Error('Stripe subscription transaction binding failed.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }

    const updated = await this.request('POST', `/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
      'items[0][id]': item.id,
      'items[0][price]': newPriceId,
      billing_cycle_anchor: 'now',
      proration_behavior: 'always_invoice',
      payment_behavior: 'pending_if_incomplete',
      'expand[0]': 'latest_invoice.payments',
      'expand[1]': 'items.data.price',
    }, input.idempotencyKey);
    if (updated.customer !== input.providerCustomerId || updated.metadata?.accountId !== input.accountId) {
      throw Object.assign(new Error('Stripe subscription changed account binding during update.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }
    const invoice = typeof updated.latest_invoice === 'string'
      ? await this.request('GET', `/invoices/${encodeURIComponent(updated.latest_invoice)}`, { 'expand[0]': 'payments' })
      : updated.latest_invoice;
    if (!invoice?.id) throw Object.assign(new Error('Stripe did not return the plan-change invoice.'), { code: 'STRIPE_INVOICE_MISSING' });
    reconcileInvoice(invoice, input, 'final');
    const previewSubtotal = invoiceSubtotal(preview);
    const finalSubtotal = invoiceSubtotal(invoice);
    if (previewSubtotal !== finalSubtotal) throw Object.assign(new Error('Stripe final invoice differs from the reconciled preview.'), { code: 'STRIPE_PREVIEW_MISMATCH' });

    const payment = invoicePaymentIntent(invoice);
    const status = invoiceIsPaid(invoice) ? 'completed' : ['void', 'uncollectible'].includes(invoice.status) ? 'declined' : 'pending';
    const updatedItem = updated.items?.data?.find((entry) => entry.id === item.id) ?? updated.items?.data?.[0];
    return {
      provider: 'stripe', operationId: invoice.id, providerInvoiceId: invoice.id,
      providerPaymentId: payment?.id,
      status, amountMinor: billableSubtotal(invoice), providerCreditMinor: Math.max(0, -finalSubtotal), taxMinor: invoiceTax(invoice), currency: String(invoice.currency ?? input.currency).toUpperCase(),
      customerId: invoice.customer ?? updated.customer, metadataAccountId: updated.metadata?.accountId,
      paymentReference: payment?.payment_method ?? updated.default_payment_method ?? 'stripe-managed',
      paymentActionUrl: status === 'pending' ? optionalProviderPaymentUrl(invoice.hosted_invoice_url, this.config) : null,
      periodStart: epochIso(updatedItem?.current_period_start ?? updated.current_period_start ?? prorationDate),
      periodEnd: epochIso(updatedItem?.current_period_end ?? updated.current_period_end),
      prorationDateEpoch: prorationDate,
      previewSubtotalMinor: previewSubtotal,
    };
  }

  async retry(input) {
    if (!input.providerInvoiceId) throw new Error('Stripe invoice ID is required for retry.');
    const invoice = await this.request('GET', `/invoices/${encodeURIComponent(input.providerInvoiceId)}`, { 'expand[0]': 'payments' });
    assertInvoiceBinding(invoice, input);
    reconcileInvoice(invoice, input, 'retry-source');
    const paid = await this.request('POST', `/invoices/${encodeURIComponent(input.providerInvoiceId)}/pay`, {
      'expand[0]': 'payments',
    }, input.idempotencyKey);
    assertInvoiceBinding(paid, input);
    reconcileInvoice(paid, input, 'retry-result');
    const payment = invoicePaymentIntent(paid);
    return {
      provider: 'stripe', operationId: paid.id, providerInvoiceId: paid.id,
      providerPaymentId: payment?.id,
      status: invoiceIsPaid(paid) ? 'completed' : ['void', 'uncollectible'].includes(paid.status) ? 'declined' : 'pending',
      amountMinor: billableSubtotal(paid), providerCreditMinor: Math.max(0, -invoiceSubtotal(paid)), taxMinor: invoiceTax(paid), currency: paid.currency.toUpperCase(),
      customerId: paid.customer, metadataAccountId: invoiceAccountId(paid),
      paymentReference: payment?.payment_method ?? 'stripe-managed',
      paymentActionUrl: invoiceIsPaid(paid) ? null : optionalProviderPaymentUrl(paid.hosted_invoice_url, this.config),
      periodStart: input.periodStart, periodEnd: input.periodEnd,
    };
  }

  async refund(input) {
    const refund = await this.request('POST', '/refunds', {
      payment_intent: input.providerPaymentId, amount: String(input.amountMinor),
      'metadata[accountId]': input.accountId, 'metadata[transactionId]': input.transactionId,
    }, input.idempotencyKey);
    return { providerRefundId: refund.id, status: refund.status === 'succeeded' ? 'completed' : refund.status, amountMinor: refund.amount };
  }
}

export class UnsupportedBillingProvider {
  constructor(name) { this.name = name; }
  fail() { throw Object.assign(new Error(`${this.name} is a fail-closed adapter stub in this release.`), { code: 'PROVIDER_NOT_IMPLEMENTED' }); }
  createCheckout() { return this.fail(); } retrieveCheckout() { return this.fail(); } findActiveSubscription() { return this.fail(); } retrievePlanChangeState() { return this.fail(); } changePlan() { return this.fail(); } retry() { return this.fail(); } refund() { return this.fail(); }
}

export function verifyStripeWebhook(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!secret) throw new Error('Stripe webhook secret is not configured.');
  const fields = String(signatureHeader ?? '').split(',').map((part) => part.trim().split('=', 2));
  const timestamp = Number(fields.find(([key]) => key === 't')?.[1]);
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) throw Object.assign(new Error('Stripe webhook timestamp is invalid.'), { statusCode: 400 });
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
  if (!signatures.some((signature) => constantTimeEqual(expected, signature))) throw Object.assign(new Error('Stripe webhook signature is invalid.'), { statusCode: 400 });
  try { return JSON.parse(rawBody.toString('utf8')); }
  catch { throw Object.assign(new Error('Stripe webhook body is not valid JSON.'), { statusCode: 400 }); }
}

function assertStripeSubscription(subscription, input, currentPriceId) {
  if (subscription.customer !== input.providerCustomerId || subscription.metadata?.accountId !== input.accountId) throw Object.assign(new Error('Stripe subscription is not bound to this account.'), { code: 'CUSTOMER_BINDING_FAILED' });
  if (!['active', 'trialing'].includes(subscription.status)) throw Object.assign(new Error(`Stripe subscription status ${subscription.status} does not permit an immediate plan change.`), { code: 'SUBSCRIPTION_STATE_UNSUPPORTED' });
  if (subscription.collection_method && subscription.collection_method !== 'charge_automatically') throw Object.assign(new Error('Send-invoice subscriptions are not supported for self-service plan changes.'), { code: 'SUBSCRIPTION_STATE_UNSUPPORTED' });
  if (subscription.schedule) throw Object.assign(new Error('Subscription schedules require staff reconciliation before a plan change.'), { code: 'SUBSCRIPTION_STATE_UNSUPPORTED' });
  if (subscription.discount || (Array.isArray(subscription.discounts) && subscription.discounts.length)) throw Object.assign(new Error('Discounted subscriptions require staff-assisted plan changes.'), { code: 'SUBSCRIPTION_STATE_UNSUPPORTED' });
  if (subscription.items?.data?.length !== 1) throw Object.assign(new Error('Plan changes require exactly one Stripe subscription item.'), { code: 'SUBSCRIPTION_ITEMS_UNSUPPORTED' });
  const actualPriceId = subscription.items.data[0].price?.id ?? subscription.items.data[0].price;
  if (actualPriceId !== currentPriceId) throw Object.assign(new Error('Current Stripe Price does not match the account plan.'), { code: 'STRIPE_CURRENT_PRICE_MISMATCH' });
  if (subscription.pending_update) throw Object.assign(new Error('A previous Stripe subscription update is still pending.'), { code: 'SUBSCRIPTION_UPDATE_PENDING' });
}

function reconcileInvoice(invoice, input, phase) {
  if (!invoice) throw Object.assign(new Error(`Stripe ${phase} invoice is missing.`), { code: 'STRIPE_INVOICE_MISSING' });
  if (invoice.customer && invoice.customer !== input.providerCustomerId) throw Object.assign(new Error(`Stripe ${phase} invoice customer mismatch.`), { code: 'CUSTOMER_BINDING_FAILED' });
  if (invoice.currency && String(invoice.currency).toUpperCase() !== input.currency) throw Object.assign(new Error(`Stripe ${phase} invoice currency mismatch.`), { code: 'CURRENCY_MISMATCH' });
  const subtotal = invoiceSubtotal(invoice);
  const billable = Math.max(0, subtotal);
  if (!Number.isSafeInteger(subtotal) || billable !== input.amountMinor) throw Object.assign(new Error(`Stripe ${phase} billable subtotal ${billable} (raw ${subtotal}) does not match signed amount ${input.amountMinor}.`), { code: 'AMOUNT_RECONCILIATION_FAILED' });
  return subtotal;
}
function invoicePaymentIntent(invoice) {
  const legacy = invoice?.payment_intent;
  if (legacy) return typeof legacy === 'string' ? { id: legacy, payment_method: null } : legacy;
  const invoicePayment = invoice?.payments?.data?.find((item) => item.is_default) ?? invoice?.payments?.data?.[0];
  const intent = invoicePayment?.payment?.payment_intent;
  if (!intent) return null;
  return typeof intent === 'string' ? { id: intent, payment_method: null } : intent;
}
function invoiceIsPaid(invoice) { return typeof invoice?.paid === 'boolean' ? invoice.paid : invoice?.status === 'paid'; }
function assertInvoiceBinding(invoice, input) {
  if (invoice.customer !== input.providerCustomerId || invoiceAccountId(invoice) !== input.accountId) throw Object.assign(new Error('Stripe invoice is not bound to this account.'), { code: 'CUSTOMER_BINDING_FAILED' });
}
function invoiceAccountId(invoice) { return invoice.metadata?.accountId ?? invoice.subscription_details?.metadata?.accountId ?? invoice.parent?.subscription_details?.metadata?.accountId; }
function invoiceSubtotal(invoice) { return Number(invoice.subtotal_excluding_tax ?? invoice.amount_subtotal ?? invoice.subtotal); }
function billableSubtotal(invoice) { return Math.max(0, invoiceSubtotal(invoice)); }
function invoiceTax(invoice) {
  if (Number.isSafeInteger(invoice.total_tax_amounts?.reduce?.((sum, entry) => sum + Number(entry.amount ?? 0), 0))) return invoice.total_tax_amounts.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  return Math.max(0, Number(invoice.total ?? invoice.amount_due ?? 0) - invoiceSubtotal(invoice));
}
function epochIso(value) { return Number.isFinite(Number(value)) && Number(value) > 0 ? new Date(Number(value) * 1000).toISOString() : null; }
function checkoutSuccessUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Checkout success URL must use HTTP or HTTPS.');
  url.searchParams.set('checkout', 'success');
  url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}
function encode(value) { const params = new URLSearchParams(); for (const [key, item] of Object.entries(value)) if (item != null) params.append(key, String(item)); return params; }
function stripeOperation(method, resource) {
  const path = String(resource).split('?')[0].split('/').map((segment) => /^(?:acct|ch|cs|cus|evt|in|pi|pm|price|prod|re|si|sub|upcoming_in)_/.test(segment) ? ':id' : segment).join('/');
  return `${String(method).toUpperCase()} ${path}`;
}

export const stripeProviderInternals = Object.freeze({ assertStripeSubscription, reconcileInvoice, invoicePaymentIntent, invoiceIsPaid, assertInvoiceBinding, invoiceAccountId, invoiceSubtotal, billableSubtotal, invoiceTax, epochIso, checkoutSuccessUrl, encode, stripeOperation });

function assertCancellationBinding(subscription, input) {
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (subscription.id !== input.subscriptionId || !input.providerCustomerId || customer !== input.providerCustomerId
    || (subscription.metadata?.accountId !== input.accountId && !(input.allowLegacyBinding && !subscription.metadata?.accountId))) {
    throw Object.assign(new Error('Cancellation subscription is not bound to this account.'), { code: 'CUSTOMER_BINDING_FAILED' });
  }
}

export function subscriptionEnd(subscription) {
  const periods = (subscription.items?.data ?? []).map(item => Number(item.current_period_end) * 1000).filter(Number.isFinite);
  return periods.length ? Math.max(...periods) : Number(subscription.current_period_end || 0) * 1000;
}
