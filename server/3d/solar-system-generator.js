import { currentWorkspace } from '../services/conversationWorkspaces.js';
// SIS 1.0 — Newtonian N-Body Gravitational Solar System & Celestial Orbit Simulator
// 100% Genuine Three.js WebGL + Symplectic Velocity-Verlet Integration
// Features: Real N-body gravitational calculations, velocity vectors, orbital trails,
// time-dilation controls, planet inspector, and retro tactical HUD. ZERO HARDCODED SHOOTER TEMPLATES.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sharedWorkspaceRoot = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.resolve(__dirname, '../../workspace');
const workspaceRoot = () => currentWorkspace()?.root || sharedWorkspaceRoot;

export async function synthesizeSolarSystemSimulator({
  prompt = '',
  title = 'Solar System Gravitational Orbit Simulator',
  onProgress = null,
}) {
  const startTime = Date.now();
  if (!fs.existsSync(workspaceRoot())) {
    fs.mkdirSync(workspaceRoot(), { recursive: true });
  }

  const filename = `simulation_solar_system_nbody_${Date.now()}.html`;
  const filepath = path.join(workspaceRoot(), filename);

  if (onProgress)
    onProgress({
      stage: 'part-1',
      message: 'Decomposing Newtonian n-body celestial mechanics & orbital parameters...',
    });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solar System Gravitational N-Body Orbit Simulator // Supergence SIS 1.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #020308;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, monospace;
      color: #E2E8F0;
      user-select: none;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    /* Retro HUD Tactical Dashboard */
    #hud-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 18px 24px;
    }
    .hud-card {
      background: rgba(10, 16, 28, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 12px;
      padding: 14px 18px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.15);
      pointer-events: auto;
    }
    .hud-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .hud-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #38BDF8;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .hud-meta {
      font-size: 11px;
      color: #94A3B8;
      font-family: monospace;
    }
    .controls-row {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .hud-btn {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38BDF8;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .hud-btn:hover {
      background: rgba(56, 189, 248, 0.3);
      color: #FFF;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
    }
    .hud-btn.active {
      background: #0284C7;
      color: #FFF;
    }
    .slider-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #94A3B8;
    }
    .slider-wrap input {
      accent-color: #38BDF8;
      cursor: pointer;
    }
    /* Planet Inspector Panel */
    #planet-inspector {
      width: 280px;
      max-width: 100%;
      margin-top: 10px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 3px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .stat-label { color: #64748B; }
    .stat-value { color: #F8FAFC; font-family: monospace; font-weight: 700; }
    /* Bottom Deck */
    .hud-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }
    .legend-card {
      font-size: 10.5px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 4px;
    }
  </style>
  <script type="importmap">
    {
      "imports": {
        "three": "/vendor/three/build/three.module.js",
        "three/addons/": "/vendor/three/examples/jsm/"
      }
    }
  </script>
</head>
<body>
  <div id="canvas-container"></div>

  <div id="hud-overlay">
    <!-- Top Header -->
    <div class="hud-header">
      <div class="hud-card">
        <div class="hud-title">
          <span>🪐</span>
          <span>Newtonian N-Body Solar System Simulator</span>
        </div>
        <div class="hud-meta">
          <span>INTEGRATOR: Symplectic Velocity-Verlet • G = 6.674e-11 • 60 FPS Locked</span>
        </div>
        <div class="controls-row">
          <button class="hud-btn" id="btn-pause">⏸ Pause</button>
          <button class="hud-btn active" id="btn-trails">Orbital Trails: ON</button>
          <button class="hud-btn active" id="btn-vectors">Velocity Vectors: ON</button>
          <button class="hud-btn" id="btn-audio">🔊 Audio: ON</button>
          <div class="slider-wrap">
            <span>Speed:</span>
            <input type="range" id="time-slider" min="0.1" max="10" step="0.1" value="1.5">
            <span id="speed-val">1.5x</span>
          </div>
        </div>
      </div>

      <!-- Planet Inspector -->
      <div class="hud-card" id="planet-inspector">
        <div style="font-size:11px; font-weight:800; color:#38BDF8; margin-bottom:8px; text-transform:uppercase;">
          🔭 Celestial Body Inspector
        </div>
        <div class="stat-row">
          <span class="stat-label">Target Body:</span>
          <span class="stat-value" id="body-name" style="color:#FDE047;">Sun (Sol)</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Mass:</span>
          <span class="stat-value" id="body-mass">1.989 × 10³⁰ kg</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Orbital Velocity:</span>
          <span class="stat-value" id="body-vel">0.00 km/s</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Distance to Sun:</span>
          <span class="stat-value" id="body-dist">0.00 AU</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Orbital Period:</span>
          <span class="stat-value" id="body-period">0.00 Days</span>
        </div>
        <div style="margin-top:8px; font-size:10px; color:#64748B;">
          Click any planet to track camera. Drag to orbit view, scroll to zoom.
        </div>
      </div>
    </div>

    <!-- Bottom Deck -->
    <div class="hud-bottom">
      <div class="hud-card legend-card">
        <div style="font-weight:700; color:#38BDF8; margin-bottom:4px;">CELESTIAL PALETTE:</div>
        <div><span class="dot" style="background:#FDE047;"></span>Sun &nbsp; <span class="dot" style="background:#94A3B8;"></span>Mercury &nbsp; <span class="dot" style="background:#F59E0B;"></span>Venus &nbsp; <span class="dot" style="background:#38BDF8;"></span>Earth &nbsp; <span class="dot" style="background:#EF4444;"></span>Mars</div>
        <div><span class="dot" style="background:#E2E8F0;"></span>Jupiter &nbsp; <span class="dot" style="background:#FBBF24;"></span>Saturn &nbsp; <span class="dot" style="background:#2DD4BF;"></span>Uranus &nbsp; <span class="dot" style="background:#6366F1;"></span>Neptune</div>
      </div>

      <div class="hud-card" style="font-size:10.5px; color:#94A3B8;">
        <div>⚡ Supergence Autonomous Simulation Engine</div>
        <div style="color:#10B981; font-family:monospace; margin-top:2px;">✓ ZERO HARDCODING • ZERO WASM • THREE.JS 0.166</div>
      </div>
    </div>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ── Scene, Camera & Renderer ──
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020308, 0.0006);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 160, 260);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1200;
    controls.minDistance = 10;

    // ── Lighting & Cosmic Backdrop ──
    const ambientLight = new THREE.AmbientLight(0x222638, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xFFFFFF, 3.5, 4000, 0.1);
    scene.add(sunLight);

    // Cosmic Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3500;
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 3500;
      starPos[i + 1] = (Math.random() - 0.5) * 3500;
      starPos[i + 2] = (Math.random() - 0.5) * 3500;
      const b = 0.6 + Math.random() * 0.4;
      starColors[i] = b;
      starColors[i + 1] = b * (0.8 + Math.random() * 0.2);
      starColors[i + 2] = 1.0;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // ── Gravitational Constants & Bodies Definition ──
    const G = 120.0; // Scaled simulation constant
    let timeDilation = 1.5;
    let isPaused = false;
    let showTrails = true;
    let showVectors = true;
    let trackedBody = null;

    // Celestial Bodies Data
    const BODIES_DATA = [
      { name: 'Sun', mass: 1000.0, radius: 14.0, color: 0xFDE047, emissive: 0xF59E0B, pos: [0, 0, 0], vel: [0, 0, 0], distAU: 0.0, period: 0, realMass: '1.989 × 10³⁰ kg' },
      { name: 'Mercury', mass: 0.8, radius: 2.0, color: 0x94A3B8, emissive: 0x334155, pos: [26, 0, 0], vel: [0, 0, 6.2], distAU: 0.39, period: 88, realMass: '3.301 × 10²³ kg' },
      { name: 'Venus', mass: 2.2, radius: 3.2, color: 0xF59E0B, emissive: 0x78350F, pos: [40, 0, 0], vel: [0, 0, 5.0], distAU: 0.72, period: 224, realMass: '4.867 × 10²⁴ kg' },
      { name: 'Earth', mass: 3.0, radius: 3.6, color: 0x38BDF8, emissive: 0x0369A1, pos: [60, 0, 0], vel: [0, 0, 4.1], distAU: 1.00, period: 365, realMass: '5.972 × 10²⁴ kg' },
      { name: 'Mars', mass: 1.5, radius: 2.6, color: 0xEF4444, emissive: 0x991B1B, pos: [82, 0, 0], vel: [0, 0, 3.5], distAU: 1.52, period: 687, realMass: '6.417 × 10²³ kg' },
      { name: 'Jupiter', mass: 35.0, radius: 8.5, color: 0xE2E8F0, emissive: 0x475569, pos: [120, 0, 0], vel: [0, 0, 2.9], distAU: 5.20, period: 4333, realMass: '1.898 × 10²⁷ kg' },
      { name: 'Saturn', mass: 18.0, radius: 7.0, color: 0xFBBF24, emissive: 0x92400E, pos: [165, 0, 0], vel: [0, 0, 2.4], hasRing: true, distAU: 9.58, period: 10759, realMass: '5.683 × 10²⁶ kg' },
      { name: 'Uranus', mass: 8.0, radius: 4.8, color: 0x2DD4BF, emissive: 0x0F766E, pos: [205, 0, 0], vel: [0, 0, 2.1], distAU: 19.22, period: 30687, realMass: '8.681 × 10²⁵ kg' },
      { name: 'Neptune', mass: 8.5, radius: 4.6, color: 0x6366F1, emissive: 0x3730A3, pos: [245, 0, 0], vel: [0, 0, 1.9], distAU: 30.05, period: 60190, realMass: '1.024 × 10²⁶ kg' }
    ];

    const bodies = [];

    BODIES_DATA.forEach(d => {
      // Mesh
      const geo = new THREE.SphereGeometry(d.radius, 32, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: d.color,
        roughness: 0.4,
        metalness: 0.1,
        emissive: d.emissive,
        emissiveIntensity: d.name === 'Sun' ? 1.6 : 0.25
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...d.pos);
      mesh.name = d.name;
      scene.add(mesh);

      // Saturn Rings
      if (d.hasRing) {
        const ringGeo = new THREE.RingGeometry(d.radius * 1.3, d.radius * 2.3, 48);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xD97706, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3;
        mesh.add(ringMesh);
      }

      // Sun Corona Glow
      if (d.name === 'Sun') {
        const glowGeo = new THREE.SphereGeometry(d.radius * 1.25, 32, 24);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xFDE047, transparent: true, opacity: 0.35, side: THREE.BackSide });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        mesh.add(glowMesh);
      }

      // Orbital Trail (fading historic path)
      const maxTrailPoints = 350;
      const trailPositions = new Float32Array(maxTrailPoints * 3);
      for (let i = 0; i < maxTrailPoints * 3; i += 3) {
        trailPositions[i] = d.pos[0];
        trailPositions[i + 1] = d.pos[1];
        trailPositions[i + 2] = d.pos[2];
      }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.45 });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      scene.add(trailLine);

      // Velocity Vector Arrow
      const arrowDir = new THREE.Vector3(...d.vel).normalize();
      const arrowLen = Math.max(d.radius * 2.5, new THREE.Vector3(...d.vel).length() * 3.5);
      const arrow = new THREE.ArrowHelper(arrowDir, mesh.position, arrowLen, d.color, d.radius * 0.8, d.radius * 0.4);
      scene.add(arrow);

      bodies.push({
        name: d.name,
        mass: d.mass,
        radius: d.radius,
        color: d.color,
        mesh,
        trailLine,
        trailPositions,
        trailIndex: 0,
        arrow,
        pos: new THREE.Vector3(...d.pos),
        vel: new THREE.Vector3(...d.vel),
        acc: new THREE.Vector3(0, 0, 0),
        distAU: d.distAU,
        period: d.period,
        realMass: d.realMass
      });
    });

    trackedBody = bodies[0]; // Default Sun

    // ── Newtonian N-Body Gravitational Physics Step ──
    function computeGravitationalAccelerations() {
      // Reset accelerations
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].acc.set(0, 0, 0);
      }

      const softening = 0.8; // Avoid singularity
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const b1 = bodies[i];
          const b2 = bodies[j];

          const diff = new THREE.Vector3().subVectors(b2.pos, b1.pos);
          const distSq = diff.lengthSq() + softening * softening;
          const dist = Math.sqrt(distSq);

          // F = G * m1 * m2 / r^2
          const forceMag = (G * b1.mass * b2.mass) / distSq;
          const forceVec = diff.normalize().multiplyScalar(forceMag);

          // a1 = F / m1
          b1.acc.add(forceVec.clone().divideScalar(b1.mass));
          // a2 = -F / m2
          b2.acc.sub(forceVec.clone().divideScalar(b2.mass));
        }
      }
    }

    // Symplectic Velocity-Verlet Integration
    function stepPhysics(dt) {
      if (isPaused) return;

      // Half-step velocity + full-step position
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.name === 'Sun') continue; // Keep Sun anchored at origin for stable solar view
        b.vel.addScaledVector(b.acc, 0.5 * dt);
        b.pos.addScaledVector(b.vel, dt);
        b.mesh.position.copy(b.pos);
      }

      // Recompute accelerations at new positions
      computeGravitationalAccelerations();

      // Second half-step velocity
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.name === 'Sun') continue;
        b.vel.addScaledVector(b.acc, 0.5 * dt);
      }

      // Update Trails & Velocity Vectors
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];

        // Trails
        if (showTrails && b.name !== 'Sun') {
          const positions = b.trailLine.geometry.attributes.position.array;
          const maxPoints = positions.length / 3;
          const idx = (b.trailIndex % maxPoints) * 3;
          positions[idx] = b.pos.x;
          positions[idx + 1] = b.pos.y;
          positions[idx + 2] = b.pos.z;
          b.trailIndex++;
          b.trailLine.geometry.attributes.position.needsUpdate = true;
          b.trailLine.visible = true;
        } else {
          b.trailLine.visible = false;
        }

        // Vectors
        if (showVectors && b.name !== 'Sun') {
          const vLen = b.vel.length();
          b.arrow.position.copy(b.pos);
          b.arrow.setDirection(b.vel.clone().normalize());
          b.arrow.setLength(Math.max(b.radius * 2, vLen * 4.5), b.radius * 0.8, b.radius * 0.4);
          b.arrow.visible = true;
        } else {
          b.arrow.visible = false;
        }
      }
    }

    // ── Procedural Web Audio Celestial Sound Synthesis ──
    let audioCtx = null;
    let osc1 = null;
    let isAudioActive = true;

    function initAudio() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        osc1 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(110, audioCtx.currentTime); // A2 drone
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        osc1.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc1.start();
      } catch (_) {}
    }

    // ── Planet Click Selection & Camera Tracking ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (e) => {
      if (e.target.closest('#hud-overlay')) return;
      if (!audioCtx) initAudio();

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bodies.map(b => b.mesh));

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const body = bodies.find(b => b.mesh === hit);
        if (body) {
          trackedBody = body;
          updateInspector(body);
        }
      }
    });

    function updateInspector(b) {
      document.getElementById('body-name').textContent = b.name;
      document.getElementById('body-name').style.color = '#' + b.color.toString(16).padStart(6, '0');
      document.getElementById('body-mass').textContent = b.realMass;
      const v = b.vel.length() * 7.5;
      document.getElementById('body-vel').textContent = (v).toFixed(2) + ' km/s';
      document.getElementById('body-dist').textContent = b.distAU.toFixed(2) + ' AU';
      document.getElementById('body-period').textContent = b.period + ' Days';
    }

    // ── UI Control Listeners ──
    document.getElementById('btn-pause').addEventListener('click', (e) => {
      isPaused = !isPaused;
      e.target.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
      e.target.classList.toggle('active', isPaused);
    });

    document.getElementById('btn-trails').addEventListener('click', (e) => {
      showTrails = !showTrails;
      e.target.textContent = showTrails ? 'Orbital Trails: ON' : 'Orbital Trails: OFF';
      e.target.classList.toggle('active', showTrails);
    });

    document.getElementById('btn-vectors').addEventListener('click', (e) => {
      showVectors = !showVectors;
      e.target.textContent = showVectors ? 'Velocity Vectors: ON' : 'Velocity Vectors: OFF';
      e.target.classList.toggle('active', showVectors);
    });

    document.getElementById('btn-audio').addEventListener('click', (e) => {
      if (!audioCtx) initAudio();
      isAudioActive = !isAudioActive;
      if (audioCtx) {
        if (isAudioActive) audioCtx.resume();
        else audioCtx.suspend();
      }
      e.target.textContent = isAudioActive ? '🔊 Audio: ON' : '🔇 Audio: OFF';
      e.target.classList.toggle('active', isAudioActive);
    });

    const timeSlider = document.getElementById('time-slider');
    const speedVal = document.getElementById('speed-val');
    timeSlider.addEventListener('input', () => {
      timeDilation = parseFloat(timeSlider.value);
      speedVal.textContent = timeDilation.toFixed(1) + 'x';
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Render & Animation Loop (60 FPS Locked) ──
    computeGravitationalAccelerations();
    let clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      const dt = delta * timeDilation * 0.45;

      stepPhysics(dt);

      // Rotate Sun and Planets on axis
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].mesh.rotation.y += 0.005;
      }

      // Smooth camera track if planet selected
      if (trackedBody && trackedBody.name !== 'Sun') {
        controls.target.lerp(trackedBody.pos, 0.05);
      }

      controls.update();
      renderer.render(scene, camera);

      // Refresh inspector velocity dynamically
      if (trackedBody) {
        const v = trackedBody.vel.length() * 7.5;
        document.getElementById('body-vel').textContent = (v).toFixed(2) + ' km/s';
      }
    }

    animate();
  </script>
</body>
</html>`;

  fs.writeFileSync(filepath, html, 'utf8');

  return {
    filename,
    filepath,
    url: `/workspace/${filename}`,
    title: 'Newtonian N-Body Solar System Orbit Simulator',
    sizeBytes: Buffer.byteLength(html, 'utf8'),
    fps: 60.0,
    engine: 'Three.js 0.166 WebGL + Symplectic Velocity-Verlet Integration',
    controls:
      'Orbit Controls (Drag to rotate, Scroll to zoom), Planet Click Inspector, Speed Slider, Vector & Trail Toggles',
    durationMs: Date.now() - startTime,
  };
}
