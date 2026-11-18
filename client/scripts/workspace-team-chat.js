function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function request(url, payload) {
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : {},
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(payload ? 180000 : 15000),
  });
  if (response.status === 404 && url.startsWith('/api/team-chat'))
    throw new Error('Restart Supergence to enable the updated Team chat.');
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Team chat is unavailable. Restart Supergence to load the update.');
  const data = await response.json();
  if (!response.ok || data.success === false) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export function mountTeamChat(root) {
  if (!root) return;
  root.innerHTML = `
    <header class="sg-team-heading"><div><h2>Team chat</h2><p>Agent collaboration in this project</p></div><button type="button" class="sg-team-refresh" aria-label="Refresh team chat" title="Refresh team chat"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5M4 17v-5h5M6 9a7 7 0 0 1 12-2l2 5M18 15a7 7 0 0 1-12 2l-2-5"/></svg></button></header>
    <div class="sg-team-status" role="status">Connecting to the project team…</div>
    <div class="sg-team-messages" role="log" aria-label="Team messages"></div>
    <form class="sg-team-compose"><label>Send to <select aria-label="Team member" required></select></label><textarea aria-label="Team message" rows="2" maxlength="16000" placeholder="Ask a teammate to work on this project…" required></textarea><button type="submit" disabled>Send</button></form>`;
  const status = root.querySelector('.sg-team-status');
  const messages = root.querySelector('.sg-team-messages');
  const select = root.querySelector('select');
  const form = root.querySelector('form');
  const input = root.querySelector('textarea');
  const submit = form.querySelector('button');
  let project = null;
  let version = 0;
  let busy = false;
  let roster = [];
  let fingerprint = '';
  let thread = null;

  function render(data) {
    thread = data;
    const next = JSON.stringify([data?.id, data?.updatedAt, data?.status, data?.streamingReply, data?.messages, data?.activity]);
    if (next === fingerprint) return;
    fingerprint = next;
    const previousScroll = messages.scrollTop;
    messages.replaceChildren();
    if (!data?.messages?.length) messages.append(element('p', 'sg-team-empty', 'No team messages yet. Ask a teammate for help, or let Supergence delegate work.'));
    for (const message of data?.messages || []) {
      const row = element('article', 'sg-team-message');
      const byline = element('div', 'sg-team-byline');
      const target = roster.find((agent) => agent.id === message.targetAgentId);
      byline.append(element('strong', '', message.senderName || 'Agent'));
      if (target) byline.append(element('span', '', `to ${target.name}`));
      const text = element('div', 'sg-team-message-text', message.content);
      row.append(byline, text);
      messages.append(row);
    }
    if (data?.status === 'replying') {
      const active = roster.find((agent) => agent.id === data.replyingAgentId);
      const current = element('article', 'sg-team-message sg-team-working');
      current.append(element('div', 'sg-team-byline', `${active?.name || 'Agent'} is working`));
      if (data.streamingReply) current.append(element('div', 'sg-team-message-text', data.streamingReply));
      messages.append(current);
    }
    if (data?.activity?.length) {
      const activity = element('details', 'sg-team-activity');
      activity.append(element('summary', '', 'Tool activity'));
      for (const item of data.activity) {
        const agent = roster.find((entry) => entry.id === item.agentId);
        const result = item.status === 'FAILED' ? 'failed' : item.phase === 'result' ? 'completed' : 'running';
        activity.append(element('div', '', `${agent?.name || 'Agent'} · ${String(item.tool || 'tool').replaceAll('_', ' ')} · ${result}`));
      }
      messages.append(activity);
    }
    messages.scrollTop = previousScroll;
    status.textContent = data?.status === 'error' ? data.error || 'The agent could not reply.' : data?.status === 'interrupted' ? data.error || 'The previous reply was interrupted.' : data?.status === 'replying' ? 'Working' : 'Project team';
    status.dataset.error = String(data?.status === 'error' || data?.status === 'interrupted');
    submit.disabled = busy || data?.status === 'replying' || !select.value;
  }

  async function refresh() {
    if (!root.isConnected || !root.closest('.sg-space-panel')?.classList.contains('active') || document.hidden) return;
    const id = window.__activeWorkspaceConvId || '';
    if (project !== id) {
      project = id;
      fingerprint = '';
      thread = null;
      messages.replaceChildren();
    }
    if (!id) { status.textContent = 'Open a chat to use its project team.'; submit.disabled = true; return; }
    const requestVersion = ++version;
    try {
      const [team, members] = await Promise.all([
        request(`/api/team-chat?conversationId=${encodeURIComponent(id)}`),
        request('/api/agents/team'),
      ]);
      if (requestVersion !== version || id !== (window.__activeWorkspaceConvId || '')) return;
      roster = Array.isArray(members.agents) ? members.agents.filter((agent) => agent.id && agent.active !== false && agent.enabled !== false && !['INACTIVE', 'OFFLINE', 'DISABLED'].includes(String(agent.status || '').toUpperCase())) : [];
      const selected = select.value;
      select.replaceChildren(...roster.map((agent) => {
        const option = element('option', '', agent.name);
        option.value = agent.id;
        return option;
      }));
      if (roster.some((agent) => agent.id === selected)) select.value = selected;
      render(team.thread);
      submit.disabled = busy || thread?.status === 'replying' || !select.value;
    } catch (error) {
      if (requestVersion !== version) return;
      status.textContent = error.message;
      status.dataset.error = 'true';
      submit.disabled = true;
    }
  }

  root.querySelector('.sg-team-refresh').addEventListener('click', () => void refresh());
  root.addEventListener('team-refresh', () => void refresh());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    const conversationId = window.__activeWorkspaceConvId || '';
    if (!content || !conversationId || !select.value || busy || thread?.status === 'replying') return;
    busy = true;
    submit.disabled = true;
    input.readOnly = true;
    status.textContent = 'Sending…';
    try {
      const result = await request('/api/team-chat/messages', { conversationId, targetAgentId: select.value, content });
      if (conversationId === (window.__activeWorkspaceConvId || '')) {
        input.value = '';
        render(result.thread);
      }
    } catch (error) {
      if (conversationId === (window.__activeWorkspaceConvId || '')) { status.textContent = error.message; status.dataset.error = 'true'; }
    } finally {
      busy = false;
      input.readOnly = false;
      submit.disabled = thread?.status === 'replying' || !select.value;
      void refresh();
    }
  });
  const timer = setInterval(() => {
    if (!root.isConnected) { clearInterval(timer); return; }
    void refresh();
  }, 2500);
  void refresh();
}
