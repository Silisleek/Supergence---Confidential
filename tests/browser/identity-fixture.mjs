import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';

export async function startIdentityFixture() {
  const codes = new Map();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/supergence/authorize') {
      const callback = new URL(url.searchParams.get('redirect_uri'));
      if (callback.hostname !== '127.0.0.1' || callback.pathname !== '/__sleek/callback') {
        res.writeHead(400).end();
        return;
      }
      const code = randomBytes(32).toString('base64url');
      codes.set(code, {
        challenge: url.searchParams.get('code_challenge'),
        callback: callback.href,
      });
      callback.searchParams.set('state', url.searchParams.get('state'));
      callback.searchParams.set('code', code);
      res.writeHead(303, { Location: callback.href }).end();
      return;
    }
    if (url.pathname === '/api/supergence/token' && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      try {
        const body = JSON.parse(raw);
        const entry = codes.get(body.code);
        codes.delete(body.code);
        if (
          !entry ||
          entry.callback !== body.redirectUri ||
          createHash('sha256').update(body.verifier).digest('base64url') !== entry.challenge
        )
          throw new Error('Invalid proof');
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            user: {
              id: 'desktop-fixture',
              sleekId: 'desktop-fixture',
              name: 'Desktop test fixture',
              supergenceActivated: true,
            },
          }),
        );
      } catch {
        res.writeHead(401).end('{}');
      }
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
