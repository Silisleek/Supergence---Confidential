# Workspace cleanup

Date: 2026-10-22.

## Organization

Moved 350 entries across two passes: loose root material, downloaded references, old packages, manual tests, diagnostics, capture utilities, and demo generators. All moves are recorded in [workspace-moves.json](workspace-moves.json). The manifest identifies both preserved source snapshots.

Existing runtime state, user-generated artifacts, assets, and integration directories were preserved. Third-party source was not reformatted or refactored.

## Runtime and maintenance changes

- Extracted the app's inline stylesheet, reload guard, 3D clock, main controller, and cognition dock into named files. Separated feature descriptions and actions.
- Centralized page aliases in `server/routes/pages.js`, removed duplicate page handlers, and retained legacy URLs.
- Changed the historical frontend generator to write only its standalone demo.
- Added consistent editor/formatter configuration, ESLint, local unit checks, and Chrome smoke verification.
- Replaced fabricated memory counts, confidence scores, feature results, and decorative readings with backend measurements or unavailable states.
- Disabled catalogue checks without a connected implementation.
- Preserved the shared WebSocket when closing browser panels, and standardized the proxied `/ws` URL.
- Added a development launcher that discovers the backend's actual port before starting Vite.
- Removed unreachable duplicate switch branches and redundant assignments, scoped lexical switch declarations, preserved error causes, and corrected Unicode character classes found by linting.
- Moved embedded provider credentials into private `.env` configuration, switched source and manual runners to environment variables, replaced credential-like examples with placeholders, and removed the obsolete separate WebSocket port from `.env.example`.
- Repaired duplicated malformed navigation in the older Supergence page. Preserved the truncated zombie scene under `archives/incomplete-demos/` and replaced its broken launch page with an explicit incomplete-experiment notice.
- Updated stale integration fixtures to exercise the current reward, patch protection, and benchmark contracts without relaxing runtime gates.
- Fixed narrow-screen layout: the history sidebar becomes a drawer, previews stack beneath chat, header controls wrap, and the composer remains inside the viewport. Escape closes the drawer and optional dialogs without disconnecting the shared socket.

## Verification

- ESLint: passed for maintained runtime code and the new build, development, maintenance, unit, and browser scripts.
- Prettier: the full first-party formatting check passed; changed files were checked again after the final responsive layout and documentation edits.
- Unit tests: 7 passed.
- Integration tests: 12 of 12 passed, including the real local sandbox benchmark.
- Relative import audit: 795 imports checked, zero missing targets.
- Organization utility: a final dry run reported zero pending moves.
- Production build: passed, with classic scripts, fonts, images, and local Three.js assets included.
- Google Chrome: backend-served app, Vite development app, and production preview passed the smoke checks. The production run also verified mobile composer bounds, typing, sidebar drawer, and header layout.

Browser reports and desktop/mobile screenshots are in `test-results/workspace-smoke/`, `test-results/workspace-dev-smoke/`, and `test-results/workspace-build-smoke/`. The backend selected port 3010 because 3009 was already occupied. The updated development app is available at `http://localhost:5173/` while its development process is running.

The historical application includes large controllers and provider-dependent services. Formatting and smoke tests do not establish that every model, hardware integration, historical script, or catalogue capability is production-ready.
