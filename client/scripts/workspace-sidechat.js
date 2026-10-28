/* Independent, persisted agent conversations alongside the main task chat. */
(() => {
  const browser = window.SupergenceBrowser;
  if (!browser) return;
  const icon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H5l-4 3V11a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8Z"/><path d="M7 9h8M7 13h5"/></svg>';
  const make = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text != null) item.textContent = text;
    return item;
  };
  const button = (text, callback) => {
    const item = make('button', 'sidechat-button', text);
    item.type = 'button';
    item.addEventListener('click', callback);
    return item;
  };
  let selectedId = localStorage.getItem('sis-sidechat-thread') || '';
  let roster = [];
  let currentThread = null;
  let mountedContainer;
  let pollRunning = false;
  let sending = false;
  let lastSignature = '';
  const seenActivity = new Set();

  async function api(url, data, method) {
    const response = await fetch(url, {
      method: method || (data === undefined ? 'GET' : 'POST'),
      headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(180000),
    });
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error('Agent chat endpoint is unavailable. Restart the updated Supergence server.');
    const result = await response.json();
    if (!response.ok || result.success === false)
      throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }
  const endpoint = (suffix = '') => `/api/agent-conversations${suffix}`;
  const status = (text, error = false) => {
    const item = mountedContainer?.querySelector('.sidechat-status');
    if (item) {
      item.textContent = text;
      item.dataset.error = String(error);
    }
  };
  function remember(id) {
    selectedId = id;
    localStorage.setItem('sis-sidechat-thread', id);
    lastSignature = '';
  }
  function portrait(agentId) {
    if (agentId !== 'user' && window.SupergenceProfiles)
      return window.SupergenceProfiles.avatar(
        agentId,
        currentThread?.status === 'replying' && currentThread.replyingAgentId === agentId
          ? 'thinking'
          : 'idle',
      );
    const agent = roster.find((item) => item.id === agentId);
    const item = make(
      'span',
      'sidechat-portrait',
      agentId === 'user' ? 'Y' : (agent?.name || 'S').slice(0, 1),
    );
    item.setAttribute('aria-hidden', 'true');
    item.style.setProperty('--agent-color', agent?.color || 'var(--shell-accent)');
    if (agent?.mascot && typeof agent.mascot === 'string' && /^\/(?!\/)/.test(agent.mascot)) {
      const image = make('img');
      image.src = agent.mascot;
      image.alt = '';
      item.replaceChildren(image);
    }
    return item;
  }
  function renderThread(thread) {
    if (!mountedContainer?.querySelector('#workspaceSideChat') || thread.id !== selectedId) return;
    currentThread = thread;
    const signature = JSON.stringify([
      thread.updatedAt,
      thread.status,
      thread.messages.length,
      thread.streamingReply,
      thread.activity,
    ]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    const messages = mountedContainer.querySelector('.sidechat-messages');
    const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 100;
    messages.replaceChildren();
    if (!thread.messages.length)
      messages.append(
        make('p', 'sidechat-empty', 'Start a separate conversation. Your main task keeps running.'),
      );
    for (const message of thread.messages) {
      const row = make('article', 'sidechat-message');
      row.dataset.sender = message.senderId === 'user' ? 'user' : 'agent';
      const body = make('div', 'sidechat-message-main');
      const byline = make('div', 'sidechat-byline');
      byline.append(make('strong', '', message.senderName));
      const target = roster.find((agent) => agent.id === message.targetAgentId);
      if (target) byline.append(make('span', '', `to ${target.name}`));
      const time = make(
        'time',
        '',
        new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
      time.dateTime = message.createdAt;
      byline.append(time);
      const text = make('div', 'sidechat-text message-body');
      if (typeof window.formatMarkdown === 'function')
        text.innerHTML = window.formatMarkdown(message.content);
      else if (typeof formatMarkdown === 'function')
        text.innerHTML = formatMarkdown(message.content);
      else text.textContent = message.content;
      body.append(byline, text);
      row.append(portrait(message.senderId), body);
      messages.append(row);
    }
    if (thread.status === 'replying') {
      if (thread.streamingReply) {
        const partial = make('article', 'sidechat-message');
        partial.dataset.sender = 'agent';
        const text = make('div', 'sidechat-text message-body');
        if (typeof formatMarkdown === 'function')
          text.innerHTML = formatMarkdown(thread.streamingReply);
        else text.textContent = thread.streamingReply;
        partial.append(portrait(thread.replyingAgentId), text);
        messages.append(partial);
      }
      const waiting = make('div', 'sidechat-thinking');
      const agent = roster.find((item) => item.id === thread.replyingAgentId);
      waiting.append(
        portrait(thread.replyingAgentId),
        make('span', '', `${agent?.name || 'Agent'} is working`),
      );
      const dots = make('span', 'sidechat-dots');
      dots.innerHTML = '<i></i><i></i><i></i>';
      dots.setAttribute('aria-hidden', 'true');
      waiting.append(dots);
      messages.append(waiting);
    }
    for (const activity of thread.activity || []) {
      const key = `${thread.id}:${activity.id}:${activity.phase}:${activity.status}`;
      if (seenActivity.has(key)) continue;
      seenActivity.add(key);
      window.dispatchEvent(
        new CustomEvent('workspace-tool-activity', { detail: { ...activity, source: 'sidechat' } }),
      );
    }
    const target = mountedContainer.querySelector('.sidechat-recipient');
    const previous = target.value;
    target.replaceChildren();
    for (const id of thread.agentIds) {
      const agent = roster.find((item) => item.id === id);
      if (agent) target.append(new Option(agent.name, agent.id));
    }
    if ([...target.options].some((option) => option.value === previous)) target.value = previous;
    const busy = thread.status === 'replying' || sending;
    mountedContainer.querySelector('.sidechat-send').disabled = busy;
    mountedContainer.querySelector('.sidechat-delete').disabled = busy;
    status(
      thread.error || (busy ? 'Waiting for the real agent response…' : 'Saved on this device'),
      !!thread.error,
    );
    if (nearBottom) messages.scrollTop = messages.scrollHeight;
  }
  async function refreshList() {
    const { threads } = await api(endpoint());
    const select = mountedContainer?.querySelector('.sidechat-thread-select');
    if (!select) return;
    select.replaceChildren(new Option('Choose a conversation', ''));
    for (const thread of threads) select.append(new Option(thread.title, thread.id));
    if (threads.some((thread) => thread.id === selectedId)) select.value = selectedId;
    else if (selectedId) remember('');
  }
  async function refreshThread() {
    if (!selectedId || !mountedContainer?.querySelector('#workspaceSideChat')) return;
    const { thread } = await api(endpoint(`/${encodeURIComponent(selectedId)}`));
    renderThread(thread);
  }
  async function createThread() {
    const choices = [...mountedContainer.querySelector('.sidechat-agents').selectedOptions].map(
      (item) => item.value,
    );
    if (!choices.length) throw new Error('Choose at least one agent.');
    const { thread } = await api(endpoint(), { agentIds: choices });
    remember(thread.id);
    await refreshList();
    renderThread(thread);
    mountedContainer.querySelector('.sidechat-input').focus();
  }
  async function safely(action) {
    try {
      await action();
    } catch (error) {
      status(error.message, true);
    }
  }
  browser.registerSection('sidechat', async (container) => {
    mountedContainer = container;
    lastSignature = '';
    const root = make('section', 'sidechat');
    root.id = 'workspaceSideChat';
    const heading = make('div', 'sidechat-heading');
    heading.append(make('div', '', 'AGENT CONVERSATIONS'), make('h2', '', 'Another perspective.'));
    const tools = make('div', 'sidechat-toolbar');
    const threads = make('select', 'sidechat-thread-select');
    threads.setAttribute('aria-label', 'Side conversation');
    threads.addEventListener('change', () => {
      remember(threads.value);
      currentThread = null;
      safely(refreshThread);
    });
    const remove = button('Delete', () =>
      safely(async () => {
        if (!selectedId || !confirm('Delete this side conversation?')) return;
        await api(endpoint(`/${encodeURIComponent(selectedId)}`), undefined, 'DELETE');
        remember('');
        currentThread = null;
        root
          .querySelector('.sidechat-messages')
          .replaceChildren(
            make('p', 'sidechat-empty', 'Choose agents to start another conversation.'),
          );
        await refreshList();
      }),
    );
    remove.classList.add('sidechat-delete');
    tools.append(threads, remove);
    const details = make('details', 'sidechat-new');
    const summary = make('summary', '', 'New conversation · choose one or several agents');
    const agents = make('select', 'sidechat-agents');
    agents.multiple = true;
    agents.size = 4;
    agents.setAttribute('aria-label', 'Participants for new conversation');
    const create = button('Start conversation', () => safely(createThread));
    details.append(
      summary,
      agents,
      make(
        'p',
        '',
        'Use Ctrl or Command to select several. Choose who replies before sending each message.',
      ),
      create,
    );
    details.open = !selectedId;
    const messages = make('div', 'sidechat-messages');
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-label', 'Agent conversation messages');
    messages.append(make('p', 'sidechat-empty', 'Choose agents to start a separate conversation.'));
    const form = make('form', 'sidechat-compose');
    const label = make('label', 'sidechat-target-label', 'Send to');
    const recipient = make('select', 'sidechat-recipient');
    recipient.setAttribute('aria-label', 'Agent recipient');
    label.append(recipient);
    const input = make('textarea', 'sidechat-input');
    input.placeholder = 'Message this agent…';
    input.setAttribute('aria-label', 'Side chat message');
    input.rows = 3;
    input.maxLength = 16000;
    const send = button('Send message', () => form.requestSubmit());
    send.classList.add('sidechat-send');
    form.append(label, input, send);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (sending || currentThread?.status === 'replying') return;
      safely(async () => {
        const content = input.value.trim();
        if (!content) return;
        if (!selectedId) await createThread();
        sending = true;
        send.disabled = true;
        const id = selectedId;
        const draft = input.value;
        input.value = '';
        status('Sending your message…');
        try {
          const { thread } = await api(endpoint(`/${encodeURIComponent(id)}/messages`), {
            content,
            targetAgentId: recipient.value,
          });
          renderThread(thread);
          await refreshList();
        } catch (error) {
          if (!input.value) input.value = draft;
          throw error;
        } finally {
          sending = false;
          send.disabled = false;
          lastSignature = '';
          await refreshThread();
        }
      });
    });
    const feedback = make('p', 'sidechat-status', 'Loading saved conversations…');
    feedback.setAttribute('role', 'status');
    root.append(heading, tools, details, messages, form, feedback);
    container.append(root);
    const data = await api('/api/agents/team');
    roster = data.agents || [];
    for (const agent of roster)
      agents.append(new Option(`${agent.name} · ${agent.role}`, agent.id));
    if (agents.options.length) agents.options[0].selected = true;
    await refreshList();
    if (selectedId) await refreshThread();
    else status('Ready for a separate conversation');
  });
  const show = () => browser.show({ section: 'sidechat' });
  const action = button('Side chat', show);
  action.id = 'workspaceBtnSideChat';
  action.classList.add('shell-icon-btn');
  action.innerHTML = `${icon}<span>Side chat</span>`;
  action.setAttribute('aria-label', 'Open side chat with another agent');
  document.getElementById('workspaceBtnSideBrowser')?.before(action);
  // The header already carries a "Side chat" button; a second tab in the panel
  // strip duplicated the built-in "Agents" label, so only register the section.
  window.SupergenceSideChat = { show };
  setInterval(async () => {
    if (pollRunning || !mountedContainer?.querySelector('#workspaceSideChat') || document.hidden)
      return;
    pollRunning = true;
    try {
      await refreshThread();
    } catch (error) {
      status(error.message, true);
    } finally {
      pollRunning = false;
    }
  }, 1500);
})();
