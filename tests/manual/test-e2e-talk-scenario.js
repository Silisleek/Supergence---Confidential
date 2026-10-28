// Test Suite: End-to-End Simulation of "I want to talk to you" Scenario
import brain from '../../server/orchestrator/brain.js';
import toolRegistry from '../../server/tools/registry.js';
import subconsciousEngine from '../../server/orchestrator/subconscious-engine.js';

async function runE2ETest() {
  console.log('===============================================================');
  console.log('  SIMULATING E2E SCENARIO: "I want to talk to you"            ');
  console.log('===============================================================\n');

  // Track all WS events broadcasted by the Brain
  const wsEvents = [];
  brain.broadcast = (type, data = {}) => {
    wsEvents.push({ type, data, timestamp: Date.now() });
    console.log(
      `[Brain WS Broadcast] Event: "${type}" ${data.message || data.tool?.name || data.text || ''}`,
    );
  };

  subconsciousEngine.setBroadcast((type, data) => brain.broadcast(type, data));

  // Ensure clean state: unregister speak_to_user so we test full deficit -> synthesis -> unlock -> execution cycle
  toolRegistry.unregister('speak_to_user');

  console.log('>> Processing User Message: "I want to talk to you"...');
  const result = await brain.process('I want to talk to you');

  console.log('\n>> Full Brain Execution Completed.');
  console.log('>> Total WS Events Emitted:', wsEvents.length);

  // Check if tool-unlocked event was fired
  const unlockedEvent = wsEvents.find((e) => e.type === 'tool-unlocked');
  const speakEvent = wsEvents.find((e) => e.type === 'speak');
  const toolCallEvents = wsEvents.filter((e) => e.type === 'tool-call');

  console.log('\n─── VERIFICATION AUDIT ───');
  console.log(
    '1. Tool Calls Made:',
    toolCallEvents.map((e) => e.data.tool),
  );
  console.log(
    '2. Tool Unlocked Event Emitted:',
    Boolean(unlockedEvent),
    unlockedEvent?.data?.tool?.name,
  );
  console.log('3. Speech Synthesized & Dispatched:', Boolean(speakEvent), speakEvent?.data?.text);
  console.log(
    '4. Registered speak_to_user tool in registry:',
    Boolean(toolRegistry.get('speak_to_user')),
  );

  if (
    toolRegistry.get('speak_to_user') &&
    (unlockedEvent ||
      toolCallEvents.some(
        (e) => e.data.tool === 'instruct_subconscious' || e.data.tool === 'speak_to_user',
      ))
  ) {
    console.log('\n>>> E2E TALK SCENARIO VERIFIED SUCCESSFULLY! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> SCENARIO DID NOT TRIGGER EXPECTED TOOL FLOW! <<<\n');
    process.exit(1);
  }
}

runE2ETest().catch((err) => {
  console.error('E2E Test Error:', err);
  process.exit(1);
});
