import { chromium } from 'playwright-core';

async function runPerfProfile() {
  console.log('Launching Chrome to profile http://localhost:3009/ ...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.error('[PageError]', err.message));

  // Inject longtask and FPS observer before navigation
  await page.addInitScript(() => {
    window.__longTasks = [];
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTasks.push({
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('LongTask observer not supported', e);
    }

    window.__frameTimes = [];
    let lastTime = performance.now();
    function trackFrame(now) {
      const delta = now - lastTime;
      lastTime = now;
      if (window.__frameTimes.length < 500) {
        window.__frameTimes.push(delta);
      }
      requestAnimationFrame(trackFrame);
    }
    requestAnimationFrame(trackFrame);
  });

  const tStart = performance.now();
  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const dclTime = Math.round(performance.now() - tStart);

  await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
  const loadTime = Math.round(performance.now() - tStart);

  console.log(`DOM Content Loaded: ${dclTime}ms`);
  console.log(`Window Load: ${loadTime}ms`);

  // Wait 4 seconds to collect FPS and long tasks
  await page.waitForTimeout(4000);

  const metrics = await page.evaluate(() => {
    const frames = window.__frameTimes.slice(10); // Skip initial startup warmup
    const avgDelta = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 0;
    const fps = avgDelta > 0 ? Math.round(1000 / avgDelta) : 0;
    const maxDelta = frames.length ? Math.round(Math.max(...frames)) : 0;
    const longTasks = window.__longTasks || [];
    const totalLongTaskTime = longTasks.reduce((sum, t) => sum + t.duration, 0);

    return {
      framesCount: frames.length,
      avgFrameTimeMs: avgDelta.toFixed(1),
      fps,
      maxFrameTimeMs: maxDelta,
      longTaskCount: longTasks.length,
      totalLongTaskDurationMs: totalLongTaskTime,
      longestTasks: longTasks.sort((a, b) => b.duration - a.duration).slice(0, 5),
      jsHeapUsedMB: performance.memory
        ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)
        : 'N/A',
    };
  });

  console.log('--- POST-OPTIMIZATION PERFORMANCE METRICS ---');
  console.log(`FPS: ${metrics.fps}`);
  console.log(`Avg Frame Time: ${metrics.avgFrameTimeMs}ms (60 FPS = 16.6ms)`);
  console.log(`Max Frame Spike: ${metrics.maxFrameTimeMs}ms`);
  console.log(
    `Long Tasks (>50ms): ${metrics.longTaskCount} (Total freeze: ${metrics.totalLongTaskDurationMs}ms)`,
  );
  console.log(`Top Long Tasks:`, metrics.longestTasks);
  console.log(`JS Heap Used: ${metrics.jsHeapUsedMB} MB`);

  await browser.close();
}

runPerfProfile().catch(console.error);
