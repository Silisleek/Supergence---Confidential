import contextScanner from '../../../server/coder/context-scanner.js';

async function testContext() {
  const prompt = `Implement a complete, production-grade lock-free Single Producer Single Consumer (SPSC) Ring Buffer in JavaScript / TypeScript ES Module format. Target file: lock_free_spsc.js`;
  const ctx = await contextScanner.buildContext(prompt);
  console.log('Context length:', ctx.length);
  const lines = ctx.split('\n');
  console.log('First 20 lines of context:');
  console.log(lines.slice(0, 20).join('\n'));
}

testContext().catch(console.error);
