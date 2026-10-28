import { quickAI } from '../../server/api/openrouter.js';

async function testModels() {
  const models = [
    'opencode/mimo-v2.6-flash-free',
    'opencode/mimo-v2.5-free',
    'opencode/nemotron-3-ultra-free',
    'opencode/big-pickle',
    'for-sis',
  ];

  for (const m of models) {
    const start = Date.now();
    try {
      const res = await quickAI(
        'You are an AI that outputs valid JSON only. Start immediately with { and end with } without any preamble or markdown.',
        'Output a JSON object with keys: title, hypothesis, domain for quantum computing.',
        m,
        300,
      );
      console.log('=== MODEL:', m, '| TIME:', Date.now() - start, 'ms ===');
      console.log(res);
    } catch (e) {
      console.log('=== MODEL:', m, 'FAILED:', e.message);
    }
  }
}

testModels().catch(console.error);
