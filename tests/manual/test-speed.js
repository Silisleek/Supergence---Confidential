import dotenv from 'dotenv';
dotenv.config();

const prompt =
  'You are a theoretical scientist. Output JSON with fields "title", "domain", "hypothesis", "math": "\\\\mathcal{H} = \\\\sum x_i", "benchmarks": ["latency <= 200ns"]';

async function test(model) {
  const start = Date.now();
  const url = 'http://127.0.0.1:20128/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
  });
  const data = await res.json();
  const dur = Date.now() - start;
  const content = data.choices?.[0]?.message?.content;
  console.log(`[${model}] Took ${dur}ms:`, content?.replace(/\r?\n/g, ' ').slice(0, 120));
}

async function run() {
  await test('opencode/big-pickle');
  await test('opencode/mimo-v2.6-flash-free');
  await test('opencode/nemotron-3-ultra-free');
}

run();
