import { id, ISO } from '../lib.mjs';
export function appendAudit(state, actor, action, details = {}) {
  const event = { id: id('audit'), at: ISO(), actorId: actor.actorId, actorRole: actor.role, action, accountId: details.accountId ?? null, transactionId: details.transactionId ?? null, targetId: details.targetId ?? null, reason: details.reason ?? null, requestId: details.requestId ?? null, metadata: details.metadata ?? {} };
  state.auditEvents.push(event);
  return event;
}
