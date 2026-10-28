function extractFunctionDeclaration(code, funcName) {
  if (!code || !code.includes(funcName)) return code;
  const regex = new RegExp(`(?:async\\s+)?function\\s+${funcName}\\s*\\(`, 'i');
  const match = code.match(regex);
  if (!match) return code;
  const startIdx = match.index;
  const openBrace = code.indexOf('{', startIdx);
  if (openBrace === -1) return code;
  let depth = 0;
  let inString = null;
  for (let i = openBrace; i < code.length; i++) {
    const ch = code[i];
    const prev = code[i - 1];
    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') inString = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return code.slice(startIdx, i + 1);
      }
    }
  }
  return code.slice(startIdx);
}

const testCode =
  'function initMaterials() {\n  const m = { a: 1 };\n  return m;\n}\n\nfor each pixel:\nconst x = 5;';
console.log('EXTRACTED:\n' + extractFunctionDeclaration(testCode, 'initMaterials'));
