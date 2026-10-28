// Test suite: Verify Zero Hardcoding and Full System Access for SIS Agent
import brain from '../../server/orchestrator/brain.js';
import workspace from '../../server/workspace/manager.js';
import toolRegistry from '../../server/tools/registry.js';
import path from 'path';

async function runTests() {
  console.log('===============================================================');
  console.log('   VERIFYING NO HARDCODING & FULL AGENT SYSTEM ACCESS         ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // ── TEST 1: Tool Registry Full Access (60 Registered Tools) ──
  console.log('[Test 1] Tool Registry & Full Access Capabilities...');
  const tools = toolRegistry.getAll();
  assert(tools.length >= 60, `Tool registry contains all registered tools (${tools.length} >= 60)`);

  const hasTheoryTools =
    toolRegistry.get('list_theories') &&
    toolRegistry.get('read_theory') &&
    toolRegistry.get('trigger_theory');
  assert(
    hasTheoryTools,
    'Direct theory tools (list_theories, read_theory, trigger_theory) registered and accessible',
  );

  const hasCommandTool = Boolean(toolRegistry.get('run_command'));
  assert(hasCommandTool, 'Shell command execution tool (run_command) registered and accessible');

  const hasFileTools = [
    'create_file',
    'read_file',
    'write_file',
    'edit_file',
    'delete_file',
    'list_files',
    'search_files',
    'grep_search',
  ].every((t) => toolRegistry.get(t));
  assert(hasFileTools, 'Full suite of file/workspace manipulation tools registered and accessible');

  // ── TEST 2: Workspace Manager Full Path Resolution ──
  console.log('\n[Test 2] Workspace Unrestricted Path Resolution...');
  const resolvedRel = workspace._resolve('server/index.js');
  assert(
    resolvedRel && resolvedRel.includes('server'),
    `Relative path resolves cleanly: ${resolvedRel}`,
  );

  // Absolute path check (must NOT throw 'escapes project workspace boundary')
  let absError = null;
  let resolvedAbs = null;
  try {
    resolvedAbs = workspace._resolve('C:\\Windows\\System32');
  } catch (e) {
    absError = e.message;
  }
  assert(
    !absError && resolvedAbs && resolvedAbs.toLowerCase().includes('system32'),
    `Absolute path resolves without boundary rejection (${resolvedAbs})`,
  );

  // ── TEST 3: Shell Command Execution via Workspace ──
  console.log('\n[Test 3] Direct Command Execution via Workspace...');
  const cmdRes = await workspace.runCommand('node -e "console.log(1337)"');
  assert(
    cmdRes.exitCode === 0 && cmdRes.stdout.trim() === '1337',
    `Command executed cleanly: output "${cmdRes.stdout.trim()}"`,
  );

  // ── TEST 4: Direct Theory Access via Tools ──
  console.log('\n[Test 4] Direct Theory Tools Execution...');
  const theoryList = await toolRegistry.execute('list_theories', {});
  assert(
    Array.isArray(theoryList.theories),
    `list_theories executed and returned ${theoryList.theories.length} theories`,
  );

  // ── TEST 5: Processing Greeting "hey" with ZERO Hardcoded Tool Calls ──
  console.log('\n[Test 5] Processing "hey" — Checking for ZERO Hardcoded Tool Calls...');
  const broadcasts = [];
  const mockWs = {
    readyState: 1,
    send: (data) => {
      try {
        broadcasts.push(JSON.parse(data));
      } catch {}
    },
  };
  brain.wsClients.add(mockWs);

  try {
    await brain.process('hey', mockWs);
  } catch (err) {
    console.error('Brain process error:', err.message);
  }

  // Filter tool-calls
  const toolCalls = broadcasts.filter((b) => b.type === 'tool-call');
  const toolResults = broadcasts.filter((b) => b.type === 'tool-result');

  assert(
    toolCalls.length === 0,
    `ZERO tool-calls emitted on greeting "hey" (found: ${toolCalls.length})`,
  );
  assert(
    toolResults.length === 0,
    `ZERO tool-results emitted on greeting "hey" (found: ${toolResults.length})`,
  );

  const fakeToolNames = [
    'calculate_possibilities',
    'search_files',
    'query_omni_memory',
    'web_search',
    'github_search',
  ];
  const hasFakeCalls = broadcasts.some(
    (b) => b.type === 'tool-call' && fakeToolNames.includes(b.tool),
  );
  assert(
    !hasFakeCalls,
    'No Stage 0 fake tool calls (calculate_possibilities, search_files, query_omni_memory, etc.) were broadcast',
  );

  // ── TEST 6: Processing Other Casual Greetings ("hello", "hi") ──
  console.log('\n[Test 6] Processing "hello" & "hi" — Checking for ZERO Hardcoded Tool Calls...');
  broadcasts.length = 0; // reset
  try {
    await brain.process('hello', mockWs);
  } catch {}
  const helloToolCalls = broadcasts.filter((b) => b.type === 'tool-call');
  assert(
    helloToolCalls.length === 0,
    `ZERO tool-calls emitted on "hello" (found: ${helloToolCalls.length})`,
  );

  broadcasts.length = 0; // reset
  try {
    await brain.process('hi', mockWs);
  } catch {}
  const hiToolCalls = broadcasts.filter((b) => b.type === 'tool-call');
  assert(
    hiToolCalls.length === 0,
    `ZERO tool-calls emitted on "hi" (found: ${hiToolCalls.length})`,
  );

  // Clean up mock WS
  brain.wsClients.delete(mockWs);

  // ── TEST 7: Absence of Hardcoded Tool Call Broadcasts in Stage 0 Code ──
  console.log('\n[Test 7] Static Verification of Stage 0 Code in brain.js...');
  import('fs').then((fs) => {
    const brainSrc = fs.readFileSync(path.resolve('server/orchestrator/brain.js'), 'utf8');
    const stage0Match = brainSrc.match(/STAGE 0[\s\S]*?STAGE 5/);
    const hasBroadcastToolCallInStage0 =
      stage0Match && stage0Match[0].includes("broadcast('tool-call'");
    assert(
      !hasBroadcastToolCallInStage0,
      "Zero broadcast('tool-call') invocations exist inside Stage 0 of brain.js",
    );

    const hasHardcodedGhInStage5 = brainSrc.includes('auto-github-search');
    assert(
      !hasHardcodedGhInStage5,
      'Zero auto-github-search hardcoded injections exist in Stage 5 of brain.js',
    );

    console.log('\n===============================================================');
    console.log(
      `  VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`,
    );
    console.log('===============================================================');
    process.exit(passed === total ? 0 : 1);
  });
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
