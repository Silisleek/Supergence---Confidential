import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';
import OpenAI from 'openai';
import { resolveClientAndModel } from '../../server/api/openrouter.js';
import workspace from '../../server/workspace/manager.js';
import { creationBenchmarks } from '../../server/quality/creation-benchmarks.js';

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const baseURL = argument('--base-url', process.env.SIS_BASE_URL);
if (!baseURL) throw new Error('Set SIS_BASE_URL to the actual backend startup URL.');
const systems = argument('--systems', 'supergence,qwen/qwen3.8-27b').split(',');
const selected = argument('--tasks', 'invoice,articulated-lamp').split(',');
const run = argument(
  '--run',
  new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 6),
);
if (!/^[a-z0-9_-]+$/i.test(run)) throw new Error('Invalid run name.');
const relativeRoot = `supergence/benchmarks/${run}`;
const directory = path.join(workspace.root, relativeRoot);
await fs.mkdir(directory, { recursive: true });
const hash = (value) => createHash('sha256').update(value).digest('hex');
const report = {
  run,
  startedAt: new Date().toISOString(),
  comparability:
    'Same task briefs and browser checks. Supergence uses its app tools; direct-model baselines use one generation call without tools. This measures delivered system behavior, not isolated model intelligence. No score for subjective visual quality.',
  frontierComparison: {
    status: 'not-run',
    reason:
      'No independently produced frontier-model baseline supplied and no frontier-model access established. No superiority claim is supported.',
  },
  results: [],
};
const baselineManifest = argument('--baseline-manifest', null);
const imported = baselineManifest
  ? JSON.parse(await fs.readFile(path.resolve(baselineManifest), 'utf8'))
  : [];
