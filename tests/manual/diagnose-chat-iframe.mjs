import { chromium } from 'playwright-core';

async function diagnoseChatIframe() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3008/', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
  });

  const input = page.locator('#inp');
  await input.fill('Make me a video of a man eating noodles.');
  await page.locator('#sendBtn').click();

  // Wait for turn completion
  await page.waitForTimeout(22000);

  const frames = page.frames().map((f) => ({ url: f.url(), name: f.name() }));
  console.log('All Frames in page:', JSON.stringify(frames, null, 2));

  const chatIframes = await page.locator('#activeDeckSlot iframe').all();
  console.log('Chat iframes count:', chatIframes.length);
  for (let i = 0; i < chatIframes.length; i++) {
    const src = await chatIframes[i].getAttribute('src');
    const box = await chatIframes[i].boundingBox();
    console.log(`Chat iframe ${i}: src=${src}, box=${JSON.stringify(box)}`);
  }

  // Find the frame corresponding to the chat card
  // Check how many frames have video_man_eating_noodles
  const videoFrames = page.frames().filter((f) => f.url().includes('video_man_eating_noodles'));
  console.log('Video frames matching:', videoFrames.length);
  for (let i = 0; i < videoFrames.length; i++) {
    const vf = videoFrames[i];
    const htmlLen = (await vf.content()).length;
    const canvasInfo = await vf.evaluate(() => {
      const c = document.getElementById('stage');
      const ctx = c?.getContext('2d');
      const pixel = ctx?.getImageData(640, 360, 1, 1).data;
      return {
        width: c?.width,
        height: c?.height,
        pixel: pixel ? Array.from(pixel) : null,
      };
    });
    console.log(
      `Video frame ${i} (url: ${vf.url()}): htmlLen=${htmlLen}, canvasInfo=${JSON.stringify(canvasInfo)}`,
    );
  }

  await browser.close();
}

diagnoseChatIframe().catch(console.error);
