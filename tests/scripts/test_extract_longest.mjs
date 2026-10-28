import { quickAI } from '../../server/api/openrouter.js';

async function testExtraction() {
  const prompt = `function buildSceneObjects(scene, THREE) {
  // Build a sleek Cyber Tank:
  // - hull, leftTrack, rightTrack, turret, barrel, radar, 4 target beacons
  // - MeshStandardMaterial with high metalness and colors (slate, dark carbon, cyber cyan 0x00f0ff)
  // - castShadow = true, scene.add(mesh)
  // - return array of all created meshes
`;

  const raw = await quickAI(
    'You are a code compiler. You NEVER think or explain. Output ONLY executable JavaScript inside ```javascript and ```.',
    prompt,
    'space-bunny-free',
    3000,
  );

  console.log('Raw length:', raw.length);

  // Find all fences
  const matches = [...raw.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  console.log('Fences found:', matches.length);
  for (let i = 0; i < matches.length; i++) {
    console.log(`Fence ${i + 1} len:`, matches[i][1].length);
  }

  // Pick the fence with valid JS / longest
  const codeFence = matches.sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  if (codeFence) {
    console.log('Longest fence sample:\n', codeFence.slice(0, 300));
    const vm = await import('vm');
    try {
      new vm.Script(codeFence);
      console.log('SYNTAX VALID! 100%');
    } catch (e) {
      console.log('Syntax error:', e.message);
    }
  } else {
    console.log('No fences. Raw snippet:\n', raw.slice(0, 300));
  }
}

testExtraction();
