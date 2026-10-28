import { callAI, streamAI, DEFAULT_MODEL } from '../api/openrouter.js';
import { inspectGeneratedGame } from '../3d/split-game-generator.js';
import { studioPath } from './creationStudio.js';
import workspace from '../workspace/manager.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { threeCreationContract } from '../3d/creation-contract.js';
import { transform } from 'esbuild';
import { load } from 'cheerio';

export function bindCreationControls(html) {
  const $ = load(html),
    bindings = [];
  const ids = new Map(),
    tests = new Map();
  $('[id]').each((_, e) => {
    const id = $(e).attr('id');
    ids.set(id, (ids.get(id) || 0) + 1);
  });
  $('[data-testid]').each((_, e) => {
    const key = $(e).attr('data-testid');
    tests.set(key, (tests.get(key) || 0) + 1);
  });
  $('[data-testid]').each((_, e) => {
    const node = $(e),
      key = node.attr('data-testid');
    if (
      !node.attr('id') &&
      tests.get(key) === 1 &&
      !ids.has(key) &&
      /^[A-Za-z][\w:.-]*$/.test(key)
    ) {
      node.attr('id', key);
      ids.set(key, 1);
      bindings.push({ attribute: 'id', value: key });
    }
  });
  $('[id]').each((_, e) => {
    const node = $(e),
      id = node.attr('id');
    if (!node.attr('data-testid') && ids.get(id) === 1) {
      node.attr('data-testid', id);
      bindings.push({ attribute: 'data-testid', value: id });
    }
  });
  return { html: $.html(), bindings };
}

export function applyExactRepairs(source, patches) {
  if (!Array.isArray(patches) || !patches.length || patches.length > 12)
    throw new Error('Expected 1–12 exact source repairs.');
  let revised = source;
  const unique = (text, search) => {
    const at = text.indexOf(search);
    if (at < 0 || text.indexOf(search, at + search.length) >= 0)
      throw new Error('Repair search must match exactly once; no changes saved.');
    return at;
  };
  for (const patch of patches) {
    if (typeof patch.search !== 'string' || !patch.search || typeof patch.replace !== 'string')
      throw new Error('Each repair needs nonempty search and string replace.');
    let start = 0,
      end = revised.length;
    if (patch.scope) {
      if (
        typeof patch.scope.start !== 'string' ||
        !patch.scope.start ||
        typeof patch.scope.end !== 'string' ||
        !patch.scope.end
      )
        throw new Error('A repair scope needs nonempty exact start/end anchors.');
      start = unique(revised, patch.scope.start);
      end = unique(revised, patch.scope.end) + patch.scope.end.length;
      if (end <= start + patch.scope.start.length)
        throw new Error('Repair scope anchors are reversed or overlapping.');
    }
    let region = revised.slice(start, end);
    if (patch.all === true) {
      if (!patch.scope) throw new Error('Repeated replacement requires an explicit unique scope.');
      if (!region.includes(patch.search))
        throw new Error('Repair search is absent from its scope.');
      region = region.split(patch.search).join(patch.replace);
    } else {
      const at = unique(region, patch.search);
      region = region.slice(0, at) + patch.replace + region.slice(at + patch.search.length);
    }
    revised = revised.slice(0, start) + region + revised.slice(end);
  }
  return revised;
}
export function applySourceRepairs(source, patches) {
  const revised = applyExactRepairs(source, patches);
  const checked = inspectGeneratedGame(revised);
  if (!checked.valid) throw new Error('Repair rejected before saving: ' + checked.error);
  return checked.html;
}

export async function repairBrowserApp({ filename, instructions, ranges, reasoning = false }) {
  if (typeof filename !== 'string' || !/\.(html|m?js)$/.test(filename))
    throw new Error('Supply a workspace HTML or JavaScript module filename.');
  if (typeof instructions !== 'string' || !instructions.trim())
    throw new Error('Supply observed defects and intended behavior.');
  if (!Array.isArray(ranges) || !ranges.length || ranges.length > 6)
    throw new Error('Supply 1–6 relevant source line ranges.');
  const fullPath = await studioPath(filename);
  const source = await fs.readFile(fullPath, 'utf8');
  const lines = source.split(/\r?\n/);
  const excerpts = ranges
    .map(({ start, end }) => {
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < start ||
        end - start > 250
      )
        throw new Error('Each source range must contain 1–251 lines.');
      return (
        `Source lines ${start}–${Math.min(end, lines.length)} (line numbers are not part of source):\n` +
        lines.slice(start - 1, end).join('\n')
      );
    })
    .join('\n\n');
  if (excerpts.length > 17000)
    throw new Error('Source excerpts exceed 17000 characters. Select narrower relevant ranges.');
  const response = await streamAI({
    model: DEFAULT_MODEL,
    maxTokens: reasoning ? 12000 : 6500,
    temperature: 0.15,
    thinking: { type: reasoning ? 'enabled' : 'disabled' },
    systemPrompt:
      'You are an exact source repair compiler, not an agent. No tools or shell are available in this call. Return ONLY a JSON array (maximum 12 patches) of {"search":"exact unique original source text","replace":"corrected text"}. Optional scope:{start:"unique exact start anchor",end:"unique exact end anchor"} restricts replacement to that inclusive source region. Only with an explicit scope may all:true replace every occurrence of search in that region. Use scoped repetition for repeated edits in one function rather than returning whole functions twice. Apply minimal complete fixes to the supplied HTML/CSS/JS excerpts. Preserve functionality. Do not include prose, Markdown, tool calls, line numbers or the entire document. The caller validates all matches, anchors and syntax atomically before saving. For metal materials, reflections require an environment; responsive flex/grid children and canvas need bounded intrinsic sizes. Scope reset controls to actual scene objects.',
    messages: [
      {
        role: 'user',
        content: `Observed defects and requirements:\n${instructions}\n\n${excerpts}`,
      },
    ],
  });
  const raw = response.text || '';
  const receipt = filename.replace(/\.(?:html|m?js)$/, `.repair-${Date.now()}.json`);
  workspace.createFile(
    receipt,
    JSON.stringify(
      {
        instructions,
        ranges,
        model: response.model,
        reasoningEnabled: Boolean(reasoning),
        usage: response.usage,
        finishReason: response.finishReason,
        response: raw,
      },
      null,
      2,
    ),
  );
  if (response.truncated)
    throw new Error('Repair output truncated; no changes saved. Receipt: ' + receipt);
  if (!raw.trim())
    throw new Error(
      'The provider returned no source patches; no changes saved. Receipt: ' + receipt,
    );
  const patches = JSON.parse(
    raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, ''),
  );
  const revised = filename.endsWith('.html')
    ? applySourceRepairs(source, patches)
    : applyExactRepairs(source, patches);
  if (!filename.endsWith('.html'))
    await transform(revised, { loader: 'js', format: 'esm', target: 'es2022' });
  // A model response must never overwrite concurrent user/editor changes.
  if ((await fs.readFile(fullPath, 'utf8')) !== source)
    throw new Error('Source changed during repair; no changes saved.');
  workspace.createFile(filename, revised);
  return {
    success: true,
    filename,
    receipt,
    changes: patches.length,
    beforeSha256: createHash('sha256').update(source).digest('hex'),
    afterSha256: createHash('sha256').update(revised).digest('hex'),
    syntaxChecked: true,
    behaviorChecked: false,
    next: 'Run the actual failing browser checks again and inspect visual states.',
  };
}

