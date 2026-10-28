import { generateDynamicScene } from './generator.js';
import fs from 'fs';

console.log('Testing generateDynamicScene...');
const prompt = 'Cyber Tank 3D: Voxel Warfare with tank controls and enemy tanks';
const html = await generateDynamicScene(prompt, (p) => {
  console.log(`[Stage: ${p.stage}] ${p.message || ''}`);
});

console.log('\nResult HTML length:', html ? html.length : 0);
if (html) {
  fs.writeFileSync('server/3d/test_output.html', html, 'utf8');
  console.log('Saved to server/3d/test_output.html');
  console.log('Does it contain buildSceneObjects?', html.includes('buildSceneObjects'));
  console.log('Does it contain buildGameLogic?', html.includes('buildGameLogic'));
  console.log('Does it contain requestAnimationFrame?', html.includes('requestAnimationFrame'));
} else {
  console.log('FAILED to generate scene');
}
