// SIS 1.0 — UI Self-Modification & Adaptation Tools
// Registered tools allowing the AI agent to inspect, customize, restyle,
// inject components, and modify its own user interface.

import uiSelfModification from '../services/uiSelfModification.js';

export const uiTools = {
  get_ui_state: {
    name: 'get_ui_state',
    description:
      'Inspect the current state of the Supergence User Interface: active theme, custom CSS variables, injected widgets, history of modifications, and supported DOM mount targets.',
    parameters: {},
    required: [],
    execute: async () => {
      const state = uiSelfModification.getUIState();
      return {
        success: true,
        ...state,
      };
    },
  },

  modify_ui_theme: {
    name: 'modify_ui_theme',
    description:
      'Dynamically update the Supergence UI theme, color scheme, or CSS variables. The changes are broadcast live via WebSocket to all connected clients and persisted across restarts.',
    parameters: {
      theme: {
        type: 'string',
        description:
          'Theme preset identifier: "default", "cyber", "midnight", "warm", "matrix", "minimal", or "obsidian".',
      },
      customCssVars: {
        type: 'object',
        description:
          'Optional key-value pairs of CSS custom properties (e.g. {"--accent": "#00ffcc", "--bg-primary": "#0a0a0f"}).',
      },
      customCss: {
        type: 'string',
        description:
          'Optional raw CSS block to inject directly into the UI stylesheet for specialized restyling.',
      },
    },
    required: [],
    execute: async (args = {}) => {
      const { theme, customCssVars = {}, customCss = '' } = args;
      const result = uiSelfModification.modifyUITheme({
        theme,
        customCssVars,
        customCss,
        author: 'Supergence Agent',
      });
      return {
        success: true,
        message: `UI Theme updated to "${result.theme}". Custom styles broadcast live.`,
        theme: result.theme,
        customCssVars: result.customCssVars,
      };
    },
  },

  inject_ui_widget: {
    name: 'inject_ui_widget',
    description:
      'Inject and mount an interactive UI component, card, control panel, stats widget, or button into the Supergence interface live. The component is mounted immediately in the DOM without reloading.',
    parameters: {
      id: {
        type: 'string',
        description:
          'Unique identifier for the widget (e.g. "token_usage_tracker", "quick_audio_switcher").',
      },
      title: {
        type: 'string',
        description: 'Human-readable title displayed in the widget header or tooltip.',
      },
      target: {
        type: 'string',
        description:
          'DOM selector where the widget should be mounted (e.g. "#sisFloatingLayer", "#sisColSpace", "#sisCardTabHome", "#sisTopControlBar", "#sideAgentPanel", "#workspaceMain"). Defaults to "#sisFloatingLayer".',
      },
      html: {
        type: 'string',
        description: 'The HTML markup for the widget.',
      },
      css: {
        type: 'string',
        description: 'Optional scoped CSS styling for this widget.',
      },
      js: {
        type: 'string',
        description:
          'Optional client-side JavaScript code to execute when the widget is mounted (runs in browser context).',
      },
      position: {
        type: 'string',
        description: 'Placement relative to target element: "append" (default) or "prepend".',
      },
    },
    required: ['id', 'html'],
    execute: async (args = {}) => {
      const { id, title, target, html, css, js, position } = args;
      const result = uiSelfModification.injectUIWidget({
        id,
        title,
        target,
        html,
        css,
        js,
        position,
        author: 'Supergence Agent',
      });
      return {
        success: true,
        message: `Widget "${id}" successfully injected into "${result.widget.target}".`,
        widget: result.widget,
      };
    },
  },

  remove_ui_widget: {
    name: 'remove_ui_widget',
    description:
      'Remove an injected UI widget from the Supergence interface by its unique ID. The element is unmounted immediately in connected clients.',
    parameters: {
      id: {
        type: 'string',
        description: 'The unique ID of the widget to remove.',
      },
    },
    required: ['id'],
    execute: async (args = {}) => {
      const { id } = args;
      const result = uiSelfModification.removeUIWidget({
        id,
        author: 'Supergence Agent',
      });
      return result;
    },
  },

  modify_ui_source: {
    name: 'modify_ui_source',
    description:
      'Permanently modify a client-side interface file (.html, .css, .js in client/) with automatic path confinement, syntax validation, and atomic backup/rollback.',
    parameters: {
      file: {
        type: 'string',
        description:
          'Relative path within client/ (e.g. "styles/workspace.css", "scripts/workspace-controller.js").',
      },
      targetContent: {
        type: 'string',
        description: 'Exact substring to replace within the file.',
      },
      replacementContent: {
        type: 'string',
        description: 'New content to substitute in place of targetContent.',
      },
      fullContent: {
        type: 'string',
        description: 'Optional complete new file contents (if replacing entire file).',
      },
    },
    required: ['file'],
    execute: async (args = {}) => {
      const { file, targetContent, replacementContent, fullContent } = args;
      try {
        const result = uiSelfModification.modifyUISource({
          file,
          targetContent,
          replacementContent,
          fullContent,
          author: 'Supergence Agent',
        });
        return {
          success: true,
          message: `Successfully modified ${result.file}. Backup created at ${result.backupPath}.`,
          ...result,
        };
      } catch (err) {
        return {
          success: false,
          error: err.message,
        };
      }
    },
  },
};

export default uiTools;
