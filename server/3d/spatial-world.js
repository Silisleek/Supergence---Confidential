import { currentWorkspace } from '../services/conversationWorkspaces.js';
// SIS 1.0 — Procedural 3D Worlds & Gaussian Spatial Splat Engine
// Inspired by World Labs' Atlas (Fei-Fei Li), 3D Gaussian Splatting (3DGS), and Three.js WebGL
// Generates persistent, interactive 3D spatial environments from procedural code

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from '../orchestrator/brain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedWorkspaceRoot = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.resolve(__dirname, '../../workspace');
const workspaceRoot = () => currentWorkspace()?.root || sharedWorkspaceRoot;

export class SpatialWorldEngine {
  constructor() {
    this.name = 'Procedural 3D Worlds & Gaussian Spatial Splat Engine';
    this.status = 'ACTIVE';
    this.generatedWorlds = [];
  }

  /**
   * Generates a self-contained, interactive Three.js 3D spatial world with camera controls and splats
   * @param {Object} params
   * @param {string} params.title - Title of the spatial world
   * @param {string} params.preset - Scene preset ('cyberpunk-metropolis', 'quantum-lattice', 'solar-system', 'gaussian-splat-forest')
   * @param {number} [params.pointCount] - Particle / Splat point count (default: 50000)
   * @param {string} [params.customSceneCode] - Optional custom Three.js mesh generation script
   * @returns {Object} Artifact metadata
   */
  async generateSpatialWorld({
    title = 'Spatial Hologram',
    preset = 'cyberpunk-metropolis',
    pointCount = 50000,
    customSceneCode = null,
  }) {
    if (!fs.existsSync(workspaceRoot())) {
      fs.mkdirSync(workspaceRoot(), { recursive: true });
    }

    const cleanSlug = (title || preset)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 32);
    const filename = `spatial_world_${cleanSlug}_${Date.now()}.html`;
    const filepath = path.join(workspaceRoot(), filename);

