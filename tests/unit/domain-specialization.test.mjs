import test from 'node:test';
import assert from 'node:assert/strict';
import { domainSystemTools } from '../../server/tools/domain-system-tools.js';
import systemManager from '../../server/systems/manager.js';

test('Domain Specialization: agent can create, switch, inspect, and train domain systems', async () => {
  // 1. Inspect existing active system
  const initialActive = domainSystemTools.get_active_domain_system.execute();
  assert.ok(initialActive, 'Must have an active system');
  assert.ok(initialActive.id, 'Active system must have an ID');

  // 2. Create a specialized domain for Robotics
  const roboticsDomain = domainSystemTools.create_domain_system.execute({
    name: 'SIS-Robotics-Test',
    field: 'Robotics & Control Systems',
    trainingObjective: 'Master URDF kinematics and inverse dynamics in simulation',
    description: 'Autonomous robotics synthesis test instance',
  });

  assert.ok(roboticsDomain.id.startsWith('sis-sis-robotics-test'));
  assert.equal(roboticsDomain.field, 'Robotics & Control Systems');
  assert.equal(roboticsDomain.trainingLevel, 1);
  assert.ok(roboticsDomain.paths.workspaceDir);

  // 3. Create a specialized domain for Silicon Chip Design
  const siliconDomain = domainSystemTools.create_domain_system.execute({
    name: 'SIS-Silicon-Test',
    field: 'VLSI Chip Design & RTL Synthesis',
    trainingObjective: 'Autonomous RISC-V core generation and Verilator verification',
    description: 'Hardware architecture test instance',
  });

  assert.ok(siliconDomain.id.startsWith('sis-sis-silicon-test'));
  assert.equal(siliconDomain.field, 'VLSI Chip Design & RTL Synthesis');

  // 4. List domain systems and verify both are registered
  const listResult = domainSystemTools.list_domain_systems.execute();
  assert.ok(listResult.systems.length >= 2);
  const foundRobotics = listResult.systems.find((s) => s.id === roboticsDomain.id);
  const foundSilicon = listResult.systems.find((s) => s.id === siliconDomain.id);
  assert.ok(foundRobotics, 'Robotics system must be listed');
  assert.ok(foundSilicon, 'Silicon system must be listed');

  // 5. Switch active system to Robotics
  const switchRobotics = domainSystemTools.switch_domain_system.execute({
    systemId: roboticsDomain.id,
  });
  assert.equal(switchRobotics.id, roboticsDomain.id);
  assert.equal(domainSystemTools.get_active_domain_system.execute().id, roboticsDomain.id);

  // 6. Train the Robotics system with curriculum
  const trainResult = await domainSystemTools.train_domain_system.execute({
    systemId: roboticsDomain.id,
    topic: 'Forward Kinematics',
    curriculum:
      'Denavit-Hartenberg parameters: [a, alpha, d, theta]. Transformation matrix T_i = Rot_z * Trans_z * Trans_x * Rot_x.',
    instructions: 'Compute homogenous transformation matrices for serial kinematic chains.',
    triggerCycle: false,
  });

  assert.equal(trainResult.success, true);
  assert.equal(trainResult.trainingLevel, 2);
  assert.equal(trainResult.session.topic, 'Forward Kinematics');

  // 7. Clean up test systems
  systemManager.deleteSystem(roboticsDomain.id);
  systemManager.deleteSystem(siliconDomain.id);

  // Re-switch back to default if needed
  systemManager.switchSystem(initialActive.id);
});
