import fs from 'fs';
import path from 'path';

const files = fs
  .readdirSync('workspace')
  .filter((f) => f.startsWith('project') && f.endsWith('.html'));
const broken = [];
const ok = [];

for (const f of files) {
  const content = fs.readFileSync(path.join('workspace', f), 'utf8');
  // Match script tags
  const allScripts = [...content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const execScripts = allScripts.filter(
    (m) => !m[1].includes('importmap') && !m[1].includes('src='),
  );

  if (execScripts.length === 0) {
    broken.push({ file: f, reason: 'No inline executable script tag found' });
    continue;
  }

  let fileErr = null;
  for (const s of execScripts) {
    let code = s[2];
    // Strip ES module imports
    code = code.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// import');
    code = code.replace(/import\s*['"][^'"]+['"];?/g, '// import');
    code = code.replace(/export\s+default\s+/g, '');
    code = code.replace(/export\s+/g, '');

    try {
      new Function(code);
    } catch (e) {
      fileErr = e.message;
      break;
    }
  }

  if (fileErr) {
    broken.push({ file: f, reason: fileErr });
  } else {
    ok.push(f);
  }
}

console.log(`Total projects: ${files.length}`);
console.log(`Valid syntax: ${ok.length}`);
console.log(`Broken syntax: ${broken.length}`);
console.log('\n--- BROKEN FILES ---');
broken.forEach((b) => console.log(`[FAIL] ${b.file}: ${b.reason}`));
