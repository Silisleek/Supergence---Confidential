import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
let p = 0;
while (true) {
  const i = html.indexOf("'inp'", p);
  if (i === -1) break;
  console.log(`Match at ${i}:\n`, html.slice(Math.max(0, i - 100), i + 400));
  p = i + 5;
}
