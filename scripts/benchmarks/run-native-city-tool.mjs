// Invoke the application's own existing tools. Source patches are generated
// by Supergence's configured model inside repair_browser_app, never here.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const [base, requestFile] = process.argv.slice(2);
const request = JSON.parse(await fs.readFile(requestFile, 'utf8'));
if (
  ![
    'repair_browser_app',
    'run_command',
    'review_workspace_visual',
    'verify_workspace_artifact',
  ].includes(request.tool)
)
  throw new Error('Only native generation and verification tools are supported by this evaluator.');
const startedAt = new Date().toISOString();
const output = path.resolve('test-results/project-workflow/native-tool-runs');
await fs.mkdir(output, { recursive: true });
const log = path.join(output, Date.now() + '-' + request.tool + '.json');
await fs.writeFile(log, JSON.stringify({ startedAt, request, status: 'pending' }, null, 2));
try {
  const body = JSON.stringify(request);
  const response = await new Promise((resolve, reject) => {
    const pending = http.request(
      new URL('/api/tools/execute', base),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, result: JSON.parse(data) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    pending.setTimeout(900000, () =>
      pending.destroy(
        new Error(
          'Tool response timed out; execution status is uncertain. Do not replay before inspecting actual files/receipts.',
        ),
      ),
    );
    pending.on('error', reject);
    pending.end(body);
  });
  const result = response.result;
  await fs.writeFile(
    log,
    JSON.stringify(
      { startedAt, request, httpStatus: response.status, status: 'returned', ...result },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ log, ...result }));
  if (
    response.status !== 200 ||
    !result.success ||
    result.result?.success === false ||
    result.result?.passed === false ||
    Number(result.result?.exitCode) > 0
  )
    process.exitCode = 1;
} catch (error) {
  await fs.writeFile(
    log,
    JSON.stringify({ startedAt, request, status: 'uncertain', error: error.message }, null, 2),
  );
  throw error;
}
