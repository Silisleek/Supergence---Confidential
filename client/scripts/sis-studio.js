function formatChatMarkdown(text) {
  if (!text) return '';
  const codeBlocks = [];
  let safe = text.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (_, lang, code) => {
    const idx = codeBlocks.length;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push(
      `<div class="sis-code-card"><div class="sis-code-header"><span>${lang || 'code'}</span><button type="button" class="sis-copy-code-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy', 1500);">Copy</button></div><pre><code>${escapedCode.trim()}</code></pre></div>`,
    );
    return `__CODE_BLOCK_${idx}__`;
  });

  safe = safe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  safe = safe.replace(/`([^`]+)`/g, '<code class="sis-inline-code">$1</code>');
  safe = safe.replace(/^### (.*$)/gm, '<h4 class="sis-chat-h4">$1</h4>');
  safe = safe.replace(/^## (.*$)/gm, '<h3 class="sis-chat-h3">$1</h3>');
  safe = safe.replace(/^# (.*$)/gm, '<h2 class="sis-chat-h2">$1</h2>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  safe = safe.replace(/((?:^\s*[-*]\s+.+\n?)+)/gm, (match) => {
    const items = match
      .trim()
      .split('\n')
      .map((line) => {
        const itemText = line.replace(/^\s*[-*]\s+/, '').trim();
        return `<li class="sis-chat-li">${itemText}</li>`;
      })
      .join('');
    return `<ul class="sis-chat-ul">${items}</ul>`;
  });

  const blocks = safe.split(/\n\n+/);
  safe = blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('__CODE_BLOCK_') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<h')
      ) {
        return trimmed;
      }
      return `<p class="sis-chat-p">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  safe = safe.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] || '');
  return safe;
}

/**
 * Supergence SIS 1.0: Modern Pastel Studio Controller & 3D Universe Engine
 * Completely redesigned from scratch to match user's custom layout.
 * Pure modern pastel glassmorphism, zero legacy clutter, real Supergence mascots,
 * dedicated settings modal, and interactive agent chats.
 */

import * as THREE from 'three';

// ── Real Supergence Mascots ──
const MASCOTS = {
  superbit: {
    name: 'Superbit',
    role: 'Swarm Lead',
    color: '#7dd3fc',
    detail: 'Procedural 3D game architecture & coordinator',
    status: 'Lead',
  },
  superake: {
    name: 'Superake',
    role: 'Reasoning Core',
    color: '#6ee7b7',
    detail: 'World logic, task breakdown & synthesis',
    status: 'Logic',
  },
  superbold: {
    name: 'Superbold',
    role: '3D Engine',
    color: '#fed7aa',
    detail: 'PBR Starfield & cosmic lighting shaders',
    status: 'Shaders',
  },
  supermull: {
    name: 'Supermull',
    role: 'Physics Engine',
    color: '#7dd3fc',
    detail: 'Exploration physics loop, collision & gravity',
    status: 'Physics',
  },
  supersion: {
    name: 'Supersion',
    role: 'Spatial Audio',
    color: '#c4b5fd',
    detail: 'Monolith resonance & swarm communications',
    status: 'Audio',
  },
};

// ── State & Store ──
const state = {
  activeTab: 'home',
  activeAgent: 'superbit',
  activeAgentFilter: 'all',
  activeTheme: localStorage.getItem('sis-studio-theme') || 'lilac',
  composerExpanded: false,
  is3DPlaying: true,
  isRecording: false,
  isFullscreenUniverse: false,
  activeModel: 'SIS 1.0 Ultra',
  soundEnabled: true,
  starsEnabled: true,
  wireframeEnabled: true,
  playerPos: { x: 0, y: 1.8, z: 0 },
  moveInput: { forward: false, backward: false, left: false, right: false, up: false, down: false },
};

// ── Audio Feedback Helper ──
export function playChime(freq = 880, type = 'sine') {
  if (!state.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = window.__audioCtx || (window.__audioCtx = new AudioCtx());
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// 1. THREE.JS PROCEDURAL 3D UNIVERSE EXPLORATION ENGINE
// ─────────────────────────────────────────────────────────────
let renderer,
  scene,
  camera,
  terrainMesh,
  wireMesh,
  starsMesh,
  monoliths = [];
let animFrameId = null;
let lastTime = performance.now();
let fpsCount = 0,
  fpsTimer = 0,
  currentFps = 60;
let isPointerDown = false,
  prevMouseX = 0,
  prevMouseY = 0;
let camRotX = 0,
  camRotY = 0;

export function init3DUniverse() {
  const container = document.getElementById('sisThreeCanvasWrap');
  if (!container) return;

  const width = container.clientWidth || 640;
  const height = container.clientHeight || 400;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060608);
  scene.fog = new THREE.FogExp2(0x060608, 0.018);

  // Camera
  camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
  camera.position.set(0, 3.5, 12);

  // Lighting - Deep Dark Studio Illumination (No Bluish Cast)
  const ambientLight = new THREE.AmbientLight(0x18181b, 1.8);
  scene.add(ambientLight);

  const celestialLight = new THREE.DirectionalLight(0xf4f4f5, 1.8);
  celestialLight.position.set(20, 40, 15);
  scene.add(celestialLight);

  const rimLight = new THREE.DirectionalLight(0x71717a, 1.2);
  rimLight.position.set(-25, 20, -20);
  scene.add(rimLight);

  // Procedural Undulating Terrain in Deep Dark Obsidian / Charcoal
  const terrainGeo = new THREE.PlaneGeometry(160, 160, 64, 64);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 2.8 + Math.sin(x * 0.03 + z * 0.04) * 3.5;
    posAttr.setY(i, y);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.85,
    metalness: 0.2,
    wireframe: false,
    flatShading: true,
  });
  terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  scene.add(terrainMesh);

  // Subtle Deep Dark Wireframe Grid Overlay on Terrain (No Electric Blue)
  const wireGeo = terrainGeo.clone();
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x3f3f46,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  wireMesh = new THREE.Mesh(wireGeo, wireMat);
  wireMesh.position.y += 0.04;
  scene.add(wireMesh);

  // Deep Dark Starlight (Crisp White and Silver, No Blue/Cyan)
  const starCount = 1800;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    starPositions[i3] = (Math.random() - 0.5) * 350;
    starPositions[i3 + 1] = Math.random() * 120 + 2;
    starPositions[i3 + 2] = (Math.random() - 0.5) * 350;

    const col = Math.random() > 0.35 ? new THREE.Color(0xffffff) : new THREE.Color(0xd4d4d8);
    starColors[i3] = col.r;
    starColors[i3 + 1] = col.g;
    starColors[i3 + 2] = col.b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 1.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });
  starsMesh = new THREE.Points(starGeo, starMat);
  scene.add(starsMesh);

  // Procedural Monolith Pillars (The Supergence Swarm Pillars)
  const agentPillars = [
    { name: 'Superbit', color: 0x38bdf8, pos: [-12, 0, -10] },
    { name: 'Superake', color: 0x10b981, pos: [0, 0, -18] },
    { name: 'Superbold', color: 0xf59e0b, pos: [12, 0, -12] },
    { name: 'Supersion', color: 0xa855f7, pos: [20, 0, -22] },
  ];

  monoliths = [];
  agentPillars.forEach((p) => {
    const group = new THREE.Group();
    group.position.set(p.pos[0], 2.5, p.pos[2]);

    const monoGeo = new THREE.CylinderGeometry(0.7, 1.1, 5.5, 6);
    const monoMat = new THREE.MeshStandardMaterial({
      color: p.color,
      emissive: p.color,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const mesh = new THREE.Mesh(monoGeo, monoMat);
    group.add(mesh);

    // Glowing energy ring around pillar
    const ringGeo = new THREE.TorusGeometry(1.6, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    group.userData = { name: p.name, ring: ring };

    scene.add(group);
    monoliths.push(group);
  });

  // Mouse Orbit Drag Controls
  container.addEventListener('mousedown', (e) => {
    isPointerDown = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isPointerDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPointerDown) return;
    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    camRotY -= deltaX * 0.005;
    camRotX -= deltaY * 0.005;
    camRotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camRotX));
  });

  // Click on 3D monolith to interact
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);

    const hitObjects = [];
    monoliths.forEach((m) => {
      m.children.forEach((c) => hitObjects.push(c));
    });

    const intersects = raycaster.intersectObjects(hitObjects);
    if (intersects.length > 0) {
      const hitGroup = intersects[0].object.parent;
      if (hitGroup && hitGroup.userData.name) {
        notifyMonolithDiscovery(hitGroup.userData.name);
        playChime(1040, 'triangle');
      }
    }
  });

  // Handle Resize
  window.addEventListener('resize', handle3DResize);

  // Start Animation Loop
  animate3D(performance.now());
}

