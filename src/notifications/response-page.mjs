import { logoDarkSvg } from '../brand/assets.mjs';
const PAGE_STYLES = `
:root{color-scheme:dark;--canvas:#100e17;--surface:#18141f;--surface-strong:#211a28;--ink:#fff9fc;--copy:#c9c0cc;--line:rgba(255,255,255,.11);--pink:#ff78bd;--plum:#c33183;--green:#54dba0;--green-deep:#087a4a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}html,body{min-width:320px;min-height:100%;margin:0}body{min-height:100vh;min-height:100dvh;color:var(--ink);background:radial-gradient(circle at 86% 8%,rgba(255,120,189,.13),transparent 30rem),radial-gradient(circle at 8% 88%,rgba(84,219,160,.08),transparent 32rem),linear-gradient(145deg,var(--canvas),#15111b 54%,#100e17);line-height:1.6}
a{color:inherit}.site-header{border-bottom:1px solid var(--line);background:rgba(16,14,23,.84);backdrop-filter:blur(20px) saturate(145%)}.nav{display:flex;width:min(1120px,calc(100% - 40px));min-height:76px;margin:auto;align-items:center;justify-content:space-between;gap:1rem}.brand{display:inline-flex;align-items:center;gap:.68rem;font-size:1.25rem;font-weight:820;letter-spacing:-.04em;text-decoration:none}
.button,button{display:inline-flex;min-height:44px;padding:.7rem 1rem;align-items:center;justify-content:center;border:1px solid transparent;border-radius:11px;background:linear-gradient(135deg,#168c5a,var(--green-deep));color:#fff;font:inherit;font-size:.86rem;font-weight:780;text-decoration:none;cursor:pointer;box-shadow:0 10px 24px rgba(8,122,74,.18);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.button:hover,button:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(8,122,74,.28)}.button.secondary,button.secondary{border-color:var(--line);background:rgba(255,255,255,.055);box-shadow:none;color:var(--ink)}.button:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--pink);outline-offset:3px}
.page{position:relative;display:grid;width:min(920px,calc(100% - 40px));min-height:calc(100vh - 77px);min-height:calc(100dvh - 77px);margin:auto;padding:clamp(3rem,8vw,7rem) 0;place-items:center}.page::before{position:absolute;width:min(58vw,520px);height:min(58vw,520px);border:1px solid rgba(255,120,189,.1);border-radius:50%;content:"";box-shadow:0 0 0 70px rgba(255,255,255,.012),0 0 0 71px rgba(255,120,189,.055);pointer-events:none}
.response-card{position:relative;width:min(680px,100%);padding:clamp(1.5rem,5vw,3.3rem);overflow:hidden;border:1px solid var(--line);border-radius:26px;background:linear-gradient(145deg,rgba(35,29,43,.97),rgba(24,20,31,.96));box-shadow:0 30px 90px rgba(0,0,0,.34)}.response-card::after{position:absolute;right:-70px;bottom:-90px;width:220px;height:220px;border:1px solid rgba(84,219,160,.12);border-radius:50%;content:"";box-shadow:0 0 0 36px rgba(84,219,160,.025);pointer-events:none}.eyebrow{margin:0 0 .7rem;color:var(--pink);font-size:.72rem;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.result-mark{display:grid;width:54px;height:54px;margin-bottom:1.3rem;place-items:center;border:1px solid rgba(84,219,160,.25);border-radius:17px;background:rgba(84,219,160,.1);color:var(--green);font-size:1.55rem;font-weight:900}.response-card h1{max-width:13ch;margin:.2rem 0 1rem;font-size:clamp(2.25rem,7vw,4.4rem);line-height:.98;letter-spacing:-.06em}.response-card p{max-width:55ch;margin:.5rem 0;color:var(--copy);font-size:clamp(1rem,2.2vw,1.14rem)}.response-card strong{color:var(--ink)}.status-pill{display:inline-flex;margin:1.2rem 0 .35rem;padding:.42rem .75rem;align-items:center;gap:.5rem;border:1px solid rgba(84,219,160,.23);border-radius:999px;background:rgba(84,219,160,.09);color:var(--green);font-size:.77rem;font-weight:820;letter-spacing:.04em}.status-pill::before{width:8px;height:8px;border-radius:50%;background:currentColor;content:"";box-shadow:0 0 0 5px rgba(84,219,160,.09)}form{display:flex;margin-top:1.7rem;gap:.7rem;flex-wrap:wrap}form button{min-width:150px}.footnote{margin-top:1.5rem!important;font-size:.82rem!important}.footnote a{color:var(--pink);font-weight:700;text-underline-offset:3px}
@media(max-width:560px){.nav,.page{width:min(100% - 28px,1120px)}.nav{min-height:68px}.page{min-height:calc(100dvh - 69px);padding:2rem 0}.response-card{padding:1.35rem;border-radius:20px}.response-card h1{font-size:2.55rem}form{display:grid}form button{width:100%}.brand{font-size:1.1rem}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
`;

