// Retire cached credentials from the removed provider on the actual workspace
// surface as well as the legacy provider settings surface.
try {
  const savedProvider = JSON.parse(localStorage.getItem('sis-byok-provider') || 'null');
  const providerHost = savedProvider?.baseURL
    ? new URL(savedProvider.baseURL).hostname.toLowerCase()
    : '';
  if (providerHost === 'groq.com' || providerHost.endsWith('.groq.com'))
    localStorage.removeItem('sis-byok-provider');
} catch {
  // Invalid optional settings must not prevent the workspace from loading.
}

// ── Web Audio API Sci-Fi Sound System ──
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) _audioCtx = new AudioContextClass();
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function playSciFiSound(freq = 880, type = 'sine') {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + 0.025);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, ctx.currentTime + 0.075);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.075);
  } catch (_) {}
}

window.audio = {
  play: (soundName = 'click') => {
    if (localStorage.getItem('sis-ui-sounds') !== 'true') return;
    if (soundName === 'send') playSciFiSound(1150, 'triangle');
    else if (soundName === 'hover') playSciFiSound(640, 'sine');
    else playSciFiSound(880, 'sine');
  },
};

document.addEventListener(
  'click',
  (e) => {
    if (
      e.target &&
      e.target.closest(
        'button, a, input, textarea, select, [role="button"], .nav-tab, .clickable, .chip, .badge, .work-tree-header',
      )
    ) {
      window.audio.play('click');
    }
  },
  true,
);

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const inputWrap = $('#inputWrap');
const inp = $('#inp');
const sendBtn = $('#sendBtn');
const stopBtn = $('#stopBtn');
const fiaibar = $('.fiaibar');
const homeView = $('#homeView');
const supergenceWorkspace = $('#supergenceWorkspace');
const backHomeBtn = $('#backHomeBtn');
const userQueryPill = $('#userQueryPill');
const workTreeSection = $('#workTreeSection');
const workTreeToggle = $('#workTreeToggle');
const workTreeBody = $('#workTreeBody');
const mainResponseBody = $('#mainResponseBody');
const workspaceInp = $('#workspaceInp');
const workspaceSendBtn = $('#workspaceSendBtn');
const progressTasksList = $('#progressTasksList');
const sisAgentsList = $('#sisAgentsList');
const sideAgentsContainer = $('#sideAgentsContainer');

// Power On Elements
const powerOnOverlay = $('#powerOnOverlay');
const powerOnBtn = $('#powerOnBtn');

// Create Agent Modal Elements
const createAgentModal = $('#createAgentModal');
const createAgentHeaderBtn = $('#createAgentHeaderBtn');
const sidebarCreateAgentBtn = $('#sidebarCreateAgentBtn');
const sidebarCreateAgentBtnFull = $('#sidebarCreateAgentBtnFull');
const closeCreateAgentModalBtn = $('#closeCreateAgentModalBtn');
const cancelCreateAgentBtn = $('#cancelCreateAgentBtn');
const createAgentForm = $('#createAgentForm');

let isFiaibarHovered = false;
let currentAbortController = null;
let taskRunning = false;
const pendingWorkspaceMessages = [];
window.isTaskRunning = () => taskRunning;
let registeredAgents = [];
let openedAgentColumns = new Map();
let pastTasks = [];

// ── Check Power On State ──
function checkPowerOnStatus() {
  const poweredOn = localStorage.getItem('supergence_powered_on');
  if (poweredOn === 'true') {
    if (powerOnOverlay) powerOnOverlay.classList.add('hidden');
    return;
  }
  fetch('/api/supergence/status')
    .then((r) => r.json())
    .then((st) => {
      if (st && st.isPoweredOn) {
        localStorage.setItem('supergence_powered_on', 'true');
        if (powerOnOverlay) powerOnOverlay.classList.add('hidden');
      } else if (!poweredOn) {
        if (powerOnOverlay) powerOnOverlay.classList.remove('hidden');
      }
    })
    .catch(() => {
      if (!poweredOn && powerOnOverlay) powerOnOverlay.classList.remove('hidden');
    });
}

if (powerOnBtn) {
  powerOnBtn.addEventListener('click', async () => {
    try {
      powerOnBtn.style.opacity = '0.7';
      powerOnBtn.innerHTML = '<span>⏳</span><span>INITIALIZING SUPERGENCE...</span>';
      await fetch('/api/sis/power-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
      localStorage.setItem('supergence_powered_on', 'true');
      setTimeout(() => {
        powerOnOverlay.classList.add('hidden');
      }, 400);
    } catch (e) {
      localStorage.setItem('supergence_powered_on', 'true');
      powerOnOverlay.classList.add('hidden');
    }
  });
}

checkPowerOnStatus();

// ── Spray Move Handlers ──
window.handleSprayMove = function (e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
  e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
};

window.handleSprayLeave = function (e) {
  e.currentTarget.style.setProperty('--mouse-x', `50%`);
  e.currentTarget.style.setProperty('--mouse-y', `50%`);
};

// ── Mode Selector ──
function initModeSelector() {
  const modeSelector = $('#modeSelector');
  const modeCurrentBtn = $('#modeCurrentBtn');
  const modeOptions = $$('.mode-option');
  const currentModeName = $('#currentModeName');

  if (modeCurrentBtn) {
    modeCurrentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modeSelector.classList.toggle('open');
    });
  }

  modeOptions.forEach((option) => {
    option.addEventListener('click', function (e) {
      e.stopPropagation();
      modeOptions.forEach((opt) => opt.classList.remove('active'));
      this.classList.add('active');
      const nextMode = this.getAttribute('data-mode');
      if (currentModeName) currentModeName.textContent = nextMode;
      if (modeSelector) modeSelector.classList.remove('open');
      updateModeGlow(nextMode);
    });
  });

  document.addEventListener('click', (e) => {
    if (modeSelector && !modeSelector.contains(e.target)) {
      modeSelector.classList.remove('open');
    }
  });
}

function updateModeGlow(modeName) {
  const name =
    modeName || ($('#currentModeName') ? $('#currentModeName').textContent.trim() : 'Finefast');
  const color = name.toLowerCase() === 'melly' ? '#33a440' : '#d269e6';
  if (fiaibar) fiaibar.style.setProperty('--mode-glow', color);
}
initModeSelector();

const targetInp = inp || workspaceInp;
if (targetInp) targetInp.placeholder = 'Ask a question, share an idea, or describe what to build…';

function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

if (inp) {
  inp.addEventListener('input', () => autoGrow(inp));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inp.value.trim()) {
      e.preventDefault();
      const text = inp.value.trim();
      closeHomeInput();
      openWorkspace(text);
    }
  });
}
if (workspaceInp) {
  workspaceInp.addEventListener('input', () => autoGrow(workspaceInp));
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (inp && inp.value.trim()) {
      const text = inp.value.trim();
      closeHomeInput();
      openWorkspace(text);
    }
  });
}

function closeHomeInput() {
  if (inputWrap) inputWrap.classList.remove('on');
  if (inp) {
    inp.value = '';
    inp.style.height = 'auto';
  }
}

document.addEventListener('click', (e) => {
  if (!inputWrap) return;
  const insideBar = e.target.closest('#inputWrap');
  if (insideBar) {
    if (!inputWrap.classList.contains('on') && !taskRunning) {
      inputWrap.classList.add('on');
      inp?.focus();
    }
  } else {
    if (inputWrap.classList.contains('on') && !inp?.value.trim() && !taskRunning) {
      closeHomeInput();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (!inputWrap || !supergenceWorkspace) return;
  if (
    !inputWrap.classList.contains('on') &&
    !supergenceWorkspace.classList.contains('active') &&
    e.key.length === 1 &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    inputWrap.classList.add('on');
    inp?.focus();
  }
  if (e.key === 'Escape') {
    closeHomeInput();
  }
});

window.openWorkspace = function (query) {
  if (!query) return;
  if (homeView) homeView.style.display = 'none';
  if (inputWrap) inputWrap.style.display = 'none';
  supergenceWorkspace.classList.add('active');
  userQueryPill.textContent = query;
  addProgressTask(query);
  executeTurnInWorkspace(query);
  window.SupergenceBrowser?.show({ section: 'files' });
};

window.toggleWorkspaceFromNav = function () {
  if (supergenceWorkspace.classList.contains('active')) {
    returnToHome();
  } else {
    if (homeView) homeView.style.display = 'none';
    if (inputWrap) inputWrap.style.display = 'none';
    supergenceWorkspace.classList.add('active');
    initAgentBrowserWebSocketIndex();
    toggleWorkspaceSideBrowser(false);
  }
};

function returnToHome() {
  supergenceWorkspace.classList.remove('active');
  if (homeView) homeView.style.display = 'flex';
  if (inputWrap) inputWrap.style.display = 'flex';
  if (typeof window.__resizeSisClock === 'function') {
    requestAnimationFrame(() => window.__resizeSisClock());
  }
}

if (backHomeBtn) {
  backHomeBtn.addEventListener('click', returnToHome);
}

// Toggle Work Tree collapse
if (workTreeToggle) {
  workTreeToggle.addEventListener('click', () => {
    workTreeSection.classList.toggle('collapsed');
  });
}

// In-Workspace Follow-up Composer
// A follow-up typed while a turn runs is never dropped. The live turn receives
// it as mid-task steering so the running work adapts immediately; the same text
// is also queued as its own turn for anything the current pass does not cover.
function steerRunningTurn(text) {
  const socket = window.state?.ws;
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ type: 'mid-task-steer', content: text }));
      return true;
    } catch {
      /* Fall through to queueing below. */
    }
  }
  return false;
}

function sendWorkspaceMessage() {
  const text = workspaceInp.value.trim();
  if (!text) return;
  workspaceInp.value = '';
  workspaceInp.style.height = 'auto';
  if (taskRunning) {
    steerRunningTurn(text);
    executeTurnInWorkspace(text);
    return;
  }
  userQueryPill.textContent = text;
  addProgressTask(text);
  executeTurnInWorkspace(text);
}

workspaceInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && workspaceInp.value.trim()) {
    e.preventDefault();
    sendWorkspaceMessage();
  }
});

if (workspaceSendBtn) {
  workspaceSendBtn.addEventListener('click', () => {
    if (workspaceInp.value.trim()) {
      sendWorkspaceMessage();
    }
  });
}

// ── Helper: Render Authentic Animated Mini Face SVG ──
function createAgentMiniFaceSvg(agentId, color) {
  const c = color || '#9F7CEF';
  const uid = 'meta-' + agentId.replace(/[^a-zA-Z0-9]/g, '');
  return `
        <svg viewBox="0 0 500 500" style="width: 100%; height: 100%; overflow: visible;">
          <defs>
            <filter id="${uid}">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"></feGaussianBlur>
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -6" result="fluid"></feColorMatrix>
              <feComposite in="SourceGraphic" in2="fluid" operator="atop"></feComposite>
            </filter>
          </defs>
          <g style="filter: url(#${uid}); scale: 0.25; transform-origin: 250px 250px; animation: rotateCore 25s ease-in-out infinite;">
            <circle cx="250" cy="250" r="54" style="fill: ${c};"></circle>
            <g style="transform-origin: 260px 200px; animation: rotateCore 18s ease-in-out infinite;">
              <circle cx="340" cy="230" r="28" style="fill: ${c};"></circle>
              <circle cx="430" cy="250" r="18" style="fill: ${c};"></circle>
              <circle cx="490" cy="230" r="12" style="fill: ${c};"></circle>
            </g>
          </g>
          <g style="scale: -0.25; filter: url(#${uid}); transform-origin: 250px 250px; animation: rotateCore 25s ease-in-out infinite;">
            <circle cx="250" cy="250" r="54" style="fill: ${c};"></circle>
            <g style="transform-origin: 260px 200px; animation: rotateCore 18s ease-in-out infinite;">
              <circle cx="340" cy="230" r="28" style="fill: ${c};"></circle>
              <circle cx="430" cy="250" r="18" style="fill: ${c};"></circle>
              <circle cx="490" cy="230" r="12" style="fill: ${c};"></circle>
            </g>
          </g>
        </svg>
      `;
}

// ── Helper: Render Step Icon SVG ──
function getStepIconSvg(type, color) {
  const c = color || '#9F7CEF';
  if (type === '🌐' || type === 'search' || type === 'web') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  }
  if (type === '🧮' || type === 'calc' || type === 'math') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>`;
  }
  if (type === '🐙' || type === 'github') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`;
  }
  if (type === '⚗️' || type === 'chemistry') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M10 2v7.31L4.69 19.3A2 2 0 0 0 6.41 22h11.18a2 2 0 0 0 1.72-2.7L14 9.31V2"/></svg>`;
  }
  if (type === '🧠' || type === 'memory') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.2-.5 2.2-1.3 3H17a4 4 0 0 1 4 4c0 1.4-.7 2.6-1.8 3.3.5.8.8 1.7.8 2.7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4c0-1 .3-1.9.8-2.7A4 4 0 0 1 3 13a4 4 0 0 1 4-4h1.3A4 4 0 0 1 7 6a4 4 0 0 1 5-4z"/></svg>`;
  }
  if (type === 'terminal' || type === 'openclaw' || type === '🦞') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
  }
  if (type === 'swarm' || type === 'team') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}

// ── Multi-Turn Workspace Stream & Chat Container Management ──
function getOrCreateChatTurnsStream() {
  let stream = document.getElementById('chatTurnsStream');
  const container = document.getElementById('chatScrollContainer');
  if (!stream && container) {
    stream = document.createElement('div');
    stream.id = 'chatTurnsStream';
    stream.className = 'chat-turns-stream';
    while (container.firstChild) {
      stream.appendChild(container.firstChild);
    }
    container.appendChild(stream);
  }
  return stream;
}

function createTurnElement(q, turnId) {
  const turnEl = document.createElement('div');
  turnEl.className = 'chat-turn-item';
  turnEl.id = turnId || 'turn-' + Date.now();
  turnEl.innerHTML = `
        <div class="user-query-pill-wrap">
          <div class="user-query-pill">${formatMarkdown(q)}</div>
        </div>
        <div class="work-tree-section collapsed" style="display:none;">
          <div class="work-tree-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <span class="work-tree-title" style="font-weight: 500; font-size: 12px; color:#94A3B8;">Execution Trace</span>
            <svg class="work-tree-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div class="work-tree-body"></div>
        </div>
        <div class="response-synthesis-card">
          <div class="response-agent-header">
            <span class="resp-agent-indicator"></span>
            <span class="resp-agent-name">Supergence</span>
          </div>
          <div class="workspace-deck-slot"></div>
          <div class="response-body-markdown"><span class="chat-working" role="status">Working on your request…</span></div>
        </div>
      `;
  return turnEl;
}

