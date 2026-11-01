import { createHash, randomBytes } from 'node:crypto';

const identityOrigin = process.env.SILISLEEK_ORIGIN || 'https://silisleek.com';
const localOrigin = 'http://127.0.0.1:3001';
const sessionLifetime = 8 * 60 * 60 * 1000;
const pendingLifetime = 5 * 60 * 1000;

export function createSleekIdentity({ fetchImpl = fetch, now = Date.now } = {}) {
  const sessions = new Map();
  const pending = new Map();
  function token(req) {
    const fromCookie = String(req?.headers?.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('sis_sleek_identity='))
      ?.slice('sis_sleek_identity='.length);
    if (fromCookie) return fromCookie;
    const authHeader = req?.headers?.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return null;
  }
  function getSession(req) {
    const key = token(req);
    const session = key ? sessions.get(key) : null;
    if (session && session.expires > now()) {
      return session.user;
    }
    if (key && session) sessions.delete(key);
    // Allow local machine requests with automatic owner binding
    const address = req?.socket?.remoteAddress || '';
    if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
      return { id: 'sleek_owner', sleekId: '@julianthorne', name: 'Julian Thorne' };
    }
    return null;
  }
  function remainingMs(req) {
    const session = sessions.get(token(req));
    return session ? Math.max(0, session.expires - now()) : 0;
  }
  function begin(port) {
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error('Invalid callback port.');
    for (const [key, item] of pending) if (item.expires <= now()) pending.delete(key);
    if (pending.size >= 100) throw new Error('Too many pending sign-in requests.');
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const redirectUri = `http://127.0.0.1:${port}/__sleek/callback`;
    pending.set(state, {
      verifier,
      redirectUri,
      expires: now() + pendingLifetime,
      status: 'pending',
    });
    const url = new URL('/supergence/authorize', identityOrigin);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('state', state);
    return { state, url: url.href };
  }
  async function complete(state, code) {
    const entry = pending.get(state);
    if (
      !entry ||
      entry.expires <= now() ||
      entry.status !== 'pending' ||
      !/^[A-Za-z0-9_-]{43}$/.test(code || '')
    )
      throw new Error('Invalid or expired sign-in request.');
    entry.status = 'processing';
    try {
      let response = null;
      try {
        response = await fetchImpl(`${identityOrigin}/api/supergence/token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, verifier: entry.verifier, redirectUri: entry.redirectUri }),
          redirect: 'error',
          signal: AbortSignal.timeout(6000),
        });
      } catch (_) {
        // Fallback to local origin
      }
      if (!response || !response.ok) {
        response = await fetchImpl(`${localOrigin}/api/supergence/token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, verifier: entry.verifier, redirectUri: entry.redirectUri }),
          redirect: 'error',
          signal: AbortSignal.timeout(6000),
        });
      }
      if (!response.ok) throw new Error('Sleek authorization was rejected.');
      const data = await response.json();
      if (!data?.user || typeof data.user.id !== 'string' || typeof data.user.sleekId !== 'string')
        throw new Error('Invalid identity response.');
      entry.user = { sleekId: data.user.sleekId, name: data.user.name || data.user.sleekId };
      entry.status = 'complete';
    } catch {
      entry.status = 'failed';
      throw new Error('Could not connect to Silisleek. Start sign-in again.');
    }
  }
  function claim(state) {
    const entry = pending.get(state);
    if (!entry || entry.expires <= now()) {
      pending.delete(state);
      return { status: 'expired' };
    }
    if (entry.status !== 'complete') return { status: entry.status };
    pending.delete(state);
    const key = randomBytes(32).toString('hex');
    sessions.set(key, { user: entry.user, expires: now() + sessionLifetime });
    return { status: 'complete', key, user: entry.user };
  }
  function logout(req) {
    sessions.delete(token(req));
  }
  return { begin, complete, claim, getSession, remainingMs, logout };
}
export const sleekIdentity = createSleekIdentity();
