/** @module public/hero-globe
 * @description Illustrative interactive globe on the public home page.
 */
// The public globe reuses the portal's bundled Three.js renderer. These sample
// markers illustrate geographic reach and never represent a customer's checks.
const REGIONS = [
  ['us-east-1', 'US East (N. Virginia)', 38.95, -77.45],
  ['us-east-2', 'US East (Ohio)', 40.09, -82.98],
  ['us-west-2', 'US West (Oregon)', 45.84, -119.7],
  ['ca-central-1', 'Canada (Central)', 45.5, -73.6],
  ['mx-central-1', 'Mexico (Central)', 20.7, -103.4],
  ['sa-east-1', 'South America (São Paulo)', -23.55, -46.63],
  ['eu-west-1', 'Europe (Ireland)', 53.35, -6.26],
  ['eu-central-1', 'Europe (Frankfurt)', 50.11, 8.68],
  ['eu-north-1', 'Europe (Stockholm)', 59.33, 18.06],
  ['af-south-1', 'Africa (Cape Town)', -33.92, 18.42],
  ['me-south-1', 'Middle East (Bahrain)', 26.22, 50.59],
  ['ap-south-1', 'Asia Pacific (Mumbai)', 19.08, 72.88],
  ['ap-southeast-1', 'Asia Pacific (Singapore)', 1.35, 103.82],
  ['ap-southeast-2', 'Asia Pacific (Sydney)', -33.87, 151.21],
  ['ap-northeast-1', 'Asia Pacific (Tokyo)', 35.68, 139.69],
];

const stage = document.querySelector('[data-hero-globe]');
if (stage) {
  const host = stage.querySelector('.rg-host');
  const fallback = stage.querySelector('.rg-fallback');
  const status = stage.querySelector('[data-hero-region]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let globe = null;
  let selectedIndex = -1;
  let checks = [];

  async function mount() {
    try {
      const { createGlobe } = await import('/app-static/regional-globe/vendor/renderer.js?v=0.5.15');
      const shuffled = [...REGIONS];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      shuffled.length = 12;
      // Randomize only the illustrative pins, never the platform's real status.
      const red = new Set(shuffled.slice(0, 2).map(([id]) => id));
      checks = shuffled.map(([id, name, latitude, longitude]) => ({ id, name, latitude, longitude, checkedAt: '', statusCode: red.has(id) ? null : 200, content: 'green', state: red.has(id) ? 'outage' : 'healthy' }));
      globe = createGlobe(host, stage.querySelector('.rg-spills'), stage.querySelector('.rg-pin-label'), {
        onSelect(id) { selectedIndex = checks.findIndex((check) => check.id === id); if (selectedIndex >= 0) status.textContent = `${checks[selectedIndex].name}, ${stage.dataset.marker || 'example marker'}`; },
        onFailure() { host.hidden = true; fallback.hidden = false; fallback.textContent = stage.dataset.fallback || 'The globe illustration is unavailable.'; },
        onActivity() {},
        rotationSpeed: 0.016,
        resumeDelay: 2800,
      });
      globe.setChecks(checks);
      globe.setReduced(reducedMotion.matches);
      reducedMotion.addEventListener('change', onMotionChange);
      host.addEventListener('keydown', onKeydown);
      host.addEventListener('focus', onFocus);
      host.addEventListener('blur', onBlur);
      window.addEventListener('pagehide', dispose, { once: true });
    } catch {
      host.hidden = true;
      fallback.hidden = false;
      fallback.textContent = stage.dataset.fallback || 'The globe illustration is unavailable.';
    }
  }
  function onMotionChange() { globe?.setReduced(reducedMotion.matches); }
  function onFocus() { globe?.setFocused(true); }
  function onBlur() { globe?.setFocused(false); }
  function onKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !checks.length) return;
    event.preventDefault();
    selectedIndex = (selectedIndex + (event.key === 'ArrowRight' ? 1 : -1) + checks.length) % checks.length;
    const selected = checks[selectedIndex];
    globe?.setSelected(selected.id, true);
    status.textContent = `${selected.name}, ${stage.dataset.marker || 'example marker'}`;
  }
  function dispose() {
    globe?.dispose(); globe = null;
    reducedMotion.removeEventListener('change', onMotionChange);
    host.removeEventListener('keydown', onKeydown);
    host.removeEventListener('focus', onFocus);
    host.removeEventListener('blur', onBlur);
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) return;
    observer.disconnect();
    void mount();
  }, { rootMargin: '160px' });
  observer.observe(stage);
}
