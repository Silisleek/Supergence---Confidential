import fs from 'node:fs/promises';
const [brief, output, id] = process.argv.slice(2);
const query = await fs.readFile(brief, 'utf8');
const response = await fetch('http://localhost:3009/api/sis/unified-turn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, conversationId: id, requestId: crypto.randomUUID() }),
  signal: AbortSignal.timeout(600000),
});
const result = await response.json();
await fs.writeFile(output, JSON.stringify({ http: response.status, ...result }, null, 2));
const conversation = await (await fetch('http://localhost:3009/api/conversations/' + id)).json();
await fs.writeFile(
  output.replace(/\.json$/, '.conversation.json'),
  JSON.stringify(conversation, null, 2),
);
console.log(
  JSON.stringify({
    success: result.success,
    error: result.error,
    response: result.response?.slice(0, 2500),
    tools: result.toolCalls?.map((t) => ({
      tool: t.tool,
      status: t.status,
      file: t.args?.filepath || t.args?.filename,
      command: t.args?.command,
      exit: t.output?.exitCode,
      error: t.output?.error,
      report: t.output?.report,
      screenshot: t.output?.screenshot,
    })),
  }),
);
if (!response.ok || result.error) process.exitCode = 1;
