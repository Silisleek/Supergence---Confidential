// Test Suite: Verify Conscious-to-Subconscious Autonomous Tool & Memory Evolution
import subconsciousEngine from '../../server/orchestrator/subconscious-engine.js';
import subconsciousMatrix from '../../server/orchestrator/subconscious.js';
import toolRegistry from '../../server/tools/registry.js';
import longTermMemory from '../../server/memory/long-term.js';
import knowledgeGraph from '../../server/memory/knowledge-graph.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('===============================================================');
  console.log('  VERIFYING CONSCIOUS-TO-SUBCONSCIOUS AUTONOMOUS EVOLUTION   ');
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

  // Capture broadcast events
  const broadcastEvents = [];
  subconsciousEngine.setBroadcast((type, data) => {
    broadcastEvents.push({ type, data, timestamp: Date.now() });
  });

  // ─── TEST 1: Tool Registry Has Built-in instruct_subconscious ───
  console.log('[Test 1] Verifying built-in instruct_subconscious tool in ToolRegistry...');
  const instructTool = toolRegistry.get('instruct_subconscious');
  assert(Boolean(instructTool), 'instruct_subconscious tool is registered in ToolRegistry');
  assert(
    instructTool?.parameters?.action !== undefined,
    'instruct_subconscious exposes action parameter',
  );
  assert(
    instructTool?.parameters?.goal !== undefined,
    'instruct_subconscious exposes goal parameter',
  );

  // ─── TEST 2: Conscious Instructs Subconscious to Create Voice Speech Tool ───
  console.log('\n[Test 2] Conscious instructs Subconscious to build "speak_to_user" tool...');
  const voiceResult = await subconsciousEngine.handleConsciousInstruction({
    action: 'create_tool',
    goal: 'Create voice speech tool speak_to_user to talk directly to the user aloud',
    specification:
      'Takes text, optional rate and pitch, and broadcasts speech utterance to user interface',
  });

  assert(voiceResult.success === true, 'Subconscious returned success for voice tool creation');
  assert(voiceResult.unlocked === true, 'Subconscious unlocked the voice tool');
  assert(voiceResult.toolName === 'speak_to_user', 'Tool name is speak_to_user');

  const registeredVoiceTool = toolRegistry.get('speak_to_user');
  assert(Boolean(registeredVoiceTool), 'speak_to_user is now actively registered in ToolRegistry');

  // Verify tool-unlocked broadcast event was emitted
  const unlockEvent = broadcastEvents.find(
    (e) => e.type === 'tool-unlocked' && e.data.tool?.name === 'speak_to_user',
  );
  assert(Boolean(unlockEvent), 'Broadcast event "tool-unlocked" was emitted for speak_to_user');
  assert(
    unlockEvent?.data?.tool?.displayName !== undefined,
    'Unlock event contains human-readable displayName',
  );

  // ─── TEST 3: Immediate Execution of Newly Unlocked Voice Tool ───
  console.log('\n[Test 3] Immediate execution of newly unlocked "speak_to_user" tool...');
  const execResult = await toolRegistry.execute('speak_to_user', {
    text: 'Hello! I have created and unlocked speech synthesis so I can talk with you directly.',
    rate: 1.0,
    pitch: 1.0,
  });

  assert(execResult.success === true, 'Newly unlocked speak_to_user tool executed successfully');
  assert(Boolean(execResult.spoken), 'Tool returned spoken text confirmation');

  // Verify speak broadcast was dispatched
  const speakEvent = broadcastEvents.find((e) => e.type === 'speak');
  assert(Boolean(speakEvent), 'Audio "speak" event was broadcasted to client with utterance');
  assert(speakEvent?.data?.text.includes('speech synthesis'), 'Utterance matches the spoken text');

  // ─── TEST 4: Subconscious Creates Arbitrary Custom Computation Tool ───
  console.log('\n[Test 4] Subconscious autonomously creates custom calculation tool...');
  const calcResult = await subconsciousEngine.handleConsciousInstruction({
    action: 'create_tool',
    goal: 'Calculate temperature conversion from Fahrenheit to Celsius and Kelvin with heat index',
    specification: 'Takes fahrenheit (number) and returns celsius and kelvin with rating',
  });

  assert(calcResult.success === true, 'Subconscious created temperature conversion tool');
  assert(Boolean(calcResult.toolName), `Created custom tool named "${calcResult.toolName}"`);

  const registeredCalc = toolRegistry.get(calcResult.toolName);
  assert(Boolean(registeredCalc), `Tool "${calcResult.toolName}" is live in toolRegistry`);

  // ─── TEST 5: Memory Evolution via Subconscious ───
  console.log('\n[Test 5] Conscious instructs Subconscious to update memory...');
  const memResult = await subconsciousEngine.handleConsciousInstruction({
    action: 'update_memory',
    goal: 'The user prefers Rust for systems programming due to borrow checker guarantees, and values memory safety over rapid prototyping.',
    specification:
      'Store as user-preference and associate with Rust, Concurrency, and Memory Safety',
  });

  assert(memResult.success === true, 'Subconscious returned success for memory evolution');
  assert(Boolean(memResult.title), `Memory title generated: "${memResult.title}"`);

  // Verify LTM search finds the newly evolved memory
  const ltmSearch = longTermMemory.search('Rust systems programming memory safety', 3);
  assert(ltmSearch.length > 0, 'Long-Term Memory successfully contains the newly evolved memory');

  // Verify memory-evolved broadcast event was emitted
  const memEvent = broadcastEvents.find((e) => e.type === 'memory-evolved');
  assert(Boolean(memEvent), 'Broadcast event "memory-evolved" was emitted to client');

  // ─── TEST 6: Tool Persistence Across Disk Reloads ───
  console.log('\n[Test 6] Verifying tool persistence to disk and reloading...');
  const customToolsDir = subconsciousEngine.customToolsDir;
  const toolFiles = fs
    .readdirSync(customToolsDir)
    .filter((f) => f.endsWith('.json') && f !== 'evolution-ledger.json');
  assert(toolFiles.length >= 2, `Persisted tool files exist on disk (found ${toolFiles.length})`);

  // Test reloading persisted tools into a fresh registry check
  const loadedCount = subconsciousEngine.loadPersistedTools();
  assert(
    loadedCount >= 2,
    `loadPersistedTools successfully restored ${loadedCount} tools from disk`,
  );

  // ─── SUMMARY ───
  console.log('\n===============================================================');
  console.log(
    `  RESULTS: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%)`,
  );
  console.log('===============================================================');

  if (passed === total) {
    console.log('\n>>> ALL CONSCIOUS-TO-SUBCONSCIOUS EVOLUTION TESTS PASSED PERFECTLY! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> SOME TESTS FAILED! <<<\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
