/* The existing Files panel follows the active chat's real directory and event stream. */
(() => {
  const browser = window.SupergenceBrowser;
  if (!browser) return;
  const make = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const button = (text, callback) => {
    const e = make('button', 'cw-button', text);
    e.type = 'button';
    e.addEventListener('click', callback);
    return e;
  };
  const panel = make('section', 'chat-workspace');
  panel.setAttribute('aria-label', 'Chat workspace');
  const heading = make('div', 'cw-heading');
  heading.append(
    make('h2', '', 'Workspace'),
    button('Refresh', () => void refreshFiles()),
  );
  const location = make('p', 'cw-location', 'Preparing this chat’s workspace…');
  const status = make('p', 'cw-status');
  status.setAttribute('role', 'status');
  const tabs = make('nav', 'cw-tabs');
  tabs.setAttribute('aria-label', 'Chat workspace views');
  const filesView = make('div', 'cw-files'),
    terminalView = make('div', 'cw-terminal'),
    activityView = make('div', 'cw-activity');
  let activeTab = 'files',
    cid = null,
    epoch = 0,
    source = null,
    events = [],
    directory = '',
    root = null,
    sequence = 0,
    refreshTimer = null,
    selectedFile = null,
    loading = null;
  const views = { files: filesView, terminal: terminalView, activity: activityView };
  function tab(name) {
    activeTab = name;
    for (const [key, view] of Object.entries(views)) view.hidden = key !== name;
    terminalView.hidden =
      name !== 'terminal' && !(name === 'files' && events.some((event) => event.commandId));
    terminalView.dataset.compact = String(name === 'files');
    for (const b of tabs.children) b.setAttribute('aria-pressed', String(b.dataset.tab === name));
  }
  for (const name of ['files', 'terminal', 'activity']) {
    const b = button(name[0].toUpperCase() + name.slice(1), () => tab(name));
    b.dataset.tab = name;
    tabs.append(b);
  }
  const breadcrumb = make('div', 'cw-breadcrumb'),
    search = make('input', 'cw-search');
  search.type = 'search';
  search.placeholder = 'Filter this folder';
  search.setAttribute('aria-label', 'Filter chat workspace files');
  const fileList = make('div', 'cw-file-list'),
    preview = make('div', 'cw-preview');
  filesView.append(breadcrumb, search, fileList, preview);
  const terminalNote = make(
    'p',
    'cw-note',
    'Commands and their live output appear here as the agent runs them.',
  );
  const commands = make('div', 'cw-commands');
  terminalView.append(make('strong', 'cw-terminal-title', 'Terminal'), terminalNote, commands);
  panel.append(heading, location, status, tabs, filesView, terminalView, activityView);
  tab('files');
  async function api(suffix = '', options = {}) {
    const response = await fetch(
      `/api/conversations/${encodeURIComponent(cid)}/workspace${suffix}`,
      options,
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Workspace unavailable.');
    return result;
  }
  function renderCommands() {
    const nearEnd = commands.scrollHeight - commands.scrollTop - commands.clientHeight < 80;
    commands.replaceChildren();
    const byId = new Map();
    for (const event of events) {
      if (!event.commandId) continue;
      let item = byId.get(event.commandId);
      if (!item) {
        item = {
          id: event.commandId,
          command: 'Earlier command (retained output)',
          cwd: '',
          output: '',
          status: 'Running',
        };
        byId.set(event.commandId, item);
      }
      if (event.kind === 'command-start') {
        item.command = event.command;
        item.cwd = event.cwd;
      }
      if (event.kind === 'command-output')
        item.output +=
          (event.stream === 'stderr' ? '[stderr] ' : '') +
          event.text +
          (event.truncated ? '\n[Output chunk shortened in live view]\n' : '');
      if (event.kind === 'command-end')
        item.status = `Exit ${event.exitCode} · ${event.durationMs} ms${event.error ? ' · ' + event.error : ''}`;
    }
    terminalNote.hidden = byId.size > 0;
    for (const item of [...byId.values()].slice(-40)) {
      const article = make('article', 'cw-command');
      article.dataset.commandId = item.id;
      article.append(
        make('code', 'cw-command-line', item.command),
        make('small', 'cw-note', item.cwd),
        make('pre', 'cw-command-output', item.output || 'Waiting for output…'),
        make('small', 'cw-command-state', item.status),
      );
      commands.append(article);
    }
    if (nearEnd) commands.scrollTop = commands.scrollHeight;
  }
  function renderActivity() {
    activityView.replaceChildren();
    for (const event of events
      .filter((e) => e.kind !== 'command-output')
      .slice(-80)
      .reverse()) {
      const text =
        event.kind === 'file-change'
          ? `${event.exists ? 'Saved' : 'Removed'} ${event.type === 'directory' ? 'folder' : event.type === 'file' ? 'file' : 'entry'} · ${event.path}`
          : event.kind === 'command-start'
            ? `Running · ${event.command}`
            : event.kind === 'command-end'
              ? `Command exited · ${event.exitCode}`
              : event.message || event.kind;
      const row = make('div', 'cw-activity-row');
      row.append(
        make('time', 'cw-note', new Date(event.at).toLocaleTimeString()),
        make('span', '', text),
      );
      activityView.append(row);
    }
    if (!activityView.children.length)
      activityView.append(
        make('p', 'cw-note', 'This chat has no recorded workspace activity yet.'),
      );
  }
  function accept(event) {
    if (event.conversationId !== cid || event.sequence <= sequence) return;
    sequence = event.sequence;
    events.push(event);
    events = events.slice(-1000);
    if (event.kind === 'file-change') {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refreshFiles();
        if (selectedFile === event.path) void openFile(selectedFile);
      }, 180);
    }
    if (event.kind.startsWith('command-')) renderCommands();
    if (event.kind === 'command-start') tab(activeTab);
    if (event.kind === 'command-start') status.textContent = 'Agent is running a command';
    if (event.kind === 'command-end')
      status.textContent = `Command exited with code ${event.exitCode}`;
    if (event.kind === 'watch-error')
      status.textContent = 'Live file updates are unavailable: ' + event.message;
    renderActivity();
  }
  let currentEntries = [];
  function drawFiles() {
    breadcrumb.replaceChildren(
      button('Workspace', () => {
        directory = '';
        void refreshFiles();
      }),
    );
    if (directory) {
      const parts = directory.split('/');
      parts.forEach((part, index) =>
        breadcrumb.append(
          button(part, () => {
            directory = parts.slice(0, index + 1).join('/');
            void refreshFiles();
          }),
        ),
      );
    }
    fileList.replaceChildren();
    for (const item of currentEntries.filter((item) =>
      item.name.toLowerCase().includes(search.value.toLowerCase()),
    )) {
      const row = button('', () => {
        if (item.type === 'directory') {
          directory = item.path;
          selectedFile = null;
          preview.replaceChildren();
          void refreshFiles();
        } else if (item.type === 'file') void openFile(item.path);
      });
      row.classList.add('cw-file');
      row.dataset.path = item.path;
      row.dataset.type = item.type;
      const svg = make('span', 'cw-file-icon');
      svg.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${item.type === 'directory' ? '<path d="M3 7h7l2 2h9v11H3V7Zm0 0V4h7l2 3"/>' : '<path d="M5 3h9l5 5v13H5Z M14 3v6h5"/>'}</svg>`;
      row.append(
        svg,
        make('span', '', item.name),
        make(
          'small',
          'cw-note',
          item.type === 'file'
            ? `${item.bytes.toLocaleString()} B`
            : item.type === 'link'
              ? 'Link (not followed)'
              : 'Folder',
        ),
      );
      row.disabled = item.type === 'link';
      fileList.append(row);
    }
    if (!fileList.children.length)
      fileList.append(
        make(
          'p',
          'cw-note',
          search.value
            ? 'No matching files in this folder.'
            : 'No files yet. Files and folders will appear here as the agent creates them.',
        ),
      );
  }
  search.addEventListener('input', drawFiles);
  async function refreshFiles(offset = 0) {
    const version = epoch,
      path = directory;
    try {
      const data = await api(`/files?${new URLSearchParams({ path, offset })}`);
      if (version !== epoch || path !== directory) return;
      currentEntries = offset ? [...currentEntries, ...data.entries] : data.entries;
      drawFiles();
      if (data.nextOffset !== null)
        fileList.append(button('Load more', () => void refreshFiles(data.nextOffset)));
    } catch (error) {
      if (version === epoch) fileList.textContent = error.message;
    }
  }
  async function openFile(path) {
    selectedFile = path;
    const version = epoch;
    try {
      const data = await api(`/file?${new URLSearchParams({ path })}`);
      if (version !== epoch || selectedFile !== path) return;
      preview.replaceChildren();
      const title = make('div', 'cw-heading');
      title.append(
        make('strong', '', path),
        button('Close', () => {
          selectedFile = null;
          preview.replaceChildren();
        }),
      );
      preview.append(title);
      const actions = make('div', 'cw-file-actions');
      const download = make('a', 'cw-button', 'Download');
      download.href = `/api/conversations/${encodeURIComponent(cid)}/workspace/file?${new URLSearchParams({ path, download: '1' })}`;
      actions.append(download);
      if (/\.(?:html?|png|jpe?g|webp|svg|pdf|mp4|webm|mp3|wav)$/i.test(path))
        actions.append(button('Open preview', () => browser.open(data.url)));
      if (!data.binary && !data.truncated)
        actions.append(
          button('Retain', async (event) => {
            const target = event.currentTarget;
            target.disabled = true;
            try {
              const response = await fetch('/api/learning/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: path,
                  content: data.content,
                  source: `${root}/${path}`,
                  sourceType: 'file',
                }),
              });
              if (!response.ok) throw new Error('Retain failed');
              target.textContent = 'Retained';
            } catch (error) {
              target.textContent = error.message;
            } finally {
              target.disabled = false;
            }
          }),
        );
      preview.append(actions);
      if (/\.(?:png|jpe?g|webp|gif)$/i.test(path)) {
        const image = make('img', 'cw-image');
        image.src = data.url;
        image.alt = path;
        preview.append(image);
      } else if (!data.binary) preview.append(make('pre', 'cw-source', data.content));
      else
        preview.append(
          make(
            'p',
            'cw-note',
            `Binary file · ${data.bytes.toLocaleString()} bytes. Download to open it with a compatible application.`,
          ),
        );
      if (data.truncated)
        preview.append(
          make('p', 'cw-note', 'Preview shows the first 256 KiB. Download the complete file.'),
        );
    } catch (error) {
      if (version === epoch) preview.textContent = error.message;
    }
  }
  function selectChat(id, { open = false } = {}) {
    if (!id) return Promise.resolve();
    if (id === cid) {
      if (open) browser.show({ section: 'files' });
      return loading || Promise.resolve();
    }
    cid = id;
    const version = ++epoch;
    source?.close();
    clearTimeout(refreshTimer);
    source = null;
    events = [];
    sequence = 0;
    directory = '';
    root = null;
    selectedFile = null;
    currentEntries = [];
    search.value = '';
    preview.replaceChildren();
    drawFiles();
    renderCommands();
    tab(activeTab);
    renderActivity();
    location.textContent = 'Preparing this chat’s workspace…';
    status.textContent = 'Connecting';
    if (open) browser.show({ section: 'files' });
    loading = (async () => {
      try {
        const data = await api('', { method: 'POST' });
        if (version !== epoch) return;
        root = data.root;
        location.textContent = data.root;
        location.title = data.root;
        status.textContent = data.watching
          ? 'Live updates connected'
          : data.watchError || 'File watcher unavailable';
        events = data.events;
        sequence = data.sequence;
        renderCommands();
        tab(activeTab);
        renderActivity();
        await refreshFiles();
        if (version !== epoch) return;
        source = new EventSource(
          `/api/conversations/${encodeURIComponent(cid)}/workspace/events?after=${sequence}`,
        );
        source.addEventListener('workspace', (event) => {
          if (version === epoch) accept(JSON.parse(event.data));
        });
        source.addEventListener('reset', (event) => {
          if (version !== epoch) return;
          const data = JSON.parse(event.data);
          events = data.events;
          sequence = data.sequence;
          renderCommands();
          renderActivity();
          void refreshFiles();
        });
        source.onerror = () => {
          if (version !== epoch) return;
          status.textContent = 'Reconnecting to workspace activity…';
        };
        source.onopen = () => {
          if (version !== epoch) return;
          status.textContent = 'Live workspace';
        };
      } catch (error) {
        if (version === epoch) status.textContent = error.message;
      }
    })();
    return loading;
  }
  window.SupergenceChatWorkspace = {
    render(container) {
      container.classList.add('cw-container');
      container.append(panel);
      if (!cid)
        void selectChat(
          window.__activeWorkspaceConvId || localStorage.getItem('sis_workspace_conv'),
        );
    },
    selectChat,
    start({ conversationId }) {
      tab('files');
      return selectChat(conversationId, { open: true });
    },
    get conversationId() {
      return cid;
    },
  };
  window.addEventListener('pagehide', () => source?.close(), { once: true });
})();
