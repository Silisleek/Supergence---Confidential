import treeSitter from '@vscode/tree-sitter-wasm';
import { fileURLToPath } from 'node:url';

const { Language, Parser } = treeSitter;
await Parser.init();

const parsers = new Map(
  await Promise.all(
    ['javascript', 'typescript', 'tsx', 'python'].map(async (language) => {
      const grammarUrl = import.meta.resolve(
        `@vscode/tree-sitter-wasm/wasm/tree-sitter-${language}.wasm`,
      );
      const parser = new Parser();
      parser.setLanguage(await Language.load(fileURLToPath(grammarUrl)));
      return [language, parser];
    }),
  ),
);

const languageAliases = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
};

function location(node) {
  return { line: node.startPosition.row + 1, endLine: node.endPosition.row + 1 };
}

function functionSignature(node, name) {
  const params = node.childForFieldName('parameters');
  const param = node.childForFieldName('parameter');
  return {
    name,
    params: params ? params.namedChildren.map((child) => child.text) : param ? [param.text] : [],
    isAsync: Boolean(node.children.find((child) => child.type === 'async')),
    ...location(node),
  };
}

function declaration(node) {
  return node.type === 'decorated_definition' ? node.childForFieldName('definition') : node;
}

export class AstParser {
  static extractSymbols(sourceCode = '', language = 'javascript') {
    const symbols = { functions: [], classes: [], imports: [], exports: [], variables: [] };
    const parser = parsers.get(languageAliases[language.toLowerCase()] || language.toLowerCase());
    if (typeof sourceCode !== 'string' || !sourceCode || !parser) return symbols;

    // Feed Tree-sitter by offset so its string input limit does not truncate large files.
    const tree = parser.parse((offset) => sourceCode.slice(offset, offset + 4096));
    if (!tree) return symbols;
    try {
      for (const statement of tree.rootNode.namedChildren) {
        const exported = statement.type === 'export_statement';
        const node = declaration(
          exported ? statement.childForFieldName('declaration') || statement : statement,
        );
        if (!node) continue;
        const name = node.childForFieldName('name')?.text;
        const isDefault = exported && statement.children.some((child) => child.type === 'default');

        if (node.type === 'import_statement' || node.type === 'import_from_statement') {
          const source = node.childForFieldName('source');
          symbols.imports.push({
            raw: node.text,
            source: source
              ? source.text.slice(1, -1)
              : node.childForFieldName('module_name')?.text || name,
            specifier:
              node.namedChildren.find((child) => child.type === 'import_clause')?.text || '',
            ...location(node),
          });
        } else if (
          [
            'function_declaration',
            'generator_function_declaration',
            'function_definition',
          ].includes(node.type)
        ) {
          if (name) symbols.functions.push(functionSignature(node, name));
        } else if (
          ['class_declaration', 'abstract_class_declaration', 'class_definition'].includes(
            node.type,
          )
        ) {
          if (!name) continue;
          const heritage = node.namedChildren.find((child) => child.type === 'class_heritage');
          const superClass =
            heritage?.namedChildren[0]?.childForFieldName('value')?.text ||
            heritage?.namedChildren[0]?.text ||
            node.childForFieldName('superclasses')?.namedChildren[0]?.text ||
            null;
          const methods = (node.childForFieldName('body')?.namedChildren || [])
            .map(declaration)
            .filter((child) => ['method_definition', 'function_definition'].includes(child?.type))
            .map((child) => ({
              ...functionSignature(child, child.childForFieldName('name')?.text),
              isStatic: child.children.some((token) => token.type === 'static'),
            }));
          symbols.classes.push({ name, superClass, methods, ...location(node) });
        } else if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
          const type = node.children[0].type;
          for (const binding of node.namedChildren.filter(
            (child) => child.type === 'variable_declarator',
          )) {
            const identifier = binding.childForFieldName('name');
            if (identifier?.type !== 'identifier') continue;
            const value = binding.childForFieldName('value');
            if (
              value &&
              ['arrow_function', 'function_expression', 'generator_function'].includes(value.type)
            ) {
              symbols.functions.push({
                ...functionSignature(value, identifier.text),
                ...location(binding),
                isArrow: value.type === 'arrow_function',
              });
            } else {
              symbols.variables.push({ name: identifier.text, ...location(binding) });
            }
            if (exported)
              symbols.exports.push({
                type,
                name: identifier.text,
                isDefault,
                ...location(binding),
              });
          }
        }

        if (exported && name) {
          const type = node.type.includes('function')
            ? 'function'
            : node.type.includes('class')
              ? 'class'
              : node.type;
          symbols.exports.push({ type, name, isDefault, ...location(node) });
        } else if (exported && node.type === 'export_statement') {
          const value = node.childForFieldName('value');
          if (value?.type === 'identifier') {
            symbols.exports.push({
              type: 'identifier',
              name: value.text,
              isDefault,
              ...location(node),
            });
          }
          const clause = node.namedChildren.find((child) => child.type === 'export_clause');
          for (const specifier of clause?.namedChildren || []) {
            const token =
              specifier.childForFieldName('alias') || specifier.childForFieldName('name');
            if (token)
              symbols.exports.push({
                type: 'identifier',
                name: token.text,
                isDefault: false,
                ...location(specifier),
              });
          }
        }
      }
      return symbols;
    } finally {
      tree.delete();
    }
  }
}

export default AstParser;
