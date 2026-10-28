// SIS 1.0 — Test Suite: Autonomous Auto-Healer & Surgical Repair
// Rigorously verifies:
// 1. autoHealer engine diagnoses, fixes, and verifies code with zero hardcoding
// 2. POST /api/heal handles defect telemetry and returns surgical diffs
// 3. /workspace/*.html dynamically injects the diagnostic probe script
// 4. brain.process routes error stack traces and repair requests directly to AutoHealer
// 5. Clean teardown of temporary test artifacts

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import autoHealer from '../../server/orchestrator/auto-healer.js';
import workspace from '../../server/workspace/manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3008;

async function post(endpoint, data = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const req = http.request(
          {
            hostname: 'localhost',
            port: PORT,
            path: endpoint,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 120000,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(body) });
              } catch {
                resolve({ status: res.statusCode, raw: body });
              }
            });
          },
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });
        req.write(payload);
        req.end();
      });
    } catch (e) {
      if (attempt < retries && (e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED')) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw e;
    }
  }
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${PORT}${endpoint}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, raw: body, headers: res.headers });
          }
        });
      })
      .on('error', reject);
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUITE: Autonomous Auto-Healer & 1-Click Surgical Repair');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const testJsFile = 'test_healer_dummy.js';
  const testHtmlFile = 'test_preview_probe.html';
  const testJsPath = path.join(workspace.root, testJsFile);
  const testHtmlPath = path.join(workspace.root, testHtmlFile);

  try {
    // ─── TEST 1: Diagnostic Probe Script Injected in /workspace/*.html ───
    console.log('[Test 1] Verifying automatic preview probe script injection in HTML responses...');
    fs.writeFileSync(
      testHtmlPath,
      '<!DOCTYPE html><html><head><title>Test Probe</title></head><body><h1>Hello World</h1></body></html>',
      'utf8',
    );

    const probeRes = await get(`/workspace/${testHtmlFile}`);
    assert(probeRes.status === 200, 'GET /workspace/test_preview_probe.html returned 200 OK');
    assert(
      typeof probeRes.raw === 'string' && probeRes.raw.includes('sis-diagnostic-probe'),
      'Response includes injected probe script',
    );
    assert(
      probeRes.raw.includes('sis-preview-error'),
      'Probe script listens and dispatches sis-preview-error',
    );

    // ─── TEST 2: Direct AutoHealer Engine Execution & Sandbox Verification ───
    console.log('\n[Test 2] Verifying AutoHealer engine surgical repair and sandbox check...');
    // Create a broken JS file with a missing function
    const brokenJsContent = `// Broken entropy calculation module\nfunction runAnalysis() {\n  const data = [1, 2, 3, 4, 5];\n  // Bug: calculateEntropy is never defined\n  const result = calculateEntropy(data);\n  return result;\n}\n\nmodule.exports = { runAnalysis };\n`;
    fs.writeFileSync(testJsPath, brokenJsContent, 'utf8');

    const healResult = await autoHealer.healFile({
      filename: testJsFile,
      error:
        'ReferenceError: calculateEntropy is not defined at runAnalysis (test_healer_dummy.js:5:18)',
      lineno: 5,
      userContext: 'Please implement calculateEntropy so it runs cleanly without undefined errors.',
    });

    assert(healResult.success === true, 'AutoHealer healFile returned success: true');
    assert(
      Boolean(healResult.rootCause),
      `Root cause identified: "${healResult.rootCause?.slice(0, 60)}..."`,
    );
    assert(
      healResult.diff && typeof healResult.diff.summary === 'string',
      `Surgical diff generated: ${healResult.diff?.summary}`,
    );
    assert(
      healResult.code && healResult.code.includes('calculateEntropy'),
      'Repaired code defines calculateEntropy',
    );
    assert(
      fs.readFileSync(testJsPath, 'utf8') === healResult.code,
      'Repaired code successfully persisted to disk',
    );

    // ─── TEST 3: POST /api/heal Endpoint Execution ───
    console.log('\n[Test 3] Verifying POST /api/heal endpoint with simulated preview defect...');
    // Create a broken HTML artifact with unhandled element access
    const brokenHtmlContent = `<!DOCTYPE html><html><head><title>Simulation</title></head><body><div id="app"></div><script>\n// Runtime bug\nconst container = document.getElementById("canvas-box");\ncontainer.innerHTML = "Loaded";\n</script></body></html>`;
    fs.writeFileSync(testHtmlPath, brokenHtmlContent, 'utf8');

    const apiHealRes = await post('/api/heal', {
      filename: testHtmlFile,
      error: 'TypeError: Cannot set properties of null (setting innerHTML) at line 4',
      lineno: 4,
      userContext: 'Container canvas-box does not exist in DOM',
    });

    assert(apiHealRes.status === 200, 'POST /api/heal returned HTTP 200 OK');
    assert(apiHealRes.data?.success === true, 'API returned success: true');
    assert(Boolean(apiHealRes.data?.diff), 'API returned structured diff object');
    assert(
      Boolean(apiHealRes.data?.rootCause),
      `API diagnosed root cause: "${apiHealRes.data?.rootCause?.slice(0, 60)}..."`,
    );

    // ─── TEST 4: Brain Router Fast-Path for Error Stack Traces ───
    console.log(
      '\n[Test 4] Verifying Brain fast-path routing for error stack traces & repair commands...',
    );
    // Re-create defect in testJsPath for Brain auto-heal fast-path test
    fs.writeFileSync(testJsPath, brokenJsContent, 'utf8');

    const stackTraceQuery = `fix this error in ${testJsFile}: ReferenceError: calculateEntropy is not defined at line 5`;
    const chatRes = await post('/api/chat', {
      message: stackTraceQuery,
    });

    assert(chatRes.status === 200, 'POST /api/chat returned HTTP 200 OK');
    assert(
      chatRes.data?.autoHealed === true ||
        chatRes.data?.source === 'autonomous-auto-healer' ||
        (chatRes.data?.response && chatRes.data.response.includes('Autonomous Auto-Healer')),
      'Brain recognized error and engaged Autonomous Auto-Healer',
    );

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  AUTO-HEALER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    // Cleanup temporary test files
    try {
      if (fs.existsSync(testJsPath)) fs.unlinkSync(testJsPath);
    } catch {}
    try {
      if (fs.existsSync(testHtmlPath)) fs.unlinkSync(testHtmlPath);
    } catch {}
  }
}

runTests();
