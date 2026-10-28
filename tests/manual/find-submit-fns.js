import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const matches =
  html.match(/function\s+[a-zA-Z0-9_]*(?:submit|turn|query|send)[a-zA-Z0-9_]*/gi) || [];
console.log('Submit/turn functions:', matches);
