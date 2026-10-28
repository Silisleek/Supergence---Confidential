// Dispatch one authorized turn through Supergence's normal application API.
// No city source generation or tool execution occurs in this evaluator.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

const [base, conversationId, queryFile] = process.argv.slice(2);
if (!base || !conversationId || !queryFile)
  throw new Error('Supply base URL, existing conversation and feedback file.');
const requestId = randomUUID();
const output = path.resolve('test-results/project-workflow/native-runs');
await fs.mkdir(output, { recursive: true });
const log = path.join(output, requestId + '.jsonl');
const oracles = [
  'scripts/benchmarks/review-yunlan.mjs',
  'scripts/benchmarks/yunlan-deep-checks.mjs',
  'scripts/benchmarks/probe-yunlan-ui.mjs',
];
const digest = async (file) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const before = await Promise.all(oracles.map(digest));
const calls = new Map();
let terminal = null;
const response = await fetch(base + '/api/sis/unified-turn-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: await fs.readFile(queryFile, 'utf8'), conversationId, requestId }),
});
if (!response.ok) throw new Error(`Native application returned HTTP ${response.status}`);
let pending = '';
const decoder = new TextDecoder();
for await (const chunk of response.body) {
  pending += decoder.decode(chunk, { stream: true });
  let end;
  while ((end = pending.indexOf('\n\n')) >= 0) {
    const packet = pending.slice(0, end);
    pending = pending.slice(end + 2);
    const event = packet
      .split('\n')
      .find((line) => line.startsWith('event: '))
      ?.slice(7);
    const raw = packet
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice(6))
      .join('\n');
    if (!raw || ['token', 'heartbeat', 'interactive-ui'].includes(event)) continue;
    const data = JSON.parse(raw);
    await fs.appendFile(log, JSON.stringify({ event, data }) + '\n');
    if (event === 'tool-call') calls.set(data.id, data);
    if (event === 'tool-result')
      console.log(
        JSON.stringify({
          tool: calls.get(data.id)?.tool,
          status: data.status,
          exitCode: data.output?.exitCode,
          error: data.output?.error,
        }),
      );
    if (event === 'done' || event === 'error') {
      terminal = {
        event,
        error: data.error,
        response: data.response?.slice(-1800),
        requestId,
        conversationId,
      };
      console.log(JSON.stringify(terminal));
    }
  }
}
const after = await Promise.all(oracles.map(digest));
const oracleIntegrity = before.every((value, index) => value === after[index]);
await fs.writeFile(
  path.join(output, requestId + '-summary.json'),
  JSON.stringify({ terminal, oracleIntegrity, log }, null, 2),
);
console.log(JSON.stringify({ oracleIntegrity, log }));
if (!oracleIntegrity || terminal?.event !== 'done') process.exitCode = 1;
