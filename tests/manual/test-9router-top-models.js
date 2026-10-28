import dotenv from 'dotenv';
dotenv.config();

const modelsToTest = [
  'opus-4.8-m',
  'opus-4.6-g',
  'opus-4-agy',
  'opus-4.8-d',
  'opus-best',
  'sonnet-4-gsol',
  'mythos-north',
  'mythos-q',
  'for-sis',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/muse-spark-1.3-contributor-free',
  'opencode/muse-spark-1.2-contributor-free',
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
        messages: [
          {
            role: 'user',
            content: 'Reply with JSON: {"status": "success", "model": "' + model + '"}',
          },
        ],
        max_tokens: 60,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { model, ok: false, status: res.status, error: errText.slice(0, 100) };
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || JSON.stringify(data).slice(0, 100);
    return { model, ok: true, reply: reply.trim() };
  } catch (err) {
    return { model, ok: false, error: err.message };
  }
}

async function run() {
  for (const m of modelsToTest) {
    const r = await testModel(m);
    console.log(
      m,
      '=>',
      r.ok ? 'SUCCESS: ' + r.reply.slice(0, 80) : 'FAILED: ' + r.status + ' ' + r.error,
    );
  }
}

run();
