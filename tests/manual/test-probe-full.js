import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = `${process.env.OPENROUTER_BASE_URL || 'http://127.0.0.1:20128/v1'}/chat/completions`;
  const key = process.env.OPENROUTER_API_KEY;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'opus-4.8-m',
      messages: [{ role: 'user', content: 'Say hello world' }],
      max_tokens: 50,
    }),
  });
  const data = await res.json();
  console.log('FULL_DATA:', JSON.stringify(data, null, 2));
}

run();
