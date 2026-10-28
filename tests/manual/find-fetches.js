import fs from 'fs';

function findFetches(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const matches = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
  console.log(`[${filepath}] Fetches:`, [...new Set(matches)]);
}

findFetches('client/scripts/app.js');
findFetches('client/index.html');
findFetches('client/scripts/stark-hud.js');
