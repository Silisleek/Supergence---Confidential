import fs from 'fs';

function findIframes(filepath) {
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  let p = 0;
  while (true) {
    const i = content.indexOf('<iframe', p);
    if (i === -1) break;
    console.log(`[${filepath}] iframe at ${i}:\n`, content.slice(i, i + 250));
    p = i + 1;
  }
}

findIframes('client/index.html');
findIframes('client/scripts/app.js');
findIframes('client/scripts/stark-hud.js');
findIframes('client/scripts/spark-task-engine.js');
