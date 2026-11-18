// SIS 1.0 — Futuristic Borderless Model & Multi-Provider Switcher
(() => {
  let modalOverlay = null;
  let activeProfile = null;
  let profilesList = [];
  let isTesting = false;
  let profileMutation = false;
  let editingProfileId = null;
  let profileRequest = 0;
  let previousFocus = null;

  const PRESETS = {
    openrouter: {
      name: 'OpenRouter Primary',
      baseURL: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-4o-mini',
    },
    openai: {
      name: 'OpenAI Direct',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    },
    ollama: {
      name: 'Ollama (Local Offline)',
      baseURL: 'http://127.0.0.1:11434/v1',
      model: 'llama3.2',
    },
    custom: {
      name: 'Custom Gateway',
      baseURL: '',
      model: '',
    },
  };

  function createModal() {
    if (modalOverlay) return modalOverlay;

    modalOverlay = document.createElement('div');
    modalOverlay.className = 'sis-model-modal-overlay';
    modalOverlay.id = 'sisModelSwitcherModalOverlay';
    modalOverlay.setAttribute('role', 'dialog');
    modalOverlay.setAttribute('aria-modal', 'true');
    modalOverlay.setAttribute('aria-labelledby', 'sisModelSwitcherTitle');
    modalOverlay.inert = true;

    modalOverlay.innerHTML = `
      <div class="sis-model-modal">
        <header class="sis-modal-header">
          <div>
            <h2 class="sis-modal-title" id="sisModelSwitcherTitle">Models &amp; providers</h2>
            <p class="sis-modal-desc">Switch the model Supergence uses or connect a provider.</p>
          </div>
          <button type="button" class="sis-modal-close" id="sisCloseModelModal" aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <!-- Active Model Highlight -->
        <div class="sis-active-core-card" id="sisActiveCoreCard">
          <div class="sis-active-core-left">
            <div class="sis-active-core-meta">
              <span class="sis-active-provider-title" id="sisActiveCoreTitle">Loading...</span>
            </div>
            <div class="sis-active-model-name" id="sisActiveCoreModel">Loading...</div>
            <div class="sis-active-url" id="sisActiveCoreUrl">-</div>
          </div>
          <button type="button" class="sis-btn-ping" id="sisPingActiveBtn" title="Test endpoint latency">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span id="sisPingLabel">Test connection</span>
          </button>
        </div>

        <!-- Saved Profiles List -->
        <div class="sis-section-header">
          <span class="sis-section-title">Saved profiles</span>
          <span id="sisProfileCount" aria-live="polite"></span>
        </div>

        <div class="sis-profiles-grid" id="sisProfilesGrid">
          <div style="padding:16px; text-align:center; color:rgba(255,255,255,0.4);">Loading profiles...</div>
        </div>
        <div class="sis-status-toast" id="sisSwitchStatus" role="status" hidden></div>

        <!-- Add New Provider Drawer -->
        <div class="sis-add-provider-card">
          <button type="button" class="sis-drawer-toggle" id="sisToggleAddDrawer" aria-expanded="false" aria-controls="sisAddProviderForm">
            <span id="sisProviderFormTitle">Connect a model or provider</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" id="sisDrawerChevron"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <form class="sis-drawer-content" id="sisAddProviderForm" hidden>
            <!-- Presets -->
            <div class="sis-quick-presets">
              <button type="button" class="sis-quick-preset-btn is-selected" data-preset="openrouter">OpenRouter</button>
              <button type="button" class="sis-quick-preset-btn" data-preset="openai">OpenAI</button>
              <button type="button" class="sis-quick-preset-btn" data-preset="ollama">Ollama</button>
              <button type="button" class="sis-quick-preset-btn" data-preset="custom">Custom</button>
            </div>

            <div class="sis-form-row">
              <div class="sis-field">
                <label for="sisNewName">Profile Label</label>
                <input type="text" id="sisNewName" placeholder="e.g. OpenRouter Primary" required>
              </div>
              <div class="sis-field">
                <label for="sisNewModel">Model ID</label>
                <input type="text" id="sisNewModel" placeholder="e.g. openai/gpt-4o-mini" required>
              </div>
            </div>

            <div class="sis-field">
              <label for="sisNewBaseUrl">Endpoint Base URL</label>
              <input type="url" id="sisNewBaseUrl" placeholder="https://openrouter.ai/api/v1" required>
            </div>

            <div class="sis-field">
              <label for="sisNewApiKey">API key</label>
              <input type="password" id="sisNewApiKey" placeholder="Enter API key" autocomplete="new-password">
            </div>

            <div class="sis-form-actions">
              <button type="button" class="sis-btn-secondary" id="sisTestNewBtn">Test Connection</button>
              <button type="submit" class="sis-btn-primary" id="sisSaveNewBtn">Save &amp; Switch</button>
            </div>

            <div class="sis-status-toast" id="sisDrawerStatus" role="status"></div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Event listeners for close
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    modalOverlay.querySelector('#sisCloseModelModal')?.addEventListener('click', closeModal);

    // Drawer toggle
    const toggleBtn = modalOverlay.querySelector('#sisToggleAddDrawer');
    const drawerContent = modalOverlay.querySelector('#sisAddProviderForm');
    toggleBtn?.addEventListener('click', () => {
      if (drawerContent.hidden) prepareProviderForm();
      drawerContent.hidden = !drawerContent.hidden;
      toggleBtn.setAttribute('aria-expanded', String(!drawerContent.hidden));
    });

    // Preset clicks
    modalOverlay.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        modalOverlay
          .querySelectorAll('[data-preset]')
          .forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        const presetKey = btn.dataset.preset;
        const config = PRESETS[presetKey];
        if (config) {
          modalOverlay.querySelector('#sisNewName').value = config.name;
          modalOverlay.querySelector('#sisNewBaseUrl').value = config.baseURL;
          modalOverlay.querySelector('#sisNewModel').value = config.model;
        }
      });
    });

    // Ping active core
    modalOverlay.querySelector('#sisPingActiveBtn')?.addEventListener('click', pingActiveCore);

    // Test new provider
    modalOverlay.querySelector('#sisTestNewBtn')?.addEventListener('click', testNewProvider);

    // Form submit
    drawerContent?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveNewProvider();
    });

    return modalOverlay;
  }

  async function loadProfiles() {
    const request = ++profileRequest;
    const grid = modalOverlay?.querySelector('#sisProfilesGrid');
    const finish = window.showWorkspaceSkeleton(grid, 'Loading model profiles');
    try {
      const res = await fetch('/api/provider/profiles', { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('Could not load provider profiles.');
      const data = await res.json();
      if (request !== profileRequest) return;
      activeProfile = data.active || null;
      profilesList = data.profiles || [];

      updateTriggerPill();
      finish();
      renderProfiles();
    } catch (err) {
      if (request !== profileRequest) return;
      finish();
      if (grid && !profilesList.length) {
        grid.textContent = 'Could not load profiles. Reopen this window to try again.';
        modalOverlay.querySelector('#sisActiveCoreTitle').textContent =
          'Provider status unavailable';
        modalOverlay.querySelector('#sisActiveCoreModel').textContent = '';
        modalOverlay.querySelector('#sisPingActiveBtn').disabled = true;
      }
      console.warn('[SisModelSwitcher] Profile load error:', err.message);
    } finally {
      finish();
    }
  }

  function updateTriggerPill() {
    const activeModelNameEl = document.getElementById('sisActiveModelName');
    const activeProviderNameEl = document.getElementById('sisActiveProviderName');
    const pulseDot = document.querySelector('.sis-model-pulse-dot');

    if (activeProfile) {
      if (activeModelNameEl) activeModelNameEl.textContent = activeProfile.model || 'Unknown';
      if (activeProviderNameEl)
        activeProviderNameEl.textContent = activeProfile.name || 'AI Engine';
      if (pulseDot) pulseDot.classList.remove('is-offline');
    }
  }

  function renderProfiles() {
    if (!modalOverlay) return;

    // Active Card
    const titleEl = modalOverlay.querySelector('#sisActiveCoreTitle');
    const modelEl = modalOverlay.querySelector('#sisActiveCoreModel');
    const urlEl = modalOverlay.querySelector('#sisActiveCoreUrl');

    titleEl.textContent = activeProfile?.name || 'No active provider';
    modelEl.textContent = activeProfile?.model || '';
    urlEl.textContent = activeProfile?.baseURL || '';
    modalOverlay.querySelector('#sisPingActiveBtn').disabled = !activeProfile;

    // Profiles List
    const grid = modalOverlay.querySelector('#sisProfilesGrid');
    const countEl = modalOverlay.querySelector('#sisProfileCount');
    if (!grid) return;

    if (countEl) countEl.textContent = String(profilesList.length);

    grid.innerHTML = profilesList
      .map((p) => {
        const isActive = p.id === activeProfile?.id;

        return `
          <div class="sis-profile-tile ${isActive ? 'is-active-tile' : ''}" data-profile-id="${escapeHTML(p.id)}">
            <div class="sis-profile-info">
              <span class="sis-profile-title">${escapeHTML(p.name || p.model)}</span>
              <span class="sis-profile-sub">${escapeHTML(p.model)} · <span style="opacity:0.7">${escapeHTML(p.baseURL)}</span></span>
              ${p.issue ? `<span class="sis-profile-sub">${escapeHTML(p.issue)}</span>` : ''}
            </div>
            <div class="sis-profile-actions">
              ${
                isActive
                  ? `<span class="sis-active-badge">
                       <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#34d399;"></span>
                       Active
                     </span>`
                  : p.issue && p.editable
                    ? `<button type="button" class="sis-btn-switch" data-edit-id="${escapeHTML(p.id)}">Set up</button>`
                    : `<button type="button" class="sis-btn-switch" data-switch-id="${escapeHTML(p.id)}">Switch</button>`
              }
              ${
                p.editable && (isActive || !p.issue)
                  ? `<button type="button" class="sis-btn-del" data-edit-id="${escapeHTML(p.id)}" aria-label="Edit ${escapeHTML(p.name || p.model)}" title="Edit profile">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 20 4-1 11-11-3-3L5 16zM14 7l3 3"/></svg>
                     </button>`
                  : ''
              }
              ${
                !isActive && p.editable
                  ? `<button type="button" class="sis-btn-del" data-delete-id="${escapeHTML(p.id)}" title="Delete profile">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                     </button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');
    if (!profilesList.length) grid.textContent = 'No saved provider profiles yet.';

    // Wire switch buttons
    grid.querySelectorAll('[data-switch-id]').forEach((btn) => {
      btn.addEventListener('click', () => switchProfile(btn.dataset.switchId));
    });
    grid.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (profileMutation) return;
        const profile = profilesList.find((entry) => entry.id === btn.dataset.editId);
        if (!profile) return;
        prepareProviderForm(profile);
        modalOverlay.querySelector('#sisAddProviderForm').hidden = false;
        modalOverlay.querySelector('#sisToggleAddDrawer').setAttribute('aria-expanded', 'true');
        modalOverlay
          .querySelector(profile.issue && !profile.hasKey ? '#sisNewApiKey' : '#sisNewBaseUrl')
          .focus();
      });
    });

    // Wire delete buttons
    grid.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => deleteProfile(btn.dataset.deleteId));
    });
  }

  function prepareProviderForm(profile = null) {
    editingProfileId = profile?.id || null;
    modalOverlay.querySelector('#sisAddProviderForm').reset();
    modalOverlay.querySelector('#sisProviderFormTitle').textContent = profile
      ? `Edit ${profile.name || profile.model}`
      : 'Connect a model or provider';
    modalOverlay.querySelector('#sisNewName').value = profile?.name || '';
    modalOverlay.querySelector('#sisNewBaseUrl').value = profile?.baseURL || '';
    modalOverlay.querySelector('#sisNewModel').value = profile?.model || '';
    modalOverlay.querySelector('#sisNewApiKey').placeholder = profile?.hasKey
      ? 'Leave blank to keep the saved key'
      : 'Enter API key';
    modalOverlay.querySelector('#sisDrawerStatus').style.display = 'none';
    modalOverlay
      .querySelectorAll('[data-preset]')
      .forEach((btn) => btn.classList.remove('is-selected'));
  }

  function showSwitchStatus(message, type) {
    const notice = modalOverlay.querySelector('#sisSwitchStatus');
    notice.hidden = !message;
    notice.className = `sis-status-toast is-${type}`;
    notice.textContent = message;
    notice.style.display = message ? 'flex' : 'none';
  }

  function applyActiveProfile(active) {
    activeProfile = active;
    updateTriggerPill();
    renderProfiles();
    window.dispatchEvent(new CustomEvent('sis-model-changed', { detail: { active } }));
  }

  async function switchProfile(id) {
    if (profileMutation) return;
    profileMutation = true;
    showSwitchStatus('Switching provider…', 'loading');
    try {
      const res = await fetch('/api/provider/profiles/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to switch provider profile.');
      }

      ++profileRequest;
      applyActiveProfile(data.active);
      showSwitchStatus(`Now using ${data.active.name} · ${data.active.model}`, 'success');
    } catch (err) {
      showSwitchStatus(err.message, 'error');
    } finally {
      profileMutation = false;
    }
  }

  async function deleteProfile(id) {
    try {
      const res = await fetch(`/api/provider/profiles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete provider profile.');
      }
      await loadProfiles();
      if (typeof window.showToast === 'function') {
        window.showToast('Provider profile removed', 'success');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast(err.message, 'error');
      } else {
        alert(err.message);
      }
    }
  }

  async function pingActiveCore() {
    const pingBtn = modalOverlay?.querySelector('#sisPingActiveBtn');
    const label = modalOverlay?.querySelector('#sisPingLabel');
    if (!pingBtn || !label) return;

    pingBtn.disabled = true;
    label.textContent = 'Pinging...';

    try {
      const start = Date.now();
      const res = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: activeProfile?.baseURL,
          model: activeProfile?.model,
          ...(activeProfile?.id !== 'active' ? { profileId: activeProfile?.id } : {}),
        }),
      });
      const data = await res.json();
      const latency = Date.now() - start;

      if (data.success) {
        label.textContent = `Online (${latency}ms)`;
        pingBtn.style.color = '#34d399';
      } else {
        label.textContent = data.error?.slice(0, 20) || 'Error';
        pingBtn.style.color = '#f87171';
      }
    } catch (err) {
      label.textContent = 'Unreachable';
      pingBtn.style.color = '#f87171';
    } finally {
      setTimeout(() => {
        if (pingBtn) {
          pingBtn.disabled = false;
          label.textContent = 'Test connection';
          pingBtn.style.color = '';
        }
      }, 3000);
    }
  }

  async function testNewProvider() {
    if (!modalOverlay || isTesting) return;
    const toast = modalOverlay.querySelector('#sisDrawerStatus');
    const name = modalOverlay.querySelector('#sisNewName')?.value.trim();
    const baseURL = modalOverlay.querySelector('#sisNewBaseUrl')?.value.trim();
    const model = modalOverlay.querySelector('#sisNewModel')?.value.trim();
    const apiKey = modalOverlay.querySelector('#sisNewApiKey')?.value.trim();

    if (!baseURL || !model) {
      showDrawerStatus('Enter both an Endpoint Base URL and Model ID to test.', 'error');
      return;
    }

    isTesting = true;
    showDrawerStatus('Connecting and testing endpoint response...', 'loading');

    try {
      const start = Date.now();
      const res = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseURL, model, apiKey, profileId: editingProfileId || '' }),
      });
      const data = await res.json();
      const latency = Date.now() - start;

      if (data.success) {
        showDrawerStatus(`✓ Connection verified (${latency}ms) · Model response OK`, 'success');
      } else {
        showDrawerStatus(
          `✗ Connection failed: ${data.error || 'Check endpoint or credentials.'}`,
          'error',
        );
      }
    } catch (err) {
      showDrawerStatus(`✗ Network error: ${err.message}`, 'error');
    } finally {
      isTesting = false;
    }
  }

  async function saveNewProvider() {
    if (!modalOverlay || profileMutation) return;
    const name = modalOverlay.querySelector('#sisNewName')?.value.trim();
    const baseURL = modalOverlay.querySelector('#sisNewBaseUrl')?.value.trim();
    const model = modalOverlay.querySelector('#sisNewModel')?.value.trim();
    const apiKey = modalOverlay.querySelector('#sisNewApiKey')?.value.trim();

    if (!baseURL || !model) {
      showDrawerStatus('Endpoint Base URL and Model ID are required.', 'error');
      return;
    }

    profileMutation = true;
    const saveButton = modalOverlay.querySelector('#sisSaveNewBtn');
    saveButton.disabled = true;
    showDrawerStatus('Saving profile and switching provider…', 'loading');

    try {
      const res = await fetch('/api/provider/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || new URL(baseURL).hostname,
          ...(editingProfileId ? { id: editingProfileId } : {}),
          baseURL,
          model,
          apiKey,
          activate: true,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save provider profile.');
      }

      ++profileRequest;
      profilesList = data.profiles;
      applyActiveProfile(data.active);
      prepareProviderForm();
      modalOverlay.querySelector('#sisAddProviderForm').hidden = true;
      modalOverlay.querySelector('#sisToggleAddDrawer').setAttribute('aria-expanded', 'false');
      showSwitchStatus(`Now using ${data.active.name} · ${data.active.model}`, 'success');
    } catch (err) {
      showDrawerStatus(err.message, 'error');
    } finally {
      profileMutation = false;
      saveButton.disabled = false;
    }
  }

  function showDrawerStatus(msg, type) {
    if (!modalOverlay) return;
    const toast = modalOverlay.querySelector('#sisDrawerStatus');
    if (!toast) return;
    toast.className = `sis-status-toast is-${type}`;
    toast.textContent = msg;
    toast.style.display = 'flex';
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openModal() {
    createModal();
    if (modalOverlay.classList.contains('is-embedded')) {
      document.body.append(modalOverlay);
      modalOverlay.classList.remove('is-embedded');
      modalOverlay.setAttribute('role', 'dialog');
      modalOverlay.setAttribute('aria-modal', 'true');
    }
    void loadProfiles();
    if (modalOverlay.classList.contains('is-open')) return;
    previousFocus = document.activeElement;
    modalOverlay.inert = false;
    modalOverlay.classList.add('is-open');
    modalOverlay.querySelector('#sisCloseModelModal').focus();
    document.getElementById('workspaceModelSwitcherBtn')?.setAttribute('aria-expanded', 'true');
  }

  function closeModal() {
    if (!modalOverlay?.classList.contains('is-open')) return;
    modalOverlay.classList.remove('is-open');
    modalOverlay.inert = true;
    previousFocus?.focus();
    previousFocus = null;
    document.getElementById('workspaceModelSwitcherBtn')?.setAttribute('aria-expanded', 'false');
  }

  function toggleModal() {
    if (modalOverlay && modalOverlay.classList.contains('is-open')) {
      closeModal();
    } else {
      openModal();
    }
  }

  function mountInSettings(container) {
    createModal();
    if (modalOverlay.classList.contains('is-open')) closeModal();
    container.append(modalOverlay);
    modalOverlay.inert = false;
    modalOverlay.classList.add('is-embedded');
    modalOverlay.setAttribute('role', 'region');
    modalOverlay.removeAttribute('aria-modal');
    void loadProfiles();
  }

  // Keyboard shortcut: Esc to close
  document.addEventListener('keydown', (e) => {
    if (!modalOverlay?.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      const controls = [
        ...modalOverlay.querySelectorAll('button:not(:disabled), input:not(:disabled)'),
      ].filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      const active = document.activeElement;
      if (!modalOverlay.contains(active) || active === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    }
  });

  // Export public interface
  window.SisModelSwitcher = {
    open: openModal,
    close: closeModal,
    toggle: toggleModal,
    mountInSettings,
    refresh: loadProfiles,
    switchProfile,
    deleteProfile,
    getActive: () => activeProfile,
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createModal();
      void loadProfiles();
    });
  } else {
    createModal();
    void loadProfiles();
  }
})();
