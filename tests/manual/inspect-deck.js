import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
console.log(html.slice(216000, 218500));