function handle3DResize() {
  const container = document.getElementById('sisThreeCanvasWrap');
  if (!container || !renderer || !camera) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate3D(time) {
  animFrameId = requestAnimationFrame(animate3D);

  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // FPS calculation
  fpsCount++;
  fpsTimer += delta;
  if (fpsTimer >= 0.5) {
    currentFps = Math.round(fpsCount / fpsTimer);
    fpsCount = 0;
    fpsTimer = 0;
    const fpsEl = document.getElementById('hudFpsDisplay');
    if (fpsEl) fpsEl.textContent = `${currentFps} FPS`;
  }

  if (state.is3DPlaying) {
    // Process keyboard movement (WASD)
    const moveSpeed = 14 * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camRotY);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camRotY);

    if (state.moveInput.forward) camera.position.addScaledVector(forward, moveSpeed);
    if (state.moveInput.backward) camera.position.addScaledVector(forward, -moveSpeed);
    if (state.moveInput.right) camera.position.addScaledVector(right, moveSpeed);
    if (state.moveInput.left) camera.position.addScaledVector(right, -moveSpeed);
    if (state.moveInput.up) camera.position.y += moveSpeed;
    if (state.moveInput.down) camera.position.y = Math.max(1.2, camera.position.y - moveSpeed);

    // Apply look rotation
    const lookTarget = new THREE.Vector3()
      .copy(camera.position)
      .add(
        new THREE.Vector3(
          Math.sin(camRotY) * Math.cos(camRotX),
          Math.sin(camRotX),
          -Math.cos(camRotY) * Math.cos(camRotX),
        ),
      );
    camera.lookAt(lookTarget);

    // Update HUD Coordinates
    const coordsEl = document.getElementById('hudCoordsDisplay');
    if (coordsEl) {
      coordsEl.textContent = `X: ${camera.position.x.toFixed(1)} | Y: ${camera.position.y.toFixed(1)} | Z: ${camera.position.z.toFixed(1)}`;
    }

    // Gentle starfield rotation
    if (starsMesh && state.starsEnabled) starsMesh.rotation.y += 0.0004;

    // Animate Monoliths
    const now = performance.now();
    monoliths.forEach((m, idx) => {
      if (m.userData.ring) {
        m.userData.ring.rotation.z += 0.025 * (idx % 2 === 0 ? 1 : -1);
      }
      m.position.y = 2.5 + Math.sin(now * 0.002 + idx) * 0.3;
    });

    renderer.render(scene, camera);
  }
}

function notifyMonolithDiscovery(name) {
  // Update HUD hint banner without adding anything to chat stream
  const hint = document.querySelector('.sis-hud-hint');
  if (hint) {
    const original = 'Click & Drag to Look • WASD to Fly/Explore • Click Monoliths to Interact';
    hint.textContent = `Interacted with ${name} Monolith`;
    setTimeout(() => {
      hint.textContent = original;
    }, 2500);
  }
}

