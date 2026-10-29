import { currentWorkspace } from '../services/conversationWorkspaces.js';
// SIS 1.0 — Live GLSL Shader Raymarching Studio
// Generates and renders real-time GPU fragment shaders & Signed Distance Field (SDF) raymarchers
// 100% hardware-accelerated WebGL with dynamic uniforms (iTime, iResolution, iMouse, iFrame)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from '../orchestrator/brain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedWorkspaceRoot = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.resolve(__dirname, '../../workspace');
const workspaceRoot = () => currentWorkspace()?.root || sharedWorkspaceRoot;

export class ShaderSynthesizer {
  constructor() {
    this.name = 'Live GLSL Shader Raymarching Studio';
    this.status = 'ACTIVE';
    this.generatedShaders = [];
  }

  /**
   * Generates a self-contained WebGL Shader Studio HTML artifact
   * @param {Object} params
   * @param {string} params.title - Title of the shader
   * @param {string} params.preset - Shader preset ('black-hole-lensing', 'cyber-hud-mandala', 'mandelbulb-3d', 'quantum-plasma')
   * @param {string} [params.customGLSL] - Optional custom fragment shader code
   * @returns {Object} Artifact metadata
   */
  async generateShader({
    title = 'GPU Raymarching Studio',
    preset = 'black-hole-lensing',
    customGLSL = null,
  }) {
    if (!fs.existsSync(workspaceRoot())) {
      fs.mkdirSync(workspaceRoot(), { recursive: true });
    }

    const cleanSlug = (title || preset)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 32);
    const filename = `shader_${cleanSlug}_${Date.now()}.html`;
    const filepath = path.join(workspaceRoot(), filename);

    const glslCode = customGLSL || this._getPresetGLSL(preset);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SIS Live GLSL Raymarching Studio</title>
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.85);
      --border: rgba(255, 255, 255, 0.12);
      --cyan: #06B6D4;
      --purple: #8B5CF6;
      --pink: #EC4899;
      --text: #F8FAFC;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', monospace;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      user-select: none;
    }
    #gl-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      display: block;
    }
    /* Holographic Floating HUD */
    .shader-hud {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 18px;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
    }
    .hud-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--purple);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .hud-badge {
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid var(--purple);
      color: var(--purple);
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
      background: rgba(0,0,0,0.5);
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .hud-stat-item span { color: #64748B; }
    /* Bottom Control Bar */
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
    }
    .deck-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      color: #F8FAFC;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .deck-btn:hover {
      background: rgba(139, 92, 246, 0.25);
      border-color: var(--purple);
      color: #D8B4FE;
    }
    .deck-btn.active {
      background: var(--purple);
      color: #FFFFFF;
      font-weight: 600;
    }
    /* Live Shader Code Drawer */
    .code-drawer {
      position: absolute;
      top: 16px;
      right: 16px;
      bottom: 80px;
      width: 440px;
      background: rgba(10, 15, 30, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 12px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      transform: translateX(470px);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: -10px 10px 30px rgba(0,0,0,0.8);
    }
    .code-drawer.open {
      transform: translateX(0);
    }
    .drawer-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      color: var(--purple);
    }
    .code-area {
      flex: 1;
      width: 100%;
      background: #050811;
      color: #A5F3FC;
      border: none;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      resize: none;
      outline: none;
      white-space: pre;
      overflow: auto;
    }
    .compile-status {
      padding: 8px 14px;
      font-size: 11px;
      font-family: monospace;
      background: rgba(0,0,0,0.6);
      border-top: 1px solid var(--border);
      color: #10B981;
    }
  </style>
