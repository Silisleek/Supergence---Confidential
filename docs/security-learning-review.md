# Security and learning review — November 4, 2026

This review covers the local HTTP/WebSocket authentication boundary, browser origins,
Sleek identity exchange, learning file permissions, exemplar promotion, and retained
knowledge retrieval. It is a targeted source review with regression tests, not a
complete penetration test or a certification that the application is vulnerability-free.

## Security fixes

| Finding                     | Before                                                                                                             | After                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private-session bypass      | Any sufficiently long bearer token, or a loopback socket, passed authentication.                                   | Only the exact private session secret passes constant-time validation. Loopback alone grants no session. HTTP and WebSocket use the same check.                                                                        |
| Identity impersonation      | A loopback request received a hardcoded owner identity, including after logout or expiry.                          | A real, unexpired identity session is required. No owner identity is synthesized.                                                                                                                                      |
| Identity-provider confusion | Request body substrings could select the authorization host; a failed exchange retried an unrelated local service. | Authorization and exchange use the same server-configured provider. Provider failures fail closed. Request bodies cannot select a provider.                                                                            |
| Cross-origin access         | Numerous local ports and arbitrary Silisleek subdomains passed the local boundary.                                 | Browser requests must use the exact application origin. The loopback Vite origin on port 5173 requires `SIS_ALLOW_VITE_ORIGIN=1`. Opaque preview origins retain their existing narrow bearer-protected file exception. |
| File permission bypass      | Learning HTTP endpoints could import workspace files or analyze artifacts while file access was disabled.          | These operations return 403 when file access is disabled, including case and trailing-slash variations accepted by Express. Pasted text and existing references remain available.                                      |

Open the private session link printed by `npm run server`, then connect a Sleek
account. Opening a bare localhost URL no longer silently signs in as an owner.
The default provider remains `https://silisleek.com`. `SILISLEEK_ORIGIN` may explicitly
configure another HTTPS provider or an HTTP loopback test provider; there is no
automatic fallback. This does not deploy the provider or establish that a real
production account has completed sign-in.

The November 4 dependency audit found **zero production dependency advisories** with
`npm audit --omit=dev`. The complete audit reported **19 moderate development-tooling
findings**, originating in transitive `minimatch` glob amplification and propagated
through ESLint/Electron packaging dependencies. npm proposed major downgrades rather
than a compatible update; these were not applied. The development-tooling findings
remain unresolved. See the [upstream advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Learning changes

- Retrieval uses BM25 term-frequency saturation and document-length normalization,
  existing local term/character sparse vectors, reciprocal rank fusion, and a
  maximal-marginal-relevance diversity pass. Exact duplicate excerpts no longer
  occupy multiple context slots. Source IDs, SHA-256 digests and line citations remain.
- `POST /api/learning/evaluate` and the workspace `evaluate_knowledge` tool accept up
  to 30 supplied source/question/expected-excerpt cases. They search the complete
  library and report recall at K, mean reciprocal rank, citations and source digests.
  Evaluation does not modify source records or grant verification status.
- Recall checks also search the complete library, so competing sources can cause a
  real failure. They store the expected excerpt, source digest and observed rank.
- The existing Learning Library panel now shows review scheduling and a **Review
  recall** action. Successful due reviews expand intervals through 1, 3, 7, 14 and
  30 days; failures schedule another review in one hour. Repeating a check before
  it is due does not advance the interval. Editing a source invalidates its prior
  recall results. Reviews run when requested; no background scheduler was added.
- Exemplar promotion requires the existing `hasPassingOracle` contract: an observed
  successful expected-output test, zero exit code, a positive finite reward, and
  every recorded test passing. Model scores alone cannot promote an example.
  The autonomous learner forwards its verification record. Fresh banks contain no
  seeded "verified" examples. Existing legacy records are excluded from verified
  retrieval/counts until they carry evidence. Exemplar keyword tokenization now
  splits on whitespace. Exemplar prompt material is escaped, quoted reference data.

These are retrieval, evaluation and evidence-quality changes. Local sparse vectors
are not neural embeddings. Spaced review measures a supplied excerpt's retrieval,
not independent factual truth or human memory. Neither retention nor exemplar
selection trains foundation-model weights. General intelligence or reasoning gains
have not been benchmarked, and no superintelligence claim is made.

The hybrid ranking approach is informed by published
[contextual retrieval work](https://www.anthropic.com/research/contextual-retrieval),
but this implementation does not generate contextual embeddings or use a neural
reranker. Authentication review follows the token-validation concerns described in
[OWASP API2](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/).

## Reproducing validation

Validation completed with 165 unit tests passing and one skipped Windows file-symlink
test (the current account cannot create file symlinks). Lint and the production build
passed. The build emitted an unresolved `/styles/sleek-workspace.css` warning; this
review did not change that stylesheet reference. Main-app Chrome checks and the
existing browser smoke suite passed. A final targeted exemplar regression also passed
after requiring keyword overlap to prevent unrelated same-domain examples from
entering prompts.

```powershell
npm run test:unit
npm run lint
npm run build
npm run test:security-learning
npm audit --omit=dev
npm audit
```

The security/learning browser runner starts the real backend with `npm run server`
on an isolated port and temporary data/workspace directories. Its explicitly local
identity-provider fixture validates the PKCE proof, issues one-use codes, and
exercises the real callback and identity-cookie paths. It does not weaken product
authentication or use a production account. It runs real Google Chrome checks on
the main app and then invokes the existing `npm run test:browser` smoke suite.

Browser evidence is saved under `test-results/security-learning/`, including desktop
and 390px screenshots, evaluation results and logs with the private session token
redacted. Unit regressions cover forged tokens, expiry, provider failure, duplicate
retrieval, competing-source failures, review persistence/reset and evidence-gated
exemplar selection. Test fixtures establish behavior; they are not an intelligence
benchmark or production learning content.
