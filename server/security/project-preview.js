import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { isLocalRequest } from './local-boundary.js';

const lifetimeMs = 30 * 60 * 1000;
const maxGrants = 100;
const policy =
  "sandbox allow-scripts allow-forms allow-pointer-lock; default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";

export function createProjectPreviewService({
  workspace,
  vendorRoot,
  transformHtml,
  filesEnabled = () => true,
  now = Date.now,
}) {
  const grants = new Map();
  function prune() {
    for (const [key, grant] of grants) if (grant.expires <= now()) grants.delete(key);
    while (grants.size >= maxGrants) grants.delete(grants.keys().next().value);
  }
  function issueGrant(relativePath) {
    if (!filesEnabled()) throw new Error('File access is disabled in Access settings.');
    const relative = String(relativePath || '')
      .replaceAll('\\', '/')
      .replace(/^\/+/, '');
    const segments = relative.split('/');
    if (
      segments.length < 2 ||
      segments.some((part) => !part || part === '.' || part === '..') ||
      !/\.html?$/i.test(relative)
    )
      throw new Error('Multi-file previews require an HTML file inside a project folder.');
    const file = resolveWithinRoot(workspace.baseRoot, relative);
    if (!fs.statSync(file).isFile()) throw new Error('Preview file is not a regular file.');
    const root = resolveWithinRoot(workspace.baseRoot, path.dirname(relative));
    prune();
    const token = randomBytes(32).toString('hex');
    grants.set(token, { root, expires: now() + lifetimeMs });
    return `/__project-preview/${token}/${encodeURIComponent(path.basename(relative))}`;
  }
  function issue(req, res) {
    try {
      const url = issueGrant(req.body?.path);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        url,
        networkRestricted: true,
      });
    } catch (error) {
      res.status(error.message.includes('disabled') ? 403 : 400).json({ error: error.message });
    }
  }
  function serve(req, res) {
    const headers = { ...req.headers };
    delete headers.origin;
    if (!isLocalRequest({ ...req, headers, socket: req.socket })) return res.status(403).end();
    if (!filesEnabled() || !['GET', 'HEAD'].includes(req.method)) return res.status(403).end();
    const match = /^\/([a-f0-9]{64})\/(.*)$/.exec(req.path);
    const grant = match && grants.get(match[1]);
    if (!grant || grant.expires <= now()) return res.status(404).end();
    let relative;
    try {
      relative = decodeURIComponent(match[2]);
    } catch {
      return res.status(400).end();
    }
    const pieces = relative.split('/');
    if (
      !relative ||
      relative.includes('\\') ||
      relative.includes('\0') ||
      pieces.some((part) => !part || part.startsWith('.')) ||
      /\.(?:pem|key|p12|pfx)$/i.test(relative)
    )
      return res.status(403).end();
    try {
      const isVendor = relative.startsWith('_vendor/three/');
      const file = isVendor
        ? resolveWithinRoot(vendorRoot, relative.slice('_vendor/three/'.length))
        : resolveWithinRoot(grant.root, relative);
      if (!fs.statSync(file).isFile()) return res.status(404).end();
      res.setHeader('Content-Security-Policy', policy);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (!isVendor && /\.html?$/i.test(relative)) {
        const html = transformHtml(
          fs.readFileSync(file, 'utf8'),
          `/__project-preview/${match[1]}/_vendor/three`,
        );
        return res.type('html').send(html);
      }
      return res.sendFile(file);
    } catch (error) {
      return res.status(error.code === 'ENOENT' ? 404 : 403).end();
    }
  }
  return { issue, issueGrant, serve, revokeAll: () => grants.clear() };
}
