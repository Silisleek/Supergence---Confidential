import { quickAI, callAI } from '../../../server/api/openrouter.js';

async function testVariation(name, systemPrompt, userPrompt, temperature = 0.0) {
  console.log(`\n========================================`);
  console.log(`TESTING VARIATION: ${name} (temp=${temperature})`);
  console.log(`========================================`);
  const t0 = Date.now();
  try {
    const res = await callAI({
      model: 'opus-4.6',
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature,
      maxTokens: 4000,
    });

    const content = res.choices?.[0]?.message?.content || '';
    const duration = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Response received in ${duration}s | Total length: ${content.length} chars`);

    const hasFence = content.includes('```javascript') || content.includes('```');
    const first150 = content.slice(0, 150).replace(/\n/g, ' ');
    const last150 = content.slice(-150).replace(/\n/g, ' ');
    const hasEllipsis = content.includes('...') || content.includes('[...]');

    console.log(`Starts with code fence immediately: ${content.trim().startsWith('```')}`);
    console.log(`Contains ellipsis (... or [...]): ${hasEllipsis}`);
    console.log(`First 150 chars: ${first150}`);
    console.log(`Last 150 chars: ${last150}`);

    // Check if valid function
    const funcMatch = content.match(/function\s+buildModel\s*\([\s\S]*?\n\}/);
    console.log(`Contains complete buildModel function: ${Boolean(funcMatch)}`);

    return {
      name,
      duration,
      length: content.length,
      hasFence,
      hasEllipsis,
      startsWithFence: content.trim().startsWith('```'),
      content,
    };
  } catch (err) {
    console.error(`Variation ${name} failed:`, err.message);
    return { name, error: err.message };
  }
}

async function runAll() {
  // Test 1: Baseline system prompt
  await testVariation(
    '1. Raw Prompt',
    'You are an expert Three.js 3D Geometry Engineer.',
    'Write the JavaScript function `function buildModel(scene, materials)` for an articulated 3D zebra using Three.js BoxGeometry and CylinderGeometry. Return { root, head, neck, legFL, legFR, legBL, legBR, tail }. Output ONLY valid JavaScript inside ```javascript.',
  );

  // Test 2: Strict compiler role + Negative constraints
  await testVariation(
    '2. Strict Compiler Role + Zero Prose',
    'CRITICAL SYSTEM DIRECTIVE:\nYou are an automated headless JavaScript compiler. You do NOT have conversational capabilities. You NEVER output introductory text, thinking, reasoning, apologies, or explanations. Every character outside ```javascript is forbidden.',
    'TASK: Generate the complete, production-ready `function buildModel(scene, materials)` for an articulated 3D zebra (Equus quagga) using Three.js.\n\nSTRICT CONSTRAINTS:\n1. Line 1 MUST be ```javascript\n2. ZERO ellipses (...). Every limb and joint group must be explicitly coded.\n3. Return the articulated joints dictionary: { root, neck, head, legFL, legFR, legBL, legBR, tail }.\n4. Close the function and code fence cleanly.',
  );

  // Test 3: Few-shot scaffold constraint
  await testVariation(
    '3. Few-shot In-Context Skeleton',
    'You are a deterministic Three.js code generator. Complete the given code skeleton without any conversational preamble.',
    `Complete this exact Three.js function without leaving any ellipses or placeholders:
\`\`\`javascript
function buildModel(scene, materials) {
  const root = new THREE.Group();
  scene.add(root);

  // 1. Torso barrel
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 1.8, 16), materials.body || new THREE.MeshStandardMaterial({ color: 0xffffff }));
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 1.4, 0);
  root.add(body);

  // Complete neck, head, ears, muzzle, mane, 4 articulated legs (upper leg, knee, hoof), and tail tuft below:
`,
  );
}

runAll().catch(console.error);
