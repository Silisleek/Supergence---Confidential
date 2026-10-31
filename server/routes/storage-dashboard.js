import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const csvPath = path.join(os.homedir(), 'Desktop', 'Large-files-since-Dec-10-2025.csv');
const roots = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Videos'].map((dir) =>
  path.join(os.homedir(), dir),
);

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(field); field = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function within(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

async function loadFiles() {
  const data = (await fs.readFile(csvPath, 'utf8')).replace(/^\uFEFF/, '');
  const rows = parseCsv(data);
  if (rows[0]?.join(',') !== 'FullName,CreationTime,LastWriteTime,SizeBytes') throw new Error('The large-file scan has an unexpected format.');
  return rows.slice(1).filter((r) => r.length === 4 && /^\d+$/.test(r[3])).map(([file, created, modified, size]) => ({
    id: createHash('sha256').update(file).digest('hex'), path: file, created, modified, size: Number(size),
    eligible: process.platform === 'win32' && roots.some((root) => within(file, root)),
  }));
}

function strictLocal(req, res, next) {
  try {
    const host = new URL(`http://${req.headers.host}`);
    const origin = new URL(req.headers.origin || (req.method === 'GET' ? req.headers.referer : ''));
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host.hostname) || origin.origin !== host.origin || req.get('X-Storage-Dashboard') !== '1') throw new Error('Forbidden');
    next();
  } catch { res.status(403).json({ error: 'Open this dashboard from the local app.' }); }
}

export function registerStorageRoutes(app) {
  app.get('/api/storage/large-files', strictLocal, async (_req, res) => {
    try { res.json({ files: await loadFiles(), source: csvPath }); }
    catch (error) { res.status(500).json({ error: error.message }); }
  });
  app.post('/api/storage/recycle', strictLocal, async (req, res) => {
    if (process.platform !== 'win32') return res.status(400).json({ error: 'Recycling is available on Windows only.' });
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || ids.some((id) => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) return res.status(400).json({ error: 'Select between 1 and 50 files.' });
    try {
      const entries = new Map((await loadFiles()).map((item) => [item.id, item]));
      const results = [];
      for (const id of [...new Set(ids)]) {
        const item = entries.get(id);
        try {
          if (!item?.eligible) throw new Error('This location is protected.');
          const actual = await fs.realpath(item.path);
          if (actual.toLowerCase() !== path.resolve(item.path).toLowerCase()) throw new Error('Linked paths are not supported.');
          const stat = await fs.lstat(actual);
          if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== item.size || Math.abs(stat.mtimeMs - new Date(item.modified).getTime()) >= 1000) throw new Error('File changed since the scan; refresh the scan before deleting.');
          const script = "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($env:SIS_RECYCLE_FILE, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin, [Microsoft.VisualBasic.FileIO.UICancelOption]::ThrowException)";
          await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, SIS_RECYCLE_FILE: actual }, timeout: 120000, windowsHide: true });
          results.push({ id, ok: true });
        } catch (error) { results.push({ id, ok: false, error: error.code === 'ENOENT' ? 'File no longer exists.' : error.message }); }
      }
      res.json({ results });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });
}
