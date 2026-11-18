import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWorkspaceTools } from '../../server/services/workspaceToolSelection.js';
import { nativeToolChoice } from '../../server/services/assistantStream.js';
const definitions = [
  'write_file',
  'run_command',
  'browser_fill_form',
  'open_workspace_browser',
  'read_workspace_browser',
  'browser_click',
  'browser_type',
  'verify_workspace_artifact',
  'generate_3d_game',
  'verify_workspace_code_task',
  'review_workspace_visual',
  'propose_evolution',
  'custom_reverse_translator',
  'list_dynamic_tools',
  'execute_dynamic_tool',
  'inspect_learning',
  'record_learning_experience',
  'retain_knowledge',
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

test('website and local URLs select the same live browser workflow', () => {
  const browserChoice = {
    type: 'function',
    function: { name: 'open_workspace_browser' },
  };
  for (const query of [
    'Open chatgpt.com and ask it for its own tools.',
    'Open wikipedia.org and search for liquid glass.',
    'Go to developer.mozilla.org and inspect the page.',
    'Visit https://example.com/contact and find the form.',
    'Open localhost:5173/preview and click Start.',
    'Open 127.0.0.1:5173 and inspect the page.',
    'Open [::1]:5173 and click Start.',
  ]) {
    const selected = new Set(selectWorkspaceTools(definitions, query).map((d) => d.function.name));
    for (const tool of [
      'open_workspace_browser',
      'read_workspace_browser',
      'browser_click',
      'browser_type',
    ])
      assert.ok(selected.has(tool), `${query}: missing ${tool}`);
    assert.deepEqual(nativeToolChoice(query, selected), browserChoice, query);
  }
  for (const query of [
    'Open README.md',
    'Open a browser account user@example.com',
    'Open example.com, but do not use the browser',
  ])
    assert.notDeepEqual(
      nativeToolChoice(query, new Set(['open_workspace_browser'])),
      browserChoice,
      query,
    );
});

test('ordinary tasks can use verified reusable tools and evidence-based learning', () => {
  const names = selectWorkspaceTools(definitions, 'Analyze these measurements', [
    'custom_reverse_translator',
  ]).map((item) => item.function.name);
  for (const name of [
    'custom_reverse_translator',
    'list_dynamic_tools',
    'execute_dynamic_tool',
    'inspect_learning',
    'record_learning_experience',
    'retain_knowledge',
  ]) assert.ok(names.includes(name), name);
});
