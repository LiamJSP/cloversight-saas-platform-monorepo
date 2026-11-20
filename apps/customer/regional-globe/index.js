// CLOVERSIGHT adapter for the self-contained, lazy Three.js renderer from the supplied globe prototype.
const LABELS = { healthy: 'Healthy', changed: 'Changed', reachable: 'Reachable · Not compared', degraded: 'Degraded', outage: 'Outage', unknown: 'No result' };
function stateOf(check) {
  if (check.state) return check.state;
  if (check.statusCode == null || check.statusCode >= 400) return 'outage';
  if (check.statusCode >= 300) return 'degraded';
  return check.content === 'changed' ? 'changed' : ['green', 'variation'].includes(check.content) ? 'healthy' : 'reachable';
}
function labelFor(check) {
  if (check.captureStatus === 'internal_error') return check.statusCode == null ? 'Capture unavailable' : 'Capture incomplete';
  if (check.content === 'variation') return 'Within thresholds';
  return LABELS[stateOf(check)];
}
function checkTime(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(parsed) + ' UTC' : 'Time unavailable';
}

export function mountRegionalGlobe(element, checks, { onSelect, onAction } = {}) {
  if (!element) return () => {};
  const valid = checks.filter((item, index) => item.id && checks.findIndex((other) => other.id === item.id) === index && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  element.innerHTML = `<div class="ww-regional"><header class="rg-header"><div><p class="rg-kicker">Regional checks</p><h3>One URL. Every angle.</h3><p>Explore this check from each configured AWS region.</p></div><span class="rg-count"></span></header><div class="rg-summary" aria-label="Regional check summary"></div><div class="rg-stage"><div class="rg-shadow" aria-hidden="true"></div><div class="rg-spills" aria-hidden="true"></div><div class="rg-host" aria-hidden="true"></div><div class="rg-pin-label" aria-hidden="true"></div><div class="rg-fallback" role="status">Preparing your globe… Regions remain available below.</div></div><div class="rg-controls"><span class="rg-hint">Drag to explore · Select a pin</span><button type="button" class="rg-pause" aria-pressed="false">Pause rotation</button></div><label class="rg-picker">Explore a region <select aria-label="Explore a region"></select></label><article class="rg-detail" aria-live="polite"></article></div>`;
  const root = element.firstElementChild;
  const query = (selector) => root.querySelector(selector);
  const host = query('.rg-host');
  const picker = query('select');
  const summary = query('.rg-summary');
  const detail = query('.rg-detail');
  const pause = query('.rg-pause');
  const fallback = query('.rg-fallback');
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let engine = null;
  let destroyed = false;
  let paused = false;
  let selected = valid[0] ?? null;
  query('.rg-count').textContent = `${valid.length} region${valid.length === 1 ? '' : 's'}`;
  for (const item of valid) {
    const option = new Option(`${item.name} — ${labelFor(item)}`, item.id);
    picker.add(option);
  }
  picker.disabled = !valid.length;
  const counts = { healthy: 0, changed: 0, reachable: 0, attention: 0 };
  for (const item of valid) {
    const status = stateOf(item);
    counts[status === 'healthy' ? 'healthy' : status === 'changed' ? 'changed' : status === 'reachable' ? 'reachable' : 'attention']++;
  }
  for (const [kind, label] of [['healthy', 'healthy'], ['changed', 'changed'], ['reachable', 'reachable · not compared'], ['attention', 'need attention']]) {
    const node = document.createElement('span');
    node.className = `rg-${kind}`;
    node.textContent = `${counts[kind]} ${label}`;
    summary.append(node);
  }
  function showDetails() {
    detail.replaceChildren();
    if (!selected) { detail.textContent = 'No regional results are available for this check.'; return; }
    const title = document.createElement('h4');
    title.textContent = `${selected.name} · ${selected.id}`;
    const badge = document.createElement('span');
    badge.className = `rg-badge rg-${stateOf(selected)}`;
    badge.textContent = labelFor(selected);
    const header = document.createElement('div');
    header.className = 'rg-detail-head';
    header.append(title, badge);
    const metrics = document.createElement('div');
    metrics.className = 'rg-metrics';
    const response = document.createElement('p');
    response.textContent = `HTTP response: ${selected.statusCode ?? (selected.captureStatus === 'outage' ? 'No response' : 'Not available')}`;
    const comparison = document.createElement('p');
    comparison.textContent = `Content: ${selected.captureStatus === 'internal_error' ? 'Capture incomplete' : selected.content === 'variation' ? 'Variation below the configured alert thresholds' : selected.content === 'green' ? 'Compared · matched' : selected.content === 'changed' ? 'Configured alert condition detected' : 'Not fully compared'}`;
    const checked = document.createElement('p');
    checked.textContent = `Result time: ${checkTime(selected.checkedAt)}${selected.latencyMs == null ? '' : ` · ${Math.round(selected.latencyMs)} ms`}`;
    metrics.append(response, comparison, checked);
    detail.append(header, metrics);
    if (selected.error) {
      const error = document.createElement('p'); error.className = 'rg-error'; error.textContent = selected.error; detail.append(error);
    }
    const actions = document.createElement('div'); actions.className = 'rg-actions';
    for (const [kind, label] of [['screenshots', 'View region screenshots'], ['diff', 'View region diff']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = kind === 'screenshots' ? '' : 'secondary';
      button.textContent = label;
      button.disabled = !onAction || !selected.hasScreenshots;
      button.title = !selected.hasScreenshots ? 'No screenshots were retained for this region.' : '';
      button.onclick = () => onAction?.({ kind, region: selected });
      actions.append(button);
    }
    detail.append(actions);
  }
  function select(id, focus = false) {
    const check = valid.find((item) => item.id === id);
    if (!check) return;
    selected = check;
    picker.value = id;
    engine?.setSelected(id, focus);
    showDetails();
    onSelect?.(check);
  }
  picker.onchange = () => select(picker.value, true);
  picker.onfocus = () => engine?.setFocused(true);
  picker.onblur = () => engine?.setFocused(false);
  pause.onclick = () => { paused = !paused; engine?.setPaused(paused); pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Resume rotation' : 'Pause rotation'; };
  const motion = () => { engine?.setReduced(media.matches); pause.disabled = media.matches || !engine; if (media.matches) pause.textContent = 'Motion reduced'; else pause.textContent = paused ? 'Resume rotation' : 'Pause rotation'; };
  media.addEventListener('change', motion);
  showDetails(); motion();
  import('./vendor/renderer.js').then(({ createGlobe }) => {
    if (destroyed) return;
    try {
      engine = createGlobe(host, query('.rg-spills'), query('.rg-pin-label'), {
        onSelect: (id) => select(id), onFailure: () => { host.hidden = true; fallback.hidden = false; fallback.textContent = 'The 3D view is unavailable. Use the region selector below.'; },
        onActivity: () => {}, rotationSpeed: .035, resumeDelay: 2400,
      });
      engine.setChecks(valid);
      engine.setSelected(selected?.id ?? '');
      engine.setPaused(paused); motion(); fallback.hidden = true;
    } catch {
      host.hidden = true; fallback.textContent = 'The 3D view is unavailable. Use the region selector below.';
    }
  }).catch(() => { if (!destroyed) fallback.textContent = 'The 3D view is unavailable. Use the region selector below.'; });
  return () => { destroyed = true; media.removeEventListener('change', motion); engine?.dispose(); element.replaceChildren(); };
}
