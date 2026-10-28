# Conversation memory and action recovery

Requests are now written to durable conversation storage **before inference**.
Each accepted request has a stable ID. Its actual assistant response, tool
results, and completion/error status are saved together. A disconnected browser
or failed provider cannot erase the original request. Replaying the same request
ID does not rerun its actions; explicit retries use a new ID. Concurrent turns
within one conversation are rejected rather than reordered.

Streaming, non-streaming fallback, and missing-tool recovery receive the same
conversation transcript and tool definitions. A text-only response to an action
gets one model repair attempt before reporting a failure. The runtime never
treats a proposal as executed work. Failed proposals and error messages remain
available to the next turn and after reload.

Short continuations such as “Yes,” “continue,” and “try again” resolve against
the latest substantive user request. The original request remains in bounded
model context even after it falls outside the recent conversation tail. Recent
corrections and actual tool outcomes remain separate from the original goal.
The full transcript is stored on disk; this is contextual retrieval, not training
model weights. Existing `search_chat_history` and `get_chat_history` tools are now
exposed to the main chat for retrieving older material. Without an explicit ID,
history retrieval prefers the active conversation.

Say **“Remember that …”** to retain an explicit user note across chats. Notes are
stored as exact, user-provided sources in Learning Library. They are not
independently verified facts. Inspect and forget them from **Learning Library →
Sources**. **Learning Library → Conversation memory** shows the saved original
request, current task, unfinished attempts, and retained personal notes. Removing
a note removes it from future personal-memory context; existing transcript text
still records what was said.

Multi-file project fixes preserve workspace-relative paths in file results,
artifact links, previews, and stored conversation artifacts. A missing file no
longer silently resolves to an unrelated file with a similar name. Saving a file
does not execute a partial module or claim passing tests: project builds and
regression tests run as explicit tool actions after required files exist.

Conversation writes use atomic replacement. Invalid IDs and damaged JSON are
rejected without overwriting the damaged record. Client history is reconciled
with the durable transcript rather than replacing it with a short client tail.

## Verification

`npm run test:memory-ui` uses a clearly identified, scripted OpenAI-compatible
provider to reproduce a missing-action response and an SSE failure. The real
app then reloads, accepts “Yes,” writes three project files, runs their real Node
test, loads the nested project in Chrome, and checks keyboard interaction. It
also checks personal-note recall in a different chat and the memory inspector.
This tests runtime behavior, not the intelligence or quality of the fixture.

The test restores provider settings and removes its own conversations, notes,
and project files. It refuses to overwrite a pre-existing saved provider key.
Use an isolated backend for that situation. A separate normal-provider check is
recorded in `test-results/conversation-memory/live-model-check.json`.

```powershell
npm run test:unit
$env:SIS_BASE_URL='http://localhost:3009'
npm run test:memory-ui
npm run test:runtime
npm run build
```

The originally affected chat's missing user request was recovered from the
user-supplied screenshot, with provenance attached. Its prior transcript was
backed up in `data/conversation-recovery/`. Recovery did not execute the game
request or invent a successful build.
