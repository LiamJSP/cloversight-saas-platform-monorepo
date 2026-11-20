/** Planning math, not a live AWS benchmark or a complete bill forecast. */
export function capacityPlan({ watchers = 250, intervalSeconds = 120, regions = 1,
  meanSeconds = 15, p95Seconds = 30, memoryGb = 2, concurrency = 64,
  utilization = 0.7, days = 30, credits = 100000, meanMiB = 3,
  gbSecondUsd = 0.0000166667, margin = 0.7,
} = {}) {
  const values = { watchers, intervalSeconds, regions, meanSeconds, p95Seconds, memoryGb, concurrency, utilization, days, credits, meanMiB, gbSecondUsd, margin };
  for (const [key, value] of Object.entries(values)) if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a finite non-negative number.`);
  if (![watchers, regions, concurrency].every((x) => Number.isInteger(x) && x > 0) || intervalSeconds <= 0 || days <= 0 || utilization <= 0 || utilization > 1 || margin >= 1 || p95Seconds < meanSeconds) throw new Error('Invalid capacity planning inputs.');
  const perRegionPerSecond = watchers / intervalSeconds;
  const captures = Math.ceil(watchers * regions * days * 86400 / intervalSeconds);
  const computeUsd = captures * memoryGb * meanSeconds * gbSecondUsd;
  return {
    assumptions: values,
    requestedCaptures: captures,
    capturesPerSecondPerRegion: perRegionPerSecond,
    requiredConcurrencyPerRegion: Math.ceil(perRegionPerSecond * p95Seconds / utilization),
    modeledMeanUtilization: perRegionPerSecond * meanSeconds / concurrency,
    // Assumes workers are already at their ceiling; excludes scaling/ramp,
    // dispatcher lateness, coordinator transactions and evidence persistence.
    warmBurstDrainSecondsAtP95: Math.ceil(watchers / concurrency) * p95Seconds,
    creditCoverageHours: credits / (perRegionPerSecond * regions * 3600),
    cadenceFitsSingleWatcher: p95Seconds < intervalSeconds,
    newEvidenceGiB: captures * meanMiB / 1024,
    browserComputeUsd: computeUsd,
    computeOnlyPriceFloorUsd: computeUsd / (1 - margin),
    exclusions: ['SQS/Lambda requests', 'DynamoDB', 'S3 storage and operations', 'KMS', 'transfer', 'logs and alarms', 'retries and cold starts', 'notification providers', 'payment fees', 'support', 'tax'],
  };
}

export function assertReservationBudget(unreserved, reservations) {
  if (!Number.isFinite(unreserved) || unreserved < 0) throw new Error('AWS did not return a usable unreserved Lambda concurrency quota.');
  const additional = reservations.reduce((sum, item) => {
    if (![item.current, item.desired].every((n) => Number.isInteger(n) && n >= 0)) throw new Error('Invalid Lambda reservation.');
    // CloudFormation may raise one function before lowering another. Do not
    // spend quota that a later resource update has not released yet.
    return sum + Math.max(0, item.desired - item.current);
  }, 0);
  if (unreserved - additional < 100) throw new Error(`Lambda reservations need ${additional} additional slots, but only ${Math.max(0, unreserved - 100)} are available above AWS's 100-slot unreserved floor. Request a quota increase or lower the configured ceiling before deploying.`);
  return { additional, remainingUnreserved: unreserved - additional };
}
