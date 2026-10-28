import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const idx = html.indexOf('Connecting to Personal Browser');
if (idx !== -1) {
  console.log(html.slice(Math.max(0, idx - 800), idx + 800));
}
