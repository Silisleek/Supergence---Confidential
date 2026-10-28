import fs from 'fs';

const sis = fs.readFileSync('server/services/sisUnifiedSystem.js', 'utf8');
let p = 0;
while (true) {
  const i = sis.indexOf('conversationId', p);
  if (i === -1) break;
  console.log(`Found conversationId at ${i}:\n`, sis.slice(Math.max(0, i - 100), i + 300));
  p = i + 14;
}
