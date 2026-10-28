import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the listening URL printed by the SIS server.');
const output = path.join(
  root,
  'test-results',
  process.env.SIS_UI_BUILD === 'true' ? 'ui-build' : 'ui-redesign',
);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const errors = [];
const checks = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    permissions: ['microphone'],
  });
  // Isolate the browser speech service. The real VoiceInput result handler and
  // getUserMedia/AudioContext path run; these events are not real speech.
  await context.addInitScript(() => {
    window.SpeechRecognition = class extends EventTarget {
      start() {}
      stop() {}
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => window.__sisWorkspaceReady && !!window.workspaceVoiceInput);
  await page.waitForFunction(
    () => document.getElementById('shellConnection')?.dataset.state === 'connected',
  );
  assert.equal(await page.locator('.workspace-rail').isVisible(), true);
  assert.equal(await page.locator('#workspaceSideBrowserPane').isVisible(), false);
  checks.push('startup, navigation rail, live connection, preview closed on history restore');

  // Use actual stored history rather than creating fixture conversations.
  const conversation = page.locator('.shell-conv-select').first();
  if (await conversation.count()) {
    await conversation.click();
    await page.waitForFunction(() => !!document.querySelector('.sidebar-conv-item.active'));
    await page.screenshot({ path: path.join(output, 'conversation.png') });
    const title = await page.locator('.sidebar-conv-item.active .conv-title').innerText();
    await page.locator('#sidebarConvSearch').fill(title.slice(0, 20));
    assert.ok((await page.locator('.sidebar-conv-item').count()) > 0);
    await page.locator('#sidebarConvSearch').fill('no-conversation-matches-this-search');
    assert.equal(await page.locator('.sidebar-conv-item').count(), 0);
    await page.locator('#sidebarConvSearch').fill('');
    checks.push('real conversation restore and history search');
  }

  await page.locator('#shellNewConversation').click();
  await page.locator('.shell-empty').waitFor();
  assert.equal(await page.locator('#activeWorkspaceTitleDisplay').innerText(), 'New conversation');
  await page.screenshot({ path: path.join(output, 'desktop.png') });
  await page.getByRole('button', { name: 'Build something', exact: true }).click();
  assert.equal(await page.locator('#workspaceInp').inputValue(), 'Help me build ');
  assert.equal(
    await page
      .locator('#workspaceSendBtn')
      .getAttribute('class')
      .then((value) => value.includes('is-ready')),
    true,
  );
  await page.locator('#workspaceInp').fill('');
  checks.push('new conversation, empty state, prompt starters, composer ready state');

  await page.locator('#composerToolsButton').click();
  await page.locator('#composerToolsMenu').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#composerToolsMenu').waitFor({ state: 'hidden' });
  await page.keyboard.press('Control+k');
  assert.equal(
    await page
      .locator('#sidebarConvSearch')
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.locator('#railHelp').click();
  await page.locator('#workspaceShortcuts[open]').waitFor();
  await page.getByRole('button', { name: 'Close shortcuts' }).click();
  checks.push('composer tools, search shortcut, keyboard help');

  await page.locator('#railPreferences').click();
  await page.locator('#workspacePreferences[open]').waitFor();
  await page.locator('#shellCompactPreference').check();
  assert.equal(await page.locator('body').getAttribute('data-compact'), 'true');
  assert.equal(await page.evaluate(() => localStorage.getItem('sis-ui-compact')), 'true');
  await page.locator('#shellCompactPreference').uncheck();
  await page.screenshot({ path: path.join(output, 'preferences.png') });
  await page.getByRole('button', { name: 'Close preferences' }).click();
  checks.push('preferences dialog and persisted compact spacing');

  await page.locator('#sbt-btn-dictate').click();
  await page.waitForFunction(
    () =>
      window.workspaceVoiceInput?.listening &&
      window.workspaceVoiceInput.audioCtx?.state === 'running',
  );
  await page.evaluate(() => {
    const result = new Event('result');
    const transcript = [{ transcript: 'Transcription callback check' }];
    transcript.isFinal = true;
    Object.defineProperties(result, {
      resultIndex: { value: 0 },
      results: { value: [transcript] },
    });
    window.workspaceVoiceInput.recognition.dispatchEvent(result);
  });
  assert.equal(await page.locator('#workspaceInp').inputValue(), 'Transcription callback check');
  await page.locator('#sbt-btn-dictate').click();
  assert.equal(await page.evaluate(() => window.workspaceVoiceInput.stream), null);
  await page.locator('#workspaceInp').fill('');
  checks.push('fake microphone start/stop and real post-transcript composer callback');

  // Read-only existing controls stay connected to their current handlers.
  await page.locator('#railFeatures').click();
  await page.locator('#sisFiftyFeaturesModal.active').waitFor();
  assert.equal(await page.locator('.fifty-card').count(), 50);
  await page.keyboard.press('Escape');
  await page.locator('#workspaceBtnSideBrowser').click();
  await page.locator('#workspaceBrowserPanel').waitFor({ state: 'visible' });
  await page.locator('#workspaceBtnSideBrowser').click();
  await page.locator('#workspaceBrowserPanel').waitFor({ state: 'hidden' });
  checks.push('existing catalogue and adjacent browser toggle');

  await page.setViewportSize({ width: 390, height: 844 });
  const inputBox = await page.locator('#workspaceInp').boundingBox();
  assert.ok(inputBox.x >= 0 && inputBox.x + inputBox.width <= 390);
  const header = await page.locator('.enterprise-header').boundingBox();
  const main = await page.locator('.workspace-columns-viewport').boundingBox();
  assert.ok(main.y >= header.y + header.height - 1);
  await page.locator('#sidebarToggleBtn').click();
  await page.locator('#workspaceConversationsSidebar.mobile-open').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#workspaceConversationsSidebar').waitFor({ state: 'hidden' });
  await page.locator('#workspaceInp').fill('Mobile composer check');
  assert.equal(await page.locator('#workspaceInp').inputValue(), 'Mobile composer check');
  const sendButton = await page.locator('#workspaceSendBtn').boundingBox();
  const composerBounds = await page.locator('.workspace-composer-inner').boundingBox();
  assert.ok(
    sendButton.x >= composerBounds.x &&
      sendButton.x + sendButton.width <= composerBounds.x + composerBounds.width,
    'Mobile send button must fit inside the composer alongside access and agent controls',
  );
  await page.locator('#workspaceInp').fill('');
  await page.screenshot({ path: path.join(output, 'mobile.png') });
  checks.push('mobile layout, sidebar drawer, usable composer');

  // Verify the redesigned composer against the actual SSE rendering path.
  // Only this test browser receives a fixture response; nothing is persisted.
  let sentQuery = null;
  await page.route('**/api/sis/unified-turn-stream', async (route) => {
    sentQuery = route.request().postDataJSON().query;
    const result = {
      success: true,
      response: 'Composer integration fixture.',
      steps: [],
      artifacts: [],
    };
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `event: token\ndata: ${JSON.stringify({ fullText: result.response })}\n\nevent: done\ndata: ${JSON.stringify(result)}\n\n`,
    });
  });
  await page.locator('#workspaceInp').fill('Composer browser test');
  await page.locator('#workspaceInp').press('Enter');
  await page.waitForFunction(
    () =>
      !window.isTaskRunning() &&
      document
        .querySelector('.response-body-markdown')
        ?.textContent.includes('Composer integration fixture.'),
  );
  assert.equal(sentQuery, 'Composer browser test');
  assert.equal(await page.locator('.user-query-pill').last().innerText(), 'Composer browser test');
  assert.equal(await page.locator('#workspaceInp').inputValue(), '');
  await page.locator('#workspaceInp').fill('Line one');
  await page.locator('#workspaceInp').press('Shift+Enter');
  assert.ok((await page.locator('#workspaceInp').inputValue()).includes('\n'));
  checks.push(
    'Enter submits through SSE renderer, composer clears, Shift+Enter adds a newline (browser-only response fixture)',
  );
  // An interrupted tool stream must never silently replay a potentially
  // side-effecting request through the non-streaming endpoint.
  let replayed = 0;
  await page.route('**/api/sis/unified-turn', async (route) => {
    replayed++;
    await route.fulfill({ status: 500, json: { error: 'Unexpected replay' } });
  });
  await page.unroute('**/api/sis/unified-turn-stream');
  await page.route('**/api/sis/unified-turn-stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `event: connected\ndata: {}\n\nevent: token\ndata: ${JSON.stringify({ fullText: 'Partial response received.' })}\n\nevent: error\ndata: ${JSON.stringify({ error: 'Browser test connection interrupted.' })}\n\n`,
    });
  });
  await page.locator('#workspaceInp').fill('Interrupted stream verification');
  await page.locator('#workspaceInp').press('Enter');
  await page.locator('.chat-stream-notice').waitFor();
  await page.waitForFunction(() => !window.isTaskRunning());
  assert.equal(replayed, 0);
  assert.ok(
    (await page.locator('.response-body-markdown').last().innerText()).includes(
      'Partial response received.',
    ),
  );
  checks.push('interrupted stream preserves received content and does not replay tool execution');
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        baseURL,
        checkedAt: new Date().toISOString(),
        checks,
        errors,
        limitations: [
          'Speech-recognition events were simulated; real speech remains unverified.',
          'No paid model requests or new backend conversations were created.',
          'The send-path response was intercepted only in the test browser.',
        ],
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`UI checks passed. Screenshots: ${path.relative(root, output)}`);
} finally {
  await browser.close();
}
