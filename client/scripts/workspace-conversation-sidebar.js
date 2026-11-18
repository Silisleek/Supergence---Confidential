(() => {
  const list = document.getElementById('sidebarConvList');
  const searchButton = document.getElementById('sgHistorySearch');
  const searchBox = document.getElementById('sgHistorySearchBox');
  const search = document.getElementById('sidebarConvSearch');
  const storageKey = 'sis-sidebar-pinned-conversations';
  const pinned = new Set();
  const collapsed = new Set();
  let entries = [];
  let activeId;
  let selected;
  let menuTrigger;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) {
      saved.filter((id) => typeof id === 'string').forEach((id) => pinned.add(id));
    }
  } catch {
    // History still works when browser storage is unavailable.
  }

  function savePins() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...pinned]));
    } catch {
      // Keep the current session's pins.
    }
  }

  function setSearchOpen(open) {
    searchBox.hidden = !open;
    searchButton.setAttribute('aria-expanded', String(open));
    if (open) {
      search.focus();
    } else {
      const hadQuery = Boolean(search.value);
      search.value = '';
      if (hadQuery) render();
      searchButton.focus();
    }
  }

  searchButton.addEventListener('click', () => setSearchOpen(searchBox.hidden));
  search.addEventListener('input', () => render());
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setSearchOpen(false);
  });

  const menu = document.createElement('div');
  menu.id = 'sgHistoryRowActions';
  menu.className = 'sg-history-menu';
  menu.setAttribute('popover', 'auto');
  menu.setAttribute('aria-label', 'Conversation actions');
  menu.innerHTML = `
    <button type="button" data-action="pin"></button>
    <button type="button" data-action="rename">Rename</button>
    <button type="button" data-action="delete">Delete</button>
  `;
  const pinAction = menu.querySelector('[data-action="pin"]');
  menu.addEventListener('beforetoggle', (event) => {
    menuTrigger?.setAttribute('aria-expanded', String(event.newState === 'open'));
  });

  const renameDialog = document.createElement('dialog');
  renameDialog.className = 'shell-dialog sg-history-rename';
  renameDialog.setAttribute('aria-labelledby', 'sgHistoryRenameTitle');
  renameDialog.innerHTML = `
    <form>
      <h2 id="sgHistoryRenameTitle">Rename conversation</h2>
      <label for="sgHistoryRenameInput">Conversation name</label>
      <input id="sgHistoryRenameInput" name="title" required autofocus>
      <p role="status" hidden></p>
      <div class="sg-history-dialog-actions">
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  `;
  const renameForm = renameDialog.querySelector('form');
  const renameInput = renameForm.elements.title;
  const renameStatus = renameForm.querySelector('[role="status"]');
  const renameSave = renameForm.querySelector('[type="submit"]');
  let renaming;
  document.body.append(menu, renameDialog);

  function getTitle(conversation) {
    const { title } = conversation;
    return (typeof title === 'string' ? title : title?.title) || 'Untitled conversation';
  }

  function findRow(id) {
    return list.querySelector(`[data-conversation-id="${CSS.escape(id)}"]`);
  }

  function focusRow(id) {
    (findRow(id)?.querySelector('.shell-conv-select') || searchButton).focus();
  }

  function openMenu(conversation, trigger) {
    selected = conversation;
    menuTrigger = trigger;
    pinAction.textContent = pinned.has(conversation.id) ? 'Unpin' : 'Pin';
    const anchor = trigger.getBoundingClientRect();
    menu.showPopover({ source: trigger });
    const { offsetWidth: width, offsetHeight: height } = menu;
    const left = Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8));
    const top =
      anchor.bottom + height + 8 <= window.innerHeight
        ? anchor.bottom + 4
        : Math.max(8, anchor.top - height - 4);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    pinAction.focus();
  }

  window.addEventListener('resize', () => menu.hidePopover());
  list.addEventListener('scroll', () => menu.hidePopover(), { passive: true });

  menu.addEventListener('click', async (event) => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action || !selected) return;
    const conversation = selected;
    const { id } = conversation;
    menu.hidePopover();
    if (action === 'pin') {
      if (pinned.has(id)) {
        pinned.delete(id);
        collapsed.delete(dateGroup(conversation, recentBoundaries()));
      } else {
        pinned.add(id);
        collapsed.delete('Pinned');
      }
      savePins();
      render();
      focusRow(id);
    } else if (action === 'rename') {
      renaming = conversation;
      renameInput.value = getTitle(conversation);
      renameStatus.hidden = true;
      renameDialog.showModal();
      renameInput.select();
    } else if (await window.deleteWorkspaceConversation(id)) {
      if (pinned.delete(id)) savePins();
      searchButton.focus();
    } else {
      focusRow(id);
    }
  });

  renameForm.querySelector('[type="button"]').addEventListener('click', () => renameDialog.close());
  renameDialog.addEventListener('close', () => focusRow(renaming.id));
  renameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = renameInput.value.trim();
    if (!title || renameSave.disabled) return;
    const { id } = renaming;
    renameSave.disabled = true;
    renameStatus.hidden = true;
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error('Rename failed');
      if (id === window.__activeWorkspaceConvId) {
        const activeTitle = document.getElementById('activeWorkspaceTitleDisplay');
        activeTitle.textContent = title;
        activeTitle.title = title;
      }
      await window.loadConversationsList();
      if (renameDialog.open && renaming.id === id) renameDialog.close();
    } catch {
      renameStatus.textContent = 'Could not rename the conversation. Try again.';
      renameStatus.hidden = false;
    } finally {
      renameSave.disabled = false;
    }
  });

  function recentBoundaries() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const today = date.getTime();
    const yesterday = date.setDate(date.getDate() - 1);
    const weekAgo = date.setDate(date.getDate() - 6);
    return { today, yesterday, weekAgo };
  }

  function dateGroup(conversation, { today, yesterday, weekAgo }) {
    const time = new Date(conversation.updatedAt || conversation.createdAt || 0).getTime();
    if (time >= today) return 'Today';
    if (time >= yesterday) return 'Yesterday';
    if (time >= weekAgo) return 'Previous 7 days';
    return 'Older';
  }

  function createRow(conversation) {
    const { id } = conversation;
    const title = getTitle(conversation);
    const row = document.createElement('div');
    row.className = 'sidebar-conv-item';
    row.dataset.conversationId = id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shell-conv-select';
    button.title = title;
    const label = document.createElement('span');
    label.className = 'conv-title';
    label.textContent = title;
    button.append(label);
    button.addEventListener('click', () => void window.loadWorkspaceConversation(id));
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'sg-history-row-menu';
    more.setAttribute('aria-controls', menu.id);
    more.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-label', `Actions for ${title}`);
    more.innerHTML =
      '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>';
    more.addEventListener('click', () => openMenu(conversation, more));
    row.append(button, more);
    return row;
  }

  function setActive(id) {
    activeId = id;
    for (const row of list.querySelectorAll('.sidebar-conv-item')) {
      const current = row.dataset.conversationId === id;
      row.classList.toggle('active', current);
      const button = row.querySelector('.shell-conv-select');
      if (current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }

  function render(conversations = entries, id = activeId) {
    entries = conversations;
    const query = search.value.trim().toLowerCase();
    const bounds = recentBoundaries();
    const groups = new Map();
    for (const conversation of entries) {
      if (
        query &&
        !getTitle(conversation).toLowerCase().includes(query) &&
        !conversation.id.toLowerCase().includes(query)
      )
        continue;
      const group = pinned.has(conversation.id) ? 'Pinned' : dateGroup(conversation, bounds);
      const label = query ? 'Search results' : group;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(conversation);
    }

    menu.hidePopover();
    const scrollTop = list.scrollTop;
    const fragment = document.createDocumentFragment();
    for (const label of [
      'Pinned',
      'Today',
      'Yesterday',
      'Previous 7 days',
      'Older',
      'Search results',
    ]) {
      const conversationsInGroup = groups.get(label);
      if (!conversationsInGroup) continue;
      const group = document.createElement('details');
      group.className = 'sg-history-group';
      group.open = Boolean(query) || !collapsed.has(label);
      const heading = document.createElement('summary');
      heading.textContent = label;
      group.addEventListener('toggle', () => {
        if (query || !group.isConnected) return;
        if (group.open) collapsed.delete(label);
        else collapsed.add(label);
      });
      group.append(heading, ...conversationsInGroup.map(createRow));
      fragment.append(group);
    }
    if (!groups.size) {
      const empty = document.createElement('p');
      empty.className = 'shell-history-empty';
      empty.textContent = query ? 'No matching conversations.' : 'No saved conversations yet.';
      fragment.append(empty);
    }
    list.replaceChildren(fragment);
    list.scrollTop = scrollTop;
    setActive(id);
  }

  window.SupergenceConversationSidebar = {
    render,
    setActive,
    focusSearch: () => setSearchOpen(true),
  };
})();