if (!Array.isArray(imported))
  throw new Error('Baseline manifest must be an array of {task, model, path, source}.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const writeReport = () =>
  fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
const stripHTML = (text) => {
  const matches = [...String(text).matchAll(/```(?:html)?\s*\n([\s\S]*?)```/gi)];
  return (matches.sort((a, b) => b[1].length - a[1].length)[0]?.[1] || String(text)).trim();
};

async function evaluate(task, system, filename, provenance) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const checks = [];
  const check = async (name, work) => {
    try {
      await work();
      checks.push({ name, passed: true });
    } catch (error) {
      checks.push({ name, passed: false, error: error.message });
    }
  };
  const prefix = filename.replace(/\.html$/, '');
  try {
    await page.goto(`${baseURL}/workspace/${filename}`, { waitUntil: 'load', timeout: 45000 });
    await task.check(page, check);
    await page.screenshot({
      path: path.join(workspace.root, `${prefix}-desktop.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await check('mobile layout has no horizontal overflow', async () => {
      const size = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      if (size.content > size.viewport + 2)
        throw new Error(`${size.content}px content in ${size.viewport}px viewport`);
    });
    await page.screenshot({
      path: path.join(workspace.root, `${prefix}-mobile.png`),
      fullPage: true,
    });
  } catch (error) {
    checks.push({
      name: 'artifact loads and can be inspected',
      passed: false,
      error: error.message,
    });
  } finally {
    await context.close();
  }
  checks.push({ name: 'no observed uncaught runtime errors', passed: errors.length === 0, errors });
  return {
    task: task.id,
    system,
    filename,
    promptSha256: hash(task.brief),
    provenance,
    checks,
    passed: checks.filter((c) => c.passed).length,
    total: checks.length,
    visualReview: { status: 'human-review-required', criteria: task.visualReview },
    screenshots: [`${prefix}-desktop.png`, `${prefix}-mobile.png`],
  };
}

try {
  for (const task of creationBenchmarks.filter((task) => selected.includes(task.id))) {
    for (const system of systems) {
      const slug = system.replace(/[^a-z0-9_-]/gi, '-');
      const filename = `${relativeRoot}/${slug}/${task.id}.html`;
      await fs.mkdir(path.dirname(path.join(workspace.root, filename)), { recursive: true });
      await fs.writeFile(
        path.join(workspace.root, filename.replace('.html', '-brief.txt')),
        task.brief,
      );
      const start = performance.now();
      let provenance = { requestedSystem: system };
      try {
        console.log(`Generating ${task.id} with ${system}…`);
        if (system === 'supergence') {
          const response = await fetch(`${baseURL}/api/sis/unified-turn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `${task.brief}\n\nCreate this real artifact now. Save final HTML at ${filename}. Run checks and fix failures before delivering. Choose the installed creation tools appropriate to this task.`,
              conversationId: `benchmark-${run}-${task.id}`,
              requestId: randomUUID(),
            }),
            signal: AbortSignal.timeout(600000),
          });
          const result = await response.json();
          await fs.writeFile(
            path.join(workspace.root, filename.replace('.html', '-turn.json')),
            JSON.stringify(result, null, 2),
          );
          if (!response.ok || !result.success)
            throw new Error(result.error || `HTTP ${response.status}`);
          try {
            await fs.access(path.join(workspace.root, filename));
          } catch {
            const artifact = result.toolCalls?.findLast((call) =>
              call.output?.filename?.endsWith('.html'),
            )?.output;
            if (!artifact) throw new Error('Supergence did not save the requested HTML artifact.');
            const source = workspace._resolve(artifact.filename);
            await fs.copyFile(source, path.join(workspace.root, filename));
            provenance.copiedFrom = artifact.filename;
          }
          provenance = {
            ...provenance,
            mode: 'app-agent',
            toolCalls: result.toolCalls?.map((call) => ({ tool: call.tool, status: call.status })),
            modelIdentity: 'App configured provider; exact per-call model not recorded by app',
          };
        } else {
          const client = process.env.BENCHMARK_BASE_URL
            ? new OpenAI({
                baseURL: process.env.BENCHMARK_BASE_URL,
                apiKey: process.env.BENCHMARK_API_KEY || 'local',
                maxRetries: 0,
              })
            : resolveClientAndModel(null, system)?.client;
          if (!client) throw new Error('No direct benchmark provider configured.');
          const result = await client.chat.completions.create(
            {
              model: system,
              messages: [
                {
                  role: 'system',
                  content:
                    'Create the requested deliverable. Return only a complete HTML document. Do not claim you tested it; the evaluator will run it in Chrome.',
                },
                { role: 'user', content: task.brief },
              ],
              temperature: 0.2,
              max_tokens: 16384,
            },
            { timeout: 180000, maxRetries: 0 },
          );
          const html = stripHTML(result.choices?.[0]?.message?.content || '');
          if (!/<!doctype html|<html/i.test(html))
            throw new Error('Provider did not return a complete HTML document.');
          await fs.writeFile(path.join(workspace.root, filename), html);
          provenance = {
            ...provenance,
            mode: 'direct-single-generation',
            returnedModel: result.model,
            usage: result.usage,
            finishReason: result.choices?.[0]?.finish_reason,
          };
          if (result.choices?.[0]?.finish_reason === 'length')
            throw new Error('Provider output was truncated; not a valid completed deliverable.');
        }
        provenance.durationMs = Math.round(performance.now() - start);
        provenance.artifactSha256 = hash(await fs.readFile(path.join(workspace.root, filename)));
        const result = await evaluate(task, system, filename, provenance);
        report.results.push(result);
        console.log(
          `${task.id} / ${system}: ${result.passed}/${result.total} observed checks; visual review pending.`,
        );
      } catch (error) {
        report.results.push({
          task: task.id,
          system,
          status: 'failed',
          error: error.message,
          provenance,
          durationMs: Math.round(performance.now() - start),
        });
        console.log(`${task.id} / ${system}: ${error.message}`);
      }
      await writeReport();
    }
    for (const baseline of imported.filter((item) => item.task === task.id)) {
      if (!baseline.model || !baseline.source)
        throw new Error('Imported baselines require model and source provenance.');
      const filename = `${relativeRoot}/imported-${randomUUID().slice(0, 6)}-${task.id}.html`;
      const source = await fs.readFile(path.resolve(path.dirname(baselineManifest), baseline.path));
      await fs.writeFile(path.join(workspace.root, filename), source);
      report.results.push(
        await evaluate(task, baseline.model, filename, {
          mode: 'imported-output',
          modelIdentity: 'User-supplied label; not independently authenticated',
          source: baseline.source,
          artifactSha256: hash(source),
        }),
      );
      report.frontierComparison = {
        status: 'imported-baselines-tested',
        reason: 'See provenance for supplied identity and source limitations.',
      };
      await writeReport();
    }
  }
} finally {
  await browser.close();
  report.completedAt = new Date().toISOString();
  await writeReport();
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Creation benchmark evidence</title><style>body{font:16px/1.6 system-ui;max-width:1100px;margin:40px auto;padding:20px;background:#15191f;color:#e5eaf1}a{color:#9bd5ff}pre{white-space:pre-wrap;overflow-wrap:anywhere}section{border-top:1px solid #465163;margin-top:30px}img{width:48%;vertical-align:top}</style><h1>Creation benchmark evidence</h1><p>Actual outputs and behavioral checks. Passing checks do not establish aesthetic quality or superiority to frontier models.</p><div id="results"></div><script>const report=${JSON.stringify(report).replaceAll('<', '\\u003c')};const root=document.getElementById('results');for(const r of report.results){const s=document.createElement('section');const h=document.createElement('h2');h.textContent=r.task+' · '+r.system;s.append(h);const p=document.createElement('pre');p.textContent=JSON.stringify(r,null,2);s.append(p);if(r.filename){const a=document.createElement('a');a.href='/workspace/'+r.filename;a.textContent='Open actual artifact';s.append(a);for(const src of r.screenshots||[]){const img=document.createElement('img');img.src='/workspace/'+src;img.alt=r.task+' captured output';s.append(img)}}root.append(s)}</script>`;
  await fs.writeFile(path.join(directory, 'index.html'), html);
  console.log(`Evidence: ${baseURL}/workspace/${relativeRoot}/index.html`);
}
