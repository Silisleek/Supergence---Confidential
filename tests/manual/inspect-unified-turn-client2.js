import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const idx = html.indexOf('/api/sis/unified-turn');
if (idx !== -1) {
  console.log(html.slice(idx + 1000, idx + 3500));
}
