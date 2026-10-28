import fs from 'fs';
import { CoderPart } from '../../../server/coder/coder-part.js';

const raw = fs.readFileSync('workspace/.sandbox/run_1792549591673/lock_free_spsc.js', 'utf8');

// Construct mock markdown that would produce this
const mockResponse = `
Here is how enqueue works:
\`\`\`javascript
const tail = this._atomic ? Atomics.load(control, 1) : control[1];
const head = this._atomic ? Atomics.load(control, 0) : control[0];
if (((tail - head) >>> 0) >= capacity) return false;
\`\`\`

Here is the complete implementation:
\`\`\`javascript
export class LockFreeSPSC {
  constructor(capacity = 8) {
    this.cap = capacity;
    this.buf = new Array(capacity);
    this.head = 0;
    this.tail = 0;
  }
  enqueue(item) {
    if (this.isFull()) return false;
    this.buf[this.tail & (this.cap - 1)] = item;
    this.tail++;
    return true;
  }
  dequeue() {
    if (this.isEmpty()) return undefined;
    const item = this.buf[this.head & (this.cap - 1)];
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

const parsed = CoderPart.prototype._parseDraft(mockResponse, 'lock_free_spsc.js', 'javascript');
console.log('Parsed Code length:', parsed.code.length);
console.log(
  'Does code contain illegal return at top level?:',
  parsed.code.startsWith('const tail ='),
);
console.log('Does code contain LockFreeSPSC?:', parsed.code.includes('export class LockFreeSPSC'));

// Verify syntax
import vm from 'vm';
try {
  new vm.SourceTextModule(parsed.code);
  console.log('✓ ES Module syntax verified cleanly!');
} catch (e) {
  console.log('Syntax result:', e.message);
}
process.exit(0);
