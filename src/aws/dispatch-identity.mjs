import { canonicalJson, sha256 } from '../lib.mjs';

// Stable across EventBridge retries, SQS duplicates and ambiguous sends.
// No tenant URL, recipient or captured data is stored in the operational claim.
export function scheduledDispatchIdentity(watcher) {
  if (!watcher.id || !watcher.accountId || !Number.isFinite(Date.parse(watcher.nextCheckAt))) {
    throw new Error('A scheduled watcher needs an account, ID and valid due time.');
  }
  return sha256(canonicalJson([watcher.accountId, watcher.id, watcher.configRevision ?? 1, watcher.nextCheckAt]));
}
