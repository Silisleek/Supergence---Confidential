import 'dotenv/config';
async function test() {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.LOCAL_ROUTER_API_KEY ||
    process.env.LOCAL_ROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    '';
  const res = await fetch('http://127.0.0.1:20128/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'opus-4.6',
      messages: [{ role: 'user', content: 'Say hello in 3 words' }],
    }),
  });
  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('--- RAW BODY START ---');
  console.log(text);
  console.log('--- RAW BODY END ---');
}
test().catch(console.error);
