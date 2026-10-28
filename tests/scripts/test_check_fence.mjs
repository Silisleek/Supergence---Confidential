import { quickAI } from '../../server/api/openrouter.js';

async function testCheck() {
  const p1 = `function buildSceneObjects(scene, THREE) {
  // Create all 3D meshes for: Cyber Tank.
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

  console.log('Total length:', raw1.length);
  const fenceIndex = raw1.indexOf('```javascript');
  console.log('Contains ```javascript?', fenceIndex !== -1);
  if (fenceIndex !== -1) {
    console.log('Fence index:', fenceIndex);
    console.log('Before fence:\n', raw1.slice(0, Math.min(fenceIndex, 200)));
    console.log('After fence:\n', raw1.slice(fenceIndex, fenceIndex + 300));
  }
}

testCheck();
