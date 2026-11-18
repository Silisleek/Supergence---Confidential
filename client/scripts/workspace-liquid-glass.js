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

  let fluidMascotSerial = 0;
  function fluidMascot(agent, className = '') {
    const key = String(agent.id || agent.serverId || agent.name || 'supergence');
    let hash = 0;
    for (const character of key) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    const palette = ['#91b6c0', '#a5bea5', '#b7a0c3', '#d1b18a', '#c69eaa', '#8db9b2', '#a8a9ce'];
    const color = palette[hash % palette.length];
    const delay = -(hash % 110) / 10;
    const filterId = `sg-fluid-filter-${++fluidMascotSerial}`;
    const branch = `
      <line x1="250" y1="250" x2="300" y2="250" />
      <circle cx="250" cy="250" r="64" />
      <g class="sg-fluid-arm1">
        <line x1="300" y1="250" x2="400" y2="250" />
        <circle cx="300" cy="250" r="30" />
        <g class="sg-fluid-arm2">
          <line x1="400" y1="250" x2="490" y2="250" />
          <circle cx="400" cy="250" r="24" />
          <g class="sg-fluid-arm3"><circle cx="490" cy="250" r="16" /></g>
        </g>
        <g class="sg-fluid-arm1 sg-fluid-fork">
          <circle cx="300" cy="250" r="30" />
          <g class="sg-fluid-arm2">
            <circle cx="400" cy="250" r="8" />
            <g class="sg-fluid-arm3"><circle cx="490" cy="250" r="8" /></g>
            <g class="sg-fluid-arm2 sg-fluid-fork">
              <circle cx="400" cy="250" r="8" />
              <g class="sg-fluid-arm3"><circle cx="490" cy="250" r="8" /></g>
            </g>
          </g>
        </g>
      </g>`;
    return `<svg class="sg-fluid-mascot ${className}" viewBox="0 0 500 500" aria-hidden="true" focusable="false" style="--fluid-color:${color};--fluid-delay:${delay}s">
      <defs><filter id="${filterId}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="17" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 100 -7" result="fluid" />
        <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
      </filter></defs>
      <!-- Adapted from Uiverse.io by AatreyuShau. -->
      <g transform="translate(250 250) scale(.58) translate(-250 -250)">
        <g filter="url(#${filterId})"><g class="sg-fluid-arm">${branch}</g></g>
        <g transform="translate(500 500) scale(-1 -1)">
          <g filter="url(#${filterId})"><g class="sg-fluid-arm sg-fluid-mirror">${branch}</g></g>
        </g>
      </g>
    </svg>`;
  }

  window.renderFluidMascot = fluidMascot;

  function addRosterAgent(record) {
    if (!record?.id || AGENTS.some((agent) => agent.serverId === record.id)) return;
    const preset = PRESET_SPECIALISTS.find(
      (agent) => agent.name === record.name && agent.role === record.role,
    );
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
    if (rosterLoading) return;
    rosterLoading = true;
    try {
      const response = await fetch('/api/agents/team', { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Agent roster unavailable.');
      const { agents } = await response.json();
      if (!Array.isArray(agents)) throw new Error('Agent roster unavailable.');
      chatRoster = new Map(agents.map((agent) => [agent.id, agent]));
      for (const agent of agents) {
        if (agent.isCustom) addRosterAgent(agent);
      }
      const selected = AGENTS.find(({ id }) => id === selectedAgentId);
      if (selected?.serverId && pickerState(selected.serverId).label === 'Inactive')
        selectSpecialistAgent('supergence', { focusComposer: false });
    } catch {
      chatRoster = null;
    } finally {
      rosterLoading = false;
      renderChatAgentPicker();
      renderDockOrbs();
    }
  }

  const pinKey = 'sis_chat_agent_pins';
  const pinLimit = 3;
  const panelSplitKeys = { width: 'sis_panel_width_split', height: 'sis_panel_height_split' };
  let chatRoster = null;
  let rosterLoading = false;
  let pinnedAgentIds = AGENTS.slice(1).map(({ serverId }) => serverId);
  try {
    const saved = JSON.parse(localStorage.getItem(pinKey));
    if (Array.isArray(saved))
      pinnedAgentIds = [...new Set(saved.filter((id) => typeof id === 'string'))].slice(0, pinLimit);
  } catch {}
  const agentActivity = new Map();
  const agentTools = new Map();
  let speaking;
  let agentTooltip;
  let tooltipAnchor;

  function pickerState(serverId) {
    const record = chatRoster?.get(serverId);
    const status = String(record?.status || '').toUpperCase();
    if (!chatRoster) return { active: false, label: rosterLoading ? 'Loading' : 'Unavailable' };
    if (!record || record.active === false || record.enabled === false ||
      ['INACTIVE', 'OFFLINE', 'DISABLED'].includes(status)) return { active: false, label: 'Inactive' };
    if (speaking?.id === serverId) return { active: true, label: 'Speaking' };
    if (agentActivity.get(serverId) === 'Working' || status === 'RUNNING' || status === 'BUSY')
      return { active: true, label: 'Working' };
    if (agentActivity.get(serverId) === 'Error' || record.lastError || status === 'ERROR' || status === 'FAILED')
      return { active: true, label: 'Error' };
    if (['AVAILABLE', 'ACTIVE', 'READY', 'IDLE'].includes(status)) return { active: true, label: 'Ready' };
    return { active: false, label: 'Unavailable' };
  }

  function renderChatAgentPicker() {
    const settingsPins = document.getElementById('swGeneralPins');
    if (settingsPins?.closest('dialog[open]')) renderPinOptions(settingsPins);
    const picker = document.getElementById('sgChatAgentPicker');
    if (!picker) return;
    const quick = picker.querySelector('.sg-agent-quick-list');
    const notice = document.getElementById('sgAgentPickerNotice');
    const focused = quick.contains(document.activeElement) ? document.activeElement.dataset.agent : null;
    const choices = [AGENTS[0], ...activePinnedAgents()];
    if (quick.contains(tooltipAnchor)) hideAgentTooltip();
    quick.replaceChildren(...choices.map((agent) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sg-mascot-pill-item';
      button.dataset.agent = agent.id;
      button.setAttribute('aria-label', agent.name);
      button.setAttribute('aria-pressed', String(selectedAgentId === agent.id));
      button.insertAdjacentHTML('beforeend', fluidMascot(agent, 'sg-mascot-header-avatar'));
      bindAgentPresence(button, agent);
      button.addEventListener('click', () => chooseRosterAgent(agent, { focusComposer: false }));
      return button;
    }));
    if (focused) {
      const next = [...quick.children].find((button) => button.dataset.agent === focused);
      (next || picker.querySelector('#sgManageAgentPins')).focus();
    }
    const selected = AGENTS.find(({ id }) => id === selectedAgentId);
    const description = selected?.serverId
      ? `Replying with ${selected.name}${pickerState(selected.serverId).active ? '' : ' · status unavailable'}`
      : 'Replying with Supergence';
    if (notice.textContent !== description) notice.textContent = description;
    if (picker.querySelector('#sgAgentPins').matches(':popover-open')) renderPinOptions(picker);
  }

  function agentDetails(agent) {
    const id = agent.serverId || 'agent-supergence';
    const { label } = agent.serverId
      ? pickerState(id)
      : { label: speaking?.id === id ? 'Speaking' : agentActivity.get(id) || 'Automatic' };
    let activity;
    if (label === 'Speaking') activity = 'Reading a response aloud';
    else if (label === 'Working')
      activity = agentTools.get(id) || chatRoster?.get(id)?.currentTask || 'Processing a request';
    else if (label === 'Error') activity = 'The last attempt reported an error';
    else if (label === 'Ready') activity = 'Available for a request';
    else if (label === 'Automatic') activity = 'Let Supergence route the request';
    return { label, detail: String(activity || agent.role || label).slice(0, 180) };
  }

  function syncAgentPresence() {
    for (const button of document.querySelectorAll('[data-agent-presence]')) {
      const agent = button.presenceAgent;
      const { label, detail } = agentDetails(agent);
      const badge = button.querySelector('.sg-agent-badge');
      badge.dataset.status = label.toLowerCase();
      if (badge.textContent !== label) badge.textContent = label;
      button.setAttribute('aria-description', label);
      if (tooltipAnchor === button) {
        agentTooltip.textContent = `${agent.name} · ${detail}`;
        positionAgentTooltip(button);
      }
    }
  }

  function hideAgentTooltip() {
    tooltipAnchor?.removeAttribute('aria-describedby');
    tooltipAnchor = null;
    if (agentTooltip?.matches(':popover-open')) agentTooltip.hidePopover();
  }

  function positionAgentTooltip(button) {
    const bounds = button.getBoundingClientRect();
    const width = agentTooltip.offsetWidth;
    const height = agentTooltip.offsetHeight;
    agentTooltip.style.left = `${Math.max(8, Math.min(bounds.left, innerWidth - width - 8))}px`;
    agentTooltip.style.top = `${bounds.bottom + height + 8 <= innerHeight ? bounds.bottom + 6 : Math.max(8, bounds.top - height - 6)}px`;
  }

  function bindAgentPresence(button, agent) {
    button.dataset.agentPresence = '';
    button.presenceAgent = agent;
    const { label } = agentDetails(agent);
    button.setAttribute('aria-description', label);
    button.append(agentBadge(label));
    const show = () => {
      if (!agentTooltip) {
        agentTooltip = document.createElement('div');
        agentTooltip.id = 'sgAgentActivityTooltip';
        agentTooltip.className = 'sg-agent-tooltip';
        agentTooltip.setAttribute('role', 'tooltip');
        agentTooltip.popover = 'manual';
        document.body.append(agentTooltip);
      }
      if (tooltipAnchor !== button) tooltipAnchor?.removeAttribute('aria-describedby');
      tooltipAnchor = button;
      button.setAttribute('aria-describedby', agentTooltip.id);
      const { detail } = agentDetails(agent);
      agentTooltip.textContent = `${agent.name} · ${detail}`;
      if (!agentTooltip.matches(':popover-open')) agentTooltip.showPopover();
      positionAgentTooltip(button);
    };
    const hide = () => { if (tooltipAnchor === button) hideAgentTooltip(); };
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointerleave', () => {
      if (document.activeElement !== button) hide();
    });
    button.addEventListener('focus', show);
    button.addEventListener('blur', hide);
    button.addEventListener('click', hide);
  }

  function activePinnedAgents() {
    return pinnedAgentIds.flatMap((id) => {
      if (!pickerState(id).active) return [];
      const agent = AGENTS.find((entry) => entry.serverId === id);
      return agent ? [agent] : [{ ...chatRoster.get(id), serverId: id }];
    });
  }

  function chooseRosterAgent(agent, options) {
    if (!AGENTS.some(({ serverId }) => serverId === agent.serverId)) addRosterAgent(agent);
    const target = AGENTS.find(({ serverId }) => serverId === agent.serverId);
    if (target) selectSpecialistAgent(target.id, options);
  }

  function agentBadge(label) {
    const badge = document.createElement('span');
    badge.className = 'sg-agent-badge';
    badge.dataset.status = label.toLowerCase();
    badge.textContent = label;
    return badge;
  }

  function renderPinOptions(picker) {
    const list = picker.querySelector('.sg-agent-pin-list');
    const focused = list.contains(document.activeElement) ? document.activeElement.value : null;
    const records = new Map(AGENTS.filter(({ serverId }) => serverId).map((agent) => [agent.serverId, agent]));
    for (const [id, record] of chatRoster || []) {
      if (!records.has(id) && id !== 'agent-supergence') records.set(id, record);
    }
    const count = picker.querySelector('.sg-agent-pin-count');
    count.textContent = `${pinnedAgentIds.length} of ${pinLimit} pinned`;
    list.replaceChildren(...[...records].map(([serverId, agent]) => {
      const row = document.createElement('label');
      row.className = 'sg-agent-pin-row';
      row.title = agent.role || '';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = serverId;
      input.checked = pinnedAgentIds.includes(serverId);
      input.disabled = !input.checked && pinnedAgentIds.length >= pinLimit;
      const label = document.createElement('span');
      label.textContent = agent.name;
      row.append(input, label, agentBadge(pickerState(serverId).label));
      input.addEventListener('change', () => {
        pinnedAgentIds = input.checked
          ? [...pinnedAgentIds, serverId].slice(0, pinLimit)
          : pinnedAgentIds.filter((id) => id !== serverId);
        try { localStorage.setItem(pinKey, JSON.stringify(pinnedAgentIds)); } catch {}
        renderChatAgentPicker();
        renderDockOrbs();
      });
      return row;
    }));
    if (focused) [...list.querySelectorAll('input')].find(({ value }) => value === focused)?.focus();
  }

  function speakReply(text, id, rate = 1.04, onFinish) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ''));
    utterance.rate = rate;
    utterance.onstart = () => {
      speaking = { id, utterance };
      syncAgentPresence();
    };
    const finish = (error) => {
      onFinish?.(error);
      if (speaking?.utterance !== utterance) return;
      speaking = null;
      syncAgentPresence();
    };
    utterance.onend = () => finish();
    utterance.onerror = (event) => finish(event);
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return utterance;
    } catch {
      return null;
    }
  }

  let currentMode = 'chat'; // 'chat' | 'voice'
  let workspacePaneOpen = true;
  let composerVoice = null;
  let selectedAgentId = 'supergence';
  let isListening = false;
  let voiceRecognition = null;
  let currentMascotAction = 'idle';
  let voiceEnabled = false;

  function mountTopDynamicIsland() {
    if (document.getElementById('sgTopDynamicIsland')) return;
    const island = document.createElement('header');
    island.className = 'sg-top-dynamic-island';
    island.id = 'sgTopDynamicIsland';
    island.setAttribute('aria-label', 'Session toolbar');
    document.body.appendChild(island);

    island.innerHTML = `
      <div class="sg-session-context">
        <button type="button" class="sg-island-btn" id="sgConversationsBtn"
                aria-label="Conversations" title="Conversations"
                aria-controls="workspaceConversationsSidebar" aria-expanded="false">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24">
            <rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M9 5v14m3.5-9h4m-4 4h4"/>
          </svg>
        </button>
        <button type="button" class="sg-island-btn" id="sgNewChatBtn"
                aria-label="New chat" title="New chat">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24"><path d="M12 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5M11 13l1-4 5-5a2 2 0 0 1 3 3l-5 5z"/></svg>
        </button>
        <span class="sg-session-title-slot"></span>
      </div>
      <div class="sg-island-mode-switch" role="group" aria-label="Conversation mode">
        <button type="button" 
                class="sg-island-btn mode-chat-btn ${currentMode === 'chat' ? 'active' : ''}" 
                id="sgModeChatBtn" 
                title="Chat Mode" aria-label="Chat mode" aria-pressed="${currentMode === 'chat'}">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24">
            <path d="M12 4a8 8 0 0 0-7 12l-1 4 4-1a8 8 0 1 0 4-15Z"/>
          </svg>
          <span>Chat</span>
        </button>
        <button type="button" 
                class="sg-island-btn mode-voice-btn ${currentMode === 'voice' ? 'active' : ''}" 
                id="sgModeVoiceBtn" 
                title="Live Voice Mode" aria-label="Voice mode" aria-pressed="${currentMode === 'voice'}">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24">
            <path d="M4 11v2m4-5v8m4-12v16m4-12v8m4-5v2"/>
          </svg>
          <span>Voice</span>
        </button>
      </div>
      <div class="sg-session-actions">
        <label class="sg-workspace-switch" title="Workspace pane">
          <input type="checkbox" role="switch" id="sgWorkspacePaneToggle" aria-label="Workspace pane" aria-controls="sgSpacePane" checked>
          <span class="sg-workspace-switch-label" aria-hidden="true">Workspace</span>
          <span class="sg-workspace-switch-track" aria-hidden="true"></span>
        </label>
        <button type="button" class="sg-island-btn" id="sgNotificationsButton" aria-label="Notifications" title="Notifications" aria-haspopup="dialog" aria-controls="sgNotifications">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 4.5-1.5 5.5-2 7.5h16c-.5-2-2-3-2-7.5M10 20a2.2 2.2 0 0 0 4 0"/></svg>
          <span id="sgNotificationCount" aria-hidden="true" hidden></span>
        </button>
        <button type="button" class="sg-island-btn" id="sgApprovalsButton" aria-label="Pending approvals" title="Pending approvals" aria-haspopup="dialog" aria-controls="sgNotifications">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24"><path d="m12 3 7 3v5c0 4.5-2.8 7.6-7 10-4.2-2.4-7-5.5-7-10V6zM9 12l2 2 4-4"/></svg>
          <span id="sgApprovalCount" aria-hidden="true" hidden></span>
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
                title="Open workspace browser" aria-label="Open workspace browser" aria-controls="sgPanelBrowser">
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
        <button type="button" class="sg-island-btn" id="sgSettingsButton" aria-label="Settings" title="Settings" aria-haspopup="dialog" aria-controls="supergenceStylesWindow">
          <svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16M8 4v6m8-1v6m-5-1v6"/></svg>
        </button>
      <details class="sg-workspace-menu">
        <summary aria-label="Workspace actions" title="Workspace actions"><svg aria-hidden="true" class="sg-notification-icon" viewBox="0 0 24 24"><path d="M5 12h.01m7 0h.01m7 0h.01" stroke-linecap="round" stroke-width="3"/></svg></summary>
        <div class="sg-workspace-actions">
          <div class="sg-workspace-size" id="sgWorkspaceSize">
            <div class="sg-workspace-size-heading">
              <label for="sgChatSizeSlider">Chat size</label>
              <output for="sgChatSizeSlider" id="sgChatSizeValue">50%</output>
            </div>
            <input id="sgChatSizeSlider" type="range" min="25" max="75" value="50">
          </div>
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
      </div>
    `;

    const title = document.getElementById('activeWorkspaceTitleDisplay');
    if (title) island.querySelector('.sg-session-title-slot').replaceWith(title);
    island.querySelector('#sgWorkspacePaneToggle').addEventListener('change', (event) => {
      setWorkspacePane(event.currentTarget.checked, { bringIntoView: true });
    });
    const workspaceMenu = island.querySelector('.sg-workspace-menu');
    island.querySelector('#sgSettingsButton').addEventListener('click', () => window.openStylesWindow?.('general'));
    workspaceMenu.addEventListener('click', (event) => {
      if (event.target.closest('button')) workspaceMenu.open = false;
    });
    document.addEventListener('click', (event) => {
      if (!workspaceMenu.contains(event.target)) workspaceMenu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        document.querySelector('dialog:modal, .sg-history-menu:popover-open')
      ) return;
      if (workspaceMenu.open) {
        workspaceMenu.open = false;
        workspaceMenu.querySelector('summary').focus();
      } else if (
        document.getElementById('workspaceConversationsSidebar')?.classList.contains('drawer-open')
      ) {
        toggleConversationsDrawer(false, { focus: true });
      }
    });
    island
      .querySelector('#sgConversationsBtn')
      .addEventListener('click', () => toggleConversationsDrawer(undefined, { focus: true }));
    island
      .querySelector('#sgNotificationsButton')
      .addEventListener('click', () => window.SupergenceNotifications?.open());
    island
      .querySelector('#sgApprovalsButton')
      .addEventListener('click', () => window.SupergenceNotifications?.open('approvals'));
    window.SupergenceNotifications?.count();
    island.querySelector('#sgNewChatBtn')?.addEventListener('click', () => {
      switchMode('chat');
      window.startNewWorkspaceThread?.();
      document.getElementById('sgCardInput')?.focus();
    });
    island
      .querySelector('#sgOpenWorkspaceFiles')
      .addEventListener('click', () => window.SupergenceBrowser?.show({ section: 'files' }));
    island.querySelector('#sgOpenSpecialists').addEventListener('click', openAddAgentModal);
    island
      .querySelector('#sgOpenModelSetup')
      .addEventListener('click', () => window.openSupergenceSetup?.(4));
    island
      .querySelector('#sgOpenAccess')
      .addEventListener('click', () => window.SupergenceAccess?.open());
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
    if (!['chat', 'voice'].includes(mode) || mode === currentMode) return;
    currentMode = mode;
    for (const [id, selected] of [['sgModeChatBtn', mode === 'chat'], ['sgModeVoiceBtn', mode === 'voice']]) {
      const control = document.getElementById(id);
      control?.classList.toggle('active', selected);
      control?.setAttribute('aria-pressed', String(selected));
    }

    const stream = document.getElementById('chatTurnsStream') || window.getOrCreateChatTurnsStream?.();
    if (!stream) return;
    if (!stream.querySelector('#sgActiveConversationCard')) mountActiveConversation(stream);
    updateConversationMode();
    if (mode === 'voice') {
      composerVoice?.stop();
      voiceEnabled = true;
      if (voiceRequest) {
        setVoiceState('thinking', 'Thinking');
        showVoiceStatus('Your voice request is still in progress.');
      } else {
        startVoiceEngine();
      }
      document.getElementById('sgVoiceMicBtn')?.focus();
    } else {
      voiceEnabled = false;
      stopVoiceEngine();
      setVoiceMascotAction('idle');
      if (voiceReply) {
        voiceReply = null;
        window.speechSynthesis?.cancel();
      }
      document.getElementById('sgCardInput')?.focus();
    }
  }

  function updateConversationMode() {
    const card = document.getElementById('sgActiveConversationCard');
    if (!card) return;
    card.dataset.conversationMode = currentMode;
    if (currentMode === 'voice') mountVoiceStage(card);
  }

  function setWorkspacePane(open, { bringIntoView = false } = {}) {
    workspacePaneOpen = open;
    const pane = document.getElementById('sgSpacePane');
    const layout = document.getElementById('sgDualWorkspaceWrapper');
    const toggle = document.getElementById('sgWorkspacePaneToggle');
    const size = document.getElementById('sgWorkspaceSize');
    if (pane) pane.hidden = !open;
    layout?.toggleAttribute('data-workspace-hidden', !open);
    const divider = layout?.querySelector('.sg-panel-divider');
    if (divider) divider.hidden = !open;
    if (toggle) toggle.checked = open;
    if (size) size.hidden = !open;
    if (open && bringIntoView && window.matchMedia('(max-width: 960px)').matches) {
      pane?.scrollIntoView({ block: 'nearest' });
    }
  }

  function toggleConversationsDrawer(forceState, { focus = false, onlyOverlay = false } = {}) {
    if (onlyOverlay && window.matchMedia('(min-width: 1160px)').matches) return;
    const sidebar = document.getElementById('workspaceConversationsSidebar');
    const backdrop = document.getElementById('workspaceDrawerBackdrop');
    if (!sidebar) return;
    if (backdrop && backdrop.parentElement !== sidebar.parentElement) sidebar.before(backdrop);

    const willOpen =
      typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('drawer-open');
    sidebar.classList.toggle('drawer-open', willOpen);
    sidebar.classList.toggle('mobile-open', willOpen);
    sidebar.inert = !willOpen;
    if (backdrop) backdrop.classList.toggle('active', willOpen);
    const trigger = document.getElementById('sgConversationsBtn');
    trigger?.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      void window.loadConversationsList?.();
      if (focus) document.getElementById('shellNewConversation')?.focus();
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
      ${fluidMascot(agent, 'sg-toast-orb')}
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

  function selectSpecialistAgent(agentId, { focusComposer = true } = {}) {
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

    // 2. Update active conversation card top row & mascots
    document.querySelectorAll('.sg-active-orb-unit, .sg-mascot-pill-item').forEach((u) => {
      u.classList.toggle('selected', u.dataset.agent === agent.id);
      u.setAttribute('aria-pressed', String(u.dataset.agent === agent.id));
    });

    // 3. Update speaking avatar
    const voiceMascot = document.getElementById('sgVoiceMascotFigure');
    if (voiceMascot) {
      voiceMascot.setAttribute('aria-label', `${agent.name}. Switch agent`);
      voiceMascot.innerHTML = fluidMascot(agent, 'sg-voice-fluid');
    }
    const voiceHeading = document.getElementById('sgVoiceHeading');
    if (voiceHeading) voiceHeading.textContent = `Talk with ${agent.name}`;
    const speakerAvatar = document.getElementById('sgSpeakingAvatar');
    if (speakerAvatar) {
      speakerAvatar.innerHTML = fluidMascot(agent);
      speakerAvatar.title = `${agent.name} (${agent.role})`;
    }

    // 4. Dynamically update composer placeholder for direct specialist chat
    const isSupergence = !agent || agent.id === 'supergence';
    const placeholderText = isSupergence
      ? 'Message Supergence'
      : `Ask ${agent.name} about ${agent.role.toLowerCase()}...`;
    const landingInput = document.getElementById('sgLandingInput');
    const cardInput = document.getElementById('sgCardInput');
    if (landingInput) landingInput.placeholder = placeholderText;
    if (cardInput) cardInput.placeholder = placeholderText;

    // 5. Show quick sleek floating specialist toast
    renderChatAgentPicker();
    if (focusComposer) showSpecialistToast(agent);

    // 6. Focus active chat input immediately
    if (currentMode === 'chat' && focusComposer) {
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
      const focused = container.contains(document.activeElement) ? document.activeElement.dataset.agent : null;
      if (container.contains(tooltipAnchor)) hideAgentTooltip();
      container.replaceChildren();
      const list = selector === '.sg-dock-orbs-container' ? activePinnedAgents() : AGENTS;

      for (const agent of list) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.dataset.agent = agent.id;
        if (selector !== '.sg-dock-orbs-container') button.title = `${agent.name} (${agent.role})`;
        button.setAttribute('aria-label', agent.name);
        button.classList.toggle(activeClass, selectedAgentId === agent.id);
        button.setAttribute('aria-pressed', String(selectedAgentId === agent.id));
        button.insertAdjacentHTML('beforeend', fluidMascot(agent));
        if (selector === '.sg-dock-orbs-container') bindAgentPresence(button, agent);
        button.addEventListener('click', () => chooseRosterAgent(agent));
        container.append(button);
      }
      if (focused) [...container.children].find(({ dataset }) => dataset.agent === focused)?.focus();
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

      (document.querySelector('.sg-session-actions') || document.body).appendChild(dock);

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
        backdrop
          .querySelectorAll('.sg-color-swatch')
          .forEach((s) => s.classList.remove('selected'));
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
            ${fluidMascot(preset, 'sg-preset-orb')}
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
        if (preset && (await addSpecialistAgent(preset))) {
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
  function formatModelDisplayName(rawModel) {
    return String(rawModel || '')
      .trim()
      .replace(/^[^/]+\//, '');
  }

  function updateModelLabel(button, model) {
    const displayName = formatModelDisplayName(model);
    const label = displayName || 'Select model';
    const name = button.querySelector('.sg-model-name, .sg-model-name-text');
    if (name) name.textContent = label;
    button.title = displayName ? `Switch model (active: ${displayName})` : label;
    button.setAttribute('aria-label', button.title);
  }

  window.addEventListener('sis-model-changed', (event) => {
    document.querySelectorAll('.sg-model-badge, #sgComposerModelPill').forEach((button) => {
      updateModelLabel(button, event.detail?.active?.model);
    });
  });

  function wireModelControl(container) {
    const buttons = container.querySelectorAll('.sg-model-badge, #sgComposerModelPill');
    if (!buttons.length) return;
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        if (window.SisModelSwitcher) {
          window.SisModelSwitcher.open();
        } else {
          window.openSupergenceSetup?.(4);
        }
      });
    });

    const showModel = (model) => {
      buttons.forEach((button) => updateModelLabel(button, model));
    };

    const activeModel = window.SisModelSwitcher?.getActive()?.model;
    if (activeModel) {
      showModel(activeModel);
    } else {
      void fetch('/api/provider/status')
        .then((response) => {
          if (!response.ok) throw new Error('Provider status unavailable');
          return response.json();
        })
        .then((provider) => {
          if (!provider.configured || !provider.model) return;
          showModel(window.SisModelSwitcher?.getActive()?.model || provider.model);
        })
        .catch(() => {});
    }
  }

  const composerDrafts = new WeakMap();
  const attachmentSizeLimit = 10 * 1024 * 1024;

  function bindComposerAddActions(container, input, submit) {
    const actions = container.querySelector('#sgComposerAddActions');
    const trigger = container.querySelector('#sgComposerContextButton');
    const picker = container.querySelector('#sgComposerFileInput');
    const list = container.querySelector('#sgComposerAttachments');
    const status = container.querySelector('#sgComposerContextStatus');
    const dialog = container.querySelector('#sgComposerContextDialog');
    const notes = container.querySelector('#sgComposerContextText');
    const notesButton = container.querySelector('#sgComposerAddNotes');
    const draft = { files: [], notes: '', uploading: false, status, submit, render };
    composerDrafts.set(input, draft);

    function setActionsOpen(open) {
      actions.classList.toggle('is-open', open);
      actions.inert = !open;
      trigger.setAttribute('aria-expanded', String(open));
    }

    trigger.addEventListener('click', () => setActionsOpen(actions.inert));
    container.querySelector('.sg-card-composer-capsule').addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || actions.inert) return;
      event.preventDefault();
      event.stopPropagation();
      setActionsOpen(false);
      trigger.focus();
    });

    function render() {
      status.textContent = draft.notes ? 'Notes added' : '';
      notesButton.lastChild.textContent = draft.notes ? 'Edit notes' : 'Add notes';
      list.hidden = !draft.files.length;
      list.replaceChildren(
        ...draft.files.map((file, index) => {
          const item = document.createElement('li');
          const name = document.createElement('span');
          name.textContent = file.name;
          name.title = file.name;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.setAttribute('aria-label', `Remove ${file.name}`);
          remove.innerHTML =
            '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
          remove.addEventListener('click', () => {
            if (draft.uploading) return;
            draft.files.splice(index, 1);
            render();
            (list.children[index]?.lastChild || list.lastChild?.lastChild || trigger).focus();
          });
          item.append(name, remove);
          return item;
        }),
      );
    }

    container.querySelector('#sgComposerAttachFiles').addEventListener('click', () => {
      setActionsOpen(false);
      if (!draft.uploading) picker.click();
    });
    picker.addEventListener('change', () => {
      const files = [...draft.files, ...picker.files];
      picker.value = '';
      if (
        files.length > 5 ||
        files.reduce((sum, file) => sum + file.size, 0) > attachmentSizeLimit
      ) {
        status.textContent = 'Choose up to 5 files totaling 10 MB or less.';
        return;
      }
      draft.files = files;
      render();
    });
    notesButton.addEventListener('click', () => {
      setActionsOpen(false);
      if (draft.uploading) return;
      notes.value = draft.notes;
      dialog.returnValue = 'cancel';
      dialog.showModal();
    });
    container.querySelector('#sgComposerMemory').addEventListener('click', () => {
      setActionsOpen(false);
      void window.LearningPanel?.show('conversation');
    });
    dialog.addEventListener('close', () => {
      if (dialog.returnValue !== 'save') return;
      draft.notes = notes.value.trim();
      render();
    });
    container.querySelector('#sgComposerWorkspaceFiles').addEventListener('click', () => {
      setActionsOpen(false);
      window.SupergenceBrowser?.show({ section: 'files' });
    });
    container.querySelector('#sgComposerAddSpecialist').addEventListener('click', () => {
      setActionsOpen(false);
      openAddAgentModal();
    });
  }

  function bindComposerInput(input, submit) {
    if (!input) return;
    const resize = () => {
      if (input.tagName && input.tagName.toLowerCase() === 'textarea') {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
      }
    };
    input.addEventListener('input', resize);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        void executeLiquidGlassTurn(input.value.trim());
      }
    });
    submit?.addEventListener('click', () => {
      void executeLiquidGlassTurn(input.value.trim());
    });
  }

  function mountLandingHero(container) {
    if (!container) return;
    mountActiveConversation(container);
  }

  // ── 6. Chat Mode: Active Conversation Card & Dual Space Pane ──
  function mountActiveConversation(container) {
    composerVoice?.stop();
    composerVoice = null;
    if (!container) return;
    container.innerHTML = `
      <div class="sg-dual-workspace-wrapper" id="sgDualWorkspaceWrapper">
        <!-- Left Pane: Conversation Space -->
        <div class="sg-conversation-container" id="sgActiveConversationCard">
          <div class="sg-card-header">
            <div id="sgChatAgentPicker" class="sg-chat-agent-picker" role="group" aria-label="Chat agents">
              <div class="sg-agent-picker-toolbar">
                <span id="sgAgentPickerNotice" class="shell-sr-only" role="status"></span>
                <button type="button" id="sgManageAgentPins" popovertarget="sgAgentPins">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 3 6 6-4 1-2 5-2 2-6-6 2-2 5-2 1-4ZM10 14l-6 6"/></svg>
                  Manage pins
                </button>
              </div>
              <div class="sg-agent-quick-list"></div>
              <div id="sgAgentPins" class="sg-agent-pins" popover role="group" aria-label="Pinned agents">
                <div class="sg-agent-pin-heading"><strong>Pinned agents</strong><span class="sg-agent-pin-count" role="status"></span></div>
                <div class="sg-agent-pin-list"></div>
              </div>
            </div>
          </div>

          <!-- Speaking agent with live audio waveform bars -->
          <div class="sg-speaking-agent-row" id="sgSpeakingAgentRow" style="display:none;">
            <span class="sg-speaking-avatar" id="sgSpeakingAvatar" aria-hidden="true"></span>
            <span class="sg-waveform-bars" id="sgSpeakingWaveformBars">
              <span class="sg-waveform-bar"></span>
              <span class="sg-waveform-bar"></span>
              <span class="sg-waveform-bar"></span>
              <span class="sg-waveform-bar"></span>
            </span>
          </div>

          <!-- Messages Area -->
          <div class="sg-card-messages" id="sgCardMessages"></div>

          <!-- Docked Bottom Sleek Capsule Composer -->
          <div class="sg-card-composer-wrap">
            <div class="sg-card-composer-capsule">
              <button type="button" class="sg-composer-context-button" id="sgComposerContextButton" aria-controls="sgComposerAddActions" aria-expanded="false" aria-label="Add files and context" title="Add files and context">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <textarea rows="1" class="sg-capsule-input" id="sgCardInput" placeholder="Message Supergence" aria-label="Message Supergence"></textarea>
                <button type="button" class="sg-composer-circle-send" id="sgCardSubmitBtn" aria-label="Send message" title="Send message">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 10 4 15 9 20"></polyline>
                    <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                  </svg>
                </button>
                <button type="button" id="sgComposerStop" class="sg-composer-stop" aria-label="Stop response" title="Stop response">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
            <div class="sg-composer-add-actions" id="sgComposerAddActions" inert role="group" aria-label="Composer actions">
              <div class="sg-composer-add-actions-inner">
              <button type="button" id="sgComposerAttachFiles"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 11-8 8a5 5 0 0 1-7-7l9-9a3 3 0 0 1 4 4l-9 9a1 1 0 0 1-2-2l8-8"/></svg>Attach files</button>
              <button type="button" id="sgComposerAddNotes"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6m-6 4h6"/></svg>Add notes</button>
              <button type="button" id="sgComposerMemory" aria-haspopup="dialog"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4m0 0-7 4m7-4 7 4"/></svg>Conversation memory</button>
              <button type="button" id="sgComposerWorkspaceFiles"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>Open workspace files</button>
              <button type="button" id="sgComposerAddSpecialist"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m3-12v6m-3-3h6"/></svg>Add a specialist</button>
              </div>
            </div>
            </div>
            <div class="sg-composer-tools">
              <button type="button" class="sg-composer-dictate" id="sgComposerDictate" aria-label="Dictate" aria-pressed="false" title="Dictate" disabled>
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
              </button>
              <span class="sg-composer-context-status" id="sgComposerContextStatus" role="status"></span>
              <span class="sg-composer-voice-status" id="sgComposerVoiceStatus" role="status"></span>
              <button type="button" class="sg-composer-model-pill" id="sgComposerModelPill">
                <span class="sg-model-name-text">Select model</span>
                <svg class="sg-composer-model-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>
              </button>
            </div>
            <input type="file" id="sgComposerFileInput" multiple hidden>
            <ul class="sg-composer-attachments" id="sgComposerAttachments" aria-label="Files to attach" hidden></ul>
            <dialog class="shell-dialog sg-composer-context-dialog" id="sgComposerContextDialog" aria-labelledby="sgComposerContextTitle">
              <form method="dialog">
                <label id="sgComposerContextTitle" for="sgComposerContextText">Context for your next message</label>
                <textarea id="sgComposerContextText" rows="6" maxlength="12000" placeholder="Paste notes, an excerpt, or background information" autofocus></textarea>
                <div class="sg-composer-context-actions">
                  <button type="submit" value="cancel">Cancel</button>
                  <button type="submit" value="save">Save context</button>
                </div>
              </form>
            </dialog>
          </div>
        </div>

        <div class="sg-panel-divider" role="separator" tabindex="0"
          aria-label="Resize conversation and workspace" aria-controls="sgActiveConversationCard sgSpacePane"
          title="Drag or use the arrow keys to resize. Double-click to reset."></div>
        <section class="sg-space-pane" id="sgSpacePane" aria-label="Workspace tools">
          <div class="sg-space-header">
            <div class="sg-space-nav-bar" role="tablist" aria-label="Space tools">
              <button type="button" class="sg-space-nav-tab active" data-tab="activity" role="tab" aria-selected="true">
                <span class="sg-space-nav-icon">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </span>
                <span>Activity</span>
              </button>
              <button type="button" class="sg-space-nav-tab" data-tab="browser" role="tab" aria-selected="false">
                <span class="sg-space-nav-icon">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </span>
                <span>Browser</span>
              </button>
              <button type="button" class="sg-space-nav-tab" data-tab="files" role="tab" aria-selected="false">
                <span class="sg-space-nav-icon">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <span>Files</span>
              </button>
              <button type="button" class="sg-space-nav-tab" data-tab="team" role="tab" aria-selected="false">
                <span class="sg-space-nav-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 3.3a4 4 0 0 1 0 7.4M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="10" cy="7" r="4"/></svg></span>
                <span>Team</span>
              </button>
              <button type="button" class="sg-space-nav-tab" data-tab="memory" role="tab" aria-selected="false">
                <span class="sg-space-nav-icon">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"></path></svg>
                </span>
                <span>Memory</span>
              </button>
            </div>
            <div class="sg-pane-actions">
              <button type="button" class="sg-pane-action" data-pane-expand aria-label="Expand workspace pane" title="Expand workspace pane">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6-6 6M4 14v6h6m-6 0 6-6"/></svg>
              </button>
              <button type="button" class="sg-pane-action" data-pane-close aria-label="Close workspace pane" title="Close workspace pane">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </div>
          </div>

          <div class="sg-space-content" id="sgSpaceContent">
            <!-- Activity Panel -->
            <div class="sg-space-panel active" id="sgPanelActivity" role="tabpanel">
              <section class="sg-activity-calendar" aria-labelledby="sgActivityCalendarTitle">
                <h2 class="sg-timeline-title" id="sgActivityCalendarTitle">Messages by day</h2>
                <div class="sg-activity-calendar-layout" hidden>
                  <div class="sg-activity-weekdays" aria-hidden="true"><span></span><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
                  <div class="sg-activity-calendar-scroll">
                    <div class="sg-activity-calendar-grid" aria-label="Daily message counts" role="group"></div>
                  </div>
                </div>
                <p class="sg-activity-day-status" role="status"></p>
              </section>
              <section class="sg-activity-timeline-card" aria-labelledby="sgRecentChatsTitle">
                <h2 class="sg-timeline-title" id="sgRecentChatsTitle">Recent conversations</h2>
                <p class="sg-timeline-empty" id="sgActivityStatus" role="status"></p>
                <button class="sg-activity-retry" id="sgActivityRetry" type="button" hidden>Retry</button>
                <ul class="sg-timeline-list" id="sgActivityTimelineList"></ul>
              </section>

            </div>

            <!-- Browser Panel -->
            <div class="sg-space-panel" id="sgPanelBrowser" role="tabpanel">
              <div id="sgBrowserDock"></div>
            </div>

            <!-- Files Panel -->
            <div class="sg-space-panel" id="sgPanelFiles" role="tabpanel">
              <div id="sgChatFilesDock"></div>
            </div>

            <div class="sg-space-panel" id="sgPanelTeam" role="tabpanel">
              <section class="sg-team-chat" id="sgTeamChat" aria-label="Project team chat"><header class="sg-team-heading"><div><h2>Team chat</h2><p>Agent collaboration in this project</p></div></header><p class="sg-team-status" role="status">Loading team chat…</p></section>
            </div>

            <!-- Memory Panel -->
            <div class="sg-space-panel" id="sgPanelMemory" role="tabpanel">
              <div class="sg-arem-view" id="sgAremView">
                <div class="sg-arem-toolbar">
                  <div><h2>Memory map</h2><p>AREM · this chat and shared memory</p></div>
                  <button type="button" id="sgAremRefresh" aria-label="Refresh memory map" title="Refresh memory map">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 5M18 15a7 7 0 0 1-12 2l-2-5"/></svg>
                  </button>
                </div>
                <div class="sg-arem-meta"><span id="sgAremCounts">Loading memory…</span><span id="sgAremLive">Connecting</span></div>
                <div class="sg-arem-usage" id="sgAremUsage">No recent AREM activity for this chat.</div>
                <div class="sg-arem-canvas" id="sgAremCanvas" aria-label="AREM memory map"></div>
                <div class="sg-arem-detail" id="sgAremDetail" aria-live="polite">Select a node to inspect its memory.</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    const input = container.querySelector('#sgCardInput');
    const visibleSubmit = container.querySelector('#sgCardSubmitBtn');
    container.querySelector('#sgComposerStop').addEventListener('click', () => {
      const stops = container.querySelectorAll(
        '#sgCardMessages :is([data-agent-state="thinking"], [data-agent-state="replying"]) .tasks-running-stop-btn:not(:disabled)',
      );
      stops[stops.length - 1]?.click();
    });
    bindComposerInput(input, visibleSubmit);
    bindComposerAddActions(container, input, visibleSubmit);
    const mic = container.querySelector('#sgComposerDictate');
    const voiceStatus = container.querySelector('#sgComposerVoiceStatus');
    void import('./voice-input.js').then(({ VoiceInput }) => {
      if (!mic.isConnected) return;
      composerVoice = new VoiceInput(null, {
        button: mic,
        inputId: input.id,
        autoSubmit: false,
        onStateChange(state) {
          voiceStatus.textContent =
            state === 'listening' ? 'Listening…'
            : state === 'idle' ? ''
            : state === 'microphone-unavailable' ? 'Microphone unavailable'
            : 'Dictation unavailable';
        },
      });
      mic.disabled = false;
      composerVoice.init();
    }).catch(() => {
      if (mic.isConnected) mic.title = 'Dictation could not be loaded';
    });
    container
      .querySelector('#sgCardSuperboxBtn')
      ?.addEventListener('click', () => window.Superbox?.toggle());

    const picker = container.querySelector('#sgChatAgentPicker');
    bindPanelDivider(container.querySelector('#sgDualWorkspaceWrapper'));
    setWorkspacePane(workspacePaneOpen);
    const pinPopover = picker.querySelector('#sgAgentPins');
    pinPopover.addEventListener('beforetoggle', (event) => {
      if (event.newState !== 'open') return;
      const bounds = picker.getBoundingClientRect();
      const width = Math.min(bounds.width, window.innerWidth - 16);
      const below = window.innerHeight - bounds.bottom - 16;
      const above = bounds.top - 16;
      const openAbove = below < 170 && above > below;
      pinPopover.style.width = `${width}px`;
      pinPopover.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8))}px`;
      pinPopover.style.top = openAbove ? 'auto' : `${bounds.bottom + 8}px`;
      pinPopover.style.bottom = openAbove ? `${window.innerHeight - bounds.top + 8}px` : 'auto';
      pinPopover.style.maxHeight = `${Math.max(0, Math.min(340, openAbove ? above : below))}px`;
      renderPinOptions(picker);
      void loadRoster();
    });
    renderChatAgentPicker();

    renderDockOrbs();

    const activeAgent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];
    const isSupergenceActive = !activeAgent || activeAgent.id === 'supergence';
    if (input)
      input.placeholder = isSupergenceActive
        ? 'Message Supergence'
        : `Ask ${activeAgent.name} about ${activeAgent.role.toLowerCase()}...`;

    const msgsContainer = container.querySelector('#sgCardMessages');
    if (msgsContainer) {
      const attachActionsToCard = (card) => {
        if (!card || card.parentElement.querySelector('.sg-turn-actions-bar')) return;
        const bar = document.createElement('div');
        bar.className = 'sg-turn-actions-bar';
        bar.innerHTML = `
          <button type="button" class="sg-turn-action-btn" data-action="copy" aria-label="Copy response text" title="Copy response">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Copy</span>
          </button>
        `;
        card.after(bar);
      };

      msgsContainer.querySelectorAll('.response-synthesis-card').forEach(attachActionsToCard);

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList?.contains('response-synthesis-card')) {
                attachActionsToCard(node);
              } else {
                node.querySelectorAll?.('.response-synthesis-card')?.forEach(attachActionsToCard);
              }
            }
          }
        }
      });
      observer.observe(msgsContainer, { childList: true, subtree: true });
    }

    updateActiveSpeakerUI();
    wireModelControl(container);
    initSpacePane(container.querySelector('#sgSpacePane'));
    updateConversationMode();
    if (currentMode === 'chat') input?.focus();
  }

  function bindPanelDivider(layout) {
    const divider = layout.querySelector('.sg-panel-divider');
    const slider = document.getElementById('sgChatSizeSlider');
    const sizeValue = document.getElementById('sgChatSizeValue');
    const sliderEvents = new AbortController();
    const stacked = matchMedia('(max-width: 960px)');
    const key = () => stacked.matches ? panelSplitKeys.height : panelSplitKeys.width;
    const min = 25;
    const max = 75;
    let share = 50;
    const resize = (value) => {
      share = Math.min(max, Math.max(min, Math.round(value)));
      layout.style.setProperty('--sg-chat-share', share);
      layout.style.setProperty('--sg-workspace-share', 100 - share);
      divider.setAttribute('aria-valuenow', share);
      divider.setAttribute('aria-valuetext', `Conversation ${share}%, workspace ${100 - share}%`);
      if (slider) slider.value = String(share);
      if (sizeValue) sizeValue.value = `${share}%`;
    };
    const save = () => {
      try { localStorage.setItem(key(), String(share)); } catch {}
    };
    const restore = () => {
      divider.setAttribute('aria-orientation', stacked.matches ? 'horizontal' : 'vertical');
      if (slider) slider.labels[0].textContent = stacked.matches ? 'Chat height' : 'Chat width';
      let previous;
      try { previous = Number(localStorage.getItem(key())); } catch {}
      resize(previous || 50);
    };
    divider.setAttribute('aria-valuemin', min);
    divider.setAttribute('aria-valuemax', max);
    restore();
    slider?.addEventListener('input', () => resize(Number(slider.value)), { signal: sliderEvents.signal });
    slider?.addEventListener('change', save, { signal: sliderEvents.signal });
    divider.addEventListener('workspace-reset-split', () => resize(50));
    const resizeObserver = new ResizeObserver(() => {
      const orientation = stacked.matches ? 'horizontal' : 'vertical';
      if (divider.getAttribute('aria-orientation') !== orientation) restore();
    });
    resizeObserver.observe(layout);
    const cleanup = new MutationObserver(() => {
      if (layout.isConnected) return;
      sliderEvents.abort();
      resizeObserver.disconnect();
      cleanup.disconnect();
    });
    cleanup.observe(layout.parentElement, { childList: true });
    divider.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      divider.focus();
      divider.setPointerCapture(event.pointerId);
      layout.classList.add('is-resizing');
    });
    divider.addEventListener('pointermove', (event) => {
      if (!divider.hasPointerCapture(event.pointerId)) return;
      const box = layout.getBoundingClientRect();
      resize(100 * (stacked.matches
        ? (event.clientY - box.top) / box.height
        : (event.clientX - box.left) / box.width));
    });
    divider.addEventListener('lostpointercapture', () => {
      layout.classList.remove('is-resizing');
      save();
    });
    divider.addEventListener('dblclick', () => { resize(50); save(); });
    divider.addEventListener('keydown', (event) => {
      if (event.key === (stacked.matches ? 'ArrowUp' : 'ArrowLeft')) resize(share - 5);
      else if (event.key === (stacked.matches ? 'ArrowDown' : 'ArrowRight')) resize(share + 5);
      else if (event.key === 'Home') resize(min);
      else if (event.key === 'End') resize(max);
      else return;
      event.preventDefault();
      save();
    });
  }

  function initSpacePane(spacePane) {
    if (!spacePane) return;

    const expand = spacePane.querySelector('[data-pane-expand]');
    const close = spacePane.querySelector('[data-pane-close]');
    if (!spacePane.requestFullscreen) expand.hidden = true;
    expand.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === spacePane) await document.exitFullscreen();
        else await spacePane.requestFullscreen();
      } catch {
        expand.title = 'Fullscreen unavailable';
      }
    });
    close.addEventListener('click', async () => {
      if (document.fullscreenElement === spacePane) await document.exitFullscreen();
      setWorkspacePane(false);
      document.getElementById('sgWorkspacePaneToggle')?.focus();
    });
    spacePane.addEventListener('fullscreenchange', () => {
      const expanded = document.fullscreenElement === spacePane;
      expand.setAttribute('aria-pressed', String(expanded));
      expand.title = expanded ? 'Restore workspace pane' : 'Expand workspace pane';
      expand.setAttribute('aria-label', expand.title);
      expand.querySelector('path').setAttribute('d', expanded
        ? 'M20 10h-6V4m0 6 6-6M4 14h6v6m0-6-6 6'
        : 'M14 4h6v6m0-6-6 6M4 14v6h6m-6 0 6-6');
    });

    const tabs = Array.from(spacePane.querySelectorAll('.sg-space-nav-tab'));
    const panels = spacePane.querySelectorAll('.sg-space-panel');
    let activityRequest;
    let calendarRequest;
    let memoryInitialized = false;
    let teamInitialized = false;
    const browserDock = spacePane.querySelector('#sgBrowserDock');
    const spaceTabKey = 'sis-workspace-space-tab';
    const savedTabs = ['activity', 'files', 'memory', 'team'];

    const switchSpaceTab = (tabName) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });
      panels.forEach((panel) => {
        const isActive =
          panel.id === `sgPanel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
        panel.classList.toggle('active', isActive);
      });
      if (savedTabs.includes(tabName)) {
        try {
          localStorage.setItem(spaceTabKey, tabName);
        } catch {
          // The tab can still be selected when storage is unavailable.
        }
      }

      if (tabName === 'activity') {
        void loadMessageActivity();
        void loadSpaceActivity();
      } else if (tabName === 'files') {
        const filesDock = spacePane.querySelector('#sgChatFilesDock');
        if (!filesDock.childElementCount)
          void window.SupergenceBrowser?.renderRegisteredSection('files', filesDock);
      } else if (tabName === 'memory') void loadSpaceMemory();
      else if (tabName === 'team') void loadTeamChat();
    };

    tabs.forEach((tab, index) => {
      const name = tab.dataset.tab;
      const panel = spacePane.querySelector(`#sgPanel${name[0].toUpperCase()}${name.slice(1)}`);
      tab.id = `sgSpaceTab-${name}`;
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-labelledby', tab.id);
      tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
      tab.addEventListener('click', () => {
        switchSpaceTab(name);
        if (name === 'browser') void window.SupergenceBrowser?.show();
      });
      tab.addEventListener('keydown', (event) => {
        const next = {
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowRight: (index + 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        tabs[next].click();
        tabs[next].focus();
      });
    });

    browserDock.addEventListener('sis:show-browser-dock', () => {
      setWorkspacePane(true);
      const alreadySelected = browserDock.parentElement.classList.contains('active');
      if (!alreadySelected) {
        switchSpaceTab('browser');
      }
      if (window.matchMedia('(max-width: 960px)').matches)
        spacePane.scrollIntoView({ block: 'nearest' });
    });
    browserDock.addEventListener('sis:show-chat-files', () => {
      setWorkspacePane(true);
      switchSpaceTab('files');
      if (window.matchMedia('(max-width: 960px)').matches)
        spacePane.scrollIntoView({ block: 'nearest' });
    });
    browserDock.addEventListener('sis:hide-browser-dock', () => {
      if (!browserDock.parentElement.classList.contains('active')) return;
      const restoreFocus = browserDock.contains(document.activeElement);
      switchSpaceTab('activity');
      if (restoreFocus) spacePane.querySelector('#sgSpaceTab-activity')?.focus();
    });

    // Helper: escapeText
    function escapeText(str) {
      return String(str ?? '').replace(
        /[&<>"']/g,
        (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
      );
    }

    const activityList = spacePane.querySelector('#sgActivityTimelineList');
    const activityStatus = spacePane.querySelector('#sgActivityStatus');
    const activityRetry = spacePane.querySelector('#sgActivityRetry');
    const activityDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const calendar = spacePane.querySelector('.sg-activity-calendar-layout');
    const calendarGrid = calendar.querySelector('.sg-activity-calendar-grid');
    const calendarScroll = calendar.querySelector('.sg-activity-calendar-scroll');
    const dayStatus = spacePane.querySelector('.sg-activity-day-status');
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const calendarDay = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' });
    const calendarMonth = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });
    let dayButtons = [];
    let selectedDay = '';

    function selectDay(button) {
      const previous = calendarGrid.querySelector('[aria-pressed="true"]');
      if (previous) {
        previous.setAttribute('aria-pressed', 'false');
        previous.tabIndex = -1;
      }
      selectedDay = button.dataset.date;
      button.setAttribute('aria-pressed', 'true');
      button.tabIndex = 0;
      dayStatus.textContent = button.title;
    }

    calendarGrid.addEventListener('keydown', (event) => {
      const index = dayButtons.indexOf(event.target);
      const offset = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
      if (index < 0 || offset === undefined) return;
      event.preventDefault();
      const next = dayButtons[index + offset];
      if (!next) return;
      selectDay(next);
      next.focus();
    });

    async function loadMessageActivity() {
      if (calendarRequest) return;
      if (calendar.hidden) dayStatus.textContent = 'Loading message activity…';
      try {
        const query = new URLSearchParams({ timeZone: zone || 'UTC' });
        calendarRequest = fetch(`/api/activity/messages?${query}`, { signal: AbortSignal.timeout(20000) });
        const response = await calendarRequest;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { dailyCounts } = await response.json();
        renderCalendar(dailyCounts);
      } catch {
        calendar.hidden = true;
        dayStatus.textContent = 'Message activity is unavailable.';
      } finally {
        calendarRequest = null;
      }
    }

    function renderCalendar(dailyCounts) {
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const weekday = new Date(today).getUTCDay();
      const start = today - (52 * 7 + weekday) * 86_400_000;
      const weeks = document.createDocumentFragment();
      const active = document.activeElement?.dataset.date;
      dayButtons = [];

      for (let week = 0; week < 53; week++) {
        const column = document.createElement('div');
        column.className = 'sg-activity-week';
        const label = document.createElement('span');
        label.className = 'sg-activity-month';
        column.append(label);
        for (let weekday = 0; weekday < 7; weekday++) {
          const date = new Date(start + (week * 7 + weekday) * 86_400_000);
          if (date.getTime() > today) break;
          if (date.getUTCDate() === 1) label.textContent = calendarMonth.format(date);
          const key = date.toISOString().slice(0, 10);
          const count = dailyCounts[key] || 0;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'sg-activity-day';
          button.dataset.date = key;
          button.dataset.level = String(count >= 25 ? 4 : count >= 10 ? 3 : count >= 4 ? 2 : count ? 1 : 0);
          button.title = `${calendarDay.format(date)} · ${count.toLocaleString()} ${count === 1 ? 'message' : 'messages'}`;
          button.setAttribute('aria-pressed', 'false');
          button.tabIndex = -1;
          button.addEventListener('click', () => selectDay(button));
          column.append(button);
          dayButtons.push(button);
        }
        weeks.append(column);
      }

      const scrollLeft = calendar.hidden ? null : calendarScroll.scrollLeft;
      calendarGrid.replaceChildren(weeks);
      calendar.hidden = false;
      const selection = dayButtons.find((button) => button.dataset.date === selectedDay) || dayButtons.at(-1);
      selectDay(selection);
      calendarScroll.scrollLeft = scrollLeft ?? calendarScroll.scrollWidth;
      if (active === selection.dataset.date) selection.focus({ preventScroll: true });
    }

    activityRetry.addEventListener('click', () => {
      spacePane.querySelector('#sgSpaceTab-activity')?.focus();
      void loadSpaceActivity();
    });

    async function loadSpaceActivity() {
      if (activityRequest) return;
      activityRetry.hidden = true;
      activityStatus.textContent = activityList.childElementCount ? '' : 'Loading conversations…';
      activityList.setAttribute('aria-busy', 'true');
      try {
        activityRequest = fetch('/api/conversations', { signal: AbortSignal.timeout(20000) });
        const response = await activityRequest;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const chats = Array.isArray(data) ? data : data.conversations;
        if (!Array.isArray(chats)) throw new Error('Invalid conversation list.');
        const rows = document.createDocumentFragment();

        for (const { id, title, createdAt, updatedAt } of chats.slice(0, 30)) {
          if (!id) continue;
          const row = document.createElement('li');
          const open = document.createElement('button');
          open.type = 'button';
          open.className = 'sg-timeline-item';
          open.addEventListener('click', async () => {
            await window.loadWorkspaceConversation(id);
            if (window.__activeWorkspaceConvId === id && window.matchMedia('(max-width: 960px)').matches) {
              document.getElementById('sgActiveConversationCard')?.scrollIntoView({ block: 'start' });
            }
          });

          const name = document.createElement('span');
          name.className = 'sg-timeline-title-text';
          name.textContent =
            (typeof title === 'string' ? title : title?.title)?.trim() || 'Untitled conversation';
          open.append(name);

          const date = new Date(updatedAt || createdAt || NaN);
          if (Number.isFinite(date.getTime())) {
            const time = document.createElement('time');
            time.className = 'sg-timeline-time';
            time.dateTime = date.toISOString();
            time.textContent = activityDate.format(date);
            open.append(time);
          }
          row.append(open);
          rows.append(row);
        }

        activityStatus.textContent = rows.childElementCount ? '' : 'No saved conversations yet.';
        activityList.replaceChildren(rows);
      } catch (error) {
        activityList.replaceChildren();
        activityStatus.textContent = 'Could not load conversations.';
        activityRetry.hidden = false;
        console.warn('[SpacePane] Could not load recent conversations:', error);
      } finally {
        activityList.removeAttribute('aria-busy');
        activityRequest = null;
      }
    }

    async function loadTeamChat() {
      const root = spacePane.querySelector('#sgTeamChat');
      if (!root) return;
      if (teamInitialized) { root?.dispatchEvent(new Event('team-refresh')); return; }
      teamInitialized = true;
      try {
        const { mountTeamChat } = await import('./workspace-team-chat.js?v=team-recovery-1');
        mountTeamChat(root);
      } catch (error) {
        teamInitialized = false;
        root.querySelector('.sg-team-status').textContent = 'Team chat could not load. Reopen this tab to retry.';
        console.warn('[SpacePane] Could not load team chat:', error);
      }
    }

    // ── 4. Memory Space ──
    async function loadSpaceMemory() {
      if (memoryInitialized) {
        spacePane.querySelector('#sgAremView')?.dispatchEvent(new Event('arem-refresh'));
        return;
      }
      memoryInitialized = true;
      try {
        const { mountAremGraph } = await import('./arem-graph-view.js');
        mountAremGraph(spacePane.querySelector('#sgAremView'));
      } catch {
        memoryInitialized = false;
        const canvas = spacePane.querySelector('#sgAremCanvas');
        if (canvas) canvas.textContent = 'Memory map could not load. Reopen this tab to retry.';
      }
    }

    let savedTab;
    try {
      savedTab = localStorage.getItem(spaceTabKey);
    } catch {
      // Fall back to the Files tab.
    }
    switchSpaceTab(savedTabs.includes(savedTab) ? savedTab : 'files');
  }

  function updateActiveSpeakerUI() {
    const speakerAvatar = document.getElementById('sgSpeakingAvatar');
    const agent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];
    if (speakerAvatar) {
      speakerAvatar.innerHTML = fluidMascot(agent);
    }
  }

  // ── 7. Voice Mode: Futuristic Voice Cockpit ──
  function mountVoiceStage(container) {
    if (container.querySelector('#sgVoiceStage')) return;

    const voiceStage = document.createElement('section');
    voiceStage.setAttribute('aria-label', 'Voice conversation');
    voiceStage.className = 'sg-voice-stage';
    voiceStage.id = 'sgVoiceStage';

    const agent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];

    voiceStage.innerHTML = `
      <div class="sg-voice-center-visualizer" id="sgVoiceCenterVisualizer">
        <button type="button" class="sg-voice-mascot-figure" id="sgVoiceMascotFigure" data-mascot-state="${currentMascotAction}" aria-label="${escapeHtml(agent.name)}. Switch agent">
          ${fluidMascot(agent, 'sg-voice-fluid')}
        </button>
      </div>
      <div class="sg-voice-heading" id="sgVoiceHeading">Talk with ${escapeHtml(agent.name)}</div>
      <div class="sg-voice-state" id="sgVoiceState">Ready to listen</div>
      <div class="sg-voice-transcription-pill" id="sgVoiceTranscript" role="status">Select the microphone to speak.</div>
      <div class="sg-voice-controls-toolbar">
        <button type="button" class="sg-voice-circle-btn" id="sgVoiceMicBtn" aria-pressed="false" aria-label="Start microphone" title="Start microphone">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8"/>
          </svg>
        </button>
        <button type="button" class="sg-voice-circle-btn" id="sgVoiceSwitchChatBtn" aria-label="Return to chat" title="Return to chat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z"/>
          </svg>
        </button>
      </div>
      <div class="sg-voice-control-hint">Microphone <span aria-hidden="true">·</span> Return to chat</div>
    `;

    const messages = container.querySelector('#sgCardMessages');
    if (messages) messages.before(voiceStage);
    else container.append(voiceStage);
    updateVoiceMic();
    if (isListening) showVoiceStatus('Listening…');

    // Event listeners
    voiceStage.querySelector('#sgVoiceMicBtn')?.addEventListener('click', toggleVoiceMic);
    voiceStage
      .querySelector('#sgVoiceSwitchChatBtn')
      ?.addEventListener('click', () => switchMode('chat'));
    voiceStage.querySelector('#sgVoiceMascotFigure')?.addEventListener('click', cycleVoiceMascot);

    setVoiceMascotAction(currentMascotAction);
  }

  function cycleVoiceMascot() {
    const index = AGENTS.findIndex((agent) => agent.id === selectedAgentId);
    selectSpecialistAgent(AGENTS[(index + 1) % AGENTS.length].id, { focusComposer: false });
  }

  function setVoiceMascotAction(action) {
    currentMascotAction = action;
    document.getElementById('sgVoiceMascotFigure')?.setAttribute('data-mascot-state', action);

  }

  // ── 8. Voice Recognition ──
  let voiceReply = null;
  let voiceRequest = null;

  function updateVoiceMic() {
    const mic = document.getElementById('sgVoiceMicBtn');
    if (!mic) return;
    const label = voiceEnabled ? 'Pause microphone' : 'Start microphone';
    mic.setAttribute('aria-label', label);
    mic.title = label;
    mic.setAttribute('aria-pressed', String(voiceEnabled));
    mic.classList.toggle('mic-active', isListening);
    mic.classList.toggle('mic-muted', !isListening);
  }

  function setVoiceState(state, label) {
    const stage = document.getElementById('sgVoiceStage');
    if (stage) stage.dataset.state = state;
    const heading = document.getElementById('sgVoiceState');
    if (heading) heading.textContent = label;
    setVoiceMascotAction(state === 'thinking' ? 'thinking' : 'idle');
  }

  function showVoiceStatus(text) {
    const transcript = document.getElementById('sgVoiceTranscript');
    if (transcript) transcript.textContent = text;
  }

  function startVoiceEngine() {
    if (voiceRecognition) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      voiceEnabled = false;
      updateVoiceMic();
      setVoiceState('error', 'Voice unavailable');
      showVoiceStatus('Speech recognition is unavailable in this browser.');
      return;
    }
    try {
      const recognition = new SpeechRec();
      voiceRecognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.onstart = () => {
        if (voiceRecognition !== recognition) return;
        isListening = true;
        updateVoiceMic();
        setVoiceState('listening', 'Listening');
        showVoiceStatus('Speak naturally.');
      };
      recognition.onresult = (event) => {
        if (voiceRecognition !== recognition || currentMode !== 'voice' || voiceRequest || voiceReply) return;
        let interim = '';
        const final = [];
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) final.push(result[0].transcript.trim());
          else interim += result[0].transcript;
        }
        const text = final.filter(Boolean).join(' ');
        if (text) void handleVoiceSubmission(text);
        else if (interim) showVoiceStatus(interim);
      };
      recognition.onerror = (event) => {
        if (voiceRecognition !== recognition) return;
        if (event.error === 'no-speech') {
          showVoiceStatus('No speech detected. Listening again…');
          return;
        }
        const message = event.error === 'not-allowed'
          ? 'Allow microphone access to use Voice.'
          : 'Speech recognition stopped. Select the microphone to retry.';
        voiceEnabled = false;
        stopVoiceEngine();
        setVoiceState('error', 'Microphone unavailable');
        showVoiceStatus(message);
      };
      recognition.onend = () => {
        if (voiceRecognition !== recognition) return;
        voiceRecognition = null;
        isListening = false;
        updateVoiceMic();
        if (voiceEnabled && currentMode === 'voice' && !voiceRequest && !voiceReply) startVoiceEngine();
      };
      setVoiceState('starting', 'Connecting microphone');
      showVoiceStatus('Allow microphone access if prompted.');
      updateVoiceMic();
      recognition.start();
    } catch {
      voiceEnabled = false;
      stopVoiceEngine();
      setVoiceState('error', 'Microphone unavailable');
      showVoiceStatus('Could not start the microphone. Try again.');
    }
  }

  function stopVoiceEngine() {
    const recognition = voiceRecognition;
    voiceRecognition = null;
    isListening = false;
    try {
      recognition?.abort();
    } catch {
      // Recognition may already have stopped.
    }
    updateVoiceMic();
  }

  function toggleVoiceMic() {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled) {
      stopVoiceEngine();
      if (!voiceRequest && !voiceReply) {
        setVoiceState('paused', 'Microphone paused');
        showVoiceStatus('Select the microphone when you are ready.');
      }
    } else if (!voiceRequest && !voiceReply) startVoiceEngine();
    updateVoiceMic();
  }

  async function handleVoiceSubmission(text) {
    const request = { controller: new AbortController() };
    const activeConvId = window.__activeWorkspaceConvId || `conv-voice-${Date.now()}`;
    window.__activeWorkspaceConvId = activeConvId;
    voiceRequest = request;
    stopVoiceEngine();
    setVoiceState('thinking', 'Thinking');
    showVoiceStatus(text);
    const requestedAgentId = AGENTS.find((agent) => agent.id === selectedAgentId)?.serverId;

    try {
      const res = await fetch('/api/sis/unified-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: request.controller.signal,
        body: JSON.stringify({ query: text, agentId: requestedAgentId || undefined, conversationId: activeConvId }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false || data.error)
        throw new Error(data.error || 'The voice request could not be completed.');
      const reply = data.response || data.text;
      if (!reply) throw new Error('No voice response was returned.');
      if (voiceRequest !== request || window.__activeWorkspaceConvId !== activeConvId) return;
      if (currentMode !== 'voice') {
        voiceRequest = null;
        await window.loadWorkspaceConversation?.(activeConvId);
        return;
      }
      showVoiceStatus(reply);
      setVoiceState('speaking', 'Speaking');
      const utterance = speakReply(reply, data.primaryAgent?.id || requestedAgentId || 'agent-supergence', 1.05, (error) => {
        if (voiceReply !== utterance) return;
        voiceReply = null;
        if (error) {
          voiceEnabled = false;
          updateVoiceMic();
          setVoiceState('error', 'Spoken audio unavailable');
          showVoiceStatus(`${reply} (Spoken audio unavailable. Select the microphone to continue.)`);
        } else if (voiceEnabled && currentMode === 'voice') startVoiceEngine();
        else setVoiceState('paused', 'Microphone paused');
      });
      voiceRequest = null;
      voiceReply = utterance || null;
      if (!utterance) {
        voiceEnabled = false;
        updateVoiceMic();
        setVoiceState('error', 'Spoken audio unavailable');
      }
    } catch (err) {
      if (voiceRequest !== request || window.__activeWorkspaceConvId !== activeConvId) return;
      if (currentMode !== 'voice') {
        voiceRequest = null;
        await window.loadWorkspaceConversation?.(activeConvId);
        return;
      }
      voiceEnabled = false;
      updateVoiceMic();
      setVoiceState('error', 'Could not respond');
      showVoiceStatus(`${err.message} Select the microphone to try again.`);
    } finally {
      if (voiceRequest === request) voiceRequest = null;
    }
  }

  function getTurnContainer(stream) {
    if (!stream || !document.body.classList.contains('hud-liquid-glass-pure')) return null;
    const messages = stream.querySelector('#sgCardMessages');
    if (messages) return messages;
    mountActiveConversation(stream);
    return stream.querySelector('#sgCardMessages');
  }

  async function executeLiquidGlassTurn(queryText) {
    const input =
      document.getElementById('sgCardInput') || document.getElementById('sgLandingInput');
    const draft = composerDrafts.get(input);
    if (draft?.uploading || (!queryText && !draft?.files.length)) return;
    if (composerVoice?.listening || composerVoice?.starting) composerVoice.stop();
    const agent = AGENTS.find((entry) => entry.id === selectedAgentId);
    if (draft?.files.length) {
      const conversationId = window.__activeWorkspaceConvId;
      if (!conversationId) {
        draft.status.textContent = 'Wait for the chat to load, then send again.';
        return;
      }
      draft.uploading = true;
      draft.submit.disabled = true;
      input.readOnly = true;
      draft.status.textContent = 'Attaching files…';
      try {
        const files = await Promise.all(
          draft.files.map(
            (file) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve({ name: file.name, data: reader.result.split(',')[1] });
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
              }),
          ),
        );
        const response = await fetch(
          `/api/conversations/${encodeURIComponent(conversationId)}/workspace/attachments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files }),
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The upload failed.');
        if (!input.isConnected || conversationId !== window.__activeWorkspaceConvId) return;
        queryText = [
          queryText,
          'Attached workspace files:\n' + result.paths.map((path) => `- \`${path}\``).join('\n'),
        ]
          .filter(Boolean)
          .join('\n\n');
      } catch (error) {
        draft.status.textContent = `Could not attach files. ${error.message} Try again.`;
        return;
      } finally {
        draft.uploading = false;
        draft.submit.disabled = false;
        input.readOnly = false;
      }
    }
    if (draft) {
      if (draft.notes) queryText += `\n\nContext:\n${draft.notes}`;
      draft.notes = '';
      draft.files = [];
      draft.render();
    }
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
    void window.executeTurnInWorkspace(queryText, null, agent?.serverId || '');
  }

  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.sg-turn-action-btn[data-action="copy"]');
    if (!copyBtn) return;
    const card = copyBtn.closest('.chat-turn-item')?.querySelector('.response-synthesis-card');
    const text = card?.querySelector('.response-body-markdown')?.innerText?.trim() || '';
    if (text) {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          const span = copyBtn.querySelector('span');
          if (span) {
            const orig = span.textContent;
            span.textContent = 'Copied!';
            setTimeout(() => {
              span.textContent = orig;
            }, 1600);
          }
        })
        .catch(() => {});
    }
  });

  // ── 11. Initialization & Strict Non-Hardcoding Policy ──
  function init() {
    document.body.classList.remove('hud-futuristic-active');
    document.body.classList.add('hud-liquid-glass-pure');
    try {
      localStorage.setItem('sis_hud_style', 'liquid-glass');
    } catch (_) {}
    mountTopDynamicIsland();
    mountRightAgentDock();
    void loadRoster();
    window.setInterval(() => {
      if (!document.hidden && document.getElementById('sgChatAgentPicker')) void loadRoster();
    }, 15000);
    window.addEventListener('workspace-turn-state', ({ detail }) => {
      if (!detail?.agentId) return;
      agentTools.delete(detail.agentId);
      if (detail.working) agentActivity.set(detail.agentId, 'Working');
      else if (detail.outcome === 'error') agentActivity.set(detail.agentId, 'Error');
      else agentActivity.delete(detail.agentId);
      syncAgentPresence();
    });
    window.addEventListener('workspace-tool-activity', ({ detail }) => {
      if (agentActivity.get(detail?.agentId) !== 'Working') return;
      const tool = detail.displayName || detail.tool;
      if (!tool) return;
      agentTools.set(detail.agentId, detail.phase === 'call' ? `Running ${tool}` : `Reviewing ${tool} results`);
      syncAgentPresence();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideAgentTooltip();
    });
    toggleConversationsDrawer(false);

    const stream = document.getElementById('chatTurnsStream') || window.getOrCreateChatTurnsStream?.();
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

    // Mount dual workspace: Conversation Card on left & Space to do more on right
    if (
      !stream.querySelector('#sgDualWorkspaceWrapper, #sgActiveConversationCard, #sgVoiceStage')
    ) {
      mountActiveConversation(stream);
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
    speakReply,
    selectSpecialistAgent,
    refreshAgentPins() {
      renderChatAgentPicker();
      void loadRoster();
    },
    resetPanelSizes() {
      try {
        for (const key of Object.values(panelSplitKeys)) localStorage.removeItem(key);
      } catch {}
      document.querySelector('.sg-panel-divider')?.dispatchEvent(new Event('workspace-reset-split'));
    },
    openAddAgentModal,
    closeAddAgentModal,
    addSpecialistAgent,
  };
})();
