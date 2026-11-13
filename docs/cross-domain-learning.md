# Learning across tasks

Open **Learning Library → Explore & learn** in the main app. Add a topic from any
field, optionally supply reference URLs, and start a study. There is no fixed list
of supported subjects. The configured model generates the questions, search
queries, practical tasks and related topics for the request.

Enable **Also study up to two related topics** to branch into new tasks after the
initial study finishes. Each branch is a real research job with its own sources
and notes; branches do not recursively start more jobs. Otherwise related topics
remain suggestions you can choose. Several unrelated studies can share the queue.

Each study:

1. Builds a topic-specific learning plan.
2. Discovers references, or reads your selected references directly.
3. Retains the actual readable excerpts, source URLs, source digests and synthesis.
4. Proposes practical applications and related topics.
5. Makes the retained knowledge available to normal chat retrieval.
6. Lets you apply it in chat and record concrete outcomes, including failures.

The **Apply in chat** action starts a request using that study. **Record an
application** saves what actually happened on a new task. These records remain
user-reported or runtime-reported observations; they are not silently promoted to
independently verified mastery. Questions, proposed practice, reading, reasoning,
tool execution and real-world performance remain distinct.

Recent chat tasks are noticed locally and shown as possible learning topics.
They are not automatically submitted to public search. Only explicitly requested
studies and their selected related branches use the network. The existing internet
learning loop now consumes this queue instead of choosing from a fixed set of
coding/3D queries. Source snippets no longer become mandatory operating rules;
legacy `web_research` rules are excluded from active prompt rules.

Browser and file access settings control source learning. Public source reads pin
connections to validated public DNS answers, check each redirect, cap response
bytes and time, and reject unsupported binary content. Full HTML is cleaned before
text truncation, so large script/style sections do not displace the actual article.
Unreadable pages and model errors remain visible as gaps or failed studies.

## Hands-on review on November 4, 2026

The running main app was operated through its real browser interface, using the
configured `gemma4:31b` model on Ollama and live internet source pages. Inference,
searches and source content were not mocked. An isolated data directory and local
identity fixture were used; production Sleek sign-in was outside this review.

Seven study jobs completed across music theory, photography and SQL, including two
related music topics discovered and researched by the learner itself. One Nikon
reference returned HTTP 403 and remained a failed study. A photography study using
a different readable reference completed. An introductory music source honestly
left detailed rules unanswered; a later first-species source supplied those rules.

The live review found that truncating raw HTML before extraction lost useful
article text. After fixing the reader, a new photography study recovered the
aperture and constant-framing discussion that the earlier notes had omitted.

Three fresh applications were read and manually assessed in chat:

| New task                                          | Observed answer                                                                                                                            | Assessment                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Running totals for amounts 10, 10, 20             | Default peer-inclusive frame: 20, 20, 40; deterministic explicit ROWS frame: 10, 20, 40.                                                   | Correct calculation and tie explanation, citing retained PostgreSQL notes. SQL was explicitly described as not executed. |
| Blurred portrait background, fixed focus distance | Choose f/2.8 over f/8; explain shallower acceptable focus and greater focus sensitivity.                                                   | Consistent with the retained photography reference. No camera-use claim.                                                 |
| Lower voice C3→D3, upper voice G3→A3              | Identify parallel perfect fifths; reject them in strict first species; replace A3 with F3 for contrary motion and a consonant minor third. | Correct interval analysis and a valid local alternative. No claim of composing or performing a complete piece.           |

References checked during the review were the
[PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial-window.html),
[Cambridge in Colour depth-of-field tutorial](https://www.cambridgeincolour.com/tutorials/depth-of-field.htm),
and [Open Music Theory first-species chapter](https://openmusictheory.github.io/firstSpecies.html).
The findings establish these observed applications, not general intelligence gains.

The SQL application was saved through the UI as a reported learning experience.
After review, 19 genuine source/note/experience records and seven completed studies
were imported into the regular `data/learning-library/` and `data/task-learning.json`
stores without replacing existing records. Failed studies and identity fixture data
were not imported. Restart the normal app to load the updated runtime and curriculum.
Studies and chat responses survived reload; the earlier studies also survived a
backend restart. The review's retained notes, source excerpts, experiences and chat
are under `data/learning-live-review/`. Screenshots are under
`test-results/cross-domain-live/`. The browser review tab remains available for
inspection while its local review backend runs.

## Developer checks

The full unit suite passed 170 tests with one Windows file-symlink test skipped.
Focused regressions additionally covered arbitrary non-coding fields, source
retention, local-only task observation, reported failures, access revocation,
bounded related-topic exploration and mixed/private DNS answers. Lint, build, and
the Chrome security/learning runner passed; that runner also invokes the existing
`npm run test:browser` smoke suite.

```powershell
npm run test:unit
npm run lint
npm run build
npm run test:security-learning
```

For another interactive review, `node scripts/diagnostics/serve-learning-review.mjs`
starts the isolated backend and local identity fixture. Its private launch URL is
written to `data/learning-live-review/review-session.json`. This helper starts an
app for direct interaction; it does not generate canned study or model results.