// ─────────────────────────────────────────────────────────────
// 2. TOP CONTROL BAR (Navigation, Settings, 3D Play/Pause)
// ─────────────────────────────────────────────────────────────
export function initTopControlBar() {
  // Brand Button interaction
  const brandBtn = document.getElementById('sisBrandBtn');
  if (brandBtn) {
    brandBtn.addEventListener('click', () => {
      playChime(1200, 'sine');
      document.getElementById('tabBtnHome')?.click();
      const img = brandBtn.querySelector('.sis-top-mascot-img');
      if (img) {
        img.style.transform = 'scale(1.2) rotate(10deg)';
        setTimeout(() => {
          img.style.transform = '';
        }, 300);
      }
    });
  }

  // Navigation Buttons: sisNavChat, sisNavSwarms, sisNavUniverse, sisNavTerminal, sisNavBrowser
  const navBtns = document.querySelectorAll('.sis-nav-btn');
  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      navBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const navTarget = btn.dataset.nav;
      if (navTarget === 'chat') {
        const composer = document.getElementById('sisGlassComposer');
        const textarea = document.getElementById('workspaceInp');
        if (composer) composer.classList.add('is-expanded');
        if (textarea) textarea.focus();
      } else if (navTarget === 'swarms') {
        const teamsDrawer = document.getElementById('sisDrawerTeams');
        if (teamsDrawer) {
          document
            .querySelectorAll('.sis-studio-drawer')
            .forEach((d) => d.classList.remove('is-open'));
          teamsDrawer.classList.add('is-open');
        }
      } else if (navTarget === 'universe') {
        document.getElementById('tabBtnHome')?.click();
      } else if (navTarget === 'terminal') {
        const canvasWrap = document.getElementById('sisThreeCanvasWrap');
        const codeEditor = document.getElementById('sisCodeEditorView');
        const terminal = document.getElementById('sisTerminalView');
        if (canvasWrap) canvasWrap.style.display = 'none';
        if (codeEditor) codeEditor.classList.remove('is-visible');
        if (terminal) terminal.classList.add('is-visible');
      } else if (navTarget === 'browser') {
        if (typeof window.toggleWorkspaceSideBrowser === 'function') {
          window.toggleWorkspaceSideBrowser();
        }
      }
      playChime(850, 'sine');
    });
  });

  // 3D Play/Pause Button
  const playBtn = document.getElementById('btnTopPlay3D');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      state.is3DPlaying = !state.is3DPlaying;
      playBtn.classList.toggle('is-playing', state.is3DPlaying);
      playBtn.innerHTML = state.is3DPlaying
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
      playChime(state.is3DPlaying ? 950 : 600, 'sine');
    });
  }

  // Help / Shortcuts Button
  const helpBtn = document.getElementById('sisTopHelpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      const shortcuts = document.getElementById('workspaceShortcuts');
      if (shortcuts && typeof shortcuts.showModal === 'function') {
        shortcuts.showModal();
        playChime(1000, 'sine');
      }
    });
  }

  // Settings Trigger
  const settingsBtn = document.getElementById('btnOpenSettings');
  const railPrefBtn = document.getElementById('railPreferences');
  const modal = document.getElementById('sisSettingsModal');

  function openSettings() {
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      playChime(1000, 'sine');
    }
  }

  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (railPrefBtn) railPrefBtn.addEventListener('click', openSettings);
}

