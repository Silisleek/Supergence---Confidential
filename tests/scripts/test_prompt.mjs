async function testBayAreaPrompt() {
  console.log('Sending prompt to SIS: "Make me the bay area in 3D in HTML.."');
  const t0 = Date.now();
  const res = await fetch('http://localhost:3008/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Make me the bay area in 3D in HTML..' }),
  });
  console.log(`Status: ${res.status} (took ${Date.now() - t0}ms)`);
  const data = await res.json();
  console.log('Data keys:', Object.keys(data));
  console.log('Has error:', Boolean(data.error));
  if (data.error) {
    console.error('Error detail:', data.error);
  }
  console.log('Response preview:', (data.response || '').slice(0, 500));
}

testBayAreaPrompt();
