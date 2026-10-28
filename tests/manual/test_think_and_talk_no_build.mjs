// Automated Test: Decoupled Compulsory Building & Concurrent Thinking/Talking
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isExplicitBuildOrSaveIntent,
  isConversationalOrExplanatoryQuery,
} from '../../server/orchestrator/intent.js';
import brain from '../../server/orchestrator/brain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.join(__dirname, '../../workspace');

async function runTests() {
  console.log(
    '🧪 Starting Verification: Decoupled Compulsory Building & Concurrent Cognition...\n',
  );

  // ─── TEST 1: Dynamic Intent Classifier Accuracy (Zero Hardcoding) ───
  console.log('--- TEST 1: Dynamic Intent Classifier ---');

  const conversationalQueries = [
    'Explain how quicksort works',
    'Can you think and talk at the same time?',
    'What is an algorithm?',
    'How does binary search achieve O(log n)?',
    'Tell me a philosophical perspective on artificial intelligence',
    'Why is the sky blue?',
    'Can you write a poem about the cosmos?',
    'What do you think of quantum entanglement?',
    'How do you feel today?',
    'Review this concept: idempotency in distributed systems',
    'Give me an illustrative code snippet of a fibonacci generator',
  ];

  for (const q of conversationalQueries) {
    const isBuild = isExplicitBuildOrSaveIntent(q);
    const isChat = isConversationalOrExplanatoryQuery(q);
    console.log(`  [Query]: "${q}" -> isBuild=${isBuild}, isChat=${isChat}`);
    assert.strictEqual(
      isBuild,
      false,
      `Expected query "${q}" NOT to be classified as build intent`,
    );
    assert.strictEqual(
      isChat,
      true,
      `Expected query "${q}" to be classified as conversational/explanatory`,
    );
  }

  const explicitBuildQueries = [
    'Build a website for a local coffee shop',
    'Create a python script to parse CSV files and save it as parser.py',
    'Make a 3D simulation of solar system in three.js',
    'Generate a complete interactive web app for tracking tasks',
    'Save this code into workspace as index.html',
    'Write a script called cleanup.sh to delete temp files',
    'Create file main.js with an express server',
    'Build me an interactive 3D model in blender',
  ];

  for (const b of explicitBuildQueries) {
    const isBuild = isExplicitBuildOrSaveIntent(b);
    console.log(`  [Build Command]: "${b}" -> isBuild=${isBuild}`);
    assert.strictEqual(
      isBuild,
      true,
      `Expected build command "${b}" to be classified as build intent`,
    );
  }
  console.log(
    '✅ TEST 1 PASSED: Dynamic Intent Classifier cleanly discriminates without hardcoding.\n',
  );

  // ─── TEST 2: Brain Processing Pure Chat Query (NO Workspace Contamination) ───
  console.log('--- TEST 2: Conversational Query Generates ZERO Workspace Files ---');

  const filesBefore = new Set(fs.readdirSync(WORKSPACE_DIR));
  const emittedEvents = [];
  await brain.initialize();

  const mockWs = {
    readyState: 1,
    on(event, handler) {},
    send(payload) {
      try {
        const parsed = JSON.parse(payload);
        emittedEvents.push(parsed);
      } catch {}
    },
  };
  brain.addClient(mockWs);

  console.log('  Executing conversational prompt via Brain...');
  const res = await brain.process(
    'Explain how quicksort works and provide a small code snippet in your explanation.',
    mockWs,
  );

  const filesAfter = new Set(fs.readdirSync(WORKSPACE_DIR));
  const newFiles = [...filesAfter].filter((f) => !filesBefore.has(f));

  console.log(`  Response length: ${res.response?.length || 0} characters`);
  console.log(`  New workspace files created: ${JSON.stringify(newFiles)}`);

  const fileSavedEvents = emittedEvents.filter((e) => e.type === 'workspace-file-saved');
  const artifactEvents = emittedEvents.filter((e) => e.type === 'artifact');
  const reasoningTokens = emittedEvents.filter((e) => e.type === 'reasoning-token');
  const speechTokens = emittedEvents.filter((e) => e.type === 'token');

  console.log(`  workspace-file-saved events: ${fileSavedEvents.length}`);
  console.log(`  artifact mount events: ${artifactEvents.length}`);
  console.log(`  reasoning-token events: ${reasoningTokens.length}`);
  console.log(`  speech token events: ${speechTokens.length}`);

  // Assert NO files created in workspace
  assert.strictEqual(
    newFiles.length,
    0,
    `Expected 0 new workspace files, but found: ${JSON.stringify(newFiles)}`,
  );
  assert.strictEqual(
    fileSavedEvents.length,
    0,
    `Expected 0 workspace-file-saved events on chat query`,
  );
  assert.strictEqual(artifactEvents.length, 0, `Expected 0 artifact mount events on chat query`);

  // Assert reasoning and speech tokens were emitted
  assert.ok(reasoningTokens.length > 0, 'Expected reasoning-token events to be broadcasted');
  assert.ok(speechTokens.length > 0, 'Expected speech token events to be broadcasted');

  console.log(
    '✅ TEST 2 PASSED: Pure conversational query streamed thoughts + speech without building files!\n',
  );

  console.log('========================================================');
  console.log(
    '🎉 ALL TESTS PASSED: Compulsive building eliminated & Concurrent cognition verified!',
  );
  console.log('========================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
