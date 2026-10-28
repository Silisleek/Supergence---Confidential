import { chromium } from 'playwright-core';

async function runCdpProfile() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const client = await page.context().newCDPSession(page);

  await client.send('Profiler.enable');
  await client.send('Profiler.start');

  await page.goto('http://localhost:3009/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const { profile } = await client.send('Profiler.stop');
  await browser.close();

  // Aggregate time per function
  const fnTimes = new Map();
  const samples = profile.samples;
  const timeDeltas = profile.timeDeltas;

  // Build node map
  const nodes = new Map();
  for (const node of profile.nodes) {
    nodes.set(node.id, node);
  }

  for (let i = 0; i < samples.length; i++) {
    const node = nodes.get(samples[i]);
    const delta = timeDeltas[i] || 0;
    if (!node) continue;
    const key = `${node.callFrame.functionName || '(anonymous)'} [${node.callFrame.url.split('/').pop()}:${node.callFrame.lineNumber}]`;
    fnTimes.set(key, (fnTimes.get(key) || 0) + delta);
  }

  const sorted = [...fnTimes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('--- TOP 20 CPU TIME CONSUMERS (CDP PROFILER) ---');
  for (const [fn, timeUs] of sorted) {
    console.log(`${(timeUs / 1000).toFixed(1).padStart(7)} ms : ${fn}`);
  }
}

runCdpProfile().catch(console.error);
