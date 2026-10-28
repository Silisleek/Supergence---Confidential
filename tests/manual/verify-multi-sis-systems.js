// SIS 1.0 — Multi-SIS Systems & Field Specialization Verification Suite
// Validates:
// 1. Creation of unlimited fresh SIS systems
// 2. 100% Zero-data isolation (0 files, 0 memory nodes, 0 conversations)
// 3. Preservation of default SIS // MK-10 system and all its historical data
// 4. Hot-swapping between systems and file/memory runtime isolation
// 5. Field specialization curriculum training and level upgrades
// 6. Safe deletion of custom systems and protection of default system

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import systemManager from '../../server/systems/manager.js';
import workspace from '../../server/workspace/manager.js';
import shortTermMemory from '../../server/memory/short-term.js';
import longTermMemory from '../../server/memory/long-term.js';
import knowledgeGraph from '../../server/memory/knowledge-graph.js';
import conversations from '../../server/conversations.js';
import autonomousLearner from '../../server/improvement/autonomous-learner.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RUNNING MULTI-SIS SYSTEMS & FIELD SPECIALIZATION TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}\n    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}\n    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Subsystem Binding
  test('Subsystems bind cleanly to SystemManager', () => {
    systemManager.bindSubsystems({
      workspace,
      shortTermMemory,
      longTermMemory,
      knowledgeGraph,
      conversations,
      autonomousLearner,
      brain: null,
    });
    assert.ok(systemManager._subsystems, 'Subsystems must be registered');
  });

  // 2. Default System Preservation
  test('Default SIS // MK-10 system exists and preserves historical data', () => {
    const defaultSys = systemManager.getSystem('default');
    assert.ok(defaultSys, 'Default system must exist');
    assert.strictEqual(defaultSys.isDefault, true, 'Default flag must be true');
    assert.ok(fs.existsSync(defaultSys.paths.workspaceDir), 'Workspace dir must exist');

    // Check that historical workspace files are preserved
    const files = fs.readdirSync(defaultSys.paths.workspaceDir);
    assert.ok(files.length > 50, `Default workspace should have >50 files, got ${files.length}`);

    const stats = systemManager._getSystemStats(defaultSys);
    console.log(
      `    [Info] Default system has ${stats.workspaceFileCount} files, ${stats.theoryCount} theories, ${stats.memoryNodeCount} memory nodes`,
    );
    assert.ok(stats.workspaceFileCount > 50, 'Default system file count must be preserved');
  });

  // 3. Fresh System Creation & Zero-Data Guarantees
  let quantumSys = null;
  let bioSys = null;

  test('Create System 1 (Quantum-SIS) with fresh zero-data guarantees', () => {
    quantumSys = systemManager.createSystem({
      name: 'Quantum-SIS',
      field: 'Quantum Computing & Hamiltonian Simulation',
      trainingObjective: 'Transpile variational quantum algorithms and mitigate gate noise',
      description: 'Dedicated expert SIS instance for quantum computing',
    });

    assert.ok(quantumSys.id.startsWith('sis-quantum-sis'), 'ID should be normalized');
    assert.strictEqual(quantumSys.field, 'Quantum Computing & Hamiltonian Simulation');
    assert.strictEqual(quantumSys.trainingLevel, 1);
    assert.strictEqual(quantumSys.isDefault, false);

    // Verify 100% fresh zero-data guarantee on disk
    assert.ok(
      fs.existsSync(quantumSys.paths.workspaceDir),
      'Dedicated workspace directory must be created',
    );
    const wsFiles = fs.readdirSync(quantumSys.paths.workspaceDir).filter((f) => !f.startsWith('.'));
    assert.strictEqual(wsFiles.length, 0, 'New system workspace must start with exactly 0 files');

    const stm = JSON.parse(fs.readFileSync(quantumSys.paths.stmPath, 'utf8'));
    assert.strictEqual((stm.children || []).length, 0, 'STM root must have 0 categories');

    const ltm = JSON.parse(fs.readFileSync(quantumSys.paths.ltmPath, 'utf8'));
    assert.strictEqual((ltm.children || []).length, 0, 'LTM root must have 0 categories');

    const graph = JSON.parse(fs.readFileSync(quantumSys.paths.graphPath, 'utf8'));
    assert.strictEqual(graph.nodes.length, 0, 'Knowledge graph must start with 0 nodes');

    const convs = fs.readdirSync(quantumSys.paths.convDir);
    assert.strictEqual(convs.length, 0, 'New system must start with 0 conversations');

    const stats = systemManager._getSystemStats(quantumSys);
    assert.strictEqual(stats.workspaceFileCount, 0, 'Workspace files stat must be 0');
    assert.strictEqual(stats.theoryCount, 0, 'Theories stat must be 0');
    assert.strictEqual(stats.memoryNodeCount, 0, 'Memory nodes stat must be 0');
    assert.strictEqual(stats.knowledgeNodeCount, 0, 'Knowledge nodes stat must be 0');
  });

  test('Create System 2 (BioAgent-SIS) for another distinct task', () => {
    bioSys = systemManager.createSystem({
      name: 'BioAgent-SIS',
      field: 'Synthetic Biology & CRISPR Guide Design',
      trainingObjective: 'Design off-target minimal Cas9 guide RNAs',
    });

    assert.ok(bioSys.id.startsWith('sis-bioagent-sis'));
    const stats = systemManager._getSystemStats(bioSys);
    assert.strictEqual(stats.workspaceFileCount, 0);
    assert.strictEqual(stats.memoryNodeCount, 0);
  });

  // 4. System Listing & Multi-System Discovery
  test('List systems returns all systems with active state', () => {
    const list = systemManager.listSystems();
    assert.ok(list.length >= 3, 'Must contain default + at least 2 custom systems');
    const defaultInList = list.find((s) => s.id === 'default');
    const quantumInList = list.find((s) => s.id === quantumSys.id);
    const bioInList = list.find((s) => s.id === bioSys.id);

    assert.ok(defaultInList, 'Default system must be in list');
    assert.ok(quantumInList, 'Quantum system must be in list');
    assert.ok(bioInList, 'BioAgent system must be in list');
  });

  // 5. Hot-Swapping & Runtime Subsystem Isolation
  test('Hot-swap to Quantum-SIS retargets runtime singletons', () => {
    systemManager.switchSystem(quantumSys.id);
    assert.strictEqual(systemManager.activeSystemId, quantumSys.id);
    assert.strictEqual(
      workspace.root,
      quantumSys.paths.workspaceDir,
      'Workspace root must point to Quantum-SIS workspace',
    );

    // Create a file in Quantum-SIS workspace
    const testFile = 'vqe_ansatz.py';
    const testContent = '# Quantum VQE Hamiltonian Ansatz\nimport numpy as np\n';
    fs.writeFileSync(path.join(workspace.root, testFile), testContent, 'utf8');

    // Store a memory in Quantum-SIS LTM
    longTermMemory.store(['quantum', 'vqe'], {
      content: 'VQE optimizes expectation value <psi(theta)|H|psi(theta)>',
      type: 'quantum-theory',
      tags: ['vqe', 'quantum'],
    });

    // Verify file exists in Quantum-SIS workspace
    assert.ok(fs.existsSync(path.join(quantumSys.paths.workspaceDir, testFile)));

    // Verify file does NOT exist in default workspace
    const defaultSys = systemManager.getSystem('default');
    assert.strictEqual(
      fs.existsSync(path.join(defaultSys.paths.workspaceDir, testFile)),
      false,
      'Default workspace must remain unaffected',
    );
  });

  test('Hot-swap back to default restores default workspace and memory', () => {
    systemManager.switchSystem('default');
    const defaultSys = systemManager.getSystem('default');
    assert.strictEqual(systemManager.activeSystemId, 'default');
    assert.strictEqual(
      workspace.root,
      defaultSys.paths.workspaceDir,
      'Workspace root must point back to default workspace',
    );

    // Verify default workspace does not contain Quantum-SIS files
    assert.strictEqual(fs.existsSync(path.join(workspace.root, 'vqe_ansatz.py')), false);
  });

  // 6. Field Specialization & Curriculum Training
  await asyncTest('Train Quantum-SIS with specialized domain curriculum', async () => {
    // Switch to quantum system to train it
    systemManager.switchSystem(quantumSys.id);

    const trainResult = await systemManager.trainSystem(quantumSys.id, {
      topic: 'VQE Noise Mitigation & Zero Noise Extrapolation',
      curriculum: `
### Domain Curriculum: Zero-Noise Extrapolation (ZNE)
ZNE scales the hardware noise by pulse stretching or unitary folding:
U -> U * (U_dagger * U)^n
Expectation values are measured at scale factors c in {1, 3, 5}.
Richardson extrapolation or polynomial curve fitting extrapolates to noise limit c -> 0.
      `,
      instructions: 'Always use Richardson extrapolation for pulse scaling depths <= 5.',
      triggerCycle: false,
    });

    assert.strictEqual(trainResult.success, true);
    assert.strictEqual(trainResult.systemId, quantumSys.id);
    assert.strictEqual(trainResult.trainingLevel, 2, 'Training level should increment to 2');

    // Verify memory node stored in Quantum-SIS LTM
    const qLTM = JSON.parse(fs.readFileSync(quantumSys.paths.ltmPath, 'utf8'));
    const trainingNode = (qLTM.children || []).find(
      (c) => c.content === 'training' || c.type === 'category',
    );
    assert.ok(trainingNode, 'Training category must exist in LTM');

    // Verify updated stats
    const updatedSys = systemManager.getSystem(quantumSys.id);
    assert.strictEqual(updatedSys.trainingLevel, 2);
    assert.strictEqual(updatedSys.trainingSessions.length, 1);
  });

  // 7. Deletion of Custom Systems and Protection of Default System
  test('Default SIS // MK-10 cannot be deleted', () => {
    assert.throws(
      () => {
        systemManager.deleteSystem('default');
      },
      /cannot be deleted/i,
      'Deleting default system must throw error',
    );
  });

  test('Delete custom system BioAgent-SIS cleans up registry and disk', () => {
    const bioRoot = bioSys.paths.sysRoot;
    assert.ok(fs.existsSync(bioRoot), 'Bio system root must exist before deletion');

    const delRes = systemManager.deleteSystem(bioSys.id);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(delRes.deletedId, bioSys.id);
    assert.strictEqual(systemManager.getSystem(bioSys.id), null, 'Must be removed from manager');
    assert.strictEqual(fs.existsSync(bioRoot), false, 'Disk directory must be deleted');
  });

  // Cleanup test quantum system
  test('Cleanup test Quantum-SIS system', () => {
    systemManager.switchSystem('default');
    const delRes = systemManager.deleteSystem(quantumSys.id);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(systemManager.getSystem(quantumSys.id), null);
    assert.strictEqual(fs.existsSync(quantumSys.paths.sysRoot), false);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