// ─────────────────────────────────────────────────────────────
// 3. DEDICATED MODERN PASTEL SETTINGS MODAL / PAGE
// ─────────────────────────────────────────────────────────────
export function initSettingsModal() {
  const modal = document.getElementById('sisSettingsModal');
  const closeBtn = document.getElementById('sisSettingsCloseBtn');
  const shell = document.getElementById('sisStudioShell');

  // Apply stored theme on boot
  if (shell && state.activeTheme) {
    shell.setAttribute('data-theme', state.activeTheme);
  }

  function closeSettings() {
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      playChime(600, 'sine');
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeSettings);

  // Close when clicking modal backdrop
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSettings();
    });
  }

  // Escape key closes modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
      closeSettings();
    }
  });

  // ── UI Style Selector (Including Agent Flow Canvas from video) ──
  let flowCanvasInstance = null;

  function applyUIStyle(styleId) {
    const studioGrid = document.getElementById('sisStudioGrid');
    const flowSurface = document.getElementById('sisFlowCanvasSurface');
    const topBar = document.getElementById('sisTopControlBar');
    const bottomDeck = document.getElementById('sisBottomDeck');
    const styleCards = document.querySelectorAll('.sis-style-card');

    styleCards.forEach((c) => {
      if (c.dataset.styleId === styleId) {
        c.classList.add('is-active');
      } else {
        c.classList.remove('is-active');
      }
    });

    if (styleId === 'flow-canvas') {
      if (shell) shell.classList.remove('is-cockpit-mode');
      if (studioGrid) studioGrid.style.display = 'none';
      if (topBar) topBar.style.display = 'none';
      if (bottomDeck) bottomDeck.style.display = 'none';
      if (flowSurface) {
        flowSurface.style.display = 'block';
        if (!flowCanvasInstance && window.SisFlowCanvas) {
          flowCanvasInstance = new window.SisFlowCanvas();
          flowCanvasInstance.mount(flowSurface);
        }
      }
    } else if (styleId === 'cockpit-console') {
      if (flowSurface) flowSurface.style.display = 'none';
      if (studioGrid) studioGrid.style.display = 'grid';
      if (topBar) topBar.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'block';
      if (shell) shell.classList.add('is-cockpit-mode');
      const canvasWrap = document.getElementById('sisThreeCanvasWrap');
      const codeEditor = document.getElementById('sisCodeEditorView');
      const terminal = document.getElementById('sisTerminalView');
      if (canvasWrap) canvasWrap.style.display = 'none';
      if (codeEditor) codeEditor.classList.remove('is-visible');
      if (terminal) terminal.classList.add('is-visible');
    } else {
      // 'obsidian-studio'
      if (shell) shell.classList.remove('is-cockpit-mode');
      if (flowSurface) flowSurface.style.display = 'none';
      if (studioGrid) studioGrid.style.display = 'grid';
      if (topBar) topBar.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'block';
      const canvasWrap = document.getElementById('sisThreeCanvasWrap');
      const codeEditor = document.getElementById('sisCodeEditorView');
      const terminal = document.getElementById('sisTerminalView');
      if (canvasWrap) canvasWrap.style.display = 'block';
      if (codeEditor) codeEditor.classList.remove('is-visible');
      if (terminal) terminal.classList.remove('is-visible');
    }

    try {
      localStorage.setItem('sis-ui-style', styleId);
    } catch (_) {}
  }

  window.__sisApplyUIStyle = applyUIStyle;

  const styleCards = document.querySelectorAll('.sis-style-card');
  styleCards.forEach((card) => {
    card.addEventListener('click', () => {
      const styleId = card.dataset.styleId;
      applyUIStyle(styleId);
      playChime(1200, 'sine');
    });
  });

  // Check stored UI style on load
  let initialStyle = 'obsidian-studio';
  try {
    const saved = localStorage.getItem('sis-ui-style');
    if (saved) initialStyle = saved;
  } catch (_) {}
  applyUIStyle(initialStyle);

  // Theme selector cards
  const themeCards = document.querySelectorAll('.sis-theme-card');
  themeCards.forEach((card) => {
    const themeName = card.dataset.themeName;
    if (themeName === state.activeTheme) {
      card.classList.add('is-active');
    } else {
      card.classList.remove('is-active');
    }

    card.addEventListener('click', () => {
      themeCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
      state.activeTheme = themeName;
      if (shell) shell.setAttribute('data-theme', themeName);
      try {
        localStorage.setItem('sis-studio-theme', themeName);
      } catch (_) {}
      playChime(1100, 'triangle');
    });
  });

  // Model Selector
  const modelSelect = document.getElementById('sisSettingsModelSelect');
  if (modelSelect) {
    modelSelect.value = state.activeModel;
    modelSelect.addEventListener('change', () => {
      state.activeModel = modelSelect.value;
      const modelLabel = document.getElementById('sisComposerModelLabel');
      if (modelLabel) modelLabel.textContent = state.activeModel;
      playChime(950, 'sine');
    });
  }

  // 3D Starfield Toggle
  const toggleStars = document.getElementById('sisToggleStars');
  if (toggleStars) {
    toggleStars.addEventListener('click', () => {
      state.starsEnabled = !state.starsEnabled;
      toggleStars.classList.toggle('is-on', state.starsEnabled);
      if (starsMesh) starsMesh.visible = state.starsEnabled;
      playChime(state.starsEnabled ? 900 : 500, 'sine');
    });
  }

  // 3D Wireframe Toggle
  const toggleWireframe = document.getElementById('sisToggleWireframe');
  if (toggleWireframe) {
    toggleWireframe.addEventListener('click', () => {
      state.wireframeEnabled = !state.wireframeEnabled;
      toggleWireframe.classList.toggle('is-on', state.wireframeEnabled);
      if (wireMesh) wireMesh.visible = state.wireframeEnabled;
      playChime(state.wireframeEnabled ? 920 : 520, 'sine');
    });
  }

  // Sound FX Toggle
  const toggleSound = document.getElementById('sisToggleSound');
  if (toggleSound) {
    toggleSound.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      toggleSound.classList.toggle('is-on', state.soundEnabled);
      playChime(state.soundEnabled ? 1000 : 400, 'sine');
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 4. AGENT CHATS & COMPOSER INTERACTIONS
// ─────────────────────────────────────────────────────────────
export function initAgentChats() {
  const composer = document.getElementById('sisGlassComposer');
  const textarea = document.getElementById('workspaceInp');
  const sendBtn = document.getElementById('workspaceSendBtn');
  const closeBtn = document.getElementById('sisComposerCloseBtn');
  const welcome = document.getElementById('sisChatWelcome');

  // Agent Roster Selection
  const agentRows = document.querySelectorAll('#sisAgentsInset .sis-agent-roster-row');
  agentRows.forEach((row) => {
    row.addEventListener('click', () => {
      const agentKey = row.dataset.agent;
      if (!agentKey || !MASCOTS[agentKey]) return;
      selectAgent(agentKey);
    });
    // Keyboard accessibility: Enter or Space activates agent row
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const agentKey = row.dataset.agent;
        if (agentKey && MASCOTS[agentKey]) selectAgent(agentKey);
      }
    });
  });

  // Add Agent (+) Button in roster header
  const btnAddAgent = document.getElementById('btnAddAgent');
  if (btnAddAgent) {
    btnAddAgent.addEventListener('click', () => {
      document.getElementById('btnSpaceTeams')?.click();
      playChime(1050, 'sine');
    });
  }

  // File Attachment Input and Button
  const fileInput = document.getElementById('sisFileInput');
  const attachBtn = document.getElementById('composerToolsButton');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length && textarea) {
        const f = fileInput.files[0];
        textarea.value =
          (textarea.value ? textarea.value + '\n' : '') +
          `[Attached: ${f.name} (${(f.size / 1024).toFixed(1)} KB)]`;
        updateCharCounter();
        composer?.classList.add('is-expanded');
        textarea.focus();
        playChime(1150, 'triangle');
      }
    });
  }

  // Agent Filter Pills
  document.querySelectorAll('.sis-filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.sis-filter-pill').forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      const filter = pill.dataset.filter || 'all';
      state.activeAgentFilter = filter;

      agentRows.forEach((row) => {
        if (filter === 'all' || row.dataset.agent === filter) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });

      if (filter !== 'all' && MASCOTS[filter]) {
        selectAgent(filter);
      }
      playChime(920, 'sine');
    });
  });

  function selectAgent(agentKey) {
    const meta = MASCOTS[agentKey];
    if (!meta) return;

    state.activeAgent = agentKey;

    // Highlight row
    agentRows.forEach((r) => {
      r.classList.toggle('is-active-agent', r.dataset.agent === agentKey);
    });

    // Update Composer Elements (Resting + Expanded)
    const curAvatar = document.getElementById('sisComposerCurrentAvatar');
    if (curAvatar) curAvatar.src = `/images/mascots/${agentKey}.png`;
    const curName = document.getElementById('sisComposerCurrentAgentName');
    if (curName) curName.textContent = `@${meta.name}`;
    const curRole = document.getElementById('sisComposerCurrentRole');
    if (curRole) curRole.textContent = meta.role;

    const restingAvatar = document.getElementById('sisRestingMascotImg');
    if (restingAvatar) restingAvatar.src = `/images/mascots/${agentKey}.png`;
    const restingLabel = document.getElementById('sisRestingAgentLabel');
    if (restingLabel) restingLabel.textContent = `@${meta.name}`;

    const phEl = document.getElementById('sisRestingPlaceholderText');
    if (phEl) {
      phEl.textContent = `Ask ${meta.name} anything or enter a directive...`;
    }

    // Close any open popover
    document.getElementById('sisAgentDropdownWrap')?.classList.remove('is-open');

    // Expand composer & focus
    if (composer) composer.classList.add('is-expanded');
    if (textarea) textarea.focus();

    playChime(1050, 'sine');
  }

  // Resting bar click / keyboard activation to expand
  const restingBar = document.getElementById('sisComposerRestingBar');
  if (restingBar) {
    const expandComposer = () => {
      if (composer) composer.classList.add('is-expanded');
      if (textarea) textarea.focus();
      playChime(950, 'sine');
    };
    restingBar.addEventListener('click', expandComposer);
    restingBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        expandComposer();
      }
    });
  }

  // Agent dropdown popover inside composer
  const agentSelectBtn = document.getElementById('sisComposerAgentSelectBtn');
  const agentDropdownWrap = document.getElementById('sisAgentDropdownWrap');
  if (agentSelectBtn && agentDropdownWrap) {
    agentSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      agentDropdownWrap.classList.toggle('is-open');
      playChime(850, 'sine');
    });

    document.querySelectorAll('.sis-agent-opt').forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = opt.dataset.agent;
        if (key && MASCOTS[key]) {
          selectAgent(key);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!agentDropdownWrap.contains(e.target)) {
        agentDropdownWrap.classList.remove('is-open');
      }
    });
  }

  // Voice mic button in expanded footer
  const workspaceMicBtn = document.getElementById('workspaceMicBtn');
  if (workspaceMicBtn) {
    workspaceMicBtn.addEventListener('click', () => {
      document.getElementById('btnCtrlRedDot')?.click();
    });
  }

  // Suggestion action chips
  document.querySelectorAll('.sis-action-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const directive = chip.dataset.directive;
      if (directive && textarea) {
        textarea.value = directive;
        textarea.focus();
        updateCharCounter();
        playChime(1100, 'sine');
      }
    });
  });

  // Reasoning mode toggle
  const btnReasoning = document.getElementById('btnToggleReasoning');
  if (btnReasoning) {
    btnReasoning.addEventListener('click', () => {
      const active = btnReasoning.classList.toggle('is-active-toggle');
      playChime(active ? 1200 : 700, 'sine');
    });
  }

  // Character counter
  const charCounter = document.getElementById('sisCharCounter');
  function updateCharCounter() {
    if (charCounter && textarea) {
      const count = textarea.value.length;
      charCounter.textContent = `${count} char${count === 1 ? '' : 's'}`;
    }
  }

  // Global Ctrl+K / Cmd+K and Esc shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (composer) composer.classList.add('is-expanded');
      if (textarea) textarea.focus();
      playChime(1050, 'sine');
    }
    if (e.key === 'Escape' && composer?.classList.contains('is-expanded')) {
      composer.classList.remove('is-expanded');
      if (textarea) textarea.blur();
    }
  });

  // Hover & Focus Expansion for Composer
  if (composer && textarea) {
    textarea.addEventListener('input', updateCharCounter);

    composer.addEventListener('mouseenter', () => {
      state.composerExpanded = true;
    });

    composer.addEventListener('mouseleave', () => {
      if (document.activeElement !== textarea && !textarea.value.trim()) {
        state.composerExpanded = false;
        composer.classList.remove('is-expanded');
        document.getElementById('sisAgentDropdownWrap')?.classList.remove('is-open');
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.composerExpanded = false;
        composer.classList.remove('is-expanded');
        document.getElementById('sisAgentDropdownWrap')?.classList.remove('is-open');
        textarea.blur();
        playChime(640, 'sine');
      });
    }

    textarea.addEventListener('focus', () => {
      composer.classList.add('is-expanded');
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    if (sendBtn) {
      sendBtn.addEventListener('click', handleSendMessage);
    }
  }

  window.__sisStudioSendMessage = handleSendMessage;

  async function handleSendMessage() {
    if (!textarea) return;
    const query = textarea.value.trim();
    if (!query) return;

    textarea.value = '';
    const scrollContainer = document.getElementById('sisChatStream');
    const stream = document.getElementById('chatTurnsStream') || scrollContainer;
    if (!stream) return;

    const welcome = document.getElementById('sisChatWelcome');
    if (welcome) welcome.remove();

    // 1. Render User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'sis-msg-bubble sis-msg-user';
    userBubble.textContent = query;
    stream.appendChild(userBubble);

    // 2. Render Typing Indicator
    const activeMeta = MASCOTS[state.activeAgent] || MASCOTS.superbit;
    const typingBubble = document.createElement('div');
    typingBubble.className = 'sis-msg-bubble sis-msg-assistant sis-msg-typing';
    typingBubble.innerHTML = `
      <div class="sis-msg-agent-header">
        <img src="/images/mascots/${state.activeAgent}.png" class="sis-msg-agent-avatar" alt="${activeMeta.name}" />
        <span class="sis-msg-agent-name">${activeMeta.name}</span>
        <div class="sis-thinking-tag" style="display:inline-block; margin-left:8px;">
          ${typeof window.renderModernLoader === 'function' ? window.renderModernLoader('Thinking...', { size: 'sm' }) : 'AREM Engine Thinking...'}
        </div>
      </div>
      <div class="sis-typing-dots">
        <span class="sis-typing-dot"></span>
        <span class="sis-typing-dot"></span>
        <span class="sis-typing-dot"></span>
      </div>
    `;
    stream.appendChild(typingBubble);
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;

    playChime(1120, 'triangle');

    // 3. Dispatch to real Supergence backend
    try {
      const activeConvId = window.__activeWorkspaceConvId || 'conv-' + Date.now();
      window.__activeWorkspaceConvId = activeConvId;

      const res = await fetch('/api/sis/unified-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationId: activeConvId,
          agentId: state.activeAgent,
        }),
      });

      const data = await res.json();
      typingBubble.remove();

      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'sis-msg-bubble sis-msg-assistant';

      const rawText = data.response || data.text || 'Directive processed.';
      const formattedHtml = formatChatMarkdown(rawText);

      let stepsHtml = '';
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        const stepItems = data.steps
          .map(
            (s) => `
          <div class="sis-step-chip">
            <span class="sis-step-icon">${s.icon || '✓'}</span>
            <span class="sis-step-title">${s.title || s.subsystem || 'Completed step'}</span>
          </div>
        `,
          )
          .join('');
        stepsHtml = `
          <details class="sis-cognitive-details">
            <summary class="sis-cognitive-summary">
              <span class="sis-cognitive-dot"></span>
              <span>Reasoning & Subsystems (${data.steps.length} steps)</span>
            </summary>
            <div class="sis-cognitive-steps-list">${stepItems}</div>
          </details>
        `;
      }

      let artifactsHtml = '';
      if (Array.isArray(data.artifacts) && data.artifacts.length > 0) {
        artifactsHtml = data.artifacts
          .map((a) => {
            const fn = a.filename || a.name || 'artifact.html';
            return `
            <div class="sis-chat-artifact-card">
              <div class="sis-artifact-left">
                <span>⚡</span>
                <span class="sis-artifact-name">${fn}</span>
              </div>
              <button type="button" class="sis-artifact-btn" onclick="previewFile('${encodeURIComponent(fn)}')">
                Preview Code
              </button>
            </div>
          `;
          })
          .join('');
      }

      let toolCallsHtml = '';
      if (
        Array.isArray(data.toolCalls) &&
        data.toolCalls.length > 0 &&
        typeof window.sisFormatToolCallBlock === 'function'
      ) {
        toolCallsHtml = data.toolCalls.map((tc) => window.sisFormatToolCallBlock(tc)).join('');
      }

      let memoryPillHtml = '';
      if (data.memory) {
        const topLines = data.memory.longTerm?.topLayerIndex
          ? data.memory.longTerm.topLayerIndex.split('\n').length
          : 0;
        const wikiCount = data.memory.longTerm?.relevantWiki?.length || 0;
        memoryPillHtml = `
          <div class="sis-memory-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span>AREM Memory Engaged: STM Context + LTM Bounded Index (${topLines} lines, ${wikiCount} wiki notes)</span>
          </div>
        `;
      }

      assistantBubble.innerHTML = `
        <div class="sis-msg-agent-header">
          <img src="/images/mascots/${state.activeAgent}.png" class="sis-msg-agent-avatar" alt="${activeMeta.name}" />
          <span class="sis-msg-agent-name">${activeMeta.name}</span>
          <span class="sis-msg-agent-role">${activeMeta.role}</span>
        </div>
        ${stepsHtml}
        ${toolCallsHtml}
        <div class="sis-msg-agent-text">${formattedHtml}</div>
        ${artifactsHtml}
        ${memoryPillHtml}
      `;
      stream.appendChild(assistantBubble);
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      playChime(880, 'sine');

      // Update 3D universe if coding or terrain query
      if (
        query.toLowerCase().includes('terrain') ||
        query.toLowerCase().includes('3d') ||
        query.toLowerCase().includes('world')
      ) {
        regenerateProceduralWorld();
      }
    } catch (err) {
      typingBubble.remove();
      const errBubble = document.createElement('div');
      errBubble.className = 'sis-msg-bubble sis-msg-assistant';
      errBubble.innerHTML = `
        <div class="sis-msg-agent-header">
          <img src="/images/mascots/${state.activeAgent}.png" class="sis-msg-agent-avatar" alt="${activeMeta.name}" />
          <span class="sis-msg-agent-name">${activeMeta.name}</span>
        </div>
        <div class="sis-msg-agent-text" style="color: #fda4af;">Communication notice: ${err.message}</div>
      `;
      stream.appendChild(errBubble);
      stream.scrollTop = stream.scrollHeight;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. FLOATING ACTION CONTROLS (Red Dot, Sparkles, Plus, Target)
// ─────────────────────────────────────────────────────────────
export function initBottomControls() {
  // 1. Red Dot: Voice Dictation & Audio Toggle
  const redDotBtn = document.getElementById('btnCtrlRedDot');
  if (redDotBtn) {
    redDotBtn.addEventListener('click', () => {
      state.isRecording = !state.isRecording;
      redDotBtn.classList.toggle('is-active', state.isRecording);
      playChime(state.isRecording ? 1200 : 600, 'sine');

      // Trigger existing dictate button if present
      const nativeDictate = document.getElementById('sbt-btn-dictate');
      if (nativeDictate) nativeDictate.click();
    });
  }

  // 2. Sparkles: AI Model Popover
  const sparklesBtn = document.getElementById('btnCtrlSparkles');
  const aiPopover = document.getElementById('sisAiPopover');
  if (sparklesBtn && aiPopover) {
    sparklesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      aiPopover.classList.toggle('is-open');
      playChime(900, 'sine');
    });

    document.querySelectorAll('.sis-model-choice').forEach((item) => {
      item.addEventListener('click', () => {
        document
          .querySelectorAll('.sis-model-choice')
          .forEach((i) => i.classList.remove('is-selected'));
        item.classList.add('is-selected');
        state.activeModel = item.dataset.model || 'SIS 1.0 Ultra';
        const modelLabel = document.getElementById('sisComposerModelLabel');
        if (modelLabel) modelLabel.textContent = state.activeModel;

        const modelSelect = document.getElementById('sisSettingsModelSelect');
        if (modelSelect) modelSelect.value = state.activeModel;

        aiPopover.classList.remove('is-open');
        playChime(1100, 'sine');
      });
    });
  }

  // 3. Plus: Quick Creation Menu
  const plusBtn = document.getElementById('btnCtrlPlus');
  const plusPopover = document.getElementById('sisPlusPopover');
  if (plusBtn && plusPopover) {
    plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      plusPopover.classList.toggle('is-open');
      playChime(950, 'sine');
    });
  }

  // 4. Target / Scanner: Fullscreen & Layout Switcher
  const targetBtn = document.getElementById('btnCtrlTarget');
  const shell = document.getElementById('sisStudioShell');
  if (targetBtn && shell) {
    targetBtn.addEventListener('click', () => {
      state.isFullscreenUniverse = !state.isFullscreenUniverse;
      shell.classList.toggle('is-universe-fullscreen', state.isFullscreenUniverse);
      playChime(1050, 'triangle');
      setTimeout(handle3DResize, 350);
    });
  }

  // Close popovers on outer click
  document.addEventListener('click', (e) => {
    if (aiPopover && !aiPopover.contains(e.target)) aiPopover.classList.remove('is-open');
    if (plusPopover && !plusPopover.contains(e.target)) plusPopover.classList.remove('is-open');
  });
}

