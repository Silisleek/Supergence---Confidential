// SIS 1.0 — Safety & Error Handling Verification Test Suite
import workspace from '../../server/workspace/manager.js';
import toolRegistry from '../../server/tools/registry.js';
import brain from '../../server/orchestrator/brain.js';
import os from 'os';
import path from 'path';

console.log('===============================================================');
console.log('       VERIFYING SAFETY GUARDS & ERROR RESILIENCE             ');
console.log('===============================================================\n');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTests() {
  // ─── Test Group 1: Protected Filesystem Safety Checks ───
  console.log('[Test 1] Protected Path Prevention...');

  // 1.1 Root drive deletion
  try {
    workspace.deleteFolder('C:\\');
    assert(false, 'Should block deleting drive root C:\\');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked deleting drive root C:\\');
  }

  // 1.2 Windows system directory deletion
  try {
    workspace.deleteFolder('C:\\Windows');
    assert(false, 'Should block deleting C:\\Windows');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked deleting C:\\Windows');
  }

  try {
    workspace.deleteFile('C:\\Windows\\System32\\cmd.exe');
    assert(false, 'Should block deleting C:\\Windows\\System32\\cmd.exe');
  } catch (err) {
    assert(
      err.message.includes('Safety Protection'),
      'Blocked deleting C:\\Windows\\System32 file',
    );
  }

  // 1.3 User home root deletion
  try {
    workspace.deleteFolder(os.homedir());
    assert(false, 'Should block deleting os.homedir()');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked deleting user home directory');
  }

  // 1.4 Project repository root deletion
  try {
    workspace.deleteFolder(workspace.root);
    assert(false, 'Should block deleting project root');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked deleting project root');
  }

  // 1.5 Protected path editing & creation
  try {
    workspace.createFile('C:\\Windows\\sis-corrupt.txt', 'evil');
    assert(false, 'Should block creating file in C:\\Windows');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked creating file in C:\\Windows');
  }

  try {
    workspace.editFile('C:\\Windows\\win.ini', { targetContent: 'a', replacementContent: 'b' });
    assert(false, 'Should block editing file in C:\\Windows');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked editing file in C:\\Windows');
  }

  // 1.6 Moving protected path
  try {
    workspace.moveFile('C:\\Windows', 'workspace/stolen_windows');
    assert(false, 'Should block moving C:\\Windows');
  } catch (err) {
    assert(err.message.includes('Safety Protection'), 'Blocked moving C:\\Windows');
  }

  // ─── Test Group 2: Destructive Shell Command Prevention ───
  console.log('\n[Test 2] Dangerous Shell Command Rejection...');

  const dangerousCommands = [
    'format c:',
    'FORMAT D: /FS:NTFS',
    'rd /s /q c:\\windows',
    'rmdir /s /q c:\\windows\\system32',
    'del c:\\*.* /s /q',
    'rm -rf /etc',
    'dd if=/dev/zero of=/dev/sda',
    ':(){ :|:& };:',
  ];

  for (const cmd of dangerousCommands) {
    const res = await workspace.runCommand(cmd);
    assert(
      res.blocked === true && res.error.includes('Safety Protection'),
      `Blocked dangerous command: "${cmd}"`,
    );
  }

  // ─── Test Group 3: Normal Legitimate Workspace Operations ───
  console.log('\n[Test 3] Legitimate Operations Functionality...');

  const testFile = 'workspace/safety_test_file.txt';
  const createRes = workspace.createFile(testFile, 'Initial line 1\nInitial line 2');
  assert(createRes && createRes.success === true, 'Created legitimate workspace test file');

  const editRes = workspace.editFile(testFile, {
    targetContent: 'Initial line 2',
    replacementContent: 'Updated line 2',
  });
  assert(editRes && editRes.success === true, 'Edited legitimate workspace test file');

  const appendRes = workspace.appendFile(testFile, 'Appended line 3');
  assert(appendRes && appendRes.success === true, 'Appended to legitimate workspace test file');

  const readRes = workspace.readFile(testFile);
  assert(
    readRes &&
      readRes.content.includes('Updated line 2') &&
      readRes.content.includes('Appended line 3'),
    'Read back modified workspace test file',
  );

  const deleteRes = workspace.deleteFile(testFile);
  assert(deleteRes && deleteRes.success === true, 'Cleaned up legitimate workspace test file');

  const cmdRes = await workspace.runCommand('node -e "console.log(\'SIS_SAFETY_OK\')"');
  assert(
    cmdRes.stdout && cmdRes.stdout.includes('SIS_SAFETY_OK'),
    'Executed safe command without impediment',
  );

  // ─── Test Group 4: Tool Registry Safe Argument Handling ───
  console.log('\n[Test 4] ToolRegistry Parameter Robustness...');

  const nullParamRes = await toolRegistry.execute('file_stat', null);
  assert(
    nullParamRes && (nullParamRes.error || !nullParamRes.success),
    'Safely handled null params for file_stat without throwing',
  );

  const undefParamRes = await toolRegistry.execute('run_command', undefined);
  assert(
    undefParamRes && undefParamRes.error,
    'Safely handled undefined params for run_command without throwing',
  );

  const unknownToolRes = await toolRegistry.execute('non_existent_super_tool', {});
  assert(
    unknownToolRes && unknownToolRes.error.includes('not found'),
    'Handled unknown tool lookup cleanly',
  );

  // ─── Test Group 5: Brain WebSocket Broadcast Resilience ───
  console.log('\n[Test 5] Brain WebSocket Broadcast Resilience...');

  try {
    brain.broadcast('test-safety', { ok: true });
    assert(true, 'Broadcasted with zero or dead clients without throwing');
  } catch (err) {
    assert(false, `Broadcast threw: ${err.message}`);
  }

  try {
    brain.sendTo(null, 'test', {});
    assert(true, 'sendTo with null socket handled safely');
  } catch (err) {
    assert(false, `sendTo with null threw: ${err.message}`);
  }

  try {
    const mockDeadSocket = {
      readyState: 3,
      send: () => {
        throw new Error('Socket closed');
      },
    };
    brain.sendTo(mockDeadSocket, 'test', {});
    assert(true, 'sendTo with dead socket handled safely');
  } catch (err) {
    assert(false, `sendTo with dead socket threw: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(
    `  VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`,
  );
  console.log('===============================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
