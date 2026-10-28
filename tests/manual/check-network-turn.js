import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('request', (req) => {
    if (req.url().includes('unified-turn')) {
      console.log('[Request Started]', req.method(), req.url());
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('unified-turn')) {
      console.log('[Response Received]', res.status(), res.url());
      try {
        const json = await res.json();
        console.log('[Response Data Success]:', json.success, 'Artifacts:', json.artifacts?.length);
      } catch (e) {
        console.log('[Response parse error]:', e.message);
      }
    }
  });

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

  // Wait 8 seconds
  await page.waitForTimeout(8000);

  // Check DOM state
  const state = await page.evaluate(() => {
    const stream = document.getElementById('chatTurnsStream');
    const turns = stream ? stream.querySelectorAll('.chat-turn-item').length : 0;
    const body = document.querySelector('.response-body-markdown');
    const slot = document.querySelector('.workspace-deck-slot');
    return {
      turnsCount: turns,
      bodyText: body ? body.textContent : null,
      slotHtml: slot ? slot.innerHTML : null,
    };
  });
  console.log('DOM State after 8s:', state);

  await browser.close();
}

test().catch(console.error);
