const STRIPE_PAYMENT_ORIGINS = Object.freeze(['https://checkout.stripe.com', 'https://invoice.stripe.com']);

export function normalizeStripePaymentOrigins(values = []) {
  if (!Array.isArray(values)) throw invalidPaymentUrl();
  return [...new Set(values.map(exactHttpsOrigin))];
}

/** Validate provider-owned navigation at persistence and response boundaries. */
export function providerPaymentUrl(value, config = {}, { required = false } = {}) {
  if (value == null || value === '') {
    if (!required) return null;
    throw invalidPaymentUrl();
  }
  // The development provider has exactly one local destination.
  if (config.billingProvider === 'local' && value === '/app/billing/?checkout=success') return value;
  let url;
  try { url = new URL(String(value)); } catch { throw invalidPaymentUrl(); }
  const extraOrigins = config.stripePaymentOrigins ?? [];
  if (!Array.isArray(extraOrigins)) throw invalidPaymentUrl();
  const allowed = new Set([...STRIPE_PAYMENT_ORIGINS, ...normalizeStripePaymentOrigins(extraOrigins)]);
  if (url.protocol !== 'https:' || url.username || url.password || !allowed.has(url.origin)) throw invalidPaymentUrl();
  return url.toString();
}

// Invoice state must still reconcile after a provider mutation even if its
// navigation URL is unusable. Omit that link without classifying a successful
// or pending provider payment as a retryable collection failure.
export function optionalProviderPaymentUrl(value, config = {}) {
  try { return providerPaymentUrl(value, config); }
  catch (error) { if (error.code === 'PAYMENT_URL_NOT_APPROVED') return null; throw error; }
}

function exactHttpsOrigin(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw invalidPaymentUrl(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw invalidPaymentUrl();
  return url.origin;
}
function invalidPaymentUrl() { return Object.assign(new Error('The payment destination is outside the approved HTTPS origins. Contact support before retrying payment.'), { code: 'PAYMENT_URL_NOT_APPROVED', statusCode: 409 }); }
