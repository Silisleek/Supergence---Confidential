import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) {
  throw new Error('Set SIS_BASE_URL to the URL printed by npm run server.');
}
const checkingBuild = process.env.SIS_TEST_BUILD === 'true';
const checkingDemos = process.env.SIS_TEST_DEMOS !== 'false';
const resultsName = checkingBuild
  ? 'workspace-build-smoke'
  : checkingDemos
    ? 'workspace-smoke'
    : 'workspace-dev-smoke';
const resultsDirectory = path.join(root, 'test-results', resultsName);
await fs.mkdir(resultsDirectory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = [];
const sockets = [];
const responses = new Map();
let page;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('websocket', (socket) => sockets.push(socket));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === new URL(baseURL).origin && /\.(?:js|css)$/.test(url.pathname)) {
      responses.set(url.pathname, response.status());
    }
  });

  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(
    () => typeof window.openWorkspace === 'function' && !!window.SISContinuousDock,
  );
  await page.waitForFunction(() => agentBrowserWs?.readyState === WebSocket.OPEN);
  assert.equal(await page.title(), 'Supergence | SIS Workspace');
  assert.ok(await page.locator('#workspaceInp').isVisible());
  assert.ok(sockets.some((socket) => new URL(socket.url()).pathname === '/ws'));

  for (const asset of [
    'workspace-controller.js',
    'feature-catalog.js',
    'feature-actions.js',
    'continuous-dock.js',
  ]) {
    assert.equal(responses.get(`/scripts/${asset}`), 200, asset);
  }
  if (checkingBuild) {
    assert.ok(
      [...responses].some(
        ([asset, status]) =>
          asset.startsWith('/assets/') && asset.endsWith('.css') && status === 200,
      ),
    );
  } else {
    assert.equal(responses.get('/styles/workspace.css'), 200);
  }

  // Closing an optional panel must preserve the shared live-state connection.
  await page.evaluate(() => window.closeAgentBrowsersModal());
  assert.equal(await page.evaluate(() => agentBrowserWs.readyState), 1);
  await page.keyboard.press('Escape');

  await page.locator('#workspaceTreeModal').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => agentBrowserWs.readyState), 1);

  await page.evaluate(() => window.toggleFiftyFeaturesModal(true));
  await page.locator('#sisFiftyFeaturesModal.active').waitFor();
  assert.equal(await page.locator('.fifty-card').count(), 50);
  assert.equal(await page.locator('#card-feat-7 button').isDisabled(), true);
  await page.locator('#card-feat-21 button').click();
  await page.waitForFunction(() => {
    const text = document.getElementById('fiftyFeedbackMsg')?.textContent || '';
    return text.includes('Long-term nodes:') || text.includes('Check failed:');
  });
  const feedback = await page.locator('#fiftyFeedbackMsg').innerText();
  assert.ok(feedback.includes('Long-term nodes:'), feedback);
  assert.ok(!feedback.includes('Unavailable'), feedback);

  // Exercise unavailable and HTTP-error UI states without changing server data.
  await page.route('**/api/memory/stats', (route) =>
    route.fulfill({
      json: { longTerm: { totalNodes: 0, avgConfidence: 0 }, shortTerm: { totalNodes: 0 } },
    }),
  );
  await page.evaluate(() => window.executeFiftyFeature('feat-21'));
  assert.match(
    await page.locator('#fiftyFeedbackMsg').innerText(),
    /Long-term nodes: 0; short-term nodes: 0; average confidence: 0\.0%/,
  );
  await page.unroute('**/api/memory/stats');
  await page.route('**/api/memory/stats', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  );
  await page.evaluate(() => window.executeFiftyFeature('feat-21'));
  assert.match(
    await page.locator('#fiftyFeedbackMsg').innerText(),
    /Check failed: Request failed \(503\)/,
  );
  await page.unroute('**/api/memory/stats');
  await page.evaluate(() => window.toggleFiftyFeaturesModal(false));

  await page.evaluate(() => window.toggleWorkspaceTreeModal(true, 'memory'));
  await page.locator('#treePaneMemory .memory-kpi-grid').waitFor({ timeout: 30000 });
  assert.match(await page.locator('#inspectNodeConfidence').innerText(), /Unavailable/);
  assert.equal((await page.locator('#memoryGraphSvg g').count()) > 0, true);
  await page.keyboard.press('Escape');
  await page.locator('#workspaceTreeModal').waitFor({ state: 'hidden' });

  // Existing standalone bookmarks still resolve after files are organized.
  if (checkingDemos) {
    for (const route of [
      '/jarvis',
      '/systemfaces.html',
      '/newfrontend.html',
      '/SupergenceUI.html',
      '/SupergenceUI.css',
      '/SupergenceUI.js',
    ]) {
      const result = await context.request.get(new URL(route, baseURL).href);
      assert.equal(result.status(), 200, route);
    }
  }

  await page.screenshot({ path: path.join(resultsDirectory, 'desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.locator('#workspaceInp').isVisible());
  const composer = await page.locator('#workspaceInp').boundingBox();
  assert.ok(
    composer.x >= 0 && composer.x + composer.width <= 390,
    'Composer must fit within the mobile viewport',
  );
  const header = await page.locator('.enterprise-header').boundingBox();
  const columns = await page.locator('.workspace-columns-viewport').boundingBox();
  assert.ok(
    columns.y >= header.y + header.height - 1,
    'Mobile header must not overlap the conversation',
  );
  await page.locator('#workspaceInp').fill('Mobile layout check');
  assert.equal(await page.locator('#workspaceInp').inputValue(), 'Mobile layout check');
  await page.locator('#workspaceInp').fill('');
  await page.locator('#sidebarToggleBtn').click();
  await page.locator('#workspaceConversationsSidebar.mobile-open').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#workspaceConversationsSidebar').waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(resultsDirectory, 'mobile.png') });
  assert.deepEqual(failures, [], 'Uncaught browser errors');
  const summary = {
    baseURL,
    checkedAt: new Date().toISOString(),
    browser: 'Google Chrome',
    failures,
    assets: Object.fromEntries(responses),
    checks: [
      'app startup',
      'local assets',
      'live WebSocket',
      'panel close preserves socket',
      'catalogue availability',
      'live memory metrics',
      'zero values',
      'HTTP failure state',
      'memory graph',
      ...(checkingDemos ? ['legacy routes'] : []),
      'mobile composer',
    ],
  };
  await fs.writeFile(
    path.join(resultsDirectory, 'results.json'),
    JSON.stringify(summary, null, 2) + '\n',
  );
  console.log(`Workspace browser smoke checks passed. Results: test-results/${resultsName}/`);
} catch (error) {
  const feedback =
    page && !page.isClosed()
      ? await page
          .locator('#fiftyFeedbackMsg')
          .textContent()
          .catch(() => '')
      : '';
  await fs.writeFile(
    path.join(resultsDirectory, 'failure.json'),
    JSON.stringify(
      { error: error.message, feedback, failures, assets: Object.fromEntries(responses) },
      null,
      2,
    ) + '\n',
  );
  throw error;
} finally {
  await browser.close();
}
