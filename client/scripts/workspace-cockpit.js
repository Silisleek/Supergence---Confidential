/* Adjacent task tools. All lists come from the same APIs used by the app. */
(() => {
  const browser = window.SupergenceBrowser;
  if (!browser) return;
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  const icon = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const glyphs = {
    browser: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    files: '<path d="M3 7h7l2 2h9v11H3V7Zm0 0V4h7l2 3"/>',
    tasks: '<path d="m3 6 2 2 4-4m3 3h9M3 14l2 2 4-4m3 3h9m-9 6h9"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M9 15v6"/>',
    learning: '<path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z"/>',
  };
  async function api(url, data) {
    const response = await fetch(
      url,
      data === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          },
    );
    const result = await response.json();
    if (!response.ok || result.success === false || result.error)
      throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }
  const button = (label, callback) => {
    const element = make('button', 'cockpit-button', label);
    element.type = 'button';
    element.addEventListener('click', callback);
    return element;
  };
  const launcher = make('aside', 'workspace-quick-launch');
  launcher.setAttribute('aria-label', 'Workspace shortcuts');
  launcher.append(make('h2', '', 'Workspace'));
  for (const [section, label] of [
    ['browser', 'Open Browser'],
    ['files', 'Open Files'],
    ['tasks', 'Open Tasks'],
    ['settings', 'Agent settings'],
    ['learning', 'Learning library'],
  ]) {
    const action = button(label, () =>
      section === 'learning' ? window.LearningPanel.show() : browser.show({ section }),
    );
    action.dataset.workspaceSection = section;
    const graphic = make('span');
    graphic.innerHTML = icon(glyphs[section]);
    action.prepend(graphic);
    launcher.append(action);
  }
  document.querySelector('.workspace-columns-viewport').append(launcher);
  const header = document.getElementById('workspaceBtnSideBrowser');
  header.removeAttribute('onclick');
  header.setAttribute('aria-label', 'Toggle workspace browser');
  header.setAttribute('aria-expanded', 'false');
  header.addEventListener('click', () => browser.toggle());
  const retainPage = button('Retain page', async (event) => {
    const target = event.currentTarget;
    target.disabled = true;
    try {
      const page = await api(`/api/browser/${encodeURIComponent(browser.agentId)}/page`);
      await api('/api/learning/sources', {
        title: page.title || page.url,
        content: `${page.title}\n${page.url}\n\n${page.text}`,
        source: page.url,
        sourceType: 'web-page',
      });
      target.textContent = 'Page retained';
    } catch (error) {
      target.textContent = 'Retain failed';
      target.title = error.message;
    } finally {
      target.disabled = false;
      setTimeout(() => {
        target.textContent = 'Retain page';
      }, 2000);
    }
  });
  retainPage.id = 'workspaceRetainPage';
  browser.mount().querySelector('.wb-footer').append(retainPage);

  browser.registerSection('files', async (container) => {
    if (window.SupergenceChatWorkspace) {
      window.SupergenceChatWorkspace.render(container);
    }
    const sharedSection = make('section', 'cockpit-shared-files');
    sharedSection.append(
      make('h2', '', 'Workspace files'),
      make(
        'p',
        'cockpit-note',
        'Open a file beside chat or retain its contents for future recall.',
      ),
    );
    const search = make('input', 'learning-input');
    search.type = 'search';
    search.placeholder = 'Search files';
    search.setAttribute('aria-label', 'Search workspace files');
    const results = make('div', 'cockpit-list');
    sharedSection.append(search, results);
    const targetParent = container.querySelector('.cw-files') || container;
    targetParent.append(sharedSection);
    let sequence = 0;
    let timer;
    async function render(query = '') {
      const request = ++sequence;
      try {
        const data = await api(`/api/workspace/search?q=${encodeURIComponent(query)}`);
        if (request !== sequence || !container.isConnected) return;
        results.replaceChildren();
        for (const file of data.results.filter((entry) => entry.type === 'file').slice(0, 60)) {
          const row = make('article', 'cockpit-item');
          row.append(make('strong', '', file.name), make('small', 'cockpit-note', file.path));
          const actions = make('div', 'cockpit-actions');
          actions.append(
            button('Open', () =>
              browser.open(`/workspace/${file.path.split('/').map(encodeURIComponent).join('/')}`),
            ),
            button('Retain file', async (event) => {
              const target = event.currentTarget;
              target.disabled = true;
              try {
                await api('/api/learning/sources', { path: file.path });
                target.textContent = 'Retained file';
              } catch (error) {
                target.textContent = 'Unavailable';
                target.title = error.message;
              } finally {
                target.disabled = false;
              }
            }),
          );
          row.append(actions);
          results.append(row);
        }
        if (!results.children.length)
          results.append(make('p', 'cockpit-note', 'No matching files.'));
      } catch (error) {
        results.textContent = error.message;
      }
    }
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => render(search.value), 160);
    });
    await render();
  });
  browser.registerSection('tasks', async (container) => {
    container.append(
      make('h2', '', 'Tasks'),
      make('p', 'cockpit-note', 'Goals and progress reported by the SIS task engine.'),
    );
    const list = make('div', 'cockpit-list');
    container.append(list);
    const render = async () => {
      const data = await api('/api/goals');
      list.replaceChildren();
      for (const goal of (data.goals || []).slice(-30).reverse()) {
        const row = make('article', 'cockpit-item');
        row.append(
          make('strong', '', goal.objective || goal.title || goal.id),
          make('p', 'cockpit-note', goal.status || 'Status unavailable'),
        );
        if (goal.result)
          row.append(
            make(
              'p',
              'cockpit-note',
              typeof goal.result === 'string' ? goal.result : JSON.stringify(goal.result),
            ),
          );
        list.append(row);
      }
      if (!list.children.length) list.append(make('p', 'cockpit-note', 'No goals recorded yet.'));
    };
    container.append(
      button('Refresh tasks', () => render().catch((error) => (list.textContent = error.message))),
    );
    await render();
  });
  browser.registerSection('settings', async (container) => {
    container.append(
      make('h2', '', 'Your SIS agents'),
      make(
        'p',
        'cockpit-note',
        'Choose a specialist for the next chat turn. Availability describes a registered agent; completed work requires recorded results.',
      ),
    );
    const { agents } = await api('/api/agents/team');
    for (const agent of agents) {
      const card = make('article', 'cockpit-item');
      card.append(
        make('strong', '', agent.name),
        make('p', 'cockpit-note', agent.role),
        make(
          'small',
          'cockpit-note',
          agent.status === 'RUNNING'
            ? 'Working'
            : agent.status === 'ERROR'
              ? 'Last request failed'
              : 'Available',
        ),
      );
      card.append(
        button('Chat with agent', () => {
          const selector = document.getElementById('workspaceAgentSelect');
          selector.value = agent.id;
          selector.dispatchEvent(new Event('change'));
          document.getElementById('workspaceInp').focus();
        }),
      );
      container.append(card);
    }
    container.append(
      button('Create an agent', () => window.openCreateAgentModal?.()),
      button('Appearance & preferences', () =>
        window.openStylesWindow
          ? window.openStylesWindow('styles')
          : document.getElementById('workspacePreferences')?.showModal(),
      ),
    );
  });
})();
