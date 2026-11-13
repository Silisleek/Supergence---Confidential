const url = 'http://127.0.0.1:20128/v1/chat/completions';
const key = 'sk-4c58a28fe1b9c9ab-ipoaxd-e72ee6e6';
const model = 'opus-4.6';

async function test() {
  console.log(`Testing ${model} at ${url}...`);
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Respond with exactly: AREM_READY' }],
      max_tokens: 30,
    }),
  });
  console.log(`Status: ${res.status} in ${Date.now() - t0}ms`);
  const text = await res.text();
  console.log('Response body:', text);
}

test().catch((err) => console.error('Test error:', err));
