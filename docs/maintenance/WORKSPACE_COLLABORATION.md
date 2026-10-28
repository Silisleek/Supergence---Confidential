# Workspace collaboration and execution controls

The maintained app is `client/index.html`. Start it with `npm run dev`; the launcher reads the backend's listening port and configures the Vite proxy accordingly. The configured backend port is 3009 and the development UI is 5173 when available.

## Conversation while working

The unified agent streams its own short commentary before tool calls and continues streaming after results. Tool control packets are filtered from visible conversation. Follow-up messages remain available in the main composer and queue for the next turn; the queue is visible above it. A side conversation runs independently through the same tool-capable unified runtime. Each side thread retains its own participants, message history, sender identity, status, and real execution activity. Delegated agent-to-agent messages use a bounded conversational responder, rather than recursively starting more workers.

Native function definitions and complete tool-message history are passed to the model. Recognized action requests require a tool call; a text-only execution claim is rejected. Ordinary output fences are displayed as output rather than automatically saved as executable code.

The compact activity box above the composer contains actual tool names, arguments, outputs, execution status, and measured durations. It can be expanded and remains available after a turn. Legacy execution traces are hidden in the transcript. Code and interactive artifacts remain part of their assistant message.

## Access modes

The Access control beside the composer persists server-side in `data/runtime-access.json` and applies to all agents. Browser, terminal, and local files are enabled by default, with Full access selected as requested.

| Mode                 | Behavior                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full access          | Runs enabled agent tools without an additional runtime decision.                                                                                            |
| Approve for me       | Allows reading, shared-browser navigation and routine workspace file edits. Terminal, unknown operations, and edits outside that scope wait for a decision. |
| Ask before executing | Allows reads; other agent actions wait for the user's decision above the composer.                                                                          |

Approval is tied to the tool and exact arguments within the current turn. Decline, expiry, or capability revocation prevents execution. A disabled capability remains disabled even in Full access. Dynamic tools pass through the execution gate rather than gaining read-only privileges from their name. Existing workspace and sandbox restrictions still apply. These are agent execution preferences, not OS-level isolation or an authentication system.

`read_local_file`, `write_local_file`, and `list_local_directory` support explicitly selected host paths. Workspace file tools and `run_command` retain their existing workspace behavior. Browser interaction defaults to the shared `agent-supergence` session beside chat. API errors return JSON; a missing endpoint produces a useful backend-version diagnostic instead of trying to parse an HTML error page.

For an authorized account sign-in, the agent can inspect actual visible form controls and use `browser_fill_form`. Input values are excluded from page inspection, tool activity, approval previews, cursor labels and form results. A missing selector reports failure instead of clicking the previous cursor position; failed fields prevent submission. Authentication must be checked by reading the resulting page. MFA and CAPTCHA remain user steps. The runtime contract appears before legacy guidance so provider prompt limits preserve the actual browser and permission instructions.

## Layout, cursors, and agents

Drag the separators beside conversation history and the browser to resize them. Arrow keys make small adjustments; Shift makes larger adjustments. Double-click restores the default. Widths persist in this browser. Mobile uses its own layout.

`client/images/cursors/manifest.json` records the original supplied Tahoe cursor files and SHA-256 identities. Their original 32px images and hotspots were extracted from CUR/ANI containers for browser compatibility. The busy cursor cycles supplied frames. The system cursor theme is not modified.

Agent profile preferences preserve actual agent IDs, roles, and history. Names and the five supplied mascot images can be changed in Preferences → Agent names & mascots. CSS animation reflects actual thinking and reply states and respects reduced-motion preferences. Original transparent PNG assets are kept in `client/images/mascots/`.

## REA integration

The installed `reverse-engineer-anything` skill and references remain readable through `read_learning_skill`. The runtime prompt directs reference-based reconstruction through observation, retained evidence, implementation, and execution checks. `capture_reference_feature` records the chosen feature with actual browser text/links or static artifact evidence. Reading a page does not establish hidden behavior or implementation.

The existing pinned REA bridge supports explicitly selected workspace JavaScript artifact trees and ASAR files. It retains evidence and does not execute targets. Native decompilers and other optional engines are not supplied by skill instructions. Ordinary complete-source work uses file, terminal, and browser tools. Building a complete app still requires implementation and actual checks; reference capture alone is not a completed reconstruction.

## Verification

- `npm run test:unit`: durable conversations and provenance, live callback state, declined actions, approval scope, retained learning, and real REA transport/analysis.
- `npm run test:runtime`: Chrome UI approval before a real terminal command, capability denial, actual local file reading, and JSON errors.
- `node tests/browser/workspace-collaboration.mjs`: resizing/persistence/cursors, real streamed commentary, queued follow-ups, another actual agent replying while a task waits, execution output, retained activity details, and agent-to-agent messaging.
- `npm run test:workspace-browser`: actual Google/local pages, tab operations, DOM input, desktop/mobile viewport resizing.
- `npm run test:login`: actual chat streaming and Chrome navigation, a local account fixture with dummy credentials, authenticated-page evidence, private tool activity, and failed-field/submit/click behavior. The test removes only its own conversation and never uses an external account.
- Existing UI, learning, artifact, lint, formatting, integration, and production build checks remain available. Reports and screenshots are in `test-results/`.

Speech recognition still requires a real microphone/speech check. Model, network, and analysis-engine failures are displayed as failures rather than replaced with canned success messages.
