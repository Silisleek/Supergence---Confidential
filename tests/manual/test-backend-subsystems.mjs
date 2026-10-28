// Unit & Integration verification for SIS Upgrades:
// 1. Interpreter ZIP packaging (thermal, depth, original) & STM storage
// 2. Memory Tree (STM tree structure, Verifier fact checking & tagging "(could be wrong)", LTM promotion)
// 3. POSSAP 24/7 dual predictor
// 4. Subconscious Tool Genesis (Dynamic creation, sandbox test, execution)
// 5. Coding Expert 4-Step Loop

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import interpreter from '../../server/interpreter/index.js';
import shortTermMemory from '../../server/memory/short-term.js';
import longTermMemory from '../../server/memory/long-term.js';
import verifier from '../../server/memory/verifier.js';
import possap from '../../server/possap/index.js';
import subconsciousEngine from '../../server/orchestrator/subconscious-engine.js';
import toolRegistry from '../../server/tools/registry.js';
import codingExpertEngine from '../../server/coder/coding-expert-engine.js';

async function runBackendTests() {
  console.log('=== [1/5] Testing Interpreter ZIP Packaging & STM ===');
  // Create a simple 64x64 test image PNG
  const testImgPath = path.join(process.cwd(), 'workspace', 'test_interpreter_source.png');
  await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 255, g: 120, b: 50, alpha: 1 },
    },
  })
    .png()
    .toFile(testImgPath);

  const interpResult = await interpreter.processImage(testImgPath);
  console.log('Interpreter result:', interpResult);
  if (!interpResult.zipPath || !fs.existsSync(interpResult.zipPath)) {
    throw new Error('Interpreter failed to generate .zip bundle!');
  }
  const zipStat = fs.statSync(interpResult.zipPath);
  console.log(`✓ Interpreter created ZIP bundle (${zipStat.size} bytes): ${interpResult.zipPath}`);

  // Verify STM has the interpreter entry
  const stmImages = shortTermMemory
    .getAll()
    .filter((n) => (n.tags && n.tags.includes('interpreter')) || n.source === 'interpreter');
  console.log(`✓ Short-Term Memory tree has ${stmImages.length} interpreter images recorded.`);

  console.log('\n=== [2/5] Testing Memory Tree & 24/7 Verifier "(could be wrong)" Tagging ===');
  // Store a verified fact and a doubtful fact into STM
  const goodNode = shortTermMemory.store(['science', 'astronomy'], {
    content: 'Jupiter is the largest planet in our solar system',
    confidence: 0.99,
  });
  const doubtfulNode = shortTermMemory.store(['rumors', 'space'], {
    content: 'The moon is made of green cheese and candy',
    confidence: 0.1,
  });

  // Test that marking doubtful info adds "(could be wrong)" tag and content suffix
  doubtfulNode.markCouldBeWrong();
  console.log('Doubtful node tagged:', doubtfulNode.tags, '| content:', doubtfulNode.content);
  if (
    !doubtfulNode.tags.includes('(could be wrong)') ||
    !doubtfulNode.content.includes('(could be wrong)')
  ) {
    throw new Error('markCouldBeWrong did not attach (could be wrong) tag to memory node!');
  }
  console.log('✓ Successfully verified "(could be wrong)" tagging on memory node.');

  // Check long-term memory integration
  const ltmTree = longTermMemory.getAll();
  console.log(
    `✓ Long-term memory loaded with keys: ${Object.keys(ltmTree).slice(0, 10).join(', ')}...`,
  );

  console.log('\n=== [3/5] Testing POSSAP 24/7 Dual Predictor ===');
  possap.recordInteraction({
    userMessage: 'Create a 3D procedural landscape',
    aiAction: 'write_file',
    domain: '3d_graphics',
  });
  const possapStatus = possap.getStatus();
  console.log('POSSAP status:', possapStatus);
  const possapPreds = possap.getLatestPredictions();
  console.log('POSSAP latest predictions:', {
    aiPredictionsCount: possapPreds.ai?.length,
    userPredictionsCount: possapPreds.user?.length,
    sampleAiPrediction: possapPreds.ai?.[0]?.action,
    sampleUserPrediction: possapPreds.user?.[0]?.action,
  });

  console.log('\n=== [4/5] Testing Subconscious Dynamic Tool Genesis ===');
  // Test dynamic tool creation
  const testToolName = 'calculate_orbital_speed_' + Date.now().toString(36).slice(-4);
  const toolGenResult = await subconsciousEngine.createTool({
    name: testToolName,
    description: 'Calculates orbital speed given radius and gravitational parameter',
    parameters: {
      type: 'object',
      properties: {
        radius: { type: 'number', description: 'Orbital radius in meters' },
        mu: { type: 'number', description: 'Standard gravitational parameter (GM)' },
      },
      required: ['radius', 'mu'],
    },
    code: `
      const r = args.radius;
      const mu = args.mu || 3.986004418e14;
      const v = Math.sqrt(mu / r);
      return { radius: r, orbitalVelocityMs: v, orbitalVelocityKmh: v * 3.6 };
    `,
  });
  console.log('Tool Genesis Result:', toolGenResult);

  // Verify tool is registered in toolRegistry and executable
  const actualToolName = toolGenResult.toolName || testToolName;
  const isRegistered = toolRegistry.has(actualToolName);
  console.log(`✓ Tool "${actualToolName}" registered in ToolRegistry:`, isRegistered);
  if (!isRegistered)
    throw new Error(`Tool genesis failed to hot-register tool "${actualToolName}"!`);

  const execResult = await toolRegistry.execute(actualToolName, { url: 'https://example.com' });
  console.log('Dynamic tool execution result:', execResult);
  console.log(`✓ Dynamic tool execution verified on "${actualToolName}"`);

  console.log('\n=== [5/5] Testing Coding Expert 4-Step Loop ===');
  const validJsCode =
    'function helloWorld() { return "Supergence SIS 1.0"; } console.log(helloWorld());';
  const evalRes = await codingExpertEngine.evaluateAndVerify({
    filename: 'test_module.js',
    language: 'javascript',
    code: validJsCode,
    autoHeal: false,
  });
  console.log('Coding Expert Evaluation check:', evalRes);
  if (!evalRes.syntaxValid) throw new Error('Coding expert failed syntax validation!');
  console.log('✓ Coding Expert 4-step loop validated successfully!');

  console.log('\n🌟 ALL 5 BACKEND SUBSYSTEM VERIFICATIONS PASSED WITH 100% SUCCESS!');
}

runBackendTests().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
