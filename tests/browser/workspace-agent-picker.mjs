import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  });
  await page.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel() {},
        speak(utterance) {
          utterance.onstart();
          window.finishTestSpeech = () => utterance.onend();
        },
      },
    });
  });
  await page.route('**/api/agents/team', (route) =>
    route.fulfill({
      json: {
        agents: [
          { id: 'agent-biology', name: 'Superbit', status: 'AVAILABLE' },
          { id: 'agent-data-ai', name: 'Supermull', status: 'RUNNING' },
          { id: 'agent-mathematics', name: 'Superbold', status: 'INACTIVE' },
          { id: 'agent-physics', name: 'Physics', role: 'Physics', status: 'AVAILABLE' },
        ],
      },
    }),
  );
  const requests = [];
  await page.route('**/api/sis/unified-turn', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unexpected non-streaming test request.' } }),
  );
  let release;
  const firstReply = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/sis/unified-turn-stream', async (route) => {
    const { agentId } = route.request().postDataJSON();
    requests.push(agentId);
    if (requests.length === 1) await firstReply;
    const result =
      requests.length === 2
        ? { success: false, taskStatus: 'error', error: 'Fixture provider unavailable' }
        : {
            success: true,
            taskStatus: 'completed',
            response: 'Response from the fixture.',
            primaryAgent: { id: agentId, name: agentId ? 'Superbit' : 'Supergence' },
          };
    await route.fulfill({
      contentType: 'text/event-stream',
      body: `event: done\ndata: ${JSON.stringify(result)}\n\n`,
    });
  });

  const origin = process.env.SIS_BASE_URL || 'http://127.0.0.1:3009';
  await page.goto(origin, { waitUntil: 'commit', timeout: 60000 });
  const picker = page.getByRole('group', { name: 'Chat agents', exact: true });
  const superbit = picker.getByRole('button', { name: 'Superbit', exact: true });
  await superbit.waitFor({ timeout: 60000 });
  await page.waitForFunction(() => window.__sisWorkspaceReady);
  const divider = page.getByRole('separator', { name: 'Resize conversation and workspace' });
  const chat = page.locator('#sgActiveConversationCard');
  const workspace = page.locator('#sgSpacePane');
  const initialChat = await chat.boundingBox();
  const initialWorkspace = await workspace.boundingBox();
  assert.ok(initialWorkspace.x - initialChat.x - initialChat.width <= 11);
  await divider.press('ArrowRight');
  assert.equal(await divider.getAttribute('aria-valuenow'), '55');
  assert.ok((await chat.boundingBox()).width > initialChat.width);
  assert.ok((await workspace.boundingBox()).width < initialWorkspace.width);
  const handle = await divider.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 110, handle.y + handle.height / 2, { steps: 4 });
  await page.mouse.up();
  const dragged = Number(await divider.getAttribute('aria-valuenow'));
  assert.ok(dragged > 55);
  assert.equal(await picker.getByRole('button', { name: 'Superbold', exact: true }).count(), 0);
  assert.equal(
    await picker
      .getByRole('button', { name: 'Supermull', exact: true })
      .getAttribute('aria-description'),
    'Working',
  );
  await superbit.press('Enter');
  assert.equal(await superbit.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.__workspaceAgentId), 'agent-biology');
  assert.equal(await page.locator(':focus').getAttribute('data-agent'), 'superbit');

  const input = page.locator('#sgCardInput');
  await input.fill('Return one line for the picker test.');
  await input.press('Enter');
  await superbit.getByText('Working', { exact: true }).waitFor();
  const dockAgent = page
    .locator('#sgFloatingAgentDock')
    .getByRole('button', { name: 'Superbit', exact: true });
  assert.equal(await dockAgent.getAttribute('aria-description'), 'Working');
  assert.equal(
    await superbit.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgba(0, 0, 0, 0)',
  );
  assert.equal(
    await dockAgent.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgba(0, 0, 0, 0)',
  );
  await dockAgent.hover();
  const tooltip = page.getByRole('tooltip');
  await tooltip.getByText(/Processing a request/).waitFor();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('workspace-tool-activity', {
        detail: { agentId: 'agent-biology', phase: 'call', displayName: 'Read file' },
      }),
    ),
  );
  await tooltip.getByText(/Running Read file/).waitFor();
  release();
  const listen = page.getByRole('button', { name: 'Listen', exact: true }).last();
  await listen.click();
  await superbit.getByText('Speaking', { exact: true }).waitFor();
  await page.evaluate(() => window.finishTestSpeech());
  await superbit.getByText('Ready', { exact: true }).waitFor();

  await input.fill('Exercise the picker error state.');
  await input.press('Enter');
  await superbit.getByText('Error', { exact: true }).waitFor();
  const automatic = picker.getByRole('button', { name: 'Supergence', exact: true });
  await automatic.click();
  assert.equal(await automatic.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.__workspaceAgentId), '');
  await input.fill('Exercise the default route.');
  await input.press('Enter');
  await page.waitForFunction(() => document.body.dataset.agentWorking === 'false');
  assert.deepEqual(requests, ['agent-biology', 'agent-biology', undefined]);

  await picker.getByRole('button', { name: 'Manage pins' }).click();
  const pins = page.getByRole('group', { name: 'Pinned agents', exact: true });
  const inactive = pins.getByRole('checkbox', { name: /Superbold.*Inactive/ });
  const physics = pins.getByRole('checkbox', { name: /Physics.*Ready/ });
  assert.ok(await inactive.isChecked());
  assert.ok(await physics.isDisabled());
  await inactive.uncheck();
  await physics.check();
  assert.equal(await pins.getByText('3 of 3 pinned').count(), 1);
  await page.keyboard.press('Escape');
  await picker.getByRole('button', { name: 'Physics', exact: true }).waitFor();
  await page.reload({ waitUntil: 'commit' });
  await picker.getByRole('button', { name: 'Physics', exact: true }).waitFor();
  assert.equal(Number(await divider.getAttribute('aria-valuenow')), dragged);
  await divider.dblclick();
  assert.equal(await divider.getAttribute('aria-valuenow'), '50');
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await picker.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await page.waitForFunction(
    () =>
      document.querySelector('.sg-panel-divider')?.getAttribute('aria-orientation') ===
      'horizontal',
  );
  const initialHeight = (await chat.boundingBox()).height;
  await divider.press('ArrowUp');
  assert.equal(await divider.getAttribute('aria-valuenow'), '45');
  assert.ok((await chat.boundingBox()).height < initialHeight);
  await picker.getByRole('button', { name: 'Manage pins' }).click();
  const menuBounds = await pins.boundingBox();
  assert.ok(menuBounds && menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= 390);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 390 });
  await picker.getByRole('button', { name: 'Manage pins' }).click();
  const narrowMenu = await pins.boundingBox();
  assert.ok(narrowMenu && narrowMenu.y >= 0 && narrowMenu.y + narrowMenu.height <= 390);
  console.log(
    'Agent picker routing, pin persistence, statuses, speech events and mobile layout passed.',
  );
} finally {
  await browser.close();
}
