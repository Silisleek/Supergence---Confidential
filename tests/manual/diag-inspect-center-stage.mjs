import { chromium } from 'playwright-core';

async function inspectCenterStage() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3008/');
  await page.evaluate(() => {
    localStorage.setItem('supergence_powered_on', 'true');
    const overlay = document.getElementById('powerOnOverlay');
    if (overlay) overlay.remove();
    document.getElementById('supergenceWorkspace').classList.add('active');
    document.getElementById('homeView').style.display = 'none';

    // Load space game
    loadHeroArtifact({
      url: '/workspace/game_3d_space_shooter_game_1792038054503.html',
      name: 'game_3d_space_shooter_game_1792038054503.html',
      title: '3D Space Shooter Game',
    });
  });

  await page.waitForTimeout(1500);

  const diag = await page.evaluate(() => {
    const iframe = document.getElementById('sideHeroArtifactIframe');
    const placeholder = document.getElementById('sideHeroSynthesizingPlaceholder');
    const pane = document.getElementById('workspaceSideBrowserPane');
    const frameDoc = iframe ? iframe.contentDocument || iframe.contentWindow?.document : null;
    return {
      pane: {
        display: getComputedStyle(pane).display,
        width: pane.offsetWidth,
        height: pane.offsetHeight,
      },
      iframe: {
        src: iframe?.src,
        display: getComputedStyle(iframe).display,
        width: iframe?.offsetWidth,
        height: iframe?.offsetHeight,
        hasDoc: !!frameDoc,
        bodyHtmlLength: frameDoc ? frameDoc.body?.innerHTML?.length : 0,
        buttons: frameDoc
          ? Array.from(frameDoc.querySelectorAll('button')).map((b) => b.textContent)
          : [],
      },
      placeholder: {
        display: getComputedStyle(placeholder).display,
      },
    };
  });

  console.log('Center Stage Diag:', JSON.stringify(diag, null, 2));

  await page.screenshot({
    path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/diag_inspect_center_stage.png',
  });

  // Now click LAUNCH FIGHTER if button found
  const frame = page.frameLocator('#sideHeroArtifactIframe');
  const btn = frame.locator('button:has-text("LAUNCH FIGHTER")');
  const isVis = await btn.isVisible();
  console.log('Is LAUNCH FIGHTER visible in frameLocator?', isVis);
  if (isVis) {
    await btn.click();
    console.log('Clicked LAUNCH FIGHTER!');
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: 'C:/Users/Akshan sharma/.gemini/antigravity/brain/b4cb1339-bae8-4948-a6e1-0557a4708b93/diag_after_launch_click.png',
    });
  }

  await browser.close();
}

inspectCenterStage().catch(console.error);
