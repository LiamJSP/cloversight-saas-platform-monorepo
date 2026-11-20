/** @module customer/app
 * @description Customer portal navigation, watcher workflow, billing, reports and check status.
 */
import { createPortalAuth } from '/static/auth.js?v=0.5.15';
import { COUNTRIES } from '/app-static/locations.js?v=0.5.15';
import { mountRegionalGlobe } from '/app-static/regional-globe/index.js?v=0.5.15';
const RETURN_PATH_KEY = 'webwatch.customer.return-path';
const ROUTES = Object.freeze({
  dashboard: '/app/',
  watchers: '/app/watchers/',
  gallery: '/app/gallery/',
  reports: '/app/reports/',
  team: '/app/team/',
  actionlog: '/app/action-log/',
  billing: '/app/billing/',
  profile: '/app/profile/',
  debug: '/app/debug/',
});
let auth = null;
let authStartupError = null;
try { auth = await createPortalAuth('customer'); } catch (error) { authStartupError = error; }
if (auth?.authenticated) { const signOut = document.querySelector('#sign-out'); if (signOut) { signOut.hidden = false; signOut.onclick = () => clearDraftsAndSignOut(); } }
if (['localhost','127.0.0.1'].includes(location.hostname)) document.querySelector('[data-public-home]')?.setAttribute('href','/');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ICONS = Object.freeze({
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  users: '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M22 20v-2a4 4 0 0 0-3-3.6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
});
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]??''}</svg>`;}
const money = (minor, currency='USD') => new Intl.NumberFormat('en-US',{style:'currency',currency}).format((minor ?? 0)/100);
const date = (value) => value ? new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';
const formatPercent = (value) => value == null || Number.isNaN(Number(value)) ? null : `${Number(value).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}%`;
function countUp(value,{decimals=0,suffix='',className=''}={}){const target=Number(value)||0;return `<span class="${className}" data-count-up="${target}" data-count-decimals="${decimals}" data-count-suffix="${escapeHtml(suffix)}">0${escapeHtml(suffix)}</span>`;}
function animateNumberMetrics(root=document){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-count-up]',root).forEach((node)=>{
    const target=Number(node.dataset.countUp)||0;const decimals=Number(node.dataset.countDecimals)||0;const suffix=node.dataset.countSuffix||'';
    const format=(value)=>`${Number(value).toFixed(decimals).replace(/\.0+$/,'')}${suffix}`;
    if(reduced||target===0){node.textContent=format(target);return;}
    const key=`${target}:${decimals}:${suffix}`;if(node.dataset.animatedTarget===key)return;node.dataset.animatedTarget=key;node.textContent=format(0);
    const started=performance.now();const duration=560;
    const frame=(now)=>{const progress=Math.min(1,(now-started)/duration);const eased=progress < .12 ? .18*(progress/.12)**2 : .18+.82*(1-(1-(progress-.12)/.88)**3);node.textContent=format(progress===1?target:target*eased);if(progress<1)requestAnimationFrame(frame);};
    requestAnimationFrame(frame);
  });
}
const humanizePercentages = (value) => String(value ?? '').replace(/(-?\d+\.\d{3,})%/g, (_, number) => formatPercent(number));
const friendlyTransactionMessage = (value) => {
  const raw=String(value??'').trim(); if(!raw)return '';
  if(/^STRIPE_ERROR$/i.test(raw))return 'The payment provider could not complete this request.';
  if(/invoice id is required for retry/i.test(raw))return 'This payment cannot be retried automatically. Contact support and we’ll help.';
  const replacement=raw.match(/^replaced_by_checkout:(.+)$/i); if(replacement)return `Plan changed to ${replacement[1].replaceAll('_',' ')} through checkout.`;
  return humanizePercentages(raw.replaceAll('_',' '));
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TERMINAL_CHECK_STATUSES = new Set(['completed','failed','skipped']);
const checkPollers = new Map();
const reportPollers = new Map();
const assetRefreshes = new Map();
const activeResultImages = new Map();
let resultOpenGeneration = 0;
let localDraftsAllowed=true;
const state = { bootstrap:null, view:viewFromPath(location.pathname), health:'checking', editing:null, resultWatcherId:null, resultSnapshotId:null, resultRegionId:null, notificationActivityWatcherId:null, notificationActivity:null, archiveWatcherId:null, archiveSearch:'', draftPending:false, advancedMode:false, lastFocusCheck:0, modalReturnFocus:null, modalActive:false, countdownTimer:null, notificationStatusTimer:null, checkStatusTimer:null };
let disposeResultGlobe = null;
const headers = {'content-type':'application/json'};

function viewFromPath(pathname) {
  const normalized = (`/${String(pathname || '').replace(/^\/+|\/+$/g,'')}`).replace(/^\/$/,'/');
  if (normalized === '/' || normalized === '/app') return 'dashboard';
  for (const [view, path] of Object.entries(ROUTES)) if (normalized === path.replace(/\/$/,'')) return view;
  return 'dashboard';
}
function routeHref(view) { return ROUTES[view] ?? ROUTES.dashboard; }
function focusWorkspaceHeading(){const heading=$('#workspace h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
function ownerPermission(){return state.bootstrap?.capabilities?.permissions?.owner===true;}
function needsRegistration(){return ownerPermission()&&state.bootstrap?.account?.profileComplete===false;}
function viewAllowed(view){return (!needsRegistration()||view==='profile')&&(!['billing','team','actionlog'].includes(view)||ownerPermission());}
function syncSidebar() { $$('.sidebar button').forEach((button) => { if(button.hasAttribute('data-owner-nav'))button.hidden=!ownerPermission();const active=button.dataset.view===state.view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current'); }); }
function navigateView(view, { replace=false } = {}) {
  resultOpenGeneration+=1;
  if (!ROUTES[view]||!viewAllowed(view)) view = needsRegistration()?'profile':'dashboard';
  if (view === 'gallery') { state.archiveWatcherId = null; state.archiveSearch = ''; }
  document.querySelectorAll('body > .modal[role="dialog"]').forEach((modal) => modal.remove());
  state.modalActive = false; state.modalReturnFocus = null; $('#portal-shell')?.removeAttribute('inert'); document.body.classList.remove('modal-open');
  state.view = view; state.editing = null; state.resultWatcherId = null; state.resultSnapshotId = null; state.notificationActivityWatcherId = null; state.notificationActivity = null;
  const method = replace ? 'replaceState' : 'pushState';
  history[method]({}, '', routeHref(view));
  setPortalMenu(false);
  render();
  focusWorkspaceHeading();
  // A newly selected route starts at its heading, not halfway down the
  // previous page's longer profile, billing or archive content.
  window.scrollTo({top:0,left:0,behavior:'instant'});
}
function modalLocation(kind, watcherId, snapshotId = null) {
  const url = new URL(location.href);
  url.searchParams.delete('modal'); url.searchParams.delete('watcher'); url.searchParams.delete('snapshot');
  if (kind) url.searchParams.set('modal', kind);
  if (watcherId) url.searchParams.set('watcher', watcherId);
  if (snapshotId) url.searchParams.set('snapshot', snapshotId);
  return `${url.pathname}${url.search}${url.hash}`;
}
function openEditor(watcher, isNew=false) {
  resultOpenGeneration+=1;
  if(document.activeElement instanceof HTMLElement) state.modalReturnFocus=document.activeElement;
  state.editing = structuredClone(watcher); state.resultWatcherId = null; state.resultSnapshotId = null; state.notificationActivityWatcherId = null; state.notificationActivity = null;
  history.pushState({}, '', modalLocation(isNew ? 'new-watcher' : 'watcher', isNew ? null : watcher.id));
  render();
}
async function openLastCheck(watcherId, snapshotId = null, trigger = null) {
  const generation=++resultOpenGeneration;
  const accountId=state.bootstrap?.account?.id;
  const openingView=state.view;
  if(document.activeElement instanceof HTMLElement) state.modalReturnFocus=document.activeElement;
  let targetSnapshot=snapshotId?state.bootstrap?.snapshots.find((item)=>item.id===snapshotId&&item.watcherId===watcherId):latestSnapshot(watcherId);
  if(!resultWatcher(watcherId,targetSnapshot))return;
  if(trigger){trigger.disabled=true;trigger.classList.add('is-loading');trigger.setAttribute('aria-busy','true');}
  if(targetSnapshot){
    try{
      targetSnapshot=await refreshSnapshotAssets(targetSnapshot.id,{force:true,timeoutMs:12000});
    }catch(error){
      toast(`Results opened, but screenshot links could not be refreshed: ${error.message}`,'error');
    }
  }
  if(generation!==resultOpenGeneration||state.bootstrap?.account?.id!==accountId||state.view!==openingView){if(trigger?.isConnected){trigger.disabled=false;trigger.classList.remove('is-loading');trigger.removeAttribute('aria-busy');}return;}
  state.resultWatcherId = watcherId; state.resultSnapshotId = snapshotId; state.resultRegionId = null; state.editing = null; state.notificationActivityWatcherId = null; state.notificationActivity = null;
  history.pushState({}, '', modalLocation('last-check', watcherId, snapshotId));
  render();
}
async function openNotificationActivity(watcherId, trigger = null) {
  resultOpenGeneration+=1;
  if(document.activeElement instanceof HTMLElement) state.modalReturnFocus=document.activeElement;
  if(trigger){trigger.disabled=true;trigger.classList.add('is-loading');trigger.setAttribute('aria-busy','true');}
  try{
    const activity=await api(`/api/watchers/${encodeURIComponent(watcherId)}/notification-activity`);
    state.notificationActivityWatcherId=watcherId;state.notificationActivity=activity;state.editing=null;state.resultWatcherId=null;state.resultSnapshotId=null;
    history.pushState({},'',modalLocation('check-status',watcherId));
    render();
  }catch(error){toast(`Notification activity could not be opened: ${error.message}`,'error');}
  finally{if(trigger?.isConnected){trigger.disabled=false;trigger.classList.remove('is-loading');trigger.removeAttribute('aria-busy');}}
}
function closeModal() {
  resultOpenGeneration+=1;
  state.editing = null; state.resultWatcherId = null; state.resultSnapshotId = null; state.notificationActivityWatcherId = null; state.notificationActivity = null;
  history.replaceState({}, '', modalLocation(null, null));
  render();
}

function focusableIn(root){return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',root).filter((node)=>node.tabIndex>=0&&!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length);}
function manageModalAccessibility(){
  const existing=document.querySelector('body > .modal[role="dialog"]');
  if(existing){
    $('#portal-shell')?.setAttribute('inert','');
    document.body.classList.add('modal-open');
    if(!state.modalActive||document.activeElement===document.body){
      requestAnimationFrame(()=>{const target=existing.querySelector('[data-modal-initial-focus]')||focusableIn(existing)[0]||existing;target.focus();});
    }
    state.modalActive=true;
    return;
  }
  $('#portal-shell')?.removeAttribute('inert');
  document.body.classList.remove('modal-open');
  if(state.modalActive){
    const previous=state.modalReturnFocus;
    requestAnimationFrame(()=>{
      let target=previous?.isConnected?previous:null;
      if(!target&&previous?.dataset.action&&previous?.dataset.id){
        target=$$('[data-action]').find((node)=>node.dataset.action===previous.dataset.action&&node.dataset.id===previous.dataset.id&&(node.dataset.snapshot||'')===(previous.dataset.snapshot||''))??null;
      }
      const collapsed=target?.closest('details');if(collapsed&&!collapsed.open)collapsed.open=true;
      (target??$('#workspace'))?.focus();
    });
  }
  state.modalActive=false; state.modalReturnFocus=null;
}
function handleModalKeydown(event){
  const modal=$$('body > .modal[role="dialog"]').at(-1); if(!modal)return false;
  if(event.key==='Escape'){
    // Escape belongs to a native select picker or an active composition first.
    // Browsers do not expose whether that picker is open; keep the dialog's
    // Close control available while a select has focus.
    if(event.defaultPrevented||event.isComposing||(event.target instanceof Element&&event.target.closest('select')))return true;
    event.preventDefault();const cancel=modal.querySelector('[data-confirm-cancel]');if(cancel)cancel.click();else closeModal();return true;
  }
  if(event.key!=='Tab')return false;
  const focusable=focusableIn(modal); if(!focusable.length){event.preventDefault();modal.focus();return true;}
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  return true;
}
function requestCustomerConfirmation({title,copy,confirmLabel='Confirm',danger=false,reason=false,detailRows=[]}){
  return new Promise((resolve)=>{
    const returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const modal=document.createElement('div');modal.className='modal';modal.dataset.confirmation='true';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','customer-confirm-title');modal.tabIndex=-1;
    const details=detailRows.length?`<dl class="confirmation-breakdown">${detailRows.map((row)=>`<div><dt>${escapeHtml(row.label)}</dt><dd class="${row.emphasis?'emphasis':''}">${escapeHtml(row.value)}</dd></div>`).join('')}</dl>`:'';
    modal.innerHTML=`<form class="modal-panel confirmation-panel"><div class="workspace-header modal-header"><div><p class="eyebrow">Please confirm</p><h2 id="customer-confirm-title">${escapeHtml(title)}</h2><p class="muted">${escapeHtml(copy)}</p></div></div>${details}${reason?'<div class="confirmation-body field"><label for="customer-confirm-reason">Reason for closing this account</label><textarea id="customer-confirm-reason" name="reason" minlength="5" required data-modal-initial-focus></textarea><small>This note is retained with the account closure record.</small></div>':''}<div class="form-actions modal-actions"><button type="button" class="secondary" data-confirm-cancel>Cancel</button><button class="${danger?'danger':''}" ${reason?'':'data-modal-initial-focus'}>${escapeHtml(confirmLabel)}</button></div></form>`;
    const finish=(value)=>{modal.remove();const underlying=$$('body > .modal[role="dialog"]').at(-1);if(underlying){$('#portal-shell')?.setAttribute('inert','');document.body.classList.add('modal-open');}else{$('#portal-shell')?.removeAttribute('inert');document.body.classList.remove('modal-open');}if(returnFocus?.isConnected)requestAnimationFrame(()=>returnFocus.focus());resolve(value);};
    modal.querySelector('[data-confirm-cancel]').onclick=()=>finish(null);
    modal.querySelector('form').onsubmit=(event)=>{event.preventDefault();const value=reason?String(new FormData(event.currentTarget).get('reason')||'').trim():true;if(reason&&value.length<5)return;finish(value);};
    document.body.append(modal);$('#portal-shell')?.setAttribute('inert','');document.body.classList.add('modal-open');requestAnimationFrame(()=>{const target=modal.querySelector('[data-modal-initial-focus]')||focusableIn(modal)[0]||modal;target.focus();});
  });
}
async function hydrateModalFromLocation() {
  state.editing = null; state.resultWatcherId = null; state.resultSnapshotId = null; state.notificationActivityWatcherId = null; state.notificationActivity = null;
  if (!state.bootstrap) return;
  const query = new URLSearchParams(location.search); const modal = query.get('modal'); const watcherId = query.get('watcher'); const snapshotId = query.get('snapshot');
  if (modal === 'watcher' && watcherId) {
    const watcher = state.bootstrap.watchers.find((item) => item.id === watcherId);
    if (watcher) state.editing = structuredClone(watcher);
  } else if (modal === 'new-watcher') {
    state.editing = await api('/api/watchers/template',{method:'POST',body:'{}'});
  } else if (modal === 'last-check' && watcherId && (state.bootstrap.watchers.some((item) => item.id === watcherId)||state.bootstrap.snapshots.some((item)=>item.watcherId===watcherId&&(!snapshotId||item.id===snapshotId)))) {
    state.resultWatcherId = watcherId;
    if (snapshotId && state.bootstrap.snapshots.some((item) => item.id === snapshotId && item.watcherId === watcherId)) state.resultSnapshotId = snapshotId;
    const targetSnapshot=state.resultSnapshotId?state.bootstrap.snapshots.find((item)=>item.id===state.resultSnapshotId):latestSnapshot(watcherId);
    if(targetSnapshot){try{await refreshSnapshotAssets(targetSnapshot.id,{force:true,timeoutMs:12000});}catch(error){toast(`Results opened, but screenshot links could not be refreshed: ${error.message}`,'error');}}
  } else if (['notification-activity','check-status'].includes(modal) && watcherId && state.bootstrap.watchers.some((item) => item.id === watcherId)) {
    state.notificationActivityWatcherId=watcherId;
    try{state.notificationActivity=await api(`/api/watchers/${encodeURIComponent(watcherId)}/notification-activity`);}catch(error){state.notificationActivity=null;toast(`Notification activity could not be loaded: ${error.message}`,'error');}
  }
}

async function api(path, options={}) {
  const controller = new AbortController(); const timeoutMs=Number(options.timeoutMs??12000);const {timeoutMs:_timeoutMs,...requestOptions}=options;const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try {
    const response = await auth.fetch(path,{...requestOptions,headers:{...headers,...requestOptions.headers},signal:controller.signal});
    const body = await response.json().catch(()=>({}));
    if(!response.ok) { markHealth(response.status < 500); throw Object.assign(new Error(body.error || `Request failed (${response.status})`),{details:body.details,status:response.status,code:body.code}); }
    markHealth(true); return body;
  } catch(error) { if(error.name === 'AbortError') error = new Error('CLOVERSIGHT did not answer in time. Your draft remains local.'); if(!error.status || error.status >= 500) markHealth(false); throw error; }
  finally { clearTimeout(timer); }
}
function markHealth(healthy){
  state.health=healthy?'healthy':'unhealthy';
  const form=$('#watcher-form');
  if(form){
    $('#offline-note',form)?.classList.toggle('hidden',healthy);
    const publishButton=$('button[type="submit"]',form);
    if(publishButton)publishButton.disabled=!healthy;
    const recoverButton=$('[data-action="publish-recovered"]',form);
    if(recoverButton)recoverButton.disabled=!healthy||!state.draftPending;
  }
  const node=$('#health');
  if(!node)return;
  node.className=`badge ${healthy?'green':'red'}`;
  node.textContent=healthy?'API connected':'Working offline';
  node.title=healthy?'Customer API connectivity is healthy. Open System status for public platform scope.':'The customer API could not be reached from this browser.';
}
function toast(message, kind=''){const node=$('#toast');node.textContent=message;node.className=`toast ${kind}`;setTimeout(()=>node.classList.add('hidden'),5200);}
function clearFormErrors(form){
  if(!form)return;
  $$('[data-form-error]',form).forEach((node)=>node.remove());
  $$('[data-error-description]',form).forEach((control)=>{const errorId=control.dataset.errorDescription;const ids=(control.getAttribute('aria-describedby')||'').split(/\s+/).filter((id)=>id&&id!==errorId);if(ids.length)control.setAttribute('aria-describedby',ids.join(' '));else control.removeAttribute('aria-describedby');control.removeAttribute('aria-invalid');delete control.dataset.errorDescription;});
}
function showFormError(form,message,controls=[]){
  if(!form){toast(message,'error');return;}
  clearFormErrors(form);
  const summary=document.createElement('div');summary.className='notice error form-error-summary';summary.dataset.formError='';summary.tabIndex=-1;summary.setAttribute('role','alert');summary.textContent=message;(form.querySelector('.modal-form-body')||form).prepend(summary);
  if(controls.length){const error=document.createElement('small');error.id=`form-error-${crypto.randomUUID()}`;error.className='error-copy';error.dataset.formError='';error.textContent=message;(controls[0].closest('fieldset,.field')||controls[0].parentElement).append(error);for(const control of controls){const ids=(control.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);control.setAttribute('aria-describedby',[...ids,error.id].join(' '));control.dataset.errorDescription=error.id;control.setAttribute('aria-invalid','true');}}
  summary.focus();
}
async function load(){try{state.bootstrap=await api('/api/customer/bootstrap');}catch(error){const status=await api('/api/billing/cancellation').catch(()=>null);if(status?.closureStatus==='scheduled'){renderClosedAccount(status);return;}throw error;}const debugEnabled=['localhost','127.0.0.1'].includes(location.hostname)||state.bootstrap.debug?.enabled===true;const debugNav=document.querySelector('[data-view="debug"]');if(debugNav)debugNav.dataset.debugAvailable=String(debugEnabled);if((state.view==='debug'&&(!debugEnabled||!state.advancedMode))||!viewAllowed(state.view)){state.view=needsRegistration()?'profile':'dashboard';history.replaceState({},'',routeHref(state.view));}if(!needsRegistration())await hydrateModalFromLocation();render();resumeActiveCheckPolling();resumeReportPolling();}
async function reconcilePendingCheckout(sessionId=null,{announce=false}={}){if(state.bootstrap.account.hasSubscription){if(announce)toast(`Subscription active: ${currentPlan(state.bootstrap).name}.`);return {status:'completed'};}const recoverable=state.bootstrap.transactions.some((item)=>item.type==='subscription_start'&&['pending_checkout','expired','completed'].includes(item.status));if(!sessionId&&!recoverable)return null;if(announce)toast('Confirming your subscription with Stripe…');const result=await api('/api/billing/reconcile-checkout',{method:'POST',body:JSON.stringify({sessionId})});if(result.status==='completed'){await refresh();toast(`Subscription active: ${currentPlan(state.bootstrap).name}.`);}else if(announce)toast(`Stripe reports ${result.status}; webhook reconciliation is still pending.`);return result;}

const portalMenuButton=$('#portal-menu-toggle');
const portalNavigation=$('#portal-navigation');
const advancedModeButton=$('#advanced-mode');
function setPortalMenu(open,{returnFocus=false}={}){if(!portalMenuButton||!portalNavigation)return;portalMenuButton.setAttribute('aria-expanded',String(open));portalMenuButton.setAttribute('aria-label',open?'Close customer portal navigation':'Open customer portal navigation');portalNavigation.dataset.open=String(open);document.body.classList.toggle('portal-menu-open',open);if(open)portalNavigation.querySelector('button.active,button')?.focus();else if(returnFocus)portalMenuButton.focus();}
portalMenuButton?.addEventListener('click',()=>setPortalMenu(portalMenuButton.getAttribute('aria-expanded')!=='true'));
advancedModeButton?.addEventListener('click',()=>{state.advancedMode=!state.advancedMode;if(!state.advancedMode&&state.view==='debug')navigateView('dashboard');else applyAdvancedMode();});
$$('.sidebar button').forEach((button)=>button.addEventListener('click',()=>navigateView(button.dataset.view)));
document.addEventListener('keydown',(event)=>{if(handleModalKeydown(event))return;if(event.key==='Escape'){setPortalMenu(false,{returnFocus:true});$$('.watcher-actions[open]').forEach((item)=>item.removeAttribute('open'));}});
document.addEventListener('click',(event)=>{if(!event.target.closest('.app-rail')&&portalMenuButton?.getAttribute('aria-expanded')==='true')setPortalMenu(false);if(!event.target.closest('.watcher-actions'))$$('.watcher-actions[open]').forEach((item)=>item.removeAttribute('open'));});
const desktopPortal=matchMedia('(min-width: 901px)');
const handlePortalViewport=(event)=>{if(event.matches)setPortalMenu(false);};
if(typeof desktopPortal.addEventListener==='function')desktopPortal.addEventListener('change',handlePortalViewport);else desktopPortal.addListener(handlePortalViewport);
window.addEventListener('popstate',()=>void (async()=>{state.view=viewFromPath(location.pathname);await hydrateModalFromLocation();render();if(!state.editing&&!state.resultWatcherId&&!state.notificationActivityWatcherId)focusWorkspaceHeading();})());
window.addEventListener('online',()=>void healthCheck());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-state.lastFocusCheck>30000)void healthCheck();});
async function healthCheck(){state.lastFocusCheck=Date.now();try{await api('/api/health');if(state.draftPending)toast('Connection is healthy. Your draft is still local until you choose Publish recovered draft.');}catch{}}

function render(){
  if(!state.bootstrap)return;
  disposeResultImages();
  disposeResultGlobe?.(); disposeResultGlobe=null;
  if(!viewAllowed(state.view)){state.view=needsRegistration()?'profile':'dashboard';history.replaceState({},'',routeHref(state.view));}
  document.body.classList.toggle('registration-pending',needsRegistration());
  document.querySelector('body > .modal')?.remove();
  const views={dashboard:renderDashboard,watchers:renderWatchers,gallery:renderGallery,reports:renderReports,team:renderTeam,actionlog:renderActionLog,billing:renderBilling,profile:renderProfile,debug:renderDebug};
  $('#workspace').innerHTML=views[state.view]()+ (state.editing?watcherModal(state.editing):'') + (state.resultWatcherId?lastCheckModal(state.resultWatcherId,state.resultSnapshotId):'') + (state.notificationActivityWatcherId?notificationActivityModal(state.notificationActivityWatcherId):'');
  document.title=`${$('#workspace h1')?.textContent||'Customer portal'} | CLOVERSIGHT`;
  syncSidebar(); enhanceResponsiveTables(); updateTopbar(); applyAdvancedMode(); animateNumberMetrics();
  const modal=$('#workspace > .modal'); if(modal)document.body.append(modal);
  bindView(); mountResultGlobe(); startCountdowns(); startNotificationStatusPolling(); startCheckStatusPolling(); manageModalAccessibility();
}
function applyAdvancedMode(root=document){
  document.body.dataset.advancedMode=state.advancedMode?'true':'false';
  if(advancedModeButton){advancedModeButton.setAttribute('aria-pressed',String(state.advancedMode));advancedModeButton.classList.toggle('active',state.advancedMode);const status=$('[data-advanced-status]',advancedModeButton);if(status)status.textContent=state.advancedMode?'On':'Off';}
  $$('[data-advanced]',root).forEach((section)=>{const available=section.dataset.debugAvailable!=='false';section.hidden=!state.advancedMode||!available;$$('input,select,textarea,button',section).forEach((control)=>{control.disabled=!state.advancedMode||!available;});});
}
function updateTopbar(){
  const b=state.bootstrap;if(!b)return;
  $('[data-topbar-team]').textContent=b.account.legalName||'Team not named';
  $('[data-topbar-user]').textContent=`${b.viewer?.firstName||''} ${b.viewer?.lastName||''}`.trim()||b.viewer?.email||'User not named';
  const outageAlerts=b.alerts.filter((alert)=>['open','acknowledged'].includes(alert.status)&&(alert.kind==='page_outage'||(alert.reasons||[]).some((reason)=>reason.method==='outage')));
  const active=$('[data-topbar-active-outages]');if(active){active.dataset.countUp=String(outageAlerts.length);active.dataset.countDecimals='0';active.dataset.countSuffix='';if(active.dataset.animatedTarget!==`${outageAlerts.length}:0:`)active.textContent='0';}
  const recent=state.bootstrap.snapshots.find((snapshot)=>snapshot.outcome==='outage'||(snapshot.reasons||[]).some((reason)=>reason.method==='outage'));
  $('[data-topbar-recent-outage]').textContent=recent?date(recent.capturedAt):'None recorded';
}
function enhanceResponsiveTables(){$$('.portal-section table').forEach((table)=>{const labels=$$('thead th',table).map((cell)=>cell.textContent.trim());table.classList.add('responsive-records');$$('tbody tr',table).forEach((row)=>$$('td',row).forEach((cell,index)=>cell.dataset.label=labels[index]||`Field ${index+1}`));});}
function header(title, copy, action=''){return `<div class="workspace-header"><div><p class="eyebrow">Customer portal</p><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(copy)}</p></div>${action}</div>`;}
function statusBadge(status){const value=String(status??'unknown');const klass=['active','green','completed','all_clear'].includes(value)?'green':['changed','open','acknowledged','outage'].includes(value)?'pink':['failed','declined'].includes(value)?'red':'amber';return `<span class="badge ${klass}">${escapeHtml(value.replaceAll('_',' '))}</span>`;}
function incidentDetails(result,watcher=null){
  if(result?.incident?.category)return result.incident;
  const reasons=result?.reasons??[];
  const rows=result?.regionalResults??[];
  const outageRegions=[...new Set([...rows.filter((row)=>row.status==='outage').map((row)=>row.region),...reasons.filter((reason)=>reason.method==='outage').map((reason)=>reason.region)].filter(Boolean))];
  const expected=result?.expectedRegions?.length?result.expectedRegions:watcher?resultRegionIds(watcher,result):rows.map((row)=>row.region);
  const legacyPrimary=!rows.length?result?.primaryRegion:null;
  const unavailableRegions=expected.filter((region)=>region!==legacyPrimary&&!rows.some((row)=>row.region===region&&['ok','outage'].includes(row.status)));
  const outage=result?.outcome==='outage'||result?.kind==='page_outage'||reasons.some((reason)=>reason.method==='outage');
  const phrase=result?.kind==='banned_phrase'||reasons.some((reason)=>reason.method==='banned_phrase')||(result?.bannedMatches??[]).length>0;
  const category=outage?'outage':phrase?'trigger_phrase':result?.outcome==='changed'||reasons.length||result?.kind?'site_change':'none';
  const outageScope=outage?(rows.length&&outageRegions.length&&expected.length&&outageRegions.length===expected.length&&!unavailableRegions.length?'complete':outageRegions.length&&rows.some((row)=>row.status==='ok')?'regional':'unconfirmed'):null;
  const label=outage?outageScope==='complete'?'Complete outage':outageScope==='regional'?'Regional outage':'Site outage · scope unconfirmed':phrase?'Trigger phrase detected':category==='site_change'?'Site change':result?.comparisonComplete===false?'Reachable · not fully compared':'No alert detected';
  return {category,label,outageScope,outageRegions,unavailableRegions,completeEvidence:!unavailableRegions.length};
}
function resultBadge(result,watcher=null){const incident=incidentDetails(result,watcher);return `<span class="badge incident-badge incident-${escapeHtml(incident.category)} ${incident.category==='outage'?'red':incident.category==='trigger_phrase'?'amber':incident.category==='site_change'?'pink':result?.comparisonComplete===false||result?.evidenceComplete===false?'amber':'green'}">${escapeHtml(incident.label)}</span>`;}
function methodLabel(method){return ({outage:'Page outage',banned_phrase:'Trigger phrase',text_change:'Text change',pixel_change:'Visual change'})[method]||String(method??'').replaceAll('_',' ');}
function jobsForWatcher(watcherId){return (state.bootstrap.checkJobs??[]).filter((job)=>job.watcherId===watcherId).sort((a,b)=>String(b.requestedAt).localeCompare(String(a.requestedAt)));}
function latestJob(watcherId){return jobsForWatcher(watcherId)[0]??null;}
function activeJob(watcherId){return jobsForWatcher(watcherId).find((job)=>['queued','running'].includes(job.status))??null;}
function snapshotsForWatcher(watcherId){return state.bootstrap.snapshots.filter((snapshot)=>snapshot.watcherId===watcherId).sort((a,b)=>String(b.capturedAt).localeCompare(String(a.capturedAt)));}
function latestSnapshot(watcherId){return snapshotsForWatcher(watcherId)[0]??null;}
function resultWatcher(watcherId,snapshot=null){
  const watcher=state.bootstrap?.watchers.find((item)=>item.id===watcherId);if(watcher)return watcher;
  if(!snapshot||snapshot.watcherId!==watcherId||!state.bootstrap?.snapshots.some((item)=>item.id===snapshot.id&&item.watcherId===watcherId))return null;
  return {id:watcherId,name:snapshot.watcherName||'Archived watcher',archived:true,config:{url:snapshot.finalUrl||'',checkRegions:snapshot.expectedRegions??(snapshot.regionalResults??[]).map((row)=>row.region),methods:[]}};
}
function displayedWatcherStatus(watcher){const job=activeJob(watcher.id);if(job?.status==='queued')return 'queued';if(job?.status==='running')return 'checking';return watcher.status;}
function hasCheckHistory(watcherId){return Boolean(latestSnapshot(watcherId)||latestJob(watcherId));}
function jobIsNewerThanSnapshot(job,snapshot){return Boolean(job&&(!snapshot||Date.parse(job.requestedAt??0)>Date.parse(snapshot.capturedAt??0)));}
function latestCheckDisplay(watcher){const job=latestJob(watcher.id);const snapshot=latestSnapshot(watcher.id);if(jobIsNewerThanSnapshot(job,snapshot)){const status=job.status==='running'?'checking':job.status;return {at:job.completedAt??job.startedAt??job.requestedAt,status:status==='completed'?(job.outcome??'completed'):status};}return {at:snapshot?.capturedAt??watcher.lastCheckAt,status:snapshot?.outcome??watcher.lastOutcome,snapshot};}
function currentOperationalFailures(){return state.bootstrap.watchers.map((watcher)=>({watcher,job:latestJob(watcher.id),snapshot:latestSnapshot(watcher.id)})).filter(({job,snapshot})=>job?.status==='failed'&&jobIsNewerThanSnapshot(job,snapshot));}
function conciseFailure(job){const value=String(job.error||job.errorCode||'The capture worker did not complete this check.');return value.length>240?`${value.slice(0,237)}…`:value;}
function watcherOutageCount(watcher){const stats=watcher.uptimeStats;if(stats?.year===new Date().getUTCFullYear())return Number(stats.outageChecks??Math.max(0,Number(stats.totalChecks||0)-Number(stats.upChecks||0)));return snapshotsForWatcher(watcher.id).filter((snapshot)=>snapshot.outcome==='outage'||(snapshot.reasons||[]).some((reason)=>reason.method==='outage')).length;}
function uptimeTone(percent){if(percent==null)return 'neutral';if(percent>=99.9)return 'excellent';if(percent>=99)return 'healthy';if(percent>=95)return 'watch';return 'risk';}
function renderUptime(b){
  const uptime=b.uptime??{year:new Date().getFullYear(),percent:null,totalChecks:0,domains:[]};
  const percent=uptime.percent==null?null:Number(uptime.percent);
  const display=percent==null?'—':`${percent.toFixed(percent>=99?3:2).replace(/0+$/,'').replace(/\.$/,'')}%`;
  const meterValue=percent==null?0:Math.max(0,Math.min(100,percent));
  const domainCards=(uptime.domains??[]).slice(0,5).map((item)=>{
    const itemPercent=item.percent==null?'Awaiting checks':`${Number(item.percent).toFixed(item.percent>=99?3:2).replace(/0+$/,'').replace(/\.$/,'')}%`;
    return `<article class="domain-uptime ${uptimeTone(item.percent)}" style="--domain-score:${item.percent==null?0:Math.max(0,Math.min(100,Number(item.percent)))}%"><div class="domain-card-head"><div class="domain-title"><i aria-hidden="true"></i><strong>${escapeHtml(item.domain)}</strong></div><b class="domain-percent">${item.percent==null?itemPercent:countUp(item.percent,{decimals:item.percent>=99?3:2,suffix:'%'})}</b></div><div class="domain-score-track" aria-hidden="true"><i></i></div><div class="domain-stat-row"><div><strong>${countUp(item.watcherCount)}</strong><span>Watcher${item.watcherCount===1?'':'s'}</span></div><div><strong>${countUp(item.totalChecks)}</strong><span>Checks in ${uptime.year}</span></div><div class="domain-change-stat"><strong>${countUp(item.recentChangedReports)}</strong><span>Recent changes</span></div></div></article>`;
  }).join('');
  return `<section class="uptime-section" aria-labelledby="uptime-title"><div class="uptime-hero ${uptimeTone(percent)}"><div class="uptime-meter" style="--uptime:${meterValue}" role="img" aria-label="${percent==null?'No uptime checks recorded':`${display} uptime year to date`}"><div><strong>${percent==null?'—':countUp(percent,{decimals:percent>=99?3:2,suffix:'%'})}</strong><span class="uptime-caption">Uptime this year</span></div></div><div class="uptime-copy"><p class="eyebrow">Uptime this year</p><h2 id="uptime-title">Availability across monitored domains</h2><p>${uptime.totalChecks?`${countUp(uptime.upChecks)} of ${countUp(uptime.totalChecks)} completed checks reached their pages in ${uptime.year}. ${countUp(uptime.outageChecks)} outages were recorded. Content-only changes still count as online.`:'Uptime begins after the first completed check.'}</p></div></div>${domainCards?`<div class="domain-uptime-grid">${domainCards}</div>`:'<div class="empty uptime-empty">Domain uptime appears after the first completed check.</div>'}</section>`;
}
function renderDashboard(){
  const b=state.bootstrap;
  const active=b.watchers.filter((watcher)=>watcher.status==='active').length;
  const openAlerts=b.alerts.filter((alert)=>['open','acknowledged'].includes(alert.status));
  const operationalFailures=currentOperationalFailures();
  const attentionCount=openAlerts.length+operationalFailures.length;
  const green=b.watchers.filter((watcher)=>latestCheckDisplay(watcher).status==='green').length;
  const alertRows=openAlerts.map((alert)=>{const watcher=b.watchers.find((item)=>item.id===alert.watcherId);return `<tr><td>${escapeHtml(watcher?.name)}</td><td>${resultBadge(alert,watcher)}</td><td>${escapeHtml(humanizePercentages(alert.summary))}</td><td>${date(alert.openedAt)}</td><td>${statusBadge(alert.status)}</td></tr>`;});
  const failureRows=operationalFailures.map(({watcher,job})=>`<tr><td>${escapeHtml(watcher.name)}</td><td>Check infrastructure</td><td>${escapeHtml(conciseFailure(job))}</td><td>${date(job.completedAt??job.requestedAt)}</td><td>${statusBadge('failed')}</td></tr>`);
  const metrics=[
    ['tone-pink','users',active,'Active watchers'],
    ['tone-green','check',green,'Healthy last checks'],
    ['tone-orange','alert',attentionCount,'Needs attention'],
    ['tone-plum','grid',Math.max(0,b.entitlements.maxWatchers-b.watchers.length),'Watcher slots left'],
  ];
  const createAction=`<button class="header-action" data-action="new-watcher"><span>New watcher</span>${icon('arrow')}</button>`;
  return `${header('Monitoring overview','See current availability, recent changes, and items that need attention.',createAction)}
    ${renderUptime(b)}
    <div class="metrics">${metrics.map(([tone,glyph,value,label])=>`<div class="metric ${tone}"><span class="metric-icon">${icon(glyph)}</span><div class="metric-copy"><strong>${countUp(value)}</strong><span>${label}</span></div></div>`).join('')}</div>
    <section class="portal-section"><h2 class="section-title">Needs attention</h2>${attentionCount?`<div class="table-wrap"><table><thead><tr><th>Watcher</th><th>Type</th><th>Issue</th><th>Detected</th><th>Status</th></tr></thead><tbody>${[...failureRows,...alertRows].join('')}</tbody></table></div>`:'<div class="empty">No open alerts or failed checks.</div>'}</section>
    <section class="portal-section"><h2 class="section-title">Recent checks</h2><div class="table-wrap"><table><thead><tr><th>Watcher</th><th>Last check</th><th>Outcome</th><th>Next check</th><th>Results</th></tr></thead><tbody>${b.watchers.map((watcher)=>{const latest=latestCheckDisplay(watcher);return `<tr><td><strong>${escapeHtml(watcher.name)}</strong></td><td>${date(latest.at)}</td><td>${latest.snapshot?resultBadge(latest.snapshot,watcher):statusBadge(latest.status)}</td><td>${watcher.status==='active'?`<time class="next-check-countdown" data-next-check="${escapeHtml(watcher.nextCheckAt)}" title="${escapeHtml(date(watcher.nextCheckAt))}">${escapeHtml(countdownText(watcher.nextCheckAt))}</time>`:'Paused'}</td><td><button class="secondary tertiary-action" data-action="last-check" data-id="${watcher.id}" ${hasCheckHistory(watcher.id)?'':'disabled'}>View results</button></td></tr>`;}).join('')}</tbody></table></div></section>`;
}
function checkProgress(watcher){
  const active=activeJob(watcher.id);const latest=latestJob(watcher.id);
  const status=active?.status??'complete';
  const queued=status==='queued';const running=status==='running';
  const label=queued?'Check queued':running?'Checking page':'Check complete';
  const detail=queued?`Queued ${date(active.requestedAt)}`:running?`Worker started ${date(active.startedAt??active.requestedAt)}`:latest?.completedAt?`Last update ${date(latest.completedAt)}`:watcher.lastCheckAt?`Last update ${date(watcher.lastCheckAt)}`:'Ready for the first check';
  const progress=queued?18:running?68:100;
  return `<div class="check-progress ${status}" data-check-progress data-watcher-id="${escapeHtml(watcher.id)}" style="--check-progress:${progress}%" role="status" aria-label="${escapeHtml(label)}"><div><strong data-check-progress-label>${label}</strong><span data-check-progress-detail>${escapeHtml(detail)}</span></div><span class="check-progress-track" aria-hidden="true"><i></i></span></div>`;
}
function watcherRow(w){
  const job=latestJob(w.id);const snap=latestSnapshot(w.id);const running=activeJob(w.id);const enabled=w.status==='active';
  const result=snap?`${resultBadge(snap,w)}<span class="muted">${date(snap.capturedAt)}</span>`:job?`${statusBadge(job.status)}<span class="muted">${date(job.requestedAt)}</span>`:'<strong>Never checked</strong><span class="muted">No result retained yet</span>';
  const toggleLabel=enabled?'Disable':'Enable';const toggleIcon=enabled?'pause':'play';
  return `<tr data-watcher-row="${escapeHtml(w.id)}">
    <td><button type="button" class="enabled-pill status-toggle ${enabled?'':'off'}" data-action="status" data-id="${w.id}" data-status="${enabled?'paused':'active'}" aria-pressed="${enabled?'true':'false'}" title="${enabled?'Disable':'Enable'} ${escapeHtml(w.name)}">${enabled?'Yes':'No'}</button></td>
    <td><span class="watcher-name">${escapeHtml(w.name)}</span><span class="watcher-url" title="${escapeHtml(w.config.url)}">${escapeHtml(w.config.url)}</span><span class="watcher-meta-compact"><span>${intervalLabel(w.config.checkIntervalSeconds)}</span><span>${w.config.methods.map((method)=>escapeHtml(methodLabel(method))).join(' · ')}</span><span>${(w.config.checkRegions?.length?w.config.checkRegions:[state.bootstrap.regions?.[0]?.id]).filter(Boolean).map((region)=>escapeHtml(region)).join(' · ')}</span></span></td>
    <td><div class="method-list">${w.config.methods.map((method)=>`<span class="badge">${escapeHtml(methodLabel(method))}</span>`).join('')}</div></td>
    <td><div class="schedule-copy"><strong>${intervalLabel(w.config.checkIntervalSeconds)}</strong>${enabled?`<time class="next-check-countdown" data-next-check="${escapeHtml(w.nextCheckAt)}" title="${escapeHtml(date(w.nextCheckAt))}">${escapeHtml(countdownText(w.nextCheckAt))}</time>`:'<span class="muted">Paused</span>'}<span class="muted next-check-at">${date(w.nextCheckAt)}</span></div></td>
    <td><span class="watcher-outage-count">${countUp(watcherOutageCount(w))} outages</span><span class="muted">Year to date</span></td>
    <td><div class="last-result">${result}${job?.status==='failed'?'<span class="muted">Last attempt failed</span>':''}${checkProgress(w)}</div></td>
    <td data-watcher-status-for="${escapeHtml(w.id)}">${watcherStatusCell(w.checkStatus,w.notificationStatus)}</td>
    <td class="watcher-action-cell"><details class="watcher-actions"><summary><span>Actions</span><i class="control-shine" aria-hidden="true"></i></summary><div class="watcher-actions-panel">
      <button class="secondary" data-action="edit" data-id="${w.id}">${icon('edit')}<span>Edit</span></button>
      <button class="secondary" data-action="check" data-id="${w.id}" ${!enabled||Boolean(running)?'disabled':''}>${icon('play')}<span>${running?(running.status==='queued'?'Queued':'Checking…'):'Check now'}</span></button>
      <button class="secondary" data-action="status" data-id="${w.id}" data-status="${enabled?'paused':'active'}">${icon(toggleIcon)}<span>${toggleLabel}</span></button>
      <button class="secondary" data-action="last-check" data-id="${w.id}" ${hasCheckHistory(w.id)?'':'disabled'}>${icon('eye')}<span>View results</span></button>
      <button class="secondary" data-action="notification-activity" data-id="${w.id}">${icon('bell')}<span>Check status</span></button>
      ${ownerPermission()?`<button class="danger" data-action="delete" data-id="${w.id}">${icon('trash')}<span>Delete</span></button>`:''}
    </div></details></td>
  </tr>`;
}
function renderWatchers(){
  const b=state.bootstrap;
  const createAction=`<button class="header-action" data-action="new-watcher">${icon('plus')}<span>Create watcher</span></button>`;
  const rows=b.watchers.map(watcherRow).join('');
  return `${header('Watchers',`${b.watchers.length} of ${b.entitlements.maxWatchers} watcher slots used. Fastest available schedule: ${intervalLabel(b.entitlements.minIntervalSeconds)}.`,createAction)}
    <section class="portal-section watchers-section"><div class="table-wrap"><table class="watchers-table"><thead><tr><th>Enabled?</th><th>Name & URL</th><th>Methods</th><th>Schedule</th><th>Outages</th><th>Latest result</th><th>Check Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function watcherStatusCell(check, notification){
  const phase=check?.phase??'idle';const badgeClass=phase==='error'?'red':phase==='completed'?'green':['queued','running','skipped','partial'].includes(phase)?'amber':'';
  return `<div class="watcher-status-cell"><span class="badge ${badgeClass}">${escapeHtml(check?.label||'No check yet')}</span><span class="muted">Notifications: ${escapeHtml(notification?.label||'None')}</span></div>`;
}
function intervalLabel(seconds){return ({120:'Every 2 minutes',900:'Every 15 minutes',3600:'Hourly',86400:'Daily',604800:'Weekly'})[seconds]||`Every ${seconds}s`;}
function countdownText(value){
  const remaining=Date.parse(value)-Date.now();
  if(!Number.isFinite(remaining))return 'Schedule unavailable';
  if(remaining<=0)return 'Due now';
  const seconds=Math.ceil(remaining/1000);const days=Math.floor(seconds/86400);const hours=Math.floor(seconds%86400/3600);const minutes=Math.floor(seconds%3600/60);const secs=seconds%60;
  if(days)return `Next check in ${days}d ${hours}h`;
  if(hours)return `Next check in ${hours}h ${minutes}m`;
  if(minutes)return `Next check in ${minutes}m ${secs}s`;
  return `Next check in ${secs}s`;
}
function updateCountdowns(){$$('[data-next-check]').forEach((node)=>{node.textContent=countdownText(node.dataset.nextCheck);});}
function startCountdowns(){updateCountdowns();if(state.countdownTimer)return;state.countdownTimer=setInterval(()=>{if(document.visibilityState==='visible')updateCountdowns();},1000);}
async function refreshNotificationStatuses(){if(state.view!=='watchers'||document.visibilityState!=='visible'||state.notificationActivityWatcherId)return;try{const result=await api('/api/customer/notification-status',{timeoutMs:8000});for(const item of result.watchers??[]){const watcher=state.bootstrap?.watchers.find((candidate)=>candidate.id===item.watcherId);if(!watcher)continue;watcher.notificationStatus=item.status;watcher.checkStatus=item.checkStatus;const cell=document.querySelector(`[data-watcher-status-for="${CSS.escape(item.watcherId)}"]`);if(cell)cell.innerHTML=watcherStatusCell(item.checkStatus,item.status);}updateCountdowns();}catch{}}
function startNotificationStatusPolling(){if(state.notificationStatusTimer)return;state.notificationStatusTimer=setInterval(()=>void refreshNotificationStatuses(),10000);}
async function refreshModalCheckStatus(){
  const watcherId=state.notificationActivityWatcherId;if(!watcherId||document.visibilityState!=='visible')return;
  try{
    const check=await api(`/api/watchers/${encodeURIComponent(watcherId)}/check-status`,{timeoutMs:8000});
    if(state.notificationActivityWatcherId!==watcherId||!state.notificationActivity)return;
    if(JSON.stringify(check)===JSON.stringify(state.notificationActivity.checkStatus))return;
    state.notificationActivity.checkStatus=check;
    const watcher=state.bootstrap?.watchers.find((item)=>item.id===watcherId);if(watcher)watcher.checkStatus=check;
    const section=document.querySelector('[data-check-status]');if(section)section.outerHTML=checkStatusSection(check);
  }catch{}
}
function startCheckStatusPolling(){if(state.checkStatusTimer)return;state.checkStatusTimer=setInterval(()=>void refreshModalCheckStatus(),10000);}


