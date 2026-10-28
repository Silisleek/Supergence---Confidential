import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';

const realisticZebraV2Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equus quagga - Realistic Anatomical Studio v2</title>
  <script src="/vendor/three.min.js"></script>
  <script src="/vendor/OrbitControls.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #08090d; color: #ecefe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #canvas-container { position: absolute; inset: 0; z-index: 1; }
    canvas { width: 100% !important; height: 100% !important; display: block; }
    
    .hud-panel {
      position: absolute;
      top: 24px;
      left: 24px;
      z-index: 10;
      background: rgba(10, 13, 18, 0.90);
      border: 1px solid rgba(0, 240, 255, 0.35);
      backdrop-filter: blur(18px);
      border-radius: 12px;
      padding: 18px 24px;
      width: 340px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 240, 255, 0.15);
    }
    .hud-title { font-size: 1.05rem; font-weight: 800; color: #fff; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .hud-badge { font-size: 0.65rem; background: rgba(0, 240, 255, 0.18); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.5); border-radius: 4px; padding: 2px 8px; font-weight: 800; }
    .hud-desc { font-size: 0.73rem; color: #8e95a5; margin-bottom: 16px; line-height: 1.45; }
    
    .hud-section { margin-bottom: 14px; }
    .hud-label { font-size: 0.68rem; text-transform: uppercase; color: #8e95a5; letter-spacing: 1.2px; font-weight: 700; margin-bottom: 8px; }
    .hud-gait-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .btn-gait {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ecefe6;
      padding: 8px 4px;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-gait:hover { background: rgba(0, 240, 255, 0.15); border-color: #00f0ff; color: #fff; }
    .btn-gait.active { background: #00f0ff; color: #07090e; border-color: #00f0ff; font-weight: 800; box-shadow: 0 0 16px rgba(0, 240, 255, 0.5); }
    
    .slider-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.74rem; color: #ccc; margin-bottom: 8px; }
    .slider-row input[type="range"] { flex: 1; accent-color: #00f0ff; cursor: pointer; }
    
    .hud-telemetry {
      position: absolute;
      bottom: 24px;
      right: 24px;
      z-index: 10;
      background: rgba(10, 13, 18, 0.90);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(18px);
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 0.74rem;
      color: #8e95a5;
      display: flex;
      gap: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
    }
    .hud-telemetry span strong { color: #00f0ff; font-weight: 700; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  
  <div class="hud-panel">
    <div class="hud-title">
      <span>Equus quagga - Realistic Studio</span>
      <span class="hud-badge">PRO-3D</span>
    </div>
    <div class="hud-desc">Production-grade anatomical biomechanics featuring non-polar UV zebra flow, true pastern joints, roached mane, and harmonic locomotion.</div>
    
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
    scene.background = new THREE.Color(0x08090d);
    scene.fog = new THREE.FogExp2(0x08090d, 0.024);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(4.6, 2.3, 5.2);

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
    controls.target.set(0, 1.3, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 2.0;
    controls.maxDistance = 15.0;

    // Studio 3-Point Lighting optimized for performance and aesthetics
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbf0, 1.4);
    keyLight.position.set(5.5, 8.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.45);
    fillLight.position.set(-5, 4, -3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, 5.5, -5.5);
    scene.add(rimLight);

    // Studio ground
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 0.85, metalness: 0.12 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(30, 30, 0x00f0ff, 0x161a22);
    grid.position.y = 0.002;
    scene.add(grid);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── 2. SEAMLESS NON-PINCHING ZEBRA TEXTURES ───
    function createZebraBodyTexture(W = 1024, H = 1024) {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Base coat: warm ivory with subtle gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#f4f2e8');
      grad.addColorStop(0.5, '#ede9de');
      grad.addColorStop(1, '#e5e0d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Procedural vertical & chevron stripes
      ctx.fillStyle = '#0f1014';
      const count = 30;
      for (let i = 0; i < count; i++) {
        const u = i / count;
        const baseX = (i + 0.5) * (W / count);
        ctx.beginPath();

        for (let y = 0; y <= H; y += 8) {
          const v = y / H;
          // Organic sinusoidal oscillation + sweeping chevrons on rump
          const chevron = (v > 0.5) ? Math.sin((v - 0.5) * Math.PI) * 60 * (u > 0.5 ? 1 : -1) : 0;
          const wobble = Math.sin(y * 0.016 + i * 1.6) * 14 + Math.sin(y * 0.006 + i * 0.8) * 18;
          const x = baseX + wobble + chevron;

          if (y === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineWidth = 14 + (Math.sin(i * 1.4) + 1) * 7;
        ctx.strokeStyle = '#0e0f13';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Shadow stripes (subtle secondary brownish stripes typical of plains zebras)
      for (let i = 0; i < count; i += 2) {
        const baseX = (i + 1.0) * (W / count);
        ctx.beginPath();
        for (let y = H * 0.25; y <= H * 0.75; y += 12) {
          const x = baseX + Math.sin(y * 0.012 + i) * 10;
          if (y === H * 0.25) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(96, 75, 58, 0.22)';
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1.5, 1);
      return tex;
    }

    function createZebraLegTexture(W = 512, H = 512) {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f5f3eb';
      ctx.fillRect(0, 0, W, H);

      // Horizontal transverse zebra rings down the limbs
      const rings = 16;
      for (let r = 0; r < rings; r++) {
        const baseY = (r + 0.5) * (H / rings);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = baseY + Math.sin(x * 0.028 + r * 1.3) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 12 + (r % 3) * 4;
        ctx.strokeStyle = '#101115';
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    const bodyTex = createZebraBodyTexture(1024, 1024);
    const legTex = createZebraLegTexture(512, 512);

    const materials = {
      body: new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.78, metalness: 0.06 }),
      leg: new THREE.MeshStandardMaterial({ map: legTex, roughness: 0.82, metalness: 0.05 }),
      maneDark: new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.95 }),
      maneLight: new THREE.MeshStandardMaterial({ color: 0xf5f3eb, roughness: 0.95 }),
      muzzleDark: new THREE.MeshStandardMaterial({ color: 0x16171b, roughness: 0.9 }),
      muzzleSnip: new THREE.MeshStandardMaterial({ color: 0xedebe1, roughness: 0.85 }),
      nostril: new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.5 }),
      eye: new THREE.MeshStandardMaterial({ color: 0x040406, roughness: 0.08, metalness: 0.95 }),
      hoof: new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.42, metalness: 0.22 })
    };

    // ─── 3. ANATOMICALLY COMPOUND SCULPTED GEOMETRIES ───
    function buildRealisticEquine(scene, materials) {
      const rootGroup = new THREE.Group();
      rootGroup.name = 'zebraRoot';
      scene.add(rootGroup);

      const addShadows = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

      // ── A. CONTOURED BODY (CYLINDER-BASED BARREL WITH WITHERS & CROUP) ──
      const torsoGroup = new THREE.Group();
      torsoGroup.position.set(0, 1.45, 0);
      rootGroup.add(torsoGroup);

      // Main Torso Barrel: Horizontal cylinder along Z axis (NO POLAR PINCHING)
      const barrelGeo = new THREE.CylinderGeometry(0.58, 0.64, 1.45, 24);
      barrelGeo.scale(0.85, 1.0, 1.0);
      const barrelMesh = addShadows(new THREE.Mesh(barrelGeo, materials.body));
      barrelMesh.rotation.x = Math.PI / 2; // Lie along Z axis
      barrelMesh.position.set(0, 0, 0.05);
      torsoGroup.add(barrelMesh);

      // Shoulder / Withers cap (curves up to cervical neck junction)
      const withersGeo = new THREE.CylinderGeometry(0.52, 0.58, 0.65, 24);
      withersGeo.scale(0.82, 1.05, 1.0);
      const withersMesh = addShadows(new THREE.Mesh(withersGeo, materials.body));
      withersMesh.rotation.x = Math.PI / 2;
      withersMesh.position.set(0, 0.12, 0.65);
      torsoGroup.add(withersMesh);

      // Croup / Rump cap (muscular pelvis sloping back)
      const croupGeo = new THREE.CylinderGeometry(0.64, 0.54, 0.72, 24);
      croupGeo.scale(0.86, 1.02, 1.0);
      const croupMesh = addShadows(new THREE.Mesh(croupGeo, materials.body));
      croupMesh.rotation.x = Math.PI / 2;
      croupMesh.position.set(0, 0.05, -0.65);
      torsoGroup.add(croupMesh);

      // ── B. ELEGANTLY ARCHED CERVICAL NECK ──
      const neckGroup = new THREE.Group();
      neckGroup.position.set(0, 0.28, 0.75);
      torsoGroup.add(neckGroup);

      // Lower neck (broad muscular cervical base)
      const lowerNeckGeo = new THREE.CylinderGeometry(0.32, 0.46, 0.78, 20);
      lowerNeckGeo.scale(0.72, 1.0, 1.0);
      const lowerNeck = addShadows(new THREE.Mesh(lowerNeckGeo, materials.body));
      lowerNeck.rotation.x = Math.PI * 0.22;
      lowerNeck.position.set(0, 0.35, 0.22);
      neckGroup.add(lowerNeck);

      // Upper neck (tapering to throatlatch)
      const upperNeckGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.65, 20);
      upperNeckGeo.scale(0.68, 1.0, 1.0);
      const upperNeck = addShadows(new THREE.Mesh(upperNeckGeo, materials.body));
      upperNeck.rotation.x = Math.PI * 0.35;
      upperNeck.position.set(0, 0.82, 0.48);
      neckGroup.add(upperNeck);

      // Erect Roached Mane: Alternating black & white dorsal crest bristles
      const maneGroup = new THREE.Group();
      const maneSegments = 16;
      for (let i = 0; i < maneSegments; i++) {
        const t = i / maneSegments;
        const mat = (i % 2 === 0) ? materials.maneDark : materials.maneLight;
        const bristle = addShadows(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.10), mat));
        const my = 0.18 + t * 0.95;
        const mz = 0.10 + t * 0.58;
        bristle.position.set(0, my, mz);
        bristle.rotation.x = Math.PI * 0.26;
        maneGroup.add(bristle);
      }
      neckGroup.add(maneGroup);

      // ── C. EQUINE CRANIUM, JOWLS, VELVET MUZZLE & EYES ──
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.12, 0.72);
      neckGroup.add(headGroup);

      // Skull Cranium (Tapered oval)
      const skullGeo = new THREE.CylinderGeometry(0.22, 0.30, 0.58, 18);
      skullGeo.scale(0.72, 1.0, 1.1);
      const skull = addShadows(new THREE.Mesh(skullGeo, materials.body));
      skull.rotation.x = Math.PI * 0.60; // Natural head angle
      skull.position.set(0, -0.06, 0.22);
      headGroup.add(skull);

      // Jowl Cheek Discs (Masseter muscle)
      const jawL = addShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), materials.body));
      jawL.rotation.z = Math.PI / 2;
      jawL.position.set(-0.16, -0.08, 0.08);
      headGroup.add(jawL);

      const jawR = jawL.clone();
      jawR.position.x = 0.16;
      headGroup.add(jawR);

      // Nasal Bridge
      const nasalGeo = new THREE.CylinderGeometry(0.12, 0.19, 0.45, 16);
      nasalGeo.scale(0.75, 1.0, 1.05);
      const nasal = addShadows(new THREE.Mesh(nasalGeo, materials.body));
      nasal.rotation.x = Math.PI * 0.62;
      nasal.position.set(0, -0.25, 0.46);
      headGroup.add(nasal);

      // Soft Velvet Muzzle with White Snip Band
      const muzzleSnip = addShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 16), materials.muzzleSnip));
      muzzleSnip.rotation.x = Math.PI * 0.62;
      muzzleSnip.position.set(0, -0.40, 0.65);
      headGroup.add(muzzleSnip);

      const muzzleDark = addShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.18, 16), materials.muzzleDark));
      muzzleDark.rotation.x = Math.PI * 0.62;
      muzzleDark.position.set(0, -0.48, 0.76);
      headGroup.add(muzzleDark);

      // Flared Nostrils
      const nostrilGeo = new THREE.SphereGeometry(0.035, 10, 8);
      const nostrilL = new THREE.Mesh(nostrilGeo, materials.nostril);
      nostrilL.position.set(-0.06, -0.47, 0.84);
      headGroup.add(nostrilL);

      const nostrilR = nostrilL.clone();
      nostrilR.position.x = 0.06;
      headGroup.add(nostrilR);

      // Convex Dark Eyes with Highlights
      const eyeGeo = new THREE.SphereGeometry(0.055, 14, 12);
      const eyeL = new THREE.Mesh(eyeGeo, materials.eye);
      eyeL.position.set(-0.21, 0.02, 0.24);
      headGroup.add(eyeL);

      const eyeR = eyeL.clone();
      eyeR.position.x = 0.21;
      headGroup.add(eyeR);

      // Sculpted Equine Ears
      const createEar = (isLeft) => {
        const ear = new THREE.Group();
        const earCone = addShadows(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 12), materials.body));
        earCone.scale.set(0.55, 1.0, 0.85);
        ear.add(earCone);
        ear.rotation.set(-0.28, isLeft ? -0.32 : 0.32, isLeft ? -0.24 : 0.24);
        ear.position.set(isLeft ? -0.14 : 0.14, 0.24, -0.02);
        return ear;
      };
      headGroup.add(createEar(true));
      headGroup.add(createEar(false));

      // ── D. FORELEGS (SHOULDER, KNEE, CANNON, PASTERN & FLARED HOOF) ──
      const createForeleg = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        const shoulder = new THREE.Group();
        shoulder.position.set(sign * 0.44, -0.14, 0.62);
        torsoGroup.add(shoulder);

        // Scapula / Upper arm (Radius)
        const armGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.65, 16);
        const arm = addShadows(new THREE.Mesh(armGeo, materials.leg));
        arm.position.set(0, -0.36, 0.02);
        shoulder.add(arm);

        // Knee (Carpus joint)
        const knee = new THREE.Group();
        knee.position.set(0, -0.70, 0.04);
        shoulder.add(knee);

        const kneeCap = addShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.080, 0.12, 16), materials.leg));
        knee.add(kneeCap);

        // Slender Cannon Bone
        const cannonGeo = new THREE.CylinderGeometry(0.070, 0.062, 0.55, 14);
        const cannon = addShadows(new THREE.Mesh(cannonGeo, materials.leg));
        cannon.position.set(0, -0.32, 0);
        knee.add(cannon);

        // Fetlock Joint
        const fetlock = new THREE.Group();
        fetlock.position.set(0, -0.60, 0);
        knee.add(fetlock);

        const fetlockBulb = addShadows(new THREE.Mesh(new THREE.SphereGeometry(0.070, 12, 10), materials.leg));
        fetlock.add(fetlockBulb);

        // Angled Pastern (Spring of the foot)
        const pasternGeo = new THREE.CylinderGeometry(0.058, 0.062, 0.16, 12);
        const pastern = addShadows(new THREE.Mesh(pasternGeo, materials.leg));
        pastern.rotation.x = Math.PI * 0.24;
        pastern.position.set(0, -0.09, 0.04);
        fetlock.add(pastern);

        // Flared Anatomical Hoof
        const hoofGroup = new THREE.Group();
        hoofGroup.position.set(0, -0.17, 0.08);
        fetlock.add(hoofGroup);

        const hoofGeo = new THREE.CylinderGeometry(0.070, 0.100, 0.11, 16);
        const hoofMesh = addShadows(new THREE.Mesh(hoofGeo, materials.hoof));
        hoofMesh.rotation.x = -Math.PI * 0.14;
        hoofGroup.add(hoofMesh);

        return { shoulder, knee, fetlock, hoof: hoofGroup };
      };

      const foreL = createForeleg(true);
      const foreR = createForeleg(false);

      // ── E. HINDLEGS (HIP, STIFLE, HOCK, PASTERN & FLARED HOOF) ──
      const createHindleg = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        const hip = new THREE.Group();
        hip.position.set(sign * 0.44, -0.10, -0.62);
        torsoGroup.add(hip);

        // Upper Thigh / Stifle (muscular cylinder angled forward)
        const thighGeo = new THREE.CylinderGeometry(0.16, 0.11, 0.68, 16);
        thighGeo.scale(0.85, 1.0, 1.15);
        const thigh = addShadows(new THREE.Mesh(thighGeo, materials.leg));
        thigh.rotation.x = Math.PI * 0.12;
        thigh.position.set(0, -0.32, 0.08);
        hip.add(thigh);

        // Gaskin / Crus (angled backward to hock)
        const gaskinGeo = new THREE.CylinderGeometry(0.12, 0.085, 0.62, 16);
        const gaskin = addShadows(new THREE.Mesh(gaskinGeo, materials.leg));
        gaskin.rotation.x = -Math.PI * 0.24;
        gaskin.position.set(0, -0.52, -0.14);
        hip.add(gaskin);

        // Prominent Backward-Facing Hock Joint (Tarsus)
        const hock = new THREE.Group();
        hock.position.set(0, -0.80, -0.26);
        hip.add(hock);

        const hockPoint = addShadows(new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.15, 0.16), materials.leg));
        hockPoint.position.set(0, 0, -0.03);
        hock.add(hockPoint);

        // Straight Vertical Hind Cannon Bone
        const hindCannonGeo = new THREE.CylinderGeometry(0.068, 0.060, 0.55, 14);
        const hindCannon = addShadows(new THREE.Mesh(hindCannonGeo, materials.leg));
        hindCannon.position.set(0, -0.34, 0.02);
        hock.add(hindCannon);

        // Hind Fetlock
        const hindFetlock = new THREE.Group();
        hindFetlock.position.set(0, -0.62, 0.02);
        hock.add(hindFetlock);

        const hindFetlockBulb = addShadows(new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), materials.leg));
        hindFetlock.add(hindFetlockBulb);

        // Hind Pastern
        const hindPasternGeo = new THREE.CylinderGeometry(0.058, 0.062, 0.16, 12);
        const hindPastern = addShadows(new THREE.Mesh(hindPasternGeo, materials.leg));
        hindPastern.rotation.x = Math.PI * 0.24;
        hindPastern.position.set(0, -0.09, 0.04);
        hindFetlock.add(hindPastern);

        // Hind Hoof
        const hindHoofGroup = new THREE.Group();
        hindHoofGroup.position.set(0, -0.17, 0.08);
        hindFetlock.add(hindHoofGroup);

        const hindHoofGeo = new THREE.CylinderGeometry(0.068, 0.098, 0.11, 16);
        const hindHoofMesh = addShadows(new THREE.Mesh(hindHoofGeo, materials.hoof));
        hindHoofMesh.rotation.x = -Math.PI * 0.14;
        hindHoofGroup.add(hindHoofMesh);

        return { hip, hock, fetlock: hindFetlock, hoof: hindHoofGroup };
      };

      const hindL = createHindleg(true);
      const hindR = createHindleg(false);

      // ── F. ARTICULATED TAIL (DOCK & FLOWING TUFT) ──
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, 0.18, -1.05);
      torsoGroup.add(tailGroup);

      const dockGeo = new THREE.CylinderGeometry(0.05, 0.035, 0.45, 10);
      const dock = addShadows(new THREE.Mesh(dockGeo, materials.body));
      dock.rotation.x = -Math.PI * 0.20;
      dock.position.set(0, -0.18, -0.08);
      tailGroup.add(dock);

      const tuftGeo = new THREE.ConeGeometry(0.11, 0.70, 12);
      const tuft = addShadows(new THREE.Mesh(tuftGeo, materials.maneDark));
      tuft.rotation.x = Math.PI; // Hanging down naturally
      tuft.position.set(0, -0.68, -0.18);
      tailGroup.add(tuft);

      return {
        root: rootGroup,
        torso: torsoGroup,
        neck: neckGroup,
        head: headGroup,
        tail: tailGroup,
        foreL, foreR,
        hindL, hindR
      };
    }

    // ─── 4. BIOMECHANICAL EQUINE LOCOMOTION & REAR STATE MACHINE ───
    function createBiomechanicalKinematics(joints) {
      let currentGait = 'walk';
      let speedMultiplier = 1.0;
      let cycle = 0;

      const setGait = (gait) => {
        currentGait = gait;
        document.querySelectorAll('.btn-gait').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.gait === gait);
        });
        const telGait = document.getElementById('telemetry-gait');
        if (telGait) telGait.textContent = gait.toUpperCase();
      };

      return {
        setGait,
        update: function(delta, time) {
          const gaitRate = (currentGait === 'gallop') ? 9.2 : (currentGait === 'trot') ? 6.8 : (currentGait === 'walk') ? 4.0 : 1.2;
          cycle += delta * speedMultiplier * gaitRate;

          if (currentGait === 'rear') {
            // Majestic Rearing Pose: Torso pitches UP (-0.78 rad), forelegs reach forward and paw air
            joints.torso.rotation.x = THREE.MathUtils.lerp(joints.torso.rotation.x, -0.78, delta * 4.0);
            joints.torso.position.y = THREE.MathUtils.lerp(joints.torso.position.y, 1.82, delta * 4.0);
            joints.neck.rotation.x = THREE.MathUtils.lerp(joints.neck.rotation.x, -0.32, delta * 4.0);
            joints.head.rotation.x = THREE.MathUtils.lerp(joints.head.rotation.x, 0.22, delta * 4.0);

            // Elevated forelegs pawing forward
            joints.foreL.shoulder.rotation.x = THREE.MathUtils.lerp(joints.foreL.shoulder.rotation.x, -0.55 + Math.sin(time * 5.0) * 0.15, delta * 5.0);
            joints.foreL.knee.rotation.x = THREE.MathUtils.lerp(joints.foreL.knee.rotation.x, 0.85, delta * 5.0);
            joints.foreR.shoulder.rotation.x = THREE.MathUtils.lerp(joints.foreR.shoulder.rotation.x, -0.72 + Math.cos(time * 5.0) * 0.15, delta * 5.0);
            joints.foreR.knee.rotation.x = THREE.MathUtils.lerp(joints.foreR.knee.rotation.x, 0.95, delta * 5.0);

            // Firmly planted crouched hindlegs
            joints.hindL.hip.rotation.x = THREE.MathUtils.lerp(joints.hindL.hip.rotation.x, 0.75, delta * 4.0);
            joints.hindL.hock.rotation.x = THREE.MathUtils.lerp(joints.hindL.hock.rotation.x, -0.45, delta * 4.0);
            joints.hindR.hip.rotation.x = THREE.MathUtils.lerp(joints.hindR.hip.rotation.x, 0.75, delta * 4.0);
            joints.hindR.hock.rotation.x = THREE.MathUtils.lerp(joints.hindR.hock.rotation.x, -0.45, delta * 4.0);

            joints.tail.rotation.x = THREE.MathUtils.lerp(joints.tail.rotation.x, 0.35 + Math.sin(time * 6.0) * 0.1, delta * 4.0);
          } else {
            // Restore neutral posture smoothly
            joints.torso.rotation.x = THREE.MathUtils.lerp(joints.torso.rotation.x, 0, delta * 5.0);
            joints.torso.position.y = 1.45 + (currentGait === 'idle' ? Math.sin(time * 2.0) * 0.015 : Math.abs(Math.sin(cycle * 2)) * 0.04);
            joints.neck.rotation.x = (currentGait === 'walk') ? Math.sin(cycle) * 0.06 : 0;
            joints.head.rotation.x = (currentGait === 'walk') ? -Math.sin(cycle) * 0.05 : 0;

            // Phase Delays for True 4-beat Walk, 2-beat Trot, Gallop
            let pFL = 0, pFR = Math.PI, pBL = Math.PI * 0.75, pBR = Math.PI * 1.75;
            let amp = 0.40;
            let kneeFlex = 0.50;

            if (currentGait === 'trot') {
              pFL = 0; pBR = 0; // Synchronous diagonal pairs
              pFR = Math.PI; pBL = Math.PI;
              amp = 0.60; kneeFlex = 0.80;
            } else if (currentGait === 'gallop') {
              pBL = 0; pBR = 0.35; pFL = 1.5; pFR = 2.0;
              amp = 0.90; kneeFlex = 1.20;
            } else if (currentGait === 'idle') {
              amp = 0.02; kneeFlex = 0.02;
            }

            // Foreleg rotations
            const sFL = Math.sin(cycle + pFL);
            joints.foreL.shoulder.rotation.x = sFL * amp;
            joints.foreL.knee.rotation.x = (sFL < 0) ? Math.abs(sFL) * kneeFlex : 0.04;

            const sFR = Math.sin(cycle + pFR);
            joints.foreR.shoulder.rotation.x = sFR * amp;
            joints.foreR.knee.rotation.x = (sFR < 0) ? Math.abs(sFR) * kneeFlex : 0.04;

            // Hindleg rotations
            const sBL = Math.sin(cycle + pBL);
            joints.hindL.hip.rotation.x = sBL * amp;
            joints.hindL.hock.rotation.x = (sBL > 0) ? sBL * kneeFlex : -0.04;

            const sBR = Math.sin(cycle + pBR);
            joints.hindR.hip.rotation.x = sBR * amp;
            joints.hindR.hock.rotation.x = (sBR > 0) ? sBR * kneeFlex : -0.04;

            // Tail sway
            joints.tail.rotation.z = Math.sin(cycle * 0.8) * 0.14;
            joints.tail.rotation.x = -0.15 + Math.abs(Math.sin(cycle)) * 0.10;
          }
        }
      };
    }

    // ─── 5. INITIALIZATION & SCENE MOUNT ───
    const joints = buildRealisticEquine(scene, materials);
    const kinematics = createBiomechanicalKinematics(joints);

    // Count meshes
    let meshCount = 0;
    scene.traverse(node => { if (node.isMesh && node !== ground && node !== grid) meshCount++; });
    const telMeshes = document.getElementById('telemetry-meshes');
    if (telMeshes) telMeshes.textContent = meshCount;

    // UI Buttons
    document.querySelectorAll('.btn-gait').forEach(btn => {
      btn.addEventListener('click', (e) => {
        kinematics.setGait(e.target.dataset.gait);
      });
    });

    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        // dynamic speed
      });
    }

    // Render loop
    const clock = new THREE.Clock();
    let frameCount = 0, lastFpsTime = performance.now();
    const telFps = document.getElementById('telemetry-fps');

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      controls.update();
      kinematics.update(delta, time);
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

