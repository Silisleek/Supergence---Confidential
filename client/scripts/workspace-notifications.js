(() => {
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text, action) => {
    const element = make('button', text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  };
  const paths = {
    close: 'M6 6l12 12M18 6 6 18',
    check: 'm5 12 4 4L19 6',
    reply: 'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3A7.5 7.5 0 1 1 20 11.5Z',
    arrow: 'M5 12h13m-5-5 5 5-5 5',
    chevron: 'm9 6 6 6-6 6',
    tool: 'M14 6a4 4 0 0 0-5 5l-5 5a2 2 0 0 0 3 3l5-5a4 4 0 0 0 5-5l-3 3-2-2z',
    shield: 'm12 3 7 3v5c0 4.5-2.8 7.6-7 10-4.2-2.4-7-5.5-7-10V6z M9 12l2 2 4-4',
  };
  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('sg-notification-icon');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', paths[name]);
    svg.append(path);
    return svg;
  }
  const dialog = make('dialog', '', 'shell-dialog sg-notifications');
  dialog.id = 'sgNotifications';
  dialog.setAttribute('aria-labelledby', 'sgNotificationsTitle');
  const header = make('header');
  const title = make('h2', 'Notifications');
  title.id = 'sgNotificationsTitle';
  const close = button('', () => dialog.close());
  close.className = 'sg-notification-close';
  close.setAttribute('aria-label', 'Close');
  close.title = 'Close';
  close.append(icon('close'));
  header.append(title, close);
  const pending = make('div');
  const replies = make('div');
  const status = make('p', '', 'sg-notifications-status');
  status.setAttribute('role', 'status');
  const announcement = make('p', '', 'sg-notifications-announcement');
  announcement.setAttribute('role', 'status');
  dialog.append(header, status, pending, replies);
  document.body.append(dialog, announcement);

  let tools = [];
  let actions = [];
  let signature = '';
  let request = 0;
  let recent = [];
  const badgeCounts = new WeakMap();
  function updateBadge(badge, value) {
    if (!badge || badgeCounts.get(badge) === value) return;
    const previous = badgeCounts.get(badge) || 0;
    badgeCounts.set(badge, value);
    badge.hidden = !value;
    badge.textContent = value > 99 ? '99+' : String(value);
    if (value > previous && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const owner = badge.parentElement;
      owner.classList.remove('sg-notification-arrival');
      requestAnimationFrame(() => {
        if (badgeCounts.get(badge) === value) owner.classList.add('sg-notification-arrival');
      });
    }
  }
  try {
    const stored = JSON.parse(localStorage.getItem('sg-notification-replies') || '[]');
    if (Array.isArray(stored)) recent = stored.slice(0, 20);
  } catch {}
  function count() {
    const badge = document.getElementById('sgNotificationCount');
    const trigger = document.getElementById('sgNotificationsButton');
    const total = recent.filter((item) => item.unread).length;
    const approvals = tools.length + actions.length;
    const approvalBadge = document.getElementById('sgApprovalCount');
    updateBadge(approvalBadge, approvals);
    document
      .getElementById('sgApprovalsButton')
      ?.setAttribute(
        'aria-label',
        approvals ? `Pending approvals (${approvals})` : 'Pending approvals',
      );
    updateBadge(badge, total);
    trigger?.setAttribute(
      'aria-label',
      total ? `Notifications (${total} unread)` : 'Notifications',
    );
  }
  function saveReplies() {
    try {
      localStorage.setItem('sg-notification-replies', JSON.stringify(recent));
    } catch {}
  }
  function renderReplies() {
    replies.replaceChildren();
    if (!recent.length) {
      const empty = make('p', 'No notifications yet.', 'sg-notification-empty');
      empty.prepend(icon('reply'));
      replies.append(empty);
      return;
    }
    replies.append(make('h3', 'Agent replies'));
    for (const item of recent) {
      const openReply = button('', async () => {
        dialog.close();
        if (item.chat !== window.__activeWorkspaceConvId)
          await window.loadWorkspaceConversation?.(item.chat);
        for (const turn of document.querySelectorAll('.chat-turn-item[data-request-id]')) {
          if (turn.dataset.requestId === item.id) {
            turn.scrollIntoView({ block: 'nearest' });
            break;
          }
        }
      });
      openReply.className = 'sg-notification-reply';
      openReply.setAttribute('aria-label', 'Agent responded · Open conversation');
      openReply.append(icon('reply'), make('span', 'Agent responded'), icon('arrow'));
      replies.append(openReply);
    }
  }
  async function api(path, body) {
    const response = await fetch(path, {
      signal: AbortSignal.timeout(8000),
      ...(body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : {}),
    });
    const data = await response.json();
    if (!response.ok || data.success === false)
      throw new Error(data.error || 'Request unsuccessful.');
    return data;
  }
  function review({ heading, description, detail, decide, actionLabel, symbol = 'shield' }) {
    const row = make('article', '', 'sg-notification-card');
    const subject = make('strong', heading);
    subject.prepend(icon(symbol));
    row.append(subject, make('p', description));
    const disclosure = make('details');
    const summary = make('summary', 'Review details');
    summary.prepend(icon('chevron'));
    disclosure.append(summary, make('pre', detail));
    row.append(disclosure);
    const buttons = make('div', '', 'sg-notification-actions');
    const resolve = async (allow) => {
      for (const child of buttons.children) child.disabled = true;
      row.setAttribute('aria-busy', 'true');
      try {
        const result = await decide(allow);
        if (row.contains(document.activeElement)) close.focus();
        status.replaceChildren(
          icon(allow ? 'check' : 'close'),
          document.createTextNode(
            allow && result?.inactive
              ? 'Approved for review. The earlier action did not run.'
              : allow
                ? 'Approved.'
                : 'Declined.',
          ),
        );
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const animation = row.animate(
            [
              { opacity: 1, translate: '0 0' },
              { opacity: 0, translate: allow ? '8px 0' : '-8px 0' },
            ],
            { duration: 140, easing: 'ease-out', fill: 'forwards' },
          );
          await animation.finished.catch(() => {});
        }
        row.remove();
        signature = '';
        await refresh(true);
      } catch (error) {
        status.textContent = error.message;
        for (const child of buttons.children) child.disabled = false;
        await refresh(true, true);
      } finally {
        row.removeAttribute('aria-busy');
      }
    };
    const decline = button('Decline', () => resolve(false));
    const approve = button(actionLabel, () => resolve(true));
    decline.prepend(icon('close'));
    approve.prepend(icon('check'));
    buttons.append(decline, approve);
    row.append(buttons);
    pending.append(row);
  }
  function renderPending() {
    const key = JSON.stringify([
      tools.map((item) => [item.id, item.integrity]),
      actions.map((item) => [item.id, item.inactive]),
    ]);
    if (key === signature) return;
    signature = key;
    pending.replaceChildren();
    if (!tools.length && !actions.length) {
      const empty = make('p', 'No pending approvals.', 'sg-notification-empty');
      empty.prepend(icon('check'));
      pending.append(empty);
      return;
    }
    pending.append(make('h3', 'Needs your decision'));
    for (const tool of tools) {
      const capabilities = (tool.capabilities || []).join(', ');
      review({
        heading: tool.displayName || tool.name,
        symbol: 'tool',
        description: [
          tool.description,
          capabilities && `Access requested: ${capabilities}.`,
          tool.executionConfirmed === false && 'Execution was not confirmed during verification.',
        ]
          .filter(Boolean)
          .join(' '),
        detail: tool.code || 'Source unavailable',
        actionLabel: 'Approve tool',
        decide: (allow) =>
          api(allow ? '/api/ada/approve' : '/api/ada/reject', {
            toolId: tool.id,
            integrity: tool.integrity,
          }),
      });
    }
    for (const action of actions) {
      review({
        heading: action.tool.replaceAll('_', ' '),
        description: action.inactive
          ? 'The original action is no longer running. Your decision here will not run it.'
          : `Requested by ${action.agentId || 'Supergence'}.`,
        detail: action.inactive
          ? 'Original action details are no longer available.'
          : JSON.stringify(action.args, null, 2),
        actionLabel: action.inactive ? 'Approve review' : 'Allow this turn',
        decide: (allow) => api(`/api/access/approvals/${encodeURIComponent(action.id)}`, { allow }),
      });
    }
  }
  let refreshing = false;
  async function refresh(force = false, preserveStatus = false) {
    if ((!force && refreshing) || (document.hidden && !force)) return;
    const sequence = ++request;
    refreshing = true;
    try {
      const [ada, access] = await Promise.allSettled([
        api('/api/ada/status?pending=1'),
        api('/api/access'),
      ]);
      if (sequence !== request) return;
      const before = new Set([...tools.map((item) => item.id), ...actions.map((item) => item.id)]);
      if (ada.status === 'fulfilled') tools = ada.value.pendingApproval || [];
      if (access.status === 'fulfilled') actions = access.value.pending || [];
      if ([...tools, ...actions].some((item) => !before.has(item.id))) {
        announcement.textContent = 'An agent action needs your decision. Open Pending approvals.';
        if (!dialog.open) toast('Approval needed', () => open('approvals'));
      }
      if (ada.status === 'rejected' || access.status === 'rejected') {
        if (!preserveStatus && !pending.hidden)
          status.textContent = 'Some approvals could not be loaded. The panel will retry.';
      } else if (!preserveStatus && !/^(Approved|Declined)/.test(status.textContent))
        status.textContent = '';
      renderPending();
      count();
    } finally {
      if (sequence === request) refreshing = false;
    }
  }
  function open(view = 'notifications') {
    document.querySelector('.sg-notification-toast')?.remove();
    if (!dialog.open) dialog.showModal();
    title.textContent = view === 'approvals' ? 'Pending approvals' : 'Notifications';
    pending.hidden = view !== 'approvals';
    replies.hidden = view === 'approvals';
    if (view !== 'approvals') {
      recent.forEach((item) => {
        item.unread = false;
      });
      saveReplies();
    }
    renderReplies();
    count();
    status.textContent = view === 'approvals' ? 'Checking approvals…' : '';
    void refresh(true);
  }
  function toast(text, action) {
    const notice = action ? button(text, action) : make('p', text);
    notice.className = 'sg-notification-toast';
    document.querySelector('.sg-notification-toast')?.remove();
    document.body.append(notice);
    setTimeout(() => notice.remove(), action ? 6500 : 3200);
  }
  function reply(chat, id) {
    if (!chat || !id || recent.some((item) => item.id === id)) return;
    recent.unshift({ chat, id, unread: !dialog.open || replies.hidden });
    recent = recent.slice(0, 20);
    saveReplies();
    if (dialog.open) renderReplies();
    count();
    announcement.textContent = 'Agent responded.';
    if (!dialog.open && !document.querySelector('button.sg-notification-toast'))
      toast('Agent responded');
  }
  window.SupergenceNotifications = { open, refresh: () => refresh(true), reply, count, toast };
  document.addEventListener('DOMContentLoaded', count, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh(true);
  });
  setInterval(refresh, 5000);
  void refresh();
})();