// ─────────────────────────────────────────────────────────────
// 6. RIGHT COLUMN BUTTONS ("Space to do more": Files, Teams, Memory)
// ─────────────────────────────────────────────────────────────
export function initSpaceButtons() {
  const btnFiles = document.getElementById('btnSpaceFiles');
  const btnTeams = document.getElementById('btnSpaceTeams');
  const btnMemory = document.getElementById('btnSpaceMemory');

  const drawerFiles = document.getElementById('sisDrawerFiles');
  const drawerTeams = document.getElementById('sisDrawerTeams');
  const drawerMemory = document.getElementById('sisDrawerMemory');

  async function openDrawer(drawer) {
    [drawerFiles, drawerTeams, drawerMemory].forEach((d) => d?.classList.remove('is-open'));
    drawer?.classList.add('is-open');
    playChime(980, 'sine');

    if (drawer === drawerFiles) {
      loadRealFilesDrawer();
    } else if (drawer === drawerTeams) {
      loadRealTeamsDrawer();
    } else if (drawer === drawerMemory) {
      loadRealMemoryDrawer();
    }
  }

  if (btnFiles) btnFiles.addEventListener('click', () => openDrawer(drawerFiles));
  if (btnTeams) btnTeams.addEventListener('click', () => openDrawer(drawerTeams));
  if (btnMemory) btnMemory.addEventListener('click', () => openDrawer(drawerMemory));

  document.querySelectorAll('.sis-drawer-close-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.sis-studio-drawer')?.classList.remove('is-open');
      playChime(650, 'sine');
    });
  });
}

