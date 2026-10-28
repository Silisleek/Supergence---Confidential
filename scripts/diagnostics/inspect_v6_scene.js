import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3009/workspace/game_equus_quagga_realistic_v6.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);

  const beforeRear = await page.evaluate(() => {
    const hooves = [];
    window.__threeScene.traverse((o) => {
      if (o.isMesh && o.material && o.material.metalness === 0.18) {
        const wp = new window.THREE.Vector3();
        o.getWorldPosition(wp);
        hooves.push({
          parentName: o.parent ? o.parent.name || o.parent.type : null,
          localPos: o.position,
          worldPos: wp,
        });
      }
    });
    return hooves;
  });
  console.log('Before Rear Hooves:', JSON.stringify(beforeRear, null, 2));

  // Click rear
  await page.click('button[data-gait="rear"]');
  await page.waitForTimeout(2000);

  const afterRear = await page.evaluate(() => {
    const hooves = [];
    window.__threeScene.traverse((o) => {
      if (o.isMesh && o.material && o.material.metalness === 0.18) {
        const wp = new window.THREE.Vector3();
        o.getWorldPosition(wp);
        hooves.push({
          parentName: o.parent ? o.parent.name || o.parent.type : null,
          localPos: o.position,
          worldPos: wp,
        });
      }
    });
    return hooves;
  });
  console.log('After Rear Hooves:', JSON.stringify(afterRear, null, 2));

  await browser.close();
}

main().catch(console.error);
