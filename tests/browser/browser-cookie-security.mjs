import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-cookie-browser-'));
process.env.SIS_DATA_DIR = path.join(root, 'data');
process.env.SIS_WORKSPACE_DIR = path.join(root, 'workspace');
const { AgentBrowserManager } = await import('../../server/services/agentBrowserManager.js');
const { runtimeAccess } = await import('../../server/services/runtimeAccess.js');
const manager = new AgentBrowserManager();
const agentId = 'agent-custom-cookiecheck';
try {
  const session = await manager.getOrCreateSession(agentId);
  const cookie = {
    name: 'verification',
    value: 'private-fixture-value',
    domain: 'example.com',
    path: '/',
  };
  await session.context.addCookies([cookie]);
  const saved = await manager.saveCookies(agentId);
  assert.equal(saved.success, true, saved.error);
  assert.doesNotMatch(await fs.readFile(saved.filepath, 'utf8'), /private-fixture-value/);
  await session.context.clearCookies();
  assert.equal((await session.context.cookies()).length, 0);
  const restored = await manager.loadCookies(agentId);
  assert.equal(restored.success, true, restored.error);
  assert.equal(
    (await session.context.cookies()).find((item) => item.name === cookie.name)?.value,
    cookie.value,
  );
  runtimeAccess.update({ browser: false });
  await manager.revocation;
  assert.equal(session.page.isClosed(), true);
  await assert.rejects(manager.getOrCreateSession(agentId), /Browser access is disabled/);
  runtimeAccess.update({ browser: true });
  const reopened = await manager.getOrCreateSession(agentId);
  assert.equal(reopened.page.isClosed(), false);
  console.log('Real Chrome cookie export and restore passed with encrypted storage.');
} finally {
  if (!runtimeAccess.settings.browser) runtimeAccess.update({ browser: true });
  await manager.closeSession(agentId);
  manager.unsubscribeAccess();
  await fs.rm(root, { recursive: true, force: true });
}
