import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySourceRepairs,
  bindCreationControls,
} from '../../server/services/browserArtifactBuilder.js';
const source =
  '<!DOCTYPE html><html><body><script>const total=1; const tax=2;</script></body></html>';
test('source repair changes exact code while preserving the runnable document', () => {
  const revised = applySourceRepairs(source, [
    { search: 'const total=1;', replace: 'const total=3;' },
  ]);
  assert.match(revised, /const total=3; const tax=2;/);
  assert.match(source, /const total=1;/);
});
test('control bindings connect actual unique DOM controls without replacing code or duplicate controls', () => {
  const source =
    '<!doctype html><html><body><button data-testid="orbit-view">Orbit</button><button id="roof">Roof</button><button data-testid="remove">A</button><button data-testid="remove">B</button><script>document.querySelector("#orbit-view").onclick=()=>42;</script></body></html>';
  const result = bindCreationControls(source);
  assert.match(result.html, /data-testid="orbit-view" id="orbit-view"/);
  assert.match(result.html, /id="roof" data-testid="roof"/);
  assert.doesNotMatch(result.html, /\sid="remove"/);
  assert.match(result.html, /document.querySelector\("#orbit-view"\).onclick=\(\)=>42;/);
  assert.equal(result.bindings.length, 2);
});
test('missing or ambiguous edits cannot silently patch a different region', () => {
  assert.throws(
    () =>
      applySourceRepairs(source, [
        { search: 'const total=1;', replace: 'const total=3;' },
        { search: 'missing();', replace: '' },
      ]),
    /exactly once/,
  );
  assert.throws(
    () => applySourceRepairs(source, [{ search: 'const ', replace: 'let ' }]),
    /exactly once/,
  );
});
test('invalid JavaScript and incomplete documents are rejected before saving', () => {
  assert.throws(
    () => applySourceRepairs(source, [{ search: 'const total=1;', replace: 'const total=;' }]),
    /rejected before saving/,
  );
  assert.throws(
    () => applySourceRepairs(source, [{ search: '</html>', replace: '' }]),
    /Incomplete HTML/,
  );
});
test('repeated edits stay inside explicit unique scope and preserve neighboring functions', () => {
  const html =
    '<!doctype html><html><script>function other(){scene.add(a);}function details(){scene.add(b);scene.add(c);}details();</script></html>';
  const revised = applySourceRepairs(html, [
    {
      scope: { start: 'function details(){', end: '}details();' },
      all: true,
      search: 'scene.add(',
      replace: 'assembly.add(',
    },
  ]);
  assert.match(revised, /function other\(\)\{scene.add\(a\);\}/);
  assert.match(revised, /assembly.add\(b\);assembly.add\(c\)/);
  assert.throws(
    () => applySourceRepairs(html, [{ all: true, search: 'scene.add(', replace: 'assembly.add(' }]),
    /explicit unique scope/,
  );
  assert.throws(
    () =>
      applySourceRepairs(html, [
        {
          scope: { start: 'function ', end: '}details();' },
          all: true,
          search: 'scene.add(',
          replace: 'assembly.add(',
        },
      ]),
    /exactly once/,
  );
  assert.throws(
    () =>
      applySourceRepairs(html, [
        {
          scope: { start: '}details();', end: 'function details(){' },
          search: 'scene.add(',
          replace: 'assembly.add(',
        },
      ]),
    /reversed or overlapping/,
  );
});
