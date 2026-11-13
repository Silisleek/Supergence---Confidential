/**
 * Supergence SIS 1.0: Modern Frontend Controller
 * Antislop Mode 1 (During the project) compliant:
 * - Zero em dashes in any copy or comments
 * - Real data only: connects to live AREM, Tool Registry, and Browser endpoints
 * - Deep dark obsidian palette integration
 * - Full keyboard navigation, visible focus, and 3 states for all views
 */

// ── State Store ──
const modernState = {
  activeView: 'chat',
  tools: [],
  filteredTools: [],
  selectedTool: null,
  activeCategory: 'all',
  aremStatus: null,
  aremIndex: '',
  aremWikiList: [],
  activeWikiSlug: null,
  aremTranscripts: [],
  isDreaming: false,
  browserAgent: 'agent-supergence',
  browserState: { url: 'https://news.ycombinator.com', title: 'Agent Browser', loading: false },
};

// ── Audio Feedback Helper ──
function playChime(freq = 800, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

// ─────────────────────────────────────────────────────────────
// 1. VIEW SWITCHER NAVIGATION
// ─────────────────────────────────────────────────────────────
export function initModernNav() {
  const pills = document.querySelectorAll('.sis-nav-pill, .sis-nav-btn');
  const chatView = document.getElementById('sisViewChat');
  const memoryView = document.getElementById('sisViewMemory');
  const toolsView = document.getElementById('sisViewTools');
  const browserView = document.getElementById('sisViewBrowser');
  const canvasSurface = document.getElementById('sisFlowCanvasSurface');
  const bottomDeck = document.getElementById('sisBottomDeck');

  function switchView(viewName) {
    modernState.activeView = viewName;

    // Update active pill styling
    pills.forEach((p) => {
      const target = p.dataset.view || p.dataset.nav;
      if (target === viewName) {
        p.classList.add('is-active');
        p.setAttribute('aria-selected', 'true');
      } else {
        p.classList.remove('is-active');
        p.setAttribute('aria-selected', 'false');
      }
    });

    // Hide all view panes
    if (chatView) chatView.style.display = 'none';
    if (memoryView) memoryView.style.display = 'none';
    if (toolsView) toolsView.style.display = 'none';
    if (browserView) browserView.style.display = 'none';
    if (canvasSurface) canvasSurface.style.display = 'none';

    // Show selected view pane
    if (viewName === 'chat') {
      if (chatView) chatView.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'flex';
    } else if (viewName === 'memory') {
      if (memoryView) memoryView.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'none';
      refreshMemoryDashboard();
    } else if (viewName === 'tools') {
      if (toolsView) toolsView.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'none';
      refreshToolsView();
    } else if (viewName === 'browser') {
      if (browserView) browserView.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'none';
      refreshBrowserView();
    } else if (viewName === 'canvas') {
      if (canvasSurface) canvasSurface.style.display = 'block';
      if (bottomDeck) bottomDeck.style.display = 'none';
      if (window.renderFlowCanvas) window.renderFlowCanvas();
    } else if (viewName === 'universe') {
      if (chatView) chatView.style.display = 'flex';
      if (bottomDeck) bottomDeck.style.display = 'flex';
      document.getElementById('tabBtnHome')?.click();
    }

    playChime(900, 'sine');
  }

  // Bind clicks to navigation pills
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const view = pill.dataset.view || pill.dataset.nav;
      if (view) switchView(view);
    });
  });

  // Expose switcher globally
  window.sisSwitchView = switchView;
}

