# Durable knowledge and saved rules

Open **Learning Library → Retain knowledge** in the main app. Paste text or select
up to 50 files together. The supported-format list comes from the server, with
80+ extensions across text, code, structured data, Office, OpenDocument, EPUB,
PDF and SQLite. Each file may be at most 8 MiB; extracted text is limited to 2 MiB.
Individual failures are reported with the filename while successful files remain saved.

Text imports support UTF-8 and BOM-marked UTF-16. Office/OpenDocument/EPUB imports
extract readable text; XLSX retains worksheet/cell coordinates and resolves shared
strings. PDF imports retain page numbers and selectable text, with a 300-page limit.
Scanned PDFs require OCR first. Notebook imports retain cell text. SQLite imports
read tables without executing stored commands or modifying the database, with a
50-table and 2,000-row-per-table limit. Large databases must be exported in selected
parts. JSON/JSONL vector-database exports are retained as source text; their supplied
embedding numbers are not interpreted as embeddings from a configured model.
Proprietary database engines and remote vector services are not connected.

Canonical source records live in `data/learning-library/source-*.json` (or the
configured `SIS_DATA_DIR`). Atomic replacement protects source saves. Each record
preserves the extracted content, SHA-256, provenance and chunk citations. A derived
`knowledge-vectors.sqlite` stores normalized sparse word/character vectors for every
chunk. Search fuses lexical and cosine-vector ranks. These are local text-feature
vectors, not neural embeddings or model-weight training. Source JSON rebuilds the
index on restart, including after the derived database has been removed. If the
index cannot be written, the UI reports that condition and in-memory retrieval
continues from canonical text.

Every normal main-app chat turn searches retained references automatically, within
a bounded prompt budget. The model can call `recall_knowledge` for more material.
Reference content is supplied as untrusted cited data. It does not gain authority
to change runtime instructions. This improves access to context; finite model
context and retrieval relevance still limit what any particular reply can use.

Use **Edit source** to update retained text, rename it, or mark it as a saved rule.
The source keeps its identity, increments its revision, replaces its searchable
content, and invalidates old recall checks. A stale digest rejects conflicting
saves using both content digest and revision, instead of overwriting a newer version. **Export text** downloads the edited
text. Edits affect the retained copy; original uploaded or workspace documents are
not rewritten or converted back to their binary format. Old revisions are not kept
as an undo history. **Forget source** removes the canonical record and vector rows.

Check **Save pasted text as a rule for future chats**, mark an existing source as a
rule, or say **Remember this rule: …** in chat. Explicit user notes and rules are
included across conversations within a prompt budget; ordinary document imports
remain references. Current user instructions override stored preferences. Inspect
the full retained content before changing a rule. The model has `inspect_knowledge`
and `edit_knowledge` tools for requested corrections.

Verification:

```powershell
npm run test:unit
npm run lint
$env:SIS_BASE_URL='http://localhost:3019'
npm run test:knowledge-ui
npm run test:browser
```

The dedicated browser check imports 35 actual files of distinct supported types,
then searches, edits, saves a rule, reloads and rejects a stale write in real Chrome.
Unit checks also cover restart reconstruction, 40 file types, Office/OpenDocument,
EPUB, PDF, SQLite records, malformed input and forgotten-vector removal. These checks
verify storage and retrieval behavior, not model intelligence or guaranteed recall.
The focused context check uses a local scripted provider to inspect the real model
request in two independent conversations. It verifies automatic reference and rule
delivery even when the user does not mention memory. It restores provider settings
and removes its own sources and conversations afterward. Use an isolated backend;
the check refuses to replace an existing saved provider secret.
