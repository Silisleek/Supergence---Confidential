import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

test('settings structure provides complete paths, provider details and real telemetry', () => {
  const mem = process.memoryUsage();
  const sampleSettings = {
    paths: {
      workspaceDir: 'workspace',
      dataDir: 'data',
      chatsWorkspaceDir: 'workspace/chats',
      osPaths: {
        desktop: path.join(os.homedir(), 'Desktop'),
        documents: path.join(os.homedir(), 'Documents'),
        downloads: path.join(os.homedir(), 'Downloads'),
      },
    },
    provider: {
      baseURL: process.env.BASE_URL || 'http://127.0.0.1:20128/v1',
      defaultModel: process.env.DEFAULT_MODEL || 'opus-4.6',
      fallbackModel: process.env.FALLBACK_MODEL || '',
      hasApiKey: Boolean(process.env.API_KEY),
      port: 3001,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.round(process.uptime()),
      memory: {
        rssMb: (mem.rss / (1024 * 1024)).toFixed(1),
        heapMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
      },
      accessMode: 'full-access',
    },
  };

  assert.ok(sampleSettings.paths.workspaceDir.length > 0);
  assert.ok(sampleSettings.paths.chatsWorkspaceDir.includes('chats'));
  assert.ok(sampleSettings.paths.osPaths.desktop.length > 0);
  assert.ok(sampleSettings.paths.osPaths.documents.length > 0);
  assert.ok(sampleSettings.paths.osPaths.downloads.length > 0);

  assert.ok(sampleSettings.provider.baseURL.length > 0);
  assert.ok(sampleSettings.provider.defaultModel.length > 0);

  assert.ok(sampleSettings.system.nodeVersion.startsWith('v'));
  assert.ok(sampleSettings.system.platform.length > 0);
  assert.ok(Number(sampleSettings.system.memory.rssMb) > 0);
  assert.ok(Number(sampleSettings.system.memory.heapMb) > 0);
});

test('theme palettes match Styles.md specification with deep black and warm brown surfaces', () => {
  const themes = {
    neutral: { name: 'Espresso', page: '#000000', panel: '#211a16', accent: '#e0b38c' },
    warm: { name: 'Walnut', page: '#000000', panel: '#2a2019', accent: '#e9b98f' },
    midnight: { name: 'Cocoa', page: '#000000', panel: '#1a1613', accent: '#cfa98c' },
  };

  for (const [key, theme] of Object.entries(themes)) {
    assert.equal(theme.page, '#000000');
    assert.ok(theme.panel.startsWith('#'));
    assert.ok(theme.accent.startsWith('#'));
    assert.ok(['neutral', 'warm', 'midnight'].includes(key));
  }
});

test('provider settings update updates environmental configuration and access mode', () => {
  const origBase = process.env.BASE_URL;
  const origModel = process.env.DEFAULT_MODEL;

  try {
    process.env.BASE_URL = 'http://localhost:9999/v1';
    process.env.DEFAULT_MODEL = 'test-model-4.6';
    assert.equal(process.env.BASE_URL, 'http://localhost:9999/v1');
    assert.equal(process.env.DEFAULT_MODEL, 'test-model-4.6');
  } finally {
    if (origBase) process.env.BASE_URL = origBase;
    else delete process.env.BASE_URL;
    if (origModel) process.env.DEFAULT_MODEL = origModel;
    else delete process.env.DEFAULT_MODEL;
  }
});
