import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = process.argv[2] || 'http://localhost:3009/';
const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-ss-'));
const outFile = path.resolve(process.argv[3] || 'chrome-rendered.png');

console.log('Running Chrome screenshot to:', outFile, 'for:', targetUrl);
const res = spawnSync(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1440,900',
    `--screenshot=${outFile}`,
    targetUrl,
  ],
  { timeout: 15000 },
);

console.log('Chrome exit:', res.status, res.stderr?.toString());
if (fs.existsSync(outFile)) {
  console.log('Screenshot created! Size:', fs.statSync(outFile).size);
}
fs.rmSync(tmpProfile, { recursive: true, force: true });
