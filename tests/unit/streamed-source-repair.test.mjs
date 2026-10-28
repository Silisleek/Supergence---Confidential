import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('native repair streams model patches, records real metadata, rejects truncation and preserves concurrent edits', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-stream-repair-'));
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    requests.push(body);
    assert.equal(body.stream, true);
    const brief = body.messages.at(-1).content;
    assert.equal(body.thinking.type, brief.includes('REASONED') ? 'enabled' : 'disabled');
    if (brief.includes('CONCURRENT'))
      await fs.writeFile(path.join(temporary, 'concurrent.js'), 'export const elevation = 2;\n');
    const patch = brief.includes('EMPTY')
      ? ''
      : JSON.stringify([
          { search: 'export const elevation = 0;', replace: 'export const elevation = 1.5;' },
        ]);
    const packet = (delta, finish_reason = null) =>
      'data: ' +
      JSON.stringify({
        model: 'fixture-code-model',
        choices: [{ index: 0, delta, finish_reason }],
      }) +
      '\n\n';
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(packet({ reasoning_content: 'PRIVATE_REASONING_TEST' }));
    res.write(packet({ content: patch.slice(0, 35) }));
    res.end(
      packet({ content: patch.slice(35) }, brief.includes('TRUNCATED') ? 'length' : 'stop') +
        'data: [DONE]\n\n',
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const name of ['normal', 'concurrent', 'truncated', 'reasoned', 'empty'])
      await fs.writeFile(path.join(temporary, name + '.js'), 'export const elevation = 0;\n');
    const moduleUrl = new URL('../../server/services/browserArtifactBuilder.js', import.meta.url)
      .href;
    const code = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs/promises';
      import {repairBrowserApp} from ${JSON.stringify(moduleUrl)};
      const result=await repairBrowserApp({filename:'normal.js',instructions:'Repair observed elevation.',ranges:[{start:1,end:1}]});
      assert.equal(result.success,true);assert.equal(result.syntaxChecked,true);assert.equal(result.behaviorChecked,false);
      assert.match(await fs.readFile('normal.js','utf8'),/elevation = 1.5/);
      const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));
      assert.equal(receipt.model,'fixture-code-model');assert.equal(receipt.finishReason,'stop');
      assert.ok(!JSON.stringify(receipt).includes('PRIVATE_REASONING_TEST'));
      await assert.rejects(repairBrowserApp({filename:'concurrent.js',instructions:'CONCURRENT repair',ranges:[{start:1,end:1}]}),/Source changed/);
      assert.match(await fs.readFile('concurrent.js','utf8'),/elevation = 2/);
      await assert.rejects(repairBrowserApp({filename:'truncated.js',instructions:'TRUNCATED repair',ranges:[{start:1,end:1}]}),/output truncated/);
      assert.match(await fs.readFile('truncated.js','utf8'),/elevation = 0/);
      const reasoned=await repairBrowserApp({filename:'reasoned.js',instructions:'REASONED structural repair',ranges:[{start:1,end:1}],reasoning:true});
      assert.equal(JSON.parse(await fs.readFile(reasoned.receipt,'utf8')).reasoningEnabled,true);
      assert.match(await fs.readFile('reasoned.js','utf8'),/elevation = 1.5/);
      await assert.rejects(repairBrowserApp({filename:'empty.js',instructions:'EMPTY provider response',ranges:[{start:1,end:1}]}),/no source patches; no changes saved/);
      assert.match(await fs.readFile('empty.js','utf8'),/elevation = 0/);
      console.log('STREAM_REPAIR_OK');
    `;
    const base = `http://127.0.0.1:${server.address().port}/v1`;
    const child = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', code], {
      cwd: temporary,
      timeout: 30000,
      env: {
        ...process.env,
        OPENROUTER_BASE_URL: base,
        OPENROUTER_API_KEY: 'test-only-key',
        OPENCODE_BASE_URL: base,
        OPENCODE_API_KEY: 'test-only-key',
        DEFAULT_MODEL: 'repair-fixture',
        FALLBACK_MODELS: '',
        SIS_WORKSPACE_DIR: temporary,
        SIS_DATA_DIR: path.join(temporary, 'data'),
      },
    });
    assert.match(child.stdout, /STREAM_REPAIR_OK/);
    assert.equal(requests.length, 5);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert.ok(path.resolve(temporary).startsWith(path.join(os.tmpdir(), 'sis-stream-repair-')));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
