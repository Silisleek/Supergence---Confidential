import { quickAI } from '../../../server/api/openrouter.js';

const meshPrompt = `You are Supergence — Lead 3D Anatomical & Geometry Engineer.
Synthesize the complete JavaScript function \`function buildModel(scene, materials)\` for:
Title: "Equus quagga - Autonomous 3D Equine Studio"
Task: "Create a 3D Equine Zebra Anatomical Studio using Three.js"

Requirements:
- Procedurally construct the complete 3D zebra model using Three.js meshes and add them to scene.
- Use materials.body, materials.mane, materials.hoof, materials.muzzle, materials.eye.
- Build articulated limbs: torso, neck, head, ears, 4 legs (forelegs, hindlegs with pivot groups), tail.
- Return an object mapping joint names:
  return {
    rootGroup,
    neckGroup,
    headGroup,
    legFLGroup,
    legFRGroup,
    legRLGroup,
    legRRGroup,
    tailGroup
  };

Output ONLY valid JavaScript inside \`\`\`javascript code fence.`;

console.log('Synthesizing buildModel with opus-4.6...');
const res = await quickAI(
  'You are an expert 3D Geometry Engineer. Output ONLY valid JavaScript inside ```javascript.',
  meshPrompt,
  'opus-4.6',
  4096,
  0.1,
);

console.log('Result length:', res.length);
console.log('First 400 chars:\n', res.slice(0, 400));
console.log('Last 400 chars:\n', res.slice(-400));
