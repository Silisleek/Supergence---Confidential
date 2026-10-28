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

  // Remove power overlay
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  console.log('Typing query into #inp...');
  const mainInp = page.locator('#inp');
  await mainInp.fill('Make me a video of a man eating noodles.');
  await mainInp.press('Enter');

  console.log('Pressed enter, waiting for turn response to arrive (up to 30s)...');

  // Poll until activeResponseBody has text or iframe appears
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const hasFinished = await page.evaluate(() => {
      const resp = document.querySelector(
        '.work-response-body, .message.assistant, [id*="response"]',
      );
      const iframe = document.querySelector('iframe[src*="video_"], iframe[src*="noodles"]');
      return {
        hasIframe: !!iframe,
        iframeSrc: iframe ? iframe.src : null,
        respText: resp ? resp.textContent.slice(0, 80) : '',
      };
    });
    console.log(`[Second ${i + 1}] Status:`, hasFinished);
    if (
      hasFinished.hasIframe ||
      (hasFinished.respText && !hasFinished.respText.includes('Synthesizing thoughts'))
    ) {
      console.log('Turn has finished rendering!');
      break;
    }
  }

  await page.waitForTimeout(3000);

  const outPath =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\turn_completed_workspace_view.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot of completed turn to:', outPath);

  // Inspect the iframe inside the page
  const iframeCheck = await page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    return iframes.map((f) => {
      let docBody = null;
      let canvasW = null,
        canvasH = null;
      try {
        const doc = f.contentDocument || f.contentWindow.document;
        docBody = doc ? doc.body.innerHTML.slice(0, 200) : 'cross-origin';
        const c = doc.getElementById('stage');
        if (c) {
          canvasW = c.offsetWidth;
          canvasH = c.offsetHeight;
        }
      } catch (e) {
        docBody = 'error: ' + e.message;
      }
      return {
        id: f.id,
        src: f.src,
        w: f.offsetWidth,
        h: f.offsetHeight,
        canvasW,
        canvasH,
        docBody,
      };
    });
  });
  console.log('Iframe details:', iframeCheck);

  await browser.close();
}

test().catch(console.error);
