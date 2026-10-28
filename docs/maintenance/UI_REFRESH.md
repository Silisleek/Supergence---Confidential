# SIS workspace UI refresh

Date: 2026-10-22.

The supplied reference informed the compact icon rail, conversation sidebar, spacious transcript, and anchored composer. The subsequent refinement uses the supplied Supergence logo and its cream, gold, and teal colors, with tonal surfaces in place of decorative borders. Both changes apply to the maintained `client/index.html` app.

## Implementation

- `client/styles/workspace-shell.css` defines the shell, typography, responsive layout, interaction states, and matching inspection surfaces.
- `client/scripts/workspace-shell.js` connects the rail, tools menu, keyboard shortcuts, local preferences, and live connection indicator to existing controllers.
- The history list uses real saved conversations, keyboard-accessible selection buttons, dates, and message counts.
- New conversations show a UI empty state and editable prompt starters. No assistant messages or history records are fabricated.
- `client/scripts/chat-artifacts.js` renders generated artifacts inside their owning assistant turn. HTML previews run in sandboxed iframes; source tabs, expansion, file links, clipboard operations, and explicit code execution use the actual file or backend result.
- `client/styles/chat-artifacts.css` owns canvas and code-card presentation. Source cards use semantic classes instead of inline presentation and handlers.
- Restoring a conversation restores its artifact metadata and inline previews. The optional side preview stays closed until requested. Unscoped WebSocket artifact broadcasts cannot insert unrelated files into a conversation.
- Opening a code block never saves or executes it. Run is an explicit action; unsaved blocks get a separate workspace file. The UI shows actual stdout, stderr, and exit codes, including failures. Missing files remain unavailable. Unmeasured syntax, performance, and validation claims were removed from the affected studio labels.
- Interrupted streams preserve received text without replaying a request that may already have executed tools. A second Enter press during execution preserves the next draft.
- Dictation reuses `VoiceInput`, with a configurable composer target. It inserts text for review rather than submitting automatically.
- Interface sounds are opt-in; compact spacing and sound preferences are stored in the browser.
- The hidden legacy home clock no longer starts a WebGL loop in the main workspace.

## Verification

ESLint, formatting checks for changed files, seven local unit tests, and the production build passed. Browser reports record the tested development and production URLs.

`tests/browser/workspace-ui.mjs` verifies startup, live connection, actual saved conversation restore/search, new threads, prompt starters, composer states, tools menu, keyboard shortcuts, preferences, existing catalogue and preview controls, microphone lifecycle, and responsive layout. It also checks Enter-to-send through the actual SSE renderer and Shift+Enter handling.

Screenshots and reports are stored in `test-results/ui-redesign/` for the backend-served app and `test-results/ui-build/` for the production preview. The microphone check uses Chrome's silent fake audio device and simulated speech-recognition events; real speech transcription remains unverified. The SSE send check uses a response intercepted only in the test browser. No paid model request or new backend conversation is created by this suite.

`tests/browser/chat-artifacts.mjs` creates temporary files through the real workspace API, interacts with an HTML converter in the inline iframe, switches views, expands the canvas, executes successful and failing JavaScript through the backend, checks actual output and exit codes, verifies a missing-file error, and checks the mobile viewport. It cleans up its temporary workspace files and never requests a model response.

A separate manual Chrome check submitted one real model request through the composer. The backend generated `workspace/small_interactive_length.html`, persisted it with conversation `conv-ws-1792674110827`, and restored it after reload. The generated input produced **8.2021 feet for 2.5 meters** inside the restored iframe. Evidence is in `test-results/chat-artifacts/live-chat.json` and `live-chat-restored.png`. This exercises the configured model's real fallback path; it is separate from the intercepted SSE regression checks and is not an assertion that every model or tool works.

## Run the checks

```powershell
$env:SIS_BASE_URL = 'http://localhost:3010' # Use the server's printed URL
npm run test:ui
npm run test:artifacts
```

For a production preview with API/WebSocket proxying, set `ACTIVE_SERVER_PORT` to the actual backend port before starting Vite preview, then set `SIS_BASE_URL` to the preview URL and `SIS_UI_BUILD=true`.

Pre-refresh sources are preserved in `archives/ui-refresh-2026-10-22T12-31-44-431Z/`.