export function renderResponsePrompt(token) {
  return pageShell({
    title: 'Respond to CLOVERSIGHT alert',
    body: `<section class="response-card"><div class="result-mark" aria-hidden="true">!</div><p class="eyebrow">Human confirmation required</p><h1>How should this alert proceed?</h1><p>Opening this page did not cast a vote. Choose the response that reflects the current state of the monitored page.</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button name="response" value="alert_received">Alert received</button><button class="secondary" name="response" value="all_clear">All clear — use the new baseline</button></form><p class="footnote">This signed response is tied to one recipient and one alert. Need the dashboard instead? <a href="/app/?action=login">Log in to CLOVERSIGHT</a>.</p></section>`,
  });
}

export function renderResponseRecorded(status) {
  const result = responseCopy(status);
  return pageShell({
    title: result.title,
    body: `<section class="response-card"><div class="result-mark" aria-hidden="true">✓</div><p class="eyebrow">Response recorded</p><h1>${escapeHtml(result.title)}</h1><span class="status-pill">${escapeHtml(result.label)}</span><p>${escapeHtml(result.copy)}</p><p class="footnote">You can close this tab, or <a href="/app/?action=login">log in to CLOVERSIGHT</a> to review your watchers.</p></section>`,
  });
}

export function renderUnsubscribePrompt(token) {
  return pageShell({
    title: 'Stop CLOVERSIGHT customer alerts',
    body: `<section class="response-card"><div class="result-mark" aria-hidden="true">@</div><p class="eyebrow">Email preference</p><h1>Stop CLOVERSIGHT customer alerts?</h1><p>This will block customer monitoring alerts and team invitations to this email address platform-wide. Customer notification settings cannot override your choice. Required account-deletion notices and administrative security or operational notices remain separate.</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button>Stop customer alert email</button><a class="button secondary" href="/">Keep email enabled</a></form><p class="footnote">Opening this page did not change your preference. The block is recorded only after you confirm.</p></section>`,
  });
}

export function renderUnsubscribeRecorded(status) {
  const already = status === 'already_unsubscribed';
  return pageShell({
    title: already ? 'Email already blocked' : 'Email stopped',
    body: `<section class="response-card"><div class="result-mark" aria-hidden="true">✓</div><p class="eyebrow">Preference recorded</p><h1>${already ? 'You’re already unsubscribed.' : 'Customer alert email is blocked.'}</h1><span class="status-pill">Customer alerts blocked platform-wide</span><p>${already ? 'This email address was already on the CLOVERSIGHT customer block list.' : 'Customer monitoring alerts and team invitations to this address are now blocked. Customer notification settings cannot override your choice.'}</p><p>Required account-deletion notices and administrative security or operational notices remain separate.</p><p class="footnote">If you change your mind, contact Red Clover Software and ask the platform owner to remove the customer block.</p></section>`,
  });
}

function pageShell({ title, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#100e17"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} | CLOVERSIGHT</title><style>${PAGE_STYLES} .brand svg{display:block;width:min(260px,48vw);height:auto}</style></head><body><header class="site-header"><nav class="nav" aria-label="Response navigation"><a class="brand" href="/" aria-label="CLOVERSIGHT home">${logoDarkSvg}</a><a class="button secondary" href="/app/?action=login">Log in</a></nav></header><main class="page">${body}</main></body></html>`;
}

function responseCopy(status) {
  const values = {
    all_clear: { title: 'All clear.', label: 'New green baseline approved', copy: 'Your response was accepted and the alert is being resolved. No further escalation is needed.' },
    acknowledged: { title: 'Alert acknowledged.', label: 'Response threshold reached', copy: 'Your response was accepted. This notification escalation has stopped.' },
    recorded: { title: 'Thank you.', label: 'Response recorded', copy: 'Your response was accepted. CLOVERSIGHT is still waiting for the configured response threshold.' },
    notifications_canceled: { title: 'Notifications canceled.', label: 'No response applied', copy: 'The account owner canceled this incident’s notification activity before this response was submitted.' },
    tier_muted: { title: 'Escalation level skipped.', label: 'No response applied', copy: 'The account owner skipped this escalation level before this response was submitted.' },
  };
  return values[status] ?? { title: 'Response recorded.', label: humanStatus(status), copy: 'Your response was accepted. You can safely close this page.' };
}

function humanStatus(value) {
  return String(value ?? 'Recorded').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
