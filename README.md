# Supergence

Welcome to Supergence! Supergence is your personal, local-first AI workspace and autonomous intelligence companion. It combines a fast Node.js backend with an interactive web cockpit and an optional Electron desktop app, giving you a private sandbox where agents can brainstorm, code, create files, and run commands in real time.

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

`npm run dev` starts the backend and Vite frontend. Vite prints its local URL (typically `http://localhost:5173`) and proxies requests to the backend. The backend defaults to `http://localhost:3001`; check its startup banner for the active port.

### Running Services Independently

If you prefer to run the backend and client in separate terminals:

```powershell
# Terminal 1: Backend API & WebSocket server
npm run server

# Terminal 2: Web frontend
npm run client
```

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

---

## How It Works

### Isolated Chat Workspaces

Every task and chat thread gets its own dedicated workspace on disk under `workspace/chats/<conversation-id>/`. Inside this sandbox, Supergence can create files, organize folders, build full WebGL or HTML applications, and execute shell commands without cluttering your root directory.

### Real-Time Live Streaming

As soon as Supergence begins a task, your workspace viewer opens automatically. You can watch files being written, folders being structured, and commands running in the live terminal view in real time.

### Proactive Suggestions & File Reviews

Supergence periodically reviews what you're working on across selected folders (Workspace, Desktop, Documents, and Downloads) and proactively suggests helpful next steps, optimizations, and automation tasks directly through system notifications and in-app toasts.

---

## Project Structure

Here is a quick tour of the repository:

- **`client/`**: The core web app. `index.html` is the primary entry point, styled by `styles/` and driven by client scripts in `scripts/`.
- **`server/`**: Express API server, tool execution engine, workspace isolation manager, and AI gateway connectors.
- **`electron/`**: Desktop wrapper allowing Supergence to run as a native desktop application.
- **`workspace/`**: Local sandbox directory where chats and tasks build projects, generate files, and run commands.
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