function smsNotificationsEnabled(){return state.bootstrap?.capabilities?.notificationChannels?.sms===true;}
function recipientEditor(recipient,tierIndex,recipientIndex,totalRecipients=1){
  // New rows can reuse an ordinal after a removal; UI-only IDs must stay unique.
  const base=`recipient-${crypto.randomUUID()}`;
  const smsEnabled=smsNotificationsEnabled();
  const smsUnavailable=!smsEnabled&&recipient.channel==='sms';
  return `<div class="recipient-row" data-recipient data-recipient-id="${escapeHtml(recipient.id)}" data-team-member-id="${escapeHtml(recipient.userId||'')}">
    <input type="hidden" name="recipientUserId" value="${escapeHtml(recipient.userId||'')}">
    <div class="field recipient-name-field"><label for="${base}-name">Recipient name</label><input id="${base}-name" name="recipientName" value="${escapeHtml(recipient.name||`Recipient ${recipientIndex+1}`)}" autocomplete="off" maxlength="100" required aria-describedby="${base}-help"><div class="recipient-suggestions" role="group" aria-label="Matching team members" hidden></div><small id="${base}-help">Type at least two characters, then Tab to matching active team members. Choose a member to use their registered email and preferences.</small><small class="recipient-search-status muted" role="status" aria-live="polite"></small></div>
    <div class="field"><label for="${base}-channel">Channel</label><select id="${base}-channel" name="recipientChannel"><option value="email" ${recipient.channel==='email'||smsUnavailable?'selected':''}>Email</option>${smsEnabled?`<option value="sms" ${recipient.channel==='sms'?'selected':''}>SMS</option>`:''}</select>${smsUnavailable?'<small>SMS is disabled for this deployment. Enter an email address before publishing.</small>':''}</div>
    <div class="field"><label for="${base}-destination">${smsEnabled?'Email address or E.164 phone':'Email address'}</label><input id="${base}-destination" name="recipientDestination" value="${escapeHtml(recipient.destination)}" placeholder="${smsEnabled?'person@example.com or +14165551234':'person@example.com'}" required></div>
    <div class="field recipient-status-field"><span class="field-label">Status</span><label class="check recipient-enabled"><input type="checkbox" name="recipientEnabled" ${recipient.enabled!==false?'checked':''}><span>Enabled</span></label></div>
    <button type="button" class="secondary" data-action="remove-recipient" ${totalRecipients===1?'disabled':''}>Remove</button>
  </div>`;
}

