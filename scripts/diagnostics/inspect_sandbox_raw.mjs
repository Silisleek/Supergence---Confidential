import fs from 'fs';

// Let's inspect the last sandbox dir or raw response
const sandboxDirs = fs
  .readdirSync('workspace/.sandbox')
  .map((d) => ({
    name: d,
    mtime: fs.statSync(`workspace/.sandbox/${d}`).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

console.log('Top 3 sandbox dirs:', sandboxDirs.slice(0, 3));
for (const s of sandboxDirs.slice(0, 3)) {
  const p = `workspace/.sandbox/${s.name}`;
  console.log(`Files in ${s.name}:`, fs.readdirSync(p));
}
