import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set SIS_BASE_URL to the running isolated app.');
const output = path.resolve('test-results/knowledge-library');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
page.setDefaultTimeout(60000);
const errors = [];
const created = new Set();
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.LearningPanel);
  await page.locator('#railLearning').click();
  await page.locator('#learningStatus').filter({ hasText: 'retained sources' }).waitFor();
  await page.getByRole('button', { name: 'Retain knowledge', exact: true }).click();
  const extensions = [
    'txt',
    'md',
    'markdown',
    'rst',
    'adoc',
    'tex',
    'log',
    'json',
    'jsonl',
    'ndjson',
    'csv',
    'tsv',
    'yaml',
    'yml',
    'toml',
    'ini',
    'cfg',
    'conf',
    'properties',
    'xml',
    'html',
    'svg',
    'css',
    'scss',
    'js',
    'mjs',
    'cjs',
    'jsx',
    'ts',
    'tsx',
    'py',
    'rs',
    'go',
    'c',
    'cpp',
  ];
  const prefix = `browserknowledge${Date.now()}`;
  await page.locator('#learningFile').setInputFiles(
    extensions.map((ext, i) => ({
      name: `${prefix}-${i}.${ext}`,
      mimeType: 'text/plain',
      buffer: Buffer.from(`${prefix} record ${i}\narchivemark${i} threshold ${i + 10}`),
    })),
  );
  await page.locator('#learningImportForm [type="submit"]').click();
  await page.locator('#learningStatus').filter({ hasText: '35/35 files retained' }).waitFor();
  const imported = (
    await (await page.request.get(`${baseURL}/api/learning/library`)).json()
  ).sources.filter((source) => source.title.startsWith(prefix));
  imported.forEach((source) => created.add(source.id));
  assert.equal(imported.length, 35);
  assert.ok(await page.locator('[data-learning-view="library"]').isVisible());
  await page.locator('#learningSearch').fill('archivemark34');
  await page.locator('.learning-source-text').filter({ hasText: 'threshold 44' }).waitFor();
  await page.locator('#learningSearch').fill('');
  const source = imported.find((item) => item.title.endsWith('-34.cpp'));
  const card = page.locator(`[data-source-id="${source.id}"]`);
  await card.getByRole('button', { name: 'Edit source', exact: true }).click();
  await card
    .locator('.learning-edit-form [name="content"]')
    .fill(`${prefix} savedrule: always preserve source citations.`);
  await card.locator('.learning-edit-form [name="rule"]').check();
  await card.getByRole('button', { name: 'Save edits' }).click();
  await page.locator('#learningStatus').filter({ hasText: 'Source updated' }).waitFor();
  await card
    .locator('.learning-source-meta')
    .filter({ hasText: 'Saved rule · Revision 2' })
    .waitFor();
  await page.screenshot({ path: path.join(output, 'edited-source.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sisWorkspaceReady && window.LearningPanel);
  await page.locator('#railLearning').click();
  await page
    .locator(`[data-source-id="${source.id}"] .learning-source-meta`)
    .filter({ hasText: 'Saved rule · Revision 2' })
    .waitFor();
  await page.locator('#learningSearch').fill('savedrule');
  await page
    .locator('.learning-source-text')
    .filter({ hasText: 'always preserve source citations' })
    .waitFor();
  const current = (
    await (await page.request.get(`${baseURL}/api/learning/sources/${source.id}`)).json()
  ).source;
  assert.equal(current.sourceType, 'user-rule');
  const stale = await page.request.put(`${baseURL}/api/learning/sources/${source.id}`, {
    data: { content: 'stale browser edit', expectedDigest: source.digest },
  });
  assert.equal(stale.status(), 400);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        imported: imported.length,
        formats: extensions.length,
        checks: [
          'multi-file import',
          'cited search',
          'edit retained content',
          'save rule',
          'reload persistence',
          'reject stale edit',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'Passed: 35 formats imported in Chrome; cited recall, editing, saved rule, reload and stale-edit rejection.',
  );
} finally {
  for (const id of created) await page.request.delete(`${baseURL}/api/learning/sources/${id}`);
  await browser.close();
}