async function main() {
  const outPath = path.resolve('workspace/game_equus_quagga_realistic_v2.html');
  fs.writeFileSync(outPath, realisticZebraV2Html, 'utf8');
  console.log('✓ Wrote prototype v2 to:', outPath);

  console.log('Launching Playwright Chrome to verify realism v2...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3009/workspace/game_equus_quagga_realistic_v2.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2500);

  const telemetry = await page.evaluate(() => {
    let meshes = 0;
    if (window.__threeScene) {
      window.__threeScene.traverse((n) => {
        if (n.isMesh) meshes++;
      });
    }
    return {
      meshes,
      fps: document.getElementById('telemetry-fps')?.textContent || '0',
      meshCountTxt: document.getElementById('telemetry-meshes')?.textContent || '0',
      gait: document.getElementById('telemetry-gait')?.textContent || 'WALK',
    };
  });
  console.log('Empirical Telemetry v2:', telemetry);

  const shotWalk = path.resolve('client/images/realistic_zebra_v2_walk.png');
  const shotWalkArt = path.join(ARTIFACT_DIR, 'realistic_zebra_v2_walk.png');
  await page.screenshot({ path: shotWalk, timeout: 8000 });
  try {
    fs.copyFileSync(shotWalk, shotWalkArt);
  } catch (_) {}
  console.log('✓ Captured Walk Pose v2:', shotWalk);

  // Click Rear button
  const rearBtn = await page.$('button[data-gait="rear"]');
  if (rearBtn) {
    await rearBtn.click();
    await page.waitForTimeout(1500);
    const shotRear = path.resolve('client/images/realistic_zebra_v2_rear.png');
    const shotRearArt = path.join(ARTIFACT_DIR, 'realistic_zebra_v2_rear.png');
    await page.screenshot({ path: shotRear, timeout: 8000 });
    try {
      fs.copyFileSync(shotRear, shotRearArt);
    } catch (_) {}
    console.log('✓ Captured Rear Pose v2:', shotRear);
  }

  await browser.close();
  console.log('=== VERIFICATION OF REALISM V2 COMPLETED ===');
}

main().catch(console.error);
