async function test() {
  console.log('Testing POST http://localhost:3008/api/sis/unified-turn ...');
  try {
    const res = await fetch('http://localhost:3008/api/sis/unified-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Make me a video of a man eating noodles.',
        mode: 'Finefast',
        conversationId: 'test-turn-' + Date.now(),
        history: [],
      }),
    });
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Data keys:', Object.keys(data));
    console.log('Success:', data.success);
    console.log('Response length:', data.response?.length);
    console.log('Artifacts:', data.artifacts);
    console.log('InteractiveUI:', data.interactiveUI);
    console.log('Steps count:', data.steps?.length);
  } catch (err) {
    console.error('Error fetching unified-turn:', err);
  }
}

test();
