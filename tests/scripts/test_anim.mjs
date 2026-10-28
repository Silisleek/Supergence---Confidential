import { quickAI } from '../../server/api/openrouter.js';
import vm from 'vm';

async function testAnim() {
  const code = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    'function animateScene(meshes, clock, THREE) {\n  // Animate meshes array: meshes[0] is hull, rotate turret (meshes[3]) or radar (meshes[5]), bob subtly with Math.sin. Guard with if(meshes[i]). No new allocations.\n',
    'space-bunny-free',
    1500,
  );
  console.log('--- RAW START ---');
  console.log(code.slice(0, 300));
  console.log('--- RAW END ---');
  console.log(code.slice(-300));
  const f = code.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i);
  console.log('Matched fence?', !!f);
  if (f) {
    console.log('Fence length:', f[1].length);
    try {
      new vm.Script(f[1]);
      console.log('ANIM SYNTAX VALID! 100%');
    } catch (e) {
      console.log('Syntax error:', e.message);
    }
  }
}

testAnim();
