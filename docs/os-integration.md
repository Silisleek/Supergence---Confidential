# OS integration and team handoff

Supergence is currently a Node.js application with a browser interface and an
optional Electron wrapper. It is not an operating system or a kernel component.
The practical integration point for an OS team is the backend process and its
HTTP and WebSocket interfaces; those interfaces are application APIs, not yet a
versioned or stable OS integration contract.

## Repository map

| Path                                                      | Responsibility                                               |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| `client/index.html`, `client/scripts/`, `client/styles/`  | Main browser interface and its controllers.                  |
| `server/index.js`                                         | Express routes, WebSocket handling, and server startup.      |
| `server/tools/registry.js`                                | Tool definitions and execution entry points.                 |
| `server/services/`, `server/memory/`, `server/workspace/` | Application services, persistence, and workspace operations. |
| `electron/main.cjs`                                       | Desktop window, backend process, and desktop storage setup.  |
| `scripts/dev.mjs`, `scripts/build.mjs`                    | Development orchestration and production build staging.      |
| `tests/unit/`, `tests/browser/`                           | Node unit tests and Chrome browser tests.                    |
| `demos/`                                                  | Standalone experiments, not the main application.            |

The server entry point and several services are large and tightly coupled. An
integration team should define a small supported API and extract services
incrementally, with tests at each boundary, before treating internals as a
reusable SDK.

For a possible backend conversion, see [Rust migration](rust-migration.md).

## Run and verify

Use Node.js 22.13 or newer, install dependencies with `npm ci`, and configure a
local `.env` from `.env.example`. `npm run dev` starts the backend and then
connects Vite to the port the backend actually reports. `npm run server` starts
only the backend. The configured port defaults to 3001 and can advance if it is
unavailable; use the startup banner rather than assuming a fixed port.

Run `npm run check` for lint, formatting, unit tests, and the production build.
For the browser smoke test, start the server and use its reported URL:

```powershell
$env:SIS_BASE_URL = 'http://localhost:3001'
npm run test:browser
```

The browser test requires installed Chrome. Provider-backed features additionally
require a working model endpoint and credentials; a successful build or health
check does not verify model responses or OS integration.

## Runtime boundaries

- `GET /api/health` reports server status, build, and uptime. It does not prove
  that the model provider or every subsystem is available.
- The server exposes HTTP routes under `/api`, a WebSocket server, and workspace
  files under `/workspace`. The source of truth for current routes and messages
  is `server/index.js`; consumers should not assume their schemas are stable.
- The server currently listens on `0.0.0.0`, and CORS is enabled. Workspace
  endpoints include file mutation and command execution. Do not expose this
  service to untrusted networks or users without a separately reviewed access
  boundary. Integration needs authentication, authorization, network isolation,
  and a review of both HTTP and WebSocket operations.
- Chat workspaces provide per-conversation working directories and path checks,
  but they are not an OS sandbox. Commands run with the application's host
  permissions. See [chat workspaces](chat-workspaces.md).
- `SIS_WORKSPACE_DIR` selects the workspace manager's root. `SIS_DATA_DIR` is
  used by several persistence services, including conversations and memory,
  but is not a guarantee that every subsystem stores all state there. Audit
  storage paths before redirecting or packaging data for a different OS.
- Electron supplies its own data and workspace paths when starting the backend.
  Its current wrapper and build targets include Windows-specific behavior; other
  platforms require implementation and testing.
- The model gateway reads `.env` with override enabled. Values in that file can
  replace inherited process environment values; account for this when supplying
  configuration from an OS service manager.

## Preparing a copy for the team

Share source, `package-lock.json`, documentation, and `.env.example`. Do not
include `.env`, `data/`, `workspace/`, `logs/`, `backups/`, browser profiles,
generated artifacts, or downloaded references unless they are deliberately
reviewed and needed. These can contain credentials, personal conversations, or
generated work. `.gitignore` helps with a new Git repository but does not remove
already tracked files and does not filter a manually created archive.

The current checkout may contain local state and has no Git history. Review the
contents of the shared copy, initialize version control for the team, and agree
on ownership of the API, storage, process lifecycle, and permissions before
integrating it into an OS.