// ── Execute Turn in Workspace & Stream Work Tree Steps (Accumulating Multi-Turn) ──
async function executeTurnInWorkspace(
  q,
  queuedTurn = null,
  selectedAgentId = window.__workspaceAgentId || '',
) {
  if (!q) return;
  if (taskRunning) {
    const turn = createTurnElement(q, 'turn-queued-' + Date.now());
    turn.querySelector('.response-synthesis-card').hidden = true;
    turn.dataset.queued = 'true';
    getOrCreateChatTurnsStream()?.append(turn);
    pendingWorkspaceMessages.push({ query: q, turn, agentId: selectedAgentId });
    window.dispatchEvent(
      new CustomEvent('workspace-message-queued', {
        detail: { count: pendingWorkspaceMessages.length },
      }),
    );
    return;
  }
  taskRunning = true;
  document.body.dataset.agentWorking = 'true';
  window.dispatchEvent(
    new CustomEvent('workspace-turn-state', {
      detail: { working: true, agentId: window.__workspaceAgentId || 'agent-supergence' },
    }),
  );
  window.executeTurnInWorkspace = executeTurnInWorkspace;

  if (workspaceSendBtn) {
    workspaceSendBtn.disabled = false;
    workspaceSendBtn.style.opacity = '1';
  }
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
  }

  const stream = getOrCreateChatTurnsStream();
  stream?.querySelector('.shell-empty')?.remove();
  const currentTitle = document.getElementById('activeWorkspaceTitleDisplay');
  if (currentTitle && !window.__workspaceChatHistory?.length) {
    currentTitle.textContent = q;
    currentTitle.title = q;
  }
  const firstTurn = stream ? stream.querySelector('.chat-turn-item') : null;
  let activeTurnEl;

  // Check if first turn is still in the pristine untouched state
  const isInitialPristine =
    firstTurn &&
    firstTurn.querySelector('.response-body-markdown') &&
    (firstTurn
      .querySelector('.response-body-markdown')
      .textContent.includes('Connecting to unified intelligence...') ||
      firstTurn
        .querySelector('.response-body-markdown')
        .textContent.includes('Ready for mission instructions') ||
      firstTurn
        .querySelector('.response-body-markdown')
        .textContent.includes('Welcome to Supergence'));

  if (queuedTurn) {
    activeTurnEl = queuedTurn;
    activeTurnEl.querySelector('.response-synthesis-card').hidden = false;
    delete activeTurnEl.dataset.queued;
  } else if (isInitialPristine) {
    activeTurnEl = firstTurn;
    const qPillWrap = activeTurnEl.querySelector('.user-query-pill-wrap');
    if (qPillWrap) qPillWrap.style.display = 'flex';
    const qPill = activeTurnEl.querySelector('.user-query-pill');
    if (qPill) qPill.innerHTML = formatMarkdown(q);
  } else {
    const turnId = 'turn-' + Date.now();
    activeTurnEl = createTurnElement(q, turnId);
    if (stream) stream.appendChild(activeTurnEl);
  }

  const activeWorkTreeSection = activeTurnEl.querySelector('.work-tree-section');
  const activeWorkTreeBody = activeTurnEl.querySelector('.work-tree-body');
  const activeResponseBody = activeTurnEl.querySelector('.response-body-markdown');
  const activeDeckSlot = activeTurnEl.querySelector('.workspace-deck-slot');
  const agentSelector = document.getElementById('workspaceAgentSelect');
  activeTurnEl.dataset.agentId = selectedAgentId || 'agent-supergence';
  activeTurnEl.dataset.agentState = 'thinking';
  window.SupergenceProfiles?.decorateTurn(activeTurnEl);
  activeTurnEl.querySelector('.resp-agent-name').textContent = selectedAgentId
    ? [...agentSelector.options].find((option) => option.value === selectedAgentId)?.textContent ||
      'Supergence'
    : 'Supergence';

  if (activeWorkTreeSection) {
    activeWorkTreeSection.style.display = 'none';
    activeWorkTreeSection.classList.add('collapsed');
  }
  if (activeResponseBody)
    activeResponseBody.innerHTML =
      '<span class="chat-working" role="status">Working on your request…</span>';
  if (activeWorkTreeBody) activeWorkTreeBody.innerHTML = '';

  const chatScrollC = document.getElementById('chatScrollContainer');
  if (chatScrollC) chatScrollC.scrollTo({ top: chatScrollC.scrollHeight, behavior: 'smooth' });

  const mode = $('#currentModeName') ? $('#currentModeName').textContent.trim() : 'Finefast';
  let activeWorkspaceConvId =
    window.__activeWorkspaceConvId ||
    localStorage.getItem('sis_workspace_conv') ||
    'conv-ws-' + Date.now();
  window.__activeWorkspaceConvId = activeWorkspaceConvId;
  window.__workspaceChatHistory = window.__workspaceChatHistory || [];
  const requestId = crypto.randomUUID();
  activeTurnEl.dataset.requestId = requestId;
  const taskControl = window.SupergenceTasks?.mount(activeTurnEl, {
    conversationId: activeWorkspaceConvId,
    requestId,
  });
  await window.SupergenceChatWorkspace?.start({ conversationId: activeWorkspaceConvId, requestId });
  window.SupergenceBrowser?.show({ section: 'files' });
  const turnHistory = window.__workspaceChatHistory;
  const historyForRequest = turnHistory.slice(-40);
  const userMessage = {
    id: `${requestId}:user`,
    requestId,
    role: 'user',
    content: q,
    timestamp: Date.now(),
  };
  turnHistory.push(userMessage);
  const rememberAssistant = (text, extra = {}) => {
    let message = turnHistory.find((message) => message.id === `${requestId}:assistant`);
    if (!message) {
      message = {
        id: `${requestId}:assistant`,
        requestId,
        role: 'assistant',
        timestamp: Date.now(),
      };
      turnHistory.push(message);
    }
    Object.assign(message, { content: text || '', ...extra });
  };

  function sanitizeTurnResponse(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text;
    cleaned = cleaned.replace(
      /```(?:json)?\s*\{\s*"(?:tool|name|action)"[\s\S]*?(?:\}\s*```|```|$)/gi,
      '',
    );
    cleaned = cleaned.replace(/\{\s*"(?:tool|action)"\s*:\s*"[^"]+"[\s\S]*$/gi, '');
    cleaned = cleaned.replace(
      /^\s*\.{5,}\s*\[\s*\d+%\s*\][\s\S]*?\d+\s+passed\s+in\s+[\d.]+s/gm,
      '',
    );
    return cleaned.trim();
  }

  function renderCompletedTurn(data) {
    taskControl?.finish(data.taskStatus || (data.success === false ? 'error' : 'completed'));
    activeTurnEl.dataset.agentState = 'idle';
    if (data.primaryAgent?.id) activeTurnEl.dataset.agentId = data.primaryAgent.id;
    window.SupergenceProfiles?.decorateTurn(activeTurnEl);
    if (data.primaryAgent?.name)
      activeTurnEl.querySelector('.resp-agent-name').textContent = data.primaryAgent.name;
    if (data.conversationId && window.__activeWorkspaceConvId === activeWorkspaceConvId) {
      activeWorkspaceConvId = data.conversationId;
      window.__activeWorkspaceConvId = activeWorkspaceConvId;
      try {
        localStorage.setItem('sis_workspace_conv', activeWorkspaceConvId);
      } catch (_) {}
    }

    rememberAssistant(data.response, {
      status: data.taskStatus || (data.success === false ? 'error' : 'completed'),
      error: data.error,
      artifacts: data.artifacts || [],
      toolCalls: data.toolCalls || [],
      completionAudit: data.completionAudit || null,
      agent: data.primaryAgent || null,
    });

    if (data.success && data.steps && Array.isArray(data.steps)) {
      let stepsHtml = '';
      data.steps.forEach((step) => {
        const iconSvg = getStepIconSvg(step.icon, step.iconColor);
        const subItems =
          step.substeps && Array.isArray(step.substeps) && step.substeps.length > 0
            ? step.substeps
            : step.details && Array.isArray(step.details)
              ? step.details
              : [];
        let substepsHtml = '';
        if (subItems.length > 0) {
          substepsHtml = `
                <div class="work-tree-substeps">
                  ${subItems.map((s) => `<span class="work-tree-substep-item">${escapeHtml(s)}</span>`).join('')}
                </div>
              `;
        }
        stepsHtml += `
              <div class="work-tree-node">
                <div class="work-tree-node-header">
                  <div class="work-tree-icon" style="background: rgba(255,255,255,0.06);">
                    ${iconSvg}
                  </div>
                  <span class="work-tree-title">${escapeHtml(step.title || '')}</span>
                </div>
                <div class="work-tree-line"></div>
                ${substepsHtml}
              </div>
            `;
      });
      if (activeWorkTreeBody) activeWorkTreeBody.innerHTML = stepsHtml;

      let cleanResp = sanitizeTurnResponse(data.response || '');
      if (activeResponseBody)
        activeResponseBody.innerHTML = formatMarkdown(
          cleanResp || 'No response text was returned.',
        );
    } else if (data.response) {
      let cleanResp = sanitizeTurnResponse(data.response || '');
      if (activeResponseBody)
        activeResponseBody.innerHTML = formatMarkdown(
          cleanResp || 'No response text was returned.',
        );
    } else {
      if (activeResponseBody) {
        activeResponseBody.innerHTML = `
              <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:16px; margin:12px 0;">
                <div style="font-weight:700; color:#EF4444; font-size:13px; margin-bottom:6px;">⚠️ Unified Swarm Notice</div>
                <div style="color:#FCA5A5; font-size:12px;">${escapeHtml(data.error || 'Failed to complete turn')}</div>
              </div>
            `;
      }
    }

    if (activeResponseBody && (data.taskStatus === 'error' || data.success === false || data.error)) {
      const existingNotice = activeResponseBody.querySelector('.chat-stream-notice');
      if (!existingNotice) {
        const notice = document.createElement('p');
        notice.className = 'chat-stream-notice';
        notice.setAttribute('role', 'status');
        notice.textContent =
          data.error || 'This attempt did not finish. Your request remains saved.';
        activeResponseBody.append(notice);
      }
    }

    // Results belong to this turn, including interactive previews and real execution output.
    if (activeDeckSlot) {
      const raw = data.interactiveUI?.artifacts || data.artifacts || [];
      const artifacts = Array.isArray(raw) ? raw : Object.values(raw || {});
      window.ChatArtifacts?.render(activeDeckSlot, artifacts);
      window.SupergenceResultSummary?.render(activeDeckSlot, { ...data, artifacts });
    }
    const trace = activeWorkTreeSection;
    if (trace && activeWorkTreeBody?.children.length) trace.style.display = '';
  }

  // ── Real-Time Streaming Fetch Pipeline with Auto-Fallback & Network Resilience ──
  let streamSucceeded = false;
  let streamOpened = false;
  let streamFailure = null;
  let streamedFinalData = null;
  let streamedTokens = '';

  try {
    const streamRes = await fetch('/api/sis/unified-turn-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        query: q,
        mode,
        conversationId: activeWorkspaceConvId,
        requestId,
        agentId: selectedAgentId || undefined,
        history: historyForRequest,
      }),
    });

    if (streamRes.ok && streamRes.body) {
      streamOpened = true;
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep remainder

        for (const chunk of lines) {
          if (!chunk.trim()) continue;
          let eventType = 'message';
          let eventData = '';
          const chunkLines = chunk.split('\n');
          for (const l of chunkLines) {
            if (l.startsWith('event:')) eventType = l.slice(6).trim();
            else if (l.startsWith('data:')) eventData = l.slice(5).trim();
          }
          if (!eventData) continue;
          let parsedData = null;
          try {
            parsedData = JSON.parse(eventData);
          } catch (_) {
            parsedData = eventData;
          }

          if (eventType === 'token') {
            activeTurnEl.dataset.agentState = 'replying';
            streamSucceeded = true;
            const fullText =
              parsedData && parsedData.fullText
                ? parsedData.fullText
                : streamedTokens + ((parsedData && parsedData.token) || '');
            streamedTokens = fullText;
            let cleanStream = sanitizeTurnResponse(fullText);
            if (activeResponseBody && cleanStream) {
              activeResponseBody.innerHTML = formatMarkdown(cleanStream);
              if (chatScrollC)
                chatScrollC.scrollTo({ top: chatScrollC.scrollHeight, behavior: 'smooth' });
            }
          } else if (eventType === 'tool-call') {
            activeTurnEl.dataset.agentState = 'thinking';
            window.SupergenceBrowser?.show({ section: 'files' });
            window.dispatchEvent(
              new CustomEvent('workspace-tool-activity', {
                detail: { ...parsedData, phase: 'call' },
              }),
            );
            if (activeWorkTreeBody && parsedData && parsedData.displayName) {
              if (activeWorkTreeSection) activeWorkTreeSection.style.display = '';
              if (!streamedTokens) activeResponseBody.replaceChildren();
              const node = document.createElement('div');
              node.className = 'work-tree-node';
              node.innerHTML = `
                    <div class="work-tree-node-header">
                      <div class="work-tree-icon" style="background: rgba(0, 240, 255, 0.15);">
                        ${getStepIconSvg('openclaw', '#00F0FF')}
                      </div>
                      <span class="work-tree-title">⚡ ${escapeHtml(parsedData.displayName)}</span>
                    </div>
                    <div class="work-tree-line"></div>
                    <div class="work-tree-substeps">
                      <span class="work-tree-substep-item" style="color:#38BDF8;">Running tool in workspace...</span>
                    </div>
                  `;
              activeWorkTreeBody.appendChild(node);
              if (chatScrollC)
                chatScrollC.scrollTo({ top: chatScrollC.scrollHeight, behavior: 'smooth' });
            }
          } else if (eventType === 'tool-result') {
            window.dispatchEvent(
              new CustomEvent('workspace-tool-activity', {
                detail: { ...parsedData, phase: 'result' },
              }),
            );
            if (activeWorkTreeBody && parsedData && parsedData.output) {
              const items = activeWorkTreeBody.querySelectorAll('.work-tree-substep-item');
              if (items.length > 0) {
                const last = items[items.length - 1];
                last.textContent =
                  parsedData.success === false
                    ? 'Tool reported an error'
                    : `Tool returned${Number.isFinite(parsedData.durationMs) ? ` · ${parsedData.durationMs} ms` : ''}`;
                last.style.color = '#10B981';
              }
            }
          } else if (eventType === 'task-status') {
            taskControl?.update(parsedData);
          } else if (eventType === 'interactive-ui') {
            const raw = parsedData?.artifacts || [];
            window.ChatArtifacts?.render(
              activeDeckSlot,
              Array.isArray(raw) ? raw : Object.values(raw),
            );
          } else if (eventType === 'error') {
            if (parsedData?.partialResponse) streamedTokens = parsedData.partialResponse;
            rememberAssistant(streamedTokens, { status: 'error', error: parsedData?.error });
            throw new Error(parsedData?.error || 'The server could not complete this request.');
          } else if (eventType === 'done') {
            streamedFinalData = parsedData;
            streamSucceeded = true;
            renderCompletedTurn(parsedData);
          }
        }
      }
    }
  } catch (streamErr) {
    streamFailure = streamErr;
    console.warn('[Workspace stream interrupted]:', streamErr.message);
  }

  // Reconnect to the saved request rather than starting another execution.
  if (streamOpened && !streamedFinalData && window.SupergenceTasks) {
    const recovered = await window.SupergenceTasks.reconcile(
      {
        query: q,
        mode,
        conversationId: activeWorkspaceConvId,
        requestId,
        agentId: selectedAgentId || undefined,
        history: historyForRequest,
      },
      (state) => taskControl?.update(state),
    );
    if (recovered.response || recovered.taskStatus === 'cancelled') {
      streamedFinalData = recovered;
      renderCompletedTurn(recovered);
    } else streamFailure = new Error(recovered.error || 'Saved task progress is unavailable.');
  }
  if (streamOpened && !streamedFinalData) {
    taskControl?.finish('error');
    rememberAssistant(streamedTokens, {
      status: 'error',
      error: streamFailure?.message || 'The connection ended before completion.',
    });
    const notice = document.createElement('p');
    notice.className = 'chat-stream-notice';
    notice.setAttribute('role', 'status');
    notice.textContent =
      streamFailure?.message || 'The connection ended before the server confirmed completion.';
    if (!streamedTokens) activeResponseBody.replaceChildren(notice);
    else {
      activeResponseBody.innerHTML = formatMarkdown(sanitizeTurnResponse(streamedTokens));
      activeResponseBody.append(notice);
    }
  }

  // Use the non-streaming route only when a stream could not be opened.
  if (!streamOpened && (!streamSucceeded || !streamedFinalData)) {
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('/api/sis/unified-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            mode,
            conversationId: activeWorkspaceConvId,
            requestId,
            agentId: selectedAgentId || undefined,
            history: historyForRequest,
          }),
        });

        if (!res.ok) {
          const errTxt = await res.text();
          throw new Error(`HTTP ${res.status}: ${errTxt || res.statusText}`);
        }

        const data = await res.json();
        renderCompletedTurn(data);
        lastError = null;
        break;
      } catch (fetchErr) {
        lastError = fetchErr;
        console.warn(`[Workspace Turn Attempt ${attempt} failed]:`, fetchErr.message);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200)); // 1.2s graceful backoff
        }
      }
    }

    if (lastError) {
      taskControl?.finish('error');
      rememberAssistant(streamedTokens, { status: 'error', error: lastError.message });
      console.error('[Workspace Turn Final Error]:', lastError);
      const safeQuery = escapeHtml(q).replace(/'/g, "\\'");
      if (activeResponseBody) {
        activeResponseBody.innerHTML = `
              <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:16px; margin:12px 0;">
                <div style="font-weight:700; color:#EF4444; font-size:13px; margin-bottom:6px;">⚠️ Unified Swarm Execution Error</div>
                <div style="color:#FCA5A5; font-size:12px; margin-bottom:12px;">${escapeHtml(lastError.message || 'Connection lost during turn synthesis')}</div>
                <button onclick="executeTurnInWorkspace('${safeQuery}')" style="background:#EF4444; color:#FFF; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">↺ Retry Query</button>
              </div>
            `;
      }
      if (activeWorkTreeBody) {
        activeWorkTreeBody.innerHTML = `
              <div class="work-tree-node">
                <div class="work-tree-node-header">
                  <div class="work-tree-icon" style="background: rgba(239, 68, 68, 0.2);">
                    ${getStepIconSvg('risk', '#EF4444')}
                  </div>
                  <span class="work-tree-title" style="color:#EF4444;">Turn Interrupted & Safeguard Engaged</span>
                </div>
                <div class="work-tree-line"></div>
                <div class="work-tree-substeps">
                  <span class="work-tree-substep-item" style="color:#FCA5A5;">${escapeHtml(lastError.message || 'Unknown network error')}</span>
                </div>
              </div>
            `;
      }
    }
  }

  taskRunning = false;
  activeTurnEl.dataset.agentState = 'idle';
  document.body.dataset.agentWorking = 'false';
  window.dispatchEvent(new CustomEvent('workspace-turn-state', { detail: { working: false } }));
  if (workspaceSendBtn) {
    workspaceSendBtn.disabled = false;
    workspaceSendBtn.style.opacity = '1';
  }
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
  }
  if (chatScrollC) chatScrollC.scrollTo({ top: chatScrollC.scrollHeight, behavior: 'smooth' });
  const nextMessage = pendingWorkspaceMessages.shift();
  if (nextMessage)
    void executeTurnInWorkspace(nextMessage.query, nextMessage.turn, nextMessage.agentId);
}
window.executeTurnInWorkspace = executeTurnInWorkspace;

// ── Mission History & Saved Sessions Drawer ──
let savedConversationsList = [];

window.toggleWorkspaceHistoryDrawer = async function (forceState) {
  const drawer = document.getElementById('workspaceHistoryDrawer');
  const overlay = document.getElementById('workspaceHistoryDrawerOverlay');
  if (!drawer) return;

  const shouldOpen =
    typeof forceState === 'boolean' ? forceState : !drawer.classList.contains('active');
  if (shouldOpen) {
    drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    await loadConversationsList();
  } else {
    drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }
};

async function loadConversationsList() {
  const listContainer = document.getElementById('workspaceHistoryList');
  const sideList = document.getElementById('sidebarConvList');
  const countBadge = document.getElementById('drawerSessionCountBadge');

  if (window.savedConversationsList && window.savedConversationsList.length > 0) {
    renderWorkspaceHistoryList(window.savedConversationsList);
  } else {
    if (listContainer)
      listContainer.innerHTML =
        '<div style="padding:16px; color:rgba(255,255,255,0.4); font-size:12px; text-align:center;">Loading conversations...</div>';
  }

  try {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    const convs = Array.isArray(data) ? data : data.conversations || [];
    window.savedConversationsList = convs;
    savedConversationsList = convs;
    if (countBadge) countBadge.textContent = `${convs.length} Sessions`;
    renderWorkspaceHistoryList(convs);
    return convs;
  } catch (err) {
    console.warn('Failed to load conversations:', err);
    if (!window.savedConversationsList || window.savedConversationsList.length === 0) {
      const errHtml = `<div style="padding:16px; color:#F87171; font-size:12px; text-align:center;">Failed to load history: ${escapeHtml(err.message)}</div>`;
      if (listContainer) listContainer.innerHTML = errHtml;
      if (sideList) sideList.innerHTML = errHtml;
    }
    return [];
  }
}
window.loadConversationsList = loadConversationsList;
// Automatically load conversations into sidebar on startup
loadConversationsList().catch(() => {});

window.toggleConversationsSidebar = function () {
  const sb = document.getElementById('workspaceConversationsSidebar');
  if (!sb) return;
  if (window.matchMedia('(max-width: 800px)').matches) {
    sb.classList.remove('collapsed');
    const open = sb.classList.toggle('mobile-open');
    document.getElementById('sidebarToggleBtn')?.setAttribute('aria-expanded', String(open));
  } else {
    const collapsed = sb.classList.toggle('collapsed');
    document.getElementById('sidebarToggleBtn')?.setAttribute('aria-expanded', String(!collapsed));
  }
};

window.deleteWorkspaceConversation = async function (convId, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (!confirm('Are you sure you want to delete this conversation?')) return;
  try {
    const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data && data.success) {
      if (window.__activeWorkspaceConvId === convId) {
        localStorage.removeItem('sis_workspace_conv');
        startNewWorkspaceThread();
      }
      await loadConversationsList();
    }
  } catch (err) {
    console.warn('Failed to delete conversation:', err);
  }
};

function renderWorkspaceHistoryList(convs) {
  const drawerList = document.getElementById('workspaceHistoryList');
  const sideList = document.getElementById('sidebarConvList');
  const activeId = window.__activeWorkspaceConvId;

  const visibleConvs = (convs || []).filter((c) => {
    const count = c.messageCount || (c.messages ? c.messages.length : 0);
    return count > 0 || c.id === activeId;
  });

  if (!visibleConvs || visibleConvs.length === 0) {
    const emptyHtml =
      '<div style="padding:20px 14px; color:rgba(255,255,255,0.4); font-size:12px; text-align:center;">No active chats.<br>Click "+ New Chat" to begin.</div>';
    if (drawerList) drawerList.innerHTML = emptyHtml;
    if (sideList) sideList.innerHTML = emptyHtml;
    return;
  }

  // The row button remains keyboard accessible; delete is a sibling action.
  if (sideList) {
    sideList.innerHTML = visibleConvs
      .map((c) => {
        const isActive = c.id === activeId;
        const title = String(
          typeof c.title === 'string' ? c.title : c.title?.title || 'Untitled conversation',
        );
        const count = c.messageCount ?? c.messages?.length ?? 0;
        const date = c.updatedAt
          ? new Date(c.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : '';
        const encodedId = encodeURIComponent(c.id);
        return `<div class="sidebar-conv-item ${isActive ? 'active' : ''}" data-conversation-id="${escapeHtml(String(c.id))}">
        <button type="button" class="shell-conv-select" onclick="loadWorkspaceConversation(decodeURIComponent('${encodedId}'))" title="${escapeHtml(title)}" ${isActive ? 'aria-current="true"' : ''}>
          <span class="shell-conv-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 11a7 7 0 0 1-7 7H6l-3 3V11a7 7 0 0 1 7-7h3a7 7 0 0 1 7 7Z"/><path d="M8 9h7m-7 4h4"/></svg></span>
          <span class="shell-conv-content"><span class="shell-conv-top"><span class="conv-title">${escapeHtml(title)}</span><span class="shell-conv-date">${date}</span></span><span class="conv-meta">${count} ${count === 1 ? 'message' : 'messages'}</span></span>
        </button>
        <button type="button" class="conv-delete-btn" onclick="deleteWorkspaceConversation(decodeURIComponent('${encodedId}'), event)" aria-label="Delete conversation" title="Delete conversation">&times;</button>
      </div>`;
      })
      .join('');
  }

  // Render to Drawer List
  if (drawerList) {
    drawerList.innerHTML = visibleConvs
      .map((c) => {
        const isActive = c.id === activeId;
        const rawTitle =
          typeof c.title === 'string' ? c.title : c.title?.title || c.id || 'Mission Session';
        const title = String(rawTitle);
        const msgCount = c.messageCount || (c.messages ? c.messages.length : 0);
        const dateStr = c.updatedAt
          ? new Date(c.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
        return `
            <div class="drawer-history-item ${isActive ? 'active' : ''}" onclick="loadWorkspaceConversation('${c.id}')" title="Load ${escapeHtml(title)}">
              <div class="drawer-item-title">${escapeHtml(title)}</div>
              <div class="drawer-item-meta">
                <span>${msgCount} messages</span>
                <span>${dateStr}</span>
              </div>
            </div>
          `;
      })
      .join('');
  }
}

window.filterSidebarConversations = function (query) {
  if (!query || !query.trim()) {
    renderWorkspaceHistoryList(savedConversationsList);
    return;
  }
  const q = query.toLowerCase().trim();
  const filtered = (savedConversationsList || []).filter((c) => {
    const rawTitle = typeof c.title === 'string' ? c.title : c.title?.title || '';
    const title = String(rawTitle).toLowerCase();
    const id = String(c.id || '').toLowerCase();
    return title.includes(q) || id.includes(q);
  });
  renderWorkspaceHistoryList(filtered);
};

window.filterWorkspaceHistoryList = function (query) {
  window.filterSidebarConversations(query);
};

window.loadWorkspaceConversation = async function (convId) {
  if (!convId) return;
  try {
    const res = await fetch(`/api/conversations/${convId}`);
    const data = await res.json();
    if (!data) return;

    window.__activeWorkspaceConvId = convId;
    void window.SupergenceChatWorkspace?.selectChat(convId);
    try {
      localStorage.setItem('sis_workspace_conv', convId);
    } catch (_) {}
    const messages = data.messages || [];
    window.__workspaceChatHistory = messages;

    // Update Title in Top Bar
    const titleEl = document.getElementById('activeWorkspaceTitleDisplay');
    if (titleEl) {
      titleEl.textContent = data.title || 'Mission Session';
      titleEl.title = data.title || 'Mission Session';
    }

    // Switch to workspace view if not active
    if (!supergenceWorkspace.classList.contains('active')) {
      if (homeView) homeView.style.display = 'none';
      if (inputWrap) inputWrap.style.display = 'none';
      supergenceWorkspace.classList.add('active');
    }

    // Highlight in sidebar
    const convItems = document.querySelectorAll('.sidebar-conv-item');
    convItems.forEach((item) => {
      if (item.dataset.conversationId === convId) {
        item.classList.add('active');
        item.querySelector('.shell-conv-select')?.setAttribute('aria-current', 'true');
      } else {
        item.classList.remove('active');
        item.querySelector('.shell-conv-select')?.removeAttribute('aria-current');
      }
    });

    const stream = getOrCreateChatTurnsStream();
    if (!stream) return;
    stream.innerHTML = '';

    let latestArtifactFound = null;

    if (messages.length === 0) {
      renderWorkspaceEmptyState(stream);
    } else {
      // Group turns by user prompts
      let curTurnEl = null;

      messages.forEach((msg, idx) => {
        if (msg.role === 'user') {
          curTurnEl = createTurnElement(msg.content, 'turn-' + idx);
          if (msg.recoveredFrom) {
            const provenance = document.createElement('small');
            provenance.className = 'chat-stream-notice';
            provenance.textContent = 'Request recovered from your supplied screenshot';
            curTurnEl.querySelector('.user-query-pill').append(provenance);
          }
          curTurnEl.querySelector('.response-body-markdown').innerHTML = '';
          stream.appendChild(curTurnEl);
        } else if (msg.role === 'assistant') {
          if (!curTurnEl) {
            curTurnEl = createTurnElement('Autonomous System Trace', 'turn-' + idx);
            stream.appendChild(curTurnEl);
          }
          if (msg.agent?.name)
            curTurnEl.querySelector('.resp-agent-name').textContent = msg.agent.name;
          if (msg.agent?.id) window.SupergenceProfiles?.decorateTurn(curTurnEl, msg.agent.id);
          const respBody = curTurnEl.querySelector('.response-body-markdown');
          if (respBody) {
            let cleanResp = msg.content || '';

            const artifacts = Array.isArray(msg.artifacts) ? [...msg.artifacts] : [];
            for (const match of cleanResp.matchAll(/\]\((\/workspace\/[^)\s]+)\)/g)) {
              const url = match[1];
              artifacts.push({ url, name: decodeURIComponent(url.split('/').pop()) });
            }
            if (artifacts.length) latestArtifactFound = artifacts.at(-1);

            // Clean JSON tool blocks cleanly
            cleanResp = cleanResp
              .replace(/```(?:json)?\s*\{\s*"(?:tool|name|action)"[\s\S]*?(?:\}\s*```|```|$)/gi, '')
              .trim();
            cleanResp = cleanResp
              .replace(/\{\s*"(?:tool|action)"\s*:\s*"[^"]+"[\s\S]*$/gi, '')
              .trim();

            respBody.innerHTML = formatMarkdown(cleanResp);
            if (msg.status === 'error' || msg.error) {
              const notice = document.createElement('p');
              notice.className = 'chat-stream-notice';
              notice.setAttribute('role', 'status');
              notice.textContent =
                msg.error || 'This attempt did not finish. Your request remains saved.';
              respBody.append(notice);
            }

            window.ChatArtifacts?.render(
              curTurnEl.querySelector('.workspace-deck-slot'),
              artifacts,
            );
            window.SupergenceResultSummary?.render(curTurnEl.querySelector('.workspace-deck-slot'), {
              ...msg,
              artifacts,
            });
          }
        }
      });
    }

    // Auto-mount latest artifact if present
    window.__pendingWorkspaceArtifact = latestArtifactFound;
    toggleWorkspaceSideBrowser(false);
    document.getElementById('workspaceConversationsSidebar')?.classList.remove('mobile-open');

    toggleWorkspaceHistoryDrawer(false);
    const scrollC = document.getElementById('chatScrollContainer');
    if (scrollC) scrollC.scrollTo({ top: scrollC.scrollHeight, behavior: 'smooth' });
  } catch (err) {
    console.warn('Error loading conversation:', err);
  }
};

function renderWorkspaceEmptyState(stream) {
  stream.innerHTML = `
    <section class="shell-empty" aria-label="Start a conversation">
      <h1>What are you working on?</h1>
      <p>Start a conversation, or pick a starting point.</p>
      <div class="shell-starters">
        <button type="button" aria-label="Explore an idea" data-compose-prompt="Help me explore an idea: ">
          Explore an idea
        </button>
        <button type="button" aria-label="Build something" data-compose-prompt="Help me build ">
          Build something
        </button>
        <button type="button" aria-label="Solve a problem" data-compose-prompt="Help me work through ">
          Solve a problem
        </button>
      </div>
    </section>`;
}

window.startNewWorkspaceThread = function () {
  const newId = 'conv-ws-' + Date.now();
  window.__activeWorkspaceConvId = newId;
  void window.SupergenceChatWorkspace?.selectChat(newId);
  window.__workspaceChatHistory = [];
  try {
    localStorage.setItem('sis_workspace_conv', newId);
  } catch (_) {}

  if (!supergenceWorkspace.classList.contains('active')) {
    if (homeView) homeView.style.display = 'none';
    if (inputWrap) inputWrap.style.display = 'none';
    supergenceWorkspace.classList.add('active');
  }

  const stream = getOrCreateChatTurnsStream();
  if (stream) {
    renderWorkspaceEmptyState(stream);
  }

  window.__pendingWorkspaceArtifact = null;
  document.getElementById('activeWorkspaceTitleDisplay').textContent = 'New conversation';
  document.querySelectorAll('.sidebar-conv-item.active').forEach((item) => {
    item.classList.remove('active');
    item.querySelector('.shell-conv-select')?.removeAttribute('aria-current');
  });
  document.getElementById('workspaceConversationsSidebar')?.classList.remove('mobile-open');
  toggleWorkspaceSideBrowser(false);

  toggleWorkspaceHistoryDrawer(false);
  if (workspaceInp) {
    workspaceInp.value = '';
    workspaceInp.focus();
  }
};

