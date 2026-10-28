import { quickAI } from '../../server/api/openrouter.js';

const scopedDesc =
  'Cyber Tank 3D: Voxel competition with dual-track steering, turret rotation, and targets';

const objectsPrompt = `function buildSceneObjects(scene, THREE) {
  // Build a sleek, professional 3D simulation for: "${scopedDesc}".
  // Create 10-18 distinct articulated sub-meshes.
  // Use MeshStandardMaterial with high metalness (0.8) and style palette (slate #2C3E50, carbon #14161A, cyber cyan #00F0FF, neon magenta #FF007F).
  // Position each sub-mesh explicitly with .position.set(x, y, z).
  // Ground the model so lowest point rests on y=0.
  // Add all meshes to scene with castShadow = true.
  // Return array of all created meshes: return [mesh1, mesh2, ...];
`;

async function test() {
  const raw = await quickAI(
    'You are a code compiler. You NEVER think or explain. Output ONLY executable JavaScript inside ```javascript and ```.',
    objectsPrompt,
    'space-bunny-free',
    3000,
    0.1,
  );
  console.log('--- EXACT RAW OUTPUT (FIRST 1000 CHARS) ---');
  console.log(raw.slice(0, 1000));
  console.log('--- EXACT RAW OUTPUT (LAST 1000 CHARS) ---');
  console.log(raw.slice(-1000));
}

test();
