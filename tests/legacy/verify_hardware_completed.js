import { chromium } from 'playwright-core';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await context.addInitScript(() => localStorage.setItem('supergence_powered_on', 'true'));
  const page = await context.newPage();

  await page.route(
    (url) => {
      const u = url.href;
      return !u.includes('127.0.0.1') && !u.includes('localhost');
    },
    (route) => route.abort(),
  );

  await page.goto('http://127.0.0.1:3008/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  const query =
    'Perform an OpenClaw hardware and OS forensic telemetry audit on this Windows machine and compute our active cognitive survival score.';
  console.log('Sending query:', query);

  await page.evaluate((q) => {
    window.openWorkspace(q);
  }, query);

  console.log('Waiting for completion...');
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const respEls = document.querySelectorAll('.response-body-markdown');
      const latest = respEls.length > 0 ? respEls[respEls.length - 1] : null;
      const text = latest ? latest.innerText : '';
      const sendBtn = document.getElementById('workspaceSendBtn');
      const isDone =
        sendBtn &&
        !sendBtn.disabled &&
        (sendBtn.style.opacity === '1' || sendBtn.style.opacity === '');
      return {
        text,
        isDone,
        hasIntel:
          text.includes('Intel') ||
          text.includes('Core') ||
          text.includes('1315U') ||
          text.includes('CPU'),
        hasRam:
          text.includes('RAM') ||
          text.includes('GiB') ||
          text.includes('GB') ||
          text.includes('Memory'),
        hasScore: text.includes('Survival') || text.includes('Score') || text.includes('S ='),
        length: text.length,
      };
    });

    if (state.length > 100) {
      process.stdout.write(`\r  [${i + 1}s] Text length: ${state.length}...`);
    }

    if (state.isDone && state.length > 300) {
      console.log(`\n✓ Completed in ${i + 1}s! Length: ${state.length}`);
      console.log('  Includes Intel / CPU:', state.hasIntel);
      console.log('  Includes RAM / Memory:', state.hasRam);
      console.log('  Includes Survival Formula / Score:', state.hasScore);
      break;
    }
  }

  await page.waitForTimeout(2000);
  const shot = path.join(ARTIFACT_DIR, 'supergence_live_hardware_telemetry_completed.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('✓ Saved screenshot:', shot);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
