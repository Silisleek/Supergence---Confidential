import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Loading app...');
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Remove overlay & call openWorkspace
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    window.openWorkspace('Make me a video of a man eating noodles.');
  });

  console.log('Called openWorkspace, waiting for turn completion...');

  // Wait until .workspace-deck-slot has content
  let hasDeckContent = false;
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(1000);
    hasDeckContent = await page.evaluate(() => {
      const slot = document.querySelector('.workspace-deck-slot');
      const iframe = slot ? slot.querySelector('iframe') : null;
      return {
        hasSlot: !!slot,
        hasIframe: !!iframe,
        iframeSrc: iframe ? iframe.src : null,
        slotHtml: slot ? slot.innerHTML.slice(0, 100) : '',
      };
    });
    console.log(`[Second ${i + 1}] Deck status:`, hasDeckContent);
    if (hasDeckContent.hasIframe) break;
  }

  // Wait 3 seconds for iframe contents to fully render
  await page.waitForTimeout(3000);

  const outPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\turn_actual_completed_view.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot of actual completed turn to:', outPath);

  // Now inspect what is inside the iframe in the deck slot
  const iframeInspection = await page.evaluate(() => {
    const slotIframe = document.querySelector('.workspace-deck-slot iframe');
    if (!slotIframe) return { error: 'no slot iframe found' };
    let canvasFound = false;
    let canvasW = 0,
      canvasH = 0;
    let errors = [];
    try {
      const doc = slotIframe.contentDocument || slotIframe.contentWindow.document;
      const canvas = doc.getElementById('stage');
      if (canvas) {
        canvasFound = true;
        canvasW = canvas.offsetWidth;
        canvasH = canvas.offsetHeight;
        const ctx = canvas.getContext('2d');
        const pixel = ctx.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
        ).data;
        return {
          src: slotIframe.src,
          iframeW: slotIframe.offsetWidth,
          iframeH: slotIframe.offsetHeight,
          canvasFound: true,
          canvasW,
          canvasH,
          centerPixel: Array.from(pixel),
          title: doc.title,
          bodyHtml: doc.body.innerHTML.slice(0, 300),
        };
      }
      return {
        src: slotIframe.src,
        iframeW: slotIframe.offsetWidth,
        iframeH: slotIframe.offsetHeight,
        canvasFound: false,
        bodyHtml: doc.body.innerHTML.slice(0, 300),
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Deck Iframe Inspection:', iframeInspection);

  await browser.close();
}

test().catch(console.error);
