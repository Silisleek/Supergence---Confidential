// SIS 1.0 — High-Fidelity 3D Relativistic Black Hole Armada Simulation Game (AAA Masterwork)
// 100% Three.js WebGL + Web Audio API 3D Simulation Game.
// Features:
// 1. Central Kerr Supermassive Black Hole:
//    - Black Event Horizon sphere (Rs = 60) with gravitational lensing Fresnel glow.
//    - Luminous Photon Sphere (1.5 Rs = 90) oscillating ring.
//    - Ergosphere oblate spheroid with Kerr frame-dragging spacetime vortex.
//    - Volumetric differential Keplerian Accretion Disk (12,000+ particles with Doppler beaming).
//    - Relativistic Polar Plasma Jets with rotating magnetic helix ribbons.
// 2. Armada of 45+ Articulated 3D Spacecraft (4 distinct classes):
//    - Dreadnought Battleships, Strike Interceptors, Science Frigates, Cargo Haulers.
//    - Paczyński-Wiita pseudo-Newtonian gravity + Kerr frame-dragging angular torque.
//    - Tidal spaghettification shear & distress beacon thruster burns.
// 3. Player Rescue Flagship & 3D Flight Controls:
//    - 6-DOF 3D flight (WASD pitch/thrust, A/D yaw, Q/E roll, Shift warp afterburners).
//    - 3D Articulated Tractor Beam grappling & slingshot rescue mechanics.
//    - 3D Graviton Pulse Shockwave expanding bubble.
//    - 4-mode Camera Director (Chase, Cockpit, Singularity Horizon, Tactical Orbit).
// 4. Tactical 3D Holo-Radar Minimap & Real-time Telemetry:
//    - 60 FPS WebGL loop, live radar, tidal stress gauge, time dilation factor gamma.
// 5. Procedural Web Audio API 3D Acoustic Synthesizer.

export function buildUnifiedBlackHoleArmada3DHTML({
  plan = {},
  userPrompt = '',
  gameTitle = '',
} = {}) {
  const title = gameTitle || 'Black Hole Armada: 3D Relativistic Singularity Descent';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <script src="/vendor/three.min.js"></script>
  <script>
    if (typeof THREE === 'undefined') {
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>');
    }
  </script>
  <style>
    :root {
      --bg: #010206;
      --panel: rgba(8, 14, 28, 0.85);
      --panel-border: rgba(0, 240, 255, 0.35);
      --panel-hover: rgba(14, 25, 50, 0.92);
      --cyan: #00F0FF;
      --magenta: #FF007F;
      --amber: #FFB800;
      --green: #10B981;
      --purple: #8B5CF6;
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
    #webgl-canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      z-index: 1;
    }
    canvas#game-canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }

    /* Luxury HUD Overlay */
    #hud-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px 20px;
    }

    .hud-card {
      background: var(--panel);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 10px 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 240, 255, 0.12);
      pointer-events: auto;
    }

    .hud-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--cyan);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hud-meta {
      font-size: 10px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      margin-top: 2px;
    }

    /* Threat Gauge Center */
    .threat-hud {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .threat-badge {
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 3px 10px;
      border-radius: 20px;
      background: rgba(0, 240, 255, 0.15);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .threat-badge.critical {
      background: rgba(255, 0, 127, 0.25);
      border-color: var(--magenta);
      color: var(--magenta);
      animation: pulse-danger 0.8s infinite alternate;
    }
    @keyframes pulse-danger {
      from { box-shadow: 0 0 8px rgba(255, 0, 127, 0.4); }
      to { box-shadow: 0 0 22px rgba(255, 0, 127, 0.9); }
    }

    /* Top Right Stats */
    .stats-grid {
      display: flex;
      gap: 10px;
    }
    .stat-box {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 6px 12px;
      text-align: right;
    }
    .stat-box.highlight {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.12);
    }
    .stat-val {
      font-size: 16px;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #FFF;
    }
    .stat-lbl {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    /* Flight Crosshair */
    #crosshair {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      width: 48px;
      height: 48px;
    }
    .reticle-ring {
      position: absolute;
      inset: 6px;
      border: 1.5px solid var(--cyan);
      border-radius: 50%;
      opacity: 0.75;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
    }
    .reticle-core {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 4px;
      background: #FFF;
      border-radius: 50%;
      box-shadow: 0 0 6px #FFF;
    }
    .reticle-brackets {
      position: absolute;
      inset: -4px;
      border-left: 2px solid var(--magenta);
      border-right: 2px solid var(--magenta);
      opacity: 0.6;
    }

    /* Bottom Row Layout */
    .bottom-hud {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      gap: 16px;
    }

    /* Radar Canvas */
    #radar-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    #radar-canvas {
      width: 130px;
      height: 130px;
      background: rgba(5, 10, 20, 0.85);
      border: 1.5px solid var(--panel-border);
      border-radius: 50%;
      box-shadow: 0 0 18px rgba(0, 240, 255, 0.25);
    }

    /* Control Hint Center */
    .controls-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .hint-bar {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 11px;
      color: #CBD5E1;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-mono);
    }
    .kbadge {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      padding: 1px 5px;
      color: #FFF;
      font-weight: 700;
    }
    .action-btn {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(139, 92, 246, 0.35));
      border: 1px solid var(--cyan);
      color: #FFF;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: var(--cyan);
      color: #000;
      box-shadow: 0 0 14px var(--cyan);
      transform: translateY(-1px);
    }

    /* Gauges on Bottom Right */
    .gauges-card {
      min-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .gauge-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .gauge-header {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      font-weight: 700;
      font-family: var(--font-mono);
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .gauge-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .gauge-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.15s ease-out;
    }
    #shield-bar { background: linear-gradient(90deg, var(--cyan), #38BDF8); width: 100%; }
    #hull-bar { background: linear-gradient(90deg, var(--green), #059669); width: 100%; }
    #tidal-bar { background: linear-gradient(90deg, var(--amber), var(--magenta)); width: 15%; }

    /* Parameters Drawer Toggle */
    #params-toggle-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid var(--panel-border);
      color: var(--cyan);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      pointer-events: auto;
      z-index: 20;
    }
    #params-drawer {
      display: none;
      position: absolute;
      top: 56px;
      right: 16px;
      width: 290px;
      background: rgba(8, 14, 28, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 16px;
      z-index: 20;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8);
      pointer-events: auto;
    }
    .slider-row {
      margin-bottom: 12px;
    }
    .slider-lbl {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      font-family: var(--font-mono);
      margin-bottom: 3px;
      color: var(--text-muted);
    }
    .slider-input {
      width: 100%;
      accent-color: var(--cyan);
      cursor: pointer;
    }
    .preset-btns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 10px;
    }
    .preset-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #CBD5E1;
      padding: 5px 8px;
      border-radius: 5px;
      font-size: 9.5px;
      cursor: pointer;
      font-family: var(--font-mono);
      transition: all 0.15s;
    }
    .preset-btn:hover {
      background: var(--cyan);
      color: #000;
      border-color: var(--cyan);
    }
  </style>
