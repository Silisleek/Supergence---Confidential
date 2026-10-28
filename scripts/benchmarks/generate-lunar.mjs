import fs from 'node:fs/promises';
import path from 'node:path';
import { getNextGroqClient } from '../../server/api/openrouter.js';
const arg = (name, fallback) =>
  process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const mode = arg('--mode', 'app');
const directory = arg('--directory', `supergence/benchmarks/qwen-${mode}-lunar`);
if (!/^supergence\/benchmarks\/[a-z0-9_-]+$/i.test(directory))
  throw new Error('Use a new directory within supergence/benchmarks.');
const target = path.resolve('workspace', directory);
await fs.mkdir(target, { recursive: true });
const prompt = await fs.readFile(
  'workspace/supergence/benchmarks/public-lunar-scream/original-prompt.txt',
  'utf8',
);
const start = performance.now();
if (mode === 'direct') {
  const result = await getNextGroqClient().client.chat.completions.create(
    {
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'system',
          content:
            'Create the requested browser game. Return one complete self-contained HTML document with embedded CSS and JavaScript as the packaging format. No external assets. Do not claim testing.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 16384,
      temperature: 0.3,
    },
    { timeout: 180000, maxRetries: 0 },
  );
  const raw = result.choices[0].message.content;
  await fs.writeFile(
    path.join(target, 'response.json'),
    JSON.stringify(
      {
        prompt,
        model: result.model,
        usage: result.usage,
        finishReason: result.choices[0].finish_reason,
        durationMs: performance.now() - start,
        response: raw,
      },
      null,
      2,
    ),
  );
  const begin = raw.search(/<!doctype html|<html/i),
    end = raw.toLowerCase().lastIndexOf('</html>');
  if (begin < 0 || end < 0 || result.choices[0].finish_reason === 'length')
    throw new Error('Incomplete output.');
  await fs.writeFile(path.join(target, 'index.html'), raw.slice(begin, end + 7));
  console.log({
    model: result.model,
    bytes: end + 7 - begin,
    durationMs: performance.now() - start,
    filename: `${directory}/index.html`,
  });
} else {
  const query = `${prompt}\n\nWorkspace delivery location: ${directory}/index.html. Keep supporting files in that directory. Work only there and write original code; do not inspect or reuse other comparison implementations. This is one request with your own implementation/testing workflow and no external feedback.`;
  await fs.writeFile(path.join(target, 'request.txt'), query);
  const response = await fetch(
    arg('--base-url', process.env.SIS_BASE_URL || 'http://localhost:3009') +
      '/api/sis/unified-turn',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        conversationId: arg('--conversation', `lunar-${Date.now()}`),
        requestId: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(600000),
    },
  );
  const result = await response.json();
  await fs.writeFile(path.join(target, 'turn.json'), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      http: response.status,
      success: result.success,
      error: result.error,
      response: result.response,
      tools: result.toolCalls?.map((t) => ({
        tool: t.tool,
        status: t.status,
        error: t.output?.error,
        filename: t.output?.filename,
      })),
      durationMs: performance.now() - start,
    }),
  );
  if (!response.ok || !result.success) process.exitCode = 1;
}