export async function generateBrowserApp({ brief, filename, oneShot = false }) {
  if (typeof brief !== 'string' || !brief.trim())
    throw new Error('Supply the complete user brief.');
  if (typeof filename !== 'string' || !filename.endsWith('.html'))
    throw new Error('Supply a workspace-relative .html filename.');
  const fullPath = await studioPath(filename);
  filename = path.relative(workspace.root, fullPath).split(path.sep).join('/');
  const briefPath = filename.replace(/\.html$/, '.brief.json');
  workspace.createFile(briefPath, JSON.stringify({ brief, model: DEFAULT_MODEL }, null, 2));
  const system =
    'You are a browser source compiler inside a larger agent. THIS CALL HAS NO TOOLS OR SHELL. The outer agent handles saving, running, inspection, testing and delivery. Any user instructions about tool use, checking directories or saving files are for that outer agent. Your sole job is to return the complete implementation as HTML text: begin with <!DOCTYPE html> and end with </html>. Never emit Bash, tool_call XML, tool requests, plans, prose or Markdown fences. Deliver the exact requested subject and working behavior, with coherent original visual design and clear interactions. Embed CSS and JavaScript. For requested 3D, use installed ES modules at /vendor/three/build/three.module.js and /vendor/three/examples/jsm/. Do not use external assets, placeholders, unrelated templates, or invented test results. Include complete controls, meaningful states, error handling and responsive layout. Keep code concise: aim below 22000 characters, prioritize functional code over verbose decorative CSS.' +
    (/\b3d\b|three\.js|architectur|webgl/i.test(brief) ? '\n' + threeCreationContract : '');
  async function generate(prompt, attempt) {
    const started = Date.now();
    const response = await callAI({
      model: DEFAULT_MODEL,
      systemPrompt: system,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 16000,
      temperature: 0.3,
    });
    const choice = response.choices?.[0];
    const content = choice?.message?.content || '';
    workspace.createFile(
      filename.replace(/\.html$/, `.generation-${attempt}.json`),
      JSON.stringify(
        {
          requestedModel: DEFAULT_MODEL,
          returnedModel: response.model,
          finishReason: choice?.finish_reason,
          usage: response.usage,
          durationMs: Date.now() - started,
          content,
        },
        null,
        2,
      ),
    );
    return content;
  }
  let attempts = 1;
  let code = await generate(brief, attempts);
  let checked = inspectGeneratedGame(code);
  if (!checked.valid && !oneShot) {
    attempts++;
    code = await generate(
      `${brief}\nThe previous draft was incomplete or had syntax errors: ${checked.error}. Produce a concise entire corrected, runnable document; preserve all requirements.`,
      2,
    );
    checked = inspectGeneratedGame(code);
  }
  if (!checked.valid)
    throw new Error(`Generated document rejected before saving: ${checked.error}`);
  const bound = bindCreationControls(checked.html);
  checked = inspectGeneratedGame(bound.html);
  if (!checked.valid) throw new Error('Control binding failed syntax validation: ' + checked.error);
  const saved = workspace.createFile(filename, checked.html);
  return {
    success: true,
    filename,
    briefPath,
    path: saved.path,
    url: workspace.urlFor(filename),
    bytes: Buffer.byteLength(checked.html),
    syntaxChecked: true,
    behaviorChecked: false,
    visualQualityVerified: false,
    model: DEFAULT_MODEL,
    generationAttempts: attempts,
    oneShot: oneShot === true,
    controlBindings: bound.bindings,
    next: 'Run task-specific browser checks and inspect representative gameplay/UI states. Repair observed defects before claiming completion.',
  };
}
