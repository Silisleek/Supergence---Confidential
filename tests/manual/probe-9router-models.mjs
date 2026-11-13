const url = 'http://127.0.0.1:20128/v1/chat/completions';
const key = 'sk-4c58a28fe1b9c9ab-ipoaxd-e72ee6e6';

const modelsToTest = [
  'opus-4.6',
  'opus-4.8-m',
  'sonnet-4.6-mhy',
  'opus-best',
  'for-sis',
  'opus-4.7',
  'sonnet-5.5',
  'sonnet-g3.8',
  'opencode/claude-opus-4-6',
  'ab/free/claude-opus-4.6',
  'oxion/claude-opus-4.6',
  'lr/claude-opus-4-6',
];

async function main() {
  for (const m of modelsToTest) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + key,
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 20,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await res.json();
      console.log(
        `[${m}] status=${res.status} in ${Date.now() - t0}ms:`,
        JSON.stringify(data).slice(0, 150),
      );
    } catch (e) {
      clearTimeout(t);
      console.log(`[${m}] FAILED/TIMEOUT (${Date.now() - t0}ms):`, e.message);
    }
  }
}

main();
