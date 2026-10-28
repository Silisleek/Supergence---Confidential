const fs = require('fs');
const html = fs.readFileSync('client/index.html', 'utf8');
const lines = html.split('\n');
console.log('Total lines in index.html:', lines.length);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (
    /<(header|nav|main|aside|section)\b/i.test(l) ||
    /id=["'](app|chat|sidebar|stage|center-stage|top-deck|bottom-deck)/i.test(l)
  ) {
    console.log(i + 1 + ': ' + l.trim().slice(0, 100));
  }
}
