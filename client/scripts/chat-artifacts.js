/* Conversation-owned artifacts. Status comes from HTTP and execution results;
   opening a preview never saves or runs code. */
(() => {
  const runnable = new Set(['js', 'mjs', 'cjs', 'ts', 'py', 'cpp']);
  let draftCount = 0;
  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'sis-preview-error' || typeof event.data.message !== 'string') return;
    const frame = [...document.querySelectorAll('.chat-artifact iframe.chat-artifact-preview')]
      .find((candidate) => candidate.contentWindow === event.source);
    const card = frame?.closest('.chat-artifact');
    const status = card?.querySelector('.chat-artifact-status');
    if (!status) return;
    status.textContent = `Preview error: ${event.data.message.slice(0, 240)}`;
    card.dataset.state = 'error';
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  function slotForTurn() {
    let slot = document.querySelector('.chat-turn-item:last-child .workspace-deck-slot');
    if (!slot) {
      const stream = document.getElementById('chatTurnsStream');
      if (!stream) return null;
      stream.querySelector('.shell-empty')?.remove();
      const turn = element('div', 'chat-turn-item');
      const response = element('div', 'response-synthesis-card');
      slot = element('div', 'workspace-deck-slot');
      response.append(slot);
      turn.append(response);
      stream.append(turn);
    }
    return slot;
  }

  function button(label, action, className = '') {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  function mount(slot, artifact) {
    if (!slot || !artifact) return null;
    let url;
    if (artifact.url) {
      try {
        url = new URL(artifact.url, location.href);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
      } catch {
        return null;
      }
    }
    if (!url && typeof artifact.content !== 'string') return null;
    const filename =
      artifact.filename ||
      artifact.name ||
      (url ? decodeURIComponent(url.pathname.split('/').pop()) : 'Untitled');
    const key = url?.href || filename;
    const existing = [...slot.querySelectorAll('.chat-artifact')].find(
      (card) => card.dataset.artifact === key,
    );
    if (existing) return existing;

    const ext = filename.split('.').pop().toLowerCase();
    const isHTML = ['html', 'htm'].includes(ext);
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
    const isPDF = ext === 'pdf';
    const isPreview = isHTML || isImage || isPDF;
    const card = element('section', 'chat-artifact');
    if (isPreview) {
      card.classList.add('is-interactive', 'is-open');
    }
    card.dataset.artifact = key;
    card.setAttribute('aria-label', artifact.title || filename);
    const header = element('header', 'chat-artifact-header');
    const identity = element('div', 'chat-artifact-identity');
    identity.append(
      element('span', 'chat-artifact-kind', isPreview ? 'INTERACTIVE CANVAS' : 'WORKSPACE FILE'),
    );
    const titleRow = element('div', 'chat-artifact-title-row');
    let toggleIcon = null;
    if (!isPreview) {
      toggleIcon = element('span', 'chat-artifact-toggle-icon', '▶');
      titleRow.append(toggleIcon);
    }
    titleRow.append(element('h3', '', artifact.title || filename));
    identity.append(titleRow);
    const actions = element('div', 'chat-artifact-actions');
    header.append(identity, actions);
    const tabs = element('div', 'chat-artifact-tabs');
    const body = element('div', 'chat-artifact-body');
    const status = element('div', 'chat-artifact-status', 'Loading file…');
    status.setAttribute('role', 'status');
    const source = element('pre', 'chat-artifact-source');
    const code = element('code');
    source.append(code);
    const output = element('pre', 'chat-artifact-output');
    output.hidden = true;
    let content = artifact.content;
    let frame;
    let previewNetworkRestricted = false;
    let run;

    let filePath = artifact.path;
    if (!filePath && url) {
      const pathname = url.pathname;
      if (pathname.startsWith('/workspace/')) {
        filePath = decodeURIComponent(pathname.slice(11));
      } else {
        filePath = decodeURIComponent(pathname.split('/').pop());
      }
    }
    if (!filePath) {
      filePath = artifact.filename || artifact.name || filename;
    }

    function toggleContent(forceOpen) {
      const willOpen =
        typeof forceOpen === 'boolean' ? forceOpen : !card.classList.contains('is-open');
      card.classList.toggle('is-open', willOpen);
      if (toggleIcon) toggleIcon.textContent = willOpen ? '▼' : '▶';
      if (viewBtn) {
        viewBtn.textContent = willOpen ? 'Hide' : 'View';
        viewBtn.setAttribute('aria-expanded', String(willOpen));
      }
      return willOpen;
    }

    let viewBtn = null;
    if (!isPreview) {
      viewBtn = button(
        'View',
        (e) => {
          e.stopPropagation();
          toggleContent();
        },
        'chat-artifact-view-btn',
      );
      viewBtn.setAttribute('aria-expanded', 'false');
      actions.append(viewBtn);

      header.addEventListener('click', (event) => {
        if (event.target.closest('button, a, input, textarea')) return;
        toggleContent();
      });
    }

    const editBtn = button(
      'Edit',
      (e) => {
        e.stopPropagation();
        openEditor();
      },
      'chat-artifact-edit-btn',
    );
    actions.append(editBtn);

    if (url) {
      const open = element('a', '', 'Open ↗');
      open.dataset.browserLink = 'true';
      open.href = url.href;
      open.target = '_blank';
      open.rel = 'noopener noreferrer';
      actions.append(open);
    }
    actions.append(
      button('Expand', (event) => {
        toggleContent(true);
        const expanded = card.classList.toggle('is-expanded');
        event.currentTarget.textContent = expanded ? 'Reduce' : 'Expand';
        event.currentTarget.setAttribute('aria-pressed', String(expanded));
      }),
    );
    actions.append(
      button('Copy', async (event) => {
        const target = event.currentTarget;
        try {
          await navigator.clipboard.writeText(content ?? url?.href ?? '');
          target.textContent = 'Copied';
        } catch {
          target.textContent = 'Copy failed';
        }
        setTimeout(() => {
          target.textContent = 'Copy';
        }, 2000);
      }),
    );

    const editorWrap = element('div', 'chat-artifact-editor-wrap');
    editorWrap.hidden = true;
    const editorBar = element('div', 'chat-artifact-editor-bar');
    const editorLabel = element('span', 'chat-artifact-editor-label', `Editing ${filename}`);
    const editorActions = element('div', 'chat-artifact-editor-actions');
    const editorHint = element('span', 'chat-artifact-editor-hint', 'Ctrl+S to save');

    const saveBtn = button(
      'Save changes',
      async (e) => {
        e.stopPropagation();
        const newContent = editorTextarea.value;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
          const res = await fetch('/api/workspace/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath, content: newContent }),
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
          content = newContent;
          code.textContent = newContent;
          saveBtn.textContent = 'Saved ✓';
          status.textContent = `${filename} · Saved`;
          setTimeout(() => {
            saveBtn.textContent = 'Save changes';
            saveBtn.disabled = false;
            closeEditor();
          }, 600);
          window.dispatchEvent(
            new CustomEvent('workspace-file-saved', { detail: { path: filePath } }),
          );
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save failed';
          status.textContent = `${filename} · Save failed: ${err.message}`;
          setTimeout(() => {
            saveBtn.textContent = 'Save changes';
          }, 2000);
        }
      },
      'chat-artifact-save-btn',
    );

    const cancelBtn = button(
      'Cancel',
      (e) => {
        e.stopPropagation();
        closeEditor();
      },
      'chat-artifact-cancel-btn',
    );

    function openEditor() {
      toggleContent(true);
      card.classList.add('is-editing');
      editorWrap.hidden = false;
      source.hidden = true;
      output.hidden = true;
      editorTextarea.value = content ?? code.textContent ?? '';
      editorTextarea.focus();
    }

    function closeEditor() {
      card.classList.remove('is-editing');
      editorWrap.hidden = true;
      source.hidden = false;
    }

    editorActions.append(editorHint, saveBtn, cancelBtn);
    editorBar.append(editorLabel, editorActions);

    const editorTextarea = element('textarea', 'chat-artifact-editor');
    editorTextarea.spellcheck = false;
    editorTextarea.setAttribute('aria-label', `Edit ${filename}`);
    editorTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeEditor();
      }
    });

    editorWrap.append(editorBar, editorTextarea);
    body.append(editorWrap);

    if (isPreview) {
      const previewTab = button('Preview', () => select(true));
      const codeTab = button(isImage || isPDF ? 'File details' : 'Code', () => select(false));
      tabs.append(previewTab, codeTab);
      function select(preview) {
        if (frame) frame.hidden = !preview || card.dataset.state === 'awaiting-preview';
        source.hidden = preview;
        previewTab.setAttribute('aria-pressed', String(preview));
        codeTab.setAttribute('aria-pressed', String(!preview));
      }
      if (isImage) {
        frame = element('img', 'chat-artifact-preview');
        frame.alt = artifact.title || filename;
      } else {
        frame = element('iframe', 'chat-artifact-preview');
        frame.title = artifact.title || filename;
        frame.setAttribute(
          'sandbox',
          'allow-scripts allow-forms allow-downloads allow-pointer-lock',
        );
        frame.allow = 'fullscreen';
      }
      frame.addEventListener('load', () => {
        if (card.dataset.state !== 'error' && card.dataset.state !== 'awaiting-preview')
          status.textContent = `${filename} · Preview loaded${previewNetworkRestricted ? ' · Network access restricted' : ''}`;
      });
      frame.addEventListener('error', () => {
        status.textContent = `${filename} · Preview could not load`;
        card.dataset.state = 'error';
      });
      body.append(frame);
      select(true);
    }

    if (runnable.has(ext)) {
      run = button(
        'Run code',
        async () => {
          toggleContent(true);
          run.disabled = true;
          output.hidden = false;
          output.textContent = 'Running on the workspace backend…';
          status.textContent = `${filename} · Running`;
          try {
            // An unsaved code block gets its own file, preserving existing project files.
            let path =
              artifact.path ||
              (url?.origin === location.origin && url.pathname.startsWith('/workspace/')
                ? decodeURIComponent(url.pathname.slice(11))
                : null);
            if (!path) {
              path = `chat-${Date.now()}-${++draftCount}.${ext}`;
              await request('/api/workspace/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content }),
              });
            }
            if (path.includes('/') || path.includes('\\'))
              throw new Error('Run currently supports files at the workspace root.');
            const result = await request('/api/workspace/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: path, language: ext }),
            });
            output.textContent =
              [result.stdout, result.stderr].filter(Boolean).join('\n') || 'No process output.';
            status.textContent = `${filename} · ${result.exitCode == null ? 'Exit code unavailable' : `Exit ${result.exitCode}`} · ${result.success ? 'Completed' : 'Failed'}`;
            card.dataset.state = result.success ? 'complete' : 'error';
          } catch (error) {
            output.textContent = error.message;
            status.textContent = `${filename} · Execution failed`;
            card.dataset.state = 'error';
          } finally {
            run.disabled = false;
          }
        },
        'chat-artifact-run',
      );
      run.disabled = true;
      actions.prepend(run);
    }
    body.append(source, output);
    card.append(header, tabs, body, status);
    slot.append(card);

    (async () => {
      try {
        if (url) {
          const response = await fetch(url.href);
          if (!response.ok) throw new Error(`File unavailable (HTTP ${response.status})`);
          if (!isImage && !isPDF) content = await response.text();
        }
        code.textContent = isImage || isPDF ? `${filename}\n${url?.href || ''}` : content || '';
        if (frame) {
          if (url && isHTML && url.origin === location.origin && url.pathname.startsWith('/workspace/')) {
            const relative = decodeURIComponent(url.pathname.slice('/workspace/'.length));
            if (relative.includes('/')) {
              const notice = element('p', 'chat-artifact-preview-notice',
                'This preview can read files in its project folder and may navigate to external sites. Open only code you trust.');
              const open = button('Open project preview', async () => {
                open.disabled = true;
                try {
                  const grant = await request('/api/workspace/preview-grants', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: relative }),
                  });
                  previewNetworkRestricted = Boolean(grant.networkRestricted);
                  frame.src = grant.url;
                  notice.remove();
                  open.remove();
                  status.textContent = `${filename} · Opening preview…`;
                  card.dataset.state = 'loaded';
                  frame.hidden = false;
                } catch (error) {
                  status.textContent = `Preview unavailable: ${error.message}`;
                  card.dataset.state = 'error';
                  open.disabled = false;
                }
              }, 'chat-artifact-open-preview');
              frame.hidden = true;
              body.insertBefore(notice, frame);
              body.insertBefore(open, frame);
              status.textContent = `${filename} · Preview requires confirmation`;
              card.dataset.state = 'awaiting-preview';
            } else {
              const notice = element('p', 'chat-artifact-preview-notice',
                'This preview runs code that may contact external sites. Open only code you trust.');
              const open = button('Open HTML preview', () => {
                frame.src = url.href;
                frame.hidden = false;
                notice.remove();
                open.remove();
                status.textContent = `${filename} · Opening preview…`;
                card.dataset.state = 'loaded';
              }, 'chat-artifact-open-preview');
              frame.hidden = true;
              body.insertBefore(notice, frame);
              body.insertBefore(open, frame);
              status.textContent = `${filename} · Preview requires confirmation`;
              card.dataset.state = 'awaiting-preview';
            }
          } else if (url && !isHTML) frame.src = url.href;
          else if (isHTML) {
            const notice = element('p', 'chat-artifact-preview-notice',
              'This preview runs code that may contact external sites. Open only code you trust.');
            const open = button('Open HTML preview', () => {
              if (url) frame.src = url.href;
              else frame.srcdoc = content;
              frame.hidden = false;
              notice.remove();
              open.remove();
              status.textContent = `${filename} · Opening preview…`;
              card.dataset.state = 'loaded';
            }, 'chat-artifact-open-preview');
            frame.hidden = true;
            body.insertBefore(notice, frame);
            body.insertBefore(open, frame);
            status.textContent = `${filename} · Preview requires confirmation`;
            card.dataset.state = 'awaiting-preview';
          }
          else throw new Error('This preview requires a saved file.');
        }
        if (card.dataset.state !== 'error' && card.dataset.state !== 'awaiting-preview')
          status.textContent = `${filename} · ${isPreview ? 'Opening preview…' : 'Loaded · Not run'}`;
        if (run) run.disabled = false;
        if (card.dataset.state !== 'error' && card.dataset.state !== 'awaiting-preview') card.dataset.state = 'loaded';
      } catch (error) {
        status.textContent = error.message;
        card.dataset.state = 'error';
        if (frame) frame.hidden = true;
        source.hidden = false;
        code.textContent = 'The file could not be loaded. Check its workspace path and try again.';
      }
    })();
    return card;
  }

  window.ChatArtifacts = {
    mount,
    render(slot, artifacts) {
      artifacts.forEach((artifact) => mount(slot, artifact));
    },
  };
  window.openArtifactInSidePane = window.loadHeroArtifact;
  window.loadHeroArtifact = (artifact) => {
    const card = mount(slotForTurn(), artifact);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  window.openCodeInChat = (content, language, filename, trigger) => {
    const slot =
      trigger?.closest('.chat-turn-item')?.querySelector('.workspace-deck-slot') || slotForTurn();
    const card = mount(slot, { content, filename, title: filename });
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  window.loadCodeToStudio = window.openCodeInChat;
  window.copyChatCode = async (button) => {
    try {
      await navigator.clipboard.writeText(
        button.closest('.pro-code-card').querySelector('code').innerText,
      );
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  };
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-code-action]');
    if (!trigger) return;
    const card = trigger.closest('.pro-code-card');
    if (trigger.dataset.codeAction === 'copy') window.copyChatCode(trigger);
    else if (trigger.dataset.codeAction === 'open')
      window.openCodeInChat(
        card.querySelector('code').innerText,
        card.dataset.lang,
        card.dataset.filename,
        trigger,
      );
  });
})();
