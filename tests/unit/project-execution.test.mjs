import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAction } from '../../server/security/action-monitor.js';
import {
  projectProgress,
  projectCheckpoint,
  isProjectBuild,
} from '../../server/services/projectProgress.js';
import { contextualInference } from '../../server/services/contextualInference.js';
import { workspaceEnvironment } from '../../server/workspace/environment.js';
import { extractToolCall } from '../../server/services/assistantStream.js';

test('project repair and finishing requests retain the implementation workflow', () => {
  for (const query of [
    'Repair the existing city and preserve its architecture.',
    'Fix the project navigation and finish its GLB export.',
    'Optimize this 3D scene and improve its materials.',
    'Complete the existing game. Do not rewrite external evaluation scripts.',
    'Repair this existing city. Do not create a new city or replace working architecture.',
    'Do not edit the tests; fix the existing app.',
  ])
    assert.equal(isProjectBuild(query), true, query);
  for (const query of [
    'Explain only how to fix the city',
    'Review only the project',
    'Do not edit the app; explain the failure.',
  ])
    assert.equal(isProjectBuild(query), false, query);
});

test('a failed browser acceptance check reactivates implementation progress after a successful build', () => {
  const available = new Set(['write_file', 'edit_file', 'read_file', 'run_command']);
  const source = {
    tool: 'write_file',
    status: 'RESOLVED',
    args: { filepath: 'city/src/main.js' },
    output: { success: true },
  };
  const build = {
    tool: 'run_command',
    status: 'RESOLVED',
    args: { command: 'npm run build' },
    output: { exitCode: 0 },
  };
  const failure = {
    tool: 'run_command',
    status: 'FAILED',
    args: { command: 'node tools/verify.mjs' },
    output: { exitCode: 1, stderr: 'WASD did not move' },
  };
  const reads = Array.from({ length: 8 }, () => ({
    tool: 'read_file',
    status: 'RESOLVED',
    output: { success: true },
  }));
  const probe = { ...source, args: { filepath: 'city/tools/probe-cost.mjs' } };
  const stalled = [source, build, failure, ...reads, probe];
  const policy = projectProgress('Build the city project', stalled, available);
  assert.equal(policy.toolChoice.function.name, 'edit_file');
  assert.match(policy.instruction, /latest actual acceptance check failed/);
  const compiledRepair = projectProgress(
    'Repair the existing city',
    stalled,
    new Set([...available, 'repair_browser_app']),
  );
  assert.equal(compiledRepair.toolChoice.function.name, 'repair_browser_app');
  assert.match(compiledRepair.instruction, /validates patches atomically/);
  const distinctReads = reads.map((call, index) => ({
    ...call,
    args: { filepath: `city/src/module-${index}.js` },
  }));
  assert.equal(
    projectProgress(
      'Repair the existing city project',
      [source, build, failure, ...distinctReads],
      available,
    ).toolChoice,
    'auto',
    'Necessary reads of different modules are not an inspection loop.',
  );
  const readVerifier = {
    tool: 'run_command',
    status: 'RESOLVED',
    args: {
      command: "node -e \"console.log(require('fs').readFileSync('tools/verify.mjs','utf8'))\"",
    },
    output: { exitCode: 0 },
  };
  assert.equal(
    projectProgress('Build the city project', [...stalled, readVerifier], available).toolChoice
      .function.name,
    'edit_file',
  );
  assert.equal(
    projectProgress('Build the city project', [...stalled, source], available).toolChoice,
    'auto',
  );
  assert.equal(
    projectProgress(
      'Build the city project',
      [...stalled, { ...failure, status: 'RESOLVED', output: { exitCode: 0 } }],
      available,
    ).toolChoice,
    'auto',
  );
  assert.equal(
    projectProgress('Explain only how to build the city', stalled, available).toolChoice,
    'auto',
  );
});

