import { callAI } from '../../../server/api/openrouter.js';
import { stripCodeFences } from '../../../server/coder/perfectionist-coder-engine.js';
import { validateJsSyntax, autoHealScript } from '../../../server/3d/split-game-generator.js';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

async function generateMicro(name, prompt) {
  console.log(`[Opus-4.6] Synthesizing Micro-Contract: ${name}...`);
  const t0 = Date.now();
  const res = await callAI({
    model: 'opus-4.6',
    systemPrompt:
      'You are an elite Three.js Graphics Engineer. Output ONLY clean, complete JavaScript inside ```javascript. Absolutely ZERO ellipses (...) or placeholders.',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    maxTokens: 3000,
  });

  const content = res.choices?.[0]?.message?.content || '';
  const code = autoHealScript(stripCodeFences(content));
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `✓ ${name} completed (${code.length} chars in ${dur}s). Valid syntax: ${validateJsSyntax(code).valid}`,
  );
  return code;
}

async function main() {
  console.log('=== STARTING 100% OPUS-4.6 MICRO-CONTRACT SYNTHESIS ===');

  // Micro 1: Procedural Zebra Stripe Texture
  const p1 = `Write a standalone JavaScript function:
\`function createZebraStripeTexture(size = 512)\`
Requirements:
- Create a 512x512 canvas.
- Fill background with ivory '#f4f3ea'.
- Draw 20 vertical sinusoidal stripes in dark '#111215' across the canvas using a standard for-loop.
- Return a new THREE.CanvasTexture(canvas).
- Keep code clean, under 30 lines.
- Absolutely ZERO ellipses (...). Every loop must be complete.
Output ONLY JavaScript inside \`\`\`javascript.`;
  const codeTexture = await generateMicro('Texture Generator', p1);

  // Micro 2: Torso, Neck & Cranium
  const p2 = `Write a standalone JavaScript function:
\`function createZebraTorsoAndHead(rootGroup, materials)\`
Requirements:
- Add torso cylinder (radius 0.55, length 1.8) rotated on Z axis to rootGroup using materials.body.
- Add neck cylinder tilted forward-upward to rootGroup using materials.body.
- Add head group containing skull mesh, muzzle box (materials.muzzle), 2 ears cones, 2 eyes spheres (materials.eye), and dorsal mane crest along neck (materials.mane).
- Add tail cylinder and tail tuft cone (materials.mane) attached to rootGroup.
- Keep code concise, under 50 lines.
- Absolutely ZERO ellipses (...). Write all Three.js meshes explicitly.
Output ONLY JavaScript inside \`\`\`javascript.`;
  const codeTorso = await generateMicro('Torso & Head', p2);

  // Micro 3: Articulated Limbs
  const p3 = `Write a standalone JavaScript function:
\`function createZebraLimbs(rootGroup, materials)\`
Requirements:
- Create 4 articulated leg groups: legFL, legFR, legBL, legBR.
- In each leg group, add an upper limb mesh, a knee/hock joint group, and a hoof mesh (materials.hoof).
- Add all 4 legs to rootGroup at appropriate coordinates (X: ±0.5, Z: ±0.8).
- Return an object with all joint groups: { legFL, kneeFL, hoofFL, legFR, kneeFR, hoofFR, legBL, hockBL, hoofBL, legBR, hockBR, hoofBR }.
- Keep code concise, under 50 lines.
- Absolutely ZERO ellipses (...). Write all 4 legs explicitly.
Output ONLY JavaScript inside \`\`\`javascript.`;
  const codeLimbs = await generateMicro('Articulated Limbs', p3);

  // Micro 4: Kinematics Controller
  const p4 = `Write a standalone JavaScript function:
\`function createZebraKinematics(joints)\`
Requirements:
- Returns an object with update(delta, time) and setGait(gaitName).
- Supported gaits: 'walk', 'trot', 'gallop', 'rear', 'idle'.
- In update(delta, time), compute leg joint rotations using Math.sin(time * speed + phase).
- In 'rear' gait, tilt joints.root up by 0.6 rad and lift front legs.
- Keep code concise, under 45 lines.
- Absolutely ZERO ellipses (...).
Output ONLY JavaScript inside \`\`\`javascript.`;
  const codeKinematics = await generateMicro('Kinematics Controller', p4);

  // Deterministic Assembly
  console.log('\n--- Assembling 100% Opus-4.6 Subsystems into Production HTML ---');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equus quagga - Micro-Contract Autonomous 3D Studio</title>
  <script src="/vendor/three.min.js"></script>
  <script src="/vendor/OrbitControls.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0b0e; color: #ecefe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #canvas-container { position: absolute; inset: 0; z-index: 1; }
    canvas { width: 100% !important; height: 100% !important; display: block; }
    
    .hud-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 10;
      background: rgba(13, 15, 18, 0.85);
      border: 1px solid rgba(0, 229, 255, 0.25);
      backdrop-filter: blur(12px);
      border-radius: 8px;
      padding: 16px 20px;
      width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 229, 255, 0.1);
    }
    .hud-title { font-size: 0.95rem; font-weight: 700; color: #fff; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .hud-badge { font-size: 0.65rem; background: rgba(0, 229, 255, 0.15); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.4); border-radius: 4px; padding: 2px 6px; font-weight: 600; }
    .hud-desc { font-size: 0.72rem; color: #8e94a0; margin-bottom: 14px; line-height: 1.4; }
    
    .hud-section { margin-bottom: 12px; }
    .hud-label { font-size: 0.68rem; text-transform: uppercase; color: #8e94a0; letter-spacing: 1px; font-weight: 600; margin-bottom: 6px; }
    .hud-gait-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .btn-gait {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ecefe6;
      padding: 7px 4px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }
    .btn-gait:hover { background: rgba(0, 229, 255, 0.15); border-color: #00e5ff; color: #fff; }
    .btn-gait.active { background: #00e5ff; color: #0a0b0e; border-color: #00e5ff; font-weight: 700; box-shadow: 0 0 10px rgba(0, 229, 255, 0.4); }
    
    .slider-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.72rem; color: #ccc; margin-bottom: 6px; }
    .slider-row input[type="range"] { flex: 1; accent-color: #00e5ff; cursor: pointer; }
    
    .hud-telemetry {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 10;
      background: rgba(13, 15, 18, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 0.72rem;
      color: #8e94a0;
      display: flex;
      gap: 16px;
    }
    .hud-telemetry span strong { color: #00e5ff; font-weight: 600; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  
  <div class="hud-panel">
    <div class="hud-title">
      <span>Equus quagga - 3D Equine Studio</span>
      <span class="hud-badge">OPUS-4.6</span>
    </div>
    <div class="hud-desc">100% Autonomous Micro-Contract synthesis authored by opus-4.6.</div>
    
    <div class="hud-section">
      <div class="hud-label">Biomechanical Gaits</div>
      <div class="hud-gait-grid">
        <button class="btn-gait active" data-gait="walk">Walk</button>
        <button class="btn-gait" data-gait="trot">Trot</button>
        <button class="btn-gait" data-gait="gallop">Gallop</button>
        <button class="btn-gait" data-gait="rear">Rear</button>
        <button class="btn-gait" data-gait="idle">Idle</button>
      </div>
    </div>
    
    <div class="hud-section">
      <div class="hud-label">Dynamics & Scale</div>
      <div class="slider-row">
        <span>Speed</span>
        <input type="range" id="speed-slider" min="0.2" max="2.5" step="0.1" value="1.0">
      </div>
    </div>
  </div>
  
  <div class="hud-telemetry">
    <span>FPS: <strong id="telemetry-fps">60</strong></span>
    <span>Meshes: <strong id="telemetry-meshes">0</strong></span>
    <span>Gait: <strong id="telemetry-gait">WALK</strong></span>
  </div>

  <script>
  window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    window.__threeScene = scene;
    scene.background = new THREE.Color(0x0a0b0e);
    scene.fog = new THREE.FogExp2(0x0a0b0e, 0.035);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3.5, 2.2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.1, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00e5ff, 0.4);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(30, 30, 0x00e5ff, 0x1a1e28);
    grid.position.y = 0.002;
    scene.add(grid);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── OPUS-4.6 SYNTHESIZED MICRO-CONTRACTS ───
    ${codeTexture}

    function initMaterials() {
      const stripeTex = createZebraStripeTexture(512);
      return {
        body: new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.85, metalness: 0.05 }),
        mane: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9 }),
        hoof: new THREE.MeshStandardMaterial({ color: 0x222328, roughness: 0.35, metalness: 0.2 }),
        muzzle: new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.85 }),
        eye: new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.1, metalness: 0.9 })
      };
    }

    ${codeTorso}

    ${codeLimbs}

    function buildModel(scene, materials) {
      const rootGroup = new THREE.Group();
      rootGroup.name = 'zebraRoot';
      scene.add(rootGroup);

      createZebraTorsoAndHead(rootGroup, materials);
      const limbs = createZebraLimbs(rootGroup, materials) || {};

      return {
        root: rootGroup,
        ...limbs
      };
    }

    ${codeKinematics}

    // ─── INITIALIZATION & ANIMATION LOOP ───
    const materials = initMaterials();
    const joints = buildModel(scene, materials);
    const kinematics = createZebraKinematics(joints);

    // Count meshes for telemetry
    let meshCount = 0;
    scene.traverse(node => { if (node.isMesh) meshCount++; });
    const telMeshes = document.getElementById('telemetry-meshes');
    if (telMeshes) telMeshes.textContent = meshCount;

    // Hook up UI gait buttons
    document.querySelectorAll('.btn-gait').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-gait').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const gait = e.target.dataset.gait;
        if (kinematics && typeof kinematics.setGait === 'function') kinematics.setGait(gait);
        const telGait = document.getElementById('telemetry-gait');
        if (telGait) telGait.textContent = gait.toUpperCase();
      });
    });

    const clock = new THREE.Clock();
    let frameCount = 0, lastFpsTime = performance.now();
    const telFps = document.getElementById('telemetry-fps');

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      controls.update();
      if (kinematics && typeof kinematics.update === 'function') {
        kinematics.update(delta, time);
      }

      renderer.render(scene, camera);

      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        if (telFps) telFps.textContent = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
      }
    }
    animate();
  });
  </script>
