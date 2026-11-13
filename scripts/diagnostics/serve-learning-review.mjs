import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.join(root, 'data', 'learning-live-review');
fs.mkdirSync(directory, { recursive: true });
const codes = new Map();
const provider = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/supergence/authorize') {
    const callback = new URL(url.searchParams.get('redirect_uri'));
    if (callback.hostname !== '127.0.0.1' || callback.pathname !== '/__sleek/callback') {
      res.writeHead(400).end('Invalid local callback.');
      return;
    }
    const code = randomBytes(32).toString('base64url');
    codes.set(code, { challenge: url.searchParams.get('code_challenge'), callback: callback.href });
    callback.searchParams.set('state', url.searchParams.get('state'));
    callback.searchParams.set('code', code);
    res.writeHead(303, { Location: callback.href }).end();
    return;
  }
  if (url.pathname === '/api/supergence/token' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try {
      const { code, verifier, redirectUri } = JSON.parse(raw);
      const entry = codes.get(code);
      codes.delete(code);
      if (
        !entry ||
        entry.callback !== redirectUri ||
        entry.challenge !== createHash('sha256').update(verifier).digest('base64url')
      )
        throw new Error('Invalid proof');
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          user: {
            id: 'local-review-fixture',
            sleekId: 'local-review-fixture',
            name: 'Local review fixture',
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
await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve));
const reserve = http.createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const secret = randomBytes(32).toString('hex');
const env = {
  ...process.env,
  PORT: String(port),
  SIS_SESSION_SECRET: secret,
  SIS_DATA_DIR: directory,
  SIS_WORKSPACE_DIR: path.join(directory, 'workspace'),
  SILISLEEK_ORIGIN: `http://127.0.0.1:${provider.address().port}`,
  ENABLE_BACKGROUND_LLM_LOOPS: 'false',
};
const npmCli =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const backend = spawn(process.execPath, [npmCli, 'run', 'server'], {
  cwd: root,
  env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const log = fs.createWriteStream(path.join(directory, 'server.log'));
for (const stream of [backend.stdout, backend.stderr])
  stream.on('data', (chunk) => log.write(String(chunk).replaceAll(secret, '[REDACTED]')));
fs.writeFileSync(
  path.join(directory, 'review-session.json'),
  JSON.stringify(
    {
      origin: `http://127.0.0.1:${port}`,
      sessionUrl: `http://127.0.0.1:${port}/__session?token=${secret}`,
      backendPid: backend.pid,
      runnerPid: process.pid,
      limitation:
        'Local identity fixture; inference and source retrieval use the real configured services.',
    },
    null,
    2,
  ),
);
console.log(
  `Review backend starting on http://127.0.0.1:${port}. Private launch URL is in data/learning-live-review/review-session.json.`,
);
backend.once('exit', (code) => {
  console.log(`Backend exited ${code}`);
  provider.close();
  log.end();
});
