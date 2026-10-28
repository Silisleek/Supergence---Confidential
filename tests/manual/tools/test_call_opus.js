import { callAI, quickAI } from '../../../server/api/openrouter.js';

console.log('Testing quickAI with opus-4.6...');
const start = Date.now();
try {
  const res = await quickAI(
    'You are a 3D shader expert. Output ONLY code.',
    'Write a simple Three.js material definition for a zebra pattern.',
    'opus-4.6',
    500,
  );
  console.log(`Success in ${Date.now() - start}ms! Length: ${res.length}`);
  console.log('Preview:', res.slice(0, 150));
} catch (e) {
  console.error(`Failed in ${Date.now() - start}ms:`, e.message);
}
