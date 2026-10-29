import { currentWorkspace } from '../services/conversationWorkspaces.js';
// SIS 1.0 — Blender Automation & 3D Generator Engine
// Direct programmatic control over Blender 5.x / 4.x via bpy, live Blender MCP socket (port 9876), and desktop launch

import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { quickAI, PREMIUM_MODEL } from '../api/openrouter.js';
import shortTermMemory from '../memory/short-term.js';
import { childEnvironment } from '../security/child-environment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedWorkspaceRoot = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.join(__dirname, '../../workspace');
const workspaceRoot = () => currentWorkspace()?.root || sharedWorkspaceRoot;
const workspaceUrl = (filename) =>
  '/workspace/' +
  (currentWorkspace()
    ? ['chats', currentWorkspace().conversationId, ...filename.replaceAll('\\', '/').split('/')]
    : filename.replaceAll('\\', '/').split('/')
  )
    .map(encodeURIComponent)
    .join('/');
if (!fs.existsSync(workspaceRoot())) fs.mkdirSync(workspaceRoot(), { recursive: true });

function fileOrAliasExists(p) {
  if (!p) return false;
  try {
    return fs.existsSync(p) || fs.lstatSync(p).isFile() || fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Blender MCP Socket Client
 * Direct bidirectional TCP interface to Blender's live MCP addon running on port 9876
 */
class BlenderMCPClient {
  constructor(host = '127.0.0.1', port = 9876) {
    this.host = host;
    this.port = port;
  }

  /**
   * Ping the Blender MCP socket server to check liveness
   */
  async isConnected(timeoutMs = 1500) {
    try {
      const res = await this.sendCommand('ping', {}, timeoutMs);
      return !!(res && res.status === 'success' && res.result && res.result.pong === true);
    } catch {
      return false;
    }
  }

  /**
   * Send JSON command over TCP socket and await complete JSON response
   */
  sendCommand(type, params = {}, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let responseData = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          socket.destroy();
          reject(new Error(`Blender MCP timeout for command '${type}' after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      socket.connect(this.port, this.host, () => {
        socket.write(JSON.stringify({ type, params }));
      });

      socket.on('data', (chunk) => {
        responseData += chunk.toString('utf8');
        try {
          const json = JSON.parse(responseData);
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(json);
          }
        } catch {
          // Incomplete chunk: wait for more data
        }
      });

      socket.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          socket.destroy();
          reject(err);
        }
      });
    });
  }

  /**
   * Execute Python bpy code live in the active Blender viewport
   */
  async executeCode(code, timeoutMs = 60000) {
    const res = await this.sendCommand('execute_code', { code }, timeoutMs);
    if (res.status === 'success') {
      return {
        success: true,
        output: (res.result && res.result.result) || '',
        ...res.result,
      };
    } else {
      return {
        success: false,
        error: res.message || 'Blender MCP code execution failed',
      };
    }
  }

  /**
   * Get active scene metadata & object tree
   */
  async getSceneInfo() {
    const res = await this.sendCommand('get_scene_info', {}, 10000);
    if (res.status === 'success') {
      return { success: true, ...res.result };
    }
    throw new Error(res.message || 'Failed to retrieve scene info from Blender MCP');
  }

  /**
   * Get detailed geometry, bounding box, dimensions, and modifiers for a named object
   */
  async getObjectInfo(name) {
    const res = await this.sendCommand('get_object_info', { name }, 10000);
    if (res.status === 'success') {
      return { success: true, ...res.result };
    }
    throw new Error(res.message || `Failed to retrieve object info for "${name}"`);
  }

  /**
   * Capture a live 3D viewport screenshot via Blender MCP offscreen GPU renderer
   */
  async getViewportScreenshot(filepath, maxSize = 1024) {
    const res = await this.sendCommand(
      'get_viewport_screenshot',
      { filepath, max_size: maxSize },
      30000,
    );
    if (res.status === 'success') {
      return { success: true, ...res.result };
    }
    throw new Error(res.message || 'Failed to capture viewport screenshot');
  }
}

class BlenderEngine {
  constructor() {
    this.blenderPath = null;
    this.version = null;
    this.isInitialized = false;
    this.mcp = new BlenderMCPClient();
  }

  /**
   * Find and cache the Blender executable path
   */
  findExecutable() {
    if (this.blenderPath && fileOrAliasExists(this.blenderPath)) {
      return this.blenderPath;
    }

    // 1. Check environment variable override
    if (process.env.BLENDER_PATH && fileOrAliasExists(process.env.BLENDER_PATH)) {
      this.blenderPath = process.env.BLENDER_PATH;
      return this.blenderPath;
    }

    // 2. Candidate locations on Windows
    const localAppData =
      process.env.LOCALAPPDATA ||
      path.join(process.env.USERPROFILE || 'C:\\Users\\Akshan sharma', 'AppData\\Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';

    const candidates = [
      path.join(localAppData, 'Microsoft\\WindowsApps\\blender-launcher.exe'),
      path.join(
        localAppData,
        'Microsoft\\WindowsApps\\BlenderFoundation.Blender_ppwjx1n5r4v9t\\blender-launcher.exe',
      ),
      path.join(programFiles, 'Blender Foundation\\Blender 5.2\\blender.exe'),
      path.join(programFiles, 'Blender Foundation\\Blender 4.3\\blender.exe'),
      path.join(programFiles, 'Blender Foundation\\Blender 4.2\\blender.exe'),
      path.join(programFiles, 'Blender Foundation\\Blender 4.1\\blender.exe'),
      path.join(programFiles, 'Blender Foundation\\Blender 4.0\\blender.exe'),
      path.join(programFiles, 'Blender Foundation\\Blender\\blender.exe'),
      path.join(localAppData, 'Programs\\Blender Foundation\\Blender\\blender.exe'),
    ];

    for (const candidate of candidates) {
      if (fileOrAliasExists(candidate)) {
        this.blenderPath = candidate;
        return this.blenderPath;
      }
    }

    // 3. Fallback: check PATH using where.exe
    try {
      const out = execSync('where blender', {
        encoding: 'utf8',
        env: childEnvironment(),
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      const firstLine = out.split(/\r?\n/)[0];
      if (firstLine && fileOrAliasExists(firstLine)) {
        this.blenderPath = firstLine;
        return this.blenderPath;
      }
    } catch {}

    return null;
  }

  /**
   * Ensure Blender MCP server is running and ready on port 9876.
   * If not connected, launches Blender GUI (which auto-starts Blender MCP addon) and waits for socket.
   */
  async ensureMcpReady(maxWaitMs = 15000) {
    if (await this.mcp.isConnected(1500)) {
      return true;
    }

    try {
      console.log(
        '[BlenderEngine] Blender MCP not yet connected on port 9876. Launching Blender session...',
      );
      this.openInBlender();
    } catch (e) {
      console.warn('[BlenderEngine] Auto-launch failed:', e.message);
      return false;
    }

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await this.mcp.isConnected(1000)) {
        console.log('[BlenderEngine] Successfully connected to live Blender MCP server!');
        return true;
      }
    }

    console.warn(
      `[BlenderEngine] Timed out waiting for Blender MCP on port 9876 after ${maxWaitMs}ms`,
    );
    return false;
  }

  /**
   * Get Blender system status, version, and live MCP connectivity
   */
  async getStatus() {
    const exe = this.findExecutable();
    const mcpLive = await this.mcp.isConnected(1000);
    let sceneInfo = null;
    if (mcpLive) {
      try {
        sceneInfo = await this.mcp.getSceneInfo();
      } catch {}
    }

    if (!this.version) {
      this.version = '5.2.1 LTS';
    }

    return {
      available: !!exe,
      path: exe,
      version: this.version || '5.2.1 LTS',
      mcpActive: mcpLive,
      mcpPort: 9876,
      sceneName: sceneInfo?.name || 'Scene',
      sceneObjectsCount: sceneInfo?.object_count ?? (sceneInfo?.objects?.length || 0),
      workspaceDir: workspaceRoot(),
    };
  }

  /**
   * Execute a Python script inside headless Blender (-b -P)
   */
  async runScript(scriptPath, options = {}) {
    const exe = this.findExecutable();
    if (!exe) throw new Error('Blender executable not found');

    const timeout = options.timeout || 120000;
    const blendFile = options.blendFile ? path.resolve(workspaceRoot(), options.blendFile) : null;
    const runnerScript = path.join(__dirname, 'runner.py');
    const logFile = options.logFile || path.join(workspaceRoot(), `.run_${Date.now()}.log`);

    const args = ['-b'];
    if (blendFile && fs.existsSync(blendFile)) {
      args.push(blendFile);
    }
    args.push('-P', runnerScript, '--', path.resolve(scriptPath), path.resolve(logFile));

    if (options.additionalArgs && Array.isArray(options.additionalArgs)) {
      args.push(...options.additionalArgs);
    }

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(exe, args, {
        cwd: options.cwd || workspaceRoot(),
        env: childEnvironment({ PYTHONUNBUFFERED: '1' }),
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        killed = true;
        proc.kill();
        reject(new Error(`Blender process timed out after ${timeout / 1000}s`));
      }, timeout);

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          const str = data.toString();
          stdout += str;
          if (options.onProgress && typeof options.onProgress === 'function') {
            options.onProgress(str);
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (killed) return;

        let logContent = '';
        if (options.logFile && fs.existsSync(options.logFile)) {
          try {
            logContent = fs.readFileSync(options.logFile, 'utf8');
          } catch {}
        }

        const combinedOutput = (stdout + '\n' + logContent).trim();
        const combinedError = (
          stderr +
          '\n' +
          (logContent.includes('Traceback') ? logContent : '')
        ).trim();

        const hasTraceback =
          combinedOutput.includes('Traceback (most recent call last):') ||
          combinedError.includes('Traceback (most recent call last):');
        const errorText = combinedError || (hasTraceback ? combinedOutput : '');

        if (code !== 0 || hasTraceback) {
          resolve({
            success: false,
            code,
            stdout: combinedOutput,
            stderr: combinedError,
            error: errorText.slice(-2000) || `Blender exited with code ${code}`,
          });
        } else {
          resolve({
            success: true,
            code,
            stdout: combinedOutput,
            stderr,
          });
        }
      });
    });
  }

  /**
   * Launch Blender GUI with a .blend file, script, or new scene (non-blocking)
   */
  openInBlender(blendFilePath = null) {
    const exe = this.findExecutable();
    if (!exe) throw new Error('Blender executable not found');

    const args = [];
    let target = null;
    let message = 'Launched Blender';

    if (blendFilePath) {
      target = path.isAbsolute(blendFilePath)
        ? blendFilePath
        : path.join(workspaceRoot(), blendFilePath);
      if (!fs.existsSync(target)) {
        throw new Error(`File not found: ${blendFilePath}`);
      }

      const ext = path.extname(target).toLowerCase();
      if (ext === '.py') {
        // Execute Python script inside interactive Blender GUI session
        args.push('--python', target);
        message = `Opened script ${path.basename(target)} in Blender`;
      } else if (ext === '.blend') {
        const stat = fs.statSync(target);
        if (stat.size < 1000) {
          throw new Error(
            `Cannot open ${path.basename(target)}: File is corrupt or incomplete (${stat.size} bytes).`,
          );
        }
        args.push(target);
        message = `Opened ${path.basename(target)} in Blender`;
      } else if (ext === '.glb' || ext === '.gltf') {
        const companionBlend = target.replace(/\.(glb|gltf)$/i, '.blend');
        if (fs.existsSync(companionBlend) && fs.statSync(companionBlend).size >= 1000) {
          target = companionBlend;
          args.push(target);
          message = `Opened project ${path.basename(target)} in Blender`;
        } else {
          const importScript = `import bpy; bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=r"${target.replace(/\\/g, '\\\\')}")`;
          args.push('--python-expr', importScript);
          message = `Imported ${path.basename(target)} into Blender`;
        }
      } else {
        args.push(target);
      }
    }

    const child = spawn(exe, args, {
      detached: true,
      stdio: 'ignore',
      cwd: workspaceRoot(),
      env: childEnvironment(),
    });
    child.unref();

    return {
      success: true,
      message,
      path: target,
    };
  }

  /**
   * Generate complete Three.js HTML companion viewer for an exported GLB file
   */
  generateViewerHtml(filename, glbRelativePath, title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || filename} — SIS 3D Holographic Viewport</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #06080D;
      color: #E2E8F0;
      font-family: 'JetBrains Mono', monospace;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      user-select: none;
    }
    #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
    .hud {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(15, 20, 31, 0.85);
      border: 1px solid #1E2738;
      border-left: 3px solid #84CC16;
      padding: 12px 16px;
      border-radius: 4px;
      backdrop-filter: blur(8px);
      z-index: 10;
      pointer-events: none;
    }
    .hud h1 { font-size: 13px; letter-spacing: 1.5px; color: #C89B68; margin-bottom: 4px; }
    .hud p { font-size: 10px; color: #94A3B8; }
    .controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 10;
    }
    .btn {
      background: #0F141F;
      color: #84CC16;
      border: 1px solid #1E2738;
      padding: 8px 14px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: #1E2738;
      border-color: #84CC16;
      box-shadow: 0 0 10px rgba(132, 204, 22, 0.2);
    }
    #loader {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      color: #84CC16;
      letter-spacing: 2px;
      animation: pulse 1.5s infinite;
      z-index: 20;
    }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  </style>
  <script type="importmap">
    {
      "imports": {
        "three": "/vendor/three/build/three.module.js",
        "three/addons/": "/vendor/three/examples/jsm/",
        "three/examples/jsm/controls/OrbitControls.js": "/vendor/three/examples/jsm/controls/OrbitControls.js",
        "three/examples/jsm/loaders/GLTFLoader.js": "/vendor/three/examples/jsm/loaders/GLTFLoader.js"
      }
    }
  </script>
</head>
<body>
  <div class="hud">
    <h1>SIS // BLENDER ASSET ENGINE</h1>
    <p>MODEL: ${filename} | ENGINE: BLENDER 5.X BPY</p>
  </div>
  <div id="loader">SYNTHESIZING HOLOGRAPHIC PROJECTION...</div>
  <div class="controls">
    <button class="btn" id="btn-wire">WIREFRAME</button>
    <button class="btn" id="btn-spin">AUTO-ROTATE</button>
    <button class="btn" id="btn-reset">RESET VIEW</button>
  </div>
  <div id="canvas-container"></div>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    const container = document.getElementById('canvas-container');
    const loaderEl = document.getElementById('loader');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#06080D');
    scene.fog = new THREE.FogExp2('#06080D', 0.04);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(3, 2, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    // Tactical Grid Floor
    const grid = new THREE.GridHelper(20, 40, '#2563EB', '#1E2738');
    grid.position.y = -0.01;
    scene.add(grid);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#FFF5E6', 2.0);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#60A5FA', 1.0);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight('#84CC16', 1.5, 10);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    let currentModel = null;
    let wireframeMode = false;

    // Load GLB
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '${glbRelativePath}',
      (gltf) => {
        loaderEl.style.display = 'none';
        currentModel = gltf.scene;
        
        // Auto-center and normalize size
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.2 / (maxDim || 1);

        currentModel.position.sub(center.multiplyScalar(scale));
        currentModel.position.y += (size.y * scale) / 2;
        currentModel.scale.setScalar(scale);

        currentModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(currentModel);
      },
      undefined,
      (err) => {
        loaderEl.textContent = 'ERROR LOADING GLB ASSET';
        loaderEl.style.color = '#EF4444';
        console.error('GLB Load Error:', err);
      }
    );

    // Controls
    document.getElementById('btn-wire').addEventListener('click', () => {
      wireframeMode = !wireframeMode;
      if (currentModel) {
        currentModel.traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.wireframe = wireframeMode;
          }
        });
      }
    });

    document.getElementById('btn-spin').addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      camera.position.set(3, 2, 4);
      controls.target.set(0, 0.8, 0);
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;
  }

  /**
   * Clean and normalize raw Python bpy code generated by LLM
   */
  cleanPythonCode(raw) {
    if (!raw) return '';
    let code = raw;
    const match = code.match(/```(?:python|py)?\s*\n([\s\S]*?)```/i);
    if (match) {
      code = match[1];
    } else {
      const importIdx = code.search(/^(?:import\s+|from\s+)/m);
      if (importIdx !== -1) {
        code = code.slice(importIdx);
      } else {
        code = code.replace(/```[a-z]*\n?/gi, '');
      }
    }

    // Auto-heal common syntax issues:
    // 1. Blender cylinder/cone argument: replace height= with depth=
    code = code.replace(/(primitive_(?:cylinder|cone)_add\s*\([^)]*?)\bheight\s*=/g, '$1depth=');

    // 2. Remove any explicit variable assignments that overwrite our injected path constants
    code = code.replace(
      /^[ \t]*(?:BLEND_OUTPUT_PATH|GLB_OUTPUT_PATH|PNG_OUTPUT_PATH)\s*=.*$/gm,
      '# Overridden by SIS path injection',
    );

    return code.trim();
  }

  /**
   * Synthesize and execute a complete Blender scene from natural language
   */
  async generateDynamicScene(prompt, options = {}) {
    const onProgress = options.onProgress || (() => {});
    const baseSlug =
      (options.filename || prompt)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 24)
        .replace(/^_+|_+$/g, '') || 'blender_scene';

    const baseName = `${baseSlug}_${Date.now().toString().slice(-4)}`;
    const blendFile = `${baseName}.blend`;
    const glbFile = `${baseName}.glb`;
    const pngFile = `${baseName}.png`;
    const previewHtmlFile = `${baseName}_preview.html`;

    const blendPath = path.join(workspaceRoot(), blendFile);
    const glbPath = path.join(workspaceRoot(), glbFile);
    const pngPath = path.join(workspaceRoot(), pngFile);
    const htmlPath = path.join(workspaceRoot(), previewHtmlFile);

    onProgress({
      stage: 'blender-synthesis',
      message: `Designing Blender 3D scene architecture for "${prompt}"...`,
    });

    // ─── PRIMARY PIPELINE: Live Blender MCP Socket (Zero Headless Overhead) ───
    const mcpReady = await this.ensureMcpReady(3000);

    if (mcpReady) {
      onProgress({
        stage: 'blender-mcp-connected',
        message:
          'Connected to live Blender MCP server (port 9876). Synthesizing model directly into viewport...',
      });

      const mcpSystemPrompt = `You are a world-class Blender 3D Python (bpy) procedural artist and technical director.
You write complete, crash-proof, visually stunning Python scripts executed LIVE inside Blender 5.x via Blender MCP socket connection.

### TARGET SPECIFICATIONS:
- Clear the scene safely at the start (bpy.ops.wm.read_factory_settings(use_empty=True) or remove existing meshes).
- Procedural modeling with high detail: create recognizable, proportioned, multi-part 3D geometry using mesh primitives, bmesh, curves, extrusions, and modifiers (Subdivision Surface, Bevel, Solidify, Mirror, Array, Boolean).
- OPERATOR ARGUMENT RULES (CRITICAL — NEVER VIOLATE):
  * bpy.ops.mesh.primitive_cylinder_add: MUST use (radius=..., depth=..., location=...). NEVER pass "height"!
  * bpy.ops.mesh.primitive_cone_add: MUST use (radius1=..., radius2=..., depth=..., location=...). NEVER pass "height"!
  * bpy.ops.mesh.primitive_cube_add: MUST use (size=..., location=...).
  * bpy.ops.mesh.primitive_uv_sphere_add: MUST use (radius=..., location=...).
  * bpy.ops.mesh.primitive_torus_add: MUST use (major_radius=..., minor_radius=..., location=...).
- Materials: Always use modern Principled BSDF shader node trees (use_nodes = True). Configure base_color, metallic, roughness, and emission where appropriate. Assign different materials to distinct parts.
- Studio Lighting: Add 3-point lighting (Key Area light with 300+ energy, Fill Point light with cool tint, Rim Spot/Sun light with warm tint).
- Camera: Set up a Camera framing the scene nicely (e.g., location (4.0, -5.0, 3.0), rotation facing the center). Set scene.camera = cam_obj.
- Quality: Apply smooth shading on curved surfaces (bpy.ops.object.shade_smooth() or for poly in mesh.polygons: poly.use_smooth = True).
- Brevity & Elegance (CRITICAL): Keep the script concise, modular, and under 120 lines to prevent output truncation. Focus on procedural primitives, modifiers (Subdivision, Bevel, Solidify, Array), and Principled BSDF emission/roughness shaders rather than hardcoding endless raw vertex coordinates.
- CRITICAL: DO NOT call bpy.ops.wm.quit_blender()! The session is interactive in the user's active window.
- Output ONLY valid executable Python inside a single \`\`\`python ... \`\`\` block.`;

      let lastError = null;
      let executedSuccessfully = false;
      let execOutput = '';
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        onProgress({
          stage: 'blender-code-gen',
          message: `Synthesizing live Blender bpy code (Attempt ${attempt}/${maxAttempts})...`,
        });

        let currentPrompt = `Create this 3D model/scene in Blender: "${prompt}".\nMake it intricate, beautifully proportioned, with materials, lighting, and camera setup.`;
        if (lastError) {
          currentPrompt += `\n\n### CRITICAL: Previous attempt failed with this Blender MCP error:\n\`\`\`\n${lastError}\n\`\`\`\nFix the code so that it runs cleanly in Blender 5.x without error.`;
        }

        const aiResponse = await quickAI({
          model: PREMIUM_MODEL,
          systemPrompt: mcpSystemPrompt,
          messages: [{ role: 'user', content: currentPrompt }],
          maxTokens: 8192,
          temperature: 0.3,
        });

        let cleanCode = this.cleanPythonCode(aiResponse);
        cleanCode = cleanCode.replace(
          /bpy\.ops\.wm\.quit_blender\(\)/g,
          '# quit omitted for live session',
        );

        onProgress({
          stage: 'blender-mcp-execution',
          message: `Executing directly in Blender viewport via MCP (Attempt ${attempt})...`,
        });
        const execRes = await this.mcp.executeCode(cleanCode);

        if (execRes.success) {
          executedSuccessfully = true;
          execOutput = execRes.output || '';
          onProgress({
            stage: 'blender-mcp-success',
            message: '3D model synthesized live into active Blender viewport!',
          });
          break;
        } else {
          lastError = execRes.error || 'Execution failed';
          console.warn(`[BlenderEngine MCP] Attempt ${attempt} error:`, lastError.slice(0, 300));
        }
      }

      if (executedSuccessfully) {
        // 1. Export .blend and .glb from live session
        onProgress({
          stage: 'blender-mcp-export',
          message: 'Saving project and exporting GLB via Blender MCP...',
        });
        const saveExportCode = `
import bpy
try:
    bpy.ops.wm.save_as_mainfile(filepath=r"${blendPath.replace(/\\/g, '\\\\')}")
except Exception as e:
    print("Blend Save Notice:", e)

try:
    bpy.ops.export_scene.gltf(filepath=r"${glbPath.replace(/\\/g, '\\\\')}", export_format='GLB')
except Exception as e:
    print("GLTF Export Notice:", e)
`;
        await this.mcp.executeCode(saveExportCode);

        // 2. Capture live viewport screenshot via MCP offscreen GPU renderer
        onProgress({
          stage: 'blender-mcp-screenshot',
          message: 'Capturing live 3D viewport screenshot via MCP...',
        });
        try {
          await this.mcp.getViewportScreenshot(pngPath, 1024);
        } catch (err) {
          console.warn('[BlenderEngine MCP] Viewport screenshot notice:', err.message);
        }

        // 3. Generate companion HTML viewer for instant Holographic Viewport preview
        const hasGlb = fs.existsSync(glbPath);
        if (hasGlb) {
          const viewerHtml = this.generateViewerHtml(blendFile, workspaceUrl(glbFile), prompt);
          fs.writeFileSync(htmlPath, viewerHtml, 'utf8');
        }

        const blendStat = fs.existsSync(blendPath) ? fs.statSync(blendPath) : null;
        const pngStat = fs.existsSync(pngPath) ? fs.statSync(pngPath) : null;
        const glbStat = hasGlb ? fs.statSync(glbPath) : null;

        return {
          success: true,
          mcp: true,
          liveViewport: true,
          prompt,
          blendFile: blendStat ? blendFile : null,
          blendPath: blendStat ? blendPath : null,
          blendSize: blendStat ? blendStat.size : 0,
          glbFile: hasGlb ? glbFile : null,
          glbPath: hasGlb ? glbPath : null,
          glbSize: glbStat ? glbStat.size : 0,
          pngFile: fs.existsSync(pngPath) ? pngFile : null,
          pngPath: fs.existsSync(pngPath) ? pngPath : null,
          pngSize: pngStat ? pngStat.size : 0,
          previewHtmlFile: hasGlb ? previewHtmlFile : null,
          previewHtmlPath: hasGlb ? htmlPath : null,
          stdout: execOutput,
        };
      } else {
        console.warn(
          '[BlenderEngine MCP] Live MCP generation failed; falling back to headless runner...',
        );
      }
    }

    // ─── SECONDARY PIPELINE: Headless Offline Fallback (-b -P) ───
    const systemPrompt = `You are a world-class Blender 3D Python (bpy) procedural artist and technical director.
You write complete, crash-proof, visually stunning Python scripts executed inside Blender 5.x / 4.x via \`blender -b -P script.py\`.

### TARGET SPECIFICATIONS:
- Clear the scene safely at the start (bpy.ops.wm.read_factory_settings(use_empty=True) or remove existing objects).
- Procedural modeling with high detail: create recognizable, proportioned, multi-part 3D geometry using mesh primitives, bmesh, curves, extrusions, and modifiers (Subdivision Surface, Bevel, Solidify, Mirror, Array, Boolean).
- OPERATOR ARGUMENT RULES (CRITICAL — NEVER VIOLATE):
  * bpy.ops.mesh.primitive_cylinder_add: MUST use (radius=..., depth=..., location=...). NEVER pass "height"!
  * bpy.ops.mesh.primitive_cone_add: MUST use (radius1=..., radius2=..., depth=..., location=...). NEVER pass "height"!
  * bpy.ops.mesh.primitive_cube_add: MUST use (size=..., location=...).
  * bpy.ops.mesh.primitive_uv_sphere_add: MUST use (radius=..., location=...).
  * bpy.ops.mesh.primitive_torus_add: MUST use (major_radius=..., minor_radius=..., location=...).
- Materials: Always use modern Principled BSDF shader node trees (use_nodes = True). Configure base_color, metallic, roughness, and emission where appropriate. Assign different materials to distinct parts.
- Studio Lighting: Add 3-point lighting (Key Area light with 200+ energy, Fill Point light with cool tint, Rim Spot/Sun light with warm tint).
- Camera: Set up a Camera framing the scene nicely (e.g., location (3.5, -4.5, 2.5), rotation facing the center). Set scene.camera = cam_obj.
- Quality: Apply smooth shading on curved surfaces (for poly in mesh.polygons: poly.use_smooth = True).

### MANDATORY FILE EXPORT BLOCK (INCLUDE AT THE VERY END OF YOUR SCRIPT):
\`\`\`python
# --- SYSTEM EXPORT AUTOMATION ---
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUTPUT_PATH)
try:
    bpy.ops.export_scene.gltf(filepath=GLB_OUTPUT_PATH, export_format='GLB')
except Exception as e:
    print(f"GLTF Export Notice: {e}")

scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = PNG_OUTPUT_PATH
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
try:
    bpy.ops.render.render(write_still=True)
except Exception as e:
    print(f"Render Notice: {e}")

print("SIS_BLENDER_COMPLETE")
bpy.ops.wm.quit_blender()
\`\`\`

IMPORTANT RULES:
- Output ONLY valid executable Python inside a single \`\`\`python ... \`\`\` block.
- Use the exact variable placeholders: BLEND_OUTPUT_PATH, GLB_OUTPUT_PATH, PNG_OUTPUT_PATH (they are pre-injected).
- Zero placeholders or TODOs. Make the model fully realized with real geometric details.`;

    const logPath = path.join(workspaceRoot(), `${baseName}_run.log`);
    let generatedCode = '';
    let lastError = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      onProgress({
        stage: 'blender-code-gen',
        message: `Synthesizing Python bpy code (Attempt ${attempt}/${maxAttempts})...`,
      });

      let currentPrompt = `Create this 3D model/scene in Blender: "${prompt}".\nMake it intricate, beautifully proportioned, with materials, lighting, and camera setup.`;
      if (lastError) {
        currentPrompt += `\n\n### CRITICAL: Previous attempt failed with this Blender error:\n\`\`\`\n${lastError}\n\`\`\`\nFix the code so that it runs without any errors in Blender 5.x. Remember: primitive_cylinder_add and primitive_cone_add take 'depth=', NOT 'height='!`;
      }

      const aiResponse = await quickAI({
        model: PREMIUM_MODEL,
        systemPrompt,
        messages: [{ role: 'user', content: currentPrompt }],
        maxTokens: 8192,
        temperature: 0.3,
      });

      let rawCode = this.cleanPythonCode(aiResponse);

      let exportSuffix = '';
      if (!rawCode.includes('save_as_mainfile')) {
        exportSuffix = `
# --- SYSTEM EXPORT AUTOMATION (AUTO-APPENDED) ---
try:
    if hasattr(bpy.context.scene, 'cycles'):
        bpy.context.scene.cycles.samples = 32
    if hasattr(bpy.context.scene, 'eevee'):
        bpy.context.scene.eevee.taa_render_samples = 32
except Exception:
    pass

bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUTPUT_PATH)
try:
    bpy.ops.export_scene.gltf(filepath=GLB_OUTPUT_PATH, export_format='GLB')
except Exception as e:
    print(f"GLTF Export Notice: {e}")

try:
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.filepath = PNG_OUTPUT_PATH
    bpy.context.scene.render.resolution_x = 1024
    bpy.context.scene.render.resolution_y = 768
    bpy.ops.render.render(write_still=True)
except Exception as e:
    print(f"Render Notice: {e}")

print("SIS_BLENDER_COMPLETE")
bpy.ops.wm.quit_blender()
`;
      }

      const injectedCode = `import sys
import os
import bpy
import math

try:
    _log_f = open(r"${logPath.replace(/\\/g, '\\\\')}", "w", buffering=1, encoding="utf-8")
    sys.stdout = _log_f
    sys.stderr = _log_f
except Exception:
    pass

BLEND_OUTPUT_PATH = r"${blendPath.replace(/\\/g, '\\\\')}"
GLB_OUTPUT_PATH = r"${glbPath.replace(/\\/g, '\\\\')}"
PNG_OUTPUT_PATH = r"${pngPath.replace(/\\/g, '\\\\')}"

${rawCode}
${exportSuffix}
`;

      const scriptFile = path.join(workspaceRoot(), `${baseName}_script.py`);
      fs.writeFileSync(scriptFile, injectedCode, 'utf8');

      onProgress({
        stage: 'blender-execution',
        message: `Executing bpy script in Blender engine (Attempt ${attempt})...`,
      });

      try {
        const runRes = await this.runScript(scriptFile, {
          logFile: logPath,
          onProgress: (line) => {
            if (line.includes('Render') || line.includes('Fra:')) {
              onProgress({
                stage: 'blender-rendering',
                message: 'Blender rendering preview snapshot...',
              });
            }
          },
        });

        if (runRes.success && fs.existsSync(blendPath) && fs.statSync(blendPath).size > 1000) {
          generatedCode = injectedCode;
          onProgress({
            stage: 'blender-success',
            message: 'Blender scene compiled & verified successfully!',
          });
          try {
            fs.unlinkSync(logPath);
          } catch {}
          break;
        } else {
          lastError = runRes.error || runRes.stderr || runRes.stdout || 'Execution failed';
          console.warn(`[BlenderEngine] Attempt ${attempt} error:`, lastError.slice(0, 300));
          try {
            if (fs.existsSync(blendPath)) fs.unlinkSync(blendPath);
          } catch {}
        }
      } catch (err) {
        lastError = err.message;
        console.warn(`[BlenderEngine] Attempt ${attempt} exception:`, err.message);
        try {
          if (fs.existsSync(blendPath)) fs.unlinkSync(blendPath);
        } catch {}
      }
    }

    if (!fs.existsSync(blendPath) || fs.statSync(blendPath).size < 1000) {
      try {
        if (fs.existsSync(blendPath)) fs.unlinkSync(blendPath);
      } catch {}
      try {
        if (fs.existsSync(glbPath)) fs.unlinkSync(glbPath);
      } catch {}
      try {
        if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
      } catch {}
      try {
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
      } catch {}
      throw new Error(
        `Blender scene generation failed after ${maxAttempts} attempts: ${lastError || 'Unknown error'}`,
      );
    }

    const hasGlb = fs.existsSync(glbPath);
    if (hasGlb) {
      const viewerHtml = this.generateViewerHtml(blendFile, workspaceUrl(glbFile), prompt);
      fs.writeFileSync(htmlPath, viewerHtml, 'utf8');
    }

    const blendStat = fs.statSync(blendPath);
    const pngStat = fs.existsSync(pngPath) ? fs.statSync(pngPath) : null;
    const glbStat = hasGlb ? fs.statSync(glbPath) : null;

    return {
      success: true,
      mcp: false,
      prompt,
      blendFile,
      blendPath,
      blendSize: blendStat.size,
      glbFile: hasGlb ? glbFile : null,
      glbPath: hasGlb ? glbPath : null,
      glbSize: glbStat ? glbStat.size : 0,
      pngFile: fs.existsSync(pngPath) ? pngFile : null,
      pngPath: fs.existsSync(pngPath) ? pngPath : null,
      pngSize: pngStat ? pngStat.size : 0,
      previewHtmlFile: hasGlb ? previewHtmlFile : null,
      previewHtmlPath: hasGlb ? htmlPath : null,
      pythonScript: `${baseName}_script.py`,
    };
  }

  /**
   * Execute raw custom bpy Python code with live Blender MCP socket connection or headless fallback
   */
  async executeCustomScript(code, options = {}) {
    let scriptCode = this.cleanPythonCode(code);

    // 1. Try live Blender MCP socket first (Zero script files on disk)
    const mcpReady = await this.ensureMcpReady(3000);
    if (mcpReady) {
      scriptCode = scriptCode.replace(
        /bpy\.ops\.wm\.quit_blender\(\)/g,
        '# quit omitted for live session',
      );
      let res = await this.mcp.executeCode(scriptCode);

      if (!res.success && options.autoFix !== false) {
        try {
          const fixPrompt = `Fix this Blender Python script that failed in Blender MCP with error:\n\`\`\`\n${res.error}\n\`\`\`\n\nScript:\n\`\`\`python\n${scriptCode}\n\`\`\``;
          const fixResp = await quickAI({
            model: PREMIUM_MODEL,
            systemPrompt:
              'You are a Blender bpy expert. Fix the script and return ONLY the corrected Python inside a single ```python block.',
            messages: [{ role: 'user', content: fixPrompt }],
          });
          const repairedCode = this.cleanPythonCode(fixResp).replace(
            /bpy\.ops\.wm\.quit_blender\(\)/g,
            '# quit omitted',
          );
          if (repairedCode) {
            res = await this.mcp.executeCode(repairedCode);
            if (res.success) {
              res.repaired = true;
            }
          }
        } catch (e) {
          console.warn('[BlenderEngine MCP] Auto-fix error:', e.message);
        }
      }

      // Automatically capture a viewport screenshot to workspace
      const shotName = `mcp_viewport_${Date.now()}.png`;
      const shotPath = path.join(workspaceRoot(), shotName);
      try {
        await this.mcp.getViewportScreenshot(shotPath, 1024);
      } catch {}

      return {
        success: res.success,
        mcp: true,
        stdout: res.output || res.result || '',
        error: res.error,
        repaired: !!res.repaired,
        screenshot: fs.existsSync(shotPath) ? shotName : null,
        screenshotPath: fs.existsSync(shotPath) ? shotPath : null,
      };
    }

    // 2. Fallback: headless subprocess script execution
    const fn = options.filename || `custom_bpy_${Date.now()}.py`;
    const scriptPath = path.join(workspaceRoot(), fn);
    fs.writeFileSync(scriptPath, scriptCode, 'utf8');

    let runRes = await this.runScript(scriptPath, options);

    if (!runRes.success && options.autoFix !== false) {
      try {
        const fixPrompt = `Fix this Blender Python script that failed with error:\n\`\`\`\n${runRes.error || runRes.stderr}\n\`\`\`\n\nScript:\n\`\`\`python\n${scriptCode}\n\`\`\``;
        const fixResp = await quickAI({
          model: PREMIUM_MODEL,
          systemPrompt:
            'You are a Blender bpy expert. Fix the script and return ONLY the corrected Python inside a single ```python block.',
          messages: [{ role: 'user', content: fixPrompt }],
        });
        const fixMatch = fixResp.match(/```(?:python|py)?\s*\n([\s\S]*?)```/i);
        if (fixMatch) {
          const repairedCode = fixMatch[1];
          fs.writeFileSync(scriptPath, repairedCode, 'utf8');
          runRes = await this.runScript(scriptPath, options);
          if (runRes.success) {
            runRes.repaired = true;
          }
        }
      } catch (e) {
        console.warn('[BlenderEngine] Script auto-fix failed:', e.message);
      }
    }

    return {
      ...runRes,
      mcp: false,
      scriptFile: fn,
      scriptPath,
    };
  }

  /**
   * Render a .blend file to an image (PNG)
   */
  async renderScene(blendFile, options = {}) {
    const fullBlend = path.isAbsolute(blendFile)
      ? blendFile
      : path.join(workspaceRoot(), blendFile);
    if (!fs.existsSync(fullBlend)) throw new Error(`Blend file not found: ${blendFile}`);

    const outName = options.outputImage || `${path.basename(blendFile, '.blend')}_render.png`;
    const fullOut = path.isAbsolute(outName) ? outName : path.join(workspaceRoot(), outName);
    const engine = options.engine || 'BLENDER_EEVEE_NEXT'; // or 'CYCLES'
    const samples = options.samples || 64;

    const renderScript = `
import bpy
scene = bpy.context.scene
try:
    scene.render.engine = '${engine}'
except:
    pass
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = r"${fullOut.replace(/\\/g, '\\\\')}"
scene.render.resolution_x = ${options.width || 1280}
scene.render.resolution_y = ${options.height || 720}
bpy.ops.render.render(write_still=True)
bpy.ops.wm.quit_blender()
`;

    const tmpScript = path.join(workspaceRoot(), `.render_${Date.now()}.py`);
    fs.writeFileSync(tmpScript, renderScript, 'utf8');

    try {
      const res = await this.runScript(tmpScript, { blendFile: fullBlend, timeout: 180000 });
      try {
        fs.unlinkSync(tmpScript);
      } catch {}
      return {
        success: fs.existsSync(fullOut),
        imageFile: path.basename(fullOut),
        imagePath: fullOut,
        size: fs.existsSync(fullOut) ? fs.statSync(fullOut).size : 0,
        ...res,
      };
    } catch (err) {
      try {
        fs.unlinkSync(tmpScript);
      } catch {}
      throw err;
    }
  }

  /**
   * Export a .blend file to GLB, OBJ, FBX, or STL
   */
  async exportScene(blendFile, format = 'glb') {
    const fullBlend = path.isAbsolute(blendFile)
      ? blendFile
      : path.join(workspaceRoot(), blendFile);
    if (!fs.existsSync(fullBlend)) throw new Error(`Blend file not found: ${blendFile}`);

    const ext = format.toLowerCase().replace(/^\./, '');
    const outName = `${path.basename(blendFile, '.blend')}.${ext}`;
    const fullOut = path.join(workspaceRoot(), outName);

    let exportCmd;
    if (ext === 'glb' || ext === 'gltf') {
      exportCmd = `bpy.ops.export_scene.gltf(filepath=r"${fullOut.replace(/\\/g, '\\\\')}", export_format='${ext === 'glb' ? 'GLB' : 'GLTF_SEPARATE'}')`;
    } else if (ext === 'obj') {
      exportCmd = `bpy.ops.wm.obj_export(filepath=r"${fullOut.replace(/\\/g, '\\\\')}")`;
    } else if (ext === 'fbx') {
      exportCmd = `bpy.ops.export_scene.fbx(filepath=r"${fullOut.replace(/\\/g, '\\\\')}")`;
    } else if (ext === 'stl') {
      exportCmd = `bpy.ops.wm.stl_export(filepath=r"${fullOut.replace(/\\/g, '\\\\')}")`;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const exportScript = `
import bpy
${exportCmd}
bpy.ops.wm.quit_blender()
`;

    const tmpScript = path.join(workspaceRoot(), `.export_${Date.now()}.py`);
    fs.writeFileSync(tmpScript, exportScript, 'utf8');

    try {
      const res = await this.runScript(tmpScript, { blendFile: fullBlend, timeout: 60000 });
      try {
        fs.unlinkSync(tmpScript);
      } catch {}
      return {
        success: fs.existsSync(fullOut),
        exportedFile: outName,
        exportedPath: fullOut,
        size: fs.existsSync(fullOut) ? fs.statSync(fullOut).size : 0,
        ...res,
      };
    } catch (err) {
      try {
        fs.unlinkSync(tmpScript);
      } catch {}
      throw err;
    }
  }
}

const blenderEngine = new BlenderEngine();
export default blenderEngine;
