import { randomBytes, timingSafeEqual } from 'node:crypto';

function cookieName(req) {
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
  /^\/styles\/.*$/,
  /^\/scripts\/.*$/,
  /^\/images\/.*$/,
  /^\/fonts\/.*$/,
  /^\/favicon\.ico$/,
];

function isPublicRoute(req) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  const pathname = String(req.path || '');
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
    const header = req.headers.authorization || '';
    const bearer = /^Bearer ([a-f0-9]{64})$/i.exec(header)?.[1];
    const cookies = String(req.headers.cookie || '').split(';');
    const name = cookieName(req);
    const cookie = cookies.map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
    return matches(bearer) || matches(cookie?.slice(name.length + 1));
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
    if (!authorized(req))
      return res
        .status(401)
        .json({ error: 'Open the session link printed by Supergence to connect.' });
    next();
  }
  return { secret, authorized, middleware };
}

export const sessionAuth = createSessionAuth();
