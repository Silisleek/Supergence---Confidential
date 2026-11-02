(() => {
  let overlay = null;
  let currentStep = 1;
  let pollTimer = null;

  function createModal() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'sis-onboarding-overlay';
    overlay.id = 'sisOnboardingModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const activeTheme = localStorage.getItem('sis-ui-theme') || 'obsidian';
    const activeFont = localStorage.getItem('sis-ui-font') || 'editorial';

    overlay.innerHTML = `
      <div class="sis-onboarding-card">
        <header class="sis-ob-header">
          <div class="sis-ob-badge">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
            <span>Supergence Personalization</span>
          </div>
          <h2 class="sis-ob-title">Design Your <em>Intelligence Workspace</em></h2>
          <p class="sis-ob-desc">Select your preferred color theme, typography, and connect your verified Sleek ID.</p>
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
            <span>Sleek Connect</span>
          </button>
        </nav>

        <!-- Panel 1: Theme -->
        <section class="sis-ob-panel is-active" id="obPanel1">
          <div class="sis-ob-grid" role="radiogroup" aria-label="Choose theme">
            <!-- Obsidian -->
            <button type="button" class="sis-ob-card ${activeTheme === 'obsidian' || activeTheme === 'neutral' ? 'is-selected' : ''}" data-theme-choice="obsidian">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Obsidian Luxury</span>
                <span class="sis-ob-card-tag">Signature</span>
              </div>
              <div class="sis-ob-swatches">
                <span class="sis-ob-swatch" style="background:#0b0b0b;"></span>
                <span class="sis-ob-swatch" style="background:#141614;"></span>
                <span class="sis-ob-swatch" style="background:#c6ab98;"></span>
                <span class="sis-ob-swatch" style="background:#10b981;"></span>
              </div>
              <p class="sis-ob-card-desc">Deep obsidian black surfaces with Champagne Bronze orbital glow.</p>
            </button>

            <!-- Walnut -->
            <button type="button" class="sis-ob-card ${activeTheme === 'warm' ? 'is-selected' : ''}" data-theme-choice="warm">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Walnut Espresso</span>
                <span class="sis-ob-card-tag">Warm</span>
              </div>
              <div class="sis-ob-swatches">
                <span class="sis-ob-swatch" style="background:#15110d;"></span>
                <span class="sis-ob-swatch" style="background:#1d1712;"></span>
                <span class="sis-ob-swatch" style="background:#e9b98f;"></span>
                <span class="sis-ob-swatch" style="background:#f5cfaa;"></span>
              </div>
              <p class="sis-ob-card-desc">Warm roasted espresso tones with golden copper and amber depth.</p>
            </button>

            <!-- Midnight -->
            <button type="button" class="sis-ob-card ${activeTheme === 'midnight' ? 'is-selected' : ''}" data-theme-choice="midnight">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Midnight Rose</span>
                <span class="sis-ob-card-tag">Velvet</span>
              </div>
              <div class="sis-ob-swatches">
                <span class="sis-ob-swatch" style="background:#130f14;"></span>
                <span class="sis-ob-swatch" style="background:#1b151e;"></span>
                <span class="sis-ob-swatch" style="background:#cfa98c;"></span>
                <span class="sis-ob-swatch" style="background:#e8c7ae;"></span>
              </div>
              <p class="sis-ob-card-desc">Dark chocolate velvet framing with subtle rose copper illumination.</p>
            </button>

            <!-- Cyber -->
            <button type="button" class="sis-ob-card ${activeTheme === 'cyber' ? 'is-selected' : ''}" data-theme-choice="cyber">
              <div class="sis-ob-card-top">
                <span class="sis-ob-card-name">Cyber Slate</span>
                <span class="sis-ob-card-tag">Matrix</span>
              </div>
              <div class="sis-ob-swatches">
                <span class="sis-ob-swatch" style="background:#070a0d;"></span>
                <span class="sis-ob-swatch" style="background:#0e141a;"></span>
                <span class="sis-ob-swatch" style="background:#10b981;"></span>
                <span class="sis-ob-swatch" style="background:#38bdf8;"></span>
              </div>
              <p class="sis-ob-card-desc">Tactical deep slate with neon emerald telemetry accents.</p>
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
                <span class="sis-ob-card-tag">Signature</span>
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
              <span>Next: Sleek Connect</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </section>

        <!-- Panel 3: Sleek Connect -->
        <section class="sis-ob-panel" id="obPanel3">
          <div class="sis-ob-sleek-box">
            <div class="sis-ob-sleek-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <h3 class="sis-ob-sleek-title">Link your Sleek Intellectual Account</h3>
            <p class="sis-ob-sleek-desc">Authenticate with your verified Sleek ID to unlock autonomous agent reasoning, project compilation, and knowledge sync.</p>

            <div class="sis-ob-neutrino">
              <span>⚡ One-Time Activation: 400 Neutrinos</span>
            </div>

            <div>
              <button type="button" class="sis-ob-btn sis-ob-btn-primary" id="obBtnConnectBrowser" style="width:100%; max-width:380px; padding:13px 20px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <span id="obConnectText">Connect Sleek Account from Browser</span>
              </button>
            </div>

            <div class="sis-ob-status-msg" id="obStatusMsg">
              <span id="obStatusText">Connecting...</span>
            </div>
          </div>

          <div class="sis-ob-actions">
            <button type="button" class="sis-ob-btn sis-ob-btn-secondary" id="obBack3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back</span>
            </button>
            <button type="button" class="sis-ob-btn sis-ob-btn-primary" id="obBtnFinish">
              <span>Finish &amp; Enter Workspace</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event binding
    const steps = [1, 2, 3].map(i => document.getElementById(`obStep${i}`));
    const panels = [1, 2, 3].map(i => document.getElementById(`obPanel${i}`));

    function setStep(s) {
      currentStep = s;
      steps.forEach((btn, idx) => {
        btn.classList.toggle('is-active', idx + 1 === s);
        btn.classList.toggle('is-done', idx + 1 < s);
      });
      panels.forEach((p, idx) => {
        p.classList.toggle('is-active', idx + 1 === s);
      });
    }

    steps.forEach((btn, idx) => btn.addEventListener('click', () => setStep(idx + 1)));
    document.getElementById('obNext1').addEventListener('click', () => setStep(2));
    document.getElementById('obBack2').addEventListener('click', () => setStep(1));
    document.getElementById('obNext2').addEventListener('click', () => setStep(3));
    document.getElementById('obBack3').addEventListener('click', () => setStep(2));

    // Theme selector
    overlay.querySelectorAll('[data-theme-choice]').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.themeChoice;
        document.body.dataset.theme = theme;
        localStorage.setItem('sis-ui-theme', theme);
        overlay.querySelectorAll('[data-theme-choice]').forEach(c => {
          c.classList.toggle('is-selected', c.dataset.themeChoice === theme);
        });
      });
    });

    // Font selector
    overlay.querySelectorAll('[data-font-choice]').forEach(card => {
      card.addEventListener('click', () => {
        const font = card.dataset.fontChoice;
        document.body.dataset.font = font;
        localStorage.setItem('sis-ui-font', font);
        overlay.querySelectorAll('[data-font-choice]').forEach(c => {
          c.classList.toggle('is-selected', c.dataset.fontChoice === font);
        });
      });
    });

    // Connect Sleek in Browser
    const btnConnect = document.getElementById('obBtnConnectBrowser');
    const connectText = document.getElementById('obConnectText');
    const statusMsg = document.getElementById('obStatusMsg');
    const statusText = document.getElementById('obStatusText');

    btnConnect.addEventListener('click', async () => {
      btnConnect.disabled = true;
      connectText.textContent = 'Opening browser...';
      statusMsg.className = 'sis-ob-status-msg is-loading';
      statusMsg.style.display = 'flex';
      statusText.textContent = 'Contacting Sleek authentication gateway...';

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
        statusText.textContent = 'Browser window opened. Authorize Supergence to proceed...';
        connectText.textContent = 'Waiting for browser authorization...';

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
              statusMsg.className = 'sis-ob-status-msg is-success';
              statusText.textContent = `✓ Connected to Sleek as ${pollData.user?.sleekId || 'Verified User'}!`;
              connectText.textContent = '✓ Sleek Account Connected';
              btnConnect.disabled = true;
            }
          } catch (_) {}
        }, 1500);

      } catch (err) {
        statusMsg.className = 'sis-ob-status-msg is-error';
        statusText.textContent = err.message || 'Failed to open browser authentication.';
        btnConnect.disabled = false;
        connectText.textContent = 'Retry Browser Connect';
      }
    });

    // Precheck Sleek session
    fetch('/api/silisleek/session')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated && d.user) {
          statusMsg.className = 'sis-ob-status-msg is-success';
          statusMsg.style.display = 'flex';
          statusText.textContent = `✓ Active Sleek Account: ${d.user.sleekId || '@julianthorne'}`;
          connectText.textContent = `Connected as ${d.user.sleekId || '@julianthorne'}`;
        }
      })
      .catch(() => {});

    // Finish
    document.getElementById('obBtnFinish').addEventListener('click', () => {
      localStorage.setItem('sis_setup_completed', 'true');
      overlay.classList.remove('is-open');
    });

    return overlay;
  }

  window.openSupergenceSetup = () => {
    const m = createModal();
    m.classList.add('is-open');
  };

  // Auto-launch on first run
  window.addEventListener('DOMContentLoaded', () => {
    createModal();
    const hasCompleted = localStorage.getItem('sis_setup_completed');
    if (hasCompleted !== 'true') {
      setTimeout(() => {
        window.openSupergenceSetup();
      }, 400);
    }
  });
})();
