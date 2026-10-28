import fs from 'fs';
import vm from 'vm';

const files = fs
  .readdirSync('workspace')
  .filter((f) => f.startsWith('game_equus_quagga') && f.endsWith('.html'));
const latestFile = files.sort().pop();
console.log('Inspecting:', latestFile);
const html = fs.readFileSync(`workspace/${latestFile}`, 'utf8');

const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
scriptMatches.forEach((m, idx) => {
  const code = m[1];
  if (code.trim().length < 50) return;
  try {
    new vm.Script(code);
    console.log(`Script #${idx}: VALID (len ${code.length})`);
  } catch (err) {
    console.log(`Script #${idx}: SYNTAX ERROR - ${err.message}`);
    const lines = code.split('\n');
    const stack = err.stack;
    const match = stack.match(/evalmachine\.<anonymous>:(\d+)/);
    if (match) {
      const lineNum = parseInt(match[1]);
      console.log(`Around line ${lineNum}:`);
      for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
        console.log(`  ${i + 1}: ${lines[i]}`);
      }
    }
  }
});
