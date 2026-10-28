import { safeAI, DEFAULT_MODEL } from '../../server/api/openrouter.js';

function extractCleanJSON(text) {
  if (!text) return null;
  let clean = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  clean = clean.replace(/```(?:json)?\r?\n([\s\S]*?)```/gi, '$1').trim();
  const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    try {
      const relaxed = match[0].replace(/,\s*([\}\]])/g, '$1');
      return JSON.parse(relaxed);
    } catch {
      return null;
    }
  }
}

async function test() {
  const prompt = `You are the Cross-Domain Synthesis & Dot-Connecting Theory Engine of SIS 1.0.
Output JSON only:
{
  "title": "Profound, original theory title",
  "type": "theory",
  "domain": "quantum-computing",
  "hypothesis": "Clear statement of the theory",
  "mathematicalFormulation": "Rigorous LaTeX math",
  "dotConnections": ["Connection 1"],
  "unprovenGaps": ["Gap 1"],
  "detailedExplanation": "Deep explanation",
  "empiricalBenchmarks": ["Benchmark 1"],
  "actionableInsights": ["Insight 1"],
  "codePrototype": "console.log(1);"
}`;
  const context = 'User focus: Topological Quantum Braiding & Fibonacci Anyons';
  console.log('Testing with DEFAULT_MODEL:', DEFAULT_MODEL);
  try {
    const res = await safeAI(prompt, context, DEFAULT_MODEL, 2000, 45000);
    console.log('safeAI Raw response length:', res ? res.length : 'null');
    console.log('safeAI Raw response:\n', res);
    const parsed = extractCleanJSON(res);
    console.log('Parsed JSON:\n', parsed);
  } catch (err) {
    console.error('safeAI error:', err);
  }
}

test();
