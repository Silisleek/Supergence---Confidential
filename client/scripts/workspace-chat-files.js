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
  const fileActionIcons = {
    Copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    Download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
    Expand: '<path d="M14 4h6v6m0-6-6 6M4 14v6h6m-6 0 6-6"/>',
    Reduce: '<path d="M20 10h-6V4m0 6 6-6M4 14h6v6m0-6-6 6"/>',
  };
  function useFileActionIcon(control, label) {
    control.classList.add('cw-icon-action');
    control.title = label;
    control.setAttribute('aria-label', label);
    control.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${fileActionIcons[label]}</svg>`;
    return control;
  }
  const panel = make('section', 'chat-workspace');
  panel.setAttribute('aria-label', 'Chat workspace');
  const heading = make('header', 'cw-heading');
  const location = make('p', 'cw-location', 'Select a chat to open its workspace.');
  location.setAttribute('aria-label', 'Workspace path');
  const status = make('p', 'cw-status');
  status.setAttribute('role', 'status');
  function setStatus(text, state) {
    status.textContent = text;
    status.dataset.state = state;
  }
  const refresh = button('Refresh', () => void refreshFiles());
  refresh.disabled = true;
  const headerActions = make('div', 'cw-heading-actions');
  headerActions.append(status, refresh);
  heading.append(location, headerActions);
  const tabs = make('nav', 'cw-tabs');
  tabs.setAttribute('aria-label', 'Chat workspace views');
  const filesView = make('div', 'cw-files'),
    terminalView = make('div', 'cw-terminal'),
    activityView = make('div', 'cw-activity'),
    sharedView = make('div', 'cw-shared');
  const chatEditors = new Map();
  let editor, aceReady;
  let folders = new Map();
  let documents = new Map();
  let activeTab = 'files',
    fileView = 'explorer',
    cid = null,
    epoch = 0,
    source = null,
    events = [],
    root = null,
    sequence = 0,
    refreshTimer = null,
    selectedFile = null,
    loading = null;
  const views = {
    files: filesView,
    terminal: terminalView,
    activity: activityView,
    shared: sharedView,
  };
  function tab(name) {
    activeTab = name;
    panel.dataset.view = name;
    for (const [key, view] of Object.entries(views)) view.hidden = key !== name;
    for (const b of tabs.querySelectorAll('[data-tab]'))
      b.setAttribute('aria-pressed', String(b.dataset.tab === name));
    if (name === 'files') requestAnimationFrame(() => editor?.resize());
  }
  for (const name of ['files', 'terminal', 'activity', 'shared']) {
    const b = button(name[0].toUpperCase() + name.slice(1), () => tab(name));
    b.dataset.tab = name;
    tabs.append(b);
  }
  const fileList = make('div', 'cw-file-list'),
    preview = make('div', 'cw-preview');
  const explorer = make('aside', 'cw-explorer');
  explorer.id = 'cwExplorer';
  explorer.setAttribute('aria-label', 'File explorer');
  explorer.append(fileList);
  const editorTabs = make('div', 'cw-editor-tabs');
  editorTabs.setAttribute('aria-label', 'Open files');
  const stage = make('section', 'cw-editor-stage');
  stage.id = 'cwFileStage';
  stage.setAttribute('aria-label', 'File editor');
  stage.append(editorTabs, preview);
  const fileViewTabs = make('div', 'cw-file-view-tabs');
  fileViewTabs.setAttribute('role', 'tablist');
  fileViewTabs.setAttribute('aria-label', 'File views');
  const fileViews = { explorer, preview: stage };
  const fileViewButtons = Object.entries(fileViews).map(([view, pane]) => {
    const control = button(view === 'explorer' ? 'Explorer' : 'Preview', () => setFileView(view));
    control.dataset.view = view;
    control.id = `cwFileView-${view}`;
    control.setAttribute('role', 'tab');
    control.setAttribute('aria-controls', pane.id);
    fileViewTabs.append(control);
    return control;
  });
  fileViewTabs.addEventListener('keydown', (event) => {
    const index = fileViewButtons.indexOf(event.target);
    if (index < 0) return;
    const next = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    fileViewButtons[next].click();
    fileViewButtons[next].focus();
  });
  document.addEventListener('fullscreenchange', () => {
    if (selected()) drawEditor();
  });
  filesView.append(fileViewTabs, stage, explorer);
  new ResizeObserver(([entry]) => {
    if (!entry.contentRect.width) return;
    const compact = entry.contentRect.width <= 430;
    if (String(compact) === filesView.dataset.compact) return;
    const focused = document.activeElement;
    filesView.dataset.compact = String(compact);
    for (const [view, pane] of Object.entries(fileViews)) {
      if (compact) {
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-labelledby', `cwFileView-${view}`);
        if (pane.contains(focused)) setFileView(view);
      } else {
        pane.removeAttribute('role');
        pane.removeAttribute('aria-labelledby');
      }
    }
    if (!compact && fileViewTabs.contains(focused)) {
      (fileViews[fileView].querySelector('button:not(:disabled)') || tabs.firstElementChild).focus();
    }
    requestAnimationFrame(() => editor?.resize());
  }).observe(filesView);
  function setFileView(view) {
    fileView = view;
    filesView.dataset.fileView = view;
    for (const control of fileViewButtons) {
      const selected = control.dataset.view === view;
      control.setAttribute('aria-selected', String(selected));
      control.tabIndex = selected ? 0 : -1;
    }
    requestAnimationFrame(() => editor?.resize());
  }
  setFileView('explorer');
  const terminalNote = make(
    'p',
    'cw-note',
    'Commands and their live output appear here as the agent runs them.',
  );
  const commands = make('div', 'cw-commands');
  const terminalHeader = make('header', 'cw-terminal-header');
  const terminalFeedback = make('span', 'cw-note cw-terminal-feedback');
  terminalFeedback.setAttribute('role', 'status');
  const copyTerminal = useFileActionIcon(button('', async () => {
    try {
      await navigator.clipboard.writeText(commands.innerText);
      terminalFeedback.textContent = 'Output copied.';
    } catch {
      terminalFeedback.textContent = 'Could not copy output.';
    }
  }), 'Copy');
  copyTerminal.disabled = true;
  copyTerminal.setAttribute('aria-label', 'Copy terminal output');
  copyTerminal.title = 'Copy terminal output';
  terminalHeader.append(make('strong', 'cw-terminal-title', 'Terminal'), terminalFeedback, copyTerminal);
  terminalView.append(terminalHeader, terminalNote, commands);
  panel.append(heading, tabs, filesView, terminalView, activityView, sharedView);
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
    copyTerminal.disabled = byId.size === 0;
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
      }, 180);
      const doc = documents.get(event.path);
      if (doc && !doc.saving) {
        doc.stale = true;
        if (selectedFile === doc.path && !doc.dirty) void loadFile(doc);
      }
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
  function folderAt(path) {
    if (!folders.has(path))
      folders.set(path, { entries: [], state: 'idle', next: null, open: false });
    return folders.get(path);
  }
  function fileIcon(type) {
    const icon = make('span', 'cw-file-icon');
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${type === 'directory' ? '<path d="M3 7h7l2 2h9v11H3V7Zm0 0V4h7l2 3"/>' : '<path d="M5 3h9l5 5v13H5Z M14 3v6h5"/>'}</svg>`;
    return icon;
  }

  function drawFiles() {
    const focusedPath = fileList.contains(document.activeElement)
      ? document.activeElement.dataset.path
      : null;
    const rows = document.createDocumentFragment();

    function appendFolder(path, depth) {
      const folder = folderAt(path);
      if (folder.state !== 'ready') {
        const message =
          folder.state === 'error'
            ? folder.error
            : folder.state === 'loading'
              ? 'Loading folder…'
              : 'Select a chat to see its files.';
        const note = make('p', 'cw-folder-note', message);
        if (folder.state === 'error') note.dataset.error = '';
        rows.append(note);
        if (folder.state === 'error' && root) rows.append(button('Retry', () => void loadFolder(path)));
        return;
      }

      for (const item of folder.entries) {
        const isFolder = item.type === 'directory';
        const branch = isFolder ? folders.get(item.path) : null;
        const row = button('', (event) => {
          if (!isFolder) {
            void openFile(item.path, { focus: event.detail === 0 });
            return;
          }
          const child = folderAt(item.path);
          child.open = !child.open;
          drawFiles();
          if (child.open) void loadFolder(item.path);
        });
        row.classList.add('cw-file');
        row.dataset.path = item.path;
        row.dataset.type = item.type;
        row.title = item.path;
        row.style.setProperty('--cw-tree-depth', Math.min(depth, 9));
        if (item.path === selectedFile) row.setAttribute('aria-current', 'true');
        if (isFolder) row.setAttribute('aria-expanded', String(Boolean(branch?.open)));
        if (!isFolder) {
          const type = item.name.includes('.') ? item.name.split('.').at(-1).toLowerCase() : '';
          row.dataset.fileType = type;
        }
        row.append(fileIcon(item.type), make('span', '', item.name));
        row.disabled = item.type === 'link';
        rows.append(row);
        if (branch?.open) appendFolder(item.path, depth + 1);
      }

      if (folder.next !== null) {
        const more = button('Load more', () => void loadFolder(path, folder.next));
        more.setAttribute(
          'aria-label',
          path ? `Load more files in ${path}` : 'Load more workspace files',
        );
        rows.append(more);
      }
      if (!folder.entries.length)
        rows.append(make('p', 'cw-folder-note', path ? 'Empty folder' : 'No files yet.'));
    }

    const rootFolder = folderAt('');
    appendFolder('', 0);
    fileList.replaceChildren(rows);
    fileList.setAttribute('aria-busy', String(rootFolder.state === 'loading'));
    if (focusedPath) fileList.querySelector(`[data-path="${CSS.escape(focusedPath)}"]`)?.focus();
  }

  async function loadFolder(path = '', offset = 0) {
    if (!cid) return;
    const version = epoch;
    const folder = folderAt(path);
    const request = (folder.request ?? 0) + 1;
    folder.request = request;
    const current = () => version === epoch && folder.request === request;
    if (folder.state !== 'ready') {
      folder.state = 'loading';
      drawFiles();
    }
    try {
      const data = await api(`/files?${new URLSearchParams({ path, offset })}`);
      if (!current()) return;
      folder.entries = offset ? [...folder.entries, ...data.entries] : data.entries;
      folder.next = data.nextOffset;
      folder.state = 'ready';
      drawFiles();
    } catch (error) {
      if (!current()) return;
      folder.state = 'error';
      folder.error = error.message;
      drawFiles();
    }
  }

  async function refreshFiles() {
    if (!cid) return;
    const version = epoch;
    refresh.disabled = true;
    const openFolders = [...folders]
      .filter(([path, folder]) => path && folder.open)
      .map(([path]) => path);
    await Promise.all([loadFolder(), ...openFolders.map((path) => loadFolder(path))]);
    if (version === epoch) refresh.disabled = false;
  }

  const editorModes = new Map(
    Object.entries({
      js: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      jsonc: 'json5',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      xml: 'xml',
      md: 'markdown',
      markdown: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
      py: 'python',
      rs: 'rust',
      go: 'golang',
      java: 'java',
      c: 'c_cpp',
      cpp: 'c_cpp',
      h: 'c_cpp',
      cs: 'csharp',
      sh: 'sh',
      ps1: 'powershell',
      bat: 'batchfile',
      sql: 'sql',
      toml: 'toml',
      ini: 'ini',
      rb: 'ruby',
      php: 'php',
    }),
  );
  const editorSurface = make('div', 'cw-code-editor');
  const fileName = (path) => path.split('/').at(-1);
  const fileQuery = (path, options = {}) => `/file?${new URLSearchParams({ path, ...options })}`;
  const fileUrl = (doc, options) =>
    `/api/conversations/${encodeURIComponent(cid)}/workspace${fileQuery(doc.path, options)}`;
  const selected = () => documents.get(selectedFile);

  function loadAce() {
    if (!aceReady) {
      aceReady = new Promise((resolve, reject) => {
        const script = make('script');
        script.src = '/vendor/ace/ace.js';
        script.onload = () => {
          window.ace.config.set('basePath', '/vendor/ace');
          resolve(window.ace);
        };
        script.onerror = () => {
          aceReady = null;
          script.remove();
          reject(new Error('Could not load the code editor.'));
        };
        document.head.append(script);
      });
    }
    return aceReady;
  }

  function drawEditorTabs() {
    editorTabs.replaceChildren();
    for (const doc of documents.values()) {
      const tabItem = make('div', 'cw-editor-tab');
      tabItem.dataset.active = String(doc.path === selectedFile);
      const open = button(
        fileName(doc.path),
        (event) => void openFile(doc.path, { fromTab: true, focus: event.detail === 0 }),
      );
      open.title = doc.path;
      open.setAttribute('aria-pressed', String(doc.path === selectedFile));
      const close = button('', () => {
        if (
          doc.saving ||
          (doc.dirty && !confirm(`Discard unsaved changes to ${fileName(doc.path)}?`))
        )
          return;
        documents.delete(doc.path);
        if (selectedFile === doc.path) {
          selectedFile = null;
          const last = [...documents.keys()].at(-1);
          if (last) void openFile(last, { fromTab: true });
          else {
            setFileView('explorer');
            drawFiles();
            if (filesView.dataset.compact === 'true') fileViewButtons[0].focus();
          }
        }
        doc.session?.destroy();
        drawEditorTabs();
        drawEditor();
      });
      close.classList.add('cw-tab-close');
      close.setAttribute('aria-label', `Close ${doc.path}`);
      close.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
      tabItem.append(open, close);
      editorTabs.append(tabItem);
      doc.tabItem = tabItem;
      tabItem.toggleAttribute('data-dirty', Boolean(doc.dirty));
    }
  }

  function updateDocument(doc) {
    doc.tabItem?.toggleAttribute('data-dirty', Boolean(doc.dirty));
    if (selected() !== doc) return;
    if (doc.saveButton) doc.saveButton.disabled = !doc.dirty || doc.saving;
    if (doc.retainButton) doc.retainButton.disabled = doc.dirty || doc.saving;
    if (doc.reloadButton) doc.reloadButton.hidden = !doc.stale && !doc.error;
    if (doc.notice)
      doc.notice.textContent = doc.saving
        ? 'Saving…'
        : doc.error || (doc.stale ? 'Changed on disk' : doc.dirty ? 'Unsaved changes' : 'Saved');
  }

  async function saveFile(doc) {
    if (!doc?.session || !doc.dirty || doc.saving) return;
    const content = doc.session.getValue();
    doc.saving = true;
    doc.error = '';
    updateDocument(doc);
    try {
      Object.assign(
        doc.data,
        await api(fileQuery(doc.path), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, revision: doc.data.revision }),
        }),
        { content },
      );
      doc.saved = content;
      doc.dirty = doc.session.getValue() !== content;
      doc.stale = false;
    } catch (error) {
      doc.error = error.message;
    } finally {
      doc.saving = false;
      updateDocument(doc);
    }
  }

  function retainFile(doc, target) {
    const file = doc.data;
    target.disabled = true;
    void fetch('/api/learning/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: doc.path,
        content: file.content,
        source: `${root}/${doc.path}`,
        sourceType: 'file',
      }),
    })
      .then((response) => {
        target.textContent = response.ok ? 'Retained' : 'Retain failed';
      })
      .catch(() => {
        target.textContent = 'Retain failed';
      })
      .finally(() => {
        target.disabled = doc.dirty || doc.saving;
      });
  }

  function appendFilePreview(body, doc) {
    const data = doc.data;
    const content = doc.session?.getValue() ?? data.content;
    if (doc.mode === 'markdown' || /\.mdx?$/i.test(doc.path)) {
      const markdown = make('article', 'workspace-file-markdown');
      if (typeof window.formatMarkdown === 'function')
        markdown.innerHTML = window.formatMarkdown(content || '');
      else markdown.textContent = content;
      body.append(markdown);
      return;
    }

    const mediaType = /\.(mp4|webm|mov)$/i.test(doc.path)
      ? 'video'
      : /\.(mp3|wav|ogg|m4a|flac)$/i.test(doc.path)
        ? 'audio'
        : null;
    if (mediaType && data.url) {
      const media = make(mediaType, 'cw-preview-media');
      media.controls = true;
      media.preload = 'metadata';
      media.src = data.url;
      body.append(media);
      return;
    }

    if (data.url && /\.pdf$/i.test(doc.path)) {
      const pdf = make('div', 'cw-binary-details');
      pdf.append(make('strong', '', fileName(doc.path)));
      pdf.append(button('Open PDF preview', () => browser.open(data.url)));
      body.append(pdf);
    } else if (content != null) {
      body.append(make('pre', 'cw-source cw-preview-text', content));
    } else {
      const detail = make('div', 'cw-binary-details');
      detail.append(
        make('strong', '', fileName(doc.path)),
        make('p', 'cw-note', `${data.bytes.toLocaleString()} bytes`),
      );
      detail.append(make('p', 'cw-note', 'Download this file to open it in a supported app.'));
      body.append(detail);
    }
  }

  function drawEditor() {
    const doc = selected();
    preview.replaceChildren();
    if (!doc) {
      const empty = make('div', 'cw-editor-empty');
      empty.append(make('p', 'cw-note', 'Select a file to preview it.'));
      preview.append(empty);
      return;
    }
    const bar = make('div', 'cw-editor-bar');
    const canViewCode = doc.data?.content != null && !doc.data?.image;
    const documentPreview = /\.(?:mdx?|markdown|pdf)$/i.test(doc.path);
    const view = doc.view || (canViewCode && !documentPreview ? 'code' : 'preview');
    const modes = make('div', 'cw-editor-modes');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'File view');
    if (canViewCode) {
      for (const name of ['Preview', 'Code']) {
        const control = button(name, () => {
          doc.view = name.toLowerCase();
          drawEditor();
          preview.querySelector('.cw-editor-modes [aria-pressed="true"]')?.focus();
        });
        control.setAttribute('aria-pressed', String(view === name.toLowerCase()));
        modes.append(control);
      }
    }
    const title = make('span', 'cw-editor-path', doc.path);
    title.title = doc.path;
    const actions = make('div', 'cw-file-actions');
    const editActions = make('div', 'cw-file-actions');
    const download = make('a', 'cw-button', 'Download');
    download.href = fileUrl(doc, { download: '1' });
    doc.reloadButton = button('Reload file', () => {
      if (!doc.dirty || confirm(`Reload ${fileName(doc.path)} and discard your unsaved changes?`))
        void loadFile(doc, { discard: true });
    });
    doc.saveButton = doc.session ? button('Save', () => void saveFile(doc)) : null;
    doc.retainButton = doc.session
      ? button('Retain', (event) => retainFile(doc, event.currentTarget))
      : null;
    if (doc.saveButton) {
      doc.saveButton.classList.add('cw-save');
      doc.saveButton.title = 'Save (Ctrl+S or ⌘S)';
      editActions.append(doc.saveButton, doc.retainButton);
    }
    if (canViewCode) {
      const copy = button('Copy', async () => {
        try {
          await navigator.clipboard.writeText(doc.session?.getValue() ?? doc.data.content);
          if (doc.notice) doc.notice.textContent = 'Copied';
        } catch {
          if (doc.notice) doc.notice.textContent = 'Copy unavailable';
        }
      });
      actions.append(useFileActionIcon(copy, 'Copy'));
    }
    editActions.append(doc.reloadButton);
    actions.append(useFileActionIcon(download, 'Download'));
    if (stage.requestFullscreen) {
      const expand = button(document.fullscreenElement === stage ? 'Reduce' : 'Expand', () => {
        const toggle =
          document.fullscreenElement === stage
            ? document.exitFullscreen()
            : stage.requestFullscreen();
        void toggle.catch(() => {
          if (doc.notice) doc.notice.textContent = 'Fullscreen unavailable';
        });
      });
      actions.append(useFileActionIcon(expand, document.fullscreenElement === stage ? 'Reduce' : 'Expand'));
    }
    bar.append(modes, title, actions);
    preview.append(bar);
    const body = make('div', 'cw-editor-body');
    preview.append(body);
    const footer = make('div', 'cw-editor-footer');
    doc.notice = make('span', 'cw-editor-notice');
    doc.notice.setAttribute('role', 'status');
    footer.append(doc.notice, editActions);
    preview.append(footer);
    if (doc.session && view === 'code') {
      body.append(editorSurface);
      if (!editor) {
        editor = window.ace.edit(editorSurface, {
          theme: 'ace/theme/tomorrow_night',
          fontSize: 13,
          showPrintMargin: false,
          showFoldWidgets: true,
          useWorker: false,
        });
        editor.textInput.getElement().setAttribute('aria-label', 'File contents');
        editor.commands.addCommand({
          name: 'saveWorkspaceFile',
          bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
          exec: () => void saveFile(selected()),
        });
        new ResizeObserver(() => editor.resize()).observe(editorSurface);
      }
      editor.setSession(doc.session);
      editor.resize();
      if (/\.html?$/i.test(doc.path) && doc.data.url)
        actions.append(button('Open preview', () => browser.open(doc.data.url)));
      footer.append(
        make('span', '', doc.mode === 'text' ? 'Plain text' : doc.mode.replaceAll('_', ' ')),
      );
      updateDocument(doc);
    } else if (doc.data?.image) {
      const image = make('img', 'cw-image');
      image.alt = fileName(doc.path);
      image.src = fileUrl(doc, { image: '1', version: doc.imageVersion });
      doc.notice.textContent = 'Loading image…';
      image.onload = () => {
        if (image.isConnected)
          doc.notice.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
      };
      image.onerror = () => {
        if (!image.isConnected) return;
        body.replaceChildren(
          make('p', 'cw-note', 'This image could not be displayed. Try downloading it.'),
        );
        doc.notice.textContent = 'Image unavailable';
      };
      body.classList.add('cw-image-stage');
      body.append(image);
    } else if (doc.data) {
      if (view === 'code') body.append(make('pre', 'cw-source', doc.data.content));
      else appendFilePreview(body, doc);
      if (view === 'preview' && doc.data.url && /\.html?$/i.test(doc.path))
        actions.append(button('Open app preview', () => browser.open(doc.data.url)));
      if (doc.session) updateDocument(doc);
      else
        doc.notice.textContent = doc.data.truncated
          ? 'Read-only preview · first 256 KiB'
          : 'Read-only preview';
    } else {
      doc.notice.textContent = doc.error || 'Opening file…';
      if (!doc.error) body.append(make('div', 'cw-editor-skeleton'));
    }
    doc.reloadButton.hidden = !doc.stale && !doc.error;
  }

  async function loadFile(doc, { discard = false } = {}) {
    const version = epoch;
    const original = doc.session?.getValue();
    const request = (doc.request || 0) + 1;
    doc.request = request;
    const isCurrent = () =>
      version === epoch && documents.get(doc.path) === doc && doc.request === request;
    try {
      const data = await api(fileQuery(doc.path));
      if (!isCurrent() || doc.saving) return;
      if (doc.dirty && (!discard || doc.session.getValue() !== original)) return;
      if (!discard && data.revision && doc.data?.revision === data.revision) {
        doc.stale = false;
        updateDocument(doc);
        return;
      }
      let session;
      if (data.revision) {
        const ace = await loadAce();
        if (
          !isCurrent() ||
          doc.saving ||
          (doc.dirty && (!discard || doc.session.getValue() !== original))
        )
          return;
        doc.mode = editorModes.get(doc.path.split('.').at(-1).toLowerCase()) || 'text';
        session = ace.createEditSession(data.content);
        session.setNewLineMode(data.content.match(/\r?\n/)?.[0] === '\r\n' ? 'windows' : 'unix');
        session.setUseWorker(false);
        session.setMode(`ace/mode/${doc.mode}`);
        session.setUseSoftTabs(true);
        session.setTabSize(2);
        if (doc.session) session.selection.setSelectionRange(doc.session.selection.getRange());
        doc.saved = session.getValue();
        session.on('change', () => {
          doc.dirty = session.getValue() !== doc.saved;
          updateDocument(doc);
        });
      }
      const oldSession = doc.session;
      Object.assign(doc, {
        data,
        session,
        dirty: false,
        stale: false,
        error: '',
        imageVersion: Date.now(),
      });
      if (selected() === doc) drawEditor();
      oldSession?.destroy();
    } catch (error) {
      if (!isCurrent()) return;
      doc.error = error.message;
      if (selected() === doc) {
        if (doc.data) updateDocument(doc);
        else drawEditor();
      }
    }
  }

  async function openFile(path, { fromTab = false, focus = false } = {}) {
    if (!documents.has(path)) documents.set(path, { path });
    selectedFile = path;
    const moveFocus = !fromTab && filesView.dataset.compact === 'true';
    setFileView('preview');
    drawEditorTabs();
    drawFiles();
    drawEditor();
    const doc = selected();
    if (moveFocus) doc.tabItem?.firstElementChild?.focus();
    if (!doc.data || (doc.stale && !doc.dirty)) await loadFile(doc);
    if (focus && selected() === doc) {
      if (doc.session && editorSurface.isConnected) editor.focus();
      else doc.tabItem?.firstElementChild?.focus();
    }
  }
  function selectChat(id, { open = false } = {}) {
    if (!id) return Promise.resolve();
    if (id === cid) {
      if (open) browser.show({ section: 'files' });
      return loading || Promise.resolve();
    }
    if (cid) chatEditors.set(cid, { documents, selectedFile, folders, fileView });
    const previous = chatEditors.get(id);
    cid = id;
    const version = ++epoch;
    source?.close();
    clearTimeout(refreshTimer);
    source = null;
    events = [];
    terminalFeedback.textContent = '';
    sequence = 0;
    root = null;
    documents = previous?.documents || new Map();
    selectedFile = previous?.selectedFile || null;
    folders = previous?.folders || new Map();
    folderAt('').state = 'loading';
    refresh.disabled = true;
    setFileView(previous?.fileView ?? 'explorer');
    drawEditorTabs();
    drawEditor();
    drawFiles();
    renderCommands();
    tab(activeTab);
    renderActivity();
    location.textContent = 'Preparing this chat’s workspace…';
    location.removeAttribute('title');
    setStatus('Connecting…', 'connecting');
    if (open) browser.show({ section: 'files' });
    loading = (async () => {
      try {
        const data = await api('', { method: 'POST' });
        if (version !== epoch) return;
        root = data.root;
        location.textContent = data.root.split(/[\\/]/).filter(Boolean).slice(-2).join('/');
        location.title = data.root;
        const watchStatus = data.watching ? 'Live updates' : 'File watcher unavailable';
        status.title = data.watchError || '';
        setStatus(watchStatus, data.watching ? 'live' : 'unavailable');
        events = data.events;
        sequence = data.sequence;
        renderCommands();
        tab(activeTab);
        renderActivity();
        await refreshFiles();
        if (version !== epoch) return;
        if (selected() && !selected().dirty) void loadFile(selected());
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
          setStatus('Reconnecting…', 'reconnecting');
        };
        source.onopen = () => {
          if (version !== epoch) return;
          setStatus(watchStatus, data.watching ? 'live' : 'unavailable');
        };
      } catch (error) {
        if (version !== epoch) return;
        setStatus('Workspace unavailable', 'unavailable');
        Object.assign(folderAt(''), { state: 'error', error: error.message });
        drawFiles();
      }
    })();
    return loading;
  }

  function workspaceFilePath(value, id = window.__activeWorkspaceConvId) {
    if (!id || !value) return null;
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return null;
      const segments = url.pathname.split('/').slice(1).map(decodeURIComponent);
      if (segments[0] !== 'workspace' || segments[1] !== 'chats' || segments[2] !== id) return null;
      const path = segments.slice(3);
      if (!path.length || path.some((segment) => !segment || segment === '.' || segment === '..' || /[\\/\0]/.test(segment))) return null;
      return path.join('/');
    } catch {
      return null;
    }
  }
  drawEditor();
  drawFiles();

  window.SupergenceChatWorkspace = {
    render(container) {
      if (!container) return;
      container.classList.add('cw-container');
      container.append(panel);
      if (!cid)
        void selectChat(
          window.__activeWorkspaceConvId || localStorage.getItem('sis_workspace_conv'),
        );
    },
    selectChat,
    canOpenWorkspaceFile(url) {
      return Boolean(workspaceFilePath(url));
    },
    async openWorkspaceFile(url) {
      const id = window.__activeWorkspaceConvId;
      const path = workspaceFilePath(url, id);
      if (!path) return;
      tab('files');
      await selectChat(id, { open: true });
      if (cid !== id || id !== window.__activeWorkspaceConvId) return;

      let directory = '';
      for (const segment of path.split('/').slice(0, -1)) {
        directory = directory ? `${directory}/${segment}` : segment;
        const folder = folderAt(directory);
        folder.open = true;
        if (folder.state !== 'ready') void loadFolder(directory);
      }
      await openFile(path, { focus: true });
    },
    start({ conversationId, open = true }) {
      tab('files');
      return selectChat(conversationId, { open });
    },
    get conversationId() {
      return cid;
    },
  };
  window.addEventListener('pagehide', () => source?.close(), { once: true });
  window.addEventListener('beforeunload', (event) => {
    if (
      [documents, ...Array.from(chatEditors.values(), (state) => state.documents)].some((files) =>
        [...files.values()].some((doc) => doc.dirty),
      )
    ) {
      event.preventDefault();
      event.returnValue = true;
    }
  });
})();
