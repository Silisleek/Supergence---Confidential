import { randomBytes, timingSafeEqual } from 'node:crypto';

export function cookieName(req) {
  try {
    const port = new URL(`http://${req.headers.host}`).port;
    return /^\d{1,5}$/.test(port) ? `sis_session_${port}` : 'sis_session';
  } catch {
    return 'sis_session';
  }
}

const PUBLIC_PATTERNS = [
  /^\/(silisleek|silisleek\.html|silisleek\/.*|supergence-silisleek)(\?.*)?$/,
  /^\/(installer|installer\.html|download|download\.html|downloads|install|install\.html)(\?.*)?$/,
  /^\/release(\/.*)?$/,
  /^\/api\/health$/,
  /^\/api\/silisleek\/(auth|roles|session|logout)(\?.*)?$/,
  /^\/styles\/.*$/,
  /^\/scripts\/.*$/,
  /^\/images\/.*$/,
  /^\/fonts\/.*$/,
  /^\/favicon\.ico$/,
  /^\/sleek-login$/,
  /^\/__sleek\/callback$/,
];

export function isLocalRequest(req) {
  const ip = req?.socket?.remoteAddress || req?.connection?.remoteAddress || '';
  const host = String(req?.headers?.host || '')
    .split(':')[0]
    .toLowerCase();
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]'
  );
}

export function isPublicRoute(req) {
  const pathname = String(req.path || '');
  if (
    ['POST', 'GET', 'HEAD'].includes(req.method) &&
    /^\/api\/silisleek\/(auth|roles|session|logout)(\?.*)?$/.test(pathname)
  ) {
    return true;
  }
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  return PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function createSessionAuth(
  secret = process.env.SIS_SESSION_SECRET || randomBytes(32).toString('hex'),
) {
  if (!/^[a-f0-9]{64}$/i.test(secret))
    throw new Error('SIS_SESSION_SECRET must be 64 hexadecimal characters.');
  const expected = Buffer.from(secret, 'hex');
  function matches(value) {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) return false;
    return timingSafeEqual(expected, Buffer.from(value, 'hex'));
  }
  function authorized(req) {
    const header = req?.headers?.authorization || '';
    const bearer = /^Bearer ([a-f0-9]{32,64}|[A-Za-z0-9_-]{20,})$/i.exec(header)?.[1];
    const cookies = String(req?.headers?.cookie || '').split(';');
    const name = cookieName(req);
    const cookie = cookies.map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
    const tokenVal = cookie?.slice(name.length + 1);
    return matches(bearer) || matches(tokenVal);
  }
  function middleware(req, res, next) {
    if (req.path === '/__session' && req.method === 'GET') {
      if (!matches(req.query.token)) return res.status(401).send('Invalid session link.');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader(
        'Set-Cookie',
        `${cookieName(req)}=${secret}; Path=/; HttpOnly; SameSite=Strict`,
      );
      const target =
        typeof req.query.next === 'string' &&
        req.query.next.startsWith('/') &&
        !req.query.next.startsWith('//') &&
        !req.query.next.includes('\\')
          ? req.query.next
          : '/';
      return res.redirect(303, target);
    }
    if (isPublicRoute(req)) return next();
    if (authorized(req)) return next();
    if (
      req.method === 'GET' &&
      (req.headers.accept?.includes('text/html') || !req.path.startsWith('/api/')) &&
      (req.path === '/' ||
        req.path === '/index.html' ||
        req.path === '/classic' ||
        req.path === '/sleek-login')
    ) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader(
        'Set-Cookie',
        `${cookieName(req)}=${secret}; Path=/; HttpOnly; SameSite=Strict`,
      );
      const existing = req.headers.cookie ? `${req.headers.cookie}; ` : '';
      req.headers.cookie = `${existing}${cookieName(req)}=${secret}`;
      return next();
    }
    return res
      .status(401)
      .json({ error: 'Open the session link printed by Supergence to connect.' });
  }
  return { secret, authorized, middleware };
}

export const sessionAuth = createSessionAuth();
