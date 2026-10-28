import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const execute = promisify(execFile);
const script = fileURLToPath(new URL('./desktop-context.ps1', import.meta.url));
async function powershell(action, extra = []) {
  const { stdout } = await execute(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-File', script, '-Action', action, ...extra],
    { windowsHide: true, timeout: 20000, maxBuffer: 128000 },
  );
  return JSON.parse(stdout.trim());
}
export async function desktopFolders(workspace) {
  let known = {};
  if (process.platform === 'win32') {
    try {
      known = await powershell('folders');
    } catch {
      /* Missing redirected folders remain unavailable. */
    }
  }
  return {
    workspace,
    desktop: known.desktop || path.join(os.homedir(), 'Desktop'),
    documents: known.documents || path.join(os.homedir(), 'Documents'),
    downloads: known.downloads || path.join(os.homedir(), 'Downloads'),
  };
}
export async function foregroundActivity() {
  if (process.platform !== 'win32')
    return { available: false, reason: 'Foreground context is unavailable on this platform.' };
  try {
    return { available: true, ...(await powershell('activity')) };
  } catch (error) {
    return { available: false, reason: error.message.slice(0, 200) };
  }
}
export async function notifyDesktop({ title, body }) {
  if (process.platform !== 'win32')
    return {
      submitted: false,
      channel: 'in-app',
      reason: 'Native server notifications are unavailable on this platform.',
    };
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'supergence-notification-'));
  const payload = path.join(directory, 'message.json');
  try {
    await fs.writeFile(payload, JSON.stringify({ title: String(title), body: String(body) }));
    return await powershell('notify', ['-MessagePath', payload]);
  } catch (error) {
    return { submitted: false, channel: 'in-app', reason: error.message.slice(0, 200) };
  } finally {
    await fs.rm(payload, { force: true });
    await fs.rmdir(directory);
  }
}
