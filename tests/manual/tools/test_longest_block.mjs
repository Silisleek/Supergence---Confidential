import fs from 'fs';

const rawContent = fs.readFileSync(
  'workspace/.sandbox/run_1792549591673/lock_free_spsc.js',
  'utf8',
);
const realFileIndex =
  rawContent.indexOf('/**\r\n * lock_free_spsc.js') !== -1
    ? rawContent.indexOf('/**\r\n * lock_free_spsc.js')
    : rawContent.indexOf('/**\n * lock_free_spsc.js');
const realCode = realFileIndex !== -1 ? rawContent.slice(realFileIndex) : rawContent;

const lines = realCode.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('...')) {
    console.log(`Line ${idx + 1}: ${l}`);
  }
});