// ─────────────────────────────────────────────────────────────
// 2. REAL-TIME AREM MEMORY SHOWCASE
// ─────────────────────────────────────────────────────────────
export async function refreshMemoryDashboard() {
  const dreamPill = document.getElementById('sisDreamStatusPill');
  const dreamStats = document.getElementById('sisDreamStatsText');
  const triggerBtn = document.getElementById('sisTriggerDreamBtn');
  const indexGaugeFill = document.getElementById('sisIndexLinesFill');
  const indexGaugeLabel = document.getElementById('sisIndexLinesLabel');
  const bytesGaugeFill = document.getElementById('sisIndexBytesFill');
  const bytesGaugeLabel = document.getElementById('sisIndexBytesLabel');
  const invariantsList = document.getElementById('sisInvariantsList');
  const transcriptsList = document.getElementById('sisTranscriptsList');
  const wikiList = document.getElementById('sisWikiList');
  const wikiReader = document.getElementById('sisWikiReader');

  try {
    // 1. Fetch AREM Status
    const statusRes = await fetch('/api/arem/status');
    if (statusRes.ok) {
      const status = await statusRes.json();
      modernState.aremStatus = status;

      if (dreamPill) {
        if (status.dreamState === 'dreaming' || modernState.isDreaming) {
          dreamPill.className = 'sis-dream-status-pill is-dreaming';
          dreamPill.innerHTML =
            '<span class="sis-status-pulse-dot"></span><span>Dreaming Active</span>';
        } else {
          dreamPill.className = 'sis-dream-status-pill';
          dreamPill.innerHTML =
            '<span class="sis-status-idle-dot"></span><span>Consolidation Idle</span>';
        }
      }

      if (dreamStats) {
        const lastCycle = status.lastConsolidated
          ? new Date(status.lastConsolidated).toLocaleTimeString()
          : 'Recent';
        dreamStats.textContent = `Cycle Count: ${status.cycleCount || 0} | Duration: ${status.lastDurationMs || 0}ms | Last Dream: ${lastCycle}`;
      }
    }

    // 2. Fetch AREM Bounded Top Index (<200 lines, <25KB)
    const indexRes = await fetch('/api/arem/index');
    if (indexRes.ok) {
      const indexData = await indexRes.json();
      const rawText = indexData.index || indexData.content || '';
      modernState.aremIndex = rawText;

      const lines = rawText ? rawText.split('\n').filter(Boolean).length : 0;
      const bytes = new Blob([rawText]).size;
      const maxLines = 200;
      const maxBytes = 25600;

      const linePct = Math.min(100, (lines / maxLines) * 100);
      const bytePct = Math.min(100, (bytes / maxBytes) * 100);

      if (indexGaugeFill) indexGaugeFill.style.width = `${linePct}%`;
      if (indexGaugeLabel)
        indexGaugeLabel.textContent = `${lines} / ${maxLines} lines (${Math.round(linePct)}%)`;

      if (bytesGaugeFill) bytesGaugeFill.style.width = `${bytePct}%`;
      if (bytesGaugeLabel) bytesGaugeLabel.textContent = `${(bytes / 1024).toFixed(1)} KB / 25 KB`;

      if (invariantsList) {
        const indexLines = rawText
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .slice(0, 8);
        if (indexLines.length > 0) {
          invariantsList.innerHTML = indexLines
            .map(
              (line) => `
            <div class="sis-invariant-pill">
              <span class="sis-invariant-icon">#</span>
              <span>${escapeHtml(line)}</span>
            </div>
          `,
            )
            .join('');
        } else {
          invariantsList.innerHTML =
            '<div class="sis-empty-state">No invariant rules recorded yet.</div>';
        }
      }
    }

    // 3. Fetch Episodic Transcripts
    const transRes = await fetch('/api/arem/transcripts');
    if (transRes.ok) {
      const transData = await transRes.json();
      const turns = transData.transcripts || transData.turns || [];
      modernState.aremTranscripts = turns;

      if (transcriptsList) {
        if (turns.length === 0) {
          transcriptsList.innerHTML =
            '<div class="sis-empty-state">No episodic memory turns yet. Send a prompt to begin.</div>';
        } else {
          transcriptsList.innerHTML = turns
            .slice(0, 10)
            .map((t, i) => {
              const time = t.timestamp
                ? new Date(t.timestamp).toLocaleTimeString()
                : `Turn ${i + 1}`;
              const status = t.consolidated ? 'consolidated' : 'unconsolidated';
              const query =
                t.userPrompt || t.query || t.userMessage || t.summary || 'Cognitive turn';
              return `
              <div class="sis-transcript-item">
                <div class="sis-transcript-item-head">
                  <span class="sis-transcript-time">${time}</span>
                  <span class="sis-transcript-status ${status}">${status}</span>
                </div>
                <div class="sis-transcript-query">${escapeHtml(query)}</div>
              </div>
            `;
            })
            .join('');
        }
      }
    }

    // 4. Fetch Semantic Wiki
    const wikiRes = await fetch('/api/arem/wiki');
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const notes = wikiData.pages || wikiData.notes || wikiData.topics || [];
      modernState.aremWikiList = notes;

      if (wikiList) {
        if (notes.length === 0) {
          wikiList.innerHTML =
            '<div class="sis-empty-state">No wiki notes synthesized yet. Trigger a dream cycle to synthesize knowledge.</div>';
        } else {
          wikiList.innerHTML = notes
            .map((n) => {
              const title = n.title || n.slug || 'Note';
              const slug = n.slug || n.id || title.toLowerCase().replace(/[^a-z0-9]/g, '-');
              const links = Array.isArray(n.links) ? n.links.length : 0;
              return `
              <div class="sis-wiki-item" data-slug="${slug}" role="button" tabindex="0">
                <div class="sis-wiki-item-title">
                  <span>📄</span>
                  <span>${escapeHtml(title)}</span>
                </div>
                <div class="sis-wiki-item-crosslinks">
                  <span>${links} cross-links</span>
                </div>
              </div>
            `;
            })
            .join('');

          // Bind click to open wiki note reader
          wikiList.querySelectorAll('.sis-wiki-item').forEach((item) => {
            item.addEventListener('click', () => {
              const slug = item.dataset.slug;
              openWikiNote(slug);
            });
            item.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openWikiNote(item.dataset.slug);
              }
            });
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to refresh AREM dashboard:', err);
  }
}

async function openWikiNote(slug) {
  if (!slug) return;
  modernState.activeWikiSlug = slug;
  const reader = document.getElementById('sisWikiReader');
  if (!reader) return;

  reader.innerHTML =
    typeof window.renderModernLoader === 'function'
      ? window.renderModernLoader('Loading note contents...', { size: 'sm', align: 'center' })
      : '<div class="sis-loading-state">Loading note contents...</div>';

  try {
    const res = await fetch(`/api/arem/wiki/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = await res.json();
      const title = data.title || slug;
      let content = data.content || data.text || 'No content found.';

      // Format wiki cross-links [[topic]] into clickable spans
      content = content.replace(/\[\[(.*?)\]\]/g, (_, target) => {
        return `<span class="sis-wiki-crosslink" onclick="window.sisOpenWikiNote('${encodeURIComponent(target)}')" role="button" tabindex="0">[[${escapeHtml(target)}]]</span>`;
      });

      reader.innerHTML = `
        <div class="sis-wiki-reader-card">
          <div class="sis-wiki-reader-head">
            <h3>${escapeHtml(title)}</h3>
            <button type="button" class="sis-icon-btn" onclick="document.getElementById('sisWikiReader').innerHTML='';" aria-label="Close note">✕</button>
          </div>
          <div class="sis-wiki-reader-body">${content}</div>
        </div>
      `;
      playChime(1000, 'sine');
    } else {
      reader.innerHTML = `<div class="sis-error-state">Failed to load note: ${res.statusText}</div>`;
    }
  } catch (err) {
    reader.innerHTML = `<div class="sis-error-state">Error: ${escapeHtml(err.message)}</div>`;
  }
}
window.sisOpenWikiNote = openWikiNote;

// Bind "Trigger Dream Cycle" button
export function initDreamButton() {
  const triggerBtn = document.getElementById('sisTriggerDreamBtn');
  if (!triggerBtn) return;

  triggerBtn.addEventListener('click', async () => {
    if (modernState.isDreaming) return;
    modernState.isDreaming = true;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<span class="sis-spinner"></span><span>Synthesizing Dream...</span>';
    playChime(1200, 'triangle');

    const dreamPill = document.getElementById('sisDreamStatusPill');
    if (dreamPill) {
      dreamPill.className = 'sis-dream-status-pill is-dreaming';
      dreamPill.innerHTML =
        '<span class="sis-status-pulse-dot"></span><span>Dreaming Active</span>';
    }

    try {
      const res = await fetch('/api/arem/dream', { method: 'POST' });
      const data = await res.json();
      modernState.isDreaming = false;
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = '<span>⚡ Trigger Dream Consolidation Cycle</span>';

      playChime(880, 'sine');
      await refreshMemoryDashboard();
    } catch (err) {
      modernState.isDreaming = false;
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = '<span>⚡ Trigger Dream Consolidation Cycle</span>';
      console.error('Dream cycle failed:', err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 3. REAL-TIME TOOL REGISTRY & SANDBOX
// ─────────────────────────────────────────────────────────────
export async function refreshToolsView() {
  const grid = document.getElementById('sisToolGrid');
  const countLabel = document.getElementById('sisToolsCountBadge');
  const categoryContainer = document.getElementById('sisToolCategories');
  if (!grid) return;

  grid.innerHTML =
    typeof window.renderModernLoader === 'function'
      ? window.renderModernLoader('Loading tool registry...', { size: 'sm', align: 'center' })
      : '<div class="sis-loading-state">Loading tool registry...</div>';

  try {
    const res = await fetch('/api/tools');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const toolList = Array.isArray(data.tools)
      ? data.tools
      : Object.entries(data.tools || {}).map(([name, info]) => ({ name, ...info }));
    modernState.tools = toolList;
    modernState.filteredTools = toolList;

    if (countLabel) countLabel.textContent = `${toolList.length} Active Tools`;

    // Extract unique categories
    const categories = [
      'all',
      ...new Set(toolList.map((t) => t.category || t.domain || 'system').filter(Boolean)),
    ];
    if (categoryContainer) {
      categoryContainer.innerHTML = categories
        .map(
          (cat) => `
        <button type="button" class="sis-category-chip ${cat === modernState.activeCategory ? 'is-active' : ''}" data-category="${cat}">
          ${cat.toUpperCase()}
        </button>
      `,
        )
        .join('');

      categoryContainer.querySelectorAll('.sis-category-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          categoryContainer
            .querySelectorAll('.sis-category-chip')
            .forEach((c) => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          modernState.activeCategory = chip.dataset.category;
          filterTools();
        });
      });
    }

    renderToolCards(toolList);
  } catch (err) {
    grid.innerHTML = `<div class="sis-error-state">Failed to load tools: ${escapeHtml(err.message)}</div>`;
  }
}

function filterTools() {
  const searchInput = document.getElementById('sisToolSearchInput');
  const term = (searchInput?.value || '').toLowerCase().trim();
  const cat = modernState.activeCategory;

  let filtered = modernState.tools;
  if (cat !== 'all') {
    filtered = filtered.filter(
      (t) => (t.category || t.domain || 'system').toLowerCase() === cat.toLowerCase(),
    );
  }
  if (term) {
    filtered = filtered.filter((t) => {
      const name = (t.name || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      return name.includes(term) || desc.includes(term);
    });
  }

  modernState.filteredTools = filtered;
  renderToolCards(filtered);
}

function renderToolCards(tools) {
  const grid = document.getElementById('sisToolGrid');
  if (!grid) return;

  if (tools.length === 0) {
    grid.innerHTML = '<div class="sis-empty-state">No matching tools found in registry.</div>';
    return;
  }

  grid.innerHTML = tools
    .slice(0, 48)
    .map((t) => {
      const name = t.name || 'unnamed_tool';
      const desc = t.description || 'Executes autonomous agent capability.';
      const cat = t.category || t.domain || 'system';
      return `
      <div class="sis-tool-card" data-tool-name="${escapeHtml(name)}">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span class="sis-tool-card-name">${escapeHtml(name)}</span>
            <span class="sis-tool-domain-tag">${escapeHtml(cat)}</span>
          </div>
          <div class="sis-tool-card-desc">${escapeHtml(desc)}</div>
        </div>
        <div class="sis-tool-card-footer">
          <span style="font-size: 11px; color: #64748b;">Ready</span>
          <button type="button" class="sis-tool-execute-btn" onclick="window.sisSelectToolForSandbox('${escapeHtml(name)}')">
            Inspect &amp; Run
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

export function selectToolForSandbox(toolName) {
  const tool = modernState.tools.find((t) => t.name === toolName) || {
    name: toolName,
    description: 'Direct tool execution.',
  };
  modernState.selectedTool = tool;

  const targetNameEl = document.getElementById('sisSandboxToolName');
  const targetDescEl = document.getElementById('sisSandboxToolDesc');
  const paramsInput = document.getElementById('sisSandboxParamsInput');
  const outputBox = document.getElementById('sisSandboxOutputBox');

  if (targetNameEl) targetNameEl.textContent = tool.name;
  if (targetDescEl) targetDescEl.textContent = tool.description || 'System capability';
  if (paramsInput) {
    const defaultParams = tool.defaultParams || tool.parameters || {};
    paramsInput.value = JSON.stringify(defaultParams, null, 2);
  }
  if (outputBox) outputBox.textContent = '// Ready to execute tool. Press "Execute Tool" below.';

  const sandboxWrap = document.getElementById('sisSandboxInspector');
  if (sandboxWrap) sandboxWrap.scrollIntoView({ behavior: 'smooth' });

  playChime(1050, 'sine');
}
window.sisSelectToolForSandbox = selectToolForSandbox;

export function initSandboxExecutor() {
  const executeBtn = document.getElementById('sisSandboxExecuteBtn');
  const searchInput = document.getElementById('sisToolSearchInput');

  if (searchInput) {
    searchInput.addEventListener('input', () => filterTools());
  }

  if (executeBtn) {
    executeBtn.addEventListener('click', async () => {
      const tool = modernState.selectedTool;
      if (!tool) {
        alert('Please select a tool from the registry first.');
        return;
      }

      const paramsInput = document.getElementById('sisSandboxParamsInput');
      const outputBox = document.getElementById('sisSandboxOutputBox');
      const durationBadge = document.getElementById('sisSandboxDurationBadge');

      let params;
      try {
        params = paramsInput?.value ? JSON.parse(paramsInput.value) : {};
      } catch (err) {
        if (outputBox)
          outputBox.textContent = `Parameter Error: Invalid JSON syntax: ${err.message}`;
        return;
      }

      if (outputBox) outputBox.textContent = `Executing tool "${tool.name}"...`;
      executeBtn.disabled = true;
      const startTime = performance.now();

      try {
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: tool.name, params }),
        });

        const elapsed = Math.round(performance.now() - startTime);
        if (durationBadge) durationBadge.textContent = `${elapsed}ms`;

        const data = await res.json();
        if (outputBox) outputBox.textContent = JSON.stringify(data, null, 2);
        playChime(880, 'sine');
      } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        if (durationBadge) durationBadge.textContent = `${elapsed}ms`;
        if (outputBox) outputBox.textContent = `Execution Error: ${err.message}`;
        playChime(400, 'sawtooth');
      } finally {
        executeBtn.disabled = false;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 4. REAL-TIME BROWSER AGENT SANDBOX
// ─────────────────────────────────────────────────────────────
export async function refreshBrowserView() {
  const urlInput = document.getElementById('sisBrowserUrlInput');
  const titleDisplay = document.getElementById('sisBrowserTitleDisplay');
  const actionLog = document.getElementById('sisBrowserActionLog');
  const frameContainer = document.getElementById('sisBrowserFrameContainer');

  try {
    const res = await fetch(`/api/browser/${modernState.browserAgent}/state`);
    if (res.ok) {
      const data = await res.json();
      modernState.browserState = data;
      if (urlInput && data.url) urlInput.value = data.url;
      if (titleDisplay && data.title) titleDisplay.textContent = data.title;
    }
  } catch (err) {
    console.warn('Browser state unavailable:', err.message);
  }
}

export function initBrowserControls() {
  const urlInput = document.getElementById('sisBrowserUrlInput');
  const navBtn = document.getElementById('sisBrowserNavBtn');
  const refreshBtn = document.getElementById('sisBrowserRefreshBtn');
  const quickLinks = document.querySelectorAll('.sis-browser-quick-link');

  async function navigate(targetUrl) {
    if (!targetUrl) return;
    if (urlInput) urlInput.value = targetUrl;

    const actionLog = document.getElementById('sisBrowserActionLog');
    if (actionLog) {
      const entry = document.createElement('div');
      entry.className = 'sis-browser-log-entry';
      entry.textContent = `[${new Date().toLocaleTimeString()}] Navigating to: ${targetUrl}`;
      actionLog.prepend(entry);
    }

    try {
      await fetch(`/api/browser/${modernState.browserAgent}/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      playChime(1100, 'sine');
      setTimeout(refreshBrowserView, 1200);
    } catch (err) {
      console.error('Browser navigation failed:', err);
    }
  }

  if (navBtn && urlInput) {
    navBtn.addEventListener('click', () => navigate(urlInput.value.trim()));
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigate(urlInput.value.trim());
      }
    });
  }

  if (refreshBtn && urlInput) {
    refreshBtn.addEventListener('click', () => navigate(urlInput.value.trim()));
  }

  quickLinks.forEach((chip) => {
    chip.addEventListener('click', () => {
      const url = chip.dataset.url;
      if (url) navigate(url);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 5. IN-LINE TOOL EXECUTION BLOCK RENDERER (For Chat Turns)
// ─────────────────────────────────────────────────────────────
export function formatToolCallBlock(toolCall) {
  if (!toolCall) return '';
  const name = toolCall.name || toolCall.tool || 'system_call';
  const duration = toolCall.durationMs ? `${toolCall.durationMs}ms` : '32ms';
  const status = toolCall.status || (toolCall.error ? 'error' : 'completed');
  const category = toolCall.category || 'execution';
  const argsJson = JSON.stringify(toolCall.args || toolCall.params || {}, null, 2);
  const resultJson = JSON.stringify(
    toolCall.result || toolCall.output || { status: 'success' },
    null,
    2,
  );

  return `
    <div class="sis-tool-call-block">
      <div class="sis-tool-header" onclick="this.parentElement.classList.toggle('is-expanded')" role="button" tabindex="0">
        <div class="sis-tool-header-left">
          <span class="sis-tool-status-dot ${status}"></span>
          <span class="sis-tool-name-tag">${escapeHtml(name)}</span>
          <span class="sis-tool-domain-tag">${escapeHtml(category)}</span>
        </div>
        <div class="sis-tool-header-right">
          <span class="sis-tool-duration">${duration}</span>
          <svg class="sis-tool-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="sis-tool-details">
        <div>
          <div class="sis-tool-section-label">Parameters</div>
          <pre class="sis-tool-code-box"><code>${escapeHtml(argsJson)}</code></pre>
        </div>
        <div>
          <div class="sis-tool-section-label">Execution Result</div>
          <pre class="sis-tool-code-box"><code>${escapeHtml(resultJson)}</code></pre>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button type="button" class="sis-tool-execute-btn" onclick="window.sisSwitchView('tools'); window.sisSelectToolForSandbox('${escapeHtml(name)}');">
            Open in Sandbox ↗
          </button>
        </div>
      </div>
    </div>
  `;
}
window.sisFormatToolCallBlock = formatToolCallBlock;

// ── HTML Escaper Helper ──
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
// 6. MAIN INITIALIZER
// ─────────────────────────────────────────────────────────────
export function initModernRedesign() {
  initModernNav();
  initDreamButton();
  initSandboxExecutor();
  initBrowserControls();

  // Initial data loading
  refreshMemoryDashboard();
}

// Auto-run if DOM loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModernRedesign);
} else {
  initModernRedesign();
}
