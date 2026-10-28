import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import workspace from '../../server/workspace/manager.js';
import {
  createStudioProject,
  generateTexture,
  renderGraphic,
  studioStatus,
  studioPath,
} from '../../server/services/creationStudio.js';

test('local studio saves custom graphics and repeatable material maps in the active workspace', async () => {
  const original = workspace.root;
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-creation-'));
  workspace.setWorkspaceDir(temporary);
  try {
    const project = await createStudioProject({ name: 'Material study', brief: 'Wood and marble' });
    assert.equal(
      path.relative(await fs.realpath(temporary), project.path),
      project.directory.replaceAll('/', path.sep),
    );
    for (const folder of ['src', 'assets', 'renders', 'reports'])
      assert.ok((await fs.stat(path.join(project.path, folder))).isDirectory());
    assert.equal((await studioStatus()).projects[0].brief, 'Wood and marble');
    const buffers = [];
    for (const kind of ['wood', 'marble', 'brick', 'metal', 'fabric']) {
      const result = await generateTexture({
        kind,
        size: 64,
        filename: `${project.directory}/assets/${kind}.png`,
      });
      assert.equal(result.verified.width, 64);
      assert.equal(result.verified.format, 'png');
      assert.match(result.maps.normal, /-normal.png$/);
      const buffer = await fs.readFile(result.path);
      buffers.push(buffer);
      const stats = await sharp(buffer).stats();
      assert.ok(
        stats.channels.some((channel) => channel.stdev > 2),
        `${kind} must contain visible variation`,
      );
      const again = await generateTexture({
        kind,
        size: 64,
        filename: `${project.directory}/assets/${kind}-again.png`,
      });
      assert.deepEqual(await fs.readFile(again.path), buffer);
    }
    assert.notDeepEqual(buffers[0], buffers[1]);
    assert.equal((await studioStatus()).projects[0].assets.length, 30);
    const graphic = await renderGraphic({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><defs><linearGradient id="a"><stop stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="200" height="100" fill="url(#a)"/></svg>',
      filename: `${project.directory}/assets/banner.png`,
      width: 256,
    });
    assert.equal(graphic.verified.width, 256);
    assert.equal(graphic.verified.height, 128);
    assert.ok(await fs.stat(graphic.path.replace('.png', '.svg')));
    await assert.rejects(() => generateTexture({ kind: 'photograph' }), /Unsupported/);
    await assert.rejects(() => generateTexture({ size: 100000 }), /Size/);
    await assert.rejects(() => generateTexture({ filename: '../escape.png' }), /stay in/);
    await assert.rejects(
      () => renderGraphic({ svg: '<svg><image href="file:///private.png"/></svg>' }),
      /self-contained/,
    );
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-outside-'));
    try {
      await fs.symlink(
        outside,
        path.join(temporary, 'escape'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await assert.rejects(() => studioPath('escape/asset.png'), /outside/);
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  } finally {
    workspace.setWorkspaceDir(original);
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
