import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';
import { creationBenchmarks } from '../quality/creation-benchmarks.js';
import { studioPath } from './creationStudio.js';
import { sessionAuth } from '../security/session-auth.js';

export async function verifyCreationTask({ filename, task }) {
  const suite = creationBenchmarks.find((suite) => suite.id === task);
  if (!suite)
    throw new Error(
      `Supported behavioral suites: ${creationBenchmarks.map((task) => task.id).join(', ')}. Other tasks need their own behavioral tests.`,
    );
  const file = await studioPath(filename);
  await fs.access(file);
  const port = Number(process.env.ACTIVE_SERVER_PORT);
  if (!port) throw new Error('Run this task verifier through the active app server.');
  const name = `supergence/reports/task-${randomUUID().slice(0, 8)}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const checks = [],
    errors = [],
    renderingErrors = [],
    renderingWarnings = [];
  const startedAt = Date.now();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      acceptDownloads: true,
    });
    if (sessionAuth?.secret) {
      await page.setExtraHTTPHeaders({
        authorization: `Bearer ${sessionAuth.secret}`,
      });
    }
    page.setDefaultTimeout(7000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        ['error', 'warning'].includes(message.type()) &&
        /THREE\.|WebGL|GL_INVALID|object can't be added/i.test(message.text())
      ) {
        const value = message.text();
        if (
          (/Program Info Log:/.test(value) &&
            /warning X4122/.test(value) &&
            !/ERROR:|failed to compile|VALIDATE_STATUS.*false/i.test(value)) ||
          /THREE\.[^:]+:.*(?:deprecated|has been removed\. Using)/i.test(value)
        )
          renderingWarnings.push(value.slice(0, 700));
        else renderingErrors.push(value.slice(0, 700));
      }
    });
    const check = async (name, work) => {
      try {
        await work();
        checks.push({ name, passed: true });
      } catch (error) {
        checks.push({ name, passed: false, error: error.message });
      }
    };
    await page.goto(
      `http://127.0.0.1:${port}/workspace/${filename.split('/').map(encodeURIComponent).join('/')}`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    const documentReadyMs = Date.now() - startedAt;
    const captures = {};
    const capture = async (label) => {
      if (!/^[a-z-]{1,30}$/.test(label)) throw new Error('Invalid capture label.');
      const target = await studioPath(`${name}-${label}.png`);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await page.screenshot({ path: target, animations: 'disabled' });
      captures[label] = `/workspace/${name}-${label}.png`;
    };
    await suite.check(page, check, { capture });
    const screenshotFile = await studioPath(`${name}-desktop.png`);
    await fs.mkdir(path.dirname(screenshotFile), { recursive: true });
    await page.screenshot({ path: screenshotFile, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await check('mobile layout has no horizontal overflow', async () => {
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2))
        throw new Error('Page overflows the phone viewport.');
    });
    await page.screenshot({ path: await studioPath(`${name}-mobile.png`), fullPage: true });
    checks.push({
      name: 'no observed uncaught runtime errors',
      passed: errors.length === 0,
      errors,
    });
    checks.push({
      name: 'no observed Three.js or WebGL console errors',
      passed: renderingErrors.length === 0,
      errors: renderingErrors,
    });
    const result = {
      task,
      filename,
      checkedAt: new Date().toISOString(),
      documentReadyMs,
      elapsedMs: Date.now() - startedAt,
      passed: checks.every((check) => check.passed),
      checks,
      passedChecks: checks.filter((check) => check.passed).length,
      totalChecks: checks.length,
      screenshots: {
        ...captures,
        desktop: `/workspace/${name}-desktop.png`,
        mobile: `/workspace/${name}-mobile.png`,
      },
      visualReview: { status: 'not-automatically-scored', criteria: suite.visualReview },
      renderingWarnings,
      scope:
        'Executed acceptance tests in isolated Chrome. Not a universal quality score or proof of all behavior.',
    };
    await fs.writeFile(await studioPath(`${name}.json`), JSON.stringify(result, null, 2));
    return {
      ...result,
      checks: result.checks,
      report: `/workspace/${name}.json`,
    };
  } finally {
    await browser.close();
  }
}

export async function reviewWorkspaceVisual({ filename, brief, actions = [] }) {
  if (typeof brief !== 'string' || !brief.trim())
    throw new Error('Supply the original visual brief.');
  const { verifyStudioArtifact } = await import('./creationStudio.js');
  const capture = await verifyStudioArtifact({ filename, actions });
  const image = await fs.readFile(
    await studioPath(decodeURIComponent(capture.screenshot.replace('/workspace/', ''))),
  );
  const { quickAI, DEFAULT_MODEL } = await import('../api/openrouter.js');
  const review = await quickAI({
    model: DEFAULT_MODEL,
    systemPrompt:
      'Critique the ONE actual attached screenshot against the user brief. Identify at most five concrete defects VISIBLE IN THIS SINGLE IMAGE, prioritize subject fidelity, geometry, material response, composition, legibility, and unfinished UI. Explain specific repairs and the visible evidence for each. Do not refer to other screenshots/views, infer invisible behavior, certify correctness, or assign a numeric quality score. If you cannot access the image, say so plainly.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: brief },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${image.toString('base64')}` },
          },
        ],
      },
    ],
    maxTokens: 1800,
    temperature: 0.15,
  });
  return {
    filename,
    screenshot: capture.screenshot,
    renderPassed: capture.passed,
    review: String(review),
    model: DEFAULT_MODEL,
    scope:
      'Model critique of captured pixels; behavioral correctness requires separate executed tests.',
  };
}
