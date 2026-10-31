import { mountMotionSurface, bindMotionToggle } from './supergence-motion.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('sleek-auth-form');
  const sleekIdInput = document.getElementById('sleek-id');
  const passcodeInput = document.getElementById('sleek-passcode');
  const togglePasscodeBtn = document.getElementById('toggle-passcode');
  const submitBtn = document.getElementById('submit-auth');
  const feedbackBox = document.getElementById('auth-feedback');
  const idHint = document.getElementById('sleek-id-hint');
  const statusPill = document.getElementById('portal-status-pill');
  const roleCards = document.querySelectorAll('.role-card');
  const activeSessionCard = document.getElementById('signed-in-card');
  const authFormCard = document.getElementById('auth-form-card');
  const motionToggle = document.getElementById('motion-toggle');

  let selectedRole = 'creator';

  // Mount ambient background motion
  const canvas = document.getElementById('portal-motion-canvas');
  if (canvas) {
    try {
      mountMotionSurface(canvas, { density: 0.000045, maxParticles: 40 });
    } catch (_) {}
  }
  if (motionToggle) {
    bindMotionToggle(motionToggle);
  }

  // Get target redirect from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const targetRedirect = urlParams.get('redirect') || '/';

  // Check current session on load
  checkSession();

  // Real-time Sleek ID validation
  if (sleekIdInput && idHint) {
    sleekIdInput.addEventListener('input', () => {
      const val = sleekIdInput.value.trim();
      if (!val) {
        idHint.textContent = 'Enter your 4–48 character verified Sleek ID.';
        idHint.className = 'input-hint';
        return;
      }
      const isValid = /^[a-zA-Z0-9_\-.]{4,48}$/.test(val);
      if (isValid) {
        idHint.textContent = '✓ Valid Sleek ID format';
        idHint.className = 'input-hint valid';
      } else {
        idHint.textContent = 'Sleek ID must be 4–48 letters, numbers, dashes, underscores, or dots.';
        idHint.className = 'input-hint invalid';
      }
    });
  }

  // Toggle passcode visibility
  if (togglePasscodeBtn && passcodeInput) {
    togglePasscodeBtn.addEventListener('click', () => {
      const isPassword = passcodeInput.type === 'password';
      passcodeInput.type = isPassword ? 'text' : 'password';
      togglePasscodeBtn.setAttribute('aria-label', isPassword ? 'Hide passkey' : 'Show passkey');
      togglePasscodeBtn.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>'
        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  }

  // Role card selection
  roleCards.forEach((card) => {
    card.addEventListener('click', () => {
      roleCards.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      card.setAttribute('aria-pressed', 'true');
      selectedRole = card.dataset.role || 'creator';
    });
  });

  // Quick fill demo buttons
  document.querySelectorAll('.btn-pill[data-demo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const demo = btn.dataset.demo;
      if (demo === 'creator') {
        fillCredentials('slk-creator-01', 'sleek-pass-2026', 'creator');
      } else if (demo === 'operator') {
        fillCredentials('slk-operator-01', 'sleek-pass-2026', 'operator');
      } else if (demo === 'architect') {
        fillCredentials('slk-architect-01', 'sleek-pass-2026', 'architect');
      }
    });
  });

  function fillCredentials(id, pass, role) {
    if (sleekIdInput) {
      sleekIdInput.value = id;
      sleekIdInput.dispatchEvent(new Event('input'));
    }
    if (passcodeInput) {
      passcodeInput.value = pass;
    }
    const targetCard = document.querySelector(`.role-card[data-role="${role}"]`);
    if (targetCard) targetCard.click();
    showFeedback(`Pre-filled credentials for ${id}. Click Authenticate below.`, 'info');
  }

  // Handle Authentication Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sleekId = sleekIdInput?.value.trim() || '';
      const passcode = passcodeInput?.value || '';

      if (!/^[a-zA-Z0-9_\-.]{4,48}$/.test(sleekId)) {
        showFeedback('Please enter a valid Sleek ID (4–48 alphanumeric characters).', 'error');
        sleekIdInput?.focus();
        return;
      }
      if (passcode.length < 6) {
        showFeedback('Passkey must be at least 6 characters long.', 'error');
        passcodeInput?.focus();
        return;
      }

      setLoading(true);
      showFeedback('Authenticating with Sleek Security Gateway...', 'info');

      try {
        const resp = await fetch('/api/silisleek/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sleekId,
            passcode,
            role: selectedRole,
            redirect: targetRedirect,
          }),
        });

        const data = await resp.json();

        if (!resp.ok || !data.success) {
          throw new Error(data.message || data.error || 'Authentication rejected by server.');
        }

        showFeedback('✓ Authenticated successfully! Launching Supergence...', 'success');

        // Store token in localStorage for header fallback
        if (data.token) {
          try {
            localStorage.setItem('sis_session_token', data.token);
          } catch (_) {}
        }

        setTimeout(() => {
          window.location.href = data.redirect || targetRedirect || '/';
        }, 600);
      } catch (err) {
        showFeedback(`Authentication Error: ${err.message}`, 'error');
        setLoading(false);
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/silisleek/logout', { method: 'POST' });
        try {
          localStorage.removeItem('sis_session_token');
        } catch (_) {}
        checkSession();
        showFeedback('Signed out from Sleek ID session.', 'info');
      } catch (_) {
        window.location.reload();
      }
    });
  }

  // Launch workspace button when already signed in
  const launchBtn = document.getElementById('btn-launch-workspace');
  if (launchBtn) {
    launchBtn.addEventListener('click', () => {
      window.location.href = targetRedirect || '/';
    });
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/silisleek/session');
      if (!res.ok) return;
      const data = await res.json();

      if (data.authenticated && data.user) {
        renderSignedIn(data.user);
      } else {
        renderSignedOut();
      }
    } catch (_) {
      renderSignedOut();
    }
  }

  function renderSignedIn(user) {
    if (authFormCard) authFormCard.style.display = 'none';
    if (activeSessionCard) {
      activeSessionCard.style.display = 'block';
      const nameEl = document.getElementById('signed-in-user-name');
      const roleEl = document.getElementById('signed-in-user-role');
      const permsEl = document.getElementById('signed-in-user-perms');

      if (nameEl) nameEl.textContent = user.name || user.sleekId;
      if (roleEl) roleEl.textContent = `${user.badge || '⚡'} (${user.roleName || user.role})`;
      if (permsEl && user.permissions) {
        permsEl.innerHTML = user.permissions
          .map((p) => `<span class="perm-tag">✓ ${p}</span>`)
          .join('');
      }
    }
    if (statusPill) {
      statusPill.innerHTML = `<span class="status-dot"></span> Authenticated: ${escapeHtml(user.sleekId)}`;
    }
  }

  function renderSignedOut() {
    if (authFormCard) authFormCard.style.display = 'block';
    if (activeSessionCard) activeSessionCard.style.display = 'none';
    if (statusPill) {
      statusPill.innerHTML = `<span class="status-dot warning"></span> Sleek ID: Guest`;
    }
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Authenticating...
      `;
    } else {
      submitBtn.innerHTML = `
        <span>Authenticate & Launch Supergence</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14m-6-6 6 6-6 6"/>
        </svg>
      `;
    }
  }

  function showFeedback(msg, type = 'info') {
    if (!feedbackBox) return;
    feedbackBox.textContent = msg;
    feedbackBox.className = `auth-feedback ${type}`;
    feedbackBox.style.display = 'block';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
});
