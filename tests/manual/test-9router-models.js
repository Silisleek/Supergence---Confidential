import dotenv from 'dotenv';
dotenv.config();

const modelsToTest = [
  'for-sis',
  'opencode/gemini-3.5-flash',
  'opencode/qwen3.5-plus',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/deepseek-v4-flash-free',
  'opencode/muse-spark-1.3-contributor-free',
  'opencode/ling-3.0-flash-fin-free',
  'opus-4.8-m',
  'sonnet-4.6-mhy',
];

async function testModel(model) {
  const url = `${process.env.OPENROUTER_BASE_URL || 'http://127.0.0.1:20128/v1'}/chat/completions`;
  const key = process.env.OPENROUTER_API_KEY;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say "HELLO_MODEL_OK" and nothing else.' }],
        max_tokens: 30,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { model, ok: false, status: res.status, error: errText.slice(0, 120) };
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || JSON.stringify(data).slice(0, 100);
    return { model, ok: true, reply: reply.trim() };
  } catch (err) {
    return { model, ok: false, error: err.message };
  }
}

async function run() {
  console.log('Testing with key:', process.env.OPENROUTER_API_KEY?.slice(0, 10) + '...');
  for (const m of modelsToTest) {
    const result = await testModel(m);
    console.log(JSON.stringify(result));
  }
}

run();
