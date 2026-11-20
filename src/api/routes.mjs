import { cancellationView } from '../billing/cancellation.mjs';
import { enforceCustomerRate } from '../security/customer-rate.mjs';
import { assertManualCaptureAllowed } from '../domain/usage-guards.mjs';
import { carryCaptureUsage, applyPaidRenewalWindow } from '../billing/usage.mjs';
/** @module api/routes
 * @description Local and AWS HTTP router; customer ownership, steward operations and provider callbacks.
 */
import { readBody, readJson, json, ISO, id, sha256 } from '../lib.mjs';
import { captureCreditUsage, entitlements, historyCutoff, PLAN_CATALOG_VERSION, PLANS } from '../domain/plans.mjs';
import { requireRole } from '../security/auth.mjs';
import { stewardAccountView, stewardAccountSummary, stewardTransactionSummary, stewardAuditEventSummary } from '../security/masking.mjs';
import { appendAudit } from '../services/audit.mjs';
import { createResponseToken, verifyResponseToken } from '../notifications/token.mjs';
import { customerNotificationStatus } from '../notifications/service.mjs';
import { verifyStripeWebhook } from '../billing/providers.mjs';
import { optionalProviderPaymentUrl } from '../billing/urls.mjs';
import { calculationEnvelope, recurringPriceMinor } from '../billing/safety.mjs';
import { applyPlanWatcherAdjustments, resumeCreditDelayedWatchers } from '../billing/service.mjs';
import { makeReviewPreview } from '../monitoring/pixel.mjs';
import { snapshotPreviewKey } from '../monitoring/artifacts.mjs';
import { publicCheckRegions } from '../domain/regions.mjs';
import { customerWatcherCheckStatus } from '../monitoring/check-status.mjs';
import { classifyIncident } from '../monitoring/outcomes.mjs';

