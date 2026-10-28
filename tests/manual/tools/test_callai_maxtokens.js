import { callAI } from '../../../server/api/openrouter.js';

async function test() {
  console.log('Testing callAI with opus-4.6 and maxTokens: 16000...');
  const res = await callAI({
    model: 'opus-4.6',
    systemPrompt: 'You are an expert 3D Geometry Engineer.',
    messages: [
      {
        role: 'user',
        content:
          'Synthesize the complete JavaScript function buildModel(scene, materials) for an articulated 3D zebra using Three.js. Output ONLY valid JavaScript inside ```javascript.',
      },
    ],
    maxTokens: 16000,
    temperature: 0.1,
  });

  const content = res.choices[0]?.message?.content || '';
  console.log('Response total length:', content.length);
  const codeIdx = content.indexOf('```javascript');
  console.log('codeIdx of ```javascript:', codeIdx);
  if (codeIdx !== -1) {
    console.log('Code block start:\n', content.slice(codeIdx, codeIdx + 200));
    console.log('Code block end:\n', content.slice(-200));
  } else {
    console.log('No ```javascript found! End of text:\n', content.slice(-300));
  }
}

test().catch(console.error);
