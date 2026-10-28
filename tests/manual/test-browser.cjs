const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Launching browser with Chrome channel...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Navigating to http://localhost:3008/...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log('Page Title:', title);

  const chatInput = await page.$('#chatInput, #chat-input, input[type="text"], textarea');
  console.log('Chat input element exists:', Boolean(chatInput));

  const bodyText = await page.innerText('body');
  const hasCannedSubstrate =
    bodyText.includes('Supergence Unified Synthesis') || bodyText.includes('unified substrate');
  console.log('Has canned substrate text in DOM:', hasCannedSubstrate);

  const workspaceDir = path.join(process.cwd(), 'workspace');
  if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });
  const screenshotPath = path.join(workspaceDir, 'browser-verify.png');
  try {
    await page.screenshot({ path: screenshotPath, timeout: 5000, animations: 'disabled' });
    console.log('Screenshot saved to:', screenshotPath);
  } catch (sErr) {
    console.warn('Screenshot notice (non-fatal):', sErr.message);
  }

  await browser.close();
  console.log('Playwright verification successfully finished!');
})().catch((err) => {
  console.error('Playwright verification error:', err);
  process.exit(1);
});
