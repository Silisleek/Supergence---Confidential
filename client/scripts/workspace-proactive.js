(() => {
  let state,
    lastInteraction = Date.now();
  const dialog = document.createElement('dialog');
  dialog.className = 'proactive-dialog';
  dialog.setAttribute('aria-labelledby', 'proactive-title');
  dialog.innerHTML = `<div class="proactive-heading"><h2 id="proactive-title">Suggestions for you</h2><button type="button" data-close aria-label="Close suggestions">×</button></div><p>Supergence periodically reviews your selected folders and suggests useful next steps. Tasks start only when you send a prompt.</p><form><label><input type="checkbox" name="enabled"> Proactive suggestions</label><label>Check every <select name="intervalMinutes"><option value="60">1 hour</option><option value="90">90 minutes</option><option value="120">2 hours</option></select></label><fieldset><legend>Folders to review</legend>${['workspace', 'desktop', 'documents', 'downloads'].map((key) => `<label><input type="checkbox" name="folder" value="${key}"> ${key[0].toUpperCase() + key.slice(1)}<small data-path="${key}"></small></label>`).join('')}</fieldset><label><input type="checkbox" name="activity"> Include foreground app and window title</label><label><input type="checkbox" name="desktopNotifications"> Desktop notifications</label><p class="proactive-note">Uses file names, sizes and modification dates. No file contents, screenshots or keystrokes are collected. Folder details and the foreground title are sent to your configured model for suggestions.</p><div class="proactive-actions"><button type="submit">Save settings</button><button type="button" data-check>Check now</button></div></form><p data-status role="status"></p><div data-inbox></div>`;
  document.body.append(dialog);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'proactive-open';
  button.title = 'Suggestions and proactive settings';
  button.setAttribute('aria-label', 'Suggestions and proactive settings');
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span hidden></span>';
  const anchor = document.getElementById('workspaceBtnSideBrowser');
  if (anchor) anchor.before(button);
  else document.body.append(button);
  const form = dialog.querySelector('form'),
    status = dialog.querySelector('[data-status]');
  const settings = document.createElement('details');
  settings.className = 'proactive-settings';
  const summary = document.createElement('summary');
  summary.textContent = 'Review settings';
  const checkButton = dialog.querySelector('[data-check]');
  status.before(checkButton);
  settings.append(summary, form);
  status.after(settings);
  const formatTime = (value) => (value ? new Date(value).toLocaleString() : 'Not checked yet');
  function render(data) {
    state = data;
    summary.textContent = `Review settings · ${data.settings.enabled ? 'every ' + data.settings.intervalMinutes + ' minutes' : 'paused'}`;
    for (const key of ['enabled', 'activity', 'desktopNotifications'])
      form.elements[key].checked = data.settings[key];
    form.elements.intervalMinutes.value = String(data.settings.intervalMinutes);
    form.querySelectorAll('[name=folder]').forEach((input) => {
      input.checked = data.settings.folders.includes(input.value);
      dialog.querySelector(`[data-path="${input.value}"]`).textContent =
        data.roots?.[input.value] || 'Unavailable';
    });
    const unread = data.inbox.filter((item) => !item.read).length;
    button.querySelector('span').textContent = String(unread);
    button.querySelector('span').hidden = !unread;
    status.textContent = data.running
      ? 'Reviewing current file metadata and activity…'
      : `${data.settings.enabled ? 'Next check: ' + formatTime(data.nextCheckAt) : 'Automatic checks are off'}. Last check: ${formatTime(data.lastCheckAt)}.${data.lastError ? ' ' + data.lastError : ''}`;
    const inbox = dialog.querySelector('[data-inbox]');
    inbox.replaceChildren();
    if (!data.inbox.length) {
      const empty = document.createElement('p');
      empty.textContent =
        'No suggestions yet. Only useful recommendations supported by observed files or activity appear here.';
      inbox.append(empty);
    }
    for (const item of data.inbox) {
      const article = document.createElement('article'),
        title = document.createElement('h3'),
        why = document.createElement('p'),
        evidence = document.createElement('small'),
        use = document.createElement('button');
      title.textContent = item.title;
      why.textContent = item.why;
      evidence.textContent = item.evidence
        .map((e) =>
          e.path
            ? `${e.folder}: ${e.path}`
            : `${e.application || 'Supergence'}: ${e.title || e.section || 'recent interaction'}`,
        )
        .join(' · ');
      use.type = 'button';
      use.textContent = 'Use this prompt';
      use.addEventListener('click', async () => {
        const input = document.querySelector('#workspaceInp') || document.querySelector('#inp');
        if (input) {
          input.value = item.prompt;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
        dialog.close();
        await request('/read', { id: item.id });
      });
      article.append(title, why, evidence, use);
      inbox.append(article);
    }
  }
  async function request(suffix = '', body, method = body ? 'POST' : 'GET') {
    const response = await fetch('/api/proactive-suggestions' + suffix, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Suggestions are unavailable.');
    render(data);
    return data;
  }
  button.addEventListener('click', () => {
    dialog.showModal();
    void request().catch((error) => {
      status.textContent = error.message;
    });
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await request(
        '/settings',
        {
          enabled: form.elements.enabled.checked,
          activity: form.elements.activity.checked,
          desktopNotifications: form.elements.desktopNotifications.checked,
          intervalMinutes: Number(form.elements.intervalMinutes.value),
          folders: [...form.querySelectorAll('[name=folder]:checked')].map((input) => input.value),
        },
        'PATCH',
      );
    } catch (error) {
      status.textContent = error.message;
    }
  });
  dialog.querySelector('[data-check]').addEventListener('click', async (event) => {
    event.target.disabled = true;
    status.textContent = 'Reviewing current file metadata and activity…';
    try {
      await request('/check', {});
    } catch (error) {
      status.textContent = error.message;
    } finally {
      event.target.disabled = false;
    }
  });
  document.addEventListener(
    'pointerdown',
    () => {
      lastInteraction = Date.now();
    },
    { passive: true },
  );
  document.addEventListener(
    'keydown',
    () => {
      lastInteraction = Date.now();
    },
    { passive: true },
  );
  async function heartbeat() {
    if (
      document.visibilityState === 'visible' &&
      state?.settings.enabled &&
      state.settings.activity
    )
      await fetch('/api/proactive-suggestions/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: location.pathname,
          conversationId: window.__activeWorkspaceConvId,
          interactedAt: lastInteraction,
        }),
      }).catch(() => {});
    if (!dialog.open) await request().catch(() => {});
  }
  void request().catch(() => {});
  setInterval(() => void heartbeat(), 60000);
  window.addEventListener('sis-proactive-suggestion', (e) => {
    void request().catch(() => {});
    if (
      e.detail?.desktopNotifications &&
      !e.detail?.desktopSubmitted &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      e.detail?.suggestions?.[0]
    ) {
      const first = e.detail.suggestions[0];
      try {
        new Notification(`Supergence · ${first.title}`, {
          body: first.why,
          icon: '/resources/icon.ico',
        });
      } catch (_) {}
    }
  });
})();
