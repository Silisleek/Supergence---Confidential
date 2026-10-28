// Verification test suite for User Focus & 24/7 Recursive Self-Improvement (RSI) Engine

import userFocusTracker from '../../server/improvement/user-focus-tracker.js';
import autonomousLearner from '../../server/improvement/autonomous-learner.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runVerification() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   VERIFYING USER-CENTRIC RECURSIVE SELF-IMPROVEMENT (RSI)    ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Initialize Tracker & Bootstrap from Historical Conversations
  console.log('--- 1. Historical Ingestion & Bootstrap Test ---');
  await userFocusTracker.initialize();
  const profile = userFocusTracker.getGravityProfile();

  assert(
    profile.totalInteractions >= 0,
    `Profile initialized with ${profile.totalInteractions} interactions tracked.`,
  );
  assert(Array.isArray(profile.domainDistribution), 'Domain distribution is an array.');
  assert(profile.domainDistribution.length > 0, `Top domain detected: "${profile.topDomain}".`);
  console.log('Domain Distribution:', profile.domainDistribution.slice(0, 4));

  // 2. Real-Time Interaction Ingestion
  console.log('\n--- 2. Real-Time Telemetry & Domain Gravity Test ---');
  const prevCount = profile.totalInteractions;

  userFocusTracker.recordInteraction({
    userMessage: 'Can you generate a Three.js scene with procedural shaders and export to blender?',
    toolsUsed: ['generate_3d_scene', 'blender_create'],
    partsUsed: ['coder', '3d-modeler', 'designer'],
    reviewIssues: [],
    isCorrection: false,
    qualityScore: 0.96,
  });

  const updatedProfile = userFocusTracker.getGravityProfile();
  assert(
    updatedProfile.totalInteractions === prevCount + 1,
    'Interaction count incremented correctly.',
  );
  assert(
    updatedProfile.topTools.some(
      (t) => t.name === 'generate_3d_scene' || t.name === 'blender_create',
    ),
    'Tool execution recorded in telemetry.',
  );

  // 3. Friction & User Correction Recording
  console.log('\n--- 3. Friction Point & User Correction Tracking ---');
  userFocusTracker.recordInteraction({
    userMessage:
      "No, that's wrong, the Blender script failed with an error in material setup, fix this!",
    toolsUsed: [{ tool: 'blender_create', error: true, success: false }],
    partsUsed: ['debugger', 'coder'],
    reviewIssues: [{ reason: 'material unclosed brace' }],
    isCorrection: true,
    qualityScore: 0.7,
  });

  const frictionProfile = userFocusTracker.getGravityProfile();
  assert(frictionProfile.recentFriction.length > 0, 'Recent friction points logged.');
  assert(
    frictionProfile.recentFriction.some((f) => f.type === 'user-correction'),
    'User correction signal captured.',
  );
  console.log('Recent friction items:', frictionProfile.recentFriction.slice(0, 2));

  // 4. Inquiry Guidance Generation for AutonomousLearner
  console.log('\n--- 4. Autonomous Learner Inquiry Guidance Test ---');
  const guidance = userFocusTracker.getInquiryGuidance();
  assert(
    Boolean(guidance.topDomains),
    `Inquiry guidance generated with top domains: ${guidance.topDomains}`,
  );
  assert(Boolean(guidance.topTools), `Inquiry guidance lists top tools: ${guidance.topTools}`);
  assert(guidance.recentFriction !== undefined, 'Inquiry guidance contains friction signals.');

  // 5. Autonomous Skill Compilation & Persistence (Voyager / ExpeL)
  console.log('\n--- 5. Autonomous Skill Compiler (Voyager / ExpeL) Test ---');
  const mockCycle = {
    domain: '3d',
    question:
      'How can SIS optimize procedural Three.js instanced mesh LOD rendering to eliminate frame drops? [Spec-TEST]',
    masterScore: 0.98,
    finalScore: 0.98,
  };
  const mockMasterSolution =
    '```javascript\nfunction buildInstancedMeshLOD(count) { return new THREE.InstancedMesh(geom, mat, count); }\n```';
  const mockEmpiricalResult = { speedupMultiplier: 2.85 };
  const mockSimData = {
    rulesLearned: [
      'Use instanced matrices for static scene geometry',
      'Pool matrix buffers to reduce GC',
    ],
  };

  const compiledSkill = await autonomousLearner._compileAndRegisterLearnedSkill(
    mockCycle,
    mockMasterSolution,
    mockEmpiricalResult,
    mockSimData,
  );

  assert(
    compiledSkill && compiledSkill.id,
    `Skill successfully compiled with ID: ${compiledSkill?.id}`,
  );
  assert(
    fs.existsSync(path.join(__dirname, '../../data/skills/learned', `${compiledSkill.id}.json`)),
    'Skill JSON file written to disk.',
  );

  const skillsList = userFocusTracker.listLearnedSkills();
  assert(
    skillsList.some((s) => s.id === compiledSkill.id),
    'Skill registered in UserFocusTracker index.',
  );

  // Clean up test skill file
  try {
    const testFile = path.join(__dirname, '../../data/skills/learned', `${compiledSkill.id}.json`);
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  } catch {}

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
