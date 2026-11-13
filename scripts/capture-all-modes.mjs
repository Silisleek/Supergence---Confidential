import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const localTemp = 'C:\\Users\\Akshan sharma\\AppData\\Local\\Temp';
const brainDir = 'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\cc78a903-c95c-43ff-b918-06eb784f9796';

function captureScreen(url, filename) {
  const tmpProfile = fs.mkdtempSync(path.join(localTemp, 'chrome-fast-'));
  const outFile = path.join(brainDir, filename);

  console.log(`[Capture] ${url} -> ${filename}`);
  const res = spawnSync(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${tmpProfile}`,
      '--window-size=1400,900',
      `--screenshot=${outFile}`,
      url,
    ],
    { timeout: 15000 },
  );

  if (fs.existsSync(outFile)) {
    console.log(`✓ ${filename} captured (${fs.statSync(outFile).size} bytes)`);
  } else {
    console.error(`✗ Failed to capture ${filename}:`, res.error || res.stderr?.toString());
  }

  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  } catch (_) {}
}

console.log('Capturing all 3 modes and states using C: drive temp...');
captureScreen('http://127.0.0.1:3009/', 'chat-landing-render.png');
captureScreen('http://127.0.0.1:3009/?mode=voice', 'voice-mode-render.png');
captureScreen('http://127.0.0.1:3009/?turn=sample', 'chat-active-card-render.png');
console.log('All captures complete!');