export function createRouter(services) {
  const { config, store, assets, watcherService, monitoring, billing, accounts, actionLog, stewardSecurity, reports, notifier, logger } = services;
  const route = async function route(req, res, url, actor) {
    const path = url.pathname;
    if (req.method === 'GET' && path === '/api/health') return json(res, 200, { status: 'healthy' });
    if (req.method === 'GET' && path === '/api/assets') {
      const data = verifyResponseToken(url.searchParams.get('token'), config.integritySecret);
      if (!['report_download', 'snapshot_asset'].includes(data.purpose)) throw Object.assign(new Error('Asset token purpose is invalid.'), { statusCode: 403 });
      const allowed = data.purpose === 'report_download'
        ? String(data.assetKey ?? '').startsWith(`reports/${data.accountId}/`)
        : snapshotAssetAccount(data.assetKey, data.accountId);
      if (!data.assetKey || !data.accountId || !allowed) throw Object.assign(new Error('Asset token scope is invalid.'), { statusCode: 403 });
      const body = await assets.read(data.assetKey);
      return binary(res, 200, body, assetContentType(data.assetKey));
    }
    if (req.method === 'POST' && path === '/api/local/register') { const body = await readJson(req); const account = await accounts.registerLocal(body, actor); return json(res, 201, { accountId: account.id, account: customerAccountSummary(account) }); }

    if (isCustomerRoute(path)) {
      requireRole(actor, 'customer');
      actor = { ...actor, ...await accounts.resolveCustomerContext(actor, { cancellationOnly: ['/api/billing/cancel', '/api/billing/cancellation', '/api/account/close'].includes(path) }) };
      await enforceCustomerRate(store, actor, req.method, path);
    }

    if (req.method === 'GET' && path === '/api/customer/notification-status') {
      requireRole(actor, 'customer');
      const state = typeof store.readAccount === 'function' ? await store.readAccount(actor.accountId, { lookupPrefixes: ['WATCHERS#', 'ALERTS#', 'NOTIFICATIONS#', 'TEAMMEMBERS#'], followWatcherReferences: true }) : await store.read();
      const watchers = state.watchers.filter((item) => item.accountId === actor.accountId && item.status !== 'deleted');
      return json(res, 200, { watchers: watchers.map((watcher) => ({ watcherId: watcher.id, status: customerNotificationStatus(state, watcher), checkStatus: customerWatcherCheckStatus(state, watcher, config.awsRegion) })), observedAt: ISO() });
    }

    if (req.method === 'GET' && path === '/api/customer/bootstrap') {
      if (url.searchParams.get('view') === 'identity') {
        requireRole(actor, 'customer');
        return json(res, 200, { accountId: actor.accountId, owner: actor.teamRole === 'owner', boundedScheduledAcceptance: 1 });
      }
      let state = typeof store.readAccount === 'function' ? await store.readAccount(actor.accountId, { lookupPrefixes: ['WATCHERS#', 'SNAPSHOTS#', 'ALERTS#', 'NOTIFICATIONS#', 'JOBS#', 'TEAMMEMBERS#', 'TRANSACTIONS#', 'REFUNDS#'], followWatcherReferences: true }) : await store.read(); const account = state.accounts.find((item) => item.id === actor.accountId);
      if (!account) throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      const owner = actor.teamRole === 'owner';
      const watchers = state.watchers.filter((item) => item.accountId === account.id && item.status !== 'deleted');
      const customerWatchers = watchers.map((watcher) => ({ ...customerWatcherView(watcher), notificationStatus: customerNotificationStatus(state, watcher), checkStatus: customerWatcherCheckStatus(state, watcher, config.awsRegion) }));
      const access = entitlements(account);
      const snapshotCutoff = historyCutoff(access);
      const accountSnapshots = state.snapshots.filter((item) => item.accountId === account.id);
      const snapshots = await Promise.all(accountSnapshots.filter((item) => !snapshotCutoff || item.capturedAt >= snapshotCutoff).sort((a,b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 500).map((snapshot) => withAssetUrls(snapshot, assets, config)));
      const checkJobs = state.jobs.filter((item) => item.type === 'check' && item.accountId === account.id).sort((a,b) => String(b.requestedAt).localeCompare(String(a.requestedAt))).slice(0, 200).map(customerCheckJobSummary);
      const team = owner ? await accounts.listTeam(account.id, actor) : null;
      const actionEvents = owner ? await actionLog.list(account.id, actor, 100) : [];
      const reportJobs = await Promise.all((await reports.list(account.id)).map((item) => reportJobView(item, account.id, config, assets)));
      return json(res, 200, { account: owner ? customerAccountSummary(account) : teamAccountSummary(account), viewer: customerViewer(state, actor), entitlements: owner ? access : memberEntitlements(access), captureUsage: captureUsageSummary(account, access), plans: owner ? PLANS : {}, regions: publicCheckRegions(config.availableCheckRegions), watchers: customerWatchers, uptime: customerUptimeSummary(watchers, accountSnapshots, snapshotCutoff), alerts: state.alerts.filter((item) => item.accountId === account.id).sort((a,b) => b.openedAt.localeCompare(a.openedAt)).map(customerAlertView), snapshots, checkJobs, team, actionEvents, reportJobs, transactions: owner ? state.transactions.filter((item) => item.accountId === account.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((item) => customerTransactionSummary(item, config)) : [], refunds: owner ? state.refunds.filter((item) => item.accountId === account.id).map(customerRefundSummary) : [], capabilities: { notificationChannels: { email: ['local', 'ses'].includes(config.emailProvider), sms: config.smsEnabled === true }, permissions: { owner, billing: owner, teamAdministration: owner, actionLog: owner, deleteWatchers: owner } } });
    }
    const assetRefreshMatch = path.match(/^\/api\/customer\/snapshots\/([^/]+)\/assets$/);
    if (req.method === 'GET' && assetRefreshMatch) {
      requireRole(actor, 'customer');
      const state = typeof store.readAccount === 'function' ? await store.readAccount(actor.accountId, { lookupPrefixes: [], directEntities: [{ collection: 'snapshots', id: assetRefreshMatch[1] }] }) : await store.read();
      const account = state.accounts.find((item) => item.id === actor.accountId);
      const cutoff = account ? historyCutoff(entitlements(account)) : null;
      let snapshot = state.snapshots.find((item) => item.id === assetRefreshMatch[1] && item.accountId === actor.accountId && (!cutoff || item.capturedAt >= cutoff));
      if (!snapshot) throw Object.assign(new Error('Snapshot not found.'), { statusCode: 404 });
      if (url.searchParams.get('prepare') === 'review') snapshot = await ensureReviewPreviews(snapshot, assets, store, logger);
      return json(res, 200, await withAssetUrls(snapshot, assets, config, { includeRegional: true }));
    }
    if (req.method === 'POST' && path === '/api/watchers/template') return json(res, 200, customerWatcherView(await watcherService.createDraft(actor.accountId)));
    if (req.method === 'POST' && path === '/api/watchers') { const body = await readJson(req); return json(res, 201, customerWatcherView(await watcherService.save(actor.accountId, body.watcher ?? body, actor, { publish: Boolean(body.publish) }))); }
    let match = path.match(/^\/api\/watchers\/([^/]+)$/);
    if (match && req.method === 'PUT') { const body = await readJson(req); return json(res, 200, customerWatcherView(await watcherService.save(actor.accountId, { ...body.watcher, id: match[1] }, actor, { publish: Boolean(body.publish) }))); }
    if (match && req.method === 'DELETE') { requireOwnerActor(actor); return json(res, 200, await watcherService.remove(actor.accountId, match[1], actor)); }
    match = path.match(/^\/api\/watchers\/([^/]+)\/snapshots\/([^/]+)\/assets$/);
    if (match && req.method === 'GET') {
      requireRole(actor, 'customer');
      const state = typeof store.readAccount === 'function' ? await store.readAccount(actor.accountId, { lookupPrefixes: [], directEntities: [{ collection: 'watchers', id: match[1] }, { collection: 'snapshots', id: match[2] }] }) : await store.read();
      const account = state.accounts.find((item) => item.id === actor.accountId);
      const cutoff = account ? historyCutoff(entitlements(account)) : null;
      const watcher = state.watchers.find((item) => item.id === match[1] && item.accountId === actor.accountId && item.status !== 'deleted');
      let snapshot = watcher ? state.snapshots.find((item) => item.id === match[2] && item.watcherId === watcher.id && item.accountId === actor.accountId && (!cutoff || item.capturedAt >= cutoff)) : null;
      if (!snapshot) throw Object.assign(new Error('Snapshot not found.'), { statusCode: 404 });
      if (url.searchParams.get('prepare') === 'review') snapshot = await ensureReviewPreviews(snapshot, assets, store, logger);
      return json(res, 200, await withAssetUrls(snapshot, assets, config, { includeRegional: true }));
    }
    match = path.match(/^\/api\/watchers\/([^/]+)\/status$/);
    if (match && req.method === 'POST') { const body = await readJson(req); return json(res, 200, customerWatcherView(await watcherService.setStatus(actor.accountId, match[1], body.status, actor))); }
    match = path.match(/^\/api\/watchers\/([^/]+)\/notification-activity$/);
    if (match && req.method === 'GET') return json(res, 200, await notifier.getActivity(actor.accountId, match[1]));
    match = path.match(/^\/api\/watchers\/([^/]+)\/check-status$/);
    if (match && req.method === 'GET') {
      const state = typeof store.readAccount === 'function' ? await store.readAccount(actor.accountId, { lookupPrefixes: [], directEntities: [{ collection: 'watchers', id: match[1] }], followWatcherReferences: true }) : await store.read();
      const watcher = state.watchers.find((item) => item.id === match[1] && item.accountId === actor.accountId && item.status !== 'deleted');
      if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      return json(res, 200, customerWatcherCheckStatus(state, watcher, config.awsRegion));
    }
    match = path.match(/^\/api\/watchers\/([^/]+)\/notification-activity\/tiers\/([^/]+)\/recipients$/);
    if (match && req.method === 'PUT') { const body = await readJson(req); return json(res, 200, await notifier.replaceTierRecipients(actor.accountId, match[1], match[2], body.recipients, body.revision, actor)); }
    match = path.match(/^\/api\/watchers\/([^/]+)\/notification-activity\/tiers\/([^/]+)\/mute$/);
    if (match && req.method === 'POST') { const body = await readJson(req); return json(res, 200, await notifier.setTierMuted(actor.accountId, match[1], match[2], body.muted !== false, body.revision, actor)); }
    match = path.match(/^\/api\/watchers\/([^/]+)\/notification-activity\/cancel$/);
    if (match && req.method === 'POST') { const body = await readJson(req); return json(res, 200, await notifier.cancelActivity(actor.accountId, match[1], body.revision, actor)); }
    match = path.match(/^\/api\/watchers\/([^/]+)\/check$/);
    if (match && req.method === 'POST') {
      const state = typeof store.readAccount === 'function' ? await store.readAccount(actor.accountId, { lookupPrefixes: [], directEntities: [{ collection: 'watchers', id: match[1] }] }) : await store.read(); const account = state.accounts.find((item) => item.id === actor.accountId);
      if (!account || account.closureStatus !== 'active') throw Object.assign(new Error('Account is unavailable.'), { statusCode: 403 });
      const watcher = state.watchers.find((item) => item.id === match[1] && item.accountId === actor.accountId && item.status !== 'deleted');
      if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      assertManualCaptureAllowed(watcher, account);
      const requestedAt = ISO(); const result = await monitoring.check(watcher.id, { manual: true, accountId: actor.accountId, requestedAt });
      const job = result?.id && result?.status ? result : localCheckResultJob(result, watcher.id, requestedAt);
      return json(res, result?.id && !TERMINAL_CHECK_JOB_STATUSES.has(result.status) ? 202 : 200, customerCheckJobSummary(job));
    }
    match = path.match(/^\/api\/checks\/([^/]+)$/);
    if (match && req.method === 'GET') {
      requireRole(actor, 'customer');
      if (typeof monitoring.status !== 'function') throw Object.assign(new Error('Persisted check status is only available in queued runtime mode.'), { statusCode: 404 });
      return json(res, 200, customerCheckJobSummary(await monitoring.status(match[1], actor.accountId)));
    }
    if (req.method === 'POST' && path === '/api/banned-phrases/parse') { const body = await readJson(req); return json(res, 200, { phrases: watcherService.parsePhrases(body.csv ?? '') }); }

    if (path === '/api/billing/cancellation' && req.method === 'GET') {
      requireOwnerActor(actor);
      const account = store.getEntity ? await store.getEntity('accounts', actor.accountId) : (await store.read()).accounts.find(a => a.id === actor.accountId);
      return json(res, 200, { cancellation: cancellationView(account), closureStatus: account.closureStatus, deleteAfter: account.deleteAfter ?? null });
    }
    if (path === '/api/billing/cancel' && req.method === 'POST') {
      requireOwnerActor(actor);
      return json(res, 202, await billing.requestCancellation(actor.accountId, actor));
    }
    if (req.method === 'POST' && path === '/api/billing/checkout') {
      requireOwnerActor(actor);
      const body = await readJson(req);
      const responseBaseUrl = String(config.responseBaseUrl).replace(/\/$/, '');
      return json(res, 201, await billing.createCheckout(actor.accountId, body.planId, actor, {
        successUrl: `${responseBaseUrl}/app/billing/?checkout=success`,
        cancelUrl: `${responseBaseUrl}/app/billing/?checkout=cancelled`,
      }));
    }
    if (req.method === 'POST' && path === '/api/billing/reconcile-checkout') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 200, await billing.reconcileCheckout(actor.accountId, body.sessionId ? String(body.sessionId) : null, actor)); }
    if (req.method === 'POST' && path === '/api/billing/plan-change-quote') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 200, await billing.quotePlanChange(actor.accountId, body.planId)); }
    if (req.method === 'POST' && path === '/api/billing/change-plan') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 200, await billing.changePlan(actor.accountId, body.planId, actor, { simulateDecline: Boolean(body.simulateDecline) })); }
    match = path.match(/^\/api\/transactions\/([^/]+)\/retry$/);
    if (match && req.method === 'POST') { requireOwnerActor(actor); const transaction = typeof store.getEntity === 'function' ? await store.getEntity('transactions', match[1]) : (await store.read()).transactions.find((item) => item.id === match[1]); if (!transaction) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 }); if (transaction.accountId !== actor.accountId) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 }); return json(res, 200, await billing.retry(match[1], actor, 'manual')); }
    if (req.method === 'PUT' && path === '/api/account/profile') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 200, customerAccountSummary(await accounts.updateProfile(actor.accountId, body, actor))); }
    if (req.method === 'PUT' && path === '/api/account/owner-profile') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 200, customerAccountSummary(await accounts.saveOwnerProfile(actor.accountId, body, actor))); }
    if (req.method === 'PUT' && path === '/api/user/profile') { const body = await readJson(req); return json(res, 200, await accounts.updateUserProfile(actor.accountId, body, actor)); }
    if (req.method === 'GET' && path === '/api/user/personal-data-export') {
      const data = await accounts.exportPersonalData(actor.accountId, actor);
      return json(res, 200, data, { 'cache-control': 'no-store', 'content-disposition': 'attachment; filename="cloversight-personal-profile.json"' });
    }
    if (req.method === 'POST' && path === '/api/account/close') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 200, customerAccountSummary(await accounts.scheduleClosure(actor.accountId, body.reason ?? 'Requested by customer', actor))); }

    if (req.method === 'GET' && path === '/api/team') { requireOwnerActor(actor); return json(res, 200, await accounts.listTeam(actor.accountId, actor)); }
    if (req.method === 'POST' && path === '/api/team/invitations') { requireOwnerActor(actor); const body = await readJson(req); return json(res, 201, await accounts.invite(actor.accountId, body, actor)); }
    match = path.match(/^\/api\/team\/invitations\/([^/]+)$/);
    if (match && req.method === 'DELETE') { requireOwnerActor(actor); return json(res, 200, await accounts.revokeInvitation(actor.accountId, match[1], actor)); }
    match = path.match(/^\/api\/team\/members\/([^/]+)$/);
    if (match && req.method === 'DELETE') { requireOwnerActor(actor); return json(res, 200, await accounts.revokeMember(actor.accountId, match[1], actor)); }
    if (req.method === 'GET' && path === '/api/team/recipients/search') { await enforceActorRate(store, actor, 'recipient-search', 20, 60); return json(res, 200, { results: await accounts.searchRecipients(actor.accountId, url.searchParams.get('q') ?? '', actor) }); }
    match = path.match(/^\/api\/team\/recipients\/([^/]+)$/);
    if (match && req.method === 'GET') { await enforceActorRate(store, actor, 'recipient-lookup', 30, 300); return json(res, 200, await accounts.recipient(actor.accountId, match[1], actor)); }

    if (req.method === 'GET' && path === '/api/action-log') { requireOwnerActor(actor); return json(res, 200, { events: await actionLog.list(actor.accountId, actor, url.searchParams.get('limit')) }); }
    match = path.match(/^\/api\/action-log\/([^/]+)\/revert$/);
    if (match && req.method === 'POST') { requireOwnerActor(actor); return json(res, 200, await actionLog.revert(actor.accountId, match[1], actor)); }

    if (req.method === 'GET' && path === '/api/reports') return json(res, 200, { reports: await Promise.all((await reports.list(actor.accountId)).map((item) => reportJobView(item, actor.accountId, config, assets))) });
    if (req.method === 'POST' && path === '/api/reports') { const body = await readJson(req); return json(res, 202, await reportJobView(await reports.request(actor.accountId, body, actor), actor.accountId, config, assets)); }
    match = path.match(/^\/api\/reports\/([^/]+)$/);
    if (match && req.method === 'GET') return json(res, 200, await reportJobView(await reports.status(actor.accountId, match[1]), actor.accountId, config, assets));

    if (req.method === 'POST' && path === '/api/alerts/respond') { const body = await readJson(req); const tokenData = verifyResponseToken(body.token, config.integritySecret); return json(res, 200, await notifier.recordResponse({ ...tokenData, response: body.response, source: 'signed_link' })); }
    if (req.method === 'POST' && path === '/api/alerts/respond-code') { await enforceResponseCodeRate(store, actor.ip); const body = await readJson(req); return json(res, 200, await notifier.recordByCode(body.code, body.response)); }

    if (req.method === 'POST' && path === '/api/webhooks/stripe') {
      const raw = await readBody(req, 2_000_000); const event = verifyStripeWebhook(raw, req.headers['stripe-signature'], config.stripeWebhookSecret);
      const duplicate = await store.transact('stripe.webhook.claim', (state) => {
        const existing = state.providerEvents.find((item) => item.provider === 'stripe' && item.eventId === event.id);
        const now = ISO();
        if (existing?.status === 'completed') return 'completed';
        if (existing?.status === 'processing' && !staleProviderEvent(existing, now)) return 'processing';
        if (existing) { existing.status = 'processing'; existing.attempts = Number(existing.attempts ?? 1) + 1; existing.lastAttemptAt = now; existing.error = null; return false; }
        state.providerEvents.push({ id: `stripe:${event.id}`, provider: 'stripe', eventId: event.id, type: event.type, status: 'processing', attempts: 1, receivedAt: now, lastAttemptAt: now, completedAt: null, error: null, expiresAtEpoch: Math.floor(Date.now() / 1000) + 180 * 86400 }); return false;
      });
      // A concurrent delivery is still in progress: returning 200 here can
      // permanently lose an event when the first invocation fails afterward.
      if (duplicate === 'processing') throw Object.assign(new Error('Stripe event is still processing; retry later.'), { statusCode: 503 });
      if (!duplicate) {
        try { await processStripeEvent(event, store, logger, config, billing); await store.transact('stripe.webhook.complete', (state) => { const item = state.providerEvents.find((entry) => entry.provider === 'stripe' && entry.eventId === event.id); item.status = 'completed'; item.completedAt = ISO(); return null; }); }
        catch (error) { await store.transact('stripe.webhook.failed', (state) => { const item = state.providerEvents.find((entry) => entry.provider === 'stripe' && entry.eventId === event.id); item.status = 'failed'; item.error = String(error.message).slice(0, 1000); return null; }); throw error; }
      }
      return json(res, 200, { received: true, duplicate: duplicate === 'completed' });
    }

    if (path.startsWith('/api/steward/')) requireRole(actor, 'steward');
    if (req.method === 'GET' && path === '/api/steward/dashboard') {
      const state = await store.read(); const openAlerts = state.alerts.filter((item) => ['open','acknowledged'].includes(item.status));
      return json(res, 200, { stewardRole: actor.stewardRole, accounts: state.accounts.length, activeWatchers: state.watchers.filter((item) => item.status === 'active').length, pausedWatchers: state.watchers.filter((item) => ['paused','account_paused'].includes(item.status)).length, openAlerts: openAlerts.length, emailSuppressions: (state.emailSuppressions ?? []).length, refunds: aggregateRefunds(state.refunds), scheduledClosures: state.accounts.filter((item) => item.closureStatus === 'scheduled').length, recentEvents: state.auditEvents.filter((item) => !item.action.startsWith('watcher.')).slice(-25).reverse().map(stewardAuditEventSummary) });
    }
    if (req.method === 'GET' && path === '/api/steward/email-suppressions') return json(res, 200, await notifier.listEmailSuppressions(url.searchParams.get('q') ?? ''));
    if (req.method === 'POST' && path === '/api/steward/email-suppressions') {
      stewardSecurity.requireOwner(actor);
      const body = await readJson(req); const reason = requiredReason(body);
      return json(res, 201, await notifier.addEmailSuppression(body.email, reason, actor));
    }
    match = path.match(/^\/api\/steward\/email-suppressions\/([^/]+)$/);
    if (match && req.method === 'DELETE') { stewardSecurity.requireOwner(actor); const body = await readJson(req); return json(res, 200, await notifier.removeEmailSuppression(match[1], requiredReason(body), actor)); }
    if (req.method === 'GET' && path === '/api/steward/accounts/lookup') {
      const query = (url.searchParams.get('q') ?? '').trim().toLowerCase(); const state = await store.read();
      const account = state.accounts.find((item) => item.id.toLowerCase() === query || item.contactEmail.toLowerCase() === query);
      return account ? json(res, 200, stewardAccountView(state, account)) : json(res, 404, { error: 'No exact client ID or registered email match.' });
    }
    if (req.method === 'GET' && path === '/api/steward/accounts/search') {
      const first = normalizeStaffSearch(url.searchParams.get('first'));
      const last = normalizeStaffSearch(url.searchParams.get('last'));
      const combined = normalizeStaffSearch(url.searchParams.get('name'));
      if (!first && !last && !combined) throw Object.assign(new Error('Enter a first name, last name, or full name.'), { statusCode: 400 });
      const state = await store.read();
      const results = state.accounts.flatMap((account) => {
        const members = state.teamMembers.filter((member) => member.accountId === account.id && member.status === 'active');
        const contacts = [...members.map((member) => {
          const profile = state.userProfiles.find((item) => item.id === member.userId);
          return { firstName: profile?.firstName || member.firstName || '', lastName: profile?.lastName || member.lastName || '', email: member.email };
        }), { firstName: account.contactName ?? '', lastName: '', email: account.contactEmail }];
        const matching = contacts.find((person) => staffNameMatches(person, first, last, combined));
        return matching ? [{ account: stewardAccountSummary(account), matchedName: `${matching.firstName} ${matching.lastName}`.trim(), matchedEmail: matching.email }] : [];
      }).slice(0, 25);
      return json(res, 200, { results, limited: results.length === 25 });
    }
    match = path.match(/^\/api\/steward\/accounts\/([^/]+)$/);
    if (match && req.method === 'GET') { const state = await store.read(); const account = state.accounts.find((item) => item.id === match[1]); if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 }); return json(res, 200, stewardAccountView(state, account)); }
    match = path.match(/^\/api\/steward\/accounts\/([^/]+)\/notes$/);
    if (match && req.method === 'POST') { const body = await readJson(req); const reason = requiredReason(body); if (!String(body.body ?? '').trim()) throw Object.assign(new Error('Note body is required.'), { statusCode: 400 }); const note = await store.transact('staff.note', (state) => { if (!state.accounts.some((item) => item.id === match[1] && item.closureStatus === 'active')) throw Object.assign(new Error('Account is unavailable for new notes.'), { statusCode: 409 }); const note = { id: id('note'), accountId: match[1], authorId: actor.actorId, body: String(body.body).trim().slice(0, 5000), createdAt: ISO() }; state.staffNotes.push(note); appendAudit(state, actor, 'staff.note_added', { accountId: match[1], targetId: note.id, reason, requestId: actor.requestId }); return note; }); return json(res, 201, note); }
    match = path.match(/^\/api\/steward\/accounts\/([^/]+)\/close$/);
    if (match && req.method === 'POST') { const body = await readJson(req); return json(res, 200, await accounts.scheduleClosure(match[1], requiredReason(body), actor)); }
    match = path.match(/^\/api\/steward\/accounts\/([^/]+)\/retry-cancellation$/);
    if (match && req.method === 'POST') { const body = await readJson(req); return json(res, 202, await billing.cancellations.retry(match[1], actor, requiredReason(body))); }
    match = path.match(/^\/api\/steward\/accounts\/([^/]+)\/reopen$/);
    if (match && req.method === 'POST') { const body = await readJson(req); return json(res, 200, await accounts.cancelClosure(match[1], requiredReason(body), actor)); }
    match = path.match(/^\/api\/steward\/watchers\/([^/]+)\/status$/);
    if (match && req.method === 'POST') { const body = await readJson(req); const state = await store.read(); const watcher = state.watchers.find((item) => item.id === match[1]); if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 }); const reason = requiredReason(body); return json(res, 200, await watcherService.setStatus(watcher.accountId, watcher.id, body.status, { ...actor, reason })); }
    match = path.match(/^\/api\/steward\/watchers\/([^/]+)$/);
    if (match && req.method === 'PATCH') {
      const body = await readJson(req); const reason = requiredReason(body); const state = await store.read();
      const watcher = state.watchers.find((item) => item.id === match[1]);
      if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 });
      const input = stewardWatcherPatch(watcher, body);
      await watcherService.save(watcher.accountId, input, { ...actor, reason }, { publish: watcher.status !== 'draft', auditAction: 'watcher.support_edited' });
      const refreshed = await store.read(); const account = refreshed.accounts.find((item) => item.id === watcher.accountId);
      return json(res, 200, stewardAccountView(refreshed, account).watchers.find((item) => item.id === watcher.id));
    }
    if (match && req.method === 'DELETE') { const body = await readJson(req); const state = await store.read(); const watcher = state.watchers.find((item) => item.id === match[1]); if (!watcher) throw Object.assign(new Error('Watcher not found.'), { statusCode: 404 }); const reason = requiredReason(body); return json(res, 200, await watcherService.remove(watcher.accountId, watcher.id, { ...actor, reason })); }
    if (req.method === 'GET' && path === '/api/steward/transactions/lookup') { const query = (url.searchParams.get('q') ?? '').trim(); const state = await store.read(); const txn = findTransaction(state, query); return txn ? json(res, 200, transactionView(state, txn)) : json(res, 404, { error: 'Transaction not found.' }); }
    match = path.match(/^\/api\/steward\/transactions\/([^/]+)$/);
    if (match && req.method === 'GET') { const state = await store.read(); const txn = findTransaction(state, match[1]); if (!txn) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 }); return json(res, 200, transactionView(state, txn)); }
    match = path.match(/^\/api\/steward\/transactions\/([^/]+)\/retry$/);
    if (match && req.method === 'POST') { const body = await readJson(req); const reason = requiredReason(body); return json(res, 200, await billing.retry(match[1], { ...actor, reason }, 'manual')); }
    match = path.match(/^\/api\/steward\/transactions\/([^/]+)\/refund$/);
    if (match && req.method === 'POST') { const body = await readJson(req); const reason = requiredReason(body); const refund = await billing.scheduleRefund(match[1], Number(body.amountMinor), reason, actor); actor.stewardAuditDetails = { amountMinor: refund.amountMinor, currency: refund.currency, transactionId: refund.transactionId, refundId: refund.id }; await notifier.sendStaffAction(`[CLOVERSIGHT] Refund scheduled: ${refund.id}`, `Staff actor ${actor.actorId} scheduled ${refund.amountMinor} ${refund.currency} minor units for transaction ${refund.transactionId}.\nReason: ${reason}`); return json(res, 201, refund); }
    if (req.method === 'GET' && path === '/api/steward/manager') { stewardSecurity.requireOwner(actor); return json(res, 200, await stewardSecurity.roster()); }
    if (req.method === 'PUT' && path === '/api/steward/manager/limits') { stewardSecurity.requireOwner(actor); const body = await readJson(req); return json(res, 200, { limits: await stewardSecurity.updateLimits(body, actor) }); }
    if (req.method === 'POST' && path === '/api/steward/manager/users') { stewardSecurity.requireOwner(actor); const body = await readJson(req); return json(res, 201, await stewardSecurity.invite(body.email, actor)); }
    match = path.match(/^\/api\/steward\/manager\/users\/([^/]+)\/activity$/);
    if (match && req.method === 'GET') { stewardSecurity.requireOwner(actor); const roster = await stewardSecurity.roster(); if (match[1] !== roster.owner.actorId && !roster.users.some((user) => user.actorId === match[1])) throw Object.assign(new Error('Steward not found.'), { statusCode: 404 }); return json(res, 200, await stewardSecurity.activity(match[1], url.searchParams.get('limit'), url.searchParams.get('before'))); }
    match = path.match(/^\/api\/steward\/manager\/users\/([^/]+)$/);
    if (match && req.method === 'PATCH') { stewardSecurity.requireOwner(actor); const body = await readJson(req); return json(res, 200, await stewardSecurity.changeStatus(decodeURIComponent(match[1]), body.status, actor, requiredReason(body))); }
    if (req.method === 'POST' && path === '/api/steward/activity') { const body = await readJson(req); if (!['dashboard','accounts','transactions','closures','refunds','email-suppressions','manager'].includes(body.view)) throw Object.assign(new Error('Unknown steward page.'), { statusCode: 400 }); actor.stewardAuditDetails = { view: body.view }; return json(res, 200, { recorded: true }); }
    if (req.method === 'GET' && path === '/api/steward/refunds') { const state = await store.read(); return json(res, 200, state.refunds.map((refund) => { const transaction = state.transactions.find((item) => item.id === refund.transactionId); const account = state.accounts.find((item) => item.id === refund.accountId); return { id: refund.id, accountId: refund.accountId, transactionId: refund.transactionId, amountMinor: refund.amountMinor, currency: refund.currency, reason: refund.reason, status: refund.status, providerRefundId: maskProviderId(refund.providerRefundId), error: refund.error ?? null, createdAt: refund.createdAt, updatedAt: refund.updatedAt, transaction: transaction ? stewardTransactionSummary(transaction) : null, account: account ? stewardAccountSummary(account) : null }; })); }
    if (req.method === 'GET' && path === '/api/steward/closures') {
      const state = await store.read();
      const live = state.accounts.filter((item) => ['scheduled', 'purging'].includes(item.closureStatus)).map((account) => ({ id: account.id, legalName: account.legalName, contactEmail: account.contactEmail, scheduledAt: account.closureScheduledAt, deleteAfter: account.deleteAfter, phase: account.closureStatus, cancellation: cancellationView(account), canUndo: account.closureStatus === 'scheduled', blockedReason: account.purgeBlockedReason ?? null }));
      const liveIds = new Set(live.map((account) => account.id));
      const pending = state.closedAccounts.filter((item) => (!item.kind || item.kind === 'closed_account') && !liveIds.has(item.id) && item.deletionConfirmationStatus !== 'completed').map((account) => ({ id: account.id, legalName: account.legalName, contactEmail: account.contactEmail, scheduledAt: account.purgeStartedAt ?? account.closedAt, deleteAfter: account.closedAt, phase: account.deletionConfirmationStatus ?? 'legacy_review_required', canUndo: false, identityStatus: account.identityDeletionStatus ?? 'legacy_review_required', notificationState: account.deletionNotification?.state ?? 'pending', requiresReview: account.identityDeletionStatus === 'manual_review_required' || ['ambiguous', 'suppressed', 'manual_review'].includes(account.deletionNotification?.state), blockedReason: null }));
      return json(res, 200, [...live, ...pending]);
    }

    return false;
  };
  return async function auditedRoute(req, res, url, actor) {
    if (!url.pathname.startsWith('/api/steward/')) return route(req, res, url, actor);
    requireRole(actor, 'steward');
    const entry = await stewardSecurity.begin(actor, req, url.pathname, url.search);
    let failure; let result;
    try {
      const staff = await stewardSecurity.authorize(actor);
      actor.stewardRole = staff.role;
      result = await route(req, res, url, actor);
      return result;
    } catch (error) { failure = error; throw error; }
    finally {
      const status = failure ? Number(failure.statusCode) || 500 : result === false ? 404 : Number(res.statusCode) || 200;
      const details = actor.stewardAuditDetails || {};
      entry.statusCode = status;
      try {
        await stewardSecurity.complete(entry, status, details);
        if (!failure && (status < 400 || status === 404 && /^\/api\/steward\/accounts\/lookup$/.test(url.pathname))) await stewardSecurity.detect(entry, details);
      } catch (auditError) {
        logger.error('steward.audit_or_alert.failed', { requestId: actor.requestId, message: auditError.message });
        // The request has already completed. Keep its original result; the
        // durable start record remains visible if completion needs recovery.
      }
    }
  };
}

