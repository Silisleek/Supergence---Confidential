// JARVIS HUD — Core Reactor Component
// Reactive central visualizer for the 4 agent mental states (idle, listening, thinking, speaking)

// ─── Core Reactor Class ───

export class CoreReactor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      theme: 'cyan',
      transitionSpeed: 30,
      pulseIntensity: 1,
      autoSync: true,
      sleek: false,
      ...options,
    };

    this.currentState = 'idle';
    this.animationId = null;
    this.time = 0;
    this.unsubscribe = null;

    this.stateClassMap = {
      idle: 'reactor-state-idle',
      listening: 'reactor-state-listening',
      thinking: 'reactor-state-thinking',
      speaking: 'reactor-state-speaking',
      processing: 'reactor-state-processing',
      error: 'reactor-state-error',
    };

    this.themeColors = {
      cyan: {
        idle: '#00F0FF',
        listening: '#00FF88',
        thinking: '#EAB308',
        speaking: '#F43F5E',
        processing: '#A855F7',
        error: '#EF4444',
      },
      magenta: {
        idle: '#E879F9',
        listening: '#F43F5E',
        thinking: '#EAB308',
        speaking: '#00F0FF',
        processing: '#34D399',
        error: '#F87171',
      },
      amber: {
        idle: '#F59E0B',
        listening: '#34D399',
        thinking: '#00F0FF',
        speaking: '#00FF88',
        processing: '#A855F7',
        error: '#EF4444',
      },
      sleek: {
        idle: '#6366F1',
        listening: '#10B981',
        thinking: '#F59E0B',
        speaking: '#F43F5E',
        processing: '#8B5CF6',
        error: '#EF4444',
      },
    };

    this.init();
  }

  init() {
    this._render();
    this._setupStyles();
    this._attachEventListeners();

    // Auto-sync with global state if enabled
    if (this.options.autoSync) {
      this.connectToState();
    }
  }

  // Connect to global state store
  connectToState() {
    try {
      // Dynamic import to avoid circular dependencies
      import('../state/store.js')
        .then(({ state }) => {
          this.unsubscribe = state.subscribe('agentActivity', (activity) => {
            if (activity?.cycleState) {
              this.setState(activity.cycleState);
            }
          });
        })
        .catch(() => {
          // Store not available yet, retry later
          setTimeout(() => this.connectToState(), 100);
        });
    } catch {
      // Fallback for environments without dynamic import
      if (window.state) {
        this.unsubscribe = window.state.subscribe('agentActivity', (activity) => {
          if (activity?.cycleState) {
            this.setState(activity.cycleState);
          }
        });
      }
    }
  }

  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  _render() {
    this.container.innerHTML = `
      <div class="core-reactor liquid-glass-core-wrapper" id="core-reactor">
        <div class="reactor-core" style="pointer-events: auto;">
          <button type="button" class="hud-center-lens-orb supergence-power-btn liquid-glass-pill" id="hud-center-lens-orb" title="Click to Power On Supergence 24/7 Autonomous AI" style="pointer-events: auto;">
            <span class="liquid-glass-warp-bg"></span>
            <span class="power-glow-aura"></span>
            <span class="power-icon-symbol">⏻</span>
            <span class="lens-status" id="hud-lens-status">POWER ON</span>
            <span class="power-sublabel" id="hud-power-sublabel">24/7 AUTONOMOUS</span>
          </button>
        </div>
      </div>
    `;

    this._bindElements();
  }

  _setupStyles() {
    const style = document.createElement('style');
    const isSleek = this.options.sleek;
    const sleekColors = this.themeColors.sleek;

    style.textContent = `
      .core-reactor {
        position: relative;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        pointer-events: none;
        user-select: none;
        --reactor-primary: var(--hud-primary-rgb, 0, 240, 255);
        --reactor-transition-speed: ${this.options.transitionSpeed}ms;
      }

      .core-reactor {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        user-select: none;
      }

      .core-reactor .reactor-core {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      }

      .core-reactor:not(.sleek) .reactor-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid transparent;
        transform-origin: center;
        opacity: 0;
        transition: opacity 0.3s, border-color 0.5s;
      }

      .core-reactor:not(.sleek) .ring-active {
        opacity: 1;
      }

      .core-reactor:not(.sleek) .ring-idle {
        border-color: rgba(var(--reactor-primary), 0.8);
        animation: rotate-ring 20s linear infinite;
      }

      .core-reactor:not(.sleek) .ring-listening {
        border-color: #00FF88;
        animation: rotate-ring 15s linear infinite;
      }

      .core-reactor:not(.sleek) .ring-thinking {
        border-color: #EAB308;
        animation: rotate-ring 10s linear infinite;
      }

      .core-reactor:not(.sleek) .ring-speaking {
        border-color: #F43F5E;
        animation: rotate-ring 8s linear infinite;
      }

      .core-reactor:not(.sleek) .reactor-pulse-container {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 220px;
        height: 220px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        pointer-events: none;
      }

      .core-reactor:not(.sleek) .pulse-layer {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid transparent;
        animation: pulse-expand 4s infinite ease-in-out;
      }

      .core-reactor:not(.sleek) .pulse-1 {
        animation-delay: 0s;
        border-color: rgba(var(--reactor-primary), 0.3);
      }

      .core-reactor:not(.sleek) .pulse-2 {
        animation-delay: 1.3s;
        border-color: rgba(var(--reactor-primary), 0.2);
      }

      .core-reactor:not(.sleek) .pulse-3 {
        animation-delay: 2.6s;
        border-color: rgba(var(--reactor-primary), 0.1);
      }

      /* ─── Modern Sleek Liquid Glass Mode ─── */
      .core-reactor.sleek {
        width: 180px;
        height: 180px;
      }

      .core-reactor.sleek .reactor-orbit {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 160px;
        height: 160px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.12);
        transform: translate(-50%, -50%);
        box-shadow:
          0 0 30px rgba(99, 102, 241, 0.15),
          inset 0 0 30px rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background:
          radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 40%);
      }

      .core-reactor.sleek .reactor-orbit-inner {
        position: absolute;
        top: 12%;
        left: 12%;
        width: 76%;
        height: 76%;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background:
          radial-gradient(circle at center, rgba(255, 255, 255, 0.02) 0%, transparent 70%);
      }

      .core-reactor.sleek .reactor-core {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background:
          linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: background var(--reactor-transition-speed) ease, box-shadow 0.4s ease;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 0 20px rgba(99, 102, 241, 0.15);
      }

      .core-reactor.sleek .reactor-core::before {
        content: '';
        position: absolute;
        inset: 2px;
        border-radius: 50%;
        background:
          radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
        pointer-events: none;
      }

      .core-reactor.sleek .reactor-state-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
      }

      .core-reactor.sleek .state-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        animation: sleek-pulse-dot 2.5s ease-in-out infinite;
        box-shadow:
          0 0 12px currentColor,
          0 0 24px currentColor;
      }

      .core-reactor.sleek .state-label {
        font-size: 9px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #E2E8F0;
        text-shadow: 0 0 10px currentColor;
      }

      .core-reactor.sleek .reactor-rings {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 150px;
        height: 150px;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }

      .core-reactor.sleek .ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 1.5px solid transparent;
        transform-origin: center;
        opacity: 0;
        transition: opacity 0.4s ease, border-color 0.5s ease, filter 0.3s ease;
        filter: drop-shadow(0 0 8px currentColor);
      }

      .core-reactor.sleek .ring-active {
        opacity: 1;
        filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 24px currentColor);
      }

      .core-reactor.sleek .ring-idle {
        border-color: ${sleekColors.idle};
        animation: sleek-rotate-ring 25s linear infinite;
        opacity: 0.6;
      }

      .core-reactor.sleek .ring-listening {
        border-color: ${sleekColors.listening};
        animation: sleek-rotate-ring 18s linear infinite reverse;
      }

      .core-reactor.sleek .ring-thinking {
        border-color: ${sleekColors.thinking};
        animation: sleek-rotate-ring 14s linear infinite;
      }

      .core-reactor.sleek .ring-speaking {
        border-color: ${sleekColors.speaking};
        animation: sleek-rotate-ring 10s linear infinite reverse;
      }

      .core-reactor.sleek .reactor-pulse-container {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 190px;
        height: 190px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        pointer-events: none;
      }

      .core-reactor.sleek .pulse-layer {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 1px solid transparent;
        animation: sleek-pulse-expand 5s infinite ease-in-out;
      }

      .core-reactor.sleek .pulse-1 {
        animation-delay: 0s;
        border-color: rgba(99, 102, 241, 0.25);
      }

      .core-reactor.sleek .pulse-2 {
        animation-delay: 1.6s;
        border-color: rgba(139, 92, 246, 0.18);
      }

      .core-reactor.sleek .pulse-3 {
        animation-delay: 3.2s;
        border-color: rgba(56, 189, 248, 0.12);
      }

      @keyframes pulse-dot {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
      }

      @keyframes rotate-ring {
        100% { transform: rotate(360deg); }
      }

      @keyframes pulse-expand {
        0% { transform: scale(0.8); opacity: 1; }
        70% { transform: scale(1.2); opacity: 0; }
        100% { transform: scale(1.2); opacity: 0; }
      }

      /* Sleek mode animations - slower, smoother, more elegant */
      @keyframes sleek-pulse-dot {
        0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 12px currentColor, 0 0 24px currentColor; }
        50% { transform: scale(1.15); opacity: 0.85; box-shadow: 0 0 16px currentColor, 0 0 32px currentColor; }
      }

      @keyframes sleek-rotate-ring {
        100% { transform: rotate(360deg); }
      }

      @keyframes sleek-pulse-expand {
        0% { transform: scale(0.85); opacity: 0.8; }
        60% { transform: scale(1.15); opacity: 0; }
        100% { transform: scale(1.15); opacity: 0; }
      }

      /* Theme-based colors */
      .theme-cyan .core-reactor:not(.sleek) { --reactor-primary: 0, 240, 255; }
      .theme-magenta .core-reactor:not(.sleek) { --reactor-primary: 232, 121, 249; }
      .theme-amber .core-reactor:not(.sleek) { --reactor-primary: 245, 194, 11; }
    `;

    if (!document.querySelector('#core-reactor-styles')) {
      style.id = 'core-reactor-styles';
      document.head.appendChild(style);
    }
  }

  _bindElements() {
    this.elements = {
      reactor: this.container.querySelector('#core-reactor'),
      stateDot: this.container.querySelector('.state-dot'),
      stateLabel: this.container.querySelector('.state-label'),
      rings: {},
    };

    this.elements.rings.idle = this.container.querySelector('.ring-idle');
    this.elements.rings.listening = this.container.querySelector('.ring-listening');
    this.elements.rings.thinking = this.container.querySelector('.ring-thinking');
    this.elements.rings.speaking = this.container.querySelector('.ring-speaking');
  }

  _attachEventListeners() {
    this.container.querySelector('#hud-center-lens-orb')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.powerOnSupergence === 'function') {
        window.powerOnSupergence();
      }
    });

    this.container.addEventListener('click', () => {
      if (typeof window.powerOnSupergence === 'function') {
        window.powerOnSupergence();
      } else {
        this.cycleState();
      }
    });
  }

  setState(newState) {
    const validStates = ['idle', 'listening', 'thinking', 'speaking', 'processing', 'error'];
    if (!validStates.includes(newState)) return;

    if (this.currentState !== newState) {
      this.currentState = newState;
      this._updateUI();
    }
  }

  _updateUI() {
    // Update state indicator
    if (this.elements.stateDot) {
      this.elements.stateDot.className = `state-dot ${this.stateClassMap[this.currentState]}`;
    }
    if (this.elements.stateLabel) {
      this.elements.stateLabel.textContent = this.currentState.toUpperCase();
    }

    // Update rings - activate only the current state's ring
    Object.keys(this.elements.rings).forEach((state) => {
      const ring = this.elements.rings[state];
      if (ring) {
        ring.classList.toggle('ring-active', state === this.currentState);
      }
    });

    // Dispatch custom event for state change
    this.container.dispatchEvent(
      new CustomEvent('reactor-state-change', {
        detail: { state: this.currentState },
      }),
    );
  }

  cycleState() {
    const states = ['idle', 'listening', 'thinking', 'speaking', 'processing'];
    const currentIndex = states.indexOf(this.currentState);
    const nextState = states[(currentIndex + 1) % states.length];
    this.setState(nextState);
  }

  getState() {
    return this.currentState;
  }

  /**
   * Toggle sleek mode dynamically
   */
  setSleekMode(enabled) {
    this.options.sleek = enabled;
    const reactor = this.elements.reactor;
    if (reactor) {
      reactor.classList.toggle('sleek', enabled);

      // Update state dot color for sleek mode
      if (this.elements.stateDot && enabled) {
        const sleekColors = this.themeColors.sleek;
        const color = sleekColors[this.currentState] || sleekColors.idle;
        this.elements.stateDot.style.color = color;
        this.elements.stateDot.style.backgroundColor = color;
      }

      // Update ring colors for sleek mode
      if (enabled) {
        const sleekColors = this.themeColors.sleek;
        if (this.elements.rings.idle) this.elements.rings.idle.style.borderColor = sleekColors.idle;
        if (this.elements.rings.listening)
          this.elements.rings.listening.style.borderColor = sleekColors.listening;
        if (this.elements.rings.thinking)
          this.elements.rings.thinking.style.borderColor = sleekColors.thinking;
        if (this.elements.rings.speaking)
          this.elements.rings.speaking.style.borderColor = sleekColors.speaking;
      }
    }
  }

  destroy() {
    this.disconnect();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.container.innerHTML = '';
  }
}

// ─── Factory Function for React-like Usage ───

export function createCoreReactor(container, options) {
  return new CoreReactor(container, options);
}
