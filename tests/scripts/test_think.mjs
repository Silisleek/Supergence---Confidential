import { quickAI } from '../../server/api/openrouter.js';

async function test1() {
  console.log('Testing: Direct prompt');
  const res = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    'function buildSceneObjects(scene, THREE) {\n  // Build a 3D tank with 8 sub-meshes\n',
    'space-bunny-free',
    2000,
  );
  console.log('Length:', res.length);
  console.log('Start:', res.slice(0, 200));
  const hasFence = res.includes('```javascript');
  console.log('Has fence?', hasFence);
  if (hasFence) {
    console.log(
      'Fence content:',
      res.slice(res.indexOf('```javascript'), res.indexOf('```javascript') + 300),
    );
  }
}

test1();
