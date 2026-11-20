export function GET({ site }) {
  if ((process.env.CLOVERSIGHT_SITE_STAGE || 'prod') !== 'prod') {
    return new Response('User-agent: *\nDisallow: /\n');
  }
  return new Response(['User-agent: *', 'Allow: /', 'Disallow: /app', 'Disallow: /stewards', 'Sitemap: ' + new URL('/sitemap.xml', site), ''].join('\n'));
}
