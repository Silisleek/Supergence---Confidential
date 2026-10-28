(async () => {
  console.log('Sending unified turn to http://localhost:3009/api/sis/unified-turn ...');
  const t0 = Date.now();
  try {
    const res = await fetch('http://localhost:3009/api/sis/unified-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'Write a high-performance C++20 thread-safe ring buffer implementation with comprehensive inline documentation and a complete usage example.',
        mode: 'Finefast',
      }),
    });
    console.log(`Response received in ${Date.now() - t0}ms, status: ${res.status}`);
    const data = await res.json();
    console.log('Success:', data.success);
    console.log('Response excerpt:\n', (data.response || '').slice(0, 400));
    console.log('Steps count:', data.steps ? data.steps.length : 0);
  } catch (err) {
    console.error('Unified turn error:', err.message);
  }
})();
