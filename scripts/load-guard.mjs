const ASSUMED_CENTS_PER_REQUEST = 10; // Conservative planning bound; never presented as an AWS price quote.

export function planLoadProbe(input) {
  const maxUsd = Number(input.maxUsd);
  const maxRequests = Number(input.maxRequests);
  const durationSeconds = Number(input.durationSeconds);
  const concurrency = Number(input.concurrency);
  const intervalMs = Number(input.intervalMs);
  if (!Number.isFinite(maxUsd) || maxUsd < 0.20 || maxUsd > 5 || Math.abs(Math.round(maxUsd * 100) - maxUsd * 100) > 1e-8) throw new Error('MAX_USD must be a cent-exact amount from 0.20 to 5.00.');
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 100) throw new Error('MAX_REQUESTS must be 1–100.');
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 60) throw new Error('DURATION_SECONDS must be 1–60.');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) throw new Error('CONCURRENCY must be 1–3.');
  if (!Number.isInteger(intervalMs) || intervalMs < 500 || intervalMs > 10000) throw new Error('INTERVAL_MS must be 500–10000.');
  const ceilingCents = Math.round(maxUsd * 100);
  const budgetRequests = Math.floor(ceilingCents / ASSUMED_CENTS_PER_REQUEST);
  const totalRequests = Math.min(maxRequests, budgetRequests);
  // Account verification uses one of the reserved requests before any load begins.
  if (totalRequests < 2) throw new Error('The ceiling must cover the preflight and at least one read request.');
  return Object.freeze({ ceilingCents, assumedCentsPerRequest: ASSUMED_CENTS_PER_REQUEST, totalRequests, loadRequests: totalRequests - 1, durationMs: durationSeconds * 1000, concurrency, intervalMs, maximumEstimatedCents: totalRequests * ASSUMED_CENTS_PER_REQUEST });
}

export function costLedger(plan) {
  let reserved = 0;
  return Object.freeze({
    reserve() {
      if (reserved >= plan.totalRequests || (reserved + 1) * plan.assumedCentsPerRequest > plan.ceilingCents) return false;
      reserved += 1; // Charge the estimate before the request, including failed or timed-out attempts.
      return true;
    },
    get attempts() { return reserved; },
    get estimatedCents() { return reserved * plan.assumedCentsPerRequest; },
  });
}
