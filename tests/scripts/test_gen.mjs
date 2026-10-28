import { generateDynamicScene } from '../../server/3d/generator.js';

async function test() {
  console.log('Testing generateDynamicScene with space-bunny-free...');
  const t0 = Date.now();
  const html = await generateDynamicScene(
    'Cyber Tank 3D: Voxel Warfare with dual-track steering, turret rotation, and enemy targets',
    (p) => {
      console.log(`[Stage ${p.stage}] ${p.message || ''}`);
    },
  );
  console.log(`Total time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`HTML length: ${html ? html.length : 0}`);
  if (html) {
    const qualityMatch = html.match(/SIS-QUALITY score=([\d.]+) passed=(true|false) meshes=(\d+)/);
    console.log('Quality Gate:', qualityMatch ? qualityMatch[0] : 'not found');
  }
}

test();