function recipientTierEditor(tier,index){
  const tierBase=`tier-${index}`;
  const recipients=tier.recipients||[];
  return `<section class="recipient-tier card" data-tier data-tier-id="${escapeHtml(tier.id)}" aria-labelledby="${tierBase}-title">
    <div class="workspace-header"><div><p class="eyebrow">Escalation level ${index+1}</p><h3 id="${tierBase}-title">${escapeHtml(tier.name||`Level ${index+1}`)}</h3></div><button type="button" class="danger" data-action="remove-tier" ${index===0?'disabled':''}>Remove level</button></div>
    <div class="form-grid">
      <div class="field"><label for="${tierBase}-name">Level name</label><input id="${tierBase}-name" name="tierName" value="${escapeHtml(tier.name||`Level ${index+1}`)}" maxlength="80" required></div>
    <div class="field"><label for="${tierBase}-delay">Wait before notifying the next level (minutes)</label><input id="${tierBase}-delay" name="tierDelay" type="number" min="1" max="10080" value="${Number(tier.delayMinutes)||15}" required></div>
      <div class="field"><label for="${tierBase}-required">Replies needed to stop escalation</label><input id="${tierBase}-required" name="tierRequired" type="number" min="1" value="${Number(tier.requiredAcknowledgements)||1}" aria-describedby="${tierBase}-required-help" required><small id="${tierBase}-required-help">If too few recipients reply before the wait ends, CLOVERSIGHT notifies the next level.</small></div>
    </div>
    <div class="recipient-list">${recipients.map((recipient,recipientIndex)=>recipientEditor(recipient,index,recipientIndex,recipients.length)).join('')}</div>
    <button type="button" class="secondary" data-action="add-recipient">Add recipient</button>
  </section>`;
}

