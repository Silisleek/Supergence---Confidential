import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const idx = html.indexOf('/api/sis/unified-turn');
if (idx !== -1) {
  console.log(html.slice(Math.max(0, idx - 400), idx + 1400));
}
