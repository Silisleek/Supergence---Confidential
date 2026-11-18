import test from 'node:test';
import assert from 'node:assert/strict';
import { AstParser } from '../../server/lsp/ast-parser.js';

test('Tree-sitter extracts typed declarations and scopes after large prefixes', () => {
  const code = [
    '/* fake example: function ghost() {} */',
    '// large Unicode comment: 🛰'.repeat(1000),
    'export class Pipelines extends Registry {',
    '  static async run(input: number) {',
    '    return input * 2;',
    '  }',
    '}',
    'const calculate = (value: number) => value + 1;',
    'export { calculate as evaluate };',
  ].join('\n');
  const result = AstParser.extractSymbols(code, 'ts');
  assert.deepEqual(
    result.exports.map((symbol) => symbol.name),
    ['Pipelines', 'evaluate'],
  );
  assert.equal(result.classes[0].superClass, 'Registry');
  assert.deepEqual(result.classes[0].methods[0], {
    name: 'run',
    params: ['input: number'],
    isAsync: true,
    isStatic: true,
    line: 4,
    endLine: 6,
  });
  assert.deepEqual(
    result.functions.map((symbol) => symbol.name),
    ['calculate'],
  );
});
