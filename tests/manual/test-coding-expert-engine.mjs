import codingExpertEngine from '../../server/coder/coding-expert-engine.js';

async function main() {
  console.log('=== [1/3] Testing Valid JavaScript Module ===');
  const res1 = await codingExpertEngine.evaluateAndVerify({
    filename: 'math_utils.js',
    code: `export function add(a, b) { return a + b; }
export function runTests() {
  if (add(2, 3) !== 5) throw new Error('assertion failed');
  console.log('Math tests passed!');
}`,
    language: 'javascript',
  });
  console.log('Valid JS Result:', {
    syntaxValid: res1.syntaxValid,
    testsPassed: res1.testsPassed,
    diagnostics: res1.diagnostics,
  });

  console.log('\n=== [2/3] Testing Syntax Error JavaScript Module ===');
  const res2 = await codingExpertEngine.evaluateAndVerify({
    filename: 'syntax_error.js',
    code: `function broken( { return 42; }`,
    language: 'javascript',
    autoHeal: false,
  });
  console.log('Syntax Error Result:', {
    syntaxValid: res2.syntaxValid,
    testsPassed: res2.testsPassed,
    diagnostics: res2.diagnostics,
  });

  console.log('\n=== [3/3] Testing Runtime Failure Module ===');
  const res3 = await codingExpertEngine.evaluateAndVerify({
    filename: 'runtime_error.js',
    code: `export function divide(a, b) { return a / b; }
export function runTests() {
  throw new Error('Intentional runtime defect caught by Coding Expert');
}`,
    language: 'javascript',
    autoHeal: false,
  });
  console.log('Runtime Error Result:', {
    syntaxValid: res3.syntaxValid,
    testsPassed: res3.testsPassed,
    diagnostics: res3.diagnostics,
  });

  const allPassed = res1.testsPassed && !res2.syntaxValid && !res3.testsPassed;
  console.log(
    '\n🌟 CODING EXPERT ENGINE VERIFICATION RESULT:',
    allPassed ? '100% SUCCESS' : 'FAILED',
  );
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