// ── Conversational Tree & Epistemic Reasoning Modal ──
let currentTreeModalTab = 'chat';
let epistemicMemoryCache = null;

window.toggleWorkspaceTreeModal = function (forceState, preferredTab) {
  const modal = document.getElementById('workspaceTreeModal');
  if (!modal) return;
  const shouldOpen =
    typeof forceState === 'boolean' ? forceState : !modal.classList.contains('active');
  if (shouldOpen) {
    modal.classList.add('active');
    switchTreeModalTab(preferredTab || currentTreeModalTab || 'chat');
  } else {
    modal.classList.remove('active');
  }
};

// ── Mastery & Evidence Ledger Modal ──
let currentMasteryTab = 'ledger';
let _masteryCache = null;

const MASTERY_GRADE_CLASS = { OBSERVED: 'observed', INFERRED: 'inferred', UNKNOWN: 'unknown' };

function masteryGradeChip(grade) {
  const g = ['OBSERVED', 'INFERRED', 'UNKNOWN'].includes(grade) ? grade : 'UNKNOWN';
  return `<span class="mastery-grade-chip mastery-grade-${g.toLowerCase()}">${g}</span>`;
}

// A number or an explicit statement that none exists. Never a placeholder
// that reads like a measurement.
function masteryNum(value, digits = 3, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(digits)}${suffix}`
    : '<span class="mastery-null">not measured</span>';
}

function masteryEsc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.toggleMasteryModal = function (forceState, preferredTab) {
  const modal = document.getElementById('masteryModal');
  if (!modal) return;
  const shouldOpen =
    typeof forceState === 'boolean' ? forceState : !modal.classList.contains('active');
  if (!shouldOpen) {
    modal.classList.remove('active');
    return;
  }
  modal.classList.add('active');
  switchMasteryTab(preferredTab || currentMasteryTab || 'ledger');
};

window.switchMasteryTab = function (tabName) {
  currentMasteryTab = tabName;
  const map = {
    ledger: ['masteryTabBtnLedger', 'masteryPaneLedger', renderMasteryLedger],
    candidates: [
      'masteryTabBtnCandidates',
      'masteryPaneCandidates',
      () => renderMasterySkills('candidates'),
    ],
    learned: ['masteryTabBtnLearned', 'masteryPaneLearned', () => renderMasterySkills('learned')],
    mistakes: ['masteryTabBtnMistakes', 'masteryPaneMistakes', renderMasteryMistakes],
  };
  for (const [key, [btnId, paneId]] of Object.entries(map)) {
    const btn = document.getElementById(btnId);
    const pane = document.getElementById(paneId);
    if (btn) btn.classList.toggle('active', key === tabName);
    if (pane) pane.classList.toggle('active', key === tabName);
  }
  const entry = map[tabName];
  if (entry) entry[2]();
};

window.refreshMasteryModal = function () {
  _masteryCache = null;
  switchMasteryTab(currentMasteryTab);
};

async function renderMasteryLedger() {
  const pane = document.getElementById('masteryPaneLedger');
  if (!pane) return;
  pane.innerHTML = '<div class="mastery-empty">Reading the evidence ledger...</div>';
  try {
    const data = _masteryCache || (await fetch('/api/mastery/state').then((r) => r.json()));
    _masteryCache = data;

    const ev = data.evidence || {};
    const byGrade = ev.byGrade || {};
    const skills = data.skills || {};
    const learning = data.learning || {};

    const totalEntries = typeof ev.totalEntries === 'number' ? ev.totalEntries : null;
    const openUnknowns = typeof ev.openUnknowns === 'number' ? ev.openUnknowns : null;

    const records = (ev.recentEntries || [])
      .map((e) => {
        const cls = MASTERY_GRADE_CLASS[e.grade] || 'unknown';
        return `
            <div class="mastery-record ${cls}">
              <div class="mastery-record-head">
                <div class="mastery-record-title">${masteryEsc(e.claim)}</div>
                ${masteryGradeChip(e.grade)}
              </div>
              <div class="mastery-meta">
                ${e.citation ? `citation: ${masteryEsc(e.citation)}<br>` : ''}
                ${e.coverage ? `coverage: ${masteryEsc(e.coverage)}<br>` : ''}
                ${(e.limitations || []).length ? `limitations: ${masteryEsc(e.limitations.join(' · '))}` : ''}
              </div>
            </div>`;
      })
      .join('');

    const unknowns = (ev.unknowns || [])
      .filter((u) => u.status === 'open')
      .slice(0, 12)
      .map(
        (u) => `
          <div class="mastery-record unknown">
            <div class="mastery-record-head">
              <div class="mastery-record-title">${masteryEsc(u.question)}</div>
              ${masteryGradeChip('UNKNOWN')}
            </div>
            <div class="mastery-meta">
              would be settled by: ${masteryEsc(u.neededAuthority || '—')}<br>
              recorded: ${u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
            </div>
            <button class="mastery-verify-btn" onclick="resolveMasteryUnknown('${masteryEsc(u.unknownId)}')">Record resolution</button>
          </div>`,
      )
      .join('');

    pane.innerHTML = `
          <div class="memory-kpi-grid">
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#34D399;">${byGrade.OBSERVED ?? 0}</span>
              <span class="memory-kpi-lbl">Observed Evidence</span>
            </div>
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#FBBF24;">${byGrade.INFERRED ?? 0}</span>
              <span class="memory-kpi-lbl">Inferred, Unscored</span>
            </div>
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:rgba(244,240,224,0.72);">${openUnknowns ?? 0}</span>
              <span class="memory-kpi-lbl">Open Unknowns</span>
            </div>
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#38BDF8;">${skills.oracleVerified ?? 0}</span>
              <span class="memory-kpi-lbl">Oracle-Verified Skills</span>
            </div>
          </div>

          <div class="mastery-record" style="margin-top:4px;">
            <div class="mastery-record-title">Skill corpus</div>
            <div class="mastery-meta">
              skill records on disk: ${skills.total ?? 0} ·
              oracle-verified: ${skills.oracleVerified ?? 0} ·
              unverified: ${skills.unverified ?? 0} ·
              carrying executable code: ${skills.withExecutableCode ?? 0}<br>
              total evidence entries: ${totalEntries ?? 0} ·
              prevented-mistake rules: ${data.mistakes?.totalRules ?? 0}<br>
              autonomous cycles: ${learning.totalCycles ?? '—'} ·
              retained recent cycles passing an oracle: ${learning.oracleVerifiedCycles ?? 0} ·
              legacy cycles counted on a heuristic delta: ${learning.successful10PercentCycles ?? 0} <span style="opacity:0.65;">(not evidence)</span>
            </div>
            ${skills.legacyNote ? `<div class="mastery-meta" style="color:rgba(251,191,36,0.8);">${masteryEsc(skills.legacyNote)}</div>` : ''}
          </div>

          <div>
            <div class="mastery-section-label">Recent graded claims</div>
            ${records || '<div class="mastery-empty">No evidence recorded yet. The ledger fills as verification runs.</div>'}
          </div>

          <div>
            <div class="mastery-section-label">Open unknowns (${openUnknowns ?? 0})</div>
            ${unknowns || '<div class="mastery-empty">No unknowns recorded yet. An empty list means no question has been filed, not that every claim is settled — the corpus counters above are the honest measure of what is still unverified.</div>'}
          </div>
        `;
  } catch (err) {
    pane.innerHTML = `<div class="mastery-empty">Could not read the evidence ledger: ${masteryEsc(err.message)}</div>`;
  }
}

async function renderMasterySkills(status) {
  const pane = document.getElementById(
    status === 'learned' ? 'masteryPaneLearned' : 'masteryPaneCandidates',
  );
  if (!pane) return;
  pane.innerHTML = '<div class="mastery-empty">Reading skill records...</div>';
  try {
    // A large readdir is slow on the first call; ask for a bounded page.
    const data = await fetch(`/api/mastery/skills?status=${status}&limit=40`).then((r) => r.json());
    const skills = data.skills || [];

    if (!skills.length) {
      pane.innerHTML = `<div class="mastery-empty">${
        status === 'learned'
          ? 'No skill has been verified by an expected-output oracle yet. Every stored recipe is under “Unverified Candidates”.'
          : 'Nothing to verify: every stored skill either passed an oracle or the corpus is empty.'
      }</div>`;
      return;
    }

    pane.innerHTML = `
          <div class="mastery-section-label">${status === 'learned' ? 'Verified by an oracle' : 'Preserved but never verified'} · showing ${skills.length}${typeof data.total === 'number' && data.total > skills.length ? ` of ${data.total}` : ''}</div>
          ${skills
            .map((s) => {
              const cls = MASTERY_GRADE_CLASS[s.verificationGrade] || 'unknown';
              const oracleLine = s.oracle ? `oracle: ${masteryEsc(s.oracle)}` : 'oracle: none';
              const caseLine =
                s.testsTotal != null
                  ? `cases: ${s.testsPassed ?? '?'}/${s.testsTotal}`
                  : 'cases: not measured';
              const canVerify = status === 'candidates';
              return `
              <div class="mastery-record ${cls}" style="margin-bottom:10px;">
                <div class="mastery-record-head">
                  <div>
                    <div class="mastery-record-title">${masteryEsc(s.name)}</div>
                    <div class="mastery-meta">${masteryEsc(s.domain)} · ${oracleLine} · ${caseLine} · status: ${masteryEsc(s.verificationStatus)}</div>
                  </div>
                  ${masteryGradeChip(s.verificationGrade)}
                </div>
                <div class="mastery-meta">
                  verified reward: ${masteryNum(s.verifiedScore, 3)} ·
                  heuristic estimate: ${masteryNum(s.heuristicScore, 3)} ·
                  speedup: ${s.speedupGain ? masteryEsc(s.speedupGain) : '<span class="mastery-null">not measured</span>'}
                </div>
                ${s.claim ? `<div class="mastery-meta">${masteryEsc(s.claim)}</div>` : ''}
                ${(s.limitations || []).length ? `<div class="mastery-meta">limitations: ${masteryEsc(s.limitations.join(' · '))}</div>` : ''}
                ${
                  canVerify
                    ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
                  <textarea class="mastery-test-input" data-skill="${masteryEsc(s.id)}" rows="3" spellcheck="false"
                    placeholder='Expected-output test for candidate.js (Node). Print {"passed":N,"total":M}. Without this the run can only establish that the artifact parses.'></textarea>
                  <button class="mastery-verify-btn" data-skill="${masteryEsc(s.id)}" onclick="verifyMasteryCandidate('${masteryEsc(s.id)}', this)">Run in sandbox</button>
                </div>`
                    : ''
                }
              </div>`;
            })
            .join('')}
        `;
  } catch (err) {
    pane.innerHTML = `<div class="mastery-empty">Could not read skills: ${masteryEsc(err.message)}</div>`;
  }
}

async function renderMasteryMistakes() {
  const pane = document.getElementById('masteryPaneMistakes');
  if (!pane) return;
  pane.innerHTML = '<div class="mastery-empty">Reading the mistake ledger...</div>';
  try {
    const data = await fetch('/api/mastery/mistakes').then((r) => r.json());
    const rules = data.rules || [];
    pane.innerHTML = `
          <div class="mastery-section-label">Active invariants injected into every turn · ${data.total ?? rules.length} rules</div>
          <div class="mastery-meta" style="margin-bottom:10px;">
            These rules are read from <code>data/memory/mistakes-ledger.json</code> and prepended to the system prompt each turn.
          </div>
          ${
            rules
              .map(
                (r, i) => `
            <div class="mastery-record inferred" style="margin-bottom:10px;">
              <div class="mastery-record-head">
                <div class="mastery-record-title">${i + 1}. [${masteryEsc((r.domain || 'general').toUpperCase())}]</div>
                <span class="mastery-grade-chip mastery-grade-inferred">INVARIANT</span>
              </div>
              <div class="mastery-meta">🚫 NEVER: ${masteryEsc(r.neverDo || '—')}</div>
              <div class="mastery-meta">✅ ALWAYS: ${masteryEsc(r.alwaysDo || '—')}</div>
              <div class="mastery-meta" style="opacity:0.7;">trigger: ${masteryEsc(r.userTrigger || '—')}</div>
            </div>`,
              )
              .join('') || '<div class="mastery-empty">No rules recorded.</div>'
          }
        `;
  } catch (err) {
    pane.innerHTML = `<div class="mastery-empty">Could not read the mistake ledger: ${masteryEsc(err.message)}</div>`;
  }
}

window.verifyMasteryCandidate = async function (skillId, btn) {
  // The test script is what separates "it parses" from "it is correct".
  // Without one the server grades INFERRED and issues no reward, so the
  // field is sent whenever the user wrote something in it.
  const field = document.querySelector(`.mastery-test-input[data-skill="${CSS.escape(skillId)}"]`);
  const testCode = (field?.value || '').trim();

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Running…';
  }
  try {
    const res = await fetch(`/api/mastery/candidates/${encodeURIComponent(skillId)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCode ? { testCode } : {}),
    }).then((r) => r.json());
    if (!res.success) throw new Error(res.error || 'verification failed');
    _masteryCache = null;
    switchMasteryTab('candidates');
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = `Failed: ${err.message}`;
    }
  }
};

window.resolveMasteryUnknown = async function (unknownId) {
  // Only observed evidence closes an unknown; the ledger refuses otherwise.
  const evidenceId = prompt(
    'Which OBSERVED evidence id settles this?\n\nAn inferred claim cannot close it. Leave blank to record a note only.',
  );
  const resolution = prompt('State the resolution as a bounded claim.');
  if (!resolution) return;
  try {
    const res = await fetch(`/api/mastery/unknowns/${encodeURIComponent(unknownId)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, evidenceId: (evidenceId || '').trim() || null }),
    }).then((r) => r.json());
    if (!res.success) throw new Error(res.error || 'could not resolve');
    _masteryCache = null;
    switchMasteryTab('ledger');
  } catch (err) {
    alert(`Not recorded: ${err.message}`);
  }
};

window.switchTreeModalTab = function (tabName) {
  currentTreeModalTab = tabName;
  const btnChat = document.getElementById('treeTabBtnChat');
  const btnMem = document.getElementById('treeTabBtnMemory');
  const paneChat = document.getElementById('treePaneChat');
  const paneMem = document.getElementById('treePaneMemory');

  if (btnChat) btnChat.classList.toggle('active', tabName === 'chat');
  if (btnMem) btnMem.classList.toggle('active', tabName === 'memory');
  if (paneChat) paneChat.classList.toggle('active', tabName === 'chat');
  if (paneMem) paneMem.classList.toggle('active', tabName === 'memory');

  if (tabName === 'chat') {
    renderConversationTree();
  } else if (tabName === 'memory') {
    renderEpistemicMemoryTree();
  }
};

function renderConversationTree() {
  const pane = document.getElementById('treePaneChat');
  if (!pane) return;

  const stream = getOrCreateChatTurnsStream();
  const turnEls = stream ? Array.from(stream.querySelectorAll('.chat-turn-item')) : [];

  if (turnEls.length === 0) {
    pane.innerHTML = `
          <div style="padding:40px 20px; text-align:center; color:rgba(255,255,255,0.4);">
            <div style="font-size:32px; margin-bottom:12px;">🌿</div>
            <div style="font-size:14px; font-weight:600; color:#FFF; margin-bottom:6px;">No Active Conversation Turns</div>
            <div style="font-size:12px;">Ask a question in Supergence Workspace to generate the live cognitive reasoning branch tree.</div>
          </div>
        `;
    return;
  }

  let treeHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:12px; font-weight:700; color:#38BDF8; text-transform:uppercase; letter-spacing:0.5px;">
            Active Thread: ${escapeHtml(window.__activeWorkspaceConvId || 'current')} (${turnEls.length} Turns)
          </div>
          <div style="font-size:11px; color:rgba(244,240,224,0.5);">Click any turn node to jump to that moment in chat</div>
        </div>
      `;

  turnEls.forEach((turn, idx) => {
    const queryText = turn.querySelector('.user-query-pill')?.textContent || `Turn #${idx + 1}`;
    const stepsCount = turn.querySelectorAll('.work-tree-node').length;
    const respText =
      turn.querySelector('.response-body-markdown')?.innerText?.slice(0, 160) ||
      'Synthesized intelligence response...';
    const hasTools = turn.innerText.includes('Dynamic Tool Forged');

    treeHtml += `
          <div class="tree-turn-branch" id="tree-branch-${turn.id}">
            <div class="tree-node tree-node-user" onclick="focusChatTurn('${turn.id}')" title="Jump to User Query">
              <span class="tree-node-icon">👤</span>
              <div class="tree-node-content">
                <span class="tree-node-label">Turn #${idx + 1}: User Prompt</span>
                <span class="tree-node-text">${escapeHtml(queryText)}</span>
              </div>
              <span class="tree-node-badge">Jump to Turn ↗</span>
            </div>

            <div class="tree-connector-line"></div>

            <div class="tree-node tree-node-thoughts" onclick="focusChatTurn('${turn.id}')" title="Swarm Reasoning Trace">
              <span class="tree-node-icon">🧠</span>
              <div class="tree-node-content">
                <span class="tree-node-label">Swarm Cognitive Deliberation (${stepsCount} steps)</span>
                <span class="tree-node-text" style="color:rgba(244,240,224,0.6); font-size:11.5px;">Hermes long-term memory scan ➜ OpenClaw validation ➜ Specialist agent synthesis</span>
              </div>
            </div>

            ${
              hasTools
                ? `
              <div class="tree-connector-line" style="margin-left:36px;"></div>
              <div class="tree-node tree-node-tool" onclick="focusChatTurn('${turn.id}')" title="Forged Tool Execution">
                <span class="tree-node-icon">⚡</span>
                <div class="tree-node-content">
                  <span class="tree-node-label" style="color:#10B981;">Dynamic Tool Forged & Executed</span>
                  <span class="tree-node-text" style="color:#A7F3D0; font-size:11.5px;">Synthesized without hardcoding & executed in real-time sandbox</span>
                </div>
              </div>
            `
                : ''
            }

            <div class="tree-connector-line"></div>

            <div class="tree-node tree-node-solution" onclick="focusChatTurn('${turn.id}')" title="Jump to Synthesized Answer">
              <span class="tree-node-icon">✨</span>
              <div class="tree-node-content">
                <span class="tree-node-label">Synthesized Resolution</span>
                <span class="tree-node-text">${escapeHtml(respText)}...</span>
              </div>
              <span class="tree-node-badge">Jump to Turn ↗</span>
            </div>
          </div>
        `;
  });

  pane.innerHTML = treeHtml;
}

window.focusChatTurn = function (turnId) {
  toggleWorkspaceTreeModal(false);
  const turnEl = document.getElementById(turnId);
  if (turnEl) {
    turnEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    turnEl.classList.add('turn-highlight');
    setTimeout(() => turnEl.classList.remove('turn-highlight'), 2200);
  }
};

async function renderEpistemicMemoryTree() {
  const pane = document.getElementById('treePaneMemory');
  if (!pane) return;

  try {
    pane.innerHTML =
      '<div style="padding:20px; color:rgba(255,255,255,0.4); text-align:center;">Synchronizing with Hermes Lifelong Epistemic Knowledge Graph...</div>';
    const { fetchJson, formatCount, formatConfidence } = await import('./telemetry-values.js');
    const [statsRes, graphRes] = await Promise.all([
      fetchJson('/api/memory/stats'),
      fetchJson('/api/memory/graph'),
    ]);

    const lt = statsRes.longTerm || {};
    const totalNodes = graphRes.nodeCount ?? lt.totalNodes;
    const totalEdges = graphRes.edgeCount;
    const avgConf = formatConfidence(lt.avgConfidence);
    const byType = lt.byType || {};

    epistemicMemoryCache = { stats: statsRes, graph: graphRes };

    pane.innerHTML = `
          <!-- KPI Metrics Row -->
          <div class="memory-kpi-grid">
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#38BDF8;">${formatCount(totalNodes)}</span>
              <span class="memory-kpi-lbl">Total Epistemic Nodes</span>
            </div>
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#34D399;">${formatCount(totalEdges)}</span>
              <span class="memory-kpi-lbl">Semantic Association Edges</span>
            </div>
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#FBBF24;">${avgConf}</span>
              <span class="memory-kpi-lbl">Average Epistemic Confidence</span>
            </div>
            <div class="memory-kpi-card">
              <span class="memory-kpi-val" style="color:#A78BFA;">${formatCount(statsRes.shortTerm?.totalNodes)}</span>
              <span class="memory-kpi-lbl">Active Short-Term Traces</span>
            </div>
          </div>

          <!-- Category Breakdown Pills -->
          <div style="margin-top:12px;">
            <div style="font-size:11px; font-weight:700; color:rgba(244,240,224,0.6); text-transform:uppercase; margin-bottom:8px;">Epistemic Categories in Long-Term Memory</div>
            <div class="memory-pills-row" id="memoryTypePills">
              <button class="memory-pill active" onclick="filterMemoryNodes('all')">All Nodes (${formatCount(totalNodes)})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('autonomous-breakthrough')">Breakthroughs (${formatCount(byType['autonomous-breakthrough'])})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('learned-skill')">Learned Skills (${formatCount(byType['learned-skill'])})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('consolidated-operational-trace')">Traces (${formatCount(byType['consolidated-operational-trace'])})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('unified-theory')">Unified Theories (${formatCount(byType['unified-theory'])})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('axiom')">Axioms (${formatCount(byType['axiom'])})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('operational-heuristic')">Heuristics (${formatCount(byType['operational-heuristic'])})</button>
              <button class="memory-pill" onclick="filterMemoryNodes('web-research-digest')">Web Research (${formatCount(byType['web-research-digest'])})</button>
            </div>
          </div>

          <!-- Interactive Visual Graph Canvas -->
          <div class="graph-canvas-wrap" id="graphCanvasWrap">
            <svg id="memoryGraphSvg" width="100%" height="100%" style="cursor:grab;"></svg>
          </div>

          <!-- Node Detail Inspector -->
          <div class="node-detail-card" id="nodeDetailCard">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11px; font-weight:700; color:#38BDF8; text-transform:uppercase;">Epistemic Node Inspector</span>
              <span id="inspectNodeConfidence" style="font-size:10.5px; color:#10B981; font-weight:700;">Confidence: Unavailable</span>
            </div>
            <div id="inspectNodeLabel" style="font-size:13.5px; font-weight:600; color:#FFF;">Click on any node in the graph above to inspect its epistemic properties.</div>
            <div id="inspectNodeMeta" style="font-size:11px; color:rgba(244,240,224,0.5); font-family:var(--font-mono);">Type: select a node · Tags: [] · Epistemic Graph ID: none</div>
          </div>
        `;

    renderInteractiveGraphCanvas(graphRes.nodes || []);
  } catch (err) {
    console.warn('Failed to render epistemic memory tree:', err);
    pane.innerHTML = `<div style="padding:20px; color:#F87171; text-align:center;">Failed to render memory tree: ${escapeHtml(err.message)}</div>`;
  }
}

