import dns from 'node:dns/promises';
import net from 'node:net';

function inV4(ip, base, bits) {
  const toInt = (value) => value.split('.').reduce((result, octet) => (result * 256 + Number(octet)) >>> 0, 0);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(base) & mask);
}
const RESERVED_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
];
function privateV4(ip) { return RESERVED_V4.some(([base, bits]) => inV4(ip, base, bits)); }
function privateV6(ip) {
  // Compare numeric prefixes, never textual spellings of IPv6. Expanded
  // loopback/unspecified addresses and translation mechanisms must fail closed.
  if (ip.includes('%') || ip.includes('.')) return true;
  const halves = ip.toLowerCase().split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const words = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  const value = words.reduce((acc, word) => (acc << 16n) | BigInt(`0x${word}`), 0n);
  const inPrefix = (base, bits) => (value >> BigInt(128 - bits)) === (base >> BigInt(128 - bits));
  // Only ordinary global unicast, excluding IETF special-purpose, 6to4 and
  // documentation allocations. Special-purpose exceptions are not web targets.
  return !inPrefix(0x20000000000000000000000000000000n, 3)
    || inPrefix(0x20010000000000000000000000000000n, 23)
    || inPrefix(0x20010db8000000000000000000000000n, 32)
    || inPrefix(0x20020000000000000000000000000000n, 16)
    || inPrefix(0x3fff0000000000000000000000000000n, 20);
}
export function isPrivateAddress(ip) { const family = net.isIP(ip); return family === 4 ? privateV4(ip) : family === 6 ? privateV6(ip) : true; }

export async function resolveSafeTarget(rawUrl, allowPrivate = false) {
  let url;
  try { url = new URL(rawUrl); } catch { throw Object.assign(new Error('Watcher URL is invalid.'), { statusCode: 400 }); }
  if (!['http:', 'https:'].includes(url.protocol)) throw Object.assign(new Error('Only HTTP and HTTPS watcher URLs are supported.'), { statusCode: 400 });
  if (url.username || url.password) throw Object.assign(new Error('Credentials in watcher URLs are not supported.'), { statusCode: 400 });
  if (!allowPrivate && url.port && !['80', '443', '8080', '8443'].includes(url.port)) throw Object.assign(new Error('This target port is not allowed.'), { statusCode: 400 });
  if (!allowPrivate && (url.hostname === 'localhost' || url.hostname.endsWith('.local'))) throw Object.assign(new Error('Private targets are disabled.'), { statusCode: 400 });
  let addresses;
  try { addresses = await dns.lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true, verbatim: true }); }
  catch (error) { throw Object.assign(new Error('The target hostname could not be resolved.'), { code: 'DNS_RESOLUTION_FAILED', cause: error }); }
  if (!addresses.length) throw Object.assign(new Error('The target hostname did not resolve.'), { code: 'DNS_RESOLUTION_FAILED' });
  if (!allowPrivate && addresses.some((entry) => isPrivateAddress(entry.address))) throw Object.assign(new Error('The target resolves to a private or reserved address.'), { statusCode: 400, code: 'PRIVATE_TARGET' });
  return { url, addresses: addresses.map((entry) => ({ address: entry.address, family: Number(entry.family) })) };
}

export async function assertSafeTarget(rawUrl, allowPrivate = false) {
  return (await resolveSafeTarget(rawUrl, allowPrivate)).url;
}
