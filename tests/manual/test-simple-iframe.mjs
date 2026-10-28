import { chromium } from 'playwright-core';
import fs from 'fs';

async function test() {
  // Create a minimal test html in client/
  fs.writeFileSync(
    'client/test-iframe.html',
    `<!DOCTYPE html>
<html>
<head><title>Iframe Test</title></head>
<body style="background:#111; color:#fff;">
  <h1>Test Iframe</h1>
  <iframe id="testIframe" src="/workspace/video_man_eating_noodles_1791989560188.html" style="width:1000px; height:600px; border:2px solid cyan;"></iframe>
</body>
</html>`,
  );

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log('LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('ERR:', err));

  await page.goto('http://localhost:3008/test-iframe.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const frames = page.frames();
  console.log('Total frames:', frames.length);
  for (let i = 0; i < frames.length; i++) {
    console.log(`Frame ${i}: name="${frames[i].name()}", url="${frames[i].url()}"`);
  }

  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/test_simple_iframe.png',
  });
  console.log('Saved test_simple_iframe.png');

  await browser.close();
  fs.unlinkSync('client/test-iframe.html');
}

test().catch(console.error);
