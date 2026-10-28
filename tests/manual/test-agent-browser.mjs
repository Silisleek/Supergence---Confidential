import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function testAgentBrowser() {
  console.log('🚀 Testing Agent Personal Browser Architecture...');

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'ms-playwright',
      'chromium-1155',
      'chrome-win',
      'chrome.exe',
    ),
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'ms-playwright',
      'chromium-1153',
      'chrome-win',
      'chrome.exe',
    ),
  ];
  const executablePath = chromePaths.find((p) => fs.existsSync(p));

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    channel: executablePath ? undefined : 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log('✓ Playwright Browser initialized');

  // Agent 1: Bio-SIS (Emerald)
  const bioContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const bioPage = await bioContext.newPage();

  // Agent 2: Nova-Dev (Sky Blue)
  const novaContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const novaPage = await novaContext.newPage();

  console.log('✓ Created isolated contexts for Bio-SIS and Nova-Dev');

  // Navigate Bio-SIS to example.com
  await bioPage.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  const bioTitle = await bioPage.title();
  console.log(`✓ Bio-SIS loaded: ${bioTitle}`);

  // Injected Virtual Cursor Script Test
  const cursorScript = `
    (function() {
      if (document.getElementById('agent-virtual-cursor')) return;
      const cursor = document.createElement('div');
      cursor.id = 'agent-virtual-cursor';
      cursor.style.cssText = 'position:fixed; top:0; left:0; width:22px; height:22px; border-radius:50%; background:#10B981; border:2px solid #FFFFFF; box-shadow:0 0 16px #10B981, 0 4px 12px rgba(0,0,0,0.5); pointer-events:none; z-index:999999; transform:translate(-50%, -50%); transition:transform 0.05s ease-out; display:flex; align-items:center; justify-content:center;';
      
      const badge = document.createElement('div');
      badge.id = 'agent-cursor-badge';
      badge.textContent = 'Bio-SIS 🧬';
      badge.style.cssText = 'position:absolute; left:26px; top:-2px; background:rgba(10,15,24,0.85); color:#F4F0E0; font-family:sans-serif; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #10B981; white-space:nowrap; pointer-events:none; box-shadow:0 2px 8px rgba(0,0,0,0.4);';
      cursor.appendChild(badge);

      const ripple = document.createElement('div');
      ripple.id = 'agent-cursor-ripple';
      ripple.style.cssText = 'position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid #10B981; pointer-events:none; opacity:0; transform:scale(1);';
      cursor.appendChild(ripple);

      document.body.appendChild(cursor);

      window.updateAgentCursor = function(x, y, isClick, label) {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        if (label) badge.textContent = label;
        if (isClick) {
          ripple.animate([
            { transform: 'scale(1)', opacity: 0.9 },
            { transform: 'scale(2.8)', opacity: 0 }
          ], { duration: 400, easing: 'ease-out' });
        }
      };
    })();
  `;

  await bioPage.evaluate(cursorScript);
  await bioPage.evaluate(() =>
    window.updateAgentCursor(200, 250, true, 'Bio-SIS 🧬 [Clicked Link]'),
  );

  // Take screenshot with cursor visible
  const shotBuffer = await bioPage.screenshot({ type: 'jpeg', quality: 70 });
  console.log(`✓ Bio-SIS Screenshot captured: ${shotBuffer.length} bytes with virtual cursor!`);

  await bioContext.close();
  await novaContext.close();
  await browser.close();
  console.log('✓ All tests passed cleanly!');
}

testAgentBrowser().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