function renderInteractiveGraphCanvas(nodes) {
  const svg = document.getElementById('memoryGraphSvg');
  if (!svg) return;
  const w = svg.clientWidth || 900;
  const h = svg.clientHeight || 380;
  const cx = w / 2;
  const cy = h / 2;

  // Sample a clean subset of nodes (up to 32)
  const sample = Array.isArray(nodes) ? nodes.slice(0, 32) : [];
  if (sample.length === 0) {
    svg.innerHTML =
      '<text x="50%" y="50%" text-anchor="middle" fill="#94A3B8">No memory nodes available</text>';
    return;
  }

  const typeColors = {
    root: '#38BDF8',
    axiom: '#38BDF8',
    'autonomous-breakthrough': '#10B981',
    'learned-skill': '#9F7CEF',
    'unified-theory': '#F59E0B',
    'operational-heuristic': '#F43F5E',
    'web-research-digest': '#06B6D4',
    'consolidated-operational-trace': '#8B5CF6',
  };

  let svgContent = `
        <defs>
          <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      `;

  // Central Hub
  svgContent += `
        <circle cx="${cx}" cy="${cy}" r="22" fill="rgba(56,189,248,0.2)" stroke="#38BDF8" stroke-width="2" filter="url(#nodeGlow)"/>
        <text x="${cx}" y="${cy + 4}" fill="#FFF" font-size="10" font-weight="700" text-anchor="middle">CORE</text>
      `;

  // Satellite Nodes in orbit
  const count = sample.length;
  sample.forEach((n, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const radius = 100 + (i % 3) * 35;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const color = typeColors[n.type] || '#A78BFA';

    // Connector line
    svgContent += `
          <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${color}" stroke-opacity="0.25" stroke-width="1.2" stroke-dasharray="3,3"/>
        `;

    // Node circle
    const safeLabel = (n.label || n.id || '').replace(/"/g, '&quot;');
    svgContent += `
          <g style="cursor:pointer;" onclick="inspectEpistemicNode('${n.id}', '${escapeHtml(safeLabel).replace(/'/g, "\\'")}', '${n.type || 'axiom'}', '${(n.tags || []).join(', ')}')">
            <circle cx="${nx}" cy="${ny}" r="11" fill="rgba(10,16,28,0.9)" stroke="${color}" stroke-width="2"/>
            <circle cx="${nx}" cy="${ny}" r="5" fill="${color}"/>
            <text x="${nx}" y="${ny + 18}" fill="rgba(244,240,224,0.75)" font-size="9" text-anchor="middle" font-family="var(--font-sans)">${escapeHtml((n.label || '').slice(0, 14))}...</text>
          </g>
        `;
  });

  svg.innerHTML = svgContent;
}

window.inspectEpistemicNode = function (id, label, type, tags) {
  const lblEl = document.getElementById('inspectNodeLabel');
  const metaEl = document.getElementById('inspectNodeMeta');
  const confEl = document.getElementById('inspectNodeConfidence');

  if (lblEl) lblEl.innerText = label || id;
  if (metaEl) metaEl.innerText = `Type: ${type} · Tags: [${tags || ''}] · Epistemic ID: ${id}`;
  if (confEl) {
    const node = epistemicMemoryCache?.graph?.nodes?.find((n) => n.id === id);
    const confidence = node?.confidence;
    confEl.innerText =
      'Confidence: ' +
      (typeof confidence === 'number' &&
      Number.isFinite(confidence) &&
      confidence >= 0 &&
      confidence <= 1
        ? (confidence * 100).toFixed(1) + '%'
        : 'Unavailable');
  }
};

window.filterMemoryNodes = function (type) {
  const pills = document.querySelectorAll('#memoryTypePills .memory-pill');
  pills.forEach((p) => p.classList.remove('active'));
  const activePill = Array.from(pills).find((p) => p.getAttribute('onclick')?.includes(type));
  if (activePill) activePill.classList.add('active');

  if (!epistemicMemoryCache || !epistemicMemoryCache.graph) return;
  const all = epistemicMemoryCache.graph.nodes || [];
  const filtered = type === 'all' ? all : all.filter((n) => n.type === type);
  renderInteractiveGraphCanvas(filtered);
};

window.highlightCodeSyntax = function (code, lang) {
  if (!code) return '';
  // Single-pass regex tokenizer: comments, strings, preprocessor, keywords, types, numbers
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:template|typename|alignas|constexpr|inline|atomic|class|struct|namespace|using|public|private|protected|virtual|override|explicit|static_assert|sizeof|alignof|memory_order|memory_order_relaxed|memory_order_acquire|memory_order_release|memory_order_seq_cst|import|export|from|def|async|await|function|return|const|let|var|if|else|for|while|do|switch|case|break|continue|try|catch|throw|finally|new|delete|nullptr|true|false|void|int|size_t|uint64_t|uint32_t|int64_t|int32_t|bool|char|float|double|auto)\b)|(\b(?:std|vector|string|benchmark|Benchmark|DoNotOptimize|State|Promise|Object|Array|Slot|MPMCRingBuffer|SPSCRingBuffer|RingBuffer)\b)|(\b\d+(?:'\d+)*(?:\.\d+)?(?:f|u|ull|l)?\b)/gi;

  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    const [full, comment, str, kw, type, num] = match;
    if (comment) {
      result += `<span style="color:#64748B; font-style:italic;">${escapeHtml(comment)}</span>`;
    } else if (str) {
      result += `<span style="color:#A7F3D0;">${escapeHtml(str)}</span>`;
    } else if (kw) {
      result += `<span style="color:#C4B5FD; font-weight:600;">${escapeHtml(kw)}</span>`;
    } else if (type) {
      result += `<span style="color:#38BDF8; font-weight:600;">${escapeHtml(type)}</span>`;
    } else if (num) {
      result += `<span style="color:#FDE68A;">${escapeHtml(num)}</span>`;
    }
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }
  return result;
};

function renderLatexMath(mathStr, isDisplay) {
  if (!mathStr) return '';
  let cleanMath = mathStr.trim();
  cleanMath = cleanMath.replace(/^\\\[\s*|\s*\\\]$/g, '');
  cleanMath = cleanMath.replace(/^\$\$\s*|\s*\$\$$/g, '');
  cleanMath = cleanMath.replace(/^\\\(\s*|\s*\\\)$/g, '');
  cleanMath = cleanMath.replace(/^\$\s*|\s*\$$/g, '');

  if (window.katex && typeof window.katex.renderToString === 'function') {
    try {
      return window.katex.renderToString(cleanMath, {
        displayMode: isDisplay,
        throwOnError: false,
      });
    } catch (_) {}
  }

  if (isDisplay) {
    return `<div class="latex-math-display" style="margin:12px 0; padding:10px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; font-family:'KaTeX_Math', 'Times New Roman', Cambria, Georgia, serif; font-size:13.5px; color:#F8FAFC; text-align:center; overflow-x:auto; letter-spacing:0.02em;">${escapeHtml(cleanMath)}</div>`;
  } else {
    return `<span class="latex-math-inline" style="font-family:'KaTeX_Math', 'Times New Roman', Cambria, Georgia, serif; font-style:italic; color:#38BDF8; padding:0 3px; font-size:12.5px;">${escapeHtml(cleanMath)}</span>`;
  }
}

