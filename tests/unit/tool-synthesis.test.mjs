import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testData = fs.mkdtempSync(path.join(os.tmpdir(), 'supergence-forger-test-'));
process.env.SIS_DATA_DIR = testData;
const { default: adaToolForger } = await import('../../server/services/adaToolForger.js');
const { toolSynthesisTools } = await import('../../server/tools/tool-synthesis.js');

test.after(() => fs.rmSync(testData, { recursive: true, force: true }));

test('Tool Genesis: agent can synthesize, sandbox-verify, register, and execute dynamic tools', async () => {
  // 1. Synthesize a pure mathematical computation tool live
  const toolName = 'fibonacci_calc_' + Date.now().toString(36);
  const synthesizeResult = await toolSynthesisTools.synthesize_dynamic_tool.execute({
    name: toolName,
    displayName: 'Fibonacci Sequence Calculator',
    description: 'Calculates the first N Fibonacci numbers',
    parameters: { n: 'number' },
    required: ['n'],
    code: `
      const count = Number(params?.n || 5);
      const fib = [0, 1];
      for (let i = 2; i < count; i++) {
        fib.push(fib[i - 1] + fib[i - 2]);
      }
      return { count, sequence: fib.slice(0, count), last: fib[count - 1] };
    `,
  });

  assert.equal(synthesizeResult.success, true);
  assert.equal(synthesizeResult.installed, true);
  assert.equal(synthesizeResult.privileged, false);

  // 2. Verify registered in adaToolForger installed tools
  const installedTool = adaToolForger.installedTools.get('ada-tool-' + toolName);
  assert.ok(installedTool, 'Tool must be registered in adaToolForger installedTools');
  assert.equal(installedTool.name, toolName);

  const discovered = toolSynthesisTools.list_dynamic_tools.execute().installedTools.find((t) => t.name === toolName);
  assert.equal(discovered.description, 'Calculates the first N Fibonacci numbers');
  assert.deepEqual(discovered.required, ['n']);

  // 3. Verify execution via execute_dynamic_tool
  const directExec = await toolSynthesisTools.execute_dynamic_tool.execute({
    toolName,
    params: { n: 7 },
  });
  assert.equal(directExec.success, true);
  assert.equal(directExec.result.count, 7);
  assert.deepEqual(directExec.result.sequence, [0, 1, 1, 2, 3, 5, 8]);
  assert.equal(directExec.result.last, 8);

  const originalCode = installedTool.code;
  installedTool.code = 'return { changed: true };';
  await assert.rejects(
    toolSynthesisTools.execute_dynamic_tool.execute({ toolName }),
    /Verified installed tool not found/,
  );
  installedTool.code = originalCode;

  // 4. Verify test_dynamic_tool execution
  const testExec = await toolSynthesisTools.test_dynamic_tool.execute({
    toolId: 'ada-tool-' + toolName,
    sampleParams: { n: 4 },
  });
  assert.equal(testExec.success, true);
  assert.deepEqual(testExec.output.sequence, [0, 1, 1, 2]);

  // 5. Verify security rejection of malicious eval code
  const evilResult = await toolSynthesisTools.synthesize_dynamic_tool.execute({
    name: 'evil_tool_' + Date.now().toString(36),
    description: 'Malicious eval tool',
    code: 'return eval("2 + 2");',
  });
  assert.equal(evilResult.success, false);
  assert.equal(evilResult.installed, false);
  assert.ok(
    String(evilResult.reason).includes('dynamic code construction') ||
      String(evilResult.reason).includes('cannot be capability-bounded'),
  );

  // 6. Verify security rejection of broken syntax
  const brokenResult = await toolSynthesisTools.synthesize_dynamic_tool.execute({
    name: 'broken_tool_' + Date.now().toString(36),
    description: 'Broken syntax tool',
    code: 'return { invalid: syntax {{{',
  });
  assert.equal(brokenResult.success, false);
  assert.equal(brokenResult.installed, false);

  // Clean up created tool
  adaToolForger.installedTools.delete('ada-tool-' + toolName);
  adaToolForger._saveTools();
});
