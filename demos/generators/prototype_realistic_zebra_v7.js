// Prototype V7: Refined Pastern-Hoof Rigging, Grounded Rearing Biomechanics & Studio Framing
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equus quagga - Realistic Anatomical 3D Studio V7</title>
  <script src="/vendor/three.min.js"></script>
  <script src="/vendor/OrbitControls.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0c10; color: #ecefe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #canvas-container { position: absolute; inset: 0; z-index: 1; }
    canvas { width: 100% !important; height: 100% !important; display: block; }
    
    .hud-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 10;
      background: rgba(13, 16, 22, 0.88);
      border: 1px solid rgba(0, 229, 255, 0.28);
      backdrop-filter: blur(14px);
      border-radius: 10px;
      padding: 16px 20px;
      width: 320px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.65), 0 0 20px rgba(0, 229, 255, 0.12);
    }
    .hud-title { font-size: 0.95rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .hud-badge { font-size: 0.65rem; background: rgba(0, 229, 255, 0.18); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.45); border-radius: 4px; padding: 2px 7px; font-weight: 700; }
    .hud-desc { font-size: 0.72rem; color: #8e95a5; margin-bottom: 14px; line-height: 1.4; }
    
    .hud-section { margin-bottom: 12px; }
    .hud-label { font-size: 0.68rem; text-transform: uppercase; color: #8e95a5; letter-spacing: 1px; font-weight: 600; margin-bottom: 6px; }
    .hud-gait-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .btn-gait {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ecefe6;
      padding: 7px 4px;
      border-radius: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }
    .btn-gait:hover { background: rgba(0, 229, 255, 0.15); border-color: #00e5ff; color: #fff; }
    .btn-gait.active { background: #00e5ff; color: #0a0b0e; border-color: #00e5ff; font-weight: 700; box-shadow: 0 0 12px rgba(0, 229, 255, 0.45); }
    
    .slider-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.72rem; color: #ccc; margin-bottom: 6px; }
    .slider-row input[type="range"] { flex: 1; accent-color: #00e5ff; cursor: pointer; }
    
    .hud-telemetry {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 10;
      background: rgba(13, 16, 22, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 0.72rem;
      color: #8e95a5;
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
      <span>Equus quagga (Plains Zebra)</span>
      <span class="hud-badge">REALISTIC V7</span>
    </div>
    <div class="hud-desc">Anatomical multi-zone zebra loft, organic equine skull, articulated joints, shadow stripes & pastern biomechanics.</div>
    
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
        <span>Gait Speed</span>
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
    // ─── THREE.JS SCENE SETUP ───
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.022);
    window.__threeScene = scene;

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    // Adjusted camera distance and height so rearing zebra is 100% visible from ears to grounded hooves
    camera.position.set(4.8, 2.2, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.22, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 2.0;
    controls.maxDistance = 16.0;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    sunLight.position.set(6, 12, 7);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.45);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0e1117, roughness: 0.88, metalness: 0.08 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(30, 30, 0x00e5ff, 0x161a24);
    grid.position.y = 0.002;
    scene.add(grid);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── DETERMINISTIC HIGH-FIDELITY GEOMETRIC UTILITY ───
    function createClosedLoftGeometry(rings, radialSegments = 24) {
      const positions = [];
      const uvs = [];
      const indices = [];
      const ringCount = rings.length;

      for (let i = 0; i < ringCount; i++) {
        const ring = rings[i];
        const v = i / (ringCount - 1);
        for (let j = 0; j <= radialSegments; j++) {
          const u = j / radialSegments;
          const theta = u * Math.PI * 2;
          const sin = Math.sin(theta);
          const cos = Math.cos(theta);

          const rx = ring.rx;
          const ry = (cos > 0) ? (ring.ryTop || ring.ry) : (ring.ryBot || ring.ry);

          const x = (ring.x || 0) + sin * rx;
          const y = (ring.y || 0) + cos * ry;
          const z = ring.z || 0;

          positions.push(x, y, z);
          uvs.push(u, v);
        }
      }

      for (let i = 0; i < ringCount - 1; i++) {
        for (let j = 0; j < radialSegments; j++) {
          const a = i * (radialSegments + 1) + j;
          const b = (i + 1) * (radialSegments + 1) + j;
          const c = (i + 1) * (radialSegments + 1) + (j + 1);
          const d = i * (radialSegments + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }

    // ─── PROCEDURAL MULTI-ZONE ZEBRA TEXTURE (TRANSVERSE STRIPING) ───
    function createRealisticZebraBodyTexture(W = 1024, H = 1024) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      const base = ctx.createLinearGradient(0, 0, W, H);
      base.addColorStop(0, '#f5f3e9');
      base.addColorStop(0.5, '#ede9dc');
      base.addColorStop(1, '#f2ede0');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, W, H);

      const wobble = (u, phase, amp) => Math.sin(u * 12 + phase) * amp + Math.sin(u * 28 + phase * 1.7) * (amp * 0.4);

      function drawTransverseStripe(vCenter, thickness, phase, amp, color, alpha = 0.95) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        const halfThick = thickness * 0.5;

        for (let x = 0; x <= W; x += 8) {
          const uNorm = x / W;
          const bellyFade = Math.abs(uNorm - 0.5) < 0.08 ? (Math.abs(uNorm - 0.5) / 0.08) : 1.0;
          const y = vCenter + wobble(uNorm, phase, amp) - halfThick * bellyFade;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let x = W; x >= 0; x -= 8) {
          const uNorm = x / W;
          const bellyFade = Math.abs(uNorm - 0.5) < 0.08 ? (Math.abs(uNorm - 0.5) / 0.08) : 1.0;
          const y = vCenter + wobble(uNorm, phase, amp) + halfThick * bellyFade;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Zone 1: Barrel / Ribcage Vertical Stripes (v = 0.35 to 0.85)
      const numBarrelStripes = 20;
      for (let i = 0; i < numBarrelStripes; i++) {
        const vNorm = 0.35 + (i / (numBarrelStripes - 1)) * 0.52;
        const vCenter = vNorm * H;
        const thickness = (12 + Math.sin(i * 1.5) * 4);
        drawTransverseStripe(vCenter, thickness, i * 1.2, 10, '#111216', 0.96);
      }

      // Zone 2: Haunches and Rump Chevrons with Burchell's Shadow Stripes (v = 0.05 to 0.35)
      const numRumpStripes = 8;
      for (let i = 0; i < numRumpStripes; i++) {
        const vNorm = 0.08 + (i / (numRumpStripes - 1)) * 0.25;
        const vCenter = vNorm * H;
        const thickness = (16 + (i % 2) * 5);
        drawTransverseStripe(vCenter, thickness, i * 0.8 + 2.0, 18, '#101115', 0.96);
        drawTransverseStripe(vCenter + thickness * 0.75, thickness * 0.45, i * 0.8 + 2.3, 14, 'rgba(110, 88, 62, 0.38)', 1.0);
      }

      // Zone 3: Clean White Underbelly along center (u = 0.44 to 0.56)
      const bellyGradient = ctx.createLinearGradient(W * 0.42, 0, W * 0.58, 0);
      bellyGradient.addColorStop(0, 'rgba(245, 243, 233, 0)');
      bellyGradient.addColorStop(0.3, 'rgba(248, 246, 238, 0.95)');
      bellyGradient.addColorStop(0.7, 'rgba(248, 246, 238, 0.95)');
      bellyGradient.addColorStop(1, 'rgba(245, 243, 233, 0)');
      ctx.fillStyle = bellyGradient;
      ctx.fillRect(W * 0.42, 0, W * 0.16, H);

      // Zone 4: Continuous Black Dorsal Stripe along spine (u = 0.0 and u = 1.0)
      ctx.fillStyle = '#0f1014';
      ctx.fillRect(0, 0, W * 0.025, H);
      ctx.fillRect(W * 0.975, 0, W * 0.025, H);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return texture;
    }

    function createRealisticLegTexture(W = 512, H = 512) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f5f3e9';
      ctx.fillRect(0, 0, W, H);

      const rings = 16;
      for (let i = 0; i < rings; i++) {
        const y = (i / rings) * H;
        const thick = 10 + Math.sin(i * 1.8) * 4;
        ctx.fillStyle = '#101115';
        ctx.globalAlpha = 0.95;
        ctx.fillRect(0, y, W, thick);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      return texture;
    }

    function initMaterials() {
      const bodyTex = createRealisticZebraBodyTexture(1024, 1024);
      const legTex = createRealisticLegTexture(512, 512);

      return {
        body: new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.76, metalness: 0.04 }),
        leg: new THREE.MeshStandardMaterial({ map: legTex, roughness: 0.78, metalness: 0.04 }),
        maneDark: new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.92 }),
        maneLight: new THREE.MeshStandardMaterial({ color: 0xf5f3eb, roughness: 0.88 }),
        muzzleDark: new THREE.MeshStandardMaterial({ color: 0x16171b, roughness: 0.90 }),
        snip: new THREE.MeshStandardMaterial({ color: 0xdfdcd0, roughness: 0.85 }),
        nostril: new THREE.MeshStandardMaterial({ color: 0x070709, roughness: 0.45 }),
        eye: new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.04, metalness: 0.96 }),
        // Natural dark keratin hoof without specular sheen
        hoof: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.65, metalness: 0.02 })
      };
    }

    // ─── ANATOMICAL GEOMETRY: TORSO, CERVICAL CREST, EQUINE SKULL ───
    function createZebraTorsoAndHead(rootGroup, materials) {
      const torsoGroup = new THREE.Group();
      torsoGroup.position.set(0, 1.40, 0);
      rootGroup.add(torsoGroup);

      const torsoRings = [
        { x: 0, y: -0.04, z: -0.96, rx: 0.001, ryTop: 0.001, ryBot: 0.001 },
        { x: 0, y:  0.02, z: -0.84, rx: 0.38,  ryTop: 0.44,  ryBot: 0.40 },
        { x: 0, y:  0.06, z: -0.65, rx: 0.48,  ryTop: 0.52,  ryBot: 0.48 },
        { x: 0, y:  0.04, z: -0.40, rx: 0.50,  ryTop: 0.52,  ryBot: 0.50 },
        { x: 0, y:  0.01, z: -0.15, rx: 0.52,  ryTop: 0.52,  ryBot: 0.54 },
        { x: 0, y:  0.02, z:  0.10, rx: 0.53,  ryTop: 0.54,  ryBot: 0.58 },
        { x: 0, y:  0.06, z:  0.35, rx: 0.50,  ryTop: 0.58,  ryBot: 0.56 },
        { x: 0, y:  0.12, z:  0.55, rx: 0.46,  ryTop: 0.64,  ryBot: 0.52 },
        { x: 0, y:  0.08, z:  0.70, rx: 0.38,  ryTop: 0.58,  ryBot: 0.48 },
        { x: 0, y:  0.02, z:  0.84, rx: 0.26,  ryTop: 0.42,  ryBot: 0.38 },
        { x: 0, y: -0.04, z:  0.92, rx: 0.001, ryTop: 0.001, ryBot: 0.001 }
      ];
      const torso = new THREE.Mesh(createClosedLoftGeometry(torsoRings, 26), materials.body);
      torso.castShadow = true;
      torso.receiveShadow = true;
      torsoGroup.add(torso);

      const neckGroup = new THREE.Group();
      neckGroup.position.set(0, 0.14, 0.60);
      torsoGroup.add(neckGroup);

      const neckRings = [
        { x: 0, y: -0.16, z:  0.02, rx: 0.28, ryTop: 0.42, ryBot: 0.36 },
        { x: 0, y:  0.10, z:  0.10, rx: 0.25, ryTop: 0.38, ryBot: 0.30 },
        { x: 0, y:  0.38, z:  0.20, rx: 0.21, ryTop: 0.34, ryBot: 0.25 },
        { x: 0, y:  0.65, z:  0.30, rx: 0.18, ryTop: 0.28, ryBot: 0.20 },
        { x: 0, y:  0.88, z:  0.38, rx: 0.16, ryTop: 0.22, ryBot: 0.17 },
        { x: 0, y:  0.95, z:  0.42, rx: 0.001, ryTop: 0.001, ryBot: 0.001 }
      ];
      const neck = new THREE.Mesh(createClosedLoftGeometry(neckRings, 24), materials.body);
      neck.castShadow = true;
      neckGroup.add(neck);

      const maneGeo = new THREE.BoxGeometry(0.052, 0.12, 0.14);
      for (let i = 0; i < 18; i++) {
        const t = i / 17;
        const tuftMat = (i % 2 === 0) ? materials.maneDark : materials.maneLight;
        const tuft = new THREE.Mesh(maneGeo, tuftMat);
        tuft.position.set(0, -0.10 + t * 1.04, 0.04 + t * 0.38);
        tuft.rotation.x = -0.52 + t * 0.32;
        tuft.castShadow = true;
        neckGroup.add(tuft);
      }

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.88, 0.38);
      headGroup.rotation.x = Math.PI * 0.34;
      neckGroup.add(headGroup);

      const skullRings = [
        { x: 0, y:  0.06, z: -0.05, rx: 0.001, ryTop: 0.001, ryBot: 0.001 },
        { x: 0, y:  0.06, z:  0.04, rx: 0.16,  ryTop: 0.12,  ryBot: 0.15 },
        { x: 0, y:  0.03, z:  0.16, rx: 0.18,  ryTop: 0.12,  ryBot: 0.22 },
        { x: 0, y:  0.00, z:  0.30, rx: 0.15,  ryTop: 0.10,  ryBot: 0.16 },
        { x: 0, y: -0.02, z:  0.44, rx: 0.11,  ryTop: 0.09,  ryBot: 0.10 },
        { x: 0, y: -0.04, z:  0.58, rx: 0.09,  ryTop: 0.08,  ryBot: 0.08 },
        { x: 0, y: -0.05, z:  0.68, rx: 0.10,  ryTop: 0.08,  ryBot: 0.08 },
        { x: 0, y: -0.06, z:  0.74, rx: 0.001, ryTop: 0.001, ryBot: 0.001 }
      ];
      const skull = new THREE.Mesh(createClosedLoftGeometry(skullRings, 24), materials.body);
      skull.castShadow = true;
      headGroup.add(skull);

      const cheekGeo = new THREE.SphereGeometry(0.095, 14, 12);
      [-1, 1].forEach(side => {
        const cheek = new THREE.Mesh(cheekGeo, materials.body);
        cheek.position.set(0.13 * side, -0.08, 0.20);
        cheek.scale.set(0.85, 1.15, 1.05);
        headGroup.add(cheek);

        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), materials.muzzleDark);
        nostril.position.set(0.055 * side, 0.015, 0.665);
        nostril.scale.set(1.2, 0.9, 0.8);
        headGroup.add(nostril);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 12), materials.eye);
        eye.position.set(0.148 * side, 0.045, 0.295);
        eye.scale.set(0.75, 0.9, 1.15);
        headGroup.add(eye);

        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 10), materials.body);
        ear.position.set(0.095 * side, 0.15, 0.045);
        ear.rotation.set(-0.20, 0, -0.25 * side);
        ear.castShadow = true;
        headGroup.add(ear);
      });

      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 14), materials.muzzleDark);
      muzzle.position.set(0, -0.02, 0.70);
      muzzle.scale.set(1.0, 0.85, 0.75);
      headGroup.add(muzzle);

      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, 0, -0.92);
      torsoGroup.add(tailGroup);

      const dock = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.075, 0.32, 12), materials.body);
      dock.position.set(0, 0.06, -0.10);
      dock.rotation.x = Math.PI * 0.42;
      tailGroup.add(dock);

      const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.52, 12), materials.maneDark);
      tailTuft.position.set(0, -0.06, -0.36);
      tailTuft.rotation.x = Math.PI * 0.58;
      tailGroup.add(tailTuft);

      return { torso: torsoGroup, neck: neckGroup, head: headGroup, tail: tailGroup };
    }

    // ─── RIGID ANATOMICAL LIMB HIERARCHY (HOOF ATTACHED DIRECTLY TO PASTERN) ───
    function createZebraLimbs(torsoGroup, materials) {
      const coatMat = materials.body;
      const legMat = materials.leg;
      const hoofMat = materials.hoof;

      function buildForeleg(sideSign) {
        const hip = new THREE.Group();
        hip.position.set(0.36 * sideSign, -0.12, 0.54);

        // Shoulder (Scapula)
        const scapula = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), coatMat);
        scapula.scale.set(0.68, 1.35, 0.95);
        scapula.position.set(0, -0.05, 0.02);
        hip.add(scapula);

        // Forearm
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.065, 0.58, 14), legMat);
        forearm.position.set(0, -0.40, 0.01);
        hip.add(forearm);

        // Knee (Carpus)
        const knee = new THREE.Group();
        knee.position.set(0, -0.70, 0.02);
        hip.add(knee);

        const carpus = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 10), coatMat);
        knee.add(carpus);

        // Cannon
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.046, 0.34, 14), legMat);
        cannon.position.set(0, -0.20, 0);
        knee.add(cannon);

        // Fetlock Joint
        const fetlock = new THREE.Group();
        fetlock.position.set(0, -0.38, 0);
        knee.add(fetlock);

        const fetlockBall = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), coatMat);
        fetlock.add(fetlockBall);

        // Pastern Pivot (slopes 48° forward-downward)
        const pasternLen = 0.15;
        const pasternAngle = THREE.MathUtils.degToRad(48);
        const pasternPivot = new THREE.Group();
        pasternPivot.position.set(0, -0.02, 0);
        pasternPivot.rotation.x = pasternAngle;

        const pastern = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, pasternLen, 14), coatMat);
        pastern.position.set(0, -pasternLen * 0.5, 0);
        pasternPivot.add(pastern);

        // Hoof attached DIRECTLY to the base of the pastern!
        // Rotates with the pastern as a unified distal extremity.
        const hoofH = 0.09;
        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.096, hoofH, 16), hoofMat);
        // Placed at the end of the pastern, counter-rotated so sole is flat when standing
        hoof.position.set(0, -pasternLen - hoofH * 0.35, 0.02);
        hoof.rotation.x = -pasternAngle * 0.85;
        pasternPivot.add(hoof);

        fetlock.add(pasternPivot);
        torsoGroup.add(hip);
        return { hip, knee, fetlock };
      }

      function buildHindleg(sideSign) {
        const hip = new THREE.Group();
        hip.position.set(0.34 * sideSign, -0.05, -0.62);

        // Haunch & Croup
        const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), coatMat);
        haunch.scale.set(0.75, 1.45, 1.15);
        haunch.position.set(0, -0.08, -0.02);
        hip.add(haunch);

        // Thigh
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.082, 0.56, 14), legMat);
        thigh.position.set(0, -0.42, 0.02);
        hip.add(thigh);

        // Hock (Tarsus) with calcaneus spur
        const knee = new THREE.Group();
        knee.position.set(0, -0.72, -0.04);
        hip.add(knee);

        const hock = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), coatMat);
        hock.position.set(0, 0, -0.04);
        knee.add(hock);

        const calcaneusSpur = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.14, 10), coatMat);
        calcaneusSpur.position.set(0, 0.04, -0.11);
        calcaneusSpur.rotation.x = -Math.PI * 0.42;
        knee.add(calcaneusSpur);

        // Hind Cannon
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.38, 14), legMat);
        cannon.position.set(0, -0.22, 0.01);
        knee.add(cannon);

        // Hind Fetlock
        const fetlock = new THREE.Group();
        fetlock.position.set(0, -0.42, 0.01);
        knee.add(fetlock);

        const fetlockBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), coatMat);
        fetlock.add(fetlockBall);

        // Hind Pastern Pivot
        const pasternLen = 0.15;
        const pasternAngle = THREE.MathUtils.degToRad(50);
        const pasternPivot = new THREE.Group();
        pasternPivot.position.set(0, -0.02, 0);
        pasternPivot.rotation.x = pasternAngle;

        const pastern = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.056, pasternLen, 14), coatMat);
        pastern.position.set(0, -pasternLen * 0.5, 0);
        pasternPivot.add(pastern);

        // Hind Hoof attached directly to pastern
        const hoofH = 0.09;
        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.094, hoofH, 16), hoofMat);
        hoof.position.set(0, -pasternLen - hoofH * 0.35, 0.02);
        hoof.rotation.x = -pasternAngle * 0.85;
        pasternPivot.add(hoof);

        fetlock.add(pasternPivot);
        torsoGroup.add(hip);
        return { hip, knee, fetlock };
      }

      const legFL = buildForeleg(1);
      const legFR = buildForeleg(-1);
      const legBL = buildHindleg(1);
      const legBR = buildHindleg(-1);

      return { legFL, legFR, legBL, legBR };
    }

    // ─── HARMONIC BIOMECHANICAL KINEMATICS ENGINE ───
    function createZebraKinematics(joints) {
      const j = joints || {};
      const torso = j.torso, neck = j.neck, head = j.head, tail = j.tail;
      const FL = j.legFL, FR = j.legFR, BL = j.legBL, BR = j.legBR;
      let currentGait = 'walk';
      let gaitTime = 0;
      let speedMult = 1.0;

      const lerp = (a, b, k) => a + (b - a) * k;
      const rot = (obj, axis, val) => { if (obj && obj.rotation) obj.rotation[axis] = val; };

      function setGait(g) {
        if (['walk', 'trot', 'gallop', 'rear', 'idle'].includes(g)) {
          currentGait = g;
          document.getElementById('telemetry-gait').textContent = g.toUpperCase();
        }
      }

      function update(delta) {
        const dt = delta * speedMult;
        gaitTime += dt;

        if (currentGait === 'rear') {
          // Proud, elevated rearing stance
          if (torso) {
            torso.rotation.x = lerp(torso.rotation.x, -0.74, 0.12);
            torso.position.y = lerp(torso.position.y, 1.62, 0.10);
          }
          // Elevated pawing forelegs (with attached pasterns & hooves!)
          if (FL) {
            rot(FL.hip, 'x', -0.52 + Math.sin(gaitTime * 5.2) * 0.28);
            rot(FL.knee, 'x', 0.85 + Math.cos(gaitTime * 5.2) * 0.18);
            rot(FL.fetlock, 'x', 0.22);
          }
          if (FR) {
            rot(FR.hip, 'x', -0.46 + Math.cos(gaitTime * 5.2) * 0.28);
            rot(FR.knee, 'x', 0.72 + Math.sin(gaitTime * 5.2) * 0.18);
            rot(FR.fetlock, 'x', 0.22);
          }
          // Grounded, supporting hindlegs planted firmly under the pelvis
          if (BL) {
            rot(BL.hip, 'x', 0.48);
            rot(BL.knee, 'x', -0.32);
            rot(BL.fetlock, 'x', -0.16);
          }
          if (BR) {
            rot(BR.hip, 'x', 0.48);
            rot(BR.knee, 'x', -0.32);
            rot(BR.fetlock, 'x', -0.16);
          }
          if (neck) rot(neck, 'x', -0.58);
          if (head) rot(head, 'x', 0.38);
          if (tail) {
            rot(tail, 'x', 0.76);
            rot(tail, 'z', Math.sin(gaitTime * 3.5) * 0.08);
          }
          return;
        }

        // Default standing torso height
        if (torso) {
          torso.rotation.x = lerp(torso.rotation.x, 0, 0.12);
          torso.position.y = lerp(torso.position.y, 1.40, 0.12);
        }

        if (currentGait === 'walk') {
          // 4-beat lateral walk gait (FL -> BR -> FR -> BL)
          const p = gaitTime * 4.2;
          const swing = 0.38;

          const legPhase = (leg, offset) => {
            if (!leg) return;
            const ph = p + offset;
            const s = Math.sin(ph);
            rot(leg.hip, 'x', s * swing);
            rot(leg.knee, 'x', Math.max(0, -s * 0.45));
            rot(leg.fetlock, 'x', Math.max(0, Math.sin(ph + 0.8) * 0.22));
          };

          legPhase(FL, 0);
          legPhase(BR, Math.PI * 0.5);
          legPhase(FR, Math.PI);
          legPhase(BL, Math.PI * 1.5);

          if (torso) {
            torso.position.y = 1.40 + Math.abs(Math.sin(p * 2)) * 0.025;
            torso.rotation.z = Math.sin(p) * 0.02;
          }
          if (neck) rot(neck, 'x', Math.sin(p) * 0.04);
          if (tail) rot(tail, 'z', Math.sin(p) * 0.14);

        } else if (currentGait === 'trot') {
          const p = gaitTime * 6.5;
          const s = Math.sin(p);
          if (FL) { rot(FL.hip, 'x', s * 0.52); rot(FL.knee, 'x', Math.max(0, -s * 0.58)); }
          if (BR) { rot(BR.hip, 'x', s * 0.52); rot(BR.knee, 'x', Math.max(0, -s * 0.58)); }
          if (FR) { rot(FR.hip, 'x', -s * 0.52); rot(FR.knee, 'x', Math.max(0, s * 0.58)); }
          if (BL) { rot(BL.hip, 'x', -s * 0.52); rot(BL.knee, 'x', Math.max(0, s * 0.58)); }
          if (torso) torso.position.y = 1.40 + Math.abs(s) * 0.04;
          if (neck) rot(neck, 'x', Math.sin(p) * 0.06);

        } else if (currentGait === 'idle') {
          const breath = Math.sin(gaitTime * 1.8) * 0.02;
          if (neck) rot(neck, 'x', breath);
          if (tail) rot(tail, 'z', Math.sin(gaitTime * 0.8) * 0.06);
          [FL, FR, BL, BR].forEach(leg => {
            if (leg) {
              rot(leg.hip, 'x', lerp(leg.hip.rotation.x, 0, 0.1));
              rot(leg.knee, 'x', lerp(leg.knee.rotation.x, 0, 0.1));
              rot(leg.fetlock, 'x', lerp(leg.fetlock.rotation.x, 0, 0.1));
            }
          });
        }
      }

      return { update, setGait, setSpeed: (s) => { speedMult = s; } };
    }

    // ─── INITIALIZATION & MAIN LOOP ───
    const materials = initMaterials();
    const zebraParts = createZebraTorsoAndHead(scene, materials);
    const limbParts = createZebraLimbs(zebraParts.torso, materials);
    const joints = { ...zebraParts, ...limbParts };
    const kinematics = createZebraKinematics(joints);

    let meshCount = 0;
    scene.traverse(o => { if (o.isMesh) meshCount++; });
    document.getElementById('telemetry-meshes').textContent = String(meshCount);

    document.querySelectorAll('.btn-gait').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-gait').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        kinematics.setGait(btn.dataset.gait);
      });
    });

    document.getElementById('speed-slider').addEventListener('input', (e) => {
      kinematics.setSpeed(parseFloat(e.target.value));
    });

    const clock = new THREE.Clock();
    let frameTimes = [];

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      controls.update();
      kinematics.update(delta);

      renderer.render(scene, camera);

      const now = performance.now();
      frameTimes.push(now);
      while (frameTimes.length > 0 && frameTimes[0] <= now - 1000) frameTimes.shift();
      document.getElementById('telemetry-fps').textContent = String(frameTimes.length);
    }
    animate();
  </script>
