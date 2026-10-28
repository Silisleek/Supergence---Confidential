import fs from 'fs';

for (const f of fs.readdirSync('client/scripts')) {
  const content = fs.readFileSync('client/scripts/' + f, 'utf8');
  if (content.includes('inp')) {
    console.log(`Found inp in client/scripts/${f}`);
    let p = 0;
    while (true) {
      const i = content.indexOf('inp', p);
      if (i === -1) break;
      const snip = content.slice(Math.max(0, i - 20), i + 50);
      if (snip.includes('#inp') || snip.includes("'inp'") || snip.includes('"inp"')) {
        console.log(`  at ${i}:`, content.slice(Math.max(0, i - 100), i + 300));
      }
      p = i + 3;
    }
  }
}
