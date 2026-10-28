/* Names and mascot preferences decorate real agents without creating simulated activity. */
(() => {
  const agents = new Map();
  let mascots = [];
  let ready;
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  async function request(url, patch) {
    const response = await fetch(
      url,
      patch === undefined
        ? {}
        : {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          },
    );
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error(
        'Agent profile service is unavailable. Restart the Supergence server to load this feature.',
      );
    const data = await response.json();
    if (!response.ok || data.success === false)
      throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }
  function avatar(id, state = 'idle') {
    const agent = agents.get(id);
    const element = make('span', 'sg-mascot');
    element.dataset.mascotState = state;
    element.setAttribute('aria-hidden', 'true');
    const image = make('img');
    image.alt = '';
    image.src = agent?.mascotSrc || '/images/supergence-logo.png';
    image.draggable = false;
    element.append(image);
    if (agent?.mascotColor) element.style.setProperty('--mascot-color', agent.mascotColor);
    return element;
  }
  function decorateTurn(turn, id) {
    if (!turn) return;
    if (id) turn.dataset.agentId = id;
    const agent = agents.get(turn.dataset.agentId);
    const name = turn.querySelector('.resp-agent-name');
    if (name && agent && name.textContent !== agent.name) name.textContent = agent.name;
    const header = name?.parentElement;
    if (!header) return;
    let image = header.querySelector('.sg-mascot');
    const src = agent?.mascotSrc || '/images/supergence-logo.png';
    if (image?.querySelector('img')?.getAttribute('src') !== src) {
      image?.remove();
      image = null;
    }
    if (!image) {
      image = avatar(turn.dataset.agentId);
      header.prepend(image);
    }
    const pending = !!turn.querySelector(
      '.workspace-thinking, .ws-thinking, .chatgpt-thinking-dots, .thought-stream-header.active, .streaming-cursor',
    );
    const state = turn.dataset.agentState || (pending ? 'thinking' : 'idle');
    if (image.dataset.mascotState !== state) image.dataset.mascotState = state;
  }
  function refreshVisible() {
    const selector = document.getElementById('workspaceAgentSelect');
    if (selector)
      for (const option of selector.options) {
        const agent = agents.get(option.value);
        if (agent && option.text !== agent.name) option.text = agent.name;
      }
    document.querySelectorAll('[data-agent-id]').forEach((element) => {
      if (element.querySelector('.resp-agent-name')) decorateTurn(element);
    });
    document.querySelectorAll('.resp-agent-name').forEach((name) => {
      const turn =
        name.closest('.chat-turn-item, .workspace-turn') || name.parentElement.parentElement;
      if (!turn.dataset.agentId) {
        const match = [...agents.values()].find((agent) => agent.name === name.textContent);
        if (match) turn.dataset.agentId = match.id;
      }
      decorateTurn(turn);
    });
    document.querySelectorAll('.side-agent-column[id^="col-"]').forEach((column) => {
      const agent = agents.get(column.id.slice(4));
      if (!agent) return;
      const name = column.querySelector('.side-agent-name');
      if (name && name.textContent !== agent.name) name.textContent = agent.name;
      const face = column.querySelector('.side-agent-mini-face');
      if (face && face.querySelector('img')?.getAttribute('src') !== agent.mascotSrc)
        face.replaceChildren(avatar(agent.id));
    });
  }
  function publish(type) {
    refreshVisible();
    window.dispatchEvent(
      new CustomEvent(`SupergenceProfiles:${type}`, {
        detail: { agents: [...agents.values()], mascots },
      }),
    );
  }
  async function refresh() {
    const data = await request('/api/agent-profiles');
    agents.clear();
    data.agents.forEach((agent) => agents.set(agent.id, agent));
    mascots = data.mascots;
    publish('ready');
    return [...agents.values()];
  }
  async function update(id, patch) {
    const data = await request(`/api/agent-profiles/${encodeURIComponent(id)}`, patch);
    agents.set(id, data.agent);
    publish('change');
    return data.agent;
  }
  async function mountEditor(container) {
    await ready;
    container.replaceChildren();
    container.append(
      make('h2', '', 'Make your team yours'),
      make(
        'p',
        'sg-profile-note',
        'Name each specialist and choose a mascot. Their expertise, tools, and conversation history stay attached to the same agent.',
      ),
    );
    for (const agent of agents.values()) {
      const card = make('form', 'sg-profile-card');
      card.dataset.profileAgent = agent.id;
      const heading = make('div', 'sg-profile-heading');
      const face = avatar(agent.id);
      heading.append(face, make('strong', '', agent.specialtyName || agent.role));
      const nameLabel = make('label', '', 'Agent name');
      const name = make('input', 'learning-input');
      name.name = 'name';
      name.value = agent.name;
      name.maxLength = 64;
      name.required = true;
      nameLabel.append(name);
      const mascotLabel = make('label', '', 'Mascot');
      const select = make('select', 'learning-input');
      select.name = 'mascot';
      for (const mascot of mascots) select.append(new Option(mascot.name, mascot.id));
      select.value = agent.mascot;
      mascotLabel.append(select);
      select.addEventListener('change', () => {
        face.querySelector('img').src = mascots.find((item) => item.id === select.value).src;
      });
      const actions = make('div', 'sg-profile-actions');
      const save = make('button', 'cockpit-button', 'Save profile');
      save.type = 'submit';
      const status = make('span', 'sg-profile-note');
      status.setAttribute('role', 'status');
      actions.append(save, status);
      card.append(heading, nameLabel, mascotLabel, actions);
      card.addEventListener('submit', async (event) => {
        event.preventDefault();
        save.disabled = true;
        status.textContent = 'Saving…';
        face.dataset.mascotState = 'thinking';
        try {
          await update(agent.id, { name: name.value, mascot: select.value });
          status.textContent = 'Profile saved';
        } catch (error) {
          status.textContent = error.message;
        } finally {
          save.disabled = false;
          face.dataset.mascotState = 'idle';
        }
      });
      container.append(card);
    }
  }
  const dialog = make('dialog', 'shell-dialog sg-profiles-dialog');
  dialog.id = 'workspaceAgentProfiles';
  dialog.setAttribute('aria-label', 'Agent profiles');
  const close = make('button', 'shell-icon-button', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close agent profiles');
  close.addEventListener('click', () => dialog.close());
  const editor = make('div', 'sg-profiles-editor');
  dialog.append(close, editor);
  document.body.append(dialog);
  async function show() {
    dialog.showModal();
    editor.textContent = 'Loading your team…';
    try {
      await mountEditor(editor);
    } catch (error) {
      editor.textContent = error.message;
    }
  }
  window.SupergenceProfiles = {
    avatar,
    decorateTurn,
    refresh,
    update,
    mountEditor,
    show,
    get: (id) => agents.get(id),
    list: () => [...agents.values()],
  };
  const button = make('button', 'cockpit-button sg-profiles-trigger', 'Agent names & mascots');
  button.type = 'button';
  button.id = 'workspaceEditAgentProfiles';
  button.addEventListener('click', show);
  const preferences = document.getElementById('workspacePreferences');
  if (preferences) preferences.append(button);
  let queued = false;
  new MutationObserver((records) => {
    if (
      queued ||
      records.every((record) => record.target.closest?.('.sg-profile-card, .sg-mascot'))
    )
      return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refreshVisible();
    });
  }).observe(document.querySelector('.workspace-columns-viewport') || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-agent-id', 'data-agent-state'],
  });
  ready = refresh().catch((error) => {
    button.title = error.message;
    throw error;
  });
  ready.catch(() => {});
})();
