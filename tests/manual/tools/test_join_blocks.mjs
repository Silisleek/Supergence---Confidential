import { CoderPart } from '../../../server/coder/coder-part.js';

const proto = CoderPart.prototype;
const sample = `
Here are helper functions:
\`\`\`javascript
const DEFAULT_CAPACITY = 2;
function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
\`\`\`

And here is the main class implementation:
\`\`\`javascript
export class LockFreeSPSC {
  constructor(capacity = DEFAULT_CAPACITY) {
    this.cap = nextPowerOfTwo(capacity);
    this.buffer = new Array(this.cap);
    this.head = 0;
    this.tail = 0;
  }
  enqueue(item) {
    if (this.isFull()) return false;
    this.buffer[this.tail & (this.cap - 1)] = item;
    this.tail++;
    return true;
  }
  dequeue() {
    if (this.isEmpty()) return undefined;
    const item = this.buffer[this.head & (this.cap - 1)];
    this.head++;
    return item;
  }
  isEmpty() { return this.head === this.tail; }
  isFull() { return this.tail - this.head === this.cap; }
  size() { return this.tail - this.head; }
  capacity() { return this.cap; }
}
\`\`\`
`;

const parsed = proto._parseDraft(sample, 'lock_free_spsc.js', 'javascript');
console.log('Extracted code length:', parsed.code.length);
console.log('Contains nextPowerOfTwo:', parsed.code.includes('nextPowerOfTwo'));
console.log('Contains LockFreeSPSC:', parsed.code.includes('LockFreeSPSC'));
console.log('Parsed targetFile:', parsed.targetFile);
process.exit(0);
