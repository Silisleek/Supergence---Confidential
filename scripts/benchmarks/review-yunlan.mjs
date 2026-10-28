// Read-only external browser QA. The evaluator authors no city source/assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { deepChecks } from './yunlan-deep-checks.mjs';

const url = process.argv[2];
if (!url) throw new Error('Supply the actual generated city preview URL.');
const output = path.resolve('test-results/project-workflow/city-browser');
const runName = `run-${Date.now()}-${process.pid}`;
await fs.mkdir(output, { recursive: true });
const report = { url, pageErrors: [], consoleErrors: [], failedResources: [], passed: false };
const software = process.argv.includes('--software');
const angle = process.argv.includes('--angle');
report.renderMode = software ? 'software-swiftshader' : angle ? 'chrome-angle' : 'default-chrome';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  ...(software
    ? { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
    : angle
      ? { args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] }
      : {}),
});
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => {
    window.__yunlanExternalErrors = [];
    window.addEventListener('error', (event) => window.__yunlanExternalErrors.push(event.message));
    window.addEventListener('unhandledrejection', (event) =>
      window.__yunlanExternalErrors.push(String(event.reason)),
    );
  });
  page.on('pageerror', (error) => report.pageErrors.push(error.stack || error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.location().url?.endsWith('/favicon.ico'))
      report.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico'))
      report.failedResources.push({ url: response.url(), status: response.status() });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.bringToFront();
  await page.waitForFunction(
    () =>
      window.YUNLAN?.ready ||
      document.querySelector('#err')?.textContent.trim() ||
      window.__yunlanExternalErrors.length,
    undefined,
    { timeout: 120000, polling: 100 },
  );
  report.errorPanel = await page
    .locator('#err')
    .textContent()
    .catch(() => '');
  report.state = await page.evaluate(() => {
    const app = window.YUNLAN;
    if (!app) return null;
    const scene = app.scene;
    let meshes = 0,
      vertices = 0,
      triangles = 0;
    scene?.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;
      meshes++;
      vertices += object.geometry.attributes.position?.count || 0;
      triangles +=
        (object.geometry.index?.count || object.geometry.attributes.position?.count || 0) / 3;
    });
    return {
      ready: app.ready,
      frames: app.frames,
      errors: app.errors,
      camera: app.camera?.position.toArray(),
      meshes,
      vertices,
      triangles,
      renderer: (() => {
        const gl = app.renderer?.getContext(),
          ext = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl && gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      })(),
      stats: app.stats,
    };
  });
  await page.screenshot({ path: path.join(output, runName + '.png'), timeout: 60000 });
  await fs.copyFile(path.join(output, runName + '.png'), path.join(output, 'first-render.png'));
  report.screenshot = path.join(output, runName + '.png');
  report.passed = Boolean(
    report.state?.ready &&
    report.state.frames > 0 &&
    report.state.camera.every(Number.isFinite) &&
    report.state.meshes > 0 &&
    !report.state.errors?.length &&
    !report.pageErrors.length &&
    !report.consoleErrors.length &&
    !report.failedResources.length,
  );
  report.firstRenderPassed = report.passed;
  if (report.passed && process.argv.includes('--deep')) {
    report.deep = await deepChecks(page, output, runName);
    report.passed = report.deep.passed;
  }
} catch (error) {
  report.failure = error.message;
} finally {
  await fs.writeFile(path.join(output, runName + '.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(output, 'first-render.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
