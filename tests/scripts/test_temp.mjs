import { callAI } from '../../server/api/openrouter.js';
import vm from 'vm';

async function testTemp() {
  const prompt =
    'function animateScene(meshes, clock, THREE) {\n  // Animate meshes: rotate turret/radar, subtle bob with Math.sin. Guard if(meshes[i]).\n';

  for (let temp of [0.1, 0.2, 0.7]) {
    console.log(`Testing temp = ${temp}`);
    const res = await callAI({
      model: 'space-bunny-free',
      systemPrompt:
        'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
      messages: [{ role: 'user', content: prompt }],
      temperature: temp,
      maxTokens: 1500,
    });
    const content = res.choices[0]?.message?.content || '';
    const fence = content.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i);
    console.log(
      `Temp ${temp}: fence=${!!fence}, startsWithFence=${content.trim().startsWith('```')}`,
    );
    if (fence) {
      console.log(`Temp ${temp} sample:\n`, fence[1].slice(0, 150));
    } else {
      console.log(`Temp ${temp} raw start:`, content.slice(0, 100).replace(/\n/g, ' '));
    }
  }
}

testTemp();
