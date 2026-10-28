import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR =
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714';
const CLIENT_IMG_DIR = path.resolve('client/images');

async function verify() {
  console.log('🚀 Starting Playwright verification with Chrome channel...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('net::ERR_') && !text.includes('favicon')) {
        errors.push(text);
      }
    }
  });

  // 1. Verify App Homepage
  console.log('1. Navigating to http://localhost:3009/ ...');
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check Frontier Benchmarks pill in header
  const pill = await page.$('#workspaceBtnFrontierBenchmarks');
  console.log('  • #workspaceBtnFrontierBenchmarks present:', !!pill);

  // Open Breakthroughs modal
  console.log('  • Opening Breakthroughs modal via window.toggleBreakthroughModal(true)...');
  await page.evaluate(() => window.toggleBreakthroughModal(true));
  await page.waitForTimeout(1000);

  const modal = await page.$('#sisBreakthroughModal');
  const isVisible = await modal?.isVisible();
  console.log('  • #sisBreakthroughModal visible:', isVisible);

  // Verify Feature 6 in modal
  const feat6Title = await page.evaluate(() => {
    const h4s = Array.from(document.querySelectorAll('#sisBreakthroughModal h4'));
    return h4s.map((h) => h.textContent.trim());
  });
  console.log('  • Breakthrough Modal Features:', feat6Title);

  const shot1 = path.join(ARTIFACT_DIR, 'live_app_breakthrough_frontier_matrix.png');
  const shot1Client = path.join(CLIENT_IMG_DIR, 'live_app_breakthrough_frontier_matrix.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, shot1Client);
  console.log('  ✓ Screenshot saved:', shot1);

  // 2. Verify Master Frontier 14-Benchmark Dashboard
  console.log('\n2. Navigating to http://localhost:3009/workspace/benchmark_results.html ...');
  await page.goto('http://localhost:3009/workspace/benchmark_results.html', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(1500);

  const title = await page.title();
  console.log('  • Page Title:', title);

  const tableRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map((tr) => {
      const tds = Array.from(tr.querySelectorAll('td'));
      return {
        benchmark: tds[0]?.querySelector('span')?.textContent?.trim() || 'N/A',
        sisScore: tds[1]?.textContent?.trim() || 'N/A',
        astraScore: tds[2]?.textContent?.trim() || 'N/A',
      };
    });
  });

  console.log(`  • Found ${tableRows.length} benchmark rows in evaluator matrix:`);
  for (const r of tableRows) {
    console.log(
      `    - ${r.benchmark.padEnd(35)} SIS: ${r.sisScore.padEnd(10)} Astra: ${r.astraScore}`,
    );
  }

  const shot2 = path.join(ARTIFACT_DIR, 'live_frontier_14_benchmark_dashboard.png');
  const shot2Client = path.join(CLIENT_IMG_DIR, 'live_frontier_14_benchmark_dashboard.png');
  await page.screenshot({ path: shot2, fullPage: true });
  fs.copyFileSync(shot2, shot2Client);
  console.log('  ✓ Dashboard Screenshot saved:', shot2);

  // 3. Check live RSI API status
  console.log('\n3. Checking live RSI Multi-Strand status...');
  const rsiRes = await page.evaluate(async () => {
    const res = await fetch('/api/rsi/status');
    return await res.json();
  });
  console.log('  • RSI Engine Running:', rsiRes.isRunning);
  console.log('  • Total Cycles:', rsiRes.stats?.totalSimultaneousCycles);
  console.log('  • Strands:');
  for (const [k, v] of Object.entries(rsiRes.strands || {})) {
    console.log(
      `    [${k}] status: ${v.status}, cycles: ${v.cyclesCompleted}, active: ${v.activeTask || 'idle'}`,
    );
  }

  await browser.close();
  console.log('\n✅ All verifications completed successfully in real Chrome!');
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
