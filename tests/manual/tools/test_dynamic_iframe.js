import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="container">
          <iframe id="testFrame" src="about:blank" style="width:500px; height:500px; display:none;"></iframe>
        </div>
      </body>
    </html>
  `);

  console.log('Testing replacement / reload methods...');
  const result = await page.evaluate(() => {
    const oldIframe = document.getElementById('testFrame');
    const newIframe = document.createElement('iframe');
    newIframe.id = 'testFrame';
    newIframe.style.width = '500px';
    newIframe.style.height = '500px';
    newIframe.style.border = 'none';
    newIframe.src =
      'http://localhost:3009/workspace/game_equus_quagga_autonomous_3d_equine_st_1792509279931.html';
    oldIframe.parentElement.replaceChild(newIframe, oldIframe);
    return 'replaced';
  });
  console.log('Evaluation:', result);

  await page.waitForTimeout(4000);

  const iframeHandle = await page.$('#testFrame');
  const frame = await iframeHandle.contentFrame();
  console.log('Frame URL after replaceChild:', frame.url());
  const canvas = await frame.$('canvas');
  console.log('Canvas found after replaceChild?', !!canvas);

  await browser.close();
}

test().catch(console.error);
