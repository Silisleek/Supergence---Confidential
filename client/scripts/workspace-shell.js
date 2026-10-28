// UI-only behavior. Chat, history, previews, and agents remain owned by the
// workspace controller; this shell calls those existing entry points.
(() => {
  const input = document.getElementById('workspaceInp');
  const send = document.getElementById('workspaceSendBtn');
  const menu = document.getElementById('composerToolsMenu');
  const menuButton = document.getElementById('composerToolsButton');
  const preferences = document.getElementById('workspacePreferences');
  const shortcuts = document.getElementById('workspaceShortcuts');
  const sounds = document.getElementById('shellSoundsPreference');
  const compact = document.getElementById('shellCompactPreference');

  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }

  const actions = {
    'creation-studio': () => window.openCreationStudio(),
    'focus-chat': () => input.focus(),
    conversations: () => window.toggleConversationsSidebar(),
    'new-chat': () => window.startNewWorkspaceThread(),
    agents: () => window.toggleAgentBrowsersModal(),
    memory: () => window.toggleWorkspaceTreeModal(true, 'memory'),
    artifacts: () => window.openArtifactsVaultModal(),
    mastery: () => window.toggleMasteryModal(true),
    features: () => window.toggleFiftyFeaturesModal(true),
    preferences: () => preferences.showModal(),
    styles: () =>
      window.openStylesWindow ? window.openStylesWindow('styles') : preferences.showModal(),
    help: () => shortcuts.showModal(),
  };

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-shell-action]')?.dataset.shellAction;
    if (action && actions[action]) {
      closeMenu();
      actions[action]();
    }
    const starter = event.target.closest('[data-compose-prompt]');
    if (starter) {
      input.value = starter.dataset.composePrompt;
      input.dispatchEvent(new Event('input'));
      input.focus();
    }
    if (!event.target.closest('.workspace-composer-inner')) closeMenu();
  });

  menuButton.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('button').focus();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const sidebar = document.getElementById('workspaceConversationsSidebar');
      sidebar.classList.remove('collapsed');
      if (window.matchMedia('(max-width: 800px)').matches) sidebar.classList.add('mobile-open');
      document.getElementById('sidebarConvSearch').focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      actions['new-chat']();
    }
    if (event.key === 'Escape') closeMenu();
  });

  const theme = document.getElementById('shellThemePreference');
  const storedTheme = localStorage.getItem('sis-ui-theme');
  theme.value = ['neutral', 'warm', 'midnight'].includes(storedTheme) ? storedTheme : 'neutral';
  document.body.dataset.theme = theme.value;
  theme.addEventListener('change', () => {
    document.body.dataset.theme = theme.value;
    localStorage.setItem('sis-ui-theme', theme.value);
  });
  sounds.checked = localStorage.getItem('sis-ui-sounds') === 'true';
  compact.checked = localStorage.getItem('sis-ui-compact') === 'true';
  document.body.dataset.compact = String(compact.checked);
  sounds.addEventListener('change', () =>
    localStorage.setItem('sis-ui-sounds', String(sounds.checked)),
  );
  compact.addEventListener('change', () => {
    document.body.dataset.compact = String(compact.checked);
    localStorage.setItem('sis-ui-compact', String(compact.checked));
  });

  for (const dialog of [preferences, shortcuts]) {
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)
      )
        dialog.close();
    });
  }

  import('./supergence-motion.js')
    .then(({ bindMotionToggle }) => {
      bindMotionToggle(document.getElementById('shellMotionPreference'));
    })
    .catch((error) => console.warn('Ambient motion unavailable:', error.message));
  import('./supergence-icons.js').then(({ hydrateIcons }) => hydrateIcons());

  function updateConnection() {
    const socket = typeof agentBrowserWs === 'undefined' ? null : agentBrowserWs;
    const state =
      socket?.readyState === WebSocket.OPEN
        ? 'connected'
        : socket?.readyState === WebSocket.CONNECTING
          ? 'connecting'
          : 'offline';
    document.getElementById('shellConnection').dataset.state = state;
    document.getElementById('shellConnectionLabel').textContent =
      state === 'connected'
        ? 'Connected to SIS'
        : state === 'connecting'
          ? 'Connecting'
          : 'Disconnected';
    send.classList.toggle('is-ready', Boolean(input.value.trim()));
  }
  input.addEventListener('input', updateConnection);
  updateConnection();
  const statusTimer = setInterval(updateConnection, 1500);
  window.addEventListener('pagehide', () => clearInterval(statusTimer));

  // Reuse the existing microphone implementation with the workspace composer.
  import('./voice-input.js')
    .then(({ VoiceInput }) => {
      const voice = new VoiceInput(window.audio, {
        inputId: 'workspaceInp',
        autoSubmit: false,
        onStateChange: (state) => {
          const status = document.getElementById('shellComposerStatus');
          status.textContent =
            state === 'listening'
              ? 'Listening. Click the microphone to stop.'
              : state === 'idle'
                ? 'A workspace for ideas, research, and building.'
                : `Microphone: ${state}`;
        },
      });
      voice.init();
      window.workspaceVoiceInput = voice;
    })
    .catch(() => {
      const button = document.getElementById('sbt-btn-dictate');
      button.disabled = true;
      button.title = 'Dictation is unavailable';
    });
})();
