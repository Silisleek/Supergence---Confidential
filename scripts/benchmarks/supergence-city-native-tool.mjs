// Evaluator dispatch to Supergence's native tool API. No city implementation here.
import fs from 'node:fs/promises';
const [requestPath, receiptPath] = process.argv.slice(2);
const request = JSON.parse(await fs.readFile(requestPath, 'utf8'));
const response = await fetch('http://localhost:3009/api/tools/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
  signal: AbortSignal.timeout(600000),
});
const result = await response.json();
await fs.writeFile(receiptPath, JSON.stringify({ http: response.status, ...result }, null, 2));
console.log(JSON.stringify(result).slice(0, 3500));
if (!response.ok || !result.success || result.result?.error) process.exitCode = 1;