    const sceneScript = customSceneCode || this._getPresetScript(preset);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SIS Spatial 3D World</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.85);
      --border: rgba(255, 255, 255, 0.12);
      --cyan: #06B6D4;
      --emerald: #10B981;
      --purple: #8B5CF6;
      --text: #F8FAFC;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      user-select: none;
    }
    #canvas-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    /* Holographic Cyber HUD */
    .spatial-hud {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 18px;
      max-width: 380px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      pointer-events: auto;
    }
    .hud-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--cyan);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .hud-badge {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .hud-desc {
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .hud-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 11px;
      font-family: monospace;
      color: #CBD5E1;
      background: rgba(0,0,0,0.4);
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 12px;
    }
    .hud-stat-item span {
      color: #64748B;
    }
    /* Controls Panel */
    .controls-deck {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.6);
      pointer-events: auto;
    }
    .deck-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      color: #F8FAFC;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .deck-btn:hover {
      background: rgba(6, 182, 212, 0.2);
      border-color: var(--cyan);
      color: var(--cyan);
    }
    .deck-btn.active {
      background: var(--cyan);
      color: #030712;
      font-weight: 600;
    }
    .help-hint {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 10;
      font-size: 11px;
      color: #64748B;
      background: rgba(15, 23, 42, 0.6);
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.05);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>

  <!-- HUD Overlay -->
  <div class="spatial-hud">
    <div class="hud-title">
      🌐 ${title}
      <span class="hud-badge">ATLAS-3DGS</span>
    </div>
    <div class="hud-desc">
      Neural Spatial World Synthesizer. Procedural 3D meshes, volumetric fog, dynamic lighting, and Gaussian Splat point cloud.
    </div>
    <div class="hud-stats-grid">
      <div class="hud-stat-item"><span>FPS:</span> <b id="stat-fps">60</b></div>
      <div class="hud-stat-item"><span>Splats:</span> <b id="stat-points">${pointCount.toLocaleString()}</b></div>
      <div class="hud-stat-item"><span>Cam X:</span> <b id="stat-cam-x">0.0</b></div>
      <div class="hud-stat-item"><span>Cam Y:</span> <b id="stat-cam-y">0.0</b></div>
      <div class="hud-stat-item"><span>Cam Z:</span> <b id="stat-cam-z">0.0</b></div>
      <div class="hud-stat-item"><span>Meshes:</span> <b id="stat-meshes">0</b></div>
    </div>
  </div>

  <!-- Controls Deck -->
  <div class="controls-deck">
    <button class="deck-btn active" id="btn-orbit" onclick="toggleAutoRotate()">🔄 Orbit Auto-Spin</button>
    <button class="deck-btn" id="btn-wireframe" onclick="toggleWireframe()">🕸 Wireframe</button>
    <button class="deck-btn" id="btn-fly" onclick="triggerFlythrough()">🚀 Cinematic Fly-Through</button>
    <button class="deck-btn" id="btn-reset" onclick="resetCamera()">🎯 Reset View</button>
  </div>

  <div class="help-hint">
    Left Click + Drag: Rotate | Right Click + Drag: Pan | Scroll: Zoom
  </div>

  <script>
    // Three.js Scene Setup
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.008);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 35, 75);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    dirLight.position.set(50, 80, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 3, 150);
    purpleLight.position.set(-40, 20, -30);
    scene.add(purpleLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 2.5, 120);
    emeraldLight.position.set(30, 15, -40);
    scene.add(emeraldLight);

    // Interactive Camera Controls (Lightweight Orbit)
    let isDragging = false;
    let isPanning = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = 0;
    let phi = 0.5;
    let radius = 80;
    let autoRotate = true;
    let isWireframe = false;
    let isCinematic = false;
    let cinematicTime = 0;

    const target = new THREE.Vector3(0, 10, 0);

    function updateCamera() {
      if (!isCinematic) {
        camera.position.x = target.x + radius * Math.sin(theta) * Math.cos(phi);
        camera.position.y = target.y + radius * Math.sin(phi);
        camera.position.z = target.z + radius * Math.cos(theta) * Math.cos(phi);
        camera.lookAt(target);
      }
    }
    updateCamera();

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('.spatial-hud') || e.target.closest('.controls-deck')) return;
      if (e.button === 0) isDragging = true;
      if (e.button === 2) isPanning = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      autoRotate = false;
      document.getElementById('btn-orbit').classList.remove('active');
    });

    window.addEventListener('mousemove', (e) => {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (isDragging) {
        theta -= deltaX * 0.008;
        phi += deltaY * 0.008;
        phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, phi));
        updateCamera();
      } else if (isPanning) {
        target.x -= deltaX * 0.05;
        target.y += deltaY * 0.05;
        updateCamera();
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      isPanning = false;
    });

    window.addEventListener('wheel', (e) => {
      radius += e.deltaY * 0.05;
      radius = Math.max(10, Math.min(300, radius));
      updateCamera();
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Procedural Scene Building
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);

    // Gaussian Splats / Point Cloud Generator
    const SPLAT_COUNT = ${pointCount};
    const splatGeometry = new THREE.BufferGeometry();
    const splatPositions = new Float32Array(SPLAT_COUNT * 3);
    const splatColors = new Float32Array(SPLAT_COUNT * 3);

    ${sceneScript}

    // Attach splats
    splatGeometry.setAttribute('position', new THREE.BufferAttribute(splatPositions, 3));
    splatGeometry.setAttribute('color', new THREE.BufferAttribute(splatColors, 3));
    const splatMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const splatPoints = new THREE.Points(splatGeometry, splatMaterial);
    scene.add(splatPoints);

    // Update mesh count stat
    let totalMeshCount = 0;
    scene.traverse((obj) => { if (obj.isMesh) totalMeshCount++; });
    document.getElementById('stat-meshes').textContent = totalMeshCount;

    // Controls Functions
    function toggleAutoRotate() {
      autoRotate = !autoRotate;
      document.getElementById('btn-orbit').classList.toggle('active', autoRotate);
    }

    function toggleWireframe() {
      isWireframe = !isWireframe;
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.wireframe = isWireframe;
        }
      });
      document.getElementById('btn-wireframe').classList.toggle('active', isWireframe);
    }

    function triggerFlythrough() {
      isCinematic = !isCinematic;
      cinematicTime = 0;
      document.getElementById('btn-fly').classList.toggle('active', isCinematic);
    }

    function resetCamera() {
      isCinematic = false;
      document.getElementById('btn-fly').classList.remove('active');
      theta = 0;
      phi = 0.5;
      radius = 80;
      target.set(0, 10, 0);
      autoRotate = true;
      document.getElementById('btn-orbit').classList.add('active');
      updateCamera();
    }

    // Render Animation Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = lastTime;

    function animate(currentTime) {
      requestAnimationFrame(animate);

      // FPS Tracking
      frameCount++;
      if (currentTime - fpsTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (currentTime - fpsTime));
        document.getElementById('stat-fps').textContent = fps;
        frameCount = 0;
        fpsTime = currentTime;
      }

      // Auto rotation
      if (autoRotate && !isDragging && !isCinematic) {
        theta += 0.005;
        updateCamera();
      }

      // Cinematic flythrough
      if (isCinematic) {
        cinematicTime += 0.01;
        camera.position.x = Math.sin(cinematicTime * 0.7) * 60;
        camera.position.y = 15 + Math.sin(cinematicTime * 1.2) * 12;
        camera.position.z = Math.cos(cinematicTime * 0.7) * 60;
        camera.lookAt(0, 5 + Math.sin(cinematicTime * 0.5) * 5, 0);
      }

      // Rotate splats gently
      splatPoints.rotation.y += 0.001;

      // Update HUD stats
      document.getElementById('stat-cam-x').textContent = camera.position.x.toFixed(1);
      document.getElementById('stat-cam-y').textContent = camera.position.y.toFixed(1);
      document.getElementById('stat-cam-z').textContent = camera.position.z.toFixed(1);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  </script>
