import { quickAI } from '../../server/api/openrouter.js';
import vm from 'vm';

async function testSweetSpot() {
  console.log('Testing 6-8 mesh sweet spot...');
  const t0 = Date.now();

  const p1 = `function buildSceneObjects(scene, THREE) {
  // Create 6 distinct 3D meshes for: Cyber Tank Warfare (hull, leftTrack, rightTrack, turret, barrel, radar).
  // Use MeshStandardMaterial with slate/carbon colors and cyber cyan 0x00f0ff trim.
  // Set positions, add each to scene with castShadow=true.
  // Return array of all 6 meshes.
`;

  const raw1 = await quickAI(
    'You are a code compiler. You NEVER think or explain. Output ONLY executable JavaScript inside ```javascript and ```.',
    p1,
    'space-bunny-free',
    2500,
  );

  console.log('Part 1 raw length:', raw1.length);
  const m1 = [...raw1.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  const code1 = m1.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  console.log('Part 1 code found?', !!code1, 'len:', code1?.length);
  if (code1) {
    new vm.Script(code1);
    console.log('✓ Part 1 syntax VALID!');
    const meshCount = (code1.match(/new\s+THREE\.Mesh/g) || []).length;
    console.log('Part 1 mesh count:', meshCount);
  }

  const p2 = `function animateScene(meshes, clock, THREE) {
  // Animate meshes using clock.getElapsedTime() and Math.sin.
  // Rotate radar (meshes[5]), subtle bob for hull (meshes[0]).
  // Guard every mesh: if(meshes[i]). No new object allocations.
`;

  const raw2 = await quickAI(
    'You are a code compiler. You NEVER think or explain. Output ONLY executable JavaScript inside ```javascript and ```.',
    p2,
    'space-bunny-free',
    1500,
  );

  console.log('Part 2 raw length:', raw2.length);
  const m2 = [...raw2.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  const code2 = m2.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  console.log('Part 2 code found?', !!code2, 'len:', code2?.length);
  if (code2) {
    new vm.Script(code2);
    console.log('✓ Part 2 syntax VALID!');
  }

  const p3 = `function buildGameLogic(scene, meshes, THREE) {
  // Interactive game logic: meshes[0] is player (drive with WASD).
  // Collision check with target meshes. Score increments on hit.
  // Return { update(dt, input), getScore(), getLives(), hasWon(), hasLost(), reset() }.
`;

  const raw3 = await quickAI(
    'You are a code compiler. You NEVER think or explain. Output ONLY executable JavaScript inside ```javascript and ```.',
    p3,
    'space-bunny-free',
    2000,
  );

  console.log('Part 2b raw length:', raw3.length);
  const m3 = [...raw3.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  const code3 = m3.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  console.log('Part 2b code found?', !!code3, 'len:', code3?.length);
  if (code3) {
    new vm.Script(code3);
    console.log('✓ Part 2b syntax VALID!');
  }

  console.log(`\n🎉 ALL 3 PARTS COMPLETED IN ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
}

testSweetSpot();
