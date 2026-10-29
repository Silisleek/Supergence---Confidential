import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const base = process.env.SIS_BASE_URL;
const root = process.env.SIS_WORKSPACE_DIR;
const dataRoot = process.env.SIS_DATA_DIR;
if (!base || !root || !dataRoot)
  throw new Error(
    'Use an isolated backend and set SIS_BASE_URL, SIS_DATA_DIR and SIS_WORKSPACE_DIR.',
  );
const name = `artifact');window.__vaultInjected=1;('${randomUUID()}.html`;
const fixture = path.join(root, name);
const benchmark = path.join(root, 'benchmark_results.html');
const conversationId = `security-${randomUUID()}`;
const conversation = `/api/conversations/${conversationId}/workspace`;
const skillId = `security-${randomUUID()}`;
const skillFile = path.join(dataRoot, 'skills', 'candidates', `${skillId}.json`);
const request = (url, options) => fetch(new URL(url, base), options);
const access = await (await request('/api/access')).json();
if (!access.settings?.files)
  throw new Error('The isolated server must start with file access enabled.');
await fs.mkdir(root, { recursive: true });
let fixtureCreated = false,
  benchmarkCreated = false,
  skillCreated = false,
  browser;
try {
  await fs.writeFile(fixture, '<title>Workspace fixture</title>', { flag: 'wx' });
  fixtureCreated = true;
  await fs.writeFile(benchmark, '<title>Benchmark fixture</title>', { flag: 'wx' });
  benchmarkCreated = true;
  await fs.mkdir(path.dirname(skillFile), { recursive: true });
  await fs.writeFile(
    skillFile,
    JSON.stringify({ id: skillId, name: 'Isolated skill fixture', domain: 'testing' }),
    { flag: 'wx' },
  );
  skillCreated = true;
  const skills = await (await request('/api/mastery/skills')).json();
  assert.ok(skills.skills.some((skill) => skill.id === skillId));
  let artifacts;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    artifacts = await (await request('/api/artifacts')).json();
    if (artifacts.some((item) => item.filename === name)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const item = artifacts.find((entry) => entry.filename === name);
  assert.ok(item, 'New artifact did not appear.');
  assert.equal(item.title, 'Workspace fixture');
  assert.equal(item.src, `/workspace/${encodeURIComponent(name)}`);
  const content = await request(`/api/artifacts/content?file=${encodeURIComponent(name)}`);
  assert.equal((await content.json()).content, '<title>Workspace fixture</title>');
  assert.equal((await request('/api/artifacts/content?file=..%2Fsecret')).status, 400);
  assert.equal((await request('/api/artifacts/content?file=.env')).status, 400);
  assert.equal((await request(item.src)).status, 200);
  assert.equal(
    (
      await request('/api/workspace/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: name, language: 'javascript' }),
      })
    ).status,
    400,
  );
  assert.equal((await request(conversation, { method: 'POST' })).status, 200);
  assert.equal((await request(`${conversation}/files`)).status, 200);
  const result = await request('/api/benchmarks/frontier-results');
  assert.equal(result.status, 200);
  assert.match(result.headers.get('content-security-policy'), /sandbox/);
  assert.match(await result.text(), /Benchmark fixture/);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.refreshArtifactsVault);
  await page.evaluate(() => {
    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;inset:20px;z-index:2147483647;background:#fff;overflow:auto';
    root.innerHTML =
      '<div id="vaultArtifactsGrid"></div><div id="vaultEmptyNotice"></div><iframe id="vaultPreviewIframe"></iframe>';
    document.body.append(root);
  });
  await page.evaluate(() => window.refreshArtifactsVault());
  const card = page.locator('.vault-artifact-card').filter({ hasText: name });
  await card.waitFor();
  assert.equal(await page.evaluate(() => window.__vaultInjected), undefined);
  assert.equal(await page.locator('#vaultPreviewIframe').getAttribute('src'), null);
  await card.getByRole('button', { name: 'Preview' }).click();
  assert.equal(await page.evaluate(() => window.__vaultInjected), undefined);
  assert.equal(await page.locator('#vaultPreviewIframe').getAttribute('src'), item.src);
  assert.match(await page.locator('#vaultPreviewIframe').getAttribute('sandbox'), /allow-scripts/);
  const stream = await request(`${conversation}/events`, { signal: AbortSignal.timeout(10000) });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  const changed = await request('/api/access', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files: false }),
  });
  assert.equal(changed.status, 200);
  for (const url of [
    '/api/artifacts',
    '/api/artifacts/stats',
    `/api/artifacts/content?file=${encodeURIComponent(name)}`,
    '/api/benchmarks/frontier-results',
    item.src,
    `${conversation}/files`,
    `${conversation}/file?path=test.txt`,
    `${conversation}/events`,
  ])
    assert.equal((await request(url)).status, 403, url);
  assert.equal((await request(conversation, { method: 'POST' })).status, 403);
  for (const url of [
    '/api/github/clone',
    '/api/github/fetch',
    `/api/mastery/candidates/${skillId}/verify`,
  ])
    assert.equal(
      (
        await request(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
      403,
      url,
    );
  for (const tool of [
    'github_clone',
    'github_download_zip',
    'grep_search',
    'extract_archive',
    'screenshot',
    'execute_code_sandbox',
  ]) {
    const response = await request('/api/tools/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool, params: {} }),
    });
    assert.match((await response.json()).result.error, /files access is disabled/, tool);
  }
  let packet;
  do {
    packet = await reader.read();
  } while (!packet.done);
  await page.evaluate(() => window.refreshArtifactsVault());
  assert.match(await page.locator('#vaultEmptyNotice').innerText(), /unavailable/i);
  assert.equal(await page.locator('#vaultPreviewIframe').getAttribute('src'), null);
  await request('/api/access', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files: true, terminal: false }),
  });
  for (const url of ['/api/github/clone', `/api/mastery/candidates/${skillId}/verify`])
    assert.equal(
      (
        await request(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
      403,
      url,
    );
  for (const tool of ['github_clone', 'execute_code_sandbox', 'code_expert_eval']) {
    const response = await request('/api/tools/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool, params: {} }),
    });
    assert.match((await response.json()).result.error, /terminal access is disabled/, tool);
  }
  await request('/api/access', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ terminal: true, browser: false }),
  });
  for (const tool of ['screenshot', 'inspect_web_app_headless']) {
    const response = await request('/api/tools/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool, params: {} }),
    });
    assert.match((await response.json()).result.error, /browser access is disabled/, tool);
  }
  console.log('Artifact routes use the configured workspace and respect file-access settings.');
} finally {
  await browser?.close();
  await request('/api/access', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      files: access.settings.files,
      terminal: access.settings.terminal,
      browser: access.settings.browser,
    }),
  });
  if (fixtureCreated) await fs.unlink(fixture).catch(() => {});
  if (benchmarkCreated) await fs.unlink(benchmark).catch(() => {});
  if (skillCreated) await fs.unlink(skillFile).catch(() => {});
  await fs.rmdir(path.join(root, 'chats', conversationId)).catch(() => {});
}
