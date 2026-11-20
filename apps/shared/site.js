document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
document.querySelectorAll('[data-login-link]').forEach((node) => node.setAttribute('href', '/app/?action=login'));
document.querySelectorAll('[data-signup-link]').forEach((node) => node.setAttribute('href', '/app/?action=signup'));

// Public calls to action start Cognito directly. The /app/ URL remains a
// no-JavaScript/error fallback, but ordinary clicks no longer render the portal
// entry screen for a frame before continuing to the vanity authentication host.
const portalAuthModule = import('/static/auth.js?v=0.5.15');
document.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-login-link], [data-signup-link]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (link.getAttribute('aria-busy') === 'true') return;
  link.setAttribute('aria-busy', 'true');
  try {
    const { beginPortalAuth } = await portalAuthModule;
    await beginPortalAuth('customer', { screenHint: link.matches('[data-signup-link]') ? 'signup' : 'login' });
  } catch {
    location.assign(link.href);
  }
});

const normalizedPath = location.pathname === '/home' || location.pathname === '/home/' ? '/' : location.pathname.replace(/\/$/, '') || '/';
document.querySelectorAll('[data-public-navigation] a[href^="/"]').forEach((link) => {
  const linkPath = new URL(link.href, location.origin).pathname.replace(/\/$/, '') || '/';
  if (linkPath === normalizedPath) link.setAttribute('aria-current', 'page');
});

const menuButton = document.querySelector('[data-public-menu]');
const navigation = document.querySelector('[data-public-navigation]');
if (menuButton && navigation) {
  // A cached 0.5.20 page can request this script while its distribution updates.
  const openLabel = menuButton.dataset.openLabel || menuButton.getAttribute('aria-label');
  const closeLabel = menuButton.dataset.closeLabel || 'Close navigation';
  const closeButton = document.createElement('button');
  closeButton.className = 'public-menu-close secondary';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', closeLabel);
  closeButton.dataset.publicMenuClose = '';
  closeButton.innerHTML = '<span aria-hidden="true"></span>';
  const menuHeader = document.createElement('div');
  menuHeader.className = 'public-menu-header';
  const menuBrand = document.querySelector('.public-nav > .brand')?.cloneNode(true);
  if (menuBrand) menuHeader.append(menuBrand);
  menuHeader.append(closeButton);
  const menuItems = document.createElement('div');
  menuItems.className = 'public-menu-items';
  menuItems.append(...navigation.children);
  navigation.append(menuHeader, menuItems);

  const setMenu = (open, { returnFocus = false } = {}) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? closeLabel : openLabel);
    navigation.dataset.open = String(open);
    document.body.classList.toggle('public-menu-open', open);
    navigation.setAttribute('aria-hidden', String(!open && !matchMedia('(min-width: 981px)').matches));
    if (open) closeButton.focus();
    else if (returnFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  closeButton.addEventListener('click', () => setMenu(false, { returnFocus: true }));
  navigation.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (event) => {
    if (menuButton.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, { returnFocus: true }); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...navigation.querySelectorAll('a[href],button:not([disabled])')].filter((node) => node.getClientRects().length);
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  document.addEventListener('click', (event) => { if (!event.target.closest('.public-nav') && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false); });
  const desktop = matchMedia('(min-width: 981px)');
  const handleViewportChange = (event) => { if (event.matches) setMenu(false); navigation.setAttribute('aria-hidden', String(!event.matches)); };
  if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', handleViewportChange);
  else desktop.addListener(handleViewportChange);
  navigation.setAttribute('aria-hidden', String(!desktop.matches));
}

const healthNode = document.querySelector('[data-live-health]');
if (healthNode) {
  const detailNode = document.querySelector('[data-live-health-detail]');
  fetch('/api/health', { cache: 'no-store', headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Health endpoint returned ${response.status}.`);
      if ((await response.json())?.status !== 'healthy') throw new Error('Unhealthy public API response.');
      healthNode.className = 'service-health healthy';
      healthNode.textContent = healthNode.dataset.ok || 'Public health endpoint responded';
      if (detailNode) detailNode.textContent = `${detailNode.dataset.checked || 'Checked'} ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`;
    })
    .catch(() => {
      healthNode.className = 'service-health unhealthy';
      healthNode.textContent = healthNode.dataset.failed || 'Public health check unsuccessful';
      if (detailNode) detailNode.textContent = detailNode.dataset.failed || 'This browser could not confirm a healthy public API response.';
    });
}
