/* ══════════════════════════════════════════════════════════════════════════════
   SUPERGENCE AGENTS & MASCOTS CONTROLLER
   Interactive Dancing Mascots, Multi-Action Engine & Specialist Studio
   ══════════════════════════════════════════════════════════════════════════════ */
(() => {
  const MASCOTS_ROSTER = [
    {
      id: 'sparky',
      name: 'Ignis Flame',
      specialty: 'Superintelligence Orchestrator',
      color: '#ff7a00',
      src: '/images/silisleek/supergence-official.png',
      motto: 'What shall we make possible? All in one conversation.',
    },
    {
      id: 'superake',
      name: 'Superake',
      specialty: 'Computer Science & Systems',
      color: '#6579dc',
      src: '/images/mascots/superake.png',
      motto: 'Clean architecture, zero slop, resilient code execution.',
    },
    {
      id: 'superbit',
      name: 'Superbit',
      specialty: 'Biology & Living Systems',
      color: '#afc3a7',
      src: '/images/mascots/superbit.png',
      motto: 'Biomolecules, structural folding, and evolutionary systems.',
    },
    {
      id: 'superbold',
      name: 'Superbold',
      specialty: 'Mathematics & Economics',
      color: '#dfc18e',
      src: '/images/mascots/superbold.png',
      motto: 'Rigorous proofs, quantitative truth, and market dynamics.',
    },
    {
      id: 'supermull',
      name: 'Supermull',
      specialty: 'Data Science & Neural Reasoning',
      color: '#b974a0',
      src: '/images/mascots/supermull.png',
      motto: 'Vector topologies, deep embeddings, high-dimensional reasoning.',
    },
    {
      id: 'supersion',
      name: 'Supersion',
      specialty: 'Electrical & Cybernetics',
      color: '#d96480',
      src: '/images/mascots/supersion.png',
      motto: 'Signal synthesis, circuit timing, and hardware control.',
    },
  ];

  const ACTION_QUOTES = {
    dancing: [
      'Grooving on the beat of 100% test coverage! 🕺✨',
      'Synthesizing dopamine & oscillatory alpha rhythm! 🎶',
      'Akshan, check out these moves! 💃🔥',
      'Party mode engaged in the Supergence neural matrix! 🪩',
    ],
    coding: [
      'Forging dynamic tools & shipping code at lightspeed! ⚡💻',
      'Zero hardcoded slop — pure self-correcting synthesis! 🛠️',
      'Executing elite compiler loops for Akshan! 🚀',
      'Subconscious tool synthesis active and verified! ⚡',
    ],
    thinking: [
      'Exploring multidimensional state-DAG memory... 🧠🌌',
      'Traversing 82,967 knowledge graph nodes... 🔭',
      'Forecasting 24/7 POSSAP trajectory moves... 🔮',
      'Consolidating cognitive threads for Akshan... 💡',
    ],
    celebrating: [
      'Mission complete! We did it, Akshan! 🎉🌟',
      'Launch readiness: 100% verified & resilient! 🏆✨',
      'Victory dance for the founder of Supergence! 🥇🔥',
      'All tests green and systems fully calibrated! 🚀',
    ],
    waving: [
      'Hey Akshan! Supergence is locked, loaded, and ready! 👋✨',
      'Welcome back! What shall we build together today? 🤝',
      'Ready to ship something extraordinary, Akshan! 🌟',
    ],
    sleeping: [
      'Zzz... consolidating memories into LTM dream cycles... 💤🌙',
      'Glymphatic clearance & rest protocol in progress... 😴',
    ],
    idle: [
      'What shall we make possible today, Akshan? 🌟',
      'Click me to dance or pick an action below! 🕺',
      'Your multi-agent specialist team is standing by! ✨',
    ],
  };

  const PARTICLES = {
    dancing: ['♪', '♫', '♬', '♩', '✨', '⭐'],
    celebrating: ['🎉', '✨', '⭐', '🌟', '🎊'],
    coding: ['</>', '{ }', '01', '⚡', 'λ', 'const'],
    thinking: ['💡', '🧠', '🌌', '✨', '🔮'],
    waving: ['👋', '💖', '✨', '🌟'],
    sleeping: ['z', 'Z', '💤', '🌙'],
  };

  let currentMascotIndex = 0;
  let currentAction = 'idle';
  let speechTimeout = null;

  function spawnParticles(container, action) {
    if (!container) return;
    const pool = PARTICLES[action] || PARTICLES.dancing;
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('span');
      p.className = 'sg-float-particle';
      p.textContent = pool[Math.floor(Math.random() * pool.length)];
      p.style.left = `${20 + Math.random() * 60}%`;
      p.style.bottom = `${20 + Math.random() * 40}%`;
      p.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`);
      p.style.setProperty('--rot', `${(Math.random() - 0.5) * 60}deg`);
      container.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }
  }

  function setMascotAction(container, action) {
    currentAction = action;
    const mascot = MASCOTS_ROSTER[currentMascotIndex];
    const mascotEl = container.closest('.shell-empty-mascot') || container;
    mascotEl.dataset.action = action;

    // Update speech bubble
    const bubble = mascotEl.querySelector('.sg-mascot-speech-bubble');
    if (bubble) {
      const quotes = ACTION_QUOTES[action] || ACTION_QUOTES.idle;
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      bubble.textContent = quote;
      bubble.style.animation = 'none';
      void bubble.offsetHeight; // reflow
      bubble.style.animation = 'sg-bubble-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both';
    }

    // Spawn lively particles
    const particleBox = mascotEl.querySelector('.sg-mascot-particles');
    if (particleBox && action !== 'idle') {
      spawnParticles(particleBox, action);
    }

    // Update active action pill
    mascotEl.querySelectorAll('.sg-action-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.action === action);
    });

    // Reset back to idle after a while if dancing/celebrating/waving
    if (['celebrating', 'waving'].includes(action)) {
      clearTimeout(speechTimeout);
      speechTimeout = setTimeout(() => {
        if (currentAction === action) setMascotAction(container, 'idle');
      }, 4000);
    }
  }

  function cycleMascot(container) {
    currentMascotIndex = (currentMascotIndex + 1) % MASCOTS_ROSTER.length;
    const mascot = MASCOTS_ROSTER[currentMascotIndex];
    const mascotEl = container.closest('.shell-empty-mascot') || container;

    const img = mascotEl.querySelector('.shell-empty-mascot-figure img');
    if (img) {
      img.src = mascot.src;
      img.alt = mascot.name;
    }
    mascotEl.style.setProperty('--mascot-color', mascot.color);

    const selectorBtn = mascotEl.querySelector('.sg-mascot-selector-btn');
    if (selectorBtn) selectorBtn.textContent = `Mascot: ${mascot.name} ▾`;

    const bubble = mascotEl.querySelector('.sg-mascot-speech-bubble');
    if (bubble) {
      bubble.textContent = `I am ${mascot.name} — ${mascot.motto}`;
    }

    setMascotAction(container, 'waving');
  }

  function mountStageMascot() {
    const stageMascots = document.querySelectorAll('.shell-empty-mascot');
    stageMascots.forEach((mascotEl) => {
      if (mascotEl.dataset.mascotMounted) return;
      mascotEl.dataset.mascotMounted = 'true';
      mascotEl.dataset.action = 'idle';

      const mascot = MASCOTS_ROSTER[currentMascotIndex];
      mascotEl.style.setProperty('--mascot-color', mascot.color);

      mascotEl.innerHTML = `
        <div class="sg-mascot-speech-bubble" role="status">
          Hey Akshan! What shall we make possible together today? ✨
        </div>
        <div class="shell-empty-mascot-figure" title="Click me to dance!">
          <div class="sg-mascot-particles"></div>
          <img src="${mascot.src}" alt="${mascot.name}" draggable="false" />
        </div>
        <div class="sg-mascot-dock">
          <div class="sg-mascot-action-pills">
            <button type="button" class="sg-action-btn" data-action="dancing" title="Dance!">🕺 Dance</button>
            <button type="button" class="sg-action-btn" data-action="coding" title="Build & Code!">⚡ Build</button>
            <button type="button" class="sg-action-btn" data-action="thinking" title="Deep Thought">🧠 Think</button>
            <button type="button" class="sg-action-btn" data-action="celebrating" title="Cheer & Celebrate!">🎉 Cheer</button>
            <button type="button" class="sg-action-btn" data-action="waving" title="Wave Hello">👋 Wave</button>
            <button type="button" class="sg-action-btn" data-action="studio" title="Meet the Specialists">👥 Team</button>
          </div>
          <button type="button" class="sg-mascot-selector-btn" title="Switch Mascot">
            Mascot: ${mascot.name} ▾
          </button>
        </div>
      `;

      // Wire up clicks
      const figure = mascotEl.querySelector('.shell-empty-mascot-figure');
      figure?.addEventListener('click', () => {
        const nextAction = currentAction === 'dancing' ? 'celebrating' : 'dancing';
        setMascotAction(mascotEl, nextAction);
      });

      mascotEl.querySelectorAll('.sg-action-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.action;
          if (act === 'studio') {
            openStudioShowcase();
          } else {
            setMascotAction(mascotEl, act);
          }
        });
      });

      mascotEl.querySelector('.sg-mascot-selector-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleMascot(mascotEl);
      });
    });
  }

  // ── Agents & Mascots Studio Showcase Dialog ──
  let studioDialog = null;

  function createStudioDialog() {
    if (studioDialog) return studioDialog;

    studioDialog = document.createElement('dialog');
    studioDialog.className = 'shell-dialog sg-studio-dialog';
    studioDialog.id = 'sgAgentsMascotsStudio';
    studioDialog.setAttribute('aria-label', 'Supergence Agents and Mascots Studio');

    studioDialog.innerHTML = `
      <div class="sg-studio-header">
        <div class="sg-studio-title-wrap">
          <h2>Agents & Mascots Studio</h2>
          <p>Supergence's dedicated specialist team — highly trained, autonomous, and personal.</p>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <button type="button" class="sg-party-dance-btn" id="sgStudioPartyBtn">
            <span>🎉</span> Party Dance All!
          </button>
          <button type="button" class="shell-icon-button" id="sgStudioCloseBtn" aria-label="Close Studio">✕</button>
        </div>
      </div>
      <div class="sg-studio-grid" id="sgStudioCardsGrid"></div>
    `;

    document.body.appendChild(studioDialog);

    studioDialog.querySelector('#sgStudioCloseBtn')?.addEventListener('click', () => {
      studioDialog.close();
    });

    studioDialog.querySelector('#sgStudioPartyBtn')?.addEventListener('click', () => {
      const cards = studioDialog.querySelectorAll('.sg-specialist-card');
      const isDancing = cards[0]?.dataset.mascotState === 'dancing';
      const targetState = isDancing ? 'idle' : 'dancing';
      cards.forEach((card) => {
        card.dataset.mascotState = targetState;
        card.querySelectorAll('.sg-action-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.action === targetState);
        });
      });
      const partyBtn = studioDialog.querySelector('#sgStudioPartyBtn');
      if (partyBtn) {
        partyBtn.innerHTML = isDancing ? '<span>🎉</span> Party Dance All!' : '<span>🕺</span> Pause Groove';
      }
    });

    return studioDialog;
  }

  function renderStudioCards() {
    const grid = studioDialog?.querySelector('#sgStudioCardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    MASCOTS_ROSTER.forEach((agent) => {
      const card = document.createElement('div');
      card.className = 'sg-specialist-card';
      card.dataset.mascotState = 'idle';
      card.dataset.agentId = agent.id;
      card.style.setProperty('--card-color', agent.color);
      card.style.setProperty('--card-glow', `${agent.color}44`);

      card.innerHTML = `
        <div class="sg-specialist-avatar-wrap" title="Click to dance!">
          <img src="${agent.src}" alt="${agent.name}" draggable="false" />
        </div>
        <div class="sg-specialist-name">${agent.name}</div>
        <div class="sg-specialist-role">${agent.specialty}</div>
        <div class="sg-specialist-motto">“${agent.motto}”</div>
        <div class="sg-specialist-actions">
          <button type="button" class="sg-action-btn" data-action="dancing">🕺 Dance</button>
          <button type="button" class="sg-action-btn" data-action="coding">⚡ Build</button>
          <button type="button" class="sg-action-btn" data-action="thinking">🧠 Think</button>
          <button type="button" class="sg-action-btn" data-action="celebrating">🎉 Cheer</button>
          <button type="button" class="sg-action-btn" data-action="waving">👋 Wave</button>
        </div>
        <button type="button" class="sg-specialist-select-btn" data-agent="${agent.id}">
          Select ${agent.name} for Chat
        </button>
      `;

      // Card action buttons
      card.querySelectorAll('.sg-action-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.action;
          card.dataset.mascotState = act;
          card.querySelectorAll('.sg-action-btn').forEach((b) => b.classList.toggle('active', b === btn));
        });
      });

      // Click avatar to toggle dance
      card.querySelector('.sg-specialist-avatar-wrap')?.addEventListener('click', () => {
        const next = card.dataset.mascotState === 'dancing' ? 'celebrating' : 'dancing';
        card.dataset.mascotState = next;
        card.querySelectorAll('.sg-action-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.action === next);
        });
      });

      // Select for chat
      card.querySelector('.sg-specialist-select-btn')?.addEventListener('click', () => {
        const select = document.getElementById('composerAgentSelect') || document.getElementById('workspaceAgentSelect');
        if (select) {
          const match = [...select.options].find((opt) => opt.value.toLowerCase().includes(agent.id.replace('super', '')) || opt.value.toLowerCase().includes(agent.id));
          if (match) select.value = match.value;
        }
        studioDialog.close();
        document.getElementById('workspaceInp')?.focus();
      });

      grid.appendChild(card);
    });
  }

  function openStudioShowcase() {
    createStudioDialog();
    renderStudioCards();
    studioDialog.showModal();
  }

  // Hook into navigation rail studio button
  function wireNavigationRail() {
    const railStudio = document.getElementById('railStudio');
    if (railStudio) {
      railStudio.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openStudioShowcase();
      });
    }
  }

  // In-chat Turn Completion Mascot Reactions
  function observeChatTurns() {
    const turnsStream = document.getElementById('chatTurnsStream');
    if (!turnsStream) return;

    const observer = new MutationObserver((mutations) => {
      // Re-mount empty stage mascot if stage re-rendered
      if (turnsStream.querySelector('.shell-empty-mascot:not([data-mascot-mounted])')) {
        mountStageMascot();
      }

      // Check for turn items that just completed
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('chat-turn-item')) {
            const mascotAvatar = node.querySelector('.sg-mascot');
            if (mascotAvatar) {
              mascotAvatar.dataset.mascotState = 'thinking';
            }
          }
        });
      });

      // When response body finishes streaming, do a brief celebration
      document.querySelectorAll('.chat-turn-item:not([data-cheered])').forEach((turn) => {
        const cursor = turn.querySelector('.streaming-cursor, .workspace-thinking, .ws-thinking');
        const hasContent = turn.querySelector('.response-body-markdown')?.textContent?.trim()?.length > 10;
        if (!cursor && hasContent) {
          turn.dataset.cheered = 'true';
          const mascot = turn.querySelector('.sg-mascot');
          if (mascot) {
            mascot.dataset.mascotState = 'celebrating';
            setTimeout(() => {
              if (mascot.dataset.mascotState === 'celebrating') {
                mascot.dataset.mascotState = 'idle';
              }
            }, 3000);
          }
        }
      });
    });

    observer.observe(turnsStream, { childList: true, subtree: true });
  }

  // Initialize when DOM is ready
  function init() {
    mountStageMascot();
    wireNavigationRail();
    observeChatTurns();
    createStudioDialog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SupergenceMascots = {
    roster: MASCOTS_ROSTER,
    setMascotAction,
    cycleMascot,
    openStudioShowcase,
  };
})();
