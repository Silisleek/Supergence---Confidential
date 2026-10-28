import fs from 'fs';

for (const f of ['client/index.html', 'client/scripts/app.js']) {
  const content = fs.readFileSync(f, 'utf8');
  let p = 0;
  while (true) {
    const i = content.indexOf('inp', p);
    if (i === -1) break;
    // Check if it's #inp or 'inp'
    const snippet = content.slice(Math.max(0, i - 30), i + 80);
    if (
      snippet.includes("('inp')") ||
      snippet.includes('("#inp")') ||
      snippet.includes("id='inp'") ||
      snippet.includes('id="inp"')
    ) {
      console.log(`[${f}] at ${i}:\n`, content.slice(Math.max(0, i - 100), i + 350));
    }
    p = i + 3;
  }
}
