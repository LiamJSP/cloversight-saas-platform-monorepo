import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRun } from '../scripts/acceptance-metrics.mjs';
import { scheduleAfterEdit } from '../src/monitoring/schedule.mjs';

test('250 two-minute watchers require 500 distinct scheduled results with matching credits and original due times', () => {
  const start = '2026-01-10T00:00:00.000Z';
  const fixtures = Array.from({ length: 250 }, (_, i) => {
    const w = { id: 'watch_' + i, accountId: 'test', config: { checkIntervalSeconds: 120 } };
    return { id: w.id, firstDue: scheduleAfterEdit(w, start) };
  });
  assert.ok(new Set(fixtures.map(f => f.firstDue)).size > 80);
  const jobs = fixtures.flatMap(f => [0, 1].map(i => {
    const due = Date.parse(f.firstDue) + 120000 * i;
    return { watcherId: f.id, type: 'check', snapshotId: f.id + '-' + i, status: 'completed', outcome: 'green',
      captureRun: { scheduledFor: new Date(due).toISOString() }, startedAt: new Date(due + 1250).toISOString(), completedAt: new Date(due + 14000).toISOString() };
  }));
  const sample = { fixtures, jobs, cycles: 2, creditsBefore: 10, creditsAfter: 510, periodStable: true };
  assert.equal(summarizeRun(sample).p95StartLatenessSeconds, 1.25);
  assert.ok(summarizeRun(sample).passed);
  assert.equal(summarizeRun(sample).p95DueToCompletionSeconds, 14);
  for (const changes of [{ jobs: jobs.slice(1) }, { creditsAfter: 511 }, { periodStable: false },
    { jobs: [...jobs, { ...jobs[0], manual: true }] }, { jobs: [...jobs, jobs[0]] },
    { jobs: jobs.map(j => ({ ...j, snapshotId: jobs[0].snapshotId })) },
    { jobs: jobs.map(j => ({ ...j, startedAt: new Date(Date.parse(j.startedAt) + 121000).toISOString() })) }]) {
    assert.equal(summarizeRun({ ...sample, ...changes }).passed, false);
  }
});
