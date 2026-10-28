async function testTurn() {
  const start = Date.now();
  console.log('Sending coding query to /api/sis/unified-turn ...');
  const res = await fetch('http://localhost:3008/api/sis/unified-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'Implement a high-performance lock-free ring buffer queue in C++20 with atomic head/tail sequences, memory barriers, and cache-line padding.',
      mode: 'Finefast',
    }),
  });
  const data = await res.json();
  const dur = Date.now() - start;
  console.log(`Duration: ${dur}ms`);
  console.log('Success:', data.success);
  console.log('Response length:', data.response ? data.response.length : 0);
  console.log('Snippet:', data.response ? data.response.slice(0, 400) : data.error);
}

testTurn().catch(console.error);
