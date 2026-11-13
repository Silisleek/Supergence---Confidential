/**
 * Supergence Cross-Platform Integrity & Case-Sensitivity Linter
 * Verifies that code written on Windows won't fail on macOS (APFS/Darwin) or Linux (ext4).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('Supergence Cross-Platform Pre-Flight Verification');
console.log('Running on host OS:', process.platform, process.arch);
console.log('====================================================\n');

let issuesFound = 0;

// 1. Audit case sensitivity of all local imports in server & client
function auditImportsInDir(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        ['node_modules', '.git', 'dist', 'release', 'release-candidate', 'build'].includes(
          entry.name,
        )
      )
        continue;
      auditImportsInDir(fullPath, baseDir);
    } else if (/\.(js|mjs|cjs|jsx|html|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Match import/export from relative paths
      const importRegex = /(?:import|from|require\()\s*['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const relativeImport = match[1];
        // Resolve target
        let resolved = path.resolve(path.dirname(fullPath), relativeImport);

        // Try common extensions if omitted
        if (!fs.existsSync(resolved)) {
          for (const ext of ['.js', '.mjs', '.cjs', '.jsx', '.json', '/index.js']) {
            if (fs.existsSync(resolved + ext)) {
              resolved = resolved + ext;
              break;
            }
          }
        }

        if (fs.existsSync(resolved)) {
          // Check actual casing on disk
          const dirOfTarget = path.dirname(resolved);
          const baseOfTarget = path.basename(resolved);
          const realEntries = fs.readdirSync(dirOfTarget);

          if (!realEntries.includes(baseOfTarget)) {
            console.error(`[CASE-MISMATCH] File: ${path.relative(ROOT_DIR, fullPath)}`);
            console.error(
              `  Import: "${relativeImport}" -> Target on disk differs in casing: "${realEntries.find((e) => e.toLowerCase() === baseOfTarget.toLowerCase())}" vs "${baseOfTarget}"`,
            );
            console.error(`  -> Will fail on case-sensitive Linux & macOS!\n`);
            issuesFound++;
          }
        }
      }

      // Check for hardcoded backslashes in path strings
      const backslashRegex = /(?:path|file|dir)\s*[:=]\s*['"][^'"]*\\+[^'"]*['"]/gi;
      let bsMatch;
      while ((bsMatch = backslashRegex.exec(content)) !== null) {
        // Exclude regex literals and harmless escapes
        if (
          !bsMatch[0].includes('\\\\') &&
          !bsMatch[0].includes('\\n') &&
          !bsMatch[0].includes('\\r')
        ) {
          console.warn(
            `[PATH-SEPARATOR WARNING] Potential hardcoded backslash in: ${path.relative(ROOT_DIR, fullPath)}:`,
          );
          console.warn(`  ${bsMatch[0]}\n`);
        }
      }
    }
  }
}

console.log('1. Auditing local module imports for case-sensitivity...');
auditImportsInDir(path.join(ROOT_DIR, 'server'));
auditImportsInDir(path.join(ROOT_DIR, 'client'));
auditImportsInDir(path.join(ROOT_DIR, 'electron'));

console.log('2. Auditing platform-specific process execution...');
// Check for commands that only exist on Windows
const platformTools = [
  { file: 'server/services/workspacePrompt.js', check: 'Host environment is Windows' },
];

for (const pt of platformTools) {
  const p = path.join(ROOT_DIR, pt.file);
  if (fs.existsSync(p)) {
    const text = fs.readFileSync(p, 'utf8');
    if (text.includes('Host environment is Windows (win32)') && !text.includes('platformPrompt')) {
      console.error(`[HARDCODED PLATFORM] ${pt.file} contains unconditioned Windows prompt`);
      issuesFound++;
    }
  }
}

console.log('3. Auditing package.json desktop distribution targets...');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const hasWin = Boolean(pkg.build?.win);
const hasMac = Boolean(pkg.build?.mac);
const hasLinux = Boolean(pkg.build?.linux);

console.log(`  Windows target configured: ${hasWin ? '✓' : '✗'}`);
console.log(`  macOS target configured:   ${hasMac ? '✓' : '✗'}`);
console.log(`  Linux target configured:   ${hasLinux ? '✓' : '✗'}`);

if (!hasMac || !hasLinux) {
  console.warn('  -> macOS or Linux targets missing in package.json build config.');
}

console.log('\n----------------------------------------------------');
if (issuesFound === 0) {
  console.log('RESULT: 100% Cross-Platform Integrity Passed! Zero case-mismatches found.');
} else {
  console.log(`RESULT: Found ${issuesFound} cross-platform issues that must be addressed.`);
}
console.log('----------------------------------------------------\n');
