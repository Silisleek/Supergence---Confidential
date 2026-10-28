import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
let p = 0;
while (true) {
  const i = html.indexOf('executeTurnInWorkspace', p);
  if (i === -1) break;
  console.log(`Found call at ${i}:\n`, html.slice(Math.max(0, i - 100), i + 250));
  p = i + 22;
}
