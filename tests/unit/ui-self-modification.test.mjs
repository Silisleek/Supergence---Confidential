import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uiSelfModification from '../../server/services/uiSelfModification.js';
import { uiTools } from '../../server/tools/ui-tools.js';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

test('UI Self-Modification: inspects UI state and supported themes/targets', async () => {
  const stateResult = await uiTools.get_ui_state.execute();
  assert.equal(stateResult.success, true);
  assert.ok(Array.isArray(stateResult.supportedThemes));
  assert.ok(stateResult.supportedThemes.includes('cyber'));
  assert.ok(stateResult.supportedThemes.includes('midnight'));
  assert.ok(Array.isArray(stateResult.supportedTargets));
  assert.ok(stateResult.supportedTargets.includes('#sisFloatingLayer'));
});

test('UI Self-Modification: modifies theme and custom CSS variables live', async () => {
  const result = await uiTools.modify_ui_theme.execute({
    theme: 'cyber',
    customCssVars: {
      '--accent': '#00ffcc',
      '--bg-primary': '#0a0a12',
    },
    customCss: '.custom-agent-indicator { color: #00ffcc; }',
  });

  assert.equal(result.success, true);
  assert.equal(result.theme, 'cyber');
  assert.equal(result.customCssVars['--accent'], '#00ffcc');

  const liveState = uiSelfModification.getUIState();
  assert.equal(liveState.theme, 'cyber');
  assert.equal(liveState.customCssVars['--accent'], '#00ffcc');
  assert.equal(liveState.customCss, '.custom-agent-indicator { color: #00ffcc; }');
});

test('UI Self-Modification: injects and unmounts dynamic UI widgets', async () => {
  const widgetId = `status_tracker_${Date.now().toString(36)}`;
  const injectResult = await uiTools.inject_ui_widget.execute({
    id: widgetId,
    title: 'Autonomous Status Tracker',
    target: '#sisFloatingLayer',
    html: '<div class="tracker-val">Optimal (100%)</div>',
    css: '.tracker-val { font-weight: bold; color: #10B981; }',
    js: 'console.log("Widget mounted: " + widget.id);',
    position: 'append',
  });

  assert.equal(injectResult.success, true);
  assert.equal(injectResult.widget.id, widgetId);
  assert.equal(injectResult.widget.title, 'Autonomous Status Tracker');

  // Verify widget in state
  let state = uiSelfModification.getUIState();
  let found = state.widgets.find((w) => w.id === widgetId);
  assert.ok(found, 'Widget must be present in UI state');
  assert.equal(found.title, 'Autonomous Status Tracker');

  // Remove widget
  const removeResult = await uiTools.remove_ui_widget.execute({ id: widgetId });
  assert.equal(removeResult.success, true);
  assert.equal(removeResult.id, widgetId);

  // Verify widget removed from state
  state = uiSelfModification.getUIState();
  found = state.widgets.find((w) => w.id === widgetId);
  assert.equal(found, undefined, 'Widget must be removed from UI state');
});

test('UI Self-Modification: confines source file modification strictly within client/', async () => {
  // 1. Path traversal attempting to modify server/ or package.json must be blocked
  await assert.rejects(async () => {
    uiSelfModification.modifyUISource({
      file: '../server/index.js',
      targetContent: 'test',
      replacementContent: 'hack',
    });
  }, /Path escapes root/i);

  await assert.rejects(async () => {
    uiSelfModification.modifyUISource({
      file: '../../package.json',
      targetContent: 'test',
      replacementContent: 'hack',
    });
  }, /Path escapes root/i);

  // 2. Disallowed file extensions must be blocked
  await assert.rejects(async () => {
    uiSelfModification.modifyUISource({
      file: 'malicious.exe',
      targetContent: 'test',
      replacementContent: 'hack',
    });
  }, /unsupported file extension/i);
});

test('UI Self-Modification: validates syntax before modifying client files and creates backup', async () => {
  // Create a temporary test fixture inside client/
  const testFixtureRel = 'styles/test-temp-theme.css';
  const testFixtureAbs = path.join(root, 'client', testFixtureRel);
  fs.writeFileSync(testFixtureAbs, '/* Test CSS fixture */\n.test-box { color: red; }\n', 'utf8');

  try {
    // 1. Rejects invalid CSS (unbalanced braces)
    await assert.rejects(async () => {
      uiSelfModification.modifyUISource({
        file: testFixtureRel,
        targetContent: 'color: red;',
        replacementContent: 'color: blue; { broken {',
      });
    }, /CSS Syntax Error/i);

    // Verify file was NOT modified when validation failed
    assert.ok(fs.readFileSync(testFixtureAbs, 'utf8').includes('color: red;'));

    // 2. Successfully replaces valid content and creates backup
    const modResult = uiSelfModification.modifyUISource({
      file: testFixtureRel,
      targetContent: 'color: red;',
      replacementContent: 'color: #00ffcc;',
    });

    assert.equal(modResult.success, true);
    assert.ok(fs.existsSync(modResult.backupPath));
    assert.ok(fs.readFileSync(testFixtureAbs, 'utf8').includes('color: #00ffcc;'));

    // 3. Rollback from backup restores original content
    const rollbackResult = uiSelfModification.rollbackUISource({
      file: testFixtureRel,
      backupPath: modResult.backupPath,
    });
    assert.equal(rollbackResult.success, true);
    assert.ok(fs.readFileSync(testFixtureAbs, 'utf8').includes('color: red;'));

    // Clean up backup file
    if (fs.existsSync(modResult.backupPath)) {
      fs.unlinkSync(modResult.backupPath);
    }
  } finally {
    if (fs.existsSync(testFixtureAbs)) {
      fs.unlinkSync(testFixtureAbs);
    }
  }
});
