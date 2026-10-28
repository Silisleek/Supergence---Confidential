import { quickAI } from '../../server/api/openrouter.js';

async function testFocused() {
  const t0 = Date.now();
  console.log('Testing focused prompt with space-bunny-free...');
  const prompt = `Write a complete JavaScript function:
function buildSceneObjects(scene, THREE) {
  // Create an impressive, high-detail 3D model for: Cyber Tank with tracks, armored chassis, rotating turret, dual cannons, and glowing neon cyan trim.
  // Add all meshes to scene with castShadow = true.
  // Return array of all created meshes.
}

Output ONLY the function inside \`\`\`javascript and \`\`\`. No explanation.`;

  const res = await quickAI(
    'You are an expert Three.js 3D graphics engineer. Output ONLY valid executable JavaScript code inside ```javascript and ```.',
    prompt,
    'space-bunny-free',
    2500,
  );

  console.log(`Time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Length: ${res?.length}`);

  const fence = res.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i);
  console.log('Fence found:', !!fence);
  if (fence) {
    console.log('Code length:', fence[1].length);
    console.log('Code sample:\n', fence[1].slice(0, 400));
    const vm = await import('vm');
    try {
      new vm.Script(fence[1]);
      console.log('SYNTAX VALIDATION: 100% PASSED!');
    } catch (e) {
      console.log('Syntax error:', e.message);
    }
  } else {
    console.log('No fence found. Raw start:\n', res.slice(0, 300));
  }
}

testFocused();
