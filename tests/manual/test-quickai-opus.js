import { quickAI } from '../../server/api/openrouter.js';

async function test() {
  console.log('--- Testing opus-4.8-m via quickAI ---');
  try {
    const res1 = await quickAI(
      'You are a senior scientist. Return JSON only: {"theoryName": "Quantum Coherence Invariant", "math": "\\\\mathcal{H} = \\\\sum E_k |k\\\\rangle"}',
      'Generate a sample JSON theory',
      'opus-4.8-m',
      300,
    );
    console.log('Result from opus-4.8-m:');
    console.log(res1);
  } catch (err) {
    console.error('opus-4.8-m error:', err);
  }
}

test();
