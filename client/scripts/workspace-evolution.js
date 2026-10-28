/* Evolution Studio: concrete changes, observed evidence, and explicit user decisions. */
(() => {
  const el = (tag, text, className) => {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (className) n.className = className;
    return n;
  };
  const button = (label, action, className = 'evo-button') => {
    const b = el('button', label, className);
    b.type = 'button';
    b.addEventListener('click', () => Promise.resolve(action()).catch(showError));
    return b;
  };
  let token = '',
    state,
    currentTab = 'changes',
    selectedId,
    refreshTimer;
  const testConsents = new Map();
  const dialog = el('dialog', null, 'shell-dialog evolution-dialog');
  dialog.id = 'workspaceEvolution';
  dialog.setAttribute('aria-labelledby', 'evolutionTitle');
  dialog.innerHTML = `<div class="evo-topline"><span class="shell-eyebrow">SUPERGENCE / EVOLUTION STUDIO</span><button type="button" class="evo-close" aria-label="Close evolution studio">×</button></div>
    <div class="evo-heading"><div><h2 id="evolutionTitle">Better, by evidence.</h2><p>Turn a missing capability into a change you can inspect, verify, and keep.</p></div><span class="evo-review-pill">YOU CONTROL WHAT SHIPS</span></div>
    <nav class="evo-tabs" aria-label="Evolution sections"><button data-evo-tab="changes" aria-pressed="true">Changes</button><button data-evo-tab="research">Research & memory</button><button data-evo-tab="security">Security activity</button><button data-evo-tab="settings">System settings</button></nav>
    <p id="evolutionStatus" class="evo-status" role="status"></p><div id="evolutionContent"></div>`;
  document.body.append(dialog);
  const content = dialog.querySelector('#evolutionContent'),
    status = dialog.querySelector('#evolutionStatus');
  const showError = (error) => {
    status.textContent = error.message;
    status.dataset.error = 'true';
  };
  async function api(url = '', method = 'GET', body) {
    const response = await fetch(`/api/evolution${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-evolution-token': token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.headers.get('content-type')?.includes('json'))
      throw new Error('Evolution API unavailable. Restart the Supergence backend.');
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.error || 'Evolution request failed.');
    return result;
  }
  async function refresh() {
    state = await api();
    token = state.uiToken;
    render();
  }
  function select(tab) {
    currentTab = tab;
    status.textContent = '';
    status.dataset.error = '';
    dialog
      .querySelectorAll('[data-evo-tab]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.evoTab === tab)));
    render();
  }
  function chat(prompt) {
    const input = document.getElementById('workspaceInp');
    if (!input) throw new Error('Chat composer unavailable.');
    input.value = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog.close();
    input.focus();
  }
  function note(text) {
    return el('p', text, 'evo-note');
  }
  function section(title, description) {
    const s = el('section', null, 'evo-section');
    s.append(el('h3', title), note(description));
    return s;
  }
  function badge(text) {
    return el('span', text.replaceAll('-', ' '), `evo-badge evo-state-${text}`);
  }
  function render() {
    if (!state) return;
    content.replaceChildren();
    if (currentTab === 'settings') return settings();
    if (currentTab === 'security') return security();
    if (currentTab === 'research') return research();
    changes();
  }
  function changes() {
    const metrics = el('div', null, 'evo-metrics');
    for (const [value, label] of [
      [
        state.proposals.filter((p) => ['draft', 'failed'].includes(p.status)).length,
        'IN DEVELOPMENT',
      ],
      [state.proposals.filter((p) => p.status === 'ready').length, 'READY TO REVIEW'],
      [state.proposals.filter((p) => p.status === 'applied').length, 'APPLIED CHANGES'],
      [state.rules.length, 'APPROVED RULES'],
    ]) {
      const metric = el('div');
      metric.append(el('strong', String(value)), el('span', label));
      metrics.append(metric);
    }
    content.append(metrics);
    const layout = el('div', null, 'evo-layout'),
      list = el('section', null, 'evo-list'),
      detail = el('section', null, 'evo-detail');
    list.append(
      button(
        '＋ Develop a capability',
        () =>
          chat(
            'Inspect the existing Supergence implementation, then build a concrete, multi-file capability using propose_evolution. Include meaningful Node regression tests and a self-contained HTML preview with browser assertions for UI. Keep live app changes staged for my review. The capability I want is: ',
          ),
        'evo-button evo-primary',
      ),
    );
    if (!state.proposals.length)
      list.append(
        el('h3', 'Your next capability starts here.'),
        note(
          'Describe what you need in chat. Supergence can stage project files, app improvements, tools, architecture extensions, and operating rules.',
        ),
      );
    for (const p of state.proposals) {
      const card = button(
        '',
        async () => {
          selectedId = p.id;
          await showDetail(p.id, detail);
          list
            .querySelectorAll('[data-proposal]')
            .forEach((c) => c.classList.toggle('is-selected', c.dataset.proposal === p.id));
        },
        'evo-proposal',
      );
      card.dataset.proposal = p.id;
      card.classList.toggle('is-selected', selectedId === p.id);
      card.append(
        badge(p.status),
        el('strong', p.title),
        el('small', `${p.kind} · ${p.files.length} files · revision ${p.revision}`),
      );
      list.append(card);
    }
    const importer = el('details', null, 'evo-import');
    importer.append(el('summary', 'Import a proposal manifest'));
    const form = el('form', null, 'evo-form'),
      json = el('textarea');
    json.name = 'manifest';
    json.rows = 7;
    json.required = true;
    json.setAttribute('aria-label', 'Proposal JSON manifest');
    form.append(
      note(
        'Paste a real propose_evolution manifest with title, rationale, kind, files, tests, and browser checks.',
      ),
      json,
    );
    const submit = el('button', 'Stage proposal', 'evo-button');
    submit.type = 'submit';
    form.append(submit);
    form.onsubmit = async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        const { proposal } = await api('/proposals', 'POST', JSON.parse(json.value));
        selectedId = proposal.id;
        await refresh();
      } catch (error) {
        showError(error);
      } finally {
        submit.disabled = false;
      }
    };
    importer.append(form);
    list.append(importer);
    detail.append(
      el('span', 'REVIEW WORKSPACE', 'shell-eyebrow'),
      el('h3', 'From intention to implementation.'),
      note(
        'Choose a change to inspect its files, before and after content, test output, and browser checks. Nothing applies until you accept a verified revision.',
      ),
    );
    layout.append(list, detail);
    content.append(layout);
    if (selectedId && state.proposals.some((p) => p.id === selectedId))
      showDetail(selectedId, detail).catch(showError);
  }
  async function showDetail(id, container) {
    const { proposal: p } = await api(`/proposals/${id}`);
    if (selectedId !== id || !container.isConnected) return;
    container.replaceChildren();
    container.append(badge(p.status), el('h3', p.title), note(p.rationale));
    const pipeline = el('div', null, 'evo-pipeline');
    ['Stage', 'Verify', 'Review', 'Apply'].forEach((step, i) => {
      const n = el('span', `${i + 1}  ${step}`);
      n.classList.toggle(
        'is-complete',
        i === 0 || (i < 3 && ['ready', 'applied'].includes(p.status)) || p.status === 'applied',
      );
      pipeline.append(n);
    });
    container.append(pipeline);
    if (p.rule) {
      const rule = section(
        'Proposed operating rule',
        'Takes effect in future chat context after approval; model weights are unchanged.',
      );
      rule.append(el('pre', p.rule, 'evo-code'));
      container.append(rule);
    }
    for (const file of p.files) {
      const d = el('details', null, 'evo-file');
      d.append(
        el('summary', `${file.path} · ${new Blob([file.content]).size.toLocaleString()} bytes`),
      );
      const split = el('div', null, 'evo-diff');
      for (const [label, text] of [
        ['BEFORE', file.before ?? '(new file)'],
        ['PROPOSED', file.content],
      ]) {
        const pane = el('div');
        pane.append(el('span', label, 'shell-eyebrow'), el('pre', text, 'evo-code'));
        split.append(pane);
      }
      d.append(split);
      container.append(d);
    }
    const proof = section(
      'Verification evidence',
      `Attempt ${p.attempts} / ${state.settings.maxRepairAttempts}. Checks cover the supplied tests and assertions; passing does not guarantee correctness.`,
    );
    if (p.failure) proof.append(el('p', p.failure, 'evo-error'));
    if (!p.evidence.length) proof.append(note('No verification has run for this revision.'));
    for (const item of p.evidence) {
      const d = el('details', null, 'evo-evidence');
      d.append(
        el(
          'summary',
          `${item.passed ? '✓' : '×'} ${item.kind} · ${new Date(item.at).toLocaleTimeString()}`,
        ),
        el('pre', item.detail, 'evo-code'),
      );
      proof.append(d);
    }
    if (p.browser)
      proof.append(
        note(`Browser preview: ${p.browser.entry} · ${p.browser.checks.length} assertions`),
      );
    if (p.evidence.some((item) => item.kind === 'browser' && item.passed)) {
      const link = el('a', 'Open verified browser screenshot', 'evo-proof-link');
      link.href = `/api/evolution/proposals/${p.id}/proof`;
      link.target = '_blank';
      link.rel = 'noopener';
      proof.append(link);
    }
    container.append(proof);
    const actions = el('div', null, 'evo-actions');
    const run = async (action) => {
      status.textContent =
        action === 'verify'
          ? 'Running checks. Browser and project tests may take a minute…'
          : 'Saving your decision…';
      status.dataset.error = '';
      actions.querySelectorAll('button').forEach((b) => (b.disabled = true));
      try {
        await api(`/proposals/${id}/${action}`, 'POST', {
          executeTests: consent?.checked === true,
        });
        await refresh();
        status.textContent =
          action === 'apply'
            ? 'Change applied. Reload to load client changes; server extensions require integration and restart.'
            : action === 'rollback'
              ? 'Previous files restored. Reload the app to use them.'
              : 'Review updated evidence below.';
      } catch (error) {
        showError(error);
        actions.querySelectorAll('button').forEach((b) => (b.disabled = false));
      }
    };
    let consent;
    if (['draft', 'failed', 'ready'].includes(p.status)) {
      if (p.tests.length) {
        const label = el('label', null, 'evo-consent');
        consent = el('input');
        consent.type = 'checkbox';
        consent.id = 'evolutionTestConsent';
        const consentKey = `${p.id}:${p.revision}`;
        consent.checked = testConsents.get(consentKey) === true;
        consent.addEventListener('change', () => testConsents.set(consentKey, consent.checked));
        label.append(
          consent,
          document.createTextNode(
            'I reviewed these files and allow their tests to run on this computer. This is not an OS sandbox.',
          ),
        );
        container.append(label);
      }
      actions.append(button('Verify revision', () => run('verify')));
      actions.append(
        button('Continue building in chat', () =>
          chat(
            `Inspect evolution proposal ${id}. Fix its actual failed checks, preserve the requested behavior, then use revise_evolution with complete replacement files and meaningful tests. Keep changes staged for my review.`,
          ),
        ),
      );
      actions.append(button('Reject', () => run('reject')));
    }
    if (p.status === 'ready')
      actions.append(
        button('Accept & apply revision', () => run('apply'), 'evo-button evo-primary'),
      );
    if (p.status === 'applied') {
      if (p.installedTool)
        container.append(
          note(
            p.runtimeStatus === 'quarantined'
              ? `Tool quarantined: ${p.runtimeError}`
              : `Live tool installed: ${p.installedTool}`,
          ),
        );
      if (p.files.some((file) => file.path.startsWith('client/')))
        actions.append(
          button('Reload updated app', () => location.reload(), 'evo-button evo-primary'),
        );
      actions.append(button('Roll back change', () => run('rollback')));
    }
    if (['draft', 'failed', 'rejected', 'rolled-back'].includes(p.status))
      actions.append(button('Archive', () => run('archive')));
    container.append(actions);
  }
  function research() {
    const s = section(
      'Research without losing the conversation.',
      'Queue a topic, keep talking, and inspect the actual result when it finishes. Reported sources are retained for cited recall; retention is not independent verification.',
    );
    const form = el('form', null, 'evo-inline-form'),
      input = el('input');
    input.name = 'topic';
    input.required = true;
    input.maxLength = 1000;
    input.placeholder = 'A question worth investigating';
    input.setAttribute('aria-label', 'Research topic');
    const submit = el('button', 'Start research', 'evo-button evo-primary');
    submit.type = 'submit';
    submit.disabled = !state.settings.research;
    form.append(input, submit);
    form.onsubmit = async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        await api('/research', 'POST', { topic: input.value });
        await refresh();
      } catch (error) {
        showError(error);
        submit.disabled = false;
      }
    };
    s.append(form);
    if (!state.settings.research)
      s.append(note('Enable background research in System settings to start.'));
    for (const job of state.jobs) {
      const item = el('details', null, 'evo-file');
      item.append(
        el('summary', `${job.status.toUpperCase()} · ${job.topic}`),
        el(
          'pre',
          job.error ||
            JSON.stringify(job.result || { status: job.status, createdAt: job.createdAt }, null, 2),
          'evo-code',
        ),
      );
      s.append(item);
    }
    s.append(
      button('Refresh research', refresh),
      button('Open retained knowledge', () => {
        dialog.close();
        window.LearningPanel?.show();
      }),
    );
    content.append(s);
    const rules = section(
      'Rules you have accepted',
      'Approved operating guidance is added to future chat context. You can roll back its originating change.',
    );
    if (!state.rules.length)
      rules.append(note('No operating rules accepted through Evolution Studio yet.'));
    state.rules.forEach((rule) => rules.append(note(rule.text)));
    content.append(rules);
  }
  function security() {
    const s = section('A visible record of agent actions.', state.monitor.scope);
    s.append(
      note(
        'High-risk patterns pause routed actions for review even in Full access. Use Access settings to control files, browser, and terminal permissions.',
      ),
    );
    for (const event of state.monitor.events) {
      const row = el('article', null, 'evo-event');
      row.append(
        badge(event.risk),
        el('strong', event.tool),
        el('span', event.decision),
        el('time', new Date(event.at).toLocaleString()),
      );
      if (event.findings.length) row.append(note(event.findings.join(' · ')));
      s.append(row);
    }
    s.append(button('Refresh activity', refresh));
    content.append(s);
    const requests = section(
      'Connector actions awaiting your decision',
      'Review exact external app actions and arguments. Approval may send messages or change account data. Uncertain results are never retried automatically.',
    );
    for (const request of state.connectors) {
      const card = el('article', null, 'evo-section');
      card.append(
        el('h4', request.tool),
        badge(request.status),
        el('pre', JSON.stringify(request.arguments, null, 2), 'evo-code'),
      );
      if (request.status === 'pending')
        for (const allow of [false, true])
          card.append(
            button(allow ? 'Approve external action' : 'Decline', async () => {
              await api(`/composio/${request.id}/decision`, 'POST', { allow });
              await refresh();
            }),
          );
      if (request.error) card.append(note(request.error));
      if (request.result) {
        const d = el('details');
        d.append(
          el('summary', 'Execution result'),
          el('pre', JSON.stringify(request.result, null, 2), 'evo-code'),
        );
        card.append(d);
      }
      requests.append(card);
    }
    if (!state.connectors.length) requests.append(note('No connector actions requested.'));
    content.append(requests);
  }
  function settings() {
    const form = el('form', null, 'evo-form');
    form.id = 'evolutionSettingsForm';
    const behavior = section(
      'How Supergence works',
      'Set initiative, task adaptation, and the maximum number of verification attempts per proposal.',
    );
    const inputs = {};
    for (const [key, label, help] of [
      [
        'proactive',
        'Notice missing capabilities',
        'Create reviewable ideas from capability gaps in your messages.',
      ],
      [
        'research',
        'Allow background research',
        'Explicit research jobs may use your configured provider and internet access.',
      ],
      [
        'adaptiveRole',
        'Adapt to the task',
        'Switch working methods between engineering, research, design, and collaboration.',
      ],
    ]) {
      const row = el('label', null, 'shell-preference');
      const copy = el('span');
      copy.append(el('strong', label), el('small', help));
      const input = el('input');
      input.type = 'checkbox';
      input.name = key;
      input.checked = state.settings[key];
      inputs[key] = input;
      row.append(copy, input);
      behavior.append(row);
    }
    const field = (parent, name, label, value = '', type = 'text') => {
      const row = el('label', label);
      const input = el('input');
      input.name = name;
      input.type = type;
      input.value = value;
      if (type === 'password') {
        input.autocomplete = 'new-password';
        input.placeholder = 'Leave empty to keep stored key';
      }
      row.append(input);
      parent.append(row);
      inputs[name] = input;
      return input;
    };
    const attempts = field(
      behavior,
      'maxRepairAttempts',
      'Verification attempt limit',
      state.settings.maxRepairAttempts,
      'number',
    );
    attempts.min = 1;
    attempts.max = 5;
    const steps = field(
      behavior,
      'maxToolSteps',
      'Tool steps per chat turn',
      state.settings.maxToolSteps,
      'number',
    );
    steps.min = 4;
    steps.max = 64;
    const tokens = field(
      behavior,
      'maxOutputTokens',
      'Output token budget per agent step',
      state.settings.maxOutputTokens,
      'number',
    );
    tokens.min = 1024;
    tokens.max = 65536;
    behavior.append(
      note(
        'Larger budgets support longer projects and may increase provider cost. The selected model must support the configured output budget.',
      ),
    );
    form.append(behavior);
    const provider = section(
      'Model provider & endpoint',
      'Server-side default for chat and agent calls. Per-conversation provider overrides take precedence. Keys are encrypted locally; the decryption key is stored on this computer.',
    );
    const toggle = el('label', null, 'evo-consent'),
      enabled = el('input');
    enabled.type = 'checkbox';
    enabled.name = 'providerEnabled';
    enabled.checked = state.settings.provider.enabled;
    toggle.append(enabled, document.createTextNode('Use this provider by default'));
    provider.append(toggle);
    inputs.providerEnabled = enabled;
    field(
      provider,
      'baseURL',
      'OpenAI-compatible base URL',
      state.settings.provider.baseURL,
      'url',
    );
    field(provider, 'model', 'Model ID', state.settings.provider.model);
    field(provider, 'providerKey', 'API key', '', 'password');
    provider.append(
      note(state.settings.provider.hasKey ? 'Provider key stored.' : 'No provider key stored.'),
      button('Test saved provider', async () => {
        const result = await api('/provider/test', 'POST', {});
        status.textContent = `Models endpoint responded in ${result.durationMs.toFixed(0)} ms. ${result.limitation}`;
      }),
      button('Remove stored provider key', async () => {
        await api('/settings', 'PATCH', { provider: { enabled: false, apiKey: '' } });
        await refresh();
        status.textContent = 'Provider override disabled and stored key removed.';
      }),
    );
    form.append(provider);
    const composio = section(
      'Composio connectors',
      'Connect an existing Composio project and authorized app accounts. Toolkit availability comes from your real session. Every external action requires review.',
    );
    field(composio, 'composioKey', 'Composio project API key', '', 'password');
    field(composio, 'userId', 'Composio user ID', state.settings.composio.userId);
    field(
      composio,
      'sessionId',
      'Existing session ID (or create one below)',
      state.settings.composio.sessionId,
    );
    field(
      composio,
      'toolkits',
      'Allowed toolkit slugs, separated by commas',
      state.settings.composio.toolkits.join(', '),
    );
    composio.append(
      note(
        state.settings.composio.hasKey ? 'Composio key available.' : 'Composio is not configured.',
      ),
      button('Create session from saved settings', async () => {
        await api('/composio/connect', 'POST', {});
        await refresh();
        status.textContent =
          'Composio session created. Accounts must already be authorized in your Composio project.';
      }),
      button('Inspect session tools', async () => {
        const { catalog } = await api('/composio/tools');
        const pre = el('pre', JSON.stringify(catalog, null, 2), 'evo-code');
        composio.append(pre);
      }),
      button('Remove stored Composio key', async () => {
        await api('/settings', 'PATCH', { composio: { apiKey: '', sessionId: '' } });
        await refresh();
        status.textContent =
          'Stored Composio key and session cleared. An environment key, if configured, remains available.';
      }),
    );
    form.append(composio);
    const save = el('button', 'Save system settings', 'evo-button evo-primary');
    save.type = 'submit';
    form.append(save);
    form.onsubmit = async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        const patch = {
          proactive: inputs.proactive.checked,
          research: inputs.research.checked,
          adaptiveRole: inputs.adaptiveRole.checked,
          maxRepairAttempts: Number(inputs.maxRepairAttempts.value),
          maxToolSteps: Number(inputs.maxToolSteps.value),
          maxOutputTokens: Number(inputs.maxOutputTokens.value),
          provider: {
            enabled: enabled.checked,
            baseURL: inputs.baseURL.value,
            model: inputs.model.value,
          },
          composio: {
            userId: inputs.userId.value,
            sessionId: inputs.sessionId.value,
            toolkits: inputs.toolkits.value
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          },
        };
        if (inputs.providerKey.value) patch.provider.apiKey = inputs.providerKey.value;
        if (inputs.composioKey.value) patch.composio.apiKey = inputs.composioKey.value;
        await api('/settings', 'PATCH', patch);
        await refresh();
        status.textContent =
          'System settings saved. Future calls use the selected default provider.';
      } catch (error) {
        showError(error);
      } finally {
        save.disabled = false;
      }
    };
    content.append(form);
  }
  dialog.querySelector('.evo-close').onclick = () => dialog.close();
  dialog
    .querySelectorAll('[data-evo-tab]')
    .forEach((b) => (b.onclick = () => select(b.dataset.evoTab)));
  const show = async (tab = 'changes') => {
    currentTab = tab;
    if (!dialog.open) dialog.showModal();
    await refresh();
    select(tab);
  };
  window.EvolutionStudio = { show, refresh };
  const rail = button('', () => show(), 'shell-rail-button');
  rail.id = 'railEvolution';
  rail.title = 'Evolution Studio';
  rail.setAttribute('aria-label', 'Evolution Studio');
  rail.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z"/><path d="m19 3 2 2m-2 14 2 2"/></svg>';
  const mount = () => {
    const nav = document.querySelector('.shell-rail-main');
    if (nav && !rail.isConnected) nav.append(rail);
  };
  mount();
  const observer = new MutationObserver(() => {
    mount();
    if (rail.isConnected) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const preference = button('Evolution & system settings →', () => {
    document.getElementById('workspacePreferences')?.close();
    return show('settings');
  });
  document.getElementById('workspacePreferences')?.append(preference);
  const alert = button('Security review', () => show('security'), 'evo-security-alert');
  alert.hidden = true;
  document.querySelector('.workspace-composer-wrap')?.prepend(alert);
  let securitySnapshot = 0;
  const refreshSecurityReview = async () => {
    const revision = ++securitySnapshot;
    const response = await fetch('/api/access');
    if (!response.ok) return;
    const access = await response.json();
    if (revision !== securitySnapshot) return;
    const pending = (access.pending || []).filter((item) => item.risk === 'high');
    alert.hidden = pending.length === 0;
    if (pending.length)
      alert.textContent = `Security review · ${pending[0].findings?.[0] || pending[0].tool}`;
  };
  refreshSecurityReview().catch(() => {});
  let stream;
  const connectEvents = () => {
    stream = new EventSource('/api/evolution/events');
    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.risk === 'high') refreshSecurityReview().catch(() => {});
        if (dialog.open && currentTab !== 'settings') {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => refresh().catch(showError), 1000);
        }
      } catch {}
    };
  };
  connectEvents();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stream.close();
    else connectEvents();
  });
})();
