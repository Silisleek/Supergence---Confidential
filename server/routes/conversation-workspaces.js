import fs from 'node:fs';
import path from 'node:path';
import workspace from '../workspace/manager.js';
import { conversationWorkspaces, containedPath } from '../services/conversationWorkspaces.js';

export function registerConversationWorkspaceRoutes(app) {
  const record = (req) => conversationWorkspaces.ensure(workspace.baseRoot, req.params.id);
  app.post('/api/conversations/:id/workspace', (req, res) => {
    try {
      res.json(conversationWorkspaces.snapshot(record(req)));
    } catch (error) {
      res.status(400).json({ error: error.message });
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
      const fd = fs.openSync(filename, 'r'),
        buffer = Buffer.alloc(Math.min(stat.size, 256 * 1024));
      try {
        fs.readSync(fd, buffer, 0, buffer.length, 0);
      } finally {
        fs.closeSync(fd);
      }
      const binary = buffer.includes(0);
      res.json({
        path: relative,
        bytes: stat.size,
        binary,
        truncated: stat.size > buffer.length,
        content: binary ? null : buffer.toString('utf8'),
        url: workspace.urlFor(path.relative(workspace.baseRoot, filename)),
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
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
    });
  });
}
