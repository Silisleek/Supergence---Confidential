// Test file to verify state management and CoreReactor integration
// Run with: node tests/test-hud-integration.js

import {
  state,
  selectAgentCycleState,
  selectSystemStatus,
  selectWsConnected,
} from '../../client/src/state/store.js';

console.log('Testing JARVIS HUD State Management...\n');

// Test 1: Initial state
console.log('1. Testing initial state...');
if (selectWsConnected() !== false) {
  console.error('  FAILED: Initial wsConnected should be false');
  process.exit(1);
}
console.log('  PASSED: Initial state is correct');

// Test 2: State updates
console.log('2. Testing state updates...');
state.applyStateUpdate({
  type: 'AGENT_CYCLE_STATE_CHANGE',
  payload: 'thinking',
});

if (selectAgentCycleState() !== 'thinking') {
  console.error('  FAILED: Agent state should be thinking');
  process.exit(1);
}
console.log('  PASSED: State update works correctly');

// Test 3: System status
console.log('3. Testing system status...');
state.applyStateUpdate({
  type: 'SYSTEM_STATUS_UPDATE',
  payload: {
    cpu: { usage: 45, cores: 8, frequency: 3500, temperature: 65, loadAverage: [1, 2, 3] },
    memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50 },
    network: {
      latency: 15,
      download: 100,
      upload: 50,
      packetsSent: 1000,
      packetsReceived: 2000,
      errors: 0,
    },
    timestamp: Date.now(),
  },
});

const sysStatus = selectSystemStatus();
if (!sysStatus || sysStatus.cpu.usage !== 45) {
  console.error('  FAILED: System status not updated');
  process.exit(1);
}
console.log('  PASSED: System status update works');

console.log('\n=== All State Management Tests Passed ===\n');
