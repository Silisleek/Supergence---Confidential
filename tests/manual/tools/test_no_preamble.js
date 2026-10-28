import { quickAI } from '../../../server/api/openrouter.js';

async function test() {
  const meshPrompt = `Synthesize the complete JavaScript function \`function buildModel(scene, materials)\` for a 3D articulated Zebra (Equus quagga) with Three.js.
CRITICAL INSTRUCTION:
DO NOT THINK OUT LOUD. DO NOT PLAN. DO NOT WRITE EXPLANATIONS.
START YOUR RESPONSE IMMEDIATELY ON LINE 1 WITH \`\`\`javascript.

Requirements:
- Procedurally construct the complete 3D entity using Three.js geometries (CylinderGeometry, SphereGeometry, ConeGeometry, BoxGeometry).
- Use materials dictionary: materials.body, materials.mane, materials.hoof, materials.muzzle, materials.eye.
- Build articulated groups:
  const rootGroup = new THREE.Group();
  const neckGroup = new THREE.Group();
  const headGroup = new THREE.Group();
  const tailGroup = new THREE.Group();
  const legFLGroup = new THREE.Group(), kneeFLGroup = new THREE.Group(), hoofFLGroup = new THREE.Group();
  const legFRGroup = new THREE.Group(), kneeFRGroup = new THREE.Group(), hoofFRGroup = new THREE.Group();
  const legBLGroup = new THREE.Group(), hockBLGroup = new THREE.Group(), hoofBLGroup = new THREE.Group();
  const legBRGroup = new THREE.Group(), hockBRGroup = new THREE.Group(), hoofBRGroup = new THREE.Group();
  const joints = {
    root: rootGroup,
    neck: neckGroup,
    head: headGroup,
    legFL: legFLGroup, kneeFL: kneeFLGroup, hoofFL: hoofFLGroup,
    legFR: legFRGroup, kneeFR: kneeFRGroup, hoofFR: hoofFRGroup,
    legBL: legBLGroup, hockBL: hockBLGroup, hoofBL: hoofBLGroup,
    legBR: legBRGroup, hockBR: hockBRGroup, hoofBR: hoofBRGroup,
    tail: tailGroup
  };
  scene.add(rootGroup);
  return joints;
- Build torso, neck, head, eyes, ears, muzzle, mane, 4 legs with upper/lower/hooves, and tail.
- NO ellipses (...). Complete code.`;

  console.log('Testing with no-preamble enforcement...');
  const res = await quickAI(
    'You are a code compiler. You NEVER write thinking or explanations. Output ONLY valid JavaScript starting immediately with ```javascript.',
    meshPrompt,
    'opus-4.6',
    4000,
    0.1,
  );

  const text = res?.text || String(res);
  console.log('Response length:', text.length);
  console.log('First 200 chars:\n', text.slice(0, 200));
  console.log('Last 200 chars:\n', text.slice(-200));
}

test().catch(console.error);
