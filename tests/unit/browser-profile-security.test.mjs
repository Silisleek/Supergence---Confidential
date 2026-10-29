import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

test('browser profile IDs and linked profile folders cannot redirect launches or delete locks', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-browser-profiles-'));
  const data = path.join(root, 'data');
  const outside = path.join(root, 'outside');
  await fs.mkdir(outside);
  const lock = path.join(outside, 'SingletonLock');
  await fs.writeFile(lock, 'keep');
  process.env.SIS_DATA_DIR = data;
  process.env.SIS_WORKSPACE_DIR = path.join(root, 'workspace');
  const { AgentBrowserManager } = await import('../../server/services/agentBrowserManager.js');
  const manager = new AgentBrowserManager();
  t.after(async () => await fs.rm(root, { recursive: true, force: true }));
  for (const id of [
    '../outside',
    'agent-../outside',
    'agent-x/../../outside',
    'agent-x-desktop',
    '',
    null,
  ]) {
    await assert.rejects(manager.getOrCreateSession(id), /Invalid agent ID/);
  }
  const profiles = path.join(data, 'browser-profiles');
  await fs.mkdir(profiles, { recursive: true });
  const linked = path.join(profiles, 'agent-linked');
  const desktop = path.join(profiles, 'agent-linked-desktop');
  await fs.symlink(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
  await fs.symlink(outside, desktop, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(manager.getOrCreateSession('agent-linked'), /Linked paths/);
  await assert.rejects(manager.launchNativeChrome('agent-linked'), /Linked paths/);
  assert.equal(await fs.readFile(lock, 'utf8'), 'keep');
  await fs.unlink(linked);
  await fs.unlink(desktop);

  const cookie = {
    name: 'session',
    value: 'private-fixture-token',
    domain: 'example.com',
    path: '/',
  };
  let loaded;
  manager.sessions.set('agent-custom-abc', {
    page: { isClosed: () => false },
    context: {
      cookies: async () => [cookie],
      addCookies: async (value) => {
        loaded = value;
      },
    },
  });
  const saved = await manager.saveCookies('agent-custom-abc');
  assert.equal(saved.success, true);
  const encrypted = await fs.readFile(saved.filepath, 'utf8');
  assert.doesNotMatch(encrypted, /private-fixture-token/);
  assert.deepEqual((await manager.loadCookies('agent-custom-abc')).legacyPlaintext, false);
  assert.deepEqual(loaded, [cookie]);
  const escape = path.join(outside, 'cookies.json');
  assert.equal((await manager.saveCookies('agent-custom-abc', escape)).success, false);
  assert.equal((await manager.loadCookies('agent-custom-abc', escape)).success, false);
  const corrupted = JSON.parse(encrypted);
  corrupted.envelope.authTag = '00'.repeat(16);
  await fs.writeFile(saved.filepath, JSON.stringify(corrupted));
  assert.equal((await manager.loadCookies('agent-custom-abc')).success, false);
  await fs.unlink(saved.filepath);
  const legacy = path.join(path.dirname(saved.filepath), 'cookies.json');
  await fs.writeFile(legacy, JSON.stringify([cookie]));
  assert.equal((await manager.loadCookies('agent-custom-abc')).legacyPlaintext, true);
  assert.deepEqual(JSON.parse(await fs.readFile(legacy, 'utf8')), [cookie]);

  const firstPage = { isClosed: () => false };
  const secondPage = {
    isClosed: () => false,
    goto: async (url) => {
      secondPage.current = url;
    },
    url: () => secondPage.current,
    title: async () => 'Second page',
  };
  const firstTab = { id: 'first', page: firstPage, url: 'https://first.example', title: 'First' };
  const secondTab = { id: 'second', page: secondPage, url: 'about:blank', title: 'Second' };
  manager.sessions.set('agent-custom-nav', {
    context: {},
    page: firstPage,
    activeTabId: 'first',
    tabs: [firstTab, secondTab],
    currentUrl: firstTab.url,
    pageTitle: firstTab.title,
    history: [],
  });
  const result = await manager.navigate('agent-custom-nav', 'https://second.example', {
    tabId: 'second',
  });
  assert.equal(result.url, 'https://second.example');
  assert.equal(secondTab.url, 'https://second.example');
  assert.equal(firstTab.url, 'https://first.example');
  assert.equal(manager.sessions.get('agent-custom-nav').currentUrl, 'https://first.example');

  manager.sessions.clear();
  const { runtimeAccess } = await import('../../server/services/runtimeAccess.js');
  const originalLaunch = chromium.launchPersistentContext;
  let releaseLaunch;
  let closed = false;
  chromium.launchPersistentContext = () =>
    new Promise((resolve) => {
      releaseLaunch = resolve;
    });
  try {
    const opening = manager.getOrCreateSession('agent-custom-race');
    await Promise.resolve();
    assert.equal(typeof releaseLaunch, 'function');
    runtimeAccess.update({ browser: false });
    runtimeAccess.update({ browser: true });
    releaseLaunch({
      close: async () => {
        closed = true;
      },
    });
    await assert.rejects(opening, /revoked/);
    await manager.revocation;
    assert.equal(closed, true);
    assert.equal(manager.sessions.has('agent-custom-race'), false);
  } finally {
    chromium.launchPersistentContext = originalLaunch;
    if (!runtimeAccess.settings.browser) runtimeAccess.update({ browser: true });
    manager.unsubscribeAccess();
  }
});
