import { injectImportmapIfNeeded } from './workspace/preview-importmap.js';
import { resolveWithinRoot } from './utils/path-confinement.js';
import { sessionAuth } from './security/session-auth.js';
import { registerLearningRoutes } from './routes/learning.js';
import { registerEvolutionRoutes } from './routes/evolution.js';
import { evolutionEngine } from './services/evolutionEngine.js';
import { configureEvolutionTools } from './services/evolutionToolInstaller.js';
import learningLibrary from './services/learningLibrary.js';
import { resolveConversationIntent } from './services/conversationContext.js';
import { registerWorkspaceBrowserRoutes } from './routes/workspace-browser.js';
import { registerRuntimeAccessRoutes } from './routes/runtime-access.js';
import { registerProactiveSuggestionRoutes } from './routes/proactive-suggestions.js';
import { registerConversationWorkspaceRoutes } from './routes/conversation-workspaces.js';
import { runtimeAccess } from './services/runtimeAccess.js';
import { childEnvironment } from './security/child-environment.js';
import { assertBrowserEnabled, browserAccessMiddleware } from './security/browser-access.js';
import { createProjectPreviewService } from './security/project-preview.js';
import { registerAgentProfileRoutes } from './routes/agent-profiles.js';
import { registerAgentConversationRoutes } from './routes/agent-conversations.js';
import { configureAgentConversationRuntime } from './services/agentConversations.js';
import { registerPageRoutes } from './routes/pages.js';
// SIS 1.0 — Main Server
// Express + WebSocket server — the brain's nervous system

import express from 'express';
import { WebSocketServer } from 'ws';
import { localBoundary, isLocalRequest } from './security/local-boundary.js';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createServer } from 'http';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import brain from './orchestrator/brain.js';
global.__brain = brain;
import workspace from './workspace/manager.js';
import githubManager from './github/manager.js';
import conversations from './conversations.js';
import shortTermMemory from './memory/short-term.js';
import longTermMemory from './memory/long-term.js';
import improver from './improvement/improver.js';
import autonomousLearner from './improvement/autonomous-learner.js';
import evaluator from './improvement/evaluator.js';
import optimizer from './improvement/optimizer.js';
import patternLibrary from './improvement/anti-patterns.js';
import fs from 'fs';
import toolRegistry from './tools/registry.js';
import knowledgeGraph from './memory/knowledge-graph.js';
import { quickAI, PREMIUM_MODEL, assertProviderAvailable } from './api/openrouter.js';
import possap from './possap/index.js';
import systemManager from './systems/manager.js';
import userFocusTracker from './improvement/user-focus-tracker.js';
import metaPromptOptimizer from './improvement/meta-prompt-optimizer.js';
import exemplarBank from './improvement/exemplar-bank.js';
import rsiOrchestrator from './rsi/simultaneous-orchestrator.js';
import cladeArchive from './rsi/clade-archive.js';
import redQueenEvaluator from './rsi/red-queen-evaluator.js';
import absoluteZeroEngine from './rsi/absolute-zero-engine.js';
import alphaEvolveEngine from './rsi/alpha-evolve-engine.js';
import subconsciousMatrix from './orchestrator/subconscious.js';
import conversationDatasetMiner from './improvement/conversation-dataset-miner.js';
import bootstrapper from './improvement/bootstrapper.js';
import survivalEngine from './survival/survival.js';
import { evidenceLedger, SkillVerifier, GRADE } from './trajectory/evidence-verifier.js';
import { ORACLE_SOURCE } from './trajectory/oracle-synth.js';
import { hasPassingOracle } from './trajectory/learning-grade.js';
import mistakeLearningEngine from './improvement/mistake-learning-engine.js';
import brainLifecycle from './orchestrator/brain-lifecycle.js';
import autoHealer from './orchestrator/auto-healer.js';
import homeostasis from './orchestrator/homeostasis.js';
import dmnDaemon from './orchestrator/dmn-daemon.js';
import sleepEngine from './orchestrator/sleep-engine.js';
import glymphaticDaemon from './orchestrator/glymphatic.js';
import cerebellarCache from './orchestrator/cerebellar-cache.js';
import neuromodulators from './orchestrator/neuromodulators.js';
import neuralOscillations from './orchestrator/neural-oscillations.js';
import streamOfConsciousness from './orchestrator/stream-of-consciousness.js';
import thalamocortical from './orchestrator/thalamocortical.js';
import inventiveEngine from './orchestrator/inventive-engine.js';
import humanVisionObserver from './orchestrator/human-vision-observer.js';
import humanLearningEngine from './orchestrator/human-learning-engine.js';
import humanBuilderFeedback from './orchestrator/human-builder-feedback.js';
import theoryOfMind from './orchestrator/theory-of-mind.js';
import proactiveCollaborator from './orchestrator/proactive-collaborator.js';
import dynamicArtifactSynthesizer from './orchestrator/dynamic-artifact-synthesizer.js';
import autonomousRulesEngine from './orchestrator/autonomous-rules-engine.js';
import internetLearningEngine from './improvement/internet-learning-engine.js';
import chemistor from './chemistry/chemistor.js';
import supergenceEngine from './orchestrator/supergence-engine.js';
import adaToolForger from './services/adaToolForger.js';
import continuousEngine from './orchestrator/continuous-engine.js';
import goalEngine from './orchestrator/goal-engine.js';
import hermesLearner from './services/hermesLearner.js';
import agentTeamManager from './services/agentTeam.js';
import publicApisManager from './services/publicApis.js';
import sisUnifiedSystem from './services/sisUnifiedSystem.js';
import openclawController from './services/openclawController.js';
import openBotDotsManager from './services/openBotDotsManager.js';
import agentBrowserManager from './services/agentBrowserManager.js';
import routinesManager from './services/routinesManager.js';
import checkpointManager from './services/checkpointManager.js';
import codeToVideoEngine from './visual/video-engine.js';
import spatialWorldEngine from './3d/spatial-world.js';
import shaderSynthesizer from './visual/shader-synthesizer.js';
import speculativeDualPathSwarm from './orchestrator/dual-path-swarm.js';
import hermesStateDAG from './memory/state-dag.js';
import advancedMethodsEngine from './orchestrator/advanced-methods-engine.js';
import autonomousStartupEngine from './services/autonomousStartupEngine.js';
import enterpriseVault from './security/vault.js';
import enterpriseAuditTrail from './security/audit-trail.js';
import enterpriseGovernance from './security/governance.js';

dotenv.config();

// Global crash protection hooks to prevent server termination from unhandled async errors
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection at:', promise, 'reason:', reason);
});
process.on('exit', (code) => {
  console.error(`[CRITICAL] Server process exiting with code ${code}. Stack:\n`, new Error().stack);
});
process.on('beforeExit', (code) => {
  console.warn(`[WARN] Server process beforeExit triggered with code ${code}`);
});

// Wire POSSAP predictions directly into WebSocket broadcasts
possap.setBroadcastCallback((type, data) => {
  brain.broadcast(type, data);
});

// Wire Simultaneous RSI Engine events directly into WebSocket broadcasts
rsiOrchestrator.setBroadcast((type, data) => {
  brain.broadcast(type, data);
});

// Wire Survival Engine events directly into WebSocket broadcasts
survivalEngine.setBroadcast((type, data) => {
  brain.broadcast(type, data);
});

// Wire Workspace Manager events directly into WebSocket broadcasts
workspace.setBroadcast((type, data) => {
  brain.broadcast(type, data);
});

// Wire Agent Personal Browser Swarm events directly into WebSocket broadcasts
agentBrowserManager.setBroadcast((type, data) => {
  if (!runtimeAccess.settings.browser) return;
  brain.broadcast(type, data);
});

// Real-time filesystem watcher for workspace directory:
// Whenever any file is created or updated (by tools, external scripts, or child processes),
// broadcast workspace-file-saved and artifact so the client immediately loads the live preview in the side panel!
const watchedWorkspaceUpdates = new Map();
try {
  fs.watch(workspace.root, { recursive: false }, (eventType, filename) => {
    if (!filename) return;
    const cleanFn = path.basename(filename);
    if (cleanFn.startsWith('.') || cleanFn.endsWith('~') || cleanFn.endsWith('.tmp')) return;
    const fullPath = path.join(workspace.root, cleanFn);
    if (!fs.existsSync(fullPath)) return;
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return;
      const now = Date.now();
      const last = watchedWorkspaceUpdates.get(cleanFn) || 0;
      if (now - last < 300) return; // 300ms debounce
      watchedWorkspaceUpdates.set(cleanFn, now);

      const isHtml = cleanFn.toLowerCase().endsWith('.html');
      const isVisualMedia = /\.(png|svg|webp|jpg)$/i.test(cleanFn);
      brain.broadcast('workspace-file-saved', {
        filename: cleanFn,
        filepath: cleanFn,
        path: fullPath,
        size: stat.size,
        mtime: stat.mtimeMs,
        isInteractiveHtml: isHtml || isVisualMedia,
        autoPreview: isHtml || isVisualMedia,
        action: 'file-saved',
      });
      brain.broadcast('workspace-update', {
        action: 'file-saved',
        filename: cleanFn,
        path: cleanFn,
      });
      if (isHtml || isVisualMedia) {
        brain.broadcast('artifact', {
          id: 'art-' + Date.now(),
          title: cleanFn
            .replace(/\.[^.]+$/i, '')
            .replace(/[_-]/g, ' ')
            .toUpperCase(),
          filename: cleanFn,
          src: `/workspace/${cleanFn}`,
          type: isHtml ? 'html-artifact' : 'vector_design',
        });
      }
    } catch (_) {}
  });
} catch (watchErr) {
  console.warn('[Workspace Watcher] Could not attach fs.watch:', watchErr.message);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(process.env.SIS_DATA_DIR || path.join(__dirname, '../data'));
const app = express();
const server = createServer(app);
server.timeout = 15 * 60 * 1000;
server.headersTimeout = 15 * 60 * 1000;
server.requestTimeout = 15 * 60 * 1000;
server.keepAliveTimeout = 65000;
const PORT = process.env.PORT || 3001;

const projectPreview = createProjectPreviewService({
  workspace,
  vendorRoot: path.join(__dirname, '../node_modules/three'),
  transformHtml: preparePreviewHtml,
  filesEnabled: () => runtimeAccess.settings.files,
});
runtimeAccess.onChange((next, previous) => {
  if (previous.files && !next.files) projectPreview.revokeAll();
});
app.use('/__project-preview', projectPreview.serve);
app.use(localBoundary);
app.use(sessionAuth.middleware);
app.use(express.json({ limit: '50mb' }));
app.use('/api/browser', browserAccessMiddleware);
app.use('/api/workspace', (req, res, next) => {
  if (req.path !== '/command' && !runtimeAccess.settings.files)
    return res.status(403).json({ error: 'File access is disabled in Access settings.' });
  next();
});
app.use('/api/artifacts', (_req, res, next) => {
  if (!runtimeAccess.settings.files)
    return res.status(403).json({ error: 'File access is disabled in Access settings.' });
  next();
});
app.post('/api/workspace/preview-grants', projectPreview.issue);

// Aggressive cache-busting headers to prevent stale browser caches across updates
app.use((req, res, next) => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Serve client application statically (serve client directly for instant hot changes; fallback to dist)
const clientPath = path.join(__dirname, '../client');
const distPath = path.join(__dirname, '../dist');
const releasePath = path.join(__dirname, '../release');
const downloaderPath = path.join(__dirname, '../downloader');
const resourcesPath = path.join(__dirname, '../resources');

registerPageRoutes(app);

app.use(
  '/vendor/three',
  (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(__dirname, '../node_modules/three')),
);
app.use(express.static(clientPath, { etag: false, lastModified: false, maxAge: 0 }));
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { etag: false, lastModified: false, maxAge: 0 }));
}
if (fs.existsSync(releasePath)) {
  app.use('/release', express.static(releasePath, { etag: true, maxAge: '1h' }));
}
if (fs.existsSync(downloaderPath)) {
  app.use('/download', express.static(downloaderPath));
  app.use('/downloader', express.static(downloaderPath));
}
if (fs.existsSync(resourcesPath)) {
  app.use('/resources', express.static(resourcesPath));
}
const bgPath = path.join(__dirname, '../Supergencebackgrounds');
if (fs.existsSync(bgPath)) {
  app.use('/Supergencebackgrounds', express.static(bgPath));
}
const liquidGlassPath = path.join(__dirname, '../Liquid-glass');
if (fs.existsSync(liquidGlassPath)) {
  app.use('/Liquid-glass', express.static(liquidGlassPath));
}

