// A scheduled run has immutable planned slots; queue deferrals cannot move the benchmark.
export function summarizeRun({ fixtures, jobs, cycles, creditsBefore, creditsAfter, periodStable }) {
  const byId = new Map(fixtures.map(f => [f.id, []]));
  let failed = 0;
  let deferred = 0;
  let manual = 0;
  for (const job of jobs) {
    const group = byId.get(job.watcherId);
    if (!group || job.type !== 'check') continue;
    if (job.manual) { manual++; continue; }
    if (job.status === 'failed' || job.status === 'completed' && job.outcome !== 'green') failed++;
    if (job.status === 'skipped') deferred++;
    if (job.status === 'completed' && job.outcome === 'green' && job.snapshotId) group.push(job);
  }
  let extra = 0;
  let scheduled = 0;
  const lateness = [];
  const completionTimes = [];
  const evidence = new Set();
  for (const fixture of fixtures) {
    const group = byId.get(fixture.id).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    extra += Math.max(0, group.length - cycles);
    for (const [i, job] of group.entries()) {
      const planned = Date.parse(fixture.firstDue) + i * 120_000;
      const started = Date.parse(job.startedAt);
      const due = Date.parse(job.captureRun?.scheduledFor);
      const completed = Date.parse(job.completedAt);
      if (!Number.isFinite(completed) || completed < started || !Number.isFinite(started) || !Number.isFinite(due) || started < planned || started < due || evidence.has(job.snapshotId)) continue;
      evidence.add(job.snapshotId);
      if (i < cycles) {
        scheduled++;
        lateness.push((started - planned) / 1000);
        completionTimes.push((completed - planned) / 1000);
      }
    }
  }
  lateness.sort((a, b) => a - b);
  completionTimes.sort((a, b) => a - b);
  const expected = fixtures.length * cycles;
  const charged = creditsAfter - creditsBefore;
  const p95 = lateness[Math.ceil(lateness.length * 0.95) - 1] ?? null;
  return { expected, completed: scheduled, extra, failed, skipped: deferred, manual, charged,
    p95DueToCompletionSeconds: completionTimes[Math.ceil(completionTimes.length * 0.95) - 1] ?? null,
    p95StartLatenessSeconds: p95, maxStartLatenessSeconds: lateness.at(-1) ?? null,
    passed: expected > 0 && scheduled === expected && !failed && !extra && !manual &&
      periodStable && charged === expected && p95 !== null && p95 <= 120 };
}