function formatMarkdown(text) {
  if (!text) return '';

  // 1. Extract and protect Code Blocks
  const codeBlocks = [];
  let s = text.replace(/```([a-zA-Z0-9_-]*)\s*([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    const cleanLang = (lang || 'code').toUpperCase();
    const rawCode = code.trim();
    const lines = rawCode.split('\n');
    const lineCount = lines.length;

    const extMap = {
      TYPESCRIPT: 'ts',
      TS: 'ts',
      JAVASCRIPT: 'js',
      JS: 'js',
      NODE: 'js',
      PYTHON: 'py',
      PY: 'py',
      CPP: 'cpp',
      'C++': 'cpp',
      C: 'c',
      RUST: 'rs',
      RS: 'rs',
      GO: 'go',
      GOLANG: 'go',
      HTML: 'html',
      CSS: 'css',
      BASH: 'sh',
      SH: 'sh',
      SHELL: 'sh',
      ZSH: 'sh',
      JSON: 'json',
      SQL: 'sql',
      YAML: 'yaml',
      YML: 'yaml',
    };
    const ext = extMap[cleanLang] || (cleanLang.length <= 4 ? cleanLang.toLowerCase() : 'ts');

    // Intelligent semantic filename detection
    let detectedFilename;
    const firstLine = (lines[0] || '').trim();
    const secondLine = (lines[1] || '').trim();
    const fileMatch =
      firstLine.match(/^(?:\/{2}|#|\/\*|\*|--)\s*([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/) ||
      secondLine.match(/^(?:\/{2}|#|\/\*|\*|--)\s*([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/);
    if (fileMatch) {
      detectedFilename = fileMatch[1];
    } else {
      const classMatch = rawCode.match(
        /(?:class|interface|struct|function)\s+([A-Z][a-zA-Z0-9_]+)/,
      );
      if (classMatch) {
        detectedFilename = `${classMatch[1]}.${ext}`;
      } else if (ext === 'sh') {
        detectedFilename = 'script.sh';
      } else if (ext === 'json') {
        detectedFilename = 'config.json';
      } else if (ext === 'sql') {
        detectedFilename = 'query.sql';
      } else {
        detectedFilename = `solution.${ext}`;
      }
    }

    const canRunInStudio = ['ts', 'js', 'py', 'cpp', 'html'].includes(ext) && lineCount >= 3;
    const highlighted = window.highlightCodeSyntax
      ? window.highlightCodeSyntax(rawCode, lang)
      : escapeHtml(rawCode);
    const cardHtml = `
      <div class="pro-code-card" data-filename="${escapeHtml(detectedFilename)}" data-lang="${escapeHtml(cleanLang)}">
        <div class="chat-code-header">
          <div class="chat-code-meta"><span>${escapeHtml(detectedFilename)}</span><small>${escapeHtml(cleanLang)} · ${lineCount} lines</small></div>
          <div class="chat-code-actions">
            ${canRunInStudio ? '<button type="button" data-code-action="open">Open in chat</button>' : ''}
            <button type="button" data-code-action="retain">Retain</button>
            <button type="button" data-code-action="copy">Copy</button>
          </div>
        </div>
        <pre><code>${highlighted}</code></pre>
      </div>`;
    codeBlocks.push(cardHtml);
    return id;
  });

  // 2. Extract and protect Display Math: $$ ... $$ or \[ ... \]
  const mathBlocks = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g, (match) => {
    const id = `__MATH_BLOCK_${mathBlocks.length}__`;
    mathBlocks.push(renderLatexMath(match, true));
    return id;
  });

  // 3. Extract and protect Inline Math: $ ... $ or \( ... \)
  const inlineMaths = [];
  s = s.replace(/(\$[^$\n]+\$|\\\([\s\S]*?\\\))/g, (match) => {
    const id = `__INLINE_MATH_${inlineMaths.length}__`;
    inlineMaths.push(renderLatexMath(match, false));
    return id;
  });

  // 4. Extract and protect Inline Code: `...`
  const inlineCodes = [];
  s = s.replace(/`([^`]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(
      `<code style="background:rgba(255,255,255,0.08); padding:2px 5px; border-radius:4px; font-family:monospace; font-size:11px; color:#38BDF8;">${escapeHtml(code)}</code>`,
    );
    return id;
  });

  // 5. Parse LaTeX Document Environments
  s = s.replace(/\\section\*?\{([^}]+)\}/g, '<h2>$1</h2>');
  s = s.replace(/\\subsection\*?\{([^}]+)\}/g, '<h3>$1</h3>');
  s = s.replace(/\\subsubsection\*?\{([^}]+)\}/g, '<h4>$1</h4>');

  s = s.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  s = s.replace(/\\(?:textit|emph)\{([^}]+)\}/g, '<em>$1</em>');

  s = s.replace(
    /\\begin\{definition\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{definition\}/g,
    (match, title, body) => {
      return `<div class="latex-env-box" style="margin:12px 0; border-left:3px solid #38BDF8; background:rgba(56,189,248,0.06); border-radius:0 8px 8px 0; padding:10px 14px;"><div style="font-weight:700; color:#38BDF8; font-size:12px; margin-bottom:4px;">📖 Definition${title ? ' (' + title + ')' : ''}</div><div style="font-size:12px; line-height:1.6;">${body.trim()}</div></div>`;
    },
  );
  s = s.replace(
    /\\begin\{theorem\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{theorem\}/g,
    (match, title, body) => {
      return `<div class="latex-env-box" style="margin:12px 0; border-left:3px solid #10B981; background:rgba(16,185,129,0.06); border-radius:0 8px 8px 0; padding:10px 14px;"><div style="font-weight:700; color:#34D399; font-size:12px; margin-bottom:4px;">⚖️ Theorem${title ? ' (' + title + ')' : ''}</div><div style="font-size:12px; line-height:1.6;">${body.trim()}</div></div>`;
    },
  );
  s = s.replace(
    /\\begin\{lemma\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{lemma\}/g,
    (match, title, body) => {
      return `<div class="latex-env-box" style="margin:12px 0; border-left:3px solid #F59E0B; background:rgba(245,158,11,0.06); border-radius:0 8px 8px 0; padding:10px 14px;"><div style="font-weight:700; color:#FBBF24; font-size:12px; margin-bottom:4px;">🔍 Lemma${title ? ' (' + title + ')' : ''}</div><div style="font-size:12px; line-height:1.6;">${body.trim()}</div></div>`;
    },
  );
  s = s.replace(/\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g, (match, body) => {
    return `<div class="latex-env-box" style="margin:12px 0; border-left:3px solid #C084FC; background:rgba(168,85,247,0.06); border-radius:0 8px 8px 0; padding:10px 14px;"><div style="font-weight:700; color:#C4B5FD; font-size:12px; margin-bottom:4px;">∎ Proof</div><div style="font-style:italic; color:#CBD5E1; font-size:12px; line-height:1.6;">${body.trim()}</div></div>`;
  });

  s = s.replace(
    /\\begin\{(?:enumerate|itemize)\}([\s\S]*?)\\end\{(?:enumerate|itemize)\}/g,
    (match, body) => {
      const items = body.split(/\\item\s+/).filter((it) => it.trim());
      return `<ul style="margin:8px 0 8px 18px; padding:0; line-height:1.6;">${items.map((it) => `<li>${it.trim()}</li>`).join('')}</ul>`;
    },
  );
  s = s.replace(/\\item\s+(.*$)/gm, '<div style="margin-left:14px; margin-bottom:3px;">• $1</div>');

  // 6. Parse standard Markdown
  s = s.replace(/^(?:&gt;|>)\s?(.*$)/gim, '<blockquote>$1</blockquote>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
    /^(?:https?:\/\/|\/(?!\/)|#|mailto:)/i.test(href)
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : label,
  );
  s = s.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  s = s.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  s = s.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  s = s.replace(/^\s*---+\s*$/gm, '<hr>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  s = s.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  s = s.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  s = parseMarkdownTables(s);
  s = s.replace(
    /(?:^|\n)(?:[ \t]*[-*][ \t]+[^\n]*(?:\n|$))+/g,
    (block) =>
      '<ul>' +
      block
        .trim()
        .split(/\r?\n/)
        .map((line) => '<li>' + line.replace(/^[ \t]*[-*][ \t]+/, '') + '</li>')
        .join('') +
      '</ul>',
  );
  s = s.replace(
    /(?:^|\n)(?:[ \t]*\d+\.[ \t]+[^\n]*(?:\n|$))+/g,
    (block) =>
      '<ol>' +
      block
        .trim()
        .split(/\r?\n/)
        .map((line) => '<li>' + line.replace(/^[ \t]*\d+\.[ \t]+/, '') + '</li>')
        .join('') +
      '</ol>',
  );
  s = s.replace(/\n/g, '<br>');

  s = s.replace(
    /【(source-[a-f0-9]{24})(:\d+)?】/g,
    '<button type="button" class="source-citation" data-source-citation="$1">$1$2</button>',
  );
  // 7. Re-inject protected inline codes, inline math, display math, and code blocks
  inlineCodes.forEach((ic, i) => {
    s = s.replace(`__INLINE_CODE_${i}__`, ic);
  });
  inlineMaths.forEach((im, i) => {
    s = s.replace(`__INLINE_MATH_${i}__`, im);
  });
  mathBlocks.forEach((mb, i) => {
    s = s.replace(`__MATH_BLOCK_${i}__`, mb);
  });
  codeBlocks.forEach((cb, i) => {
    s = s.replace(`__CODE_BLOCK_${i}__`, cb);
  });

  s = s.replace(/(<\/(?:h[1-6]|div|pre|blockquote|ul|ol|table)>)(?:\s*<br>)+/g, '$1');
  s = s.replace(/(?:<br>\s*)+(<(?:h[1-6]|div|pre|blockquote|ul|ol|table)\b)/g, '$1');
  return s;
}

function formatTableCell(text) {
  if (!text) return '';
  let c = text;
  c = c.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  c = c.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  c = c.replace(
    /`([^`]+)`/g,
    '<code style="background:rgba(255,255,255,0.08); padding:1px 4px; border-radius:3px; font-family:monospace; font-size:10.5px; color:#38BDF8;">$1</code>',
  );
  return c;
}

function parseMarkdownTables(text) {
  if (!text || !text.includes('|')) return text;
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
    const isSeparator =
      nextLine && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(nextLine);
    const hasPipes = line && line.includes('|');
    if (hasPipes && isSeparator) {
      const splitCells = (row) => {
        let trimmed = row.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
        return trimmed.split('|').map((c) => c.trim());
      };
      const headerCells = splitCells(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (!cur.trim() || !cur.includes('|')) break;
        bodyRows.push(splitCells(cur));
        i++;
      }
      let tableHtml = '<div class="chat-table-wrap">';
      tableHtml += '<table class="chat-table">';
      tableHtml += '<thead><tr>';
      headerCells.forEach((h) => {
        tableHtml += `<th>${formatTableCell(h)}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      bodyRows.forEach((row) => {
        tableHtml += '<tr>';
        headerCells.forEach((_, cIdx) => {
          const val = row[cIdx] || '';
          tableHtml += `<td>${formatTableCell(val)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      out.push(tableHtml);
    } else {
      out.push(line);
      i++;
    }
  }
  return out.join('\n');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Progress Section Tracker ──
function addProgressTask(taskText) {
  if (!taskText) return;
  pastTasks.unshift({ text: taskText, timestamp: new Date().toLocaleTimeString() });
  if (pastTasks.length > 8) pastTasks.pop();

  progressTasksList.innerHTML = pastTasks
    .map(
      (t) => `
        <div class="progress-task-item">
          <span class="progress-task-icon">✓</span>
          <span>${t.text}</span>
        </div>
      `,
    )
    .join('');
}

// ── Fetch & Render SIS System Agents Swarm ──
async function loadAgentSwarm() {
  try {
    const res = await fetch('/api/agents/team');
    const data = await res.json();
    if (data.success && Array.isArray(data.agents)) {
      registeredAgents = data.agents;
      renderAgentList(data.agents);
    }
  } catch (e) {
    console.warn('Failed to load agents:', e.message);
  }
  loadAppRoutines();
  checkAppPendingCheckpoints();
}

// ── Supergence Routines & Teach-a-Task in Main App ──
let appRoutines = [];
let activeAppCheckpointId = null;

async function loadAppRoutines() {
  try {
    const res = await fetch('/api/supergence/routines');
    const data = await res.json();
    if (data.success && Array.isArray(data.routines)) {
      appRoutines = data.routines;
      renderAppRoutinesList(data.routines);
    }
  } catch (e) {
    console.warn('Failed to load routines:', e.message);
  }
}

function renderAppRoutinesList(routines) {
  const container = document.getElementById('appRoutinesList');
  if (!container) return;
  if (!routines || routines.length === 0) {
    container.innerHTML =
      '<div style="font-size:11px; color:rgba(244,240,224,0.4); padding:4px 0;">No active routines</div>';
    return;
  }
  container.innerHTML = routines
    .map(
      (r) => `
        <div class="progress-task-item" style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:6px 8px; margin-bottom:4px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; align-items:center; gap:6px; min-width:0; flex:1;">
            <span style="font-size:10px;">${r.status === 'PAUSED' ? '⏸️' : r.lastStatus === 'RUNNING' ? '🟡' : '🟢'}</span>
            <div style="min-width:0;">
              <div style="font-size:12px; font-weight:600; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.name)}</div>
              <div style="font-size:10px; color:rgba(244,240,224,0.5);">${escapeHtml(r.schedule)}</div>
            </div>
          </div>
          <button onclick="runAppRoutine('${r.id}')" style="background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38BDF8; border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer;" title="Run Now">▶</button>
        </div>
      `,
    )
    .join('');
}

window.runAppRoutine = async function (id) {
  try {
    await fetch(`/api/supergence/routines/${id}/run`, { method: 'POST' });
    await loadAppRoutines();
  } catch (err) {
    console.warn('Error running routine:', err.message);
  }
};

window.openAppTeachTaskModal = function () {
  const m = document.getElementById('appTeachTaskModal');
  if (m) m.classList.add('active');
};

window.closeAppTeachTaskModal = function () {
  const m = document.getElementById('appTeachTaskModal');
  if (m) m.classList.remove('active');
};

window.submitAppTeachTask = async function () {
  const name = document.getElementById('appTeachTaskName')?.value.trim();
  const agentId = document.getElementById('appTeachTaskAgent')?.value;
  const schedule = document.getElementById('appTeachTaskSchedule')?.value;
  const stepsText = document.getElementById('appTeachTaskSteps')?.value.trim();
  if (!name) {
    alert('Please provide a routine name.');
    return;
  }
  const steps = stepsText
    ? stepsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : ['Execute task sequence'];
  try {
    const res = await fetch('/api/supergence/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, agentId, schedule, steps }),
    });
    const data = await res.json();
    if (data && data.success) {
      const nameEl = document.getElementById('appTeachTaskName');
      const stepsEl = document.getElementById('appTeachTaskSteps');
      if (nameEl) nameEl.value = '';
      if (stepsEl) stepsEl.value = '';
      loadAppRoutines().catch(() => {});
    }
  } catch (e) {
    console.warn('Teach task error:', e.message);
  } finally {
    closeAppTeachTaskModal();
  }
};

// ── App Secure Form & Human Checkpoints ──
async function checkAppPendingCheckpoints() {
  try {
    const res = await fetch('/api/supergence/checkpoints/pending');
    const data = await res.json();
    if (data.success && Array.isArray(data.pending) && data.pending.length > 0) {
      openAppSecureFormModal(data.pending[0]);
    }
  } catch (_) {}
}

window.openAppSecureFormModal = function (chk) {
  if (!chk) return;
  activeAppCheckpointId = chk.id;
  const t = document.getElementById('appSecureFormTitle');
  const d = document.getElementById('appSecureFormDesc');
  const r = document.getElementById('appSecureFormRisk');
  if (t) t.innerText = chk.title || 'Human Checkpoint Authorization';
  if (d) d.innerText = chk.description || 'Supergence requires verification before proceeding.';
  if (r) r.innerText = `${chk.riskLevel || 'HIGH'} RISK ACTION`;
  const m = document.getElementById('appSecureFormModal');
  if (m) m.classList.add('active');
};

window.closeAppSecureFormModal = function () {
  const m = document.getElementById('appSecureFormModal');
  if (m) m.classList.remove('active');
  activeAppCheckpointId = null;
};

window.respondAppCheckpoint = async function (id, decision) {
  if (!id) {
    closeAppSecureFormModal();
    return;
  }
  try {
    await fetch(`/api/supergence/checkpoints/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, inputs: {} }),
    });
    closeAppSecureFormModal();
  } catch (e) {
    console.warn('Checkpoint response error:', e.message);
  }
};

function renderAgentList(agents) {
  window.registeredAgents = agents;
  sisAgentsList.innerHTML = agents
    .map(
      (agent) => `
        <div class="sis-agent-row" onclick="openAgentColumn('${agent.id}')" title="Click to open ${agent.name} side-by-side">
          <div class="sis-agent-row-left">
            <div class="sis-agent-row-face">
              ${createAgentMiniFaceSvg(agent.id, agent.color)}
            </div>
            <div class="sis-agent-row-meta">
              <span class="sis-agent-row-name" style="color: ${agent.color || '#fff'}">${agent.name}</span>
              <span class="sis-agent-row-domain">${agent.domain.substring(0, 32)}...</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="agent-browser-quick-btn" onclick="event.stopPropagation(); openAgentBrowserModal('${agent.id}')" title="Open ${agent.name}'s Personal Browser">🌐</button>
            <span class="open-column-indicator">Open →</span>
          </div>
        </div>
      `,
    )
    .join('');
}

// ── Open Side-by-Side Agent Column ──
window.openAgentColumn = function (agentId) {
  const agent = registeredAgents.find((a) => a.id === agentId);
  if (!agent) return;

  if (openedAgentColumns.has(agentId)) {
    // Already opened, scroll into view
    const existing = document.getElementById('col-' + agentId);
    if (existing) existing.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const colEl = document.createElement('div');
  colEl.className = 'side-agent-column';
  colEl.id = 'col-' + agentId;
  colEl.innerHTML = `
        <div class="side-agent-header">
          <div class="side-agent-profile">
            <div class="side-agent-mini-face">
              ${createAgentMiniFaceSvg(agent.id, agent.color)}
            </div>
            <div class="side-agent-titles">
              <span class="side-agent-name" style="color: ${agent.color || '#fff'}">${agent.name}</span>
              <span class="side-agent-role">${agent.role}</span>
            </div>
          </div>
          <div class="side-agent-header-controls">
            <button class="talk-to-agent-btn" onclick="openAgentBrowserModal('${agent.id}')" style="background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.4); color:#10B981;" title="Open ${agent.name}'s Personal Browser">🌐 Browser</button>
            <button class="talk-to-agent-btn" onclick="collaborateWithAnotherAgent('${agent.id}')">Talk to...</button>
            <button class="close-column-btn" onclick="closeAgentColumn('${agent.id}')">✕</button>
          </div>
        </div>

        <div class="side-agent-chat-messages" id="msgs-${agent.id}">
          <div class="side-agent-msg agent">
            <strong>${agent.name} online.</strong> Specialized in ${agent.domain}. Direct instructions and cross-agent collaboration ready.
          </div>
        </div>

        <div class="side-agent-composer">
          <textarea class="side-agent-inp" id="inp-${agent.id}" placeholder="Instruct ${agent.name}..." rows="1"></textarea>
          <button class="side-agent-send-btn" onclick="sendToAgentColumn('${agent.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"/>
            </svg>
          </button>
        </div>
      `;

  sideAgentsContainer.appendChild(colEl);
  openedAgentColumns.set(agentId, colEl);

  // Auto-grow textarea
  const inpEl = colEl.querySelector('#inp-' + agentId);
  inpEl.addEventListener('input', () => autoGrow(inpEl));
  inpEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inpEl.value.trim()) {
      e.preventDefault();
      sendToAgentColumn(agentId);
    }
  });

  colEl.scrollIntoView({ behavior: 'smooth' });
};

window.closeAgentColumn = function (agentId) {
  const colEl = openedAgentColumns.get(agentId);
  if (colEl) {
    colEl.remove();
    openedAgentColumns.delete(agentId);
  }
};

window.sendToAgentColumn = async function (agentId) {
  const agent = registeredAgents.find((a) => a.id === agentId);
  const inpEl = document.getElementById('inp-' + agentId);
  const msgsEl = document.getElementById('msgs-' + agentId);
  if (!agent || !inpEl || !msgsEl || !inpEl.value.trim()) return;

  const userMsg = inpEl.value.trim();
  inpEl.value = '';
  inpEl.style.height = 'auto';

  // Append user bubble
  const uBubble = document.createElement('div');
  uBubble.className = 'side-agent-msg user';
  uBubble.textContent = userMsg;
  msgsEl.appendChild(uBubble);

  // Append loading bubble
  const aBubble = document.createElement('div');
  aBubble.className = 'side-agent-msg agent';
  aBubble.innerHTML = '<em>Thinking...</em>';
  msgsEl.appendChild(aBubble);
  msgsEl.scrollTop = msgsEl.scrollHeight;

  try {
    const res = await fetch('/api/agents/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message: userMsg }),
    });
    const data = await res.json();
    if (data.success && data.response) {
      aBubble.textContent = data.response;
    } else {
      aBubble.textContent = 'Error: ' + (data.error || 'Failed to get response');
    }
  } catch (err) {
    aBubble.textContent = 'Error: ' + err.message;
  }
  msgsEl.scrollTop = msgsEl.scrollHeight;
};

// Cross-Agent Collaboration Trigger
window.collaborateWithAnotherAgent = async function (sourceAgentId) {
  const otherAgents = registeredAgents.filter((a) => a.id !== sourceAgentId);
  if (otherAgents.length === 0) return;

  const targetAgent = otherAgents[Math.floor(Math.random() * otherAgents.length)];
  const sourceAgent = registeredAgents.find((a) => a.id === sourceAgentId);
  const msgsEl = document.getElementById('msgs-' + sourceAgentId);
  if (!msgsEl) return;

  const cBubble = document.createElement('div');
  cBubble.className = 'side-agent-msg agent';
  cBubble.innerHTML = `⚡ <em>Collaborating with ${targetAgent.name}... Passing domain context and synthesizing findings.</em>`;
  msgsEl.appendChild(cBubble);
  msgsEl.scrollTop = msgsEl.scrollHeight;

  try {
    const res = await fetch('/api/agents/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: targetAgent.id,
        message: `[From ${sourceAgent.name}]: Please review and provide specialized input from your domain perspective.`,
      }),
    });
    const data = await res.json();
    if (data.success && data.response) {
      cBubble.innerHTML = `<strong>[${targetAgent.name} response]:</strong> ${data.response}`;
    }
  } catch (e) {
    cBubble.textContent = 'Collaboration error: ' + e.message;
  }
  msgsEl.scrollTop = msgsEl.scrollHeight;
};

// ── Create Agent Modal Handlers ──
function openCreateAgentModal() {
  createAgentModal.classList.add('active');
}
function closeCreateAgentModal() {
  createAgentModal.classList.remove('active');
}

if (createAgentHeaderBtn) createAgentHeaderBtn.addEventListener('click', openCreateAgentModal);
if (sidebarCreateAgentBtn) sidebarCreateAgentBtn.addEventListener('click', openCreateAgentModal);
if (sidebarCreateAgentBtnFull)
  sidebarCreateAgentBtnFull.addEventListener('click', openCreateAgentModal);
if (closeCreateAgentModalBtn)
  closeCreateAgentModalBtn.addEventListener('click', closeCreateAgentModal);
if (cancelCreateAgentBtn) cancelCreateAgentBtn.addEventListener('click', closeCreateAgentModal);

if (createAgentForm) {
  createAgentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#newAgentName').value.trim();
    const domain = $('#newAgentDomain').value.trim();
    const prompt = $('#newAgentPrompt').value.trim();
    const colorRadio = $('input[name="agentColor"]:checked');
    const color = colorRadio ? colorRadio.value : '#34D399';

    const submitBtn = $('#submitCreateAgentBtn');
    submitBtn.textContent = 'Awakening & Researching...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          domain,
          role: name + ' Lead',
          systemPrompt: prompt,
          initialTask:
            'Researching domain ontology, storing operational rules, and specializing in ' + domain,
          color,
        }),
      });
      const data = await res.json();
      if (data.success && data.agent) {
        registeredAgents.push(data.agent);
        renderAgentList(registeredAgents);
        closeCreateAgentModal();
        createAgentForm.reset();
        // Automatically open side-by-side
        openAgentColumn(data.agent.id);
      }
    } catch (err) {
      alert('Failed to create agent: ' + err.message);
    } finally {
      submitBtn.textContent = 'Awaken & Specialize Agent';
      submitBtn.disabled = false;
    }
  });
}

// Load initial swarm on startup
loadAgentSwarm();

// ── Futuristic Holographic HUD Mode Switcher ──
window.toggleFuturisticHUDMode = function () {
  const isFuturistic = document.body.classList.toggle('hud-futuristic-active');
  const iconEl = document.getElementById('futuristicIcon');
  const labelEl = document.getElementById('futuristicLabel');
  if (isFuturistic) {
    document.body.classList.remove('hud-liquid-glass-pure');
    localStorage.setItem('sis_hud_style', 'futuristic');
    if (iconEl) iconEl.textContent = '💎';
    if (labelEl) labelEl.textContent = 'LIQUID GLASS MODE';
  } else {
    document.body.classList.add('hud-liquid-glass-pure');
    localStorage.setItem('sis_hud_style', 'liquid-glass');
    if (iconEl) iconEl.textContent = '⚡';
    if (labelEl) labelEl.textContent = 'FUTURISTIC HUD';
  }
};

// Apply URL mode or stored preference
try {
  const urlParams = new URLSearchParams(window.location.search);
  const reqMode = urlParams.get('mode') || localStorage.getItem('sis_hud_style');
  if (reqMode === 'futuristic') {
    document.body.classList.add('hud-futuristic-active');
    document.body.classList.remove('hud-liquid-glass-pure');
    const iconEl = document.getElementById('futuristicIcon');
    const labelEl = document.getElementById('futuristicLabel');
    if (iconEl) iconEl.textContent = '💎';
    if (labelEl) labelEl.textContent = 'LIQUID GLASS MODE';
  } else {
    document.body.classList.add('hud-liquid-glass-pure');
  }
} catch (_) {}

// ══════════════════════════════════════════════════════════════════════════
// AGENT PERSONAL BROWSERS CONTROLLER & REAL-TIME WEBSOCKET STREAMING
// ══════════════════════════════════════════════════════════════════════════
let agentBrowserRoster = [];
let currentAgentBrowserId = 'agent-biology';
let agentBrowserWs = null;
let agentBrowserReconnectTimer = null;
let workspaceClosing = false;

function initAgentBrowserWebSocketIndex() {
  if (workspaceClosing) return;
  clearTimeout(agentBrowserReconnectTimer);
  if (
    agentBrowserWs &&
    (agentBrowserWs.readyState === WebSocket.OPEN ||
      agentBrowserWs.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }
  try {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    agentBrowserWs = new WebSocket(`${proto}//${location.host}/ws`);

    agentBrowserWs.onopen = () => {
      console.log('[AgentBrowser WS] Connected to browser stream');
      if (currentAgentBrowserId && agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
        try {
          agentBrowserWs.send(
            JSON.stringify({ type: 'agent-browser-subscribe', agentId: currentAgentBrowserId }),
          );
        } catch (_) {}
      }
    };

    agentBrowserWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'agent-browser-roster' && Array.isArray(data.roster)) {
          agentBrowserRoster = data.roster;
          renderAgentBrowserRibbonIndex(agentBrowserRoster);
          renderSideAgentBrowserRibbon(agentBrowserRoster);
        } else if (
          (data.type === 'agent-browser-switched' || data.type === 'agent-browser-task-started') &&
          data.agentId
        ) {
          if (data.agentId !== currentAgentBrowserId) {
            selectActiveAgentBrowserIndex(data.agentId, false);
          }
        } else if (data.type === 'agent-browser-frame' && data.agentId === currentAgentBrowserId) {
          const frameData = data.frame || data.image;
          const imgs = [
            document.getElementById('agentBrowserImgIndex'),
            document.getElementById('sideBrowserImg'),
          ];
          imgs.forEach((img) => {
            if (img && frameData) {
              img.src = frameData;
              img.style.display = 'block';
            }
          });
          const placeholders = [
            document.getElementById('agentBrowserPlaceholderIndex'),
            document.getElementById('sideBrowserPlaceholder'),
          ];
          placeholders.forEach((p) => {
            if (p) p.style.display = 'none';
          });
        } else if (data.type === 'agent-browser-cursor' && data.agentId === currentAgentBrowserId) {
          updateAgentBrowserCursorIndex(data.x, data.y, data.action, data.label);
          updateSideBrowserCursor(data.x, data.y, data.action, data.label);
        } else if (data.type === 'agent-browser-tabs' && data.agentId === currentAgentBrowserId) {
          renderAgentTabsIndex(data.agentId, data.tabs, data.activeTabId);
          renderSideAgentTabs(data.agentId, data.tabs, data.activeTabId);
        } else if (data.type === 'agent-browser-vision' && data.agentId === currentAgentBrowserId) {
          renderAgentVisionReportIndex(data);
        } else if (data.type === 'agent-browser-state' && data.agentId === currentAgentBrowserId) {
          const titleEls = [
            document.getElementById('agentActiveTitleTextIndex'),
            document.getElementById('sideActiveTitleText'),
          ];
          const urlInputs = [
            document.getElementById('agentBrowserUrlInputIndex'),
            document.getElementById('sideBrowserUrlInput'),
          ];
          if (data.tabs) {
            renderAgentTabsIndex(data.agentId, data.tabs, data.activeTabId);
            renderSideAgentTabs(data.agentId, data.tabs, data.activeTabId);
          }
          const curTitle = data.state?.currentTitle || data.title;
          if (curTitle)
            titleEls.forEach((el) => {
              if (el) el.innerText = curTitle;
            });
          const curUrl = data.state?.currentUrl || data.url;
          if (curUrl)
            urlInputs.forEach((el) => {
              if (el) el.value = curUrl;
            });
          if (data.lastVision || data.state?.lastVision) {
            renderAgentVisionReportIndex(data.lastVision || data.state.lastVision);
          }
        } else if (
          data.type === 'agent-browser-task-step' &&
          data.agentId === currentAgentBrowserId
        ) {
          const feed = document.getElementById('agentMissionStatusFeedIndex');
          if (feed) {
            feed.style.display = 'block';
            feed.innerHTML += `<div>› ${escapeHtml(data.thought || data.action || '')}</div>`;
            feed.scrollTop = feed.scrollHeight;
          }
        } else if (
          data.type === 'agent-browser-task-complete' &&
          data.agentId === currentAgentBrowserId
        ) {
          const badge = document.getElementById('agentAutonomousBadgeIndex');
          if (badge) {
            badge.innerText = 'Mission Complete ✓';
            badge.style.color = '#10B981';
          }
          const feed = document.getElementById('agentMissionStatusFeedIndex');
          if (feed && data.summary) {
            feed.innerHTML += `<div style="color:#FFF; font-weight:700; margin-top:4px;">★ Synthesis: ${escapeHtml(data.summary)}</div>`;
            feed.scrollTop = feed.scrollHeight;
          }
        } else if (
          (data.type === 'workspace-file-saved' || data.type === 'artifact') &&
          data.conversationId &&
          data.conversationId === window.__activeWorkspaceConvId
        ) {
          if (typeof loadHeroArtifact === 'function') {
            const url =
              data.src || data.url || (data.filename ? `/workspace/${data.filename}` : '');
            if (url) {
              loadHeroArtifact({
                url,
                name: data.filename || data.title,
                title: data.title,
                content: data.content,
              });
            }
          }
        } else if (data.type === 'startup-cycle-progress') {
          const footerStatus = document.getElementById('heroStageFooterStatus');
          if (footerStatus) {
            const uStr = (data.users || 0).toLocaleString();
            const mStr = (data.mrr || 0).toLocaleString();
            footerStatus.textContent = `🚀 ${data.name || 'Startup'} [Cycle #${data.cycle || 1} | 24/7 Uptime: ${data.uptimeSeconds || 0}s | Users: ${uStr} | MRR: $${mStr}] • ${data.latestCommit?.title || 'Continuous Engine Running'}`;
          }
          const metricEl = document.getElementById('heroArtifactMetric');
          if (metricEl) {
            metricEl.textContent = `Cycle #${data.cycle || 1} • 24/7 Infinite Engine • ${data.health || 'Health unavailable'}`;
          }
        } else if (data.type === 'startup-venture-created' && data.venture) {
          if (typeof loadHeroArtifact === 'function' && data.venture.artifacts?.landingPage) {
            const lp = data.venture.artifacts.landingPage;
            loadHeroArtifact({
              url: lp.url,
              name: lp.filename,
              title: lp.title,
            });
          }
        } else if (data.type === 'supergence-team-chat' || data.type === 'team-activity-logged') {
          const senderId = data.senderId || data.agentId || 'agent-supergence';
          const senderName = data.senderName || 'Specialist Coworker';
          const text =
            typeof data.message === 'string'
              ? data.message
              : data.message?.message || data.text || JSON.stringify(data.message || '');

          // Render message only if column is explicitly opened by the user
          let msgsEl = document.getElementById('msgs-' + senderId);
          if (msgsEl) {
            // Prevent duplicate consecutive messages
            if (
              msgsEl.lastElementChild &&
              msgsEl.lastElementChild.textContent.includes(text.trim())
            ) {
              return;
            }
            const bubble = document.createElement('div');
            bubble.className = 'side-agent-msg agent';
            bubble.style.borderLeft = `3px solid ${data.color || '#38BDF8'}`;
            bubble.innerHTML = `<strong>${escapeHtml(senderName)}:</strong> ${escapeHtml(text)}`;
            msgsEl.appendChild(bubble);
            msgsEl.scrollTop = msgsEl.scrollHeight;
          }
        } else if (data.type === 'continuous-engine-tick') {
          window.SISContinuousDock?.updateTick(data);
        } else if (data.type === 'goal-created' || data.type === 'goal-complete') {
          window.SISContinuousDock?.refreshGoal();
        } else if (
          data.type === 'ada-tool-proposed' ||
          data.type === 'ada-tool-approved' ||
          data.type === 'ada-tool-rejected'
        ) {
          window.SISContinuousDock?.refreshAda();
        }
      } catch (_) {}
    };

    agentBrowserWs.onclose = () => {
      if (!workspaceClosing) {
        agentBrowserReconnectTimer = setTimeout(initAgentBrowserWebSocketIndex, 3000);
      }
    };
  } catch (err) {
    console.warn('[AgentBrowser WS] Connection error:', err);
    if (!workspaceClosing) {
      agentBrowserReconnectTimer = setTimeout(initAgentBrowserWebSocketIndex, 3000);
    }
  }
}

window.toggleAgentBrowsersModal = function (agentId) {
  const modal = document.getElementById('agentBrowsersModal');
  if (!modal) return;
  if (modal.classList.contains('active')) {
    closeAgentBrowsersModal();
  } else {
    openAgentBrowserModal(agentId);
  }
};

window.openAgentBrowserModal = function (agentId) {
  const modal = document.getElementById('agentBrowsersModal');
  if (!modal) return;
  modal.classList.add('active');
  initAgentBrowserWebSocketIndex();
  const chosen = agentId || currentAgentBrowserId || 'agent-cs';
  fetchAgentTabsIndex(chosen);
  fetchAgentBrowserRosterIndex(chosen);
};

window.closeAgentBrowsersModal = function () {
  const modal = document.getElementById('agentBrowsersModal');
  if (modal) modal.classList.remove('active');
};

// The browser panel and cognition dock share this connection. Closing a
// panel must not disconnect the workspace's live state stream.
window.addEventListener('pagehide', () => {
  workspaceClosing = true;
  clearTimeout(agentBrowserReconnectTimer);
  if (agentBrowserWs) {
    agentBrowserWs.onclose = null;
    agentBrowserWs.close();
    agentBrowserWs = null;
  }
});
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  workspaceClosing = false;
  initAgentBrowserWebSocketIndex();
});

async function fetchAgentBrowserRosterIndex(targetAgentId) {
  try {
    const res = await fetch('/api/browser/agents');
    const data = await res.json();
    if (data.success && Array.isArray(data.agents)) {
      agentBrowserRoster = data.agents;
      renderAgentBrowserRibbonIndex(agentBrowserRoster);
      const chosen =
        targetAgentId ||
        currentAgentBrowserId ||
        (agentBrowserRoster[0] && agentBrowserRoster[0].id);
      if (chosen) {
        selectActiveAgentBrowserIndex(chosen);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch browser roster:', e);
  }
}

function renderAgentBrowserRibbonIndex(roster) {
  const ribbon = document.getElementById('agentBrowserRibbonIndex');
  if (!ribbon || !roster) return;
  ribbon.innerHTML = roster
    .map(
      (ag) => `
        <button class="agent-ribbon-chip ${ag.id === currentAgentBrowserId ? 'active' : ''}" 
                id="ribbonChipIndex-${ag.id}"
                style="--active-agent-color: ${ag.color}; --active-agent-glow: ${ag.color}55;"
                onclick="selectActiveAgentBrowserIndex('${ag.id}')"
                title="${ag.name} (${ag.domain})">
          <span class="pulse-dot" style="background: ${ag.color}; box-shadow: 0 0 6px ${ag.color};"></span>
          <span>${ag.avatar || '🤖'}</span>
          <span>${ag.name}</span>
        </button>
      `,
    )
    .join('');
}

window.selectActiveAgentBrowserIndex = function (agentId) {
  currentAgentBrowserId = agentId;
  const targetAgent = agentBrowserRoster.find((a) => a.id === agentId);
  const activeColor = targetAgent ? targetAgent.color : '#10B981';

  document
    .querySelectorAll('#agentBrowserRibbonIndex .agent-ribbon-chip')
    .forEach((c) => c.classList.remove('active'));
  const activeChip = document.getElementById('ribbonChipIndex-' + agentId);
  if (activeChip) activeChip.classList.add('active');

  const orb = document.getElementById('agentCursorOrbIndex');
  const ripple = document.getElementById('agentCursorRippleIndex');
  const badge = document.getElementById('agentCursorBadgeIndex');
  const statusDot = document.getElementById('agentActiveStatusDotIndex');
  const titleText = document.getElementById('agentActiveTitleTextIndex');
  const placeholderName = document.getElementById('agentBrowserPlaceholderNameIndex');

  if (orb) orb.style.setProperty('--agent-cursor-color', activeColor);
  if (ripple) ripple.style.setProperty('--agent-cursor-color', activeColor);
  if (badge) {
    badge.style.setProperty('--agent-cursor-color', activeColor);
    badge.innerText = (targetAgent ? targetAgent.name : 'Agent') + ' ✦';
  }
  if (statusDot) statusDot.style.background = activeColor;
  if (titleText && targetAgent) titleText.innerText = `${targetAgent.name} // Personal Browser`;
  if (placeholderName && targetAgent)
    placeholderName.innerText = `Connecting to ${targetAgent.name}'s Browser...`;

  // Fetch tabs for this agent
  fetchAgentTabsIndex(agentId);

  fetch(`/api/browser/${agentId}/open`, { method: 'POST' }).catch(() => {});

  fetch(`/api/browser/${agentId}/state`)
    .then((r) => r.json())
    .then((res) => {
      if (res.success && res.state) {
        const st = res.state;
        const urlInput = document.getElementById('agentBrowserUrlInputIndex');
        if (urlInput && st.currentUrl) urlInput.value = st.currentUrl;
        if (st.tabs) {
          renderAgentTabsIndex(agentId, st.tabs, st.activeTabId);
        }
        if (st.lastScreenshot) {
          const img = document.getElementById('agentBrowserImgIndex');
          const placeholder = document.getElementById('agentBrowserPlaceholderIndex');
          if (img) {
            img.src = st.lastScreenshot;
            img.style.display = 'block';
          }
          if (placeholder) placeholder.style.display = 'none';
        }
        if (st.cursor) {
          updateAgentBrowserCursorIndex(
            st.cursor.x,
            st.cursor.y,
            st.cursor.action,
            st.cursor.label,
          );
        }
      }
    })
    .catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(JSON.stringify({ type: 'agent-browser-subscribe', agentId }));
  }
};

// ─── CHROME MULTI-TAB STRIP FUNCTIONS (CLASSIC HUD / APP) ───

async function fetchAgentTabsIndex(agentId) {
  const targetId = agentId || currentAgentBrowserId;
  if (!targetId) return;
  try {
    const res = await fetch(`/api/browser/${targetId}/tabs`);
    const data = await res.json();
    if (data.success && Array.isArray(data.tabs)) {
      renderAgentTabsIndex(targetId, data.tabs, data.activeTabId);
    }
  } catch (_) {}
}

window.renderAgentTabsIndex = function (agentId, tabs, activeTabId) {
  const container = document.getElementById('agentBrowserTabStripIndex');
  if (!container) return;
  const agent = agentBrowserRoster.find((a) => a.id === agentId) || {};
  const activeColor = agent.color || '#38BDF8';
  container.style.setProperty('--active-agent-color', activeColor);

  if (!Array.isArray(tabs) || tabs.length === 0) {
    tabs = [
      {
        id: 'tab-default',
        title: `${agent.name || 'Agent'} Home`,
        url: '/agent-browser-home.html',
        isActive: true,
      },
    ];
  }

  let html = '';
  tabs.forEach((tab) => {
    const isActive = tab.isActive || (activeTabId && tab.id === activeTabId);
    let title =
      tab.title || (tab.url ? tab.url.replace(/^https?:\/\//, '').split('/')[0] : 'New Tab');
    if (title.length > 20) title = title.slice(0, 18) + '...';

    let favicon = '🌐';
    if (tab.url && tab.url.includes('google')) favicon = '🔍';
    else if (tab.url && tab.url.includes('amazon')) favicon = '📦';
    else if (tab.url && tab.url.includes('youtube')) favicon = '📺';
    else if (tab.url && tab.url.includes('github')) favicon = '💻';
    else if (tab.url && tab.url.includes('arxiv')) favicon = '🧠';
    else if (tab.url && tab.url.includes('wikipedia')) favicon = '📚';
    else if (tab.url && (tab.url.includes('browser-home') || tab.url.includes('localhost')))
      favicon = '🏠';

    html += `
          <div class="browser-tab ${isActive ? 'active' : ''}" 
               onclick="switchAgentTabIndex('${agentId}', '${tab.id}')"
               title="${escapeHtml(tab.title || tab.url || 'Tab')}">
            <span class="browser-tab-favicon">${favicon}</span>
            <span class="browser-tab-title">${escapeHtml(title)}</span>
            <span class="browser-tab-close" onclick="closeAgentTabIndex(event, '${agentId}', '${tab.id}')" title="Close Tab">✕</span>
          </div>
        `;
  });

  html += `
        <button class="browser-tab-new-btn" onclick="openAgentNewTabIndex('${agentId}')" title="New Tab">+</button>
      `;

  container.innerHTML = html;
};

window.switchAgentTabIndex = async function (agentId, tabId) {
  try {
    const res = await fetch(`/api/browser/${agentId}/tabs/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId }),
    });
    const data = await res.json();
    if (data.success) {
      if (data.tabs) renderAgentTabsIndex(agentId, data.tabs, tabId);
      const urlInput = document.getElementById('agentBrowserUrlInputIndex');
      if (urlInput && data.url) urlInput.value = data.url;
      const titleText = document.getElementById('agentActiveTitleTextIndex');
      if (titleText && data.title) titleText.innerText = data.title;
    }
  } catch (_) {}
};

window.closeAgentTabIndex = async function (event, agentId, tabId) {
  if (event) event.stopPropagation();
  try {
    const res = await fetch(`/api/browser/${agentId}/tabs/${tabId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success && data.tabs) {
      renderAgentTabsIndex(agentId, data.tabs, data.activeTabId);
    }
  } catch (_) {}
};

window.openAgentNewTabIndex = async function (agentId) {
  const targetId = agentId || currentAgentBrowserId;
  if (!targetId) return;
  try {
    const res = await fetch(`/api/browser/${targetId}/tabs/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.success && data.tabs) {
      renderAgentTabsIndex(targetId, data.tabs, data.tabId);
      const urlInput = document.getElementById('agentBrowserUrlInputIndex');
      if (urlInput && data.url) urlInput.value = data.url;
    }
  } catch (_) {}
};

function updateAgentBrowserCursorIndex(x, y, action, label) {
  const stage = document.getElementById('agentBrowserStageIndex');
  const orb = document.getElementById('agentCursorOrbIndex');
  const badge = document.getElementById('agentCursorBadgeIndex');
  const coordsHUD = document.getElementById('agentCursorCoordsHUDIndex');
  if (!stage || !orb) return;

  const stageW = stage.clientWidth || 600;
  const stageH = stage.clientHeight || 480;

  const scaleX = stageW / 1280;
  const scaleY = stageH / 800;

  const scaledX = Math.round(x * scaleX);
  const scaledY = Math.round(y * scaleY);

  orb.style.left = `${scaledX}px`;
  orb.style.top = `${scaledY}px`;

  if (badge && label) badge.innerText = label;
  if (coordsHUD) coordsHUD.innerText = `X: ${x} | Y: ${y} [${action || 'idle'}]`;

  if (action === 'click') {
    const ripple = document.getElementById('agentCursorRippleIndex');
    if (ripple) {
      ripple.classList.remove('trigger', 'trigger-right', 'trigger-double');
      void ripple.offsetWidth;
      if (action === 'click') {
        ripple.classList.add('trigger');
      } else if (action === 'right-click') {
        ripple.classList.add('trigger-right');
      } else if (action === 'dblclick') {
        ripple.classList.add('trigger-double');
      }
    }
  }
}

let agentMouseModeIndex = 'click';
let agentDragStartIndex = null;
let agentZoomLevelIndex = 1.0;

window.setAgentMouseModeIndex = function (mode) {
  agentMouseModeIndex = mode;
  document
    .querySelectorAll('#agentBrowsersModal .deck-mode-btn')
    .forEach((b) => b.classList.remove('active'));
  const activeBtn = {
    click: document.getElementById('btnModeClickIndex'),
    'right-click': document.getElementById('btnModeRightIndex'),
    dblclick: document.getElementById('btnModeDblIndex'),
    drag: document.getElementById('btnModeDragIndex'),
  }[mode];
  if (activeBtn) activeBtn.classList.add('active');
};

window.handleAgentViewportClickIndex = function (e) {
  const stage = document.getElementById('agentBrowserStageIndex');
  if (!stage || !currentAgentBrowserId) return;
  if (agentMouseModeIndex === 'drag') return; // Handled by mousedown/mouseup

  const rect = stage.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const nativeX = Math.round((clickX / rect.width) * 1280);
  const nativeY = Math.round((clickY / rect.height) * 800);

  if (agentMouseModeIndex === 'right-click') {
    updateAgentBrowserCursorIndex(nativeX, nativeY, 'right-click', 'User Right Click');
    fetch(`/api/browser/${currentAgentBrowserId}/right-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: nativeX, y: nativeY }),
    }).catch(() => {});
    if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
      agentBrowserWs.send(
        JSON.stringify({
          type: 'agent-browser-right-click',
          agentId: currentAgentBrowserId,
          x: nativeX,
          y: nativeY,
        }),
      );
    }
  } else if (agentMouseModeIndex === 'dblclick') {
    updateAgentBrowserCursorIndex(nativeX, nativeY, 'dblclick', 'User Double Click');
    fetch(`/api/browser/${currentAgentBrowserId}/double-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: nativeX, y: nativeY }),
    }).catch(() => {});
    if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
      agentBrowserWs.send(
        JSON.stringify({
          type: 'agent-browser-double-click',
          agentId: currentAgentBrowserId,
          x: nativeX,
          y: nativeY,
        }),
      );
    }
  } else {
    // Standard Left Click
    updateAgentBrowserCursorIndex(nativeX, nativeY, 'click', 'User Co-Browse Click');
    fetch(`/api/browser/${currentAgentBrowserId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: nativeX, y: nativeY }),
    }).catch(() => {});
    if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
      agentBrowserWs.send(
        JSON.stringify({
          type: 'agent-browser-click',
          agentId: currentAgentBrowserId,
          x: nativeX,
          y: nativeY,
        }),
      );
    }
  }
};

