import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const t0 = Date.now();
  page.on('request', (req) => {
    if (req.url().includes('unified-turn')) {
      console.log(`[+${Date.now() - t0}ms] [Request Started]`, req.method(), req.url());
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('unified-turn')) {
      console.log(`[+${Date.now() - t0}ms] [Response Received]`, res.status(), res.url());
      try {
        const json = await res.json();
        console.log(
          `[+${Date.now() - t0}ms] [Response Data]:`,
          json.success,
          'Artifacts:',
          json.artifacts?.length,
          'DurationMs:',
          json.durationMs,
        );
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
    window.openWorkspace('Make me a video of a man eating noodles.');
  });

  // Wait 25 seconds and check DOM
  for (let s = 1; s <= 25; s++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const resp = document.querySelector('.response-body-markdown');
      const slot = document.querySelector('.workspace-deck-slot');
      const iframe = slot ? slot.querySelector('iframe') : null;
      return {
        bodySnippet: resp ? resp.textContent.slice(0, 60).replace(/\s+/g, ' ') : null,
        hasIframe: !!iframe,
        iframeSrc: iframe ? iframe.src : null,
      };
    });
    console.log(`[+${Date.now() - t0}ms] State:`, state);
    if (state.hasIframe) {
      console.log('Iframe arrived in workspace deck!');
      break;
    }
  }

  await page.waitForTimeout(2000);
  const out =
    'C:\\Users\\Akshan sharma\\.gemini\\antigravity\\brain\\b4cb1339-bae8-4948-a6e1-0557a4708b93\\turn_workspace_real_result.png';
  await page.screenshot({ path: out, fullPage: false });
  console.log('Saved screenshot to:', out);

  await browser.close();
}

test().catch(console.error);
