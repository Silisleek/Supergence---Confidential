import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { childEnvironment } from '../../server/security/child-environment.js';
import { ContainerRunner } from '../../server/sandbox/container-runner.js';
import workspace from '../../server/workspace/manager.js';
import { LspClient } from '../../server/lsp/lsp-client.js';
import { ReverseEngineeringService } from '../../server/services/reverseEngineeringService.js';

test('executed code does not inherit Supergence session or provider credentials', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-child-env-'));
  const previousRoot = workspace.baseRoot;
  const oldSecret = process.env.SIS_SESSION_SECRET;
  process.env.SIS_SESSION_SECRET = 'fixture-secret';
  workspace.setWorkspaceDir(directory);
  t.after(async () => {
    workspace.setWorkspaceDir(previousRoot);
    if (oldSecret === undefined) delete process.env.SIS_SESSION_SECRET;
    else process.env.SIS_SESSION_SECRET = oldSecret;
    await fs.rmdir(directory);
  });
  assert.equal(
    childEnvironment({ sis_session_secret: 'fixture', API_KEY: 'fixture' }).sis_session_secret,
    undefined,
  );
  assert.equal(childEnvironment({ SIS_SESSION_SECRET: 'fixture' }).SIS_SESSION_SECRET, undefined);
  const code = "console.log(process.env.SIS_SESSION_SECRET === undefined ? 'removed' : 'present')";
  const runner = new ContainerRunner({ workspaceDir: directory });
  const result = await runner.exec(process.execPath, ['-e', code], {
    env: { SIS_SESSION_SECRET: 'fixture' },
  });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /removed/);
  const command = `"${process.execPath}" -e "${code}"`;
  const workspaceResult = await workspace.runCommand(command);
  assert.equal(workspaceResult.exitCode, 0);
  assert.match(workspaceResult.stdout, /removed/);
});

test('language servers and artifact analyzers do not inherit backend secrets', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sis-child-process-'));
  const oldSecret = process.env.SIS_SESSION_SECRET;
  process.env.SIS_SESSION_SECRET = 'fixture-secret';
  t.after(async () => {
    if (oldSecret === undefined) delete process.env.SIS_SESSION_SECRET;
    else process.env.SIS_SESSION_SECRET = oldSecret;
    await fs.rm(directory, { recursive: true, force: true });
  });
  await fs.writeFile(
    path.join(directory, 'probe.cjs'),
    "process.stdout.write(process.env.SIS_SESSION_SECRET || 'removed');",
  );
  const lsp = new LspClient({ serverCommand: 'node probe.cjs', rootPath: directory });
  await lsp.start();
  const output = await new Promise((resolve, reject) => {
    let data = '';
    lsp.process.stdout.on('data', (chunk) => {
      data += chunk;
    });
    lsp.process.once('error', reject);
    lsp.process.once('close', (code) =>
      code === 0 ? resolve(data) : reject(new Error(`LSP exit ${code}`)),
    );
  });
  assert.equal(output, 'removed');
  const cli = path.join(directory, 'analyzer.cjs');
  await fs.writeFile(
    cli,
    `console.log(JSON.stringify({evidence_id:'ev_'+ 'a'.repeat(64),operation:'analyze_javascript_application',normalized_result:{graph:{secret:process.env.SIS_SESSION_SECRET || 'removed'}}}));`,
  );
  const service = new ReverseEngineeringService({ workspaceRoot: directory });
  const evidence = await service.run(cli, directory, 'javascript-tree');
  assert.equal(evidence.normalized_result.graph.secret, 'removed');
});