function watcherModal(w){
  const e=state.bootstrap.entitlements;
  const smsEnabled=smsNotificationsEnabled();
  const methods=[['outage','Page outage'],['banned_phrase','Trigger phrase'],['text_change','Text change'],['pixel_change','Visual change']];
  const intervals=[604800,86400,3600,900,120].filter((interval)=>interval>=e.minIntervalSeconds);
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="watcher-editor-title" aria-describedby="watcher-editor-intro" tabindex="-1">
    <form id="watcher-form" class="modal-panel watcher-editor">
      <div class="workspace-header modal-header"><div><p class="eyebrow">${w.status==='draft'?'Draft watcher':'Watcher settings'}</p><h2 id="watcher-editor-title">${escapeHtml(w.name||'Untitled watcher')}</h2><p id="watcher-editor-intro" class="muted">Set the page, change rules, and notification recipients.</p></div><button type="button" class="secondary tertiary-action" data-action="close-editor">Close</button></div>
      <ol class="modal-progress" aria-label="Watcher setup progress"><li>Target</li><li>Detection</li><li>Alerts</li><li>Review</li></ol>
      <input type="hidden" name="id" value="${escapeHtml(w.id||'')}"><input type="hidden" name="configRevision" value="${Number(w.configRevision||1)}">
      <div class="form-grid modal-form-body">
        <div id="offline-note" class="notice warn field full ${state.health==='healthy'?'hidden':''}">The platform is unreachable. Editing continues locally; publishing resumes when connectivity returns.</div>
        <div class="field"><label for="watch-name">Watcher name</label><input id="watch-name" name="name" value="${escapeHtml(w.name)}" autocomplete="off" required maxlength="120" data-modal-initial-focus></div>
        <div class="field"><label for="watch-url">URL</label><input id="watch-url" name="url" type="url" value="${escapeHtml(w.config.url)}" inputmode="url" autocomplete="url" required></div>
        <div class="field"><label for="interval">Check frequency</label><select id="interval" name="interval">${intervals.map((interval)=>`<option value="${interval}" ${w.config.checkIntervalSeconds===interval?'selected':''}>${intervalLabel(interval)}</option>`).join('')}</select></div>
        <fieldset class="field full region-field"><legend>Regional checks</legend>${e.maxCheckRegions>0?`<div class="checks region-checks">${state.bootstrap.regions.map((region)=>`<label class="check"><input type="checkbox" name="checkRegion" value="${escapeHtml(region.id)}" ${(w.config.checkRegions||[]).includes(region.id)?'checked':''}><span>${escapeHtml(region.name)}</span></label>`).join('')}</div><small>Select up to ${e.maxCheckRegions} regions. Leave all unchecked to use only the primary deployment region. A problem in any selected region can open an alert.</small>`:'<div class="notice">Regional checks are available on Professional, Team, Business, and Scale plans.</div>'}</fieldset>
        <fieldset class="field method-field"><legend>What to monitor</legend><div class="checks">${methods.map(([id,label])=>`<label class="check"><input type="checkbox" name="method" value="${id}" ${w.config.methods.includes(id)?'checked':''} ${e.methods.includes(id)?'':'disabled'}><span>${label}</span></label>`).join('')}</div><small>Options unavailable on your plan are shown but cannot be selected.</small></fieldset>
        <div class="field"><label for="text-threshold">Text change threshold (%)</label><input id="text-threshold" name="textThreshold" type="number" min="0" max="100" step="0.1" value="${w.config.textThresholdPercent}" aria-describedby="text-threshold-help"><small id="text-threshold-help">Compared with the latest comparable capture from the same region when available.</small></div>
        <div class="field"><label for="pixel-threshold">Visual change threshold (%)</label><input id="pixel-threshold" name="pixelThreshold" type="number" min="0" max="100" step="0.1" value="${w.config.pixelThresholdPercent}" aria-describedby="pixel-threshold-help"><small id="pixel-threshold-help">A perceptual color tolerance filters insignificant rendering noise.</small></div>
        <div class="field full"><label for="phrases">Trigger phrases</label><textarea id="phrases" name="phrases" placeholder="maintenance mode, unauthorized, service unavailable" aria-describedby="phrases-help">${escapeHtml((w.config.bannedPhrases||[]).join('\n'))}</textarea><small id="phrases-help">Paste CSV or enter one phrase per line. The first matching context appears in the alert.</small><label class="file-label" for="phrase-file">Import trigger phrases from CSV</label><input id="phrase-file" type="file" accept=".csv,text/csv"></div>
        <div class="field full advanced-setting" data-advanced><p class="advanced-setting-label">Advanced page filtering</p><label for="selectors">Ignored page selectors</label><textarea id="selectors" name="selectors" placeholder="#live-clock\n.cookie-banner" aria-describedby="selectors-help">${escapeHtml((w.config.ignoredSelectors||[]).join('\n'))}</textarea><small id="selectors-help">Use CSS selectors to exclude changing page elements. Target Picker exports can be imported below.</small><label class="file-label" for="selector-file">Import selectors from JSON</label><input id="selector-file" type="file" accept="application/json,.json"></div>
        <div class="field advanced-setting" data-advanced><label for="clear-threshold">Approvals to confirm a new reference capture</label><input id="clear-threshold" name="allClearThreshold" type="number" min="1" value="${w.config.allClearThreshold}" aria-describedby="clear-threshold-help"><small id="clear-threshold-help">Number of unique recipients who must approve the latest capture as the new expected state.</small></div>
        <div class="field advanced-setting" data-advanced><label for="ack-threshold">Replies needed to confirm ownership</label><input id="ack-threshold" name="alertReceivedThreshold" type="number" min="1" value="${w.config.alertReceivedThreshold}" aria-describedby="ack-threshold-help"><small id="ack-threshold-help">Number of unique recipients who must confirm someone is handling the alert.</small></div>
        <section class="field full escalation-editor" aria-labelledby="escalation-title"><div class="workspace-header"><div><h3 id="escalation-title">Notification escalation</h3><small>${smsEnabled?'Each level can use email, SMS, or both.':'Email is the available notification channel for this deployment.'} Each recipient reply counts once.</small></div><button type="button" class="secondary tertiary-action" data-action="add-tier">Add escalation level</button></div><div id="recipient-tiers">${w.config.recipientTiers.map(recipientTierEditor).join('')}</div></section>
        <div class="field full advanced-setting" data-advanced><label for="subject-template">Email subject template</label><input id="subject-template" name="subjectTemplate" value="${escapeHtml(w.config.templates.subject)}"></div>
        <div class="field full advanced-setting" data-advanced><label for="text-template">Email message template</label><textarea id="text-template" name="textTemplate" aria-describedby="text-template-help">${escapeHtml(w.config.templates.text)}</textarea><small id="text-template-help">Available fields: {{watcher.name}}, {{watcher.url}}, {{alert.kindLabel}}, {{alert.summary}}, {{alert.quotedMatch}}, {{alert.incidentDescription}}, {{alert.outageScopeLabel}}, {{alert.affectedRegionsLabel}}, {{alert.checkedRegionsLabel}}, {{alert.triggerMatchesLabel}}, {{responseUrl}}.</small></div>
        ${smsEnabled?`<div class="field full advanced-setting" data-advanced><label for="sms-template">SMS message template</label><textarea id="sms-template" name="smsTemplate">${escapeHtml(w.config.templates.sms)}</textarea></div>`:''}
        <div class="field full watcher-recovery" ${state.draftPending?'':'hidden'}><details><summary>Local recovery draft</summary><p class="muted">Publish the draft saved in this browser when you are ready to restore it.</p><button type="button" class="secondary tertiary-action" data-action="publish-recovered" ${state.draftPending&&state.health==='healthy'?'':'disabled'}>Publish recovered draft</button></details></div>
      </div>
      <div class="form-actions modal-actions"><button type="submit" ${state.health==='healthy'?'':'disabled'}>Publish watcher</button><button type="button" class="secondary tertiary-action" data-action="save-draft">Save draft</button><span id="draft-status" class="muted" role="status">Changes save automatically in this browser.</span></div>
    </form>
  </div>`;
}


function snapshotScreens(snapshot){return snapshot?.screenshots?.length?snapshot.screenshots:(snapshot?.pngUrl?[{profile:'desktop',label:'Desktop',pngUrl:snapshot.pngUrl,previewUrl:snapshot.previewUrl,diffUrl:null,pixelChangePercent:snapshot.pixelChangePercent}]:[]);}
function snapshotAssetUrlsFresh(snapshot,minimumLifetimeMs=60_000){return !snapshot?.assetUrlExpiresAt||Date.parse(snapshot.assetUrlExpiresAt)>Date.now()+minimumLifetimeMs;}
function snapshotScreen(snapshot,profile,region=null){const screens=region?regionScreens(snapshot,region):snapshotScreens(snapshot);return profile?screens.find((screen)=>screen.profile===profile)??null:screens[0]??null;}
function screenAssetUrl(screen,kind){if(!screen)return null;if(kind==='preview')return screen.previewUrl;if(kind==='diff')return screen.diffUrl;return screen.pngUrl;}
function snapshotAssetUrl(snapshot,profile,kind,region=null){return screenAssetUrl(snapshotScreen(snapshot,profile,region),kind);}
function syncSnapshotAssetNodes(snapshot){
  if(!snapshot?.id)return;
  $$(`[data-asset-snapshot="${CSS.escape(snapshot.id)}"]`).forEach((node)=>{
    const url=snapshotAssetUrl(snapshot,node.dataset.assetProfile,node.dataset.assetKind,node.dataset.assetRegion||null);
    if(!url)return;
    if(node instanceof HTMLImageElement){node.dataset.src=url;}
    else if(node instanceof HTMLAnchorElement)node.href=url;
  });
}
async function refreshSnapshotAssets(snapshotId,{force=false,prepareReview=false,timeoutMs=12000}={}){
  const current=state.bootstrap?.snapshots.find((item)=>item.id===snapshotId);
  if(!current)return null;
  const accountId=state.bootstrap?.account?.id;
  if(!accountId||current.accountId&&current.accountId!==accountId)throw new Error('This evidence does not belong to the active account.');
  if(!force&&!prepareReview&&snapshotAssetUrlsFresh(current))return current;
  const refreshKey=`${accountId}:${current.watcherId}:${snapshotId}:${prepareReview?'review':'links'}`;
  if(assetRefreshes.has(refreshKey))return assetRefreshes.get(refreshKey);
  const request=(async()=>{
    const refreshed=await api(`/api/customer/snapshots/${encodeURIComponent(snapshotId)}/assets${prepareReview?'?prepare=review':''}`,{timeoutMs});
    if(state.bootstrap?.account?.id!==accountId||refreshed?.id!==snapshotId||refreshed.watcherId!==current.watcherId||refreshed.accountId!==accountId)throw new Error('The refreshed evidence did not match this account, watcher, and check.');
    const index=state.bootstrap.snapshots.findIndex((item)=>item.id===snapshotId);
    if(index<0||state.bootstrap.snapshots[index].watcherId!==current.watcherId)return null;
    state.bootstrap.snapshots[index]={...state.bootstrap.snapshots[index],...refreshed};
    syncSnapshotAssetNodes(state.bootstrap.snapshots[index]);
    return state.bootstrap.snapshots[index];
  })().finally(()=>assetRefreshes.delete(refreshKey));
  assetRefreshes.set(refreshKey,request);
  return request;
}
function renderGallery(){
  const snapshots=state.bootstrap.snapshots.filter((snapshot)=>snapshotScreens(snapshot).some((screen)=>screen.pngUrl));
  if(state.archiveWatcherId){
    const watcher=state.bootstrap.watchers.find((item)=>item.id===state.archiveWatcherId);
    const selected=snapshots.filter((snapshot)=>snapshot.watcherId===state.archiveWatcherId);
    const back=`<button class="secondary tertiary-action archive-back" data-action="archive-back">${icon('arrow')}<span>All watcher archives</span></button>`;
    return `${header(watcher?.name||'Archived watcher',`${selected.length} retained result${selected.length===1?'':'s'} within your plan history window.`,back)}<div class="gallery">${selected.length?selected.map((snapshot)=>renderArchivedResultCard(snapshot,watcher)).join(''):'<div class="empty card">No retained visual results are available for this watcher.</div>'}</div>`;
  }
  const groups=new Map();
  for(const snapshot of snapshots){const items=groups.get(snapshot.watcherId)??[];items.push(snapshot);groups.set(snapshot.watcherId,items);}
  const stacks=[...groups.entries()].map(([watcherId,items])=>({watcherId,watcher:state.bootstrap.watchers.find((watcher)=>watcher.id===watcherId),items})).sort((a,b)=>String(a.watcher?.name||'Archived watcher').localeCompare(String(b.watcher?.name||'Archived watcher')));
  const archiveQuery=state.archiveSearch.trim().toLowerCase();
  const visibleStackCount=stacks.filter((group)=>!archiveQuery||String(group.watcher?.name||'Archived watcher').toLowerCase().includes(archiveQuery)).length;
  return `${header('Archived Results','Browse retained visual evidence grouped by watcher, then open a stack to review every result.','<button type="button" class="secondary tertiary-action" data-action="retry-result-images">Reload thumbnails</button>')}
    <section class="archive-search card"><div class="field"><label for="archive-watcher-search">Search watcher results</label><input id="archive-watcher-search" type="search" value="${escapeHtml(state.archiveSearch)}" placeholder="Type part of a watcher title" autocomplete="off" data-archive-search></div><span class="muted" data-archive-count role="status" aria-live="polite" aria-atomic="true">${visibleStackCount} watcher archive${visibleStackCount===1?'':'s'}</span></section>
    <div class="archive-stack-grid">${stacks.length?stacks.map(renderArchiveStack).join(''):'<div class="empty card">No archived results yet. Publish a watcher and run its first successful visual check.</div>'}</div><div class="empty card archive-filter-empty" data-archive-empty ${!stacks.length||visibleStackCount?'hidden':''}>No watcher titles match this search.</div>`;
}

function renderArchivedResultCard(snapshot,watcher){
  const screens=snapshotScreens(snapshot);
  const textChange=formatPercent(snapshot.textChangePercent);
  const visualChange=formatPercent(snapshot.pixelChangePercent);
  return `<article class="card gallery-check">
        <div class="gallery-card-art" aria-hidden="true"><span class="gallery-art-orbit orbit-one"></span><span class="gallery-art-orbit orbit-two"></span><span class="gallery-art-icon">${icon('eye')}</span><div><span>Responsive evidence</span><strong>${screens.length} saved view${screens.length===1?'':'s'}</strong></div><span class="gallery-art-sequence"><i></i><i></i><i></i></span></div>
        <div class="gallery-card-heading"><h3>${escapeHtml(watcher?.name||'Archived watcher')}</h3>${resultBadge(snapshot,watcher)}</div><p class="gallery-captured-at">Captured ${date(snapshot.capturedAt)}</p>
        <p class="gallery-change-label">Recorded comparison</p>
        <div class="gallery-change-values"><span><small>Text</small><strong>${textChange||'Not measured'}</strong></span><span><small>Visual</small><strong>${visualChange||'No comparison'}</strong></span></div>
        <button class="secondary tertiary-action review-results" data-action="last-check" data-id="${snapshot.watcherId}" data-snapshot="${snapshot.id}"><span>Review results</span><i class="button-spinner" aria-hidden="true"></i></button>
      </article>`;
}

function renderArchiveStack(group){
  const name=group.watcher?.name||'Archived watcher';
  const hidden=state.archiveSearch.trim()&&!name.toLowerCase().includes(state.archiveSearch.trim().toLowerCase());
  const cards=group.items.slice(0,4).reverse();
  const newest=group.items[0];
  return `<button type="button" class="archive-stack secondary" data-action="open-archive" data-watcher-id="${escapeHtml(group.watcherId)}" data-archive-title="${escapeHtml(name.toLowerCase())}" aria-label="Open ${escapeHtml(name)} archived results" ${hidden?'hidden':''}><span class="archive-card-hand" style="--archive-count:${cards.length}">${cards.map((snapshot,index)=>{const screen=snapshotScreens(snapshot)[0];const angle=(index-(cards.length-1)/2)*5.5;const source=screen?.previewUrl||screen?.pngUrl;return `<span class="archive-result-card" style="--archive-i:${index};--fan-x:${index*92}px;--fan-angle:${angle}deg;z-index:${index+1}">${source?`<img data-result-image data-asset-snapshot="${escapeHtml(snapshot.id)}" data-asset-profile="${escapeHtml(screen.profile)}" data-asset-kind="${screen.previewUrl?'preview':'png'}" data-src="${escapeHtml(source)}" decoding="async" width="296" height="190" alt="">`:''}<span class="archive-thumbnail-status" data-image-feedback>Loading preview…</span><span class="archive-card-shade"></span><span class="archive-card-meta"><small>${escapeHtml(date(snapshot.capturedAt))}</small>${resultBadge(snapshot,group.watcher)}</span></span>`;}).join('')}</span><span class="archive-stack-caption"><span><strong>${escapeHtml(name)}</strong><small>${group.items.length} retained result${group.items.length===1?'':'s'} · Latest ${escapeHtml(date(newest.capturedAt))}</small></span><span class="archive-open">Open ${icon('arrow')}</span></span></button>`;
}

function watcherDomain(watcher){try{return new URL(watcher.config.url).hostname.replace(/^www\./,'').toLowerCase();}catch{return 'invalid-target';}}
function reportStatusContent(job){const progress=Math.max(0,Math.min(100,Number(job.progress)||0));return `${statusBadge(job.expired?'expired':job.status)}${['queued','running'].includes(job.status)?`<div class="report-progress" style="--report-progress:${progress}%" role="progressbar" aria-label="Report generation" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i></i><span>${progress}%</span></div>`:''}${job.error?`<small class="error-copy">${escapeHtml(job.error)}</small>`:''}`;}
function reportFileContent(job){return [job.htmlDownloadUrl?`<a class="button secondary tertiary-action" href="${escapeHtml(job.htmlDownloadUrl)}">Read HTML report</a>`:'',job.downloadUrl?`<a class="button secondary tertiary-action" href="${escapeHtml(job.downloadUrl)}">Download PDF</a>`:''].filter(Boolean).join(' ')||'—';}
function reportRow(job){return `<tr data-report-id="${escapeHtml(job.id)}"><td>${date(job.requestedAt)}</td><td>${escapeHtml(job.domain==='all'?'All domains':job.domain)}</td><td>${escapeHtml(job.period)}</td><td data-report-status>${reportStatusContent(job)}</td><td data-report-file>${reportFileContent(job)}</td></tr>`;}
function syncReportRow(job){
  const body=$('[data-report-rows]');if(!body)return;
  let row=$$('[data-report-id]',body).find((node)=>node.dataset.reportId===job.id);
  if(!row){body.insertAdjacentHTML('afterbegin',reportRow(job));row=body.firstElementChild;enhanceResponsiveTables();}
  else{const status=$('[data-report-status]',row),file=$('[data-report-file]',row);const nextStatus=reportStatusContent(job),nextFile=reportFileContent(job);if(status.innerHTML!==nextStatus)status.innerHTML=nextStatus;if(file.innerHTML!==nextFile)file.innerHTML=nextFile;}
  $('[data-report-empty]')?.toggleAttribute('hidden',body.children.length>0);
}
function renderReports(){
  const jobs=state.bootstrap.reportJobs??[];const domains=[...new Set(state.bootstrap.watchers.map(watcherDomain))].sort();const allowance=Number(state.bootstrap.entitlements?.reportAllowance??0);const reportWindow=state.bootstrap.entitlements?.reportWindowSeconds===86400?'rolling 24-hour period':'rolling 30-day period';
  const rows=jobs.map(reportRow).join('');
  return `${header('Operational reports','Generate a bounded report for a standup or leadership review, with an HTML reading view and a PDF download.')}
    <section class="card report-request"><h2>Create report</h2>${allowance?`<form data-form="report" class="form-grid"><div class="field"><label for="report-domain">Scope</label><select id="report-domain" name="domain"><option value="all">All monitored domains</option>${domains.map((domain)=>`<option value="${escapeHtml(domain)}">${escapeHtml(domain)}</option>`).join('')}</select></div><div class="field"><label for="report-period">Period</label><select id="report-period" name="period"><option value="day">Day</option><option value="week" selected>Week</option><option value="month">Month</option><option value="year">Year</option></select></div><div class="profile-action-row"><button>Generate report</button></div></form><p class="muted">Reports summarize at most 5,000 retained results and 20 recent incidents. Generated files expire after seven days; this plan includes ${allowance} report${allowance===1?'':'s'} per ${reportWindow}.</p>`:'<div class="notice">PDF reports are not included on this plan. Choose Essentials or higher to generate them.</div>'}</section>
    <section class="portal-section"><h2>Recent reports</h2><p class="muted" data-report-announcement role="status" aria-live="polite" aria-atomic="true"></p><div class="table-wrap"><table><thead><tr><th>Requested</th><th>Scope</th><th>Period</th><th>Status</th><th>File</th></tr></thead><tbody data-report-rows>${rows}</tbody></table></div><div class="empty" data-report-empty ${jobs.length?'hidden':''}>No reports have been generated yet.</div></section>`;
}

function renderTeam(){
  const team=state.bootstrap.team??{members:[],invitations:[]};
  const canInvite=['localhost','127.0.0.1'].includes(location.hostname)||(state.bootstrap.account.hasSubscription&&state.bootstrap.account.planId!=='free');
  const members=team.members.map((member)=>`<tr><td><strong>${escapeHtml(`${member.firstName||''} ${member.lastName||''}`.trim()||member.email)}</strong></td><td>${escapeHtml(member.email)}</td><td>${statusBadge(member.role)}</td><td>${member.role==='owner'?'Account owner':`<button class="danger secondary" data-action="remove-member" data-id="${escapeHtml(member.id)}" data-name="${escapeHtml(member.email)}">Remove</button>`}</td></tr>`).join('');
  const invitations=team.invitations.map((invite)=>`<tr><td>${escapeHtml(invite.email)}</td><td>${date(invite.createdAt)}</td><td>${date(invite.expiresAt)}</td><td><button class="secondary tertiary-action" data-action="revoke-invite" data-id="${escapeHtml(invite.id)}">Cancel invitation</button></td></tr>`).join('');
  return `${header('Team','Invite people who can manage and run watchers under this account plan. Only the account owner can administer membership.')}
    <section class="card team-invite"><h2>Invite team member</h2>${canInvite?`<form data-form="team-invite" class="form-grid"><div class="field"><label for="team-invite-email">Email address</label><input id="team-invite-email" name="email" type="email" autocomplete="email" required></div><div class="profile-action-row"><button>Send invitation</button></div></form>`:'<div class="notice">Team invitations become available with an active paid plan.</div>'}<p class="muted">Invited members inherit this account’s watcher plan. They cannot view billing, membership administration, the action log, or owner profile details.</p></section>
    <section class="portal-section"><h2>Active members</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>${members}</tbody></table></div></section>
    <section class="portal-section"><h2>Pending invitations</h2>${invitations?`<div class="table-wrap"><table><thead><tr><th>Email</th><th>Sent</th><th>Expires</th><th>Action</th></tr></thead><tbody>${invitations}</tbody></table></div>`:'<div class="empty">No pending invitations.</div>'}</section>`;
}

function actionLabel(action){return ({'watcher.created':'Created','watcher.updated':'Edited','watcher.draft_saved':'Draft saved','watcher.active':'Enabled','watcher.paused':'Disabled','watcher.plan_adjusted':'Adjusted for plan','watcher.deleted':'Deleted','watcher.reverted':'Reverted'})[action]||String(action||'Watcher action').replace('watcher.','').replaceAll('_',' ');}
function renderActionLog(){
  const events=state.bootstrap.actionEvents??[];
  const members=state.bootstrap.team?.members??[];
  const rows=events.map((event)=>{const snapshot=event.metadata?.afterSummary||event.metadata?.beforeSummary;const name=snapshot?.name||state.bootstrap.watchers.find((watcher)=>watcher.id===event.targetId)?.name||event.targetId;const actor=members.find((member)=>member.userId===event.actorId);const actorLabel=actor?`${actor.firstName||''} ${actor.lastName||''}`.trim()||actor.email:event.actorId==='billing-plan-enforcement'?'Billing policy':event.actorId;return `<tr><td>${date(event.at)}</td><td><strong>${escapeHtml(actionLabel(event.action))}</strong></td><td>${escapeHtml(name)}</td><td>${escapeHtml(actorLabel)}</td><td>${event.revertedAt?`Reverted ${date(event.revertedAt)}`:event.reversible?`<button class="secondary tertiary-action" data-action="revert-action" data-id="${escapeHtml(event.id)}" data-name="${escapeHtml(name)}">Revert</button>`:'—'}</td></tr>`;}).join('');
  return `${header('Action log','Review watcher creations, edits, status changes, and deletions. Reverts restore the complete prior watcher configuration.')}
    <section class="portal-section action-log">${events.length?`<div class="table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Watcher</th><th>Actor</th><th>Recovery</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">No watcher changes have been recorded yet.</div>'}</section>`;
}

const PLAN_SUMMARIES=Object.freeze({
  free:'Validate CLOVERSIGHT with one tightly bounded weekly watcher.',
  essentials:'Hourly monitoring for developers and very small operations.',
  professional:'Multi-region monitoring for a small sysadmin team.',
  team:'Five-minute monitoring and escalation workflows for an operations team.',
  business:'High-frequency five-region monitoring for important systems.',
  scale:'High-volume monitoring with indefinite history and included storage.',
});
function currentPlan(bootstrap){return bootstrap.entitlements?.legacy?bootstrap.entitlements:(bootstrap.plans[bootstrap.account.planId]||bootstrap.entitlements||{id:bootstrap.account.planId,name:bootstrap.account.planId});}
function planCard(plan,account,legacyPlan=false){
  const current=!legacyPlan&&plan.id===account.planId;
  const tag=plan.id==='business'?'<span class="plan-badge">Popular</span>':plan.id==='scale'?'<span class="plan-badge">Highest</span>':'';
  const history=plan.historyDays==null?'Indefinite history':`${plan.historyDays}-day history`;
  const reports=plan.reportAllowance?`${plan.reportAllowance} PDF reports / ${plan.reportWindowSeconds===86400?'day':'month'}`:'No PDF reports';
  return `<article class="plan-card ${current?'featured current':''} ${plan.id==='scale'?'highest':''}">
    ${current?'<span class="plan-ribbon">Your plan</span>':''}
    <div class="plan-heading"><p class="eyebrow">${escapeHtml(plan.name)}</p>${tag}</div>
    <p class="price">${money(plan.priceMinor,plan.currency)} <small>/month</small></p>
    <p class="plan-summary">${escapeHtml(PLAN_SUMMARIES[plan.id]||plan.summary)}</p>
    <ul class="list-clean"><li>${Number(plan.captureCredits).toLocaleString()} regional capture credits / month</li><li>${plan.maxWatchers} watcher${plan.maxWatchers===1?'':'s'} · ${plan.maxUsers} user${plan.maxUsers===1?'':'s'}</li><li>${intervalLabel(plan.minIntervalSeconds)}</li><li>${plan.methods.includes('pixel_change')?'Responsive visual checks':'Text + outage checks'}</li><li>${plan.maxCheckRegions?`Up to ${plan.maxCheckRegions} AWS regions on ${plan.maxRegionalWatchers} watchers`:'One region per watcher'}</li><li>${plan.maxRecipientTiers} escalation tier${plan.maxRecipientTiers===1?'':'s'} · ${plan.maxRecipients} recipients</li>${plan.dailyDeliveryLimits?`<li>${Number(plan.dailyDeliveryLimits.email).toLocaleString()} email attempts/day${plan.dailyDeliveryLimits.sms?` · ${Number(plan.dailyDeliveryLimits.sms).toLocaleString()} optional SMS attempts/day`:''}</li>`:''}<li>${history} · ${reports}</li></ul>
    ${(legacyPlan||plan.selfServe===false)&&!current?'<a class="button secondary tertiary-action" href="/support#contact">Contact sales</a>':`<button class="${current?'':'secondary tertiary-action'}" data-action="plan" data-plan="${plan.id}" ${current?'disabled':''}>${current?'Current plan':'Change plan'}</button>`}
  </article>`;
}
function cancellationDescription(c) {
  if (!c) return '';
  if (c.status==='completed') return 'Subscription cancellation is confirmed. Paid monitoring has ended; reopening the account does not restart billing. Contact support before starting a new subscription.';
  if (c.status==='scheduled') return `Renewal cancellation is confirmed. Your subscription ends ${date(c.effectiveAt)}. Existing paid access continues through its verified paid period, subject to plan limits.`;
  if (c.status==='attention') return 'Cancellation needs support reconciliation. Your request is saved, but Stripe cancellation is not yet confirmed. Contact support; do not assume renewal has stopped.';
  return 'Your cancellation request is saved and is being processed. Stripe cancellation is not yet confirmed. Check this status again shortly.';
}
function renderClosedAccount(status) {
  state.bootstrap=null;localDraftsAllowed=false;
  $('#workspace').innerHTML=`<section class="card"><h1>Account closure scheduled</h1><p>New monitoring is disabled. Operational deletion is scheduled after ${date(status.deleteAfter)}, subject to payment reconciliation.</p><p role="status">${escapeHtml(cancellationDescription(status.cancellation))}</p><p>Existing invoices and refund requests remain separate. Reopening does not restart billing.</p><button data-cancellation-refresh>Refresh cancellation status</button><p><a href="mailto:support@cloversight.app">Contact support</a></p></section>`;
  $('[data-cancellation-refresh]').onclick=async()=>renderClosedAccount(await api('/api/billing/cancellation'));
}

function renderBilling(){
  const b=state.bootstrap;
  const current=currentPlan(b);
  const legacyPlan=Boolean(b.entitlements?.legacy||!b.plans[b.account.planId]);
  const usage=b.captureUsage||{used:0,allowance:b.entitlements.captureCredits||0,remaining:b.entitlements.captureCredits||0};
  const plans=['free','essentials','professional','team','business','scale'].map((id)=>b.plans[id]).filter(Boolean);
  const groups=[
    {name:'Starting plans',copy:'Validate the product or cover a small operation.',plans:plans.slice(0,2)},
    {name:'Operations teams',copy:'Multi-region visual monitoring with team workflows.',plans:plans.slice(2,4)},
    {name:'High-volume monitoring',copy:'Two-minute checks with explicit regional capture allowances.',plans:plans.slice(4,6)},
  ];
  const transactionRows=b.transactions.map((t)=>{
    const searchValue=`${t.id} ${t.planId} ${t.status} ${t.outcomeReason??''}`.toLowerCase();
    return `<tr data-transaction data-search="${escapeHtml(searchValue)}"><td>${date(t.createdAt)}</td><td><strong>${escapeHtml(b.plans[t.planId]?.name??t.planId)}</strong><br><details class="technical-id" data-advanced><summary>Transaction reference</summary><span class="mono muted">${escapeHtml(t.id)}</span></details></td><td>${money(t.amountMinor,t.currency)}${t.taxMinor!=null?` + ${money(t.taxMinor,t.currency)} tax`:''}</td><td>${statusBadge(t.status)}${t.outcomeReason?`<br><span class="muted">${escapeHtml(friendlyTransactionMessage(t.outcomeReason))}</span>`:''}</td><td>${t.paymentActionUrl?`<a class="button secondary tertiary-action" href="${escapeHtml(t.paymentActionUrl)}" target="_blank" rel="noopener">Complete payment</a>`:''}${t.canRetry?`<button class="secondary tertiary-action" data-action="retry" data-id="${t.id}">Retry</button>`:''}</td></tr>`;
  }).join('');
  return `${header('Plans & billing',`Current plan: ${current.name}. Plan changes apply immediately and include credit for unused time.`)}
    <section class="card"><h2>Subscription cancellation</h2>${b.account.cancellation?`<p role="status">${escapeHtml(cancellationDescription(b.account.cancellation))}</p><p>Confirmation email: ${escapeHtml(b.account.cancellation.confirmationEmail)}. Existing invoices and refunds are handled separately.</p><button class="secondary" data-action="refresh-cancellation">Refresh status</button>`:`<p>Stop renewal at the end of the paid period. You keep paid access until then. Cancellation is available regardless of plan, overdue payments, or usage limits.</p>${b.account.hasSubscription||b.transactions.some(t=>t.type==='subscription_start'&&['pending_checkout','reconciliation_required'].includes(t.status))?'<button class="secondary" data-action="cancel-renewal">Cancel renewal</button>':'<p>No subscription renewal is active.</p>'}`}<p>No automatic refund is issued. Account deletion is a separate action under Profile.</p></section>
    <section class="portal-section billing-plans">
      <div class="plan-intro"><div><h2>Choose a monitoring plan</h2><p>Compare check frequency, watcher limits, and visual monitoring across plans.</p></div></div>
      <div class="billing-current"><span>Current plan</span><strong>${escapeHtml(current.name)}</strong><small>${countUp(b.watchers.length)} of ${countUp(b.entitlements.maxWatchers)} watcher slots used · ${countUp(usage.used)} of ${countUp(usage.allowance)} capture credits used</small></div>
      ${b.entitlements.billingRestricted?(b.account.cancellation?'<div class="notice"><strong>Paid monitoring is restricted by cancellation.</strong> Check the cancellation status above. Reopening does not restart billing.</div>':'<div class="notice error"><strong>Paid access needs attention.</strong> The last verified paid period has ended or Stripe reported a payment issue. Monitoring and notifications are limited until billing is resolved. Contact support if payment has already succeeded.</div>'):''}
      ${legacyPlan?'<div class="notice"><strong>This is a retired CAD subscription.</strong> Contact support to move it to the USD price book without creating a second Stripe subscription.</div>':''}
      <div class="notice capture-credit-info"><strong>${countUp(usage.remaining)} of ${countUp(usage.allowance)} ${escapeHtml(current.name)} capture credits remaining this period.</strong><p>Your plan includes ${Number(usage.allowance).toLocaleString()} credits per billing period. Each scheduled or manual capture of one watcher in one AWS region uses one credit; checking the same watcher from two regions uses two. Desktop, tablet and mobile views and all enabled detectors are included in that regional capture. Platform retries use no extra credits, but a completed capture of an unavailable target does. Monitoring pauses when the allowance runs out and resumes when the next paid renewal resets credits (or at the next monthly boundary for Free)${b.account.currentPeriodEnd?` (${date(b.account.currentPeriodEnd)})`:''}.</p></div>
      <div class="plan-groups" ${b.account.cancellation?'inert aria-disabled="true"':''}>${groups.map(group=>`<section class="plan-group"><div class="plan-group-label"><strong>${group.name}</strong><span>${group.copy}</span></div><div class="plan-pair">${group.plans.map(plan=>planCard(plan,b.account,legacyPlan)).join('')}</div></section>`).join('')}</div>
    </section>
    <section class="portal-section transactions-section">
      <div class="transactions-heading"><h2>Transactions</h2><div class="transaction-tools"><label><span class="visually-hidden">Search transactions</span><input type="search" data-transaction-search placeholder="Search transactions…"></label></div></div>
      ${b.transactions.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${transactionRows}</tbody></table></div><div class="empty transactions-empty hidden" data-transaction-empty>No transactions match that search.</div>`:'<div class="empty transactions-empty">No transactions yet. Completed and pending subscription activity will appear here.</div>'}
    </section>`;
}


function bindAddressSelectors(root=document){
  $$('[data-country]',root).forEach((countrySelect)=>{
    const regionControl=countrySelect.form?.querySelector('[data-region]');if(!regionControl)return;
    const refresh=(initial=false)=>{
      const country=COUNTRIES.find((item)=>item.code===countrySelect.value);
      const saved=initial?regionControl.dataset.initial:'';
      const prior=initial?saved:'';
      const regions=country?.regions||[];
      let control=countrySelect.form.querySelector('[data-region]');
      if(!regions.length&&country){
        const input=document.createElement('input');input.id=control.id;input.name='region';input.dataset.region='';input.autocomplete='address-level1';input.required=true;input.maxLength=100;input.placeholder='Enter your state, province, or region';input.value=prior;
        control.replaceWith(input);return;
      }
      if(control.tagName!=='SELECT'){const select=document.createElement('select');select.id=control.id;select.name='region';select.dataset.region='';select.autocomplete='address-level1';select.required=true;control.replaceWith(select);control=select;}
      control.replaceChildren(new Option(country?'Select a state / province':'Select a country first',''));
      for(const region of regions)control.add(new Option(region.name,region.code||region.name));
      if(initial&&prior&&!regions.some((region)=>(region.code||region.name)===prior))control.add(new Option(`${prior} (saved)`,prior));
      control.value=prior&&[...control.options].some((option)=>option.value===prior)?prior:'';
      control.disabled=!country;
    };
    countrySelect.addEventListener('change',()=>refresh());refresh(true);
  });
}

function renderProfile(){
  const b=state.bootstrap;const account=b.account;const viewer=b.viewer||{};const owner=ownerPermission();const registering=needsRegistration();
  const local=owner&&['localhost','127.0.0.1'].includes(location.hostname);
  const field=(id,label,name,value,attributes='')=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${name}" value="${escapeHtml(value??'')}" ${attributes}></div>`;
  const countryField=(id,value)=>`<div class="field"><label for="${id}">Country</label><select id="${id}" name="country" autocomplete="country" data-country required><option value="">Select a country</option>${COUNTRIES.map((country)=>`<option value="${escapeHtml(country.code)}" ${country.code===value?'selected':''}>${escapeHtml(country.name)}</option>`).join('')}</select></div>`;
  const regionField=(id,value)=>`<div class="field"><label for="${id}">State / province / region</label><select id="${id}" name="region" autocomplete="address-level1" data-region data-initial="${escapeHtml(value||'')}" required><option value="">Select a country first</option></select></div>`;
  const userFields=`${field('user-first-name','First name','firstName',viewer.firstName,'autocomplete="given-name" required')}
    ${field('user-last-name','Last name','lastName',viewer.lastName,'autocomplete="family-name" required')}
    <fieldset class="field full profile-regions" aria-describedby="profile-regions-help"><legend>Watching regions</legend><div class="checks region-checks">${b.regions.map((region)=>`<label class="check"><input type="checkbox" name="watchingRegions" value="${escapeHtml(region.id)}" ${(viewer.watchingRegions||[]).includes(region.id)?'checked':''}><span>${escapeHtml(region.name)}</span></label>`).join('')}</div><small id="profile-regions-help">You receive a regional watcher alert only when an affected region is selected here. This preference applies across every watcher that includes you.</small></fieldset>`;
  const userProfile=`<section class="card profile-details"><h2>Personal details</h2><p class="muted">Keep your name and regional notification preferences up to date.</p><form data-form="user-profile" class="form-grid profile-form">
    ${userFields}
    <div class="profile-action-row"><button>Save my profile</button></div>
  </form></section>`;
  const ownerProfile=`<section class="card owner-profile profile-details"><form data-form="owner-profile" class="form-grid profile-form">
        <h2 class="full">${registering?'Complete registration':'Personal details'}</h2>
        ${registering?'<p class="muted full">Complete every field to finish setting up your account and start monitoring.</p>':''}
        ${userFields}
        <h2 class="full profile-section-title">Account details</h2>
        ${field('profile-legal-name','Legal or business name','legalName',account.legalName,'autocomplete="organization" required')}
        ${field('profile-contact-name','Contact name','contactName',account.contactName,'autocomplete="name" required')}
        ${field('profile-contact-email','Contact email','contactEmail',account.contactEmail,'type="email" autocomplete="email" required')}
        ${countryField('profile-country',account.country)}
        ${regionField('profile-region',account.region)}
        ${field('profile-postal','Postal / ZIP code','postalCode',account.postalCode,'autocomplete="postal-code" required')}
        <div class="field full" data-advanced><details class="technical-id"><summary>Account reference</summary><span class="mono">${escapeHtml(account.id)}</span></details></div>
        <div class="profile-action-row"><button>${registering?'Finish registration':'Save profile'}</button></div>
      </form></section>`;
  const teamAccount=`<section class="card"><h2>Team account</h2><p><strong>${escapeHtml(account.legalName)}</strong></p><p>${escapeHtml(account.contactEmail)}</p><p class="muted">Your membership uses this account’s monitoring plan. Billing, owner profile fields, team administration, and account recovery controls are visible only to the account owner.</p></section>`;
  const closure=owner?`<section class="card account-closure"><h2>Close this account</h2><p>Closure disables new monitoring immediately, requests immediate Stripe cancellation, and starts the deletion grace period. Cancellation is confirmed separately. Reopening through support does not restart billing.</p><p>After that date, the account enters deletion processing. Records retained for accounting, fraud prevention, or legal obligations remain restricted. Contact support for a specific personal-data deletion request.</p>${account.closureStatus==='scheduled'?`<div class="notice warn">Closure is scheduled after ${date(account.deleteAfter)}. Contact support before that date to restore monitoring.</div>`:`<div class="profile-action-row"><button class="danger" data-action="close-account">Schedule account closure</button></div>`}</section>`:'';
  return `${header(registering?'Finish registration':'My profile',registering?'Set up your profile to finish creating your monitoring account.':'Manage your name, contact details, and watching regions.')}
    <div class="profile-stack">${owner?ownerProfile:userProfile+teamAccount}<section class="card"><h2>My profile data</h2><p class="muted">Your profile and membership only. Contact support for other privacy requests.</p><button type="button" class="secondary" data-action="export-personal-data">Download my profile data</button><p data-export-status role="status" aria-live="polite"></p></section>${registering?'':closure}
    ${local?`<section class="card local-identity"><p class="eyebrow">Local developer identity</p><h2>Create a separate test customer</h2><p>This creates local-only state and switches this browser to the new account. It does not create credentials or contact providers.</p><form data-form="local-register" class="form-grid profile-form">
      ${field('local-legal-name','Legal or business name','legalName','','autocomplete="organization" required')}
      ${field('local-contact-name','Contact name','contactName','','autocomplete="name"')}
      ${field('local-email','Email','contactEmail','','type="email" autocomplete="email" required')}
      ${countryField('local-country','CA')}
      ${regionField('local-region','ON')}
      ${field('local-postal','Postal / ZIP code','postalCode','','autocomplete="postal-code" required')}
      <button>Create and switch</button><button type="button" class="secondary" data-action="switch-demo">Switch to seeded demo</button>
    </form></section>`:''}</div>`;
}

