import fs from 'fs';
import path from 'path';
import perfectionistCoder from '../../../server/coder/perfectionist-coder-engine.js';
import codingExpertEngine from '../../../server/coder/coding-expert-engine.js';

async function main() {
  console.log('[Test] Triggering _synthesizeAutonomous3DApplication directly via opus-4.6...');
  const title = 'Equus quagga Realistic 3D Studio';
  const prompt =
    'Create an anatomically realistic 3D Plains Zebra (Equus quagga) simulation studio with biomechanical gaits and PBR shaders';

  const html = await perfectionistCoder._synthesizeAutonomous3DApplication(
    title,
    prompt,
    {},
    [],
    (p) => console.log(`[STAGE] ${p.stage}: ${p.message}`),
  );

  console.log('[Test] Assembled HTML length:', html ? html.length : 0);

  const testFile = path.resolve('workspace/test_autonomous_zebra_studio.html');
  fs.writeFileSync(testFile, html, 'utf8');
  console.log('[Test] Saved to:', testFile);

  // Run Playwright Chrome evaluation
  console.log('[Test] Running headless Chrome verification...');
  const evaluation = {
    filename: 'test_autonomous_zebra_studio.html',
    language: 'html',
    diagnostics: [],
    testsPassed: true,
    prompt,
  };

  await codingExpertEngine._verifyHtmlInBrowser(
    { filename: 'test_autonomous_zebra_studio.html', code: html, prompt, autoHeal: false },
    evaluation,
  );

  console.log('[Test] Playwright Evaluation Result:');
  console.log('Tests Passed:', evaluation.testsPassed);
  console.log('Diagnostics:', evaluation.diagnostics);
}

main().catch(console.error);
