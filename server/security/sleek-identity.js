import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const identityOrigin = process.env.SILISLEEK_ORIGIN || 'https://silisleek.com';
const sessionLifetime = 8 * 60 * 60 * 1000;
const pendingLifetime = 5 * 60 * 1000;

export function createSleekIdentity({
  fetchImpl = fetch,
  now = Date.now,
  providerOrigin = identityOrigin,
  persist = false,
  sessionFile = null,
} = {}) {
  const provider = new URL(providerOrigin);
  if (
    provider.origin !== providerOrigin ||
    provider.username ||
    provider.password ||
    !(
      provider.protocol === 'https:' ||
      (provider.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(provider.hostname))
    )
  )
    throw new Error('Configure an HTTPS identity origin or an explicit loopback test provider.');
  const sessions = new Map();
  const pending = new Map();

  const filePath =
    sessionFile || path.resolve(process.cwd(), '.freebuff/sleek-sessions.json');

  function saveSessions() {
    if (!persist) return;
    try {
      const dump = {};
      for (const [k, v] of sessions) {
        if (v && v.expires > now() && v.user) {
          dump[k] = { user: v.user, expires: v.expires };
        }
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf8');
    } catch {
      // ignore persistence error
    }
  }

  function revoke(key, message) {
    const session = sessions.get(key);
    if (!session) return;
    clearTimeout(session.timer);
    const reason = new Error(message);
    reason.code = 'TASK_CANCELLED';
    session.controller.abort(reason);
    sessions.delete(key);
    saveSessions();
  }

  if (persist && fs.existsSync(filePath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const [key, item] of Object.entries(saved || {})) {
        if (item && item.expires > now() && item.user) {
          const controller = new AbortController();
          const delay = Math.max(1000, item.expires - now());
          const timer = setTimeout(
            () => revoke(key, 'Sleek sign-in expired. Reconnect before continuing work.'),
            delay,
          );
          timer.unref();
          sessions.set(key, { user: item.user, expires: item.expires, controller, timer });
        }
      }
    } catch {
      // ignore parse error
    }
  }
  function token(req) {
    const cookies = String(req?.headers?.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('sis_sleek_identity='))
      .map((s) => s.slice('sis_sleek_identity='.length));
    for (const c of cookies) {
      if (sessions.has(c)) return c;
    }
    if (cookies.length > 0) return cookies[0];
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
    if (key && session) revoke(key, 'Sleek sign-in expired. Reconnect before continuing work.');
    return null;
  }
  function getSignal(req) {
    if (!getSession(req)) {
      const active = sessions.get(token(req));
      if (active?.controller?.signal) return active.controller.signal;
      throw new Error('Sleek sign-in required.');
    }
    return sessions.get(token(req)).controller.signal;
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
    const url = new URL('/supergence/authorize', provider.origin);
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
      const response = await fetchImpl(`${provider.origin}/api/supergence/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, verifier: entry.verifier, redirectUri: entry.redirectUri }),
        redirect: 'error',
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error('Sleek authorization was rejected.');
      const data = await response.json();
      if (
        !data?.user ||
        typeof data.user.id !== 'string' ||
        !data.user.id.trim() ||
        typeof data.user.sleekId !== 'string' ||
        !data.user.sleekId.trim()
      )
        throw new Error('Invalid identity response.');
      if (data.user.supergenceActivated !== true) {
        entry.error =
          'Supergence activation was not confirmed by Silisleek. Complete activation there and reconnect.';
        throw new Error(entry.error);
      }
      entry.user = {
        id: data.user.id,
        sleekId: data.user.sleekId,
        name: data.user.name || data.user.sleekId,
        supergenceActivated: true,
      };
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
    if (entry.status !== 'complete')
      return { status: entry.status, ...(entry.error ? { message: entry.error } : {}) };
    pending.delete(state);
    const key = randomBytes(32).toString('hex');
    const controller = new AbortController();
    const timer = setTimeout(
      () => revoke(key, 'Sleek sign-in expired. Reconnect before continuing work.'),
      sessionLifetime,
    );
    timer.unref();
    sessions.set(key, { user: entry.user, expires: now() + sessionLifetime, controller, timer });
    saveSessions();
    return { status: 'complete', key, user: entry.user };
  }
  function logout(req) {
    revoke(token(req), 'Signed out. No further task actions will be started.');
  }
  return { begin, complete, claim, getSession, getSignal, remainingMs, logout };
}
export const sleekIdentity = createSleekIdentity({ persist: true });
