import { sessionAuth } from './session-auth.js';

// Browser origins must be the app itself or the local Vite development server.
export function isLocalRequest(req) {
  const address = req.socket?.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false;
  let host;
  try {
    host = new URL(`http://${req.headers.host}`);
  } catch {
    return false;
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host.hostname)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  if (origin === 'null') {
    const pathname = String(req.url || '').split('?')[0];
    const bearerOnly = { headers: { authorization: req.headers.authorization } };
    return ['GET', 'HEAD'].includes(req.method) &&
      (pathname.startsWith('/workspace/') || pathname.startsWith('/vendor/three/')) &&
      sessionAuth.authorized(bearerOnly);
  }
  try {
    const parsed = new URL(origin);
    if (
      parsed.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    )
      return false;
    return (
      parsed.port === host.port ||
      (process.env.SIS_ALLOW_VITE_ORIGIN === '1' && parsed.port === '5173')
    );
  } catch {
    return false;
  }
}

export function localBoundary(req, res, next) {
  if (!isLocalRequest(req)) return res.status(403).json({ error: 'Local access only.' });
  next();
}
