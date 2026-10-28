import dotenv from 'dotenv';
dotenv.config();

const models = [
  'for-sis',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/mimo-v2.5-free',
  'opencode/mimo-v2.6-flash-free',
  'opencode/muse-spark-1.2-contributor-free',
  'opencode/muse-spark-1.3-contributor-free',
  'opencode/big-pickle',
  'opencode/qwen3.5-plus',
  'opencode/qwen3.6-plus',
  'opencode/qwen3.8-flash',
  'opencode/gemini-3.5-flash',
  'opencode/deepseek-v4-flash-free',
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
              content:
                'Generate JSON only: {"theory": "Superintelligence Invariant", "domain": "systems"}',
            },
          ],
          max_tokens: 150,
        }),
      });
      if (!res.ok) {
        console.log(`[${model}] FAIL ${res.status}`);
        continue;
      }
      const data = await res.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || choice?.message?.reasoning_content || '';
      console.log(
        `[${model}] OK: (len: ${content.length})`,
        content.replace(/\r?\n/g, ' ').slice(0, 100),
      );
    } catch (e) {
      console.log(`[${model}] ERR:`, e.message);
    }
  }
}

run();
