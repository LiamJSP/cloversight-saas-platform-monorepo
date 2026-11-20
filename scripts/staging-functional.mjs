import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { stagingTarget, stagingGet, expectStagingStatus } from './staging-test-client.mjs';

export async function runStagingFunctional(env = process.env, get = stagingGet) {
  const a = stagingTarget(env);
  const bId = String(env.WEBWATCH_TEST_ACCOUNT_B ?? '').trim();
  const bToken = String(env.WEBWATCH_TEST_TOKEN_B ?? '').trim();
  if (!/^[-_A-Za-z0-9]{3,128}$/.test(bId) || bId === a.accountId || bToken.length < 24 || /\s/.test(bToken) || bToken === a.token) throw new Error('Provide a distinct second account and access token via WEBWATCH_TEST_ACCOUNT_B and WEBWATCH_TEST_TOKEN_B.');
  const b = { ...a, accountId: bId, token: bToken };
  const first = expectStagingStatus(await get(a, '/api/customer/bootstrap'), [200], 'account A bootstrap');
  const second = expectStagingStatus(await get(b, '/api/customer/bootstrap'), [200], 'account B bootstrap');
  if (first.account?.id !== a.accountId || second.account?.id !== b.accountId || !first.watchers?.length || !second.watchers?.length) throw new Error('Two separate test accounts with at least one watcher each are required.');
  for (const [self, own, foreign] of [[a, first, second], [b, second, first]]) {
    const ownId = encodeURIComponent(own.watchers[0].id);
    const foreignId = encodeURIComponent(foreign.watchers[0].id);
    if (own.watchers.some((watcher) => foreign.watchers.some((other) => other.id === watcher.id))) throw new Error('Staging fixtures reuse a watcher ID across tenants.');
    expectStagingStatus(await get(self, `/api/watchers/${ownId}/check-status`), [200], 'own watcher check status');
    expectStagingStatus(await get(self, `/api/watchers/${foreignId}/check-status`), [404], 'foreign watcher check status');
    expectStagingStatus(await get(self, `/api/watchers/${foreignId}/notification-activity`), [404], 'foreign notification activity');
    if (foreign.checkJobs?.length) expectStagingStatus(await get(self, `/api/checks/${encodeURIComponent(foreign.checkJobs[0].id)}`), [404], 'foreign check job');
    if (foreign.reportJobs?.length) expectStagingStatus(await get(self, `/api/reports/${encodeURIComponent(foreign.reportJobs[0].id)}`), [404], 'foreign report');
  }
  return { accounts: [a.accountId, b.accountId], checkJobExercised: Boolean(first.checkJobs?.length && second.checkJobs?.length), reportExercised: Boolean(first.reportJobs?.length && second.reportJobs?.length) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runStagingFunctional().then((result) => console.log(`Staging tenant checks passed for ${result.accounts.join(' and ')}. Foreign jobs: ${result.checkJobExercised ? 'both checked' : 'only where fixture jobs exist'}; foreign reports: ${result.reportExercised ? 'both checked' : 'only where fixture reports exist'}.`))
    .catch((error) => { console.error(`Staging functional check failed: ${error.message}`); process.exitCode = 1; });
}
