# Regional results globe

The portal mounts `index.js` in the results modal. It lazily imports `vendor/renderer.js`, a browser bundle of the supplied globe prototype's Three.js renderer, so the existing plain-JavaScript customer portal does not need Astro or Svelte. The source in `source/` is the original typed renderer and state helper; `npm run build:regional-globe` bundles it with the exact browser dependencies in the root package lock. `aws:deploy-web` rebuilds the bundle before uploading it. The checked-in bundle keeps the portal usable without running a separate frontend build during local development.

The renderer and coastline topology are client-only. They do not call an external map service. The HTML region selector and details work if WebGL cannot initialize. The renderer is disposed on every portal rerender or modal close. The included license files and notices cover the bundled open-source code and map data.
