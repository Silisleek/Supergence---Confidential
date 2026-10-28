import fs from 'fs';
import { autoHealScript } from '../../../server/3d/split-game-generator.js';
import vm from 'vm';

const html = fs.readFileSync(
  'workspace/game_equus_quagga_autonomous_3d_equine_st_1792497412798.html',
  'utf8',
);
const scriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
const mainScript = scriptMatches.sort((a, b) => b[1].length - a[1].length)[0][1];

let healed = autoHealScript(mainScript);
healed = healed.replace(/^[ \t]*\.\.\.[ \t]*$/gm, '');
console.log('Testing vm.Script on healed code with standalone ellipsis stripped...');
try {
  new vm.Script(healed);
  console.log('✅ AST VALIDATION PASSED WITH 0 ERRORS!');
} catch (e) {
  console.error('❌ AST Validation Error:', e.message);
}
