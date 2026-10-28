// Catalogue UI and actions shared with workspace-controller.js.
const connectedFeatureIds = new Set(
  [
    1, 4, 5, 6, 9, 11, 14, 15, 19, 21, 22, 23, 24, 26, 27, 32, 35, 36, 38, 39, 43, 44, 45, 47, 49,
    50,
  ].map((id) => `feat-${id}`),
);
let currentFiftyCat = 'all';
let currentFiftySearch = '';

window.toggleFiftyFeaturesModal = function (force) {
  const modal = document.getElementById('sisFiftyFeaturesModal');
  if (!modal) return;
  const shouldOpen = typeof force === 'boolean' ? force : !modal.classList.contains('active');
  if (shouldOpen) {
    modal.classList.add('active');
    renderFiftyFeatures();
  } else {
    modal.classList.remove('active');
  }
};

window.switchFiftyCat = function (cat, btn) {
  currentFiftyCat = cat;
  document
    .querySelectorAll('#fiftyCategoryStrip .fifty-cat-btn')
    .forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFiftyFeatures();
};

window.filterFiftyFeatures = function (query) {
  currentFiftySearch = (query || '').toLowerCase().trim();
  renderFiftyFeatures();
};

function renderFiftyFeatures() {
  const viewport = document.getElementById('fiftyGridViewport');
  if (!viewport) return;

  const filtered = fiftyFeaturesList.filter((f) => {
    const matchesCat = currentFiftyCat === 'all' || f.cat === currentFiftyCat;
    const matchesSearch =
      !currentFiftySearch ||
      f.title.toLowerCase().includes(currentFiftySearch) ||
      f.desc.toLowerCase().includes(currentFiftySearch) ||
      f.tech.toLowerCase().includes(currentFiftySearch) ||
      f.num.includes(currentFiftySearch);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    viewport.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: rgba(244,240,224,0.5);">No features match "${escapeHtml(currentFiftySearch)}". Try another search!</div>`;
    return;
  }

  viewport.innerHTML = filtered
    .map((f) => {
      return `
          <div class="fifty-card" id="card-${f.id}">
            <div class="fifty-card-header">
              <span class="fifty-num-badge">FEATURE #${f.num}</span>
              <span class="fifty-first-badge">${connectedFeatureIds.has(f.id) ? 'CONNECTED' : 'NOT CONNECTED'}</span>
            </div>
            <div class="fifty-card-title">
              <span style="font-size:18px;">${f.icon}</span>
              <span>${escapeHtml(f.title)}</span>
            </div>
            <div class="fifty-card-desc">${escapeHtml(f.desc)}</div>
            <div class="fifty-card-tech">⚙️ Architecture: ${escapeHtml(f.tech)}</div>
            <button class="fifty-launch-btn" ${connectedFeatureIds.has(f.id) ? '' : 'disabled title="No live check is connected for this feature"'} onclick="executeFiftyFeature('${f.id}')">
              <span>⚡</span> <span>${connectedFeatureIds.has(f.id) ? 'Open / Check Feature' : 'Check unavailable'}</span>
            </button>
          </div>
        `;
    })
    .join('');
}

function setFiftyFeedback(msg, isSuccess = true) {
  const el = document.getElementById('fiftyFeedbackMsg');
  if (el) {
    el.innerHTML = `<span style="color:${isSuccess ? '#10B981' : '#F87171'}; font-weight:700;">[STATUS]:</span> ${escapeHtml(msg)}`;
  }
}

function returnToWorkspaceIfHome() {
  if (!supergenceWorkspace.classList.contains('active')) {
    homeView.style.display = 'none';
    inputWrap.style.display = 'none';
    supergenceWorkspace.classList.add('active');
    initAgentBrowserWebSocketIndex();
    toggleWorkspaceSideBrowser(true);
  }
}

window.executeFiftyFeature = async function (featureId) {
  const feature = fiftyFeaturesList.find((item) => item.id === featureId);
  if (!feature) return;
  if (!connectedFeatureIds.has(featureId)) {
    setFiftyFeedback('Unavailable: no live check is connected for this feature.', false);
    return;
  }

  setFiftyFeedback(`Checking ${feature.title}...`);
  try {
    const { fetchJson, formatCount, formatConfidence } = await import('./telemetry-values.js');
    switch (featureId) {
      case 'feat-1':
      case 'feat-47':
        toggleFiftyFeaturesModal(false);
        returnToWorkspaceIfHome();
        toggleWorkspaceSideBrowser(true);
        setFiftyFeedback('Workspace preview opened.');
        break;
      case 'feat-4':
        await launchAgentInNativeChromeIndex();
        setFiftyFeedback(
          'Native browser handoff requested. Check the browser status for the result.',
        );
        break;
      case 'feat-5': {
        const data = await fetchJson(`/api/browser/${currentAgentBrowserId}/state`);
        const nodes = data.nodes ?? data.interactiveElements;
        const count = Array.isArray(nodes) ? nodes.length : data.nodeCount;
        setFiftyFeedback(
          `Page: ${data.state?.currentTitle ?? data.title ?? 'Unavailable'}; interactive nodes: ${formatCount(count)}.`,
        );
        break;
      }
      case 'feat-6':
        toggleAgentVisionDrawerIndex();
        setFiftyFeedback('Vision drawer toggled.');
        break;
      case 'feat-9':
        selectActiveAgentBrowserIndex('agent-biology');
        setFiftyFeedback('Biology browser session selected.');
        break;
      case 'feat-11':
      case 'feat-15': {
        const data = await fetchJson('/api/ada/status');
        setFiftyFeedback(
          `Installed dynamic tools: ${formatCount(data.totalInstalled)}; pending approval: ${formatCount(data.totalPending)}.`,
        );
        break;
      }
      case 'feat-14':
      case 'feat-36': {
        const data = await fetchJson('/api/supergence/checkpoints');
        const count = Array.isArray(data.checkpoints) ? data.checkpoints.length : undefined;
        setFiftyFeedback(`Stored checkpoints: ${formatCount(count)}.`);
        break;
      }
      case 'feat-19':
        toggleFiftyFeaturesModal(false);
        toggleWorkspaceTreeModal(true, 'memory');
        break;
      case 'feat-21':
      case 'feat-22': {
        const data = await fetchJson('/api/memory/stats');
        setFiftyFeedback(
          `Long-term nodes: ${formatCount(data.longTerm?.totalNodes)}; short-term nodes: ${formatCount(data.shortTerm?.totalNodes)}; average confidence: ${formatConfidence(data.longTerm?.avgConfidence)}.`,
        );
        break;
      }
      case 'feat-23': {
        const data = await fetchJson('/api/brain/lifecycle');
        setFiftyFeedback(
          `Cognitive state: ${data.state ?? 'Unavailable'}; sleep pressure: ${formatConfidence(typeof data.sleepPressure === 'number' ? data.sleepPressure / 100 : undefined)}.`,
        );
        break;
      }
      case 'feat-24': {
        await fetchJson('/api/brain/sleep', { method: 'POST' });
        setFiftyFeedback('Sleep request completed.');
        break;
      }
      case 'feat-26': {
        const data = await fetchJson('/api/supergence/profile');
        setFiftyFeedback(`Profile name: ${data.profile?.name ?? 'Unavailable'}.`);
        break;
      }
      case 'feat-27':
        toggleFiftyFeaturesModal(false);
        returnToWorkspaceIfHome();
        openSideAgentColumn('agent-biology');
        break;
      case 'feat-32':
        toggleFiftyFeaturesModal(false);
        openCreateAgentModal();
        break;
      case 'feat-35':
        toggleFiftyFeaturesModal(false);
        toggleWorkspaceTreeModal(true, 'chat');
        break;
      case 'feat-38':
        toggleFiftyFeaturesModal(false);
        toggleWorkspaceHistoryDrawer(true);
        break;
      case 'feat-39': {
        const data = await fetchJson('/api/conversations');
        const conversations = Array.isArray(data) ? data : data.conversations;
        setFiftyFeedback(
          `Stored conversations: ${formatCount(Array.isArray(conversations) ? conversations.length : undefined)}.`,
        );
        break;
      }
      case 'feat-43': {
        const data = await fetchJson('/api/openclaw/telemetry');
        const memory =
          typeof data.memory?.usedGB === 'number' ? `${data.memory.usedGB} GB` : 'Unavailable';
        setFiftyFeedback(
          `CPU: ${data.cpu?.model ?? 'Unavailable'}; memory used: ${memory}; platform: ${data.platform ?? 'Unavailable'}.`,
        );
        break;
      }
      case 'feat-44': {
        const data = await fetchJson('/api/openclaw/processes');
        setFiftyFeedback(
          `Running processes: ${formatCount(Array.isArray(data.processes) ? data.processes.length : undefined)}.`,
        );
        break;
      }
      case 'feat-45': {
        const data = await fetchJson('/api/openclaw/desktop-screenshot');
        if (data.success !== true) throw new Error('Desktop capture was not confirmed');
        setFiftyFeedback('Desktop capture confirmed by the backend.');
        break;
      }
      case 'feat-49': {
        await fetchJson('/api/brain/stream-of-consciousness/pulse', { method: 'POST' });
        setFiftyFeedback('Contemplation pulse request completed.');
        break;
      }
      case 'feat-50': {
        const data = await fetchJson('/api/improvement/status');
        setFiftyFeedback(
          `Recorded improvements: ${formatCount(data.stats?.totalImprovements)}; engine running: ${typeof data.isRunning === 'boolean' ? data.isRunning : 'Unavailable'}.`,
        );
        break;
      }
    }
  } catch (error) {
    setFiftyFeedback(`Check failed: ${error.message}`, false);
  }
};
