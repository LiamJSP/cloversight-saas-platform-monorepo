import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopology from 'world-atlas/land-110m.json';
import { pinState, type RegionCheck, type PinState } from './types';

type Palette = Record<PinState, string> & { ocean: string; land: string; coast: string; grid: string };
export interface GlobeOptions {
  onSelect: (id: string) => void;
  onFailure: () => void;
  onActivity: (state: 'rotating' | 'paused' | 'dragging') => void;
  resumeDelay: number;
  rotationSpeed: number;
}
interface Pin {
  check: RegionCheck;
  group: THREE.Group;
  head: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  spill: HTMLDivElement;
  point: THREE.Vector3;
  x: number; y: number; visible: boolean;
}
const RAD = Math.PI / 180;
export function coordinates(latitude: number, longitude: number, radius = 1) {
  return new THREE.Vector3(
    Math.cos(latitude * RAD) * Math.sin(longitude * RAD),
    Math.sin(latitude * RAD),
    Math.cos(latitude * RAD) * Math.cos(longitude * RAD),
  ).multiplyScalar(radius);
}

export function createGlobe(host: HTMLElement, spillHost: HTMLElement, label: HTMLElement, options: GlobeOptions) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, .1, 20);
  camera.position.set(0, 0, 5);
  const globe = new THREE.Group();
  globe.rotation.set(20 * RAD, 24 * RAD, 0, 'XYZ');
  scene.add(globe);
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  const key = new THREE.DirectionalLight(0xffecf7, 2.3);
  key.position.set(-3, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9c7f6, .6);
  fill.position.set(3, -1, 1); scene.add(fill);
  const surface = new THREE.MeshStandardMaterial({ roughness: .77, metalness: .08 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), surface);
  sphere.rotation.y = -Math.PI / 2;
  globe.add(sphere);
  let texture: THREE.CanvasTexture | undefined;
  let pins: Pin[] = [];
  let selected = '';
  let palette: Palette;
  let width = 1, height = 1;
  let paused = false, reduced = false, focused = false;
  let inView = true, disposed = false, lost = false;
  let pointer: { id: number; x: number; y: number; originX: number; originY: number; moved: boolean } | null = null;
  let resumeAt = 0, last = 0, frame = 0;
  let activity = '';
  let target: { x: number; y: number } | null = null;
  const world = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; requestDraw(); });
  intersection.observe(host);

  function cssColor(expression: string) {
    // Resolve inherited tokens and CSS color-mix in the browser; Three accepts the computed RGB.
    const probe = document.createElement('span'); probe.style.color = expression; host.append(probe);
    const value = getComputedStyle(probe).color; probe.remove();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${g},${b})`;
  }
  function readPalette(): Palette {
    return {
      healthy: cssColor('var(--ww-green, #00a55e)'), changed: cssColor('var(--ww-pink, #ce2376)'),
      degraded: cssColor('var(--ww-amber, #a8650c)'), outage: cssColor('var(--ww-red, #c5221f)'),
      unknown: cssColor('var(--ww-copy-soft, #77738b)'),
      ocean: cssColor('var(--ww-globe-ocean, #471c40)'),
      land: cssColor('var(--ww-globe-land, #d1a3be)'),
      coast: cssColor('color-mix(in srgb, var(--ww-pink-soft, #f7d8ea) 84%, var(--ww-plum, #782858))'),
      grid: cssColor('var(--ww-pink-soft, #f7d8ea)'),
    };
  }
  function drawTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = palette.ocean; ctx.fillRect(0, 0, 2048, 1024);
    const projection = geoEquirectangular().scale(2048 / (2 * Math.PI)).translate([1024, 512]);
    const path = geoPath(projection, ctx);
    // Natural Earth coastline only: no borders, roads, city labels, or remote asset requests.
    const land = feature(landTopology as unknown as Parameters<typeof feature>[0], landTopology.objects.land as unknown as Parameters<typeof feature>[1]);
    ctx.beginPath(); path(land); ctx.fillStyle = palette.land; ctx.fill();
    ctx.strokeStyle = palette.coast; ctx.lineWidth = 1.15; ctx.stroke();
    ctx.globalAlpha = .075; ctx.strokeStyle = palette.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= 2048; x += 2048 / 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
    for (let y = 0; y <= 1024; y += 1024 / 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke(); }
    texture?.dispose(); texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    surface.map = texture; surface.needsUpdate = true;
  }
  function clearPins() {
    for (const p of pins) {
      globe.remove(p.group); p.spill.remove();
      p.group.traverse(obj => {
        if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
      });
    }
    pins = [];
  }
  function setChecks(checks: RegionCheck[]) {
    clearPins();
    for (const check of checks) {
      const color = new THREE.Color(palette[pinState(check)]);
      const group = new THREE.Group(); const point = coordinates(check.latitude, check.longitude);
      group.position.copy(point);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), point);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.006, .009, .046, 8), new THREE.MeshStandardMaterial({ color, roughness: .6 }));
      stem.rotation.x = Math.PI / 2; stem.position.z = .022; group.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.021, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .6, roughness: .3, metalness: .12 }));
      head.position.z = .055; group.add(head);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.039, .044, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false }));
      ring.position.z = .006; group.add(ring);
      // A transparent flat glow on the globe simulates very local pin illumination without N point lights.
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(.15, .15), new THREE.ShaderMaterial({
        uniforms: { tint: { value: color } }, transparent: true, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'varying vec2 vUv; uniform vec3 tint; void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),3.)*.28;gl_FragColor=vec4(tint,a);}',
      }));
      glow.position.z = .007; group.add(glow); globe.add(group);
      const spill = document.createElement('div'); spill.className = 'ww-pin-spill';
      spill.style.background = `radial-gradient(circle, ${palette[pinState(check)]}, transparent 66%)`;
      spillHost.append(spill);
      pins.push({ check, group, head, ring, spill, point, x: 0, y: 0, visible: false });
    }
    requestDraw();
  }
  function refreshTheme() {
    palette = readPalette(); drawTexture();
    setChecks(pins.map(p => p.check)); requestDraw();
  }
  // Only theme mutations on the ancestor chain; animated child styles must not trigger texture rebuilds.
  const themeObserver = new MutationObserver(refreshTheme);
  for (let node: HTMLElement | null = host.parentElement; node; node = node.parentElement) {
    themeObserver.observe(node, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    const halfHeight = 1.16, halfWidth = halfHeight * width / height;
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(width, height); requestDraw();
  }
  function setSelected(id: string, focus = false) {
    selected = id;
    const pin = pins.find(p => p.check.id === id);
    if (focus && pin) {
      const wanted = -pin.check.longitude * RAD;
      const nearest = globe.rotation.y + Math.atan2(Math.sin(wanted - globe.rotation.y), Math.cos(wanted - globe.rotation.y));
      target = { x: pin.check.latitude * RAD, y: nearest }; resumeAt = performance.now() + options.resumeDelay + 700;
    }
    requestDraw();
  }
  function draw(now: number) {
    frame = 0;
    if (disposed || lost || !inView || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    const rotating = !paused && !reduced && !focused && !pointer && now >= resumeAt && !target;
    if (target) {
      const a = reduced ? 1 : 1 - Math.exp(-dt * 8);
      globe.rotation.x += (target.x - globe.rotation.x) * a;
      globe.rotation.y += (target.y - globe.rotation.y) * a;
      if (Math.abs(target.x - globe.rotation.x) + Math.abs(target.y - globe.rotation.y) < .001) target = null;
    } else if (rotating) globe.rotation.y += options.rotationSpeed * dt;
    const nextActivity = pointer?.moved ? 'dragging' : rotating ? 'rotating' : 'paused';
    if (nextActivity !== activity) { activity = nextActivity; options.onActivity(nextActivity); }
    globe.updateMatrixWorld(true);
    label.style.opacity = '0';
    for (const pin of pins) {
      world.copy(pin.point).applyMatrix4(globe.matrixWorld);
      // Orthographic view: the surface normal's Z defines the visible hemisphere.
      pin.visible = world.z > .055;
      projected.copy(pin.head.position); pin.group.localToWorld(projected); projected.project(camera);
      pin.x = (projected.x * .5 + .5) * width; pin.y = (-projected.y * .5 + .5) * height;
      pin.head.scale.setScalar(pin.check.id === selected ? 1.22 : 1);
      pin.ring.material.opacity = pin.check.id === selected ? .9 : .35;
      const edge = Math.exp(-Math.pow((world.z - .03) / .3, 2));
      // Glimmer peaks around the silhouette, persists briefly behind it, and vanishes toward the far side.
      pin.spill.style.opacity = String(edge * .09);
      pin.spill.style.transform = `translate3d(${pin.x}px,${pin.y}px,0)`;
      if (pin.check.id === selected && world.z > .18) {
        label.textContent = pin.check.id;
        label.style.opacity = '1';
        const labelX = Math.max(60, Math.min(width - 60, pin.x));
        label.style.transform = `translate3d(${labelX}px,${pin.y - 25}px,0) translate(-50%,-100%)`;
      }
    }
    renderer.render(scene, camera);
    if (rotating || target || (!paused && !reduced && !focused && !pointer && now < resumeAt)) requestDraw();
  }
  function requestDraw() { if (!frame && !disposed) frame = requestAnimationFrame(draw); }
  function hit(x: number, y: number) {
    const rect = host.getBoundingClientRect();
    return pins.filter(p => p.visible).map(p => ({ p, distance: Math.hypot(p.x - (x - rect.left), p.y - (y - rect.top)) }))
      .filter(p => p.distance <= 22).sort((a, b) => a.distance - b.distance)[0]?.p;
  }
  function down(e: PointerEvent) {
    if (pointer || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, originX: e.clientX, originY: e.clientY, moved: false };
    target = null; host.setPointerCapture(e.pointerId); requestDraw();
  }
  function move(e: PointerEvent) {
    if (!pointer) { host.style.cursor = hit(e.clientX, e.clientY) ? 'pointer' : 'grab'; return; }
    if (e.pointerId !== pointer.id) return;
    if (Math.hypot(e.clientX - pointer.originX, e.clientY - pointer.originY) > 6) pointer.moved = true;
    if (pointer.moved) {
      globe.rotation.y += (e.clientX - pointer.x) * .006;
      globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + (e.clientY - pointer.y) * .006, -1.3, 1.3);
      host.style.cursor = 'grabbing';
    }
    pointer.x = e.clientX; pointer.y = e.clientY; requestDraw();
  }
  function up(e: PointerEvent) {
    if (!pointer || e.pointerId !== pointer.id) return;
    const wasClick = !pointer.moved && e.type === 'pointerup';
    pointer = null; resumeAt = performance.now() + options.resumeDelay;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    host.style.cursor = 'grab';
    if (wasClick) { const p = hit(e.clientX, e.clientY); if (p) options.onSelect(p.check.id); }
    requestDraw();
  }
  function visibility() { last = 0; requestDraw(); }
  function contextLost(e: Event) { e.preventDefault(); lost = true; options.onFailure(); }
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up); host.addEventListener('lostpointercapture', up);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibility);
  refreshTheme(); resize();
  return {
    setChecks, setSelected, refreshTheme,
    setPaused(value: boolean) { paused = value; requestDraw(); },
    setReduced(value: boolean) { reduced = value; requestDraw(); },
    setFocused(value: boolean) { focused = value; requestDraw(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); themeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up); host.removeEventListener('lostpointercapture', up);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      clearPins(); sphere.geometry.dispose(); surface.dispose(); texture?.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
