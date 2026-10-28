import { callAI } from '../../../server/api/openrouter.js';
import { stripCodeFences } from '../../../server/coder/perfectionist-coder-engine.js';
import { validateJsSyntax } from '../../../server/3d/split-game-generator.js';

async function testSubsystem(name, sysPrompt, userPrompt) {
  console.log(`\n--- Testing ${name} with opus-4.6 ---`);
  const t0 = Date.now();
  const res = await callAI({
    model: 'opus-4.6',
    systemPrompt: sysPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.1,
    maxTokens: 4000,
  });

  const content = res.choices?.[0]?.message?.content || '';
  console.log(
    `${name} raw length: ${content.length} chars in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );

  const code = stripCodeFences(content);
  console.log(`${name} extracted code length: ${code.length} chars`);

  const validation = validateJsSyntax(code);
  console.log(`${name} syntax valid: ${validation.valid}`);
  if (!validation.valid) {
    console.warn(`${name} syntax error:`, validation.error);
    const lines = code.split('\n');
    console.warn(`Around line ${validation.line}:`);
    console.warn(
      lines
        .slice(
          Math.max(0, (validation.line || 1) - 3),
          Math.min(lines.length, (validation.line || 1) + 3),
        )
        .join('\n'),
    );
  }

  const hasEllipsis = code.includes('...') || code.includes('[...]');
  console.log(`${name} has ellipsis: ${hasEllipsis}`);

  return { name, valid: validation.valid, length: code.length, code };
}

async function run() {
  // 1. Materials
  const matPrompt = `Complete the following Three.js materials initialization function for an Equine Zebra (Equus quagga).
You must complete the canvas procedural zebra stripe generator function and return all required PBR materials.
CRITICAL: Do NOT write ellipses (...). Complete all loops and code.

\`\`\`javascript
function initMaterials() {
  function createZebraStripeTexture(size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6f6f2';
    ctx.fillRect(0, 0, size, size);

    // Render 22 vertical wavy organic zebra stripes
    ctx.fillStyle = '#111215';
    for (let i = 0; i < 22; i++) {
      const baseX = (i + 0.5) * (size / 22);
      ctx.beginPath();
      for (let y = 0; y <= size; y += 16) {
        const wobble = Math.sin(y * 0.02 + i * 1.5) * 14 + Math.sin(y * 0.007 + i) * 20;
        const x = baseX + wobble;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 14 + (i % 3) * 6;
      ctx.strokeStyle = '#111215';
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  const stripeTex = createZebraStripeTexture(1024);
  return {
    body: new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.85, metalness: 0.05 }),
    mane: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9 }),
    hoof: new THREE.MeshStandardMaterial({ color: 0x222328, roughness: 0.35, metalness: 0.2 }),
    muzzle: new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.85 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.1, metalness: 0.9 })
  };
}
\`\`\`
Output ONLY the complete JavaScript code inside \`\`\`javascript code fence.`;

  const matRes = await testSubsystem(
    'Materials',
    'You are an expert Three.js Shader and Materials Engineer.',
    matPrompt,
  );

  // 2. Geometry
  const geoPrompt = `Complete the following Three.js articulated 3D zebra geometry function.
Build the full anatomical hierarchy: torso barrel, neck group, cranium/head group with ears, eyes, muzzle, dorsal mane crest, 4 articulated legs (Forelegs and Hindlegs each having upper limb, knee/hock, and hoof), and tail tuft.
CRITICAL: Zero placeholders. NEVER write ellipses (...) or "// rest of code". Write every limb mesh in full.

\`\`\`javascript
function buildModel(scene, materials) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'zebraRoot';
  scene.add(rootGroup);

  const matBody = materials?.body || new THREE.MeshStandardMaterial({ color: 0xffffff });
  const matMane = materials?.mane || new THREE.MeshStandardMaterial({ color: 0x111111 });
  const matHoof = materials?.hoof || new THREE.MeshStandardMaterial({ color: 0x222222 });
  const matMuzzle = materials?.muzzle || new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const matEye = materials?.eye || new THREE.MeshStandardMaterial({ color: 0x050505 });

  // 1. Torso Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.55, 0.6, 1.9, 16);
  const barrel = new THREE.Mesh(barrelGeo, matBody);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, 1.45, 0);
  barrel.castShadow = true;
  rootGroup.add(barrel);

  // Complete neckGroup, headGroup, legFLGroup, kneeFLGroup, hoofFLGroup,
  // legFRGroup, kneeFRGroup, hoofFRGroup, legBLGroup, hockBLGroup, hoofBLGroup,
  // legBRGroup, hockBRGroup, hoofBRGroup, and tailGroup below:
\`\`\`
Return the articulated joints dictionary:
\`\`\`javascript
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
  return joints;
}
\`\`\`
Output ONLY valid JavaScript inside \`\`\`javascript code fence.`;

  const geoRes = await testSubsystem(
    'Geometry',
    'You are an expert Three.js 3D Geometry and Rigging Engineer.',
    geoPrompt,
  );

  // 3. Kinematics
  const animPrompt = `Complete the following kinematics controller for the articulated 3D zebra joints dictionary.
Support gaits: 'walk', 'trot', 'gallop', 'rear', 'idle'.
Compute joint rotations using Math.sin / Math.cos harmonically over time.
Support speed multiplier.
CRITICAL: Zero placeholders. Do NOT write ellipses (...). Complete all code.

\`\`\`javascript
function initKinematics(joints, materials, scene) {
  let currentGait = 'walk';
  let speedMultiplier = 1.0;
  let cycle = 0;

  function setGait(gait) {
    currentGait = gait;
    document.querySelectorAll('.btn-gait').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gait === gait);
    });
    const telGait = document.getElementById('telemetry-gait');
    if (telGait) telGait.textContent = gait.toUpperCase();
  }

  // Hook up UI buttons
  document.querySelectorAll('.btn-gait').forEach(btn => {
    btn.addEventListener('click', () => setGait(btn.dataset.gait));
  });
  const speedSlider = document.getElementById('speed-slider');
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      speedMultiplier = parseFloat(e.target.value) || 1.0;
    });
  }

  return {
    setGait,
    update: function(delta, time) {
      cycle += delta * speedMultiplier * (currentGait === 'gallop' ? 8 : currentGait === 'trot' ? 6 : currentGait === 'walk' ? 4 : 1.5);
      // Compute limb rotations for joints.legFL, legFR, legBL, legBR, neck, head, tail
    }
  };
}
\`\`\`
Output ONLY valid JavaScript inside \`\`\`javascript code fence.`;

  const animRes = await testSubsystem(
    'Kinematics',
    'You are an expert 3D Physics and Kinematics Engineer.',
    animPrompt,
  );
}

run().catch(console.error);
