import { quickAI } from '../../server/api/openrouter.js';
import { STYLE_SHEET, SCOPE_RULES, OPTIMIZATION_RULES } from '../../server/3d/generator.js';

const scopedDesc = 'Cyber Tank 3D: Voxel competition with dual-track steering';

const objectsPrompt = `You are a Three.js geometry specialist.
Write a COMPLETE JavaScript function:
function buildSceneObjects(scene, THREE) { ... }

The function must create all 3D objects for this scene: "${scopedDesc}"

${STYLE_SHEET}

${SCOPE_RULES}

${OPTIMIZATION_RULES}

MANDATORY RULES:
1. Use ONLY Three.js built-in geometries.
2. Colors ONLY from the style sheet palette. Name EVERY mesh.
3. EVERY mesh MUST be added to scene via scene.add(mesh) AND castShadow = true.
4. Position all objects with explicit .position.set(x, y, z) calls.
5. Create 12-20 distinct sub-meshes to build a sleek, highly detailed hero model.
6. GROUNDING: compute each mesh's footprint so its lowest point rests at y=0.
7. NO placeholders, NO TODO comments, NO conversational text.
8. Return an array of all created meshes: return [mesh1, mesh2, ...];
9. Output ONLY the raw function code inside \`\`\`javascript and \`\`\`.

SCOPE CONSTRAINT: GEOMETRY AND MATERIALS ONLY. No animations, no event listeners, no render loop.`;

async function test() {
  const res = await quickAI(
    'You are a specialized 3D graphics modeler. Output only the requested JavaScript function code. No explanation.',
    objectsPrompt,
    'space-bunny-free',
    2500,
  );
  console.log('--- LENGTH ---', res?.length);
  console.log('--- START ---');
  console.log(res?.slice(0, 400));
  console.log('--- END ---');
  console.log(res?.slice(-400));
}

test();
