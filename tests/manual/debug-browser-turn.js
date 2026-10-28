import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => console.log(`[Browser ${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.error('[Browser Exception]', err));
  page.on('requestfailed', (req) =>
    console.warn('[Request Failed]', req.url(), req.failure()?.errorText),
  );

  console.log('Loading page...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  console.log('Calling window.openWorkspace()...');
  await page.evaluate(() => {
    window.openWorkspace('Make me a video of a man eating noodles.');
  });

  // Wait 10 seconds and log the turn elements
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    const turnState = await page.evaluate(() => {
      const activeResp = document.querySelector('.response-body-markdown');
      const activeSlot = document.querySelector('.workspace-deck-slot');
      return {
        activeRespHtml: activeResp ? activeResp.innerHTML : null,
        activeSlotHtml: activeSlot ? activeSlot.innerHTML : null,
      };
    });
    console.log(`[Sec ${i + 1}] Turn state:`, turnState);
    if (turnState.activeSlotHtml && turnState.activeSlotHtml.length > 0) {
      console.log('Slot was populated!');
      break;
    }
  }

  await page.waitForTimeout(2000);
  const outPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\debug_turn_result.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved debug screenshot to:', outPath);

  await browser.close();
}

test().catch(console.error);
