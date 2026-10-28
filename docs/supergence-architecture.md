# How Supergence currently works

This describes the main app and its current execution path, rather than interpreting
the repository's brain-inspired module names as claims of biological intelligence.

The browser UI in `client/index.html` sends chat turns to the Express backend's
`/api/sis/unified-turn-stream` endpoint. The backend owns conversation persistence,
retrieval, tool authorization and execution. `sisUnifiedSystem.js` assembles context
and runs an agent/tool loop. `server/api/openrouter.js` calls the configured
OpenAI-compatible provider. During the October 27, 2026 verification, the configured
model alias was `opus-4.6`, routed through the local gateway at port 20128. That is
the configured alias; this audit does not establish the router's underlying model
identity or training procedure.

## One turn from input to output

1. `ConversationTurns` assigns request/conversation IDs, reconciles the durable
   transcript with client history, and saves the user's message before inference.
2. `conversationContext.js` preserves the original task, interprets short
   continuations, and selects recent messages within a character budget.
3. The Learning Library searches imported source chunks for the current query.
   Explicit saved notes/rules enter a separate bounded context block.
4. `buildWorkspacePrompt` combines runtime access rules, conversation context,
   creation guidance, user notes/rules, approved evolution rules, and cited evidence.
5. A task-specific subset of the registered tool schemas is offered to the model.
6. The model produces text or a tool call. The runtime checks access and executes
   actual tools. Results return to the model; tool starts/results are checkpointed.
7. Action tasks receive a model-based completion review. This can request further
   work, but it is not an independent proof that the answer or implementation is
   correct. Behavioral tests remain separate evidence.
8. The final response, status, tool outcomes and artifacts are stored. Streaming
   and fallback requests retain conversation context and tool definitions.

Repeated request IDs replay saved outcomes instead of deliberately repeating
completed actions. Interrupted/uncertain actions require reconciliation. Recovery
has bounded retries; it does not guarantee that every external side effect can be
reconstructed after every failure.

## The main app's RAG implementation

RAG means retrieval-augmented generation: retrieve relevant retained text, place it
in the model request, and have the model generate an answer from that evidence.

**Import.** `knowledgeFormats.js` supports 83 extensions. Text/code formats are
decoded as text. Office/OpenDocument/EPUB formats use bounded ZIP/XML text
extraction. PDF.js extracts selectable PDF text, including page labels. SQLite
imports read table rows without executing supplied SQL scripts. Images and scanned
PDFs require a separate OCR/text preparation step. Supported extensions do not
imply full round-trip editing or faithful document-layout reconstruction.

**Canonical retention.** `learningLibrary.js` stores source JSON containing exact
retained text, title, provenance, SHA-256, revision, and recall-check metadata.
Atomic file replacement protects individual source saves. Edits require both the
current digest and revision, so stale edits are rejected. Content is split around
2,800 characters into source chunks with line ranges and citation IDs. Chunks do
not currently use semantic boundary detection or overlap.

**Vector representation.** `knowledge-index.js` creates sparse normalized vectors
from lowercased words and character trigrams. Word features have weight 1 per
occurrence; character trigram features have weight 0.2 per occurrence. These are
deterministic text features, not neural embeddings from an embedding model.

**Persistent index.** `knowledge-vectors.sqlite` stores chunk IDs, source IDs,
digests, and vector JSON in a SQLite table. New/edited/forgotten sources update
their rows. The source JSON rebuilds the derived index on process restart.
Similarity scoring runs in JavaScript over in-memory entries. SQLite provides
persistence here; there is no HNSW/ANN search extension or remote vector service.

**Retrieval.** For each query, the library ranks chunks using both a lexical
term-frequency/rarity score and cosine vector similarity. Reciprocal rank fusion
combines those rankings with a rank constant of 60. The lexical scorer in this
main library is not the separate legacy BM25 implementation. Default retrieval
returns up to five chunks within 10,000 text characters. The model can call
`recall_knowledge` for further targeted retrieval.

