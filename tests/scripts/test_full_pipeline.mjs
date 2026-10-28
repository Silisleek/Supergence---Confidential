import { quickAI } from '../../server/api/openrouter.js';
import vm from 'vm';

async function testFullPipeline() {
  console.log('Testing full 3-part pipeline with temperature 0.1 and compiler prompt...');
  const t0 = Date.now();

  const scopedDesc =
    'Cyber Tank 3D: Voxel competition with dual-track steering, rotating turret, and targets';

  // Part 1
  console.log('Generating Part 1 (Geometry)...');
  const p1 = `function buildSceneObjects(scene, THREE) {
  // Create all 3D meshes for: "${scopedDesc}".
  // Build a detailed tank: hull, leftTrack, rightTrack, turret, barrel, radar, 4 target beacons.
  // Use MeshStandardMaterial with colors (slate, dark metallic, cyber cyan 0x00f0ff).
  // Position all meshes, add all to scene with castShadow = true.
  // Return array of all created meshes.
}
Output ONLY the raw function code inside \`\`\`javascript and \`\`\`. No explanation.`;

  const raw1 = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    p1,
    'space-bunny-free',
    2500,
    0.1,
  );
  const code1 = raw1.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i)?.[1] || raw1;
  new vm.Script(code1);
  console.log('✓ Part 1 PASSED syntax! Length:', code1.length);

  // Part 2
  console.log('Generating Part 2 (Animation)...');
  const p2 = `function animateScene(meshes, clock, THREE) {
  // Animate meshes using clock.getElapsedTime() and Math.sin/Math.cos.
  // Rotate radar (if meshes[5]), subtle bob for targets.
  // Guard every mesh index: if(meshes[i]).
}
Output ONLY the raw function code inside \`\`\`javascript and \`\`\`. No explanation.`;

  const raw2 = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    p2,
    'space-bunny-free',
    1500,
    0.1,
  );
  const code2 = raw2.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i)?.[1] || raw2;
  new vm.Script(code2);
  console.log('✓ Part 2 PASSED syntax! Length:', code2.length);

  // Part 2b
  console.log('Generating Part 2b (Game Logic)...');
  const p3 = `function buildGameLogic(scene, meshes, THREE) {
  // Interactive 3D tank game:
  // - meshes[0] is the player tank. Drive with WASD / Arrow keys. Clamp to bounds [-12, 12].
  // - Collision check between meshes[0] and other meshes (targets). Collecting target adds score.
  // - Return object: { update(dt), getScore(), getLives(), hasWon(), hasLost(), reset() }.
}
Output ONLY the raw function code inside \`\`\`javascript and \`\`\`. No explanation.`;

  const raw3 = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    p3,
    'space-bunny-free',
    2000,
    0.1,
  );
  const code3 = raw3.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i)?.[1] || raw3;
  new vm.Script(code3);
  console.log('✓ Part 2b PASSED syntax! Length:', code3.length);

  console.log(
    `\n🎉 ALL 3 PARTS GENERATED AND SYNTAX VALIDATED IN ${((Date.now() - t0) / 1000).toFixed(1)}s!`,
  );
}

testFullPipeline().catch((e) => console.error('Test error:', e));
