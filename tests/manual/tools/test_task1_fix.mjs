import { CoderPart } from '../../../server/coder/coder-part.js';
import sandbox from '../../../server/coder/sandbox.js';

async function testTask1() {
  console.log('Testing Task 1 (SPSC Lock-Free Ring Buffer) with updated coder...');
  const coder = new CoderPart();
  const prompt = `Implement a complete, production-grade lock-free Single Producer Single Consumer (SPSC) Ring Buffer in JavaScript / TypeScript ES Module format.
Target file: lock_free_spsc.js
Requirements:
1. Export class LockFreeSPSC(capacity). Capacity should automatically round up to next power of 2.
2. Methods: enqueue(item), dequeue(), isEmpty(), isFull(), size(), capacity().
3. Bitwise mask indexing: index & (capacity - 1) for O(1) branchless wrap-around.
4. Correctly distinguish between full and empty states without sacrificing buffer slots.
5. Provide complete, working code with zero external dependencies and zero placeholder comments.`;

  const res = await coder.process(prompt);
  console.log('Synthesis completed:');
  console.log('- targetFile:', res.targetFile);
  console.log('- code length:', res.code?.length);
  console.log('- verified:', res.verified);

  const testCode = `
import { LockFreeSPSC } from '../../../scripts/lock_free_spsc.js';
import assert from 'node:assert/strict';

const q = new LockFreeSPSC(16);
assert.equal(q.isEmpty(), true);
assert.equal(q.isFull(), false);

assert.equal(q.enqueue('A'), true);
assert.equal(q.isEmpty(), false);
assert.equal(q.dequeue(), 'A');
assert.equal(q.isEmpty(), true);

for (let i = 0; i < 16; i++) {
  assert.equal(q.enqueue(i), true, 'Failed enqueue at ' + i);
}
assert.equal(q.isFull(), true);
assert.equal(q.enqueue('OVERFLOW'), false);

for (let i = 0; i < 16; i++) {
  assert.equal(q.dequeue(), i);
}
assert.equal(q.isEmpty(), true);

console.log('TASK_1_HARNESS_PASSED: 16-item and FIFO operations verified cleanly.');
`;

  const testResult = await sandbox.execute({
    targetFile: 'lock_free_spsc.js',
    code: res.code,
    testCode,
    language: 'javascript',
  });

  console.log('Harness Result:');
  console.log('- success:', testResult.success);
  console.log('- stdout:', testResult.stdout);
  console.log('- stderr:', testResult.stderr);
  process.exit(testResult.success ? 0 : 1);
}

testTask1().catch((err) => {
  console.error(err);
  process.exit(1);
});
