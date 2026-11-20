// File-based editorial pages are the complete public index; the custom error page is excluded.
const pages = Object.keys(import.meta.glob('./*.astro')).map(path => path.slice(2, -6)).filter(name => name !== '404').sort();
export function GET({ site }) {
  const items = pages.map(name => '<url><loc>' + new URL(name === 'index' ? '/' : '/' + name, site).href + '</loc></url>');
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + items.join('') + '</urlset>\n');
}
