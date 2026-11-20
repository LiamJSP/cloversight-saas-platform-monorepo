import { DAILY_DELIVERY_LIMITS, entitlements } from '../domain/plans.mjs';
import { ISO, sha256 } from '../lib.mjs';

export function reserveDeliveryBudget(state, account, channel) {
  const access = entitlements(account);
  if (access.billingRestricted) return false;
  const limit = (DAILY_DELIVERY_LIMITS[access.id] ?? { email: 500, sms: 25 })[channel] ?? 0;
  if (!limit) return false;
  const day = ISO().slice(0, 10);
  const key = `delivery-budget:${account.id}:${channel}:${day}`;
  let entry = state.idempotency.find((item) => item.key === key);
  if (!entry) {
    entry = { key, accountId: account.id, scope: 'delivery-budget', attempts: 0,
      createdAt: ISO(), expiresAtEpoch: Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000) + 3 * 86400 };
    state.idempotency.push(entry);
  }
  if (Number(entry.attempts ?? 0) >= limit) return false;
  entry.attempts = Number(entry.attempts ?? 0) + 1;
  return true;
}

export function reserveInvitationBudget(state, account, email, now = ISO()) {
  const key = `invitation-delivery:${sha256(email)}:${now.slice(0, 10)}`;
  let entry = state.idempotency.find((item) => item.key === key);
  if (entry && (entry.attempts >= 3 || Date.parse(now) - Date.parse(entry.lastAttemptAt) < 600_000)) throw Object.assign(new Error('This address was invited recently. Wait before sending another invitation.'), { statusCode: 429, code: 'INVITATION_RATE_LIMIT' });
  if (!reserveDeliveryBudget(state, account, 'email')) throw Object.assign(new Error('Account daily email attempt allowance exhausted.'), { statusCode: 429, code: 'EMAIL_ALLOWANCE_EXHAUSTED' });
  if (!entry) { entry = { key, scope: 'invitation-delivery', attempts: 0, expiresAtEpoch: Math.floor(Date.parse(now) / 1000) + 2 * 86400 }; state.idempotency.push(entry); }
  entry.attempts += 1; entry.lastAttemptAt = now;
}
export function notificationPolicyFits(policy, account) {
  const access = entitlements(account);
  const tiers = policy?.recipientTiers ?? [];
  const recipients = tiers.flatMap((tier) => tier.recipients ?? []);
  return !access.billingRestricted && tiers.length <= access.maxRecipientTiers && recipients.length <= access.maxRecipients
    && !((access.dailyDeliveryLimits?.sms ?? DAILY_DELIVERY_LIMITS[access.id]?.sms) === 0 && recipients.some((item) => item.enabled !== false && item.channel === 'sms'));
}
