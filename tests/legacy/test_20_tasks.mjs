import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3008';

const TASKS = [
  {
    id: 1,
    name: 'Web Search - Latest AI Releases',
    category: 'Live Web Search',
    prompt: 'Can you search for the latest AI models released recently?',
    check: (res) => res.response.length > 50 && !res.response.trim().startsWith('{"tool"'),
  },
  {
    id: 2,
    name: 'Web Search - Quantum Computing',
    category: 'Live Web Search',
    prompt: 'Search the web for the latest updates on quantum computing breakthroughs.',
    check: (res) => res.response.length > 50 && !res.response.trim().startsWith('{"tool"'),
  },
  {
    id: 3,
    name: 'Ada-SI - SHA-256 Hash Tool Genesis',
    category: 'Ada-SI Synthesis',
    prompt: "Calculate the SHA-256 hash of 'Supergence-Unified-AI-2026'",
    check: (res) =>
      res.toolCalls.some((t) => t.tool.includes('sha256') || t.status === 'RESOLVED') &&
      res.response.length > 10,
  },
  {
    id: 4,
    name: 'Ada-SI - Fibonacci Calculation Tool',
    category: 'Ada-SI Synthesis',
    prompt: 'Calculate the 20th Fibonacci number using a synthesized tool',
    check: (res) => res.toolCalls.length > 0 && res.response.length > 10,
  },
  {
    id: 5,
    name: 'Ada-SI - Temperature Conversion Tool',
    category: 'Ada-SI Synthesis',
    prompt: 'Convert 373.15 Kelvin to Fahrenheit using a synthesized tool',
    check: (res) => res.toolCalls.length > 0 && res.response.length > 10,
  },
  {
    id: 6,
    name: 'Ada-SI - Word Frequency Analysis Tool',
    category: 'Ada-SI Synthesis',
    prompt:
      "Count the word frequency and character count in 'Autonomous AI agents unified into Supergence'",
    check: (res) => res.toolCalls.length > 0 && res.response.length > 10,
  },
  {
    id: 7,
    name: 'OpenClaw - Hardware Telemetry',
    category: 'OpenClaw Computer Control',
    prompt: 'Check the system hardware telemetry: CPU, cores, and RAM usage',
    check: (res) =>
      res.toolCalls.some((t) => t.tool.includes('telemetry') || t.status === 'RESOLVED') ||
      res.openclawResult !== null,
  },
  {
    id: 8,
    name: 'OpenClaw - OS Running Processes',
    category: 'OpenClaw Computer Control',
    prompt: 'List the running processes on this computer',
    check: (res) =>
      res.toolCalls.some((t) => t.tool.includes('processes') || t.status === 'RESOLVED') ||
      res.openclawResult !== null,
  },
  {
    id: 9,
    name: 'OpenClaw - Disk Drives Inspection',
    category: 'OpenClaw Computer Control',
    prompt: 'Check the disk storage and drives on this machine',
    check: (res) =>
      res.toolCalls.some(
        (t) => t.tool.includes('disk') || t.tool.includes('drives') || t.status === 'RESOLVED',
      ) || res.openclawResult !== null,
  },
  {
    id: 10,
    name: 'OpenClaw - Direct Shell Execution',
    category: 'OpenClaw Computer Control',
    prompt: "Run powershell Get-Date -Format 'yyyy-MM-dd HH:mm:ss'",
    check: (res) => res.response.length > 5,
  },
  {
    id: 11,
    name: 'ToolRegistry - Workspace Filesystem',
    category: 'Workspace Tools',
    prompt: 'List the files in the project workspace directory',
    check: (res) => res.toolCalls.some((t) => t.tool.includes('files')) || res.response.length > 20,
  },
  {
    id: 12,
    name: 'Bio-SIS Specialist - CRISPR & Prime Editing',
    category: 'Domain Coworker',
    agentId: 'agent-biology',
    prompt:
      'Explain how Prime Editing with pegRNA and reverse transcriptase overcomes double-strand breaks in CRISPR-Cas9',
    check: (res) => res.response.length > 80 && !res.response.includes('{"tool"'),
  },
  {
    id: 13,
    name: 'Nova-Dev Specialist - Distributed Cache Coherence',
    category: 'Domain Coworker',
    agentId: 'agent-cs',
    prompt: 'Analyze cache coherence protocols (MESI vs MOESI) in multi-core distributed systems',
    check: (res) => res.response.length > 80 && !res.response.includes('{"tool"'),
  },
  {
    id: 14,
    name: 'Astra-Logic Specialist - Banach Fixed-Point Theorem',
    category: 'Domain Coworker',
    agentId: 'agent-mathematics',
    prompt: 'Outline the formal proof of the Banach Fixed-Point Theorem in complete metric spaces',
    check: (res) => res.response.length > 80 && !res.response.includes('{"tool"'),
  },
  {
    id: 15,
    name: 'Volt-Phys Specialist - Quantum Hall Effect',
    category: 'Domain Coworker',
    agentId: 'agent-ee',
    prompt:
      'Explain the Integer Quantum Hall Effect and Landau level degeneracy in 2D electron gases',
    check: (res) => res.response.length > 80 && !res.response.includes('{"tool"'),
  },
  {
    id: 16,
    name: 'Quant-Econ Specialist - Black-Scholes & Volatility Smile',
    category: 'Domain Coworker',
    agentId: 'agent-economics',
    prompt:
      'Explain the Black-Scholes partial differential equation and the volatility smile phenomenon',
    check: (res) => res.response.length > 80 && !res.response.includes('{"tool"'),
  },
  {
    id: 17,
    name: 'Aegis-Risk Specialist - Autonomous Agent Threat Model',
    category: 'Domain Coworker',
    agentId: 'agent-risk',
    prompt:
      'Perform a threat model analysis on autonomous AI agents with shell execution permissions',
    check: (res) => res.response.length > 80 && !res.response.includes('{"tool"'),
  },
  {
    id: 18,
    name: 'Hermes Memory - Epistemic Memory Accretion',
    category: 'Lifelong Memory',
    prompt:
      'Remember this strategic principle: Always prioritize determinism over speculative concurrency in core kernel loops. What is our active memory ledger status?',
    check: (res) => res.response.length > 30 && !res.response.includes('{"tool"'),
  },
  {
    id: 19,
    name: 'OpenDots & OpenBot - Parallel Swarm Synthesis',
    category: 'Multi-Agent Swarm',
    prompt: 'Parallel research on Neuromorphic Computing architectures vs Quantum Annealing',
    check: (res) => res.response.length > 50 && !res.response.includes('{"tool"'),
  },
  {
    id: 20,
    name: 'ReAct Anti-Leak - Web Search & Node.js Synthesis',
    category: 'Anti-Leak & Synthesis',
    prompt:
      'Can you search for the latest release date of Node.js 24 and explain its key features?',
    check: (res) => res.response.length > 50 && !res.response.trim().startsWith('{"tool"'),
  },
];