function renderDebug(){const b=state.bootstrap;const local=['localhost','127.0.0.1'].includes(location.hostname);const runtime=local?'Local development':'Managed staging runtime';return `${header('Developer desk','A privacy-safe health summary for troubleshooting this browser session.')}<div class="grid-3 debug-grid"><section class="card"><h3>API health</h3><p>${statusBadge(state.health)}</p><button class="secondary" data-action="health">Check now</button></section><section class="card"><h3>Recovery draft</h3><p>${state.draftPending?'A local recovery draft is waiting to be published.':'No unpublished recovery draft.'}</p><button class="secondary" data-action="clear-draft" ${state.draftPending?'':'disabled'}>Clear local draft</button></section><section class="card"><h3>Runtime</h3><p><strong>${runtime}</strong></p><p class="muted">${b.watchers.length} watcher records and ${b.snapshots.length} retained results are available to this session.</p></section></div><section class="card debug-privacy"><h2>Privacy-safe diagnostics</h2><p>Customer destinations, full watcher URLs, provider identifiers, and bootstrap payloads are intentionally omitted. Use server logs with a request ID for deeper operational investigation.</p></section>`;}


function displayHunkParts(hunk){if(hunk.beforeSegments?.length||hunk.afterSegments?.length)return hunk;const before=String(hunk.before||'').split(' ').filter(Boolean);const after=String(hunk.after||'').split(' ').filter(Boolean);let prefix=0;while(prefix<before.length&&prefix<after.length&&before[prefix]===after[prefix])prefix+=1;let suffix=0;while(suffix<before.length-prefix&&suffix<after.length-prefix&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix+=1;const left=before.slice(0,prefix);const right=before.slice(before.length-suffix);const removed=before.slice(prefix,before.length-suffix);const added=after.slice(prefix,after.length-suffix);const segments=(changed,type)=>[{type:'context',text:left.join(' ')},{type,text:changed.join(' ')},{type:'context',text:right.join(' ')}].filter(segment=>segment.text);return {...hunk,removed,added,beforeSegments:segments(removed,'removed'),afterSegments:segments(added,'added')};}
function renderDiffSegments(segments,fallback){if(!segments?.length)return escapeHtml(fallback||'No text');return segments.map(segment=>`<span class="diff-inline ${segment.type==='context'?'':escapeHtml(segment.type)}">${escapeHtml(segment.text)}</span>`).join(' ');}
function exactTextChange(hunk){const removed=hunk.removed??[];const added=hunk.added??[];if(!removed.length&&!added.length)return '';return `<div class="diff-exact">${removed.length?`<p><strong>Removed:</strong> <span class="diff-inline removed">${escapeHtml(removed.join(' '))}</span></p>`:''}${added.length?`<p><strong>Added:</strong> <span class="diff-inline added">${escapeHtml(added.join(' '))}</span></p>`:''}</div>`;}
function textDiffPanel(snapshot){const diff=snapshot?.textDiff;const banned=snapshot?.bannedMatches??[];if(!diff?.hunks?.length&&!banned.length)return `<section class="card result-section"><h3>Text details</h3><p>${snapshot?.textChangePercent>0?'The source changed, but no bounded text excerpt was retained for this legacy check.':snapshot?.textChangePercent==null?'No text comparison is available for this check.':'No normalized text changes were detected.'}</p></section>`;return `<section class="card result-section"><div class="result-section-heading"><div><h3>Text changes</h3>${diff?`<p class="muted"><span class="diff-count added">+${diff.addedWords} words</span> <span class="diff-count removed">−${diff.removedWords} words</span>${diff.truncated?' · representative excerpts':''}</p>`:''}</div></div>${diff?.hunks?.map((hunk,index)=>{const shown=displayHunkParts(hunk);return `<article class="text-diff-hunk"><p class="eyebrow">Change ${index+1}</p>${exactTextChange(shown)}<div class="text-diff-grid"><div><strong>Before</strong><p class="diff-copy removed">${renderDiffSegments(shown.beforeSegments,shown.before)}</p></div><div><strong>After</strong><p class="diff-copy added">${renderDiffSegments(shown.afterSegments,shown.after)}</p></div></div></article>`;}).join('')||''}${banned.length?`<div class="notice warn"><strong>Matched monitored phrase${banned.length===1?'':'s'}</strong>${banned.slice(0,5).map(item=>`<p>${item.region?`<span class="badge">${escapeHtml(item.region)}</span> `:''}“${escapeHtml(item.quote)}”</p>`).join('')}</div>`:''}</section>`;}
function heatmapLegend(screen){const change=screen.dimensionChange||{};return `<span class="heatmap-key changed"><i aria-hidden="true"></i> Changed pixels</span>${change.addedHeight||change.addedWidth?'<span class="heatmap-key added"><i aria-hidden="true"></i> Added area</span>':''}${change.removedHeight||change.removedWidth?'<span class="heatmap-key removed"><i aria-hidden="true"></i> Removed section</span>':''}`;}
function dimensionChangeNotice(screen){const change=screen.dimensionChange||{};const parts=[];if(change.addedHeight)parts.push(`The hard-edged green band marks ${change.addedHeight} px of newly added page height.`);if(change.removedHeight)parts.push(`The coral boundary and inward arrows mark where ${change.removedHeight} px of page height were removed.`);if(change.addedWidth)parts.push(`${change.addedWidth} px of added width is highlighted green.`);if(change.removedWidth)parts.push(`${change.removedWidth} px of removed width is marked at the current edge.`);return parts.length?`<div class="notice heatmap-dimension-note">${escapeHtml(parts.join(' '))}</div>`:screen.dimensionsChanged?'<div class="notice heatmap-dimension-note">The capture dimensions changed; unavailable pixels beyond the current edge remain included in the percentage.</div>':'';}
function regionalDiffCopy(screen,snapshot){
  const compared=screen.comparisonAvailable||screen.pixelChangePercent!=null;
  if(compared && Number(screen.pixelChangePercent)===0)return 'This profile matched its earlier regional screenshot. No change overlay is needed.';
  if(compared && !screen.hasDiff&&!screen.diffUrl)return 'The visual comparison completed, but no change overlay was retained.';
  if(screen.hasDiff && !screen.diffUrl)return 'The comparison overlay link is unavailable. Try reopening this check.';
  if(!snapshot.previousSnapshotId)return 'No earlier retained check is available. A previous regional screenshot is needed to show a diff.';
  return 'No comparable earlier screenshot was available for this region and device profile.';
}
function visualDiffPanel(snapshot,watcher,regionId=null,mode='screenshots'){
  const screens=snapshotScreens(snapshot);if(!screens.length)return '';
  const profileId=(profile)=>`result-${snapshot.id}-${regionId||'primary'}-${profile}`;
  const comparison=state.bootstrap.snapshots.find((item)=>item.id===snapshot.comparisonSnapshotId&&item.watcherId===watcher.id);
  const comparisonAt=snapshot.comparisonCapturedAt||comparison?.capturedAt;
  const comparisonCopy=screens.some((screen)=>screen.comparisonAvailable||screen.pixelChangePercent!=null)
    ? `Available device comparisons use an earlier capture from this region${comparisonAt?` at ${date(comparisonAt)}`:''}.`
    : snapshot.baselineEstablished?'This is a reference capture for this region; a later check can compare against it.':'No comparable earlier screenshot was available for this region.';
  return `<section class="card result-section visual-results" data-evidence-watcher="${escapeHtml(watcher.id)}" data-evidence-snapshot="${escapeHtml(snapshot.id)}" data-evidence-region="${escapeHtml(regionId||'')}">
    <div class="result-section-heading"><div><h3>${escapeHtml(regionId||'Primary region')} · ${mode==='diff'?'Visual comparison':'Screenshots'}</h3><p class="muted result-evidence-context">${escapeHtml(watcher.name)} · ${snapshot.capturedAt?escapeHtml(date(snapshot.capturedAt)):'Regional capture time unavailable'}</p><p class="muted">${escapeHtml(comparisonCopy)} Each comparison uses the same region and device size.</p></div>
      <div class="screen-tabs" role="tablist" aria-label="Screenshot profile">${screens.map((screen,index)=>`<button type="button" id="${escapeHtml(profileId(screen.profile))}-tab" class="secondary tertiary-action ${index===0?'active':''}" data-action="screen-tab" data-profile="${escapeHtml(screen.profile)}" role="tab" aria-controls="${escapeHtml(profileId(screen.profile))}-panel" aria-selected="${index===0?'true':'false'}" tabindex="${index===0?'0':'-1'}">${escapeHtml(screen.label||screen.profile)} <span>${formatPercent(screen.pixelChangePercent)||'not compared'}</span></button>`).join('')}</div></div>
    ${screens.map((screen,index)=>{
      const reviewUrl=screen.previewUrl||screen.pngUrl;const reviewKind=screen.previewUrl?'preview':'png';
      const overlayControl=screen.diffUrl?`<label class="check heatmap-toggle"><input type="checkbox" data-action="heatmap" data-profile="${escapeHtml(screen.profile)}" aria-describedby="${escapeHtml(profileId(screen.profile))}-overlay-status" checked><span>Change overlay</span></label><span id="${escapeHtml(profileId(screen.profile))}-overlay-status" class="error-copy" data-overlay-status role="status" aria-live="polite" hidden></span>${heatmapLegend(screen)}`:`<span class="muted">${escapeHtml(regionalDiffCopy(screen,snapshot))}</span>`;
      return `<div class="screen-panel" id="${escapeHtml(profileId(screen.profile))}-panel" role="tabpanel" aria-labelledby="${escapeHtml(profileId(screen.profile))}-tab" tabindex="0" data-screen-panel="${escapeHtml(screen.profile)}" ${index===0?'':'hidden'}>
        ${mode==='diff'&&!screen.diffUrl?`<div class="notice result-diff-explanation">${escapeHtml(regionalDiffCopy(screen,snapshot))}</div>`:''}
        <div class="screen-stage" data-screen-stage><span class="screen-loading" role="status" aria-live="polite">Preparing ${escapeHtml((screen.label||screen.profile).toLowerCase())} evidence…</span>
          ${reviewUrl?`<img class="screen-capture" data-result-image data-asset-snapshot="${escapeHtml(snapshot.id)}" data-asset-region="${escapeHtml(regionId||'')}" data-asset-profile="${escapeHtml(screen.profile)}" data-asset-kind="${reviewKind}" data-src="${escapeHtml(reviewUrl)}" decoding="async" alt="${screen.previewUrl?'Review-size':'Full'} ${escapeHtml(screen.label||screen.profile)} screenshot for ${escapeHtml(watcher.name)} in ${escapeHtml(regionId||'the primary region')}">`:''}
          <img class="diff-overlay" data-result-image data-diff-overlay="${escapeHtml(screen.profile)}" data-asset-snapshot="${escapeHtml(snapshot.id)}" data-asset-region="${escapeHtml(regionId||'')}" data-asset-profile="${escapeHtml(screen.profile)}" data-asset-kind="diff" data-src="${escapeHtml(screen.diffUrl||'')}" alt="" ${screen.diffUrl?'':'hidden'}><span class="screen-error" role="alert" ${reviewUrl?'hidden':''}>Screenshot evidence could not be loaded. Use Reload evidence below to try again.</span></div>
        <div class="screen-toolbar"><a class="button secondary tertiary-action" href="${escapeHtml(screen.pngUrl||'#')}" target="_blank" rel="noopener" data-asset-open data-asset-snapshot="${escapeHtml(snapshot.id)}" data-asset-region="${escapeHtml(regionId||'')}" data-asset-profile="${escapeHtml(screen.profile)}" data-asset-kind="png">Open full capture</a><button type="button" class="secondary tertiary-action" data-action="retry-evidence-images">Reload evidence</button>${overlayControl}</div>${dimensionChangeNotice(screen)}</div>`;
    }).join('')}</section>`;
}
function responsiveViewsPanel(snapshot,watcher,region){
  const row=(snapshot.regionalResults??[]).find((item)=>item.region===region);
  const screens=regionScreens(snapshot,region);
  const regionName=state.bootstrap.regions?.find((item)=>item.id===region)?.name||region||'Primary region';
  return `<section class="responsive-views card" aria-labelledby="responsive-views-title"><div class="responsive-views-heading"><div><p class="eyebrow">One check, three views</p><h3 id="responsive-views-title">Desktop · Tablet · Mobile</h3><p class="muted">${escapeHtml(regionName)} · Compare each captured device view with its own earlier regional capture.</p></div></div><div class="responsive-view-grid">${[['desktop','Desktop'],['tablet','Tablet'],['mobile','Mobile']].map(([profile,label])=>{
    const screen=screens.find((item)=>item.profile===profile);
    const compared=screen&&(screen.comparisonAvailable||screen.pixelChangePercent!=null);
    const changed=compared&&Number(screen.pixelChangePercent)>0;
    const visualAlert=regionReasons(snapshot,region).some((reason)=>reason.method==='pixel_change');
    const status=row?.status==='outage'?'Site outage':!screen?'Not captured':changed?visualAlert?'Visual difference':'Within thresholds':compared?'Matched':'Not compared';
    const tone=row?.status==='outage'?'red':changed?visualAlert?'pink':'':compared?'green':'amber';
    const source=screen?.previewUrl||screen?.pngUrl;
    return `<article class="responsive-view-card ${profile}"><div class="responsive-view-card-head"><span class="device-outline device-${profile}" aria-hidden="true"></span><h4>${label}</h4><span class="badge ${tone}">${status}</span></div><div class="responsive-view-art">${source?`<img data-result-image data-asset-snapshot="${escapeHtml(snapshot.id)}" data-asset-region="${escapeHtml(region||'')}" data-asset-profile="${profile}" data-asset-kind="${screen.previewUrl?'preview':'png'}" data-src="${escapeHtml(source)}" decoding="async" alt="${label} capture preview"><span data-image-feedback>Loading preview…</span>`:`<span>${row?.status==='outage'?'The website did not respond as expected.':'No screenshot retained for this device.'}</span>`}</div><p class="responsive-view-metric">${compared?`<strong>${escapeHtml(formatPercent(screen.pixelChangePercent)||'Not measured')}</strong> visual change`:'No earlier comparable capture'}</p><button type="button" class="secondary tertiary-action" data-action="result-profile" data-profile="${profile}" ${screen?'':'disabled'}>Review ${label.toLowerCase()}</button></article>`;
  }).join('')}</div></section>`;
}
function resultIncidentPanel(snapshot,watcher){
  const incident=incidentDetails(snapshot,watcher);
  const expected=resultRegionIds(watcher,snapshot);
  const outageRegions=incident.outageRegions??[];
  const establishingReference=(snapshot.regionalResults??[]).length>0&&(snapshot.regionalResults??[]).every((row)=>row.status==='ok'&&row.baselineEstablished);
  const incomplete=incident.category==='none'&&!establishingReference&&(snapshot.comparisonComplete===false||snapshot.evidenceComplete===false);
  const coverage=incident.category==='outage'?incident.outageScope==='complete'?`The website failed in all ${expected.length} monitored region${expected.length===1?'':'s'} for this check.`:outageRegions.length?`Website failure recorded in ${outageRegions.length} of ${expected.length} monitored regions: ${outageRegions.join(', ')}.`:'A website failure was detected; this older result does not retain enough regional evidence to confirm its scope.':incident.category==='trigger_phrase'?'A configured trigger phrase was found in the captured page content.':incident.category==='site_change'?'A configured text or visual threshold was crossed.':establishingReference?'A first successful reference capture was saved for each monitored region. Later checks compare the matching region and device against this evidence.':incomplete?'Some capture or comparison evidence was unavailable. This result cannot confirm that every region and device matched.':'No configured alert condition was detected in the available evidence.';
  const otherSignals=[...(incident.triggerRegions?.length&&incident.category==='outage'?['Trigger phrases were also detected.']:[]),...(incident.changeRegions?.length&&['outage','trigger_phrase'].includes(incident.category)?['Text or visual changes were also detected.']:[])];
  return `<section class="result-incident incident-${escapeHtml(incident.category)} ${incomplete?'incident-incomplete':''}" aria-label="Check outcome"><div>${resultBadge(snapshot,watcher)}<h3>${escapeHtml(incident.label)}</h3><p>${escapeHtml(coverage)}</p>${otherSignals.length?`<p>${escapeHtml(otherSignals.join(' '))}</p>`:''}${incident.unavailableRegions?.length?`<p class="result-coverage-note">Capture unavailable in ${escapeHtml(incident.unavailableRegions.join(', '))}; these regions do not confirm whether the website was up or down.</p>`:''}</div><time datetime="${escapeHtml(snapshot.capturedAt)}">${escapeHtml(date(snapshot.capturedAt))}</time></section>`;
}
function resultCoveragePanel(snapshot,watcher){
  const ids=resultRegionIds(watcher,snapshot);
  const rows=snapshot.regionalResults??[];
  return `<section class="card result-section result-coverage"><h3>Regional evidence coverage</h3><p class="muted">A missing comparison means “not compared”. Differences may be visible in fewer regions when their earlier reference captures differ.</p><ul>${ids.map((region)=>{
    const row=rows.find((item)=>item.region===region);
    const legacy=!rows.length&&region===(snapshot.primaryRegion||state.bootstrap.regions?.[0]?.id);
    const status=row?.status??(legacy?snapshot.outcome==='outage'?'outage':'ok':null);
    const text=row?.textChangePercent??(legacy?snapshot.textChangePercent:null);
    const pixel=row?.pixelChangePercent??(legacy?snapshot.pixelChangePercent:null);
    const changed=Number(text)>0||Number(pixel)>0;
    const compared=row?.comparisonComplete===false?false:row?.comparisonAvailable??(text!=null||pixel!=null);
    const reasons=regionReasons(snapshot,region);const phrase=reasons.some((reason)=>reason.method==='banned_phrase');const flagged=reasons.some((reason)=>['text_change','pixel_change'].includes(reason.method));
    const label=status==='outage'?'Site outage':status!=='ok'?'Capture unavailable':phrase?'Trigger phrase detected':flagged?'Site change':changed?'Within thresholds · variation':compared?'Compared · matched':row?.baselineEstablished?'Reference capture':'Reachable · not compared';
    const comparisonAt=row?.comparisonCapturedAt;
    return `<li><div><strong>${escapeHtml(state.bootstrap.regions?.find((item)=>item.id===region)?.name||region)}</strong><small>${escapeHtml(region)}</small></div><div><span class="badge ${status==='outage'?'red':phrase||status!=='ok'||!compared?'amber':flagged?'pink':'green'}">${escapeHtml(label)}</span><small>${comparisonAt?`Earlier capture: ${escapeHtml(date(comparisonAt))}`:changed||compared?'Compared with an earlier capture in this region':'No completed comparison'}${status==='ok'&&row?.comparisonComplete===false?' · Some comparisons unavailable':''}</small></div></li>`;
  }).join('')}</ul></section>`;
}

const RESULT_GEO = Object.freeze({
  'us-east-1': [38.0, -78.5], 'us-east-2': [40.1, -83.0],
  'us-west-2': [45.5, -122.7], 'ca-central-1': [45.5, -73.6],
  'eu-west-1': [53.35, -6.26],
});
function resultRegionIds(watcher,snapshot){
  const capturedRegions=snapshot.expectedRegions?.length?snapshot.expectedRegions:(snapshot.regionalResults??[]).length?(snapshot.regionalResults??[]).map((item)=>item.region):[snapshot.primaryRegion||state.bootstrap.regions?.[0]?.id];
  return [...new Set(capturedRegions.filter(Boolean))];
}
function initialResultRegion(watcher,snapshot){const ids=resultRegionIds(watcher,snapshot);return ids.includes(state.resultRegionId)?state.resultRegionId:ids.includes(snapshot.primaryRegion)?snapshot.primaryRegion:ids[0];}
function regionScreens(snapshot,region){
  const found=(snapshot.regionalResults??[]).find((item)=>item.region===region);
  if(found)return found.screenshots??[];
  // Only old, single-region snapshots lack regionalResults. Never show their
  // primary screenshots under another region's heading.
  return !(snapshot.regionalResults??[]).length&&region===(snapshot.primaryRegion||state.bootstrap.regions?.[0]?.id)?snapshotScreens(snapshot):[];
}
function regionReasons(snapshot,region){const row=(snapshot.regionalResults??[]).find((item)=>item.region===region);return row?.reasons??(snapshot.reasons??[]).filter((reason)=>reason.region===region||!reason.region&&region===(snapshot.primaryRegion||state.bootstrap.regions?.[0]?.id));}
function renderRegionalEvidence(snapshot,watcher,region,mode='screenshots'){
  const screens=regionScreens(snapshot,region);
  if(!screens.length)return `<div class="card result-section"><h3>${escapeHtml(region||'Regional')} · No screenshots retained</h3><p class="muted">${escapeHtml(watcher.name)} · Check ${escapeHtml(snapshot.id)}. This region did not produce screenshot evidence for this check.</p></div>`;
  if(!screens.some((screen)=>screen.pngUrl))return `<div class="card result-section"><h3>${escapeHtml(region)} · Screenshots need a fresh link</h3><p class="muted">${escapeHtml(watcher.name)} · Check ${escapeHtml(snapshot.id)}. Use “View region screenshots” or “View region diff” above to reload this region’s evidence.</p></div>`;
  const regional=(snapshot.regionalResults??[]).find((item)=>item.region===region);
  return visualDiffPanel({...snapshot,...(regional?{capturedAt:regional.capturedAt,comparisonSnapshotId:regional.comparisonSnapshotId,comparisonCapturedAt:regional.comparisonCapturedAt,baselineEstablished:regional.baselineEstablished}:{}),screenshots:screens},watcher,region,mode);
}
function resultEvidenceLoading(watcher,snapshot,region,kind){
  return `<div class="card result-section result-evidence-loading" role="status" aria-live="polite"><span class="result-evidence-spinner" aria-hidden="true"></span><div><h3>Loading ${escapeHtml(region)} ${kind==='diff'?'comparison':'screenshots'}</h3><p class="muted">Refreshing ${escapeHtml(watcher.name)} · ${escapeHtml(snapshot.id)} evidence from ${escapeHtml(region)}…</p></div></div>`;
}
async function evidenceScrollFinished(evidence){
  const modal=evidence.closest('.results-modal');
  const header=modal?.querySelector(':scope > .modal-header');
  if(header)modal.style.setProperty('--result-header-height',`${header.getBoundingClientRect().height}px`);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){evidence.scrollIntoView({behavior:'instant',block:'start'});return;}
  const settled=new Promise((resolve)=>{
    let timer;
    const finish=()=>{clearTimeout(timer);modal?.removeEventListener('scrollend',finish);resolve();};
    timer=setTimeout(finish,850);
    modal?.addEventListener('scrollend',finish,{once:true});
  });
  evidence.scrollIntoView({behavior:'smooth',block:'start'});
  await settled;
}
function mountResultGlobe(){
  const target=$('[data-result-globe]');if(!target)return;
  const snapshot=state.bootstrap.snapshots.find((item)=>item.id===target.dataset.snapshot);
  const watcher=resultWatcher(snapshot?.watcherId,snapshot);
  if(!snapshot||!watcher)return;
  const initialRegion=initialResultRegion(watcher,snapshot);
  const checks=resultRegionIds(watcher,snapshot).filter((id)=>RESULT_GEO[id]).sort((left,right)=>left===initialRegion?-1:right===initialRegion?1:0).map((id)=>{
    const row=(snapshot.regionalResults??[]).find((item)=>item.region===id);
    const primary=id===(snapshot.primaryRegion||state.bootstrap.regions?.[0]?.id);
    const legacyPrimary=!row&&!(snapshot.regionalResults??[]).length&&primary;
    const status=row?.status??(legacyPrimary?(snapshot.outcome==='outage'?'outage':'ok'):null);
    const httpStatus=row?row.httpStatus:legacyPrimary?snapshot.httpStatus:null;
    const textPercent=row?row.textChangePercent:legacyPrimary?snapshot.textChangePercent:null;
    const pixelPercent=row?row.pixelChangePercent:legacyPrimary?snapshot.pixelChangePercent:null;
    const variation=textPercent>0||pixelPercent>0;
    const changed=regionReasons(snapshot,id).some((reason)=>['text_change','pixel_change','banned_phrase'].includes(reason.method));
    const comparisonKnown=(row?.comparisonComplete!==false||changed)&&(textPercent!=null||pixelPercent!=null);
    return {id,name:state.bootstrap.regions?.find((item)=>item.id===id)?.name||id,latitude:RESULT_GEO[id][0],longitude:RESULT_GEO[id][1],checkedAt:row?row.capturedAt:legacyPrimary?snapshot.capturedAt:null,statusCode:httpStatus,
      content:status==='ok'&&changed?'changed':status==='ok'&&comparisonKnown?variation?'variation':'green':'unknown',
      state:status==='internal_error'||!status?'unknown':status==='outage'?'outage':undefined,
      captureStatus:status,latencyMs:row?.durationMs??(legacyPrimary?snapshot.durationMs:undefined),error:row?.error||null,hasScreenshots:regionScreens(snapshot,id).length>0};
  });
  const evidence=$('[data-region-evidence]');
  const views=$('[data-responsive-summary]');
  let navigationToken=0;
  let disposed=false;
  const currentSnapshot=()=>state.bootstrap?.snapshots.find((item)=>item.id===snapshot.id&&item.watcherId===watcher.id);
  const currentView=()=>!disposed&&evidence?.isConnected&&state.resultWatcherId===watcher.id&&currentSnapshot();
  const selectRegion=(region)=>{
    ++navigationToken;
    state.resultRegionId=region.id;
    const current=currentView();if(!current)return;
    evidence.removeAttribute('aria-busy');
    for(const [image,record] of activeResultImages)if(evidence.contains(image)||views?.contains(image))record.cancel?.();
    evidence.innerHTML=renderRegionalEvidence(current,watcher,region.id);
    if(views){views.innerHTML=responsiveViewsPanel(current,watcher,region.id);bindEvidenceControls(views);}
    bindEvidenceControls(evidence);
    const images=[...evidenceImages(evidence),...(views?evidenceImages(views):[])];
    if(images.length)void loadResultEvidenceQueue(images);
  };
  const showRegionEvidence=async({kind,region})=>{
    const token=++navigationToken;
    const current=currentView();if(!current||!resultRegionIds(watcher,current).includes(region.id))return;
    state.resultRegionId=region.id;
    for(const [image,record] of activeResultImages)if(evidence.contains(image))record.cancel?.();
    evidence.setAttribute('aria-busy','true');
    evidence.innerHTML=resultEvidenceLoading(watcher,current,region.id,kind);
    // Fetch before scrolling; keep the spinner visible for at least two seconds
    // after scrolling ends even when S3 links are already signed.
    const refreshed=refreshSnapshotAssets(snapshot.id,{force:true,timeoutMs:12000}).then((value)=>({value}), (error)=>({error}));
    const scroll=evidenceScrollFinished(evidence);
    evidence.focus({preventScroll:true});
    try{
      await scroll;
      await sleep(2000);
      const outcome=await refreshed;
      if(outcome.error)throw outcome.error;
      const loaded=outcome.value;
      if(token!==navigationToken||!currentView())return;
      if(loaded?.id!==snapshot.id||loaded.watcherId!==watcher.id||!resultRegionIds(watcher,loaded).includes(region.id))throw new Error('The refreshed result did not match this watcher, check, and region.');
      evidence.innerHTML=renderRegionalEvidence(loaded,watcher,region.id,kind);
      if(views){for(const [image,record] of activeResultImages)if(views.contains(image))record.cancel?.();views.innerHTML=responsiveViewsPanel(loaded,watcher,region.id);bindEvidenceControls(views);}
      bindEvidenceControls(evidence);
      const images=[...evidenceImages(evidence),...(views?evidenceImages(views):[])];
      if(images.length)void loadResultEvidenceQueue(images);
      // The short loading panel could not scroll far enough at the end of
      // the dialog. Align again after the full evidence panel replaces it.
      void evidenceScrollFinished(evidence);
    }catch(error){
      if(token===navigationToken&&currentView())evidence.innerHTML=`<div class="card result-section notice error" role="alert"><h3>${escapeHtml(region.id)} evidence could not be loaded</h3><p>${escapeHtml(error.message)}</p><p>Choose the region again to retry.</p></div>`;
    }finally{if(token===navigationToken&&currentView())evidence.removeAttribute('aria-busy');}
  };
  const dispose=mountRegionalGlobe(target,checks,{onSelect:selectRegion,onAction:showRegionEvidence});
  disposeResultGlobe=()=>{disposed=true;navigationToken++;dispose();};
}
function lastCheckModal(watcherId,snapshotId=null){
  const snapshot=snapshotId?state.bootstrap.snapshots.find((item)=>item.id===snapshotId&&item.watcherId===watcherId):latestSnapshot(watcherId);
  const watcher=resultWatcher(watcherId,snapshot);if(!watcher)return '';
  const job=snapshotId?null:latestJob(watcherId);
  const newer=jobIsNewerThanSnapshot(job,snapshot);
  const jobNotice=newer&&job?.status==='failed'?`<div class="notice error"><strong>Latest check attempt failed.</strong><p>${escapeHtml(conciseFailure(job))}</p></div>`:newer&&['queued','running'].includes(job?.status)?`<div class="notice warn"><strong>Latest check is ${escapeHtml(job.status)}.</strong> Requested ${escapeHtml(date(job.requestedAt))}. Its progress is saved and continues after a page refresh.</div>`:newer&&job?.status==='skipped'?`<div class="notice warn"><strong>Latest check was not run.</strong> ${escapeHtml(job.reason||'Another check is already in progress.')}</div>`:'';
  const reasons=snapshot?.reasons??[];
  const notes=snapshot?.comparisonNotes??[];
  const region=snapshot?initialResultRegion(watcher,snapshot):null;
  const retainedContext=newer&&snapshot?`<div class="notice"><strong>Previous retained check result.</strong> This ${escapeHtml(date(snapshot.capturedAt))} result predates the latest attempt above.</div>`:'';
  const content=snapshot?`${retainedContext}${resultIncidentPanel(snapshot,watcher)}<div data-responsive-summary>${responsiveViewsPanel(snapshot,watcher,region)}</div>
    <div data-result-globe data-snapshot="${escapeHtml(snapshot.id)}" class="card result-globe"></div>${resultCoveragePanel(snapshot,watcher)}
    <div class="grid-3 result-summary"><section class="card"><h3>Primary evidence region</h3><p><strong>${escapeHtml(snapshot.primaryRegion||region||'Not retained')}</strong></p><p class="muted">The text excerpts and these totals are from this region. Explore other regions above.</p></section><section class="card"><h3>Text change</h3><p><strong>${snapshot.textChangePercent==null?'Not compared':countUp(snapshot.textChangePercent,{decimals:2,suffix:'%'})}</strong></p></section><section class="card"><h3>Visual change</h3><p><strong>${snapshot.pixelChangePercent==null?'Not compared':countUp(snapshot.pixelChangePercent,{decimals:2,suffix:'%'})}</strong></p></section></div>
    <section class="card result-section"><h3>What this check detected</h3>${reasons.length?`<ul class="result-reasons">${reasons.map((reason)=>`<li><span class="method-icon" aria-hidden="true">${reason.method==='pixel_change'?'▦':reason.method==='text_change'?'Aa':reason.method==='outage'?'!':'⌕'}</span><div><strong>${escapeHtml(methodLabel(reason.method))}</strong>${reason.region?` <span class="badge">${escapeHtml(reason.region)}</span>`:''}<p>${escapeHtml(humanizePercentages(reason.message))}</p></div></li>`).join('')}</ul>`:`<p>${snapshot.comparisonComplete===false?'No alert condition was detected in the available comparisons. Some regional evidence could not be compared.':'No configured alert condition was detected.'}</p>`}
    <p class="muted">Each region and device uses its own earlier capture. An unavailable comparison is never a confirmed match.</p>${notes.length?`<div class="notice warn">${notes.map((note)=>escapeHtml(humanizePercentages(note))).join('<br>')}</div>`:''}
    <details data-advanced><summary>Technical capture details</summary><p><strong>HTTP status:</strong> ${snapshot.httpStatus??'—'}<br><strong>Final URL:</strong> <span class="mono">${escapeHtml(snapshot.finalUrl||watcher.config.url)}</span><br><strong>Page title:</strong> ${escapeHtml(snapshot.title||'—')}<br><strong>Capture time:</strong> ${snapshot.durationMs==null?'—':`${snapshot.durationMs} ms`}</p><p class="mono muted">Result reference: ${escapeHtml(snapshot.id)}</p></details></section>
    ${textDiffPanel(snapshot)}<section data-region-evidence tabindex="-1">${renderRegionalEvidence(snapshot,watcher,region)}</section>`:'<div class="empty">No completed check result is available for this watcher yet.</div>';
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="last-check-title" tabindex="-1"><div class="modal-panel results-modal"><div class="workspace-header modal-header"><div><p class="eyebrow">${snapshotId?'Retained check results':'Latest check results'}</p><h2 id="last-check-title">${escapeHtml(watcher.name)}</h2><p class="muted">Review website availability, trigger phrases, and regional desktop, tablet, and mobile evidence.</p></div><button class="secondary tertiary-action" data-action="close-modal" data-modal-initial-focus>Close</button></div>${jobNotice}${content}</div></div>`;
}

function activityRecipientRow(recipient,tierIndex,recipientIndex,smsEnabled){
  const base=`activity-${tierIndex}-recipient-${recipientIndex}`;
  return `<div class="activity-recipient-row" data-activity-recipient data-recipient-id="${escapeHtml(recipient.id)}"><div class="field"><label for="${base}-name">Name</label><input id="${base}-name" name="activityRecipientName" value="${escapeHtml(recipient.name)}" maxlength="120" required></div><div class="field"><label for="${base}-channel">Channel</label><select id="${base}-channel" name="activityRecipientChannel"><option value="email" ${recipient.channel==='email'?'selected':''}>Email</option>${smsEnabled?`<option value="sms" ${recipient.channel==='sms'?'selected':''}>SMS</option>`:''}</select></div><div class="field activity-recipient-destination"><label for="${base}-destination">Destination</label><input id="${base}-destination" name="activityRecipientDestination" value="${escapeHtml(recipient.destination)}" required></div><button type="button" class="secondary tertiary-action" data-action="activity-remove-recipient" aria-label="Remove ${escapeHtml(recipient.name)}">Remove</button></div>`;
}
function activityTierCard(tier,activity){
  const stateLabels={queued:'Queued',waiting:'Waiting',paused:'Paused',notifying:'Notifying',retrying:'Retry scheduled',notified:'Notified',suppressed:'Not delivered',ineligible:'No eligible recipients',muted:'Muted',canceled:'Canceled'};
  const smsEnabled=activity.capabilities?.sms===true;
  const timing=tier.scheduledFor?`Scheduled for ${date(tier.scheduledFor)}`:tier.state==='queued'?'Runs after the preceding level if nobody responds.':tier.state==='waiting'?`Waiting ${tier.delayMinutes} minute${tier.delayMinutes===1?'':'s'} before the next level.`:tier.state==='ineligible'?'This level has no eligible recipients for this incident. It will be skipped unless its recipients are updated.':'';
  const deliveryByRecipient=new Map((tier.deliveries??[]).map((delivery)=>[delivery.recipientId,delivery]));
  const readonlyRecipients=`<ul class="activity-recipient-summary">${tier.recipients.map((recipient)=>{const delivery=deliveryByRecipient.get(recipient.id);return `<li><div><strong>${escapeHtml(recipient.name)}</strong><span>${escapeHtml(recipient.destination)}</span>${delivery?.detail?`<small>${escapeHtml(delivery.detail)}</small>`:''}</div><span class="badge ${delivery?.status==='sent'?'green':delivery?.status==='failed'?'red':['retry_scheduled','suppressed'].includes(delivery?.status)?'amber':''}">${escapeHtml(delivery?.status?.replaceAll('_',' ')|| (recipient.enabled?'Queued':'Disabled'))}</span></li>`;}).join('')}</ul>`;
  const editor=tier.canEdit?`<form class="activity-recipient-form" data-activity-recipient-form data-tier-id="${escapeHtml(tier.id)}"><div class="activity-recipient-list">${tier.recipients.filter((recipient)=>recipient.enabled).map((recipient,index)=>activityRecipientRow(recipient,tier.index,index,smsEnabled)).join('')}</div><div class="activity-editor-actions"><button type="button" class="secondary tertiary-action" data-action="activity-add-recipient" data-tier-index="${tier.index}">${icon('plus')}<span>Add recipient</span></button><button type="submit">Save temporary recipients</button></div><small>These recipients apply only to this detected change. The watcher’s saved escalation policy is unchanged.</small></form>`:readonlyRecipients;
  const muteAction=tier.canMute?`<button type="button" class="secondary tertiary-action activity-mute" data-action="activity-mute-tier" data-tier-id="${escapeHtml(tier.id)}" data-muted="true">Skip this level</button>`:tier.canUnmute?`<button type="button" class="secondary tertiary-action" data-action="activity-mute-tier" data-tier-id="${escapeHtml(tier.id)}" data-muted="false">Restore level</button>`:'';
  return `<article class="activity-tier ${escapeHtml(tier.state)}"><div class="activity-tier-head"><div><p class="eyebrow">Escalation level ${tier.index+1}</p><h3>${escapeHtml(tier.name)}</h3><p class="muted">${tier.requiredAcknowledgements} response${tier.requiredAcknowledgements===1?'':'s'} required${timing?` · ${escapeHtml(timing)}`:''}</p></div><span class="badge ${['notifying','retrying'].includes(tier.state)?'pink':['waiting','ineligible'].includes(tier.state)?'amber':tier.state==='notified'?'green':''}">${escapeHtml(stateLabels[tier.state]||tier.state)}</span></div>${tier.isTemporary?'<div class="notice activity-temporary"><strong>Temporary recipients active.</strong> This override ends with the current incident.</div>':''}${editor}${muteAction}</article>`;
}
function checkStatusSection(check){
  const rows=check?.regions??[];
  const badgeClass=check?.phase==='error'?'red':check?.phase==='completed'?'green':['queued','running','skipped','partial'].includes(check?.phase)?'amber':'';
  return `<section class="check-status-section" data-check-status aria-labelledby="check-phase-title"><div class="phase-heading"><div><p class="eyebrow">Phase A · Watcher check</p><h3 id="check-phase-title">Regional check status</h3><p class="muted">Progress and outcomes from this watcher’s enabled regions.</p></div><span class="badge ${badgeClass}">${escapeHtml(check?.label||'No check yet')}</span></div><ul class="check-region-list" aria-live="polite">${rows.map((row)=>{
    const tone=({complete:'green',website:'red',error:'red',trigger:'amber',changed:'pink',partial:'amber',running:'amber',queued:'amber',skipped:'amber'})[row.phase]??'';
    return `<li class="check-region"><div><strong>${escapeHtml(row.name)}</strong><span class="muted">${escapeHtml(row.id)}${row.checkedAt?` · ${escapeHtml(date(row.checkedAt))}`:''}</span></div><div><span class="badge ${tone}">${escapeHtml(row.label)}</span><span class="muted">${escapeHtml(row.detail)}</span></div></li>`;
  }).join('')}</ul></section>`;
}
function notificationActivityModal(watcherId){
  const watcher=state.bootstrap.watchers.find((item)=>item.id===watcherId);if(!watcher)return '';
  const activity=state.notificationActivity;
  if(!activity)return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="notification-activity-title" tabindex="-1"><div class="modal-panel notification-activity-modal"><div class="workspace-header modal-header"><div><p class="eyebrow">Watcher status</p><h2 id="notification-activity-title">Check Status</h2></div><button class="secondary tertiary-action" data-action="close-modal" data-modal-initial-focus>Close</button></div><div class="modal-status-body"><div class="empty">Check status is unavailable. Close this window and try again.</div></div></div></div>`;
  const intro=activity.alert?`Opened ${date(activity.alert.openedAt)} · ${escapeHtml(activity.alert.kindLabel||activity.alert.kind||'Detected change')}`:'No detected change currently has a notification queue.';
  const canceled=activity.alert?.canceledAt?`<div class="notice warn"><strong>Notification activity canceled.</strong> No queued levels or delivery retries will run. Messages already accepted by the email or SMS provider cannot be recalled.</div>`:'';
  const content=activity.alert?`<div class="activity-summary"><span class="badge ${activity.status.phase==='none'?'':['waiting','paused'].includes(activity.status.phase)?'amber':'pink'}">${escapeHtml(activity.status.label)}</span><span class="muted">${intro}</span></div>${canceled}<div class="activity-timeline">${activity.tiers.map((tier)=>activityTierCard(tier,activity)).join('')}</div>`:`<div class="empty activity-empty"><span class="activity-empty-icon">${icon('bell')}</span><h3>No notification activity</h3><p>There is no ongoing change alert or queued escalation for this watcher.</p></div>`;
  const cancel=activity.canCancel?`<div class="activity-cancel"><div><strong>Stop this incident’s notifications</strong><p>Cancel every queued level and delivery retry. The detected change remains open for review.</p></div><button type="button" class="danger" data-action="activity-cancel">Cancel notification activity</button></div>`:'';
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="notification-activity-title" tabindex="-1"><div class="modal-panel notification-activity-modal"><div class="workspace-header modal-header"><div><p class="eyebrow">Watcher status</p><h2 id="notification-activity-title">Check Status</h2><p class="muted">${escapeHtml(watcher.name)} · Check first, notify when a configured change is detected.</p></div><button class="secondary tertiary-action" data-action="close-modal" data-modal-initial-focus>Close</button></div><div class="modal-status-body">${checkStatusSection(activity.checkStatus??watcher.checkStatus)}<div class="check-phase-divider" aria-hidden="true"><span></span></div><section class="notification-phase" aria-labelledby="notification-phase-title"><div class="phase-heading"><div><p class="eyebrow">Phase B · Notification status</p><h3 id="notification-phase-title">Notification activity</h3><p class="muted">Delivery and escalation for the current detected change.</p></div></div>${content}${cancel}</section></div></div></div>`;
}

function disposeResultImages(){for(const record of [...activeResultImages.values()])record.cancel?.();}
function evidenceImages(root=document){return $$('[data-result-image]',root).filter((image)=>image.dataset.src&&!image.closest('[hidden]'));}
function assetImageFeedback(image,message=null){
  const feedback=image.parentElement?.querySelector('[data-image-feedback]');
  if(feedback){feedback.hidden=!message;if(message)feedback.textContent=message;}
}
function loadAssetImage(image,{attempts=3,timeoutMs=12000,forceRefresh=false}={}){
  if(!image?.dataset.src||!image.isConnected)return Promise.resolve();
  if(activeResultImages.has(image))return activeResultImages.get(image).promise;
  if(image.dataset.assetState==='loaded'&&!forceRefresh)return Promise.resolve();
  const accountId=state.bootstrap?.account?.id;
  const snapshotId=image.dataset.assetSnapshot;
  const initialSnapshot=state.bootstrap?.snapshots.find((item)=>item.id===snapshotId);
  const watcherId=initialSnapshot?.watcherId;
  if(!accountId||!watcherId||initialSnapshot.accountId&&initialSnapshot.accountId!==accountId)return Promise.resolve();
  const identity={snapshot:snapshotId,region:image.dataset.assetRegion||'',profile:image.dataset.assetProfile||'',kind:image.dataset.assetKind||''};
  const current=()=>image.isConnected&&state.bootstrap?.account?.id===accountId&&state.bootstrap?.snapshots.some((item)=>item.id===snapshotId&&item.watcherId===watcherId)&&Object.entries(identity).every(([key,value])=>(image.dataset[`asset${key[0].toUpperCase()+key.slice(1)}`]||'')===value);
  const record={promise:null,cancel:null};
  image.dataset.assetState='loading';image.hidden=false;
  assetImageFeedback(image,'Loading preview…');
  record.promise=new Promise((resolve)=>{
    let settled=false;
    let stopAttempt=null;
    const finish=(status)=>{
      if(settled)return;settled=true;stopAttempt?.();image.onload=null;image.onerror=null;
      if(activeResultImages.get(image)===record)activeResultImages.delete(image);
      image.dataset.assetState=status;
      if(status==='canceled'||status==='failed')image.removeAttribute('src');
      resolve();
    };
    record.cancel=()=>finish('canceled');
    const failure=()=>{
      if(!current()){finish('canceled');return;}
      image.hidden=true;assetImageFeedback(image,'Preview unavailable · Open results or reload thumbnails');
      const stage=image.closest('[data-screen-stage]');
      if(stage&&image.classList.contains('screen-capture')){
        stage.querySelector('.screen-error')?.removeAttribute('hidden');stage.querySelector('.screen-loading')?.setAttribute('hidden','');
        const overlay=stage.querySelector('.diff-overlay');if(overlay)overlay.hidden=true;
        const toggle=stage.closest('[data-screen-panel]')?.querySelector('[data-action="heatmap"]');if(toggle){toggle.checked=false;toggle.disabled=true;}
      }
      if(image.classList.contains('diff-overlay')){
        const toggle=image.closest('[data-screen-panel]')?.querySelector('[data-action="heatmap"]');
        if(toggle){toggle.checked=false;toggle.disabled=true;}
        const status=image.closest('[data-screen-panel]')?.querySelector('[data-overlay-status]');if(status){status.hidden=false;status.textContent='Change overlay could not be loaded. Use Reload evidence to retry.';}
      }
      finish('failed');
    };
    const requestImage=(source)=>new Promise((done)=>{
      let completed=false;
      const complete=(loaded)=>{if(completed)return;completed=true;clearTimeout(timer);image.onload=null;image.onerror=null;stopAttempt=null;done(loaded);};
      const timer=setTimeout(()=>complete(false),timeoutMs);
      stopAttempt=()=>complete(false);
      image.onload=()=>complete(image.naturalWidth>0);image.onerror=()=>complete(false);
      // A presigned URL must remain byte-for-byte intact: appending a cache-buster
      // changes the signed request and turns a transient failure into a 403.
      image.removeAttribute('src');image.src=source;
      if(image.complete&&image.naturalWidth>0)complete(true);
    });
    const run=async()=>{
      try{
        if(!current()){finish('canceled');return;}
        if(forceRefresh||!snapshotAssetUrlsFresh(initialSnapshot))await refreshSnapshotAssets(snapshotId,{force:forceRefresh,timeoutMs}).catch(()=>null);
        for(let attempt=0;attempt<attempts&&!settled;attempt+=1){
          if(!current()){finish('canceled');return;}
          if(attempt){image.dataset.assetState='retrying';await sleep(350*attempt);if(!current()||settled){finish('canceled');return;}await refreshSnapshotAssets(snapshotId,{force:true,timeoutMs}).catch(()=>null);if(!current()||settled){finish('canceled');return;}}
          const source=image.dataset.src;
          if(!source){failure();return;}
          image.dataset.assetState='loading';
          const loaded=await requestImage(source);
          if(settled)return;
          if(!current()){finish('canceled');return;}
          if(loaded){
            const toggle=image.classList.contains('diff-overlay')?image.closest('[data-screen-panel]')?.querySelector('[data-action="heatmap"]'):null;
            image.hidden=Boolean(toggle&&!toggle.checked);assetImageFeedback(image);
            if(image.classList.contains('screen-capture')){const stage=image.closest('[data-screen-stage]');stage?.querySelector('.screen-loading')?.setAttribute('hidden','');stage?.querySelector('.screen-error')?.setAttribute('hidden','');}
            finish('loaded');return;
          }
        }
        if(!settled)failure();
      }catch{if(!settled)failure();}
    };
    void Promise.resolve().then(run);
  });
  activeResultImages.set(image,record);
  return record.promise;
}
async function loadResultEvidenceQueue(images,concurrency=3,options={}){
  let next=0;
  const worker=async()=>{while(next<images.length){const image=images[next];next+=1;if(image.isConnected)await loadAssetImage(image,options);}};
  await Promise.all(Array.from({length:Math.min(concurrency,images.length)},worker));
}
function loadAllResultEvidence(){const images=evidenceImages();if(images.length)void loadResultEvidenceQueue(images);}

function bindEvidenceControls(root=document){
  $$('[data-asset-open]',root).forEach((link)=>link.onclick=async(event)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const snapshot=state.bootstrap.snapshots.find((item)=>item.id===link.dataset.assetSnapshot);
    if(!snapshot)return;
    event.preventDefault();
    const pending=window.open('about:blank','_blank');if(pending)pending.opener=null;
    try{const refreshed=await refreshSnapshotAssets(snapshot.id,{force:true});const target=snapshotAssetUrl(refreshed,link.dataset.assetProfile,link.dataset.assetKind,link.dataset.assetRegion||null);if(!target)throw new Error('The requested capture is unavailable.');if(pending)pending.location.replace(target);else location.assign(target);}catch(error){pending?.close();toast(`Screenshot could not be opened: ${error.message}`,'error');}
  });
  $$('[data-action="screen-tab"]',root).forEach(button=>{
    button.onclick=()=>{
      const panel=button.closest('.result-section');
      $$('[data-action="screen-tab"]',panel).forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;});
      $$('[data-screen-panel]',panel).forEach(item=>{item.hidden=item.dataset.screenPanel!==button.dataset.profile;});
      void loadResultEvidenceQueue(evidenceImages(panel));
    };
    button.onkeydown=(event)=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const tabs=$$('[data-action="screen-tab"]',button.closest('.screen-tabs')).filter(item=>!item.disabled);
      const index=tabs.indexOf(button);if(index<0)return;
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      event.preventDefault();tabs[next].focus({preventScroll:true});tabs[next].click();
    };
  });
  $$('[data-action="heatmap"]',root).forEach(input=>input.onchange=()=>{const overlay=input.closest('.result-section')?.querySelector(`[data-diff-overlay="${CSS.escape(input.dataset.profile)}"]`);if(overlay){overlay.hidden=!input.checked;if(input.checked)void loadAssetImage(overlay);}});
  $$('[data-action="result-profile"]',root).forEach(button=>button.onclick=()=>{const evidence=button.closest('.results-modal')?.querySelector('[data-region-evidence]');if(!evidence)return;const tab=evidence.querySelector(`[data-action="screen-tab"][data-profile="${CSS.escape(button.dataset.profile)}"]`);tab?.click();void evidenceScrollFinished(evidence);evidence.focus({preventScroll:true});});
  $$('[data-action="retry-evidence-images"],[data-action="retry-result-images"]',root).forEach(button=>button.onclick=async()=>{
    const section=button.dataset.action==='retry-evidence-images'?button.closest('[data-screen-panel]'):$('.archive-stack-grid');
    if(!section)return;
    const images=$$('[data-result-image]',section).filter((image)=>image.dataset.src&&!image.parentElement?.closest('[hidden]'));
    for(const image of images){activeResultImages.get(image)?.cancel?.();image.dataset.assetState='';image.hidden=false;}
    const toggle=$('[data-action="heatmap"]',section);if(toggle){toggle.disabled=false;toggle.checked=true;toggle.closest('label')?.removeAttribute('title');}
    const overlayStatus=$('[data-overlay-status]',section);if(overlayStatus){overlayStatus.hidden=true;overlayStatus.textContent='';}
    button.disabled=true;button.setAttribute('aria-busy','true');
    try{await loadResultEvidenceQueue(images,3,{forceRefresh:true});}finally{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
  });
}

function bindView(){
  $$('[data-action="new-watcher"]').forEach(b=>b.onclick=async()=>{try{const draft=await api('/api/watchers/template',{method:'POST',body:'{}'});openEditor(draft,true);}catch(error){toast(error.message);}});
  $$('[data-action="edit"]').forEach(b=>b.onclick=()=>{const watcher=state.bootstrap.watchers.find(w=>w.id===b.dataset.id);if(watcher)openEditor(watcher,false);});
  $$('[data-action="close-editor"],[data-action="close-modal"]').forEach(b=>b.onclick=()=>closeModal());
  $$('[data-action="last-check"]').forEach(b=>b.onclick=()=>void openLastCheck(b.dataset.id,b.dataset.snapshot||null,b));
  $$('[data-action="open-archive"]').forEach(button=>button.onclick=()=>{state.archiveWatcherId=button.dataset.watcherId;render();focusWorkspaceHeading();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  $$('[data-action="archive-back"]').forEach(button=>button.onclick=()=>{state.archiveWatcherId=null;render();focusWorkspaceHeading();window.scrollTo({top:0,left:0,behavior:'instant'});});
  $('[data-archive-search]')?.addEventListener('input',(event)=>{
    const query=event.currentTarget.value.trim().toLowerCase();state.archiveSearch=event.currentTarget.value;
    const stacks=$$('[data-archive-title]');let visible=0;stacks.forEach((stack)=>{const matches=!query||stack.dataset.archiveTitle.includes(query);stack.hidden=!matches;if(matches)visible+=1;});
    const count=$('[data-archive-count]');if(count)count.textContent=`${visible} watcher archive${visible===1?'':'s'}${stacks.length&&!visible?'. No watcher titles match this search.':''}`;
    $('[data-archive-empty]')?.toggleAttribute('hidden',!stacks.length||visible>0);
    loadAllResultEvidence();
  });
  $$('[data-action="notification-activity"]').forEach(b=>b.onclick=()=>void openNotificationActivity(b.dataset.id,b));
  bindEvidenceControls();
  $$('[data-action="status"]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api(`/api/watchers/${b.dataset.id}/status`,{method:'POST',body:JSON.stringify({status:b.dataset.status})});await refresh();toast(b.dataset.status==='active'?'Watcher enabled.':'Watcher disabled.');}catch(error){toast(error.message,'error');b.disabled=false;}});
  $$('[data-action="check"]').forEach(b=>b.onclick=async()=>{const watcherId=b.dataset.id;b.disabled=true;toast('Queuing check…');try{const job=await api(`/api/watchers/${watcherId}/check`,{method:'POST',body:'{}'});upsertCheckJob(job);syncCheckProgress(job);if(TERMINAL_CHECK_STATUSES.has(job.status)){announceCheckResult(job);await refreshAfterCheck();}else{toast(job.deduplicated?`A ${job.status} check already exists for this watcher.`:'Check queued. Progress is shown in the latest-result column.');if(job.id)void pollCheckJob(job.id,true);}}catch(e){toast(e.message,'error');}finally{const watcher=state.bootstrap?.watchers.find((item)=>item.id===watcherId);b.disabled=watcher?.status!=='active'||Boolean(activeJob(watcherId));}});
  $$('[data-action="delete"]').forEach(b=>b.onclick=async()=>{const watcher=state.bootstrap.watchers.find((item)=>item.id===b.dataset.id);const approved=await requestCustomerConfirmation({title:`Delete ${watcher?.name||'this watcher'}?`,copy:'Future checks will stop and the watcher will leave the active workspace. The account owner can restore this change from the action log.',confirmLabel:'Delete watcher',danger:true});if(approved){await api(`/api/watchers/${b.dataset.id}`,{method:'DELETE',body:'{}'});await load();}});
  $('[data-form="report"]')?.addEventListener('submit',async(event)=>{event.preventDefault();const form=event.currentTarget;clearFormErrors(form);const button=form.querySelector('button');button.disabled=true;try{const job=await api('/api/reports',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});upsertReport(job);if(form.isConnected)syncReportRow(job);toast('Report queued. Progress will update here.');void pollReport(job.id,true);}catch(error){if(form.isConnected)showFormError(form,error.message);}finally{if(button.isConnected)button.disabled=false;}});
  $('[data-form="team-invite"]')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{const result=await api('/api/team/invitations',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});await refresh();toast(result.delivery==='failed'?'Invitation recorded, but delivery failed. Review server logs before retrying.':'Invitation sent.');}catch(error){button.disabled=false;toast(error.message,'error');}});
  $$('[data-action="remove-member"]').forEach((button)=>button.onclick=async()=>{const approved=await requestCustomerConfirmation({title:`Remove ${button.dataset.name}?`,copy:'Their active sessions will lose access on the next API request. They can be invited again later.',confirmLabel:'Remove member',danger:true});if(!approved)return;try{await api(`/api/team/members/${encodeURIComponent(button.dataset.id)}`,{method:'DELETE'});await refresh();toast('Team member removed.');}catch(error){toast(error.message,'error');}});
  $$('[data-action="revoke-invite"]').forEach((button)=>button.onclick=async()=>{try{await api(`/api/team/invitations/${encodeURIComponent(button.dataset.id)}`,{method:'DELETE'});await refresh();toast('Invitation canceled.');}catch(error){toast(error.message,'error');}});
  $$('[data-action="revert-action"]').forEach((button)=>button.onclick=async()=>{const approved=await requestCustomerConfirmation({title:`Restore ${button.dataset.name}?`,copy:'The complete watcher state from immediately before this action will become the current configuration. The revert itself is also recorded.',confirmLabel:'Revert action'});if(!approved)return;button.disabled=true;try{await api(`/api/action-log/${encodeURIComponent(button.dataset.id)}/revert`,{method:'POST',body:'{}'});await refresh();toast('Watcher change reverted.');}catch(error){button.disabled=false;toast(error.message,'error');}});
  const activityModal=$('.notification-activity-modal');
  if(activityModal){
    const reloadActivity=async()=>{const watcherId=state.notificationActivityWatcherId;if(!watcherId)return;state.notificationActivity=await api(`/api/watchers/${encodeURIComponent(watcherId)}/notification-activity`);const watcher=state.bootstrap.watchers.find((item)=>item.id===watcherId);if(watcher)watcher.notificationStatus=state.notificationActivity.status;render();};
    const commitActivity=(activity,message)=>{state.notificationActivity=activity;const watcher=state.bootstrap.watchers.find((item)=>item.id===activity.watcherId);if(watcher)watcher.notificationStatus=activity.status;render();toast(message);};
    const activityError=async(error)=>{if(error.code==='NOTIFICATION_ACTIVITY_VERSION_CONFLICT'||error.code==='NOTIFICATION_TIER_ALREADY_ACTIVE'){try{await reloadActivity();}catch{}toast(`${error.message} The activity view was refreshed.`,'error');return;}toast(error.message,'error');};
    $$('[data-activity-recipient-form]',activityModal).forEach((form)=>form.onsubmit=async(event)=>{event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;const recipients=$$('[data-activity-recipient]',form).map((row)=>({id:row.dataset.recipientId,name:$('[name="activityRecipientName"]',row).value.trim(),channel:$('[name="activityRecipientChannel"]',row).value,destination:$('[name="activityRecipientDestination"]',row).value.trim(),enabled:true}));try{const activity=await api(`/api/watchers/${encodeURIComponent(state.notificationActivityWatcherId)}/notification-activity/tiers/${encodeURIComponent(form.dataset.tierId)}/recipients`,{method:'PUT',body:JSON.stringify({revision:state.notificationActivity.revision,recipients})});commitActivity(activity,'Temporary recipients updated for this incident.');}catch(error){submit.disabled=false;await activityError(error);}});
    activityModal.addEventListener('click',async(event)=>{
      const button=event.target.closest('[data-action]');if(!button||!activityModal.contains(button))return;
      if(button.dataset.action==='activity-add-recipient'){
        const form=button.closest('[data-activity-recipient-form]');const list=$('.activity-recipient-list',form);const index=$$('[data-activity-recipient]',list).length;const recipient={id:newLocalId('temp_rcpt'),name:`Recipient ${index+1}`,channel:'email',destination:'',enabled:true};list.insertAdjacentHTML('beforeend',activityRecipientRow(recipient,Number(button.dataset.tierIndex),Date.now(),state.notificationActivity.capabilities?.sms===true));$('[name="activityRecipientName"]',$$('[data-activity-recipient]',list).at(-1))?.focus();return;
      }
      if(button.dataset.action==='activity-remove-recipient'){
        const form=button.closest('[data-activity-recipient-form]');if($$('[data-activity-recipient]',form).length<=1){toast('Keep at least one recipient, or skip this escalation level.','error');return;}button.closest('[data-activity-recipient]').remove();return;
      }
      if(button.dataset.action==='activity-mute-tier'){
        const muted=button.dataset.muted==='true';
        if(muted){const approved=await requestCustomerConfirmation({title:'Skip this escalation level?',copy:'It will not receive more messages for this incident. If this is the current level, CLOVERSIGHT will advance immediately to the next unmuted level. Provider-accepted messages cannot be recalled.',confirmLabel:'Skip level'});if(!approved)return;}
        button.disabled=true;try{const activity=await api(`/api/watchers/${encodeURIComponent(state.notificationActivityWatcherId)}/notification-activity/tiers/${encodeURIComponent(button.dataset.tierId)}/mute`,{method:'POST',body:JSON.stringify({revision:state.notificationActivity.revision,muted})});commitActivity(activity,muted?'Escalation level skipped for this incident.':'Escalation level restored.');}catch(error){button.disabled=false;await activityError(error);}return;
      }
      if(button.dataset.action==='activity-cancel'){
        const approved=await requestCustomerConfirmation({title:'Cancel notification activity?',copy:'All queued escalation levels and delivery retries for this detected change will stop. The change alert itself remains open. Messages already accepted by the provider cannot be recalled.',confirmLabel:'Cancel notifications',danger:true});if(!approved)return;
        button.disabled=true;try{const activity=await api(`/api/watchers/${encodeURIComponent(state.notificationActivityWatcherId)}/notification-activity/cancel`,{method:'POST',body:JSON.stringify({revision:state.notificationActivity.revision})});commitActivity(activity,'Notification activity canceled for this incident.');}catch(error){button.disabled=false;await activityError(error);}
      }
    });
  }
  $$('[data-action="plan"]').forEach(b=>b.onclick=async()=>{
    const starting=!state.bootstrap.account.hasSubscription;const plan=state.bootstrap.plans[b.dataset.plan];const planName=plan?.name||b.dataset.plan;let detailRows=[];let watcherUpdates=false;
    if(!starting){
      b.disabled=true;
      try{const quote=await api('/api/billing/plan-change-quote',{method:'POST',body:JSON.stringify({planId:b.dataset.plan})});const updates=(quote.watcherAdjustments??[]).map((item)=>{const changes=[];if(item.toIntervalSeconds!==item.fromIntervalSeconds)changes.push(`schedule becomes ${intervalLabel(item.toIntervalSeconds).toLowerCase()}`);if(item.removedMethods?.length)changes.push(`${item.removedMethods.map(methodLabel).join(', ')} disabled`);if(JSON.stringify(item.fromCheckRegions??[])!==JSON.stringify(item.checkRegions??[]))changes.push(item.checkRegions?.length?`regions limited to ${item.checkRegions.join(', ')}`:'regional checks disabled');return `${item.name}: ${changes.join(' and ')}`;});watcherUpdates=updates.length>0;detailRows=[{label:'New monthly price',value:money(quote.newPriceMinor,quote.currency)},{label:'Unused-period credit',value:`−${money(quote.unusedCreditMinor,quote.currency)}`},{label:'Estimated charge now',value:money(quote.amountDueMinor,quote.currency),emphasis:true},{label:'Billing renewal',value:'A new monthly period begins when this change is paid'},{label:'Capture credits already used',value:`${Number(quote.capturesUsed??0).toLocaleString()} carried forward; plan changes do not refill credits`},...(updates.length?[{label:'Watcher updates',value:`${updates.slice(0,3).join('; ')}${updates.length>3?`; plus ${updates.length-3} more`:''}`}]:[])];}
      catch(error){toast(`Could not calculate a safe plan-change quote: ${friendlyTransactionMessage(error.message)}`,'error');return;}
      finally{b.disabled=false;}
    }
    const approved=await requestCustomerConfirmation({title:starting?`Start the ${planName} plan?`:`Change to ${planName}?`,copy:starting?'You’ll continue to secure checkout to confirm this subscription.':watcherUpdates?'Review the charge and watcher updates below. Watcher settings change only after Stripe confirms the plan change.':'Review the unused-period deduction and the estimated charge before applying this change.',detailRows,confirmLabel:starting?'Continue to checkout':'Change plan'});if(!approved)return;
    try{b.disabled=true;const result=await api(starting?'/api/billing/checkout':'/api/billing/change-plan',{method:'POST',body:JSON.stringify({planId:b.dataset.plan})});if(result.checkoutUrl){location.assign(result.checkoutUrl);return;}if(result.paymentActionUrl)window.open(result.paymentActionUrl,'_blank','noopener');await refresh();if(result.status!=='completed'){toast(friendlyTransactionMessage(result.error||`Plan change ${result.status}.`),'error');return;}toast(`Plan changed to ${planName}.`);}
    catch(error){if(['ALREADY_SUBSCRIBED_TO_PLAN','SUBSCRIPTION_RECOVERED','PLAN_CHANGE_PAYMENT_REQUIRED','PLAN_CHANGE_RECONCILIATION_REQUIRED'].includes(error.code))await refresh();toast(friendlyTransactionMessage(error.message),'error');}
    finally{b.disabled=false;}
  });
  $$('[data-action="retry"]').forEach(b=>b.onclick=()=>mutate(`/api/transactions/${b.dataset.id}/retry`,{}));
  bindAddressSelectors();
  $('[data-form="owner-profile"]')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;clearFormErrors(form);const button=form.querySelector('.profile-action-row button');const data=new FormData(form);const body={...Object.fromEntries(data),watchingRegions:data.getAll('watchingRegions')};if(!body.watchingRegions.length){showFormError(form,'Select at least one watching region.',$$('[name="watchingRegions"]',form));return;}button.disabled=true;try{await api('/api/account/owner-profile',{method:'PUT',body:JSON.stringify(body)});toast('Profile saved.');await refresh();}catch(error){if(form.isConnected)showFormError(form,error.message);button.disabled=false;}});
  $('[data-form="user-profile"]')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;clearFormErrors(form);const data=new FormData(form);const body={firstName:data.get('firstName'),lastName:data.get('lastName'),watchingRegions:data.getAll('watchingRegions')};try{await api('/api/user/profile',{method:'PUT',body:JSON.stringify(body)});toast('Your profile and watching regions were updated.');await refresh();}catch(error){if(form.isConnected)showFormError(form,error.message);}});
  $('[data-form="local-register"]')?.addEventListener('submit',async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.target));try{const result=await api('/api/local/register',{method:'POST',body:JSON.stringify(body)});localStorage.setItem('webwatch-local-account',result.accountId);location.reload()}catch(error){toast(error.message)}});
  $$('[data-action="switch-demo"]').forEach(button=>button.onclick=()=>{localStorage.setItem('webwatch-local-account','acct_demo');location.reload()});
  $$('[data-action="cancel-renewal"]').forEach(button=>button.onclick=async()=>{
    const confirmed=await requestCustomerConfirmation({title:'Cancel subscription renewal?',copy:'Your paid access continues through the paid period once Stripe confirms cancellation. Existing invoices remain payable; cancellation does not automatically issue a refund. Plan changes and new charges through this portal are disabled while cancellation is recorded.',confirmLabel:'Request cancellation'});
    if(!confirmed)return;button.disabled=true;
    try{await api('/api/billing/cancel',{method:'POST',body:'{}'});await refresh();toast('Cancellation request saved. Check Billing for Stripe confirmation.');}catch(error){toast(error.message,'error');button.disabled=false;}
  });
  $$('[data-action="refresh-cancellation"]').forEach(button=>button.onclick=async()=>{await refresh();});
  $$('[data-action="close-account"]').forEach(b=>b.onclick=async()=>{const reason=await requestCustomerConfirmation({title:'Schedule account closure?',copy:'New monitoring stops immediately and Stripe cancellation is requested immediately. Existing payments are not automatically refunded and outstanding invoices are retained. Deletion follows the grace period and financial reconciliation. Reopening does not restart billing.',confirmLabel:'Schedule closure',danger:true,reason:true});if(reason){await api('/api/account/close',{method:'POST',body:JSON.stringify({reason})});localDraftsAllowed=false;try{await clearScopedDrafts();state.draftPending=false;}catch{toast('Closure was scheduled, but this browser could not clear its recovery drafts. Clear this site’s browser storage on a shared device.','error');}await load();}});
  $('[data-action="export-personal-data"]')?.addEventListener('click',async event=>{const button=event.currentTarget,status=$('[data-export-status]');const accountId=state.bootstrap?.account?.id,viewerId=state.bootstrap?.viewer?.id;button.disabled=true;button.setAttribute('aria-busy','true');if(status)status.textContent='Preparing your profile data…';try{const data=await api('/api/user/personal-data-export');if(state.bootstrap?.account?.id!==accountId||state.bootstrap?.viewer?.id!==viewerId)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`cloversight-my-profile-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);if(status?.isConnected)status.textContent='Your profile data download is ready.';}catch(error){if(status?.isConnected)status.textContent=`Profile data could not be downloaded: ${error.message}`;}finally{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}});
  $$('[data-action="health"]').forEach(b=>b.onclick=()=>healthCheck());
  $$('[data-action="clear-draft"]').forEach(b=>b.onclick=async()=>{await draftDelete('watcher-recovery');state.draftPending=false;render();});
  $('[data-transaction-search]')?.addEventListener('input',(event)=>{
    const query=event.currentTarget.value.trim().toLowerCase();
    const rows=$$('[data-transaction]');
    let visible=0;
    rows.forEach((row)=>{const matches=!query||row.dataset.search.includes(query);row.hidden=!matches;if(matches)visible+=1;});
    $('[data-transaction-empty]')?.classList.toggle('hidden',visible>0);
  });
  loadAllResultEvidence();
  bindEditor();
}
async function mutate(path,body){try{await api(path,{method:'POST',body:JSON.stringify(body)});await refresh();toast('Saved.');}catch(e){toast(e.message);}}
async function refresh(){await load();}
function upsertReport(job){if(!job||!state.bootstrap)return;const jobs=state.bootstrap.reportJobs??(state.bootstrap.reportJobs=[]);const index=jobs.findIndex((item)=>item.id===job.id);if(index>=0)jobs[index]={...jobs[index],...job};else jobs.unshift(job);jobs.sort((a,b)=>String(b.requestedAt??'').localeCompare(String(a.requestedAt??'')));}
async function pollReport(jobId,announce=false){
  if(!jobId||reportPollers.has(jobId))return reportPollers.get(jobId);
  const accountId=state.bootstrap?.account?.id;
  const promise=(async()=>{
    for(let attempt=0;attempt<150;attempt+=1){
      if(state.bootstrap?.account?.id!==accountId)return null;
      try{
        const job=await api(`/api/reports/${encodeURIComponent(jobId)}`,{timeoutMs:8000});
        if(state.bootstrap?.account?.id!==accountId)return null;
        const priorStatus=state.bootstrap.reportJobs?.find((item)=>item.id===jobId)?.status;
        upsertReport(job);if(state.view==='reports')syncReportRow(job);
        if(['completed','failed'].includes(job.status)){
          const message=job.status==='completed'?'Report is ready.':`Report failed: ${job.error||'generation error'}`;
          if(priorStatus!==job.status){const status=$('[data-report-announcement]');if(status)status.textContent=message;else if(announce)toast(message,job.status==='failed'?'error':'');}
          return job;
        }
      }catch(error){if(error.status===404)return null;}
      await sleep(2000);
    }
    if(announce)toast('Report generation is taking longer than expected. Its status will resume when you return to this page.');return null;
  })().finally(()=>reportPollers.delete(jobId));reportPollers.set(jobId,promise);return promise;
}
function resumeReportPolling(){for(const job of state.bootstrap?.reportJobs??[])if(['queued','running'].includes(job.status))void pollReport(job.id,false);}
function upsertCheckJob(job){if(!job||!state.bootstrap)return;const jobs=state.bootstrap.checkJobs??(state.bootstrap.checkJobs=[]);const index=jobs.findIndex((item)=>item.id&&item.id===job.id);if(index>=0)jobs[index]={...jobs[index],...job};else jobs.unshift(job);jobs.sort((a,b)=>String(b.requestedAt??'').localeCompare(String(a.requestedAt??'')));}
function syncCheckProgress(job){
  if(!job?.watcherId)return;const watcher=state.bootstrap?.watchers.find((item)=>item.id===job.watcherId);if(!watcher)return;
  const current=document.querySelector(`[data-check-progress][data-watcher-id="${CSS.escape(job.watcherId)}"]`);if(current)current.outerHTML=checkProgress(watcher);
  $$(`[data-action="check"][data-id="${CSS.escape(job.watcherId)}"]`).forEach((button)=>{const active=activeJob(job.watcherId);button.disabled=watcher.status!=='active'||Boolean(active);const label=button.querySelector('span');if(label)label.textContent=active?(active.status==='queued'?'Queued':'Checking…'):'Check now';});
}
function refreshWatcherTableDom(){const body=$('.watchers-table tbody');if(!body)return;body.innerHTML=state.bootstrap.watchers.map(watcherRow).join('');enhanceResponsiveTables();animateNumberMetrics(body);bindView();startCountdowns();updateTopbar();}
async function refreshAfterCheck(){state.bootstrap=await api('/api/customer/bootstrap');if(state.view==='watchers'&&!state.editing&&!state.resultWatcherId&&!state.notificationActivityWatcherId)refreshWatcherTableDom();else if(!state.editing&&!state.resultWatcherId&&!state.notificationActivityWatcherId){if(state.view==='reports'){for(const job of state.bootstrap.reportJobs||[])syncReportRow(job);updateTopbar();}else render();}resumeActiveCheckPolling();}
function announceCheckResult(job){if(job.status==='completed')toast(`Check completed: ${String(job.outcome??'complete').replaceAll('_',' ')}.`);else if(job.status==='failed')toast(`Check failed: ${job.error||job.errorCode||'worker failure'}`,'error');else toast(`Check not run: ${job.reason||'another check already owned the watcher'}.`);}
async function pollCheckJob(jobId,notify){if(!jobId||checkPollers.has(jobId))return checkPollers.get(jobId);const promise=(async()=>{for(let attempt=0;attempt<480;attempt+=1){try{const job=await api(`/api/checks/${encodeURIComponent(jobId)}`);upsertCheckJob(job);syncCheckProgress(job);if(TERMINAL_CHECK_STATUSES.has(job.status)){await refreshAfterCheck();if(notify)announceCheckResult(job);return job;}}catch(error){if(error.status===404)return null;}await sleep(1500);}if(notify)toast('The check is still pending. Its persisted status will resume polling when this page is revisited.');return null;})().finally(()=>checkPollers.delete(jobId));checkPollers.set(jobId,promise);return promise;}
function resumeActiveCheckPolling(){for(const job of state.bootstrap?.checkJobs??[])if(['queued','running'].includes(job.status)&&job.id&&!checkPollers.has(job.id))void pollCheckJob(job.id,true);}


