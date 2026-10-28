import test from 'node:test';
import assert from 'node:assert/strict';
import { injectImportmapIfNeeded } from '../../server/workspace/preview-importmap.js';
const read = (html) => JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
test('local core and addon bare imports resolve to the same installed Three.js', () => {
  const result = injectImportmapIfNeeded(
    '<html><head></head><script type="module">import {RoomEnvironment} from "/vendor/three/examples/jsm/environments/RoomEnvironment.js";</script></html>',
  );
  assert.equal(read(result).imports.three, '/vendor/three/build/three.module.js');
  assert.equal(read(result).imports['three/addons/'], '/vendor/three/examples/jsm/');
  assert.doesNotMatch(result, /three@0\.170/);
});
test('explicit project mappings, scopes, and unrelated imports survive preview', () => {
  const mapping = {
    imports: { three: 'https://example.test/three/build/three.module.js', custom: '/custom.js' },
    scopes: { '/demo/': { custom: '/demo/custom.js' } },
  };
  const result = read(
    injectImportmapIfNeeded(
      `<HEAD><script type='importmap'>${JSON.stringify(mapping)}</script></HEAD>`,
    ),
  );
  assert.equal(result.imports.three, mapping.imports.three);
  assert.equal(result.imports['three/addons/'], 'https://example.test/three/examples/jsm/');
  assert.equal(result.imports.custom, '/custom.js');
  assert.deepEqual(result.scopes, mapping.scopes);
});
test('ordinary pages and invalid explicit import maps remain unchanged', () => {
  const plain = '<html><head></head><body>Invoice</body></html>';
  assert.equal(injectImportmapIfNeeded(plain), plain);
  const invalid = '<script type="importmap">invalid three map</script>';
  assert.equal(injectImportmapIfNeeded(invalid), invalid);
});
