import fs from 'fs';

function searchFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  let p = 0;
  while (true) {
    const i = content.indexOf('appVideoPreviewFrame', p);
    if (i === -1) break;
    console.log(`[${filepath}] Match at ${i}:\n`, content.slice(Math.max(0, i - 150), i + 350));
    p = i + 1;
  }
}

searchFile('client/index.html');
searchFile('client/scripts/app.js');
searchFile('client/scripts/stark-hud.js');
