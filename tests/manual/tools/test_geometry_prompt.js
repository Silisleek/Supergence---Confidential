import { quickAI } from '../../../server/api/openrouter.js';
import fs from 'fs';

async function main() {
  const meshPrompt = `You are Supergence — Lead 3D Anatomical & Geometry Engineer.
Synthesize the complete JavaScript function \`function buildModel(scene, materials)\` for:
Title: "Equus quagga - Autonomous 3D Equine Studio"
Task: "Create a 3D Equine Zebra Anatomical Studio using Three.js and OrbitControls. Must feature an anatomically articulated Zebra (Equus quagga) with high-fidelity procedural zebra-stripe textures, 4-stage biomechanical kinematics (walk, trot, gallop, rear), and full OrbitControls camera navigation."

Requirements:
- Procedurally construct the complete 3D entity using Three.js geometries (CylinderGeometry, SphereGeometry, ConeGeometry, BoxGeometry).
- Keep code concise, elegant and ensure all blocks, parentheses and functions close properly.
- IMPORTANT: Use the materials dictionary passed in:
  - materials.body for the main striped torso/barrel, skull, neck, and leg meshes
  - materials.mane for the dorsal mane and tail tuft
  - materials.hoof for hooves
  - materials.muzzle for muzzle
  - materials.eye for eyes
- For Equine / Zebra:
  - Build hierarchical articulated groups so limbs can pivot realistically at joints:
    - Main root / pelvis group: rootGroup
    - Contoured torso / barrel
    - Neck joint & neck angled forward-upward
    - Cranium / head joint, skull, muzzle, nostrils, ears, eyes
    - Mane along the dorsal crest
    - Left Foreleg: Shoulder joint, arm, knee joint, fetlock, hoof
    - Right Foreleg: Shoulder joint, arm, knee joint, fetlock, hoof
    - Left Hindleg: Hip joint, thigh, hock joint, fetlock, hoof
    - Right Hindleg: Hip joint, thigh, hock joint, fetlock, hoof
    - Tail joint & tail tuft
  - Must explicitly instantiate all leg & joint groups as new THREE.Group() or new THREE.Mesh() before returning them in the articulated \`joints\` dictionary:
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
- Ensure castShadow = true on all meshes.
- CRITICAL: Zero placeholders. NEVER write ellipses like "{ ... }" or comments like "// rest of code". Implement every function in full.
- Clean vanilla JavaScript.
- If defining texture generator functions, declare all parameters and variables (e.g. \`function createZebraStripeTexture(size = 1024)\`).
- CRITICAL: Do NOT write pseudocode, ellipses (...), or placeholder comments. Every loop and function must be complete, runnable JavaScript without ellipses.

Output ONLY valid JavaScript inside \`\`\`javascript code fence. No markdown text outside the code fence.`;

  console.log('Calling opus-4.6 for geometry...');
  const res = await quickAI(
    'You are an expert 3D Geometry Engineer. Output ONLY valid JavaScript inside ```javascript.',
    meshPrompt,
    'opus-4.6',
    4000,
    0.1,
  );

  const raw = res?.text || String(res);
  fs.writeFileSync('workspace/raw_geometry_test.txt', raw, 'utf8');
  console.log('Saved raw response of length:', raw.length);
}

main().catch((err) => console.error(err));
