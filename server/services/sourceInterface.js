import { parse } from 'acorn';

// Preserve observed API signatures when paging completed source out of context.
// These excerpts are metadata, never replacement implementation or inferred API.
export function sourceInterface(source) {
  let tree;
  try {
    tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch {
    return null;
  }
  const excerpts = [];
  const keys = (object) =>
    object.properties
      .map(
        (property) =>
          property.key?.name ||
          (typeof property.key?.value === 'string' ? property.key.value : null),
      )
      .filter(Boolean);
  const objectReturns = (node) => {
    if (!node || typeof node !== 'object') return;
    if (
      [
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
        'ClassDeclaration',
      ].includes(node.type)
    )
      return;
    if (node.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression')
      excerpts.push(`observed object return keys: ${keys(node.argument).join(', ')}`);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(value)) value.forEach(objectReturns);
      else if (value && typeof value === 'object') objectReturns(value);
    }
  };
  const signature = (node) => {
    if (!node) return;
    if (node.type === 'FunctionDeclaration') {
      excerpts.push(source.slice(node.start, node.body.start).trim());
      objectReturns(node.body);
    } else if (node.type === 'ClassDeclaration') {
      excerpts.push(source.slice(node.start, node.body.start).trim());
      for (const method of node.body.body) {
        if (method.type === 'MethodDefinition')
          excerpts.push(source.slice(method.start, method.value.body.start).trim());
      }
    } else if (node.type === 'VariableDeclaration') {
      for (const declaration of node.declarations) {
        const value = declaration.init;
        const end =
          value && ['ArrowFunctionExpression', 'FunctionExpression'].includes(value.type)
            ? value.body.start
            : declaration.id.end;
        excerpts.push(source.slice(declaration.start, end).trim());
        if (value?.type === 'ObjectExpression')
          excerpts.push(`declared object keys: ${keys(value).join(', ')}`);
      }
    }
  };
  for (const node of tree.body) {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration')
      excerpts.push(source.slice(node.start, node.end));
    else if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
      excerpts.push(`export${node.type === 'ExportDefaultDeclaration' ? ' default' : ''}:`);
      if (node.declaration) signature(node.declaration);
      else excerpts.push(source.slice(node.start, node.end));
    }
  }
  if (!excerpts.length) return null;
  const text = excerpts.join('\n');
  return {
    excerpts: text.slice(0, 6000),
    truncated: text.length > 6000,
    note: 'Observed import/export and method signatures from the saved source. Bodies and values omitted; these excerpts are not executable source. Reread exact implementation lines only when needed.',
  };
}
