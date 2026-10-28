# Test guide

`npm run test:ui` runs the focused workspace redesign checks against `SIS_BASE_URL`, including real history, navigation, preferences, responsive composer, dictation callbacks, and the SSE rendering path. Speech events and one send response are isolated browser fixtures; no model request is sent. See [the UI refresh record](../docs/maintenance/UI_REFRESH.md).

## Repeatable checks

- `npm run test:unit`: measured values, HTTP failures, durable learning, promotion gates, and REA process/evidence behavior; no provider keys or backend required. The real REA case uses an existing pinned local package or reports a skip when unavailable.
- `npm run lint`: recommended correctness rules for maintained runtime code and new tests.
- `npm run format:check`: consistent formatting of first-party source and documentation.
- `npm run build`: Vite production build.
- `npm run check`: all four checks above.

## Chrome smoke verification

Start `npm run server`, read its listening URL, and then run:

```powershell
$env:SIS_BASE_URL = 'http://localhost:3009' # Replace with the actual URL
npm run test:browser
```

Google Chrome must be installed. The suite uses `playwright-core` with `channel: 'chrome'`. It verifies startup, local JS/CSS, a real `/ws` connection, panel closure, feature availability, measured memory data, zero values, failed requests, memory graph rendering, standalone aliases, and a mobile composer.

Two error-state checks intercept only the test browser's memory API response. All other data comes from the running backend. The suite does not intentionally create conversations, send prompts, start learning jobs, or operate external browser pages. App startup still runs its normal reads and may restore the last conversation.

Results and screenshots are saved under `test-results/workspace-smoke/`. Set `SIS_TEST_DEMOS=false` when checking Vite, whose server does not expose the backend's standalone page aliases.

`npm run test:learning-ui` exercises retention and recall using the supplied Woblo design source, installed skill access, themes, agents, and companion sections. It retains that real reference in the library. `npm run test:workspace-browser` operates real Google and a temporary local HTML page, tests retaining visible text, then removes both its temporary file and its retained test source. Both accept `SIS_BASE_URL`. See [the learning/browser record](../docs/maintenance/LEARNING_BROWSER.md) for scope and separate real model recall evidence.

## Historical integration and manual tests

`npm run test:integration` runs `verify-claude-sis-integration.mjs`, the existing integration harness. It exercises filesystem, sandbox, trajectory, and orchestration services; it can write test trajectories and require local execution tools.

`tests/manual/` contains historical subsystem tests and diagnostics; `tests/manual/tools/` contains live tests formerly mixed into developer scripts. Older parser fixtures and root diagnostics remain in `tests/scripts/` and `tests/legacy/`. Some call live models, use fixed ports, depend on generated artifacts, or contain machine-specific paths. Inspect a script and its requirements before running it. They are not included in `test:unit`.

The integration harness uses a fresh temporary source directory, verifies test-file protection, checks current reward gates, and runs its local differential benchmark without a provider call. `npm test` runs unit tests followed by this integration suite.

To check a built app through a server that supplies the API proxy, set `SIS_TEST_BUILD=true` and `SIS_TEST_DEMOS=false`. Development and build smoke results are saved separately under `test-results/workspace-dev-smoke/` and `test-results/workspace-build-smoke/`.

Real microphone speech recognition and native desktop behavior require dedicated manual verification. Chrome's fake audio device emits silence; it cannot validate a real transcript or a non-zero microphone meter.
