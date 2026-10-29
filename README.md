# Supergence

Welcome to Supergence! Supergence is a local-first AI workspace with a Node.js backend, a web cockpit, and an optional Electron desktop app. Agents can brainstorm, code, create files, and run commands. Commands run with your operating system permissions; workspaces are not security sandboxes. Your configured model provider may receive prompts and selected data.

---

## Quick Start

Getting Supergence up and running takes just a few moments:

```powershell
# 1. Install dependencies
npm install

# 2. Set up your environment file
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# 3. Launch the development environment
npm run dev
```

`npm run dev` starts the backend and Vite frontend. First open the private session link printed by the backend, then open the Vite URL printed in the terminal (typically `http://127.0.0.1:5173`). Both must use `127.0.0.1`, because browser cookies are host-specific. The backend defaults to `http://127.0.0.1:3001`; check its startup banner for the active port. The server listens only on loopback. Session links grant access to local files and tools: keep them private and restart the backend if a link is exposed.

### Running Services Independently

If you prefer to run the backend and client in separate terminals:

```powershell
# Terminal 1: Backend API & WebSocket server (allow local Vite development origin)
$env:SIS_ALLOW_VITE_ORIGIN='1'
npm run server

# Terminal 2: Web frontend
npm run client
```

Open the backend's printed session link before using the frontend. The desktop app establishes its own session automatically. For automated API clients, set `SIS_SESSION_SECRET` to a private 64-character hexadecimal value before starting the backend and supply it as a bearer token. This secret gives the client broad local access; store it securely and do not commit it.

---

## Configuration (`.env`)

Supergence is configured via simple, straightforward environment variables in your `.env` file:

```env
API_KEY=your-gateway-key
BASE_URL=http://localhost:20128/v1
DEFAULT_MODEL=opus-4.6
FALLBACK_MODEL=
PORT=3001
```

- **`API_KEY`**: Your model gateway or provider API key.
- **`BASE_URL`**: The HTTP endpoint for your model provider or local LLM server.
- **`DEFAULT_MODEL`**: The primary model ID to use for inference.
- **`FALLBACK_MODEL`**: Optional secondary model ID to fallback to if the primary model is busy or unavailable.
- **`PORT`**: Port for the Express server (defaults to 3001; automatically shifts if the port is busy).
- **`SIS_FIGCRAFT_CLI`**: Optional absolute path to a separately installed FigCraft CLI executable. The CLI is not included in this repository or the packaged app; FigCraft tools are unavailable unless this path is configured or a CLI is installed at `integrations/figcraft/bin/figcraft-cli.exe`.

Vault data and its installation key are stored in the selected data directory under `security/`.
Back up that key together with encrypted records: losing it makes those records unreadable. The
key is a local file, not an OS keychain. Records created with older releases may still use a legacy
key; they remain readable when their original keyring is retained, but are not automatically
re-encrypted. Older security data in the repository's `data/security/` folder is not automatically
copied into a newly selected data directory. Preserve it until a deliberate migration is available.

---

## How It Works

### Isolated Chat Workspaces

Every task and chat thread gets its own workspace on disk under `workspace/chats/<conversation-id>/`. This organizes files but does not restrict the operating system access of commands run there.

### Real-Time Live Streaming

As soon as Supergence begins a task, your workspace viewer opens automatically. You can watch files being written, folders being structured, and commands running in the live terminal view in real time.

### Proactive Suggestions & File Reviews

When explicitly enabled, Supergence can review metadata in selected folders and optionally the foreground window title. It sends those details to the configured model to generate suggestions. Suggestions are disabled by default and existing users must re-enable them after this privacy change.

---

## Project Structure

Here is a quick tour of the repository:

- **`client/`**: The core web app. `index.html` is the primary entry point, styled by `styles/` and driven by client scripts in `scripts/`.
- **`server/`**: Express API server, tool execution engine, workspace isolation manager, and AI gateway connectors.
- **`electron/`**: Desktop wrapper allowing Supergence to run as a native desktop application.
- **`workspace/`**: Local workspace directory where chats and tasks build projects, generate files, and run commands.
- **`tests/`**: Unit tests, browser automation tests, and integration test suites.
- **`docs/`**: Architecture diagrams, subsystem documentation, and deep dives.

For integration boundaries, runtime storage, and a team handoff checklist, see
[OS integration and handoff](docs/os-integration.md).

---

## Testing & Verification

We believe in testing against real environments rather than mock approximations:

```powershell
# Run linting and unit tests
npm run test:unit
npm run lint

# To run browser tests, start the server with a private SIS_SESSION_SECRET,
# then provide the same value and the server URL in the test terminal.
$env:SIS_SESSION_SECRET='<the same private 64-character hexadecimal secret>'
$env:SIS_BASE_URL='http://127.0.0.1:3001' # use the actual printed port
npm run test:browser

# Run full project checks
npm run check
```

---

## Desktop App

Want to run Supergence as a standalone desktop app?

```powershell
# Run the desktop app in development mode
npm run desktop:dev

# Package a portable desktop executable
npm run desktop:portable
```

---

## Contributing & Development Guides

- For team working agreements, read [AGENTS.md](AGENTS.md).
- For contributor guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
