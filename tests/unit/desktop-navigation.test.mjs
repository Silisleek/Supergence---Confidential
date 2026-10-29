import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isTrustedApplicationUrl } = require('../../electron/navigation-policy.cjs');
const options = { backendPort: 3008, vitePort: 5173, development: false };

test('desktop privileges are restricted to the expected main application URL', () => {
  assert.equal(isTrustedApplicationUrl('http://localhost:3008/', options), true);
  assert.equal(
    isTrustedApplicationUrl('http://127.0.0.1:3008/index.html?mode=chat', options),
    true,
  );
  for (const url of [
    'http://localhost:3008/workspace/malicious.html',
    'http://localhost:3008/api/settings',
    'http://localhost:5173/',
    'https://localhost:3008/',
    'http://localhost.attacker.test:3008/',
    'http://user@localhost:3008/',
    'file:///tmp/test.html',
    'javascript:alert(1)',
  ])
    assert.equal(isTrustedApplicationUrl(url, options), false, url);
  assert.equal(
    isTrustedApplicationUrl('http://localhost:5173/', { ...options, development: true }),
    true,
  );
});
