// Observe native browser FileReader failures. No city code/assets are changed.
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const report = {};
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  await page.addInitScript(() => {
    window.__fileReadAudit = [];
    const Original = window.FileReader;
    window.FileReader = class extends Original {
      constructor() {
        super();
        this.addEventListener('loadend', () =>
          window.__fileReadAudit.push({
            size: this.__blobSize,
            resultBytes: this.result?.byteLength,
            error: this.error?.name,
            message: this.error?.message,
          }),
        );
      }
      readAsArrayBuffer(blob) {
        this.__blobSize = blob.size;
        return super.readAsArrayBuffer(blob);
      }
    };
  });
  await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.YUNLAN?.ready, null, { timeout: 120000, polling: 100 });
  report.before = await page.evaluate(() => ({
    frames: window.YUNLAN.frames,
    stats: window.YUNLAN.stats,
  }));
  report.export = await page.evaluate(async () => {
    const blob = await window.YUNLAN.exportGLB({ download: false });
    return {
      size: blob.size,
      header: [...new Uint8Array(await blob.slice(0, 20).arrayBuffer())],
      reads: window.__fileReadAudit,
    };
  });
} catch (error) {
  report.error = error.message;
} finally {
  await browser.close();
  await fs.writeFile(
    'test-results/project-workflow/export-probe.json',
    JSON.stringify(report, null, 2),
  );
}
console.log(JSON.stringify(report));
