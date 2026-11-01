import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSleekIdentity } from '../../server/security/sleek-identity.js';

test('browser authorization binds code exchange to state and proof and permits one claim', async () => {
  let now = 1000;
  let received;
  const identity = createSleekIdentity({
    now: () => now,
    fetchImpl: async (url, options) => {
      received = { url, body: JSON.parse(options.body) };
      return {
        ok: true,
        json: async () => ({ user: { id: 'user-1', sleekId: 'alice', name: 'Alice' } }),
      };
    },
  });
  const start = identity.begin(3009);
  const url = new URL(start.url);
  assert.equal(url.origin, 'https://silisleek.com');
  assert.equal(url.searchParams.get('state'), start.state);
  assert.equal(identity.claim(start.state).status, 'pending');
  await assert.rejects(identity.complete('bad-state', 'x'.repeat(43)));
  await identity.complete(start.state, 'x'.repeat(43));
  assert.equal(received.url, 'https://silisleek.com/api/supergence/token');
  assert.equal(
    createHash('sha256').update(received.body.verifier).digest('base64url'),
    url.searchParams.get('code_challenge'),
  );
  assert.equal(received.body.redirectUri, 'http://127.0.0.1:3009/__sleek/callback');
  const claim = identity.claim(start.state);
  assert.equal(claim.user.sleekId, 'alice');
  assert.equal(identity.claim(start.state).status, 'expired');
  const req = { headers: { cookie: `sis_sleek_identity=${claim.key}` } };
  assert.equal(identity.getSession(req).sleekId, 'alice');
  identity.logout(req);
  assert.equal(identity.getSession(req), null);
  const expiring = identity.begin(3009);
  now += 5 * 60 * 1000;
  assert.equal(identity.claim(expiring.state).status, 'expired');
  await assert.rejects(identity.complete(expiring.state, 'x'.repeat(43)));
});

test('failed provider exchange cannot create a session', async () => {
  const identity = createSleekIdentity({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  const start = identity.begin(3009);
  await assert.rejects(identity.complete(start.state, 'x'.repeat(43)), /Could not connect/);
  assert.equal(identity.claim(start.state).status, 'failed');
  assert.equal(identity.getSession({ headers: {} }), null);
});
