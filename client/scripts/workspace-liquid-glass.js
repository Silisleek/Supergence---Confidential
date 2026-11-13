/* ══════════════════════════════════════════════════════════════════════════════
   SUPERGENCE FUTURISTIC LIQUID-GLASS CONTROLLER
   Dual-Mode: Text Chat & Live Voice Cockpit | Anti-Slop Pure Liquid Glass Craft
   - Dual-Mode Switch: Chat (💬) and Live Voice (〰️) Toggled From Top Island
   - Pure Liquid Glass: Zero Unnecessary Dark Shadows, Pure Refractive Glass
   - Pristine Landing Hero by Default: Zero Hardcoded/Canned Messages on Boot
   - Animated Mascots: Dancing, Celebrating, Thinking, Coding, and Voice Pulse
   - Real-Time Backend Integration via /api/sis/unified-turn
   ══════════════════════════════════════════════════════════════════════════════ */
(() => {
  const AGENTS = [
    {
      id: 'supergence',
      serverId: '',
      name: 'Supergence',
      role: 'Autonomous AI Agent',
      color: '#38bdf8',
      orbSrc: '/images/supergence-logo.png',
      avatarSrc: '/images/supergence-logo.png',
      motto: 'Autonomous execution, tool synthesis, and full-stack engineering.',
    },
    {
      id: 'superbit',
      serverId: 'agent-biology',
      name: 'Superbit',
      role: 'Biology & Living Systems',
      color: '#22c55e',
      orbSrc: '/images/orb-green.png',
      avatarSrc: '/images/mascots/superbit.png',
      motto: 'Biomolecules, structural folding, and living systems.',
    },
    {
      id: 'supermull',
      serverId: 'agent-data-ai',
      name: 'Supermull',
      role: 'Data Science & Neural Reasoning',
      color: '#d946ef',
      orbSrc: '/images/orb-magenta.png',
      avatarSrc: '/images/mascots/supermull.png',
      motto: 'Vector topologies, deep embeddings, high-dimensional reasoning.',
    },
    {
      id: 'superbold',
      serverId: 'agent-mathematics',
      name: 'Superbold',
      role: 'Mathematics & Economics',
      color: '#f59e0b',
      orbSrc: '/images/orb-gold.png',
      avatarSrc: '/images/mascots/superbold.png',
      motto: 'Rigorous proofs, quantitative truth, and market dynamics.',
    },
  ];

  const PRESET_SPECIALISTS = [
    {
      id: 'atlas',
      name: 'Atlas',
      role: 'System Architecture & Infrastructure',
      color: '#06b6d4',
      orbSrc: '/images/silisleek/astrolabe-sphere.png',
      avatarSrc: '/images/silisleek/astrolabe-sphere.png',
      motto: 'High-availability infrastructure, distributed primitives, cloud scale.',
    },
    {
      id: 'forge',
      name: 'Forge',
      role: 'Software Engineering & Compilers',
      color: '#10b981',
      orbSrc: '/images/silisleek/glass-neuron.png',
      avatarSrc: '/images/mascots/superake.png',
      motto: 'Clean algorithmic implementations, low latency, and modular toolchains.',
    },
    {
      id: 'pulse',
      name: 'Pulse',
      role: 'Real-Time Telemetry & Systems Health',
      color: '#8b5cf6',
      orbSrc: '/images/silisleek/atom-ring.png',
      avatarSrc: '/images/silisleek/atom-ring.png',
      motto: 'Live kernel telemetry, memory bounds, and proactive system observability.',
    },
    {
      id: 'scout',
      name: 'Scout',
      role: 'Deep Research & Literature Intelligence',
      color: '#f59e0b',
      orbSrc: '/images/silisleek/golden-record.png',
      avatarSrc: '/images/silisleek/golden-record.png',
      motto: 'Exhaustive cross-domain citations, empirical verification, and research synthesis.',
    },
    {
      id: 'supersion',
      name: 'Supersion',
      role: 'Computer Vision & 3D Synthesis',
      color: '#f43f5e',
      orbSrc: '/images/silisleek/violet-butterfly.png',
      avatarSrc: '/images/mascots/supersion.png',
      motto: 'Spatial reasoning, neural graphics, and volumetric visual synthesis.',
    },
  ];

  function addRosterAgent(record) {
    if (!record?.id || AGENTS.some((agent) => agent.serverId === record.id)) return;
    const preset = PRESET_SPECIALISTS.find((agent) => agent.name === record.name && agent.role === record.role);
    const image = preset?.orbSrc || '/images/silisleek/liquid-starburst.png';
    AGENTS.push({
      id: preset?.id || record.id,
      serverId: record.id,
      name: String(record.name),
      role: String(record.role),
      orbSrc: image,
      avatarSrc: preset?.avatarSrc || image,
    });
  }

  async function loadRoster() {
    try {
      const response = await fetch('/api/agents/team');
      if (!response.ok) return;
      const { agents } = await response.json();
      for (const agent of agents || []) {
        if (agent.isCustom) addRosterAgent(agent);
      }
      renderDockOrbs();
    } catch {}
  }

  let currentMode = 'chat'; // 'chat' | 'voice'
  let selectedAgentId = 'supergence';
  let isListening = false;
  let voiceRecognition = null;
  let voiceSpectrumInterval = null;
  let currentVoiceMascotIndex = 0;
  let currentMascotAction = 'dancing';

  // ── 1. Top Dynamic Floating Island with Dual-Mode Toggle ──
  function mountTopDynamicIsland() {
    let island = document.getElementById('sgTopDynamicIsland');
    if (!island) {
      island = document.createElement('div');
      island.className = 'sg-top-dynamic-island';
      island.id = 'sgTopDynamicIsland';
      document.body.appendChild(island);
    }

    island.innerHTML = `
      <div class="sg-island-mode-switch">
        <button type="button" class="sg-island-btn" id="sgConversationsBtn"
                aria-label="Conversations" title="Conversations"
                aria-controls="workspaceConversationsSidebar" aria-expanded="false">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m3-11h5m-5 5h5"/>
          </svg>
        </button>
        <button type="button" class="sg-island-btn" id="sgNewChatBtn"
                aria-label="New conversation" title="New conversation">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <button type="button" 
                class="sg-island-btn mode-chat-btn ${currentMode === 'chat' ? 'active' : ''}" 
                id="sgModeChatBtn" 
                title="Chat Mode" aria-label="Chat mode" aria-pressed="${currentMode === 'chat'}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button type="button" 
                class="sg-island-btn mode-voice-btn ${currentMode === 'voice' ? 'active' : ''}" 
                id="sgModeVoiceBtn" 
                title="Live Voice Mode" aria-label="Voice mode" aria-pressed="${currentMode === 'voice'}">
          <svg viewBox="0 0 28 14" width="22" height="11" fill="none" class="sg-neural-ribbon">
            <path d="M2 7 C 6 2, 8 2, 14 7 C 20 12, 22 12, 26 7" stroke="#d946ef" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M2 7 C 6 12, 8 12, 14 7 C 20 2, 22 2, 26 7" stroke="#a855f7" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2 2" opacity="0.8"/>
          </svg>
        </button>
        <button type="button" 
                class="sg-island-btn mode-superbox-btn" 
                id="sgModeSuperboxBtn" 
                title="Superbox (Universal Sandbox &amp; Live Stage)" aria-label="Superbox">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4m-9 4L3 8m9 4v9"/>
          </svg>
        </button>
        <button type="button" 
                class="sg-island-btn mode-browser-btn" 
                id="sgModeBrowserBtn" 
                title="In-App Browser" aria-label="In-App Browser">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </button>
        <button type="button" 
                class="sg-island-btn mode-preview-btn" 
                id="sgModePreviewBtn" 
                title="Live Preview" aria-label="Live Preview">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </button>
        <button type="button" 
                class="sg-island-btn mode-tools-btn" 
                id="sgModeToolsBtn" 
                title="Dynamic Tool Studio" aria-label="Tool Studio">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </button>
      </div>
      <details class="sg-workspace-menu">
        <summary>Workspace</summary>
        <div class="sg-workspace-actions">
          <button type="button" id="sgOpenWorkspaceFiles">Files and activity</button>
          <button type="button" data-shell-action="artifacts">Artifacts</button>
          <button type="button" data-shell-action="learning">Learning library</button>
          <button type="button" data-shell-action="creation-studio">Creation studio</button>
          <button type="button" data-shell-action="memory">Memory</button>
          <button type="button" data-shell-action="features">Feature catalogue</button>
          <button type="button" id="sgOpenSpecialists">Add specialist</button>
          <button type="button" id="sgOpenModelSetup">Model setup</button>
          <button type="button" id="sgOpenAccess">Access and approvals</button>
          <button type="button" data-shell-action="preferences">Preferences</button>
          <button type="button" data-shell-action="help">Keyboard shortcuts</button>
        </div>
      </details>
    `;

    const workspaceMenu = island.querySelector('.sg-workspace-menu');
    workspaceMenu.addEventListener('click', (event) => {
      if (event.target.closest('button')) workspaceMenu.open = false;
    });
    document.addEventListener('click', (event) => {
      if (!workspaceMenu.contains(event.target)) workspaceMenu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (workspaceMenu.open) {
        workspaceMenu.open = false;
        workspaceMenu.querySelector('summary').focus();
      } else if (document.getElementById('workspaceConversationsSidebar')?.classList.contains('drawer-open')) {
        toggleConversationsDrawer(false, { focus: true });
      }
    });
    island.querySelector('#sgConversationsBtn').addEventListener('click', () =>
      toggleConversationsDrawer(undefined, { focus: true }),
    );
    island.querySelector('#sgNewChatBtn')?.addEventListener('click', () =>
      window.startNewWorkspaceThread?.(),
    );
    island.querySelector('#sgOpenWorkspaceFiles').addEventListener('click', () =>
      window.SupergenceBrowser?.show({ section: 'files' }),
    );
    island.querySelector('#sgOpenSpecialists').addEventListener('click', openAddAgentModal);
    island.querySelector('#sgOpenModelSetup').addEventListener('click', () => window.openSupergenceSetup?.(4));
    island.querySelector('#sgOpenAccess').addEventListener('click', () => window.SupergenceAccess?.open());
    island.querySelector('#sgModeChatBtn')?.addEventListener('click', () => switchMode('chat'));
    island.querySelector('#sgModeVoiceBtn')?.addEventListener('click', () => switchMode('voice'));
    island.querySelector('#sgModeSuperboxBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.Superbox) {
        window.Superbox.toggle();
      }
    });
    island.querySelector('#sgModeBrowserBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.Superbox?.close();
      window.SupergenceBrowser?.show();
    });
    island.querySelector('#sgModePreviewBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.Superbox?.openTab('preview');
    });
    island.querySelector('#sgModeToolsBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.Superbox?.openTab('tools');
    });
  }

  // ── 2. Mode Switching Logic ──
  function switchMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    const chatBtn = document.getElementById('sgModeChatBtn');
    const voiceBtn = document.getElementById('sgModeVoiceBtn');

    chatBtn?.classList.toggle('active', mode === 'chat');
    voiceBtn?.classList.toggle('active', mode === 'voice');
    chatBtn?.setAttribute('aria-pressed', String(mode === 'chat'));
    voiceBtn?.setAttribute('aria-pressed', String(mode === 'voice'));

    const stream = document.getElementById('chatTurnsStream');
    if (!stream) return;

    if (mode === 'voice') {
      const landing = document.getElementById('sgLiquidGlassStage');
      const activeCard = document.getElementById('sgActiveConversationCard');
      if (landing) landing.classList.add('sg-hidden');
      if (activeCard) activeCard.classList.add('sg-hidden');

      mountVoiceStage(stream);
      const voiceStage = document.getElementById('sgVoiceStage');
      if (voiceStage) voiceStage.classList.remove('sg-hidden');
      startVoiceEngine();
    } else {
      stopVoiceEngine();
      const voiceStage = document.getElementById('sgVoiceStage');
      if (voiceStage) voiceStage.classList.add('sg-hidden');

      const activeCard = document.getElementById('sgActiveConversationCard');
      const landing = document.getElementById('sgLiquidGlassStage');
      if (activeCard && window.__workspaceChatHistory && window.__workspaceChatHistory.length > 0) {
        activeCard.classList.remove('sg-hidden');
      } else if (landing) {
        landing.classList.remove('sg-hidden');
      } else {
        mountLandingHero(stream);
      }
    }
  }

  // ── 3. Conversations Drawer Toggle ──
  function toggleConversationsDrawer(forceState, { focus = false } = {}) {
    const sidebar = document.getElementById('workspaceConversationsSidebar');
    const backdrop = document.getElementById('workspaceDrawerBackdrop');
    if (!sidebar) return;
    if (backdrop && backdrop.parentElement !== sidebar.parentElement) sidebar.before(backdrop);

    const willOpen = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('drawer-open');
    sidebar.classList.toggle('drawer-open', willOpen);
    sidebar.classList.toggle('mobile-open', willOpen);
    sidebar.inert = !willOpen;
    if (backdrop) backdrop.classList.toggle('active', willOpen);
    const trigger = document.getElementById('sgConversationsBtn');
    trigger?.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      void window.loadConversationsList?.();
      if (focus) document.getElementById('sidebarConvSearch')?.focus();
    } else if (focus) trigger?.focus();
  }

  // ── 4. Right Floating Specialist Agent Dock & Modal ──
  let toastTimer = null;
  function showSpecialistToast(agent) {
    let toast = document.getElementById('sgSpecialistToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'sg-specialist-toast';
      toast.id = 'sgSpecialistToast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <img src="${agent.orbSrc}" alt="" class="sg-toast-orb" />
      <span class="sg-toast-text">
        Channel: <span class="sg-toast-agent-name">${escapeHtml(agent.name)}</span>
        <span class="sg-toast-agent-role">(${escapeHtml(agent.role)})</span>
      </span>
    `;

    toast.classList.add('active');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 2400);
  }

  function selectSpecialistAgent(agentId) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) return;
    selectedAgentId = agent.id;
    window.__workspaceAgentId = agent.serverId || '';

    // 1. Update dock items active state
    const dock = document.getElementById('sgFloatingAgentDock');
    if (dock) {
      dock.querySelectorAll('.sg-dock-orb-item').forEach((i) => {
        i.classList.toggle('active', i.dataset.agent === agent.id);
        i.setAttribute('aria-pressed', String(i.dataset.agent === agent.id));
      });
    }

    // 2. Update active conversation card top row
    document.querySelectorAll('.sg-active-orb-unit').forEach((u) => {
      u.classList.toggle('selected', u.dataset.agent === agent.id);
      u.setAttribute('aria-pressed', String(u.dataset.agent === agent.id));
    });

    // 3. Update speaking avatar
    const speakerAvatar = document.getElementById('sgSpeakingAvatar');
    if (speakerAvatar) {
      speakerAvatar.src = agent.orbSrc;
      speakerAvatar.alt = agent.name;
      speakerAvatar.title = `${agent.name} (${agent.role})`;
    }

    // 4. Dynamically update composer placeholder for direct specialist chat
    const isSupergence = !agent || agent.id === 'supergence';
    const placeholderText = isSupergence
      ? 'Message Supergence... (e.g. build a tool, explore workspace, run code)'
      : `Ask ${agent.name} about ${agent.role.toLowerCase()}...`;
    const landingInput = document.getElementById('sgLandingInput');
    const cardInput = document.getElementById('sgCardInput');
    if (landingInput) landingInput.placeholder = placeholderText;
    if (cardInput) cardInput.placeholder = placeholderText;

    // 5. Show quick sleek floating specialist toast
    showSpecialistToast(agent);

    // 6. Focus active chat input immediately
    if (currentMode === 'chat') {
      if (document.getElementById('sgActiveConversationCard')) {
        cardInput?.focus();
      } else {
        landingInput?.focus();
      }
    }
  }

  function renderDockOrbs() {
    for (const [selector, className, activeClass] of [
      ['.sg-dock-orbs-container', 'sg-dock-orb-item', 'active'],
      ['.sg-active-orbs-row', 'sg-active-orb-unit', 'selected'],
    ]) {
      const container = document.querySelector(selector);
      if (!container) continue;
      container.replaceChildren();
      for (const agent of AGENTS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.dataset.agent = agent.id;
        button.title = `${agent.name} (${agent.role})`;
        button.setAttribute('aria-label', agent.name);
        button.classList.toggle(activeClass, selectedAgentId === agent.id);
        button.setAttribute('aria-pressed', String(selectedAgentId === agent.id));
        const image = document.createElement('img');
        image.src = agent.orbSrc;
        image.alt = '';
        image.draggable = false;
        button.append(image);
        button.addEventListener('click', () => selectSpecialistAgent(agent.id));
        container.append(button);
      }
    }
  }

  function mountRightAgentDock() {
    let dock = document.getElementById('sgFloatingAgentDock');
    if (!dock) {
      dock = document.createElement('aside');
      dock.className = 'sg-floating-agent-dock';
      dock.id = 'sgFloatingAgentDock';
      dock.setAttribute('aria-label', 'Agent Specialist Dock');

      dock.innerHTML = `
        <div class="sg-dock-orbs-container"></div>
        <button type="button" class="sg-dock-add-btn" id="sgDockAddBtn" title="Add Specialist Agent">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      `;

      document.body.appendChild(dock);

      dock.querySelector('#sgDockAddBtn')?.addEventListener('click', () => {
        openAddAgentModal();
      });
    }

    renderDockOrbs();
  }

  function mountAddAgentModal() {
    if (document.getElementById('sgAddAgentModalBackdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'sg-add-agent-modal-backdrop';
    backdrop.id = 'sgAddAgentModalBackdrop';

    backdrop.innerHTML = `
      <div class="sg-add-agent-modal" id="sgAddAgentModal" role="dialog" aria-modal="true" aria-label="Deploy Specialist Agent">
        <div class="sg-modal-header">
          <div>
            <h2 class="sg-modal-title">Deploy Specialist Agent</h2>
            <p class="sg-modal-subtitle">Connect and chat directly with specialized intelligences.</p>
          </div>
          <button type="button" class="sg-modal-close-btn" id="sgModalCloseBtn" aria-label="Close">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="sg-modal-section">
          <div class="sg-modal-section-title">Quick Deploy Presets</div>
          <div class="sg-presets-grid" id="sgPresetsGrid"></div>
        </div>

        <div class="sg-modal-section">
          <div class="sg-modal-section-title">Or Create Custom Specialist</div>
          <form class="sg-custom-agent-form" id="sgCustomAgentForm">
            <div class="sg-form-row">
              <label class="sg-form-label" for="sgCustomNameInput">Agent Name</label>
              <input class="sg-form-input" id="sgCustomNameInput" type="text" placeholder="e.g. Cosmo, Quantum, Orion" required />
            </div>
            <div class="sg-form-row">
              <label class="sg-form-label" for="sgCustomRoleInput">Domain &amp; Specialty</label>
              <input class="sg-form-input" id="sgCustomRoleInput" type="text" placeholder="e.g. Astrophysics, Cryptography, Creative Writing" required />
            </div>
            <div class="sg-form-row">
              <label class="sg-form-label">Theme Color &amp; Aura</label>
              <div class="sg-color-swatches" id="sgColorSwatches">
                <button type="button" class="sg-color-swatch selected" data-color="#06b6d4" style="background: #06b6d4; --swatch-color: #06b6d4;"></button>
                <button type="button" class="sg-color-swatch" data-color="#10b981" style="background: #10b981; --swatch-color: #10b981;"></button>
                <button type="button" class="sg-color-swatch" data-color="#8b5cf6" style="background: #8b5cf6; --swatch-color: #8b5cf6;"></button>
                <button type="button" class="sg-color-swatch" data-color="#ec4899" style="background: #ec4899; --swatch-color: #ec4899;"></button>
                <button type="button" class="sg-color-swatch" data-color="#f59e0b" style="background: #f59e0b; --swatch-color: #f59e0b;"></button>
                <button type="button" class="sg-color-swatch" data-color="#3b82f6" style="background: #3b82f6; --swatch-color: #3b82f6;"></button>
              </div>
            </div>
            <button type="submit" class="sg-deploy-custom-btn" id="sgDeployCustomBtn">Deploy to Specialist Dock</button>
          </form>
          <p id="sgDeployStatus" role="status"></p>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAddAgentModal();
    });
    backdrop.querySelector('#sgModalCloseBtn')?.addEventListener('click', closeAddAgentModal);

    let selectedColor = '#06b6d4';
    backdrop.querySelectorAll('.sg-color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        backdrop.querySelectorAll('.sg-color-swatch').forEach((s) => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColor = swatch.dataset.color;
      });
    });

    backdrop.querySelector('#sgCustomAgentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = backdrop.querySelector('#sgCustomNameInput');
      const roleInput = backdrop.querySelector('#sgCustomRoleInput');
      const name = nameInput.value.trim();
      const role = roleInput.value.trim();
      if (!name || !role) return;

      if (await addSpecialistAgent({ name, role, color: selectedColor })) {
        nameInput.value = '';
        roleInput.value = '';
        closeAddAgentModal();
      }
    });
  }

  function renderPresets() {
    const grid = document.getElementById('sgPresetsGrid');
    if (!grid) return;

    grid.innerHTML = PRESET_SPECIALISTS.map((preset) => {
      const isAlreadyAdded = AGENTS.some((a) => a.id === preset.id);
      return `
        <div class="sg-preset-agent-card ${isAlreadyAdded ? 'deployed' : ''}" data-preset="${preset.id}">
          <div class="sg-preset-left">
            <img src="${preset.orbSrc}" alt="${preset.name}" class="sg-preset-orb" />
            <div>
              <div class="sg-preset-name">${preset.name}</div>
              <div class="sg-preset-role">${preset.role}</div>
            </div>
          </div>
          <button type="button" class="sg-preset-deploy-btn" ${isAlreadyAdded ? 'disabled' : ''}>
            ${isAlreadyAdded ? 'Active' : '+ Add'}
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.sg-preset-agent-card:not(.deployed)').forEach((card) => {
      card.querySelector('button').addEventListener('click', async () => {
        const presetId = card.dataset.preset;
        const preset = PRESET_SPECIALISTS.find((p) => p.id === presetId);
        if (preset && await addSpecialistAgent(preset)) {
          closeAddAgentModal();
        }
      });
    });
  }

  function openAddAgentModal() {
    mountAddAgentModal();
    renderPresets();
    const backdrop = document.getElementById('sgAddAgentModalBackdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeAddAgentModal() {
    const backdrop = document.getElementById('sgAddAgentModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  let deployingAgent = false;
  async function addSpecialistAgent(agent) {
    if (deployingAgent) return false;
    deployingAgent = true;
    const status = document.getElementById('sgDeployStatus');
    if (status) status.textContent = 'Creating specialist…';
    try {
      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          role: agent.role,
          domain: agent.role,
          color: agent.color,
          systemPrompt: `You are ${agent.name}, specializing in ${agent.role}.`,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.agent?.id) {
        throw new Error(result.error || 'Could not create specialist.');
      }
      addRosterAgent(result.agent);
      renderDockOrbs();
      selectSpecialistAgent(AGENTS.find((entry) => entry.serverId === result.agent.id)?.id);
      if (status) status.textContent = '';
      return true;
    } catch (error) {
      if (status) status.textContent = error.message;
      return false;
    } finally {
      deployingAgent = false;
    }
  }

  // ── 5. Chat Mode: Landing Hero (Left Spec Screen) ──
  function wireModelControl(container) {
    const button = container.querySelector('.sg-model-badge');
    if (!button) return;
    button.addEventListener('click', () => window.openSupergenceSetup?.(4));
    void fetch('/api/provider/status')
      .then((response) => {
        if (!response.ok) throw new Error('Provider status unavailable');
        return response.json();
      })
      .then((provider) => {
        if (!provider.configured || !provider.model) return;
        button.querySelector('.sg-model-name').textContent = provider.model;
        button.title = `Model setup · ${provider.model}`;
      })
      .catch(() => {});
  }

  function bindComposerInput(input, submit) {
    if (!input) return;
    const resize = () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
    };
    input.addEventListener('input', resize);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) executeLiquidGlassTurn(text);
      }
    });
    submit?.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) executeLiquidGlassTurn(text);
    });
  }

  function mountLandingHero(container) {
    if (!container) return;
    const currentAgent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];
    const isSupergence = !currentAgent || currentAgent.id === 'supergence';
    const initialPlaceholder = isSupergence
      ? 'Message Supergence... (e.g. build a tool, explore workspace, run code)'
      : `Ask ${currentAgent.name} about ${currentAgent.role.toLowerCase()}...`;

    container.innerHTML = `
      <section class="shell-empty-stage" id="sgLiquidGlassStage" aria-label="Start a conversation">
        <h1 class="sg-cinematic-title">Supergence</h1>
        
        <div class="sg-floating-composer-card" id="sgLandingComposerCard">
          <textarea class="sg-floating-composer-textarea" id="sgLandingInput" aria-label="Message Supergence" rows="1"></textarea>
          <div class="sg-composer-bottom-bar">
            <div class="sg-composer-left-tools">
              <button type="button" class="sg-tool-btn" id="sgLandingVoiceIconBtn" title="Switch to Voice Mode" aria-label="Voice mode">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button type="button" class="sg-tool-btn" id="sgLandingSuperboxBtn" title="Open Superbox Sandbox" aria-label="Open Superbox">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4m-9 4L3 8m9 4v9"/></svg>
              </button>
            </div>
            <div class="sg-composer-right-tools">
              <button type="button" class="sg-model-badge" aria-label="Model setup">
                <span class="sg-model-name">Set up model</span>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button type="button" class="sg-submit-enter-btn" id="sgLandingSubmitBtn" aria-label="Submit">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 10L4 15L9 20" />
                  <path d="M20 4V11A4 4 0 0 1 16 15H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="sg-starter-chips" aria-label="Suggested starters">
          <button type="button" class="sg-starter-chip" data-starter="Build an interactive UI prototype inside Superbox and preview it">Build in Superbox</button>
          <button type="button" class="sg-starter-chip" data-starter="Create and verify a reusable dynamic tool for ">Forge a custom tool</button>
          <button type="button" class="sg-starter-chip" data-starter="Research and synthesize the key insights on ">Deep research</button>
          <button type="button" class="sg-starter-chip" data-starter="Inspect workspace files and summarize recent architecture changes">Analyze workspace</button>
        </div>
        <p class="sg-composer-hint">Enter to send · Shift+Enter for new line</p>
      </section>
    `;

    const input = container.querySelector('#sgLandingInput');
    input.placeholder = initialPlaceholder;
    bindComposerInput(input, container.querySelector('#sgLandingSubmitBtn'));

    container.querySelector('#sgLandingVoiceIconBtn')?.addEventListener('click', () => {
      switchMode('voice');
    });
    container.querySelector('#sgLandingSuperboxBtn')?.addEventListener('click', () => {
      window.Superbox?.toggle();
    });
    container.querySelectorAll('.sg-starter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.starter || '';
        input.dispatchEvent(new Event('input'));
        input.focus();
      });
    });
    wireModelControl(container);

    input?.focus();
  }

  // ── 6. Chat Mode: Active Conversation Card (Right Spec Screen) ──
  function mountActiveConversation(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="sg-conversation-container" id="sgActiveConversationCard">
        <div class="sg-card-header">
          <!-- Active orbs row with green glowing dots -->
          <div class="sg-active-orbs-row" aria-label="Chat agent"></div>
          <div class="sg-card-header-actions">
            <button type="button" class="sg-header-pill-btn" id="sgCardNewChatBtn" title="New conversation">+ New</button>
            <button type="button" class="sg-header-pill-btn" id="sgCardSuperboxBtn" title="Toggle Superbox Sandbox">📦 Superbox</button>
            <button type="button" class="sg-header-pill-btn" id="sgCardBrowserBtn" title="Open In-App Browser">🌐 Browser</button>
            <button type="button" class="sg-header-pill-btn" id="sgCardPreviewBtn" title="Live Preview">🖥️ Preview</button>
            <button type="button" class="sg-header-pill-btn" id="sgCardToolsBtn" title="Dynamic Tool Studio">🛠️ Tools</button>
          </div>
        </div>

        <!-- Speaking agent with live audio waveform bars (shown during speech output) -->
        <div class="sg-speaking-agent-row" id="sgSpeakingAgentRow">
          <img src="/images/orb-green.png" alt="Speaking Agent" class="sg-speaking-avatar" id="sgSpeakingAvatar" />
          <span class="sg-waveform-bars" id="sgSpeakingWaveformBars">
            <span class="sg-waveform-bar"></span>
            <span class="sg-waveform-bar"></span>
            <span class="sg-waveform-bar"></span>
            <span class="sg-waveform-bar"></span>
          </span>
        </div>

        <!-- Messages Area -->
        <div class="sg-card-messages" id="sgCardMessages"></div>

        <!-- Docked Bottom Composer -->
        <div class="sg-card-composer-wrap">
          <div class="sg-card-composer-inner">
            <textarea class="sg-floating-composer-textarea" id="sgCardInput" aria-label="Message Supergence" rows="1"></textarea>
            <div class="sg-composer-bottom-bar">
              <div class="sg-composer-left-tools">
                <button type="button" class="sg-tool-btn" id="sgCardVoiceIconBtn" title="Switch to Voice Mode" aria-label="Voice mode">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
                <button type="button" class="sg-tool-btn" id="sgCardSuperboxToolBtn" title="Open Superbox Sandbox" aria-label="Open Superbox">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4m-9 4L3 8m9 4v9"/></svg>
                </button>
              </div>
              <div class="sg-composer-right-tools">
                <button type="button" class="sg-model-badge" aria-label="Model setup">
                  <span class="sg-model-name">Set up model</span>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <button type="button" class="sg-submit-enter-btn" id="sgCardSubmitBtn" aria-label="Submit">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 10L4 15L9 20" />
                    <path d="M20 4V11A4 4 0 0 1 16 15H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const input = container.querySelector('#sgCardInput');
    bindComposerInput(input, container.querySelector('#sgCardSubmitBtn'));
    container.querySelector('#sgCardNewChatBtn')?.addEventListener('click', () =>
      window.startNewWorkspaceThread?.(),
    );
    container.querySelector('#sgCardSuperboxBtn')?.addEventListener('click', () =>
      window.Superbox?.toggle(),
    );
    container.querySelector('#sgCardBrowserBtn')?.addEventListener('click', () => {
      window.Superbox?.close();
      window.SupergenceBrowser?.show();
    });
    container.querySelector('#sgCardPreviewBtn')?.addEventListener('click', () => {
      window.Superbox?.openTab('preview');
    });
    container.querySelector('#sgCardToolsBtn')?.addEventListener('click', () => {
      window.Superbox?.openTab('tools');
    });
    container.querySelector('#sgCardVoiceIconBtn')?.addEventListener('click', () =>
      switchMode('voice'),
    );
    container.querySelector('#sgCardSuperboxToolBtn')?.addEventListener('click', () =>
      window.Superbox?.toggle(),
    );

    renderDockOrbs();

    const activeAgent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];
    const isSupergenceActive = !activeAgent || activeAgent.id === 'supergence';
    if (input) input.placeholder = isSupergenceActive
      ? 'Message Supergence... (e.g. build a tool, explore workspace, run code)'
      : `Ask ${activeAgent.name} about ${activeAgent.role.toLowerCase()}...`;
    updateActiveSpeakerUI();
    wireModelControl(container);
    input?.focus();
  }

  function updateActiveSpeakerUI() {
    const speakerAvatar = document.getElementById('sgSpeakingAvatar');
    const agent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];
    if (speakerAvatar) {
      speakerAvatar.src = agent.orbSrc;
      speakerAvatar.alt = agent.name;
    }
  }

  // ── 7. Voice Mode: Futuristic Voice Cockpit ──
  function mountVoiceStage(container) {
    let voiceStage = document.getElementById('sgVoiceStage');
    if (voiceStage) {
      voiceStage.style.display = 'flex';
      return;
    }

    voiceStage = document.createElement('div');
    voiceStage.className = 'sg-voice-stage';
    voiceStage.id = 'sgVoiceStage';

    const agent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];

    voiceStage.innerHTML = `
      <div class="sg-voice-header">
        <div class="sg-voice-badge">
          <span class="sg-voice-live-dot"></span>
          <span>Supergence Live Voice</span>
        </div>
      </div>

      <div class="sg-voice-center-visualizer" id="sgVoiceCenterVisualizer">
        <div class="sg-voice-sound-ring"></div>
        <div class="sg-voice-sound-ring"></div>
        <div class="sg-voice-sound-ring"></div>
        <div class="sg-voice-mascot-figure shell-empty-mascot-figure" id="sgVoiceMascotFigure" data-mascot-state="${currentMascotAction}" title="Click to cycle mascot or cheer!">
          <img src="${agent.avatarSrc || agent.orbSrc}" alt="${escapeHtml(agent.name)}" id="sgVoiceMascotImg" />
        </div>
      </div>

      <!-- Real-time audio frequency spectrum bars -->
      <div class="sg-voice-spectrum-bar-group" id="sgVoiceSpectrum">
        ${Array.from({ length: 24 })
          .map((_, i) => `<span class="sg-voice-spectrum-bar" style="height: ${6 + (i % 6) * 4}px;"></span>`)
          .join('')}
      </div>

      <!-- Real-time transcription pill -->
      <div class="sg-voice-transcription-pill" id="sgVoiceTranscript">
        Listening... Speak to Supergence
      </div>

      <!-- Voice Controls Toolbar -->
      <div class="sg-voice-controls-toolbar">
        <button type="button" class="sg-voice-circle-btn mic-active" id="sgVoiceMicBtn" title="Toggle Microphone">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button type="button" class="sg-voice-circle-btn" id="sgVoiceSwitchChatBtn" title="Switch to Text Chat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      <!-- Mascot Action Bar -->
      <div class="sg-mascot-action-bar" style="margin-top: 24px;">
        <button type="button" class="sg-action-pill-btn active" data-action="dancing">💃 Dance</button>
        <button type="button" class="sg-action-pill-btn" data-action="celebrating">🎉 Celebrate</button>
        <button type="button" class="sg-action-pill-btn" data-action="coding">⚡ Code</button>
        <button type="button" class="sg-action-pill-btn" data-action="thinking">🧠 Think</button>
        <button type="button" class="sg-action-pill-btn" data-action="waving">👋 Wave</button>
      </div>
    `;

    container.appendChild(voiceStage);

    // Event listeners
    voiceStage.querySelector('#sgVoiceMicBtn')?.addEventListener('click', toggleVoiceMic);
    voiceStage.querySelector('#sgVoiceSwitchChatBtn')?.addEventListener('click', () => switchMode('chat'));
    voiceStage.querySelector('#sgVoiceMascotFigure')?.addEventListener('click', cycleVoiceMascot);

    voiceStage.querySelectorAll('.sg-action-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        voiceStage.querySelectorAll('.sg-action-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        setVoiceMascotAction(btn.dataset.action);
      });
    });
  }

  function cycleVoiceMascot() {
    currentVoiceMascotIndex = (currentVoiceMascotIndex + 1) % AGENTS.length;
    const agent = AGENTS[currentVoiceMascotIndex];
    selectedAgentId = agent.id;
    window.__workspaceAgentId = selectedAgentId;

    const img = document.getElementById('sgVoiceMascotImg');
    if (img) {
      img.src = agent.avatarSrc || agent.orbSrc;
      img.alt = agent.name;
    }
    setVoiceMascotAction('celebrating');
    setTimeout(() => setVoiceMascotAction('dancing'), 1600);
  }

  function setVoiceMascotAction(action) {
    currentMascotAction = action;
    const figure = document.getElementById('sgVoiceMascotFigure');
    if (figure) {
      figure.setAttribute('data-mascot-state', action);
    }
  }

  // ── 8. Voice Recognition & Spectrum Engine ──
  function startVoiceEngine() {
    isListening = true;
    animateSpectrumBars(true);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec && !voiceRecognition) {
      try {
        voiceRecognition = new SpeechRec();
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-US';

        voiceRecognition.onresult = (e) => {
          let interim = '';
          let finalTranscript = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              finalTranscript += e.results[i][0].transcript;
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          const pill = document.getElementById('sgVoiceTranscript');
          if (pill) {
            pill.textContent = finalTranscript || interim || 'Listening...';
          }
          if (finalTranscript.trim()) {
            handleVoiceSubmission(finalTranscript.trim());
          }
        };

        voiceRecognition.onerror = (e) => {
          console.log('[Supergence Voice] SpeechRecognition event:', e.error);
        };

        voiceRecognition.start();
      } catch (err) {
        console.log('[Supergence Voice] SpeechRecognition initialization:', err.message);
      }
    }
  }

  function stopVoiceEngine() {
    isListening = false;
    animateSpectrumBars(false);
    if (voiceRecognition) {
      try {
        voiceRecognition.stop();
      } catch (_) {}
      voiceRecognition = null;
    }
  }

  function toggleVoiceMic() {
    const micBtn = document.getElementById('sgVoiceMicBtn');
    const pill = document.getElementById('sgVoiceTranscript');
    if (isListening) {
      stopVoiceEngine();
      if (micBtn) {
        micBtn.classList.remove('mic-active');
        micBtn.classList.add('mic-muted');
      }
      if (pill) pill.textContent = 'Microphone paused. Click mic to speak.';
    } else {
      startVoiceEngine();
      if (micBtn) {
        micBtn.classList.remove('mic-muted');
        micBtn.classList.add('mic-active');
      }
      if (pill) pill.textContent = 'Listening... Speak to Supergence';
    }
  }

  function animateSpectrumBars(active) {
    if (voiceSpectrumInterval) {
      clearInterval(voiceSpectrumInterval);
      voiceSpectrumInterval = null;
    }
    if (!active) {
      const bars = document.querySelectorAll('.sg-voice-spectrum-bar');
      bars.forEach((b) => (b.style.height = '4px'));
      return;
    }
    voiceSpectrumInterval = setInterval(() => {
      const bars = document.querySelectorAll('.sg-voice-spectrum-bar');
      const now = Date.now();
      bars.forEach((bar, idx) => {
        const height = Math.floor(
          10 + Math.sin(now / 140 + idx * 0.45) * 10 + Math.cos(now / 95 - idx * 0.7) * 5,
        );
        bar.style.height = `${Math.max(4, height)}px`;
      });
    }, 80);
  }

  async function handleVoiceSubmission(text) {
    const pill = document.getElementById('sgVoiceTranscript');
    if (pill) {
      if (typeof window.renderModernLoader === 'function') {
        pill.innerHTML = window.renderModernLoader(`Thinking: "${text}"...`, { size: 'sm' });
      } else {
        pill.textContent = `Thinking: "${text}"...`;
      }
    }
    setVoiceMascotAction('thinking');

    try {
      const activeConvId = window.__activeWorkspaceConvId || `conv-voice-${Date.now()}`;
      window.__activeWorkspaceConvId = activeConvId;

      const res = await fetch('/api/sis/unified-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          agentId: AGENTS.find((agent) => agent.id === selectedAgentId)?.serverId || undefined,
          conversationId: activeConvId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false || data.error)
        throw new Error(data.error || 'The voice request could not be completed.');
      const reply = data.response || data.text;
      if (!reply) throw new Error('No voice response was returned.');
      if (pill) pill.textContent = reply;
      setVoiceMascotAction('dancing');

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(reply.replace(/[*#_`]/g, ''));
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      }
    } catch (err) {
      if (pill) pill.textContent = `Error: ${err.message}`;
      setVoiceMascotAction('idle');
    }
  }

  function getTurnContainer(stream) {
    if (!stream || !document.body.classList.contains('hud-liquid-glass-pure')) return null;
    const messages = stream.querySelector('#sgCardMessages');
    if (messages) return messages;
    mountActiveConversation(stream);
    return stream.querySelector('#sgCardMessages');
  }

  function executeLiquidGlassTurn(queryText) {
    const input = document.getElementById('sgCardInput') || document.getElementById('sgLandingInput');
    if (input) input.value = '';
    const agent = AGENTS.find((entry) => entry.id === selectedAgentId);
    void window.executeTurnInWorkspace(queryText, null, agent?.serverId || '');
  }

  // ── 11. Initialization & Strict Non-Hardcoding Policy ──
  function init() {
    document.body.classList.add('hud-liquid-glass-pure');
    mountTopDynamicIsland();
    mountRightAgentDock();
    void loadRoster();
    toggleConversationsDrawer(false);

    const stream = document.getElementById('chatTurnsStream');
    if (!stream) return;

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('agent')) {
        selectSpecialistAgent(params.get('agent'));
      }
      if (params.get('openModal') === 'add-agent') {
        openAddAgentModal();
      }
      if (params.get('mode') === 'voice') {
        switchMode('voice');
        return;
      }
    } catch (_) {}

    // Pristine landing hero on boot, zero hardcoded messages
    if (!stream.querySelector('#sgLiquidGlassStage, #sgActiveConversationCard, #sgVoiceStage')) {
      mountLandingHero(stream);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SupergenceLiquidGlass = {
    mountTopDynamicIsland,
    mountRightAgentDock,
    mountLandingHero,
    mountActiveConversation,
    mountVoiceStage,
    getTurnContainer,
    switchMode,
    toggleDrawer: toggleConversationsDrawer,
    executeTurn: executeLiquidGlassTurn,
    selectSpecialistAgent,
    openAddAgentModal,
    closeAddAgentModal,
    addSpecialistAgent,
  };
})();
