// Rebuild the lazy browser renderer from the supplied prototype source.
// The checked-in vendor bundle lets local static development work before npm ci.
import { build } from 'esbuild';
await build({
  entryPoints: ['apps/customer/regional-globe/source/renderer.ts'],
  outfile: 'apps/customer/regional-globe/vendor/renderer.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
});
console.log('Regional globe renderer bundled for the customer portal.');
