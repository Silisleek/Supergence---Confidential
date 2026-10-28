import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const idx = html.indexOf('function executeTurnInWorkspace');
if (idx !== -1) {
  console.log(html.slice(idx + 1800, idx + 4500));
}
