import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:#111;">
        <div id="container" style="width:100%; height:100%;">
          <iframe id="testFrame" src="about:blank" style="width:1000px; height:700px; border:none; display:none;"></iframe>
        </div>
      </body>
    </html>
  `);

  console.log('Replacing iframe with new src...');
  await page.evaluate(() => {
    const oldIframe = document.getElementById('testFrame');
    const newIframe = document.createElement('iframe');
    newIframe.id = 'testFrame';
    newIframe.style.width = '1000px';
    newIframe.style.height = '700px';
    newIframe.style.border = 'none';
    newIframe.allow = 'autoplay; fullscreen; camera; microphone';
    newIframe.src =
      'http://localhost:3009/workspace/game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
    oldIframe.parentElement.replaceChild(newIframe, oldIframe);
  });

  const iframeHandle = await page.$('#testFrame');
  const frame = await iframeHandle.contentFrame();
  console.log('Frame URL:', frame.url());

  console.log('Waiting for canvas...');
  await frame.waitForSelector('canvas', { timeout: 15000 });
  console.log('✓ Canvas confirmed!');

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'client/images/test_replacechild_success.png' });
  console.log('Screenshot saved to client/images/test_replacechild_success.png');

  await browser.close();
}

test().catch(console.error);
