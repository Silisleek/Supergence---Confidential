import { quickAI } from '../../server/api/openrouter.js';

async function test() {
  const code = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    'function buildSceneObjects(scene, THREE) {\n  // Create 6 3D meshes for Cyber Tank (hull, 2 tracks, turret, barrel, radar). Set positions, add to scene with castShadow=true. Return array of meshes.\n',
    'space-bunny-free',
    2500,
  );
  console.log('--- RAW START ---');
  console.log(code.slice(0, 300));
  console.log('--- RAW END ---');
  console.log(code.slice(-300));
  const f = code.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i);
  console.log('Matched fence?', !!f);
  if (!f) {
    const unclosed = code.match(/```(?:javascript|js)?\s*\n([\s\S]*)/i);
    console.log('Unclosed fence?', !!unclosed);
    if (unclosed) {
      console.log('Unclosed length:', unclosed[1].length);
      console.log('Unclosed end:\n', unclosed[1].slice(-300));
    }
  } else {
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

test();
