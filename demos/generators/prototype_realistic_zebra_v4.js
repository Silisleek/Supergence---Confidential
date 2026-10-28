// Prototype v4: Photorealistic Equine Sculpting with Muscular Girdles, Downward Cranial Vault, and Closed Lofts
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equus quagga - Realistic Anatomical Equine Studio</title>
  <script src="/vendor/three.min.js"></script>
  <script src="/vendor/OrbitControls.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #06070a; color: #ecefe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #canvas-container { position: absolute; inset: 0; z-index: 1; }
    canvas { width: 100% !important; height: 100% !important; display: block; }
    
    .hud-panel {
      position: absolute;
      top: 24px;
      left: 24px;
      z-index: 10;
      background: rgba(10, 12, 16, 0.90);
      border: 1px solid rgba(0, 240, 255, 0.32);
      backdrop-filter: blur(16px);
      border-radius: 10px;
      padding: 18px 22px;
      width: 330px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.15);
    }
    .hud-title { font-size: 1.0rem; font-weight: 700; color: #fff; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .hud-badge { font-size: 0.65rem; background: rgba(0, 240, 255, 0.15); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.5); border-radius: 4px; padding: 2px 7px; font-weight: 700; }
    .hud-desc { font-size: 0.74rem; color: #8e95a5; margin-bottom: 16px; line-height: 1.45; }
    
    .hud-section { margin-bottom: 14px; }
    .hud-label { font-size: 0.68rem; text-transform: uppercase; color: #8e95a5; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px; }
    .hud-gait-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .btn-gait {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ecefe6;
      padding: 8px 4px;
      border-radius: 5px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }
    .btn-gait:hover { background: rgba(0, 240, 255, 0.18); border-color: #00f0ff; color: #fff; }
    .btn-gait.active { background: #00f0ff; color: #06070a; border-color: #00f0ff; font-weight: 700; box-shadow: 0 0 12px rgba(0, 240, 255, 0.5); }
    
    .slider-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.74rem; color: #ccc; margin-bottom: 6px; }
    .slider-row input[type="range"] { flex: 1; accent-color: #00f0ff; cursor: pointer; }
    
    .hud-telemetry {
      position: absolute;
      bottom: 24px;
      right: 24px;
      z-index: 10;
      background: rgba(10, 12, 16, 0.90);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(14px);
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 0.74rem;
      color: #8e95a5;
      display: flex;
      gap: 18px;
    }
    .hud-telemetry span strong { color: #00f0ff; font-weight: 700; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  
  <div class="hud-panel">
    <div class="hud-title">
      <span>Equus quagga - Realistic Studio</span>
      <span class="hud-badge">PRO-V4</span>
    </div>
    <div class="hud-desc">Closed organic lofts, scapular & haunch muscular girdles, anatomically flexed cranial vault, and harmonic 4-beat locomotion.</div>
    
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
        <input type="range" id="speed-slider" min="0.3" max="2.5" step="0.1" value="1.0">
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
    // ─── 1. THREE.JS VIEWPORT & CINEMATIC STUDIO LIGHTING ───
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    window.__threeScene = scene;
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.022);

    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(4.6, 2.0, 4.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.25, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 2.0;
    controls.maxDistance = 15.0;

    // Studio 3-Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.4);
    keyLight.position.set(5.5, 8.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.42);
    fillLight.position.set(-5, 4, -3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.88);
    rimLight.position.set(0, 5.0, -5.5);
    scene.add(rimLight);

    // Studio ground
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.88, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(30, 30, 0x00f0ff, 0x141720);
    grid.position.y = 0.002;
    scene.add(grid);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── 2. SEAMLESS PROCEDURAL HIGH-DEFINITION ZEBRA TEXTURES ───
    function createZebraBodyTexture(W = 1024, H = 1024) {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, '#f4f2e7');
      grad.addColorStop(0.5, '#ede9dc');
      grad.addColorStop(1, '#f4f2e7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const numStripes = 28;
      for (let i = 0; i < numStripes; i++) {
        const baseV = (i + 0.5) / numStripes * H;
        ctx.beginPath();

        for (let x = 0; x <= W; x += 8) {
          const u = x / W;
          const isRear = (baseV < H * 0.38);
          const rearChevron = isRear ? Math.sin(u * Math.PI) * 48 * ((H * 0.38 - baseV) / (H * 0.38)) : 0;
          const wobble = Math.sin(x * 0.018 + i * 2.2) * 8 + Math.sin(x * 0.008 + i * 0.9) * 12;
          const y = baseV + wobble + rearChevron;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineWidth = 15 + (Math.sin(i * 1.6) + 1) * 6;
        ctx.strokeStyle = '#0e0f13';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Shadow stripes
        if (i % 2 === 0 && baseV > H * 0.22 && baseV < H * 0.78) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 12) {
            const y = baseV + 17 + Math.sin(x * 0.015 + i) * 6;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(80, 65, 50, 0.22)';
          ctx.stroke();
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    }

    function createZebraLegTexture(W = 512, H = 512) {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f4f2e7';
      ctx.fillRect(0, 0, W, H);

      const rings = 16;
      for (let r = 0; r < rings; r++) {
        const baseY = (r + 0.5) * (H / rings);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 10) {
          const y = baseY + Math.sin(x * 0.024 + r * 1.5) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 13;
        ctx.strokeStyle = '#101115';
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    }

    // ─── 3. CONTINUOUS ORGANIC CLOSED LOFT GENERATOR ───
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

          const x = ring.x + sin * rx;
          const y = ring.y + cos * ry;
          const z = ring.z;

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

    // PBR Materials
    const bodyTex = createZebraBodyTexture();
    const legTex = createZebraLegTexture();

    const materials = {
      body: new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.78, metalness: 0.04 }),
      leg: new THREE.MeshStandardMaterial({ map: legTex, roughness: 0.80, metalness: 0.04 }),
      maneDark: new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.90 }),
      maneLight: new THREE.MeshStandardMaterial({ color: 0xeeece0, roughness: 0.90 }),
      muzzleDark: new THREE.MeshStandardMaterial({ color: 0x18191e, roughness: 0.92 }),
      muzzleSnip: new THREE.MeshStandardMaterial({ color: 0xe8e6db, roughness: 0.85 }),
      nostril: new THREE.MeshStandardMaterial({ color: 0x060608, roughness: 0.5 }),
      eye: new THREE.MeshStandardMaterial({ color: 0x040406, roughness: 0.05, metalness: 0.95 }),
      hoof: new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.38, metalness: 0.20 })
    };

    // ─── 4. ASSEMBLE ANATOMICALLY REALISTIC MODEL ───
    function buildRealisticZebra(scene) {
      const rootGroup = new THREE.Group();
      rootGroup.name = 'zebraRoot';
      scene.add(rootGroup);

      const addShadows = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

      const torsoGroup = new THREE.Group();
      torsoGroup.position.set(0, 1.40, 0);
      rootGroup.add(torsoGroup);

      // ── A. CONTINUOUS ORGANIC TORSO LOFT (PERFECTLY CLOSED TIPS) ──
      const torsoRings = [
        { x: 0, y: -0.04, z: -0.96, rx: 0.001, ryTop: 0.001, ryBot: 0.001 }, // Seamlessly closed rump cap
        { x: 0, y: 0.02,  z: -0.84, rx: 0.38,  ryTop: 0.44,  ryBot: 0.40 },  // Buttocks slope
        { x: 0, y: 0.06,  z: -0.65, rx: 0.48,  ryTop: 0.52,  ryBot: 0.48 },  // Muscular croup/pelvis
        { x: 0, y: 0.04,  z: -0.40, rx: 0.50,  ryTop: 0.52,  ryBot: 0.50 },  // Flank
        { x: 0, y: 0.01,  z: -0.15, rx: 0.52,  ryTop: 0.52,  ryBot: 0.54 },  // Mid-belly
        { x: 0, y: 0.02,  z:  0.10, rx: 0.53,  ryTop: 0.54,  ryBot: 0.58 },  // Deep thoracic ribcage
        { x: 0, y: 0.06,  z:  0.35, rx: 0.50,  ryTop: 0.58,  ryBot: 0.56 },  // Heart girth
        { x: 0, y: 0.12,  z:  0.55, rx: 0.46,  ryTop: 0.64,  ryBot: 0.52 },  // Prominent withers ridge
        { x: 0, y: 0.08,  z:  0.70, rx: 0.38,  ryTop: 0.58,  ryBot: 0.48 },  // Shoulder girdle junction
        { x: 0, y: 0.02,  z:  0.84, rx: 0.26,  ryTop: 0.42,  ryBot: 0.38 },  // Muscular breast inlet
        { x: 0, y: -0.04, z:  0.92, rx: 0.001, ryTop: 0.001, ryBot: 0.001 }  // Seamlessly closed breast tip
      ];
      const torsoMesh = addShadows(new THREE.Mesh(createClosedLoftGeometry(torsoRings, 24), materials.body));
      torsoGroup.add(torsoMesh);

      // ── B. ELEGANTLY ARCHED CERVICAL NECK WITH DOWNWARD-TILTED CRANIAL VAULT ──
      const neckGroup = new THREE.Group();
      neckGroup.position.set(0, 0.14, 0.60);
      torsoGroup.add(neckGroup);

      // Rings defining the neck rising to poll, then bending downward at ~55° to muzzle
      const neckHeadRings = [
        { x: 0, y: -0.15, z:  0.02, rx: 0.28,  ryTop: 0.42,  ryBot: 0.38 },  // Deep base inside withers cavity
        { x: 0, y:  0.12, z:  0.12, rx: 0.24,  ryTop: 0.38,  ryBot: 0.32 },  // Lower cervical arch
        { x: 0, y:  0.42, z:  0.24, rx: 0.20,  ryTop: 0.34,  ryBot: 0.26 },  // Mid cervical crest
        { x: 0, y:  0.72, z:  0.36, rx: 0.17,  ryTop: 0.30,  ryBot: 0.22 },  // Throatlatch
        { x: 0, y:  0.96, z:  0.46, rx: 0.18,  ryTop: 0.26,  ryBot: 0.24 },  // Poll (highest cranium peak)
        { x: 0, y:  0.86, z:  0.58, rx: 0.16,  ryTop: 0.22,  ryBot: 0.20 },  // Equine forehead
        { x: 0, y:  0.68, z:  0.70, rx: 0.14,  ryTop: 0.18,  ryBot: 0.16 },  // Upper nasal bridge
        { x: 0, y:  0.52, z:  0.80, rx: 0.12,  ryTop: 0.15,  ryBot: 0.14 },  // Mid nasal bridge
        { x: 0, y:  0.38, z:  0.88, rx: 0.10,  ryTop: 0.12,  ryBot: 0.11 },  // Muzzle snip
        { x: 0, y:  0.30, z:  0.94, rx: 0.001, ryTop: 0.001, ryBot: 0.001 }  // Closed velvet muzzle tip
      ];
      const neckHeadMesh = addShadows(new THREE.Mesh(createClosedLoftGeometry(neckHeadRings, 22), materials.body));
      neckGroup.add(neckHeadMesh);

      // Masseter Cheek Jowls (prominent equine jaw curve)
      const jowlGeo = new THREE.SphereGeometry(0.14, 16, 12);
      jowlGeo.scale(0.55, 1.1, 1.25);
      const jowlL = addShadows(new THREE.Mesh(jowlGeo, materials.body));
      jowlL.position.set(-0.13, 0.76, 0.48);
      jowlL.rotation.x = 0.45;
      neckGroup.add(jowlL);

      const jowlR = jowlL.clone();
      jowlR.position.x = 0.13;
      neckGroup.add(jowlR);

      // Velvet Muzzle Pad & Flared Nostrils
      const muzzleTipGeo = new THREE.SphereGeometry(0.10, 14, 10);
      muzzleTipGeo.scale(0.85, 0.9, 1.1);
      const muzzleTip = addShadows(new THREE.Mesh(muzzleTipGeo, materials.muzzleDark));
      muzzleTip.position.set(0, 0.35, 0.88);
      muzzleTip.rotation.x = 0.45;
      neckGroup.add(muzzleTip);

      const nostrilGeo = new THREE.SphereGeometry(0.030, 10, 8);
      const nostrilL = new THREE.Mesh(nostrilGeo, materials.nostril);
      nostrilL.position.set(-0.06, 0.34, 0.94);
      neckGroup.add(nostrilL);
      const nostrilR = nostrilL.clone();
      nostrilR.position.x = 0.06;
      neckGroup.add(nostrilR);

      // Lateral Almond Eyes with Eyelid Ridge
      const eyeGeo = new THREE.SphereGeometry(0.050, 14, 12);
      eyeGeo.scale(0.65, 1.0, 1.15);
      const eyeL = new THREE.Mesh(eyeGeo, materials.eye);
      eyeL.position.set(-0.16, 0.82, 0.58);
      neckGroup.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.16;
      neckGroup.add(eyeR);

      // Sculpted Equine Pinna Ears
      const createSculptedEar = (isLeft) => {
        const ear = new THREE.Group();
        const earGeo = new THREE.ConeGeometry(0.068, 0.26, 14);
        earGeo.scale(0.48, 1.0, 0.85);
        const earMesh = addShadows(new THREE.Mesh(earGeo, materials.body));
        ear.add(earMesh);
        ear.rotation.set(-0.25, isLeft ? -0.28 : 0.28, isLeft ? -0.22 : 0.22);
        ear.position.set(isLeft ? -0.11 : 0.11, 1.10, 0.42);
        return ear;
      };
      neckGroup.add(createSculptedEar(true));
      neckGroup.add(createSculptedEar(false));

      // Erect Roached Mane: 18 alternating black & white bristles along dorsal crest
      const maneGroup = new THREE.Group();
      const maneCount = 18;
      for (let i = 0; i < maneCount; i++) {
        const t = i / (maneCount - 1);
        const mat = (i % 2 === 0) ? materials.maneDark : materials.maneLight;
        const bristle = addShadows(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.075), mat));
        const my = -0.05 + t * 1.05;
        const mz = 0.06 + t * 0.40;
        bristle.position.set(0, my, mz);
        bristle.rotation.x = Math.PI * 0.22;
        maneGroup.add(bristle);
      }
      neckGroup.add(maneGroup);

      // Natural Tail: Dock and flowing hair tuft
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, 0.02, -0.92);
      torsoGroup.add(tailGroup);

      const dockGeo = new THREE.CylinderGeometry(0.042, 0.032, 0.42, 12);
      const dock = addShadows(new THREE.Mesh(dockGeo, materials.body));
      dock.position.set(0, -0.18, -0.06);
      dock.rotation.x = -0.32;
      tailGroup.add(dock);

      const brushGeo = new THREE.ConeGeometry(0.08, 0.58, 12);
      const brush = addShadows(new THREE.Mesh(brushGeo, materials.maneDark));
      brush.position.set(0, -0.52, -0.14);
      brush.rotation.x = -0.24;
      tailGroup.add(brush);

      // ── C. ARTICULATED EQUINE LIMBS WITH MUSCULAR GIRDLES ──
      const createForeleg = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        const hip = new THREE.Group();
        hip.position.set(sign * 0.36, -0.12, 0.54);
        torsoGroup.add(hip);

        // Muscular Scapular Shoulder (ellipsoid hugging the thoracic wall)
        const scapulaGeo = new THREE.SphereGeometry(0.18, 16, 12);
        scapulaGeo.scale(0.65, 1.4, 0.95);
        const scapula = addShadows(new THREE.Mesh(scapulaGeo, materials.leg));
        scapula.rotation.z = sign * 0.08;
        scapula.rotation.x = -0.15;
        scapula.position.set(sign * 0.02, -0.16, 0);
        hip.add(scapula);

        // Lower forearm (Radius bone)
        const forearmGeo = new THREE.CylinderGeometry(0.095, 0.075, 0.46, 16);
        const forearm = addShadows(new THREE.Mesh(forearmGeo, materials.leg));
        forearm.position.set(0, -0.48, 0.02);
        hip.add(forearm);

        // Knee (Carpus joint)
        const knee = new THREE.Group();
        knee.position.set(0, -0.72, 0.02);
        hip.add(knee);

        const kneeGeo = new THREE.SphereGeometry(0.078, 14, 10);
        knee.add(addShadows(new THREE.Mesh(kneeGeo, materials.leg)));

        // Slender Cannon Bone
        const cannonLen = 0.44;
        const cannonGeo = new THREE.CylinderGeometry(0.062, 0.054, cannonLen, 14);
        const cannon = addShadows(new THREE.Mesh(cannonGeo, materials.leg));
        cannon.position.set(0, -cannonLen * 0.5, 0);
        knee.add(cannon);

        // Fetlock Joint
        const fetlock = new THREE.Group();
        fetlock.position.set(0, -cannonLen, 0);
        knee.add(fetlock);

        const fetlockGeo = new THREE.SphereGeometry(0.062, 12, 10);
        fetlock.add(addShadows(new THREE.Mesh(fetlockGeo, materials.leg)));

        // 50-Degree Angled Pastern
        const pasternLen = 0.15;
        const pasternGeo = new THREE.CylinderGeometry(0.048, 0.054, pasternLen, 12);
        const pastern = addShadows(new THREE.Mesh(pasternGeo, materials.leg));
        pastern.rotation.x = Math.PI * 0.22;
        pastern.position.set(0, -0.07, 0.035);
        fetlock.add(pastern);

        // Flared Keratin Hoof
        const hoofGeo = new THREE.CylinderGeometry(0.054, 0.074, 0.10, 14);
        hoofGeo.scale(0.9, 1.0, 1.15);
        const hoof = addShadows(new THREE.Mesh(hoofGeo, materials.hoof));
        hoof.position.set(0, -0.15, 0.07);
        fetlock.add(hoof);

        return { hip, knee, fetlock, hoof };
      };

      const createHindleg = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        const hip = new THREE.Group();
        hip.position.set(sign * 0.34, -0.05, -0.62);
        torsoGroup.add(hip);

        // Muscular Pelvic Haunch (Gaskin / Stifle bulge)
        const haunchGeo = new THREE.SphereGeometry(0.24, 16, 12);
        haunchGeo.scale(0.72, 1.5, 1.1);
        const haunch = addShadows(new THREE.Mesh(haunchGeo, materials.leg));
        haunch.rotation.z = sign * 0.06;
        haunch.rotation.x = 0.12;
        haunch.position.set(sign * 0.02, -0.22, 0.02);
        hip.add(haunch);

        // Lower Thigh
        const gaskinGeo = new THREE.CylinderGeometry(0.12, 0.082, 0.44, 16);
        const gaskin = addShadows(new THREE.Mesh(gaskinGeo, materials.leg));
        gaskin.position.set(0, -0.54, -0.02);
        gaskin.rotation.x = -0.18;
        hip.add(gaskin);

        // Prominent Backward-Projecting Hock (Tarsus joint with calcaneus spur)
        const knee = new THREE.Group();
        knee.position.set(0, -0.74, -0.08);
        hip.add(knee);

        const hockGeo = new THREE.SphereGeometry(0.086, 14, 10);
        hockGeo.scale(0.85, 1.15, 1.45); // Pointing back
        knee.add(addShadows(new THREE.Mesh(hockGeo, materials.leg)));

        // Slender Hind Cannon Bone
        const cannonLen = 0.48;
        const cannonGeo = new THREE.CylinderGeometry(0.062, 0.054, cannonLen, 14);
        const cannon = addShadows(new THREE.Mesh(cannonGeo, materials.leg));
        cannon.position.set(0, -cannonLen * 0.5, 0.04);
        cannon.rotation.x = 0.12;
        knee.add(cannon);

        // Fetlock Joint
        const fetlock = new THREE.Group();
        fetlock.position.set(0, -cannonLen, 0.09);
        knee.add(fetlock);

        const fetlockGeo = new THREE.SphereGeometry(0.062, 12, 10);
        fetlock.add(addShadows(new THREE.Mesh(fetlockGeo, materials.leg)));

        // Angled Pastern
        const pasternLen = 0.15;
        const pasternGeo = new THREE.CylinderGeometry(0.048, 0.054, pasternLen, 12);
        const pastern = addShadows(new THREE.Mesh(pasternGeo, materials.leg));
        pastern.rotation.x = Math.PI * 0.22;
        pastern.position.set(0, -0.07, 0.035);
        fetlock.add(pastern);

        // Flared Hoof
        const hoofGeo = new THREE.CylinderGeometry(0.054, 0.074, 0.10, 14);
        hoofGeo.scale(0.9, 1.0, 1.15);
        const hoof = addShadows(new THREE.Mesh(hoofGeo, materials.hoof));
        hoof.position.set(0, -0.15, 0.07);
        fetlock.add(hoof);

        return { hip, knee, fetlock, hoof };
      };

      const legFL = createForeleg(true);
      const legFR = createForeleg(false);
      const legBL = createHindleg(true);
      const legBR = createHindleg(false);

      return {
        root: rootGroup,
        torso: torsoGroup,
        neck: neckGroup,
        tail: tailGroup,
        legFL, legFR, legBL, legBR
      };
    }

    const joints = buildRealisticZebra(scene);

    // ─── 5. HARMONIC BIOMECHANICAL KINEMATICS ENGINE ───
    let currentGait = 'walk';
    let speedMult = 1.0;

    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        speedMult = parseFloat(e.target.value) || 1.0;
      });
    }

    const gaitEl = document.getElementById('telemetry-gait');
    document.querySelectorAll('.btn-gait').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-gait').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGait = btn.getAttribute('data-gait');
        if (gaitEl) gaitEl.textContent = currentGait.toUpperCase();
      });
    });

    function updateKinematics(delta, time) {
      const t = time * speedMult;

      if (currentGait === 'rear') {
        // True majestic rear pose: Torso pitches upward (-0.78 rad)
        joints.torso.rotation.x = THREE.MathUtils.lerp(joints.torso.rotation.x, -0.78, 0.08);
        joints.torso.position.y = THREE.MathUtils.lerp(joints.torso.position.y, 1.68, 0.08);
        joints.torso.position.z = THREE.MathUtils.lerp(joints.torso.position.z, -0.22, 0.08);

        // Forelimbs elevated pawing the air
        joints.legFL.hip.rotation.x = THREE.MathUtils.lerp(joints.legFL.hip.rotation.x, -0.55 + Math.sin(t * 5.0) * 0.25, 0.1);
        joints.legFR.hip.rotation.x = THREE.MathUtils.lerp(joints.legFR.hip.rotation.x, -0.45 + Math.cos(t * 5.0) * 0.25, 0.1);
        joints.legFL.knee.rotation.x = THREE.MathUtils.lerp(joints.legFL.knee.rotation.x, 0.85, 0.1);
        joints.legFR.knee.rotation.x = THREE.MathUtils.lerp(joints.legFR.knee.rotation.x, 0.65, 0.1);

        // Hindlegs crouched firmly supporting weight
        joints.legBL.hip.rotation.x = THREE.MathUtils.lerp(joints.legBL.hip.rotation.x, 0.72, 0.08);
        joints.legBR.hip.rotation.x = THREE.MathUtils.lerp(joints.legBR.hip.rotation.x, 0.72, 0.08);
        joints.legBL.knee.rotation.x = THREE.MathUtils.lerp(joints.legBL.knee.rotation.x, -0.65, 0.08);
        joints.legBR.knee.rotation.x = THREE.MathUtils.lerp(joints.legBR.knee.rotation.x, -0.65, 0.08);

        // Proud tucked head posture
        joints.neck.rotation.x = THREE.MathUtils.lerp(joints.neck.rotation.x, 0.32, 0.08);
        // Tail hangs downwards with gravity
        joints.tail.rotation.x = THREE.MathUtils.lerp(joints.tail.rotation.x, 0.75, 0.08);
        return;
      }

      // Reset torso pitch when not rearing
      joints.torso.rotation.x = THREE.MathUtils.lerp(joints.torso.rotation.x, 0, 0.08);
      joints.torso.position.y = THREE.MathUtils.lerp(joints.torso.position.y, 1.40, 0.08);
      joints.torso.position.z = THREE.MathUtils.lerp(joints.torso.position.z, 0, 0.08);

      if (currentGait === 'walk') {
        const freq = 4.2;
        const amp = 0.38;

        const pFL = t * freq;
        const pBL = t * freq + Math.PI * 1.5;
        const pFR = t * freq + Math.PI;
        const pBR = t * freq + Math.PI * 0.5;

        joints.legFL.hip.rotation.x = Math.sin(pFL) * amp;
        joints.legFR.hip.rotation.x = Math.sin(pFR) * amp;
        joints.legBL.hip.rotation.x = Math.sin(pBL) * amp;
        joints.legBR.hip.rotation.x = Math.sin(pBR) * amp;

        // Knee / Hock flexion during forward swing
        joints.legFL.knee.rotation.x = Math.max(0, -Math.sin(pFL) * 0.45);
        joints.legFR.knee.rotation.x = Math.max(0, -Math.sin(pFR) * 0.45);
        joints.legBL.knee.rotation.x = Math.min(0, Math.sin(pBL) * 0.40);
        joints.legBR.knee.rotation.x = Math.min(0, Math.sin(pBR) * 0.40);

        // Subtle neck bobbing and tail sway
        joints.neck.rotation.x = Math.sin(t * freq * 2) * 0.04;
        joints.tail.rotation.x = THREE.MathUtils.lerp(joints.tail.rotation.x, 0, 0.05);
        joints.tail.rotation.z = Math.sin(t * freq) * 0.12;

      } else if (currentGait === 'trot') {
        const freq = 6.5;
        const amp = 0.50;
        const p1 = t * freq;
        const p2 = t * freq + Math.PI;

        joints.legFL.hip.rotation.x = Math.sin(p1) * amp;
        joints.legBR.hip.rotation.x = Math.sin(p1) * amp;
        joints.legFR.hip.rotation.x = Math.sin(p2) * amp;
        joints.legBL.hip.rotation.x = Math.sin(p2) * amp;

        joints.legFL.knee.rotation.x = Math.max(0, -Math.sin(p1) * 0.65);
        joints.legBR.knee.rotation.x = Math.min(0, Math.sin(p1) * 0.55);
        joints.legFR.knee.rotation.x = Math.max(0, -Math.sin(p2) * 0.65);
        joints.legBL.knee.rotation.x = Math.min(0, Math.sin(p2) * 0.55);

        joints.neck.rotation.x = Math.sin(t * freq * 2) * 0.06;
      } else if (currentGait === 'gallop') {
        const freq = 8.5;
        const amp = 0.68;
        const p = t * freq;

        joints.legFL.hip.rotation.x = Math.sin(p) * amp;
        joints.legFR.hip.rotation.x = Math.sin(p + 0.4) * amp;
        joints.legBL.hip.rotation.x = Math.sin(p + Math.PI) * amp;
        joints.legBR.hip.rotation.x = Math.sin(p + Math.PI + 0.4) * amp;

        joints.legFL.knee.rotation.x = Math.max(0, -Math.sin(p) * 0.8);
        joints.legFR.knee.rotation.x = Math.max(0, -Math.sin(p + 0.4) * 0.8);
        joints.legBL.knee.rotation.x = Math.min(0, Math.sin(p + Math.PI) * 0.7);
        joints.legBR.knee.rotation.x = Math.min(0, Math.sin(p + Math.PI + 0.4) * 0.7);
      } else { // Idle
        joints.legFL.hip.rotation.x = THREE.MathUtils.lerp(joints.legFL.hip.rotation.x, 0, 0.05);
        joints.legFR.hip.rotation.x = THREE.MathUtils.lerp(joints.legFR.hip.rotation.x, 0, 0.05);
        joints.legBL.hip.rotation.x = THREE.MathUtils.lerp(joints.legBL.hip.rotation.x, 0, 0.05);
        joints.legBR.hip.rotation.x = THREE.MathUtils.lerp(joints.legBR.hip.rotation.x, 0, 0.05);
        joints.neck.rotation.x = Math.sin(t * 1.5) * 0.02; // breathing
        joints.tail.rotation.z = Math.sin(t * 0.8) * 0.08;
      }
    }

    // Telemetry
    let meshCount = 0;
    scene.traverse(o => { if (o.isMesh && o !== ground && o !== grid) meshCount++; });
    const meshEl = document.getElementById('telemetry-meshes');
    if (meshEl) meshEl.textContent = meshCount;

    // Render loop
    const clock = new THREE.Clock();
    let frameTimes = [];
    const fpsEl = document.getElementById('telemetry-fps');

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      controls.update();
      updateKinematics(delta, time);
      renderer.render(scene, camera);

      const now = performance.now();
      frameTimes.push(now);
      while (frameTimes.length > 0 && frameTimes[0] < now - 1000) frameTimes.shift();
      if (fpsEl && frameTimes.length > 0) fpsEl.textContent = frameTimes.length;
    }
    animate();
  });
  </script>
