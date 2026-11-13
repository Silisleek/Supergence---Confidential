(() => {
  const terminal = {
    completed: 'Task finished',
    blocked: 'Needs attention',
    cancelled: 'Task stopped',
    error: 'Task failed',
    interrupted: 'Task interrupted. Reopen this conversation to check for recovery.',
    unavailable: 'Saved task progress is unavailable.',
  };

  function mount(turn, ids) {
    const control = document.createElement('div');
    control.className = 'task-progress-control supergence-tasks-running';
    const label = document.createElement('span');
    label.className = 'tasks-running-status-wrap';
    label.setAttribute('role', 'status');
    const dot = document.createElement('span');
    dot.className = 'tasks-running-dot';
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'tasks-running-label';
    const timer = document.createElement('span');
    timer.className = 'tasks-running-timer';
    label.append(dot, text, timer);
    function show(message, state = '') {
      dot.className = ['tasks-running-dot', state].filter(Boolean).join(' ');
      if (text.textContent !== message) text.textContent = message;
    }
    const startedAt = Date.now();
    const formatElapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
    timer.textContent = '0.0s';
    const timerHandle = setInterval(() => {
      if (!finished) timer.textContent = formatElapsed();
    }, 200);
    show('- Tasks running: Initializing…');

    const stop = document.createElement('button');
    stop.type = 'button';
    stop.className = 'tasks-running-stop-btn';
    stop.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg><span>Stop task</span>`;

    control.append(label, stop);
    turn.append(control);
    let stopping = false;
    let finished = false;

    function finish(status = 'completed') {
      if (finished) return;
      finished = true;
      clearInterval(timerHandle);
      timer.textContent = formatElapsed();
      const dotClass = status === 'completed' ? 'done' : status === 'error' ? 'error' : 'paused';
      show(terminal[status] || terminal.unavailable, dotClass);
      if (stop === document.activeElement) {
        label.tabIndex = -1;
        label.focus();
      }
      stop.remove();
    }

    stop.addEventListener('click', async () => {
      stopping = true;
      stop.disabled = true;
      show('Stopping…', 'paused');
      try {
        const response = await fetch('/api/sis/turn-stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids),
        });
        if (!response.ok) throw new Error('Stop request failed.');
        const state = await response.json();
        if (!state.stopped) {
          if (Object.hasOwn(terminal, state.status)) finish(state.status);
          else throw new Error('Stop request was not accepted.');
        }
      } catch {
        if (finished) return;
        stopping = false;
        show('Could not stop the task. Try again.', 'error');
        stop.disabled = false;
      }
    });

    return {
      update(event) {
        if (finished || stopping || !event) return;
        const raw = String(event.tool || event.message || '').trim();
        const clean = raw.replace(/^- Tasks running:\s*/i, '').trim();
        const display = clean ? `- Tasks running: ${clean}` : '- Tasks running';
        show(display);
      },
      finish,
    };
  }

  async function reconcile(params, update, { isCurrent = () => true, resume = true } = {}) {
    const started = Date.now();
    let resumeSent = false;
    while (isCurrent() && Date.now() - started < 45 * 60000) {
      try {
        const response = await fetch(
          `/api/sis/turn-status?${new URLSearchParams({ conversationId: params.conversationId, requestId: params.requestId })}`,
          { signal: AbortSignal.timeout(15000) },
        );
        if ([401, 403].includes(response.status))
          return { taskStatus: 'error', monitoringFailed: true, error: 'Sign in to view task progress.' };
        if (!response.ok) throw new Error('Progress is temporarily unavailable.');
        const state = await response.json();
        if (!isCurrent()) return null;
        if (
          ['completed', 'blocked', 'cancelled', 'error', 'not-found'].includes(state.status) ||
          (!resume && state.status === 'interrupted')
        )
          return { ...state, success: state.status === 'completed', taskStatus: state.status };
        update(state);
        if (state.status === 'interrupted' && !resumeSent) {
          resumeSent = true;
          // The durable request ID reconciles confirmed actions; it never creates a new task.
          void fetch('/api/sis/unified-turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          }).catch(() => {});
        }
      } catch {
        update({ message: 'Reconnecting to saved task progress…' });
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!isCurrent()) return null;
    return {
      success: false,
      taskStatus: 'error',
      monitoringFailed: true,
      error:
        'Progress monitoring timed out. Check the saved conversation before starting another task.',
    };
  }

  window.SupergenceTasks = { mount, reconcile };
})();
