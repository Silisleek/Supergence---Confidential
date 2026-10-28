import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const lines = html.split('\n');
console.log('Total lines in index.html:', lines.length);
for (let l = 6670; l <= 6695; l++) {
  if (lines[l - 1]) {
    console.log(`${l}: ${lines[l - 1]}`);
  }
}
