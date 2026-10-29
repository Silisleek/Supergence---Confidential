import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import workspace from '../workspace/manager.js';
import { workspaceEnvironment } from '../workspace/environment.js';
import { inspectSceneGeometry } from './sceneGeometryInspection.js';
import { sessionAuth } from '../security/session-auth.js';

export const materialKinds = [
  'wood',
  'marble',
  'brick',
  'metal',
  'fabric',
  'noise',
  'checker',
  'grid',
  'rings',
];
const urlFor = (relative) => workspace.urlFor(relative);
const dimension = (value, fallback = 512) => {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 64 || n > 2048)
    throw new Error('Size must be an integer from 64 to 2048.');
  return n;
};

// Check every existing ancestor, including junctions. The studio follows the
// active workspace instead of caching a repository-relative output directory.
export async function studioPath(relative = '') {
  await fs.mkdir(workspace.root, { recursive: true });
  const root = await fs.realpath(workspace.root);
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel))
    throw new Error('Studio paths must stay in the active workspace.');
  let cursor = root;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    try {
      const real = await fs.realpath(cursor);
      const inside = path.relative(root, real);
      if (inside === '..' || inside.startsWith('..' + path.sep) || path.isAbsolute(inside))
        throw new Error('Studio path follows a link outside the workspace.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return target;
}

async function save(relative, data) {
  const full = await studioPath(relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  const stat = await fs.stat(full);
  workspace._notifyFileSaved(relative, full, stat);
  return { filename: relative, path: full, url: urlFor(relative), bytes: stat.size };
}

export async function createStudioProject({ name, brief = '' } = {}) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Project name required.');
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'project';
  const directory = `supergence/projects/${slug}-${randomUUID().slice(0, 8)}`;
  const full = await studioPath(directory);
  await fs.mkdir(full, { recursive: true });
  for (const folder of ['src', 'assets', 'renders', 'reports'])
    await fs.mkdir(path.join(full, folder));
  const project = {
    name: name.trim().slice(0, 160),
    brief: String(brief).slice(0, 16000),
    directory,
    createdAt: new Date().toISOString(),
  };
  await save(`${directory}/project.json`, JSON.stringify(project, null, 2));
  await save(
    `${directory}/README.md`,
    `# ${project.name}\n\n${project.brief}\n\nKeep source in src/, reusable graphics and textures in assets/, browser captures in renders/, and observed checks in reports/.\n\nBuild, run, inspect the rendered result, repair failures, then deliver links. A successful render does not prove artistic quality or task completion.\n`,
  );
  return { ...project, path: full, success: true };
}

export async function studioStatus() {
  const root = await studioPath('supergence/projects');
  await fs.mkdir(root, { recursive: true });
  const projects = [];
  for (const entry of (await fs.readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .slice(-100)) {
    try {
      const file = await studioPath(`supergence/projects/${entry.name}/project.json`);
      const manifest = JSON.parse(await fs.readFile(file, 'utf8'));
      const directory = `supergence/projects/${entry.name}`;
      const assetsDirectory = await studioPath(`${directory}/assets`);
      const assets = (await fs.readdir(assetsDirectory, { withFileTypes: true }))
        .filter((asset) => asset.isFile() && /\.(png|svg|jpe?g|webp)$/i.test(asset.name))
        .slice(-100)
        .map((asset) => ({ name: asset.name, url: urlFor(`${directory}/assets/${asset.name}`) }));
      projects.push({
        name: String(manifest.name || entry.name),
        brief: String(manifest.brief || ''),
        createdAt: String(manifest.createdAt || ''),
        directory,
        assets,
      });
    } catch {
      /* Ignore directories without a project manifest. */
    }
  }
  return {
    root: workspace.root,
    environment: workspaceEnvironment(workspace.root),
    studio: path.join(workspace.root, 'supergence'),
    projects: projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    materials: materialKinds,
    graphics: 'SVG rasterization to PNG; no image model required',
    verification: 'Chrome render, runtime errors, screenshot, and saved report',
  };
}

export async function generateTexture(args = {}) {
  const kind = String(args.kind || 'noise').toLowerCase();
  if (!materialKinds.includes(kind))
    throw new Error(`Unsupported material. Choose ${materialKinds.join(', ')}.`);
  const size = dimension(args.size);
  const seed = Number(args.seed ?? 1);
  if (!Number.isSafeInteger(seed)) throw new Error('Seed must be a safe integer.');
  const filename = args.filename || `supergence/assets/${kind}-${randomUUID().slice(0, 8)}.png`;
  if (!filename.toLowerCase().endsWith('.png'))
    throw new Error('Texture filename must end in .png.');
  const color =
    args.color ||
    { wood: '#94603a', marble: '#dedbd6', brick: '#a65e47', metal: '#939da7', fabric: '#4d657c' }[
      kind
    ] ||
    '#8193a8';
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Color must be #RRGGBB.');
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  // Periodic multi-scale fields create tileable material structure. Seed is
  // for repeatable art generation, never for fabricated telemetry.
  const tau = Math.PI * 2;
  const field = (u, v) => {
    let n = 0;
    for (let k = 1; k <= 5; k++) {
      const f = 2 ** k;
      n +=
        (Math.sin(tau * (f * u + Math.sin(seed + k))) *
          Math.cos(tau * (f * v + Math.cos(seed - k)))) /
        f;
    }
    return n;
  };
  const height = new Float32Array(size * size);
  const raw = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        n = field(u, v);
      let h;
      switch (kind) {
        case 'wood':
          h = 0.5 + 0.23 * Math.sin(tau * (u * 12 + n * 0.65)) + 0.12 * n;
          break;
        case 'marble':
          h = 0.84 - 0.65 * Math.pow(0.5 + 0.5 * Math.sin(tau * (u * 3 + v * 2 + n * 0.8)), 14);
          break;
        case 'brick': {
          const row = Math.floor(v * 8);
          const bx = (u * 8 + (row % 2) * 0.5) % 1;
          const by = (v * 8) % 1;
          h = bx < 0.04 || by < 0.07 ? 0.14 : 0.7 + 0.12 * n;
          break;
        }
        case 'metal':
          h = 0.66 + 0.08 * Math.sin(tau * v * 192) + 0.12 * n;
          break;
        case 'fabric':
          h = 0.53 + 0.13 * Math.sin(tau * u * 128) * Math.cos(tau * v * 128) + 0.15 * n;
          break;
        case 'checker':
          h = (Math.floor(u * 8) + Math.floor(v * 8)) % 2 ? 0.9 : 0.1;
          break;
        case 'grid':
          h = (u * 16) % 1 < 0.06 || (v * 16) % 1 < 0.06 ? 0.9 : 0.2;
          break;
        case 'rings':
          h = 0.5 + 0.3 * Math.sin(tau * (u * 6 + v * 4 + n));
          break;
        default:
          h = 0.5 + 0.4 * n;
      }
      const i = y * size + x;
      height[i] = Math.max(0, Math.min(1, h));
      for (let c = 0; c < 3; c++)
        raw[i * 3 + c] = Math.round(Math.min(255, rgb[c] * (0.45 + height[i] * 0.8)));
    }
  const normal = Buffer.alloc(raw.length),
    rough = Buffer.alloc(size * size);
  const sample = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x,
        dx = (sample(x - 1, y) - sample(x + 1, y)) * 3,
        dy = (sample(x, y - 1) - sample(x, y + 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      normal[i * 3] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      normal[i * 3 + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      normal[i * 3 + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      rough[i] = Math.round(
        (kind === 'metal' ? 0.25 : kind === 'marble' ? 0.3 : 0.75) * 255 + height[i] * 20,
      );
    }
  const encode = (data, channels) =>
    sharp(data, { raw: { width: size, height: size, channels } })
      .png()
      .toBuffer();
  const albedo = await save(filename, await encode(raw, 3));
  const normalMap = await save(filename.replace(/\.png$/i, '-normal.png'), await encode(normal, 3));
  const roughnessMap = await save(
    filename.replace(/\.png$/i, '-roughness.png'),
    await encode(rough, 1),
  );
  const metadata = await sharp(await fs.readFile(albedo.path)).metadata();
  return {
    success: true,
    ...albedo,
    kind,
    size,
    seed,
    maps: { albedo: albedo.url, normal: normalMap.url, roughness: roughnessMap.url },
    verified: { format: metadata.format, width: metadata.width, height: metadata.height },
    method: 'Local procedural material, not a generated photograph',
  };
}

export async function renderGraphic({ svg, filename, width = 1024 } = {}) {
  const size = dimension(width, 1024);
  if (
    typeof svg !== 'string' ||
    Buffer.byteLength(svg) > 2 * 1024 * 1024 ||
    !/<svg[\s>]/i.test(svg)
  )
    throw new Error('Supply SVG source up to 2 MiB.');
  if (
    /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|@import|(?:href\s*=\s*["']\s*(?!#|data:image\/)|url\(\s*["']?\s*(?!#))/i.test(
      svg,
    )
  )
    throw new Error('Use self-contained SVG without scripts, entities, or external resources.');
  filename ||= `supergence/assets/graphic-${randomUUID().slice(0, 8)}.png`;
  if (!filename.toLowerCase().endsWith('.png'))
    throw new Error('Graphic filename must end in .png.');
  const png = await sharp(Buffer.from(svg), { limitInputPixels: 4096 * 4096 })
    .resize({ width: size, height: size, fit: 'inside' })
    .png()
    .toBuffer();
  const source = await save(filename.replace(/\.png$/i, '.svg'), svg);
  const output = await save(filename, png);
  const metadata = await sharp(png).metadata();
  return {
    success: true,
    ...output,
    source: source.url,
    verified: { width: metadata.width, height: metadata.height, format: metadata.format },
    method: 'Rasterized supplied SVG artwork',
  };
}

export async function verifyStudioArtifact({
  filename,
  width = 1280,
  height = 800,
  actions = [],
} = {}) {
  if (!Array.isArray(actions) || actions.length > 8)
    throw new Error('Supply at most eight browser actions.');
  if (typeof filename !== 'string' || !/\.(html?|png|svg|jpe?g|webp)$/i.test(filename))
    throw new Error('Select a workspace HTML or image artifact.');
  const target = await studioPath(filename);
  await fs.access(target);
  const { chromium } = await import('playwright-core');
  const { pathToFileURL } = await import('node:url');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: dimension(width, 1280), height: dimension(height, 800) },
    });
    if (sessionAuth?.secret) {
      await page.setExtraHTTPHeaders({
        authorization: `Bearer ${sessionAuth.secret}`,
      });
    }
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', (r) => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
    });
    const port = process.env.ACTIVE_SERVER_PORT;
    const artifactURL = port
      ? `http://127.0.0.1:${Number(port)}${urlFor(filename.replaceAll('\\', '/'))}`
      : pathToFileURL(target).href;
    await page.goto(artifactURL, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    });
    for (const action of actions) {
      if (action.type === 'click' && typeof action.selector === 'string')
        await page.locator(action.selector).click({ timeout: 10000 });
      else if (action.type === 'press' && typeof action.key === 'string')
        await page.keyboard.press(action.key);
      else if (action.type === 'wait-for' && typeof action.selector === 'string')
        await page.locator(action.selector).waitFor({ state: 'visible', timeout: 10000 });
      else if (action.type === 'hold-key' && typeof action.key === 'string') {
        const frames = action.frames ?? 30;
        if (!Number.isInteger(frames) || frames < 1 || frames > 120)
          throw new Error('Key hold must be 1–120 animation frames.');
        await page.keyboard.down(action.key);
        await page.evaluate(
          (count) =>
            new Promise((resolve) => {
              const step = () => (--count <= 0 ? resolve() : requestAnimationFrame(step));
              requestAnimationFrame(step);
            }),
          frames,
        );
        await page.keyboard.up(action.key);
      } else throw new Error('Unsupported browser action.');
    }
    if (actions.length)
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
    const brokenImages = await page.evaluate(() =>
      [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
    );
    errors.push(...brokenImages.map((s) => `Broken image: ${s}`));
    const geometry = await page.evaluate(inspectSceneGeometry);
    if (geometry.passed === false)
      errors.push(
        `Invalid rendered mesh attributes: ${geometry.invalidValues} non-finite values; ${geometry.missingUVs} missing texture UV attributes.`,
      );
    const stamp = randomUUID().slice(0, 8);
    const screenshot = await save(
      `supergence/reports/render-${stamp}.png`,
      await page.screenshot(),
    );
    const report = {
      filename,
      checkedAt: new Date().toISOString(),
      passed: errors.length === 0,
      errors,
      actions,
      geometry,
      screenshot: screenshot.url,
      scope:
        'Observed Chrome load/capture and finite mesh/texture coordinates when a real scene is exposed. Does not certify artistic quality, all interactions, architectural compliance or task completion.',
    };
    const receipt = await save(
      `supergence/reports/render-${stamp}.json`,
      JSON.stringify(report, null, 2),
    );
    return { ...report, report: receipt.url };
  } finally {
    await browser.close();
  }
}