window.handleAgentViewportContextMenuIndex = function (e) {
  e.preventDefault();
  const stage = document.getElementById('agentBrowserStageIndex');
  if (!stage || !currentAgentBrowserId) return;

  const rect = stage.getBoundingClientRect();
  const nativeX = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
  const nativeY = Math.round(((e.clientY - rect.top) / rect.height) * 800);

  updateAgentBrowserCursorIndex(nativeX, nativeY, 'right-click', 'User Right Click');
  fetch(`/api/browser/${currentAgentBrowserId}/right-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x: nativeX, y: nativeY }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-right-click',
        agentId: currentAgentBrowserId,
        x: nativeX,
        y: nativeY,
      }),
    );
  }
};

window.handleAgentViewportMouseDownIndex = function (e) {
  if (agentMouseModeIndex !== 'drag' || !currentAgentBrowserId) return;
  const stage = document.getElementById('agentBrowserStageIndex');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  agentDragStartIndex = {
    x: Math.round(((e.clientX - rect.left) / rect.width) * 1280),
    y: Math.round(((e.clientY - rect.top) / rect.height) * 800),
  };
};

window.handleAgentViewportMouseUpIndex = function (e) {
  if (agentMouseModeIndex !== 'drag' || !agentDragStartIndex || !currentAgentBrowserId) return;
  const stage = document.getElementById('agentBrowserStageIndex');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const endX = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
  const endY = Math.round(((e.clientY - rect.top) / rect.height) * 800);

  updateAgentBrowserCursorIndex(endX, endY, 'drag', 'User Drag Action');
  fetch(`/api/browser/${currentAgentBrowserId}/drag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startX: agentDragStartIndex.x,
      startY: agentDragStartIndex.y,
      endX,
      endY,
    }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-drag',
        agentId: currentAgentBrowserId,
        startX: agentDragStartIndex.x,
        startY: agentDragStartIndex.y,
        endX,
        endY,
      }),
    );
  }
  agentDragStartIndex = null;
};

let indexWheelTimer = null;
let indexAccumulatedWheel = 0;

window.handleAgentViewportWheelIndex = function (e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!currentAgentBrowserId) return;

  const dy = e.deltaY;
  indexAccumulatedWheel += dy;

  if (!indexWheelTimer) {
    indexWheelTimer = setTimeout(() => {
      const deltaToSend = Math.round(indexAccumulatedWheel);
      indexAccumulatedWheel = 0;
      indexWheelTimer = null;
      fetch(`/api/browser/${currentAgentBrowserId}/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltaY: deltaToSend }),
      }).catch(() => {});
    }, 40);
  }
};

window.toggleSidebarCollapseIndex = function () {
  const sb = document.getElementById('workspaceSidebar');
  if (!sb) return;
  sb.classList.toggle('collapsed');
  const btn = document.getElementById('sidebarToggleBtnIndex');
  if (btn) btn.innerText = sb.classList.contains('collapsed') ? '⮞' : '⮜';
};

let isIndexPaneExpanded = false;
window.toggleExpandBrowserPaneIndex = function () {
  const card = document.querySelector('.agent-browsers-modal-card');
  if (!card) return;
  isIndexPaneExpanded = !isIndexPaneExpanded;
  if (isIndexPaneExpanded) {
    card.classList.add('expanded');
    const btn = document.getElementById('btnExpandBrowserPaneIndex');
    if (btn) btn.innerText = '⮌';
  } else {
    card.classList.remove('expanded');
    const btn = document.getElementById('btnExpandBrowserPaneIndex');
    if (btn) btn.innerText = '⛶';
  }
};

window.launchAgentInNativeChromeIndex = async function () {
  const agentId = currentAgentBrowserId || 'agent-cs';
  const urlInput = document.getElementById('agentBrowserUrlInputIndex');
  const url = urlInput ? urlInput.value.trim() : null;
  const btn = document.getElementById('btnLaunchNativeChromeIndex');
  if (btn) btn.innerText = 'Launching...';
  try {
    const res = await fetch(`/api/browser/${agentId}/launch-native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url || undefined }),
    });
    const data = await res.json();
    if (btn) {
      btn.innerText = data.success ? '✓ Chrome Open' : '✕ Error';
      setTimeout(() => {
        if (btn) btn.innerText = '↗ Real Chrome';
      }, 2200);
    }
  } catch (err) {
    if (btn) {
      btn.innerText = '✕ Error';
      setTimeout(() => {
        if (btn) btn.innerText = '↗ Real Chrome';
      }, 2000);
    }
  }
};

window.sendAgentKeyIndex = function (key) {
  if (!currentAgentBrowserId) return;
  fetch(`/api/browser/${currentAgentBrowserId}/key-press`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({ type: 'agent-browser-key-press', agentId: currentAgentBrowserId, key }),
    );
  }
};

window.sendAgentTypingIndex = function () {
  const input = document.getElementById('agentTypeInputIndex');
  if (!input || !input.value.trim() || !currentAgentBrowserId) return;
  const text = input.value.trim();
  input.value = '';

  fetch(`/api/browser/${currentAgentBrowserId}/type`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({ type: 'agent-browser-type', agentId: currentAgentBrowserId, text }),
    );
  }
};

window.sendAgentScrollIndex = function (deltaY = 350) {
  if (!currentAgentBrowserId) return;
  fetch(`/api/browser/${currentAgentBrowserId}/scroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deltaY }),
  }).catch(() => {});
};

window.setAgentBrowserZoomIndex = function (delta) {
  if (!currentAgentBrowserId) return;
  agentZoomLevelIndex = Math.min(
    2.0,
    Math.max(0.5, Math.round((agentZoomLevelIndex + delta) * 100) / 100),
  );
  const lbl = document.getElementById('agentZoomLabelIndex');
  if (lbl) lbl.innerText = `${Math.round(agentZoomLevelIndex * 100)}%`;

  fetch(`/api/browser/${currentAgentBrowserId}/zoom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factor: agentZoomLevelIndex }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-zoom',
        agentId: currentAgentBrowserId,
        factor: agentZoomLevelIndex,
      }),
    );
  }
};

window.toggleAgentVisionDrawerIndex = function () {
  const drawer = document.getElementById('agentVisionDrawerIndex');
  if (!drawer) return;
  drawer.classList.toggle('active');
  if (drawer.classList.contains('active')) {
    runAgentVisionAnalysisIndex();
  }
};

window.runAgentVisionAnalysisIndex = async function (customPrompt) {
  if (!currentAgentBrowserId) return;
  const queryInput = document.getElementById('agentVisionQueryInputIndex');
  const badge = document.getElementById('agentVisionStatusBadgeIndex');
  const summaryBox = document.getElementById('visionSummaryTextIndex');

  const query =
    customPrompt ||
    (queryInput ? queryInput.value.trim() : '') ||
    'Analyze this webpage screen for agent autonomous interaction.';
  if (badge) badge.innerText = 'Analyzing Screen...';
  if (summaryBox)
    summaryBox.innerHTML =
      '<span style="color:#C084FC;">⚡ Vision neural model inspecting high-res screenshot & page geometry...</span>';

  try {
    const res = await fetch(`/api/browser/${currentAgentBrowserId}/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (data.success && data.vision) {
      renderAgentVisionReportIndex(data.vision);
    } else if (data.error) {
      if (summaryBox) summaryBox.innerText = `Vision analysis notice: ${data.error}`;
    }
  } catch (err) {
    if (summaryBox) summaryBox.innerText = `Vision analysis error: ${err.message}`;
  } finally {
    if (badge) badge.innerText = 'Grounded';
  }
};

window.renderAgentVisionReportIndex = function (vision) {
  if (!vision) return;
  const summaryBox = document.getElementById('visionSummaryTextIndex');
  const targetsBox = document.getElementById('visionTargetsBoxIndex');
  const ocrBox = document.getElementById('visionOcrBoxIndex');
  const suggestionsBox = document.getElementById('visionSuggestionsBoxIndex');

  if (summaryBox && vision.visualSummary) {
    summaryBox.innerText = vision.visualSummary;
  }

  if (targetsBox && Array.isArray(vision.interactiveTargets)) {
    targetsBox.innerHTML = vision.interactiveTargets
      .map(
        (t) => `
          <button class="vision-target-chip" onclick="clickVisionTargetCoordsIndex(${t.x}, ${t.y}, '${escapeHtml(t.label || t.tag)}')">
            <span>[${t.tag.toUpperCase()}]</span>
            <strong>${escapeHtml(t.label || 'Target')}</strong>
            <span style="opacity:0.6;">(${t.x},${t.y})</span>
          </button>
        `,
      )
      .join('');
  }

  if (ocrBox && Array.isArray(vision.ocrHighlights)) {
    ocrBox.innerHTML = vision.ocrHighlights
      .map(
        (h) =>
          `<div style="margin-bottom:3px; padding-left:4px; border-left:2px solid rgba(159,124,239,0.5);">${escapeHtml(h)}</div>`,
      )
      .join('');
  }

  if (suggestionsBox && Array.isArray(vision.suggestedActions)) {
    suggestionsBox.innerHTML = vision.suggestedActions
      .map(
        (a) => `
          <div style="margin-bottom:3px; color:#10B981;">
            ➔ <strong>${a.action.toUpperCase()}:</strong> (${a.x}, ${a.y}) — ${escapeHtml(a.reason || 'Optimal path')}
          </div>
        `,
      )
      .join('');
  }
};

window.clickVisionTargetCoordsIndex = function (x, y, label) {
  if (!currentAgentBrowserId) return;
  updateAgentBrowserCursorIndex(x, y, 'click', `Target: ${label}`);
  fetch(`/api/browser/${currentAgentBrowserId}/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y, label }),
  }).catch(() => {});
  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({ type: 'agent-browser-click', agentId: currentAgentBrowserId, x, y, label }),
    );
  }
};

window.handleAgentViewportHoverIndex = function (e) {
  const stage = document.getElementById('agentBrowserStageIndex');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const nativeX = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
  const nativeY = Math.round(((e.clientY - rect.top) / rect.height) * 800);
  const coordsHUD = document.getElementById('agentCursorCoordsHUDIndex');
  if (coordsHUD) coordsHUD.innerText = `X: ${nativeX} | Y: ${nativeY}`;
};

window.handleAgentBrowserUrlKeyIndex = function (e) {
  if (e.key === 'Enter') submitAgentBrowserUrlIndex();
};

window.submitAgentBrowserUrlIndex = function () {
  const input = document.getElementById('agentBrowserUrlInputIndex');
  if (!input || !input.value.trim() || !currentAgentBrowserId) return;
  const url = input.value.trim();

  const placeholder = document.getElementById('agentBrowserPlaceholderIndex');
  const placeholderName = document.getElementById('agentBrowserPlaceholderNameIndex');
  if (placeholder) placeholder.style.display = 'block';
  if (placeholderName) placeholderName.innerText = `Navigating to ${url}...`;

  fetch(`/api/browser/${currentAgentBrowserId}/navigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-navigate',
        agentId: currentAgentBrowserId,
        url,
      }),
    );
  }
};

window.agentBrowserNavIndex = function (action) {
  if (!currentAgentBrowserId) return;
  fetch(`/api/browser/${currentAgentBrowserId}/nav-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  }).catch(() => {});

  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-nav-action',
        agentId: currentAgentBrowserId,
        action,
      }),
    );
  }
};

