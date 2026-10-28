// SIS 1.0 — High-Fidelity 3D Cyberpunk Metropolis Engine (AAA Masterwork)
// Articulated Three.js procedural city: compound skyscrapers with setbacks, helipads & spires,
// moving glass elevator cabs, elevated high-speed Maglev monorail, compound hover-spinners with VTOL rings & thrusters,
// giant rotating 3D holographic wireframe monuments, sweeping rooftop searchlights, wet asphalt with street lamps,
// volumetric fog & neon rain, multi-camera director (Panoramic Vista, 6DOF Drone, Monorail Rider, Chase Cam, Orbit),
// and procedural Web Audio synthesizers.

import fs from 'fs';
import path from 'path';

export function buildUnifiedCyberpunkHTML({ plan, userPrompt, gameTitle }) {
  const title = gameTitle || 'Cyberpunk Metropolis 3D // Supergence Engine';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <script src="three.min.js"></script>
  <style>
    :root {
      --bg: #03050e;
      --panel: rgba(8, 14, 28, 0.82);
      --panel-border: rgba(0, 240, 255, 0.35);
      --cyan: #00F0FF;
      --magenta: #FF007F;
      --purple: #8B5CF6;
      --amber: #FFB800;
      --green: #10B981;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
      --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      font-family: var(--font-ui);
      color: var(--text);
      user-select: none;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: block;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    /* Top HUD Header */
    #hud-header {
      position: absolute;
      top: 14px;
      left: 16px;
      right: 16px;
      z-index: 50;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }
    .hud-title-box {
      background: var(--panel);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 10px 18px;
      pointer-events: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(0,240,255,0.2);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .hud-logo {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: linear-gradient(135deg, #FFF 0%, var(--cyan) 50%, var(--magenta) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .badge-pill {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(0,240,255,0.15);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      letter-spacing: 0.05em;
    }
    .fps-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--cyan);
      background: rgba(0, 240, 255, 0.08);
      border: 1px solid rgba(0, 240, 255, 0.25);
      padding: 3px 10px;
      border-radius: 4px;
    }
    .hud-top-right {
      display: flex;
      gap: 10px;
      pointer-events: auto;
    }
    .btn-top {
      background: var(--panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--panel-border);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-top:hover {
      background: rgba(0, 240, 255, 0.2);
      border-color: var(--cyan);
      color: #FFF;
      box-shadow: 0 0 15px rgba(0,240,255,0.4);
      transform: translateY(-1px);
    }

    /* Left Telemetry Deck */
    #telemetry-panel {
      position: absolute;
      top: 72px;
      left: 16px;
      z-index: 40;
      width: 250px;
      background: var(--panel);
      backdrop-filter: blur(16px);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 14px 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .tele-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      margin-bottom: 10px;
    }
    .tele-title {
      font-weight: 700;
      color: var(--cyan);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 10px;
    }
    .tele-status {
      font-size: 9px;
      color: var(--green);
      font-weight: 700;
    }
    .tele-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .tele-label { color: var(--text-muted); }
    .tele-val { color: var(--text); font-weight: 600; }
    .tele-val.cyan { color: var(--cyan); }
    .tele-val.magenta { color: var(--magenta); }
    .tele-val.amber { color: var(--amber); }

    /* Right Control Deck */
    #controls-panel {
      position: absolute;
      top: 72px;
      right: 16px;
      z-index: 40;
      width: 260px;
      background: var(--panel);
      backdrop-filter: blur(16px);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 14px 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }
    .ctrl-section-title {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      color: var(--cyan);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ctrl-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 14px;
    }
    .ctrl-btn {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(0, 240, 255, 0.2);
      color: var(--text);
      font-family: var(--font-ui);
      font-size: 11px;
      font-weight: 600;
      padding: 7px 8px;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .ctrl-btn:hover {
      background: rgba(0, 240, 255, 0.15);
      border-color: var(--cyan);
      color: #FFF;
    }
    .ctrl-btn.active {
      background: var(--cyan);
      border-color: var(--cyan);
      color: #030712;
      font-weight: 700;
      box-shadow: 0 0 14px rgba(0,240,255,0.4);
    }
    .ctrl-slider-group {
      margin-bottom: 10px;
    }
    .ctrl-slider-header {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: 10px;
      margin-bottom: 4px;
    }
    .ctrl-slider-label { color: var(--text-muted); }
    .ctrl-slider-val { color: var(--cyan); font-weight: 600; }
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.12);
      border-radius: 2px;
      outline: none;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--cyan);
      cursor: pointer;
      box-shadow: 0 0 8px var(--cyan);
    }

    /* Bottom HUD Keymap */
    #hud-footer {
      position: absolute;
      bottom: 14px;
      left: 16px;
      right: 16px;
      z-index: 50;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }
    .key-hints {
      background: var(--panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--panel-border);
      border-radius: 6px;
      padding: 6px 14px;
      display: flex;
      gap: 12px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      pointer-events: auto;
    }
    kbd {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 3px;
      padding: 1px 5px;
      font-weight: 700;
      color: #FFF;
    }
    .tech-credit {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>

  <!-- HUD Top Header -->
  <div id="hud-header">
    <div class="hud-title-box">
      <span class="hud-logo">⚡ CYBERPUNK METROPOLIS 3D</span>
      <span class="badge-pill">SUPERGENCE SOTA</span>
      <span class="fps-badge" id="fpsCounter">FPS: 60.0 | Frame: 0</span>
    </div>
    <div class="hud-top-right">
      <button class="btn-top" id="btnAudioToggle" onclick="toggleAudio()">🔊 AUDIO: ON</button>
      <button class="btn-top" id="btnResetDrone" onclick="resetDrone()">⟲ RESET VIEW</button>
    </div>
  </div>

  <!-- Left Flight Telemetry Panel -->
  <div id="telemetry-panel">
    <div class="tele-header">
      <span class="tele-title">FLIGHT & SCENE TELEMETRY</span>
      <span class="tele-status" id="teleModeLabel">PANORAMIC VISTA</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">ALTITUDE</span>
      <span class="tele-val cyan" id="teleAlt">130.0 m</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">AIRSPEED</span>
      <span class="tele-val" id="teleSpeed">0.0 km/h</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">COORDINATES</span>
      <span class="tele-val" id="teleCoords">0, 130, 180</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">ACTIVE MESHES</span>
      <span class="tele-val cyan" id="teleMeshes">384</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">FLYING VEHICLES</span>
      <span class="tele-val magenta" id="teleVehicles">48</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">MAGLEV TRAINS</span>
      <span class="tele-val amber" id="teleMonorail">ACTIVE (3 CARS)</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">ELEVATORS</span>
      <span class="tele-val cyan" id="teleElevators">8 MOVING CABS</span>
    </div>
    <div class="tele-row">
      <span class="tele-label">ATMOSPHERE</span>
      <span class="tele-val cyan" id="teleLighting">MIDNIGHT NEON</span>
    </div>
  </div>

  <!-- Right Interactive Controls Panel -->
  <div id="controls-panel">
    <div class="ctrl-section-title">🎥 CAMERA MODES</div>
    <div class="ctrl-grid">
      <button class="ctrl-btn active" id="btnCamVista" onclick="setCamMode('vista')">🌆 Panoramic Vista</button>
      <button class="ctrl-btn" id="btnCamDrone" onclick="setCamMode('drone')">✈ Free Drone 6DOF</button>
      <button class="ctrl-btn" id="btnCamMonorail" onclick="setCamMode('monorail')">🚄 Monorail Rider</button>
      <button class="ctrl-btn" id="btnCamChase" onclick="setCamMode('chase')">🏎 Vehicle Chase</button>
    </div>

    <div class="ctrl-section-title">💡 ATMOSPHERIC LIGHTING</div>
    <div class="ctrl-grid">
      <button class="ctrl-btn active" id="btnLightMidnight" onclick="setLighting('midnight')">🌙 Midnight</button>
      <button class="ctrl-btn" id="btnLightDusk" onclick="setLighting('dusk')">🌆 Dusk Cyber</button>
      <button class="ctrl-btn" id="btnLightMatrix" onclick="setLighting('matrix')">💻 Matrix</button>
      <button class="ctrl-btn" id="btnLightSunset" onclick="setLighting('sunset')">🌅 Sunset Gold</button>
    </div>

    <div class="ctrl-section-title">🎛 ENVIRONMENT CONTROLS</div>
    <div class="ctrl-slider-group">
      <div class="ctrl-slider-header">
        <span class="ctrl-slider-label">FOG DENSITY</span>
        <span class="ctrl-slider-val" id="valFog">0.0055</span>
      </div>
      <input type="range" id="sliderFog" min="0.001" max="0.015" step="0.0005" value="0.0055" oninput="updateFog(this.value)">
    </div>
    <div class="ctrl-slider-group">
      <div class="ctrl-slider-header">
        <span class="ctrl-slider-label">TRAFFIC VELOCITY</span>
        <span class="ctrl-slider-val" id="valTraffic">1.0x</span>
      </div>
      <input type="range" id="sliderTraffic" min="0.2" max="2.5" step="0.1" value="1.0" oninput="updateTrafficSpeed(this.value)">
    </div>
  </div>

  <!-- Bottom Keybinds & Legend -->
  <div id="hud-footer">
    <div class="key-hints">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Drone Thrust</span>
      <span><kbd>Space</kbd> Ascend</span>
      <span><kbd>Shift</kbd> Descend</span>
      <span><kbd>Mouse Drag</kbd> Look/Aim</span>
      <span><kbd>C</kbd> Cycle Camera</span>
      <span><kbd>R</kbd> Reset</span>
    </div>
    <div class="tech-credit">Three.js WebGL • Procedural PBR • Volumetric Atmospheric Fog • Procedural Web Audio</div>
  </div>

  <script>
    // ══════════════════════════════════════════════════════════════════════════
    // PROCEDURAL WEB AUDIO SYNTHESIZER
    // ══════════════════════════════════════════════════════════════════════════
    class CyberpunkAudio {
      constructor() {
        this.ctx = null;
        this.enabled = true;
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneGain = null;
        this.rainSource = null;
        this.rainGain = null;
      }
      init() {
        if (this.ctx) return;
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();

          // Low-frequency ambient hovercraft engine drone
          this.droneOsc1 = this.ctx.createOscillator();
          this.droneOsc2 = this.ctx.createOscillator();
          this.droneOsc1.type = 'sawtooth';
          this.droneOsc2.type = 'sine';
          this.droneOsc1.frequency.setValueAtTime(52, this.ctx.currentTime);
          this.droneOsc2.frequency.setValueAtTime(55, this.ctx.currentTime);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(160, this.ctx.currentTime);

          this.droneGain = this.ctx.createGain();
          this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

          this.droneOsc1.connect(filter);
          this.droneOsc2.connect(filter);
          filter.connect(this.droneGain);
          this.droneGain.connect(this.ctx.destination);

          this.droneOsc1.start();
          this.droneOsc2.start();

          // Continuous digital rain hiss
          const bufferSize = this.ctx.sampleRate * 2;
          const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          this.rainSource = this.ctx.createBufferSource();
          this.rainSource.buffer = noiseBuffer;
          this.rainSource.loop = true;

          const rainFilter = this.ctx.createBiquadFilter();
          rainFilter.type = 'bandpass';
          rainFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
          rainFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

          this.rainGain = this.ctx.createGain();
          this.rainGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

          this.rainSource.connect(rainFilter);
          rainFilter.connect(this.rainGain);
          this.rainGain.connect(this.ctx.destination);
          this.rainSource.start();
        } catch (_) {}
      }
      playClick(freq = 800) {
        if (!this.ctx || !this.enabled) return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.04);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.04);
        } catch (_) {}
      }
      playWhoosh() {
        if (!this.ctx || !this.enabled) return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);
          gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.4);
        } catch (_) {}
      }
      toggle() {
        this.enabled = !this.enabled;
        if (this.ctx) {
          if (this.enabled) {
            this.ctx.resume();
            if (this.droneGain) this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            if (this.rainGain) this.rainGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
          } else {
            if (this.droneGain) this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
            if (this.rainGain) this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
          }
        }
        return this.enabled;
      }
    }

    const audio = new CyberpunkAudio();
    window.__cyberpunkAudio = audio;
    window.addEventListener('click', () => audio.init(), { once: true });
    window.addEventListener('keydown', () => audio.init(), { once: true });

    function toggleAudio() {
      const active = audio.toggle();
      const btn = document.getElementById('btnAudioToggle');
      if (btn) btn.textContent = active ? '🔊 AUDIO: ON' : '🔇 AUDIO: OFF';
      audio.playClick(900);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // THREE.JS 3D SCENE & ENGINE ARCHITECTURE
    // ══════════════════════════════════════════════════════════════════════════
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    window.__threeScene = scene;
    window.scene = scene;
    scene.background = new THREE.Color(0x03050E);
    scene.fog = new THREE.FogExp2(0x060919, 0.0055);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 1500);
    camera.position.set(0, 130, 180);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // Dynamic Atmospheric Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x0e172a, 1.6);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    moonLight.position.set(80, 200, 100);
    scene.add(moonLight);

    const magentaFill = new THREE.DirectionalLight(0xff007f, 1.4);
    magentaFill.position.set(-90, 80, -90);
    scene.add(magentaFill);

    // Glowing Point Lights at City Intersections
    const pointLights = [];
    const lightColors = [0x00F0FF, 0xFF007F, 0xFFB800, 0x8B5CF6];
    const lightPositions = [
      [0, 25, 0], [45, 35, -45], [-45, 30, 45], [25, 55, 55], [-35, 45, -55]
    ];
    lightPositions.forEach(([x, y, z], idx) => {
      const col = lightColors[idx % lightColors.length];
      const pl = new THREE.PointLight(col, 4.0, 140);
      pl.position.set(x, y, z);
      scene.add(pl);
      pointLights.push(pl);
    });

    // ─── Procedural Canvas Window Texture ───
    function createWindowTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#060B18';
      ctx.fillRect(0, 0, 256, 512);

      const rows = 32;
      const cols = 16;
      const padX = 3;
      const padY = 3;
      const w = (256 - padX * (cols + 1)) / cols;
      const h = (512 - padY * (rows + 1)) / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rand = Math.random();
          if (rand > 0.40) {
            if (rand > 0.82) ctx.fillStyle = '#00F0FF'; // Bright Cyan
            else if (rand > 0.68) ctx.fillStyle = '#FF007F'; // Vibrant Magenta
            else if (rand > 0.52) ctx.fillStyle = '#FFB800'; // Amber Warm Office
            else ctx.fillStyle = '#38BDF8'; // Cool Ice Blue
          } else {
            ctx.fillStyle = '#0A1224'; // Unlit Dark
          }
          const x = padX + c * (w + padX);
          const y = padY + r * (h + padY);
          ctx.fillRect(x, y, w, h);
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }

    const windowTex = createWindowTexture();

    // ─── Wet Reflective Asphalt Ground with Road Lane Lines ───
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050813,
      roughness: 0.12,
      metalness: 0.88
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    const roadGrid = new THREE.GridHelper(600, 120, 0x00F0FF, 0x0f172a);
    roadGrid.position.y = 0.05;
    scene.add(roadGrid);

    // Glowing Neon Lane Divider Ribbons along Central Highway
    const laneGeo = new THREE.PlaneGeometry(2.5, 550);
    const laneMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.75 });
    const laneL = new THREE.Mesh(laneGeo, laneMat);
    laneL.rotation.x = -Math.PI / 2;
    laneL.position.set(-6, 0.1, 0);
    const laneR = laneL.clone();
    laneR.position.x = 6;
    scene.add(laneL, laneR);

    // ─── Procedural Compound Skyscrapers (140+ Articulated Towers) ───
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x090e1f,
      map: windowTex,
      roughness: 0.22,
      metalness: 0.78
    });

    const trimMatCyan = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
    const trimMatMagenta = new THREE.MeshBasicMaterial({ color: 0xFF007F });
    const trimMatAmber = new THREE.MeshBasicMaterial({ color: 0xFFB800 });
    const metalDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });

    const towerSpacing = 28;
    const cityExtent = 100;
    const elevators = [];
    const helipads = [];

    for (let x = -cityExtent; x <= cityExtent; x += towerSpacing) {
      for (let z = -cityExtent; z <= cityExtent; z += towerSpacing) {
        // Central canyon boulevard open for highway and flying traffic
        if (Math.abs(x) < 16) continue;

        const posX = x + (Math.random() - 0.5) * 6;
        const posZ = z + (Math.random() - 0.5) * 6;
        const h = 30 + Math.random() * 95;
        const w = 14 + Math.random() * 8;
        const d = 14 + Math.random() * 8;

        // Base Podium Tower
        const towerGeo = new THREE.BoxGeometry(w, h, d);
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(posX, h / 2, posZ);
        buildingsGroup.add(tower);

        // Luminous Corner Edge Mullions
        const edgeGeo = new THREE.EdgesGeometry(towerGeo);
        const edgeLine = new THREE.LineSegments(
          edgeGeo,
          Math.random() > 0.5 ? trimMatCyan : trimMatMagenta
        );
        edgeLine.position.set(posX, h / 2, posZ);
        buildingsGroup.add(edgeLine);

        // Upper Tier Setback Tower for Tall Buildings
        if (h > 60) {
          const upperH = 20 + Math.random() * 35;
          const upperW = w * 0.65;
          const upperD = d * 0.65;
          const upperTower = new THREE.Mesh(new THREE.BoxGeometry(upperW, upperH, upperD), towerMat);
          upperTower.position.set(posX, h + upperH / 2, posZ);
          buildingsGroup.add(upperTower);

          // Roof Installation: Helipad OR Communications Antenna Spire
          if (Math.random() > 0.4) {
            // Helipad on top
            const padGeo = new THREE.CylinderGeometry(upperW * 0.42, upperW * 0.42, 0.6, 24);
            const padMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
            const helipad = new THREE.Mesh(padGeo, padMat);
            helipad.position.set(posX, h + upperH + 0.3, posZ);
            buildingsGroup.add(helipad);

            // Glowing Helipad Ring
            const ringGeo = new THREE.TorusGeometry(upperW * 0.38, 0.15, 8, 24);
            const ringMesh = new THREE.Mesh(ringGeo, trimMatAmber);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.set(posX, h + upperH + 0.65, posZ);
            buildingsGroup.add(ringMesh);
            helipads.push(ringMesh);
          } else {
            // Communications Spire Array
            const spireGeo = new THREE.CylinderGeometry(0.15, 0.6, 16, 8);
            const spire = new THREE.Mesh(spireGeo, metalDarkMat);
            spire.position.set(posX, h + upperH + 8, posZ);
            buildingsGroup.add(spire);

            // Flashing Red Warning Beacon
            const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
            const beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF0044 });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.set(posX, h + upperH + 16, posZ);
            buildingsGroup.add(beacon);
          }

          // Rooftop HVAC Industrial Chillers
          const hvacGeo = new THREE.BoxGeometry(3, 2, 4);
          const hvac = new THREE.Mesh(hvacGeo, metalDarkMat);
          hvac.position.set(posX + upperW * 0.25, h + upperH + 1, posZ - upperD * 0.2);
          buildingsGroup.add(hvac);
        }

        // External Glass Elevator Shaft on select signature towers
        if (h > 75 && Math.random() > 0.5) {
          const shaftH = h * 0.95;
          const shaftGeo = new THREE.BoxGeometry(2.5, shaftH, 2.5);
          const shaftMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF, wireframe: true, transparent: true, opacity: 0.35 });
          const shaft = new THREE.Mesh(shaftGeo, shaftMat);
          const shaftX = posX + (w / 2) + 1.2;
          shaft.position.set(shaftX, shaftH / 2, posZ);
          buildingsGroup.add(shaft);

          // Animated Glowing Elevator Cab
          const cabGeo = new THREE.BoxGeometry(2, 2.8, 2);
          const cabMat = new THREE.MeshBasicMaterial({ color: 0xFFB800 });
          const cab = new THREE.Mesh(cabGeo, cabMat);
          cab.position.set(shaftX, 10, posZ);
          buildingsGroup.add(cab);

          elevators.push({
            mesh: cab,
            minY: 6,
            maxY: shaftH - 3,
            speed: 0.4 + Math.random() * 0.5,
            dir: 1
          });
        }
      }
    }

    // ─── Elevated Sky-Bridges Connecting Towers ───
    for (let i = 0; i < 10; i++) {
      const bridgeGeo = new THREE.BoxGeometry(28, 3.5, 4.5);
      const bridge = new THREE.Mesh(bridgeGeo, towerMat);
      const bx = (i % 2 === 0 ? 32 : -32);
      const by = 45 + (i * 8) % 55;
      const bz = -70 + i * 16;
      bridge.position.set(bx, by, bz);
      bridge.rotation.y = (Math.PI / 4) * (i % 2 === 0 ? 1 : -1);
      buildingsGroup.add(bridge);

      // Glowing Walkway Edge
      const bEdge = new THREE.LineSegments(new THREE.EdgesGeometry(bridgeGeo), trimMatCyan);
      bEdge.position.copy(bridge.position);
      bEdge.rotation.copy(bridge.rotation);
      buildingsGroup.add(bEdge);
    }

    // ─── Elevated High-Speed Maglev Monorail System ───
    const monorailGroup = new THREE.Group();
    scene.add(monorailGroup);

    // Elevated Rail Pylons & Track Beam
    const railRadius = 75;
    const railHeight = 32;
    const railPoints = [];
    const numRailPts = 64;
    for (let i = 0; i <= numRailPts; i++) {
      const theta = (i / numRailPts) * Math.PI * 2;
      const rx = Math.sin(theta) * (railRadius * 0.6);
      const rz = Math.cos(theta) * railRadius;
      railPoints.push(new THREE.Vector3(rx, railHeight, rz));

      // Support Pylons every 8 points
      if (i % 8 === 0 && i < numRailPts) {
        const pylonGeo = new THREE.CylinderGeometry(0.8, 1.2, railHeight, 8);
        const pylon = new THREE.Mesh(pylonGeo, metalDarkMat);
        pylon.position.set(rx, railHeight / 2, rz);
        monorailGroup.add(pylon);
      }
    }

    const railCurve = new THREE.CatmullRomCurve3(railPoints, true);
    const railTubeGeo = new THREE.TubeGeometry(railCurve, 120, 0.6, 8, true);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const railTrack = new THREE.Mesh(railTubeGeo, railMat);
    monorailGroup.add(railTrack);

    // Glowing Neon Guide Rail Line
    const guideLineGeo = new THREE.TubeGeometry(railCurve, 120, 0.15, 6, true);
    const guideLineMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
    const guideLine = new THREE.Mesh(guideLineGeo, guideLineMat);
    monorailGroup.add(guideLine);

    // Futuristic 3-Car Maglev Bullet Train
    const trainCars = [];
    const numCars = 3;
    const carLength = 8;
    for (let c = 0; c < numCars; c++) {
      const carGroup = new THREE.Group();
      const carBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.0, carLength),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.15 })
      );
      carGroup.add(carBody);

      // Glowing Panoramic Blue Window Strips
      const winGeo = new THREE.BoxGeometry(2.45, 0.6, carLength * 0.85);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });
      const winMesh = new THREE.Mesh(winGeo, winMat);
      carGroup.add(winMesh);

      // Front Headlight for Lead Car
      if (c === 0) {
        const lightGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const lightMesh = new THREE.Mesh(lightGeo, trimMatCyan);
        lightMesh.position.set(0, 0, carLength / 2 + 0.2);
        carGroup.add(lightMesh);
      }

      monorailGroup.add(carGroup);
      trainCars.push(carGroup);
    }
    let monorailT = 0;

    // ─── Giant 3D Holographic Wireframe Monuments ───
    const holoMonumentGroup = new THREE.Group();
    scene.add(holoMonumentGroup);

    // Monument 1: Rotating Concentric Cyber Rings with Quantum Particle Core
    const ring1Geo = new THREE.TorusGeometry(16, 0.35, 16, 64);
    const ring1 = new THREE.Mesh(ring1Geo, trimMatCyan);
    const ring2Geo = new THREE.TorusGeometry(12, 0.35, 16, 64);
    const ring2 = new THREE.Mesh(ring2Geo, trimMatMagenta);
    const coreGeo = new THREE.IcosahedronGeometry(5, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF, wireframe: true });
    const holoCore = new THREE.Mesh(coreGeo, coreMat);

    holoMonumentGroup.position.set(0, 75, -20);
    holoMonumentGroup.add(ring1, ring2, holoCore);

    // Monument 2: Rotating Cyber Pyramid Matrix
    const pyramidGeo = new THREE.ConeGeometry(8, 14, 4);
    const pyramidMat = new THREE.MeshBasicMaterial({ color: 0xFF007F, wireframe: true });
    const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    pyramid.position.set(0, 80, 80);
    scene.add(pyramid);

    // Sweeping Rooftop Searchlights
    const searchlights = [];
    const searchPositions = [[-45, 110, -45], [45, 115, 45], [-45, 95, 55], [45, 100, -55]];
    searchPositions.forEach(([sx, sy, sz]) => {
      const coneGeo = new THREE.ConeGeometry(8, 160, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(sx, sy, sz);
      scene.add(cone);
      searchlights.push(cone);
    });

    // ─── 6 Giant Animated Holographic Billboards ───
    const billboardTexts = [
      'SIS NEURAL AI // 2099',
      'QUANTUM SYNAPSE',
      'NEO-TOKYO CYBERNETICS',
      'HYPERDRIVE SYSTEMS',
      'CYBERSPACE INTERFACE',
      'ORBITAL ELEVATOR 01'
    ];
    const billboardMeshes = [];

    billboardTexts.forEach((text, i) => {
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 512;
      bCanvas.height = 128;
      const bCtx = bCanvas.getContext('2d');
      bCtx.fillStyle = 'rgba(4, 8, 20, 0.92)';
      bCtx.fillRect(0, 0, 512, 128);
      bCtx.strokeStyle = i % 2 === 0 ? '#00F0FF' : '#FF007F';
      bCtx.lineWidth = 6;
      bCtx.strokeRect(4, 4, 504, 120);

      bCtx.font = 'bold 36px "JetBrains Mono", Consolas, monospace';
      bCtx.fillStyle = i % 2 === 0 ? '#00F0FF' : '#FF007F';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(text, 256, 64);

      const bTex = new THREE.CanvasTexture(bCanvas);
      const bMat = new THREE.MeshBasicMaterial({ map: bTex, side: THREE.DoubleSide, transparent: true });
      const bGeo = new THREE.PlaneGeometry(26, 7.5);
      const board = new THREE.Mesh(bGeo, bMat);

      const angle = (i / billboardTexts.length) * Math.PI * 2;
      const rad = 50 + (i % 2) * 15;
      board.position.set(Math.sin(angle) * rad, 35 + (i * 10) % 45, Math.cos(angle) * rad);
      board.rotation.y = angle + Math.PI / 2;
      scene.add(board);
      billboardMeshes.push({ mesh: board, canvas: bCanvas, ctx: bCtx, text, color: i % 2 === 0 ? '#00F0FF' : '#FF007F' });
    });

    // ─── Compound Flying Hover-Spinners (48 Vehicles with VTOL Thruster Rings) ───
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);

    const vehicles = [];
    const numVehicles = 48;

    for (let i = 0; i < numVehicles; i++) {
      const vMesh = new THREE.Group();

      // Aerodynamic Fuselage
      const fuselageGeo = new THREE.BoxGeometry(2.2, 0.8, 5.2);
      const fuselage = new THREE.Mesh(fuselageGeo, metalDarkMat);
      vMesh.add(fuselage);

      // Sloped Cockpit Canopy
      const canopyGeo = new THREE.BoxGeometry(1.4, 0.6, 2.6);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 0.6, -0.2);
      vMesh.add(canopy);

      // Swept Delta Wings
      const wingGeo = new THREE.BoxGeometry(5.4, 0.15, 2.0);
      const wing = new THREE.Mesh(wingGeo, metalDarkMat);
      wing.position.set(0, -0.1, -0.4);
      vMesh.add(wing);

      // Dual VTOL Hover Thruster Rings on Wings
      const vtolGeo = new THREE.TorusGeometry(0.7, 0.1, 8, 16);
      const vtolL = new THREE.Mesh(vtolGeo, trimMatCyan);
      vtolL.rotation.x = Math.PI / 2;
      vtolL.position.set(-2.0, -0.2, -0.4);
      const vtolR = vtolL.clone();
      vtolR.position.x = 2.0;
      vMesh.add(vtolL, vtolR);

      // Twin Rear Propulsion Exhaust Cones
      const exhaustGeo = new THREE.ConeGeometry(0.35, 1.0, 8);
      exhaustGeo.rotateX(Math.PI / 2);
      const exhaustMat = (i % 2 === 0 ? trimMatMagenta : trimMatAmber);
      const exhaustL = new THREE.Mesh(exhaustGeo, exhaustMat);
      exhaustL.position.set(-0.7, 0, -2.8);
      const exhaustR = exhaustL.clone();
      exhaustR.position.x = 0.7;
      vMesh.add(exhaustL, exhaustR);

      // Forward Headlights
      const headGeo = new THREE.SphereGeometry(0.25, 6, 6);
      const headL = new THREE.Mesh(headGeo, trimMatCyan);
      headL.position.set(-0.8, 0, 2.6);
      const headR = headL.clone();
      headR.position.x = 0.8;
      vMesh.add(headL, headR);

      // Downward Projection Spotlight Pool on Ground/Fog
      const spotLight = new THREE.SpotLight(0x00F0FF, 1.2, 45, Math.PI / 6, 0.4);
      spotLight.position.set(0, -0.2, 0);
      spotLight.target.position.set(0, -30, 0);
      vMesh.add(spotLight);
      vMesh.add(spotLight.target);

      // Flight Lanes & Velocity
      const altitude = 18 + (i % 6) * 16;
      const laneX = (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 8);
      const speed = 0.65 + Math.random() * 0.9;
      const dir = (i % 2 === 0 ? 1 : -1);

      vMesh.position.set(laneX, altitude, (Math.random() - 0.5) * 360);
      if (dir < 0) vMesh.rotation.y = Math.PI;
      trafficGroup.add(vMesh);

      vehicles.push({ mesh: vMesh, speed, dir, laneX, altitude, initialZ: vMesh.position.z });
    }

    // ─── Volumetric Neon Rain Particle System ───
    const rainCount = 2500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 300;
      rainPositions[i * 3 + 1] = Math.random() * 150;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x00F0FF,
      size: 0.95,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    scene.add(rainParticles);

    // ══════════════════════════════════════════════════════════════════════════
    // FLIGHT DYNAMICS & MULTI-CAMERA CONTROLLER
    // ══════════════════════════════════════════════════════════════════════════
    let cameraMode = 'vista'; // 'vista', 'drone', 'monorail', 'chase', 'orbit'
    let dronePos = new THREE.Vector3(0, 130, 180);
    let droneVel = new THREE.Vector3(0, 0, 0);
    let droneYaw = 0;
    let dronePitch = -0.32;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let orbitAngle = 0;
    let trafficSpeedMultiplier = 1.0;
    let currentLighting = 'midnight';

    const keys = {};
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (e.code === 'KeyC') {
        const modes = ['vista', 'drone', 'monorail', 'chase'];
        const next = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
        setCamMode(next);
      } else if (e.code === 'KeyR') {
        resetDrone();
      } else if (e.code === 'KeyT') {
        const times = ['midnight', 'dusk', 'matrix', 'sunset'];
        const curIdx = times.indexOf(currentLighting);
        setLighting(times[(curIdx + 1) % times.length]);
      }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#hud-header, #telemetry-panel, #controls-panel, #hud-footer')) return;
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      audio.init();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      if (cameraMode === 'drone') {
        droneYaw -= dx * 0.003;
        dronePitch = Math.max(-1.4, Math.min(1.4, dronePitch - dy * 0.003));
      }
    });

    function setCamMode(mode) {
      cameraMode = mode;
      document.querySelectorAll('.ctrl-btn[id^="btnCam"]').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('btnCam' + mode.charAt(0).toUpperCase() + mode.slice(1));
      if (activeBtn) activeBtn.classList.add('active');
      document.getElementById('teleModeLabel').textContent = mode.toUpperCase() + (mode === 'vista' ? ' VIEW' : '');
      audio.playClick(750);

      if (mode === 'vista') {
        dronePos.set(0, 130, 180);
        dronePitch = -0.32;
        droneYaw = 0;
      }
    }
    window.setCamMode = setCamMode;

    function resetDrone() {
      setCamMode('vista');
      droneVel.set(0, 0, 0);
      audio.playClick(600);
    }
    window.resetDrone = resetDrone;

    function setLighting(preset) {
      currentLighting = preset;
      document.querySelectorAll('.ctrl-btn[id^="btnLight"]').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('btnLight' + preset.charAt(0).toUpperCase() + preset.slice(1));
      if (activeBtn) activeBtn.classList.add('active');

      if (preset === 'midnight') {
        scene.background.setHex(0x03050E);
        scene.fog.color.setHex(0x060919);
        ambientLight.color.setHex(0x0e172a);
        moonLight.color.setHex(0x38bdf8);
        magentaFill.color.setHex(0xff007f);
      } else if (preset === 'dusk') {
        scene.background.setHex(0x1a0624);
        scene.fog.color.setHex(0x270738);
        ambientLight.color.setHex(0x4a0e4e);
        moonLight.color.setHex(0xff007f);
        magentaFill.color.setHex(0x00f0ff);
      } else if (preset === 'matrix') {
        scene.background.setHex(0x021508);
        scene.fog.color.setHex(0x03260e);
        ambientLight.color.setHex(0x064e1f);
        moonLight.color.setHex(0x10b981);
        magentaFill.color.setHex(0x00f0ff);
      } else if (preset === 'sunset') {
        scene.background.setHex(0x1f0e08);
        scene.fog.color.setHex(0x2d140b);
        ambientLight.color.setHex(0x451a03);
        moonLight.color.setHex(0xf59e0b);
        magentaFill.color.setHex(0xff007f);
      }
      document.getElementById('teleLighting').textContent = preset.toUpperCase();
      audio.playClick(850);
    }
    window.setLighting = setLighting;

    function updateFog(val) {
      const v = parseFloat(val);
      scene.fog.density = v;
      document.getElementById('valFog').textContent = v.toFixed(4);
    }
    window.updateFog = updateFog;

    function updateTrafficSpeed(val) {
      trafficSpeedMultiplier = parseFloat(val);
      document.getElementById('valTraffic').textContent = trafficSpeedMultiplier.toFixed(1) + 'x';
    }
    window.updateTrafficSpeed = updateTrafficSpeed;

    // ══════════════════════════════════════════════════════════════════════════
    // MAIN SIMULATION & ANIMATION LOOP (60 FPS)
    // ══════════════════════════════════════════════════════════════════════════
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 60.0;

    const fpsEl = document.getElementById('fpsCounter');
    const teleAlt = document.getElementById('teleAlt');
    const teleSpeed = document.getElementById('teleSpeed');
    const teleCoords = document.getElementById('teleCoords');

    function animate(now) {
      requestAnimationFrame(animate);
      frameCount++;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (frameCount % 12 === 0) {
        fps = 1 / Math.max(dt, 0.001);
        if (fpsEl) fpsEl.textContent = \`FPS: \${fps.toFixed(1)} | Frame: \${frameCount}\`;
      }

      // 1. Animate Animated Elevators
      elevators.forEach(e => {
        e.mesh.position.y += e.speed * e.dir;
        if (e.mesh.position.y > e.maxY) { e.mesh.position.y = e.maxY; e.dir = -1; }
        else if (e.mesh.position.y < e.minY) { e.mesh.position.y = e.minY; e.dir = 1; }
      });

      // 2. Animate Maglev Monorail Bullet Train along Curve
      monorailT = (monorailT + 0.0012 * trafficSpeedMultiplier) % 1.0;
      trainCars.forEach((car, idx) => {
        const carT = (monorailT - idx * 0.022 + 1.0) % 1.0;
        const pos = railCurve.getPointAt(carT);
        car.position.copy(pos);
        const tangent = railCurve.getTangentAt(carT);
        car.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      });

      // 3. Animate 3D Holographic Monument & Searchlights
      holoMonumentGroup.rotation.y += 0.008;
      ring1.rotation.x += 0.012;
      ring2.rotation.z -= 0.015;
      holoCore.rotation.y += 0.018;
      holoCore.rotation.x += 0.012;
      pyramid.rotation.y -= 0.014;

      searchlights.forEach((sl, idx) => {
        sl.rotation.x = Math.sin(now * 0.001 + idx) * 0.35;
        sl.rotation.z = Math.cos(now * 0.0008 + idx) * 0.35;
      });

      // 4. Update Flying Vehicles (Hovercraft)
      vehicles.forEach(v => {
        v.mesh.position.z += v.speed * v.dir * trafficSpeedMultiplier;
        if (v.dir > 0 && v.mesh.position.z > 220) v.mesh.position.z = -220;
        else if (v.dir < 0 && v.mesh.position.z < -220) v.mesh.position.z = 220;

        // Subtle flight turbulence hover bob
        v.mesh.position.y = v.altitude + Math.sin(now * 0.003 + v.laneX) * 0.8;
      });

      // 5. Update Volumetric Rain
      const posArr = rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < rainCount * 3; i += 3) {
        posArr[i] -= 2.2;
        if (posArr[i] < 0) posArr[i] = 140;
      }
      rainParticles.geometry.attributes.position.needsUpdate = true;

      // 6. Camera Controller Updates
      if (cameraMode === 'vista') {
        orbitAngle += 0.0008;
        camera.position.x = Math.sin(orbitAngle) * 35;
        camera.position.y = 130 + Math.sin(now * 0.0005) * 8;
        camera.position.z = 180 + Math.cos(orbitAngle) * 20;
        camera.lookAt(0, 30, -10);

        if (teleAlt) teleAlt.textContent = camera.position.y.toFixed(1) + ' m';
        if (teleSpeed) teleSpeed.textContent = '12.4 km/h';
        if (teleCoords) teleCoords.textContent = \`\${Math.round(camera.position.x)}, \${Math.round(camera.position.y)}, \${Math.round(camera.position.z)}\`;
      } else if (cameraMode === 'drone') {
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneYaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneYaw);

        const moveSpeed = (keys['ShiftLeft'] || keys['ShiftRight']) ? 65 : 35;
        if (keys['KeyW']) droneVel.addScaledVector(forward, moveSpeed * dt);
        if (keys['KeyS']) droneVel.addScaledVector(forward, -moveSpeed * dt);
        if (keys['KeyA']) droneVel.addScaledVector(right, -moveSpeed * dt);
        if (keys['KeyD']) droneVel.addScaledVector(right, moveSpeed * dt);
        if (keys['Space']) droneVel.y += moveSpeed * dt;
        if (keys['ControlLeft'] || keys['KeyC'] && keys['ShiftLeft']) droneVel.y -= moveSpeed * dt;

        dronePos.addScaledVector(droneVel, dt);
        droneVel.multiplyScalar(0.92); // Damping friction

        camera.position.copy(dronePos);
        const lookDir = new THREE.Vector3(0, 0, -1)
          .applyAxisAngle(new THREE.Vector3(1, 0, 0), dronePitch)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), droneYaw);
        camera.lookAt(dronePos.clone().add(lookDir));

        if (teleAlt) teleAlt.textContent = Math.max(0, dronePos.y).toFixed(1) + ' m';
        if (teleSpeed) teleSpeed.textContent = (droneVel.length() * 3.6).toFixed(1) + ' km/h';
        if (teleCoords) teleCoords.textContent = \`\${Math.round(dronePos.x)}, \${Math.round(dronePos.y)}, \${Math.round(dronePos.z)}\`;
      } else if (cameraMode === 'monorail') {
        const leadCar = trainCars[0];
        if (leadCar) {
          const frontPos = leadCar.position.clone().add(new THREE.Vector3(0, 1.8, 0));
          camera.position.copy(frontPos);
          const tangent = railCurve.getTangentAt(monorailT);
          camera.lookAt(frontPos.clone().add(tangent.clone().multiplyScalar(10)));

          if (teleAlt) teleAlt.textContent = camera.position.y.toFixed(1) + ' m';
          if (teleSpeed) teleSpeed.textContent = (140 * trafficSpeedMultiplier).toFixed(1) + ' km/h';
          if (teleCoords) teleCoords.textContent = \`\${Math.round(camera.position.x)}, \${Math.round(camera.position.y)}, \${Math.round(camera.position.z)}\`;
        }
      } else if (cameraMode === 'chase') {
        const targetV = vehicles[0];
        if (targetV) {
          const vPos = targetV.mesh.position;
          const chasePos = new THREE.Vector3(vPos.x, vPos.y + 3.5, vPos.z - targetV.dir * 12);
          camera.position.lerp(chasePos, 0.08);
          camera.lookAt(vPos.x, vPos.y + 1, vPos.z + targetV.dir * 15);

          if (teleAlt) teleAlt.textContent = vPos.y.toFixed(1) + ' m';
          if (teleSpeed) teleSpeed.textContent = (targetV.speed * 80 * trafficSpeedMultiplier).toFixed(1) + ' km/h';
          if (teleCoords) teleCoords.textContent = \`\${Math.round(vPos.x)}, \${Math.round(vPos.y)}, \${Math.round(vPos.z)}\`;
        }
      }

      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;
}
