import fs from 'fs';

function searchClient(str) {
  for (const f of ['client/index.html', 'client/scripts/app.js', 'client/scripts/stark-hud.js']) {
    const content = fs.readFileSync(f, 'utf8');
    let p = 0;
    while (true) {
      const i = content.indexOf(str, p);
      if (i === -1) break;
      console.log(`[${f}] Found "${str}" at ${i}:\n`, content.slice(Math.max(0, i - 100), i + 300));
      p = i + 1;
    }
  }
}

searchClient('/api/chat');
searchClient('/api/unified-turn');
searchClient('executeUnifiedTurn');
