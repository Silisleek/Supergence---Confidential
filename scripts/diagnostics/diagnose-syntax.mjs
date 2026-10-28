import fs from 'fs';
import vm from 'vm';
import { autoHealScript, validateJsSyntax } from '../../server/3d/split-game-generator.js';

const html = fs.readFileSync(
  'workspace/quantum_wave_particle_tunneling_simu_1792343126603.html',
  'utf8',
);
const scriptMatch = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
if (scriptMatch) {
  let s = scriptMatch[1].replace(/\/\/\s*\[syntax-healed\]\s*\);\s*/g, '').replace(/\);\s*$/g, '');
  const healed = autoHealScript(s);
  try {
    new vm.Script(healed, { filename: 'diagnose.js' });
    console.log('DIAGNOSE: Syntax is perfectly VALID!');
  } catch (err) {
    console.log('DIAGNOSE ERROR:', err.message);
    const lines = healed.split('\n');
    console.log('Total lines:', lines.length);
    console.log(
      'Last 10 lines:\n',
      lines
        .slice(-10)
        .map((l, i) => `${lines.length - 10 + i + 1}: ${l}`)
        .join('\n'),
    );
  }
}
