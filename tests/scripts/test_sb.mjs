import { quickAI } from '../../server/api/openrouter.js';

async function test() {
  const res = await quickAI(
    'You are a Three.js expert. Output only JavaScript code inside a ```javascript block.',
    'Write function buildSceneObjects(scene, THREE)',
    'space-bunny-free',
    2000,
  );
  console.log('--- RAW START ---');
  console.log(res.slice(0, 500));
  console.log('--- RAW END ---');
  console.log(res.slice(-500));
  const fence = res.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i);
  console.log('Fence found:', !!fence, 'len:', fence ? fence[1].length : 0);
  if (fence) {
    console.log('--- EXTRACTED CODE ---');
    console.log(fence[1].slice(0, 300));
  }
}

test();
