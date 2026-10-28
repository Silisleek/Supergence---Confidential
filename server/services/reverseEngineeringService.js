import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const REA_VERSION = '6.5.0';
const PROFILE = Object.freeze({
  version: 1,
  reaVersion: REA_VERSION,
  maxSemanticNodes: 3000,
  maxSemanticNodesPerFile: 1000,
  maxHeapMb: 256,
  sourceTimeoutMs: 15000,
});
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
};

function failure(message, code) {
  return Object.assign(new Error(message), { code });
}

/** Static artifact inspection only. This adapter never launches the target. */
export class ReverseEngineeringService {
  constructor({
    workspaceRoot = process.cwd(),
    artifactRoot,
    evidenceDir,
    cliPackageRoot,
    timeoutMs = 60000,
    maxOutputBytes = 12 * 1024 * 1024,
    maxFiles = 256,
    maxInputBytes = 32 * 1024 * 1024,
  } = {}) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.artifactRoot = path.resolve(artifactRoot || path.join(this.workspaceRoot, 'workspace'));
    this.evidenceDir = path.resolve(
      evidenceDir || path.join(this.workspaceRoot, 'data', 'learning', 'rea'),
    );
    this.cliPackageRoot = cliPackageRoot;
    this.timeoutMs = timeoutMs;
    this.maxOutputBytes = maxOutputBytes;
    this.maxFiles = maxFiles;
    this.maxInputBytes = maxInputBytes;
    this.active = false;
  }

  async discover() {
    const candidates = [
      this.cliPackageRoot,
      process.env.SIS_REA_PACKAGE_ROOT,
      path.join(this.workspaceRoot, 'node_modules', 'rea-agents'),
    ].filter(Boolean);
    const caches = [
      process.env.npm_config_cache,
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'npm-cache'),
      path.join(os.homedir(), '.npm'),
    ].filter(Boolean);
    for (const cache of new Set(caches)) {
      try {
        const entries = await fs.readdir(path.join(cache, '_npx'), { withFileTypes: true });
        for (const entry of entries
          .filter((item) => item.isDirectory())
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 128)) {
          candidates.push(path.join(cache, '_npx', entry.name, 'node_modules', 'rea-agents'));
        }
      } catch {
        /* A missing npm cache is an unavailable source, not an install request. */
      }
    }
    for (const candidate of candidates) {
      try {
        const manifest = JSON.parse(
          await fs.readFile(path.join(candidate, 'package.json'), 'utf8'),
        );
        if (manifest.name !== 'rea-agents' || manifest.version !== REA_VERSION) continue;
        const cli = path.join(await fs.realpath(candidate), 'scripts', 'rea.mjs');
        if (!(await fs.stat(cli)).isFile()) continue;
        return { cli, version: manifest.version };
      } catch {
        /* Ignore incomplete or differently-versioned installations. */
      }
    }
    return null;
  }

  async status() {
    const cli = await this.discover();
    return {
      available: Boolean(cli),
      version: cli?.version || null,
      installation: cli ? path.dirname(path.dirname(cli.cli)) : null,
      busy: this.active,
      capabilities: cli ? ['javascript-tree', 'asar'] : [],
      artifactRoot: this.artifactRoot,
      mode: 'static-analysis',
      limits: {
        timeoutMs: this.timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
        maxFiles: this.maxFiles,
        maxInputBytes: this.maxInputBytes,
        ...PROFILE,
      },
      reason: cli
        ? null
        : `rea-agents@${REA_VERSION} was not found locally. Install that exact package or set SIS_REA_PACKAGE_ROOT; this service does not install software or configure MCP.`,
      limitations: [
        'Static evidence does not establish runtime behavior or model training.',
        'Native binaries, live browser capture, target execution, and arbitrary shell commands are not exposed by this adapter.',
      ],
    };
  }

  async inventory(requestPath, kind) {
    if (typeof requestPath !== 'string' || !requestPath.trim() || requestPath.includes('\0'))
      throw failure('Provide an explicit local artifact path.', 'INVALID_PATH');
    if (!['javascript-tree', 'asar'].includes(kind))
      throw failure('Supported kinds are javascript-tree and asar.', 'UNSUPPORTED_KIND');
    const root = await fs.realpath(this.artifactRoot);
    const selected = path.isAbsolute(requestPath)
      ? path.resolve(requestPath)
      : path.resolve(
          /^workspace(?:[\\/]|$)/.test(requestPath) ? this.workspaceRoot : this.artifactRoot,
          requestPath,
        );
    if (!inside(this.artifactRoot, selected))
      throw failure(
        'The artifact must be inside the workspace artifact directory.',
        'OUTSIDE_WORKSPACE',
      );
    const target = await fs.realpath(selected);
    if (!inside(root, target) || target === root)
      throw failure(
        'Select a specific artifact inside workspace/, not the whole workspace.',
        'OUTSIDE_WORKSPACE',
      );
    const stat = await fs.lstat(selected);
    if (stat.isSymbolicLink())
      throw failure('Symbolic-link artifacts are not supported.', 'SYMLINK');
    if (kind === 'asar' && (!stat.isFile() || path.extname(target).toLowerCase() !== '.asar'))
      throw failure('ASAR analysis requires an explicit .asar file.', 'INVALID_ARTIFACT');
    if (kind === 'javascript-tree' && !stat.isDirectory())
      throw failure(
        'JavaScript-tree analysis requires an extracted application directory.',
        'INVALID_ARTIFACT',
      );
    const files = [];
    let totalBytes = 0;
    const visit = async (current) => {
      const item = await fs.lstat(current);
      if (item.isSymbolicLink())
        throw failure('Artifact trees containing symbolic links are not supported.', 'SYMLINK');
      if (item.isDirectory()) {
        const entries = (await fs.readdir(current)).sort();
        for (const entry of entries) await visit(path.join(current, entry));
      } else if (item.isFile()) {
        totalBytes += item.size;
        if (files.length >= this.maxFiles || totalBytes > this.maxInputBytes)
          throw failure(
            'Artifact exceeds the configured file or byte budget. Select a smaller extracted artifact.',
            'INPUT_LIMIT',
          );
        const digest = sha256(await fs.readFile(current));
        files.push({
          path:
            kind === 'asar'
              ? path.basename(current)
              : path.relative(target, current).split(path.sep).join('/'),
          bytes: item.size,
          sha256: digest,
        });
      } else
        throw failure('Only ordinary files and directories are supported.', 'INVALID_ARTIFACT');
    };
    await visit(target);
    if (!files.length) throw failure('The selected artifact is empty.', 'EMPTY_ARTIFACT');
    return { target, kind, files, bytes: totalBytes, sha256: sha256(JSON.stringify(files)) };
  }

  async run(cli, target, kind) {
    const args = [
      cli,
      'analyze-javascript-application',
      target,
      '--artifact-format',
      kind === 'asar' ? 'asar' : 'directory',
      '--max-semantic-nodes',
      String(PROFILE.maxSemanticNodes),
      '--max-semantic-nodes-per-file',
      String(PROFILE.maxSemanticNodesPerFile),
      '--max-heap-mb',
      String(PROFILE.maxHeapMb),
      '--analysis-timeout-ms',
      String(PROFILE.sourceTimeoutMs),
      '--format',
      'json',
    ];
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: this.workspaceRoot,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let outputBytes = 0;
      let stopped = false;
      let terminalError = null;
      const stop = (error) => {
        if (stopped || terminalError) return;
        terminalError = error;
        clearTimeout(timer);
        if (process.platform === 'win32' && child.pid) {
          const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
            shell: false,
            windowsHide: true,
            stdio: 'ignore',
          });
          killer.on('error', () => child.kill());
        } else child.kill('SIGKILL');
      };
      const timer = setTimeout(
        () =>
          stop(
            failure('REA exceeded the configured time budget. No result was recorded.', 'TIMEOUT'),
          ),
        this.timeoutMs,
      );
      child.stdout.on('data', (chunk) => {
        outputBytes += chunk.length;
        if (outputBytes > this.maxOutputBytes)
          return stop(
            failure(
              'REA exceeded the output budget. No truncated evidence was recorded.',
              'OUTPUT_LIMIT',
            ),
          );
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr = (stderr + chunk.toString()).slice(-16000);
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        if (!stopped) {
          stopped = true;
          reject(failure(`REA could not start: ${error.message}`, 'CLI_START'));
        }
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (stopped) return;
        stopped = true;
        if (terminalError) return reject(terminalError);
        if (code !== 0)
          return reject(
            failure(`REA exited with code ${code}. ${stderr.slice(-2000)}`, 'ANALYSIS_FAILED'),
          );
        try {
          const evidence = JSON.parse(stdout);
          if (
            !/^ev_[a-f0-9]{64}$/.test(evidence.evidence_id || '') ||
            evidence.operation !== 'analyze_javascript_application' ||
            !evidence.normalized_result?.graph
          )
            throw new Error('Expected complete JavaScript application Evidence.');
          resolve(evidence);
        } catch (error) {
          reject(
            failure(
              `REA returned invalid or incomplete evidence: ${error.message}`,
              'INVALID_EVIDENCE',
            ),
          );
        }
      });
    });
  }

  summarize(record, reused) {
    const evidence = record.evidence;
    const result = evidence.normalized_result;
    const graph = result.graph;
    const observations = graph.nodes
      .flatMap((node) =>
        (node.observations || []).map((observation) => ({
          nodeId: node.node_id,
          kind: node.kind,
          label: observation.label,
          state: observation.evidence?.state || 'unknown',
          authority: observation.evidence?.authority || null,
          properties: Object.fromEntries(
            Object.entries(observation.properties || {}).filter(
              ([key, value]) =>
                [
                  'semantic_role',
                  'path',
                  'module_path',
                  'exported_name',
                  'export_names',
                  'local_name',
                  'imported_name',
                  'declared_specifier',
                  'module_format',
                  'relationship_kind',
                ].includes(key) &&
                (value === null ||
                  ['string', 'number', 'boolean'].includes(typeof value) ||
                  (Array.isArray(value) &&
                    value.length <= 80 &&
                    value.every((item) => typeof item === 'string'))),
            ),
          ),
        })),
      )
      .slice(0, 60);
    return {
      id: record.id,
      evidenceId: evidence.evidence_id,
      source: record.source,
      analyzedAt: record.analyzedAt,
      reused,
      method: 'REA static artifact analysis',
      targetExecuted: false,
      modelWeightsUpdated: false,
      statistics: result.statistics,
      summary: result.summary,
      coverage: graph.coverage,
      observations,
      observationsOmitted: Math.max(
        0,
        graph.nodes.reduce((count, node) => count + (node.observations?.length || 0), 0) -
          observations.length,
      ),
      limitations: [
        ...new Set([
          ...(evidence.limitations || []),
          ...(result.limitations || []),
          'These observations are reusable local evidence, not a claim that the model learned arbitrary subjects or improved its weights.',
        ]),
      ],
      evidenceFile: path
        .relative(this.workspaceRoot, path.join(this.evidenceDir, `${record.id}.json`))
        .split(path.sep)
        .join('/'),
    };
  }

  async analyze({ path: requestPath, kind = 'javascript-tree' } = {}) {
    if (this.active)
      throw failure('A REA analysis is already running. Try again after it completes.', 'BUSY');
    this.active = true;
    try {
      const source = await this.inventory(requestPath, kind);
      const id = sha256(
        JSON.stringify({ path: source.target, kind, sha256: source.sha256, profile: PROFILE }),
      );
      const recordPath = path.join(this.evidenceDir, `${id}.json`);
      try {
        const record = JSON.parse(await fs.readFile(recordPath, 'utf8'));
        if (
          record.id === id &&
          record.source.sha256 === source.sha256 &&
          record.evidence?.normalized_result?.graph
        )
          return this.summarize(record, true);
      } catch {
        /* A cache miss or incomplete record requires fresh evidence. */
      }
      const cli = await this.discover();
      if (!cli)
        throw failure(`rea-agents@${REA_VERSION} is unavailable locally.`, 'CLI_UNAVAILABLE');
      const evidence = await this.run(cli.cli, source.target, kind);
      const after = await this.inventory(requestPath, kind);
      if (after.sha256 !== source.sha256)
        throw failure(
          'The artifact changed during analysis. Evidence was not saved; retry on a stable copy.',
          'SOURCE_CHANGED',
        );
      const record = {
        id,
        analyzedAt: new Date().toISOString(),
        profile: PROFILE,
        source,
        evidence,
      };
      await fs.mkdir(this.evidenceDir, { recursive: true });
      const temporaryPath = `${recordPath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(record), { flag: 'wx' });
      await fs.rename(temporaryPath, recordPath);
      return this.summarize(record, false);
    } finally {
      this.active = false;
    }
  }
}

export const reverseEngineeringService = new ReverseEngineeringService();
