import { sessionAuth } from './session-auth.js';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Browser origins must be the app itself or the local Vite development server.
export function isLocalRequest(req) {
  const address = req.socket?.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false;
  let host;
  try {
    host = new URL(`${req.socket?.encrypted ? 'https' : 'http'}://${req.headers.host}`);
  } catch {
    return false;
  }
  if (!ALLOWED_HOSTS.has(host.hostname) || host.username || host.password || host.pathname !== '/')
    return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  if (origin === 'null') {
    const pathname = String(req.url || '').split('?')[0];
    const bearerOnly = { headers: { authorization: req.headers.authorization } };
    return (
      ['GET', 'HEAD'].includes(req.method) &&
      (pathname.startsWith('/workspace/') || pathname.startsWith('/vendor/three/')) &&
      sessionAuth.authorized(bearerOnly)
    );
  }
  try {
    const parsed = new URL(origin);
    if (origin !== parsed.origin || !ALLOWED_HOSTS.has(parsed.hostname)) return false;
    return (
      parsed.origin === host.origin ||
      (process.env.SIS_ALLOW_VITE_ORIGIN === '1' &&
        parsed.protocol === 'http:' &&
        parsed.port === '5173')
    );
  } catch {
    return false;
  }
}

export function localBoundary(req, res, next) {
  if (!isLocalRequest(req)) return res.status(403).json({ error: 'Local access only.' });
  next();
}