**Generation and attribution.** Retrieved excerpts enter `<reference_evidence>`
as untrusted data with exact source/chunk IDs, digests and line ranges. The model
is asked to cite them and disregard embedded commands. Prompting reduces risk;
it cannot certify universal resistance to prompt injection or factual errors.
Retention establishes what a source said, not whether its claims are true.

## Memory and learning are several separate mechanisms

| Mechanism                                         | Purpose                                                                             | Limits                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Conversation JSON                                 | Full transcript, requests, outcomes, recovery checkpoints                           | Only a bounded selection enters each model call.                                                                                     |
| Learning Library sources                          | Imported references and editable retained text                                      | Relevance depends on retrieval; originals are not overwritten.                                                                       |
| Explicit user notes/rules                         | Preferences and instructions saved across chats                                     | Up to 20 recent records, each excerpted to 2,000 characters, within an 8,000-character JSON budget. Older records remain searchable. |
| Legacy short/long-term memory and knowledge graph | Hierarchical memory records, tag/entity relationships and graph traversal           | Separate components, not one unified vector database. Their existence does not prove every node enters main-chat context.            |
| Evolution Studio                                  | Staged changes, tests, user-approved operating rules and verified tool installation | Application requires the Studio's actual review/verification flow. It does not retrain the underlying language model.                |

The legacy `hybrid-search.js` uses BM25 plus TF-IDF/cosine ranking and is connected
to memory trees and graph-based retrieval. It is separate from the newer Learning
Library index. Neither handcrafted vector representation is a neural semantic
embedding model. The ordinary archive search also retains a default 25-file
candidate cap; full transcripts being saved does not mean unlimited cross-chat
retrieval is implemented.

"Learning" currently means retaining sources and preferences, recording observed
outcomes, and optionally installing reviewed rules/tools/code. It does not mean
online gradient training or modification of provider model weights. Saved rules
are model instructions with current-user/security precedence, not deterministic
guarantees that every answer satisfies every preference.

## Live verification on October 27, 2026

`tests/browser/live-knowledge-chat.mjs` used real Chrome and the configured real
provider, without a scripted model response. Its seven checks passed:

- Imported facts were answered with a correct source citation.
- A follow-up correctly resolved the project and escalation code.
- Chat retained an explicit rule.
- A fresh conversation used the saved rule and source.
- Chat executed `edit_knowledge`; disk content and revision were checked.
- After browser reload, a fresh conversation returned the corrected facts.
- The model reported an unspecified on-call owner rather than inventing a name.

The captured answers and actual tool results are in
`test-results/live-knowledge-chat/results.json`. These were explicitly labeled
verification-only project records, removed with their conversations afterward.

One observed limitation: the edit confirmation did not start with the requested
prefix, although the subsequent recalled answers did. Passing the seven scoped
checks does not prove perfect rule compliance. Initial Chrome interaction also
timed out; a subsequent run using reduced-motion preferences completed. The unit
suite had one external REA analyzer failure; that test passed on an isolated rerun.
These observations prevent an honest claim that everything works perfectly.

The subsequent complete unit-suite rerun passed 121 tests with one Windows symlink
test skipped. The main-app browser smoke test and lint also passed. Verification
also reproduced an active-conversation deletion error (HTTP 500 after deleting
the file): `Brain.setConversation(null)` attempted to validate null as a disk ID.
The reset path was corrected to treat null as an empty conversation; the dedicated
`tests/browser/conversation-deletion.mjs` checks the response, disk removal and
cleared focus state without requiring model inference. That regression passed
against the restarted server, and the final unit run again passed 121 tests with
one Windows symlink test skipped.

Future improvements would include neural embeddings for meaning-based matches,
query rewriting for ambiguous follow-ups, semantic/overlapping chunking, an ANN
index for larger collections, explicit archive indexing, rule conflict/scoping
management, and broader retrieval/answer-quality evaluation. They are not implied
to exist by the current implementation.
