import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  });
  const baseURL = process.env.SIS_BASE_URL || 'http://127.0.0.1:3009/';
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort(),
  );
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await page.route('**/api/ui/state', (route) => route.fulfill({ json: { theme: 'warm' } }));
  await page.addInitScript(() => {
    localStorage.setItem('sis_setup_completed', 'true');
    localStorage.setItem('sis_model_setup_seen', 'true');
    localStorage.setItem('sis-ui-theme', 'warm');
  });
  const profile = {
    id: 'fixture',
    name: 'Test gateway',
    baseURL: 'http://127.0.0.1:19200/v1',
    model: 'test-model',
  };
  const provider = { baseURL: profile.baseURL, defaultModel: profile.model, fallbackModel: '' };
  const proactive = { enabled: true, activity: false, intervalMinutes: 90, folders: ['workspace'] };
  const access = { mode: 'approve-for-me', browser: true, files: true, terminal: false };
  const writes = [];
  await page.route('**/api/settings', async (route) => {
    if (route.request().method() === 'POST') {
      writes.push('provider');
      Object.assign(provider, route.request().postDataJSON());
      await route.fulfill({ json: { success: true, provider } });
    } else {
      await route.fulfill({
        json: {
          provider,
          paths: { workspaceDir: 'fixture/workspace' },
          system: { nodeVersion: 'fixture runtime', platform: 'fixture', arch: 'x64' },
        },
      });
    }
  });
  await page.route('**/api/provider/profiles', (route) =>
    route.fulfill({ json: { active: profile, profiles: [profile] } }),
  );
  await page.route('**/api/access', (route) => {
    if (route.request().method() === 'PATCH') {
      writes.push('access');
      Object.assign(access, route.request().postDataJSON());
    }
    return route.fulfill({ json: { success: true, settings: access, pending: [] } });
  });
  await page.route('**/api/proactive-suggestions', (route) =>
    route.fulfill({ json: { settings: proactive } }),
  );
  await page.route('**/api/proactive-suggestions/settings', (route) => {
    writes.push('proactive');
    Object.assign(proactive, route.request().postDataJSON());
    return route.fulfill({ json: { settings: proactive } });
  });
  await page.route('**/api/autostart/status', (route) =>
    route.fulfill({ json: { enabled: false, details: 'Fixture startup status' } }),
  );

  await page.goto(baseURL, { waitUntil: 'commit' });
  await page.locator('#sgDualWorkspaceWrapper').waitFor({ timeout: 60_000 });
  const backgroundStyle = (property) =>
    page.locator('.supergence-workspace').evaluate((element, key) => getComputedStyle(element)[key], property);
  const panelStyles = (property) =>
    page.locator('#sgActiveConversationCard, #sgSpacePane').evaluateAll(
      (elements, key) => elements.map((element) => getComputedStyle(element)[key]),
      property,
    );
  assert.equal(await backgroundStyle('backgroundImage'), 'none');
  assert.equal(await backgroundStyle('backgroundColor'), 'rgb(16, 16, 18)');
  assert.deepEqual(await panelStyles('backgroundColor'), ['rgb(9, 9, 11)', 'rgb(21, 21, 23)']);
  assert.deepEqual(await panelStyles('backdropFilter'), Array(2).fill('none'));

  const componentMenu = page.getByRole('button', { name: 'Appearance', exact: true });
  const componentEditor = page.getByRole('dialog', { name: 'Appearance', exact: true });
  const editComponent = async (locator, position) => {
    await locator.click({ button: 'right', position });
    await componentMenu.click();
    await componentEditor.waitFor();
  };
  const componentFinish = componentEditor.getByLabel('Finish');
  const componentTarget = componentEditor.getByLabel('Component', { exact: true });
  const componentTint = componentEditor.getByLabel('Surface color');
  const componentDone = componentEditor.getByRole('button', { name: 'Done' });
  const conversation = page.locator('#sgActiveConversationCard');
  await editComponent(conversation, { x: 10, y: 120 });
  await componentTarget.selectOption({ label: 'Conversation panel' });
  await componentTint.fill('#425764');
  await componentFinish.selectOption('glass');
  assert.deepEqual(await panelStyles('backdropFilter'), ['blur(18px) saturate(1.25)', 'none']);
  await componentDone.click();

  const activityCard = page.locator('.sg-activity-timeline-card');
  await editComponent(activityCard, { x: 9, y: 12 });
  await componentTint.fill('#544234');
  assert.equal(await activityCard.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(84, 66, 52)');
  await componentDone.click();

  const addAgentIcon = page.locator('#sgDockAddBtn svg');
  await editComponent(addAgentIcon);
  await componentEditor.getByLabel('Icon and text color').fill('#d89f65');
  assert.equal(await addAgentIcon.evaluate((element) => getComputedStyle(element).color), 'rgb(216, 159, 101)');
  await componentDone.click();

  const dockAgent = page.locator('#sgFloatingAgentDock [data-agent]').first();
  await editComponent(dockAgent.locator('img'));
  await componentTint.fill('#456354');
  await componentDone.click();
  await dockAgent.focus();
  await dockAgent.press('Shift+F10');
  await componentMenu.press('Enter');
  assert.equal(await componentTint.inputValue(), '#456354');
  await componentDone.click();

  const composerActions = page.locator('#sgComposerAddActions');
  await page.locator('#sgComposerContextButton').click();
  await editComponent(composerActions.getByRole('button', { name: 'Add notes' }));
  await componentTarget.selectOption({ label: 'Composer actions' });
  await componentFinish.selectOption('solid');
  await componentTint.fill('#322840');
  await componentDone.click();
  assert.equal(await composerActions.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(50, 40, 64)');

  const trigger = page.getByRole('button', { name: 'Settings', exact: true });
  const divider = page.getByRole('separator', { name: 'Resize conversation and workspace' });
  await divider.press('ArrowRight');
  assert.equal(await divider.getAttribute('aria-valuenow'), '55');
  await trigger.click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  const settingsSurface = page.locator('#supergenceStylesWindow');
  const tab = (name) => settings.getByRole('tab', { name, exact: true });
  await settings.getByText('Fixture startup status').waitFor();
  const settingsClose = settings.getByRole('button', { name: 'Close settings window' });
  await editComponent(settingsClose);
  await componentFinish.selectOption('solid');
  await componentTint.fill('#694937');
  assert.equal(await page.locator('#swCloseBtn').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(105, 73, 55)');
  await componentTarget.selectOption({ label: 'Settings' });
  await componentFinish.selectOption('glass');
  await componentTint.fill('#2c3848');
  assert.equal(await settingsSurface.evaluate((element) => getComputedStyle(element).backdropFilter), 'blur(18px) saturate(1.25)');
  await editComponent(componentEditor.getByRole('heading', { name: 'Appearance', exact: true }));
  await componentTarget.selectOption('body #sgAppearanceEditor');
  await componentFinish.selectOption('solid');
  await componentTint.fill('#263445');
  assert.equal(await componentEditor.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(38, 52, 69)');
  await page.keyboard.press('Escape');
  await componentEditor.waitFor({ state: 'hidden' });
  assert.equal(await tab('General').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'swCloseBtn');
  await settings.getByRole('switch', { name: /Compact spacing/ }).check();
  assert.equal(await page.evaluate(() => localStorage.getItem('sis-ui-compact')), 'true');
  await settings.getByRole('button', { name: 'Reset panel sizes' }).click();
  assert.equal(await divider.getAttribute('aria-valuenow'), '50');
  await settings.getByText('Agent pins', { exact: true }).click();
  await settings.getByText('3 of 3 pinned').waitFor();
  await tab('General').press('ArrowRight');
  assert.equal(await tab('Appearance').getAttribute('aria-selected'), 'true');
  await settings.getByRole('radio', { name: 'Obsidian', exact: true }).click();
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    'rgb(12, 12, 14)',
  );
  const background = settings.getByLabel('Workspace background');
  const finish = settings.getByLabel('Panel finish');
  const appearances = [
    ['cosmic', 'cosmic-hyperspace-warp.jpg'],
    ['horizon', 'interstellar-horizon.jpg'],
    ['nebula', 'quantum-nebula.jpg'],
  ];
  for (const [choice, filename] of appearances) {
    const request = page.waitForResponse((response) => response.url().endsWith(filename) && response.ok());
    await background.selectOption(choice);
    assert.ok((await backgroundStyle('backgroundImage')).includes(filename));
    await request;
  }
  await background.selectOption('solid');
  await settings.getByLabel('Background color', { exact: true }).fill('#26354a');
  assert.equal(await backgroundStyle('backgroundImage'), 'none');
  assert.equal(await backgroundStyle('backgroundColor'), 'rgb(38, 53, 74)');
  await finish.selectOption('solid');
  await settings.getByLabel('Panel color', { exact: true }).fill('#e8dcc8');
  assert.equal((await panelStyles('backgroundColor'))[1], 'rgb(232, 220, 200)');
  assert.equal(await page.locator('#sgSpacePane .sg-space-nav-tab:not(.active)').first()
    .evaluate((element) => getComputedStyle(element).color), 'rgb(33, 23, 19)');
  await settings.getByLabel('Panel color', { exact: true }).fill('#48372b');
  assert.equal((await panelStyles('backgroundColor'))[1], 'rgb(72, 55, 43)');
  assert.equal((await panelStyles('backdropFilter'))[1], 'none');
  assert.equal(await backgroundStyle('backgroundColor'), 'rgb(38, 53, 74)');
  await finish.selectOption('glass');
  await settings.getByLabel('Glass opacity').press('Home');
  assert.equal((await panelStyles('backgroundColor'))[1], 'color(srgb 0.282353 0.215686 0.168627 / 0.25)');
  assert.equal((await panelStyles('backdropFilter'))[1], 'blur(24px) saturate(1.25)');
  await background.selectOption('custom');
  const wallpaper = settings.getByLabel('Wallpaper image', { exact: true });
  await wallpaper.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await settings.getByText('This image could not be opened.').waitFor();
  await wallpaper.setInputFiles('client/wallpapers/cosmic-hyperspace-warp.jpg');
  await settings.getByText('Wallpaper saved.', { exact: true }).waitFor();
  const verifyCustomWallpaper = () => page.waitForFunction(async () => {
    const background = getComputedStyle(document.querySelector('.supergence-workspace')).backgroundImage;
    if (!background.startsWith('url("blob:')) return false;
    const image = new Image();
    image.src = background.slice(5, -2);
    await image.decode();
    return image.naturalWidth > 0;
  });
  await verifyCustomWallpaper();
  await tab('Models & providers').click();
  await settings.getByRole('region', { name: 'Models & providers' }).waitFor();
  await settings.locator('#sisActiveCoreTitle').filter({ hasText: 'Test gateway' }).waitFor();
  await tab('Storage').click();
  await settings.getByText('fixture/workspace', { exact: true }).waitFor();
  await tab('Access & autonomy').click();
  const terminal = settings.getByRole('switch', { name: 'Terminal & code execution', exact: true });
  await terminal.check();
  await settings.getByRole('button', { name: 'Save access settings', exact: true }).click();
  await settings.getByText(/Applies to all agents/).waitFor();
  assert.equal(access.terminal, true);
  await settings.locator('#swProactiveInterval').selectOption('120');
  await settings.getByRole('button', { name: 'Save changes', exact: true }).click();
  await settings.getByText('Changes saved.', { exact: true }).waitFor();
  assert.equal(proactive.intervalMinutes, 120);
  assert.deepEqual(writes, ['access', 'proactive']);
  await tab('Models & providers').click();
  const fallbackModel = settings.locator('#swFallbackModel');
  await editComponent(fallbackModel);
  await componentTint.fill('#483628');
  await componentDone.click();
  await fallbackModel.fill('test-fallback');
  await settings.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('#swFeedback').textContent === 'Changes saved.',
  );
  assert.equal(provider.fallbackModel, 'test-fallback');
  assert.deepEqual(writes, ['access', 'proactive', 'provider']);
  await tab('System').click();
  await settings.getByText('fixture runtime', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await settings.waitFor({ state: 'hidden' });
  assert.equal(await page.locator(':focus').getAttribute('id'), 'sgSettingsButton');
  await page.locator('#sgComposerModelPill').click();
  const modelOverlay = page.getByRole('dialog', { name: 'Models & providers', exact: true });
  await editComponent(modelOverlay.getByRole('heading', { name: 'Models & providers', exact: true }));
  await componentTarget.selectOption('body #sisModelSwitcherModalOverlay > div.sis-model-modal');
  await componentFinish.selectOption('glass');
  await page.keyboard.press('Escape');
  await componentEditor.waitFor({ state: 'hidden' });
  assert.equal(await modelOverlay.locator('.sis-model-modal').evaluate((element) => getComputedStyle(element).backdropFilter), 'blur(18px) saturate(1.25)');
  await modelOverlay.getByRole('button', { name: 'Close modal' }).click();
  await modelOverlay.waitFor({ state: 'hidden' });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await verifyCustomWallpaper();
  await page.waitForFunction(() => document.getElementById('sgActiveConversationCard')?.dataset.sgItemFinish === 'glass');
  assert.equal((await panelStyles('backdropFilter'))[0], 'blur(18px) saturate(1.25)');
  assert.equal(await addAgentIcon.evaluate((element) => getComputedStyle(element).color), 'rgb(216, 159, 101)');
  assert.equal(await dockAgent.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(69, 99, 84)');
  await editComponent(conversation, { x: 10, y: 120 });
  await componentTarget.selectOption({ label: 'Conversation panel' });
  await componentEditor.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal((await panelStyles('backdropFilter'))[0], 'blur(24px) saturate(1.25)');
  await componentDone.click();
  await trigger.click();
  assert.equal(await settingsSurface.evaluate((element) => getComputedStyle(element).backdropFilter), 'blur(18px) saturate(1.25)');
  await tab('Appearance').click();
  assert.equal(await background.inputValue(), 'custom');
  assert.equal(await settings.getByLabel('Panel color', { exact: true }).inputValue(), '#48372b');
  assert.equal(await settings.getByLabel('Glass opacity').inputValue(), '25');
  await settings.getByRole('button', { name: 'Reset background and panels' }).click();
  assert.equal(await backgroundStyle('backgroundImage'), 'none');
  assert.equal(await finish.inputValue(), 'solid');
  await finish.selectOption('glass');
  assert.equal(await settings.getByLabel('Glass opacity').inputValue(), '60');
  await settings.getByRole('button', { name: 'Close settings window' }).click();

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await trigger.click();
    await settings.waitFor();
    const box = await settings.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width);
    assert.ok(box.y >= 0 && box.y + box.height <= 700);
    const tabBoxes = await settings
      .getByRole('tab')
      .evaluateAll((items) =>
        items.map((item) => ({
          left: item.getBoundingClientRect().left,
          right: item.getBoundingClientRect().right,
        })),
      );
    assert.ok(tabBoxes.every(({ left, right }) => left >= 0 && right <= width));
    await tab('Appearance').click();
    const selectBox = await background.boundingBox();
    assert.ok(selectBox && selectBox.x >= 0 && selectBox.x + selectBox.width <= width);
    await settings.getByRole('button', { name: 'Close settings window' }).click();
  }
  console.log(
    'Settings, nested overlays, popovers, component appearance, wallpaper, reload, keyboard and narrow layout passed.',
  );
} finally {
  await browser.close();
}
