import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(
  'workspace/game_equus_quagga_autonomous_3d_equine_st_1792497987412.html',
  'utf8',
);
const scriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
const mainScript = scriptMatches.sort((a, b) => b[1].length - a[1].length)[0][1];

let code = mainScript;
code = code.replace(/^(.*?)\.\.\.(.*?)$/gm, (match) => {
  if (/\.\.\.[a-zA-Z0-9_${\[]/.test(match)) return match;
  return `// ${match}`;
});
code = code.replace(/\?\s*$/gm, ';');

try {
  new vm.Script(code);
  console.log('✅ AST VALIDATION PASSED WITH 0 ERRORS!');
} catch (e) {
  console.log('Error:', e.message);
  const match = e.stack.match(/evalmachine\.<anonymous>:(\d+)/);
  if (match) {
    const lineNum = parseInt(match[1]);
    const lines = code.split('\n');
    console.log(`Around line ${lineNum}:`);
    for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
      console.log(`  ${i + 1}: ${lines[i]}`);
    }
  }
}