function customerAccountSummary(account) {
  return {
    id: account.id, legalName: account.legalName, contactName: account.contactName ?? null, contactEmail: account.contactEmail,
    country: account.country, region: account.region, postalCode: account.postalCode, taxIds: account.taxIds ?? [],
    planId: account.planId, trialEndsAt: account.trialEndsAt, currentPeriodStart: account.currentPeriodStart, currentPeriodEnd: account.currentPeriodEnd,
    cancellation: cancellationView(account), provider: account.provider, billingStatus: account.billingStatus ?? null, hasSubscription: Boolean(account.providerSubscriptionId) && !['canceled', 'incomplete_expired'].includes(account.billingStatus), profileComplete: account.profileComplete !== false, closureStatus: account.closureStatus, closureScheduledAt: account.closureScheduledAt, deleteAfter: account.deleteAfter,
    createdAt: account.createdAt, updatedAt: account.updatedAt,
  };
}
function customerWatcherView(watcher) {
  const config = watcher.config ?? {};
  return {
    id: watcher.id, name: watcher.name, status: watcher.status, configRevision: watcher.configRevision,
    createdAt: watcher.createdAt, updatedAt: watcher.updatedAt, nextCheckAt: watcher.nextCheckAt,
    lastCheckAt: watcher.lastCheckAt, lastOutcome: watcher.lastOutcome, uptimeStats: watcher.uptimeStats ?? null,
    config: Object.fromEntries([
      'url', 'checkIntervalSeconds', 'checkRegions', 'methods', 'bannedPhrases', 'textThresholdPercent',
      'pixelThresholdPercent', 'ignoredSelectors', 'timeoutMs', 'recipientTiers', 'allClearThreshold',
      'alertReceivedThreshold', 'reAlertMinutes', 'templates',
    ].filter((key) => Object.hasOwn(config, key)).map((key) => [key, config[key]])),
  };
}
function customerReasonView(reason) {
  return reason?.method === 'outage'
    ? { method: 'outage', region: reason.region ?? null, message: 'The target did not respond as expected.' }
    : { method: reason?.method ?? null, region: reason?.region ?? null, message: reason?.message ?? '' };
}
function customerAlertView(alert) {
  const incident = alert.incident ?? classifyIncident(alert);
  return {
    id: alert.id, watcherId: alert.watcherId, kind: alert.kind, kindLabel: incident.category === 'site_change' ? alert.kindLabel ?? incident.label : incident.label,
    incident, expectedRegions: alert.expectedRegions ?? incident.checkedRegions,
    status: alert.status, summary: (alert.reasons ?? []).some((reason) => reason.method === 'outage')
      ? (alert.reasons ?? []).map(customerReasonView).map((reason) => reason.message).join('; ') : alert.summary,
    reasons: (alert.reasons ?? []).map(customerReasonView),
    openedAt: alert.openedAt, lastDetectedAt: alert.lastDetectedAt, resolvedAt: alert.resolvedAt,
  };
}
function teamAccountSummary(account) { return { id: account.id, legalName: account.legalName, contactEmail: account.contactEmail, profileComplete: true, closureStatus: account.closureStatus, createdAt: account.createdAt, updatedAt: account.updatedAt }; }
function customerViewer(state, actor) {
  const member = state.teamMembers.find((item) => item.id === actor.memberId && item.accountId === actor.accountId);
  const profile = state.userProfiles.find((item) => item.id === actor.actorId);
  return { id: actor.actorId, memberId: member?.id ?? null, role: actor.teamRole, email: profile?.email ?? member?.email ?? actor.email, firstName: profile?.firstName ?? member?.firstName ?? '', lastName: profile?.lastName ?? member?.lastName ?? '', watchingRegions: profile?.watchingRegions ?? [] };
}
function memberEntitlements(access) { return { maxWatchers: access.maxWatchers, minIntervalSeconds: access.minIntervalSeconds, methods: access.methods, maxCheckRegions: access.maxCheckRegions, maxRegionalWatchers: access.maxRegionalWatchers, trialActive: access.trialActive }; }
function captureUsageSummary(account, access) {
  return captureCreditUsage(account, access);
}
function customerTransactionSummary(transaction, config = {}) {
  return {
    id: transaction.id, type: transaction.type, planId: transaction.planId, amountMinor: transaction.amountMinor,
    creditMinor: transaction.creditMinor ?? 0, taxMinor: transaction.taxMinor, currency: transaction.currency, status: transaction.status,
    outcomeReason: transaction.outcomeReason, retryCount: transaction.retryCount ?? 0, automaticRetryAt: transaction.automaticRetryAt ?? null, paymentActionUrl: optionalProviderPaymentUrl(transaction.paymentActionUrl, config),
    canRetry: Boolean(transaction.providerInvoiceId) && ['failed', 'declined', 'retry_scheduled'].includes(transaction.status),
    createdAt: transaction.createdAt, updatedAt: transaction.updatedAt,
  };
}
function customerRefundSummary(refund) { return { id: refund.id, transactionId: refund.transactionId, amountMinor: refund.amountMinor, currency: refund.currency, reason: refund.reason, status: refund.status, createdAt: refund.createdAt, updatedAt: refund.updatedAt }; }
function customerUptimeSummary(watchers, snapshots, recentSnapshotCutoff) {
  const year = new Date().getUTCFullYear();
  const domains = new Map();
  const snapshotsByWatcher = new Map();
  const recentChangesByWatcher = new Map();
  for (const snapshot of snapshots) {
    if (snapshot.outcome === 'changed' && (!recentSnapshotCutoff || snapshot.capturedAt >= recentSnapshotCutoff)) {
      const changes = recentChangesByWatcher.get(snapshot.watcherId) ?? [];
      changes.push(snapshot);
      recentChangesByWatcher.set(snapshot.watcherId, changes);
    }
    if (new Date(snapshot.capturedAt).getUTCFullYear() !== year) continue;
    const history = snapshotsByWatcher.get(snapshot.watcherId) ?? [];
    history.push(snapshot);
    snapshotsByWatcher.set(snapshot.watcherId, history);
  }
  for (const watcher of watchers) {
    const history = (snapshotsByWatcher.get(watcher.id) ?? []).sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)));
    let stats = watcher.uptimeStats?.year === year ? watcher.uptimeStats : null;
    if (!stats) {
      stats = {
        totalChecks: history.length,
        upChecks: history.filter(snapshotIsUp).length,
        firstRecordedAt: history.map((item) => item.capturedAt).sort()[0] ?? null,
        lastRecordedAt: history.map((item) => item.capturedAt).sort().at(-1) ?? null,
      };
    }
    let domain;
    try { domain = new URL(watcher.config.url).hostname.toLowerCase().replace(/^www\./, ''); }
    catch { domain = 'invalid target'; }
    const recentChanges = (recentChangesByWatcher.get(watcher.id) ?? []).sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)));
    const lastChangeAt = recentChanges.at(-1)?.capturedAt ?? null;
    const item = domains.get(domain) ?? { domain, watcherCount: 0, totalChecks: 0, upChecks: 0, outageChecks: 0, recentChangedReports: 0, firstRecordedAt: null, lastRecordedAt: null, lastChangeAt: null };
    item.watcherCount += 1; item.totalChecks += Number(stats.totalChecks ?? 0); item.upChecks += Number(stats.upChecks ?? 0);
    item.outageChecks += Number(stats.outageChecks ?? Math.max(0, Number(stats.totalChecks ?? 0) - Number(stats.upChecks ?? 0)));
    item.recentChangedReports += recentChanges.length;
    if (stats.firstRecordedAt && (!item.firstRecordedAt || stats.firstRecordedAt < item.firstRecordedAt)) item.firstRecordedAt = stats.firstRecordedAt;
    if (stats.lastRecordedAt && (!item.lastRecordedAt || stats.lastRecordedAt > item.lastRecordedAt)) item.lastRecordedAt = stats.lastRecordedAt;
    if (lastChangeAt && (!item.lastChangeAt || lastChangeAt > item.lastChangeAt)) item.lastChangeAt = lastChangeAt;
    domains.set(domain, item);
  }
  const domainRows = [...domains.values()].map((item) => ({ ...item, percent: uptimePercent(item.upChecks, item.totalChecks) })).sort((a, b) => b.recentChangedReports - a.recentChangedReports || String(b.lastChangeAt ?? b.lastRecordedAt ?? '').localeCompare(String(a.lastChangeAt ?? a.lastRecordedAt ?? '')) || a.domain.localeCompare(b.domain));
  const totalChecks = domainRows.reduce((sum, item) => sum + item.totalChecks, 0);
  const upChecks = domainRows.reduce((sum, item) => sum + item.upChecks, 0);
  const outageChecks = domainRows.reduce((sum, item) => sum + item.outageChecks, 0);
  return { year, totalChecks, upChecks, outageChecks, percent: uptimePercent(upChecks, totalChecks), domains: domainRows.slice(0, 5) };
}
function uptimePercent(upChecks, totalChecks) { return totalChecks ? Number((upChecks / totalChecks * 100).toFixed(3)) : null; }
function snapshotIsUp(snapshot) { return snapshot.outcome !== 'outage' && !(snapshot.reasons ?? []).some((reason) => reason.method === 'outage'); }
const TERMINAL_CHECK_JOB_STATUSES = new Set(['completed', 'failed', 'skipped']);
function localCheckResultJob(result, watcherId, requestedAt) {
  const completedAt = ISO();
  const status = result?.failed ? 'failed' : result?.skipped ? 'skipped' : 'completed';
  return {
    id: null, type: 'check', watcherId, manual: true, status, requestedAt, queuedAt: requestedAt,
    startedAt: requestedAt, completedAt, outcome: result?.outcome ?? null, snapshotId: result?.snapshotId ?? null,
    reason: result?.reason ?? null, error: result?.error ?? null, errorCode: result?.errorCode ?? null, queued: false,
  };
}
function customerCheckJobSummary(job) {
  const reasons = { 'capture-capacity-deferred': 'Check deferred because regional capture capacity is busy or unavailable.', 'check-queue-stale': 'Queued check deferred after waiting too long.', 'capture-credit-allowance-exhausted': 'The regional capture allowance is exhausted for this period.', 'account-unavailable': 'This account is unavailable for monitoring.' };
  const deferred = job.status === 'skipped' && ['capture-capacity-deferred', 'check-queue-stale'].includes(job.reason);
  const retryAt = deferred && Number.isFinite(Date.parse(job.retryAt)) ? job.retryAt : null;
  return { id: job.id ?? null, watcherId: job.watcherId, manual: Boolean(job.manual), status: job.status, requestedAt: job.requestedAt, queuedAt: job.queuedAt ?? job.requestedAt, startedAt: job.startedAt ?? null, completedAt: job.completedAt ?? null, outcome: job.outcome ?? null, snapshotId: job.snapshotId ?? null, reason: job.status === 'skipped' ? reasons[job.reason] ?? 'This check was not performed.' : null, error: job.status === 'failed' ? 'Watcher error: check could not finish.' : null, deferred, retryAt, queued: job.queued ?? job.status === 'queued', deduplicated: Boolean(job.deduplicated) };
}

