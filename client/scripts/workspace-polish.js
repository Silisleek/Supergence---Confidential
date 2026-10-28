/*
 * Workspace polish — resizable conversation/browser panels and the activity dock
 * above the composer. Chat text stays in the transcript; tool activity is read
 * here so a running turn never has to finish before the user can talk again.
 */
(() => {
  if (window.SupergencePolish) return;

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const REMEMBER = 'sis-workspace-layout';

  function readLayout() {
    try {
      const stored = JSON.parse(localStorage.getItem(REMEMBER) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch {
      return {};
    }
  }
  function writeLayout(patch) {
    try {
      localStorage.setItem(REMEMBER, JSON.stringify({ ...readLayout(), ...patch }));
    } catch {
      /* Private mode: the layout still applies for this session. */
    }
  }
  const layout = readLayout();

  /* ── Resizable panels ───────────────────────────────────────────────────── */
  function divider(edge, label) {
    const handle = make('div', 'sg-resize-handle');
    handle.dataset.edge = edge;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', label);
    handle.tabIndex = 0;
    return handle;
  }

  function drag(handle, { axis = 'x', current, apply, commit, limits }) {
    let start = 0;
    let origin = 0;
    let value = 0;
    // Delta is measured from the width captured at pointerdown. Re-reading the
    // live width here would compound every move and slam into the limit.
    const move = (event) => {
      const point = axis === 'x' ? event.clientX : event.clientY;
      value = clamp(origin + (point - start) * (limits.invert ? -1 : 1), limits.min, limits.max);
      apply(value);
    };
    const end = () => {
      handle.dataset.dragging = 'false';
      document.body.classList.remove('sg-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      commit(value || current());
    };
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      start = axis === 'x' ? event.clientX : event.clientY;
      origin = current();
      value = origin;
      handle.dataset.dragging = 'true';
      document.body.classList.add('sg-resizing');
      handle.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
    handle.addEventListener('keydown', (event) => {
      const back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
      const forward = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
      if (event.key !== back && event.key !== forward) return;
      event.preventDefault();
      const step = (event.shiftKey ? 48 : 16) * (limits.invert ? -1 : 1);
      const next = clamp(
        current() + (event.key === forward ? step : -step),
        limits.min,
        limits.max,
      );
      apply(next);
      commit(next);
    });
    handle.addEventListener('dblclick', () => {
      apply(limits.reset);
      commit(limits.reset);
    });
  }

  function mountColumnDividers() {
    const viewport = document.querySelector('.workspace-columns-viewport');
    if (!viewport) return;
    const sidebar = viewport.querySelector('.workspace-conversations-sidebar');
    const browser = viewport.querySelector('.workspace-browser-panel');

    if (sidebar && !viewport.querySelector('.sg-resize-handle[data-for="sidebar"]')) {
      const handle = divider('left', 'Resize conversation history');
      handle.dataset.for = 'sidebar';
      sidebar.after(handle);
      const shell = document.querySelector('.sis-workspace-ui') || document.documentElement;
      const width = () => sidebar.getBoundingClientRect().width || 264;
      const apply = (value) => {
        sidebar.style.width = `${value}px`;
        sidebar.style.minWidth = `${value}px`;
        sidebar.style.maxWidth = `${value}px`;
        shell.style.setProperty('--shell-history', `${value}px`);
      };
      if (Number.isFinite(layout.sidebar) && layout.sidebar > 0) apply(layout.sidebar);
      drag(handle, {
        current: width,
        apply,
        commit: (value) => writeLayout({ sidebar: Math.round(value) }),
        limits: { min: 200, max: 460, invert: false, reset: 264 },
      });
    }

    if (browser && !viewport.querySelector('.sg-resize-handle[data-for="browser"]')) {
      const handle = divider('right', 'Resize workspace browser');
      handle.dataset.for = 'browser';
      browser.before(handle);
      const width = () => browser.getBoundingClientRect().width || 480;
      const apply = (value) => {
        browser.style.setProperty('--wb-user-width', `${value}px`);
        browser.dataset.userWidth = 'true';
      };
      const syncVisibility = () => {
        handle.hidden = browser.hidden;
      };
      if (Number.isFinite(layout.browser) && layout.browser > 0) apply(layout.browser);
      drag(handle, {
        current: width,
        apply,
        commit: (value) => writeLayout({ browser: Math.round(value) }),
        limits: { min: 320, max: Math.max(640, window.innerWidth - 420), invert: true, reset: 480 },
      });
      syncVisibility();
      // The panel is created lazily and toggled by the shell; follow both.
      const observer = new MutationObserver(() => {
        syncVisibility();
        if (browser.hidden || browser.dataset.userWidth === 'true') return;
        if (Number.isFinite(layout.browser) && layout.browser > 0) apply(layout.browser);
      });
      observer.observe(browser, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  /* ── Activity dock ──────────────────────────────────────────────────────── */
  const MAX_ROWS = 40;
  const dock = make('section', 'workspace-activity-dock');
  dock.id = 'workspaceActivityDock';
  dock.hidden = true;
  dock.dataset.collapsed = 'true';
  dock.setAttribute('aria-label', 'Agent activity');
  dock.setAttribute('aria-live', 'polite');

  const head = make('div', 'sg-dock-head');
  const pulse = make('span', 'sg-dock-pulse');
  pulse.setAttribute('aria-hidden', 'true');
  const headText = make('strong', '', 'Working');
  const headCount = make('span', 'sg-dock-meta', '');
  const toggle = make('button', 'sg-dock-toggle', 'Show');
  toggle.type = 'button';
  toggle.addEventListener('click', () => {
    const collapsed = dock.dataset.collapsed !== 'true';
    dock.dataset.collapsed = String(collapsed);
    toggle.textContent = collapsed ? 'Show' : 'Hide';
  });
  head.append(pulse, headText, headCount, toggle);
  const list = make('ul', 'sg-dock-list');
  dock.append(head, list);

  function mountDock() {
    const wrap = document.querySelector('.workspace-composer-wrap');
    if (!wrap || document.getElementById('workspaceActivityDock')) return;
    wrap.prepend(dock);
  }

  /* Human labels for the tools the brain actually broadcasts. */
  const VERBS = [
    [/^(web_search|search_web|web_fetch)$/, 'Searching the web'],
    [/^open_workspace_browser$/, 'Opening the browser'],
    [/^(create_file|write_file)$/, 'Writing a file'],
    [/^edit_file$/, 'Editing a file'],
    [
      /^(read_file|read_directory|list_directory|list_files|list_workspace|workspace_tree)$/,
      'Reading the workspace',
    ],
    [/^(run_command|execute_command|exec_shell|terminal|shell)/, 'Running a command'],
    [/^(generate_|build_|synthesiz|forge)/, 'Building'],
    [/^(retain_|store_memory|update_memory|remember)/, 'Saving to memory'],
    [/^(send_agent_message|read_agent_conversation)$/, 'Talking to another agent'],
    [/^(read_learning_skill|capture_reference_feature)$/, 'Reading reference material'],
    [/^(reverse_engineer|reverse_engineering_status)/, 'Analysing an artifact'],
    [/^(design_|render_|artifact)/, 'Composing an artifact'],
    [/^(search_procedures|analyze_function|decompile)/, 'Inspecting code'],
    [/^(task|goal|plan|todo)/, 'Planning the work'],
  ];
  const SUFFIX = {
    read: 'Reading',
    write: 'Writing',
    create: 'Creating',
    update: 'Updating',
    delete: 'Deleting',
    search: 'Searching',
    get: 'Reading',
    list: 'Reading',
    open: 'Opening',
    run: 'Running',
    build: 'Building',
    generate: 'Generating',
    send: 'Sending',
    verify: 'Verifying',
    test: 'Testing',
    install: 'Installing',
  };
  function humanize(name) {
    const value = String(name || 'tool');
    for (const [pattern, label] of VERBS) if (pattern.test(value)) return label;
    const parts = value.replace(/[_-]+/g, ' ').trim().split(' ').filter(Boolean);
    if (!parts.length) return 'Working';
    const verb = SUFFIX[parts[0].toLowerCase()];
    const rest = parts.slice(verb ? 1 : 0).join(' ');
    if (verb) return rest ? `${verb} ${rest.toLowerCase()}` : verb;
    return parts.join(' ');
  }
  function outcome(detail) {
    const result = detail.output ?? detail.result ?? detail;
    const failed =
      (Number.isFinite(result?.exitCode) && result.exitCode !== 0) ||
      detail.status === 'FAILED' ||
      detail.success === false ||
      result?.success === false ||
      Boolean(result?.error);
    const ms = detail.durationMs ?? result?.durationMs;
    return {
      failed,
      meta: failed ? 'failed' : Number.isFinite(ms) ? `${Math.round(ms)} ms` : 'done',
    };
  }

  let rows = 0;
  function addRow(detail, phase) {
    if (!detail) return;
    const tool = detail.tool || detail.name || detail.displayName;
    const id = detail.id;
    const existing = id && list.querySelector(`[data-call-id="${CSS.escape(String(id))}"]`);
    const row = existing || make('li', 'sg-dock-row');
    row._activity = { ...row._activity, ...detail };
    row.dataset.phase = phase;
    if (tool) row.dataset.tool = tool;
    if (id) row.dataset.callId = String(id);
    const { failed, meta } = phase === 'result' ? outcome(detail) : { failed: false, meta: '…' };
    if (failed) row.dataset.state = 'error';
    if (!existing) {
      row.append(make('span', 'sg-dock-label', humanize(tool)));
      row.append(make('span', 'sg-dock-meta', meta));
      const details = make('details', 'sg-dock-details');
      details.append(make('summary', '', 'Details'), make('pre'));
      row.append(details);
      list.append(row);
    }
    row.querySelector('.sg-dock-meta').textContent = meta;
    const record = row._activity;
    row.querySelector('pre').textContent = JSON.stringify(
      {
        tool: record.tool,
        agentId: record.agentId,
        status: record.status,
        arguments: record.args,
        output: record.output ?? record.result,
      },
      null,
      2,
    ).slice(0, 20000);
    while (list.children.length > MAX_ROWS) list.firstElementChild.remove();
    rows = list.children.length;
    headCount.textContent = rows ? `${rows}` : '';
    dock.scrollTop = dock.scrollHeight;
  }

  function showDock(working) {
    if (!document.getElementById('workspaceActivityDock')) return;
    if (working) {
      dock.hidden = false;
      headText.textContent = 'Working';
      pulse.style.display = '';
      return;
    }
    headText.textContent = rows ? 'Recent activity' : 'Ready';
    pulse.style.display = 'none';
    if (!rows) {
      dock.hidden = true;
      return;
    }
  }

  window.addEventListener('workspace-tool-activity', (event) => {
    const detail = event.detail || {};
    mountDock();
    addRow(detail, detail.phase === 'result' ? 'result' : 'call');
    dock.hidden = false;
  });
  window.addEventListener('workspace-turn-state', (event) => {
    mountDock();
    showDock(!!event.detail?.working);
  });

  /* A queued follow-up typed mid-turn is worth confirming on screen. */
  window.addEventListener('workspace-message-queued', (event) => {
    const count = event.detail?.count || 1;
    const wrap = document.querySelector('.workspace-composer-wrap');
    if (!wrap) return;
    let chip = wrap.querySelector('.sg-queue-chip');
    if (!chip) {
      chip = make('div', 'sg-queue-chip');
      wrap.prepend(chip);
    }
    chip.textContent =
      count === 1
        ? 'Queued — sent as soon as this turn finishes'
        : `${count} messages queued for this turn`;
  });
  window.addEventListener('workspace-turn-state', (event) => {
    if (event.detail?.working) return;
    document.querySelectorAll('.sg-queue-chip').forEach((chip) => chip.remove());
  });

  /* ── Boot ───────────────────────────────────────────────────────────────── */
  function boot() {
    mountDock();
    mountColumnDividers();
    document.documentElement.style.cursor = '';
    // The browser panel mounts after this script on some launches.
    const viewport = document.querySelector('.workspace-columns-viewport');
    if (viewport) {
      const observer = new MutationObserver(() => mountColumnDividers());
      observer.observe(viewport, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SupergencePolish = { dock, mountColumnDividers };
})();