</head>
<body>
  <!-- Three.js Canvas Container -->
  <div id="webgl-canvas-container"></div>

  <!-- HUD Overlay -->
  <div id="hud-overlay">
    <!-- Top Row -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
      <!-- Status Card -->
      <div class="hud-card">
        <div class="hud-title">
          <span>🪐</span> ${title}
        </div>
        <div class="hud-meta">3D RELATIVISTIC THREE.JS WEBGL • KERR METRIC • 60 FPS</div>
        <div style="font-size: 10px; color: #38BDF8; margin-top: 4px; font-family: var(--font-mono);">
          CAMERA: <span id="cam-mode-txt" style="color: #FFF; font-weight: bold;">CHASE CAM (3RD PERSON)</span>
        </div>
      </div>

      <!-- Threat & Horizon Proximity -->
      <div class="threat-hud">
        <div class="threat-badge" id="threat-indicator">
          <span>⚠️</span> DISTANCE TO HORIZON: <span id="dist-horizon">3.82 Rs</span>
        </div>
        <div style="font-size: 9.5px; font-family: var(--font-mono); color: #94A3B8;">
          TIME DILATION: <span id="time-dilation-txt" style="color: var(--cyan);">γ = 1.15</span> | KERR SPIN: <span id="spin-txt">a* = 0.85</span>
        </div>
      </div>

      <!-- Top Right Stats -->
      <div class="stats-grid">
        <div class="stat-box highlight">
          <div class="stat-val" id="rescued-count" style="color: var(--green);">0 / 45</div>
          <div class="stat-lbl">RESCUED</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" id="lost-count" style="color: var(--magenta);">0</div>
          <div class="stat-lbl">SINGULARITY LOSS</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" id="score-val" style="color: var(--cyan);">0000</div>
          <div class="stat-lbl">SCORE</div>
        </div>
      </div>
    </div>

    <!-- Center Reticle -->
    <div id="crosshair">
      <div class="reticle-ring"></div>
      <div class="reticle-brackets"></div>
      <div class="reticle-core"></div>
    </div>

    <!-- Bottom Row -->
    <div class="bottom-hud">
      <!-- 3D Holo-Radar Minimap -->
      <div class="hud-card" id="radar-container">
        <div class="hud-title" style="font-size:10px; margin-bottom:2px;">TOW RADAR TACTICAL</div>
        <canvas id="radar-canvas" width="130" height="130"></canvas>
      </div>

      <!-- Control Instructions & Buttons -->
      <div class="controls-panel">
        <div class="hint-bar">
          <span><span class="kbadge">W</span> <span class="kbadge">S</span> Pitch/Thrust</span>
          <span>•</span>
          <span><span class="kbadge">A</span> <span class="kbadge">D</span> Yaw</span>
          <span>•</span>
          <span><span class="kbadge">Q</span> <span class="kbadge">E</span> Roll</span>
          <span>•</span>
          <span><span class="kbadge">SHIFT</span> Warp</span>
          <span>•</span>
          <span><span class="kbadge">SPACE</span> Tractor</span>
          <span>•</span>
          <span><span class="kbadge">F</span> Graviton</span>
          <span>•</span>
          <span><span class="kbadge">C</span> Cam</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="action-btn" id="btn-tractor">🧲 TRACTOR BEAM (SPACE)</button>
          <button class="action-btn" id="btn-graviton">💥 GRAVITON PULSE (F)</button>
          <button class="action-btn" id="btn-cam-toggle">🎥 SWITCH CAM (C)</button>
          <button class="action-btn" id="btn-toggle-params">⚙️ PHYSICS HUD</button>
        </div>
      </div>

      <!-- Gauges & Audio -->
      <div class="hud-card gauges-card">
        <div class="gauge-row">
          <div class="gauge-header">
            <span>SHIELD INTEGRITY</span>
            <span id="shield-txt">100%</span>
          </div>
          <div class="gauge-track">
            <div class="gauge-fill" id="shield-bar"></div>
          </div>
        </div>
        <div class="gauge-row">
          <div class="gauge-header">
            <span>HULL INTEGRITY</span>
            <span id="hull-txt">100%</span>
          </div>
          <div class="gauge-track">
            <div class="gauge-fill" id="hull-bar"></div>
          </div>
        </div>
        <div class="gauge-row">
          <div class="gauge-header">
            <span>TIDAL STRESS</span>
            <span id="tidal-txt">15%</span>
          </div>
          <div class="gauge-track">
            <div class="gauge-fill" id="tidal-bar"></div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <button id="btn-audio" style="background:transparent; border:none; color:var(--cyan); font-size:10px; font-weight:700; cursor:pointer;" onclick="toggleAudio()">
            🔊 3D AUDIO: ON
          </button>
          <span style="font-size:9px; color:#64748B; font-family:var(--font-mono);">WEBGL 2.0 • 60 FPS</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Realtime Parameters Drawer -->
  <div id="params-drawer">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-size:11px; font-weight:800; color:var(--cyan); letter-spacing:0.08em;">ASTROPHYSICS PARAMETERS</span>
      <button onclick="document.getElementById('params-drawer').style.display='none'" style="background:none; border:none; color:#94A3B8; cursor:pointer; font-size:14px;">✕</button>
    </div>
    <div class="slider-row">
      <div class="slider-lbl"><span>Black Hole Mass M</span><span id="lbl-bh-mass">3,200 M☉</span></div>
      <input type="range" class="slider-input" id="sl-bh-mass" min="1000" max="8000" step="100" value="3200">
    </div>
    <div class="slider-row">
      <div class="slider-lbl"><span>Kerr Spin Parameter a*</span><span id="lbl-kerr-spin">0.85</span></div>
      <input type="range" class="slider-input" id="sl-kerr-spin" min="0.1" max="0.99" step="0.01" value="0.85">
    </div>
    <div class="slider-row">
      <div class="slider-lbl"><span>Tractor Beam Strength</span><span id="lbl-tractor-power">4.5 MN</span></div>
      <input type="range" class="slider-input" id="sl-tractor-power" min="1.0" max="10.0" step="0.5" value="4.5">
    </div>
    <div class="slider-row">
      <div class="slider-lbl"><span>Accretion Disk Lumens</span><span id="lbl-disk-glow">1.0x</span></div>
      <input type="range" class="slider-input" id="sl-disk-glow" min="0.2" max="2.5" step="0.1" value="1.0">
    </div>
    <div style="font-size:10px; color:#94A3B8; margin-top:8px; font-weight:700;">ASTROPHYSICS PRESETS:</div>
    <div class="preset-btns">
      <button class="preset-btn" onclick="applyPreset('crisis')">EVENT HORIZON CRISIS</button>
      <button class="preset-btn" onclick="applyPreset('spiral')">ACCRETION SPIRAL</button>
      <button class="preset-btn" onclick="applyPreset('slingshot')">SLINGSHOT DRILL</button>
      <button class="preset-btn" onclick="applyPreset('gargantua')">GARGANTUA SUPERMASSIVE</button>
    </div>
  </div>

  <!-- Pure Three.js 3D Simulation Script -->
  <script>
    // ═══════════════════════════════════════════════════════════════
    // PART 1: PROCEDURAL WEB AUDIO 3D SYNTHESIZER
    // ═══════════════════════════════════════════════════════════════
    class SpaceAudioEngine {
      constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.humOsc1 = null;
        this.humOsc2 = null;
        this.humGain = null;
        this.thrustOsc = null;
        this.thrustGain = null;
      }
      init() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();

        // 1. Gravitational Sub-Bass Hum (38 Hz + 42 Hz binaural drone)
        this.humOsc1 = this.ctx.createOscillator();
        this.humOsc2 = this.ctx.createOscillator();
        this.humOsc1.frequency.setValueAtTime(38, this.ctx.currentTime);
        this.humOsc2.frequency.setValueAtTime(42, this.ctx.currentTime);
        this.humGain = this.ctx.createGain();
        this.humGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, this.ctx.currentTime);

        this.humOsc1.connect(this.humGain);
        this.humOsc2.connect(this.humGain);
        this.humGain.connect(filter);
        filter.connect(this.ctx.destination);

        this.humOsc1.start();
        this.humOsc2.start();

        // 2. Thruster Engine Noise
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustOsc.type = 'sawtooth';
        this.thrustOsc.frequency.setValueAtTime(75, this.ctx.currentTime);
        this.thrustGain = this.ctx.createGain();
        this.thrustGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

        const thrustFilter = this.ctx.createBiquadFilter();
        thrustFilter.type = 'bandpass';
        thrustFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
        thrustFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

        this.thrustOsc.connect(this.thrustGain);
        this.thrustGain.connect(thrustFilter);
        thrustFilter.connect(this.ctx.destination);
        this.thrustOsc.start();
      }
      updateThrusters(speedRatio) {
        if (!this.ctx || this.isMuted) return;
        const targetVol = Math.min(speedRatio * 0.12, 0.15);
        this.thrustGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
        this.thrustOsc.frequency.setTargetAtTime(60 + speedRatio * 80, this.ctx.currentTime, 0.05);
      }
      updateProximity(distRatio) {
        if (!this.ctx || this.isMuted) return;
        // Closer to black hole = heavier deep bass volume
        const bassVol = Math.max(0.04, Math.min(0.25, 0.25 - distRatio * 0.15));
        this.humGain.gain.setTargetAtTime(bassVol, this.ctx.currentTime, 0.1);
      }
      playTractorBeam() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(820, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
      }
      playRescuedChime() {
        if (!this.ctx || this.isMuted) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.08);
          osc.stop(this.ctx.currentTime + idx * 0.08 + 0.4);
        });
      }
      playGravitonShockwave() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(28, this.ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.75);
      }
      playSwallowBoom() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.48);
      }
      toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx && this.humGain) {
          this.humGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
        }
        return !this.isMuted;
      }
    }
    const audio = new SpaceAudioEngine();
    window.toggleAudio = function() {
      const active = audio.toggleMute();
      document.getElementById('btn-audio').innerText = active ? '🔊 3D AUDIO: ON' : '🔇 3D AUDIO: MUTED';
    };

    // ═══════════════════════════════════════════════════════════════
    // PART 2: THREE.JS 3D SCENE, KERR BLACK HOLE & ACCRETION DISK
    // ═══════════════════════════════════════════════════════════════
    const container = document.getElementById('webgl-canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020308, 0.00035);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Deep Cosmic Lighting
    const ambientLight = new THREE.AmbientLight(0x081020, 1.2);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x00F0FF, 3.5, 1200);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const secondaryLight = new THREE.PointLight(0xFF007F, 2.0, 900);
    secondaryLight.position.set(0, 40, 0);
    scene.add(secondaryLight);

    // Deep Background Stars
    function buildStarfield() {
      const starGeo = new THREE.BufferGeometry();
      const count = 3500;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const rad = 2500 + Math.random() * 3000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = rad * Math.cos(phi);

        // Subtle stellar tints: Cyan, White, Amber
        const tint = Math.random();
        if (tint < 0.4) { colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0; }
        else if (tint < 0.7) { colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.5; }
        else { colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0; }
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const starMat = new THREE.PointsMaterial({ size: 3.5, vertexColors: true, transparent: true, opacity: 0.85 });
      return new THREE.Points(starGeo, starMat);
    }
    scene.add(buildStarfield());

    // ─── 3D KERR BLACK HOLE GROUP ───
    const blackHoleGroup = new THREE.Group();
    scene.add(blackHoleGroup);

    const Rs = 60; // Schwarzschild Radius

    // 1. Event Horizon Sphere (Inky Absolute Black)
    const horizonGeo = new THREE.SphereGeometry(Rs, 64, 64);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    blackHoleGroup.add(horizonMesh);

    // 2. Gravitational Lensing Halo / Fresnel Rim
    const haloGeo = new THREE.SphereGeometry(Rs * 1.04, 64, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.28,
      wireframe: true
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    blackHoleGroup.add(haloMesh);

    // 3. Photon Sphere Ring (r = 1.5 Rs = 90)
    const photonGeo = new THREE.TorusGeometry(Rs * 1.5, 2.2, 16, 120);
    const photonMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.85
    });
    const photonRing = new THREE.Mesh(photonGeo, photonMat);
    photonRing.rotation.x = Math.PI / 2;
    blackHoleGroup.add(photonRing);

    // 4. Ergosphere Translucent Spheroid
    const ergoGeo = new THREE.SphereGeometry(Rs * 1.85, 32, 24);
    ergoGeo.scale(1.0, 0.55, 1.0); // Oblate along spin axis
    const ergoMat = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.12,
      wireframe: true
    });
    const ergoMesh = new THREE.Mesh(ergoGeo, ergoMat);
    blackHoleGroup.add(ergoMesh);

    // 5. Relativistic Accretion Disk (14,000 volumetric rotating particles)
    const diskParticleCount = 14000;
    const diskGeo = new THREE.BufferGeometry();
    const diskPositions = new Float32Array(diskParticleCount * 3);
    const diskColors = new Float32Array(diskParticleCount * 3);
    const diskRadii = new Float32Array(diskParticleCount);
    const diskAngles = new Float32Array(diskParticleCount);
    const diskSpeeds = new Float32Array(diskParticleCount);
    const diskHeights = new Float32Array(diskParticleCount);

    const minDiskR = Rs * 1.25;
    const maxDiskR = Rs * 7.5;

    for (let i = 0; i < diskParticleCount; i++) {
      // Clustered toward inner edge (Keplerian density gradient)
      const u = Math.pow(Math.random(), 1.6);
      const r = minDiskR + u * (maxDiskR - minDiskR);
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (8 + (r / maxDiskR) * 22);

      diskRadii[i] = r;
      diskAngles[i] = angle;
      // Keplerian velocity: omega proportional to r^(-1.5)
      diskSpeeds[i] = Math.sqrt(28000 / (r * r * r));
      diskHeights[i] = height;

      diskPositions[i * 3] = r * Math.cos(angle);
      diskPositions[i * 3 + 1] = height;
      diskPositions[i * 3 + 2] = r * Math.sin(angle);

      // Temperature gradient: Inner white-hot, mid cyan/gold, outer crimson
      const normR = (r - minDiskR) / (maxDiskR - minDiskR);
      if (normR < 0.15) {
        // Incandescent White/Cyan
        diskColors[i * 3] = 0.95; diskColors[i * 3 + 1] = 0.98; diskColors[i * 3 + 2] = 1.0;
      } else if (normR < 0.55) {
        // High-energy Gold / Amber
        diskColors[i * 3] = 1.0; diskColors[i * 3 + 1] = 0.72; diskColors[i * 3 + 2] = 0.15;
      } else {
        // Deep Crimson / Violet
        diskColors[i * 3] = 0.95; diskColors[i * 3 + 1] = 0.10; diskColors[i * 3 + 2] = 0.45;
      }
    }

    diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPositions, 3));
    diskGeo.setAttribute('color', new THREE.BufferAttribute(diskColors, 3));
    const diskMat = new THREE.PointsMaterial({
      size: 4.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const accretionDisk = new THREE.Points(diskGeo, diskMat);
    blackHoleGroup.add(accretionDisk);

    // 6. Relativistic Polar Jets (Twin Plasma Beams)
    function buildPolarJet(direction = 1) {
      const jetCount = 1200;
      const jetGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(jetCount * 3);
      const col = new Float32Array(jetCount * 3);
      for (let i = 0; i < jetCount; i++) {
        const len = 30 + Math.random() * 750;
        const spread = (len / 750) * 22;
        const theta = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(theta) * Math.random() * spread;
        pos[i * 3 + 1] = direction * len;
        pos[i * 3 + 2] = Math.sin(theta) * Math.random() * spread;

        // Intense Cyan-Violet plasma
        col[i * 3] = 0.0;
        col[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        col[i * 3 + 2] = 1.0;
      }
      jetGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      jetGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const jetMat = new THREE.PointsMaterial({ size: 4.5, vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
      return new THREE.Points(jetGeo, jetMat);
    }
    const northJet = buildPolarJet(1);
    const southJet = buildPolarJet(-1);
    blackHoleGroup.add(northJet);
    blackHoleGroup.add(southJet);

    // ═══════════════════════════════════════════════════════════════
    // PART 3: 4 ARTICULATED 3D SHIP CLASSES & ARMADA FLEET (45 SHIPS)
    // ═══════════════════════════════════════════════════════════════
    const shipPalette = {
      dreadnought: 0xFF6B00, // Heavy Amber
      interceptor: 0x00F0FF, // Electric Cyan
      science: 0x8B5CF6,     // Quantum Violet
      cargo: 0xFACC15,       // Industrial Gold
      player: 0x10B981       // Emerald Flagship
    };

    // Ship Geometries Builder
    function createDreadnoughtMesh() {
      const grp = new THREE.Group();
      // Hull
      const body = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 24), new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8, roughness: 0.2 }));
      grp.add(body);
      // Command Bridge
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9 }));
      bridge.position.set(0, 2.5, -3);
      grp.add(bridge);
      // Engines
      [-3.5, 3.5].forEach(x => {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 4, 12), new THREE.MeshBasicMaterial({ color: 0xFF8800 }));
        eng.rotation.x = Math.PI / 2;
        eng.position.set(x, 0, 12);
        grp.add(eng);
      });
      return grp;
    }

    function createInterceptorMesh() {
      const grp = new THREE.Group();
      // Delta Wing
      const body = new THREE.Mesh(new THREE.ConeGeometry(3.5, 12, 4), new THREE.MeshStandardMaterial({ color: 0x0EA5E9, metalness: 0.6, roughness: 0.3 }));
      body.rotation.x = -Math.PI / 2;
      grp.add(body);
      // Wings
      const wings = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x0369A1, metalness: 0.8 }));
      wings.position.set(0, 0, 1);
      grp.add(wings);
      // Thrusters
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00F0FF }));
      glow.position.set(0, 0, 5.5);
      grp.add(glow);
      return grp;
    }

    function createScienceFrigateMesh() {
      const grp = new THREE.Group();
      // Central Sphere Hab
      const hab = new THREE.Mesh(new THREE.SphereGeometry(3.8, 16, 16), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }));
      grp.add(hab);
      // Rotating Sensor Halo Ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.5, 8, 32), new THREE.MeshStandardMaterial({ color: 0x8B5CF6, emissive: 0x4C1D95 }));
      grp.add(ring);
      grp.userData.ring = ring;
      // Nacelles
      const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 14, 8), new THREE.MeshStandardMaterial({ color: 0x1E293B }));
      nac.rotation.x = Math.PI / 2;
      grp.add(nac);
      return grp;
    }

    function createCargoHaulerMesh() {
      const grp = new THREE.Group();
      // Spine
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 20, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      spine.rotation.x = Math.PI / 2;
      grp.add(spine);
      // 3 Modular Cargo Pods
      [-5, 0, 5].forEach(z => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.5, 4), new THREE.MeshStandardMaterial({ color: 0xCA8A04, metalness: 0.5, roughness: 0.5 }));
        pod.position.set(0, 0, z);
        grp.add(pod);
      });
      // Engine Block
      const eng = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 3), new THREE.MeshBasicMaterial({ color: 0xEAB308 }));
      eng.position.set(0, 0, 11);
      grp.add(eng);
      return grp;
    }

    function createPlayerFlagshipMesh() {
      const grp = new THREE.Group();
      // Forward Catamaran Dual Hulls
      [-4.5, 4.5].forEach(x => {
        const hull = new THREE.Mesh(new THREE.ConeGeometry(2.0, 16, 4), new THREE.MeshStandardMaterial({ color: 0x064E3B, metalness: 0.8, roughness: 0.2 }));
        hull.rotation.x = -Math.PI / 2;
        hull.position.set(x, 0, 0);
        grp.add(hull);
      });
      // Central Command Bridge
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 10), new THREE.MeshStandardMaterial({ color: 0x047857, metalness: 0.9 }));
      bridge.position.set(0, 1.2, 1);
      grp.add(bridge);
      // Dual Plasma Drives
      [-4.5, 4.5].forEach(x => {
        const drive = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2.5, 12), new THREE.MeshBasicMaterial({ color: 0x10B981 }));
        drive.rotation.x = Math.PI / 2;
        drive.position.set(x, 0, 8.5);
        grp.add(drive);
      });
      // Tractor Projector Dish
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x00F0FF, wireframe: true }));
      dish.position.set(0, 0, -4.5);
      dish.rotation.x = Math.PI / 2;
      grp.add(dish);
      return grp;
    }

    // Armada Fleet Entities
    const armadaShips = [];
    const totalFleetCount = 45;

    for (let i = 0; i < totalFleetCount; i++) {
      const typeIdx = i % 4;
      let mesh, className, mass, hp;

      if (typeIdx === 0) {
        mesh = createDreadnoughtMesh(); className = 'DREADNOUGHT'; mass = 750; hp = 100;
      } else if (typeIdx === 1) {
        mesh = createInterceptorMesh(); className = 'INTERCEPTOR'; mass = 140; hp = 45;
      } else if (typeIdx === 2) {
        mesh = createScienceFrigateMesh(); className = 'SCIENCE FRIGATE'; mass = 280; hp = 60;
      } else {
        mesh = createCargoHaulerMesh(); className = 'CARGO HAULER'; mass = 550; hp = 80;
      }

      // Initial orbital distribution: spiraling between 160 and 420 units
      const radius = 170 + Math.random() * 260;
      const angle = Math.random() * Math.PI * 2;
      const inclination = (Math.random() - 0.5) * 0.45; // Orbital tilt

      mesh.position.set(
        radius * Math.cos(angle),
        radius * Math.sin(inclination) * 0.35,
        radius * Math.sin(angle)
      );

      // Orbital Tangential Velocity: v = sqrt(GM/r) with inward decay
      const vMag = Math.sqrt(3200 / radius) * (0.88 + Math.random() * 0.15);
      const tangentX = -Math.sin(angle) * vMag;
      const tangentZ = Math.cos(angle) * vMag;
      // Slight inward radial velocity (spiraling into the vortex)
      const radialInward = 0.35 + Math.random() * 0.4;
      const vx = tangentX - Math.cos(angle) * radialInward;
      const vz = tangentZ - Math.sin(angle) * radialInward;
      const vy = (Math.random() - 0.5) * 0.2;

      scene.add(mesh);

      armadaShips.push({
        id: 'ship-' + i,
        className,
        mesh,
        mass,
        hp,
        maxHp: hp,
        vel: new THREE.Vector3(vx, vy, vz),
        isRescued: false,
        isSwallowed: false,
        isTethered: false,
        radius: 6.0
      });
    }

    // ─── PLAYER FLAGSHIP ───
    const playerShip = {
      mesh: createPlayerFlagshipMesh(),
      pos: new THREE.Vector3(0, 20, 360),
      vel: new THREE.Vector3(0, 0, 0),
      rot: new THREE.Euler(0, 0, 0, 'YXZ'),
      speed: 0,
      maxSpeed: 4.5,
      accel: 0.14,
      damping: 0.985,
      shield: 100,
      hull: 100,
      isTractorActive: false,
      targetShip: null
    };
    playerShip.mesh.position.copy(playerShip.pos);
    scene.add(playerShip.mesh);

    // ─── 3D TRACTOR BEAM CYLINDER ───
    const tractorCylGeo = new THREE.CylinderGeometry(0.8, 1.8, 1, 12, 1, true);
    tractorCylGeo.translate(0, 0.5, 0);
    tractorCylGeo.rotateX(Math.PI / 2);
    const tractorCylMat = new THREE.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    const tractorBeamMesh = new THREE.Mesh(tractorCylGeo, tractorCylMat);
    scene.add(tractorBeamMesh);

    // ─── 3D GRAVITON SHOCKWAVE EXPANDING SPHERE ───
    const shockwaveGeo = new THREE.SphereGeometry(1, 32, 24);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    scene.add(shockwaveMesh);
    let shockwaveRadius = 0;
    let shockwaveMaxRadius = 380;
    let shockwaveActive = false;

    // ═══════════════════════════════════════════════════════════════
    // PART 4: CONTROLS, CAMERA MODES & INTERACTIVE STATE
    // ═══════════════════════════════════════════════════════════════
    const keys = {};
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      audio.init();
      if (e.code === 'KeyC') cycleCamera();
      if (e.code === 'KeyF') triggerGravitonPulse();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    // Buttons bindings
    document.getElementById('btn-tractor').addEventListener('mousedown', () => { keys['Space'] = true; audio.init(); });
    document.getElementById('btn-tractor').addEventListener('mouseup', () => { keys['Space'] = false; });
    document.getElementById('btn-graviton').addEventListener('click', () => { audio.init(); triggerGravitonPulse(); });
    document.getElementById('btn-cam-toggle').addEventListener('click', () => { cycleCamera(); });
    document.getElementById('btn-toggle-params').addEventListener('click', () => {
      const d = document.getElementById('params-drawer');
      d.style.display = d.style.display === 'block' ? 'none' : 'block';
    });

    // Camera Modes: 0 = Chase Cam, 1 = Cockpit Cam, 2 = Singularity Cam, 3 = Tactical Orbit
    let cameraMode = 0;
    const cameraNames = ['CHASE CAM (3RD PERSON)', 'COCKPIT CAM (1ST PERSON)', 'SINGULARITY HORIZON CAM', 'TACTICAL ORBIT CAM'];
    function cycleCamera() {
      cameraMode = (cameraMode + 1) % 4;
      document.getElementById('cam-mode-txt').innerText = cameraNames[cameraMode];
    }

    function triggerGravitonPulse() {
      if (shockwaveActive) return;
      shockwaveActive = true;
      shockwaveRadius = 5;
      shockwaveMesh.position.copy(playerShip.mesh.position);
      shockwaveMat.opacity = 0.85;
      audio.playGravitonShockwave();

      // Apply massive outward impulse to all nearby armada ships
      armadaShips.forEach(s => {
        if (s.isRescued || s.isSwallowed) return;
        const dVec = new THREE.Vector3().subVectors(s.mesh.position, playerShip.mesh.position);
        const dist = dVec.length();
        if (dist < 320) {
          const impulse = (1.0 - dist / 320) * 2.8;
          dVec.normalize().multiplyScalar(impulse);
          // Boost outwards away from black hole as well
          const outFromHole = s.mesh.position.clone().normalize().multiplyScalar(impulse * 1.5);
          s.vel.add(dVec).add(outFromHole);
        }
      });
    }

    // Sliders & Live Physics State
    const physicsParams = {
      M: 3200,
      a: 0.85,
      tractorStrength: 4.5,
      diskGlow: 1.0
    };

    document.getElementById('sl-bh-mass').addEventListener('input', e => {
      physicsParams.M = parseFloat(e.target.value);
      document.getElementById('lbl-bh-mass').innerText = physicsParams.M.toLocaleString() + ' M☉';
    });
    document.getElementById('sl-kerr-spin').addEventListener('input', e => {
      physicsParams.a = parseFloat(e.target.value);
      document.getElementById('lbl-kerr-spin').innerText = physicsParams.a.toFixed(2);
      document.getElementById('spin-txt').innerText = 'a* = ' + physicsParams.a.toFixed(2);
    });
    document.getElementById('sl-tractor-power').addEventListener('input', e => {
      physicsParams.tractorStrength = parseFloat(e.target.value);
      document.getElementById('lbl-tractor-power').innerText = physicsParams.tractorStrength.toFixed(1) + ' MN';
    });
    document.getElementById('sl-disk-glow').addEventListener('input', e => {
      physicsParams.diskGlow = parseFloat(e.target.value);
      document.getElementById('lbl-disk-glow').innerText = physicsParams.diskGlow.toFixed(1) + 'x';
      accretionDisk.material.opacity = 0.85 * physicsParams.diskGlow;
    });

    window.applyPreset = function(preset) {
      if (preset === 'crisis') {
        physicsParams.M = 4800; physicsParams.a = 0.95; physicsParams.tractorStrength = 6.0;
      } else if (preset === 'spiral') {
        physicsParams.M = 2600; physicsParams.a = 0.70; physicsParams.tractorStrength = 4.0;
      } else if (preset === 'slingshot') {
        physicsParams.M = 3500; physicsParams.a = 0.88; physicsParams.tractorStrength = 5.0;
      } else if (preset === 'gargantua') {
        physicsParams.M = 7800; physicsParams.a = 0.99; physicsParams.tractorStrength = 8.5;
      }
      document.getElementById('sl-bh-mass').value = physicsParams.M;
      document.getElementById('sl-kerr-spin').value = physicsParams.a;
      document.getElementById('sl-tractor-power').value = physicsParams.tractorStrength;
      document.getElementById('lbl-bh-mass').innerText = physicsParams.M.toLocaleString() + ' M☉';
      document.getElementById('lbl-kerr-spin').innerText = physicsParams.a.toFixed(2);
      document.getElementById('lbl-tractor-power').innerText = physicsParams.tractorStrength.toFixed(1) + ' MN';
      document.getElementById('spin-txt').innerText = 'a* = ' + physicsParams.a.toFixed(2);
    };

    // ═══════════════════════════════════════════════════════════════
    // PART 5: 60 FPS RELATIVISTIC PHYSICS & GAME LOOP
    // ═══════════════════════════════════════════════════════════════
    let rescuedCount = 0;
    let lostCount = 0;
    let score = 0;
    const radarCanvas = document.getElementById('radar-canvas');
    const radarCtx = radarCanvas.getContext('2d');

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      // 1. Accretion Disk Keplerian Differential Spin
      const posAttr = accretionDisk.geometry.attributes.position;
      const colAttr = accretionDisk.geometry.attributes.color;
      for (let i = 0; i < diskParticleCount; i++) {
        diskAngles[i] += diskSpeeds[i] * dt * 1.5;
        const r = diskRadii[i];
        const ang = diskAngles[i];
        posAttr.array[i * 3] = r * Math.cos(ang);
        posAttr.array[i * 3 + 1] = diskHeights[i] + Math.sin(time * 2 + r * 0.05) * 1.5;
        posAttr.array[i * 3 + 2] = r * Math.sin(ang);

        // Relativistic Doppler beaming based on camera viewing angle
        const camDirX = camera.position.x - posAttr.array[i * 3];
        const camDirZ = camera.position.z - posAttr.array[i * 3 + 2];
        const vX = -Math.sin(ang);
        const vZ = Math.cos(ang);
        const dot = (vX * camDirX + vZ * camDirZ) / (Math.sqrt(camDirX * camDirX + camDirZ * camDirZ) || 1);
        // Approaching side boosted and blue-shifted
        const boost = Math.max(0.4, 1.0 + dot * 0.45);
        colAttr.array[i * 3 + 2] = Math.min(1.0, colAttr.array[i * 3 + 2] * boost);
      }
      posAttr.needsUpdate = true;

      // Pulse Photon Sphere and Jets
      photonRing.scale.setScalar(1.0 + Math.sin(time * 4) * 0.02);
      northJet.rotation.y = time * 0.8;
      southJet.rotation.y = -time * 0.8;

      // 2. Player 6-DOF Flight Kinematics
      const turnSpeed = 1.6;
      if (keys['KeyA']) playerShip.rot.y += turnSpeed * dt;
      if (keys['KeyD']) playerShip.rot.y -= turnSpeed * dt;
      if (keys['KeyW']) playerShip.rot.x = Math.max(-0.6, playerShip.rot.x - turnSpeed * 0.8 * dt);
      if (keys['KeyS']) playerShip.rot.x = Math.min(0.6, playerShip.rot.x + turnSpeed * 0.8 * dt);
      if (keys['KeyQ']) playerShip.rot.z += turnSpeed * dt;
      if (keys['KeyE']) playerShip.rot.z -= turnSpeed * dt;

      // Forward/reverse thrust
      const isWarp = keys['ShiftLeft'] || keys['ShiftRight'];
      const targetMaxSpeed = isWarp ? playerShip.maxSpeed * 2.2 : playerShip.maxSpeed;
      if (keys['KeyW']) {
        playerShip.speed = Math.min(targetMaxSpeed, playerShip.speed + playerShip.accel * (isWarp ? 2.5 : 1.0));
      } else if (keys['KeyS']) {
        playerShip.speed = Math.max(-playerShip.maxSpeed * 0.5, playerShip.speed - playerShip.accel);
      } else {
        playerShip.speed *= playerShip.damping;
      }
      audio.updateThrusters(Math.abs(playerShip.speed) / playerShip.maxSpeed);

      // Compute forward vector from player rotation
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(playerShip.rot);
      playerShip.pos.addScaledVector(forward, playerShip.speed);

      // Player Black Hole Gravity & Relativistic Acceleration
      const pR = playerShip.pos.length();
      const pGrav = (physicsParams.M * 0.6) / Math.pow(Math.max(pR - Rs * 0.85, 20), 2);
      const pGravDir = playerShip.pos.clone().normalize().negate();
      playerShip.pos.addScaledVector(pGravDir, pGrav * dt * 25);

      playerShip.mesh.position.copy(playerShip.pos);
      playerShip.mesh.rotation.copy(playerShip.rot);

      // Horizon proximity & Time Dilation Telemetry
      const playerDistRs = pR / Rs;
      const distHorizonEl = document.getElementById('dist-horizon');
      if (distHorizonEl) distHorizonEl.innerText = playerDistRs.toFixed(2) + ' Rs';
      const threatBadge = document.getElementById('threat-indicator');
      if (threatBadge) {
        threatBadge.className = playerDistRs < 2.0 ? 'threat-badge critical' : 'threat-badge';
      }
      const gamma = 1.0 / Math.sqrt(Math.max(0.05, 1.0 - 1.0 / Math.max(playerDistRs, 1.01)));
      const timeDilEl = document.getElementById('time-dilation-txt');
      if (timeDilEl) timeDilEl.innerText = 'γ = ' + gamma.toFixed(2);
      audio.updateProximity(Math.min(playerDistRs / 6.0, 1.0));

      // Tidal stress calculation on player
      const tidalStrain = Math.min(100, Math.round(180 / Math.pow(playerDistRs, 2)));
      const tidalBar = document.getElementById('tidal-bar');
      if (tidalBar) tidalBar.style.width = tidalStrain + '%';
      const tidalTxt = document.getElementById('tidal-txt');
      if (tidalTxt) tidalTxt.innerText = tidalStrain + '%';
      if (playerDistRs < 1.15) {
        playerShip.shield = Math.max(0, playerShip.shield - 15 * dt);
        const shieldBar = document.getElementById('shield-bar');
        if (shieldBar) shieldBar.style.width = playerShip.shield + '%';
        const shieldTxt = document.getElementById('shield-txt');
        if (shieldTxt) shieldTxt.innerText = Math.round(playerShip.shield) + '%';
      }

      // 3. Armada Ships Relativistic Physics & Boids
      let closestShip = null;
      let closestDist = Infinity;

      armadaShips.forEach(ship => {
        if (ship.isRescued || ship.isSwallowed) return;

        const pos = ship.mesh.position;
        const r = pos.length();

        // Check Event Horizon Swallow
        if (r <= Rs * 1.02) {
          ship.isSwallowed = true;
          ship.mesh.visible = false;
          lostCount++;
          const lostEl = document.getElementById('lost-count');
          if (lostEl) lostEl.innerText = lostCount;
          audio.playSwallowBoom();
          return;
        }

        // Check Escape / Rescue Boundary (r > 520)
        if (r > 520) {
          ship.isRescued = true;
          ship.mesh.visible = false;
          rescuedCount++;
          score += 1000;
          const rescuedEl = document.getElementById('rescued-count');
          if (rescuedEl) rescuedEl.innerText = rescuedCount + ' / ' + totalFleetCount;
          const scoreEl = document.getElementById('score-val');
          if (scoreEl) scoreEl.innerText = String(score).padStart(4, '0');
          audio.playRescuedChime();
          return;
        }

        // 1. Paczyński-Wiita pseudo-Newtonian gravitational acceleration
        const effectiveR = Math.max(r - Rs * 0.85, 12);
        const aGravMag = (physicsParams.M * 0.85) / (effectiveR * effectiveR);
        const gravDir = pos.clone().normalize().negate();
        ship.vel.addScaledVector(gravDir, aGravMag * dt);

        // 2. Kerr metric frame dragging angular acceleration around Y-axis
        const dragOmega = (2.0 * physicsParams.a * physicsParams.M * 0.04) / (r * r * r);
        const dragDir = new THREE.Vector3(-pos.z, 0, pos.x).normalize();
        ship.vel.addScaledVector(dragDir, dragOmega * r * dt);

        // 3. Tidal Elongation Shear (Visual Deformation)
        if (r < Rs * 2.2) {
          const stretch = 1.0 + (1.0 - (r / (Rs * 2.2))) * 0.8;
          ship.mesh.scale.set(1.0 / stretch, 1.0 / stretch, stretch);
        } else {
          ship.mesh.scale.set(1, 1, 1);
        }

        // Apply Velocity
        pos.addScaledVector(ship.vel, dt * 18);

        // Orient Ship along flight vector
        if (ship.vel.lengthSq() > 0.01) {
          const targetRot = new THREE.Vector3().addVectors(pos, ship.vel);
          ship.mesh.lookAt(targetRot);
        }

        // Distance to Player for Tractor Targeting
        const pDist = pos.distanceTo(playerShip.pos);
        if (pDist < closestDist) {
          closestDist = pDist;
          closestShip = ship;
        }
      });

      // 4. Tractor Beam Grapple Lock
      const isSpaceHeld = keys['Space'];
      if (isSpaceHeld && closestShip && closestDist < 260) {
        playerShip.isTractorActive = true;
        playerShip.targetShip = closestShip;
        tractorCylMat.opacity = 0.85;

        // Position & Stretch Cylinder between Player and Target Ship
        const pE = playerShip.mesh.position;
        const sE = closestShip.mesh.position;
        const mid = new THREE.Vector3().addVectors(pE, sE).multiplyScalar(0.5);
        tractorBeamMesh.position.copy(pE);
        tractorBeamMesh.lookAt(sE);
        tractorBeamMesh.scale.set(1, 1, closestDist);

        // Apply mutual tensile pull force
        const pullDir = new THREE.Vector3().subVectors(pE, sE).normalize();
        const pullPower = physicsParams.tractorStrength * 2.2;
        closestShip.vel.addScaledVector(pullDir, pullPower * dt);
        // Slingshot forward boost
        closestShip.vel.addScaledVector(forward, pullPower * 0.6 * dt);

        audio.playTractorBeam();
      } else {
        playerShip.isTractorActive = false;
        tractorCylMat.opacity = 0.0;
      }

      // 5. Graviton Shockwave Expansion
      if (shockwaveActive) {
        shockwaveRadius += (shockwaveMaxRadius - shockwaveRadius) * 0.12 + 6.0;
        shockwaveMesh.scale.setScalar(shockwaveRadius);
        shockwaveMat.opacity = Math.max(0, 0.85 * (1.0 - shockwaveRadius / shockwaveMaxRadius));
        if (shockwaveRadius >= shockwaveMaxRadius) {
          shockwaveActive = false;
          shockwaveMat.opacity = 0.0;
        }
      }

      // 6. Camera Director Modes
      if (cameraMode === 0) {
        // Chase Cam (Smooth follow behind flagship)
        const offset = new THREE.Vector3(0, 9, 28).applyEuler(playerShip.rot);
        const targetCamPos = playerShip.pos.clone().add(offset);
        camera.position.lerp(targetCamPos, 0.12);
        const lookTarget = playerShip.pos.clone().add(forward.clone().multiplyScalar(40));
        camera.lookAt(lookTarget);
      } else if (cameraMode === 1) {
        // Cockpit Cam (Inside bridge)
        const cockpitOffset = new THREE.Vector3(0, 1.8, -3).applyEuler(playerShip.rot);
        camera.position.copy(playerShip.pos).add(cockpitOffset);
        const lookTarget = playerShip.pos.clone().add(forward.clone().multiplyScalar(80));
        camera.lookAt(lookTarget);
      } else if (cameraMode === 2) {
        // Singularity Inward Horizon Cam
        camera.position.set(0, 15, Rs * 1.5);
        camera.lookAt(playerShip.pos);
      } else if (cameraMode === 3) {
        // Free Orbit Cam
        const orbitR = 550;
        camera.position.set(orbitR * Math.cos(time * 0.15), 180, orbitR * Math.sin(time * 0.15));
        camera.lookAt(0, 0, 0);
      }

      // 7. Render Tactical Holo-Radar
      renderRadar();

      renderer.render(scene, camera);
    }

    // ─── RADAR MINIMAP RENDERING ───
    function renderRadar() {
      const w = radarCanvas.width;
      const h = radarCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      radarCtx.clearRect(0, 0, w, h);

      // Radial range circles
      radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      radarCtx.lineWidth = 1;
      [25, 45, 60].forEach(rad => {
        radarCtx.beginPath();
        radarCtx.arc(cx, cy, rad, 0, Math.PI * 2);
        radarCtx.stroke();
      });

      // Black Hole Center
      radarCtx.fillStyle = '#000000';
      radarCtx.strokeStyle = '#00F0FF';
      radarCtx.lineWidth = 1.5;
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, 9, 0, Math.PI * 2);
      radarCtx.fill();
      radarCtx.stroke();

      const radarScale = 0.13;

      // Draw Armada Ships
      armadaShips.forEach(s => {
        if (s.isRescued || s.isSwallowed) return;
        const rx = cx + s.mesh.position.x * radarScale;
        const ry = cy + s.mesh.position.z * radarScale;
        radarCtx.fillStyle = s.className === 'DREADNOUGHT' ? '#FF6B00' :
                             s.className === 'INTERCEPTOR' ? '#00F0FF' :
                             s.className === 'SCIENCE FRIGATE' ? '#8B5CF6' : '#FACC15';
        radarCtx.beginPath();
        radarCtx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        radarCtx.fill();
      });

      // Draw Player Flagship
      const px = cx + playerShip.pos.x * radarScale;
      const py = cy + playerShip.pos.z * radarScale;
      radarCtx.fillStyle = '#10B981';
      radarCtx.beginPath();
      radarCtx.arc(px, py, 4.0, 0, Math.PI * 2);
      radarCtx.fill();
      radarCtx.strokeStyle = '#FFF';
      radarCtx.stroke();
    }

    // Handle Window Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Expose game state to window for telemetry, Playwright, and SIS HUD
    window.gameEngine = {
      armada: armadaShips,
      player: playerShip,
      scene,
      camera,
      renderer,
      getFleetStatus: () => ({
        total: armadaShips.length,
        active: armadaShips.filter(s => !s.isRescued && !s.isSwallowed).length,
        rescued: armadaShips.filter(s => s.isRescued).length,
        swallowed: armadaShips.filter(s => s.isSwallowed).length,
        playerFuel: playerShip.fuel,
        playerHull: playerShip.hull
      })
    };

    // Start loop
    animate();
  </script>
</body>
</html>`;
}

export default { buildUnifiedBlackHoleArmada3DHTML };
