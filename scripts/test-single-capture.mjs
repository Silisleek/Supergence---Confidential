import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const localTemp = 'C:\\Users\\Akshan sharma\\AppData\\Local\\Temp';
const brainDir = 'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\cc78a903-c95c-43ff-b918-06eb784f9796';

function captureScreen(url, filename) {
  const tmpProfile = fs.mkdtempSync(path.join(localTemp, 'chrome-fast-'));
  const outFile = path.join(brainDir, filename);

  if (fs.existsSync(outFile)) {
    fs.unlinkSync(outFile);
  }

  console.log(`[Capture] Starting ${url} -> ${filename}`);
  const res = spawnSync(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${tmpProfile}`,
      '--window-size=1400,900',
      '--run-all-compositor-stages-before-draw',
      `--screenshot=${outFile}`,
      url,
    ],
    { timeout: 15000 },
  );

  console.log(`[Capture] Exit code: ${res.status}, error: ${res.error}`);
  if (fs.existsSync(outFile)) {
    console.log(`✓ ${filename} successfully created! (${fs.statSync(outFile).size} bytes)`);
  } else {
    console.error(`✗ Failed to create ${filename}`);
  }

  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  } catch (_) {}
}

console.log('Testing fresh capture without virtual time budget...');
captureScreen('http://127.0.0.1:3009/', 'chat-landing-render.png');
captureScreen('http://127.0.0.1:3009/?turn=sample', 'chat-active-card-render.png');
captureScreen('http://127.0.0.1:3009/?mode=voice', 'voice-mode-render.png');
