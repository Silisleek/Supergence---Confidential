import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const idMatches = html.match(/id=['"][^'"]*(?:result|preview)[^'"]*['"]/gi) || [];
console.log('ID matches with result or preview:', idMatches);

const classMatches = html.match(/class=['"][^'"]*(?:result|preview)[^'"]*['"]/gi) || [];
console.log('Class matches with result or preview:', [...new Set(classMatches)].slice(0, 20));
