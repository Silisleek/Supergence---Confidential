(() => {
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const modes = {
    'full-access': 'Full access',
    'approve-for-me': 'Approve for me',
    'ask-before-executing': 'Ask before executing',
  };
  let snapshot;
  let busy = false;
  const dialog = make('dialog', '', 'shell-dialog access-dialog');
  dialog.id = 'workspaceAccess';
  dialog.setAttribute('aria-labelledby', 'workspaceAccessTitle');
  const header = make('div', '', 'shell-dialog-header');
  const title = make('h2', 'Access & execution');
  title.id = 'workspaceAccessTitle';
  const close = make('button', 'Close', 'access-button');
  close.type = 'button';
  close.onclick = () => dialog.close();
  header.append(title, close);
  const mode = make('select');
  mode.id = 'workspaceAccessMode';
  mode.setAttribute('aria-label', 'Agent access mode');
  for (const [value, text] of Object.entries(modes)) {
    const option = make('option', text);
    option.value = value;
    mode.append(option);
  }
  const description = make(
    'p',
    'Full access runs enabled tools. Approve for me allows reading, shared-browser navigation and routine workspace edits, and asks before terminal or unclassified actions. Ask before executing pauses actions for your decision.',
    'access-note',
  );
  const switches = make('div', '', 'access-switches');
  const inputs = {};
  for (const [key, label] of Object.entries({
    browser: 'Built-in browser',
    terminal: 'Terminal & code execution',
    files: 'Local files',
  })) {
    const row = make('label', '', 'shell-preference');
    const input = make('input');
    input.type = 'checkbox';
    input.id = `workspaceAccess-${key}`;
    input.setAttribute('role', 'switch');
    row.append(make('span', label), input);
    inputs[key] = input;
    switches.append(row);
  }
  const save = make('button', 'Save access settings', 'access-button');
  save.type = 'button';
  const status = make('p', '', 'access-note');
  status.setAttribute('role', 'status');
  dialog.append(header, description, mode, switches, save, status);
  document.body.append(dialog);
  const trigger = make('button', 'Access', 'access-trigger');
  trigger.type = 'button';
  trigger.id = 'workspaceAccessButton';
  trigger.title = 'Agent access and pending approvals';
  document.querySelector('.workspace-composer-actions')?.prepend(trigger);
  const approvals = make('section', '', 'workspace-approvals');
  approvals.id = 'workspaceApprovals';
  approvals.hidden = true;
  approvals.setAttribute('aria-label', 'Pending agent actions');
  document.querySelector('.workspace-composer-wrap')?.prepend(approvals);
  async function api(url, method = 'GET', body) {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.headers.get('content-type')?.includes('json'))
      throw new Error('Access API unavailable. Restart the Supergence backend.');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Access request failed.');
    return data;
  }
  function render(data) {
    snapshot = data;
    trigger.textContent = modes[data.settings.mode];
    trigger.dataset.mode = data.settings.mode;
    if (!dialog.open) {
      mode.value = data.settings.mode;
      for (const [key, input] of Object.entries(inputs)) input.checked = data.settings[key];
    }
    const ids = data.pending.map((entry) => entry.id).join(':');
    if (approvals.dataset.ids === ids) return;
    approvals.dataset.ids = ids;
    approvals.replaceChildren();
    approvals.hidden = !data.pending.length;
    for (const entry of data.pending) {
      const row = make('article', '', 'access-approval');
      row.append(make('strong', `${entry.agentId}: ${entry.tool.replaceAll('_', ' ')}`));
      const details = make('details');
      details.append(
        make('summary', 'Review action'),
        make('pre', JSON.stringify(entry.args, null, 2)),
      );
      row.append(details);
      for (const [allow, label] of [
        [true, 'Allow this turn'],
        [false, 'Decline'],
      ]) {
        const button = make('button', label, 'access-button');
        button.type = 'button';
        button.onclick = async () => {
          button.disabled = true;
          try {
            await api(`/api/access/approvals/${entry.id}`, 'POST', { allow });
            await refresh();
          } catch (error) {
            button.disabled = false;
            button.textContent = error.message;
          }
        };
        row.append(button);
      }
      approvals.append(row);
    }
  }
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      render(await api('/api/access'));
    } catch (error) {
      trigger.title = error.message;
    } finally {
      busy = false;
    }
  }
  async function open() {
    await refresh();
    if (snapshot) {
      mode.value = snapshot.settings.mode;
      for (const [key, input] of Object.entries(inputs)) input.checked = snapshot.settings[key];
    }
    dialog.showModal();
  }
  trigger.onclick = open;
  save.onclick = async () => {
    save.disabled = true;
    try {
      render(
        await api('/api/access', 'PATCH', {
          mode: mode.value,
          ...Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.checked])),
        }),
      );
      status.textContent = 'Saved. Applies to all agents and subsequent tool actions.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  };
  window.SupergenceAccess = {
    open,
    refresh,
    get settings() {
      return snapshot?.settings;
    },
  };
  void refresh();
  setInterval(refresh, 1800);
})();
