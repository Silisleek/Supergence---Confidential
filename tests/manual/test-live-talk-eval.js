import WebSocket from 'ws';

async function run() {
  const ws = new WebSocket('ws://localhost:3008');
  const events = [];

  ws.on('open', () => console.log('WebSocket connected.'));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (
        ['tool-unlocked', 'speak', 'memory-evolved', 'metacognitive-realization'].includes(msg.type)
      ) {
        console.log('★ WS Targeted Event:', msg.type, JSON.stringify(msg).slice(0, 180));
        events.push(msg);
      }
    } catch (e) {}
  });

  await new Promise((r) => setTimeout(r, 1000));

  console.log('Sending: "I want to talk to you"...');
  const res = await fetch('http://localhost:3008/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'I want to talk to you',
    }),
  });
  const json = await res.json();
  console.log('Response status:', res.status);
  console.log('Response snippet:', (json.response || '').slice(0, 300));

  await new Promise((r) => setTimeout(r, 2000));
  console.log('Total targeted events:', events.length);
  ws.close();
}

run().catch(console.error);
