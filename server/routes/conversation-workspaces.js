import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import workspace from '../workspace/manager.js';
import { conversationWorkspaces, containedPath } from '../services/conversationWorkspaces.js';
import { runtimeAccess } from '../services/runtimeAccess.js';

const maxAttachmentBytes = 10 * 1024 * 1024;
const maxEditableBytes = 1024 * 1024;
const revisionOf = (buffer) => createHash('sha256').update(buffer).digest('hex');
const imageTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

function readText(buffer) {
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

export function registerConversationWorkspaceRoutes(app) {
  const streams = new Set();
  runtimeAccess.onChange((next, previous) => {
    if (previous.files && !next.files) for (const stream of streams) stream.end();
  });
  app.use('/api/conversations/:id/workspace', (_req, res, next) => {
    if (!runtimeAccess.settings.files)
      return res.status(403).json({ error: 'File access is disabled in Access settings.' });
    next();
  });
  const record = (req) => conversationWorkspaces.ensure(workspace.baseRoot, req.params.id);
  app.post('/api/conversations/:id/workspace', (req, res) => {
    try {
      res.json(conversationWorkspaces.snapshot(record(req)));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post('/api/conversations/:id/workspace/attachments', (req, res) => {
    const files = req.body?.files;
    if (!Array.isArray(files) || !files.length || files.length > 5)
      return res.status(400).json({ error: 'Choose between 1 and 5 files.' });
    let uploaded;
    try {
      let total = 0;
      uploaded = files.map(({ name, data } = {}, index) => {
        if (typeof name !== 'string' || !name || name.length > 255 || typeof data !== 'string')
          throw new Error('Invalid attachment.');
        if (data.length > Math.ceil((maxAttachmentBytes - total) / 3) * 4)
          throw new Error('Attachments must total 10 MB or less.');
        const bytes = Buffer.from(data, 'base64');
        if (bytes.toString('base64') !== data) throw new Error('Invalid attachment data.');
        total += bytes.length;
        if (total > maxAttachmentBytes) throw new Error('Attachments must total 10 MB or less.');
        const safeName = name
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/\.+$/, '')
          .slice(-100);
        return { filename: `${index + 1}-${safeName || 'file'}`, bytes };
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    let directory;
    let created = false;
    const written = [];
    try {
      const { root } = record(req);
      const hash = createHash('sha256');
      for (const { filename, bytes } of uploaded) {
        hash.update(JSON.stringify([filename, bytes.length]));
        hash.update(bytes);
      }
      const folder = `attachments/${hash.digest('hex').slice(0, 32)}`;
      directory = containedPath(root, folder);
      fs.mkdirSync(path.dirname(directory), { recursive: true });
      try {
        fs.mkdirSync(directory);
        created = true;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
      const paths = uploaded.map(({ filename, bytes }) => {
        const relative = `${folder}/${filename}`;
        const target = containedPath(root, relative);
        if (created) {
          const fd = fs.openSync(target, 'wx');
          written.push(target);
          try {
            fs.writeFileSync(fd, bytes);
          } finally {
            fs.closeSync(fd);
          }
        } else if (
          !fs.statSync(target).isFile() ||
          fs.statSync(target).size !== bytes.length ||
          !fs.readFileSync(target).equals(bytes)
        ) {
          throw new Error('This attachment has changed in the chat workspace.');
        }
        return relative;
      });
      return res.json({ paths });
    } catch (error) {
      for (const file of written) {
        try {
          fs.unlinkSync(file);
        } catch {}
      }
      if (created) {
        try {
          fs.rmdirSync(directory);
        } catch {}
      }
      return res.status(409).json({
        error: error.code ? 'Could not save files to this chat workspace.' : error.message,
      });
    }
  });
  app.get('/api/conversations/:id/workspace/files', (req, res) => {
    try {
      res.json(
        conversationWorkspaces.list(
          record(req),
          String(req.query.path || ''),
          Math.max(0, Math.floor(Number(req.query.offset) || 0)),
        ),
      );
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.get('/api/conversations/:id/workspace/file', (req, res) => {
    try {
      const item = record(req),
        relative = String(req.query.path || ''),
        filename = containedPath(item.root, relative),
        stat = fs.statSync(filename);
      if (!stat.isFile()) throw new Error('Select a file.');
      if (req.query.download === '1') return res.download(filename);
      const imageType = imageTypes[path.extname(filename).toLowerCase()];
      if (req.query.image === '1') {
        if (!imageType) return res.status(415).end();
        res.setHeader('Content-Type', imageType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
          'Content-Security-Policy',
          "sandbox; default-src 'none'; style-src 'unsafe-inline'",
        );
        return res.sendFile(filename, { cacheControl: false });
      }
      if (imageType)
        return res.json({
          path: relative,
          bytes: stat.size,
          image: true,
          binary: true,
          truncated: false,
        });
      const fd = fs.openSync(filename, 'r'),
        buffer = Buffer.alloc(Math.min(stat.size, maxEditableBytes + 1));
      let bytesRead;
      try {
        bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      } finally {
        fs.closeSync(fd);
      }
      const truncated = stat.size > maxEditableBytes;
      const data = buffer.subarray(0, bytesRead);
      const content =
        truncated && !data.includes(0)
          ? data.subarray(0, 256 * 1024).toString('utf8')
          : readText(data);
      res.json({
        path: relative,
        bytes: stat.size,
        binary: content === null,
        truncated,
        revision: content !== null && !truncated ? revisionOf(data) : null,
        content,
        url: workspace.urlFor(path.relative(workspace.baseRoot, filename)),
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.put('/api/conversations/:id/workspace/file', (req, res) => {
    let temporary;
    try {
      const relative = req.query.path;
      const { content, revision } = req.body || {};
      if (
        typeof relative !== 'string' ||
        !relative ||
        /[:\\]/.test(relative) ||
        relative.startsWith('/') ||
        relative
          .split('/')
          .some(
            (segment) =>
              !segment ||
              /[. ]$/.test(segment) ||
              /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(segment),
          ) ||
        typeof content !== 'string' ||
        !/^[0-9a-f]{64}$/.test(revision || '')
      )
        return res.status(400).json({ error: 'Invalid file path, text, or revision.' });
      const { root } = record(req);
      const filename = containedPath(root, relative);
      const stat = fs.statSync(filename);
      if (
        !stat.isFile() ||
        stat.size > maxEditableBytes ||
        imageTypes[path.extname(filename).toLowerCase()]
      )
        return res.status(415).json({ error: 'This file is read-only in the editor.' });
      const before = fs.readFileSync(filename);
      if (revisionOf(before) !== revision)
        return res
          .status(409)
          .json({ error: 'The file changed on disk. Your edits are still here.' });
      if (readText(before) === null)
        return res.status(415).json({ error: 'Only UTF-8 text files can be edited.' });
      const bom = before.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? '\uFEFF' : '';
      const next = Buffer.from(bom + content, 'utf8');
      if (next.length > maxEditableBytes)
        return res.status(413).json({ error: 'Editable files can be up to 1 MiB.' });
      const staging = containedPath(
        root,
        path.posix.join(path.posix.dirname(relative), `.supergence-${randomUUID()}.tmp`),
      );
      const fd = fs.openSync(staging, 'wx', stat.mode & 0o777);
      temporary = staging;
      try {
        fs.writeFileSync(fd, next);
      } finally {
        fs.closeSync(fd);
      }
      if (revisionOf(fs.readFileSync(containedPath(root, relative))) !== revision)
        return res
          .status(409)
          .json({ error: 'The file changed on disk. Your edits are still here.' });
      fs.renameSync(temporary, filename);
      temporary = null;
      return res.json({ revision: revisionOf(next), bytes: next.length });
    } catch {
      return res.status(400).json({ error: 'Could not save this workspace file.' });
    } finally {
      if (temporary) {
        try {
          fs.unlinkSync(temporary);
        } catch {}
      }
    }
  });
  app.get('/api/conversations/:id/workspace/events', (req, res) => {
    let item;
    try {
      item = record(req);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    streams.add(res);
    const send = (entry) =>
      res.write(`id: ${entry.sequence}\nevent: workspace\ndata: ${JSON.stringify(entry)}\n\n`);
    const after = Number(req.headers['last-event-id'] || req.query.after || 0);
    if (after && after < (item.events[0]?.sequence || 0) - 1)
      res.write(`event: reset\ndata: ${JSON.stringify(conversationWorkspaces.snapshot(item))}\n\n`);
    else for (const event of item.events.filter((e) => e.sequence > after)) send(event);
    item.listeners.add(send);
    const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    timer.unref();
    req.on('close', () => {
      clearInterval(timer);
      item.listeners.delete(send);
      streams.delete(res);
    });
  });
}
