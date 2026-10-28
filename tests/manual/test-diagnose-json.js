import autonomousLearner from '../../server/improvement/autonomous-learner.js';
import { quickAI, DEFAULT_MODEL } from '../../server/api/openrouter.js';

// Let's test the extractCleanJSON logic on what the model actually outputs
async function test() {
  const theoryGenPrompt = `You are the Cross-Domain Synthesis & Dot-Connecting Theory Engine of SIS 1.0.
Output JSON only:
{
  "title": "Profound, original theory / roadmap / audit title",
  "type": "theory",
  "domain": "cryptography-zk",
  "hypothesis": "Conjecture",
  "mathematicalFormulation": "LaTeX",
  "dotConnections": ["Dot 1"],
  "unprovenGaps": ["Gap 1"],
  "detailedExplanation": "Explanation",
  "empiricalBenchmarks": ["Benchmark 1"],
  "actionableInsights": ["Insight 1"],
  "codePrototype": "// code"
}`;

  const contextPrompt =
    'Topic: Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge (zk-SNARKs)';

  console.log('Calling AI...');
  const res = await quickAI(theoryGenPrompt, contextPrompt, DEFAULT_MODEL, 1500);
  console.log('\n--- RAW RESPONSE ---');
  console.log(res);

  console.log('\n--- TESTING EXTRACT ---');
  const parsed = autonomousLearner._testExtract ? autonomousLearner._testExtract(res) : null;
  console.log('Result:', parsed);
}

test().catch(console.error);
