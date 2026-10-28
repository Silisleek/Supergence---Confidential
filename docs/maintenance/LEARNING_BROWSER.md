# Learning and shared browser

Date: 2026-10-22. Changes apply to the maintained `client/index.html` app.

## What learning does

`server/services/learningLibrary.js` retains text, code, and analysis evidence in `data/learning-library/`. Sources are addressed by their SHA-256 digest, indexed once, and deduplicated on repeated import. Search returns source IDs, exact excerpts, line ranges, and digests. Relevant excerpts are inserted into both coding and general chat prompts with an explicit instruction to treat them as reference data rather than commands.

The library uses a local lexical index. Import and retrieval do not require a model request. Each request reports its measured duration. Sources are capped at 2 MiB, and model context is bounded. Recall checks compare retrieved excerpts against a supplied exact passage. Sources can be forgotten, which removes them from disk and retrieval. Retention and recall do not establish factual truth, general mastery, or updated model weights.

The supplied Woblo stylesheet is preserved in `resources/design/woblo.css` and was retained through the real UI. A real Computer Science agent chat returned `--color-primary-500: #8e8771` with citation `source-9a7c87e9e420040bd4c4fbdb:1`. The selected agent was persisted with the conversation. The raw result is in `test-results/learning-workspace/live-recall.json`. This is a bounded retrieval check, not an arbitrary-subject benchmark.

## Promotion correctness

`server/trajectory/learning-grade.js` separates observed failures from acquired skills. Acquisition requires an actual passing expected-output oracle, a successful process exit, positive reward, and all declared test cases passing. This gate is shared by autonomous promotion, dynamic tool registration, prompt retrieval, and mastery counts. Legacy scores and unsupported `verified` flags no longer establish verification. Failure evidence remains available.

Model-only memory review and retention remain unverified. The unified chat path no longer assigns fixed .98/.97 quality scores or automatically records every long answer as a golden exemplar. Agent availability and activity counts derive from actual requests and retained events. A missing/failed model response produces an error rather than a canned acknowledgement.

## REA access

The user-supplied [reverse-engineer-anything workflow](../../resources/skills/reverse-engineer-anything/SKILL.md) and its references are bundled with Supergence. `read_learning_skill` exposes the instructions to the runtime. `reverseEngineeringService.js` discovers the already installed, pinned `rea-agents@6.5.0` package; it does not change Codex MCP configuration or install native engines.

The bridge supports explicit JavaScript application trees and ASAR files inside `workspace/`. It launches the CLI without a shell, limits input/output/time, hashes the selected artifact before and after analysis, retains complete Evidence, and returns bounded observations with limitations. Exact unchanged evidence can be reused. It never executes the target. Unsupported native/package analyses remain unavailable through this bridge; the skill text alone does not supply those engines.

Registered runtime tools include retention, recall, skill reading, REA status/analysis, opening the shared browser, reading its visible page, and retaining that page with its actual URL. Analysis results enter the same cited library.

## Workspace and browser

The adjacent panel provides Browser, Files, Tasks, and Agents. The browser reuses `agentBrowserManager` and its real Chrome contexts, CDP frames, navigation, input, and tab APIs. The default shared session is `agent-supergence`, with Google as the home page. HTTP local pages and internet pages open beside chat, including ordinary links from responses/artifacts. Modified clicks and downloads preserve native behavior.

The new bounded viewport and page-evidence routes resize the actual browser to the panel and return visible text/links. “Retain page” saves actual page contents with provenance. Files search the workspace API; tasks show existing engine goals; agent settings use the actual roster. A browser error is displayed as an error, rather than replaced with a fake webpage.

Three browser-persisted themes use the supplied design style: Charcoal, Warm parchment, and Midnight. Instrument Serif uses the locally installed font with a serif fallback. Interface controls retain a sans-serif face. Reduced-motion preferences disable the entrance animations. User and assistant messages share Markdown escaping/rendering, source citations open the retained source, and code blocks support preview, execution, copying, and retention.

## Verification

- Unit checks cover durable retention, deduplication, provenance, recall scope, path confinement, promotion gates, actual pinned REA analysis/cache, and process failures. The Windows symlink test is skipped when the account cannot create symlinks.
- `tests/browser/learning-workspace.mjs` verifies the real supplied source, recall, skill access, themes, agent selection, actual files/tasks/settings data, reload, and mobile layout.
- `tests/browser/workspace-browser.mjs` drives real Google and a temporary local page, actual DOM interaction, tabs, retained page text, and viewport resizing. It deletes its temporary HTML and retained test excerpt afterward. The real user-supplied Woblo source stays retained.
- Existing UI, artifact execution, smoke, lint, formatting, integration, and production build checks remain available. See each `test-results/` report for the tested URL and scope. Speech recognition still requires a real-speech check.

Run against the actual listening URL:

```powershell
$env:SIS_BASE_URL = 'http://localhost:5173'
npm run test:learning-ui
npm run test:workspace-browser
```
