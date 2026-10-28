import fs from 'fs';

function searchServer(str) {
  for (const dir of ['server', 'server/routes', 'server/services']) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const p = dir + '/' + f;
      if (fs.statSync(p).isFile() && (p.endsWith('.js') || p.endsWith('.mjs'))) {
        const c = fs.readFileSync(p, 'utf8');
        if (c.includes(str)) {
          console.log(`Found "${str}" in ${p}`);
          const idx = c.indexOf(str);
          console.log(c.slice(Math.max(0, idx - 100), idx + 300));
        }
      }
    }
  }
}

searchServer('/unified-turn');
searchServer('unified-turn');
