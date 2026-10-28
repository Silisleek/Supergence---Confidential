import { quickAI } from '../../server/api/openrouter.js';

async function testCompletion() {
  const code = await quickAI(
    'You are a JavaScript code completion engine. Continue the code directly from the prompt. Output ONLY valid JavaScript code in ```javascript ```.',
    '// Three.js 3D Game Scene\nfunction buildSceneObjects(scene, THREE) {\n  // Build detailed Cyber Tank: hull, tracks, turret, barrel, radar\n',
    'space-bunny-free',
    2500,
  );

  console.log('--- START ---');
  console.log(code.slice(0, 300));
  console.log('--- END ---');
  console.log(code.slice(-300));
  const f = code.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i);
  console.log('Matched fence?', !!f);
  if (f) {
    console.log('Fence length:', f[1].length);
    const vm = await import('vm');
    try {
      new vm.Script(f[1]);
      console.log('SYNTAX VALID! 100%');
    } catch (e) {
      console.log('Syntax error:', e.message);
    }
  }
}

testCompletion();
