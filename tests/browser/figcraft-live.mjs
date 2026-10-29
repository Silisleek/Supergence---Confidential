import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-figcraft-live-'));
process.env.SIS_DATA_DIR = path.join(root, 'data');
process.env.SIS_WORKSPACE_DIR = path.join(root, 'workspace');
try {
  const { default: design } = await import('../../server/services/supergenceDesignEngine.js');
  if (!design.figcraftAvailable())
    throw new Error('Set SIS_FIGCRAFT_CLI to an installed FigCraft executable.');
  const result = await design.createVectorArtboard({
    name: 'Verification artboard',
    width: 320,
    height: 240,
    filename: 'verified.figcraft',
    elements: [{ type: 'rectangle', x: 20, y: 20, width: 100, height: 100, color: '#255fd0' }],
  });
  assert.equal(result.success, true);
  assert.ok(
    (await fs.stat(path.join(process.env.SIS_WORKSPACE_DIR, 'verified.figcraft'))).size > 0,
  );
  const png = await fs.readFile(path.join(process.env.SIS_WORKSPACE_DIR, 'verified.png'));
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.ok(await design.getFigcraftInfo(result.figcraftPath));
  console.log(
    'FigCraft CLI created, rendered, and inspected a real design in an isolated workspace.',
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
process.exit(0);
