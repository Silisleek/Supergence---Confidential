# Evolution Studio

Open the sparkle icon in the app sidebar at http://localhost:3009/, or choose
**Evolution & system settings** in Preferences. This is part of the main app.

## Build and improve

Describe a capability in chat. The runtime exposes `propose_evolution`,
`inspect_evolution`, `revise_evolution`, and `verify_evolution`. Proposals contain
real files, rationale, regression tests, and browser assertions. Files remain in
`data/evolution/staging/` until the user applies the exact verified revision.

The studio shows complete before/after contents, test output, browser assertions,
and a screenshot from Chrome. Review the source before checking the local test
execution checkbox. **Tests execute on this computer with a reduced environment;
this is not an OS security sandbox.** No dependencies are installed automatically.
The built-in regression runner supports Node's test runner. Other languages can
be project files, but their build/test tools need additional integration; they
are not automatically verified by a JavaScript syntax check.

Targets are `client/`, `server/extensions/`, `workspace/projects/`, and `docs/`.
For UI changes include a self-contained HTML preview and browser checks. Browser
verification serves the staged preview through a temporary loopback server,
blocks external requests, and checks the supplied selectors, interactions, and
expected text in Chrome. It does not exercise a production backend or prove
visual quality, security, accessibility, or full test coverage. Review the actual
app after applying client changes and reload it with **Reload updated app**.
Core server architecture replacements require manual integration and restart;
extension architectures can be proposed and reviewed here.

Application checks content hashes against the original source. Changes that
would overwrite subsequent edits are rejected. Before contents are durably
retained in the proposal record for rollback. Rollback also refuses to overwrite
newer edits. Interrupted application recovers matching partial writes on restart.
The maximum verification attempts per proposal is configurable from 1–5.
Chat tool steps default to 24 and output tokens to 16,384 per main agent step;
settings allow 4–64 steps and 1,024–65,536 output tokens. The selected provider
must support the chosen output budget. Larger budgets can increase usage.

## Tools and operating rules

For a tool proposal set `kind: "tool"` and `toolEntry` to an included
`server/extensions/name.mjs`. Export a default descriptor:

```js
export default {
  name: 'your_tool_name',
  description: 'What the tool actually does',
  parameters: { text: 'string' },
  execute: async ({ text }) => ({ length: text.length }),
};
```

Include meaningful Node tests of the tool. User approval imports the extension
on the server and registers it immediately for agent use. This is trusted local
code after review, not isolated execution. Existing tool names cannot be replaced.
Applied extensions restore on restart only when all their reviewed file contents
match. A changed or broken extension is quarantined. Rollback unregisters it.
Use self-contained modules; changes to imported dependencies can require restart
because of Node's module cache.

For operating guidance use `kind: "rule"` with `rule`. Accepted rules enter future
chat context. They remain subordinate to current user instructions and security
policy. Rollback removes the rule. Retained knowledge and REA evidence continue
to use Learning Library, with exact source citations. This changes runtime
context and memory, not model weights or general intelligence.

## Research and initiative

System settings controls capability-gap ideas, task-specific working roles,
background research, and repair budgets. Initiative currently observes the
current chat request and stages capability ideas; it does not silently run
unbounded background model calls or rewrite the application. Working roles adapt
methods while preserving the Supergence identity.

Enable background research to use `queue_research` or the Research tab. One job
runs at a time while chat can continue. Jobs report queued, running, completed,
failed, or interrupted states. The researcher performs live searches, reads
available source excerpts, and requests source-bound synthesis. Search snippets,
retrieval failures, and source claims are identified explicitly. Research results
are retained in Learning Library. No confidence percentage or independent
verification is invented. Use `inspect_research` to retrieve results in chat.

REA is already bound through `read_learning_skill`, `reverse_engineer_artifact`,
and `capture_reference_feature`. The installed adapter supports selected
JavaScript application trees and ASAR artifacts. Native engines and universal
artifact coverage are not supplied by this adapter.

## Providers and connectors

System settings saves an OpenAI-compatible endpoint, model, and API key as the
server default. Existing per-conversation BYOK overrides take precedence. Remote
endpoints require HTTPS; HTTP is permitted for loopback providers. **Test saved
provider** checks its models endpoint and reports measured time; it does not
prove generation or tool-call compatibility.

Provider and Composio project keys are encrypted with AES-256-GCM in local
settings. The generated decryption key is stored beside them on this machine;
this is local at-rest encryption, not an OS keychain or protection against a
process with the same user's filesystem access. Keys are omitted from settings
read responses. Leave key fields empty to preserve stored keys. Environment
`COMPOSIO_API_KEY` is also supported.

Composio uses its [v3.1 session API](https://docs.composio.dev/reference/api-reference/tool-router).
Configure a project key, user ID, and explicit toolkit allowlist, then create a
session or supply an existing session ID. Authorize app accounts in your Composio
project. Session creation disables instant usage, proxy execution, and workbench.
`composio_discover` reads real schemas; `composio_request_action` stages exact
arguments. The user accepts or declines the external action in Security activity.
Only that session's app tools are supported; generic meta tools are rejected.
An uncertain external result is never retried automatically. Live connector
access depends on your credentials, toolkit permissions, and upstream service.

## Security activity

The monitor appends actual action metadata without raw arguments to
`data/evolution/actions.jsonl`. It screens actions routed through RuntimeAccess
and records registry results and studio decisions. Configured high-risk patterns
(credential files, destructive commands, downloaded execution, and live source
modification) require review even in Full access. Alerts stream to the app over
SSE. Use Access settings to disable files, terminal, or browser access.

This is a heuristic monitor of instrumented paths, not verification of every OS
operation, a malware detector, or a security proof. Existing direct service paths
and arbitrary approved code can have effects outside this monitor. Evolution
mutations require a loopback, same-origin UI capability and reject foreign Host
headers. This prevents browser cross-origin mutations; it is not authentication
against local programs that already have terminal or filesystem access.

## Verification

```powershell
npm run test:unit
$env:SIS_BASE_URL='http://localhost:3009'
npm run test:evolution-ui
npm run build
```

Browser evidence is saved in `test-results/evolution-studio/`. The browser test
stages, verifies, applies, and rolls back an explicitly identified QA project.
Its microphone check starts a real fake-device audio stream and exercises the
final-transcript callback. Actual speech transcription remains unverified.
