// SIS 1.0 — Oracle Synthesis
//
// The gap this module closes: SkillVerifier can only reach OBSERVED when a
// test script asserts against expected values it did not copy from the
// candidate. Nothing in this repo generated such a script for a stored skill,
// so every verification (and every autonomous cycle whose benchmark suite
// failed to synthesise) fell back to differential agreement or a syntax check
// and was graded INFERRED.
//
// What this module will and will not do:
//
//   WILL  lift expected values that the record itself states as a contract —
//         `assert.deepStrictEqual(f(...), <literal>)`, `expect(...).toBe(<literal>)`,
//         and the two-column `input → expected` table the recipes use.
//   WILL  emit those as a Node script that deep-equals against the literal and
//         prints the `{"passed":N,"total":M}` line parseTestOutput accepts.
//   WON'T invent an expected value. A function with no stated contract yields
//         no suite, and the caller must record INFERRED/UNKNOWN.
//   WON'T assert "it did not throw", "it returned something", or compare the
//         candidate against its own output. Those are the vacuous shapes E-02
//         removed from the gym and they must not come back through this door.
//
// Provenance is returned with the suite so the Evidence record can say where
// each expected value came from. A suite lifted from a recipe's own table is
// evidence about the recipe's stated contract; it is not evidence that the
// contract is the right one for the problem. That distinction lives in the
// caller's residualUnknown, not in the reward.

export const ORACLE_SOURCE = Object.freeze({
  ASSERTION: 'EXPLICIT_ASSERTION',
  TABLE: 'RECIPE_EXAMPLE_TABLE',
  NONE: 'NONE',
});

// A literal we are willing to treat as an expected value: a JS scalar, an
// array/object of scalars, or a quoted string. Anything with an identifier, a
// call, or an operator is not a literal and is rejected rather than guessed at.
const LITERAL_RE =
  /^(?:-?(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|true|false|null|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\[(?:[^\[\]]*)\]|\{(?:[^{}]*)\})$/;

function isLiteral(text) {
  const t = String(text || '')
    .trim()
    .replace(/;$/, '');
  if (!t || !LITERAL_RE.test(t)) return false;
  // A bracketed value must itself contain only literals.
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      // Parsing it is the strongest check available: if JSON.parse accepts it,
      // it is data and cannot hide a call to the candidate.
      JSON.parse(t.replace(/'/g, '"'));
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/** Names the candidate defines at top level, so a suite can bind to one. */
export function exportedSymbols(code = '') {
  const text = String(code || '');
  const names = new Set();
  for (const m of text.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of text.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
  for (const m of text.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g,
  ))
    names.add(m[1]);
  const exportsList = text.match(/module\.exports\s*=\s*\{([^}]*)\}/);
  if (exportsList) {
    for (const part of exportsList[1].split(',')) {
      const name = part.split(':').pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  for (const m of text.matchAll(
    /export\s+(?:default\s+)?(?:class|function|const|let)\s+([A-Za-z_$][\w$]*)/g,
  ))
    names.add(m[1]);
  return [...names];
}

/**
 * Lift `assert.deepStrictEqual(fcall, literal)` / `expect(fcall).toBe(literal)`
 * pairs. The call expression is preserved verbatim so the suite exercises the
 * same arguments the record claims; only the literal is trusted as expected.
 */
export function extractAssertions(text = '') {
  const out = [];
  const src = String(text || '');

  const deep =
    /assert(?:\.deepStrictEqual|\.deepEqual|\.strictEqual|\.equal)\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g;
  for (const m of src.matchAll(deep)) {
    const call = m[1].trim();
    const expected = m[2].trim().replace(/;$/, '');
    if (!/[\w$)\]]\s*\(/.test(call)) continue; // must actually call something
    if (!isLiteral(expected)) continue; // expected must be data
    out.push({ call, expected, source: ORACLE_SOURCE.ASSERTION });
  }

  const expectRe =
    /expect\s*\(\s*([^)]+?)\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\s*\(\s*([^)]+?)\s*\)/g;
  for (const m of src.matchAll(expectRe)) {
    const call = m[1].trim();
    const expected = m[2].trim();
    if (!/[\w$)\]]\s*\(/.test(call)) continue;
    if (!isLiteral(expected)) continue;
    out.push({ call, expected, source: ORACLE_SOURCE.ASSERTION });
  }

  return dedupe(out);
}

/**
 * Lift the two-column `input → expected` tables the recipes use.
 *
 * Only rows where both cells are unambiguous literals are kept. A row like
 * `insert(5) | true` names a call; a row like `N=10 | O(log N)` does not, and
 * is dropped rather than interpreted.
 */
export function extractExampleTable(text = '') {
  const rows = [];
  const src = String(text || '');
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.length > 240) continue;
    if (/^\|?[\s:-]+\|/.test(line)) continue; // markdown separator
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    const [input, expected] = cells;
    if (!input || !expected) continue;
    // Reject header rows and prose.
    if (/^(input|args?|arguments?|call|case|expression|value)$/i.test(input)) continue;
    if (/^(output|expected|result|returns?|→)$/i.test(expected) === false && !isLiteral(expected))
      continue;
    if (!isLiteral(expected)) continue;
    if (!/[\w$)\]]\s*\(/.test(input)) continue; // input must be a call
    rows.push({
      call: input.replace(/\s*→\s*$/, '').trim(),
      expected,
      source: ORACLE_SOURCE.TABLE,
    });
  }
  return dedupe(rows);
}