</body>
</html>`;

async function main() {
  const outPath = path.resolve('workspace/game_equus_quagga_realistic_v4.html');
  fs.writeFileSync(outPath, htmlContent, 'utf8');
  console.log('✓ Wrote prototype v4 to: ' + outPath);

  console.log('Launching Playwright Chrome to verify realism v4...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const targetUrl = 'http://localhost:3009/workspace/game_equus_quagga_realistic_v4.html';
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const telemetry = await page.evaluate(() => {
    let meshes = 0;
    try {
      if (window.__threeScene) {
        window.__threeScene.traverse((o) => {
          if (o.isMesh && o.geometry?.type !== 'PlaneGeometry' && o.type !== 'GridHelper') meshes++;
        });
      }
    } catch (_) {}
    return {
      meshes,
      fps: document.getElementById('telemetry-fps')?.textContent,
      meshCountTxt: document.getElementById('telemetry-meshes')?.textContent,
      gait: document.getElementById('telemetry-gait')?.textContent,
    };
  });
  console.log('Empirical Telemetry v4:', telemetry);

  // Walk pose screenshot
  const shot1 = path.resolve('client/images/realistic_zebra_v4_walk.png');
  await page.screenshot({ path: shot1 });
  try {
    fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, 'realistic_zebra_v4_walk.png'));
  } catch (_) {}
  console.log('✓ Captured Walk Pose v4: ' + shot1);

  // Rear pose click & screenshot
  const rearBtn = await page.$('button[data-gait="rear"]');
  if (rearBtn) {
    await rearBtn.click();
    await page.waitForTimeout(2000);
  }
  const shot2 = path.resolve('client/images/realistic_zebra_v4_rear.png');
  await page.screenshot({ path: shot2 });
  try {
    fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, 'realistic_zebra_v4_rear.png'));
  } catch (_) {}
  console.log('✓ Captured Rear Pose v4: ' + shot2);

  await browser.close();
  console.log('=== VERIFICATION OF REALISM V4 COMPLETED ===');
}

main().catch((err) => {
  console.error('Fatal in test:', err);
  process.exit(1);
});
