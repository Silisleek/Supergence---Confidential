(() => {
  let overlay = null;
  let currentStep = 1;
  let pollTimer = null;
  let setupOpener = null;

  function createModal() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'sis-onboarding-overlay';
    overlay.id = 'sisOnboardingModal';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sisOnboardingTitle');

    const activeTheme = localStorage.getItem('sis-ui-theme') || 'warm';
    const activeFont = localStorage.getItem('sis-ui-font') || 'editorial';

    overlay.innerHTML = `
      <div class="sis-onboarding-card">
        <header class="sis-ob-header">
          <h2 class="sis-ob-title" id="sisOnboardingTitle">Make Supergence <em>yours</em></h2>
          <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obClose">Close</button>
        </header>

        <nav class="sis-ob-stepper" aria-label="Setup steps">
          <button type="button" class="sis-ob-step is-active" data-ob-step="1" id="obStep1">
            <span class="sis-ob-num">1</span>
            <span>Theme</span>
          </button>
          <button type="button" class="sis-ob-step" data-ob-step="2" id="obStep2">
            <span class="sis-ob-num">2</span>
            <span>Typography</span>
          </button>
          <button type="button" class="sis-ob-step" data-ob-step="3" id="obStep3">
            <span class="sis-ob-num">3</span>
            <span>AI Model</span>
          </button>
          <button type="button" class="sis-ob-step" data-ob-step="4" id="obStep4">
            <span class="sis-ob-num">4</span><span>Tour</span>
          </button>
        </nav>

        <!-- Panel 1: Theme -->
        <section class="sis-ob-panel is-active" id="obPanel1">
          <div class="sis-ob-grid" role="radiogroup" aria-label="Choose theme">
            <button type="button" class="sis-ob-card ${activeTheme === 'obsidian' || activeTheme === 'neutral' ? 'is-selected' : ''}" data-theme-choice="obsidian">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Obsidian</span>
              </div>
              <div class="sis-ob-swatches" data-palette-preview="obsidian" aria-hidden="true">
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
              </div>
              <p class="sis-ob-card-desc">Near-black surfaces.</p>
            </button>

            <button type="button" class="sis-ob-card ${activeTheme === 'warm' ? 'is-selected' : ''}" data-theme-choice="warm">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Charcoal</span>
              </div>
              <div class="sis-ob-swatches" data-palette-preview="warm" aria-hidden="true">
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
              </div>
              <p class="sis-ob-card-desc">Neutral charcoal surfaces.</p>
            </button>

            <button type="button" class="sis-ob-card ${activeTheme === 'midnight' ? 'is-selected' : ''}" data-theme-choice="midnight">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Midnight</span>
              </div>
              <div class="sis-ob-swatches" data-palette-preview="midnight" aria-hidden="true">
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
              </div>
              <p class="sis-ob-card-desc">Deep slate surfaces.</p>
            </button>

            <button type="button" class="sis-ob-card ${activeTheme === 'cyber' ? 'is-selected' : ''}" data-theme-choice="cyber">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Graphite</span>
              </div>
              <div class="sis-ob-swatches" data-palette-preview="cyber" aria-hidden="true">
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
                <span class="sis-ob-swatch"></span>
              </div>
              <p class="sis-ob-card-desc">Cool charcoal surfaces.</p>
            </button>
          </div>

          <div class="sis-ob-actions">
            <div></div>
            <button type="button" class="sis-ob-btn sis-ob-btn-primary" id="obNext1">
              <span>Next: Typography</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </section>

        <!-- Panel 2: Font -->
        <section class="sis-ob-panel" id="obPanel2">
          <div class="sis-ob-grid" role="radiogroup" aria-label="Choose font">
            <!-- Editorial -->
            <button type="button" class="sis-ob-card ${activeFont === 'editorial' ? 'is-selected' : ''}" data-font-choice="editorial">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name" style="font-family:'Instrument Serif', serif; font-size:16px;">Editorial Luxury</span>
                <span class="sis-ob-card-tag">Default</span>
              </div>
              <div class="sis-ob-font-sample" style="font-family:'Instrument Serif', serif; font-size:15px;">
                "Beyond Ordinary Minds."
              </div>
              <p class="sis-ob-card-desc">Instrument Serif display titles with DM Sans interface typography.</p>
            </button>

            <!-- Sans -->
            <button type="button" class="sis-ob-card ${activeFont === 'sans' ? 'is-selected' : ''}" data-font-choice="sans">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name" style="font-family:'Manrope', sans-serif;">Modern Geometric</span>
                <span class="sis-ob-card-tag">Clean</span>
              </div>
              <div class="sis-ob-font-sample" style="font-family:'Manrope', sans-serif;">
                Engineered for absolute technical clarity & precision.
              </div>
              <p class="sis-ob-card-desc">Variable Manrope sans with crisp geometric balance.</p>
            </button>

            <!-- Mono -->
            <button type="button" class="sis-ob-card ${activeFont === 'mono' ? 'is-selected' : ''}" data-font-choice="mono">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name" style="font-family:'JetBrains Mono', monospace;">Hacker Mono</span>
                <span class="sis-ob-card-tag">Developer</span>
              </div>
              <div class="sis-ob-font-sample" style="font-family:'JetBrains Mono', monospace; font-size:11px;">
                const sis = new Superintelligence();
              </div>
              <p class="sis-ob-card-desc">JetBrains Mono high-legibility monospace across all code.</p>
            </button>

            <!-- Grotesk -->
            <button type="button" class="sis-ob-card ${activeFont === 'grotesk' ? 'is-selected' : ''}" data-font-choice="grotesk">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name" style="font-family:'Space Grotesk', sans-serif;">Space Grotesk</span>
                <span class="sis-ob-card-tag">Futuristic</span>
              </div>
              <div class="sis-ob-font-sample" style="font-family:'Space Grotesk', sans-serif;">
                Avant-garde typography with bold architectural rhythm.
              </div>
              <p class="sis-ob-card-desc">Space Grotesk display for a daring futuristic feel.</p>
            </button>
          </div>

          <div class="sis-ob-actions">
            <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obBack2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back</span>
            </button>
            <button type="button" class="sis-ob-btn sis-ob-btn-primary" id="obNext2">
              <span>Next: AI Model</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </section>

        <!-- Panel 3: AI Model & Gateway -->
        <section class="sis-ob-panel" id="obPanel3">
          <h3>Connect a model provider</h3>
          <p class="sis-ob-sleek-desc">Configure your AI model endpoint (Ollama local, OpenRouter, OpenAI, or custom). Requests execute directly on your chosen provider.</p>
          <form id="obProviderForm" class="sis-ob-provider">
            <label>API endpoint<input id="obProviderURL" type="url" required placeholder="https://openrouter.ai/api/v1" autocomplete="off"></label>
            <label>Model ID<input id="obProviderModel" required placeholder="openai/gpt-4o-mini" autocomplete="off"></label>
            <label>API key<input id="obProviderKey" type="password" placeholder="Leave blank to keep saved key or for local Ollama" autocomplete="new-password"></label>
            <p>Keys are encrypted on this computer. Local endpoints (Ollama) require no key.</p>
            <button class="sis-ob-btn sis-ob-btn-primary" id="obProviderTest" type="submit">Save &amp; Test Connection</button>
          </form>
          <p id="obProviderStatus" role="status" aria-live="polite">Checking active model status…</p>
          <div class="sis-ob-actions">
            <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obBack3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back</span>
            </button>
            <button type="button" class="sis-ob-btn sis-ob-btn-primary" id="obNext3">
              <span>Next: Tour</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </section>

        <!-- Panel 4: System Ready -->
        <section class="sis-ob-panel" id="obPanel4">
          <div class="sis-ob-sleek-box">
            <div class="sis-ob-sleek-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <h3 class="sis-ob-sleek-title" id="obTourTitle">Start a conversation</h3>
            <p class="sis-ob-sleek-desc" id="obTourDescription">Write a request in the message box. Use New in the sidebar to start a separate conversation.</p>
            <p id="obTourProgress" aria-live="polite">Tour 1 of 4</p>
            <div class="sis-ob-actions">
              <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obTourBack" disabled>Previous</button>
              <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obTourNext">Next tip</button>
            </div>
          </div>

          <div class="sis-ob-actions">
            <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obBack4">Back</button>
            <button type="button" class="sis-ob-btn sis-ob-btn-primary" id="obBtnFinish">Open workspace</button>
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event binding
    const steps = [1, 2, 3, 4].map((i) => document.getElementById(`obStep${i}`));
    const panels = [1, 2, 3, 4].map((i) => document.getElementById(`obPanel${i}`));

    function setStep(s) {
      currentStep = s;
      steps.forEach((btn, idx) => {
        btn.classList.toggle('is-active', idx + 1 === s);
        btn.classList.toggle('is-done', idx + 1 < s);
        btn.setAttribute('aria-current', idx + 1 === s ? 'step' : 'false');
      });
      panels.forEach((p, idx) => {
        p.classList.toggle('is-active', idx + 1 === s);
      });
      overlay.querySelector('.sis-onboarding-card').scrollTop = 0;
    }

    steps.forEach((btn, idx) => btn.addEventListener('click', () => setStep(idx + 1)));
    document.getElementById('obNext1').addEventListener('click', () => setStep(2));
    document.getElementById('obBack2').addEventListener('click', () => setStep(1));
    document.getElementById('obNext2').addEventListener('click', () => setStep(3));
    document.getElementById('obBack3').addEventListener('click', () => setStep(2));
    document.getElementById('obNext3').addEventListener('click', () => setStep(4));
    document.getElementById('obBack4').addEventListener('click', () => setStep(3));

    const providerStatus = document.getElementById('obProviderStatus');
    const providerURL = document.getElementById('obProviderURL');
    const providerModel = document.getElementById('obProviderModel');
    const providerKey = document.getElementById('obProviderKey');
    const providerTest = document.getElementById('obProviderTest');
    let providerConfig = null;
    function showProvider(data) {
      providerConfig = data;
      if (data.configured) {
        providerURL.value = data.baseURL || '';
        providerModel.value = data.model || '';
      }
      providerStatus.textContent = data.ready
        ? `Generation and tool calling passed for ${data.model}. This connection check does not measure general task quality.`
        : 'Model setup pending. Save and test before asking Supergence to perform tasks. You can return here from Setup.';
    }
    fetch('/api/provider/status')
      .then(async (r) => {
        if (!r.ok) throw new Error('Provider status unavailable');
        showProvider(await r.json());
      })
      .catch((error) => {
        if (providerStatus) providerStatus.textContent = error.message;
      });
    document.getElementById('obProviderForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      providerTest.disabled = true;
      providerStatus.textContent = 'Saving and checking generation and native tool calling…';
      try {
        const unchanged =
          providerConfig?.configured &&
          !providerKey.value &&
          providerURL.value.trim() === providerConfig.baseURL &&
          providerModel.value.trim() === providerConfig.model;
        const requests = unchanged
          ? []
          : [
              [
                '/api/provider/configure',
                {
                  baseURL: providerURL.value.trim(),
                  model: providerModel.value.trim(),
                  apiKey: providerKey.value,
                },
              ],
            ];
        requests.push(['/api/provider/check', {}]);
        for (const [url, body] of requests) {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Model setup failed.');
          if (url.endsWith('/check')) showProvider(data);
        }
      } catch (error) {
        providerStatus.textContent = error.message;
      } finally {
        providerKey.value = '';
        providerTest.disabled = false;
      }
    });

    // Theme selector
    overlay.querySelectorAll('[data-theme-choice]').forEach((card) => {
      card.addEventListener('click', () => {
        const theme = card.dataset.themeChoice;
        document.body.dataset.theme = theme;
        localStorage.setItem('sis-ui-theme', theme);
        const preference = document.getElementById('shellThemePreference');
        if (preference) preference.value = theme;
        overlay.querySelectorAll('[data-theme-choice]').forEach((c) => {
          c.classList.toggle('is-selected', c.dataset.themeChoice === theme);
        });
      });
    });

    // Font selector
    overlay.querySelectorAll('[data-font-choice]').forEach((card) => {
      card.addEventListener('click', () => {
        const font = card.dataset.fontChoice;
        document.body.dataset.font = font;
        localStorage.setItem('sis-ui-font', font);
        overlay.querySelectorAll('[data-font-choice]').forEach((c) => {
          c.classList.toggle('is-selected', c.dataset.fontChoice === font);
        });
      });
    });

    // Connect Sleek in Browser (Optional)
    const btnConnect = document.getElementById('obBtnConnectBrowser');
    const connectText = document.getElementById('obConnectText');
    const statusMsg = document.getElementById('obStatusMsg');
    const statusText = document.getElementById('obStatusText');

    if (btnConnect) {
      btnConnect.addEventListener('click', async () => {
        btnConnect.disabled = true;
        if (connectText) connectText.textContent = 'Opening browser...';
        if (statusMsg) {
          statusMsg.className = 'sis-ob-status-msg is-loading';
          statusMsg.style.display = 'flex';
        }
        if (statusText) statusText.textContent = 'Contacting Sleek authentication gateway...';

        try {
          const res = await fetch('/api/silisleek/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin: window.location.origin }),
          });
          const data = await res.json();
          if (!res.ok || !data.url || !data.state) {
            throw new Error(data.message || 'Could not start sign-in.');
          }

          window.open(data.url, '_blank');
          if (statusText)
            statusText.textContent = 'Browser window opened. Authorize Supergence to proceed...';
          if (connectText) connectText.textContent = 'Waiting for browser authorization...';

          if (pollTimer) clearInterval(pollTimer);
          pollTimer = setInterval(async () => {
            try {
              const pollRes = await fetch('/api/silisleek/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: data.state }),
              });
              const pollData = await pollRes.json();
              if (pollData.status === 'complete') {
                clearInterval(pollTimer);
                if (statusMsg) statusMsg.className = 'sis-ob-status-msg is-success';
                if (!pollData.user?.sleekId || pollData.user.supergenceActivated !== true)
                  throw new Error(
                    'Identity or activation was not confirmed. Reconnect with Sleek.',
                  );
                if (statusText)
                  statusText.textContent = `Connected as ${pollData.user.sleekId}. Supergence activation confirmed by Silisleek.`;
                if (connectText) connectText.textContent = '✓ Sleek Account Connected';
                btnConnect.disabled = true;
              } else if (!pollRes.ok || ['failed', 'expired'].includes(pollData.status)) {
                throw new Error(pollData.message || 'Sign-in expired. Start again.');
              }
            } catch (error) {
              clearInterval(pollTimer);
              btnConnect.disabled = false;
              if (connectText) connectText.textContent = 'Retry Browser Connect';
              if (statusMsg) statusMsg.className = 'sis-ob-status-msg is-error';
              if (statusText) statusText.textContent = error.message;
            }
          }, 1500);
        } catch (err) {
          if (statusMsg) statusMsg.className = 'sis-ob-status-msg is-error';
          if (statusText)
            statusText.textContent = err.message || 'Failed to open browser authentication.';
          btnConnect.disabled = false;
          if (connectText) connectText.textContent = 'Retry Browser Connect';
        }
      });
    }

    // Precheck Sleek session
    fetch('/api/silisleek/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user?.sleekId && d.user.supergenceActivated === true) {
          if (!statusMsg || !statusText || !connectText) return;
          statusMsg.className = 'sis-ob-status-msg is-success';
          statusMsg.style.display = 'flex';
          statusText.textContent = `Connected as ${d.user.sleekId}. Supergence activation confirmed by Silisleek.`;
          connectText.textContent = `Connected as ${d.user.sleekId}`;
        }
      })
      .catch(() => {});

    const tour = [
      ['Start a conversation', 'Write a request in the message box. Use New in the sidebar to start a separate conversation.'],
      ['Choose a model', 'Use the model selector near the message box to switch configured providers. Return to AI Model in setup to configure and test a connection.'],
      ['Add context and files', 'Use the plus button beside the message box to add files, notes, workspace content, or specialists to your request.'],
      ['Find settings and help', 'Open Settings in the conversation sidebar to change your preferences. Choose Setup and tour there to revisit these steps.'],
    ];
    let tourIndex = 0;
    function renderTour() {
      document.getElementById('obTourTitle').textContent = tour[tourIndex][0];
      document.getElementById('obTourDescription').textContent = tour[tourIndex][1];
      document.getElementById('obTourProgress').textContent = `Tour ${tourIndex + 1} of ${tour.length}`;
      document.getElementById('obTourBack').disabled = tourIndex === 0;
      document.getElementById('obTourNext').disabled = tourIndex === tour.length - 1;
    }
    document.getElementById('obTourBack').addEventListener('click', () => {
      tourIndex--;
      renderTour();
    });
    document.getElementById('obTourNext').addEventListener('click', () => {
      tourIndex++;
      renderTour();
    });

    function closeSetup() {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      if (setupOpener?.isConnected) setupOpener.focus();
    }
    document.getElementById('obClose').addEventListener('click', closeSetup);
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSetup();
    });

    // Finish
    document.getElementById('obBtnFinish').addEventListener('click', () => {
      localStorage.setItem('sis_setup_completed', 'true');
      localStorage.setItem('sis_model_setup_seen', 'true');
      closeSetup();
    });

    return overlay;
  }

  window.openSupergenceSetup = (step) => {
    const m = createModal();
    setupOpener = document.activeElement;
    m.hidden = false;
    m.classList.add('is-open');
    if (step) m.querySelector(`#obStep${step}`)?.click();
    m.querySelector('#obClose').focus();
  };

  // Keep available on demand, do not auto-intercept user interaction on load
  window.addEventListener('DOMContentLoaded', () => {
    createModal();
    document.getElementById('sidebarSetupTour')?.addEventListener('click', () => {
      window.openSupergenceSetup(4);
    });
  });
})();
