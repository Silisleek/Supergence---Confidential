(() => {
  function mount(turn, ids) {
    const control = document.createElement('div');
    control.className = 'task-progress-control';
    const label = document.createElement('span');
    label.setAttribute('role', 'status');
    label.textContent = 'Working';
    const stop = document.createElement('button');
    stop.type = 'button';
    stop.textContent = 'Stop task';
    control.append(label, stop);
    turn.append(control);
    stop.addEventListener('click', async () => {
      stop.disabled = true;
      label.textContent = 'Stopping after the current action…';
      try {
        const response = await fetch('/api/sis/turn-stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids),
        });
        if (!response.ok) throw new Error('Stop request failed.');
      } catch (error) {
        label.textContent = error.message;
        stop.disabled = false;
      }
    });
    return {
      update(event) {
        label.textContent = event.message || event.status || 'Working';
      },
      finish(status = 'completed') {
        label.textContent =
          {
            completed: 'Finished',
            blocked: 'Needs attention',
            cancelled: 'Stopped',
            error: 'Stopped with an error',
          }[status] || status;
        stop.remove();
      },
    };
  }
  async function reconcile(params, update) {
    const started = Date.now();
    let resumeSent = false;
    while (Date.now() - started < 45 * 60000) {
      try {
        const response = await fetch(
          `/api/sis/turn-status?${new URLSearchParams({ conversationId: params.conversationId, requestId: params.requestId })}`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) throw new Error('Progress is temporarily unavailable.');
        const state = await response.json();
        update(state);
        if (['completed', 'blocked', 'cancelled', 'error', 'not-found'].includes(state.status))
          return { ...state, success: state.status === 'completed', taskStatus: state.status };
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
    return {
      success: false,
      taskStatus: 'error',
      error:
        'Progress monitoring timed out. Check the saved conversation before starting another task.',
    };
  }
  window.SupergenceTasks = { mount, reconcile };
})();