</body>
</html>`;

fs.writeFileSync('workspace/game_equus_quagga_realistic_v7.html', htmlContent, 'utf8');
console.log('✓ Written workspace/game_equus_quagga_realistic_v7.html');

async function testPrototype() {
  console.log('Launching Playwright Chrome to verify V7...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3009/workspace/game_equus_quagga_realistic_v7.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2500);

  const shot1Local = 'client/images/realistic_zebra_v7_walk.png';
  const shot1Artifact = path.join(ARTIFACT_DIR, 'realistic_zebra_v7_walk.png');
  await page.screenshot({ path: shot1Local });
  try {
    fs.copyFileSync(shot1Local, shot1Artifact);
  } catch (_) {}
  console.log(`✓ Saved ${shot1Local}`);

  const rearBtn = await page.$('button[data-gait="rear"]');
  if (rearBtn) {
    await rearBtn.click();
    await page.waitForTimeout(2000);
  }

  const shot2Local = 'client/images/realistic_zebra_v7_rear.png';
  const shot2Artifact = path.join(ARTIFACT_DIR, 'realistic_zebra_v7_rear.png');
  await page.screenshot({ path: shot2Local });
  try {
    fs.copyFileSync(shot2Local, shot2Artifact);
  } catch (_) {}
  console.log(`✓ Saved ${shot2Local}`);

  await browser.close();
  console.log('✓ V7 Prototype Playwright verification complete!');
}

testPrototype().catch((e) => {
  console.error('Error testing V7:', e);
  process.exit(1);
});
