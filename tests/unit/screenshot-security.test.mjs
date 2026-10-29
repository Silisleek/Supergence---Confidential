import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('visual tools confine files, report actual image effects, and enforce access settings', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-screenshot-check-'));
  const directory = path.join(root, 'workspace');
  await fs.mkdir(directory);
  t.after(async () => fs.rm(root, { recursive: true, force: true }));
  const image = path.join(directory, 'existing.png');
  const outside = path.join(root, 'outside.html');
  await fs.writeFile(image, 'existing content');
  await fs.writeFile(outside, '<title>Outside</title>');
  await fs.writeFile(path.join(directory, 'scene.html'), '<!-- new THREE.Mesh() -->');
  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs/promises';
    import path from 'node:path';
    import sharp from 'sharp';
    import { unzipSync } from 'fflate';
    import toolRegistry from './server/tools/registry.js';
    import { runtimeAccess } from './server/services/runtimeAccess.js';
    const screenshot = toolRegistry.get('screenshot');
    for (const url of ['file:///outside/secret.html', 'javascript:alert(1)', '--no-sandbox']) {
      const result = await screenshot.execute({ url, filename: 'existing.png' });
      assert.ok(result.error, url);
      assert.notEqual(result.success, true);
    }
    for (const filepath of [process.env.SIS_TEST_OUTSIDE_HTML, '../outside.html']) {
      assert.ok((await screenshot.execute({ filepath })).error);
      assert.ok((await toolRegistry.get('dom_read').execute({ filepath })).error);
    }
    const profile = await toolRegistry.get('threejs_scene_profiler').execute({ filepath: 'scene.html' });
    assert.equal(profile.sourcePatterns.meshConstructorMatches, 1);
    assert.match(profile.limitation, /comments/);
    assert.equal(profile.performanceRating, undefined);
    assert.equal(profile.estimatedDrawCalls, undefined);
    const image = path.join(process.env.SIS_WORKSPACE_DIR, 'image.png');
    await sharp({ create: { width: 8, height: 8, channels: 3, background: '#f06' } }).png().toFile(image);
    const analysis = await toolRegistry.get('analyze_image_multiperspective').execute({ image_path: 'image.png' });
    assert.match(analysis.limitation, /neither measures temperature or depth/);
    assert.equal(analysis.thermalPath, undefined);
    assert.equal(analysis.depthPath, undefined);
    assert.deepEqual(Object.keys(unzipSync(await fs.readFile(analysis.zipPath))).sort(), ['inverted_blur.png', 'original.png', 'warm_tint.png']);
    await assert.rejects(toolRegistry.get('analyze_image_multiperspective').execute({ image_path: '../outside.html' }), /escapes root/);
    const linkedImage = path.join(process.env.SIS_WORKSPACE_DIR, 'linked.png');
    await sharp({ create: { width: 8, height: 8, channels: 3, background: '#024' } }).png().toFile(linkedImage);
    const outsideDir = path.join(path.dirname(process.env.SIS_WORKSPACE_DIR), 'outside-dir');
    await fs.mkdir(outsideDir);
    try {
      await fs.symlink(outsideDir, linkedImage + '_analysis', process.platform === 'win32' ? 'junction' : 'dir');
      const blocked = await toolRegistry.get('analyze_image_multiperspective').execute({ image_path: 'linked.png' });
      assert.match(blocked.error, /Linked paths/);
      assert.deepEqual(await fs.readdir(outsideDir), []);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    }
    const { default: design } = await import('./server/services/supergenceDesignEngine.js');
    const oldCli = process.env.SIS_FIGCRAFT_CLI;
    process.env.SIS_FIGCRAFT_CLI = path.join(process.env.SIS_WORKSPACE_DIR, 'missing-figcraft');
    assert.equal(design.figcraftAvailable(), false);
    assert.equal(toolRegistry.isToolExposableToModel(toolRegistry.get('figcraft_create_design')), false);
    await assert.rejects(design.runFigcraft('info', []), /FigCraft CLI is unavailable/);
    if (oldCli === undefined) delete process.env.SIS_FIGCRAFT_CLI; else process.env.SIS_FIGCRAFT_CLI = oldCli;
    let figcraftCalls = 0;
    design.runFigcraft = async () => { figcraftCalls++; return '{}'; };
    await assert.rejects(design.getFigcraftInfo(process.env.SIS_TEST_OUTSIDE_HTML), /escapes root/);
    await assert.rejects(design.renderFigcraft('scene.html', '../outside.png'), /escapes root/);
    await assert.rejects(design.executeFigcraftScript([{ command: 'test' }], '../outside.figcraft'), /escapes root/);
    await assert.rejects(design.createVectorArtboard({ name: 'test', filename: '../outside.figcraft' }), /escapes root/);
    assert.equal(figcraftCalls, 0);
    runtimeAccess.update({ mode: 'full-access', files: false });
    for (const tool of ['github_clone', 'github_download_zip', 'grep_search', 'extract_archive', 'screenshot', 'execute_code_sandbox', 'threejs_scene_profiler', 'analyze_image_multiperspective', 'figcraft_inspect_file']) {
      const result = await toolRegistry.execute(tool, {});
      assert.match(result.error, /files access is disabled/, tool);
    }
    runtimeAccess.update({ files: true, terminal: false });
    for (const tool of ['github_clone', 'execute_code_sandbox', 'code_expert_eval', 'figcraft_inspect_file', 'open_design_to_figcraft']) {
      const result = await toolRegistry.execute(tool, {});
      assert.match(result.error, /terminal access is disabled/, tool);
    }
    runtimeAccess.update({ terminal: true, browser: false });
    for (const tool of ['screenshot', 'inspect_web_app_headless']) {
      const result = await toolRegistry.execute(tool, {});
      assert.match(result.error, /browser access is disabled/, tool);
    }
    process.exit(0);
  `;
  await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SIS_DATA_DIR: path.join(root, 'data'),
      SIS_WORKSPACE_DIR: directory,
      SIS_TEST_OUTSIDE_HTML: outside,
    },
    timeout: 30000,
  });
  assert.equal(await fs.readFile(image, 'utf8'), 'existing content');
  assert.equal(
    (await fs.readdir(directory)).some((name) => name.startsWith('.screenshot-')),
    false,
  );
});