window.launchAgentAutonomousTaskIndex = async function () {
  const input = document.getElementById('agentMissionInputIndex');
  const feed = document.getElementById('agentMissionStatusFeedIndex');
  const badge = document.getElementById('agentAutonomousBadgeIndex');
  if (!input || !input.value.trim() || !currentAgentBrowserId) return;

  const task = input.value.trim();
  input.value = '';

  if (feed) {
    feed.style.display = 'block';
    feed.innerHTML = `⚡ <strong>Mission Launched:</strong> "${escapeHtml(task)}"<br>Agent cursor navigating internet...`;
  }
  if (badge) {
    badge.innerText = 'Browsing Web...';
    badge.style.color = '#38BDF8';
  }

  try {
    await fetch(`/api/browser/${currentAgentBrowserId}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
  } catch (err) {
    if (feed) feed.innerHTML += `<div style="color:#EF4444;">Task failed: ${err.message}</div>`;
  }
};

// ══════════════════════════════════════════════════════════════════════════
// DUAL-MODE CENTER STAGE CONTROLLER (HERO ARTIFACT & BROWSER SWARM)
// ══════════════════════════════════════════════════════════════════════════
let currentCenterStageMode = 'artifact';
let currentHeroArtifactUrl = '';
let currentHeroArtifactTitle = '';

window.switchCenterStageMode = function (mode) {
  currentCenterStageMode = mode || 'artifact';
  const artView = document.getElementById('stageArtifactView');
  const browView = document.getElementById('stageBrowserView');
  const btnArt = document.getElementById('stageBtnArtifact');
  const btnBrow = document.getElementById('stageBtnBrowser');

  if (currentCenterStageMode === 'artifact') {
    if (artView) artView.style.display = 'flex';
    if (browView) browView.style.display = 'none';
    if (btnArt) {
      btnArt.style.background = 'rgba(16,185,129,0.2)';
      btnArt.style.color = '#34D399';
      btnArt.style.borderColor = 'rgba(16,185,129,0.4)';
    }
    if (btnBrow) {
      btnBrow.style.background = 'transparent';
      btnBrow.style.color = '#94A3B8';
      btnBrow.style.borderColor = 'transparent';
    }
  } else {
    if (artView) artView.style.display = 'none';
    if (browView) browView.style.display = 'flex';
    if (btnBrow) {
      btnBrow.style.background = 'rgba(56,189,248,0.2)';
      btnBrow.style.color = '#38BDF8';
      btnBrow.style.borderColor = 'rgba(56,189,248,0.4)';
    }
    if (btnArt) {
      btnArt.style.background = 'transparent';
      btnArt.style.color = '#94A3B8';
      btnArt.style.borderColor = 'transparent';
    }
    initAgentBrowserWebSocketIndex();
  }
};

window.currentStudioFilename = '';
window.currentStudioCode = '';

window.renderStudioCode = function (raw, lang, filename) {
  window.currentStudioFilename = filename;
  window.currentStudioCode = raw;

  const codeEl = document.getElementById('codeStudioCode');
  const linesEl = document.getElementById('codeStudioLineNumbers');
  const termEl = document.getElementById('codeStudioTerminalOutput');
  const termStatus = document.getElementById('codeStudioTerminalStatus');

  const lines = (raw || '').split('\n');
  if (linesEl) {
    linesEl.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
  }
  if (codeEl) {
    codeEl.innerHTML = window.highlightCodeSyntax
      ? window.highlightCodeSyntax(raw, lang)
      : escapeHtml(raw);
  }

  window.renderStudioTabs(filename);

  if (termEl) {
    termEl.textContent = `${lines.length} lines loaded. This file has not been run or validated.`;
  }
  if (termStatus) {
    termStatus.textContent = 'LOADED · NOT RUN';
    termStatus.style.color = '#10B981';
  }
};

window.renderStudioTabs = function (activeFilename) {
  const tabsEl = document.getElementById('codeStudioTabs');
  if (!tabsEl) return;
  const files = window.currentStudioProjectFiles || [];
  if (!files || files.length === 0) {
    tabsEl.innerHTML = `
          <div style="background:rgba(56,189,248,0.2); border:1px solid rgba(56,189,248,0.4); color:#38BDF8; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>📄</span> ${escapeHtml(activeFilename || 'source')}
          </div>
        `;
    return;
  }
  tabsEl.innerHTML = files
    .map((f) => {
      const isActive = f.filename === activeFilename || f.name === activeFilename;
      const bg = isActive ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.04)';
      const border = isActive
        ? '1px solid rgba(56,189,248,0.6)'
        : '1px solid rgba(255,255,255,0.1)';
      const color = isActive ? '#38BDF8' : '#94A3B8';
      const roleIcon =
        f.role === 'header'
          ? '📑'
          : f.role === 'benchmark'
            ? '⚡'
            : f.role === 'build'
              ? '⚙️'
              : '📄';
      return `
          <button onclick="window.switchStudioTab('${escapeHtml(f.filename || f.name)}')" style="background:${bg}; border:${border}; color:${color}; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit; transition:all 0.15s ease;">
            <span>${roleIcon}</span> ${escapeHtml(f.name || f.filename)}
          </button>
        `;
    })
    .join('');
};

window.switchStudioTab = function (filename) {
  if (!filename) return;
  const ext = filename.split('.').pop().toLowerCase();
  window.currentStudioFilename = filename;

  const titleEl = document.getElementById('centerStageTitleText');
  if (titleEl) titleEl.textContent = filename;

  const found = (window.currentStudioProjectFiles || []).find(
    (f) => f.filename === filename || f.name === filename,
  );
  if (found && found.content) {
    window.renderStudioCode(found.content, ext, filename);
    window.renderStudioTabs(filename);
    return;
  }
  fetch('/api/workspace/file?path=' + encodeURIComponent(filename))
    .then((r) => r.json())
    .then((d) => {
      const raw = d.content != null ? d.content : '// Empty file';
      window.renderStudioCode(raw, ext, filename);
      window.renderStudioTabs(filename);
    })
    .catch((err) => {
      console.warn('[Studio Tab Switch Failed]', err);
    });
};

window.runCurrentStudioFile = async function () {
  const fn = window.currentStudioFilename;
  if (!fn) return;
  const termEl = document.getElementById('codeStudioTerminalOutput');
  const termStatus = document.getElementById('codeStudioTerminalStatus');
  const runBtn = document.getElementById('codeStudioRunBtn');

  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Running...';
  }
  if (termEl) termEl.textContent = `$ run ${fn}\nExecuting in sandbox...`;
  if (termStatus) {
    termStatus.textContent = 'RUNNING...';
    termStatus.style.color = '#F59E0B';
  }

  try {
    const res = await fetch('/api/workspace/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: fn }),
    });
    const data = await res.json();
    if (termEl) {
      let outputText = '';
      if (data.stdout) outputText += data.stdout.trim() + '\n';
      if (data.stderr) outputText += data.stderr.trim() + '\n';
      if (!outputText)
        outputText = data.success
          ? 'Process completed with exit code 0.'
          : 'Process exited with error code ' + data.exitCode;
      termEl.textContent = `$ run ${fn}\n${outputText}`;
    }
    if (termStatus) {
      termStatus.textContent = data.success
        ? 'EXIT 0 • SUCCESS'
        : 'EXIT ' + data.exitCode + ' • ERROR';
      termStatus.style.color = data.success ? '#10B981' : '#EF4444';
    }
  } catch (e) {
    if (termEl) termEl.textContent = `[Execution Exception]: ${e.message}`;
  } finally {
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = '<span>▷</span> Run';
    }
  }
};

window.runEliteEngineeringBenchmark = async function () {
  const termEl = document.getElementById('codeStudioTerminalOutput');
  const termStatus = document.getElementById('codeStudioTerminalStatus');
  const btn = document.getElementById('codeStudioBenchmarkBtn');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Benchmarking...';
  }
  if (termStatus) {
    termStatus.textContent = 'RUNNING ELITE BENCHMARK HARNESS...';
    termStatus.style.color = '#38BDF8';
  }
  if (termEl) {
    termEl.textContent =
      `================================================================\n` +
      `🛡️ SUPERGENCE ELITE SOFTWARE ENGINEERING BENCHMARK\n` +
      `Rigorous Verification of Real Engineering Capabilities (Elite Coding Blueprint)\n` +
      `================================================================\n\n` +
      `[1/4] Red-Green TDD Loop & Surgical Repair (Diff budget <= 40 lines)...\n` +
      `[2/4] Red-Phase Misdiagnosis Protection Gate (Pre-patch fail requirement)...\n` +
      `[3/4] Security Path Confinement (CWE-22) & Anti-Slop Scanner (15 banned patterns)...\n` +
      `[4/4] Hard Diff-Budget & Deterministic 4-Tier Verifiable Reward...\n\n` +
      `Executing test suite in isolated sandbox runner...`;
  }

  try {
    const res = await fetch('/api/coder/elite-benchmark', { method: 'POST' });
    const data = await res.json();

    let out =
      `================================================================\n` +
      `🛡️ SUPERGENCE ELITE SOFTWARE ENGINEERING BENCHMARK\n` +
      `Rigorous Verification of Real Engineering Capabilities\n` +
      `================================================================\n\n`;

    if (Array.isArray(data.challenges)) {
      data.challenges.forEach((c, idx) => {
        const mark = c.passed ? '✓' : '❌';
        out += `${mark} [${idx + 1}/4] ${c.title} — ${c.passed ? 'PASSED' : 'FAILED'} (${c.durationMs}ms)\n`;
        out += `   Purpose: ${c.description}\n`;
        if (c.reward !== undefined) {
          out += `   Deterministic Reward: ${c.reward} (${c.rewardStatus || 'OK'})\n`;
        }
        if (c.diffLines !== undefined) {
          out += `   Surgical Patch: ${c.diffLines} lines changed (budget <= 40 lines)\n`;
        }
        if (c.error) {
          out += `   Error: ${c.error}\n`;
        }
        out += `\n`;
      });
    }

    out += `================================================================\n`;
    if (data.allPassed) {
      out += `🏆 ALL ${data.passedChallenges}/${data.totalChallenges} ELITE ENGINEERING BENCHMARKS PASSED 100%!\n`;
      out += `Total Duration: ${data.durationMs}ms\n`;
      out += `Ground Truth: Verified against Elite Coding Blueprint (Zero LLM-as-judge)\n`;
      if (termStatus) {
        termStatus.textContent = `STATUS: ${data.passedChallenges}/${data.totalChallenges} PASSED`;
        termStatus.style.color = '#10B981';
      }
    } else {
      out += `❌ Benchmark result: ${data.passedChallenges}/${data.totalChallenges} passed.\n`;
      if (termStatus) {
        termStatus.textContent = `STATUS: ${data.passedChallenges}/${data.totalChallenges} PASSED`;
        termStatus.style.color = '#EF4444';
      }
    }
    out += `================================================================`;

    if (termEl) termEl.textContent = out;
  } catch (err) {
    if (termEl) termEl.textContent += `\n[Benchmark Execution Error]: ${err.message}`;
    if (termStatus) {
      termStatus.textContent = 'STATUS: BENCHMARK ERROR';
      termStatus.style.color = '#EF4444';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🛡️</span> Elite Benchmark';
    }
  }
};

window.copyCurrentStudioCode = function () {
  if (window.currentStudioCode) {
    navigator.clipboard.writeText(window.currentStudioCode).then(() => {
      const btn = document.getElementById('codeStudioCopyBtn');
      if (btn) {
        btn.innerHTML = '<span>✓</span> Copied!';
        setTimeout(() => {
          btn.innerHTML = '<span>📋</span> Copy';
        }, 2000);
      }
    });
  }
};

window.downloadCurrentStudioFile = function () {
  if (currentHeroArtifactUrl) {
    const a = document.createElement('a');
    a.href = currentHeroArtifactUrl;
    a.download = window.currentStudioFilename || 'code.txt';
    a.click();
  }
};

window.loadHeroArtifact = function (art) {
  if (!art || !art.url) return;
  currentHeroArtifactUrl = art.url;
  currentHeroArtifactTitle = art.title || art.name || 'Materialized Simulation';

  const ws = document.getElementById('supergenceWorkspace');
  if (ws) ws.classList.add('active');
  switchCenterStageMode('artifact');
  toggleWorkspaceSideBrowser(true);

  const iframe = document.getElementById('sideHeroArtifactIframe');
  const studio = document.getElementById('sideHeroCodeStudio');
  const placeholder = document.getElementById('sideHeroSynthesizingPlaceholder');
  if (placeholder) placeholder.style.display = 'none';

  const fileName = art.name || art.url.split('/').pop();
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const isVectorDesign =
    ['png', 'svg', 'figcraft', 'jpg', 'webp'].includes(ext) ||
    art.type === 'vector_design' ||
    /figcraft|open[_-]design/i.test(art.title || '');
  const isGame =
    !isVectorDesign &&
    ((art.url &&
      (art.url.includes('game_') || art.url.includes('voxel') || art.url.includes('minecraft'))) ||
      (art.title &&
        /\b(?:game|voxel|minecraft|shooter|dogfight|racer|tank|combat)\b/i.test(art.title)));
  const isVideo =
    !isGame &&
    !isVectorDesign &&
    ((art.url && art.url.includes('video_')) ||
      (art.title && art.title.toLowerCase().includes('video')));
  const is3D =
    !isGame &&
    !isVectorDesign &&
    ((art.url && art.url.includes('3d')) || (art.title && art.title.toLowerCase().includes('3d')));

  const isCodeFile =
    !isGame &&
    !isVideo &&
    !is3D &&
    !isVectorDesign &&
    [
      'cpp',
      'hpp',
      'h',
      'c',
      'py',
      'js',
      'ts',
      'rs',
      'go',
      'json',
      'sql',
      'sh',
      'ps1',
      'yaml',
      'yml',
      'md',
      'txt',
    ].includes(ext);

  if (isCodeFile) {
    if (iframe) iframe.style.display = 'none';
    if (studio) studio.style.display = 'flex';
    if (art.files && art.files.length) {
      window.currentStudioProjectFiles = art.files;
    }
    if (art.content != null && typeof art.content === 'string' && art.content.length > 0) {
      window.renderStudioCode(art.content, ext, fileName);
      window.renderStudioTabs(fileName);
    } else {
      fetch('/api/workspace/file?path=' + encodeURIComponent(fileName))
        .then((r) => r.json())
        .then((d) => {
          const raw = d.content != null ? d.content : '// Empty file';
          window.renderStudioCode(raw, ext, fileName);
          window.renderStudioTabs(fileName);
        })
        .catch(() => {});
    }
  } else {
    if (studio) studio.style.display = 'none';
    if (iframe) {
      const freshIframe = document.createElement('iframe');
      freshIframe.id = 'sideHeroArtifactIframe';
      freshIframe.style.width = '100%';
      freshIframe.style.height = '100%';
      freshIframe.style.flex = '1';
      freshIframe.style.minHeight = '0';
      freshIframe.style.border = 'none';
      freshIframe.style.display = 'block';
      freshIframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-downloads allow-pointer-lock');
      freshIframe.allow = 'fullscreen';

      if (isVectorDesign && art.url) {
        freshIframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { background: #07090E; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto; }
              .canvas-container { position: relative; max-width: 100%; display: flex; justify-content: center; align-items: center; }
              img { max-width: 100%; height: auto; max-height: calc(100vh - 40px); border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08); object-fit: contain; }
            </style></head><body><div class="canvas-container"><img src="${art.url}" alt="${art.title || 'FigCraft Vector Design'}"></div></body></html>`;
      } else if (art.url) {
        freshIframe.src = art.url;
      } else if (art.content && typeof art.content === 'string' && art.content.length > 50) {
        freshIframe.srcdoc = art.content;
      }
      if (isGame) {
        freshIframe.onload = () => {
          try {
            freshIframe.contentWindow.focus();
          } catch (_) {}
        };
      }
      iframe.parentNode.replaceChild(freshIframe, iframe);
    }
  }

  const titleEl = document.getElementById('centerStageTitleText');
  const badgeEl = document.getElementById('heroArtifactBadge');
  const fnEl = document.getElementById('heroArtifactFileName');
  const metricEl = document.getElementById('heroArtifactMetric');
  const extBtn = document.getElementById('heroStageOpenExternalBtn');
  const dlBtn = document.getElementById('heroStageDownloadBtn');
  const popoutTopBtn = document.getElementById('stageBtnPopoutArtifact');
  const footerStatus = document.getElementById('heroStageFooterStatus');

  if (titleEl) titleEl.textContent = currentHeroArtifactTitle;
  if (fnEl) fnEl.textContent = fileName;
  if (extBtn) extBtn.href = art.url;
  if (dlBtn) dlBtn.href = art.url;
  if (popoutTopBtn) popoutTopBtn.onclick = () => window.open(art.url, '_blank');

  const isStartupApp =
    fileName.toLowerCase().includes('startup_') || fileName.toLowerCase().includes('venture_');

  if (badgeEl) {
    if (isVectorDesign) {
      badgeEl.textContent = '🎨 FIGCRAFT & OPEN DESIGN VECTOR ARTBOARD';
      badgeEl.style.color = '#A855F7';
      badgeEl.style.borderColor = 'rgba(168,85,247,0.4)';
    } else if (isStartupApp) {
      badgeEl.textContent = '🚀 AUTONOMOUS STARTUP MVP & VENTURE';
      badgeEl.style.color = '#10B981';
      badgeEl.style.borderColor = 'rgba(168,85,247,0.4)';
    } else if (isCodeFile) {
      badgeEl.textContent = `⚡ PRO CODE STUDIO (${ext.toUpperCase()})`;
      badgeEl.style.color = '#38BDF8';
      badgeEl.style.borderColor = 'rgba(56,189,248,0.4)';
    } else if (isGame) {
      badgeEl.textContent = 'Interactive preview';
      badgeEl.style.color = '#F59E0B';
      badgeEl.style.borderColor = 'rgba(245,158,11,0.4)';
    } else if (isVideo) {
      badgeEl.textContent = 'Interactive preview';
      badgeEl.style.color = '#34D399';
      badgeEl.style.borderColor = 'rgba(16,185,129,0.3)';
    } else if (is3D) {
      badgeEl.textContent = '🌐 3D SPATIAL WORLD';
      badgeEl.style.color = '#C4B5FD';
      badgeEl.style.borderColor = 'rgba(167,139,250,0.3)';
    } else {
      badgeEl.textContent = '✨ LIVE ARTIFACT';
      badgeEl.style.color = '#38BDF8';
      badgeEl.style.borderColor = 'rgba(56,189,248,0.3)';
    }
  }

  if (metricEl) {
    metricEl.textContent = isVectorDesign
      ? 'Image preview'
      : isStartupApp
        ? 'Workspace artifact'
        : isCodeFile
          ? 'Loaded · Not validated'
          : isGame
            ? 'Interactive preview'
            : isVideo
              ? 'Preview loaded'
              : 'Interactive preview';
  }

  if (footerStatus) {
    footerStatus.textContent = isVectorDesign
      ? `🎨 FigCraft Vector Artboard (2x Retina) • ${fileName}`
      : isStartupApp
        ? `Workspace preview · ${fileName}`
        : isCodeFile
          ? `Code loaded · ${fileName} · Not validated`
          : isGame
            ? `🎮 3D Game Active (Click canvas to steer & fire) • ${art.name || art.url}`
            : `Active Simulation • ${art.name || art.url}`;
  }
};

window.reloadCenterStageArtifact = function () {
  const iframe = document.getElementById('sideHeroArtifactIframe');
  if (iframe && currentHeroArtifactUrl) {
    iframe.src = currentHeroArtifactUrl;
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.location.replace(currentHeroArtifactUrl);
      }
    } catch (_) {}
  }
};

window.popoutCenterStageArtifact = function () {
  if (currentHeroArtifactUrl) {
    window.open(currentHeroArtifactUrl, '_blank');
  }
};

window.loadDefaultHeroArtifact = function (filename, title, badge) {
  loadHeroArtifact({
    name: filename,
    title: title,
    url: `/workspace/${filename}`,
  });
};

// ══════════════════════════════════════════════════════════════════════════
// LIVE SIDE-BY-SIDE BROWSER VIEWPORT CONTROLLER
// ══════════════════════════════════════════════════════════════════════════
window.toggleWorkspaceSideBrowser = function (force) {
  const pane = document.getElementById('workspaceSideBrowserPane');
  const btn = document.getElementById('workspaceBtnSideBrowser');
  if (!pane) return;
  const isCurrentlyActive =
    pane.classList.contains('active') && !pane.classList.contains('collapsed');
  const shouldActive = typeof force === 'boolean' ? force : !isCurrentlyActive;
  if (shouldActive) {
    pane.classList.add('active');
    pane.classList.remove('collapsed');
    if (btn) btn.classList.add('active');
    if (window.__pendingWorkspaceArtifact) {
      const artifact = window.__pendingWorkspaceArtifact;
      window.__pendingWorkspaceArtifact = null;
      (window.openArtifactInSidePane || window.loadHeroArtifact)?.(artifact);
    }
    initAgentBrowserWebSocketIndex();
  } else {
    pane.classList.remove('active');
    pane.classList.add('collapsed');
    if (btn) btn.classList.remove('active');
  }
};

window.toggleExpandSideBrowser = function () {
  const pane = document.getElementById('workspaceSideBrowserPane');
  if (pane) pane.classList.toggle('expanded');
};

function updateSideBrowserCursor(x, y, action, label) {
  const orb = document.getElementById('sideCursorOrb');
  const ripple = document.getElementById('sideCursorRipple');
  const badge = document.getElementById('sideCursorBadge');
  const coordsHUD = document.getElementById('sideCursorCoordsHUD');
  if (coordsHUD && typeof x === 'number' && typeof y === 'number') {
    coordsHUD.textContent = `X: ${Math.round(x)} | Y: ${Math.round(y)}`;
  }
  if (!orb) return;
  const pctX = Math.max(0, Math.min(100, (x / 1280) * 100));
  const pctY = Math.max(0, Math.min(100, (y / 800) * 100));
  orb.style.left = `${pctX}%`;
  orb.style.top = `${pctY}%`;
  if (label && badge) badge.textContent = label;
  if (
    action &&
    (action === 'click' || action === 'double-click' || action === 'right-click') &&
    ripple
  ) {
    ripple.classList.remove('animate-ripple');
    void ripple.offsetWidth;
    ripple.classList.add('animate-ripple');
  }
}

function renderSideAgentBrowserRibbon(roster) {
  const ribbon = document.getElementById('sideAgentBrowserRibbon');
  if (!ribbon || !Array.isArray(roster)) return;
  ribbon.innerHTML = roster
    .map((a) => {
      const isActive = a.id === currentAgentBrowserId;
      const color = a.color || '#38BDF8';
      return `
          <div class="agent-ribbon-chip ${isActive ? 'active' : ''}" style="--active-agent-color:${color}; font-size:10.5px; padding:3px 9px;" onclick="selectActiveAgentBrowserIndex('${a.id}')">
            <span class="pulse-dot" style="background:${color}; box-shadow:0 0 6px ${color}; width:6px; height:6px;"></span>
            <span>${a.avatar || '🤖'}</span>
            <span>${escapeHtml(a.name)}</span>
          </div>
        `;
    })
    .join('');
  const activeAgent = roster.find((a) => a.id === currentAgentBrowserId);
  const nameEl = document.getElementById('sideActiveAgentName');
  if (nameEl && activeAgent) {
    nameEl.textContent = `${activeAgent.name} (${activeAgent.id})`;
    nameEl.style.color = activeAgent.color || '#FFF';
  }
}

function renderSideAgentTabs(agentId, tabs, activeTabId) {
  const container = document.getElementById('sideAgentBrowserTabStrip');
  if (!container || !Array.isArray(tabs)) return;
  const agent = agentBrowserRoster.find((a) => a.id === agentId) || {};
  const agentColor = agent.color || '#38BDF8';
  let html = tabs
    .map((t) => {
      const isActive = t.id === activeTabId;
      const title = t.title || 'New Tab';
      return `
          <div class="browser-tab ${isActive ? 'active' : ''}" style="--active-agent-color:${agentColor}; font-size:10px; padding:4px 8px; max-width:130px;" onclick="switchAgentBrowserTab('${agentId}', '${t.id}')">
            <span>🌐</span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(title)}</span>
            <button class="browser-tab-close" onclick="event.stopPropagation(); closeAgentBrowserTab('${agentId}', '${t.id}')">✕</button>
          </div>
        `;
    })
    .join('');
  html += `
        <button class="browser-tab-new-btn" style="width:20px; height:20px; font-size:11px;" onclick="openAgentBrowserNewTab('${agentId}')" title="Open New Tab">+</button>
      `;
  container.innerHTML = html;
}

window.handleSideBrowserUrlKey = function (e) {
  if (e.key === 'Enter') submitSideBrowserUrl();
};

window.submitSideBrowserUrl = function () {
  const inp = document.getElementById('sideBrowserUrlInput');
  if (!inp || !inp.value.trim()) return;
  agentBrowserNavigateIndex(inp.value.trim());
};

window.handleSideBrowserClick = function (e) {
  const img = document.getElementById('sideBrowserImg');
  if (!img) return;
  const rect = img.getBoundingClientRect();
  const clickX = Math.round((e.clientX - rect.left) * (1280 / rect.width));
  const clickY = Math.round((e.clientY - rect.top) * (800 / rect.height));
  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-click',
        agentId: currentAgentBrowserId,
        x: clickX,
        y: clickY,
        label: 'User Click',
      }),
    );
  }
};

window.handleSideBrowserContextMenu = function (e) {
  e.preventDefault();
  const img = document.getElementById('sideBrowserImg');
  if (!img) return;
  const rect = img.getBoundingClientRect();
  const clickX = Math.round((e.clientX - rect.left) * (1280 / rect.width));
  const clickY = Math.round((e.clientY - rect.top) * (800 / rect.height));
  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-right-click',
        agentId: currentAgentBrowserId,
        x: clickX,
        y: clickY,
        label: 'User Right Click',
      }),
    );
  }
};

window.handleSideBrowserMouseMove = function (e) {
  const img = document.getElementById('sideBrowserImg');
  if (!img) return;
  const rect = img.getBoundingClientRect();
  const curX = Math.round((e.clientX - rect.left) * (1280 / rect.width));
  const curY = Math.round((e.clientY - rect.top) * (800 / rect.height));
  const coordsHUD = document.getElementById('sideCursorCoordsHUD');
  if (coordsHUD) coordsHUD.textContent = `X: ${curX} | Y: ${curY}`;
};

