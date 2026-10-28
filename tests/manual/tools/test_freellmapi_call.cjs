const key = 'freellmapi-754571059bdea59e187b42ec3490649b04c6ca9dab422fe8';
const url = 'http://127.0.0.1:31415/v1/chat/completions';

async function testModel(model) {
  console.log(`\nTesting model: ${model} ...`);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say "SUPERGENCE_ONLINE" in 2 words.' }],
        max_tokens: 30,
      }),
    });
    const status = res.status;
    const data = await res.json();
    console.log(`Status: ${status} in ${Date.now() - t0}ms`);
    if (data.choices && data.choices[0]) {
      console.log('Result:', data.choices[0].message.content.trim());
    } else {
      console.log('Error/Data:', data);
    }
  } catch (err) {
    console.log('Fetch error:', err.message);
  }
}

(async () => {
  await testModel('flm/auto');
  await testModel('claude-opus-4-5');
  await testModel('deepseek-ai/deepseek-v4.1-flash');
  await testModel('gemini-2.5-flash');
  await testModel('poolside/laguna-xs-2.1:free');
})();
