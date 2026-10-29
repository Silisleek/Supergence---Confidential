(() => {
  let dialog = null;
  let activeTab = 'styles';
  let cachedSettings = null;

  const svgIcons = {
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
        <div>
          <span class="sw-eyebrow">System Architecture &amp; Theme</span>
          <h2 class="sw-title" id="stylesWindowTitle">Workspace <em class="sw-editorial">Styles &amp; Control</em></h2>
        </div>
        <button type="button" class="sw-close-btn" id="swCloseBtn" aria-label="Close settings window">${getSvg('close')}</button>
      </header>

      <nav class="sw-nav" role="tablist" aria-label="Settings categories">
        <button type="button" class="sw-nav-tab" role="tab" data-tab="styles" aria-selected="true">${getSvg('styles')}<span>Appearance &amp; Style</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="provider" aria-selected="false">${getSvg('provider')}<span>API Providers</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="paths" aria-selected="false">${getSvg('paths')}<span>Paths &amp; Storage</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="runtime" aria-selected="false">${getSvg('runtime')}<span>Autonomy &amp; Access</span></button>
        <button type="button" class="sw-nav-tab" role="tab" data-tab="system" aria-selected="false">${getSvg('system')}<span>System Telemetry</span></button>
      </nav>

      <div class="sw-body">
        <section class="sw-pane" id="swPaneStyles" role="tabpanel">
          <div class="sw-card">
            <h3 class="sw-card-title">Theme Palette</h3>
            <p class="sw-card-desc">Deep dark work areas with brown outer surfaces and copper highlights.</p>
            <div class="sw-theme-grid">
              <button type="button" class="sw-theme-btn" data-theme-val="neutral" role="radio" aria-checked="true">
                <div class="sw-theme-swatches">
                  <span class="sw-swatch" style="background:#211a16;"></span>
                  <span class="sw-swatch" style="background:#0b0c0c;"></span>
                  <span class="sw-swatch" style="background:#191b1b;"></span>
                  <span class="sw-swatch" style="background:#e0b38c;"></span>
                </div>
                <strong>Charcoal</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Dark charcoal with an espresso frame</span>
              </button>
              <button type="button" class="sw-theme-btn" data-theme-val="warm" role="radio" aria-checked="false">
                <div class="sw-theme-swatches">
                  <span class="sw-swatch" style="background:#2a2019;"></span>
                  <span class="sw-swatch" style="background:#0c0b0a;"></span>
                  <span class="sw-swatch" style="background:#1c1b19;"></span>
                  <span class="sw-swatch" style="background:#e9b98f;"></span>
                </div>
                <strong>Walnut</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Golden copper and roast amber</span>
              </button>
              <button type="button" class="sw-theme-btn" data-theme-val="midnight" role="radio" aria-checked="false">
                <div class="sw-theme-swatches">
                  <span class="sw-swatch" style="background:#1a1613;"></span>
                  <span class="sw-swatch" style="background:#080909;"></span>
                  <span class="sw-swatch" style="background:#171818;"></span>
                  <span class="sw-swatch" style="background:#cfa98c;"></span>
                </div>
                <strong>Cocoa</strong>
                <span style="font-size:11px; color:var(--shell-muted);">Rich dark chocolate and rose copper</span>
              </button>
            </div>
          </div>

          <div class="sw-preview-card">
            <p class="sw-preview-quote">"Thinking alongside you in borderless clarity."</p>
            <p class="sw-preview-body">Crafted with locally bundled Manrope UI sans-serif and selective Instrument Serif display moments. Borderless surfaces with purposeful elevation and copper orbital light.</p>
          </div>

          <div class="sw-card">
            <h3 class="sw-card-title">Motion &amp; Interaction</h3>
            <label class="sw-toggle-row">
              <div class="sw-toggle-info">
                <span class="sw-toggle-title">Ambient Motion &amp; Particles</span>
                <span class="sw-toggle-desc">Background copper particle physics and pointer hover glow. Respects system reduced-motion.</span>
              </div>
              <input type="checkbox" class="sw-checkbox" id="swOptMotion">
            </label>
            <label class="sw-toggle-row">
              <div class="sw-toggle-info">
                <span class="sw-toggle-title">Acoustic Audio Feedback</span>
                <span class="sw-toggle-desc">Subtle sci-fi sound effects when sending prompts and switching tabs.</span>
              </div>
              <input type="checkbox" class="sw-checkbox" id="swOptSounds">
            </label>
            <label class="sw-toggle-row">
              <div class="sw-toggle-info">
                <span class="sw-toggle-title">Compact Workspace Spacing</span>
                <span class="sw-toggle-desc">Tighter paddings to keep more of the conversation in view.</span>
              </div>
              <input type="checkbox" class="sw-checkbox" id="swOptCompact">
            </label>
          </div>
        </section>

        <section class="sw-pane" id="swPaneProvider" role="tabpanel" hidden>
          <div class="sw-card">
            <h3 class="sw-card-title">Intelligence Gateway &amp; Models</h3>
            <p class="sw-card-desc">Configure the AI model provider. Works with local OpenCode routers, OpenRouter, vLLM, Ollama, and OpenAI-compatible gateways.</p>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swBaseUrl">Provider Base URL (BASE_URL)</label>
              <input type="text" class="sw-input" id="swBaseUrl" placeholder="http://127.0.0.1:20128/v1" autocomplete="off" spellcheck="false">
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
              <input type="text" class="sw-input" id="swDefaultModel" placeholder="opus-4.6" autocomplete="off" spellcheck="false">
            </div>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swFallbackModel">Fallback Model (FALLBACK_MODEL)</label>
              <input type="text" class="sw-input" id="swFallbackModel" placeholder="Optional secondary fallback model" autocomplete="off" spellcheck="false">
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
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
            <h3 class="sw-card-title">Execution Autonomy &amp; Permissions</h3>
            <p class="sw-card-desc">Control whether Supergence executes commands and file creations without pausing for confirmation checkpoints.</p>

            <div class="sw-field-group">
              <label class="sw-field-label" for="swAccessMode">Autonomy Mode</label>
              <select class="sw-select" id="swAccessMode">
                <option value="full-access">Full Access (Autonomous execution, auto double-checks task completion)</option>
                <option value="approve-for-me">Routine Work Approved (Prompts only on destructive changes)</option>
                <option value="review-all">Review All (Requests approval before any tool run)</option>
              </select>
            </div>
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
        <span class="sw-feedback" id="swFeedback">Ready</span>
        <div class="sw-actions">
          <button type="button" class="sw-btn sw-btn-secondary" id="swResetBtn">Reset to Defaults</button>
          <button type="button" class="sw-btn sw-btn-primary" id="swSaveBtn">${getSvg('check')}<span>Save &amp; Apply</span></button>
        </div>
      </footer>
    `;

    document.body.appendChild(dialog);
    setupEvents();
    return dialog;
  }

  function setupEvents() {
    dialog.querySelector('#swCloseBtn')?.addEventListener('click', () => dialog.close());

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

    dialog.querySelectorAll('.sw-nav-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => switchTab(tabBtn.dataset.tab));
    });

    dialog.querySelectorAll('.sw-theme-btn').forEach((themeBtn) => {
      themeBtn.addEventListener('click', () => {
        const themeVal = themeBtn.dataset.themeVal;
        selectTheme(themeVal);
      });
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
    dialog.querySelector('#swResetBtn')?.addEventListener('click', resetDefaults);
    dialog.querySelector('#swSaveBtn')?.addEventListener('click', saveSettings);

    document.querySelectorAll('[data-v="settings"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openStylesWindow();
      });
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;
    dialog.querySelectorAll('.sw-nav-tab').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.tab === tabId));
    });

    dialog.querySelectorAll('.sw-pane').forEach((pane) => {
      pane.hidden = pane.id !== `swPane${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`;
    });
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

  async function loadSettings() {
    mount();

    const storedTheme = localStorage.getItem('sis-ui-theme') || 'neutral';
    selectTheme(storedTheme);

    const optMotion = dialog.querySelector('#swOptMotion');
    if (optMotion) {
      optMotion.checked = localStorage.getItem('sis-visual-motion') !== 'false';
    }

    const optSounds = dialog.querySelector('#swOptSounds');
    if (optSounds) {
      optSounds.checked = localStorage.getItem('sis-ui-sounds') === 'true';
    }

    const optCompact = dialog.querySelector('#swOptCompact');
    if (optCompact) {
      optCompact.checked = localStorage.getItem('sis-ui-compact') === 'true';
    }

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
          if (nodeEl) nodeEl.textContent = data.system.nodeVersion || process?.version || '-';
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

          const accessSelect = dialog.querySelector('#swAccessMode');
          if (accessSelect && data.system.accessMode) {
            accessSelect.value = data.system.accessMode;
          }
        }
      }
    } catch (_) {}

    try {
      const resP = await fetch('/api/proactive-suggestions');
      if (resP.ok) {
        const pData = await resP.json();
        if (pData?.settings) {
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
        body: JSON.stringify({ baseURL: baseUrl, apiKey, model: model || 'opus-4.6' }),
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

  function resetDefaults() {
    selectTheme('neutral');
    const optMotion = dialog.querySelector('#swOptMotion');
    const optSounds = dialog.querySelector('#swOptSounds');
    const optCompact = dialog.querySelector('#swOptCompact');
    if (optMotion) optMotion.checked = true;
    if (optSounds) optSounds.checked = true;
    if (optCompact) optCompact.checked = false;

    const baseUrlEl = dialog.querySelector('#swBaseUrl');
    const modelEl = dialog.querySelector('#swDefaultModel');
    const fallbackEl = dialog.querySelector('#swFallbackModel');
    if (baseUrlEl) baseUrlEl.value = 'http://127.0.0.1:20128/v1';
    if (modelEl) modelEl.value = 'opus-4.6';
    if (fallbackEl) fallbackEl.value = '';

    const accessSelect = dialog.querySelector('#swAccessMode');
    if (accessSelect) accessSelect.value = 'full-access';

    const feedback = dialog.querySelector('#swFeedback');
    if (feedback) feedback.textContent = 'Form reset to default values.';
  }

  async function saveSettings() {
    const saveBtn = dialog.querySelector('#swSaveBtn');
    const feedback = dialog.querySelector('#swFeedback');
    if (saveBtn) saveBtn.disabled = true;
    if (feedback) feedback.textContent = 'Applying settings...';

    const optMotion = dialog.querySelector('#swOptMotion');
    if (optMotion) {
      localStorage.setItem('sis-visual-motion', String(optMotion.checked));
      window.dispatchEvent(
        new CustomEvent('sis-motion-preference-changed', {
          detail: { enabled: optMotion.checked },
        }),
      );
    }

    const optSounds = dialog.querySelector('#swOptSounds');
    if (optSounds) {
      localStorage.setItem('sis-ui-sounds', String(optSounds.checked));
    }

    const optCompact = dialog.querySelector('#swOptCompact');
    if (optCompact) {
      localStorage.setItem('sis-ui-compact', String(optCompact.checked));
      document.body.dataset.compact = String(optCompact.checked);
    }

    const baseUrl = dialog.querySelector('#swBaseUrl')?.value.trim();
    const apiKey = dialog.querySelector('#swApiKey')?.value.trim();
    const defaultModel = dialog.querySelector('#swDefaultModel')?.value.trim();
    const fallbackModel = dialog.querySelector('#swFallbackModel')?.value.trim();
    const accessMode = dialog.querySelector('#swAccessMode')?.value;

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

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: baseUrl,
          apiKey,
          defaultModel,
          fallbackModel,
          accessMode,
        }),
      });

      await fetch('/api/proactive-suggestions/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: proactiveEnabled,
          intervalMinutes: proactiveInterval,
          activity: proactiveActivity,
          folders: selectedFolders,
        }),
      });

      if (feedback) feedback.textContent = '✓ All settings and styles successfully applied';
      if (typeof window.showToast === 'function') {
        window.showToast('Workspace settings & style applied', 'success');
      }
      setTimeout(() => {
        if (dialog.open) dialog.close();
      }, 700);
    } catch (err) {
      if (feedback) feedback.textContent = `Error saving settings: ${err.message}`;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function openStylesWindow(tab = 'styles') {
    mount();
    switchTab(tab);
    void loadSettings();
    if (!dialog.open) dialog.showModal();
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