</body>
</html>`;

  const outPath = path.resolve('workspace/game_equus_quagga_micro_contract_opus46.html');
  fs.writeFileSync(outPath, fullHtml, 'utf8');
  console.log(`✓ Saved complete assembled deliverable: ${outPath} (${fullHtml.length} bytes)`);

  // Verify AST Syntax
  const jsMatch = fullHtml.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i);
  if (jsMatch) {
    const ast = validateJsSyntax(jsMatch[1]);
    console.log(`✓ AST Validation: valid=${ast.valid}`);
    if (!ast.valid) {
      console.error('AST syntax error:', ast.error);
    }
  }

  // Playwright Headless Chrome Verification
  console.log('\n--- Running Real Playwright Chrome Verification ---');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleMessages = [];
  page.on('console', (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleMessages.push(`[PAGEERROR] ${err.message}`));

  await page.goto('http://127.0.0.1:3009/workspace/game_equus_quagga_micro_contract_opus46.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(3000);

  const telemetry = await page.evaluate(() => {
    let meshes = 0;
    if (window.__threeScene) {
      window.__threeScene.traverse((n) => {
        if (n.isMesh) meshes++;
      });
    }
    return {
      meshes,
      fpsTxt: document.getElementById('telemetry-fps')?.textContent || '0',
      meshTxt: document.getElementById('telemetry-meshes')?.textContent || '0',
      gaitTxt: document.getElementById('telemetry-gait')?.textContent || 'WALK',
      hasCanvas: Boolean(document.querySelector('canvas')),
    };
  });

  console.log('Empirical Chrome Telemetry:', telemetry);
  console.log(
    'Console Errors:',
    consoleMessages.filter((m) => m.includes('PAGEERROR') || m.includes('error')),
  );

  const screenshot1 = path.resolve('client/images/opus46_micro_zebra_walk.png');
  await page.screenshot({ path: screenshot1 });
  console.log('✓ Saved Walk Pose Screenshot:', screenshot1);

  // Click rear button
  const rearBtn = await page.$('button[data-gait="rear"]');
  if (rearBtn) {
    await rearBtn.click();
    await page.waitForTimeout(1000);
    const screenshot2 = path.resolve('client/images/opus46_micro_zebra_rear.png');
    await page.screenshot({ path: screenshot2 });
    console.log('✓ Saved Rear Gait Screenshot:', screenshot2);
  }

  await browser.close();
  console.log('\n=== EMPIRICAL VERIFICATION COMPLETE ===');
}

main().catch(console.error);
