// ══════════════════════════════════════════════════════════════════
// CONTINUOUS COGNITION & PERSISTENT GOAL DOCK CONTROLLER (Stage 6)
// Wires the dock to live backend state: /api/continuous/status,
// /api/continuous/pacing, /api/goals, /api/ada/status, plus real-time
// `continuous-engine-tick` / `goal-*` / `ada-tool-*` WS broadcasts.
// ══════════════════════════════════════════════════════════════════
(function () {
  const $ = (id) => document.getElementById(id);

  function fmtCadence(ms) {
    if (!ms) return '';
    const secs = Math.round(ms / 1000);
    return secs < 60 ? `(${secs}s)` : `(${Math.round(secs / 60)}m)`;
  }

  function updateContinuousHUD(state) {
    if (!state) return;
    document.querySelectorAll('#cog-tick-count').forEach((tickEl) => {
      tickEl.textContent = `#${state.tickCount || 0}`;
    });

    const pref = state.reasoning?.userPreference || 'auto';
    const ms = state.reasoning?.cadenceMs;
    let label;
    let borderColor, color, background;
    if (pref === 'paused') {
      label = 'Paused (1s local tick only)';
      borderColor = '#EF4444';
      color = '#EF4444';
      background = 'rgba(239,68,68,0.15)';
    } else {
      label = `Cadence: ${pref} ${fmtCadence(ms)}`.trim();
      borderColor = 'rgba(56,189,248,0.4)';
      color = '#38BDF8';
      background = 'rgba(56,189,248,0.15)';
    }
    document.querySelectorAll('#cog-cadence-badge').forEach((cadenceEl) => {
      cadenceEl.style.borderColor = borderColor;
      cadenceEl.style.color = color;
      cadenceEl.style.background = background;
      cadenceEl.textContent = label;
    });

    const currentPref = state.reasoning?.userPreference || 'auto';
    document.querySelectorAll('.cog-pace-btn').forEach((b) => {
      const p = b.getAttribute('data-pace');
      if (p === currentPref) {
        b.style.background = p === 'paused' ? 'rgba(239,68,68,0.25)' : 'rgba(56,189,248,0.25)';
        b.style.borderColor = p === 'paused' ? '#EF4444' : '#38BDF8';
        b.style.color = p === 'paused' ? '#EF4444' : '#38BDF8';
      } else {
        b.style.background = 'rgba(255,255,255,0.06)';
        b.style.borderColor = 'rgba(255,255,255,0.12)';
        b.style.color = '#F8FAFC';
      }
    });

    const qCount = state.queue?.queuedCount || 0;
    document.querySelectorAll('#cog-queue-badge').forEach((qEl) => {
      qEl.textContent = `Queue: ${qCount}`;
      qEl.style.display = qCount > 0 ? 'inline-block' : 'none';
    });

    if (state.activeGoal || state.queue) renderGoalHUD(state.activeGoal, state.queue);
  }

  function renderGoalHUD(goal, queueStatus) {
    document.querySelectorAll('#cog-goal-title').forEach((titleEl) => {
      titleEl.textContent = goal ? goal.objective || 'Untitled goal' : 'No active goal set';
    });
    document.querySelectorAll('#cog-goal-step-badge').forEach((badgeEl) => {
      if (!goal) {
        badgeEl.style.display = 'none';
        badgeEl.textContent = '';
      } else {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = `${goal.stepsComplete ?? 0}/${goal.stepsTotal ?? 0} steps`;
      }
    });
    document.querySelectorAll('#cog-goal-progress-wrap').forEach((wrapEl) => {
      wrapEl.style.display = goal ? 'block' : 'none';
    });
    document.querySelectorAll('#cog-goal-progress-bar').forEach((barEl) => {
      if (goal) {
        barEl.style.width = `${Math.round((goal.progress || 0) * 100)}%`;
      }
    });

    document.querySelectorAll('#cog-perfection-badge').forEach((perfEl) => {
      if (goal && goal.auditPasses > 0) {
        perfEl.style.display = 'inline-block';
        if (goal.perfectionScore === 100 || goal.verified) {
          perfEl.style.background = 'rgba(16,185,129,0.15)';
          perfEl.style.borderColor = '#10B981';
          perfEl.style.color = '#10B981';
          perfEl.textContent = `✦ Audit complete (Pass #${goal.auditPasses})`;
        } else {
          perfEl.style.background = 'rgba(234,179,8,0.15)';
          perfEl.style.borderColor = '#EAB308';
          perfEl.style.color = '#FACC15';
          perfEl.textContent = `✦ Audit Pass #${goal.auditPasses} (${goal.perfectionScore}%)`;
        }
      } else if (!goal) {
        perfEl.style.display = 'none';
      }
    });

    if (queueStatus) {
      const count = queueStatus.queuedCount ?? (queueStatus.queued?.length || 0);
      document.querySelectorAll('#cog-queue-badge').forEach((qEl) => {
        qEl.textContent = `Queue: ${count}`;
        qEl.style.display = count > 0 ? 'inline-block' : 'none';
      });
    }
  }

  async function refreshGoal() {
    try {
      const res = await fetch('/api/goals').then((r) => r.json());
      renderGoalHUD(res && res.active, res && res.queue);
    } catch (_) {}
  }

  function updateAdaBadge(status) {
    if (!status) return;
    const installed = Array.isArray(status.installedTools) ? status.installedTools.length : 0;
    const pending = Array.isArray(status.pendingApproval) ? status.pendingApproval.length : 0;
    document.querySelectorAll('#cog-ada-badge').forEach((el) => {
      el.textContent = `Ada-SI: ${installed} installed · ${pending} pending`;
    });
  }

  async function refreshAda() {
    try {
      const status = await fetch('/api/ada/status').then((r) => r.json());
      updateAdaBadge(status);
    } catch (_) {}
  }

  async function setPacing(preference) {
    try {
      const res = await fetch('/api/continuous/pacing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference }),
      }).then((r) => r.json());
      if (res && res.success) updateContinuousHUD(res.state);
    } catch (err) {
      console.warn('[ContinuousDock] Pacing error:', err.message);
    }
  }

  async function setGoal() {
    const objective = prompt('Enter a persistent goal or objective for Supergence:');
    if (!objective || !objective.trim()) return;
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: objective.trim(), origin: 'user' }),
      }).then((r) => r.json());
      if (res && res.success) await refreshGoal();
    } catch (err) {
      alert('Error setting goal: ' + err.message);
    }
  }

  function bind() {
    document.querySelectorAll('#sis-continuous-dock .cog-pace-btn').forEach((btn) => {
      btn.addEventListener('click', () => setPacing(btn.getAttribute('data-pace')));
    });
    const goalBtn = $('btn-set-goal');
    if (goalBtn) goalBtn.addEventListener('click', setGoal);

    // Batch Queue Modal Wiring
    const batchBtn = $('btn-batch-goals');
    const batchModal = $('sis-batch-modal');
    const closeBatch = $('btn-close-batch-modal');
    const cancelBatch = $('btn-cancel-batch-modal');
    const confirmBatch = $('btn-confirm-batch-tasks');
    const batchInput = $('batch-tasks-input');

    if (batchBtn && batchModal) {
      batchBtn.addEventListener('click', () => {
        batchModal.style.display = 'flex';
        if (batchInput) batchInput.focus();
      });
    }
    if (closeBatch && batchModal) {
      closeBatch.addEventListener('click', () => {
        batchModal.style.display = 'none';
      });
    }
    if (cancelBatch && batchModal) {
      cancelBatch.addEventListener('click', () => {
        batchModal.style.display = 'none';
      });
    }
    if (confirmBatch && batchModal) {
      confirmBatch.addEventListener('click', async () => {
        const text = batchInput?.value || '';
        const rawTasks = text
          .split('\n')
          .map((l) => l.replace(/^\s*\d+[\.\)\-]\s*/, '').trim())
          .filter(Boolean);
        if (rawTasks.length === 0) {
          alert('Please enter at least one task objective.');
          return;
        }
        try {
          confirmBatch.disabled = true;
          confirmBatch.textContent = 'Queueing...';
          const res = await fetch('/api/goals/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: rawTasks, origin: 'user' }),
          }).then((r) => r.json());
          if (res.success) {
            batchModal.style.display = 'none';
            if (batchInput) batchInput.value = '';
            await refreshGoal();
          } else {
            alert('Error queueing tasks: ' + (res.error || 'Unknown error'));
          }
        } catch (err) {
          alert('Failed to send batch request: ' + err.message);
        } finally {
          confirmBatch.disabled = false;
          confirmBatch.textContent = 'Queue Batch Tasks ⚡';
        }
      });
    }

    window.addEventListener('sis-continuous-tick', (e) => {
      if (e.detail) updateContinuousHUD(e.detail);
    });
    window.addEventListener('sis-goal-created', refreshGoal);
    window.addEventListener('sis-goal-complete', refreshGoal);
    window.addEventListener('sis-goal-activated', refreshGoal);

    window.addEventListener('sis-task-perfection-auditing', (e) => {
      document.querySelectorAll('#cog-perfection-badge').forEach((el) => {
        el.style.display = 'inline-block';
        el.style.background = 'rgba(56,189,248,0.15)';
        el.style.borderColor = '#38BDF8';
        el.style.color = '#38BDF8';
        el.textContent = `✦ Auditing perfection (Pass #${e.detail?.pass || 1})...`;
      });
    });

    window.addEventListener('sis-task-perfection-refining', (e) => {
      document.querySelectorAll('#cog-perfection-badge').forEach((el) => {
        el.style.display = 'inline-block';
        el.style.background = 'rgba(234,179,8,0.15)';
        el.style.borderColor = '#EAB308';
        el.style.color = '#FACC15';
        el.textContent = `✦ Refining defects (Pass #${e.detail?.pass || 1}, score ${e.detail?.score || 0}%)...`;
      });
    });

    window.addEventListener('sis-task-perfection-verified', (e) => {
      document.querySelectorAll('#cog-perfection-badge').forEach((el) => {
        el.style.display = 'inline-block';
        el.style.background = 'rgba(16,185,129,0.15)';
        el.style.borderColor = '#10B981';
        el.style.color = '#10B981';
        el.textContent = `✦ Audit complete (Pass #${e.detail?.pass || 1})`;
      });
      refreshGoal();
    });

    window.addEventListener('sis-ada-tool-approved', refreshAda);
    window.addEventListener('sis-ada-tool-rejected', refreshAda);
    window.addEventListener('sis-ada-tool-proposed', refreshAda);
  }

  async function init() {
    bind();
    // Ensure the app's shared WebSocket is open so live tick/goal/Ada
    // broadcasts reach this dock (function is a global declaration in the
    // main script). Safe no-op if it is already connected.
    try {
      if (typeof initAgentBrowserWebSocketIndex === 'function') initAgentBrowserWebSocketIndex();
    } catch (_) {}
    try {
      const cog = await fetch('/api/continuous/status').then((r) => r.json());
      updateContinuousHUD(cog);
    } catch (_) {}
    await refreshGoal();
    await refreshAda();
    console.log('[ContinuousDock] Continuous Cognition & Goal Dock ready.');
  }

  // Expose handlers for the shared WebSocket listener in the main script.
  window.SISContinuousDock = {
    updateTick: updateContinuousHUD,
    refreshGoal,
    refreshAda,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
