import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const gateway = new URL('../../server/api/openrouter.js', import.meta.url).href;

test(
  'cancellation interrupts provider retry backoff before another request',
  { timeout: 20000 },
  async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-router-abort-'));
    let requests = 0;
    const server = http.createServer((_req, res) => {
      requests++;
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Temporary 503; reset after 30s' } }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/v1`;
    const code = `
    import assert from 'node:assert/strict';
    const controller = new AbortController();
    const originalWarn = console.warn;
    console.warn = (...args) => { originalWarn(...args); if (String(args[0]).includes('Retrying in')) process.send('retrying'); };
    process.on('message', (message) => { if (message === 'abort') controller.abort(); });
    const {callAI} = await import(${JSON.stringify(gateway)});
    await assert.rejects(callAI({model:'test-model',messages:[{role:'user',content:'test'}],signal:controller.signal}), error => error.name === 'AbortError');
    process.send('cancelled');
    process.exit(0);
  `;
    try {
      const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
        cwd: directory,
        env: {
          ...process.env,
          OPENROUTER_BASE_URL: base,
          OPENROUTER_API_KEY: 'fixture',
          LOCAL_ROUTER_API_KEY: 'fixture',
          OPENCODE_API_KEY: '',
          FALLBACK_MODELS: '',
          SIS_DATA_DIR: directory,
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      let cancelled = false;
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('message', (message) => {
        if (message === 'retrying') child.send('abort');
        if (message === 'cancelled') cancelled = true;
      });
      const exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', resolve);
      });
      assert.equal(exitCode, 0, stderr);
      assert.equal(cancelled, true);
      assert.equal(requests, 1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(directory, { recursive: true, force: true });
    }
  },
);

test('explicit process configuration takes precedence over the dotenv file', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-env-priority-'));
  try {
    await fs.writeFile(path.join(directory, '.env'), 'PORT=19999\nDEFAULT_MODEL=from-file\n');
    const { stdout } = await execute(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `await import(${JSON.stringify(gateway)}); console.log('CHECK', process.env.PORT, process.env.DEFAULT_MODEL);`,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          PORT: '31888',
          DEFAULT_MODEL: 'from-process',
          SIS_DATA_DIR: directory,
        },
      },
    );
    assert.match(stdout, /CHECK 31888 from-process/);
  } finally {
    const relative = path.relative(os.tmpdir(), directory);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('configured gateway receives selected models, tool calls and streams despite legacy Groq keys', async () => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    requests.push({ body, authorization: req.headers.authorization });
    if (
      (body.model === 'thinking-only' ||
        (body.model === 'changed-mode' &&
          requests.filter((r) => r.body.model === 'changed-mode').length > 1) ||
        (body.model === 'forced-without-thinking' && body.thinking?.type !== 'disabled')) &&
      body.tool_choice !== 'auto'
    ) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ error: { message: 'Thinking mode does not support this tool_choice' } }),
      );
    } else if (body.model === 'repair-native' && body.thinking?.type !== 'disabled') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: 'Wrong read_file proposal' }, finish_reason: 'stop' }],
        }),
      );
    } else if (body.model === 'standard-only' && body.thinking) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Unknown parameter: thinking' } }));
    } else if (body.model === 'reasoning-only' && !body.stream) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: { content: null, reasoning_content: 'private analysis' },
              finish_reason: 'stop',
            },
          ],
        }),
      );
    } else if (body.model === 'quota-check') {
      res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '0' });
      res.end(JSON.stringify({ error: { message: 'Configured test router quota response' } }));
    } else if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(
        'data: ' +
          JSON.stringify({
            id: 'test-stream',
            choices: [
              {
                index: 0,
                delta:
                  body.model === 'reasoning-only'
                    ? { reasoning_content: 'private analysis' }
                    : { content: 'STREAM_OK' },
                finish_reason: 'stop',
              },
            ],
          }) +
          '\n\ndata: [DONE]\n\n',
      );
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      const message = body.tools
        ? {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'tool-1',
                type: 'function',
                function: {
                  name: body.tools[0].function.name,
                  arguments: '{"filepath":"AGENTS.md"}',
                },
              },
            ],
          }
        : { role: 'assistant', content: 'MOCK_OK' };
      res.end(
        JSON.stringify({
          id: 'test-completion',
          model: body.model,
          choices: [{ index: 0, message, finish_reason: body.tools ? 'tool_calls' : 'stop' }],
        }),
      );
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/v1`;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-router-'));
  try {
    const code = `
      import assert from 'node:assert/strict';
      const originalFetch = globalThis.fetch;
      const destinations = [];
      globalThis.fetch = (url, options) => {
        const target = String(url); destinations.push(target);
        if (!target.startsWith(${JSON.stringify(base)} + '/')) throw new Error('Unexpected inference endpoint');
        return originalFetch(url, options);
      };
      const {callAI, streamAI, resolveClientAndModel} = await import(${JSON.stringify(gateway)});
      for (const model of ['opus-4.6', 'qwen/qwen3.8-27b', 'new-provider-model-v9', 'mimo-v2.5']) {
        const r = await callAI({model, messages:[{role:'user',content:'Keep this complete requirement.'}], maxTokens:64});
        assert.equal(r.choices[0].message.content,'MOCK_OK');
      }
      const tool = await callAI({model:'opus-4.6',messages:[{role:'user',content:'Read AGENTS.md'}],tools:[{type:'function',function:{name:'read_file',parameters:{type:'object',properties:{filepath:{type:'string'}},required:['filepath']}}}],toolChoice:{type:'function',function:{name:'read_file'}},parallelToolCalls:false,maxTokens:128});
      assert.equal(tool.choices[0].message.tool_calls[0].function.name,'read_file');
      const stream = await callAI({model:'opus-4.6',messages:[{role:'user',content:'Stream reply'}],stream:true,maxTokens:64});
      let text=''; for await (const chunk of stream) text+=chunk.choices[0]?.delta?.content||'';
      assert.equal(text,'STREAM_OK');
      const thinking = await callAI({model:'thinking-only',messages:[{role:'user',content:'Keep complete requirements.'}],tools:[{type:'function',function:{name:'write_file'}},{type:'function',function:{name:'read_file'}}],toolChoice:{type:'function',function:{name:'write_file'}},maxTokens:128});
      assert.equal(thinking.choices[0].message.tool_calls[0].function.name,'write_file');
      for (let i=0;i<2;i++) {
        const enforced = await callAI({model:'forced-without-thinking',messages:[{role:'user',content:'Preserve the original city requirement.'}],tools:[{type:'function',function:{name:'write_file'}},{type:'function',function:{name:'read_file'}}],toolChoice:{type:'function',function:{name:'write_file'}},maxTokens:128});
        assert.equal(enforced.choices[0].message.tool_calls[0].function.name,'write_file');
      }
      for (let i=0;i<2;i++) {
        const adapted = await callAI({model:'changed-mode',messages:[{role:'user',content:'Continue the same authorized project.'}],tools:[{type:'function',function:{name:'write_file'}},{type:'function',function:{name:'read_file'}}],toolChoice:{type:'function',function:{name:'write_file'}},...(i===0?{thinking:{type:'disabled'}}:{}),maxTokens:128});
        assert.equal(adapted.choices[0].message.tool_calls[0].function.name,'write_file');
      }
      for (const model of ['repair-native','standard-only']) {
        const repaired = await callAI({model,messages:[{role:'user',content:'Same project requirements.'}],tools:[{type:'function',function:{name:'write_file'}}],toolChoice:{type:'function',function:{name:'write_file'}},thinking:{type:'disabled'},maxTokens:128});
        assert.equal(repaired.choices[0].message.tool_calls[0].function.name,'write_file');
      }
      const remembered = await callAI({model:'repair-native',messages:[{role:'user',content:'Next module.'}],tools:[{type:'function',function:{name:'write_file'}}],toolChoice:{type:'function',function:{name:'write_file'}},maxTokens:128});
      assert.equal(remembered.choices[0].message.tool_calls[0].function.name,'write_file');
      const reasoning = await callAI({model:'reasoning-only',messages:[{role:'user',content:'Actual final answer required'}],maxTokens:16});
      assert.equal(reasoning.choices[0].message.content,null);
      const visible=[];
      const reasonedStream = await streamAI({model:'reasoning-only',messages:[{role:'user',content:'Actual final answer required'}],maxTokens:16},token=>visible.push(token));
      assert.equal(reasonedStream.text,'');assert.deepEqual(visible,[]);
      assert.throws(()=>resolveClientAndModel({enabled:true,baseURL:'https://api.groq.com/openai/v1',apiKey:'retired-test-key',model:'old-model'}),/Groq has been removed/);
      await assert.rejects(callAI({model:'quota-check',messages:[{role:'user',content:'Report actual failure'}],maxTokens:16}),e=>e.status===429 && e.message.includes('Configured test router quota response') && !e.message.includes('Earliest retry'));
      console.log('GATEWAY_TEST_OK');
    `;
    const child = await execute(process.execPath, ['--input-type=module', '-e', code], {
      cwd: directory,
      env: {
        ...process.env,
        OPENROUTER_BASE_URL: base,
        OPENROUTER_API_KEY: 'test-router-key',
        LOCAL_ROUTER_API_KEY: 'test-router-key',
        OPENCODE_BASE_URL: base,
        OPENCODE_API_KEY: 'test-router-key',
        DEFAULT_MODEL: 'opus-4.6',
        FALLBACK_MODELS: '',
        GROQ_API_KEY: 'retired-test-key',
        GROQ_API_KEYS: 'retired-test-key',
        SIS_DATA_DIR: path.join(directory, 'data'),
      },
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    assert.match(child.stdout, /GATEWAY_TEST_OK/);
    assert.ok(requests.every((r) => r.authorization === 'Bearer test-router-key'));
    for (const model of ['opus-4.6', 'qwen3.8-27b', 'new-provider-model-v9', 'mimo-v2.5'])
      assert.ok(requests.some((r) => r.body.model === model));
    assert.ok(
      requests.some((r) => r.body.messages[0].content === 'Keep this complete requirement.'),
    );
    const tool = requests.find((r) => r.body.tools);
    assert.equal(tool.body.tool_choice.function.name, 'read_file');
    assert.equal(tool.body.parallel_tool_calls, false);
    const adapted = requests.find(
      (r) => r.body.model === 'thinking-only' && r.body.tool_choice === 'auto',
    );
    assert.equal(adapted.body.tools.length, 1);
    assert.equal(adapted.body.tools[0].function.name, 'write_file');
    assert.equal(adapted.body.messages[0].content, 'Keep complete requirements.');
    const enforced = requests.filter((r) => r.body.model === 'forced-without-thinking');
    assert.equal(
      enforced.length,
      3,
      'One actual rejection, then accepted mode reused without another failed request',
    );
    for (const r of enforced.slice(1)) {
      assert.equal(r.body.thinking.type, 'disabled');
      assert.equal(r.body.tool_choice.function.name, 'write_file');
      assert.equal(r.body.tools.length, 2);
      assert.equal(r.body.messages[0].content, 'Preserve the original city requirement.');
    }
    const repairs = requests.filter((r) => r.body.model === 'repair-native');
    const changed = requests.filter((r) => r.body.model === 'changed-mode');
    assert.equal(
      changed.length,
      3,
      'A cached capability rejection renegotiates without ending the project turn.',
    );
    assert.equal(changed[1].body.thinking.type, 'disabled');
    assert.equal(changed[2].body.tool_choice, 'auto');
    assert.equal(changed[2].body.tools.length, 1);
    assert.equal(changed[2].body.messages[0].content, 'Continue the same authorized project.');
    assert.equal(repairs.length, 2);
    assert.ok(repairs.every((r) => r.body.thinking?.type === 'disabled'));
    const standard = requests.filter((r) => r.body.model === 'standard-only');
    assert.equal(standard.length, 2);
    assert.equal(standard[1].body.thinking, undefined);
    assert.equal(standard[1].body.tool_choice.function.name, 'write_file');
    assert.equal(standard[1].body.messages[0].content, 'Same project requirements.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(), 'sis-router-')));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
