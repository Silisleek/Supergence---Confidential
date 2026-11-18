import { mountWorkspaceAppearance } from './workspace-appearance.js';
import { mountComponentAppearance } from './workspace-component-appearance.js';

(() => {
  let dialog = null;
  let activeTab = 'styles';
  let cachedSettings = null;
  let savedProactive = null;
  let loading = false;

  const svgIcons = {
    general: '<path d="M4 7h16M4 12h16M4 17h16M8 4v6m8-1v6m-5-1v6"/>',
    styles: '<path d="M12 2v20M2 12h20M7 7l10 10M17 7 7 17"/>',
    provider: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    paths: '<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/>',
    runtime: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    system: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    spark:
      '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  };

  const getSvg = (name) =>
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgIcons[name] || svgIcons.spark}</svg>`;

  function mount() {
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'supergenceStylesWindow';
    dialog.className = 'supergence-styles-dialog';
    dialog.setAttribute('aria-labelledby', 'stylesWindowTitle');

    dialog.innerHTML = `
      <header class="sw-header">
        <h2 class="sw-title" id="stylesWindowTitle">Settings</h2>
        <button type="button" class="sw-close-btn" id="swCloseBtn" aria-label="Close settings window">${getSvg('close')}</button>
      </header>

      <nav class="sw-nav" role="tablist" aria-label="Settings categories">
        <button type="button" class="sw-nav-tab" role="tab" data-tab="general" aria-selected="true">${getSvg('general')}<span>General</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="styles" aria-selected="false">${getSvg('styles')}<span>Appearance</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="provider" aria-selected="false">${getSvg('provider')}<span>Models &amp; providers</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="paths" aria-selected="false">${getSvg('paths')}<span>Storage</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="runtime" aria-selected="false">${getSvg('runtime')}<span>Access &amp; autonomy</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="system" aria-selected="false">${getSvg('system')}<span>System</span></button>
      </nav>

      <div class="sw-body">
        <section class="sw-pane" id="swPaneGeneral" role="tabpanel">
          <div class="sw-card">
            <h3 class="sw-card-title">Workspace preferences</h3>
            <div id="swGeneralControls"></div>
            <button type="button" class="sw-btn sw-btn-secondary" id="swResetPanels">Reset panel sizes</button>
          </div>
          <details class="sw-card" id="swGeneralPins">
            <summary>Agent pins <span class="sg-agent-pin-count" role="status"></span></summary>
            <div class="sg-agent-pin-list"></div>
          </details>
        </section>
        <section class="sw-pane" id="swPaneStyles" role="tabpanel" hidden>
          <div class="sw-card" id="swWorkspaceAppearance"></div>
          <div class="sw-card">
            <h3 class="sw-card-title">UI Style &amp; Workspace Architecture</h3>
            <p class="sw-card-desc">Select your workspace layout and agent interaction style.</p>
            <div class="sw-theme-grid" role="radiogroup" aria-label="UI style selection">
              <button type="button" class="sw-font-btn sw-ui-style-btn" data-ui-style="flow-canvas" role="radio" aria-checked="false">
                <strong style="display:block; font-size:13.5px; margin:4px 0 2px 0;">Agent Flow Canvas</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Multi-agent graph canvas with bezier wires &amp; live cards</span>
              </button>
              <button type="button" class="sw-font-btn sw-ui-style-btn" data-ui-style="obsidian-studio" role="radio" aria-checked="true">
                <strong style="display:block; font-size:13.5px; margin:4px 0 2px 0;">Obsidian Studio</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Deep dark 3D landscape with agent beacons &amp; composer</span>
              </button>
            </div>
          </div>

          <div class="sw-card">
            <h3 class="sw-card-title">Theme Palette</h3>
            <p class="sw-card-desc">Choose a dark palette for your workspace.</p>
            <div class="sw-theme-grid sw-palette-grid" role="radiogroup" aria-label="Theme palette">
              <button type="button" class="sw-theme-btn" data-theme-val="obsidian" role="radio" aria-checked="true">
                <div class="sw-theme-swatches" data-palette-preview="obsidian" aria-hidden="true">
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                </div>
                <strong>Obsidian</strong>
              </button>
              <button type="button" class="sw-theme-btn" data-theme-val="warm" role="radio" aria-checked="false">
                <div class="sw-theme-swatches" data-palette-preview="warm" aria-hidden="true">
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                </div>
                <strong>Charcoal</strong>
              </button>
              <button type="button" class="sw-theme-btn" data-theme-val="midnight" role="radio" aria-checked="false">
                <div class="sw-theme-swatches" data-palette-preview="midnight" aria-hidden="true">
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                </div>
                <strong>Midnight</strong>
              </button>
              <button type="button" class="sw-theme-btn" data-theme-val="cyber" role="radio" aria-checked="false">
                <div class="sw-theme-swatches" data-palette-preview="cyber" aria-hidden="true">
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                  <span class="sw-swatch"></span>
                </div>
                <strong>Graphite</strong>
              </button>
            </div>
          </div>

          <div class="sw-card">
            <h3 class="sw-card-title">Typography &amp; Font</h3>
            <p class="sw-card-desc">Select the font pairing used across conversations, agent tools, and code.</p>
            <div class="sw-theme-grid">
              <button type="button" class="sw-font-btn" data-font-val="editorial" role="radio" aria-checked="true" style="padding:12px; border-radius:12px; background:var(--shell-surface); border:0; color:inherit; text-align:left; cursor:pointer;">
                <strong style="display:block; font-family:'Instrument Serif', serif; font-size:15px; margin-bottom:4px;">Editorial Luxury</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Instrument Serif + DM Sans</span>
              </button>
              <button type="button" class="sw-font-btn" data-font-val="sans" role="radio" aria-checked="false" style="padding:12px; border-radius:12px; background:var(--shell-surface); border:0; color:inherit; text-align:left; cursor:pointer;">
                <strong style="display:block; font-family:'Manrope', sans-serif; font-size:13px; margin-bottom:4px;">Modern Geometric</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Manrope + Inter Sans</span>
              </button>
              <button type="button" class="sw-font-btn" data-font-val="mono" role="radio" aria-checked="false" style="padding:12px; border-radius:12px; background:var(--shell-surface); border:0; color:inherit; text-align:left; cursor:pointer;">
                <strong style="display:block; font-family:'JetBrains Mono', monospace; font-size:12px; margin-bottom:4px;">Hacker Mono</strong>
                <span style="font-size:11px; color:var(--shell-muted);">JetBrains Monospace</span>
              </button>
              <button type="button" class="sw-font-btn" data-font-val="grotesk" role="radio" aria-checked="false" style="padding:12px; border-radius:12px; background:var(--shell-surface); border:0; color:inherit; text-align:left; cursor:pointer;">
                <strong style="display:block; font-family:'Space Grotesk', sans-serif; font-size:13px; margin-bottom:4px;">Space Grotesk</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Futuristic Neo-Grotesque</span>
              </button>
            </div>
          </div>

          <div class="sw-card">
            <h3 class="sw-card-title">Setup &amp; Sleek Account Connection</h3>
            <p class="sw-card-desc">Review your onboarding personalization or reconnect your verified Sleek ID.</p>
            <button type="button" id="swOpenSetupWizardBtn" class="sw-btn sw-btn-secondary" style="margin-top:6px;">
              Reopen Theme, Font &amp; Sleek Connect Wizard
            </button>
          </div>

        </section>

        <section class="sw-pane" id="swPaneProvider" role="tabpanel" hidden>
          <div id="swModelProfiles"></div>
          <div class="sw-card">
            <h3 class="sw-card-title">Intelligence Gateway &amp; Models</h3>
            <p class="sw-card-desc">Configure the AI model provider. Works with local OpenCode routers, OpenRouter, vLLM, Ollama, and OpenAI-compatible gateways.</p>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swBaseUrl">Provider Base URL (BASE_URL)</label>
              <input type="text" class="sw-input" id="swBaseUrl" placeholder="https://openrouter.ai/api/v1" autocomplete="off" spellcheck="false">
            </div>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swApiKey">API Key (API_KEY)</label>
              <div class="sw-input-row">
                <input type="password" class="sw-input" id="swApiKey" placeholder="Enter provider API key" autocomplete="off" spellcheck="false">
                <button type="button" class="sw-btn sw-btn-secondary" id="swToggleKeyVisibility" style="padding:10px 14px;">Show</button>
              </div>
            </div>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swDefaultModel">Primary Model (DEFAULT_MODEL)</label>
              <input type="text" class="sw-input" id="swDefaultModel" placeholder="openai/gpt-4o-mini" autocomplete="off" spellcheck="false">
            </div>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swFallbackModel">Fallback Model (FALLBACK_MODEL)</label>
              <input type="text" class="sw-input" id="swFallbackModel" placeholder="Optional secondary fallback model" autocomplete="off" spellcheck="false">
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:12px; flex-wrap:wrap;">
              <button type="button" class="sw-btn sw-btn-secondary" id="swTestConnBtn">Test Provider Connection</button>
              <span id="swTestBadge" class="sw-status-badge" style="display:none;"></span>
            </div>
          </div>
        </section>

        <section class="sw-pane" id="swPanePaths" role="tabpanel" hidden>
          <div class="sw-card">
            <h3 class="sw-card-title">Filesystem Paths &amp; Workspaces</h3>
            <p class="sw-card-desc">Task files are organized in workspaces. Commands run with your operating system permissions and are not OS-isolated.</p>

            <div class="sw-path-item">
              <span class="sw-path-label">Workspace Base</span>
              <span class="sw-path-value" id="swPathWorkspace">workspace/</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">Chat Sandboxes</span>
              <span class="sw-path-value" id="swPathChats">workspace/chats/</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">Data Directory</span>
              <span class="sw-path-value" id="swPathData">data/</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">Project Root</span>
              <span class="sw-path-value" id="swPathProject">-</span>
            </div>
          </div>

          <div class="sw-card">
            <h3 class="sw-card-title">Proactive Inspection Folders</h3>
            <p class="sw-card-desc">Folders reviewed during periodic proactive scans for intelligent task proposals:</p>
            <div id="swProactiveFoldersList" style="display:flex; flex-direction:column; gap:8px;">
              <label class="sw-toggle-row">
                <div class="sw-toggle-info">
                  <span class="sw-toggle-title">Workspace</span>
                  <span class="sw-toggle-desc" id="swFolderDescWorkspace">Local project workspace sandbox</span>
                </div>
                <input type="checkbox" class="sw-checkbox" data-folder="workspace" checked>
              </label>
              <label class="sw-toggle-row">
                <div class="sw-toggle-info">
                  <span class="sw-toggle-title">Desktop</span>
                  <span class="sw-toggle-desc" id="swFolderDescDesktop">-</span>
                </div>
                <input type="checkbox" class="sw-checkbox" data-folder="desktop" checked>
              </label>
              <label class="sw-toggle-row">
                <div class="sw-toggle-info">
                  <span class="sw-toggle-title">Documents</span>
                  <span class="sw-toggle-desc" id="swFolderDescDocuments">-</span>
                </div>
                <input type="checkbox" class="sw-checkbox" data-folder="documents" checked>
              </label>
              <label class="sw-toggle-row">
                <div class="sw-toggle-info">
                  <span class="sw-toggle-title">Downloads</span>
                  <span class="sw-toggle-desc" id="swFolderDescDownloads">-</span>
                </div>
                <input type="checkbox" class="sw-checkbox" data-folder="downloads" checked>
              </label>
            </div>
          </div>
        </section>

        <section class="sw-pane" id="swPaneRuntime" role="tabpanel" hidden>
          <div class="sw-card">
            <h3 class="sw-card-title">Tool permissions</h3>
            <div id="swAccessControls"></div>
          </div>

          <div class="sw-card">
            <h3 class="sw-card-title">Proactive Task Suggestions</h3>
            <label class="sw-toggle-row">
              <div class="sw-toggle-info">
                <span class="sw-toggle-title">Enable Periodic Proactive Scans</span>
                <span class="sw-toggle-desc">Scans selected folders to propose helpful tasks and automations.</span>
              </div>
              <input type="checkbox" class="sw-checkbox" id="swProactiveEnabled" checked>
            </label>
            <div class="sw-field-group" style="margin-top:6px;">
              <label class="sw-field-label" for="swProactiveInterval">Scan Interval</label>
              <select class="sw-select" id="swProactiveInterval">
                <option value="60">Every 1 Hour (60 minutes)</option>
                <option value="90" selected>Every 90 Minutes (Recommended)</option>
                <option value="120">Every 2 Hours (120 minutes)</option>
              </select>
            </div>
            <label class="sw-toggle-row">
              <div class="sw-toggle-info">
                <span class="sw-toggle-title">Foreground Window Activity Context</span>
                <span class="sw-toggle-desc">Include current active window title to tailor relevant next steps.</span>
              </div>
              <input type="checkbox" class="sw-checkbox" id="swProactiveActivity" checked>
            </label>
            <div style="margin-top:6px;">
              <button type="button" class="sw-btn sw-btn-secondary" id="swTriggerProactiveBtn">Trigger Scan Now</button>
            </div>
          </div>
        </section>

        <section class="sw-pane" id="swPaneSystem" role="tabpanel" hidden>
          <div class="sw-card">
            <h3 class="sw-card-title">Host &amp; Process Telemetry</h3>
            <p class="sw-card-desc">Real, measured metrics reported directly from the Node backend.</p>

            <div class="sw-path-item">
              <span class="sw-path-label">Server Port</span>
              <span class="sw-path-value" id="swSysPort">-</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">Node Runtime</span>
              <span class="sw-path-value" id="swSysNode">-</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">OS Platform</span>
              <span class="sw-path-value" id="swSysPlatform">-</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">Process Memory</span>
              <span class="sw-path-value" id="swSysMemory">-</span>
            </div>
            <div class="sw-path-item">
              <span class="sw-path-label">Uptime</span>
              <span class="sw-path-value" id="swSysUptime">-</span>
            </div>
          </div>
        </section>
      </div>

      <footer class="sw-footer">
        <span class="sw-feedback" id="swFeedback" role="status"></span>
        <div class="sw-actions">
          <button type="button" class="sw-btn sw-btn-primary" id="swSaveBtn">${getSvg('check')}<span>Save changes</span></button>
        </div>
      </footer>
    `;

    document.body.appendChild(dialog);
    mountWorkspaceAppearance(dialog.querySelector('#swWorkspaceAppearance'));
    mountComponentAppearance(() => {
      openStylesWindow('styles');
      dialog.querySelector('#swBackground').focus();
    });
    const general = dialog.querySelector('#swGeneralControls');
    for (const id of ['shellSoundsPreference', 'shellCompactPreference', 'shellMotionPreference', 'shellAutostartPreference']) {
      const row = document.getElementById(id)?.closest('label');
      if (row) general.append(row);
    }
    setupEvents();
    return dialog;
  }

  function setupEvents() {
    dialog.querySelector('#swCloseBtn')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      const key = dialog.querySelector('#swApiKey');
      key.value = '';
      key.type = 'password';
      dialog.querySelector('#swToggleKeyVisibility').textContent = 'Show';
    });

    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)
      ) {
        dialog.close();
      }
    });

    const tabs = [...dialog.querySelectorAll('.sw-nav-tab')];
    const vertical = window.matchMedia('(min-width: 720px)');
    const nav = dialog.querySelector('.sw-nav');
    const setOrientation = () => nav.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
    setOrientation();
    vertical.addEventListener('change', setOrientation);
    tabs.forEach((tabBtn, index) => {
      const tab = tabBtn.dataset.tab;
      const panel = dialog.querySelector(`#swPane${tab[0].toUpperCase()}${tab.slice(1)}`);
      tabBtn.id = `swTab-${tab}`;
      tabBtn.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-labelledby', tabBtn.id);
      tabBtn.addEventListener('click', () => switchTab(tabBtn.dataset.tab));
      tabBtn.addEventListener('keydown', (event) => {
        const next = {
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowRight: (index + 1) % tabs.length,
          ArrowUp: vertical.matches ? (index + tabs.length - 1) % tabs.length : undefined,
          ArrowDown: vertical.matches ? (index + 1) % tabs.length : undefined,
          Home: 0,
          End: tabs.length - 1,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        switchTab(tabs[next].dataset.tab);
        tabs[next].focus();
      });
    });
    dialog.querySelector('#swGeneralPins').addEventListener('toggle', (event) => {
      if (event.target.open) window.SupergenceLiquidGlass?.refreshAgentPins();
    });
    dialog.querySelector('#swResetPanels').addEventListener('click', () => {
      if (!window.SupergenceLiquidGlass) return;
      window.SupergenceLiquidGlass.resetPanelSizes();
      dialog.querySelector('#swFeedback').textContent = 'Panel sizes reset.';
    });

    dialog.querySelectorAll('.sw-ui-style-btn').forEach((styleBtn) => {
      styleBtn.addEventListener('click', () => {
        const styleId = styleBtn.dataset.uiStyle;
        dialog
          .querySelectorAll('.sw-ui-style-btn')
          .forEach((b) => b.setAttribute('aria-checked', 'false'));
        styleBtn.setAttribute('aria-checked', 'true');
        if (window.__sisApplyUIStyle) window.__sisApplyUIStyle(styleId);
      });
    });

    dialog.querySelectorAll('.sw-theme-btn').forEach((themeBtn) => {
      themeBtn.addEventListener('click', () => {
        const themeVal = themeBtn.dataset.themeVal;
        selectTheme(themeVal);
      });
    });

    dialog.querySelectorAll('[data-font-val]').forEach((fontBtn) => {
      fontBtn.addEventListener('click', () => {
        const fontVal = fontBtn.dataset.fontVal;
        selectFont(fontVal);
      });
    });

    dialog.querySelector('#swOpenSetupWizardBtn')?.addEventListener('click', () => {
      if (window.openSupergenceSetup) {
        window.openSupergenceSetup();
        dialog.close();
      }
    });

    const keyInput = dialog.querySelector('#swApiKey');
    const toggleKeyBtn = dialog.querySelector('#swToggleKeyVisibility');
    toggleKeyBtn?.addEventListener('click', () => {
      if (!keyInput) return;
      const isPassword = keyInput.type === 'password';
      keyInput.type = isPassword ? 'text' : 'password';
      toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
    });

    dialog.querySelector('#swTestConnBtn')?.addEventListener('click', testConnection);
    dialog
      .querySelector('#swTriggerProactiveBtn')
      ?.addEventListener('click', triggerProactiveCheck);
    dialog.querySelector('#swSaveBtn')?.addEventListener('click', saveSettings);
    window.addEventListener('sis-model-changed', ({ detail }) => {
      const active = detail?.active;
      const provider = cachedSettings?.provider;
      if (!active || !provider) return;
      for (const [selector, field, value] of [
        ['#swBaseUrl', 'baseURL', active.baseURL],
        ['#swDefaultModel', 'defaultModel', active.model],
      ]) {
        const input = dialog.querySelector(selector);
        if (input.value === (provider[field] || '')) input.value = value || '';
        provider[field] = value;
      }
    });

    document.querySelectorAll('[data-v="settings"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openStylesWindow();
      });
    });
  }

  function switchTab(tabId) {
    if (!dialog.querySelector(`#swTab-${tabId}`)) tabId = 'general';
    activeTab = tabId;
    dialog.querySelectorAll('.sw-nav-tab').forEach((btn) => {
      const selected = btn.dataset.tab === tabId;
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
    });

    dialog.querySelectorAll('.sw-pane').forEach((pane) => {
      pane.hidden = pane.id !== `swPane${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`;
    });
    dialog.querySelector('#swSaveBtn').hidden = !['provider', 'paths', 'runtime'].includes(tabId);
    if (tabId === 'provider') window.SisModelSwitcher?.mountInSettings(dialog.querySelector('#swModelProfiles'));
    if (tabId === 'runtime') window.SupergenceAccess?.mount(dialog.querySelector('#swAccessControls'));
  }

  function selectTheme(themeVal) {
    dialog.querySelectorAll('.sw-theme-btn').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.themeVal === themeVal));
    });
    document.body.dataset.theme = themeVal;
    localStorage.setItem('sis-ui-theme', themeVal);
    const selectEl = document.getElementById('shellThemePreference');
    if (selectEl) selectEl.value = themeVal;
  }

  function selectFont(fontVal) {
    dialog.querySelectorAll('[data-font-val]').forEach((btn) => {
      const isSelected = btn.dataset.fontVal === fontVal;
      btn.setAttribute('aria-checked', String(isSelected));
      btn.style.borderColor = isSelected ? 'var(--shell-accent)' : 'var(--shell-border)';
      btn.style.background = isSelected
        ? 'color-mix(in srgb, var(--shell-accent) 12%, var(--shell-surface))'
        : 'var(--shell-surface)';
    });
    document.body.dataset.font = fontVal;
    localStorage.setItem('sis-ui-font', fontVal);
  }

  async function loadSettings() {
    mount();
    cachedSettings = null;
    savedProactive = null;

    const storedTheme = localStorage.getItem('sis-ui-theme');
    selectTheme(
      ['obsidian', 'warm', 'midnight', 'cyber'].includes(storedTheme) ? storedTheme : 'warm',
    );

    const storedFont = localStorage.getItem('sis-ui-font') || 'editorial';
    selectFont(storedFont);

    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        cachedSettings = data;

        if (data.provider) {
          const baseUrlEl = dialog.querySelector('#swBaseUrl');
          const modelEl = dialog.querySelector('#swDefaultModel');
          const fallbackEl = dialog.querySelector('#swFallbackModel');
          if (baseUrlEl) baseUrlEl.value = data.provider.baseURL || '';
          if (modelEl) modelEl.value = data.provider.defaultModel || '';
          if (fallbackEl) fallbackEl.value = data.provider.fallbackModel || '';
        }

        if (data.paths) {
          const wsPathEl = dialog.querySelector('#swPathWorkspace');
          const chatsPathEl = dialog.querySelector('#swPathChats');
          const dataPathEl = dialog.querySelector('#swPathData');
          const projPathEl = dialog.querySelector('#swPathProject');
          if (wsPathEl) wsPathEl.textContent = data.paths.workspaceDir || 'workspace/';
          if (chatsPathEl)
            chatsPathEl.textContent = data.paths.chatsWorkspaceDir || 'workspace/chats/';
          if (dataPathEl) dataPathEl.textContent = data.paths.dataDir || 'data/';
          if (projPathEl) projPathEl.textContent = data.paths.projectRoot || '-';

          if (data.paths.osPaths) {
            const descD = dialog.querySelector('#swFolderDescDesktop');
            const descDoc = dialog.querySelector('#swFolderDescDocuments');
            const descDl = dialog.querySelector('#swFolderDescDownloads');
            if (descD) descD.textContent = data.paths.osPaths.desktop || '-';
            if (descDoc) descDoc.textContent = data.paths.osPaths.documents || '-';
            if (descDl) descDl.textContent = data.paths.osPaths.downloads || '-';
          }
        }

        if (data.system) {
          const portEl = dialog.querySelector('#swSysPort');
          const nodeEl = dialog.querySelector('#swSysNode');
          const platEl = dialog.querySelector('#swSysPlatform');
          const memEl = dialog.querySelector('#swSysMemory');
          const uptimeEl = dialog.querySelector('#swSysUptime');
          if (portEl) portEl.textContent = String(data.provider?.port || 3001);
          if (nodeEl) nodeEl.textContent = data.system.nodeVersion || 'Unavailable';
          if (platEl)
            platEl.textContent = `${data.system.platform || '-'} (${data.system.arch || '-'})`;
          if (memEl)
            memEl.textContent = `RSS: ${data.system.memory?.rssMb || 0} MB · Heap: ${data.system.memory?.heapMb || 0} MB`;
          if (uptimeEl) {
            const sec = data.system.uptime || 0;
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            uptimeEl.textContent = `${h}h ${m}m ${s}s`;
          }

        }
      }
    } catch (_) {}

    try {
      const resP = await fetch('/api/proactive-suggestions');
      if (resP.ok) {
        const pData = await resP.json();
        if (pData?.settings) {
          savedProactive = pData.settings;
          const enEl = dialog.querySelector('#swProactiveEnabled');
          const intEl = dialog.querySelector('#swProactiveInterval');
          const actEl = dialog.querySelector('#swProactiveActivity');
          if (enEl) enEl.checked = Boolean(pData.settings.enabled);
          if (intEl) intEl.value = String(pData.settings.intervalMinutes || 90);
          if (actEl) actEl.checked = Boolean(pData.settings.activity);

          if (Array.isArray(pData.settings.folders)) {
            dialog
              .querySelectorAll('#swProactiveFoldersList input[type="checkbox"]')
              .forEach((chk) => {
                chk.checked = pData.settings.folders.includes(chk.dataset.folder);
              });
          }
        }
      }
    } catch (_) {}
    const unavailable = [
      !cachedSettings && 'Provider and system settings',
      !savedProactive && 'Proactive scan settings',
    ].filter(Boolean);
    dialog.querySelector('#swFeedback').textContent = unavailable.length
      ? `${unavailable.join(' and ')} unavailable.`
      : '';
  }

  async function testConnection() {
    const badge = dialog.querySelector('#swTestBadge');
    const testBtn = dialog.querySelector('#swTestConnBtn');
    const baseUrl = dialog.querySelector('#swBaseUrl')?.value.trim();
    const apiKey = dialog.querySelector('#swApiKey')?.value.trim();
    const model = dialog.querySelector('#swDefaultModel')?.value.trim();

    if (!baseUrl) {
      if (badge) {
        badge.style.display = 'inline-flex';
        badge.dataset.status = 'error';
        badge.textContent = 'Base URL is required';
      }
      return;
    }

    if (testBtn) testBtn.disabled = true;
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.dataset.status = 'testing';
      badge.textContent = 'Testing connection...';
    }

    try {
      const start = Date.now();
      const res = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseURL: baseUrl, apiKey, model: model || 'openai/gpt-4o-mini' }),
      });
      const data = await res.json();
      const latency = Date.now() - start;

      if (data.success) {
        badge.dataset.status = 'online';
        badge.textContent = `Connected (${latency} ms) · Model OK`;
      } else {
        badge.dataset.status = 'error';
        badge.textContent = data.error || 'Connection failed';
      }
    } catch (err) {
      badge.dataset.status = 'error';
      badge.textContent = err.message || 'Request failed';
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }

  async function triggerProactiveCheck() {
    const feedback = dialog.querySelector('#swFeedback');
    const btn = dialog.querySelector('#swTriggerProactiveBtn');
    if (btn) btn.disabled = true;
    if (feedback) feedback.textContent = 'Running proactive scan over selected folders...';

    try {
      const res = await fetch('/api/proactive-suggestions/check', { method: 'POST' });
      const data = await res.json();
      if (feedback) {
        feedback.textContent = data.generatedCount
          ? `Scan complete: ${data.generatedCount} suggestion(s) found`
          : 'Scan complete: No pending action items';
      }
    } catch (err) {
      if (feedback) feedback.textContent = `Scan notice: ${err.message}`;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function saveSettings() {
    if (loading) return;
    const saveBtn = dialog.querySelector('#swSaveBtn');
    const feedback = dialog.querySelector('#swFeedback');
    if ((activeTab === 'provider' && !cachedSettings?.provider) ||
      (['paths', 'runtime'].includes(activeTab) && !savedProactive)) {
      feedback.textContent = 'These settings are unavailable. Reopen Settings to retry.';
      return;
    }
    if (saveBtn) saveBtn.disabled = true;
    if (feedback) feedback.textContent = 'Applying settings...';

    const baseUrl = dialog.querySelector('#swBaseUrl')?.value.trim();
    const apiKey = dialog.querySelector('#swApiKey')?.value.trim();
    const defaultModel = dialog.querySelector('#swDefaultModel')?.value.trim();
    const fallbackModel = dialog.querySelector('#swFallbackModel')?.value.trim();

    const selectedFolders = [];
    dialog.querySelectorAll('#swProactiveFoldersList input[type="checkbox"]').forEach((chk) => {
      if (chk.checked && chk.dataset.folder) selectedFolders.push(chk.dataset.folder);
    });

    const proactiveEnabled = dialog.querySelector('#swProactiveEnabled')?.checked ?? true;
    const proactiveInterval = parseInt(
      dialog.querySelector('#swProactiveInterval')?.value || '90',
      10,
    );
    const proactiveActivity = dialog.querySelector('#swProactiveActivity')?.checked ?? true;
    const provider = cachedSettings?.provider;
    const providerChanged = provider && (Boolean(apiKey) ||
      baseUrl !== (provider.baseURL || '') ||
      defaultModel !== (provider.defaultModel || '') ||
      fallbackModel !== (provider.fallbackModel || ''));
    const proactive = {
      enabled: proactiveEnabled,
      intervalMinutes: proactiveInterval,
      activity: proactiveActivity,
      folders: selectedFolders,
    };
    const proactiveChanged = savedProactive && (
      proactive.enabled !== Boolean(savedProactive.enabled) ||
      proactive.activity !== Boolean(savedProactive.activity) ||
      proactive.intervalMinutes !== Number(savedProactive.intervalMinutes) ||
      [...proactive.folders].sort().join(',') !== [...(savedProactive.folders || [])].sort().join(',')
    );

    try {
      if (providerChanged) {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseURL: baseUrl, apiKey: apiKey || undefined, defaultModel, fallbackModel }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Provider settings could not be saved.');
        cachedSettings.provider = result.provider;
        dialog.querySelector('#swApiKey').value = '';
        void window.SisModelSwitcher?.refresh();
      }
      if (proactiveChanged) {
        const response = await fetch('/api/proactive-suggestions/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proactive),
        });
        const result = await response.json();
        if (!response.ok || result.success === false) throw new Error(result.error || 'Proactive settings could not be saved.');
        savedProactive = result.settings || proactive;
      }
      if (feedback) feedback.textContent = providerChanged || proactiveChanged
        ? 'Changes saved.'
        : 'No changes to save.';
    } catch (err) {
      if (feedback) feedback.textContent = `Error saving settings: ${err.message}`;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function openStylesWindow(tab = 'general') {
    mount();
    const wasOpen = dialog.open;
    if (!wasOpen) dialog.showModal();
    switchTab(tab);
    dialog.querySelector(`#swTab-${activeTab}`).focus();
    if (!wasOpen && !loading) {
      const save = dialog.querySelector('#swSaveBtn');
      loading = true;
      save.disabled = true;
      void loadSettings().finally(() => {
        loading = false;
        save.disabled = false;
      });
    }
  }

  function toggleStylesWindow(tab = 'styles') {
    mount();
    if (dialog.open) {
      dialog.close();
    } else {
      openStylesWindow(tab);
    }
  }

  window.openStylesWindow = openStylesWindow;
  window.toggleStylesWindow = toggleStylesWindow;

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === ',') {
      event.preventDefault();
      openStylesWindow();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
