/**
 * SIS 1.0 - AGENT FLOW CANVAS CONTROLLER
 * Implements the interactive multi-agent canvas graph directly matching
 * the video reference: 3d562a6f3bbaf7eb361b33bae8a15697.mp4
 */

class SisFlowCanvas {
  constructor() {
    this.container = null;
    this.viewport = null;
    this.world = null;
    this.svgLayer = null;
    this.nodesLayer = null;

    this.panX = 0;
    this.panY = 0;
    this.zoom = 0.85; // Default viewing zoom around 85%
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;

    this.activeDraggingNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Nodes state
    this.nodes = [
      {
        id: 'node-market-research',
        type: 'agent',
        title: 'Market Research Agent',
        subtitle: 'Market & Industry Research',
        status: 'analyzing',
        statusText: 'Analyzing',
        isActiveSapphire: true,
        x: 80,
        y: 180,
        chips: ['✔ Analyzing market trends', '✻ 124 data points processed'],
        progress: 75,
        tokenUsage: '12.4K',
        model: 'GPT-4o ▾',
      },
      {
        id: 'node-marketing',
        type: 'agent',
        title: 'Marketing Agent',
        subtitle: 'GTM & Campaign Launch',
        status: 'active',
        statusText: 'Active',
        isActiveSapphire: false,
        x: 960,
        y: 150,
        chips: ['✔ Channel mix modeling'],
        confidence: '97%',
        tokenUsage: '6.1K',
        model: 'GPT-4o ▾',
      },
      {
        id: 'node-legal',
        type: 'agent',
        title: 'Legal Compliance Agent',
        subtitle: 'EU AI Act & Data Sovereignty',
        status: 'progress',
        statusText: 'In progress',
        isActiveSapphire: false,
        x: 950,
        y: 490,
        chips: ['✔ European AI Act alignment', '✻ Regulatory risk scan'],
        progress: 45,
        tokenUsage: '8.2K',
        model: 'Opus 4.6 ▾',
      },
      {
        id: 'node-product',
        type: 'agent',
        title: 'Product Strategy Agent',
        subtitle: 'Localization & Architecture',
        status: 'progress',
        statusText: 'In progress',
        isActiveSapphire: false,
        x: 90,
        y: 560,
        chips: ['✔ Multi-lingual pipeline', '✻ Latency benchmark'],
        milestones: '3 of 5 active',
        tokenUsage: '9.8K',
        model: 'Opus 4.6 ▾',
      },
    ];

    this.coordinator = {
      x: 430,
      y: 310,
      text: 'Plan the successful launch of our AI product in the European market. Develop a complete strategy for our AI platform across Europe',
      status: 'Dessn is thinking...',
      activeCount: '6 active agent',
    };
  }

  mount(parentEl) {
    if (!parentEl) return;
    this.container = parentEl;
    this.renderSurface();
    this.setupEvents();
    this.updateTransform();
    this.drawWires();

    // Auto-fit coordinates to screen size
    setTimeout(() => {
      this.centerView();
    }, 100);
  }

