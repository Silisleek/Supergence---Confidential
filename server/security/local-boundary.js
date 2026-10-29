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
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (
          ['localhost', '127.0.0.1', '[::1]'].includes(refUrl.hostname) &&
          refUrl.port === host.port &&
          refUrl.pathname.startsWith('/workspace/')
        ) {
          return true;
        }
      } catch {}
    }
    return false;
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