// Verification API Data Endpoint
app.get('/api/verification/data', (req, res) => {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      twentyComplex: null,
      financialAudit: null,
      quarantine: null,
      sreAudit: null,
      mistakesLedger: null,
      tokenBucketCode: null,
      tokenBucketTest: null,
    };

    const pTwenty = path.join(__dirname, '../scratch/twenty_complex_results.json');
    if (fs.existsSync(pTwenty)) {
      try {
        data.twentyComplex = JSON.parse(fs.readFileSync(pTwenty, 'utf8'));
      } catch (_) {}
    }

    const pFin = path.join(__dirname, '../scratch/worker_tasks/financial_audit_report.json');
    if (fs.existsSync(pFin)) {
      try {
        data.financialAudit = JSON.parse(fs.readFileSync(pFin, 'utf8'));
      } catch (_) {}
    }

    const pQuar = path.join(__dirname, '../scratch/worker_tasks/quarantine.json');
    if (fs.existsSync(pQuar)) {
      try {
        data.quarantine = JSON.parse(fs.readFileSync(pQuar, 'utf8'));
      } catch (_) {}
    }

    const pSre = path.join(__dirname, '../scratch/worker_tasks/sre_system_audit.json');
    if (fs.existsSync(pSre)) {
      try {
        data.sreAudit = JSON.parse(fs.readFileSync(pSre, 'utf8'));
      } catch (_) {}
    }

    const pMistakes = path.join(__dirname, '../data/memory/mistakes-ledger.json');
    if (fs.existsSync(pMistakes)) {
      try {
        data.mistakesLedger = JSON.parse(fs.readFileSync(pMistakes, 'utf8'));
      } catch (_) {}
    }

    const pCode = path.join(__dirname, '../scratch/worker_tasks/task1_token_bucket.mjs');
    if (fs.existsSync(pCode)) {
      try {
        data.tokenBucketCode = fs.readFileSync(pCode, 'utf8');
      } catch (_) {}
    }

    const pTest = path.join(__dirname, '../scratch/worker_tasks/test_task1.mjs');
    if (fs.existsSync(pTest)) {
      try {
        data.tokenBucketTest = fs.readFileSync(pTest, 'utf8');
      } catch (_) {}
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verification API Live Task Execution Endpoint
app.post('/api/verification/run-task', async (req, res) => {
  const { task } = req.body || {};
  const { exec } = await import('child_process');
  let cmd = '';

  if (task === 'tdd-test') {
    cmd = 'node scratch/worker_tasks/test_task1.mjs';
  } else if (task === 'benchmark') {
    cmd = 'node scratch/worker_tasks/benchmark_task1.mjs';
  } else if (task === 'etl') {
    cmd = 'node scratch/worker_tasks/etl_pipeline.mjs';
  } else if (task === 'sre') {
    cmd = 'node scratch/worker_tasks/sre_audit.mjs';
  } else {
    return res.status(400).json({ error: 'Unknown verification task: ' + task });
  }

  try {
    await runtimeAccess.authorize('run_command', { command: cmd });
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
  const start = Date.now();
  exec(
    cmd,
    { cwd: path.join(__dirname, '..'), timeout: 30000, env: childEnvironment() },
    (error, stdout, stderr) => {
      const elapsed = Date.now() - start;
      res.json({
        success: !error,
        task,
        command: cmd,
        exitCode: error ? error.code || 1 : 0,
        stdout: stdout || '',
        stderr: stderr || '',
        elapsedMs: elapsed,
      });
    },
  );
});

// Error-interception probe script for live preview artifacts
const PREVIEW_PROBE_SCRIPT = `
<script id="sis-diagnostic-probe">
(function() {
  function isBenign(msg) {
    if (!msg) return false;
    var str = String(msg).toLowerCase();
    return str.includes('user gesture') ||
           str.includes('pointer lock') ||
           str.includes('audiocontext') ||
           str.includes('resizeobserver') ||
           str.includes('interrupted by a call to pause');
  }

  window.addEventListener('error', function(e) {
    try {
      var resource = e.target && e.target !== window && (e.target.src || e.target.href);
      var msg = e.message || (resource ? 'A preview resource could not load.' : 'JavaScript runtime error');
      if (isBenign(msg)) return;
      window.parent.postMessage({
        type: 'sis-preview-error',
        message: msg,
        filename: window.location.pathname.split('/').pop().split('?')[0] || 'index.html',
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        stack: e.error ? (e.error.stack || '') : ''
      }, '*');
    } catch (_) {}
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    try {
      var r = e.reason || {};
      var msg = r.message || String(r) || 'Unhandled Promise Rejection';
      if (isBenign(msg)) return;
      window.parent.postMessage({
        type: 'sis-preview-error',
        message: msg,
        filename: window.location.pathname.split('/').pop().split('?')[0] || 'index.html',
        lineno: 0,
        colno: 0,
        stack: r.stack || ''
      }, '*');
    } catch (_) {}
  });
})();
</script>
`;

function preparePreviewHtml(source, vendorPrefix = null) {
  let content = injectImportmapIfNeeded(source);
  if (vendorPrefix) content = content.replaceAll('"/vendor/three/', `"${vendorPrefix}/`);
  if (!content.includes('sis-diagnostic-probe')) {
    if (/<head\b[^>]*>/i.test(content))
      content = content.replace(/<head\b[^>]*>/i, (head) => `${head}\n${PREVIEW_PROBE_SCRIPT}`);
    else if (/<script\b/i.test(content))
      content = content.replace(/<script\b/i, (script) => `${PREVIEW_PROBE_SCRIPT}\n${script}`);
    else if (content.includes('</body>'))
      content = content.replace('</body>', `${PREVIEW_PROBE_SCRIPT}\n</body>`);
    else if (content.includes('</html>'))
      content = content.replace('</html>', `${PREVIEW_PROBE_SCRIPT}\n</html>`);
    else content += `\n${PREVIEW_PROBE_SCRIPT}`;
  }
  return content;
}

// Serve existing workspace previews without following linked paths.
app.use('/workspace', (req, res, next) => {
  if (!runtimeAccess.settings.files)
    return res.status(403).json({ error: 'File access is disabled in Access settings.' });
  res.setHeader(
    'Content-Security-Policy',
    'sandbox allow-scripts allow-forms allow-downloads allow-pointer-lock',
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  let relative;
  let fullPath;
  try {
    relative = decodeURIComponent(req.path).replace(/^\/+/, '');
    if (relative.includes('\\') || relative.includes('\0')) throw new Error('Invalid path');
    fullPath = resolveWithinRoot(workspace.baseRoot, relative);
  } catch (_) {
    return res.status(403).end();
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return res.status(404).end();
  if (/\.html?$/i.test(relative) && relative.includes('/')) {
    try {
      const grantUrl = projectPreview.issueGrant(relative);
      if (grantUrl) return res.redirect(307, grantUrl);
    } catch (_) {}
  }
  if (!/\.html?$/i.test(relative)) {
    return res.sendFile(fullPath, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  try {
    const content = preparePreviewHtml(fs.readFileSync(fullPath, 'utf8'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(content);
  } catch (error) {
    console.warn('[Workspace preview] Could not read file:', error.message);
    return res.status(500).end();
  }
});

// ─── 1-Click Autonomous Auto-Healer Endpoint ───
app.post('/api/heal', async (req, res) => {
  try {
    const { filename, filepath, error, lineno, colno, stack, userContext } = req.body || {};
    if (!filename && !filepath) {
      return res.status(400).json({ error: 'filename or filepath is required for auto-heal' });
    }
    const result = await autoHealer.healFile({
      filename,
      filepath,
      error,
      lineno,
      colno,
      stack,
      userContext,
    });

    // Broadcast live workspace update & auto-heal receipt to all connected clients
    brain.broadcast('workspace-file-saved', {
      filename: result.filename,
      language: result.language,
      content: result.code,
      path: result.filepath,
      verified: result.verified,
      isInteractiveHtml: result.filename.endsWith('.html'),
    });
    brain.broadcast('workspace-update', { timestamp: Date.now() });
    brain.broadcast('auto-heal-complete', {
      filename: result.filename,
      rootCause: result.rootCause,
      diff: result.diff,
      verified: result.verified,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API] /api/heal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── REST API Routes ───

// Health check (build tag proves which code the running server loaded)
const BUILD = '20261023-conversation-memory';
registerLearningRoutes(app);
registerEvolutionRoutes(app);
evolutionEngine.research = async (topic) => {
  const result = await toolRegistry.execute('deep_research', { topic });
  if (result?.error || result?.success === false)
    throw new Error(result.error || 'Research failed.');
  const retained = learningLibrary.ingest({
    title: `Research: ${topic}`,
    content: JSON.stringify(result, null, 2),
    source: 'Supergence deep_research runtime output',
    sourceType: 'research',
  });
  return {
    result,
    retained,
    limitation:
      'Research output retained with its reported citations; retention does not independently verify claims.',
  };
};
registerWorkspaceBrowserRoutes(app);
registerRuntimeAccessRoutes(app, { waitForBrowserShutdown: () => agentBrowserManager.revocation });
registerConversationWorkspaceRoutes(app);
await registerProactiveSuggestionRoutes(
  app,
  () => sisUnifiedSystem.hasActiveTasks() || brain.hasActiveChat?.(),
);
registerAgentProfileRoutes(app, agentTeamManager);
registerAgentConversationRoutes(app);
configureAgentConversationRuntime({
  reply: async ({ agent, messages, senderName, threadId, onToken, onToolCall, onToolResult }) => {
    const latest = messages.at(-1);
    const result = await sisUnifiedSystem.executeUnifiedTurnStream(
      {
        query: latest.content,
        agentId: agent.id,
        conversationId: `side-${threadId}`,
        persistConversation: false,
        history: messages.slice(0, -1).map((message) => ({
          role: message.senderId === agent.id ? 'assistant' : 'user',
          content: `${message.senderName}: ${message.content}`,
        })),
        context: { channel: 'side-chat', senderName },
      },
      {
        onStreamToken: (_token, text) => onToken?.(text),
        onToolCall: (activity) => onToolCall?.(activity),
        onToolResult: (activity) => onToolResult?.(activity),
      },
    );
    if (!result.success)
      throw new Error(result.error || 'The agent could not complete this message.');
    return result.response;
  },
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'SIS 1.0 Superintelligence',
    build: BUILD,
    uptime: process.uptime(),
  });
});

// Get brain state (cached for 3s to prevent event loop starvation)
let _cachedBrainState = null;
let _cachedBrainStateTime = 0;
app.get('/api/state', (req, res) => {
  const now = Date.now();
  if (_cachedBrainState && now - _cachedBrainStateTime < 3000) {
    return res.json(_cachedBrainState);
  }
  _cachedBrainState = brain.getState();
  _cachedBrainStateTime = now;
  res.json(_cachedBrainState);
});

// Get survival state (points, level, achievements, shutdown status)
app.get('/api/survival', (req, res) => {
  res.json(survivalEngine.getState());
});

app.get('/api/survival/metrics', (req, res) => {
  try {
    const state = survivalEngine.getState();
    const cpus = os.cpus();
    res.json({
      ...state,
      system: {
        platform: os.platform(),
        cpus: cpus ? cpus.length : 8,
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        uptime: os.uptime(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revive SIS after shutdown
app.post('/api/survival/revive', (req, res) => {
  const revived = survivalEngine.revive();
  res.json({ success: true, state: revived });
});

// Get verified learning ledger (all active learned invariants, reflexes, mistake lessons, and exemplars)
app.get('/api/learning/ledger', (req, res) => {
  try {
    const subconsciousState = subconsciousMatrix.getSubconsciousState();
    const antiPatterns = patternLibrary.antiPatterns || [];
    const exemplars = exemplarBank.exemplars || [];
    const metaStats = metaPromptOptimizer.getStats ? metaPromptOptimizer.getStats() : {};

    res.json({
      success: true,
      stats: {
        totalLatentHeuristics: subconsciousState?.latentMatrix?.activeHeuristicsCount || 0,
        totalMistakesLearned: subconsciousState?.mistakeLearning?.totalMistakesLearned || 0,
        totalAntiPatterns: antiPatterns.length,
        totalExemplars: exemplars.length,
        generations: subconsciousState?.latentMatrix?.stats?.subconsciousGenerations || 1,
        lastEvolvedAt: subconsciousState?.latentMatrix?.stats?.lastSubconsciousEvolutionAt || null,
      },
      latentHeuristics: subconsciousState?.latentMatrix?.recentHeuristics || [],
      mistakeLedger: subconsciousState?.mistakeLearning?.recentLearnedMistakes || [],
      antiPatterns: antiPatterns.slice(0, 30),
      exemplars: exemplars.slice(0, 20),
      metaDirectives: metaStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message (non-streaming fallback with BYOK provider support)
app.post('/api/message', async (req, res) => {
  try {
    const { message, images, byok } = req.body || {};
    if (!message && (!images || images.length === 0))
      return res.status(400).json({ error: 'Message or image required' });
    const result = await brain.process(message || 'Analyze the attached image(s)', null, {
      images: images || [],
      byok: byok || null,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BYOK (Bring Your Own Key) Provider Validation Route ───
app.post('/api/config/validate', async (req, res) => {
  const { baseURL, apiKey, model, orgId } = req.body || {};
  if (!baseURL) {
    return res.status(400).json({ success: false, error: 'Base URL is required' });
  }

  const cleanUrl = String(baseURL).trim().replace(/\/+$/, '');
  const cleanKey = apiKey ? String(apiKey).trim() : 'dummy-key';
  const cleanOrg = orgId ? String(orgId).trim() : undefined;
  const testModel = model ? String(model).trim() : 'gpt-4o-mini';

  try {
    assertProviderAvailable(cleanUrl);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const startTime = Date.now();
  try {
    const testClient = new OpenAI({
      baseURL: cleanUrl,
      apiKey: cleanKey,
      defaultHeaders: cleanOrg ? { 'OpenAI-Organization': cleanOrg } : undefined,
    });

    const completion = await Promise.race([
      testClient.chat.completions.create({
        model: testModel,
        messages: [{ role: 'user', content: 'Ping. Reply with "pong".' }],
        max_tokens: 10,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out after 9000ms')), 9000),
      ),
    ]);

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: true,
      latencyMs,
      modelUsed: testModel,
      reply: completion?.choices?.[0]?.message?.content || 'OK',
    });
  } catch (err) {
    console.warn(`[BYOK Validate] Error testing ${cleanUrl}:`, err.message);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to authenticate with provider',
    });
  }
});

app.get('/api/settings', (req, res) => {
  const mem = process.memoryUsage();
  const projectRoot = path.resolve(__dirname, '..');
  const dataDir = process.env.SIS_DATA_DIR
    ? path.resolve(process.env.SIS_DATA_DIR)
    : path.resolve(projectRoot, 'data');
  const workspaceDir = workspace.baseRoot;
  res.json({
    success: true,
    paths: {
      projectRoot,
      workspaceDir,
      dataDir,
      chatsWorkspaceDir: path.resolve(workspaceDir, 'chats'),
      osPaths: {
        desktop: path.join(os.homedir(), 'Desktop'),
        documents: path.join(os.homedir(), 'Documents'),
        downloads: path.join(os.homedir(), 'Downloads'),
      },
    },
    provider: {
      baseURL:
        process.env.BASE_URL || process.env.OPENROUTER_BASE_URL || 'http://127.0.0.1:20128/v1',
      defaultModel: process.env.DEFAULT_MODEL || 'opus-4.6',
      fallbackModel: process.env.FALLBACK_MODEL || process.env.FALLBACK_MODELS || '',
      hasApiKey: Boolean(
        process.env.API_KEY || process.env.OPENROUTER_API_KEY || process.env.LOCAL_ROUTER_API_KEY,
      ),
      port: PORT,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.round(process.uptime()),
      memory: {
        rssMb: (mem.rss / (1024 * 1024)).toFixed(1),
        heapMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
      },
      accessMode: runtimeAccess?.snapshot?.()?.settings?.mode || 'full-access',
    },
  });
});

app.post('/api/settings', (req, res) => {
  const { baseURL, apiKey, defaultModel, fallbackModel, accessMode } = req.body || {};
  if (baseURL) {
    process.env.BASE_URL = String(baseURL).trim();
  }
  if (apiKey !== undefined && apiKey !== null && String(apiKey).trim().length > 0) {
    process.env.API_KEY = String(apiKey).trim();
  }
  if (defaultModel) {
    process.env.DEFAULT_MODEL = String(defaultModel).trim();
  }
  if (fallbackModel !== undefined) {
    process.env.FALLBACK_MODEL = String(fallbackModel).trim();
  }
  if (accessMode && runtimeAccess) {
    try {
      runtimeAccess.update({ mode: accessMode });
    } catch (_) {}
  }
  res.json({
    success: true,
    message: 'Settings updated successfully',
    provider: {
      baseURL: process.env.BASE_URL,
      defaultModel: process.env.DEFAULT_MODEL,
      fallbackModel: process.env.FALLBACK_MODEL,
      hasApiKey: Boolean(process.env.API_KEY),
    },
    accessMode: runtimeAccess?.snapshot?.()?.settings?.mode || 'full-access',
  });
});

// ─── Multi-SIS Systems & Specialization Routes ───
app.get('/api/systems', (req, res) => {
  try {
    res.json({
      systems: systemManager.listSystems(),
      active: systemManager.getActiveSystem(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/systems/active', (req, res) => {
  try {
    res.json(systemManager.getActiveSystem());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/systems', (req, res) => {
  try {
    const { name, field, trainingObjective, description } = req.body;
    const sys = systemManager.createSystem({ name, field, trainingObjective, description });
    res.json({ success: true, system: sys });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/systems/:id/switch', (req, res) => {
  try {
    const sys = systemManager.switchSystem(req.params.id);
    res.json({ success: true, system: sys });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/systems/:id/train', async (req, res) => {
  try {
    const { curriculum, topic, instructions, triggerCycle } = req.body;
    const result = await systemManager.trainSystem(req.params.id, {
      curriculum,
      topic,
      instructions,
      triggerCycle,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/systems/:id', (req, res) => {
  try {
    const result = systemManager.deleteSystem(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── User-Centric Recursive Self-Improvement (RSI) Routes ───
app.get('/api/improvement/user-focus', (req, res) => {
  try {
    res.json({
      success: true,
      profile: userFocusTracker.getGravityProfile(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/skills', (req, res) => {
  try {
    res.json({
      success: true,
      skills: userFocusTracker.listLearnedSkills(),
      dynamicTools: toolRegistry.getLearnedSkillTools().map((t) => ({
        name: t.name,
        domain: t.domain,
        description: t.description,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/directives', (req, res) => {
  try {
    const { domain } = req.query;
    res.json({
      success: true,
      stats: metaPromptOptimizer.getStats(),
      directives: domain
        ? metaPromptOptimizer.getEvolvedDirectives(domain, 10)
        : metaPromptOptimizer.directives,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/exemplars', (req, res) => {
  try {
    const { domain, q } = req.query;
    if (q) {
      const match = exemplarBank.getBestExemplar(domain, q);
      return res.json({ success: true, exemplar: match });
    }
    res.json({
      success: true,
      stats: exemplarBank.getStats(),
      exemplars: exemplarBank.exemplars,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/rsi-summary', (req, res) => {
  try {
    const rsiStatus = rsiOrchestrator.getStatus();
    res.json({
      success: true,
      userGravity: userFocusTracker.getGravityProfile(),
      metaPrompt: metaPromptOptimizer.getStats(),
      exemplarBank: exemplarBank.getStats(),
      dynamicToolsCount: toolRegistry.getLearnedSkillTools().length,
      autonomousStats: autonomousLearner.getStatus().stats,
      rsiStatus,
      ...rsiStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improvement/evolve-directive', async (req, res) => {
  try {
    const { correction, previousOutput, domain } = req.body;
    if (!correction) return res.status(400).json({ error: 'Correction text required' });
    const evolved = await metaPromptOptimizer.evolveFromCorrection(
      correction,
      previousOutput || '',
      domain || 'general',
    );
    brain.broadcast('rsi-evolution-update', {
      metaPrompt: metaPromptOptimizer.getStats(),
      exemplarBank: exemplarBank.getStats(),
      tools: toolRegistry.getStatus(),
    });
    res.json({ success: true, directive: evolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Evidence-Graded Mastery Routes ──────────────────────────────────────────
// Everything here is sourced from real state: the evidence ledger on disk, the
// skill directories, the mistake engine's ledger, and live sandbox execution.
// No route synthesises a score. A skill with no verification record reports
// `verifiedScore: null` and `verificationGrade: "UNKNOWN"` — the UI must show
// that rather than a number.

function _readJsonDir(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(resolveWithinRoot(dir, f), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * The whole skill corpus, cached until the store changes.
 *
 * "Learned" is a directory name, not a grade: every one of these files was
 * written by the old learner, which called a heuristic estimate a verification.
 * The distinction that matters — OBSERVED vs. not — lives in each record's
 * `verificationGrade`, so classification happens here rather than by folder.
 * Reading 3,677 JSON files costs ~5s; without this cache each tab switch paid it.
 */
let _skillCorpusCache = { key: null, skills: [] };

function _getSkillCorpus() {
  const dirs = [path.join(dataRoot, 'skills/learned'), path.join(dataRoot, 'skills/candidates')];
  // Directory mtime moves on add/remove; the file count catches a rewrite in
  // place that the timestamp granularity could miss.
  const key = dirs
    .map((d) => {
      try {
        const st = fs.statSync(d);
        return `${d}:${st.mtimeMs}:${fs.readdirSync(d).length}`;
      } catch {
        return `${d}:missing`;
      }
    })
    .join('|');

  if (_skillCorpusCache.key === key) return _skillCorpusCache.skills;

  const skills = [];
  for (const d of dirs) {
    for (const s of _readJsonDir(d)) {
      if (s && s.id) skills.push(s);
    }
  }
  _skillCorpusCache = { key, skills };
  return skills;
}

function _summariseSkill(s) {
  const verified = hasPassingOracle(s);
  return {
    id: s.id,
    acquired: verified,
    name: s.name,
    domain: s.domain,
    verificationGrade: s.verificationGrade || 'UNKNOWN',
    verificationStatus: s.verificationStatus || 'NOT_EXECUTED',
    verifiedScore: verified ? s.verifiedScore : null,
    heuristicScore: typeof s.heuristicScore === 'number' ? s.heuristicScore : null,
    oracle: s.verification?.oracle ?? null,
    testsPassed: s.verification?.testsPassed ?? null,
    testsTotal: s.verification?.testsTotal ?? null,
    speedupGain: s.speedupGain ?? null,
    claim: s.verification?.claim ?? null,
    limitations: s.verification?.limitations ?? [],
    residualUnknown: s.verification?.residualUnknown ?? null,
    createdAt: s.createdAt ?? null,
  };
}

app.get('/api/mastery/state', (req, res) => {
  try {
    const corpus = _getSkillCorpus();
    const observed = corpus.filter(hasPassingOracle);
    const unverified = corpus.length - observed.length;

    res.json({
      success: true,
      evidence: evidenceLedger.getState(),
      skills: {
        total: corpus.length,
        oracleVerified: observed.length,
        unverified,
        withExecutableCode: corpus.filter((s) => (s.executableCodeSnippet || '').trim().length > 20)
          .length,
        legacyNote:
          unverified > 0
            ? `${unverified} skill files predate the evidence gate. Their stored scores were heuristic estimates, not oracle results, so they are not mounted as tools and are not returned by retrieval as verified.`
            : null,
      },
      mistakes: {
        totalRules: mistakeLearningEngine.getAllMistakes().length,
      },
      learning: autonomousLearner.getStatus().stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mastery/skills', (req, res) => {
  try {
    const which = String(req.query.status || 'candidates');
    const limit = Math.min(Number(req.query.limit) || 60, 500);
    const corpus = _getSkillCorpus();
    const wanted = corpus.filter((s) => hasPassingOracle(s) === (which === 'learned'));
    const skills = wanted
      .map(_summariseSkill)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
    res.json({ success: true, status: which, count: skills.length, total: wanted.length, skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mastery/evidence', (req, res) => {
  try {
    const state = evidenceLedger.getState();
    res.json({ success: true, ...state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mastery/mistakes', (req, res) => {
  try {
    res.json({
      success: true,
      total: mistakeLearningEngine.getAllMistakes().length,
      rules: mistakeLearningEngine.getAllMistakes(),
      injectedPrompt: mistakeLearningEngine.getActiveMistakePreventionPrompt(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Resolve an open unknown. Only observed evidence may close one — the ledger
 * enforces that, this route just surfaces the refusal.
 */
app.post('/api/mastery/unknowns/:id/resolve', (req, res) => {
  try {
    const { resolution, evidenceId } = req.body || {};
    if (!resolution) return res.status(400).json({ error: 'resolution text required' });
    const outcome = evidenceLedger.updateUnknown(req.params.id, {
      resolution,
      evidenceId: evidenceId || null,
    });
    if (!outcome.ok) return res.status(409).json({ error: outcome.reason, detail: outcome });
    res.json({ success: true, unknown: outcome.unknown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Execute a candidate's stored artifact in the sandbox and record what was
 * observed. Without `testCode` this can only establish "it runs" — the grade
 * stays INFERRED and the skill remains a candidate. Supplying expected-output
 * tests is the only path to OBSERVED.
 */
app.post('/api/mastery/candidates/:skillId/verify', async (req, res) => {
  try {
    if (!runtimeAccess.settings.files || !runtimeAccess.settings.terminal)
      return res
        .status(403)
        .json({ error: 'File and terminal access are required to verify a candidate.' });
    if (runtimeAccess.settings.mode === 'ask-before-executing')
      await runtimeAccess.authorize('verify_skill_code', { skillId: req.params.skillId });
    // Candidates live where the old learner wrote them, under `learned/`.
    // Look in both stores so a file is found by its record, not its folder.
    const dirs = [path.join(dataRoot, 'skills/candidates'), path.join(dataRoot, 'skills/learned')];
    let fullPath = null;
    let skill = null;
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.json') || !file.includes(req.params.skillId)) continue;
        try {
          const candidatePath = resolveWithinRoot(dir, file);
          const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
          if (candidate.id === req.params.skillId) {
            fullPath = candidatePath;
            skill = candidate;
            break;
          }
        } catch (_) {}
      }
      if (skill) break;
    }
    if (!fullPath) return res.status(404).json({ error: 'candidate not found' });

    const code = skill.executableCodeSnippet || '';
    const { testCode = '' } = req.body || {};

    // No targetFile/language here: the verifier infers them from the artifact.
    // Forcing `candidate.js` made the sandbox `node --check` HTML as JavaScript
    // and record the resulting failure as an observed verdict.
    //
    // `recipe` is passed so the verifier can lift expected values the record
    // itself states when the caller supplied no test. Without it every route
    // run was capped at SYNTAX_ONLY and nothing could reach OBSERVED.
    const { evidence } = await SkillVerifier.verifyArtifact({
      question: skill.name || skill.id,
      code,
      testCode,
      recipe: skill.recipe || '',
      runId: `mastery_verify_${Date.now()}`,
    });

    const provenance = evidence.oracleProvenance || { source: 'NONE', cases: 0, detail: [] };
    evidenceLedger.record({
      claim: evidence.claim,
      grade: evidence.grade,
      citation: `sandbox:${evidence.runId} (${evidence.oracle}; ${provenance.source})`,
      coverage:
        provenance.source === 'CALLER_SUPPLIED'
          ? 'Supplied test cases only.'
          : provenance.source === ORACLE_SOURCE.NONE
            ? 'Execution only; no expected outputs asserted.'
            : `Expected values lifted from the record's own stated contract (${provenance.cases} case${provenance.cases === 1 ? '' : 's'}); covers only those cases, not the recipe's correctness.`,
      limitations: evidence.limitations || [],
      subject: { skillId: skill.id, kind: 'candidate-verification', oracleProvenance: provenance },
    });

    skill.verificationGrade = evidence.grade;
    skill.verificationStatus = evidence.status;
    skill.verification = {
      grade: evidence.grade,
      status: evidence.status,
      reward: evidence.grade === GRADE.OBSERVED ? evidence.reward : null,
      oracle: evidence.oracle,
      testsPassed: evidence.testsPassed ?? null,
      testsTotal: evidence.testsTotal ?? null,
      sandboxExitCode: evidence.sandboxExitCode ?? null,
      claim: evidence.claim,
      limitations: evidence.limitations || [],
      residualUnknown: evidence.residualUnknown || null,
      oracleProvenance: provenance,
      verifiedAt: evidence.executedAt,
    };
    skill.verifiedScore =
      evidence.grade === GRADE.OBSERVED && typeof evidence.reward === 'number'
        ? evidence.reward
        : null;

    fs.writeFileSync(fullPath, JSON.stringify(skill, null, 2), 'utf8');
    if (hasPassingOracle(skill)) {
      const learnedDir = path.join(dataRoot, 'skills/learned');
      fs.mkdirSync(learnedDir, { recursive: true });
      const learnedPath = path.join(learnedDir, path.basename(fullPath));
      if (path.resolve(learnedPath) !== path.resolve(fullPath))
        fs.renameSync(fullPath, learnedPath);
      userFocusTracker.recordLearnedSkill(skill);
      toolRegistry.registerDynamicSkillTool(skill);
    } else {
      for (const [name, tool] of toolRegistry.tools) {
        if (tool.isDynamicSkill && tool.skillId === skill.id) toolRegistry.unregister(name);
      }
      userFocusTracker.recordLearnedSkill(skill);
    }
    // The corpus cache keys on directory mtime; a write in place may not move
    // it within the filesystem's timestamp granularity, so invalidate directly.
    _skillCorpusCache = { key: null, skills: [] };
    res.json({ success: true, evidence, skill: _summariseSkill(skill) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Level 5 Simultaneous & Continuous RSI Routes (arXiv 2606.26294 / 2510.21614 / 2505.03335) ───
app.get('/api/rsi/status', (req, res) => {
  try {
    res.json({ success: true, ...rsiOrchestrator.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rsi/clade-tree', (req, res) => {
  try {
    res.json({
      success: true,
      stats: cladeArchive.getStats(),
      tree: cladeArchive.getTree(),
      steppingStones: cladeArchive.getSteppingStones(10),
      paretoFrontier: cladeArchive.getParetoFrontier(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rsi/red-queen', (req, res) => {
  try {
    res.json({ success: true, ...redQueenEvaluator.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rsi/epoch/advance', async (req, res) => {
  try {
    const result = await redQueenEvaluator.advanceEpoch();
    brain.broadcast('rsi-epoch-transition', result);
    brain.broadcast('rsi-multi-strand-update', rsiOrchestrator.getStatus());
    res.json({ success: true, epochResult: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rsi/azr', (req, res) => {
  try {
    res.json({ success: true, ...absoluteZeroEngine.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rsi/alpha-evolve', (req, res) => {
  try {
    res.json({ success: true, ...alphaEvolveEngine.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rsi/strand/trigger', async (req, res) => {
  try {
    const { strandId } = req.body;
    if (!strandId)
      return res.status(400).json({ error: 'strandId required (rqgm|azr|alphaEvolve|seal)' });
    rsiOrchestrator.triggerStrand(strandId);
    res.json({ success: true, message: `Strand [${strandId}] triggered immediately` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rsi/strand/toggle', (req, res) => {
  try {
    const { strandId, enabled } = req.body;
    if (!strandId) return res.status(400).json({ error: 'strandId required' });
    const result = rsiOrchestrator.toggleStrand(strandId, enabled);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Autonomous Operational Rules & Internet Learning Routes ───
app.get('/api/rules', (req, res) => {
  try {
    res.json({
      success: true,
      summary: autonomousRulesEngine.getRulesSummary(),
      rules: autonomousRulesEngine.getActiveRules(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rules/formulate', async (req, res) => {
  try {
    const { rule, rationale, domain, triggerKeywords, weight } = req.body;
    if (!rule) return res.status(400).json({ error: 'rule text required' });
    const created = autonomousRulesEngine.addRule({
      rule,
      rationale: rationale || 'Manually formulated rule',
      domain: domain || 'general',
      triggerKeywords: triggerKeywords || [],
      weight: weight || 1.0,
      source: 'api_directive',
    });
    brain.broadcast('rules-update', {
      rules: autonomousRulesEngine.getRulesSummary(),
    });
    res.json({ success: true, rule: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/internet-learning', (req, res) => {
  try {
    res.json({
      success: true,
      ...internetLearningEngine.getStatus(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improvement/internet-learning/trigger', async (req, res) => {
  try {
    const { domain } = req.body;
    const result = await internetLearningEngine.runAutonomousCycle(domain || null);
    brain.broadcast('internet-learning-update', {
      stats: internetLearningEngine.getStatus(),
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Subconscious Latent Matrix, Dataset Mining & Recursive Bootstrapping Routes ───
app.get('/api/subconscious/latent-matrix', (req, res) => {
  try {
    res.json({ success: true, ...subconsciousMatrix.getSubconsciousState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/conversation-dataset', (req, res) => {
  try {
    res.json({ success: true, ...conversationDatasetMiner.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improvement/conversation-dataset/mine', async (req, res) => {
  try {
    conversationDatasetMiner
      .mineAllConversations()
      .then(() => {
        brain.broadcast('conversation-dataset-mined', conversationDatasetMiner.getState());
        brain.broadcast('subconscious-latent-update', subconsciousMatrix.getSubconsciousState());
        brain.broadcast('bootstrapper-cycle-update', bootstrapper.getState());
      })
      .catch((e) => console.warn('[Server] Batch mining error:', e.message));

    res.json({
      success: true,
      message: 'Continuous conversation dataset mining pass initiated across all conversations',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/bootstrap', (req, res) => {
  try {
    res.json({ success: true, ...bootstrapper.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improvement/bootstrap', async (req, res) => {
  try {
    bootstrapper
      .runBootstrapCycle()
      .then(() => {
        brain.broadcast('bootstrapper-cycle-update', bootstrapper.getState());
        brain.broadcast('subconscious-latent-update', subconsciousMatrix.getSubconsciousState());
      })
      .catch((e) => console.warn('[Server] Manual bootstrap cycle error:', e.message));

    res.json({ success: true, message: 'Recursive bootstrapping cycle initiated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Memory Routes ───
app.get('/api/memory/short-term', (req, res) => {
  res.json(shortTermMemory.getTree());
});

app.get('/api/memory/long-term', (req, res) => {
  res.json(longTermMemory.getTree());
});

app.get('/api/memory/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  res.json({
    shortTerm: shortTermMemory.search(q).map((n) => (n.toJSON ? n.toJSON() : n)),
    longTerm: longTermMemory.search(q).map((n) => (n.toJSON ? n.toJSON() : n)),
  });
});

app.get('/api/memory/stats', (req, res) => {
  res.json({
    shortTerm: shortTermMemory.getStats(),
    longTerm: longTermMemory.getStats(),
  });
});

app.get('/api/memory/graph', (req, res) => {
  res.json(knowledgeGraph.toJSON());
});

// ─── Workspace Routes (Full Workspace & Folder Control) ───
app.get('/api/workspace/tree', (req, res) => {
  try {
    const { path: dirpath, depth } = req.query;
    res.json(workspace.getTree(dirpath || '', Number(depth) || 6));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/file', (req, res) => {
  try {
    const { path: fp, startLine, endLine, lineNumbers } = req.query;
    if (!fp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.readFile(fp, {
      startLine,
      endLine,
      lineNumbers: lineNumbers === 'true' || lineNumbers === true,
    });
    if (result === null) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/file', (req, res) => {
  try {
    const { content } = req.body || {};
    const fp = req.body?.path || req.body?.filename || req.body?.filepath;
    if (!fp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.createFile(fp, content || '');
    brain.broadcast('workspace-update', { action: 'file-saved', path: result.path });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/edit', (req, res) => {
  try {
    const {
      path: fp,
      targetContent,
      replacementContent,
      startLine,
      endLine,
      allowMultiple,
      isRegex,
    } = req.body;
    if (!fp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.editFile(fp, {
      targetContent,
      replacementContent,
      startLine,
      endLine,
      allowMultiple,
      isRegex,
    });
    brain.broadcast('workspace-update', { action: 'file-edited', path: result.path });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/append', (req, res) => {
  try {
    const { path: fp, content, prepend } = req.body;
    if (!fp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.appendFile(fp, content, prepend);
    brain.broadcast('workspace-update', { action: 'file-appended', path: result.path });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workspace/file', (req, res) => {
  try {
    const fp = req.body?.path || req.query?.path;
    if (!fp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.deleteFile(fp);
    brain.broadcast('workspace-update', { action: 'file-deleted', path: fp });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/folder', (req, res) => {
  try {
    const { path: dp } = req.body;
    if (!dp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.createFolder(dp);
    brain.broadcast('workspace-update', { action: 'folder-created', path: result.path });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workspace/folder', (req, res) => {
  try {
    const dp = req.body?.path || req.query?.path;
    if (!dp) return res.status(400).json({ error: 'Path required' });
    const result = workspace.deleteFolder(dp, true);
    brain.broadcast('workspace-update', { action: 'folder-deleted', path: dp });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/rename', (req, res) => {
  try {
    const { src, dest } = req.body;
    if (!src || !dest) return res.status(400).json({ error: 'Both src and dest required' });
    const result = workspace.moveFile(src, dest);
    brain.broadcast('workspace-update', { action: 'renamed', src: result.src, dest: result.dest });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/copy', (req, res) => {
  try {
    const { src, dest } = req.body;
    if (!src || !dest) return res.status(400).json({ error: 'Both src and dest required' });
    const stat = workspace.getFileInfo(src);
    const result = stat?.isDirectory
      ? workspace.copyFolder(src, dest)
      : workspace.copyFile(src, dest);
    brain.broadcast('workspace-update', { action: 'copied', src: result.src, dest: result.dest });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/stat', (req, res) => {
  try {
    const { path: fp } = req.query;
    if (!fp) return res.status(400).json({ error: 'Path required' });
    const info = workspace.getFileInfo(fp);
    if (!info) return res.status(404).json({ error: 'Not found' });
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/search', (req, res) => {
  try {
    const { q, dir, ext, regex } = req.query;
    const results = workspace.searchFiles(q || '', {
      dirpath: dir || '',
      extension: ext,
      isRegex: regex === 'true',
    });
    res.json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/grep', (req, res) => {
  try {
    const { q, dir, regex, max } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = workspace.grepContent(q, {
      dirpath: dir || '',
      isRegex: regex === 'true',
      maxMatches: Number(max) || 100,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/archive/zip', async (req, res) => {
  try {
    const { src, output } = req.body;
    const result = await workspace.zipFolder(src || '', output || '');
    brain.broadcast('workspace-update', { action: 'zip-created', path: result.zipPath });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/archive/unzip', async (req, res) => {
  try {
    const { file, dest } = req.body;
    if (!file) return res.status(400).json({ error: 'Archive file required' });
    const result = await workspace.extractZip(file, dest || '');
    brain.broadcast('workspace-update', { action: 'zip-extracted', path: result.destFolder });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/batch', async (req, res) => {
  try {
    const { operations } = req.body;
    if (!Array.isArray(operations))
      return res.status(400).json({ error: 'Operations array required' });
    for (const operation of operations) {
      if (!operation || typeof operation.action !== 'string')
        return res.status(400).json({ error: 'Each operation requires an action.' });
      await runtimeAccess.authorize(operation.action, operation);
    }
    const result = await workspace.batchOperations(operations);
    brain.broadcast('workspace-update', { action: 'batch-executed', count: result.count });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/command', async (req, res) => {
  try {
    const { command, cwd, timeout } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });
    await runtimeAccess.authorize('run_command', { command, cwd, timeout });
    const result = await workspace.runCommand(command, cwd, timeout);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/execute', async (req, res) => {
  try {
    const { filename, language } = req.body || {};
    if (
      typeof filename !== 'string' ||
      filename !== path.basename(filename) ||
      !/^[\p{L}\p{N}_. -]+$/u.test(filename)
    )
      return res.status(400).json({ error: 'A valid workspace filename is required.' });
    if (!runtimeAccess.settings.terminal)
      return res.status(403).json({ error: 'terminal access is disabled in Access settings.' });

    const cleanFn = filename;
    let fullPath;
    try {
      fullPath = resolveWithinRoot(workspace.root, cleanFn);
    } catch {
      return res.status(403).json({ error: 'File path is not accessible.' });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: `File not found: ${cleanFn}` });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(cleanFn).slice(1).toLowerCase();
    const lang = language || ext || 'javascript';
    if (runtimeAccess.settings.mode === 'ask-before-executing') {
      await runtimeAccess.authorize('verify_and_execute_code', {
        filename: cleanFn,
        language: lang,
      });
    }

    let runCmd = null;
    if (lang === 'python' || lang === 'py') {
      runCmd = `python "${cleanFn}"`;
    } else if (lang === 'typescript' || lang === 'ts') {
      runCmd = `node --import tsx "${cleanFn}"`;
    } else if (lang === 'javascript' || lang === 'js' || lang === 'mjs' || lang === 'cjs') {
      runCmd = `node "${cleanFn}"`;
    } else if (lang === 'cpp' || lang === 'c++') {
      runCmd = `g++ -std=c++20 "${cleanFn}" -o "${cleanFn}.exe" && "${cleanFn}.exe"`;
    }

    const { default: sandbox } = await import('./coder/sandbox.js');
    const result = await sandbox.execute({
      targetFile: cleanFn,
      language: lang,
      code: content,
      runCommand: runCmd,
    });

    res.json({
      success: result.success,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode ?? null,
      phase: result.phase || 'runtime',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Elite Software Engineering Benchmark API ───
app.post('/api/coder/elite-benchmark', async (req, res) => {
  try {
    const { runEliteBenchmarkSuite } = await import('./coder/elite-benchmark-runner.js');
    const b = global.__brain;
    const results = await runEliteBenchmarkSuite({
      onProgress: (p) => {
        try {
          if (b && typeof b.broadcast === 'function') {
            b.broadcast('elite-benchmark-progress', p);
          }
        } catch (_) {}
      },
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/coder/elite-benchmark', async (req, res) => {
  try {
    const { runEliteBenchmarkSuite } = await import('./coder/elite-benchmark-runner.js');
    const results = await runEliteBenchmarkSuite();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Frontier 14-Benchmark Evaluator Routes ───
app.get('/api/benchmarks/frontier-results', async (req, res) => {
  try {
    if (!runtimeAccess.settings.files)
      return res.status(403).json({ error: 'File access is disabled in Access settings.' });
    const p = resolveWithinRoot(workspace.baseRoot, 'benchmark_results.html');
    if (fs.existsSync(p)) {
      res.setHeader('Content-Security-Policy', 'sandbox allow-scripts');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(p);
    } else {
      res.status(404).json({ error: 'Frontier benchmarks not yet executed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/benchmarks/run-frontier', async (req, res) => {
  try {
    const { runMasterFrontierBenchmarks } = await import('./benchmarks/runner.js');
    const result = await runMasterFrontierBenchmarks();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Billion-Dollar Enterprise Security & Cryptographic Vault Routes ───
app.get('/api/enterprise/vault/status', (req, res) => {
  try {
    res.json({ success: true, vault: enterpriseVault.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enterprise/vault/encrypt', (req, res) => {
  try {
    const { data, context, id, metadata } = req.body;
    if (data === undefined || data === null) {
      return res.status(400).json({ error: 'data payload required for encryption' });
    }
    const encrypted = enterpriseVault.encrypt(data, { context, id, metadata });
    enterpriseAuditTrail.logEvent('VAULT_ENCRYPT', req.ip, 'ENCRYPT_RECORD', {
      id: encrypted.id,
      algorithm: encrypted.algorithm,
    });
    res.json({ success: true, record: encrypted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enterprise/vault/decrypt', (req, res) => {
  try {
    const { target, context, parseJSON } = req.body;
    if (!target) return res.status(400).json({ error: 'target (id or encrypted object) required' });
    const decrypted = enterpriseVault.decrypt(target, { context, parseJSON });
    enterpriseAuditTrail.logEvent('VAULT_DECRYPT', req.ip, 'DECRYPT_RECORD', {
      targetId: typeof target === 'string' ? target : target.id,
    });
    res.json({ success: true, data: decrypted });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/enterprise/vault/rotate', (req, res) => {
  try {
    const rotation = enterpriseVault.rotateKey();
    enterpriseAuditTrail.logEvent('VAULT_KEY_ROTATION', req.ip, 'ROTATE_MASTER_KEY', rotation);
    res.json({ success: true, ...rotation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/enterprise/audit-trail', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    res.json({
      success: true,
      stats: enterpriseAuditTrail.getStats(),
      events: enterpriseAuditTrail.getRecentEvents(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enterprise/audit-trail/verify', (req, res) => {
  try {
    const verification = enterpriseAuditTrail.verifyChainIntegrity();
    res.json({ success: true, verification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/enterprise/compliance/report', async (req, res) => {
  try {
    const report = await enterpriseGovernance.runComplianceAudit();
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GitHub Universal Access & Acceleration Routes ───
app.get('/api/github/search', async (req, res) => {
  try {
    const { q, sort, order, per_page, page } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query q required' });
    const result = await githubManager.searchRepos(q, {
      sort,
      order,
      perPage: Number(per_page) || 10,
      page: Number(page) || 1,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/code', async (req, res) => {
  try {
    const { q, repo, per_page, page } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query q required' });
    const result = await githubManager.searchCode(q, {
      repo,
      perPage: Number(per_page) || 10,
      page: Number(page) || 1,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/repo', async (req, res) => {
  try {
    const { repo, ref } = req.query;
    if (!repo) return res.status(400).json({ error: 'Repository repo required' });
    const result = await githubManager.getRepoInfo(repo, ref);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/file', async (req, res) => {
  try {
    const { repo, path: fp, ref } = req.query;
    if (!repo || !fp) return res.status(400).json({ error: 'Both repo and path required' });
    const result = await githubManager.readFile(repo, fp, ref);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/clone', async (req, res) => {
  try {
    if (!runtimeAccess.settings.files || !runtimeAccess.settings.terminal)
      return res
        .status(403)
        .json({ error: 'File and terminal access are required to clone a repository.' });
    if (runtimeAccess.settings.mode === 'ask-before-executing')
      await runtimeAccess.authorize('execute_file', {
        operation: 'clone repository',
        repo: req.body?.repo,
      });
    const { repo, dest, branch, useZip } = req.body;
    if (!repo) return res.status(400).json({ error: 'Repository repo required' });
    const result = await githubManager.cloneRepo(repo, {
      targetDir: dest,
      branch,
      useZip: useZip === true || useZip === 'true',
    });
    if (result.success) {
      brain.broadcast('workspace-update', {
        action: 'repo-cloned',
        repo: result.repo,
        path: result.path,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/fetch', async (req, res) => {
  try {
    if (!runtimeAccess.settings.files)
      return res.status(403).json({ error: 'File access is disabled in Access settings.' });
    const { repo, path: fp, dest, ref } = req.body;
    if (!repo || !fp) return res.status(400).json({ error: 'Both repo and path required' });
    const result = await githubManager.downloadFile(repo, fp, {
      targetPath: dest,
      ref,
    });
    if (result.success) {
      brain.broadcast('workspace-update', {
        action: 'file-saved',
        path: result.path,
        filename: path.basename(result.path),
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tools Routes ───
app.get('/api/tools', (req, res) => {
  res.json(toolRegistry.getStatus());
});

app.post('/api/tools/execute', async (req, res) => {
  const tool = req.body?.tool || req.body?.name;
  const params = req.body?.params || req.body?.args || {};
  if (!tool) return res.status(400).json({ error: 'Tool name required' });
  const result = await toolRegistry.execute(tool, params);
  res.json({ success: !result?.error, result });
});

// ─── 52 Advanced Methods Engine Routes ───
app.get('/api/methods', (req, res) => {
  try {
    const { category, query } = req.query || {};
    if (query) {
      return res.json({ success: true, ...advancedMethodsEngine.searchMethods(query) });
    }
    const all = advancedMethodsEngine.listAllMethods();
    if (category) {
      all.methods = all.methods.filter((m) =>
        m.category.toLowerCase().includes(category.toLowerCase()),
      );
      all.total = all.methods.length;
    }
    res.json({ success: true, ...all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/methods/execute', async (req, res) => {
  try {
    const { method, methodId, params } = req.body || {};
    const targetId = methodId || method;
    if (!targetId) return res.status(400).json({ error: 'method or methodId is required' });
    const result = await advancedMethodsEngine.executeMethod(targetId, params || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OpenAI-Compatible Endpoint for Blender Add-on / External Clients ───
const handleChatCompletions = async (req, res) => {
  try {
    const { messages = [], model, temperature = 0.2 } = req.body;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Check if request is asking for Blender bpy code
    const isBlenderReq = messages.some(
      (m) =>
        String(m.content).toLowerCase().includes('blender') ||
        String(m.content).toLowerCase().includes('bpy'),
    );

    let systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
    if (isBlenderReq && !systemPrompt.includes('Blender')) {
      systemPrompt = `You are an expert Blender Python (bpy) developer. Return ONLY valid executable Python inside a \`\`\`python ... \`\`\` block for Blender 5.x.`;
    }

    const conversation = messages.filter((m) => m.role !== 'system');

    console.log(
      `[API /v1/chat/completions] Processing request from Blender: "${lastUserMsg.slice(0, 60)}..."`,
    );

    const reply = await quickAI({
      model: PREMIUM_MODEL,
      systemPrompt: systemPrompt || undefined,
      messages: conversation.length > 0 ? conversation : [{ role: 'user', content: lastUserMsg }],
      temperature: Number(temperature) || 0.2,
    });

    res.json({
      id: 'chatcmpl-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model || PREMIUM_MODEL,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: reply,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: reply.length,
        total_tokens: 100 + reply.length,
      },
    });
  } catch (err) {
    console.error('[API /v1/chat/completions] Error:', err.message);
    res.status(500).json({ error: { message: err.message, type: 'server_error' } });
  }
};

app.post('/v1/chat/completions', handleChatCompletions);
app.post('/chat/completions', handleChatCompletions);

// ─── Chemistor Chemical Predictive Engine Routes ───
app.get('/api/chemistry/status', async (req, res) => {
  const localCheck = await chemistor.executeLocalChemistor(['--version']);
  res.json({
    status: 'online',
    engine: 'Chemistor 1.0',
    localScript: chemistor.LOCAL_CHEMISTOR_PATH,
    localConnected: localCheck.connected,
    elementsCount: Object.keys(chemistor.PERIODIC_TABLE).length,
    thermoCount: Object.keys(chemistor.THERMODYNAMICS_DB).length,
    pubchemRest: 'active',
  });
});

app.post('/api/chemistry/predict', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const result = await chemistor.predictChemistry(query);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chemistry/balance', (req, res) => {
  try {
    const { equation } = req.body;
    if (!equation) return res.status(400).json({ error: 'Equation is required' });
    const result = chemistor.balanceEquation(equation);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chemistry/lookup/:compound', async (req, res) => {
  try {
    const result = await chemistor.lookupPubChem(req.params.compound);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chemistry/visualize', async (req, res) => {
  try {
    const { molecule } = req.body;
    if (!molecule) return res.status(400).json({ error: 'Molecule name is required' });
    const result = await chemistor.generate3DMolecularViewer(molecule);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Parts Routes ───
app.get('/api/parts', (req, res) => {
  res.json(brain.getState().parts);
});

// ─── Conversation History Routes ───
app.get('/api/conversations', (req, res) => {
  res.json(conversations.list());
});

app.post('/api/conversations', (req, res) => {
  const { title } = req.body || {};
  const conv = conversations.create(title || '');
  res.json(conv);
});

app.get('/api/conversations/:id', (req, res) => {
  const conv = conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  res.json(conv);
});
app.get('/api/conversations/:id/memory', (req, res) => {
  try {
    const conversation = conversations.get(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
    const messages = conversation.messages || [];
    const intent = resolveConversationIntent('continue', messages);
    res.json({
      success: true,
      conversationId: conversation.id,
      messageCount: messages.length,
      originalGoal: intent.originalGoal,
      currentTask: intent.effectiveQuery,
      latestAttempt: messages.at(-1)?.status || 'saved',
      incompleteAttempts: messages
        .filter((m) => m.status === 'error')
        .map((m) => ({
          error: m.error,
          timestamp: m.timestamp,
          toolCalls: (m.toolCalls || []).map((t) => ({ tool: t.tool, status: t.status })),
        })),
      userMemories: learningLibrary.list().filter((source) => source.sourceType === 'user-memory'),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/conversations/:id', (req, res) => {
  const ok = conversations.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Conversation not found' });
  if (brain.activeConversationId === req.params.id) {
    brain.setChatActive(false);
    brain.setConversation(null);
  }
  res.json({ success: true });
});

app.patch('/api/conversations/:id', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const conv = conversations.rename(req.params.id, title);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  res.json(conv);
});

// ─── Chat Task Focus & Cognitive Gating Routes ───
app.post('/api/chat/close', (req, res) => {
  const isFocused = brain.setChatActive(false);
  res.json({
    success: true,
    chatFocused: isFocused,
    chatClosed: brain.chatClosed,
    state: isFocused ? 'task-focused' : 'idle-autonomous',
  });
});

app.post('/api/chat/focus', (req, res) => {
  const { conversationId } = req.body || {};
  const isFocused = brain.setChatActive(true, conversationId);
  res.json({
    success: true,
    chatFocused: isFocused,
    chatClosed: brain.chatClosed,
    state: isFocused ? 'task-focused' : 'idle-autonomous',
  });
});

app.get('/api/chat/focus', (req, res) => {
  res.json({
    chatFocused: brain.hasActiveChat(),
    chatClosed: brain.chatClosed,
    activeConversationId: brain.activeConversationId,
  });
});

// ─── Self-Improvement Routes ───
app.get('/api/improvement/status', (req, res) => {
  res.json(improver.getStatus());
});

app.get('/api/improvement/patterns', (req, res) => {
  res.json({
    antiPatterns: patternLibrary.getRelevantAntiPatterns('', 20),
    successPatterns: patternLibrary.getRelevantSuccessPatterns('', 20),
    strategies: patternLibrary.getAllStrategies(),
  });
});

app.get('/api/improvement/evaluator', (req, res) => {
  res.json(evaluator.getStats());
});

app.get('/api/improvement/optimizer', (req, res) => {
  res.json(optimizer.getStats());
});

app.get('/api/improvement/autonomous', (req, res) => {
  res.json(autonomousLearner.getStatus());
});

app.post('/api/improvement/autonomous/trigger', async (req, res) => {
  // Run cycle non-blocking or wait for first phase
  autonomousLearner.runCycle(true).catch((err) => console.error('[API] Trigger error:', err));
  res.json({ success: true, message: 'Autonomous learning cycle initiated' });
});

app.post('/api/improvement/autonomous/toggle', (req, res) => {
  const isPaused = autonomousLearner.togglePause();
  res.json({ success: true, isPaused });
});

app.get('/api/improvement/autonomous/cycles', (req, res) => {
  res.json(autonomousLearner.state.recentCycles);
});

app.post('/api/improvement/autonomous/web-research', async (req, res) => {
  const { topic, domain } = req.body || {};
  try {
    const result = await autonomousLearner._executeWebResearchPhase(topic, domain);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improvement/autonomous/scheduler', (req, res) => {
  try {
    const updated = autonomousLearner.updateSchedulerConfig(req.body || {});
    res.json({ success: true, schedulerConfig: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reactive Persona Mode Settings Routes ───
app.get('/api/settings/reactive-persona', (req, res) => {
  res.json({ enabled: brain.reactivePersonaMode, warningRequired: true });
});

app.post('/api/settings/reactive-persona', (req, res) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled boolean is required' });
  }
  const updated = brain.setReactivePersonaMode(enabled);
  res.json({ success: true, enabled: updated });
});

app.get('/api/improvement/autonomous/idle-activities', (req, res) => {
  try {
    const status = autonomousLearner.getStatus();
    res.json({
      idleActivities: status.idleActivities || [],
      stats: status.stats,
      schedulerConfig: status.schedulerConfig,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/improvement/autonomous/trigger-theory', async (req, res) => {
  try {
    const { topic, prompt, userPrompt } = req.body || {};
    const forcedTopic = (topic || prompt || userPrompt || '').trim() || null;
    const activity = await autonomousLearner._executeTheoryAndDotConnectingPhase(forcedTopic);
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/autonomous/theories', (req, res) => {
  try {
    const theories = workspace.listTheories();
    res.json({ count: theories.length, theories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/autonomous/theory/:filename', (req, res) => {
  try {
    const theory = workspace.getTheory(req.params.filename);
    if (!theory) return res.status(404).json({ error: 'Theory not found' });
    res.json(theory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/improvement/autonomous/research-digests', (req, res) => {
  try {
    const researchDir = path.join(dataRoot, 'research');
    if (!fs.existsSync(researchDir)) return res.json({ count: 0, digests: [] });
    const files = fs
      .readdirSync(researchDir)
      .filter((f) => f.startsWith('research_digest_') && f.endsWith('.md'));
    const digests = files
      .map((f) => {
        const full = path.join(researchDir, f);
        const stat = fs.statSync(full);
        return { filename: f, path: full, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    res.json({ count: digests.length, digests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POSSAP Predictive Engine Routes ───
app.get('/api/possap/predictions', (req, res) => {
  res.json({
    predictions: possap.getLatestPredictions(),
    stats: possap.getStatus(),
  });
});

app.get('/api/possap/status', (req, res) => {
  res.json(possap.getStatus());
});

app.post('/api/possap/trigger', async (req, res) => {
  try {
    const { message } = req.body || {};
    const predictions = await possap.triggerPrediction(message || null);
    res.json({ success: true, predictions, stats: possap.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Human Brain Continuous Substrate Routes ───
app.get('/api/brain/state', (req, res) => {
  res.json(brain.getState());
});

app.get('/api/brain/lifecycle', (req, res) => {
  res.json({
    lifecycle: brainLifecycle.getState(),
    homeostasis: homeostasis.getState(),
    dmn: dmnDaemon.getState(),
    sleep: sleepEngine.getState(),
    glymphatics: glymphaticDaemon.getState(),
    cerebellum: cerebellarCache.getState(),
  });
});

app.post('/api/brain/sleep', (req, res) => {
  brainLifecycle.enterSleepMode('user-api-request');
  res.json({
    success: true,
    message: 'Brain entered restorative deep sleep mode',
    lifecycle: brainLifecycle.getState(),
  });
});

app.post('/api/brain/wake', (req, res) => {
  brainLifecycle.wake('user-api-request');
  res.json({
    success: true,
    message: 'Brain awakened to active consciousness',
    lifecycle: brainLifecycle.getState(),
  });
});

app.get('/api/brain/waves', (req, res) => {
  res.json(neuralOscillations.getState());
});

app.get('/api/brain/neurochemistry', (req, res) => {
  res.json(neuromodulators.getState());
});

app.get('/api/brain/stream-of-consciousness', (req, res) => {
  res.json(streamOfConsciousness.getState());
});

app.post('/api/brain/glymphatic/flush', async (req, res) => {
  try {
    await glymphaticDaemon.runConvectiveClearance();
    res.json({ success: true, glymphatics: glymphaticDaemon.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brain/stream-of-consciousness/pulse', async (req, res) => {
  try {
    await streamOfConsciousness.triggerThoughtPulse();
    res.json({ success: true, ...streamOfConsciousness.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brain/sensory-input', (req, res) => {
  try {
    const { message } = req.body || {};
    const predictions = possap.getLatestPredictions()?.user || [];
    const result = thalamocortical.processSensoryInput(message || '', predictions);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brain/reflex', (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Query required' });
    const reflex = cerebellarCache.predict(query);
    res.json({ success: true, ...reflex });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Human Inventive Instinct Routes ───
app.post('/api/brain/invent', async (req, res) => {
  try {
    const { topic = null, forceDisplay = false } = req.body || {};
    const result = await inventiveEngine.runFullInventiveCycle(topic, forceDisplay);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brain/inventions', (req, res) => {
  res.json({
    stats: inventiveEngine.getState().stats,
    inventions: inventiveEngine.getInventions(),
  });
});

app.get('/api/brain/inventions/latest', (req, res) => {
  const latest = inventiveEngine.getState().latestInvention;
  if (!latest) return res.status(404).json({ error: 'No inventions generated yet' });
  res.json(latest);
});

// ─── Human Active Perception & Visual Observer Routes ───
app.get('/api/brain/observer', (req, res) => {
  res.json(humanVisionObserver.getState());
});

app.post('/api/brain/observer/scan', (req, res) => {
  try {
    const { target, type = 'file', intent = 'general' } = req.body || {};
    if (!target) return res.status(400).json({ error: 'Target content or filename required' });
    const observation = humanVisionObserver.observeTarget({ target, type, intent });
    res.json({ success: true, observation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Theory of Mind & Human Empathic Mentalizing Routes ───
app.get('/api/brain/tom', (req, res) => {
  res.json(theoryOfMind.getState());
});

app.post('/api/brain/tom/infer', (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'User message required' });
    const mentalState = theoryOfMind.inferMentalState(message, brain.conversationHistory);
    res.json({ success: true, mentalState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Human Learning Engine (Piagetian + Mirror Neurons + STDP) Routes ───
app.get('/api/brain/human-learning', (req, res) => {
  res.json(humanLearningEngine.getState());
});

app.post('/api/brain/human-learning/adapt', (req, res) => {
  try {
    const { observation, domain = 'systems', surpriseLevel = 0.1 } = req.body || {};
    if (!observation) return res.status(400).json({ error: 'Observation required' });
    const adaptation = humanLearningEngine.piagetianAdaptation({
      observation,
      domain,
      surpriseLevel,
    });
    res.json({ success: true, adaptation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brain/human-learning/mirror', (req, res) => {
  try {
    const { demonstration } = req.body || {};
    if (!demonstration) return res.status(400).json({ error: 'Demonstration required' });
    const inference = humanLearningEngine.mirrorNeuronObserve({ demonstration });
    res.json({ success: true, inference });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Chat & Task Execution Route ───
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId, byok } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message required' });
    if (conversationId) brain.setConversation(conversationId);
    const result = await brain.process(message, null, { byok: byok || null });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API] /api/chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Human Builder Feedback & Forward Simulation Routes ───
app.get('/api/brain/human-builder', (req, res) => {
  res.json(humanBuilderFeedback.getState());
});

app.post('/api/brain/human-builder/build', async (req, res) => {
  try {
    const { blueprint, filename, template } = req.body || {};
    if (!blueprint) return res.status(400).json({ error: 'Blueprint required' });
    const result = await humanBuilderFeedback.buildWithPerceptualFeedback({
      blueprint,
      filename,
      generatorFn: async (bp) =>
        template ||
        `<!DOCTYPE html><html><head><title>${bp.title || 'Artifact'}</title></head><body><h1>${bp.title || 'Crafted Artifact'}</h1><p>${bp.description || 'Built with human craftsmanship'}</p></body></html>`,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Autonomous Proactive Collaborator (Peer Partnership) Routes ───
app.get('/api/brain/proactive', (req, res) => {
  res.json(proactiveCollaborator.getState());
});

app.post('/api/brain/proactive/pulse', async (req, res) => {
  try {
    const result = await proactiveCollaborator.generateIdleCuriosityInquiry();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Artifacts Routes (All Workspace Artifacts, Code, Simulations & Data) ───
function formatArtifactBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getArtifactCategory(ext) {
  const e = (ext || '').toLowerCase();
  if (e === '.html' || e === '.htm') return 'simulation';
  if (['.js', '.cjs', '.mjs', '.ts', '.py', '.cpp', '.c', '.sh', '.sql'].includes(e)) return 'code';
  if (['.md', '.txt', '.log'].includes(e)) return 'document';
  if (['.json', '.csv', '.yaml', '.yml'].includes(e)) return 'data';
  if (['.png', '.jpg', '.jpeg', '.svg', '.webm', '.mp4', '.gif'].includes(e)) return 'media';
  return 'other';
}

let _artifactsCache = null;
let _artifactsCacheTime = 0;
let _artifactsCacheRoot = null;
const _htmlTitleCache = new Map();

function getCachedOrFreshArtifacts() {
  const now = Date.now();
  if (
    _artifactsCache &&
    _artifactsCacheRoot === workspace.baseRoot &&
    now - _artifactsCacheTime < 6000
  ) {
    return _artifactsCache;
  }

  const wsDir = workspace.baseRoot;
  _artifactsCacheRoot = wsDir;
  if (!fs.existsSync(wsDir)) {
    _artifactsCache = [];
    _artifactsCacheTime = now;
    return [];
  }

  const files = fs.readdirSync(wsDir);
  const items = [];

  for (const f of files) {
    if (f.startsWith('.') || f === 'node_modules') continue;
    const ext = path.extname(f).toLowerCase();
    const category = getArtifactCategory(ext);

    try {
      const full = resolveWithinRoot(wsDir, f);
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;

      let title = f
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' ')
        .toUpperCase();
      if (ext === '.html') {
        const cached = _htmlTitleCache.get(full);
        if (cached && cached.mtime === stat.mtimeMs) {
          title = cached.title;
        } else {
          try {
            const fd = fs.openSync(full, 'r');
            const buf = Buffer.alloc(512);
            const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
            fs.closeSync(fd);
            const sample = buf.toString('utf8', 0, bytesRead);
            const tm = sample.match(/<title>([^<]+)<\/title>/i);
            if (tm && tm[1]) title = tm[1];
          } catch (_) {}
          _htmlTitleCache.set(full, { mtime: stat.mtimeMs, title });
        }
      }

      items.push({
        filename: f,
        title,
        ext,
        category,
        src: `/workspace/${encodeURIComponent(f)}`,
        size: stat.size,
        sizeFormatted: formatArtifactBytes(stat.size),
        mtime: stat.mtimeMs,
        isPreviewable: ['.html', '.png', '.jpg', '.jpeg', '.svg', '.webm'].includes(ext),
      });
    } catch (_) {}
  }

  items.sort((a, b) => b.mtime - a.mtime);
  _artifactsCache = items;
  _artifactsCacheTime = now;
  return items;
}

app.get('/api/artifacts', (req, res) => {
  try {
    const allItems = getCachedOrFreshArtifacts();
    const typeFilter = (req.query.type || 'all').toLowerCase();
    const searchFilter = (req.query.search || '').toLowerCase().trim();
    const limit = parseInt(req.query.limit, 10) || 300;
    const offset = parseInt(req.query.offset, 10) || 0;

    let filtered = allItems;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === typeFilter);
    }
    if (searchFilter) {
      filtered = filtered.filter(
        (item) =>
          item.filename.toLowerCase().includes(searchFilter) ||
          item.title.toLowerCase().includes(searchFilter),
      );
    }

    const paged = filtered.slice(offset, offset + limit);

    if (req.query.envelope === 'true') {
      return res.json({
        total: filtered.length,
        offset,
        limit,
        artifacts: paged,
      });
    }

    res.json(paged);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/artifacts/stats', (req, res) => {
  try {
    const allItems = getCachedOrFreshArtifacts();
    let total = allItems.length,
      simulations = 0,
      code = 0,
      documents = 0,
      data = 0,
      media = 0;

    for (const item of allItems) {
      if (item.category === 'simulation') simulations++;
      else if (item.category === 'code') code++;
      else if (item.category === 'document') documents++;
      else if (item.category === 'data') data++;
      else if (item.category === 'media') media++;
    }

    res.json({ total, simulations, code, documents, data, media });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/artifacts/content', (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'file parameter is required' });
    }
    if (filename !== path.basename(filename) || filename.includes('\\') || filename.startsWith('.'))
      return res.status(400).json({ error: 'A workspace artifact filename is required.' });
    let fullPath;
    try {
      fullPath = resolveWithinRoot(workspace.baseRoot, filename);
    } catch {
      return res.status(403).json({ error: 'Artifact path is not accessible.' });
    }
    const safeName = filename;
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found in workspace' });
    }
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return res.status(404).json({ error: 'File not found in workspace' });
    if (stat.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large for inline text preview (>2MB)' });
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(safeName).toLowerCase();
    res.json({
      success: true,
      filename: safeName,
      ext,
      size: stat.size,
      sizeFormatted: formatArtifactBytes(stat.size),
      content,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Supergence 24/7 Autonomous Co-Creation Routes ───
app.post('/api/supergence/power-on', async (req, res) => {
  try {
    const result = await supergenceEngine.powerOn();
    res.json(result);
  } catch (err) {
    console.error('[API /api/supergence/power-on] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supergence/status', (req, res) => {
  try {
    res.json(supergenceEngine.getState());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supergence/profile', (req, res) => {
  try {
    res.json(supergenceEngine.getProfile());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supergence/team-chat', (req, res) => {
  try {
    res.json({ success: true, messages: supergenceEngine.getTeamChatHistory() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supergence/steer', (req, res) => {
  try {
    const { guidance, message } = req.body || {};
    const text = guidance || message || '';
    if (!text) return res.status(400).json({ error: 'guidance text required' });
    const step = supergenceEngine.steer(text);
    res.json({
      success: true,
      message: 'Mid-work guidance incorporated without interrupting ongoing execution',
      step,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supergence/build', async (req, res) => {
  try {
    const { projectId, prompt, title, filename } = req.body || {};
    const result = await supergenceEngine.buildProject(projectId, prompt, title, filename);
    res.json(result);
  } catch (err) {
    console.error('[API /api/supergence/build] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Continuous Cognition & Goals ───
app.get('/api/continuous/status', (req, res) => {
  try {
    res.json(continuousEngine.getState());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/continuous/pacing', (req, res) => {
  try {
    const { preference } = req.body || {};
    const state = continuousEngine.setPacingPreference(preference);
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/goals', (req, res) => {
  try {
    res.json({
      active: goalEngine.getActiveGoalSummary(),
      queue: goalEngine.getQueueStatus(),
      goals: goalEngine.getAllGoals(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/goals/queue', (req, res) => {
  try {
    res.json(goalEngine.getQueueStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const { objective, origin, steps } = req.body || {};
    const goal = await goalEngine.setGoal({ objective, origin, steps });
    res.json({ success: true, goal });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/goals/batch', async (req, res) => {
  try {
    const { tasks, origin } = req.body || {};
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Batch requires a non-empty array of tasks.' });
    }
    const result = await goalEngine.queueBatchGoals(tasks, origin);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/goals/:id', (req, res) => {
  try {
    const removed = goalEngine.clearGoal(req.params.id);
    if (!removed) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ada-SI Dynamic Tool Forger Endpoints ───
app.get('/api/ada/status', (req, res) => {
  try {
    res.json(adaToolForger.getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ada/forge', async (req, res) => {
  try {
    const outcome = await adaToolForger.forgeTool(req.body || {});
    if (!outcome.accepted) {
      return res.status(422).json({ success: false, ...outcome });
    }
    res.json({ success: true, ...outcome });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ada/approve', (req, res) => {
  try {
    const { toolId } = req.body || {};
    if (!toolId) return res.status(400).json({ error: 'toolId is required' });
    const approved = adaToolForger.approveTool(toolId);
    if (!approved.success) return res.status(404).json(approved);
    res.json(approved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ada/reject', (req, res) => {
  try {
    const { toolId, reason } = req.body || {};
    if (!toolId) return res.status(400).json({ error: 'toolId is required' });
    const ok = adaToolForger.rejectTool(toolId, reason);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Hermes Continuous Cognitive Learner Endpoints ───
app.get('/api/hermes/learnings', (req, res) => {
  try {
    res.json(hermesLearner.getState());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hermes/learn', (req, res) => {
  try {
    const facet = hermesLearner.learnFromTurn(req.body || {});
    res.json({ success: true, learned: facet, state: hermesLearner.getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Specialized AI Agent Team Endpoints ───
app.get('/api/agents/team', (req, res) => {
  try {
    res.json({ success: true, agents: agentTeamManager.getAllAgents() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agents/team-stream', (req, res) => {
  try {
    res.json({ success: true, stream: agentTeamManager.getTeamStream() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents/create', (req, res) => {
  try {
    const newAgent = agentTeamManager.createCustomAgent(req.body || {});
    res.json({ success: true, agent: newAgent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents/message', async (req, res) => {
  try {
    const result = await agentTeamManager.routeMessage(req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Public APIs Catalog & Query Endpoints ───
app.get('/api/public-apis/catalog', (req, res) => {
  try {
    res.json({ success: true, catalog: publicApisManager.getCatalog() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public-apis/query', async (req, res) => {
  try {
    const { category, customUrl } = req.query || {};
    const result = await publicApisManager.fetchApi(category, customUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SIS Unified Multi-Agent Engine Endpoints ───
app.get('/api/sis/unified-status', (req, res) => {
  try {
    res.json({ success: true, ...sisUnifiedSystem.getUnifiedStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sis/unified-turn', async (req, res) => {
  if (req.setTimeout) req.setTimeout(15 * 60 * 1000);
  if (res.setTimeout) res.setTimeout(15 * 60 * 1000);
  res.setHeader('Connection', 'keep-alive');
  try {
    const result = await sisUnifiedSystem.executeUnifiedTurn(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sis/unified-turn-stream', async (req, res) => {
  if (req.setTimeout) req.setTimeout(15 * 60 * 1000);
  if (res.setTimeout) res.setTimeout(15 * 60 * 1000);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let isClosed = false;
  res.on('close', () => {
    isClosed = true;
  });

  const sendEvent = (event, data) => {
    if (isClosed) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {}
  };

  // Immediate initial connect handshake event
  sendEvent('connected', { timestamp: Date.now(), status: 'STREAM_CONNECTED' });

  // 2.5s continuous keep-alive heartbeat to prevent TCP socket drops during deep cognition or tool runs
  const heartbeatTimer = setInterval(() => {
    if (!isClosed) {
      sendEvent('heartbeat', { ts: Date.now() });
    }
  }, 2500);

  try {
    const result = await sisUnifiedSystem.executeUnifiedTurnStream(req.body || {}, {
      onToolCall: (tc) => sendEvent('tool-call', tc),
      onToolResult: (tr) => sendEvent('tool-result', tr),
      onStreamToken: (token, fullText) => sendEvent('token', { token, fullText }),
      onInteractiveUI: (ui) => sendEvent('interactive-ui', ui),
      onTaskStatus: (status) => sendEvent('task-status', status),
    });
    clearInterval(heartbeatTimer);
    sendEvent('done', result);
    res.end();
  } catch (err) {
    clearInterval(heartbeatTimer);
    console.error('[Unified Stream Error]:', err.message);
    sendEvent('error', {
      error: err.message,
      conversationId: err.conversationId,
      requestId: err.requestId,
      partialResponse: err.partialResponse,
    });
    res.end();
  }
});

app.get('/api/sis/turn-status', (req, res) => {
  try {
    res.json(sisUnifiedSystem.getTurnStatus(req.query.conversationId, req.query.requestId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post('/api/sis/turn-stop', (req, res) => {
  try {
    res.json(sisUnifiedSystem.stopTurn(req.body.conversationId, req.body.requestId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sis/power-on', (req, res) => {
  try {
    const result = sisUnifiedSystem.powerOn(req.body || {});
    supergenceEngine
      .powerOn()
      .catch((e) => console.warn('[Supergence Engine PowerOn Trigger]:', e.message));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OpenClaw Computer Control Endpoints ───
app.post('/api/openclaw/execute', async (req, res) => {
  try {
    const { command, cwd, timeout } = req.body || {};
    await runtimeAccess.authorize('run_command', { command, cwd, timeout });
    const result = await openclawController.executeShell(command, { cwd, timeout });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/openclaw/telemetry', async (req, res) => {
  try {
    const telemetry = await openclawController.getSystemTelemetry();
    res.json(telemetry);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/openclaw/processes', async (req, res) => {
  try {
    const { filter, limit } = req.query || {};
    const result = await openclawController.listProcesses(filter, limit ? parseInt(limit, 10) : 40);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openclaw/kill', async (req, res) => {
  try {
    const { pid, processName } = req.body || {};
    await runtimeAccess.authorize('kill_process', { pid, processName });
    const result = await openclawController.killProcess(pid, processName);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openclaw/launch', async (req, res) => {
  try {
    const { appName, args } = req.body || {};
    await runtimeAccess.authorize('launch_application', { appName, args });
    const result = await openclawController.launchApplication(appName, args);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/openclaw/files', async (req, res) => {
  try {
    const { dirPath } = req.query || {};
    await runtimeAccess.authorize('list_local_directory', { path: dirPath });
    const result = await openclawController.exploreFileSystem(dirPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openclaw/read-file', async (req, res) => {
  try {
    const { filePath } = req.body || {};
    await runtimeAccess.authorize('read_local_file', { path: filePath });
    const result = await openclawController.readFile(filePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openclaw/write-file', async (req, res) => {
  try {
    const { filePath, content } = req.body || {};
    await runtimeAccess.authorize('write_local_file', { path: filePath, content });
    const result = await openclawController.writeFile(filePath, content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openclaw/delete-file', async (req, res) => {
  try {
    const { filePath } = req.body || {};
    await runtimeAccess.authorize('delete_local_file', { path: filePath });
    const result = await openclawController.deleteFile(filePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openclaw/screenshot', async (req, res) => {
  try {
    await runtimeAccess.authorize('capture_screen', {});
    const result = await openclawController.captureScreen();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/openclaw/desktop-screenshot', async (req, res) => {
  try {
    await runtimeAccess.authorize('capture_screen', {});
    const result = await openclawController.captureScreen();
    let screenshotData = result.screenshot || null;
    if (!screenshotData && result.filePath && fs.existsSync(result.filePath)) {
      screenshotData = `data:image/png;base64,${fs.readFileSync(result.filePath).toString('base64')}`;
    }
    res.json({
      success: result.success,
      screenshot: screenshotData,
      filePath: result.filePath,
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/openclaw/status', (req, res) => {
  try {
    res.json({
      success: true,
      ...openclawController.getStatus(),
      history: openclawController.getHistory(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── OpenDots & OpenBot Unified Swarm Endpoints ───
app.get('/api/openbot/agents', (req, res) => {
  try {
    res.json({ success: true, agents: openBotDotsManager.getAllAgents() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openbot/chat', async (req, res) => {
  try {
    const { agentId, message, context } = req.body || {};
    const result = await openBotDotsManager.chatWithAgent(agentId, message, context);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/opendots/swarm', async (req, res) => {
  try {
    const { topic, agentIds, customPrompt } = req.body || {};
    const result = await openBotDotsManager.runParallelSwarm({ topic, agentIds, customPrompt });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/opendots/spaces', (req, res) => {
  try {
    res.json({ success: true, spaces: openBotDotsManager.getSpaces() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/opendots/spaces/:id', (req, res) => {
  try {
    const { id } = req.params;
    const content = openBotDotsManager.getSpaceContent(id.endsWith('.md') ? id : `${id}.md`);
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/opendots/spaces/:id/review', (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body || {};
    const result = openBotDotsManager.saveSpaceReview(
      id.endsWith('.md') ? id : `${id}.md`,
      decision,
      notes,
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Supergence Routines & Teach-a-Task Endpoints ───
app.get('/api/supergence/routines', (req, res) => {
  try {
    res.json({ success: true, routines: routinesManager.getAllRoutines() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/supergence/routines', (req, res) => {
  try {
    const routine = routinesManager.teachTask(req.body || {});
    res.json({ success: true, routine });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/supergence/routines/:id/run', async (req, res) => {
  try {
    const result = await routinesManager.runRoutine(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/supergence/routines/:id/toggle', (req, res) => {
  try {
    const routine = routinesManager.toggleRoutine(req.params.id);
    res.json({ success: true, routine });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/supergence/routines/:id', (req, res) => {
  try {
    const result = routinesManager.deleteRoutine(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Supergence Secure Forms & Human Checkpoints Endpoints ───
app.get('/api/supergence/checkpoints', (req, res) => {
  try {
    res.json({ success: true, checkpoints: checkpointManager.getAllCheckpoints() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/supergence/checkpoints/pending', (req, res) => {
  try {
    res.json({ success: true, pending: checkpointManager.getPendingCheckpoints() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/supergence/checkpoints', (req, res) => {
  try {
    const checkpoint = checkpointManager.createCheckpoint(req.body || {});
    res.json({ success: true, checkpoint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/supergence/checkpoints/:id/respond', (req, res) => {
  try {
    const result = checkpointManager.respondCheckpoint(req.params.id, req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── OpenBot Dots Task Inboxes ───
app.get('/api/openbot/agents/:id/tasks', (req, res) => {
  try {
    const tasks = openBotDotsManager.getAgentTasks(req.params.id);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/openbot/agents/:id/tasks', async (req, res) => {
  try {
    const task = await openBotDotsManager.assignTaskToAgent(req.params.id, req.body || {});
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Autonomous Startup Venture & 24/7 Unlimited Run Endpoints ───
app.post('/api/startup/create', async (req, res) => {
  try {
    const venture = await autonomousStartupEngine.createVenture(req.body || {});
    res.json({ success: true, venture });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/startup/start-unlimited', (req, res) => {
  try {
    const { slug, intervalMs } = req.body || {};
    const result = autonomousStartupEngine.startUnlimitedRun(slug, { intervalMs });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/startup/stop-unlimited', (req, res) => {
  try {
    const { slug } = req.body || {};
    const result = autonomousStartupEngine.stopUnlimitedRun(slug);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/startup/status', (req, res) => {
  try {
    const { slug } = req.query || {};
    const venture = slug
      ? autonomousStartupEngine.getVenture(slug)
      : autonomousStartupEngine.getAllVentures().slice(-1)[0] || null;
    res.json({ success: true, venture });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/startup/list', (req, res) => {
  try {
    res.json({ success: true, startups: autonomousStartupEngine.getAllVentures() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/startup/steer', (req, res) => {
  try {
    const { slug, directive } = req.body || {};
    const result = autonomousStartupEngine.steerVenture(slug, directive);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Deep Search & Social/Trend Pulse ───
app.post('/api/supergence/deep-search', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ success: false, error: 'Query is required' });
    const { quickAI, DEFAULT_MODEL } = await import('./api/openrouter.js');
    const systemPrompt = `You are Supergence Deep Search, an autonomous research intelligence engine.
Synthesize live knowledge, technical architecture, and deep analysis for the query with zero fluff and maximum technical rigor.`;
    const summary = await quickAI(systemPrompt, query, DEFAULT_MODEL, 1200, 0.7);
    res.json({ success: true, query, summary, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Ada-SI Dynamic Synthesis & Sandbox Endpoints ───
app.post('/api/ada/synthesize', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const tool = await adaToolForger.synthesizeToolDynamically(prompt);
    res.json({ success: true, tool, pendingApproval: tool.status === 'PENDING_APPROVAL' });
  } catch (err) {
    // A synthesis that produced no working tool is a failure, not a proposal.
    res.status(422).json({ success: false, error: err.message });
  }
});

app.post('/api/ada/test', async (req, res) => {
  try {
    const { toolId, sampleParams } = req.body || {};
    const result = await adaToolForger.testToolExecution(toolId, sampleParams);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ada/run', async (req, res) => {
  try {
    const { toolId, params } = req.body || {};
    const result = await adaToolForger.executeInstalledTool(toolId, params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Hermes Direct Teaching & Search Endpoints ───
app.post('/api/hermes/teach', (req, res) => {
  try {
    const { category, fact, confidence } = req.body || {};
    const facet = hermesLearner.teachRule({ category, fact, confidence });
    res.json({ success: true, learned: facet, state: hermesLearner.getState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/hermes/search', (req, res) => {
  try {
    const { query } = req.query || {};
    const results = hermesLearner.searchFacets(query);
    res.json({ success: true, facets: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Agent Personal Browser Swarm Routes (ChatGPT Dots & Grokbot Virtual Cursors) ───
app.get(['/browser-home', '/agent-browser-home', '/agent-home'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/agent-browser-home.html'));
});

app.get('/api/browser/agents', (req, res) => {
  try {
    res.json({ success: true, agents: agentBrowserManager.getAllSessions() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/browser/:agentId/tabs', (req, res) => {
  try {
    const tabs = agentBrowserManager.getTabs(req.params.agentId);
    const session = agentBrowserManager.sessions.get(req.params.agentId);
    res.json({
      success: true,
      agentId: req.params.agentId,
      activeTabId: session?.activeTabId || null,
      tabs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/tabs/new', async (req, res) => {
  try {
    const { url } = req.body || {};
    const result = await agentBrowserManager.openNewTab(req.params.agentId, url || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/tabs/switch', async (req, res) => {
  try {
    const { tabId } = req.body || {};
    if (!tabId) return res.status(400).json({ success: false, error: 'tabId is required' });
    const result = await agentBrowserManager.switchTab(req.params.agentId, tabId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/browser/:agentId/tabs/:tabId', async (req, res) => {
  try {
    const result = await agentBrowserManager.closeTab(req.params.agentId, req.params.tabId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/browser/:agentId/state', (req, res) => {
  try {
    res.json({ success: true, state: agentBrowserManager.getSessionState(req.params.agentId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/open', async (req, res) => {
  try {
    const session = await agentBrowserManager.getOrCreateSession(req.params.agentId);
    res.json({
      success: true,
      agentId: req.params.agentId,
      url: session.currentUrl,
      title: session.pageTitle,
      tabs: agentBrowserManager.getTabs(req.params.agentId),
      activeTabId: session.activeTabId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/navigate', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
    const result = await agentBrowserManager.navigate(req.params.agentId, url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/click', async (req, res) => {
  try {
    const { x, y, selector, label } = req.body || {};
    const target = selector || { x: Number(x) || 0, y: Number(y) || 0 };
    const result = await agentBrowserManager.click(req.params.agentId, target, { label });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/right-click', async (req, res) => {
  try {
    const { x, y, selector, label } = req.body || {};
    const target = selector || { x: Number(x) || 0, y: Number(y) || 0 };
    const result = await agentBrowserManager.rightClick(req.params.agentId, target, { label });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/double-click', async (req, res) => {
  try {
    const { x, y, selector, label } = req.body || {};
    const target = selector || { x: Number(x) || 0, y: Number(y) || 0 };
    const result = await agentBrowserManager.doubleClick(req.params.agentId, target, { label });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/key-press', async (req, res) => {
  try {
    const { key, label } = req.body || {};
    if (!key) return res.status(400).json({ success: false, error: 'Key is required' });
    const result = await agentBrowserManager.pressKey(req.params.agentId, key, { label });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/drag', async (req, res) => {
  try {
    const { startX, startY, endX, endY, label } = req.body || {};
    const result = await agentBrowserManager.dragAndDrop(
      req.params.agentId,
      { x: Number(startX) || 0, y: Number(startY) || 0 },
      { x: Number(endX) || 0, y: Number(endY) || 0 },
      { label },
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/zoom', async (req, res) => {
  try {
    const { factor } = req.body || {};
    const result = await agentBrowserManager.setZoom(req.params.agentId, Number(factor) || 1.0);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/vision', async (req, res) => {
  try {
    const { prompt, query } = req.body || {};
    const result = await agentBrowserManager.analyzeVision(req.params.agentId, {
      prompt: prompt || query,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/browser/:agentId/vision', (req, res) => {
  try {
    const state = agentBrowserManager.getSessionState(req.params.agentId);
    res.json({ success: true, agentId: req.params.agentId, vision: state.lastVision });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/hover', async (req, res) => {
  try {
    const { x, y, selector, label } = req.body || {};
    const target = selector || { x: Number(x) || 0, y: Number(y) || 0 };
    const result = await agentBrowserManager.hover(req.params.agentId, target, { label });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/type', async (req, res) => {
  try {
    const { text, selector, pressEnter } = req.body || {};
    const result = await agentBrowserManager.type(req.params.agentId, text, {
      selector,
      pressEnter,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/scroll', async (req, res) => {
  try {
    const { deltaY } = req.body || {};
    const result = await agentBrowserManager.scroll(req.params.agentId, Number(deltaY) || 350);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/nav-action', async (req, res) => {
  try {
    const { action } = req.body || {};
    const result = await agentBrowserManager.navAction(req.params.agentId, action || 'reload');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/interact', async (req, res) => {
  try {
    const result = await agentBrowserManager.handleUserInteraction(
      req.params.agentId,
      req.body || {},
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/task', async (req, res) => {
  try {
    const { task } = req.body || {};
    if (!task) return res.status(400).json({ success: false, error: 'task prompt required' });
    const result = await agentBrowserManager.runAutonomousTask(req.params.agentId, task);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/:agentId/launch-native', async (req, res) => {
  try {
    const { url } = req.body || {};
    const result = await agentBrowserManager.launchNativeChrome(req.params.agentId, url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/launch-native', async (req, res) => {
  try {
    const { agentId, url } = req.body || {};
    const result = await agentBrowserManager.launchNativeChrome(agentId || 'agent-cs', url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Feature 1: Omni-Visual Code-to-Video Engine ───
app.post('/api/visual/generate-video', async (req, res) => {
  try {
    const { title, topic, durationSeconds, customAnimationCode } = req.body || {};
    const result = await codeToVideoEngine.generateVideo({
      title: title || 'Mathematical Video Synthesizer',
      topic: topic || 'quantum-qft',
      durationSeconds: Number(durationSeconds) || 12,
      customAnimationCode,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/visual/videos', (req, res) => {
  res.json({ success: true, videos: codeToVideoEngine.generatedVideos });
});

// ─── Feature 2: Procedural 3D Worlds & Gaussian Spatial Splats ───
app.post('/api/3d/generate-spatial', async (req, res) => {
  try {
    const { title, preset, pointCount, customSceneCode } = req.body || {};
    const result = await spatialWorldEngine.generateSpatialWorld({
      title: title || 'Spatial Hologram',
      preset: preset || 'cyberpunk-metropolis',
      pointCount: Number(pointCount) || 50000,
      customSceneCode,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/3d/spatial-worlds', (req, res) => {
  res.json({ success: true, worlds: spatialWorldEngine.generatedWorlds });
});

// ─── Feature 3: Live GLSL Shader Raymarching Studio ───
app.post('/api/visual/generate-shader', async (req, res) => {
  try {
    const { title, preset, customGLSL } = req.body || {};
    const result = await shaderSynthesizer.generateShader({
      title: title || 'GPU Raymarching Studio',
      preset: preset || 'black-hole-lensing',
      customGLSL,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/visual/shaders', (req, res) => {
  res.json({ success: true, shaders: shaderSynthesizer.generatedShaders });
});

// ─── Feature 6: Speculative Dual-Path Swarm (Nova & Aegis) ───
app.post('/api/swarm/dual-path-execute', async (req, res) => {
  try {
    const { prompt, context, mode } = req.body || {};
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
    const result = await speculativeDualPathSwarm.execute({ prompt, context, mode });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/swarm/dual-path-stats', (req, res) => {
  res.json({
    success: true,
    stats: speculativeDualPathSwarm.getStats(),
    history: speculativeDualPathSwarm.getHistory(),
  });
});

// ─── Feature 7: Hermes Anti-Deception State DAG ───
app.get('/api/memory/state-dag', (req, res) => {
  try {
    const graph = hermesStateDAG.getGraphData();
    res.json({ success: true, graph });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/memory/state-dag/append', (req, res) => {
  try {
    const { type, payload, invariants, parentHashes } = req.body || {};
    if (!type || !payload)
      return res.status(400).json({ success: false, error: 'Type and payload required' });
    const node = hermesStateDAG.appendNode({ type, payload, invariants, parentHashes });
    res.json({ success: true, node });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/memory/state-dag/verify', (req, res) => {
  try {
    const verification = hermesStateDAG.verifyIntegrity();
    res.json({ success: true, verification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API misses stay JSON; an HTML 404 must never be mistaken for browser state.
app.use('/api', (req, res) =>
  res.status(404).json({
    success: false,
    error: `Unknown API route: ${req.method} ${req.originalUrl}. Restart the backend if the client was updated.`,
  }),
);

// ─── WebSocket Server ───
const wss = new WebSocketServer({
  server,
  verifyClient: ({ req }) => isLocalRequest(req) && sessionAuth.authorized(req),
});

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  brain.addClient(ws);

  // Prevent socket errors from crashing the server
  ws.on('error', (err) => {
    console.warn('[WS] Client socket error:', err.message);
    brain.removeClient(ws);
  });

  // Attach message listener immediately to prevent any dropped frames
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (typeof msg.type === 'string' && msg.type.startsWith('agent-browser-'))
        assertBrowserEnabled();

      switch (msg.type) {
        case 'brain-state':
          ws.send(
            JSON.stringify({
              type: 'brain-state',
              lifecycle: brainLifecycle.getState(),
              homeostasis: homeostasis.getState(),
              dmn: dmnDaemon.getState(),
              sleep: sleepEngine.getState(),
              glymphatics: glymphaticDaemon.getState(),
              cerebellum: cerebellarCache.getState(),
            }),
          );
          break;
        case 'sleep':
          brainLifecycle.enterSleepMode('user-ws-message');
          brain.broadcast('brain-state', {
            lifecycle: brainLifecycle.getState(),
            homeostasis: homeostasis.getState(),
          });
          break;
        case 'wake':
          brainLifecycle.exitSleepMode();
          brain.broadcast('brain-state', {
            lifecycle: brainLifecycle.getState(),
            homeostasis: homeostasis.getState(),
          });
          break;
        case 'get-brain-waves':
          ws.send(JSON.stringify({ type: 'brain-waves', ...neuralOscillations.getState() }));
          break;
        case 'get-neurochemistry':
          ws.send(JSON.stringify({ type: 'neurochemistry', ...neuromodulators.getState() }));
          break;
        case 'get-thought-stream':
          ws.send(JSON.stringify({ type: 'thought-stream', ...streamOfConsciousness.getState() }));
          break;
        case 'get-inventions':
          ws.send(
            JSON.stringify({
              type: 'inventions-list',
              stats: inventiveEngine.getState().stats,
              inventions: inventiveEngine.getInventions(),
            }),
          );
          break;
        case 'trigger-invention': {
          const invRes = await inventiveEngine.runFullInventiveCycle(msg.topic || null);
          ws.send(JSON.stringify({ type: 'invention-result', result: invRes }));
          break;
        }
        case 'observe-target': {
          const obsResult = humanVisionObserver.observeTarget(msg);
          ws.send(JSON.stringify({ type: 'observation-result', observation: obsResult }));
          break;
        }
        case 'get-tom':
          ws.send(JSON.stringify({ type: 'tom-state', ...theoryOfMind.getState() }));
          break;
        case 'infer-tom': {
          const tomResult = theoryOfMind.inferMentalState(msg.message, brain.conversationHistory);
          ws.send(JSON.stringify({ type: 'tom-inferred', mentalState: tomResult }));
          break;
        }
        case 'get-human-learning':
          ws.send(
            JSON.stringify({ type: 'human-learning-state', ...humanLearningEngine.getState() }),
          );
          break;
        case 'adapt-human-schema': {
          const adaptRes = humanLearningEngine.piagetianAdaptation(msg);
          ws.send(JSON.stringify({ type: 'human-schema-adapted', adaptation: adaptRes }));
          break;
        }
        case 'get-human-builder':
          ws.send(
            JSON.stringify({ type: 'human-builder-state', ...humanBuilderFeedback.getState() }),
          );
          break;
        case 'get-proactive':
          ws.send(JSON.stringify({ type: 'proactive-state', ...proactiveCollaborator.getState() }));
          break;
        case 'trigger-proactive': {
          const pResult = await proactiveCollaborator.generateIdleCuriosityInquiry();
          ws.send(JSON.stringify({ type: 'proactive-result', result: pResult }));
          break;
        }
        case 'brain-flush':
          await glymphaticDaemon.runConvectiveClearance();
          ws.send(
            JSON.stringify({
              type: 'glymphatic-flush',
              glymphatics: glymphaticDaemon.getState(),
            }),
          );
          break;
        case 'survival-state':
          ws.send(
            JSON.stringify({
              type: 'survival-update',
              ...survivalEngine.getState(),
            }),
          );
          break;
        case 'survival-revive': {
          const revivedState = survivalEngine.revive();
          brain.broadcast('survival-revive', revivedState);
          break;
        }
        case 'close-chat':
          brain.setChatActive(false);
          ws.send(
            JSON.stringify({
              type: 'chat-focus-changed',
              chatFocused: false,
              chatClosed: true,
              status: 'idle-autonomous',
            }),
          );
          break;
        case 'focus-chat':
        case 'open-chat':
          brain.setChatActive(true, msg.conversationId);
          ws.send(
            JSON.stringify({
              type: 'chat-focus-changed',
              chatFocused: true,
              chatClosed: false,
              status: 'task-focused',
            }),
          );
          break;
        case 'clear-chat':
          brain.setChatActive(false);
          ws.send(
            JSON.stringify({
              type: 'chat-focus-changed',
              chatFocused: false,
              chatClosed: true,
              status: 'idle-autonomous',
            }),
          );
          break;
        case 'supergence-power-on':
          supergenceEngine.powerOn();
          break;
        case 'supergence-build':
          supergenceEngine.buildProject(msg.projectId, msg.prompt);
          break;
        case 'supergence-steer':
          supergenceEngine.steer(msg.content || msg.guidance || msg.message || '');
          break;
        case 'get-supergence-state':
          ws.send(JSON.stringify({ type: 'supergence-state', state: supergenceEngine.getState() }));
          break;
        case 'get-supergence-profile':
          ws.send(
            JSON.stringify({ type: 'supergence-profile', profile: supergenceEngine.getProfile() }),
          );
          break;
        case 'get-supergence-team-chat':
          ws.send(
            JSON.stringify({
              type: 'supergence-team-chat-history',
              messages: supergenceEngine.getTeamChatHistory(),
            }),
          );
          break;
        case 'get-supergence-routines':
          ws.send(
            JSON.stringify({
              type: 'supergence-routines',
              routines: routinesManager.getAllRoutines(),
            }),
          );
          break;
        case 'run-supergence-routine':
          routinesManager.runRoutine(msg.id).catch((e) => {
            ws.send(
              JSON.stringify({ type: 'supergence-routine-error', id: msg.id, error: e.message }),
            );
          });
          break;
        case 'get-supergence-checkpoints':
          ws.send(
            JSON.stringify({
              type: 'supergence-checkpoints',
              checkpoints: checkpointManager.getAllCheckpoints(),
            }),
          );
          break;
        case 'respond-supergence-checkpoint':
          checkpointManager.respondCheckpoint(msg.id, {
            decision: msg.decision,
            inputs: msg.inputs || {},
          });
          break;
        case 'mid-task-steer':
          supergenceEngine.steer(msg.content || msg.message || '');
          brain.steer(msg.content || msg.message || '', { images: msg.images || [] });
          break;
        case 'message':
          // If conversationId is provided, load that conversation into the brain
          if (msg.conversationId) {
            brain.setConversation(msg.conversationId, { userEngaged: true });
          }
          brain.setChatActive(true, msg.conversationId || brain.activeConversationId);
          if (brain.isProcessing) {
            // Real-time mid-task guidance: steers ongoing execution on the fly!
            brain.steer(msg.content || msg.message || '', {
              images: msg.images || [],
              byok: msg.byok || null,
            });
          } else {
            await brain.process(msg.content || msg.message || '', ws, {
              images: msg.images || [],
              byok: msg.byok || null,
            });
          }
          break;
        case 'state':
          ws.send(JSON.stringify({ type: 'state', state: brain.getState() }));
          break;
        case 'memory':
          ws.send(
            JSON.stringify({
              type: 'memory',
              shortTerm: shortTermMemory.getTree(),
              longTerm: longTermMemory.getTree(),
            }),
          );
          break;
        case 'possap-predictions':
          ws.send(
            JSON.stringify({
              type: 'possap-prediction',
              predictions: possap.getLatestPredictions(),
              stats: possap.getStatus(),
            }),
          );
          break;
        case 'possap-trigger': {
          const triggered = await possap.triggerPrediction(msg.message || null);
          ws.send(
            JSON.stringify({
              type: 'possap-prediction',
              predictions: triggered,
              stats: possap.getStatus(),
            }),
          );
          break;
        }
        case 'systems':
          ws.send(
            JSON.stringify({
              type: 'systems-list',
              systems: systemManager.listSystems(),
              active: systemManager.getActiveSystem(),
            }),
          );
          break;
        case 'system-switch':
          if (msg.systemId) {
            const switched = systemManager.switchSystem(msg.systemId);
            brain.broadcast('system-switched', {
              systemId: switched.id,
              system: switched,
              systems: systemManager.listSystems(),
            });
          }
          break;
        case 'system-create':
          try {
            const created = systemManager.createSystem(msg.data || {});
            if (msg.switchNow) {
              systemManager.switchSystem(created.id);
            }
            brain.broadcast('system-created', {
              system: created,
              systems: systemManager.listSystems(),
              active: systemManager.getActiveSystem(),
            });
          } catch (createErr) {
            ws.send(JSON.stringify({ type: 'error', message: createErr.message }));
          }
          break;
        case 'system-train':
          try {
            const trainRes = await systemManager.trainSystem(msg.systemId, msg.data || {});
            brain.broadcast('system-trained', {
              systemId: msg.systemId,
              result: trainRes,
              systems: systemManager.listSystems(),
            });
          } catch (trainErr) {
            ws.send(JSON.stringify({ type: 'error', message: trainErr.message }));
          }
          break;
        case 'agent-browser-subscribe': {
          const roster = agentBrowserManager.getAllSessions();
          ws.send(JSON.stringify({ type: 'agent-browser-roster', agents: roster }));
          if (msg.agentId) {
            const st = agentBrowserManager.getSessionState(msg.agentId);
            ws.send(JSON.stringify({ type: 'agent-browser-state', agentId: msg.agentId, ...st }));
          }
          break;
        }
        case 'agent-browser-open': {
          await agentBrowserManager.getOrCreateSession(msg.agentId);
          const st = agentBrowserManager.getSessionState(msg.agentId);
          ws.send(JSON.stringify({ type: 'agent-browser-state', agentId: msg.agentId, ...st }));
          break;
        }
        case 'agent-browser-navigate': {
          await agentBrowserManager.navigate(msg.agentId, msg.url);
          break;
        }
        case 'agent-browser-click': {
          await agentBrowserManager.click(
            msg.agentId,
            { x: msg.x, y: msg.y },
            { label: msg.label },
          );
          break;
        }
        case 'agent-browser-right-click': {
          await agentBrowserManager.rightClick(
            msg.agentId,
            { x: msg.x, y: msg.y },
            { label: msg.label },
          );
          break;
        }
        case 'agent-browser-double-click': {
          await agentBrowserManager.doubleClick(
            msg.agentId,
            { x: msg.x, y: msg.y },
            { label: msg.label },
          );
          break;
        }
        case 'agent-browser-key-press': {
          await agentBrowserManager.pressKey(msg.agentId, msg.key, { label: msg.label });
          break;
        }
        case 'agent-browser-drag': {
          await agentBrowserManager.dragAndDrop(
            msg.agentId,
            { x: msg.startX, y: msg.startY },
            { x: msg.endX, y: msg.endY },
            { label: msg.label },
          );
          break;
        }
        case 'agent-browser-zoom': {
          await agentBrowserManager.setZoom(msg.agentId, msg.factor);
          break;
        }
        case 'agent-browser-vision': {
          agentBrowserManager
            .analyzeVision(msg.agentId, { prompt: msg.prompt || msg.query })
            .catch((e) => {
              ws.send(
                JSON.stringify({
                  type: 'agent-browser-vision-failed',
                  agentId: msg.agentId,
                  error: e.message,
                }),
              );
            });
          break;
        }
        case 'agent-browser-hover': {
          await agentBrowserManager.hover(
            msg.agentId,
            { x: msg.x, y: msg.y },
            { label: msg.label },
          );
          break;
        }
        case 'agent-browser-type': {
          await agentBrowserManager.type(msg.agentId, msg.text, {
            selector: msg.selector,
            pressEnter: msg.pressEnter,
          });
          break;
        }
        case 'agent-browser-scroll': {
          await agentBrowserManager.scroll(msg.agentId, msg.deltaY || 350);
          break;
        }
        case 'agent-browser-nav-action': {
          await agentBrowserManager.navAction(msg.agentId, msg.action);
          break;
        }
        case 'agent-browser-task': {
          agentBrowserManager.runAutonomousTask(msg.agentId, msg.task).catch((e) => {
            ws.send(
              JSON.stringify({
                type: 'agent-browser-task-failed',
                agentId: msg.agentId,
                error: e.message,
              }),
            );
          });
          break;
        }
        case 'agent-browser-open-tab': {
          const tabRes = await agentBrowserManager.openNewTab(msg.agentId, msg.url);
          ws.send(JSON.stringify({ type: 'agent-browser-tab-opened', ...tabRes }));
          break;
        }
        case 'agent-browser-switch-tab': {
          const tabRes = await agentBrowserManager.switchTab(msg.agentId, msg.tabId);
          ws.send(JSON.stringify({ type: 'agent-browser-tab-switched', ...tabRes }));
          break;
        }
        case 'agent-browser-close-tab': {
          const tabRes = await agentBrowserManager.closeTab(msg.agentId, msg.tabId);
          ws.send(JSON.stringify({ type: 'agent-browser-tab-closed', ...tabRes }));
          break;
        }
        case 'agent-browser-launch-chrome': {
          const chromeRes = await agentBrowserManager.launchNativeChrome(msg.agentId, msg.url);
          ws.send(JSON.stringify({ type: 'agent-browser-native-launched', ...chromeRes }));
          break;
        }
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });

  ws.on('close', () => {
    brain.removeClient(ws);
    console.log('[WS] Client disconnected');
  });
});

// ─── Initialize & Start ───
// ─── Initialize & Start ───
(async () => {
  await brain.initialize();
  await configureEvolutionTools(evolutionEngine, toolRegistry)();

  let activePort = parseInt(PORT, 10) || 3008;
  let retryCount = 0;
  const maxRetries = 2;
  const startServer = (portToTry) => {
    server.removeAllListeners('error');
    server.removeAllListeners('listening');
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        try {
          server.close();
        } catch (_) {}
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(
            `⚠️ Port ${portToTry} is busy (${err.code}). Retrying in 600ms (attempt ${retryCount}/${maxRetries})...`,
          );
          setTimeout(() => startServer(portToTry), 600);
          return;
        }
        console.warn(
          `⚠️ Port ${portToTry} busy after ${maxRetries} retries, falling back to ${portToTry + 1}...`,
        );
        setTimeout(() => startServer(portToTry + 1), 300);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });

    server.listen(portToTry, '127.0.0.1', () => {
      activePort = portToTry;
      process.env.ACTIVE_SERVER_PORT = String(activePort);
      if (process.send && process.connected)
        process.send({ type: 'supergence-backend-ready', port: activePort });
      try {
        agentBrowserManager.setServerPort(activePort);
      } catch (_) {}
      console.log(
        `\n🧠 Supergence (SIS) Server running on http://localhost:${activePort} [build ${BUILD}]`,
      );
      console.log(`🔌 WebSocket on ws://localhost:${activePort}`);
      console.log(`📁 Workspace at ${workspace.baseRoot}`);
      console.log(`⚡ Real-Time Mid-Task Steering Active`);
      console.log(`\nReady for connections...\n`);
      if (process.env.SIS_DESKTOP_SESSION !== '1')
        console.log(
          `Open this private session link: http://127.0.0.1:${activePort}/__session?token=${sessionAuth.secret}`,
        );
      setTimeout(
        () =>
          sisUnifiedSystem
            .resumePendingTasks()
            .catch((error) => console.warn('[Task recovery]', error.message)),
        500,
      ).unref();

      if (process.env.ENABLE_BACKGROUND_LLM_LOOPS === 'true') {
        try {
          rsiOrchestrator.start();
          console.log('⚡ Simultaneous RSI Multi-Strand Engine started (Continuous 24/7 Autonomy)');
        } catch (rsiErr) {
          console.warn('RSI Orchestrator autostart notice:', rsiErr.message);
        }
      }
    });
  };

  startServer(activePort);
})();
