import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  // Create an iframe pointing to the workspace file
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:#222;">
        <iframe id="testIframe" src="http://localhost:3009/workspace/game_equus_quagga_autonomous_3d_equine_st_1792509279931.html" style="width:1000px; height:700px; border:2px solid lime;"></iframe>
      </body>
    </html>
  `);

  const iframeHandle = await page.$('#testIframe');
  const frame = await iframeHandle.contentFrame();

  frame.page().on('console', (msg) => console.log('IFRAME LOG:', msg.text()));
  frame.page().on('pageerror', (err) => console.log('IFRAME ERROR:', err.message));

  console.log('Waiting for frame to load...');
  await page.waitForTimeout(6000);

  const canvas = await frame.$('canvas');
  console.log('Canvas in iframe?', !!canvas);

  await page.screenshot({ path: 'client/images/test_raw_iframe.png' });
  console.log('Saved client/images/test_raw_iframe.png');

  await browser.close();
}

test().catch(console.error);
