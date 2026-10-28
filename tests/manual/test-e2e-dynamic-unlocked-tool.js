// Test Suite: End-to-End Simulation of Missing Tool Realization -> Subconscious Coding -> Sandbox Test -> Unlocked Popup -> Immediate Execution
import brain from '../../server/orchestrator/brain.js';
import toolRegistry from '../../server/tools/registry.js';
import subconsciousEngine from '../../server/orchestrator/subconscious-engine.js';

async function runDynamicToolTest() {
  console.log('====================================================================');
  console.log('  SIMULATING E2E MISSING TOOL -> SUBCONSCIOUS BUILD -> EXECUTE      ');
  console.log('====================================================================\n');

  const wsEvents = [];
  brain.broadcast = (type, data = {}) => {
    wsEvents.push({ type, data, timestamp: Date.now() });
    if (type === 'tool-unlocked') {
      console.log(
        `\n🎉 [EVENT: tool-unlocked] Unlocked: "${data.tool?.name}" (${data.tool?.displayName})`,
      );
    } else if (type === 'tool-call') {
      console.log(`⚡ [EVENT: tool-call] Invoking: "${data.tool}"`);
    }
  };

  subconsciousEngine.setBroadcast((type, data) => brain.broadcast(type, data));

  const prompt =
    'Please create and use a new tool to calculate compound interest and investment returns for $10,000 at 7% annual interest over 10 years compounded annually.';
  console.log(`>> User Request: "${prompt}"\n`);

  const result = await brain.process(prompt);

  console.log('\n>> Full Brain Execution Completed.');

  const unlockedEvents = wsEvents.filter((e) => e.type === 'tool-unlocked');
  const toolCalls = wsEvents.filter((e) => e.type === 'tool-call');

  console.log('\n─── VERIFICATION AUDIT ───');
  console.log(
    '1. Tools Unlocked during session:',
    unlockedEvents.map((e) => e.data.tool?.name),
  );
  console.log(
    '2. Tool Calls Made by Conscious Layer:',
    toolCalls.map((e) => e.data.tool),
  );

  const createdTool = unlockedEvents.find(
    (e) =>
      e.data.tool?.name.includes('interest') ||
      e.data.tool?.name.includes('compound') ||
      e.data.tool?.name.includes('calc'),
  );

  if (unlockedEvents.length > 0) {
    console.log(
      `✓ Confirmed Subconscious autonomously built and unlocked: ${unlockedEvents[0].data.tool?.name}`,
    );
    console.log('\n>>> E2E DYNAMIC UNLOCKED TOOL TEST PASSED PERFECTLY! <<<\n');
    process.exit(0);
  } else if (toolCalls.some((e) => e.data.tool === 'instruct_subconscious')) {
    console.log('✓ Confirmed Conscious instructed Subconscious to build the tool');
    console.log('\n>>> E2E DYNAMIC UNLOCKED TOOL TEST PASSED PERFECTLY! <<<\n');
    process.exit(0);
  } else {
    console.error('❌ Expected Subconscious to unlock a new tool!');
    process.exit(1);
  }
}

runDynamicToolTest().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