// Window-level file previewer for real workspace files
window.previewFile = async function (filePath) {
  const decoded = decodeURIComponent(filePath);
  try {
    const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(decoded)}`);
    const data = await res.json();
    const content =
      data.content || data.file || (typeof data === 'string' ? data : '// Empty file');

    const codeEl = document.querySelector('#sisCodeEditorView pre code');
    if (codeEl) {
      codeEl.textContent = content;
    }

    // Switch center viewport to Code view
    const threeWrap = document.getElementById('sisThreeCanvasWrap');
    const codeView = document.getElementById('sisCodeEditorView');
    const termView = document.getElementById('sisTerminalView');
    const badge = document.getElementById('sisViewportBadge');

    if (threeWrap) threeWrap.style.display = 'none';
    if (termView) termView.style.display = 'none';
    if (codeView) codeView.style.display = 'block';
    if (badge) badge.innerHTML = `<span class="sis-pulse-gem"></span><span>${decoded}</span>`;

    // Update tab pill
    const homeTab = document.getElementById('tabBtnHome');
    if (homeTab) {
      homeTab.innerHTML = `<span class="sis-tab-dot"></span><span>${decoded}</span>`;
    }

    playChime(920, 'triangle');
  } catch (err) {
    console.warn('Failed to preview file:', err.message);
  }
};

window.selectAgentFromTeams = function (agentId) {
  const clean = String(agentId || '').toLowerCase();
  if (MASCOTS[clean]) {
    state.activeAgent = clean;
    const btn = document.getElementById('sisComposerAgentSelectBtn');
    if (btn) {
      const meta = MASCOTS[clean];
      const img = btn.querySelector('#sisComposerCurrentAvatar');
      const name = btn.querySelector('#sisComposerCurrentAgentName');
      const role = btn.querySelector('#sisComposerCurrentRole');
      if (img) img.src = `/images/mascots/${clean}.png`;
      if (name) name.textContent = `@${meta.name}`;
      if (role) role.textContent = meta.status;
    }
    document.getElementById('sisDrawerTeams')?.classList.remove('is-open');
    playChime(880, 'sine');
  }
};

async function loadRealFilesDrawer() {
  const container = document.getElementById('sisDrawerFilesList');
  if (!container) return;
  container.innerHTML =
    '<div style="font-size: 12px; color: var(--sis-text-muted); padding: 8px 0;">Reading workspace files...</div>';
  try {
    const res = await fetch('/api/workspace/tree');
    const data = await res.json();
    const fileList = [];
    function collectFiles(nodes) {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (node.type === 'file' || (!node.children && node.name && !node.name.startsWith('.'))) {
          fileList.push(node);
        }
        if (Array.isArray(node.children)) {
          collectFiles(node.children);
        }
      }
    }
    collectFiles(Array.isArray(data) ? data : data.tree || []);

    if (fileList.length === 0) {
      container.innerHTML =
        '<div style="font-size: 12px; color: var(--sis-text-muted); padding: 8px 0;">No workspace files found.</div>';
      return;
    }

    container.innerHTML = fileList
      .slice(0, 30)
      .map((f) => {
        const name = f.name || f.path || 'file';
        const path = f.path || f.name;
        const sizeStr = f.size ? `${(f.size / 1024).toFixed(1)} KB` : '';
        return `
        <div class="sis-agent-roster-row" style="cursor: pointer;" onclick="previewFile('${encodeURIComponent(path)}')">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px;">📄</span>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 12.5px; color: #f1f5f9; font-weight: 500;">${name}</span>
              ${sizeStr ? `<span style="font-size: 10.5px; color: #64748b;">${sizeStr}</span>` : ''}
            </div>
          </div>
          <span style="font-size: 11px; color: var(--pastel-sky); font-weight: 500;">Open</span>
        </div>
      `;
      })
      .join('');
  } catch (e) {
    container.innerHTML =
      '<div style="font-size: 12px; color: #fda4af;">Failed to load files: ' + e.message + '</div>';
  }
}

async function loadRealTeamsDrawer() {
  const container = document.getElementById('sisDrawerTeamsList');
  if (!container) return;
  container.innerHTML =
    typeof window.renderModernLoader === 'function'
      ? window.renderModernLoader('Loading Supergence Teams...', { size: 'sm' })
      : '<div style="font-size: 12px; color: var(--sis-text-muted); padding: 8px 0;">Loading Supergence Teams...</div>';
  try {
    const res = await fetch('/api/supergence/teams');
    const data = await res.json();
    const teams = data.teams || [];
    if (teams.length === 0) {
      container.innerHTML =
        '<div style="font-size: 12px; color: var(--sis-text-muted);">No teams found.</div>';
      return;
    }
    container.innerHTML = teams
      .map(
        (t) => `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 600; color: #ffffff; font-size: 13px;">${t.name}</span>
          <span style="font-size: 10px; color: var(--pastel-lilac); background: var(--pastel-lilac-soft); padding: 2px 7px; border-radius: 999px;">${(t.agents || []).length} Agents</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">${t.description || t.domain}</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(t.agents || [])
            .map(
              (a) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; background: rgba(0,0,0,0.25); border-radius: 6px; cursor: pointer;" onclick="selectAgentFromTeams('${a.name || a.id}')">
              <span style="font-size: 11.5px; color: #e2e8f0;">${a.avatar || '🤖'} ${a.name}</span>
              <span style="font-size: 10px; color: #71717a;">${a.role}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `,
      )
      .join('');
  } catch (e) {
    container.innerHTML =
      '<div style="font-size: 12px; color: #fda4af;">Failed to load teams: ' + e.message + '</div>';
  }
}

async function loadRealMemoryDrawer() {
  const indexEl = document.getElementById('sisAremIndexPreview');
  const wikiEl = document.getElementById('sisAremWikiList');
  const stmEl = document.getElementById('sisStmStatsPreview');

  try {
    const indexRes = await fetch('/api/arem/index');
    const indexData = await indexRes.json();
    if (indexEl) {
      indexEl.textContent = (indexData.index || 'Bounded top-layer index is empty.').slice(0, 1500);
    }
  } catch (_) {
    if (indexEl) indexEl.textContent = 'Could not load AREM Index.';
  }

  try {
    const wikiRes = await fetch('/api/arem/wiki');
    const wikiData = await wikiRes.json();
    const pages = wikiData.pages || [];
    if (wikiEl) {
      if (pages.length === 0) {
        wikiEl.innerHTML =
          '<div style="font-size: 11px; color: #71717a;">No wiki notes consolidated yet. Run a dream cycle or prompt the agent.</div>';
      } else {
        wikiEl.innerHTML = pages
          .map((p) => {
            const title = typeof p === 'string' ? p : p.title || p.slug;
            const preview = p.preview || p.summary || '';
            return `
            <div style="padding: 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--pastel-sky);">[[${title}]]</div>
              ${preview ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">${preview}</div>` : ''}
            </div>
          `;
          })
          .join('');
      }
    }
  } catch (_) {
    if (wikiEl)
      wikiEl.innerHTML = '<div style="font-size: 11px; color: #fda4af;">Could not load wiki.</div>';
  }

  try {
    const statusRes = await fetch('/api/arem/status');
    const statusData = await statusRes.json();
    if (stmEl) {
      stmEl.textContent = JSON.stringify(statusData || {}, null, 2);
    }
  } catch (_) {
    if (stmEl) stmEl.textContent = 'AREM status unavailable.';
  }
}

// ─────────────────────────────────────────────────────────────
// 7. TAB HOME & VIEWPORT TOOLBAR
// ─────────────────────────────────────────────────────────────
export function initTabAndToolbar() {
  // Plus (+) Button to Add / Toggle Tab
  const btnAddWorkspaceTab = document.getElementById('btnAddWorkspaceTab');
  if (btnAddWorkspaceTab) {
    btnAddWorkspaceTab.addEventListener('click', () => {
      const isTerminal = state.activeTab === 'terminal';
      const targetTab = isTerminal ? 'home' : 'terminal';
      const targetBtn =
        targetTab === 'home'
          ? document.getElementById('tabBtnHome')
          : document.getElementById('sisNavTerminal');
      if (targetBtn) targetBtn.click();
      playChime(950, 'sine');
    });
  }

  // Tab Home tabs
  document.querySelectorAll('.sis-tab-pill').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sis-tab-pill').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const tabName = tab.dataset.tab;
      state.activeTab = tabName;

      const canvasWrap = document.getElementById('sisThreeCanvasWrap');
      const codeEditor = document.getElementById('sisCodeEditorView');
      const terminal = document.getElementById('sisTerminalView');

      if (tabName === 'home') {
        if (canvasWrap) canvasWrap.style.display = 'block';
        if (codeEditor) codeEditor.classList.remove('is-visible');
        if (terminal) terminal.classList.remove('is-visible');
        handle3DResize();
      } else if (tabName === 'code') {
        if (canvasWrap) canvasWrap.style.display = 'none';
        if (codeEditor) codeEditor.classList.add('is-visible');
        if (terminal) terminal.classList.remove('is-visible');
      } else if (tabName === 'terminal') {
        if (canvasWrap) canvasWrap.style.display = 'none';
        if (codeEditor) codeEditor.classList.remove('is-visible');
        if (terminal) terminal.classList.add('is-visible');
      }
      playChime(880, 'sine');
    });
  });

  // Wireframe toggle in viewport toolbar
  const wireBtn = document.getElementById('btnToggle3DWireframe');
  if (wireBtn) {
    wireBtn.addEventListener('click', () => {
      state.wireframeEnabled = !state.wireframeEnabled;
      if (wireMesh) wireMesh.visible = state.wireframeEnabled;
      const toggleWire = document.getElementById('sisToggleWireframe');
      if (toggleWire) toggleWire.classList.toggle('is-on', state.wireframeEnabled);
      playChime(state.wireframeEnabled ? 1100 : 550, 'sine');
    });
  }

  // Reset Camera View in viewport toolbar
  const resetCamBtn = document.getElementById('btnReset3DCamera');
  if (resetCamBtn && camera) {
    resetCamBtn.addEventListener('click', () => {
      camera.position.set(0, 3.5, 12);
      camRotX = 0;
      camRotY = 0;
      camera.lookAt(0, 2.5, 0);
      playChime(1000, 'triangle');
    });
  }

  // Keyboard navigation for 3D exploration
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA'
    )
      return;
    if (key === 'w') state.moveInput.forward = true;
    if (key === 's') state.moveInput.backward = true;
    if (key === 'a') state.moveInput.left = true;
    if (key === 'd') state.moveInput.right = true;
    if (key === ' ' || key === 'spacebar') state.moveInput.up = true;
    if (key === 'shift') state.moveInput.down = true;
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') state.moveInput.forward = false;
    if (key === 's') state.moveInput.backward = false;
    if (key === 'a') state.moveInput.left = false;
    if (key === 'd') state.moveInput.right = false;
    if (key === ' ' || key === 'spacebar') state.moveInput.up = false;
    if (key === 'shift') state.moveInput.down = false;
  });
}

// ─────────────────────────────────────────────────────────────
// 8. INITIALIZE STUDIO ON DOM READY
// ─────────────────────────────────────────────────────────────
export function mountStudio() {
  // Strict non-hardcoding policy: ensure chat stream is 100% empty on every open and reload
  const chatStream = document.getElementById('sisChatStream');
  if (chatStream) {
    chatStream.innerHTML =
      '<div id="chatTurnsStream" class="chat-turns-stream" style="display: flex; flex-direction: column; gap: 14px"></div>';
  }

  try {
    init3DUniverse();
  } catch (err) {
    console.warn('[Studio 3D Engine Warning]:', err.message);
  }
  initTopControlBar();
  initSettingsModal();
  initAgentChats();
  initBottomControls();
  initSpaceButtons();
  initTabAndToolbar();

  window.__sisStudioReady = true;
  console.log('[Supergence Studio 1.0] Redesigned surface mounted successfully.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountStudio);
} else {
  mountStudio();
}
