(() => {
  let superboxPane = null;
  let activeTab = 'superbox';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || data.success === false)
      throw new Error(data.error || data.message || `Request failed (${response.status}).`);
    return data;
  }

  function ensureSuperboxPane() {
    if (superboxPane) return superboxPane;
    const viewport = document.querySelector('.workspace-columns-viewport') || document.body;
    superboxPane = document.createElement('aside');
    superboxPane.id = 'superboxUnifiedPane';
    superboxPane.className = 'workspace-side-browser-pane superbox-unified-pane collapsed';
    superboxPane.setAttribute('aria-label', 'Superbox');
    superboxPane.inert = true;

    superboxPane.innerHTML = `
      <div class="side-browser-header superbox-header">
        <div class="stage-nav-pill-group superbox-nav-tabs" style="min-width:0; overflow-x:auto;">
          <button type="button" class="stage-mode-btn active" data-tab="superbox" aria-pressed="true">
            <span class="status-pulse-dot" style="background:#38bdf8;"></span>
            <span>📦 Superbox</span>
          </button>
          <button type="button" class="stage-mode-btn" data-tab="preview" aria-pressed="false">
            <span>🖥️ Preview</span>
          </button>
          <button type="button" class="stage-mode-btn" id="superboxBrowserOpen">
            <span>🌐 Browser</span>
          </button>
          <button type="button" class="stage-mode-btn" data-tab="files" aria-pressed="false">
            <span>📁 Files</span>
          </button>
          <button type="button" class="stage-mode-btn" data-tab="tools" aria-pressed="false">
            <span>🛠️ Tool Studio</span>
          </button>
        </div>
        <div class="side-browser-actions">
          <button type="button" class="side-browser-action-btn" id="superboxBtnClose" aria-label="Close Superbox">✕</button>
        </div>
      </div>

      <div class="superbox-tab-contents" style="flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden;">
        <div id="superboxTabContent" class="superbox-tab-panel active" style="flex:1; display:flex; flex-direction:column; min-height:0; padding:12px; gap:10px; background:#070a12; color:#e2e8f0; overflow-y:auto;">
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.25); border-radius:8px;">
            <div>
              <strong style="color:#38bdf8; font-size:12px;">Superbox staging</strong>
              <div style="font-size:11px; color:#94a3b8;">Files are staged here before you copy them to the workspace.</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="side-browser-action-btn" id="superboxActionApply" style="color:#34d399; border-color:rgba(16,185,129,0.35);">✓ Apply to Workspace</button>
              <button type="button" class="side-browser-action-btn" id="superboxActionReset" style="color:#f87171; border-color:rgba(239,68,68,0.35);">✕ Reset</button>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:10px; flex:1; min-height:240px;">
            <div style="display:flex; flex-direction:column; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:11.5px; font-weight:600; color:#cbd5e1;">Staged files (<span id="superboxFilesCount">0</span>)</span>
                <button type="button" class="side-browser-action-btn" id="superboxBtnRefreshFiles" style="padding:2px 6px; font-size:10px;">↻ Refresh</button>
              </div>
              <div id="superboxFilesList" style="flex:1; overflow-y:auto; font-family:var(--font-mono, monospace); font-size:11px; padding:6px 0;">
                ${typeof window.renderModernLoader === 'function' ? window.renderModernLoader('Loading staged files...', { size: 'sm' }) : '<p style="color:#94a3b8;">Loading staged files…</p>'}
              </div>
            </div>

            <div style="display:flex; flex-direction:column; min-width:0; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
              <label for="superboxTerminalInput" style="font-size:11.5px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Host terminal</label>
              <p style="margin:0 0 8px; color:#94a3b8; font-size:11px;">Commands start in Superbox with your OS account’s filesystem permissions.</p>
              <div id="superboxTerminalOutput" role="log" style="flex:1; background:#020408; border-radius:6px; padding:8px; font-family:var(--font-mono, monospace); font-size:11px; color:#a7f3d0; overflow:auto; max-height:220px; white-space:pre-wrap; overflow-wrap:anywhere;"></div>
              <form id="superboxTerminalForm" style="display:flex; gap:6px; margin-top:8px;">
                <input type="text" id="superboxTerminalInput" placeholder="Enter command" required style="flex:1; min-width:0; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:5px 8px; color:#fff; font-size:11.5px; font-family:var(--font-mono, monospace);" />
                <button type="submit" class="side-browser-action-btn" style="background:#0284c7; color:#fff; border:none; padding:5px 10px;">Run</button>
              </form>
            </div>
          </div>
        </div>

        <!-- TAB 2: LIVE PREVIEW -->
        <div id="previewTabContent" class="superbox-tab-panel" style="flex:1; display:none; flex-direction:column; min-height:0; background:#020408;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(0,0,0,0.6); border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex; gap:4px;">
              <button type="button" class="side-browser-action-btn active" data-preview-size="100%" aria-pressed="true">Fit</button>
              <button type="button" class="side-browser-action-btn" data-preview-size="375px" aria-pressed="false">375 px</button>
            </div>
            <span id="superboxPreviewTitle" style="font-size:11px; color:#94a3b8; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No artifact loaded</span>
          </div>
          <div style="flex:1; overflow:auto;">
            <div id="superboxPreviewSlot" style="width:100%; margin-inline:auto; padding:10px;">
              <p>Choose a workspace file to preview.</p>
            </div>
          </div>
        </div>

        <!-- TAB 4: WORKSPACE FILES EXPLORER -->
        <div id="filesTabContent" class="superbox-tab-panel" style="flex:1; display:none; flex-direction:column; min-height:0; padding:12px; background:#070a12; overflow-y:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <input type="search" id="superboxWorkspaceSearch" aria-label="Filter workspace files" placeholder="Filter workspace files…" style="flex:1; min-width:0; max-width:280px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:4px 8px; color:#fff; font-size:11.5px;" />
            <button type="button" class="side-browser-action-btn" id="superboxWorkspaceRefresh">↻ Refresh</button>
          </div>
          <div id="superboxWorkspaceList" style="flex:1; overflow-y:auto; font-family:var(--font-mono, monospace); font-size:11px; padding:6px 0;">
            ${typeof window.renderModernLoader === 'function' ? window.renderModernLoader('Loading workspace files...', { size: 'sm' }) : '<p style="color:#64748b;">Loading workspace files…</p>'}
          </div>
        </div>

        <!-- TAB 5: TOOL & UI STUDIO -->
        <div id="toolsTabContent" class="superbox-tab-panel" style="flex:1; display:none; flex-direction:column; min-height:0; padding:12px; background:#070a12; overflow-y:auto; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div>
              <strong style="color:#38bdf8; font-size:12px;">🛠️ DYNAMIC TOOL & UI STUDIO</strong>
              <div style="font-size:11px; color:#94a3b8;">Inspect, test, verify and approve custom synthesized tools and injected UI widgets.</div>
            </div>
            <button type="button" class="side-browser-action-btn" id="superboxRefreshTools">↻ Refresh</button>
          </div>

          <!-- Pending Verification Box -->
          <p id="superboxStudioStatus" role="status" hidden></p>
          <div id="superboxPendingVerificationArea"></div>

          <!-- Installed Tools List -->
          <div>
            <div style="font-size:11.5px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Installed Dynamic Tools</div>
            <div id="superboxInstalledToolsList" style="font-size:11.5px; color:#94a3b8; padding:4px 0;">
              ${typeof window.renderModernLoader === 'function' ? window.renderModernLoader('Checking registered tools...', { size: 'sm' }) : 'Checking registered tools…'}
            </div>
          </div>

          <!-- Injected UI Widgets List -->
          <div>
            <div style="font-size:11.5px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Active Injected UI Widgets</div>
            <div id="superboxActiveWidgetsList" style="font-size:11.5px; color:#94a3b8; padding:4px 0;">
              ${typeof window.renderModernLoader === 'function' ? window.renderModernLoader('Checking active widgets...', { size: 'sm' }) : 'Checking active widgets…'}
            </div>
          </div>
        </div>
      </div>
    `;

    viewport.appendChild(superboxPane);
    bindSuperboxEvents();
    return superboxPane;
  }

  function bindSuperboxEvents() {
    if (!superboxPane) return;

    // Tab buttons
    superboxPane.querySelectorAll('.superbox-nav-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Close button
    superboxPane.querySelector('#superboxBtnClose')?.addEventListener('click', () => {
      toggleSuperbox(false);
    });

    // Superbox Terminal Form
    const terminalForm = superboxPane.querySelector('#superboxTerminalForm');
    const terminalInput = superboxPane.querySelector('#superboxTerminalInput');
    const terminalOutput = superboxPane.querySelector('#superboxTerminalOutput');
    const runButton = terminalForm.querySelector('button[type="submit"]');
    terminalForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cmd = terminalInput?.value?.trim();
      if (!cmd || runButton.disabled) return;
      terminalInput.value = '';
      runButton.disabled = true;
      terminalOutput.textContent += `\n$ ${cmd}\nRunning or waiting for approval…`;
      try {
        const res = await fetch('/api/superbox/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
        terminalOutput.textContent += `\n[Exit: ${data.exitCode}] (${data.durationMs}ms)\n${data.stdout || ''}\n${data.stderr ? 'ERR: ' + data.stderr : ''}\n`;
        refreshSuperboxFiles();
      } catch (err) {
        terminalOutput.textContent += `\nError executing: ${err.message}\n`;
      } finally {
        runButton.disabled = false;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
      }
    });

    // Superbox Apply to Workspace
    superboxPane.querySelector('#superboxActionApply')?.addEventListener('click', async () => {
      if (!confirm('Copy all staged files to your workspace? Existing files will be kept.')) return;
      try {
        const data = await request('/api/superbox/apply', { method: 'POST' });
        alert(data.message);
        refreshWorkspaceFiles();
      } catch (err) {
        alert('Error applying files: ' + err.message);
      }
    });

    // Superbox Reset
    superboxPane.querySelector('#superboxActionReset')?.addEventListener('click', async () => {
      if (!confirm('Clear all files from the Superbox staging folder?')) return;
      try {
        await request('/api/superbox/reset', { method: 'POST' });
        refreshSuperboxFiles();
      } catch (err) {
        alert('Error clearing Superbox: ' + err.message);
      }
    });

    // Superbox Refresh Files
    superboxPane
      .querySelector('#superboxBtnRefreshFiles')
      ?.addEventListener('click', refreshSuperboxFiles);

    // Preview Responsive Sizing Buttons
    superboxPane.querySelectorAll('[data-preview-size]').forEach((b) => {
      b.addEventListener('click', () => {
        superboxPane.querySelectorAll('[data-preview-size]').forEach((button) => {
          button.classList.toggle('active', button === b);
          button.setAttribute('aria-pressed', String(button === b));
        });
        superboxPane.querySelector('#superboxPreviewSlot').style.width = b.dataset.previewSize;
      });
    });

    superboxPane.querySelector('#superboxBrowserOpen').addEventListener('click', () => {
      toggleSuperbox(false);
      void window.SupergenceBrowser?.show();
    });

    // Workspace Files refresh & filter
    superboxPane
      .querySelector('#superboxWorkspaceRefresh')
      ?.addEventListener('click', refreshWorkspaceFiles);
    superboxPane.querySelector('#superboxWorkspaceSearch')?.addEventListener('input', (e) => {
      filterWorkspaceFiles(e.target.value);
    });

    // Tools refresh
    superboxPane
      .querySelector('#superboxRefreshTools')
      ?.addEventListener('click', refreshToolStudio);
    superboxPane.querySelector('#toolsTabContent').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tool-action]');
      if (!button) return;
      const { toolAction, toolValue } = button.dataset;
      if (toolAction === 'approve') void approveTool(toolValue, button);
      else if (toolAction === 'recreate') recreateTool(toolValue);
      else if (toolAction === 'remove-widget') void removeWidget(toolValue, button);
    });
  }

  const pendingProposalsCache = new Map();

  function renderToolProposalCard(tool) {
    if (!tool) return;
    pendingProposalsCache.set(tool.id || tool.name, tool);
    if (!superboxPane) return;
    renderPendingArea();
  }

  function renderPendingArea() {
    if (!superboxPane) return;
    const pendingArea = superboxPane.querySelector('#superboxPendingVerificationArea');
    if (!pendingArea) return;
    const tools = Array.from(pendingProposalsCache.values());
    if (tools.length === 0) {
      pendingArea.innerHTML = '';
      return;
    }
    pendingArea.innerHTML = tools
      .map(
        (tool) => `
      <div class="sg-tool-verification-card" style="border:1px solid rgba(245,158,11,0.4); background:rgba(15,20,32,0.95); border-radius:10px; padding:12px; margin-bottom:12px; box-shadow:0 6px 20px rgba(0,0,0,0.4);">
        <div class="sg-tool-verification-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span class="sg-tool-badge" style="background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:5px;">⚠ REQUIRES VERIFICATION</span>
            <strong style="margin-left:6px; color:#fff; font-size:12.5px;">${escapeHtml(tool.displayName || tool.name)}</strong>
          </div>
          <span style="font-size:11px; color:#f59e0b; font-weight:600;">Pending Approval</span>
        </div>
        <p style="font-size:12px; color:#cbd5e1; margin:4px 0 8px 0;">${escapeHtml(tool.description || 'Synthesized tool requires user approval to access capabilities.')}</p>
        ${tool.code ? `<div class="sg-tool-code-preview" style="margin:6px 0 10px 0; max-height:140px; overflow-y:auto; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px; font-family:var(--font-mono, monospace); font-size:11px; color:#93c5fd; white-space:pre-wrap;"><pre style="margin:0;"><code>${escapeHtml(tool.code)}</code></pre></div>` : ''}
        <div style="font-size:11px; color:#94a3b8;">Capabilities: <code>${escapeHtml(Array.isArray(tool.capabilities) ? tool.capabilities.join(', ') : 'Custom Tool')}</code></div>
        <div class="sg-tool-verification-actions" style="display:flex; gap:8px; margin-top:10px;">
          <button type="button" class="sg-btn-approve" data-tool-action="approve" data-tool-value="${escapeHtml(tool.id)}" style="background:#10b981; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Approve &amp; Unlock</button>
          <button type="button" class="sg-btn-modify" data-tool-action="recreate" data-tool-value="${escapeHtml(tool.name)}" style="background:rgba(255,255,255,0.08); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Recreate / Modify</button>
        </div>
      </div>`,
      )
      .join('');
  }

  // Handle dynamic tool proposal events live
  window.addEventListener('ada-tool-proposed', (e) => {
    const tool = e.detail?.tool || e.detail;
    if (tool) {
      ensureSuperboxPane();
      renderToolProposalCard(tool);
      toggleSuperbox(true);
      switchTab('tools');
    }
  });

  window.addEventListener('ada-tool-proposal', (e) => {
    const tool = e.detail?.tool || e.detail;
    if (tool) {
      ensureSuperboxPane();
      renderToolProposalCard(tool);
      toggleSuperbox(true);
      switchTab('tools');
    }
  });

  window.addEventListener('ada-tool-approved', () => {
    refreshToolStudio();
  });

  window.addEventListener('ada-tool-rejected', () => {
    refreshToolStudio();
  });

  function switchTab(tab) {
    if (!superboxPane) return;
    activeTab = tab;
    superboxPane.querySelectorAll('.superbox-nav-tabs button[data-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
    });
    superboxPane.querySelectorAll('.superbox-tab-panel').forEach((p) => {
      p.style.display = 'none';
      p.classList.remove('active');
    });

    const target = superboxPane.querySelector(`#${tab}TabContent`);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active', 'sg-window-enter');
    }

    if (tab === 'superbox') refreshSuperboxFiles();
    else if (tab === 'files') refreshWorkspaceFiles();
    else if (tab === 'tools') refreshToolStudio();
  }

  async function refreshSuperboxFiles() {
    if (!superboxPane) return;
    const listEl = superboxPane.querySelector('#superboxFilesList');
    const countEl = superboxPane.querySelector('#superboxFilesCount');
    if (!listEl) return;
    if (typeof window.renderModernLoader === 'function') {
      listEl.innerHTML = window.renderModernLoader('Loading staged files...', { size: 'sm' });
    }
    try {
      const data = await request('/api/superbox/files');
      const files = data.files || [];
      if (countEl) countEl.textContent = files.length;
      if (files.length === 0) {
        listEl.innerHTML = '<p style="color:#94a3b8; padding:6px;">No staged files yet.</p>';
        return;
      }
      listEl.innerHTML = files
        .map(
          (f) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="color:#38bdf8;">${escapeHtml(f.path)}</span>
          <span style="color:#64748b; font-size:10px;">${f.size || 0} B</span>
        </div>`,
        )
        .join('');
    } catch (err) {
      listEl.innerHTML = `<p style="color:#ef4444;">Error loading files: ${escapeHtml(err.message)}</p>`;
    }
  }

  async function refreshWorkspaceFiles() {
    if (!superboxPane) return;
    const listEl = superboxPane.querySelector('#superboxWorkspaceList');
    if (!listEl) return;
    if (typeof window.renderModernLoader === 'function') {
      listEl.innerHTML = window.renderModernLoader('Loading workspace files...', { size: 'sm' });
    }
    try {
      const data = await request('/api/workspace/files?limit=100');
      const files = data.files || [];
      window.__cachedWorkspaceFiles = files;
      renderWorkspaceFileList(files);
    } catch (err) {
      listEl.innerHTML = `<p style="color:#ef4444;">Error loading workspace files: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderWorkspaceFileList(files) {
    const listEl = superboxPane?.querySelector('#superboxWorkspaceList');
    if (!listEl) return;
    listEl.replaceChildren();
    if (!files.length) {
      listEl.textContent = 'No matching files.';
      return;
    }
    for (const file of files) {
      const filePath = file.path || file.filename;
      if (typeof filePath !== 'string' || !filePath) continue;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'side-browser-action-btn';
      row.style.cssText = 'display:block; width:100%; text-align:left; overflow-wrap:anywhere;';
      row.textContent = filePath;
      row.addEventListener('click', () => previewFile(filePath));
      listEl.append(row);
    }
  }

  function filterWorkspaceFiles(query) {
    const q = (query || '').toLowerCase().trim();
    const files = window.__cachedWorkspaceFiles || [];
    if (!q) {
      renderWorkspaceFileList(files);
      return;
    }
    renderWorkspaceFileList(
      files.filter((f) => (f.path || f.filename || '').toLowerCase().includes(q)),
    );
  }

  async function refreshToolStudio() {
    if (!superboxPane) return;
    const toolsListEl = superboxPane.querySelector('#superboxInstalledToolsList');
    const widgetsListEl = superboxPane.querySelector('#superboxActiveWidgetsList');

    if (typeof window.renderModernLoader === 'function') {
      if (toolsListEl) toolsListEl.innerHTML = window.renderModernLoader('Checking registered tools...', { size: 'sm' });
      if (widgetsListEl) widgetsListEl.innerHTML = window.renderModernLoader('Checking active widgets...', { size: 'sm' });
    }

    // Load dynamic tools from Ada-SI
    try {
      const data = await request('/api/ada/status');
      const installed = data.installedTools || [];
      const pending = data.pendingApproval || [];
      for (const p of pending) {
        pendingProposalsCache.set(p.id || p.name, p);
      }
      renderPendingArea();

      if (toolsListEl) {
        if (installed.length === 0) {
          toolsListEl.innerHTML =
            '<p style="color:#64748b; font-style:italic;">No custom synthesized tools yet. Ask Supergence to create a tool!</p>';
        } else {
          toolsListEl.innerHTML = installed
            .map(
              (t) => `
            <div style="padding:6px 8px; margin-bottom:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
              <strong style="color:#38bdf8;">${escapeHtml(t.name)}</strong> · <span style="color:#94a3b8;">${escapeHtml(t.displayName || '')}</span>
              <div style="font-size:11px; color:#64748b;">${escapeHtml(t.description || '')}</div>
            </div>`,
            )
            .join('');
        }
      }
    } catch (error) {
      toolsListEl.textContent = error.message;
    }

    // Load active injected UI widgets
    try {
      const uiData = await request('/api/ui/state');
      const widgets = uiData.widgets || [];
      if (widgetsListEl) {
        if (widgets.length === 0) {
          widgetsListEl.innerHTML =
            '<p style="color:#64748b; font-style:italic;">No custom injected widgets currently active.</p>';
        } else {
          widgetsListEl.innerHTML = widgets
            .map(
              (w) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; margin-bottom:4px; background:rgba(255,255,255,0.03); border-radius:6px;">
                <div>
                  <strong style="color:#a7f3d0;">${escapeHtml(w.title || w.id)}</strong>
                  <span style="font-size:10px; color:#64748b; margin-left:6px;">target: ${escapeHtml(w.target)}</span>
                </div>
                <button type="button" class="side-browser-action-btn" style="color:#f87171; border-color:rgba(239,68,68,0.3); padding:2px 6px;" data-tool-action="remove-widget" data-tool-value="${escapeHtml(w.id)}">Remove</button>
              </div>`,
            )
            .join('');
        }
      }
    } catch (error) {
      widgetsListEl.textContent = error.message;
    }
  }

  function toggleSuperbox(force) {
    ensureSuperboxPane();
    const isCollapsed = superboxPane.classList.contains('collapsed');
    const shouldOpen = typeof force === 'boolean' ? force : isCollapsed;
    document.body.classList.toggle('superbox-open', shouldOpen);
    document.body.classList.toggle('split-workspace-active', shouldOpen);
    superboxPane.inert = !shouldOpen;
    if (shouldOpen) {
      window.SupergenceBrowser?.hide();
      superboxPane.classList.remove('collapsed');
      superboxPane.classList.add('active', 'sg-window-enter');
      document.getElementById('workspaceBtnSuperbox')?.classList.add('active');
      document.getElementById('sgModeSuperboxBtn')?.classList.add('active');
      if (activeTab === 'superbox') refreshSuperboxFiles();
    } else {
      superboxPane.classList.add('collapsed');
      superboxPane.classList.remove('active');
      document.getElementById('workspaceBtnSuperbox')?.classList.remove('active');
      document.getElementById('sgModeSuperboxBtn')?.classList.remove('active');
      if (!document.body.classList.contains('has-workspace-browser')) {
        document.body.classList.remove('split-workspace-active');
      }
    }
  }

  function openTab(tab) {
    ensureSuperboxPane();
    toggleSuperbox(true);
    if (tab) switchTab(tab);
  }

  function previewFile(filePath) {
    if (typeof filePath !== 'string' || !filePath) return;
    const parts = filePath.replaceAll('\\', '/').split('/');
    if (parts.some((part) => !part || part === '.' || part === '..')) return;
    ensureSuperboxPane();
    toggleSuperbox(true);
    switchTab('preview');
    const slot = superboxPane.querySelector('#superboxPreviewSlot');
    const titleEl = superboxPane.querySelector('#superboxPreviewTitle');
    slot.replaceChildren();
    window.ChatArtifacts?.mount(slot, {
      title: parts.at(-1),
      filename: parts.at(-1),
      path: filePath,
      url: `/workspace/${parts.map(encodeURIComponent).join('/')}`,
    });
    if (titleEl) titleEl.textContent = filePath;
  }

  function showStudioStatus(message) {
    const status = superboxPane.querySelector('#superboxStudioStatus');
    status.textContent = message;
    status.hidden = !message;
  }

  async function approveTool(toolId, button) {
    button.disabled = true;
    try {
      const data = await request('/api/ada/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });
      pendingProposalsCache.delete(toolId);
      showStudioStatus(data.message || 'Tool approved.');
      await refreshToolStudio();
    } catch (error) {
      showStudioStatus(`Approval failed: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  function recreateTool(toolName) {
    const feedback = prompt(`What should Supergence change in "${toolName}"?`);
    if (!feedback?.trim()) return;
    const input =
      document.getElementById('sgCardInput') ||
      document.getElementById('sgLandingInput') ||
      document.getElementById('workspaceInp');
    if (input) {
      toggleSuperbox(false);
      input.value = `Recreate and modify tool "${toolName}": ${feedback.trim()}`;
      input.dispatchEvent(new Event('input'));
      input.focus();
    }
  }

  async function removeWidget(id, button) {
    button.disabled = true;
    try {
      await request('/api/ui/widget/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      showStudioStatus('Widget removed.');
      await refreshToolStudio();
    } catch (error) {
      showStudioStatus(`Could not remove widget: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  window.Superbox = {
    open: () => toggleSuperbox(true),
    close: () => toggleSuperbox(false),
    toggle: () => toggleSuperbox(),
    openTab,
    switchTab,
    previewFile,
    refreshFiles: refreshSuperboxFiles,
  };

  // Delegated click handler for Superbox header button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#workspaceBtnSuperbox')) {
      e.preventDefault();
      window.Superbox.toggle();
    }
  });

  // Auto mount on document ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureSuperboxPane, { once: true });
  } else {
    ensureSuperboxPane();
  }
})();
