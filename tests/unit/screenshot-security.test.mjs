import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('screenshot rejects non-web URLs and leaves an existing image untouched', async (t) => {
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
    runtimeAccess.update({ mode: 'full-access', files: false });
    for (const tool of ['github_clone', 'github_download_zip', 'grep_search', 'extract_archive', 'screenshot', 'execute_code_sandbox', 'threejs_scene_profiler']) {
      const result = await toolRegistry.execute(tool, {});
      assert.match(result.error, /files access is disabled/, tool);
    }
    runtimeAccess.update({ files: true, terminal: false });
    for (const tool of ['github_clone', 'execute_code_sandbox', 'code_expert_eval']) {
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