</body>
</html>`;

    fs.writeFileSync(filepath, htmlContent, 'utf-8');

    const meta = {
      filename,
      filepath,
      url: `/workspace/${filename}`,
      title,
      preset,
      pointCount,
      timestamp: new Date().toISOString(),
    };

    this.generatedWorlds.push(meta);

    // Live broadcast to UI
    try {
      brain.broadcast('workspace-file-saved', {
        filename,
        filepath: filename,
        path: filepath,
        isInteractiveHtml: true,
        autoPreview: true,
        action: 'spatial-world-generated',
      });
      brain.broadcast('artifact', {
        id: 'world-' + Date.now(),
        title: `🌐 ${title.toUpperCase()} (3D WORLD)`,
        filename,
        src: `/workspace/${filename}`,
        type: 'html-artifact',
      });
    } catch (_) {}

    return meta;
  }

  /**
   * Returns procedural scene creation code for specific presets
   */
  _getPresetScript(preset) {
    if (preset === 'cyberpunk-metropolis') {
      return `
        // Ground Grid
        const gridHelper = new THREE.GridHelper(200, 50, 0x06b6d4, 0x1e293b);
        gridHelper.position.y = 0;
        scene.add(gridHelper);

        // Procedural Skyscrapers with Glow Edges
        const towerGeo = new THREE.BoxGeometry(1, 1, 1);
        const materials = [
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 }),
          new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3, metalness: 0.7 }),
          new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.1, metalness: 0.9 })
        ];

        for (let x = -80; x <= 80; x += 15) {
          for (let z = -80; z <= 80; z += 15) {
            if (Math.abs(x) < 15 && Math.abs(z) < 15) continue; // Open central plaza
            const height = 15 + Math.random() * 65;
            const mat = materials[Math.floor(Math.random() * materials.length)];
            const tower = new THREE.Mesh(towerGeo, mat);
            tower.scale.set(8 + Math.random() * 4, height, 8 + Math.random() * 4);
            tower.position.set(x + (Math.random() - 0.5) * 4, height / 2, z + (Math.random() - 0.5) * 4);
            tower.castShadow = true;
            tower.receiveShadow = true;
            meshGroup.add(tower);

            // Add rooftop holographic beacon
            if (Math.random() > 0.4) {
              const beaconGeo = new THREE.ConeGeometry(2, 6, 8);
              const beaconMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x06b6d4 : 0xec4899, wireframe: true });
              const beacon = new THREE.Mesh(beaconGeo, beaconMat);
              beacon.position.set(tower.position.x, height + 3, tower.position.z);
              meshGroup.add(beacon);
            }
          }
        }

        // Fill Gaussian Splat point cloud (Atmospheric neon particles & data dust)
        for (let i = 0; i < SPLAT_COUNT; i++) {
          const i3 = i * 3;
          splatPositions[i3] = (Math.random() - 0.5) * 180;
          splatPositions[i3 + 1] = Math.random() * 90;
          splatPositions[i3 + 2] = (Math.random() - 0.5) * 180;

          // Cyan / Purple / Pink palette
          const choice = Math.random();
          if (choice < 0.4) {
            splatColors[i3] = 0.02; splatColors[i3 + 1] = 0.71; splatColors[i3 + 2] = 0.83; // Cyan
          } else if (choice < 0.7) {
            splatColors[i3] = 0.54; splatColors[i3 + 1] = 0.36; splatColors[i3 + 2] = 0.96; // Purple
          } else {
            splatColors[i3] = 0.92; splatColors[i3 + 1] = 0.28; splatColors[i3 + 2] = 0.60; // Pink
          }
        }
      `;
    }

    if (preset === 'quantum-lattice') {
      return `
        // 3D Quantum Lattice with Atomic Spheres and Bonding Connectors
        const atomGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const atomMatA = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 });
        const atomMatB = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.1, metalness: 0.9 });

        const N = 5;
        const spacing = 10;
        const offset = ((N - 1) * spacing) / 2;

        for (let ix = 0; ix < N; ix++) {
          for (let iy = 0; iy < N; iy++) {
            for (let iz = 0; iz < N; iz++) {
              const x = ix * spacing - offset;
              const y = iy * spacing - offset + 25;
              const z = iz * spacing - offset;

              const isTypeA = (ix + iy + iz) % 2 === 0;
              const atom = new THREE.Mesh(atomGeo, isTypeA ? atomMatA : atomMatB);
              atom.position.set(x, y, z);
              meshGroup.add(atom);
            }
          }
        }

        // Gaussian Splat Electron Probability Density Cloud
        for (let i = 0; i < SPLAT_COUNT; i++) {
          const i3 = i * 3;
          // Cluster around origin with gaussian distribution
          const u1 = Math.random();
          const u2 = Math.random();
          const rad = 35 * Math.sqrt(-2.0 * Math.log(u1));
          const theta = 2.0 * Math.PI * u2;
          const phi = Math.acos(2.0 * Math.random() - 1.0);

          splatPositions[i3] = rad * Math.sin(phi) * Math.cos(theta);
          splatPositions[i3 + 1] = 25 + rad * Math.sin(phi) * Math.sin(theta);
          splatPositions[i3 + 2] = rad * Math.cos(phi);

          splatColors[i3] = 0.2 + 0.8 * Math.random();
          splatColors[i3 + 1] = 0.9;
          splatColors[i3 + 2] = 1.0;
        }
      `;
    }

    // Default: Celestial / Solar
    return `
      // Central Sun
      const sunGeo = new THREE.SphereGeometry(12, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.set(0, 15, 0);
      meshGroup.add(sun);

      // Planetary Orbits
      const planets = [
        { rad: 2.5, dist: 28, color: 0x38bdf8, speed: 0.02 },
        { rad: 4.0, dist: 45, color: 0x34d399, speed: 0.012 },
        { rad: 5.5, dist: 70, color: 0xf472b6, speed: 0.008 }
      ];

      planets.forEach((p) => {
        const pGeo = new THREE.SphereGeometry(p.rad, 24, 24);
        const pMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4, metalness: 0.6 });
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.set(p.dist, 15, 0);
        meshGroup.add(mesh);

        // Orbit ring
        const ringGeo = new THREE.RingGeometry(p.dist - 0.2, p.dist + 0.2, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 15;
        scene.add(ring);
      });

      // Splat Asteroid Field & Starfield
      for (let i = 0; i < SPLAT_COUNT; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const dist = 85 + Math.random() * 40;
        splatPositions[i3] = Math.cos(angle) * dist + (Math.random() - 0.5) * 10;
        splatPositions[i3 + 1] = 15 + (Math.random() - 0.5) * 8;
        splatPositions[i3 + 2] = Math.sin(angle) * dist + (Math.random() - 0.5) * 10;

        splatColors[i3] = 0.8;
        splatColors[i3 + 1] = 0.8;
        splatColors[i3 + 2] = 0.9;
      }
    `;
  }
}

export const spatialWorldEngine = new SpatialWorldEngine();
export default spatialWorldEngine;
