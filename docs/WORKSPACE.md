# Workspace map

## Maintained app

The Supergence UI is styled in `client/styles/workspace-shell.css`, with themes in `workspace-theme.css`. Navigation, preferences, keyboard shortcuts, and composer utilities live in `client/scripts/workspace-shell.js`. Conversation-owned canvases and code execution are maintained in `client/scripts/chat-artifacts.js` and `client/styles/chat-artifacts.css`. The shared browser is in `workspace-browser.js`, adjacent tools in `workspace-cockpit.js`, and retained-source controls in `workspace-learning.js`. The supplied logo is `client/images/supergence-logo.png`. These extend the existing workspace controller. See [the UI refresh record](maintenance/UI_REFRESH.md) and [learning/browser record](maintenance/LEARNING_BROWSER.md) for behavior and Chrome verification.

`client/index.html` contains page structure and the Three.js import map. Its extracted assets are:

| File                              | Responsibility                                                          |
| --------------------------------- | ----------------------------------------------------------------------- |
| `styles/workspace.css`            | Workspace layout, theme, controls, and modal styles                     |
| `scripts/reload-guard.js`         | Existing development reload protection                                  |
| `scripts/hud-clock.js`            | Three.js clock and live date/time                                       |
| `scripts/workspace-controller.js` | Chat, artifacts, memory tree, agent browser, and workspace interactions |
| `scripts/feature-catalog.js`      | Feature descriptions                                                    |
| `scripts/feature-actions.js`      | Availability, connected actions, and measured check results             |
| `scripts/continuous-dock.js`      | Continuous cognition and goal dock                                      |
| `scripts/telemetry-values.js`     | Shared measured-value formatting and checked JSON requests              |

Classic scripts intentionally retain their loading order and shared globals. The main controller remains substantial; future changes should extract coherent responsibilities and verify their browser behavior. The older `app.js` and HUD modules support earlier app surfaces and are retained.

## Server

`server/index.js` owns backend initialization, API registration, and the shared HTTP/WebSocket server. `server/routes/pages.js` centralizes page aliases and demo routes. Existing domain folders contain orchestration, tools, provider integration, memory, learning, security, and sandbox services.

Use `/api/health`, `/api/brain/lifecycle`, `/api/brain/waves`, `/api/survival`, and `/api/memory/graph` for focused reads. `/api/state` is expensive and can stall other requests.

## Other surfaces

Standalone experiments live in `demos/`; the former root HTML files are in `demos/legacy/`. Their existing server aliases are preserved. The older Supergence UI assets are in `demos/supergence-ui/` and served through `/SupergenceUI.html` and companion asset aliases.

`scripts/build-unified-frontend.js` generates only the historical standalone demo. It no longer overwrites the maintained app.

## References, assets, and private state

`references/` holds original downloaded projects and source collections, keeping their internal layouts intact. `integrations/` remains in place for local tooling. `Liquid-glass/`, `Supergencebackgrounds/`, and `fonts/` remain at their existing paths for asset compatibility.

`data/` and `workspace/` contain persistent and generated user material. They are excluded from formatting and linting. `scratch/` remains available because existing verification endpoints use it. No runtime databases, browser profiles, or generated user artifacts were removed by the organization pass.

`archives/` preserves old packages, the former `archive/` folder, the extracted application snapshot, and the source backup taken before the code cleanup. Nothing in this folder is a substitute for version control.

## Developer utilities and checks

`npm run dev` uses `scripts/dev.mjs` to wait for the backend's real listening port before starting Vite. Both API and WebSocket requests go through the frontend proxy. The checked browser suite is in `tests/browser/`; focused local tests are in `tests/unit/`.

`scripts/build.mjs` stages classic scripts, local Three.js assets, images, and fonts in `.cache/` for production builds. Maintained sources are not duplicated.

Developer diagnostics are in `scripts/diagnostics/`, capture utilities in `scripts/capture/`, and scene generators in `demos/generators/`. Manual subsystem checks are in `tests/manual/`, with former script-based live tests in `tests/manual/tools/`. Historical root scripts are in `tests/legacy/` and older fixtures remain in `tests/scripts/`. Their relative imports were adjusted during relocation. They may still have machine-specific paths or service dependencies and are excluded from the default unit suite.