async function enforceResponseCodeRate(store, ip) {
  const now = Date.now();
  const windowMs = 15 * 60_000;
  const key = `response-code-rate:${sha256(String(ip ?? 'unknown')).slice(0, 24)}`;
  if (typeof store.consumeRateLimit === 'function') return store.consumeRateLimit('response-code-rate', key, 10, 900);
  const nowSeconds = Math.floor(now / 1000);
  await store.transact('response.code.rate', (state) => {
    state.idempotency = state.idempotency.filter((item) => item.scope !== 'response-code-rate' || Number(item.expiresAtEpoch ?? 0) > nowSeconds);
    let entry = state.idempotency.find((item) => item.key === key);
    if (!entry) {
      entry = { key, scope: 'response-code-rate', attempts: 0, createdAt: ISO(), expiresAtEpoch: nowSeconds + windowMs / 1000 };
      state.idempotency.push(entry);
    }
    if (entry.attempts >= 10) throw Object.assign(new Error('Too many response-code attempts. Try again later.'), { statusCode: 429 });
    entry.attempts += 1;
    return null;
  });
}

async function enforceActorRate(store, actor, scope, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000); const key = `${scope}:${sha256(`${actor.actorId}:${actor.ip ?? 'unknown'}`).slice(0, 24)}`;
  if (typeof store.consumeRateLimit === 'function') return store.consumeRateLimit(scope, key, limit, windowSeconds);
  await store.transact(`${scope}.rate`, (state) => {
    state.idempotency = state.idempotency.filter((item) => item.scope !== scope || Number(item.expiresAtEpoch ?? 0) > now);
    let entry = state.idempotency.find((item) => item.key === key);
    if (!entry) { entry = { key, scope, attempts: 0, createdAt: ISO(), expiresAtEpoch: now + windowSeconds }; state.idempotency.push(entry); }
    if (entry.attempts >= limit) throw Object.assign(new Error('Too many directory requests. Try again later.'), { statusCode: 429 });
    entry.attempts += 1; return null;
  });
}