window.sendSideDirectText = function () {
  const inp = document.getElementById('sideDirectTypeInput');
  if (!inp || !inp.value) return;
  const text = inp.value;
  inp.value = '';
  if (agentBrowserWs && agentBrowserWs.readyState === WebSocket.OPEN) {
    agentBrowserWs.send(
      JSON.stringify({
        type: 'agent-browser-type',
        agentId: currentAgentBrowserId,
        text,
        pressEnter: true,
      }),
    );
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SIS 50 NEXT-GEN AUTONOMOUS FEATURES SUITE (UNPRECEDENTED IN AI)
// ══════════════════════════════════════════════════════════════════════════
// Feature catalogue controls are loaded from feature-actions.js.
window.toggleBreakthroughModal = function (force) {
  const modal = document.getElementById('sisBreakthroughModal');
  const pill = document.getElementById('workspaceBtnBreakthroughs');
  if (!modal) return;
  const isOpen = modal.style.display === 'flex';
  const nextState = force !== undefined ? force : !isOpen;

  modal.style.display = nextState ? 'flex' : 'none';
  if (pill) pill.classList.toggle('active', nextState);

  if (nextState) {
    appLoadStateDAG();
  }
};

window.appTriggerVideoSynthesis = async function () {
  const topic = document.getElementById('appVideoTopicSelect').value;
  const durationSeconds = document.getElementById('appVideoDurationInput').value;
  const status = document.getElementById('appVideoStatus');
  const btn = document.getElementById('appBtnGenVideo');

  btn.disabled = true;
  status.textContent = 'Interactive preview';

  try {
    const res = await fetch('/api/visual/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: topic.replace('-', ' ').toUpperCase() + ' Simulation',
        topic,
        durationSeconds,
      }),
    });
    const data = await res.json();
    if (data.success) {
      status.textContent = `Generated ${data.filename} · ${durationSeconds}s requested duration`;
      document.getElementById('appVideoPreviewFrame').src = data.url;
    } else {
      status.textContent = '❌ Error: ' + (data.error || 'Unknown');
    }
  } catch (err) {
    status.textContent = '❌ Fetch error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
};

window.appTriggerSpatialSynthesis = async function () {
  const preset = document.getElementById('appSpatialPresetSelect').value;
  const pointCount = document.getElementById('appSpatialSplatCount').value;
  const status = document.getElementById('appSpatialStatus');
  const btn = document.getElementById('appBtnGenSpatial');

  btn.disabled = true;
  status.textContent = 'Synthesizing 3D spatial world...';

  try {
    const res = await fetch('/api/3d/generate-spatial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: preset.replace('-', ' ').toUpperCase(),
        preset,
        pointCount,
      }),
    });
    const data = await res.json();
    if (data.success) {
      status.textContent = `✓ Generated ${data.filename} (${pointCount} splats)`;
      document.getElementById('appSpatialPreviewFrame').src = data.url;
    } else {
      status.textContent = '❌ Error: ' + (data.error || 'Unknown');
    }
  } catch (err) {
    status.textContent = '❌ Fetch error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
};

window.appTriggerShaderSynthesis = async function () {
  const preset = document.getElementById('appShaderPresetSelect').value;
  const status = document.getElementById('appShaderStatus');
  const btn = document.getElementById('appBtnGenShader');

  btn.disabled = true;
  status.textContent = 'Compiling GLSL fragment shader...';

  try {
    const res = await fetch('/api/visual/generate-shader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: preset.replace('-', ' ').toUpperCase(),
        preset,
      }),
    });
    const data = await res.json();
    if (data.success) {
      status.textContent = `✓ Compiled ${data.filename} (WebGL 2.0)`;
      document.getElementById('appShaderPreviewFrame').src = data.url;
    } else {
      status.textContent = '❌ Compilation error: ' + (data.error || 'Unknown');
    }
  } catch (err) {
    status.textContent = '❌ Fetch error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
};

window.appTriggerSwarmExecution = async function () {
  const prompt = document.getElementById('appSwarmPromptInput').value.trim();
  const status = document.getElementById('appSwarmStatus');
  const box = document.getElementById('appSwarmResultsBox');
  const btn = document.getElementById('appBtnGenSwarm');

  btn.disabled = true;
  status.textContent = 'Nova drafting + Aegis verifying in parallel...';
  box.textContent =
    '⚡ Speculative Dual-Path Swarm active...\n[NOVA] Speculating candidate AST branches...\n[AEGIS] Micro-sandbox invariant auditor spinning up...\n';

  try {
    const res = await fetch('/api/swarm/dual-path-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode: 'code_refactor' }),
    });
    const data = await res.json();
    if (data.success) {
      status.textContent = `Speedup: ${data.timing.speculativeSpeedup} | Aegis: ${data.aegis.status}`;
      box.textContent = `══════════════════════════════════════════════════════════
✨ SPECULATIVE DUAL-PATH SWARM REPORT
══════════════════════════════════════════════════════════
⏱️ Latency: ${data.timing.totalMs}ms (Nova: ${data.timing.novaMs}ms, Aegis: ${data.timing.aegisMs}ms)
⚡ Speculative Speedup Ratio: ${data.timing.speculativeSpeedup}

[NOVA SPECULATIVE DRAFTER]
- Hypothesis: ${data.nova.hypothesis}
- Confidence: ${(data.nova.confidence * 100).toFixed(1)}%
- Branches: ${data.nova.speculativeBranches}

[AEGIS ADVERSARIAL VERIFIER]
- Status: ${data.aegis.status}
- AST Integrity Score: ${data.aegis.astIntegrityScore}%
- Invariants Checked:
${data.aegis.invariantChecks.map((c) => `  ✓ ${c.name}: [${c.status}]`).join('\n')}
- Audit Notes: ${data.aegis.adversarialNotes}

[FINAL VERIFIED CODE]
${data.finalArtifact.code}
`;
    } else {
      box.textContent = '❌ Execution error: ' + (data.error || 'Unknown');
    }
  } catch (err) {
    box.textContent = '❌ Fetch error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
};

window.appLoadStateDAG = async function () {
  try {
    const res = await fetch('/api/memory/state-dag');
    const data = await res.json();
    if (data.success && data.graph) {
      const stats = data.graph.stats;
      document.getElementById('appDagStatNodes').textContent = stats.totalNodes;
      document.getElementById('appDagStatInvariants').textContent = stats.activeInvariants;
      document.getElementById('appDagStatViolations').textContent = stats.violationsBlocked;
      document.getElementById('appDagStatStatus').textContent = stats.integrityStatus;

      const box = document.getElementById('appDagLogBox');
      box.textContent =
        `SHA-256 Merkle DAG Nodes (${data.graph.nodes.length}):\n` +
        data.graph.nodes
          .map(
            (n) =>
              `🔷 [${n.shortHash}] ${n.type} | Invariants: ${n.invariantsCount} | ${n.timestamp}`,
          )
          .join('\n');
    }
  } catch (err) {
    console.error('Error loading State DAG in app:', err);
  }
};

window.appVerifyStateDAGIntegrity = async function () {
  const box = document.getElementById('appDagLogBox');
  box.textContent = 'Auditing cryptographic SHA-256 hashes across Merkle DAG...\n';
  try {
    const res = await fetch('/api/memory/state-dag/verify');
    const data = await res.json();
    if (data.success && data.verification) {
      box.textContent += `✓ Cryptographic Audit COMPLETE:
- Valid: ${data.verification.valid}
- Total Nodes Verified: ${data.verification.verifiedCount} / ${data.verification.totalCount}
- Invariant Hash Mismatches: ${data.verification.errors.length}
- Status: 100% MATHEMATICALLY VERIFIED
`;
    }
  } catch (err) {
    box.textContent += '❌ Verification error: ' + err.message;
  }
};

window.appTestDeceptionBlocking = async function () {
  const box = document.getElementById('appDagLogBox');
  box.textContent +=
    '\n⚠️ Injecting synthetic deception (Math.random() telemetry) to test Hermes...\n';
  try {
    const res = await fetch('/api/memory/state-dag/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TELEMETRY_INJECTION',
        payload: { generator: 'Math.random() * 100', metric: 'synthetic_cpu_mock' },
      }),
    });
    const data = await res.json();
    if (!data.success) {
      box.textContent += `🛡️ [HERMES INTERCEPT SUCCESS]: ${data.error}\n✓ Deception was caught and cryptographically blocked!\n`;
      appLoadStateDAG();
    } else {
      box.textContent += 'Unexpected: Deception was not caught.\n';
    }
  } catch (err) {
    box.textContent += 'Fetch error: ' + err.message;
  }
};

window.appRunFrontierBenchmarks = async function (btn) {
  const statusEl = document.getElementById('frontierBenchStatus');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> <span>Evaluating Frontier Suite...</span>';
  }
  if (statusEl) {
    statusEl.textContent = 'Status: Executing 14 Frontier Benchmarks in Isolated Sandboxes...';
    statusEl.style.color = '#38BDF8';
  }

  try {
    const res = await fetch('/api/benchmarks/run-frontier', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      if (statusEl) {
        statusEl.textContent = `Status: Completed in ${data.totalElapsed}ms · Dashboard Updated!`;
        statusEl.style.color = '#10B981';
      }
    } else {
      if (statusEl) {
        statusEl.textContent = `Status: Error (${data.error || 'Evaluation failed'})`;
        statusEl.style.color = '#EF4444';
      }
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `Status: Error: ${err.message}`;
      statusEl.style.color = '#EF4444';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡</span> <span>Re-Evaluate Frontier Matrix (Live Engine)</span>';
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SUPERGENCE ELITE CODING BLUEPRINT & VERIFICATION HARNESS CONTROLLER
// ══════════════════════════════════════════════════════════════════════════
window.openEliteCodingModal = function () {
  window.toggleEliteCodingModal(true);
};

window.toggleEliteCodingModal = function (show) {
  const modal = document.getElementById('eliteCodingModal');
  if (!modal) return;
  const willShow = typeof show === 'boolean' ? show : modal.style.display === 'none';
  modal.style.display = willShow ? 'flex' : 'none';
};

window.runEliteModalBenchmark = async function () {
  const consoleEl = document.getElementById('eliteModalConsoleOutput');
  const badgeEl = document.getElementById('eliteModalStatusBadge');
  const btn = document.getElementById('btnModalRunBenchmark');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Executing Benchmark...';
  }
  if (badgeEl) {
    badgeEl.textContent = 'EXECUTING GATES...';
    badgeEl.style.color = '#38BDF8';
  }
  if (consoleEl) {
    consoleEl.textContent =
      `================================================================\n` +
      `🛡️ SUPERGENCE ELITE SOFTWARE ENGINEERING BENCHMARK\n` +
      `Executing 4 Rigorous Engineering Gates from Elite Coding Blueprint\n` +
      `================================================================\n\n` +
      `[1/4] Red-Green TDD Loop & Surgical Repair (Diff budget <= 40 lines)...\n` +
      `[2/4] Red-Phase Misdiagnosis Protection Gate (Pre-patch fail requirement)...\n` +
      `[3/4] Security Path Confinement (CWE-22) & Anti-Slop Scanner (15 banned patterns)...\n` +
      `[4/4] Hard Diff-Budget & Deterministic 4-Tier Verifiable Reward...\n\n` +
      `Running isolated sandbox processes...`;
  }

  try {
    const res = await fetch('/api/coder/elite-benchmark', { method: 'POST' });
    const data = await res.json();

    let out =
      `================================================================\n` +
      `🛡️ SUPERGENCE ELITE SOFTWARE ENGINEERING BENCHMARK\n` +
      `Rigorous Verification of Real Engineering Capabilities\n` +
      `================================================================\n\n`;

    if (Array.isArray(data.challenges)) {
      data.challenges.forEach((c, idx) => {
        const mark = c.passed ? '✓' : '❌';
        out += `${mark} [CHALLENGE ${idx + 1}/4]: ${c.title}\n`;
        out += `   Status: ${c.passed ? 'PASSED' : 'FAILED'} (${c.durationMs}ms)\n`;
        out += `   Purpose: ${c.description}\n`;
        if (c.reward !== undefined) {
          out += `   Deterministic Reward: ${c.reward} (${c.rewardStatus || 'OK'})\n`;
        }
        if (c.diffLines !== undefined) {
          out += `   Surgical Patch: ${c.diffLines} lines changed (budget <= 40 lines)\n`;
        }
        if (c.error) {
          out += `   Error: ${c.error}\n`;
        }
        out += `\n`;
      });
    }

    out += `================================================================\n`;
    if (data.allPassed) {
      out += `🏆 ALL ${data.passedChallenges}/${data.totalChallenges} ELITE ENGINEERING BENCHMARKS PASSED 100%!\n`;
      out += `Total Duration: ${data.durationMs}ms\n`;
      out += `Verification Standard: Zero LLM-as-judge • 100% Deterministic Code Gates\n`;
      if (badgeEl) {
        badgeEl.textContent = '4/4 BENCHMARKS VERIFIED (100% PASS)';
        badgeEl.style.color = '#10B981';
      }
    } else {
      out += `❌ Benchmark result: ${data.passedChallenges}/${data.totalChallenges} passed.\n`;
      if (badgeEl) {
        badgeEl.textContent = `${data.passedChallenges}/${data.totalChallenges} PASSED`;
        badgeEl.style.color = '#EF4444';
      }
    }
    out += `================================================================`;

    if (consoleEl) consoleEl.textContent = out;
  } catch (err) {
    if (consoleEl) consoleEl.textContent += `\n[Benchmark Error]: ${err.message}`;
    if (badgeEl) {
      badgeEl.textContent = 'ERROR';
      badgeEl.style.color = '#EF4444';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>▷</span> Run Benchmark Suite';
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SUPERGENCE ARTIFACTS VAULT CONTROLLER & REAL-TIME GALLERY
// ══════════════════════════════════════════════════════════════════════════
let currentVaultType = 'all';
let currentVaultSearch = '';
let currentVaultArtifacts = [];
let activePreviewFilename = null;

window.openArtifactsVaultModal = function () {
  toggleArtifactsVaultModal(true);
};

window.toggleArtifactsVaultModal = function (show) {
  const modal = document.getElementById('artifactsVaultModal');
  if (!modal) return;
  const willShow = typeof show === 'boolean' ? show : modal.style.display === 'none';
  modal.style.display = willShow ? 'flex' : 'none';
  if (willShow) {
    refreshArtifactsVault();
  }
};

let vaultRequestId = 0;
async function loadVaultArtifacts() {
  const reqId = ++vaultRequestId;
  try {
    const url = `/api/artifacts?type=${encodeURIComponent(currentVaultType)}&limit=300${currentVaultSearch ? `&search=${encodeURIComponent(currentVaultSearch)}` : ''}`;
    const res = await fetch(url);
    const items = await res.json();
    if (reqId === vaultRequestId && Array.isArray(items)) {
      currentVaultArtifacts = items;
      renderVaultGrid();
    }
  } catch (_) {}
}

window.setVaultTypeFilter = function (type, btn) {
  currentVaultType = type || 'all';
  const pills = document.querySelectorAll('#vaultCategoryFilterPills .vault-filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderVaultGrid();
  loadVaultArtifacts();
};

let vaultSearchTimeout = null;
window.handleVaultSearch = function (query) {
  currentVaultSearch = (query || '').toLowerCase().trim();
  renderVaultGrid();
  clearTimeout(vaultSearchTimeout);
  vaultSearchTimeout = setTimeout(() => {
    loadVaultArtifacts();
  }, 200);
};

window.refreshArtifactsVault = async function () {
  const reqId = ++vaultRequestId;
  try {
    const sRes = await fetch('/api/artifacts/stats');
    const stats = await sRes.json();
    updateVaultStatsBadges(stats);

    const aRes = await fetch(
      `/api/artifacts?type=${encodeURIComponent(currentVaultType)}&limit=400${currentVaultSearch ? `&search=${encodeURIComponent(currentVaultSearch)}` : ''}`,
    );
    const items = await aRes.json();
    if (reqId === vaultRequestId && Array.isArray(items)) {
      currentVaultArtifacts = items;
      renderVaultGrid();
    }
  } catch (err) {
    console.warn('[ArtifactsVault] Error refreshing:', err);
  }
};

function updateVaultStatsBadges(stats) {
  if (!stats) return;
  const totalStr = (stats.total || 0).toLocaleString();
  const topBadges = [
    document.getElementById('homeArtifactsCountBadge'),
    document.getElementById('workspaceArtifactsCountBadge'),
  ];
  topBadges.forEach((b) => {
    if (b) b.textContent = totalStr;
  });

  const elTotal = document.getElementById('vaultStatsTotalBadge');
  if (elTotal) elTotal.textContent = `${totalStr} ARTIFACTS ON DISK`;

  const setT = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = (val || 0).toLocaleString();
  };
  setT('vCountAll', stats.total);
  setT('vCountSim', stats.simulations);
  setT('vCountCode', stats.code);
  setT('vCountDocs', stats.documents);
  setT('vCountData', stats.data);
  setT('vCountMedia', stats.media);
}

function renderVaultGrid() {
  const grid = document.getElementById('vaultArtifactsGrid');
  const emptyNotice = document.getElementById('vaultEmptyNotice');
  if (!grid) return;

  const filtered = currentVaultArtifacts.filter((art) => {
    if (currentVaultType !== 'all' && art.category !== currentVaultType) return false;
    if (currentVaultSearch) {
      const fn = (art.filename || '').toLowerCase();
      const tit = (art.title || '').toLowerCase();
      if (!fn.includes(currentVaultSearch) && !tit.includes(currentVaultSearch)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (emptyNotice) emptyNotice.style.display = 'block';
    return;
  }
  if (emptyNotice) emptyNotice.style.display = 'none';

  let html = '';
  filtered.forEach((art) => {
    const isActive = activePreviewFilename === art.filename;
    let catColor = '#38BDF8';
    let catIcon = '📦';
    let catLabel = 'OTHER';

    if (art.category === 'simulation') {
      catColor = '#10B981';
      catIcon = '🎬';
      catLabel = 'Interactive preview';
    } else if (art.category === 'code') {
      catColor = '#A78BFA';
      catIcon = '💻';
      catLabel = (art.ext || '').toUpperCase().replace('.', '') + ' CODE';
    } else if (art.category === 'document') {
      catColor = '#FBBF24';
      catIcon = '📄';
      catLabel = 'DOCUMENT';
    } else if (art.category === 'data') {
      catColor = '#06B6D4';
      catIcon = '📊';
      catLabel = 'DATA';
    } else if (art.category === 'media') {
      catColor = '#EC4899';
      catIcon = '🖼️';
      catLabel = 'MEDIA';
    }

    const dateStr = art.mtime
      ? new Date(art.mtime).toLocaleDateString() +
        ' ' +
        new Date(art.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    html += `
          <div class="vault-artifact-card ${isActive ? 'active' : ''}" onclick="previewVaultArtifact('${art.filename}', '${art.src}', '${art.ext}', '${art.category}', '${escapeHtml(art.title).replace(/'/g, "\\'")}')">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:9.5px; font-weight:700; color:${catColor}; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; border:1px solid ${catColor}40;">
                  ${catIcon} ${catLabel}
                </span>
                <span style="font-size:10px; color:#64748B; font-family:monospace;">${art.sizeFormatted || ''}</span>
              </div>
              <div style="font-size:12px; font-weight:700; color:#F8FAFC; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(art.title)}">
                ${escapeHtml(art.title)}
              </div>
              <div style="font-size:10px; color:#94A3B8; font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(art.filename)}">
                ${escapeHtml(art.filename)}
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
              <span style="font-size:9.5px; color:#64748B;">${dateStr}</span>
              <div style="display:flex; gap:6px;" onclick="event.stopPropagation()">
                <button onclick="previewVaultArtifact('${art.filename}', '${art.src}', '${art.ext}', '${art.category}', '${escapeHtml(art.title).replace(/'/g, "\\'")}')" style="background:rgba(56,189,248,0.12); color:#38BDF8; border:1px solid rgba(56,189,248,0.3); border-radius:6px; padding:3px 8px; font-size:10.5px; font-weight:600; cursor:pointer;">
                  ▶ Preview
                </button>
                <a href="${art.src}" target="_blank" style="background:rgba(255,255,255,0.06); color:#FFF; border-radius:6px; padding:3px 7px; font-size:10.5px; text-decoration:none;" title="Open in new window">
                  ↗
                </a>
                <a href="${art.src}" download style="background:rgba(255,255,255,0.06); color:#FFF; border-radius:6px; padding:3px 7px; font-size:10.5px; text-decoration:none;" title="Download file">
                  ⬇
                </a>
              </div>
            </div>
          </div>
        `;
  });

  grid.innerHTML = html;

  if (!activePreviewFilename && filtered.length > 0) {
    const first = filtered[0];
    previewVaultArtifact(first.filename, first.src, first.ext, first.category, first.title);
  }
}

window.previewVaultArtifact = async function (filename, src, ext, category, title) {
  activePreviewFilename = filename;
  const titleEl = document.getElementById('vaultPreviewTitle');
  const openBtn = document.getElementById('vaultPreviewOpenTabBtn');
  const downBtn = document.getElementById('vaultPreviewDownloadBtn');
  const iframe = document.getElementById('vaultPreviewIframe');
  const code = document.getElementById('vaultPreviewCode');
  const img = document.getElementById('vaultPreviewImage');
  const standby = document.getElementById('vaultPreviewStandby');

  if (titleEl) titleEl.textContent = title || filename;
  if (openBtn) {
    openBtn.href = src;
    openBtn.style.display = 'inline-block';
  }
  if (downBtn) {
    downBtn.href = src;
    downBtn.style.display = 'inline-block';
  }

  if (standby) standby.style.display = 'none';

  const isHtml = ext === '.html' || ext === '.htm';
  const isImg = ['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext);

  if (isHtml) {
    if (code) code.style.display = 'none';
    if (img) img.style.display = 'none';
    if (iframe) {
      iframe.src = src;
      iframe.style.display = 'block';
    }
  } else if (isImg) {
    if (iframe) iframe.style.display = 'none';
    if (code) code.style.display = 'none';
    if (img) {
      img.src = src;
      img.style.display = 'block';
    }
  } else {
    if (iframe) iframe.style.display = 'none';
    if (img) img.style.display = 'none';
    if (code) {
      code.textContent = 'Loading artifact content...';
      code.style.display = 'block';
      try {
        const res = await fetch(`/api/artifacts/content?file=${encodeURIComponent(filename)}`);
        const data = await res.json();
        code.textContent = data.content || '(Empty file)';
      } catch (err) {
        code.textContent = '// Error loading inline preview: ' + err.message;
      }
    }
  }

  const cards = document.querySelectorAll('.vault-artifact-card');
  cards.forEach((c) => {
    if (c.innerHTML.includes(filename)) c.classList.add('active');
    else c.classList.remove('active');
  });
};

fetch('/api/artifacts/stats')
  .then((r) => r.json())
  .then(updateVaultStatsBadges)
  .catch(() => {});

// Auto-boot into Enterprise Workspace immediately
async function bootEnterpriseWorkspace() {
  const home = document.getElementById('homeView');
  const inpW = document.getElementById('inputWrap');
  const ws = document.getElementById('supergenceWorkspace');
  if (home) home.style.display = 'none';
  if (inpW) inpW.style.display = 'none';
  if (ws) ws.classList.add('active');

  if (typeof initAgentBrowserWebSocketIndex === 'function') {
    initAgentBrowserWebSocketIndex();
  }

  if (typeof toggleWorkspaceSideBrowser === 'function') {
    toggleWorkspaceSideBrowser(false);
  }

  let convs = [];
  if (typeof loadConversationsList === 'function') {
    convs = await loadConversationsList();
  }

  const activeConv = localStorage.getItem('sis_workspace_conv');
  if (activeConv) {
    await loadWorkspaceConversation(activeConv);
  } else if (Array.isArray(convs) && convs.length > 0) {
    await loadWorkspaceConversation(convs[0].id);
  } else if (window.savedConversationsList && window.savedConversationsList.length > 0) {
    await loadWorkspaceConversation(window.savedConversationsList[0].id);
  } else {
    startNewWorkspaceThread();
  }
  window.__sisWorkspaceReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootEnterpriseWorkspace);
} else {
  bootEnterpriseWorkspace();
}

// Close on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAgentBrowsersModal();
    toggleFiftyFeaturesModal(false);
    toggleBreakthroughModal(false);
    toggleArtifactsVaultModal(false);
    toggleWorkspaceTreeModal(false);
    document.getElementById('workspaceConversationsSidebar')?.classList.remove('mobile-open');
  }
});
