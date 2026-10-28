import dotenv from 'dotenv';
dotenv.config();

const theoryGenPrompt = `You are the Cross-Domain Synthesis & Dot-Connecting Theory Engine of SIS 1.0.
Your task is to connect dots across different domains (e.g. quantum algorithms + 3D graphics + lock-free memory + AI agent swarms), and formulate a novel theoretical hypothesis.

Output JSON only with fields:
{
  "title": "Novel original title",
  "type": "theory",
  "domain": "systems-architecture",
  "hypothesis": "Rigorous hypothesis statement",
  "mathematicalFormulation": "LaTeX state space and invariants: $\\\\mathcal{H} = \\\\sum |i\\\\rangle\\\\langle i|$",
  "dotConnections": ["Connection 1", "Connection 2"],
  "unprovenGaps": ["Gap 1", "Gap 2"],
  "detailedExplanation": "Technical explanation of the architecture",
  "empiricalBenchmarks": ["Benchmark 1: <= 200ns", "Benchmark 2: >= 10M ops/sec"],
  "actionableInsights": ["Insight 1", "Insight 2"],
  "codePrototype": "// Complete runnable prototype"
}`;

const contextPrompt = `User Focus Keywords: Neuromorphic Computing, Non-Blocking Algorithms
Forced Topic Focus: Neuromorphic Memristor Array Cross-Bar Architecture`;

async function test(modelName) {
  const start = Date.now();
  console.log(`\n=== Testing ${modelName} ===`);
  const url = `${process.env.OPENROUTER_BASE_URL || 'http://127.0.0.1:20128/v1'}/chat/completions`;
  const key = process.env.OPENROUTER_API_KEY;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: theoryGenPrompt + '\n\n' + contextPrompt }],
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      console.error('Request failed:', res.status, await res.text());
      return;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    console.log(`Took ${Date.now() - start}ms | Length: ${raw?.length}`);
    console.log('Preview:\n', raw?.slice(0, 400));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  await test('opencode/mimo-v2.6-flash-free');
  await test('opencode/mimo-v2.5-free');
  await test('opencode/big-pickle');
}

run();
