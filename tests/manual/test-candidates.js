import dotenv from 'dotenv';
dotenv.config();

const models = [
  'opus-4.8-m',
  'opus-best',
  'for-sis',
  'opus-4.6-g',
  'opus-4-agy',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/muse-spark-1.3-contributor-free',
];

async function run() {
  const url = `${process.env.OPENROUTER_BASE_URL || 'http://127.0.0.1:20128/v1'}/chat/completions`;
  const key = process.env.OPENROUTER_API_KEY;

  for (const model of models) {
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
              content: 'Output ONLY JSON: {"message": "ok", "model": "' + model + '"}',
            },
          ],
          max_tokens: 60,
        }),
      });
      if (!res.ok) {
        console.log(`[${model}] FAIL ${res.status}`);
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      console.log(
        `[${model}] SUCCESS:`,
        content ? content.replace(/\r?\n/g, ' ').slice(0, 100) : 'NO_CONTENT',
      );
    } catch (e) {
      console.log(`[${model}] ERR:`, e.message);
    }
  }
}

run();