async function runTask(task) {
  const startTime = Date.now();
  console.log(`\n============================================================`);
  console.log(`[Task ${task.id}/20] (${task.category}) ${task.name}`);
  console.log(`Prompt: "${task.prompt}"`);

  try {
    const payload = {
      message: task.prompt,
      agentId: task.agentId || null,
      autoExecuteClaw: true,
    };

    const resp = await fetch(`${API_BASE}/api/sis/unified-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json();
    const durationMs = Date.now() - startTime;

    const hasRawToolLeak = data.response && data.response.trim().startsWith('{"tool"');
    const passedCheck = task.check(data);
    const passed = passedCheck && !hasRawToolLeak;

    console.log(
      `Tool Calls (${data.toolCalls?.length || 0}):`,
      (data.toolCalls || []).map((t) => `${t.displayName || t.tool} [${t.status}]`).join(', ') ||
        'None (direct synthesis)',
    );
    console.log(
      `Anti-Leak Check: ${hasRawToolLeak ? '❌ FAILED (raw JSON leaked)' : '✓ PASSED (clean markdown)'}`,
    );
    console.log(`Duration: ${durationMs}ms | Status: ${passed ? '✓ PASSED' : '❌ FAILED'}`);
    console.log(`Response Preview: ${data.response?.slice(0, 180).replace(/\n/g, ' ')}...`);

    return {
      id: task.id,
      name: task.name,
      category: task.category,
      durationMs,
      toolCallsCount: data.toolCalls?.length || 0,
      toolCalls: (data.toolCalls || []).map((t) => ({
        name: t.displayName || t.tool,
        status: t.status,
        duration: t.durationMs,
      })),
      hasRawToolLeak,
      passed,
      responseSnippet: data.response?.slice(0, 240),
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`Task ${task.id} Error:`, err.message);
    return {
      id: task.id,
      name: task.name,
      category: task.category,
      durationMs,
      toolCallsCount: 0,
      toolCalls: [],
      hasRawToolLeak: false,
      passed: false,
      error: err.message,
    };
  }
}

async function runAll() {
  console.log('============================================================');
  console.log('   SUPERGENCE 20-TASK COMPREHENSIVE VERIFICATION SUITE   ');
  console.log('   Backend: http://localhost:3008 | Model: auto (FreeLLMAPI)   ');
  console.log('============================================================');

  const results = [];
  for (const task of TASKS) {
    const res = await runTask(task);
    results.push(res);
  }

  console.log('\n\n============================================================');
  console.log('                  FINAL 20-TASK SCORECARD                   ');
  console.log('============================================================');

  let passedCount = 0;
  for (const r of results) {
    if (r.passed) passedCount++;
    const statusIcon = r.passed ? '✓ PASS' : '❌ FAIL';
    const toolsStr = r.toolCallsCount > 0 ? `(${r.toolCallsCount} tools)` : '(direct)';
    console.log(
      `[#${String(r.id).padStart(2, '0')}] ${statusIcon} | ${r.category.padEnd(24)} | ${r.name.padEnd(42)} | ${toolsStr.padEnd(12)} | ${r.durationMs}ms`,
    );
  }

  console.log('============================================================');
  console.log(
    `Total Score: ${passedCount} / ${TASKS.length} passed (${Math.round((passedCount / TASKS.length) * 100)}%)`,
  );
  console.log('============================================================');

  fs.writeFileSync(
    'task_evaluation_results.json',
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalTasks: TASKS.length,
        passedTasks: passedCount,
        results,
      },
      null,
      2,
    ),
  );

  console.log('Detailed results written to task_evaluation_results.json');
}

runAll().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