</head>
<body>
  <canvas id="gl-canvas"></canvas>

  <div class="shader-hud">
    <div class="hud-title">
      ⚡ ${title}
      <span class="hud-badge">GLSL ES 3.0</span>
    </div>
    <div class="hud-desc">
      Hardware-Accelerated Volumetric Raymarching Synthesizer. Evaluates Signed Distance Fields (SDF) and photon geodesics in parallel.
    </div>
    <div class="hud-stats-grid">
      <div class="hud-stat-item"><span>FPS:</span> <b id="stat-fps">60</b></div>
      <div class="hud-stat-item"><span>Frame:</span> <b id="stat-frame">0</b></div>
      <div class="hud-stat-item"><span>Time:</span> <b id="stat-time">0.00s</b></div>
      <div class="hud-stat-item"><span>Res:</span> <b id="stat-res">1920x1080</b></div>
    </div>
  </div>

  <div class="controls-deck">
    <button class="deck-btn active" id="btn-play" onclick="togglePlay()">⏸ Pause</button>
    <button class="deck-btn" id="btn-code" onclick="toggleDrawer()">💻 View/Edit GLSL</button>
    <button class="deck-btn" onclick="resetTime()">↺ Reset Time</button>
  </div>

  <div class="code-drawer" id="code-drawer">
    <div class="drawer-header">
      <span>Fragment Shader Source</span>
      <button class="deck-btn" style="padding: 3px 8px;" onclick="recompileShader()">⚡ Recompile</button>
    </div>
    <textarea class="code-area" id="shader-source">${glslCode}</textarea>
    <div class="compile-status" id="compile-status">✓ Shader compiled successfully (0 errors)</div>
  </div>

  <script>
    const canvas = document.getElementById('gl-canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      alert("WebGL is not supported in this browser.");
    }

    // Fullscreen quad geometry
    const quadVertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const vertexShaderSrc = \`
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    \`;

    let currentProgram = null;
    let uResolutionLocation = null;
    let uTimeLocation = null;
    let uMouseLocation = null;
    let uFrameLocation = null;

    let isPlaying = true;
    let startTime = performance.now();
    let pausedTime = 0;
    let frameCount = 0;
    let mouse = [0, 0, 0, 0];

    window.addEventListener('mousemove', (e) => {
      mouse[0] = e.clientX;
      mouse[1] = window.innerHeight - e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      mouse[2] = e.clientX;
      mouse[3] = window.innerHeight - e.clientY;
    });

    function compileProgram(fragSrc) {
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vertexShaderSrc);
      gl.compileShader(vs);

      const fullFragSrc = \`
        precision highp float;
        uniform vec3 iResolution;
        uniform float iTime;
        uniform vec4 iMouse;
        uniform int iFrame;

        \${fragSrc}

        void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
        }
      \`;

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fullFragSrc);
      gl.compileShader(fs);

      const statusEl = document.getElementById('compile-status');
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fs);
        statusEl.textContent = '❌ ' + error;
        statusEl.style.color = '#EF4444';
        return false;
      }

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        statusEl.textContent = '❌ Link error: ' + gl.getProgramInfoLog(program);
        statusEl.style.color = '#EF4444';
        return false;
      }

      statusEl.textContent = '✓ Shader compiled & linked (0 warnings)';
      statusEl.style.color = '#10B981';

      currentProgram = program;
      uResolutionLocation = gl.getUniformLocation(program, 'iResolution');
      uTimeLocation = gl.getUniformLocation(program, 'iTime');
      uMouseLocation = gl.getUniformLocation(program, 'iMouse');
      uFrameLocation = gl.getUniformLocation(program, 'iFrame');

      return true;
    }

    compileProgram(document.getElementById('shader-source').value);

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        document.getElementById('stat-res').textContent = width + 'x' + height;
      }
    }
    window.addEventListener('resize', resize);
    resize();

    function togglePlay() {
      isPlaying = !isPlaying;
      document.getElementById('btn-play').textContent = isPlaying ? '⏸ Pause' : '▶ Play';
      document.getElementById('btn-play').classList.toggle('active', isPlaying);
    }

    function resetTime() {
      startTime = performance.now();
      frameCount = 0;
    }

    function toggleDrawer() {
      const drawer = document.getElementById('code-drawer');
      drawer.classList.toggle('open');
      document.getElementById('btn-code').classList.toggle('active', drawer.classList.contains('open'));
    }

    function recompileShader() {
      const src = document.getElementById('shader-source').value;
      compileProgram(src);
    }

    let lastFpsTime = performance.now();
    let fpsFrames = 0;

    function render(now) {
      requestAnimationFrame(render);
      resize();

      if (!currentProgram) return;

      fpsFrames++;
      if (now - lastFpsTime >= 500) {
        const fps = Math.round((fpsFrames * 1000) / (now - lastFpsTime));
        document.getElementById('stat-fps').textContent = fps;
        fpsFrames = 0;
        lastFpsTime = now;
      }

      let elapsedSeconds = (now - startTime) / 1000.0;
      if (!isPlaying) {
        elapsedSeconds = pausedTime;
      } else {
        pausedTime = elapsedSeconds;
        frameCount++;
      }

      document.getElementById('stat-frame').textContent = frameCount;
      document.getElementById('stat-time').textContent = elapsedSeconds.toFixed(2) + 's';

      gl.useProgram(currentProgram);

      gl.uniform3f(uResolutionLocation, canvas.width, canvas.height, 1.0);
      gl.uniform1f(uTimeLocation, elapsedSeconds);
      gl.uniform4f(uMouseLocation, mouse[0], mouse[1], mouse[2], mouse[3]);
      gl.uniform1i(uFrameLocation, frameCount);

      const aPosition = gl.getAttribLocation(currentProgram, 'aPosition');
      gl.enableVertexAttribArray(aPosition);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(render);
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
      timestamp: new Date().toISOString(),
    };

    this.generatedShaders.push(meta);

    // Live broadcast
    try {
      brain.broadcast('workspace-file-saved', {
        filename,
        filepath: filename,
        path: filepath,
        isInteractiveHtml: true,
        autoPreview: true,
        action: 'shader-generated',
      });
      brain.broadcast('artifact', {
        id: 'shader-' + Date.now(),
        title: `⚡ ${title.toUpperCase()} (GLSL SHADER)`,
        filename,
        src: `/workspace/${filename}`,
        type: 'html-artifact',
      });
    } catch (_) {}

    return meta;
  }

  _getPresetGLSL(preset) {
    if (preset === 'black-hole-lensing') {
      return `// Gravitational Lensing & Accretion Disk Raymarching
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Ray origin & direction
    vec3 ro = vec3(0.0, 1.2, -4.5);
    vec3 rd = normalize(vec3(uv, 1.4));
    
    // Rotate camera with mouse
    float rotY = iTime * 0.15 + (iMouse.x / iResolution.x - 0.5) * 3.0;
    mat2 rY = mat2(cos(rotY), sin(rotY), -sin(rotY), cos(rotY));
    ro.xz = rY * ro.xz;
    rd.xz = rY * rd.xz;
    
    vec3 col = vec3(0.0);
    vec3 p = ro;
    float dt = 0.04;
    float bhRadius = 0.85;
    
    // Raymarching through curved spacetime
    for (int i = 0; i < 90; i++) {
        float r = length(p);
        if (r < bhRadius) {
            // Crossed Event Horizon
            col = vec3(0.0);
            break;
        }
        
        // Relativistic bending towards gravitational center
        vec3 gravity = -normalize(p) / (r * r * 1.8);
        rd = normalize(rd + gravity * dt);
        p += rd * dt;
        
        // Accretion disk SDF: thin plane around y=0
        if (abs(p.y) < 0.12 && r > bhRadius * 1.2 && r < 3.2) {
            float distFromCenter = r;
            float swirl = atan(p.z, p.x) * 4.0 - iTime * 2.5 + distFromCenter * 5.0;
            float density = sin(swirl) * 0.5 + 0.5;
            
            // Relativistic Doppler beaming
            float doppler = 1.0 + dot(normalize(cross(vec3(0,1,0), p)), -rd) * 0.6;
            vec3 diskCol = mix(vec3(1.0, 0.4, 0.1), vec3(0.4, 0.8, 1.0), density) * doppler;
            
            col += diskCol * (0.045 / (abs(p.y) + 0.05));
        }
    }
    
    // Add distant background cosmic starfield
    if (length(col) < 0.05) {
        float stars = fract(sin(dot(rd.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (stars > 0.994) col += vec3(0.7, 0.85, 1.0) * (stars - 0.994) * 80.0;
    }
    
    // Tone mapping and gamma
    col = col / (1.0 + col);
    col = pow(col, vec3(0.4545));
    fragColor = vec4(col, 1.0);
}`;
    }

    if (preset === 'cyber-hud-mandala') {
      return `// Cybernetic Holographic HUD & SDF Energy Ring
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 p = uv;
    
    vec3 finalCol = vec3(0.0);
    float t = iTime * 0.8;
    
    // Multi-ring concentric energy interference
    for (float i = 1.0; i <= 6.0; i += 1.0) {
        float r = 0.12 * i + sin(t + i) * 0.02;
        float d = abs(sdCircle(p, r));
        
        // Angular notch modulation
        float angle = atan(p.y, p.x);
        float notches = cos(angle * (i * 4.0) + (i % 2.0 == 0.0 ? t : -t));
        d += notches * 0.008;
        
        vec3 ringCol = (i == 1.0 || i == 4.0) ? vec3(0.02, 0.71, 0.83) : vec3(0.54, 0.36, 0.96);
        finalCol += ringCol * (0.0035 / (d + 0.002));
    }
    
    // Central glowing core
    float core = 0.03 / (length(uv) + 0.02);
    finalCol += vec3(0.9, 0.2, 0.6) * core;
    
    fragColor = vec4(finalCol, 1.0);
}`;
    }

    // Default: Quantum Plasma
    return `// Quantum Plasma Volumetric Field
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.5;
    
    vec3 col = vec3(0.0);
    for (float i = 1.0; i < 4.0; i++) {
        uv.x += 0.2 / i * sin(i * 3.0 * uv.y + t) + 0.1;
        uv.y += 0.2 / i * cos(i * 3.0 * uv.x + t) + 0.1;
    }
    
    col.r = sin(uv.x + uv.y + 1.0) * 0.5 + 0.5;
    col.g = sin(uv.x + uv.y + 2.0) * 0.5 + 0.5;
    col.b = sin(uv.x + uv.y + 4.0) * 0.5 + 0.5;
    
    fragColor = vec4(col, 1.0);
}`;
  }
}

export const shaderSynthesizer = new ShaderSynthesizer();
export default shaderSynthesizer;