function newLocalId(prefix){return `${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,16)}`;}

function configFromForm(form){
  const original=state.editing;
  const data=new FormData(form);
  const recipientTiers=$$('[data-tier]',form).map((tierNode,tierIndex)=>({
    id:tierNode.dataset.tierId||newLocalId('tier'),name:$('[name="tierName"]',tierNode).value.trim()||`Level ${tierIndex+1}`,delayMinutes:Number($('[name="tierDelay"]',tierNode).value),requiredAcknowledgements:Number($('[name="tierRequired"]',tierNode).value),
    recipients:$$('[data-recipient]',tierNode).map((recipientNode,recipientIndex)=>({id:recipientNode.dataset.recipientId||newLocalId('rcpt'),userId:$('[name="recipientUserId"]',recipientNode)?.value||undefined,name:$('[name="recipientName"]',recipientNode).value.trim()||`Recipient ${recipientIndex+1}`,channel:$('[name="recipientChannel"]',recipientNode).value,destination:$('[name="recipientDestination"]',recipientNode).value.trim(),enabled:$('[name="recipientEnabled"]',recipientNode).checked})),
  }));
  return {...original,id:form.id.value||original.id,configRevision:Number(form.configRevision.value||original.configRevision||1),name:form.name.value,config:{...original.config,url:form.url.value,checkIntervalSeconds:Number(form.interval.value),checkRegions:data.getAll('checkRegion'),methods:data.getAll('method'),textThresholdPercent:Number(form.textThreshold.value),pixelThresholdPercent:Number(form.pixelThreshold.value),bannedPhrases:form.phrases.value.split(/[\n,]/).map(value=>value.trim()).filter(Boolean),ignoredSelectors:form.selectors.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean),allClearThreshold:Number(form.allClearThreshold.value),alertReceivedThreshold:Number(form.alertReceivedThreshold.value),reAlertMinutes:Number(original.config.reAlertMinutes??30),recipientTiers,templates:{subject:form.subjectTemplate.value,text:form.textTemplate.value,sms:form.smsTemplate?.value??original.config.templates.sms}}};
}

