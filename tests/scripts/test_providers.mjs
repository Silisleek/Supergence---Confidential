import 'dotenv/config';
import http from 'http';

const testModels = [
  'nvidia_nim/meta/llama-3.1-8b-instruct',
  'nvidia_nim/nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia_nim/mistralai/mistral-7b-instruct-v0.3',
  'puter/gpt-4o-mini',
  'puter/claude-3-5-sonnet',
  'xk/meta/llama-3.1-8b-instruct',
  'xk/google/gemini-2.5-flash',
  'xk/qwen/qwen2.5-72b-instruct',
  'xk/mistralai/mistral-small-2402',
  'opus-4-agy',
  'sonnet-4-gsol',
];

async function check(model) {
  return new Promise((resolve) => {
    const req = http.request(
      'http://127.0.0.1:20128/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LOCAL_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY || ''}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (res.statusCode === 200 && j.choices?.[0]?.message?.content) {
              resolve({ model, ok: true, text: j.choices[0].message.content.slice(0, 50) });
            } else {
              resolve({
                model,
                ok: false,
                status: res.statusCode,
                err: (j.error?.message || data).slice(0, 80),
              });
            }
          } catch (e) {
            resolve({ model, ok: false, status: res.statusCode, err: data.slice(0, 80) });
          }
        });
      },
    );
    req.on('error', (e) => resolve({ model, ok: false, err: e.message }));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve({ model, ok: false, err: 'timeout' });
    });
    req.write(
      JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 10,
      }),
    );
    req.end();
  });
}

(async () => {
  for (const m of testModels) {
    const r = await check(m);
    if (r.ok) {
      console.log(`[PASS] ${m} => ${r.text}`);
    } else {
      console.log(`[FAIL] ${m} => ${r.status || ''} ${r.err}`);
    }
  }
})();
