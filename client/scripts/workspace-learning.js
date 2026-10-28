/* Learning controls operate on durable sources and measured retrieval results. */
(() => {
  const icon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z"/></svg>';
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  const dialog = node('dialog', 'shell-dialog learning-dialog');
  dialog.id = 'workspaceLearning';
  dialog.setAttribute('aria-labelledby', 'learningTitle');
  dialog.innerHTML = `<div class="shell-dialog-header"><div><span class="shell-eyebrow">LEARNING LIBRARY</span><h2 id="learningTitle">Knowledge that carries forward.</h2></div><form method="dialog"><button class="shell-icon-button" aria-label="Close learning library">×</button></form></div>
    <p class="learning-intro">Retain sources, inspect software, and reuse what you find. Every result keeps its source.</p>
    <div class="learning-tabs"><button type="button" data-learning-tab="library" aria-pressed="true">Sources</button><button type="button" data-learning-tab="import">Retain knowledge</button><button type="button" data-learning-tab="rea">Reverse engineering</button></div>
    <p id="learningStatus" role="status"></p>
    <section data-learning-view="library"><label class="shell-sr-only" for="learningSearch">Search retained knowledge</label><input id="learningSearch" class="learning-input" type="search" placeholder="Search your retained knowledge…"><div id="learningSources"></div></section>
    <section data-learning-view="import" hidden><form id="learningImportForm" class="learning-form"><label>Source title<input name="title" class="learning-input" required maxlength="180" placeholder="What would you like Supergence to remember?"></label><label>Source material<textarea name="content" class="learning-input" rows="8" placeholder="Paste notes, documentation, a worked example, or code."></textarea></label><label>Or choose a text or code file<input id="learningFile" type="file" accept=".txt,.md,.json,.css,.js,.ts,.py,.html,.csv,.yml,.yaml,.rs,.go,.cpp,.h"></label><button class="learning-primary" type="submit">Retain source</button></form></section>
    <section data-learning-view="rea" hidden><div id="learningREAStatus"></div><form id="learningREAForm" class="learning-form"><label>Artifact path inside workspace/<input name="path" class="learning-input" required placeholder="apps/example-build"></label><label>Artifact kind<select name="kind" class="learning-input"><option value="javascript-tree">JavaScript application tree</option><option value="asar">Electron ASAR</option></select></label><button class="learning-primary" type="submit">Analyze and retain evidence</button></form><details class="learning-instructions"><summary>Installed REA workflow</summary><pre id="learningSkillText"></pre></details><p class="learning-note">Static inspection does not execute the application. Native engines are required separately for other artifact types.</p></section>`;
  document.body.append(dialog);
  const fileInput = dialog.querySelector('#learningFile');
  fileInput.multiple = true;
  fileInput.removeAttribute('accept');
  fileInput.parentElement.firstChild.textContent = 'Or choose multiple files';
  const importNote = node('p', 'learning-note', 'Loading supported formats…');
  fileInput.parentElement.after(importNote);
  const ruleLabel = node('label');
  const ruleInput = document.createElement('input');
  ruleInput.type = 'checkbox';
  ruleInput.id = 'learningRule';
  ruleLabel.append(
    ruleInput,
    document.createTextNode(' Save pasted text as a rule for future chats'),
  );
  dialog.querySelector('#learningImportForm [type="submit"]').before(ruleLabel);
  const formatDetails = node('details');
  formatDetails.append(node('summary', '', 'Supported file formats'));
  const formatText = node('p', 'learning-note');
  formatDetails.append(formatText);
  importNote.after(formatDetails);
  const indexStatus = node('p', 'learning-note');
  dialog.querySelector('.learning-intro').after(indexStatus);
  const conversationTab = node('button', '', 'Conversation memory');
  conversationTab.type = 'button';
  conversationTab.dataset.learningTab = 'conversation';
  dialog.querySelector('.learning-tabs').append(conversationTab);
  const conversationView = node('section');
  conversationView.dataset.learningView = 'conversation';
  conversationView.hidden = true;
  dialog.append(conversationView);
  conversationTab.addEventListener('click', async () => {
    conversationView.replaceChildren(
      node('p', 'learning-note', 'Loading saved conversation context…'),
    );
    try {
      const id = window.__activeWorkspaceConvId;
      if (!id) throw new Error('Start a conversation to inspect its memory.');
      const data = await api(`/api/conversations/${encodeURIComponent(id)}/memory`);
      conversationView.replaceChildren(
        node('h3', '', 'Saved task context'),
        node(
          'p',
          'learning-note',
          `${data.messageCount} messages saved · Latest attempt: ${data.latestAttempt}`,
        ),
        node('h4', '', 'Original request'),
        node('pre', 'learning-source-text', data.originalGoal),
        node('h4', '', 'Current task'),
        node('pre', 'learning-source-text', data.currentTask),
      );
      for (const attempt of data.incompleteAttempts)
        conversationView.append(node('p', 'learning-note', `Unfinished attempt: ${attempt.error}`));
      conversationView.append(
        node('h4', '', 'Persistent notes'),
        node(
          'p',
          'learning-note',
          'Say “Remember that …” to save a note across conversations. Inspect and forget these notes in Sources.',
        ),
      );
      data.userMemories.forEach((source) =>
        conversationView.append(node('p', 'learning-note', `${source.title} · ${source.id}`)),
      );
      if (!data.userMemories.length)
        conversationView.append(
          node('p', 'learning-note', 'No explicit personal notes saved yet.'),
        );
    } catch (error) {
      conversationView.replaceChildren(node('p', 'learning-note', error.message));
    }
  });
  const status = dialog.querySelector('#learningStatus');
  let sources = [];
  let searchTimer;
  async function api(url, data, method = 'POST') {
    const response = await fetch(
      url,
      data === undefined
        ? {}
        : {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          },
    );
    const result = await response.json();
    if (!response.ok || result.success === false || result.error)
      throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }
  function button(label, action) {
    const element = node('button', '', label);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }
  function selectTab(name) {
    dialog
      .querySelectorAll('[data-learning-view]')
      .forEach((view) => (view.hidden = view.dataset.learningView !== name));
    dialog
      .querySelectorAll('[data-learning-tab]')
      .forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.learningTab === name)));
  }
  function sourceCard(source) {
    const card = node('article', 'learning-source');
    card.dataset.sourceId = source.id;
    card.append(
      node('h3', '', source.title),
      node(
        'p',
        'learning-source-meta',
        `${source.chunkCount} excerpts · ${source.bytes.toLocaleString()} bytes · ${source.sourceType === 'user-rule' ? 'Saved rule' : 'Retained'} · Revision ${source.revision || 1}`,
      ),
    );
    const details = node('details');
    details.append(node('summary', '', 'View source and citations'));
    details.addEventListener('toggle', async () => {
      if (!details.open || details.dataset.loaded) return;
      try {
        const result = await api(`/api/learning/sources/${source.id}`);
        const text = node(
          'pre',
          'learning-source-text',
          result.source.chunks
            .map(
              (chunk) =>
                `[${chunk.id}] · lines ${chunk.firstLine}–${chunk.lastLine}\n${chunk.text}`,
            )
            .join('\n\n'),
        );
        details.append(text, node('p', 'learning-note', `SHA-256 ${source.digest}`));
        details.dataset.loaded = 'true';
      } catch (error) {
        status.textContent = error.message;
      }
    });
    card.append(details);
    const actions = node('div', 'learning-source-actions');
    actions.append(
      button('Use in chat', () => {
        const input = document.getElementById('workspaceInp');
        input.value = `Using the retained source "${source.title}", `;
        input.dispatchEvent(new Event('input'));
        dialog.close();
        input.focus();
      }),
      button('Check recall', () => {
        if (card.querySelector('.learning-check-form')) return;
        const form = node('form', 'learning-form learning-check-form');
        form.innerHTML =
          '<label>Recall question<input class="learning-input" name="question" required placeholder="What should Supergence find?"></label><label>Exact expected excerpt<input class="learning-input" name="expectedText" required placeholder="A passage that occurs in this source"></label><button type="submit" class="learning-primary">Run recall check</button><p class="learning-note">Checks retrieval of your excerpt, not independent truth or general mastery.</p>';
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const submit = form.querySelector('button');
          submit.disabled = true;
          try {
            const { check } = await api(
              `/api/learning/sources/${source.id}/check`,
              Object.fromEntries(new FormData(form)),
            );
            status.textContent = `${check.passed ? 'Recall check passed' : 'The expected excerpt was not retrieved'} · ${check.durationMs.toFixed(1)} ms. Retrieval only.`;
          } catch (error) {
            status.textContent = error.message;
          } finally {
            submit.disabled = false;
          }
        });
        card.append(form);
      }),
    );
    card.append(actions);
    actions.append(
      button('Edit source', async () => {
        if (card.querySelector('.learning-edit-form')) return;
        try {
          const { source: current } = await api(`/api/learning/sources/${source.id}`);
          const form = node('form', 'learning-form learning-edit-form');
          form.innerHTML =
            '<label>Title<input name="title" class="learning-input" required maxlength="180"></label><label>Retained text<textarea name="content" class="learning-input" rows="10" required></textarea></label><label><input name="rule" type="checkbox"> Apply as a saved rule in future chats</label><p class="learning-note">Edits update the retained copy. Original uploaded and workspace documents remain at their source. Export text to save a separate file.</p><button class="learning-primary" type="submit">Save edits</button>';
          form.elements.title.value = current.title;
          form.elements.content.value = current.content;
          form.elements.rule.checked = current.sourceType === 'user-rule';
          form.append(button('Cancel edit', () => form.remove()));
          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            try {
              await api(
                `/api/learning/sources/${source.id}`,
                {
                  title: form.elements.title.value,
                  content: form.elements.content.value,
                  rule: form.elements.rule.checked,
                  expectedDigest: current.digest,
                  expectedRevision: current.revision,
                },
                'PUT',
              );
              await refresh();
              status.textContent = 'Source updated. Future recall uses the edited text.';
            } catch (error) {
              status.textContent = error.message;
            } finally {
              submit.disabled = false;
            }
          });
          card.append(form);
        } catch (error) {
          status.textContent = error.message;
        }
      }),
    );
    actions.append(
      button('Export text', async () => {
        try {
          const { source: current } = await api(`/api/learning/sources/${source.id}`);
          const url = URL.createObjectURL(
            new Blob([current.content], { type: 'text/plain;charset=utf-8' }),
          );
          const link = document.createElement('a');
          link.href = url;
          link.download = `${current.title.replace(/[^\p{L}\p{N}_.-]/gu, '_')}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          status.textContent = error.message;
        }
      }),
    );
    actions.append(
      button('Forget source', async () => {
        if (!window.confirm(`Forget "${source.title}" from the learning library?`)) return;
        try {
          await api(`/api/learning/sources/${source.id}`, {}, 'DELETE');
          await refresh();
          status.textContent = 'Source forgotten.';
        } catch (error) {
          status.textContent = error.message;
        }
      }),
    );
    return card;
  }
  function renderSources() {
    const container = dialog.querySelector('#learningSources');
    container.replaceChildren();
    if (!sources.length)
      container.append(
        node('p', 'learning-note', 'No sources retained yet. Add something you want to reuse.'),
      );
    sources.forEach((source) => container.append(sourceCard(source)));
  }
  async function refresh() {
    const data = await api('/api/learning/library');
    sources = data.sources;
    if (data.capabilities) {
      fileInput.accept = data.capabilities.formats.join(',');
      formatText.textContent = data.capabilities.formats.join(', ');
      importNote.textContent = `${data.capabilities.formats.length} formats · Up to 50 files per import · 8 MiB per file · 2 MiB extracted text. Document imports retain readable text; SQLite imports retain table rows. Scanned PDFs, images and proprietary vector database files require a text/JSONL export.`;
      indexStatus.textContent = data.capabilities.index.available
        ? `${data.capabilities.index.chunks} indexed excerpts · Local SQLite vectors and keyword search. Saved sources are searched automatically in chat.`
        : `Vector storage unavailable: ${data.capabilities.index.error || 'Connecting'}. Source text remains available for search.`;
    }
    status.textContent = `${sources.length} retained sources · ${data.skills.length} installed workflows`;
    dialog.querySelector('#learningREAStatus').textContent = data.rea.available
      ? `REA ${data.rea.version} available · JavaScript trees and ASAR artifacts`
      : 'REA analyzer unavailable. Instructions remain readable.';
    renderSources();
  }
  window.LearningPanel = {
    show: async () => {
      if (!dialog.open) dialog.showModal();
      try {
        await refresh();
      } catch (error) {
        status.textContent = error.message;
      }
    },
    refresh,
    showSource: async (id) => {
      await window.LearningPanel.show();
      selectTab('library');
      dialog.querySelector('#learningSearch').value = '';
      renderSources();
      const card = [...dialog.querySelectorAll('[data-source-id]')].find(
        (item) => item.dataset.sourceId === id,
      );
      if (card) {
        card.querySelector('details').open = true;
        card.scrollIntoView({ block: 'nearest' });
      } else status.textContent = 'This source is not available in the current library.';
    },
  };
  dialog.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-learning-tab]');
    if (tab) selectTab(tab.dataset.learningTab);
  });
  dialog.querySelector('#learningSearch').addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    const query = event.target.value;
    searchTimer = setTimeout(async () => {
      if (!query.trim()) return renderSources();
      try {
        const { matches, durationMs } = await api('/api/learning/search', { query });
        const container = dialog.querySelector('#learningSources');
        container.replaceChildren();
        for (const match of matches) {
          const card = node('article', 'learning-source');
          card.append(
            node('h3', '', match.title),
            node(
              'p',
              'learning-note',
              `${match.citation} · lines ${match.firstLine}–${match.lastLine}`,
            ),
            node('pre', 'learning-source-text', match.text),
          );
          container.append(card);
        }
        status.textContent = `${matches.length} cited excerpts · ${durationMs.toFixed(1)} ms`;
      } catch (error) {
        status.textContent = error.message;
      }
    }, 180);
  });
  dialog.querySelector('#learningFile').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    status.textContent = `${files.length} files selected. Click Retain source to import.`;
    if (files.length === 1) dialog.querySelector('[name="title"]').value ||= files[0].name;
    if (files.length > 1) dialog.querySelector('[name="title"]').value ||= 'File collection';
  });
  for (const [id, endpoint] of [
    ['learningImportForm', '/api/learning/sources'],
    ['learningREAForm', '/api/learning/analyze'],
  ]) {
    dialog.querySelector(`#${id}`).addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      status.textContent =
        id === 'learningREAForm'
          ? 'REA is inspecting the selected artifact…'
          : 'Indexing and retaining source…';
      try {
        const files = id === 'learningImportForm' ? [...fileInput.files] : [];
        if (files.length) {
          if (files.length > 50) throw new Error('Choose at most 50 files per import.');
          const failures = [];
          let retained = 0;
          for (const [index, file] of files.entries()) {
            status.textContent = `Importing ${index + 1}/${files.length}: ${file.name}`;
            try {
              if (file.size > 8 * 1024 * 1024) throw new Error('File exceeds 8 MiB.');
              const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(',')[1]);
                reader.onerror = () => reject(new Error('Cannot read selected file.'));
                reader.readAsDataURL(file);
              });
              await api('/api/learning/upload', {
                name: file.name,
                base64,
                title: files.length === 1 ? form.elements.title.value : file.name,
              });
              retained++;
            } catch (error) {
              failures.push(`${file.name}: ${error.message}`);
            }
          }
          fileInput.value = '';
          await refresh();
          status.textContent = `${retained}/${files.length} files retained. ${failures.join(' ')}`;
          selectTab('library');
          return;
        }
        const data = Object.fromEntries(new FormData(form));
        if (id === 'learningImportForm' && ruleInput.checked) data.sourceType = 'user-rule';
        const result = await api(endpoint, data);
        await refresh();
        status.textContent = `${result.reused ? 'Already retained' : 'Source retained'}${Number.isFinite(result.durationMs) ? ` · ${result.durationMs.toFixed(1)} ms` : ''}. Available for future chat recall.`;
        selectTab('library');
      } catch (error) {
        status.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    });
  }
  dialog.querySelector('.learning-instructions').addEventListener('toggle', async (event) => {
    if (!event.target.open || dialog.querySelector('#learningSkillText').textContent) return;
    try {
      dialog.querySelector('#learningSkillText').textContent = (
        await api('/api/learning/skills/reverse-engineer-anything')
      ).skill.content;
    } catch (error) {
      status.textContent = error.message;
    }
  });
  const rail = node('button', 'shell-rail-button');
  rail.id = 'railLearning';
  rail.type = 'button';
  rail.setAttribute('aria-label', 'Learning library');
  rail.title = 'Learning library';
  rail.innerHTML = icon;
  rail.addEventListener('click', () => window.LearningPanel.show());
  document.querySelector('.shell-rail-main').append(rail);
  const tools = button('Learning library', () => {
    document.getElementById('composerToolsMenu').hidden = true;
    window.LearningPanel.show();
  });
  tools.prepend(node('span', '', ''));
  tools.firstChild.innerHTML = icon;
  document.getElementById('composerToolsMenu').append(tools);
  // Agent identity is sent through the existing unified chat endpoint.
  const selector = node('select', 'shell-agent-select');
  selector.id = 'workspaceAgentSelect';
  selector.setAttribute('aria-label', 'Chat agent');
  selector.append(new Option('Supergence · Auto', ''));
  document.querySelector('.shell-composer-context').replaceWith(selector);
  api('/api/agents/team')
    .then(({ agents }) => {
      agents.forEach((agent) => selector.append(new Option(agent.name, agent.id)));
      const saved = localStorage.getItem('sis-chat-agent') || '';
      selector.value = [...selector.options].some((option) => option.value === saved) ? saved : '';
      window.__workspaceAgentId = selector.value;
    })
    .catch(() => {
      selector.title = 'Agent roster unavailable. Automatic routing is available.';
    });
  selector.addEventListener('change', () => {
    window.__workspaceAgentId = selector.value;
    localStorage.setItem('sis-chat-agent', selector.value);
  });
  document.addEventListener('click', async (event) => {
    const citation = event.target.closest('[data-source-citation]');
    if (citation) {
      window.LearningPanel.showSource(citation.dataset.sourceCitation);
      return;
    }
    const trigger = event.target.closest('[data-code-action="retain"]');
    if (!trigger) return;
    const card = trigger.closest('.pro-code-card');
    trigger.disabled = true;
    try {
      await api('/api/learning/sources', {
        title: card.dataset.filename,
        content: card.querySelector('code').innerText,
        source: 'Chat code block',
        sourceType: 'code',
      });
      trigger.textContent = 'Retained';
    } catch {
      trigger.textContent = 'Retain failed';
    } finally {
      trigger.disabled = false;
    }
  });
})();
