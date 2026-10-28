import fs from 'node:fs/promises';
const [baseURL, briefFile, outputFile, conversationId] = process.argv.slice(2);
if (!baseURL || !briefFile || !outputFile)
  throw new Error('Arguments: actual-server-URL brief.txt result.json [conversation-id]');
const query = await fs.readFile(briefFile, 'utf8');
const started = Date.now();
const response = await fetch(baseURL + '/api/sis/unified-turn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    conversationId: conversationId || `quality-${Date.now()}`,
    requestId: crypto.randomUUID(),
  }),
  signal: AbortSignal.timeout(600000),
});
const body = await response.json();
await fs.writeFile(
  outputFile,
  JSON.stringify({ http: response.status, durationMs: Date.now() - started, ...body }, null, 2),
);
console.log(
  JSON.stringify(
    body,
    (key, value) =>
      typeof value === 'string' && value.length > 700 ? value.slice(0, 700) + '…' : value,
    2,
  ),
);
if (!response.ok || body.error) process.exitCode = 1;
