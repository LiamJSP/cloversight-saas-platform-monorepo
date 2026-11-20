import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateAddress } from '../src/security/ssrf.mjs';

test('SSRF guard blocks private, link-local, mapped, documentation, and multicast ranges', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '100.64.0.1', '169.254.169.254', '172.31.0.1', '192.168.1.1', '198.51.100.10', '224.0.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:192.168.1.2', '::ffff:7f00:1', '64:ff9b::a9fe:a9fe', '2001:db8::1']) assert.equal(isPrivateAddress(address), true, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(isPrivateAddress(address), false, address);
});
