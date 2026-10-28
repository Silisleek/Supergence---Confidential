import { quickAI } from '../../server/api/openrouter.js';
import vm from 'vm';

async function testWith4k() {
  console.log('Testing 4k token budget with exact compiler system prompt...');
  const t0 = Date.now();

  const system =
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.';

  const p1 =
    'function buildSceneObjects(scene, THREE) {\n  // Create 6-8 distinct 3D meshes for Cyber Tank (hull, 2 tracks, turret, barrel, radar, 2 beacons). Set positions, add to scene with castShadow=true. Return array of meshes.\n';

  const raw1 = await quickAI(system, p1, 'space-bunny-free', 4000);
  console.log('Part 1 raw len:', raw1.length);
  const m1 = [...raw1.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  const code1 = m1.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  console.log('Part 1 code found?', !!code1, 'len:', code1?.length);
  if (code1) {
    new vm.Script(code1);
    console.log('✓ Part 1 syntax VALID!');
    const meshCount = (code1.match(/new\s+THREE\.Mesh/g) || []).length;
    console.log('Part 1 mesh count:', meshCount);
  }

  const p2 =
    'function animateScene(meshes, clock, THREE) {\n  // Animate meshes using clock.getElapsedTime() and Math.sin. Rotate radar or turret, bob hull. Guard if(meshes[i]).\n';

  const raw2 = await quickAI(system, p2, 'space-bunny-free', 3000);
  console.log('Part 2 raw len:', raw2.length);
  const m2 = [...raw2.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  const code2 = m2.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  console.log('Part 2 code found?', !!code2, 'len:', code2?.length);
  if (code2) {
    new vm.Script(code2);
    console.log('✓ Part 2 syntax VALID!');
  }

  const p3 =
    'function buildGameLogic(scene, meshes, THREE) {\n  // WASD controls for meshes[0], collision detection with targets, score tracking. Return { update(dt, input), getScore(), getLives(), hasWon(), hasLost(), reset() }.\n';

  const raw3 = await quickAI(system, p3, 'space-bunny-free', 3000);
  console.log('Part 2b raw len:', raw3.length);
  const m3 = [...raw3.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  const code3 = m3.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  console.log('Part 2b code found?', !!code3, 'len:', code3?.length);
  if (code3) {
    new vm.Script(code3);
    console.log('✓ Part 2b syntax VALID!');
  }

  console.log(`\n🎉 ALL 3 PARTS FINISHED IN ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
}

testWith4k();