  renderSurface() {
    this.container.innerHTML = `
      <div class="sis-flow-surface" id="sisFlowCanvasRoot">
        <!-- 1. LEFT NAVIGATION RAIL -->
        <aside class="sis-flow-rail">
          <div class="sis-flow-rail-top">
            <button type="button" class="sis-flow-logo-btn" title="Supergence Swarm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </button>
            <div class="sis-flow-nav-group">
              <button type="button" class="sis-flow-rail-btn is-active" title="Canvas Flow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
              </button>
              <button type="button" class="sis-flow-rail-btn" title="Search & Explore">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <button type="button" class="sis-flow-rail-btn" id="btnFlow3DWorld" title="Switch to 3D Universe">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </button>
              <button type="button" class="sis-flow-rail-btn" title="Voice & Speech">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
              </button>
              <button type="button" class="sis-flow-rail-btn" title="Agentic Note">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
              </button>
              <button type="button" class="sis-flow-rail-btn" title="Swarm Grid">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="sis-flow-rail-bottom">
            <button type="button" class="sis-flow-rail-btn" id="btnFlowOpenSettings" title="Workspace Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <div class="sis-flow-avatar" title="Active User Profile">
              <span>SG</span>
            </div>
          </div>
        </aside>

        <!-- 2. TOP HEADER CONTROLS -->
        <header class="sis-flow-header">
          <div></div>
          <div class="sis-flow-header-center">
            <button type="button" class="sis-flow-pill-btn sis-flow-btn-ghost" id="btnFlowNewProject">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
              <span>New Project</span>
            </button>
            <button type="button" class="sis-flow-pill-btn sis-flow-btn-white" id="btnFlowSaveProject">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              <span>Save</span>
            </button>
          </div>
          <div class="sis-flow-header-right">
            <button type="button" class="sis-flow-icon-pill" title="Export / Fullscreen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          </div>
        </header>

        <!-- 3. INTERACTIVE CANVAS VIEWPORT -->
        <div class="sis-flow-viewport" id="sisFlowViewport">
          <div class="sis-flow-world" id="sisFlowWorld">
            <!-- SVG BEZIER CURVE LAYER -->
            <svg class="sis-flow-svg-layer" id="sisFlowSvgLayer"></svg>

            <!-- NODES LAYER -->
            <div class="sis-flow-nodes-layer" id="sisFlowNodesLayer">
              <!-- Render Coordinator Card -->
              <div class="sis-flow-node-item" id="sisFlowCoordinatorNode" style="left: ${this.coordinator.x}px; top: ${this.coordinator.y}px;">
                <div class="sis-flow-coordinator-card">
                  <div class="sis-flow-active-badge">${this.coordinator.activeCount}</div>
                  <div class="sis-flow-coord-body">
                    <p class="sis-flow-coord-text" contenteditable="true" id="sisFlowPromptText">${this.coordinator.text}</p>
                    <div class="sis-flow-thinking-row">
                      <div class="sis-flow-thinking-left">
                        <div class="sis-flow-pulse-dot"></div>
                        <span id="sisFlowThinkingLabel">${this.coordinator.status}</span>
                      </div>
                      <a class="sis-flow-see-steps" id="sisFlowSeeSteps">See steps &rsaquo;</a>
                    </div>
                  </div>
                  <div class="sis-flow-coord-footer">
                    <div class="sis-flow-coord-tools-left">
                      <button type="button" class="sis-flow-small-btn" id="btnFlowAddNode" title="Add Agent Node">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                      <button type="button" class="sis-flow-small-btn" id="btnFlowBoost" title="Boost Reasoning">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      </button>
                      <div class="sis-flow-model-pill" id="sisFlowModelDropdown" title="Model Selector">
                        <span>Model</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                    <div class="sis-flow-coord-tools-right">
                      <button type="button" class="sis-flow-small-btn" title="Voice Input">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                      </button>
                      <button type="button" class="sis-flow-run-btn" id="btnFlowRunPrompt" title="Run Swarm Task">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2.5"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Render Satellite Agent Cards -->
              ${this.nodes.map((node) => this.renderAgentCardHtml(node)).join('')}
            </div>
          </div>
        </div>

        <!-- 4. BOTTOM FLOATING CANVAS CONTROLS -->
        <div class="sis-flow-canvas-dock">
          <button type="button" class="sis-flow-dock-btn" id="btnFlowZoomIn" title="Zoom In">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button type="button" class="sis-flow-dock-btn" id="btnFlowZoomOut" title="Zoom Out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
          </button>
          <button type="button" class="sis-flow-dock-btn" id="btnFlowFitView" title="Center &amp; Fit View">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/></svg>
          </button>
          <button type="button" class="sis-flow-dock-btn" id="btnFlowResetCanvas" title="Clear / Reset">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        <div class="sis-flow-canvas-status">
          <div class="sis-flow-zoom-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            <button type="button" id="btnFlowZoomMinus">-</button>
            <span id="sisFlowZoomDisplay">${Math.round(this.zoom * 100)}%</span>
            <button type="button" id="btnFlowZoomPlus">+</button>
          </div>
          <button type="button" class="sis-flow-icon-pill" title="Canvas Help">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M 9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;

    this.viewport = document.getElementById('sisFlowViewport');
    this.world = document.getElementById('sisFlowWorld');
    this.svgLayer = document.getElementById('sisFlowSvgLayer');
    this.nodesLayer = document.getElementById('sisFlowNodesLayer');
  }

  renderAgentCardHtml(node) {
    const sapphireClass = node.isActiveSapphire ? 'is-active-sapphire' : '';
    const statusClass = `sis-flow-status-${node.status}`;

    return `
      <div class="sis-flow-node-item" id="${node.id}" style="left: ${node.x}px; top: ${node.y}px;" data-node-id="${node.id}">
        <div class="sis-flow-agent-card ${sapphireClass}">
          <div class="sis-flow-card-head">
            <div class="sis-flow-card-title-group">
              <div class="sis-flow-card-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M2 12h20"/>
                </svg>
              </div>
              <div>
                <div class="sis-flow-card-name">${node.title}</div>
                <div class="sis-flow-card-sub">${node.subtitle}</div>
              </div>
            </div>
            <div class="sis-flow-status-badge ${statusClass}">
              <span style="font-size: 8px;">●</span>
              <span>${node.statusText}</span>
            </div>
          </div>

          <div class="sis-flow-chip-group">
            ${node.chips
              .map(
                (chip) => `
              <div class="sis-flow-chip">
                <span>${chip}</span>
              </div>
            `,
              )
              .join('')}
          </div>

          ${
            node.progress !== undefined
              ? `
            <div>
              <div class="sis-flow-metric-row">
                <span>Progress</span>
                <span class="sis-flow-metric-val">${node.progress}%</span>
              </div>
              <div class="sis-flow-progress-bar">
                <div class="sis-flow-progress-fill" style="width: ${node.progress}%;"></div>
              </div>
            </div>
          `
              : ''
          }

          ${
            node.confidence
              ? `
            <div class="sis-flow-metric-row">
              <span>Confidence</span>
              <span class="sis-flow-metric-val" style="font-size: 15px;">${node.confidence}</span>
            </div>
          `
              : ''
          }

          ${
            node.tokenUsage
              ? `
            <div class="sis-flow-metric-row">
              <span>Token Usage</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="sis-flow-metric-val">${node.tokenUsage}</span>
                <svg class="sis-flow-sparkline" viewBox="0 0 44 16" fill="none">
                  <path d="M1 12 C 10 4, 18 14, 26 6 C 34 2, 38 10, 43 5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          `
              : ''
          }

          ${
            node.model
              ? `
            <div class="sis-flow-metric-row" style="margin-top: 2px;">
              <span>Model</span>
              <span class="sis-flow-metric-val" style="color: #94a3b8; font-size: 11px;">${node.model}</span>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  setupEvents() {
    // 1. Viewport Panning
    this.viewport.addEventListener('mousedown', (e) => {
      // Don't pan if clicking inside an interactive card
      if (
        e.target.closest('.sis-flow-node-item') ||
        e.target.closest('button') ||
        e.target.closest('.sis-flow-header') ||
        e.target.closest('.sis-flow-canvas-dock')
      ) {
        return;
      }
      this.isPanning = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.viewport.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
        this.updateTransform();
        return;
      }

      if (this.activeDraggingNode) {
        const mouseX = (e.clientX - this.panX) / this.zoom;
        const mouseY = (e.clientY - this.panY) / this.zoom;
        const nodeX = mouseX - this.dragOffsetX;
        const nodeY = mouseY - this.dragOffsetY;

        this.activeDraggingNode.style.left = `${nodeX}px`;
        this.activeDraggingNode.style.top = `${nodeY}px`;

        const nodeId = this.activeDraggingNode.dataset.nodeId;
        if (nodeId) {
          const n = this.nodes.find((item) => item.id === nodeId);
          if (n) {
            n.x = nodeX;
            n.y = nodeY;
          }
        } else if (this.activeDraggingNode.id === 'sisFlowCoordinatorNode') {
          this.coordinator.x = nodeX;
          this.coordinator.y = nodeY;
        }

        this.drawWires();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.classList.remove('is-dragging');
      }
      if (this.activeDraggingNode) {
        this.activeDraggingNode = null;
      }
    });

    // 2. Mousewheel Zoom
    this.viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? -0.05 : 0.05;
        this.setZoom(this.zoom + zoomDelta);
      },
      { passive: false },
    );

    // 3. Node Dragging
    const allNodeEls = this.container.querySelectorAll('.sis-flow-node-item');
    allNodeEls.forEach((nodeEl) => {
      nodeEl.addEventListener('mousedown', (e) => {
        if (
          e.target.closest('button') ||
          e.target.closest('a') ||
          e.target.contentEditable === 'true'
        ) {
          return;
        }
        this.activeDraggingNode = nodeEl;
        const rect = nodeEl.getBoundingClientRect();
        this.dragOffsetX = (e.clientX - rect.left) / this.zoom;
        this.dragOffsetY = (e.clientY - rect.top) / this.zoom;
        e.stopPropagation();
      });
    });

    // 4. Zoom Buttons
    const btnZoomIn = document.getElementById('btnFlowZoomIn');
    const btnZoomOut = document.getElementById('btnFlowZoomOut');
    const btnZoomPlus = document.getElementById('btnFlowZoomPlus');
    const btnZoomMinus = document.getElementById('btnFlowZoomMinus');
    const btnFitView = document.getElementById('btnFlowFitView');
    const btnResetCanvas = document.getElementById('btnFlowResetCanvas');

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.setZoom(this.zoom + 0.1));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.setZoom(this.zoom - 0.1));
    if (btnZoomPlus) btnZoomPlus.addEventListener('click', () => this.setZoom(this.zoom + 0.05));
    if (btnZoomMinus) btnZoomMinus.addEventListener('click', () => this.setZoom(this.zoom - 0.05));
    if (btnFitView) btnFitView.addEventListener('click', () => this.centerView());
    if (btnResetCanvas)
      btnResetCanvas.addEventListener('click', () => {
        this.centerView();
      });

    // 5. Settings Trigger in Left Rail
    const btnOpenSettings = document.getElementById('btnFlowOpenSettings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        const modal = document.getElementById('sisSettingsModal');
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
      });
    }

    // 6. Switch back to 3D World button in rail
    const btn3D = document.getElementById('btnFlow3DWorld');
    if (btn3D) {
      btn3D.addEventListener('click', () => {
        if (window.__sisApplyUIStyle) {
          window.__sisApplyUIStyle('obsidian-studio');
        }
      });
    }

    // 7. Prompt Run Button (Executes with Supergence AREM)
    const runBtn = document.getElementById('btnFlowRunPrompt');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.executePrompt());
    }

    // 8. Add Agent Node Button
    const addNodeBtn = document.getElementById('btnFlowAddNode');
    if (addNodeBtn) {
      addNodeBtn.addEventListener('click', () => this.addCustomNode());
    }

    // 9. Save Button
    const saveBtn = document.getElementById('btnFlowSaveProject');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const stateData = {
          coordinator: this.coordinator,
          nodes: this.nodes,
          savedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(stateData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supergence-flow-project-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Window resize draws wires again
    window.addEventListener('resize', () => {
      this.drawWires();
    });
  }

  setZoom(val) {
    this.zoom = Math.max(0.4, Math.min(1.8, val));
    this.updateTransform();
    const display = document.getElementById('sisFlowZoomDisplay');
    if (display) display.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  updateTransform() {
    if (!this.world) return;
    this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  centerView() {
    const rect = this.container.getBoundingClientRect();
    const targetCenterX = this.coordinator.x + 240;
    const targetCenterY = this.coordinator.y + 130;

    this.panX = rect.width / 2 - targetCenterX * this.zoom;
    this.panY = rect.height / 2 - targetCenterY * this.zoom;
    this.setZoom(0.85);
  }

  drawWires() {
    if (!this.svgLayer) return;

    const coordEl = document.getElementById('sisFlowCoordinatorNode');
    if (!coordEl) return;

    const coordW = 480;
    const coordH = 260;
    const cX = this.coordinator.x;
    const cY = this.coordinator.y;

    const centerAnchorLeft = { x: cX, y: cY + coordH / 2 };
    const centerAnchorRight = { x: cX + coordW, y: cY + coordH / 2 };
    const centerAnchorTop = { x: cX + coordW / 2, y: cY };
    const centerAnchorBottom = { x: cX + coordW / 2, y: cY + coordH };

    let svgHtml = `
      <defs>
        <linearGradient id="flowWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#818cf8" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
    `;

    this.nodes.forEach((node, idx) => {
      const nodeW = 270;
      const nodeH = 220;
      const nX = node.x;
      const nY = node.y;

      let start, end;
      // Connect based on relative position
      if (nX < cX) {
        // Node is to the left of coordinator
        start = centerAnchorLeft;
        end = { x: nX + nodeW, y: nY + nodeH / 2 };
      } else {
        // Node is to the right
        start = centerAnchorRight;
        end = { x: nX, y: nY + nodeH / 2 };
      }

      // Bezier control points
      const dx = Math.abs(end.x - start.x) * 0.5;
      const cp1X = start.x > end.x ? start.x - dx : start.x + dx;
      const cp1Y = start.y;
      const cp2X = start.x > end.x ? end.x + dx : end.x - dx;
      const cp2Y = end.y;

      const pathData = `M ${start.x} ${start.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${end.x} ${end.y}`;
      const isActive = node.isActiveSapphire ? 'is-active' : '';

      svgHtml += `
        <path d="${pathData}" class="sis-flow-wire ${isActive}" id="wire-${node.id}"/>
      `;

      // Add animated pulse dot for active wire
      if (node.isActiveSapphire) {
        svgHtml += `
          <circle r="3.5" class="sis-flow-pulse-particle">
            <animateMotion dur="2.5s" repeatCount="indefinite" path="${pathData}"/>
          </circle>
        `;
      }
    });

    this.svgLayer.innerHTML = svgHtml;
  }

  executePrompt() {
    const promptEl = document.getElementById('sisFlowPromptText');
    const thinkingEl = document.getElementById('sisFlowThinkingLabel');
    const text = promptEl ? promptEl.innerText.trim() : this.coordinator.text;

    if (thinkingEl) {
      thinkingEl.textContent = 'Supergence AREM Swarm synthesizing...';
    }

    // Animate market research node
    const marketNode = this.nodes.find((n) => n.id === 'node-market-research');
    if (marketNode) {
      marketNode.progress = Math.min(100, marketNode.progress + 15);
      marketNode.chips.push(`⚡ Synchronized invariant with Opus 4.6`);
      const cardEl = document.getElementById(marketNode.id);
      if (cardEl) {
        cardEl.outerHTML = this.renderAgentCardHtml(marketNode);
        this.setupNodeEvents(document.getElementById(marketNode.id));
      }
    }

    this.drawWires();

    // Trigger backend if available
    if (window.__sisStudioSendMessage) {
      window.__sisStudioSendMessage(text);
    }

    setTimeout(() => {
      if (thinkingEl) {
        thinkingEl.textContent = 'Complete. 4 agents synchronized.';
      }
    }, 2000);
  }

  addCustomNode() {
    const id = `node-custom-${Date.now()}`;
    const newNode = {
      id,
      type: 'agent',
      title: 'Neural Synthesizer',
      subtitle: 'Cognitive Swarm Worker',
      status: 'active',
      statusText: 'Active',
      isActiveSapphire: false,
      x: this.coordinator.x + 100,
      y: this.coordinator.y + 320,
      chips: ['✔ Task allocated', '✻ AREM Memory active'],
      progress: 60,
      tokenUsage: '4.2K',
      model: 'Opus 4.6 ▾',
    };

    this.nodes.push(newNode);
    const nodeEl = document.createElement('div');
    nodeEl.innerHTML = this.renderAgentCardHtml(newNode);
    const newChild = nodeEl.firstElementChild;
    this.nodesLayer.appendChild(newChild);
    this.setupNodeEvents(newChild);
    this.drawWires();
  }

  setupNodeEvents(nodeEl) {
    if (!nodeEl) return;
    nodeEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      this.activeDraggingNode = nodeEl;
      const rect = nodeEl.getBoundingClientRect();
      this.dragOffsetX = (e.clientX - rect.left) / this.zoom;
      this.dragOffsetY = (e.clientY - rect.top) / this.zoom;
      e.stopPropagation();
    });
  }
}

window.SisFlowCanvas = SisFlowCanvas;
