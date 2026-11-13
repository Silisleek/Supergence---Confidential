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
        json: async () => ({
          user: { id: 'user-1', sleekId: 'alice', name: 'Alice', supergenceActivated: true },
        }),
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
  const signal = identity.getSignal(req);
  identity.logout(req);
  assert.equal(identity.getSession(req), null);
  assert.equal(signal.aborted, true);
  assert.equal(signal.reason.code, 'TASK_CANCELLED');
  const expiring = identity.begin(3009);
  now += 5 * 60 * 1000;
  assert.equal(identity.claim(expiring.state).status, 'expired');
  await assert.rejects(identity.complete(expiring.state, 'x'.repeat(43)));
});

test('failed provider exchange cannot create a session', async () => {
  const calls = [];
  const identity = createSleekIdentity({
    fetchImpl: async (url) => {
      calls.push(url);
      throw new Error('offline');
    },
  });
  const start = identity.begin(3009);
  await assert.rejects(identity.complete(start.state, 'x'.repeat(43)), /Could not connect/);
  assert.equal(identity.claim(start.state).status, 'failed');
  assert.equal(identity.getSession({ headers: {} }), null);
  assert.deepEqual(calls, ['https://silisleek.com/api/supergence/token']);
});

test('identity without confirmed entitlement cannot create a session', async () => {
  for (const supergenceActivated of [false, undefined, 'true']) {
    const identity = createSleekIdentity({
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ user: { id: 'fixture', sleekId: 'fixture', supergenceActivated } }),
      }),
    });
    const start = identity.begin(3009);
    await assert.rejects(identity.complete(start.state, 'x'.repeat(43)));
    const claim = identity.claim(start.state);
    assert.equal(claim.status, 'failed');
    assert.match(claim.message, /activation was not confirmed/);
    assert.equal(claim.key, undefined);
  }
});

test('loopback, expired and logged-out requests cannot impersonate an owner', async () => {
  let now = 0;
  const identity = createSleekIdentity({
    now: () => now,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        user: { id: 'fixture', sleekId: 'fixture-user', supergenceActivated: true },
      }),
    }),
  });
  const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(identity.getSession(req), null);
  const start = identity.begin(3009, 'https://silisleek.com.attacker.example');
  assert.equal(new URL(start.url).origin, 'https://silisleek.com');
  await identity.complete(start.state, 'x'.repeat(43));
  req.headers.cookie = `sis_sleek_identity=${identity.claim(start.state).key}`;
  assert.equal(identity.getSession(req).id, 'fixture');
  const signal = identity.getSignal(req);
  now += 8 * 60 * 60 * 1000;
  assert.equal(identity.getSession(req), null);
  assert.equal(signal.aborted, true);
  assert.equal(identity.remainingMs(req), 0);
});

test('identity providers are configured explicitly and never taken from request data', () => {
  for (const providerOrigin of [
    'http://evil.example',
    'https://good.example/path',
    'https://user:pass@good.example',
    'file:///tmp',
  ])
    assert.throws(() => createSleekIdentity({ providerOrigin }));
  const identity = createSleekIdentity({ providerOrigin: 'http://127.0.0.1:4567' });
  assert.equal(
    new URL(identity.begin(3009, 'https://attacker.example').url).origin,
    'http://127.0.0.1:4567',
  );
});
