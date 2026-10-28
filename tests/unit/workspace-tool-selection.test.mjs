import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWorkspaceTools } from '../../server/services/workspaceToolSelection.js';
const definitions = [
  'write_file',
  'run_command',
  'browser_fill_form',
  'generate_3d_game',
  'verify_workspace_code_task',
  'review_workspace_visual',
  'propose_evolution',
  'custom_reverse_translator',
  'generate_browser_app',
  'generate_browser_project',
  'repair_browser_app',
].map((name) => ({ type: 'function', function: { name } }));
test('task tools keep file execution and behavioral checks without unrelated browser or evolution schemas', () => {
  const names = selectWorkspaceTools(definitions, 'Build an invoice editor').map(
    (item) => item.function.name,
  );
  assert.ok(names.includes('write_file'));
  assert.ok(names.includes('run_command'));
  assert.ok(names.includes('verify_workspace_code_task'));
  assert.ok(!names.includes('browser_fill_form'));
  assert.ok(!names.includes('generate_3d_game'));
});

test('explicit terminal/module construction avoids browser compiler schemas but named calls remain available', () => {
  const query = 'Use write_file and run_command for a complete multi-file city project';
  const names = selectWorkspaceTools(definitions, query).map((d) => d.function.name);
  assert.ok(names.includes('write_file') && names.includes('run_command'));
  assert.ok(!names.includes('generate_browser_app') && !names.includes('generate_browser_project'));
  assert.ok(
    selectWorkspaceTools(
      definitions,
      query + '; use repair_browser_app for an existing module',
    ).some((d) => d.function.name === 'repair_browser_app'),
  );
});
test('browser, visual and explicitly named custom capabilities remain callable', () => {
  assert.ok(
    selectWorkspaceTools(definitions, 'sign in through the browser').some(
      (item) => item.function.name === 'browser_fill_form',
    ),
  );
  assert.ok(
    selectWorkspaceTools(definitions, 'Build a 3D lamp').some(
      (item) => item.function.name === 'review_workspace_visual',
    ),
  );
  assert.ok(
    selectWorkspaceTools(definitions, 'Use custom_reverse_translator').some(
      (item) => item.function.name === 'custom_reverse_translator',
    ),
  );
});
