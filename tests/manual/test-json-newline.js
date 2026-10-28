const rawJSONWithNewlines = `{\n  "title": "Test",\n  "code": "function run() {\n    return 42;\n  }"\n}`;

console.log('Testing raw JSON with newlines:');
try {
  JSON.parse(rawJSONWithNewlines);
  console.log('Parsed successfully!');
} catch (e) {
  console.log('DIRECT PARSE FAILED:', e.message);
}