test('an enforced implementation phase offers only its selected schema and repairs a wrong action without executing it', async () => {
  const write = { type: 'function', function: { name: 'write_file' } };
  const read = { type: 'function', function: { name: 'read_file' } };
  const original = {
    systemPrompt: 'Preserve the bridges and original city requirements.',
    messages: [{ role: 'user', content: 'Continue building the city' }],
    tools: [write, read],
    toolChoice: { type: 'function', function: { name: 'write_file' } },
  };
  const response = await contextualInference(original, {
    stream: async (options) => {
      assert.deepEqual(options.tools, [write]);
      assert.match(options.systemPrompt, /next action must use the native write_file/);
      return {
        text: '',
        toolCalls: [
          { function: { name: 'read_file', arguments: '{"filepath":"city/engine.js"}' } },
        ],
      };
    },
    complete: async (options) => {
      assert.deepEqual(options.tools, [write]);
      assert.deepEqual(options.thinking, { type: 'disabled' });
      assert.match(options.systemPrompt, /Call the native write_file function now/);
      assert.match(options.systemPrompt, /Preserve the bridges/);
      return {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: 'write_file',
                    arguments: '{"filepath":"city/main.js","content":"export {};"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };
    },
  });
  assert.equal(JSON.parse(extractToolCall(response)).tool, 'write_file');
  assert.deepEqual(
    original.tools,
    [write, read],
    'Other phases keep the original registered tools.',
  );
});

test('resumed projects recover real file APIs and execution failures without stale edited signatures', () => {
  const calls = [
    {
      tool: 'write_file',
      status: 'RESOLVED',
      args: { filepath: 'city/engine.js', content: 'export function buildCity(scene) {}' },
      output: { success: true, size: 34 },
    },
    {
      tool: 'write_file',
      status: 'RESOLVED',
      args: { filepath: 'city/old.js', content: 'export function obsolete() {}' },
      output: { success: true },
    },
    {
      tool: 'edit_file',
      status: 'RESOLVED',
      args: { filepath: 'city/old.js', replacement_content: 'export function replacement() {}' },
      output: { success: true },
    },
    {
      tool: 'write_file',
      status: 'FAILED',
      args: { filepath: 'city/unsaved.js', content: 'export const invented = 42;' },
      output: { error: 'disk write failed' },
    },
    {
      tool: 'run_command',
      status: 'RESOLVED',
      args: { command: 'npm run build', cwd: 'city' },
      output: { exitCode: 1, stderr: 'Missing main.js' },
    },
  ];
  const checkpoint = projectCheckpoint(calls);
  assert.match(checkpoint, /buildCity\(scene\)/);
  assert.match(checkpoint, /Missing main.js/);
  assert.match(checkpoint, /exitCode\\?":1/);
  assert.doesNotMatch(checkpoint, /obsolete|unsaved.js|invented/);
  assert.match(checkpoint, /not necessarily built or verified/);
});

test('read-only searches with null redirection do not ask to modify source; actual writes still require review', () => {
  for (const command of [
    'findstr /s /i /c:"vendor/three" server\\*.js 2>nul | more +0',
    'findstr /s /i /c:"/workspace" server\\index.mjs 2>nul',
    'cat server/index.js > /dev/null',
    'Get-Content server/index.js 2>$null',
  ])
    assert.equal(assessAction('run_command', { command }).risk, 'medium', command);
  for (const command of [
    'echo changed > server/index.js 2>nul',
    'Set-Content client/index.html changed',
    "node -e \"require('fs').writeFileSync('server/index.js','changed')\"",
    'echo changed > server/index.js 2>&1',
    'Remove-Item workspace -Recurse',
    'Get-Content .env',
  ])
    assert.equal(assessAction('run_command', { command }).risk, 'high', command);
  assert.equal(
    assessAction('write_file', {
      filepath: 'project/build.js',
      content: 'const mode = process.env.NODE_ENV;',
    }).risk,
    'low',
  );
  assert.equal(assessAction('read_file', { filepath: '../.env' }).risk, 'high');
  assert.equal(assessAction('read_file', { filepath: 'C:\\repo\\.env.local' }).risk, 'high');
  assert.equal(
    assessAction('write_file', {
      filepath: 'supergence/projects/city/tools/package.mjs',
      content: "const excluded = ['.env', 'Cookies'];",
    }).risk,
    'low',
  );
  assert.equal(
    assessAction('edit_file', {
      filepath: 'supergence/projects/city/tools/package.mjs',
      target_content: "const excluded = ['.env'];",
      replacement_content: "const excluded = ['.env', 'Cookies'];",
    }).risk,
    'low',
  );
  assert.equal(
    assessAction('write_file', { filepath: 'supergence/projects/city/.env', content: 'test=value' })
      .risk,
    'high',
  );
  assert.equal(
    assessAction('write_file', {
      filepath: 'supergence/projects/city/main.js',
      content: "const key='sk-123456789012345678901234567890';",
    }).risk,
    'high',
  );
});

test('project setup transitions to actual source without forcing writes for explanations or completed builds', () => {
  const available = new Set(['read_file', 'write_file']);
  const setup = ['get_creation_workspace', 'run_command', 'run_command'].map((tool) => ({
    tool,
    status: 'RESOLVED',
    output: { exitCode: 0 },
  }));
  const policy = projectProgress('Build a complete 3D city project', setup, available);
  assert.equal(policy.toolChoice.function.name, 'write_file');
  assert.match(policy.instruction, /Stop rechecking/);
  assert.equal(
    projectProgress('Explain only how to build a city', setup, available).toolChoice,
    'auto',
  );
  assert.equal(
    projectProgress('Read this project. Do not build anything.', setup, available).toolChoice,
    'auto',
  );
  const source = { tool: 'write_file', status: 'RESOLVED', output: { success: true } };
  assert.equal(projectProgress('Build a city', [...setup, source], available).toolChoice, 'auto');
  const inspecting = [...setup, source, ...setup, setup[1]];
  assert.equal(
    projectProgress('Build a city', inspecting, available).toolChoice.function.name,
    'write_file',
  );
  assert.match(
    projectProgress('Build a city', inspecting, available).instruction,
    /4 successful inspection actions/,
  );
  assert.equal(
    projectProgress('Build a city', [...inspecting, source], available).toolChoice,
    'auto',
  );
  const built = {
    tool: 'run_command',
    status: 'RESOLVED',
    args: { command: 'npm run build' },
    output: { exitCode: 0 },
  };
  assert.equal(projectProgress('Build a city', [...setup, built], available).toolChoice, 'auto');
  const failed = { ...source, output: { error: 'not saved' } };
  assert.equal(
    projectProgress('Build a city', [...setup, failed], available).toolChoice.function.name,
    'write_file',
  );
});

test('truncated project planning is repaired into a bounded native action without streaming drafts', async () => {
  const shown = [];
  let repairs = 0;
  const response = await contextualInference(
    {
      systemPrompt: 'Original requirement: both bridges and GLB.',
      messages: [{ role: 'user', content: 'Build the city' }],
      tools: [{ type: 'function', function: { name: 'write_file' } }],
      toolChoice: 'auto',
      deferActionText: true,
      maxTokens: 16384,
    },
    {
      stream: async (_options, emit) => {
        emit('Long unfinished planning and code draft');
        return {
          text: 'Long unfinished planning and code draft',
          finishReason: 'length',
          truncated: true,
        };
      },
      complete: async (options) => {
        repairs++;
        assert.match(options.systemPrompt, /both bridges and GLB/);
        assert.equal(options.toolChoice, 'required');
        assert.deepEqual(options.thinking, { type: 'disabled' });
        assert.equal(options.maxTokens, 8192);
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                content: 'Writing the first module.',
                tool_calls: [
                  {
                    function: {
                      name: 'write_file',
                      arguments: '{"filepath":"project/main.js","content":"export {};"}',
                    },
                  },
                ],
              },
            },
          ],
        };
      },
    },
    (text) => shown.push(text),
  );
  assert.equal(repairs, 1);
  assert.ok(extractToolCall(response));
  assert.deepEqual(shown, []);
});

test('a second truncated proposal is an error, and a regular truncated answer is never completion', async () => {
  await assert.rejects(
    contextualInference(
      { messages: [], tools: [{}], toolChoice: 'required' },
      {
        stream: async () => ({ text: 'unfinished', truncated: true }),
        complete: async () => ({
          choices: [{ finish_reason: 'length', message: { content: 'still unfinished' } }],
        }),
      },
    ),
    /valid tool action/,
  );
  await assert.rejects(
    contextualInference(
      { messages: [], tools: [], toolChoice: 'auto' },
      {
        stream: async () => ({ text: 'partial answer', finishReason: 'stream_cut' }),
        complete: async () => {
          throw new Error('No blind replay');
        },
      },
    ),
    /not complete/,
  );
});

test('workspace environment reports actual installed dependencies and native shell', () => {
  const environment = workspaceEnvironment('test-workspace');
  assert.equal(environment.node.version, process.version);
  assert.equal(environment.shell, process.platform === 'win32' ? 'cmd.exe' : '/bin/sh');
  assert.ok(environment.packages.three.version);
  assert.ok(environment.packages['playwright-core'].directory);
});
