import { quickAI, DEFAULT_MODEL } from '../../server/api/openrouter.js';

async function main() {
  console.log('Testing quickAI directly with theory prompt and DEFAULT_MODEL:', DEFAULT_MODEL);
  const theoryGenPrompt = `You are the Cross-Domain Synthesis & Dot-Connecting Theory Engine of SIS 1.0.
Output JSON only:
{
  "title": "Novel original title",
  "type": "theory",
  "domain": "systems-architecture",
  "hypothesis": "Clear hypothesis",
  "mathematicalFormulation": "LaTeX: $\\\\mathcal{H} = \\\\sum x_i$",
  "dotConnections": ["Connection 1"],
  "unprovenGaps": ["Gap 1"],
  "detailedExplanation": "Detailed explanation",
  "empiricalBenchmarks": ["Benchmark 1"],
  "actionableInsights": ["Insight 1"],
  "codePrototype": "// prototype"
}`;

  const contextPrompt =
    'User Focus Keywords: Systems\nCore Research Frontier: Neuromorphic Computing';

  try {
    const res = await quickAI(theoryGenPrompt, contextPrompt, DEFAULT_MODEL, 1000);
    console.log('RAW AI RESPONSE LENGTH:', res ? res.length : 0);
    console.log('RAW AI RESPONSE:\n', res);
  } catch (err) {
    console.error('quickAI ERROR:', err);
  }
}

main();
