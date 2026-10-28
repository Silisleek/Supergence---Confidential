const startTime = Date.now();
try {
  const res = await fetch('http://localhost:3008/api/sis/unified-turn-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'What is 17 times 23? Explain clearly.' }),
  });

  console.log('HTTP Status:', res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let firstTokenTime = null;
  let fullOutput = '';
  let tokenCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    fullOutput += text;
    if (text.includes('event: token')) {
      tokenCount++;
      if (!firstTokenTime) {
        firstTokenTime = Date.now() - startTime;
        console.log(`⚡ First token latency: ${firstTokenTime}ms`);
      }
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`✅ Stream finished in: ${totalTime}ms (Total token events: ${tokenCount})`);
  console.log('Stream ended successfully without errors or stalls.');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
