// tests/check-syntax.mjs
const reg =
  /^(?:make\s+it(?:\s+now)?|do\s+it(?:\s+now)?|build\s+it(?:\s+now)?|generate\s+it(?:\s+now)?|synthesize\s+it(?:\s+now)?|create\s+it(?:\s+now)?|go\s+ahead|execute\s+it|make\s+this|build\s+this)[\s.!]*(?:please)?[\s.!]*$/i;
console.log('"Make it now.":', reg.test('Make it now.'));
console.log('"make it now!":', reg.test('make it now!'));
console.log('"Do it":', reg.test('Do it'));
console.log('"build it please.":', reg.test('build it please.'));
console.log('"Make it now":', reg.test('Make it now'));
