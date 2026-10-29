import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalRequest } from '../../server/security/local-boundary.js';
import { sessionAuth } from '../../server/security/session-auth.js';

test('local boundary rejects remote clients, hostile origins and rebinding hosts', () => {
  const request = (host, origin, remoteAddress = '127.0.0.1') => ({
    headers: { host, ...(origin ? { origin } : {}) },
    socket: { remoteAddress },
  });
  assert.equal(isLocalRequest(request('localhost:3009', 'http://localhost:3009')), true);
  assert.equal(isLocalRequest(request('localhost:3009', 'http://localhost:5173')), false);
  assert.equal(isLocalRequest(request('localhost:3009', 'https://example.com')), false);
  assert.equal(isLocalRequest(request('evil.example:3009')), false);
  assert.equal(isLocalRequest(request('localhost:3009', null, '192.168.1.2')), false);
  assert.equal(isLocalRequest(request('localhost:3009', 'null')), false);
  const preview = {
    ...request('localhost:3009', 'null'),
    method: 'GET',
    url: '/workspace/project/index.js',
  };
  assert.equal(isLocalRequest(preview), false);
  preview.headers.authorization = `Bearer ${sessionAuth.secret}`;
  assert.equal(isLocalRequest(preview), true);
  preview.url = '/api/settings';
  assert.equal(isLocalRequest(preview), false);
  preview.url = '/workspace/project/index.js';
  preview.method = 'POST';
  assert.equal(isLocalRequest(preview), false);
});
