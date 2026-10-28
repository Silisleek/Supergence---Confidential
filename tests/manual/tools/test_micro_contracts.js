import { callAI } from '../../../server/api/openrouter.js';
import { stripCodeFences } from '../../../server/coder/perfectionist-coder-engine.js';
import { validateJsSyntax } from '../../../server/3d/split-game-generator.js';

async function testMicro(name, prompt) {
  console.log(`\nTesting Micro-Contract: ${name}...`);
  const t0 = Date.now();
  const res = await callAI({
    model: 'opus-4.6',
    systemPrompt:
      'You are an expert Three.js Graphics Engineer. You must output ONLY valid, complete JavaScript inside ```javascript code fences. Never write ellipses (...) or placeholders.',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    maxTokens: 3000,
  });

  const content = res.choices?.[0]?.message?.content || '';
  const code = stripCodeFences(content);
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${name} raw length: ${content.length} | code length: ${code.length} in ${dur}s`);

  const syntax = validateJsSyntax(code);
  console.log(`${name} valid syntax: ${syntax.valid}`);
  if (!syntax.valid) {
    console.warn(`${name} syntax error:`, syntax.error);
  }
  const hasEllipsis = code.includes('...') || code.includes('[...]');
  console.log(`${name} has ellipsis: ${hasEllipsis}`);

  return { name, valid: syntax.valid, hasEllipsis, code };
}

async function run() {
  // 1. Texture Generator
  const p1 = `Write a standalone JavaScript function:
\`function createZebraStripeTexture(size = 512)\`
Requirements:
- Create a 512x512 canvas.
- Fill background with ivory '#f4f3ea'.
- Draw 18 vertical sinusoidal stripes in black '#121316' using a standard for-loop.
- Return a new THREE.CanvasTexture(canvas).
- Keep code clean, elegant, under 30 lines.
- Absolutely ZERO ellipses (...). Every loop must be complete.
Output ONLY JavaScript inside \`\`\`javascript.`;

  const r1 = await testMicro('1. Texture Generator', p1);

  // 2. Torso & Head
  const p2 = `Write a standalone JavaScript function:
\`function createZebraTorsoAndHead(rootGroup, materials)\`
Requirements:
- Add torso cylinder (radius 0.55, length 1.8) rotated on Z axis to rootGroup using materials.body.
- Add neck cylinder tilted forward-upward to rootGroup using materials.body.
- Add head group containing head box/sphere, muzzle box (materials.muzzle), 2 ears cones, 2 eyes spheres (materials.eye), and dorsal mane crest (materials.mane).
- Keep code concise, under 45 lines.
- Absolutely ZERO ellipses (...). Write all Three.js meshes explicitly.
Output ONLY JavaScript inside \`\`\`javascript.`;

  const r2 = await testMicro('2. Torso & Head', p2);

  // 3. Articulated Limbs
  const p3 = `Write a standalone JavaScript function:
\`function createZebraLimbs(rootGroup, materials)\`
Requirements:
- Create 4 articulated leg groups: legFL, legFR, legBL, legBR.
- Each leg has an upper limb mesh, a knee/hock joint group, and a hoof mesh (materials.hoof).
- Add all 4 legs to rootGroup at appropriate coordinates (X: ±0.5, Z: ±0.8).
- Return an object with all joint groups: { legFL, kneeFL, hoofFL, legFR, kneeFR, hoofFR, legBL, hockBL, hoofBL, legBR, hockBR, hoofBR }.
- Keep code concise, under 50 lines.
- Absolutely ZERO ellipses (...). Write all 4 legs explicitly.
Output ONLY JavaScript inside \`\`\`javascript.`;

  const r3 = await testMicro('3. Articulated Limbs', p3);

  // 4. Kinematics Controller
  const p4 = `Write a standalone JavaScript function:
\`function createZebraKinematics(joints)\`
Requirements:
- Returns an object with update(delta, time) and setGait(gaitName).
- Supported gaits: 'walk', 'trot', 'gallop', 'rear', 'idle'.
- In update(delta, time), compute leg joint rotations using Math.sin(time * speed + phase).
- In 'rear' gait, tilt joints.root up by 0.6 rad and lift front legs.
- Keep code concise, under 40 lines.
- Absolutely ZERO ellipses (...).
Output ONLY JavaScript inside \`\`\`javascript.`;

  const r4 = await testMicro('4. Kinematics Controller', p4);

  console.log('\n=== MICRO-CONTRACT SUMMARY ===');
  console.log(`Texture: valid=${r1.valid}, ellipsis=${r1.hasEllipsis}`);
  console.log(`Torso: valid=${r2.valid}, ellipsis=${r2.hasEllipsis}`);
  console.log(`Limbs: valid=${r3.valid}, ellipsis=${r3.hasEllipsis}`);
  console.log(`Kinematics: valid=${r4.valid}, ellipsis=${r4.hasEllipsis}`);
}

run().catch(console.error);