function isCustomerRoute(path) {
  return ['/api/customer/', '/api/watchers', '/api/checks/', '/api/banned-phrases/', '/api/billing/', '/api/transactions/', '/api/account/', '/api/user/', '/api/team', '/api/action-log', '/api/reports'].some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix));
}
function requireOwnerActor(actor) { if (actor.teamRole !== 'owner') throw Object.assign(new Error('Only the account owner can perform this action.'), { statusCode: 403, code: 'OWNER_REQUIRED' }); }
async function reportJobView(job, accountId, config, assets) {
  if (!job) return job;
  const { assetKey, htmlAssetKey } = job;
  const safe = { id: job.id, period: job.period, domain: job.domain, status: job.status,
    progress: job.progress, requestedAt: job.requestedAt, startedAt: job.startedAt,
    completedAt: job.completedAt, expiresAt: job.expiresAt,
    error: job.status === 'failed' ? 'Report generation failed. Please try again.' : null };
  const storedExpiry = Date.parse(job.expiresAt);
  const expired = Number.isFinite(storedExpiry) && storedExpiry <= Date.now();
  if (job.status !== 'completed' || !assetKey || expired || !String(assetKey).startsWith(`reports/${accountId}/`)) return { ...safe, expired, downloadUrl: null, htmlDownloadUrl: null, downloadUrlExpiresAt: null };
  const expiresAt = new Date(Math.min(Number.isFinite(storedExpiry) ? storedExpiry : Date.now() + 15 * 60_000, Date.now() + 15 * 60_000)).toISOString();
  const urlFor = async (key) => {
    if (!key || !String(key).startsWith(`reports/${accountId}/`)) return null;
    if (config.appEnv !== 'local' && typeof assets?.signedReadUrl === 'function') {
      return assets.signedReadUrl({ key, bucketName: assets.bucketName, region: assets.region }, Math.max(1, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
    }
    const token = createResponseToken({ purpose: 'report_download', assetKey: key, accountId, expiresAt }, config.integritySecret);
    return `${String(config.responseBaseUrl).replace(/\/$/, '')}/api/assets?token=${encodeURIComponent(token)}`;
  };
  const [downloadUrl, htmlDownloadUrl] = await Promise.all([urlFor(assetKey), urlFor(htmlAssetKey)]);
  return { ...safe, expired: false, downloadUrl, htmlDownloadUrl, downloadUrlExpiresAt: expiresAt };
}

function stewardWatcherPatch(watcher, body) {
  const config = structuredClone(watcher.config);
  const numericFields = ['checkIntervalSeconds', 'textThresholdPercent', 'pixelThresholdPercent', 'allClearThreshold', 'alertReceivedThreshold', 'reAlertMinutes'];
  for (const field of numericFields) if (body[field] != null) config[field] = Number(body[field]);
  if (Array.isArray(body.methods)) config.methods = body.methods.map(String);
  if (String(body.replacementUrl ?? '').trim()) config.url = String(body.replacementUrl).trim();
  for (const update of Array.isArray(body.tiers) ? body.tiers : []) {
    const tier = config.recipientTiers.find((item) => item.id === update.id);
    if (!tier) throw Object.assign(new Error('Unknown recipient tier in support edit.'), { statusCode: 400 });
    if (update.delayMinutes != null) tier.delayMinutes = Number(update.delayMinutes);
    if (update.requiredAcknowledgements != null) tier.requiredAcknowledgements = Number(update.requiredAcknowledgements);
  }
  for (const replacement of Array.isArray(body.recipientReplacements) ? body.recipientReplacements : []) {
    if (!String(replacement.destination ?? '').trim()) continue;
    const recipient = config.recipientTiers.flatMap((tier) => tier.recipients).find((item) => item.id === replacement.id);
    if (!recipient) throw Object.assign(new Error('Unknown recipient in support edit.'), { statusCode: 400 });
    recipient.destination = String(replacement.destination).trim();
  }
  return { id: watcher.id, configRevision: Number(body.configRevision), name: body.name == null ? watcher.name : String(body.name), config };
}

function requiredReason(body) { const reason = String(body.reason ?? '').trim(); if (reason.length < 5) throw Object.assign(new Error('A staff reason of at least five characters is required.'), { statusCode: 400 }); return reason; }
async function ensureReviewPreviews(snapshot, assets, store, logger) {
  const screenshots = Array.isArray(snapshot.screenshots) && snapshot.screenshots.length
    ? snapshot.screenshots
    : (snapshot.pngKey ? [{ profile: 'desktop', label: 'Desktop', pngKey: snapshot.pngKey, previewKey: snapshot.previewKey ?? null }] : []);
  const missing = screenshots.filter((item) => item.pngKey && !item.previewKey);
  if (!missing.length) return snapshot;
  try {
    const generated = await Promise.all(missing.map(async (item) => {
      const key = snapshotPreviewKey(snapshot.accountId, snapshot.watcherId, snapshot.id, item.profile);
      await assets.put(key, await makeReviewPreview(await assets.read(item.pngKey)));
      return { profile: item.profile, key };
    }));
    const keys = new Map(generated.map((item) => [item.profile, item.key]));
    const applyPreviewKeys = (draft) => {
      const target = draft.snapshots.find((item) => item.id === snapshot.id && item.accountId === snapshot.accountId);
      if (!target) return null;
      if (Array.isArray(target.screenshots) && target.screenshots.length) {
        for (const screen of target.screenshots) screen.previewKey ??= keys.get(screen.profile) ?? null;
        target.previewKey ??= target.screenshots.find((item) => item.profile === 'desktop')?.previewKey ?? target.screenshots[0]?.previewKey ?? null;
      } else target.previewKey ??= keys.get('desktop') ?? generated[0]?.key ?? null;
      return null;
    };
    if (typeof store.transactAccount === 'function') {
      await store.transactAccount(snapshot.accountId, 'snapshot.review_previews.backfill', applyPreviewKeys, { lookupPrefixes: [], directEntities: [{ collection: 'snapshots', id: snapshot.id }] });
    } else await store.transact('snapshot.review_previews.backfill', applyPreviewKeys);
    const updatedScreens = screenshots.map((item) => ({ ...item, previewKey: item.previewKey ?? keys.get(item.profile) ?? null }));
    const desktop = updatedScreens.find((item) => item.profile === 'desktop') ?? updatedScreens[0];
    return { ...snapshot, previewKey: snapshot.previewKey ?? desktop?.previewKey ?? null, screenshots: updatedScreens };
  } catch (error) {
    logger.warn('snapshot.review_previews.backfill_failed', { snapshotId: snapshot.id, message: error.message });
    return snapshot;
  }
}
function boundRegionalScreens(row) {
  // Never sign evidence whose own location contradicts the result region.
  return (row.screenshots ?? []).filter((screen) =>
    (!row.artifactRegion || row.artifactRegion === row.region)
    && (!screen.region || screen.region === row.region)
    && (!row.bucketName || !screen.bucketName || screen.bucketName === row.bucketName));
}
async function withAssetUrls(snapshot, assets, config, { includeRegional = false } = {}) {
  const screenList = Array.isArray(snapshot.screenshots) && snapshot.screenshots.length
    ? snapshot.screenshots
    : (snapshot.pngKey ? [{ profile: 'desktop', label: 'Desktop', pngKey: snapshot.pngKey, previewKey: snapshot.previewKey ?? null, diffKey: null, pixelChangePercent: snapshot.pixelChangePercent ?? null }] : []);
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const urlFor = async (assetKey, item = {}) => {
    if (!assetKey || !snapshotAssetAccount(assetKey, snapshot.accountId, snapshot.watcherId, snapshot.id)) return null;
    if (config.appEnv === 'local') return `/assets/${assetKey}`;
    if (typeof assets?.signedReadUrl === 'function') return assets.signedReadUrl({
      key: assetKey,
      bucketName: item.bucketName ?? snapshot.artifactBucketName ?? assets.bucketName,
      region: item.region ?? snapshot.artifactRegion ?? assets.region,
    }, 900);
    return `${String(config.responseBaseUrl).replace(/\/$/, '')}/api/assets?token=${encodeURIComponent(createResponseToken({ purpose: 'snapshot_asset', assetKey, accountId: snapshot.accountId, expiresAt }, config.integritySecret))}`;
  };
  const screenView = async (screen, location = {}) => ({
    profile: screen.profile, label: screen.label, viewportWidth: screen.viewportWidth,
    viewportHeight: screen.viewportHeight, width: screen.width, height: screen.height,
    fullPage: screen.fullPage, pixelChangePercent: screen.pixelChangePercent,
    comparisonAvailable: screen.comparisonAvailable, dimensionsChanged: screen.dimensionsChanged,
    dimensionChange: screen.dimensionChange, hasDiff: Boolean(screen.diffKey),
    pngUrl: await urlFor(screen.pngKey, location), previewUrl: await urlFor(screen.previewKey, location), diffUrl: await urlFor(screen.diffKey, location),
  });
  const screens = await Promise.all(screenList.map((screen) => screenView(screen, screen)));
  const regionalResults = await Promise.all((snapshot.regionalResults ?? []).map(async (row) => ({
    region: row.region, status: row.status, capturedAt: row.capturedAt, httpStatus: row.httpStatus,
    durationMs: row.durationMs, textChangePercent: row.textChangePercent, pixelChangePercent: row.pixelChangePercent,
    comparisonSnapshotId: row.comparisonSnapshotId ?? null, comparisonCapturedAt: row.comparisonCapturedAt ?? null,
    comparisonAvailable: row.comparisonAvailable ?? (row.textChangePercent != null || row.screenshots?.some((screen) => screen.comparisonAvailable === true)),
    textComparisonAvailable: row.textComparisonAvailable ?? row.textChangePercent != null,
    comparisonComplete: row.comparisonComplete ?? null, baselineEstablished: row.baselineEstablished ?? false,
    reasons: (row.reasons ?? snapshot.reasons?.filter((reason) => reason.region === row.region) ?? []).map(customerReasonView),
    bannedMatches: (row.bannedMatches ?? snapshot.bannedMatches?.filter((match) => match.region === row.region) ?? []).map((match) => ({ quote: match.quote, phrase: match.phrase })),
    screenshots: includeRegional ? await Promise.all(boundRegionalScreens(row).map((screen) => screenView(screen, {
      bucketName: screen.bucketName ?? row.bucketName, region: screen.region ?? row.artifactRegion ?? row.region,
    }))) : [],
  })));
  const desktop = screens.find((item) => item.profile === 'desktop') ?? screens[0];
  return {
    id: snapshot.id, accountId: snapshot.accountId, watcherId: snapshot.watcherId, capturedAt: snapshot.capturedAt,
    incident: snapshot.incident ?? classifyIncident(snapshot), expectedRegions: snapshot.expectedRegions ?? null,
    evidenceComplete: snapshot.evidenceComplete ?? null, comparisonComplete: snapshot.comparisonComplete ?? null,
    outcome: snapshot.outcome, httpStatus: snapshot.httpStatus, finalUrl: snapshot.finalUrl,
    title: snapshot.title, durationMs: snapshot.durationMs, textChangePercent: snapshot.textChangePercent,
    pixelChangePercent: snapshot.pixelChangePercent, textDiff: snapshot.textDiff ?? null,
    bannedMatches: (snapshot.bannedMatches ?? []).map((match) => ({ quote: match.quote, phrase: match.phrase, region: match.region ?? null })),
    reasons: (snapshot.reasons ?? []).map(customerReasonView),
    comparisonNotes: snapshot.comparisonNotes?.length ? ['Some comparison evidence was unavailable.'] : [],
    comparisonSnapshotId: snapshot.comparisonSnapshotId, previousSnapshotId: snapshot.previousSnapshotId,
    primaryRegion: snapshot.primaryRegion, regionalResults, screenshots: screens,
    pngUrl: desktop?.pngUrl ?? null, previewUrl: desktop?.previewUrl ?? null,
    assetUrlExpiresAt: config.appEnv === 'local' ? null : expiresAt,
  };
}
function snapshotAssetAccount(assetKey, accountId, watcherId = null, snapshotId = null) {
  const parts = String(assetKey ?? '').split('/');
  if (parts.length < 5 || parts.some((part) => !part || part === '.' || part === '..')) return false;
  if (parts[0] === 'history') return parts[1] === accountId && (!watcherId || parts[2] === watcherId) && (!snapshotId || parts[3] === snapshotId);
  // Regional workers store content-addressed objects under an independent
  // retention prefix. The account and watcher components must still match.
  if (parts[0] === 'capture-history') return parts.length >= 7 && parts[2] === accountId && (!watcherId || parts[3] === watcherId);
  return false;
}
function binary(res, status, body, contentType) { res.writeHead(status, { 'content-type': contentType, 'content-length': body.length, 'cache-control': 'private, max-age=300', 'content-disposition': contentType === 'application/pdf' ? 'attachment; filename="cloversight-report.pdf"' : 'inline', 'x-content-type-options': 'nosniff' }); res.end(body); }
function assetContentType(key) { return String(key).endsWith('.png') ? 'image/png' : /\.jpe?g$/i.test(String(key)) ? 'image/jpeg' : String(key).endsWith('.pdf') ? 'application/pdf' : String(key).endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'; }
function origin(req) { return `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`; }
function aggregateRefunds(refunds) { return refunds.reduce((result, item) => { result.count += 1; result.amountMinor += item.status === 'completed' ? item.amountMinor : 0; return result; }, { count: 0, amountMinor: 0 }); }
function findTransaction(state, transactionId) { return state.transactions.find((item) => item.id === transactionId) ?? state.closedAccounts.flatMap((account) => account.transactions ?? []).find((item) => item.id === transactionId); }
function transactionView(state, txn) { const closed = state.closedAccounts.find((item) => item.id === txn.accountId); const live = state.accounts.find((item) => item.id === txn.accountId); return { transaction: stewardTransactionSummary(txn), account: live ? stewardAccountSummary(live) : (closed ? { id: closed.id, legalName: closed.legalName, contactEmail: closed.contactEmail, country: closed.country, region: closed.region, closed: true, closedAt: closed.closedAt } : null), refunds: state.refunds.filter((item) => item.transactionId === txn.id).map((item) => ({ id: item.id, amountMinor: item.amountMinor, currency: item.currency, reason: item.reason, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt })), events: state.auditEvents.filter((item) => item.transactionId === txn.id && !item.action.startsWith('watcher.')).reverse().map(stewardAuditEventSummary) }; }
function maskProviderId(value) { const text = String(value ?? ''); return text ? `${text.slice(0,4)}••••${text.slice(-4)}` : null; }
export async function processStripeEvent(event, store, logger, config = {}, billing = null) {
  let object = event.data?.object ?? {};
  // Subscription snapshots arrive out of order. Read the authoritative object;
  // never infer ordering from second-resolution event timestamps.
  if (event.type === 'customer.subscription.updated' && billing?.provider?.retrieveSubscription) {
    const snapshot = await store.read();
    const account = snapshot.accounts.find(a => a.providerSubscriptionId === object.id && a.providerCustomerId === object.customer);
    if (account) object = await billing.provider.retrieveSubscription({ accountId: account.id, subscriptionId: object.id, providerCustomerId: account.providerCustomerId, allowLegacyBinding: true });
  }
  const metadata = stripeMetadata(object);
  const declaredTransactionId = metadata.transactionId ?? null;
  const declaredAccountId = metadata.accountId ?? object.client_reference_id ?? null;
  if (!declaredTransactionId && !declaredAccountId && !object.customer) {
    logger.warn('stripe.webhook.unbound', { eventId: event.id, type: event.type });
    return;
  }

  const checkoutToReconcile = await store.transact('stripe.webhook.apply', (state) => {
    const account = state.accounts.find((item) => item.id === declaredAccountId)
      ?? state.accounts.find((item) => object.customer && item.providerCustomerId === object.customer);
    if (!account) {
      logger.warn('stripe.webhook.orphaned', { eventId: event.id, type: event.type, accountId: declaredAccountId, transactionId: declaredTransactionId });
      return null;
    }
    const providerCustomerId = object.customer ?? null;
    if (providerCustomerId && account.providerCustomerId && providerCustomerId !== account.providerCustomerId) {
      throw Object.assign(new Error('Stripe webhook customer does not match the account.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }

    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      const txn = state.transactions.find((item) => item.id === declaredTransactionId && item.accountId === account.id && item.type === 'subscription_start');
      if (!txn || txn.accountId !== account.id) throw Object.assign(new Error('Stripe checkout transaction binding failed.'), { code: 'CUSTOMER_BINDING_FAILED' });
      if (account.billingCancellation && txn.providerCheckoutId === object.id && object.mode === 'subscription' && object.metadata?.accountId === account.id && object.metadata?.transactionId === txn.id) {
        txn.cancellationSettledId = null;
        if (object.subscription) txn.providerSubscriptionId = object.subscription;
        if (!account.billingCancellation.leaseToken) account.billingCancellation.status = 'requested';
        account.billingCancellation.nextAttemptAt = ISO();
        return null;
      }
      if (txn.status !== 'pending_checkout') { logger.warn('stripe.checkout.ignored_non_pending', { eventId: event.id, transactionId: txn.id, status: txn.status }); return null; }
      if (!txn.providerCheckoutId) throw Object.assign(new Error('Stripe checkout arrived before its session was saved; retry the event.'), { code: 'CHECKOUT_SESSION_NOT_BOUND' });
      if (txn.providerCheckoutId !== object.id || object.mode !== 'subscription' || object.metadata?.accountId !== account.id || object.metadata?.transactionId !== txn.id || !object.customer || !object.subscription) {
        throw Object.assign(new Error('Stripe checkout session failed account, transaction, or subscription binding.'), { code: 'CUSTOMER_BINDING_FAILED' });
      }
      reconcileStripeObject(object, txn);
      if (object.payment_status !== 'paid') return null;
      return { accountId: account.id, checkoutId: txn.providerCheckoutId };
    }

    if (event.type === 'customer.subscription.deleted') {
      if (!object.id || object.id !== account.providerSubscriptionId) return null;
      account.billingStatus = 'canceled'; account.terminalSubscriptionId = object.id;
      if (account.billingCancellation && !account.billingCancellation.leaseToken) { account.billingCancellation.status = 'requested'; account.billingCancellation.nextAttemptAt = ISO(); }
      account.updatedAt = ISO();
      return null;
    }

    if (event.type === 'customer.subscription.updated') {
      if (object.id && account.providerSubscriptionId && object.id !== account.providerSubscriptionId) throw Object.assign(new Error('Stripe subscription binding failed.'), { code: 'CUSTOMER_BINDING_FAILED' });
      // Subscription updates can precede Checkout payment. An unbound event
      // cannot install a paid subscription or raise an account's plan.
      if (!object.id || !account.providerSubscriptionId) return null;
      if (account.billingStatus === 'canceled' || account.terminalSubscriptionId === object.id) return null;
      account.cancelAtPeriodEnd = Boolean(object.cancel_at_period_end);
      const planTxn = state.transactions.find((item) => item.id === declaredTransactionId && item.accountId === account.id);
      const currentPrice = object.items?.data?.[0]?.price;
      const currentPriceId = currentPrice?.id ?? currentPrice;
      const providerPlanId = object.items?.data?.length === 1
        ? Object.entries(config.stripePriceIds ?? {}).find(([, priceId]) => priceId === currentPriceId)?.[0] ?? null
        : null;
      account.billingStatus = object.status !== 'active' ? String(object.status ?? 'unavailable')
        : providerPlanId !== account.planId ? 'plan_mismatch'
        : account.billingStatus === 'past_due' ? 'past_due' : 'active';
      if (planTxn && planTxn.status !== 'completed' && object.pending_update) {
        planTxn.status = 'payment_required'; planTxn.automaticRetryAt = null;
        planTxn.providerInvoiceId = typeof object.latest_invoice === 'string' ? object.latest_invoice : object.latest_invoice?.id ?? planTxn.providerInvoiceId;
        planTxn.outcomeReason = 'PAYMENT_ACTION_REQUIRED'; planTxn.updatedAt = ISO();
      }
      account.updatedAt = ISO();
      return null;
    }

    // invoice.paid also fires when an invoice is manually marked paid outside
    // Stripe. Only a successful payment attempt can activate paid service.
    if (!['invoice.payment_failed', 'invoice.payment_succeeded'].includes(event.type)) return null;
    const invoiceSubscriptionId = stripeInvoiceSubscriptionId(object);
    if (!invoiceSubscriptionId || (account.providerSubscriptionId && invoiceSubscriptionId !== account.providerSubscriptionId)) {
      throw Object.assign(new Error('Stripe invoice subscription does not match this account.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }
    const subtotalRaw = stripeSubtotal(object);
    if (!Number.isSafeInteger(subtotalRaw)) throw Object.assign(new Error('Stripe invoice subtotal is invalid.'), { code: 'AMOUNT_MISMATCH' });
    const billableAmount = Math.max(0, subtotalRaw);
    let txn = state.transactions.find((item) => item.id === declaredTransactionId && item.accountId === account.id);
    txn ??= state.transactions.find((item) => item.type === 'subscription_renewal' && item.accountId === account.id && item.providerInvoiceId === object.id);
    const canBindExisting = txn && (
      txn.providerInvoiceId === object.id
      || (!txn.providerInvoiceId && ['processing', 'retry_processing', 'retry_scheduled', 'payment_required', 'reconciliation_required', 'pending_checkout'].includes(txn.status))
    );
    if (!canBindExisting) txn = null;
    if (!txn && declaredTransactionId && object.billing_reason !== 'subscription_cycle') {
      throw Object.assign(new Error('Stripe invoice references an unknown or incompatible transaction.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }
    if (!txn) {
      if (object.billing_reason !== 'subscription_cycle' || !account.providerSubscriptionId || invoiceSubscriptionId !== account.providerSubscriptionId) {
        logger.warn('stripe.invoice.untracked_reason', { eventId: event.id, invoiceId: object.id, billingReason: object.billing_reason });
        return null;
      }
      const invoiceCurrency = String(object.currency ?? config.billingCurrency ?? 'USD').toUpperCase();
      const expectedPlanPrice = recurringPriceMinor(account.planId, invoiceCurrency);
      if (!Number.isSafeInteger(expectedPlanPrice) || billableAmount !== expectedPlanPrice) {
        throw Object.assign(new Error('Stripe recurring invoice does not match the server plan price.'), { code: 'AMOUNT_MISMATCH' });
      }
      const renewalId = `txn_stripe_${String(object.id ?? event.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96)}`;
      txn = state.transactions.find((item) => item.id === renewalId);
      if (!txn) {
        const createdAt = stripeEpoch(object.created) ?? ISO();
        const envelope = config.integritySecret ? calculationEnvelope({
          accountId: account.id,
          transactionId: renewalId,
          operation: 'subscription_renewal',
          planId: account.planId,
          amountMinor: billableAmount,
          currency: String(object.currency ?? config.billingCurrency ?? 'USD').toUpperCase(),
          providerCustomerId: providerCustomerId ?? account.providerCustomerId,
        }, config.integritySecret) : null;
        txn = {
          id: renewalId, accountId: account.id, provider: 'stripe', type: 'subscription_renewal', planId: account.planId,
          amountMinor: billableAmount, providerCreditMinor: Math.max(0, -subtotalRaw), taxMinor: stripeTax(object),
          currency: String(object.currency ?? config.billingCurrency ?? 'USD').toUpperCase(), status: 'processing', outcomeReason: null,
          providerCustomerId: providerCustomerId ?? account.providerCustomerId, providerPaymentId: null, providerInvoiceId: object.id,
          paymentReference: null, paymentActionUrl: optionalProviderPaymentUrl(object.hosted_invoice_url, config), envelope,
          retryCount: 0, retryMode: null, automaticRetryAt: null, createdAt, updatedAt: ISO(),
        };
        state.transactions.push(txn);
      }
    } else {
      reconcileStripeObject(object, txn);
    }
    if (txn.accountId !== account.id) throw Object.assign(new Error('Stripe invoice account and transaction binding failed.'), { code: 'CUSTOMER_BINDING_FAILED' });
    if (txn.type === 'subscription_start' && (!txn.providerCheckoutId || (account.providerSubscriptionId && account.providerSubscriptionId !== invoiceSubscriptionId))) {
      throw Object.assign(new Error('Stripe initial invoice is not bound to this checkout.'), { code: 'CUSTOMER_BINDING_FAILED' });
    }
    if (txn.providerCustomerId && providerCustomerId && txn.providerCustomerId !== providerCustomerId) throw Object.assign(new Error('Stripe invoice customer does not match the transaction.'), { code: 'CUSTOMER_BINDING_FAILED' });
    if (txn.amountMinor !== billableAmount) throw Object.assign(new Error('Stripe invoice amount failed reconciliation.'), { code: 'AMOUNT_MISMATCH' });

    txn.providerInvoiceId = object.id ?? txn.providerInvoiceId;
    txn.providerPaymentId = stripeInvoicePaymentIntentId(object) ?? txn.providerPaymentId;
    txn.taxMinor = stripeTax(object);
    txn.paymentActionUrl = optionalProviderPaymentUrl(object.hosted_invoice_url ?? txn.paymentActionUrl, config);
    txn.updatedAt = ISO();
    const period = stripeInvoicePeriod(object);
    if (period.start) txn.periodStart = period.start;
    if (period.end) txn.periodEnd = period.end;

    if (account.billingCancellation) {
      if (txn.status === 'completed') return null;
      const paid = event.type === 'invoice.payment_succeeded';
      if (paid && object.status !== 'paid') throw Object.assign(new Error('Stripe paid invoice event does not contain a paid invoice.'), { code: 'INVOICE_NOT_PAID' });
      txn.status = paid ? 'completed' : 'payment_required'; txn.automaticRetryAt = null;
      txn.outcomeReason = paid ? null : 'PAYMENT_ACTION_REQUIRED';
      if (paid) txn.paymentActionUrl = null;
      if (txn.type === 'subscription_start') txn.cancellationSettledId = null;
      if (!account.billingCancellation.leaseToken) account.billingCancellation.status = 'requested';
      account.billingCancellation.nextAttemptAt = ISO();
      if (!paid) account.billingCancellation.financialReview = true;
      appendAudit(state, { actorId: 'stripe-webhook', role: 'system' }, 'billing.payment_recorded_during_cancellation', { accountId: account.id, transactionId: txn.id, reason: event.type });
      return null;
    }

    if (event.type === 'invoice.payment_failed') {
      if (txn.type === 'subscription_start') { txn.outcomeReason = 'PAYMENT_PENDING'; return null; }
      if (txn.status === 'completed') { logger.warn('stripe.invoice.ignored_stale_failure', { eventId: event.id, invoiceId: object.id, transactionId: txn.id }); return null; }
      const planChange = txn.type === 'plan_change';
      const safeToRetry = !planChange && Boolean(txn.envelope) && txn.retryCount < 1 && account.closureStatus === 'active';
      txn.status = planChange ? 'payment_required' : safeToRetry ? 'retry_scheduled' : 'failed';
      txn.automaticRetryAt = safeToRetry ? new Date(Date.now() + 86400_000).toISOString() : null;
      txn.outcomeReason = object.last_finalization_error?.message ?? object.last_payment_error?.message ?? 'invoice_payment_failed';
      if (txn.type === 'subscription_renewal') account.billingStatus = 'past_due';
    } else if (event.type === 'invoice.payment_succeeded') {
      if (object.status !== 'paid') throw Object.assign(new Error('Stripe paid invoice event does not contain a paid invoice.'), { code: 'INVOICE_NOT_PAID' });
      if (txn.type === 'subscription_start') {
        if (!txn.providerCheckoutId) throw Object.assign(new Error('Paid subscription invoice is missing its Checkout Session binding.'), { code: 'CHECKOUT_SESSION_NOT_BOUND' });
        return { accountId: account.id, checkoutId: txn.providerCheckoutId };
      }
      if (txn.status === 'completed') return null;
      let funded = false;
      if (txn.type === 'subscription_renewal') {
        funded = applyPaidRenewalWindow(account, txn, period);
        if (funded) {
          if (txn.currency === 'USD' && PLANS[account.planId]) markCurrentCatalogPlan(account, account.planId);
          else account.billingCurrency = txn.currency;
        }
      } else if (txn.type === 'plan_change') {
        carryCaptureUsage(account, txn, { periodEnd: period.end });
        if (period.start && period.end && period.end > ISO() && period.end > period.start) { account.currentPeriodStart = period.start; account.currentPeriodEnd = period.end; }
        funded = true;
      }
      txn.status = 'completed'; txn.automaticRetryAt = null; txn.outcomeReason = null; txn.paymentActionUrl = null;
      if (txn.type === 'plan_change' && account.closureStatus === 'active' && !account.billingCancellation) { markCurrentCatalogPlan(account, txn.planId); applyPlanWatcherAdjustments(state, txn); }
      if (funded && account.billingStatus !== 'canceled') account.billingStatus = 'active';
      if (funded && account.closureStatus === 'active' && !account.billingCancellation) resumeCreditDelayedWatchers(state, account.id, ISO());
    }
    account.updatedAt = ISO();
    return null;
  });
  if (checkoutToReconcile) {
    if (!billing || typeof billing.reconcileCheckout !== 'function') throw Object.assign(new Error('Stripe Checkout reconciliation is unavailable.'), { code: 'CHECKOUT_RECONCILIATION_UNAVAILABLE' });
    const result = await billing.reconcileCheckout(checkoutToReconcile.accountId, checkoutToReconcile.checkoutId, { actorId: 'stripe-webhook', role: 'system', requestId: event.id });
    if (result.status !== 'completed' && result.status !== 'payment_pending') throw Object.assign(new Error('Stripe Checkout could not be reconciled.'), { code: 'CHECKOUT_RECONCILIATION_REQUIRED' });
  }
}

function markCurrentCatalogPlan(account, planId) {
  account.planId = planId;
  account.planCatalogVersion = PLAN_CATALOG_VERSION;
  account.billingCurrency = 'USD';
}

function reconcileStripeObject(object, txn) {
  if (object.currency && String(object.currency).toUpperCase() !== txn.currency) throw Object.assign(new Error('Stripe webhook currency failed reconciliation.'), { code: 'CURRENCY_MISMATCH' });
  const subtotal = object.subtotal_excluding_tax ?? object.amount_subtotal ?? object.subtotal;
  if (subtotal != null && Math.max(0, Number(subtotal)) !== txn.amountMinor) throw Object.assign(new Error('Stripe webhook amount failed reconciliation.'), { code: 'AMOUNT_MISMATCH' });
}
function stripeMetadata(object) { return { ...(object.parent?.subscription_details?.metadata ?? {}), ...(object.subscription_details?.metadata ?? {}), ...(object.metadata ?? {}) }; }
function stripeInvoiceSubscriptionId(object) {
  const candidate = object.parent?.subscription_details?.subscription ?? object.subscription;
  return typeof candidate === 'string' ? candidate : candidate?.id ?? null;
}
function stripeInvoicePaymentIntentId(object) {
  if (object?.payment_intent) return typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent.id;
  const invoicePayment = object?.payments?.data?.find((item) => item.is_default) ?? object?.payments?.data?.[0];
  const intent = invoicePayment?.payment?.payment_intent;
  return typeof intent === 'string' ? intent : intent?.id ?? null;
}
function stripeSubtotal(object) { return Number(object.subtotal_excluding_tax ?? object.amount_subtotal ?? object.subtotal); }
function stripeTax(object) {
  const explicit = object.total_tax_amounts?.reduce?.((sum, item) => sum + Number(item.amount ?? 0), 0);
  if (Number.isSafeInteger(explicit)) return Math.max(0, explicit);
  const subtotal = Math.max(0, stripeSubtotal(object));
  return Math.max(0, Number(object.amount_total ?? object.total ?? object.amount_due ?? subtotal) - subtotal);
}
function stripeEpoch(value) { return Number.isFinite(Number(value)) && Number(value) > 0 ? new Date(Number(value) * 1000).toISOString() : null; }
function stripeInvoicePeriod(object) {
  const line = object.lines?.data?.find((item) => item.parent?.subscription_item_details || item.type === 'subscription') ?? object.lines?.data?.[0];
  return { start: stripeEpoch(line?.period?.start), end: stripeEpoch(line?.period?.end) };
}
function stripeSubscriptionPeriod(object) {
  const item = object.items?.data?.[0];
  return { start: stripeEpoch(item?.current_period_start ?? object.current_period_start), end: stripeEpoch(item?.current_period_end ?? object.current_period_end) };
}

export const stripeEventInternals = Object.freeze({ reconcileStripeObject, stripeMetadata, stripeSubtotal, stripeTax, stripeEpoch, stripeInvoicePeriod, stripeSubscriptionPeriod });

function staleProviderEvent(event, nowIso = ISO()) {
  if (!event?.lastAttemptAt) return true;
  return Date.parse(nowIso) - Date.parse(event.lastAttemptAt) >= 5 * 60_000;
}

function normalizeStaffSearch(value) {
  const term = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  if (term && (term.length < 2 || term.length > 100)) throw Object.assign(new Error('Names must contain 2 to 100 characters.'), { statusCode: 400 });
  return term;
}
function staffNameMatches(person, first, last, combined) {
  const f = String(person.firstName).normalize('NFKC').toLocaleLowerCase().trim();
  const l = String(person.lastName).normalize('NFKC').toLocaleLowerCase().trim();
  const full = `${f} ${l}`.trim();
  if (first && !f.startsWith(first) && !full.startsWith(first)) return false;
  if (last && !l.startsWith(last) && !full.endsWith(last)) return false;
  return !combined || (full.startsWith(combined) || combined.split(' ').every((part) => full.split(' ').some((name) => name.startsWith(part))));
}