function bindRecipientAutocomplete(row){
  if(!row||row.dataset.autocompleteBound==='true')return;
  row.dataset.autocompleteBound='true';
  const nameInput=$('[name="recipientName"]',row);const destination=$('[name="recipientDestination"]',row);const memberInput=$('[name="recipientUserId"]',row);const menu=$('.recipient-suggestions',row);
  const status=$('.recipient-search-status',row);const widget=nameInput.closest('.recipient-name-field');
  let timer=null;let selectedName=nameInput.value;let searchGeneration=0;
  const unlink=()=>{if(nameInput.value!==selectedName){memberInput.value='';row.dataset.teamMemberId='';}};
  const close=()=>{searchGeneration+=1;clearTimeout(timer);menu.hidden=true;menu.innerHTML='';if(status)status.textContent='';};
  nameInput.addEventListener('input',()=>{unlink();clearTimeout(timer);const generation=++searchGeneration;const query=nameInput.value.trim();if(query.length<2){close();return;}if(status)status.textContent='Searching team members…';timer=setTimeout(async()=>{try{const data=await api(`/api/team/recipients/search?q=${encodeURIComponent(query)}`,{timeoutMs:6000});if(generation!==searchGeneration||!row.isConnected||nameInput.value.trim()!==query||!widget.contains(document.activeElement))return;const results=data.results||[];menu.innerHTML=results.map((item)=>`<button type="button" data-member-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('');menu.hidden=!results.length;if(status)status.textContent=results.length?`${results.length} matching team member${results.length===1?'':'s'}. Tab to choose a member.`:'No matching team members. You can enter a recipient manually.';}catch(error){if(generation!==searchGeneration||!row.isConnected)return;menu.hidden=true;menu.innerHTML='';if(status)status.textContent='Team suggestions could not be loaded. Edit the name to retry, or enter a recipient manually.';}},220);});
  widget.addEventListener('focusout',()=>queueMicrotask(()=>{if(!widget.contains(document.activeElement))close();}));
  widget.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();close();nameInput.focus();}});
  destination.addEventListener('input',()=>{memberInput.value='';row.dataset.teamMemberId='';selectedName='';});
  menu.addEventListener('click',async(event)=>{const option=event.target.closest('[data-member-id]');if(!option||option.dataset.loading==='true')return;option.dataset.loading='true';option.setAttribute('aria-disabled','true');option.setAttribute('aria-busy','true');const query=nameInput.value;const generation=++searchGeneration;try{const recipient=await api(`/api/team/recipients/${encodeURIComponent(option.dataset.memberId)}`,{timeoutMs:6000});if(!row.isConnected||generation!==searchGeneration||nameInput.value!==query)return;nameInput.value=recipient.name;destination.value=recipient.email;memberInput.value=recipient.userId;row.dataset.teamMemberId=recipient.userId;selectedName=recipient.name;const focusInside=widget.contains(document.activeElement);close();if(focusInside)nameInput.focus();if(status)status.textContent=`Selected ${recipient.name}. Their registered email and regional preferences will be used.`;nameInput.dispatchEvent(new Event('change',{bubbles:true}));}catch(error){if(row.isConnected&&generation===searchGeneration){if(status)status.textContent=`Could not select this team member: ${error.message}`;}}finally{if(option.isConnected){delete option.dataset.loading;option.removeAttribute('aria-disabled');option.removeAttribute('aria-busy');}}});
}

function bindEditor(){
  const form=$('#watcher-form');
  if(!form)return;
  let timer;
  const saveCurrentDraft=async()=>{
    const draft=configFromForm(form);
    state.editing=draft;
    await draftPut('watcher-recovery',draft);
    state.draftPending=true;
    const recovery=$('.watcher-recovery',form);
    if(recovery)recovery.hidden=false;
    const recoverButton=$('[data-action="publish-recovered"]',form);
    if(recoverButton)recoverButton.disabled=state.health!=='healthy';
    $('#draft-status').textContent=`Saved locally at ${new Date().toLocaleTimeString()}`;
    return draft;
  };
  const autosave=()=>{clearTimeout(timer);timer=setTimeout(()=>void saveCurrentDraft(),400);};
  const enableRecipientRemoval=(tierNode)=>{
    const recipients=$$('[data-recipient]',tierNode);
    recipients.forEach((node)=>{$('[data-action="remove-recipient"]',node).disabled=recipients.length===1;});
  };
  $$('[data-recipient]',form).forEach(bindRecipientAutocomplete);
  form.addEventListener('input',autosave);
  form.addEventListener('change',(event)=>{if(event.target.name!=='checkRegion'||!event.target.checked)return;const selected=$$('[name="checkRegion"]:checked',form);const maximum=Number(state.bootstrap.entitlements.maxCheckRegions||0);if(selected.length>maximum){event.target.checked=false;showFormError(form,`Your plan allows ${maximum} regional check location${maximum===1?'':'s'} per watcher.`,$$('[name="checkRegion"]',form));}});
  form.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-action]');
    if(!button||!form.contains(button))return;
    if(button.dataset.action==='add-tier'){
      const tiers=$$('[data-tier]',form);
      const index=tiers.length;
      const tier={id:newLocalId('tier'),name:`Level ${index+1}`,delayMinutes:15,requiredAcknowledgements:1,recipients:[{id:newLocalId('rcpt'),name:'Recipient',channel:'email',destination:state.bootstrap.account.contactEmail,enabled:true}]};
      $('#recipient-tiers',form).insertAdjacentHTML('beforeend',recipientTierEditor(tier,index));
      const added=$$('[data-tier]',form).at(-1);
      void saveCurrentDraft();
      requestAnimationFrame(()=>{
        added.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
        $('[name="tierName"]',added)?.focus({preventScroll:true});
      });
      return;
    }
    if(button.dataset.action==='remove-tier'){
      const tiers=$$('[data-tier]',form);
      if(tiers.length>1){button.closest('[data-tier]').remove();void saveCurrentDraft();}
      return;
    }
    if(button.dataset.action==='add-recipient'){
      const tierNode=button.closest('[data-tier]');
      const tierIndex=$$('[data-tier]',form).indexOf(tierNode);
      const recipientIndex=$$('[data-recipient]',tierNode).length;
      const recipient={id:newLocalId('rcpt'),name:`Recipient ${recipientIndex+1}`,channel:'email',destination:'',enabled:true};
      $('.recipient-list',tierNode).insertAdjacentHTML('beforeend',recipientEditor(recipient,tierIndex,recipientIndex,recipientIndex+1));
      bindRecipientAutocomplete($$('[data-recipient]',tierNode).at(-1));
      enableRecipientRemoval(tierNode);
      void saveCurrentDraft();
      return;
    }
    if(button.dataset.action==='remove-recipient'){
      const tierNode=button.closest('[data-tier]');
      if($$('[data-recipient]',tierNode).length>1){button.closest('[data-recipient]').remove();enableRecipientRemoval(tierNode);void saveCurrentDraft();}
    }
  });
  form.onsubmit=async(event)=>{event.preventDefault();clearFormErrors(form);await publish(configFromForm(form));};
  $('[data-action="save-draft"]',form).onclick=async()=>{const draft=configFromForm(form);try{const saved=await api(draft.id?`/api/watchers/${draft.id}`:'/api/watchers',{method:draft.id?'PUT':'POST',body:JSON.stringify({watcher:draft,publish:false})});await draftDelete('watcher-recovery');state.draftPending=false;toast('Draft saved to the platform.');await refresh();state.editing=saved;render();}catch(error){await draftPut('watcher-recovery',draft);state.draftPending=true;showFormError(form,error.status===409?'A newer watcher version exists. Your local draft was preserved; reload the watcher before merging.':`Draft kept locally. The platform could not save it: ${error.message}`);}};
  $('[data-action="publish-recovered"]',form)?.addEventListener('click',async()=>{const recovered=await draftGet('watcher-recovery');if(recovered)await publish(recovered);});
  $('#phrase-file',form).onchange=async(event)=>{const file=event.target.files[0];if(!file)return;const parsed=await api('/api/banned-phrases/parse',{method:'POST',body:JSON.stringify({csv:await file.text()})});form.phrases.value=parsed.phrases.join('\n');autosave();};
  $('#selector-file',form).onchange=async(event)=>{const file=event.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());const selectors=Array.isArray(data)?data:data.selectors;form.selectors.value=(selectors||[]).join('\n');autosave();}catch{toast('That selector export is not valid JSON.');}};
}


async function publish(watcher){const execute=async()=>{if(state.health!=='healthy'){await draftPut('watcher-recovery',watcher);state.draftPending=true;toast('Publish is paused while the platform is unhealthy.');return;}try{const path=watcher.id?`/api/watchers/${watcher.id}`:'/api/watchers';const saved=await api(path,{method:watcher.id?'PUT':'POST',body:JSON.stringify({watcher,publish:true})});await draftDelete('watcher-recovery');state.draftPending=false;state.editing=null;history.replaceState({},'',modalLocation(null,null));await refresh();toast(`Published ${saved.name}.`);}catch(error){await draftPut('watcher-recovery',watcher);state.draftPending=true;showFormError($('#watcher-form'),error.status===409?'Publish stopped because this watcher changed elsewhere. Your draft is safe; reload and merge it.':error.message);}};if(navigator.locks){let ran=false;await navigator.locks.request(`${draftScope().storageKey}:publish:${watcher.id||'new'}`,{ifAvailable:true},async(lock)=>{if(!lock){toast('Another tab is publishing this draft.');return;}ran=true;await execute();});return ran;}return execute();}


function db(){return new Promise((resolve,reject)=>{const request=indexedDB.open('webwatch-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
const DRAFT_MAX_AGE_MS=7*24*60*60*1000;
function draftRecordExpired(record){const updatedAt=Date.parse(record?.updatedAt);return !Number.isFinite(updatedAt)||updatedAt>Date.now()+60000||Date.now()-updatedAt>DRAFT_MAX_AGE_MS;}
async function clearScopedDrafts(){
  if(!state.bootstrap?.account?.id||!state.bootstrap?.viewer?.id)return;
  const scope=draftScope();const database=await db();
  try{await new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');const request=tx.objectStore('drafts').openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(String(cursor.key).startsWith(`${scope.storageKey}:`)||cursor.key==='watcher-recovery')cursor.delete();cursor.continue();};tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Browser drafts could not be cleared.'));});}finally{database.close();}
}
async function clearDraftsAndSignOut(){
  localDraftsAllowed=false;
  try{await clearScopedDrafts();try{sessionStorage.removeItem('webwatch.customer.draft-cleanup-warning');}catch{}}catch{try{sessionStorage.setItem('webwatch.customer.draft-cleanup-warning','Browser recovery drafts could not be cleared at sign-out. Clear this site’s browser storage on a shared device.');}catch{}}
  await auth.signOut();
}

function draftScope() {
  const accountId=state.bootstrap?.account?.id;
  const viewerId=state.bootstrap?.viewer?.id;
  if(!accountId||!viewerId)throw new Error('Your account must load before recovering a watcher draft.');
  return {accountId,viewerId,storageKey:`v2:${encodeURIComponent(accountId)}:${encodeURIComponent(viewerId)}`};
}

async function draftPut(key,value) {
  if(!localDraftsAllowed)return;
  const scope=draftScope();
  if(value?.accountId&&value.accountId!==scope.accountId)throw new Error('This draft belongs to a different account.');
  const database=await db();
  try{if(!localDraftsAllowed)return;await new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').put({value,accountId:scope.accountId,viewerId:scope.viewerId,updatedAt:new Date().toISOString()},`${scope.storageKey}:${key}`);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Draft could not be saved.'));});}
  finally{database.close();}
}

async function draftGet(key) {
  const scope=draftScope();const database=await db();
  try{
    const record=await new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');const drafts=tx.objectStore('drafts');let value;const req=drafts.get(`${scope.storageKey}:${key}`);req.onsuccess=()=>{value=req.result;if(value&&draftRecordExpired(value)){drafts.delete(`${scope.storageKey}:${key}`);value=undefined;}};
      // An old shared key has no verifiable owner. Remove it without exposing or
      // adopting its contents into the current account's recovery flow.
      drafts.delete(key);tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Draft could not be recovered.'));
    });
    if(record?.accountId!==scope.accountId||record?.viewerId!==scope.viewerId)return undefined;
    if(record.value?.accountId&&record.value.accountId!==scope.accountId)return undefined;
    if(state.bootstrap?.account?.id!==scope.accountId||state.bootstrap?.viewer?.id!==scope.viewerId)return undefined;
    return record.value;
  }finally{database.close();}
}

async function draftDelete(key) {
  const scope=draftScope();const database=await db();
  try{await new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').delete(`${scope.storageKey}:${key}`);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Draft could not be cleared.'));});}
  finally{database.close();}
}


function renderPortalEntry(error=null){
  let draftWarning='';try{draftWarning=sessionStorage.getItem('webwatch.customer.draft-cleanup-warning')||'';}catch{}
  const health=$('#health');if(health)health.hidden=true;
  const signedOut=$('#signed-out-root');
  signedOut.hidden=false;
  signedOut.innerHTML=`<div class="portal-entry-shell">
    <header class="portal-entry-header"><a class="brand" href="/" aria-label="CLOVERSIGHT home"><span class="brand-images"><img class="brand-full brand-light" src="/static/brand/cloversight.svg?v=0.5.15" width="516" height="72" alt="CLOVERSIGHT"><img class="brand-full brand-dark" src="/static/brand/cloversight-dark.svg?v=0.5.15" width="516" height="72" alt=""><img class="brand-compact brand-light" src="/static/brand/cloversight-mark.svg?v=0.5.15" width="72" height="72" alt=""><img class="brand-compact brand-dark" src="/static/brand/cloversight-mark-dark.svg?v=0.5.15" width="72" height="72" alt=""></span></a><a href="/">Back to website</a></header>
    <main class="portal-entry"><div class="portal-entry-copy"><p class="eyebrow">${error?'Sign-in recovery':'Website change monitoring'}</p><h1>${error?'Return to your monitoring dashboard.':'Track important changes and notify the right people.'}</h1><p class="lead">${error?escapeHtml(error.message):'Sign in to open your monitoring dashboard, or create an account and start with one free watcher.'}</p>${error?'<div class="notice error" role="alert"><strong>No account action was completed.</strong> Restarting sign-in creates a fresh, verifiable authorization request.</div>':''}${draftWarning?`<div class="notice error" role="alert">${escapeHtml(draftWarning)}</div>`:''}<div class="hero-actions">${error?'<button id="portal-sign-in">Start sign-in again</button>':'<button id="portal-sign-up">Start free</button><button id="portal-sign-in" class="secondary deep-button">Log in</button>'}</div></div></main>
    <footer class="portal-entry-footer"><span>CLOVERSIGHT by Red Clover Software</span><nav aria-label="Portal help"><a href="/security">Security</a><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
  </div>`;
}

(async()=>{try{
  if(authStartupError){
    renderPortalEntry(authStartupError);
    $('#portal-sign-in').onclick=()=>location.assign('/app/?action=login');
    return;
  }
  if(!auth.authenticated){
    renderPortalEntry();
    const begin=(screenHint)=>{sessionStorage.setItem(RETURN_PATH_KEY,'/app/');return auth.signIn(screenHint?{screenHint}:undefined);};
    $('#portal-sign-in').onclick=()=>begin();$('#portal-sign-up').onclick=()=>begin('signup');
    const action=new URLSearchParams(location.search).get('action');if(action==='login'||action==='signup')await begin(action==='signup'?'signup':undefined);return;
  }
  $('#portal-shell').hidden=false;$('#signed-out-root').hidden=true;
  const returnPath=sessionStorage.getItem(RETURN_PATH_KEY);if(returnPath&&['/','/app/'].includes(location.pathname)&&!location.search){sessionStorage.removeItem(RETURN_PATH_KEY);history.replaceState({},'',returnPath);state.view=viewFromPath(location.pathname);}else sessionStorage.removeItem(RETURN_PATH_KEY);
  await load();
  try{const recovered=await draftGet('watcher-recovery');state.draftPending=Boolean(recovered);if(recovered)render();}catch{toast('Local draft recovery is unavailable in this browser.');}
  const checkout=new URLSearchParams(location.search).get('checkout');
  if(!state.bootstrap)return;
  if(checkout==='success'){const sessionId=new URLSearchParams(location.search).get('session_id');try{await reconcilePendingCheckout(sessionId,{announce:true});}catch(error){toast(`Checkout returned, but reconciliation needs attention: ${error.message}`,'error');}}else if(checkout==='cancelled')toast('Checkout cancelled. No new subscription checkout was completed.');else if(state.view==='billing'&&!state.bootstrap.account.hasSubscription){try{await reconcilePendingCheckout();}catch(error){toast(`A prior Checkout Session needs attention: ${error.message}`,'error');}}
}catch(error){
  $('#portal-shell').hidden=false;$('#signed-out-root').hidden=true;markHealth(false);
  $('#workspace').innerHTML=`<div class="notice error portal-failure" role="alert"><p class="eyebrow">Customer portal</p><h1>Portal unavailable</h1><p>${escapeHtml(error.message)}</p><div class="hero-actions"><button data-action="retry-load">Try again</button><a class="button secondary" href="/support">Contact support</a></div></div>`;
  $('[data-action="retry-load"]').onclick=()=>location.reload();
}})();
