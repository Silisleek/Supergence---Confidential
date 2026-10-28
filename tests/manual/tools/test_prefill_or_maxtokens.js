async function testPrefill() {
  const body = {
    model: 'opus-4.6',
    messages: [
      { role: 'system', content: 'You are an expert 3D Geometry Engineer.' },
      {
        role: 'user',
        content:
          'Synthesize the complete JavaScript function buildModel(scene, materials) for an articulated 3D zebra using Three.js.',
      },
      { role: 'assistant', content: '```javascript\nfunction buildModel(scene, materials) {\n' },
    ],
    max_tokens: 4000,
    temperature: 0.1,
  };

  console.log('Testing assistant prefill...');
  const res = await fetch('http://127.0.0.1:20128/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const choice = json.choices?.[0]?.message?.content || '';
  console.log('Prefill response length:', choice.length);
  console.log('First 300 chars:\n', choice.slice(0, 300));
}

async function testMaxTokens() {
  const body = {
    model: 'opus-4.6',
    messages: [
      { role: 'system', content: 'You are an expert 3D Geometry Engineer.' },
      {
        role: 'user',
        content:
          'Synthesize the complete JavaScript function buildModel(scene, materials) for an articulated 3D zebra using Three.js. Output ONLY valid JavaScript inside ```javascript.',
      },
    ],
    max_tokens: 16000,
    temperature: 0.1,
  };

  console.log('Testing max_tokens 16000...');
  const res = await fetch('http://127.0.0.1:20128/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const choice = json.choices?.[0]?.message?.content || '';
  console.log('MaxTokens response length:', choice.length);
  const codeIdx = choice.indexOf('```javascript');
  console.log('codeIdx:', codeIdx);
  if (codeIdx !== -1) {
    console.log('Code block start:\n', choice.slice(codeIdx, codeIdx + 300));
    console.log('Code block end:\n', choice.slice(-300));
  } else {
    console.log('Still no code fence! Chars:', choice.slice(-300));
  }
}

async function run() {
  try {
    await testPrefill();
  } catch (e) {
    console.error('Prefill failed:', e.message);
  }
  try {
    await testMaxTokens();
  } catch (e) {
    console.error('MaxTokens failed:', e.message);
  }
}

run();
