# Contributing to Supergence

Thank you for helping make Supergence better! Here is a straightforward guide to our codebase conventions and contribution workflow.

---

## Where Code Belongs

- **Application Code**:
  - `client/`: Browser interface, CSS stylesheets, and client controllers.
  - `server/`: Express server, AI gateway, tools, memory, and background engines.
  - `electron/`: Desktop application wrapper and preload scripts.
- **Tests**:
  - `tests/unit/`: Fast, focused unit tests running with Node's native test runner.
  - `tests/browser/`: Browser automation tests driving Chrome via Playwright.
- **Sandboxes & Workspace Data**:
  - `workspace/`: User workspaces and task sandboxes (git-ignored).
  - `data/`: Local database, vectors, and chat history.

---

## Coding Standards

- **Formatting**: 2-space indentation, single quotes for JavaScript, semicolons, UTF-8 encoding. Run `npm run format` after making edits.
- **No Inline Comment Noise**: Keep code clean, lean, and self-documenting. Avoid placing narrative comments between lines of code.
- **Client Script Architecture**: Client scripts in `client/scripts/` run in order via `client/index.html`. Be mindful of global registrations and browser lifecycle hooks.

---

## Pre-Flight Checks

Before submitting pull requests or merging changes, run the test and lint suites:

```powershell
# Lint, check formatting, run unit tests, and build
npm run check
```

For changes to the app UI, start `npm run server` and run `npm run test:browser`
with `SIS_BASE_URL` set to the URL printed by the server. Browser tests require
Chrome. See [OS integration and handoff](docs/os-integration.md) for runtime
boundaries and what to exclude when sharing a copy of the project.