function dedupe(cases) {
  const seen = new Set();
  return cases.filter((c) => {
    const key = `${c.call}::${c.expected}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build a runnable Node suite from explicit expected values.
 *
 * Returns null when no honest expected value exists — the caller must record
 * that as an unknown rather than proceed. Never returns a suite whose only
 * assertion is that the artifact loads.
 *
 * @returns {{testCode:string, cases:number, source:string, detail:Object[]}|null}
 */
export function synthesizeOracle({ code = '', recipe = '', name = '' } = {}) {
  const symbols = exportedSymbols(code);
  if (!symbols.length) return null; // nothing to bind a call to

  // Assertions embedded in the artifact itself are the strongest source: they
  // are the author's own stated contract.
  let cases = extractAssertions(code);
  let source = cases.length ? ORACLE_SOURCE.ASSERTION : ORACLE_SOURCE.NONE;

  if (!cases.length) {
    cases = extractAssertions(recipe);
    if (cases.length) source = ORACLE_SOURCE.ASSERTION;
  }
  if (!cases.length) {
    cases = extractExampleTable(recipe);
    if (cases.length) source = ORACLE_SOURCE.TABLE;
  }
  if (!cases.length) return null;

  // Keep only cases that name a symbol the artifact actually defines. A call to
  // something absent would fail for the wrong reason and score as a candidate
  // failure rather than a coverage gap.
  const relevant = cases.filter((c) =>
    symbols.some((s) => new RegExp(`\\b${escapeRe(s)}\\b`).test(c.call)),
  );
  if (!relevant.length) return null;

  const caseSource = buildCaseSource(relevant);
  return {
    testCode: buildSuite(code, relevant, caseSource),
    caseSource,
    cases: relevant.length,
    source,
    detail: relevant.map((c) => ({
      call: c.call,
      expected: c.expected,
      from: c.source,
      subject: name,
    })),
  };
}

/** The `[{ call, expected, run }]` literal, as source, for a suite's cases. */
export function buildCaseSource(cases = []) {
  return cases
    .map(
      (c) =>
        `    { call: ${JSON.stringify(c.call)}, expected: ${c.expected}, run: () => (${c.call}) }`,
    )
    .join(',\n');
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wrap the artifact so the suite can call it.
 *
 * The artifact is embedded as text and evaluated with `new Function`, which
 * means the suite runs the same bytes the corpus stored — not a re-typed
 * summary. Top-level `class` declarations are function-scoped, so the wrapper
 * re-exports every discovered symbol by name.
 */
function buildSuite(code, cases, caseSource = null) {
  // The case thunks are built INSIDE the artifact's function scope, so a
  // top-level `class Foo` is visible to `new Foo().bar()`. Building them
  // outside would reference an undefined name and score a correct artifact as
  // failing — a false negative that looks like an observation.
  const caseLines = cases
    .map(
      (c) =>
        `    { call: ${JSON.stringify(c.call)}, expected: ${c.expected}, run: () => (${c.call}) }`,
    )
    .join(',\n');

  // The artifact and the case source are embedded as JSON strings but used as
  // JavaScript source. JSON.stringify escapes " and \n, not $ and `, and this
  // file's own template literal would otherwise interpolate them. Escaping both
  // at the point of embedding keeps the generated file byte-stable.
  const artifactLiteral = JSON.stringify(code).replace(/\$/g, '\\$').replace(/`/g, '\\`');
  const casesLiteral = JSON.stringify(caseLines);

  return `
// Generated expected-output suite (SIS oracle-synth).
// Each case asserts against a value the record itself states. It does not
// compare the candidate against its own output and does not accept "did not
// throw" as a pass.
const ARTIFACT = ${artifactLiteral};

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return Number.isNaN(a) && Number.isNaN(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => deepEqual(a[k], b[k]));
};

const caseSource = ${JSON.stringify(caseSource || buildCaseSource(cases))};
let CASES = null;
let loadError = null;
try {
  const factory = new Function(ARTIFACT + "\\n;return [" + caseSource + "\\n];");
  CASES = factory();
} catch (e) {
  loadError = e && e.message ? e.message : String(e);
}

if (!CASES) {
  console.log(JSON.stringify({ passed: 0, total: ${cases.length}, oracle: 'EXPECTED_OUTPUT', error: loadError }));
  process.exit(1);
}

let passed = 0;
const failures = [];
for (let i = 0; i < CASES.length; i++) {
  const c = CASES[i];
  let actual;
  try {
    actual = c.run();
  } catch (e) {
    failures.push({ index: i, call: c.call, error: e && e.message ? e.message : String(e) });
    continue;
  }
  if (deepEqual(actual, c.expected)) passed++;
  else failures.push({ index: i, call: c.call, expected: c.expected, actual: String(actual) });
}

console.log(JSON.stringify({
  passed,
  total: CASES.length,
  oracle: 'EXPECTED_OUTPUT',
  failures: failures.slice(0, 5)
}));
process.exit(passed === CASES.length ? 0 : 1);
`;
}

export default {
  synthesizeOracle,
  extractAssertions,
  extractExampleTable,
  exportedSymbols,
  ORACLE_SOURCE,
};
