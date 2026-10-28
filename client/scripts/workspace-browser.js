/* Shared, real Chrome workspace. Navigation and input use the existing agent
   browser API; frames come from that same session's CDP screencast. */
(() => {
  const HOME = 'https://www.google.com';
  const icons = {
    browser:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z"/>',
    files: '<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/>',
    tasks:
      '<path d="m3 6 2 2 4-4m3 3h9M3 14l2 2 4-4m3 3h9M3 22l2 2 4-4m3 3h9" transform="translate(0 -2) scale(1 .9)"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M9 15v6"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
    forward: '<path d="m10 6 6 6-6 6"/>',
    reload: '<path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
  };
  const svg = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.browser}</svg>`;
  let panel;
  let agentId = 'agent-supergence';
  let activeSection = 'browser';
  let activeTabId = null;
  let currentUrl = HOME;
  let socket = null;
  let socketListener = null;
  let timer = null;
  let polling = false;
  let inputQueue = Promise.resolve();
  let openPromise = null;
  let scrollDelta = 0;
  let scrollTimer = null;
  let resizeTimer = null;
  let resizeObserver = null;
  let lastViewport = '';
  const renderers = new Map();
  const documentTitles = new Map();
  const $ = (selector) => panel?.querySelector(selector);
  const visible = () => !!panel && !panel.hidden;

  function setStatus(message, error = false, phase = 'ready') {
    if (!$('.wb-status')) return;
    $('.wb-status').textContent = message;
    panel.dataset.state = error ? 'error' : phase;
    panel.setAttribute('aria-busy', String(!error && phase === 'loading'));
  }

  async function readResponse(response, endpoint) {
    const text = await response.text();
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) {
      const html = /^\s*(?:<!doctype|<html)/i.test(text);
      throw new Error(
        html
          ? `The browser API returned a page instead of JSON (${response.status}). Reload after restarting the Supergence backend with the current app. Endpoint: ${endpoint}`
          : `The browser API returned an unsupported response (${response.status}). Endpoint: ${endpoint}`,
      );
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`The browser API returned invalid JSON (${response.status}). Please retry.`);
    }
    if (!response.ok || data.success === false) {
      throw new Error(data.error || `Browser request failed (${response.status})`);
    }
    return data;
  }

  async function request(path, body, method = 'POST') {
    const endpoint = `/api/browser/${encodeURIComponent(agentId)}/${path}`;
    const response = await fetch(endpoint, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    return readResponse(response, endpoint);
  }

  function resolveAddress(value) {
    const input = String(value || '').trim();
    if (!input) return HOME;
    if (/^(javascript|data|file):/i.test(input)) {
      throw new Error(
        'Open a web address or a served local URL, such as http://localhost:3009/workspace/example.html.',
      );
    }
    if (input.startsWith('/')) return new URL(input, location.origin).href;
    if (/^https?:\/\//i.test(input)) return new URL(input).href;
    if (/^(localhost|127\.0\.0\.1|\[::1\])(?=[:/]|$)/i.test(input)) {
      return new URL(`http://${input}`).href;
    }
    if (!/\s/.test(input) && /^[\w-]+(\.[\w-]+)+(?:[:/].*)?$/.test(input)) {
      return new URL(`https://${input}`).href;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }

  function updateAddress(url) {
    if (!url || url === 'about:blank') return;
    currentUrl = url;
    if (document.activeElement !== $('.wb-address')) $('.wb-address').value = url;
    $('.wb-external').href = url;
  }

  function updateTabs(tabs = [], activeId) {
    const changed = activeId && activeId !== activeTabId;
    if (activeId) activeTabId = activeId;
    if (changed) {
      lastViewport = '';
      scheduleViewport();
    }
    const strip = $('.wb-tabs');
    strip.replaceChildren();
    for (const tab of tabs) {
      const item = document.createElement('div');
      item.className = 'wb-tab';
      const selected = tab.id === activeTabId || tab.isActive;
      item.dataset.active = String(selected);
      const select = document.createElement('button');
      select.type = 'button';
      select.className = 'wb-tab-select';
      const observed = documentTitles.get(`${agentId}:${tab.id}`);
      select.textContent =
        (observed?.url === tab.url && observed.title) || tab.title || tab.url || 'Untitled';
      select.title = tab.url || select.textContent;
      select.setAttribute('aria-pressed', String(selected));
      select.addEventListener('click', () => runAction('tabs/switch', { tabId: tab.id }));
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'wb-tab-close';
      close.setAttribute('aria-label', `Close tab ${tab.title || 'Untitled'}`);
      close.innerHTML = svg('close');
      close.addEventListener('click', () =>
        tabs.length === 1
          ? navigate(HOME)
          : runAction(`tabs/${encodeURIComponent(tab.id)}`, undefined, 'DELETE'),
      );
      item.append(select, close);
      strip.append(item);
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'wb-icon wb-add-tab';
    add.setAttribute('aria-label', 'New browser tab');
    add.innerHTML = svg('plus');
    add.addEventListener('click', () => runAction('tabs/new', { url: HOME }));
    strip.append(add);
  }

  function updateFrame(frame) {
    if (!frame || !frame.startsWith('data:image/')) return;
    const image = $('.wb-frame');
    image.src = frame;
    image.hidden = false;
    $('.wb-empty').hidden = true;
  }

  function updateTitle(title, url = currentUrl) {
    if (!title || !activeTabId) return;
    documentTitles.set(`${agentId}:${activeTabId}`, { title, url });
    const button = $('.wb-tab[data-active="true"] .wb-tab-select');
    if (button) button.textContent = title;
  }

  function applyState(state) {
    if (!state) return;
    updateAddress(state.currentUrl || state.url);
    if (state.tabs) updateTabs(state.tabs, state.activeTabId);
    updateTitle(state.pageTitle || state.title, state.currentUrl || state.url);
    updateFrame(state.lastScreenshot);
    if (state.isOpen) scheduleViewport();
    if (state.error) setStatus(state.error, true);
    else if (state.isLoading || state.status === 'NAVIGATING')
      setStatus('Loading page…', false, 'loading');
    else if (state.isOpen || state.status === 'READY')
      setStatus(state.pageTitle || state.title || 'Live Chrome session');
  }

  async function refreshState() {
    if (!visible() || polling) return;
    polling = true;
    try {
      const data = await request('state', undefined, 'GET');
      applyState(data.state);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      polling = false;
    }
  }

  function listenToFrames() {
    // This classic script shares the controller's socket without replacing its
    // message handler or creating another connection carrying whole app state.
    const shared = typeof agentBrowserWs !== 'undefined' ? agentBrowserWs : null;
    if (!shared || shared === socket) return;
    if (socket && socketListener) socket.removeEventListener('message', socketListener);
    socket = shared;
    socketListener = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'workspace-browser-open') {
        show({ agentId: data.agentId || 'agent-supergence' });
        return;
      }
      if (!visible()) return;
      if (data.agentId !== agentId) return;
      if (data.type === 'agent-browser-frame') {
        updateFrame(data.frame);
        updateAddress(data.url);
        updateTitle(data.title, data.url);
      } else if (data.type === 'agent-browser-tabs') updateTabs(data.tabs, data.activeTabId);
      else if (data.type === 'agent-browser-state') applyState(data);
    };
    socket.addEventListener('message', socketListener);
  }

  async function runAction(path, body, method) {
    try {
      setStatus('Sending to Chrome…', false, 'loading');
      const result = await request(path, body, method);
      updateAddress(result.url);
      updateTitle(result.title, result.url);
      await refreshState();
      return result;
    } catch (error) {
      setStatus(error.message, true);
      return { success: false, error: error.message };
    }
  }

  function sendInput(path, body) {
    inputQueue = inputQueue
      .then(() => request(path, body))
      .then((result) => {
        updateAddress(result.url);
        updateTitle(result.title, result.url);
        return result;
      })
      .catch((error) => setStatus(error.message, true));
    return inputQueue;
  }

  async function navigate(value) {
    mount();
    panel.hidden = false;
    document.body.classList.add('has-workspace-browser');
    selectSection('browser');
    try {
      const url = resolveAddress(value);
      $('.wb-address').value = url;
      setStatus('Loading page…', false, 'loading');
      const result = await request('navigate', { url });
      updateAddress(result.url);
      await refreshState();
      return result;
    } catch (error) {
      setStatus(error.message, true);
      return { success: false, error: error.message };
    }
  }

  async function ensureSession(url) {
    if (openPromise) {
      await openPromise;
      return url ? navigate(url) : refreshState();
    }
    $('.wb-agent-select').disabled = true;
    openPromise = (async () => {
      setStatus('Connecting to Chrome…');
      const data = await request('state', undefined, 'GET');
      if (!data.state?.isOpen) await request('open', {});
      if (url || !data.state?.currentUrl || data.state.currentUrl === 'about:blank') {
        return navigate(url || HOME);
      }
      applyState(data.state);
      return data;
    })()
      .catch((error) => {
        setStatus(error.message, true);
        return { success: false, error: error.message };
      })
      .finally(() => {
        openPromise = null;
        $('.wb-agent-select').disabled = false;
        scheduleViewport();
      });
    return openPromise;
  }

  function selectSection(section) {
    // Sections registered at runtime (for example `sidechat`) are valid targets
    // even though they are not part of the built-in header row.
    if (!['browser', 'files', 'tasks', 'settings'].includes(section) && !renderers.has(section))
      return;
    activeSection = section;
    panel.dataset.section = section;
    for (const button of panel.querySelectorAll('[data-browser-section]')) {
      button.setAttribute('aria-pressed', String(button.dataset.browserSection === section));
    }
    $('.wb-browser-content').hidden = section !== 'browser';
    $('.wb-section-content').hidden = section === 'browser';
    if (section === 'browser') return;
    const container = $('.wb-section-content');
    container.replaceChildren();
    const renderer = renderers.get(section);
    if (renderer) {
      Promise.resolve(renderer(container, { agentId })).catch((error) => {
        container.textContent = error.message;
      });
      return;
    }
    const detail = document.createElement('p');
    detail.textContent =
      section === 'files'
        ? 'Browse the files in your workspace.'
        : section === 'tasks'
          ? 'Open the task controls for this workspace.'
          : 'Manage the agents connected to this workspace.';
    const button = document.createElement('button');
    button.className = 'wb-section-action';
    button.textContent = `Open ${section}`;
    button.addEventListener('click', () => {
      if (section === 'files') window.toggleWorkspaceTreeModal?.(true, 'workspace');
      else if (section === 'settings') window.toggleAgentBrowsersModal?.(agentId);
      else window.openAppTeachTaskModal?.();
    });
    container.append(detail, button);
    window.dispatchEvent(
      new CustomEvent('sis:browser-panel-section', { detail: { section, container, agentId } }),
    );
  }

  function coordinates(event) {
    const image = $('.wb-frame');
    if (!image.naturalWidth || image.hidden) return null;
    const rect = image.getBoundingClientRect();
    const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const left = rect.left + (rect.width - image.naturalWidth * scale) / 2;
    const top = rect.top + (rect.height - image.naturalHeight * scale) / 2;
    const x = (event.clientX - left) / scale;
    const y = (event.clientY - top) / scale;
    if (x < 0 || y < 0 || x >= image.naturalWidth || y >= image.naturalHeight) return null;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function scheduleViewport() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      if (!visible() || activeSection !== 'browser' || $('.wb-frame').hidden) return;
      const bounds = $('.wb-stage').getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const width = Math.max(320, Math.min(1920, Math.round(bounds.width)));
      const height = Math.max(240, Math.min(1440, Math.round(bounds.height)));
      const key = `${agentId}:${activeTabId}:${width}:${height}`;
      if (key === lastViewport) return;
      lastViewport = key;
      try {
        await request('viewport', { width, height });
      } catch (error) {
        if (lastViewport === key) lastViewport = '';
        setStatus(`Browser resize unavailable: ${error.message}`, true);
      }
    }, 180);
  }

  function mount() {
    if (panel) return panel;
    const viewport = document.querySelector('.workspace-columns-viewport');
    if (!viewport) return null;
    panel = document.createElement('aside');
    panel.id = 'workspaceBrowserPanel';
    panel.className = 'workspace-browser-panel';
    panel.setAttribute('aria-label', 'Workspace browser');
    panel.hidden = true;
    panel.innerHTML = `
      <header class="wb-header"><nav class="wb-sections" aria-label="Workspace tools">${[
        ['browser', 'Browser'],
        ['files', 'Workspace'],
        ['tasks', 'Tasks'],
        ['settings', 'Agents'],
      ]
        .map(
          ([id, label]) =>
            `<button type="button" data-browser-section="${id}" aria-pressed="${id === 'browser'}">${svg(id)}<span>${label}</span></button>`,
        )
        .join(
          '',
        )}</nav><button type="button" class="wb-icon wb-close" aria-label="Close workspace browser">${svg('close')}</button></header>
      <div class="wb-browser-content">
        <div class="wb-session-row"><label for="workspaceBrowserAgent">Shared session</label><select id="workspaceBrowserAgent" class="wb-agent-select" aria-label="Browser agent"><option value="agent-supergence">Supergence</option></select></div>
        <div class="wb-tabs" aria-label="Browser tabs"></div>
        <form class="wb-toolbar" aria-label="Navigate browser"><button type="button" class="wb-icon" data-nav="back" aria-label="Browser back">${svg('back')}</button><button type="button" class="wb-icon" data-nav="forward" aria-label="Browser forward">${svg('forward')}</button><button type="button" class="wb-icon" data-nav="reload" aria-label="Reload browser">${svg('reload')}</button><div class="wb-address-wrap">${svg('link')}<input class="wb-address" type="text" aria-label="Browser address or search" spellcheck="false" autocomplete="off" value="${HOME}"></div><button type="submit" class="wb-icon wb-go" aria-label="Go to address">${svg('forward')}</button><a class="wb-icon wb-external" href="${HOME}" target="_blank" rel="noopener noreferrer" aria-label="Open current page in a new tab">${svg('external')}</a></form>
        <div class="wb-stage" tabindex="0" role="group" aria-label="Interactive browser. Click the page, then type. Paste is supported."><img class="wb-frame" hidden alt="Live view of the shared Chrome browser" draggable="false"><div class="wb-empty">${svg('browser')}<h2>Your browser, alongside your thinking.</h2><p>Open a local page or explore the web with Supergence.</p><button type="button" class="wb-section-action wb-connect">Open Google</button></div></div>
        <footer class="wb-footer"><span class="wb-status" role="status">Browser is closed.</span><button type="button" class="wb-icon" data-nav="home" aria-label="Open Google home">${svg('home')}</button></footer>
        <p class="wb-input-hint">Click the page to control it. Type, scroll, or paste into the focused field.</p>
      </div><div class="wb-section-content" hidden></div>`;
    viewport.append(panel);
    resizeObserver = new ResizeObserver(scheduleViewport);
    resizeObserver.observe($('.wb-stage'));
    $('.wb-close').addEventListener('click', hide);
    $('.wb-connect').addEventListener('click', () => ensureSession(HOME));
    $('.wb-toolbar').addEventListener('submit', (event) => {
      event.preventDefault();
      navigate($('.wb-address').value);
    });
    for (const button of panel.querySelectorAll('[data-nav]')) {
      button.addEventListener('click', () =>
        button.dataset.nav === 'home'
          ? navigate(HOME)
          : runAction('nav-action', { action: button.dataset.nav }),
      );
    }
    for (const button of panel.querySelectorAll('[data-browser-section]')) {
      button.addEventListener('click', () => {
        selectSection(button.dataset.browserSection);
        if (button.dataset.browserSection === 'browser') ensureSession();
      });
    }
    $('.wb-agent-select').addEventListener('change', async (event) => {
      agentId = event.target.value;
      $('.wb-frame').hidden = true;
      $('.wb-empty').hidden = false;
      await ensureSession();
    });
    const stage = $('.wb-stage');
    stage.addEventListener('click', (event) => {
      const point = coordinates(event);
      if (!point) return;
      stage.focus({ preventScroll: true });
      sendInput('click', point);
    });
    stage.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        $('.wb-address').focus();
        return;
      }
      // Browser clipboard paste must remain native so its paste event contains
      // the clipboard text; other browser shortcuts stay on the user's device.
      if (event.ctrlKey || event.metaKey) {
        if (!event.altKey && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          sendInput('key-press', { key: 'ControlOrMeta+A' });
        }
        return;
      }
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return;
      event.preventDefault();
      if (event.key.length === 1) sendInput('type', { text: event.key });
      else
        sendInput('key-press', {
          key: `${event.shiftKey ? 'Shift+' : ''}${event.key === ' ' ? 'Space' : event.key}`,
        });
    });
    stage.addEventListener('paste', (event) => {
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        event.preventDefault();
        sendInput('type', { text });
      }
    });
    stage.addEventListener(
      'wheel',
      (event) => {
        if ($('.wb-frame').hidden) return;
        event.preventDefault();
        scrollDelta += event.deltaY;
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
          sendInput('scroll', { deltaY: Math.round(scrollDelta) });
          scrollDelta = 0;
          scrollTimer = null;
        }, 100);
      },
      { passive: false },
    );
    fetch('/api/browser/agents')
      .then((response) => readResponse(response, '/api/browser/agents'))
      .then((data) => {
        if (!Array.isArray(data.agents)) return;
        const select = $('.wb-agent-select');
        for (const agent of data.agents) {
          if (agent.id === 'agent-supergence') continue;
          const option = document.createElement('option');
          option.value = agent.id;
          option.textContent = agent.name;
          select.append(option);
        }
      })
      .catch(() => {});
    timer = setInterval(() => {
      listenToFrames();
      if (!visible()) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) refreshState();
    }, 2000);
    listenToFrames();
    return panel;
  }

  async function show(options = {}) {
    if (!mount()) return { success: false, error: 'Workspace layout unavailable.' };
    if (options.agentId && options.agentId !== agentId) {
      agentId = options.agentId;
      $('.wb-agent-select').value = agentId;
    }
    panel.hidden = false;
    document.body.classList.add('has-workspace-browser');
    const button = document.getElementById('workspaceBtnSideBrowser');
    button?.setAttribute('aria-expanded', 'true');
    selectSection(options.section || 'browser');
    listenToFrames();
    if (options.section && options.section !== 'browser')
      return { success: true, section: options.section };
    return ensureSession(options.url);
  }

  function hide() {
    if (!panel) return;
    panel.hidden = true;
    document.body.classList.remove('has-workspace-browser');
    document.getElementById('workspaceBtnSideBrowser')?.setAttribute('aria-expanded', 'false');
  }

  window.SupergenceBrowser = {
    mount,
    show,
    hide,
    toggle: () => (visible() ? hide() : show()),
    open: (url, options = {}) => show({ ...options, url }),
    navigate,
    refresh: refreshState,
    read: () => request('page', undefined, 'GET'),
    registerSection: (id, renderer) => {
      renderers.set(id, renderer);
      if (visible() && activeSection === id) selectSection(id);
    },
    get agentId() {
      return agentId;
    },
    get currentUrl() {
      return currentUrl;
    },
  };

  window.addEventListener('sis:open-browser', (event) => {
    show({ url: event.detail?.url || HOME, agentId: event.detail?.agentId });
  });
  // User follows ordinary web or served local links without leaving the chat.
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('.response-body-markdown a, .chat-artifact a[href]');
    if (
      !link ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      link.hasAttribute('download')
    )
      return;
    if (!/^https?:/i.test(link.href)) return;
    event.preventDefault();
    show({ url: link.href });
  });
  window.addEventListener(
    'pagehide',
    () => {
      clearInterval(timer);
      clearTimeout(scrollTimer);
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      if (socket && socketListener) socket.removeEventListener('message', socketListener);
    },
    { once: true },
  );
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
