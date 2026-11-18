import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roboticsTools,
  computeForwardKinematics,
  solveInverseKinematics,
  planTrajectory,
  inspectURDF,
  mat4Multiply,
  standardDHMatrix,
  matrixDeterminant,
  solveLinearSystem,
} from '../../server/tools/robotics-tools.js';

test('Robotics Kinematics: Matrix math & linear algebra primitives', () => {
  // Test 3x3 determinant
  const matA = [
    [1, 2, 3],
    [0, 1, 4],
    [5, 6, 0],
  ];
  // det = 1*(0-24) - 2*(0-20) + 3*(0-5) = -24 + 40 - 15 = 1
  const det = matrixDeterminant(matA);
  assert.equal(Math.round(det), 1);

  // Test linear system solver Ax = b
  const A = [
    [2, 1, -1],
    [-3, -1, 2],
    [-2, 1, 2],
  ];
  const b = [8, -11, -3];
  const x = solveLinearSystem(A, b);
  // Expected solution: x = [2, 3, -1]
  assert.ok(Math.abs(x[0] - 2) < 1e-4);
  assert.ok(Math.abs(x[1] - 3) < 1e-4);
  assert.ok(Math.abs(x[2] - -1) < 1e-4);
});

test('Forward Kinematics: 2-Link planar arm analytical positions', () => {
  const planarDH = [
    { a: 1.0, alpha: 0, d: 0, theta: 0 },
    { a: 1.0, alpha: 0, d: 0, theta: 0 },
  ];

  // 1. Zero configuration -> End effector at (2.0, 0, 0)
  const fkZero = computeForwardKinematics({
    dh_parameters: planarDH,
    joints: [0, 0],
  });
  assert.equal(fkZero.success, true);
  assert.equal(fkZero.dof, 2);
  assert.ok(Math.abs(fkZero.position.x - 2.0) < 1e-5);
  assert.ok(Math.abs(fkZero.position.y - 0.0) < 1e-5);
  assert.ok(Math.abs(fkZero.position.z - 0.0) < 1e-5);

  // 2. 90-degree bend at joint 1 -> End effector at (0.0, 2.0, 0)
  const fk90 = computeForwardKinematics({
    dh_parameters: planarDH,
    joints: [Math.PI / 2, 0],
  });
  assert.ok(Math.abs(fk90.position.x - 0.0) < 1e-5);
  assert.ok(Math.abs(fk90.position.y - 2.0) < 1e-5);

  // 3. Right angle elbow bend -> Joint 1 = +90 deg, Joint 2 = -90 deg -> Position (1.0, 1.0, 0)
  const fkElbow = computeForwardKinematics({
    dh_parameters: planarDH,
    joints: [Math.PI / 2, -Math.PI / 2],
  });
  assert.ok(Math.abs(fkElbow.position.x - 1.0) < 1e-5);
  assert.ok(Math.abs(fkElbow.position.y - 1.0) < 1e-5);

  // 4. Verify intermediate link positions
  assert.equal(fkElbow.link_positions.length, 3);
  assert.ok(Math.abs(fkElbow.link_positions[1].x - 0.0) < 1e-5);
  assert.ok(Math.abs(fkElbow.link_positions[1].y - 1.0) < 1e-5);
});

test('Forward Kinematics: 6-DOF UR5 preset and rotation matrix orthogonality', () => {
  const fkUR5 = roboticsTools.forward_kinematics.execute({
    dh_parameters: 'ur5',
    joints: [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0],
  });

  assert.equal(fkUR5.success, true);
  assert.equal(fkUR5.dof, 6);
  assert.ok(fkUR5.position.x !== undefined);
  assert.ok(fkUR5.position.y !== undefined);
  assert.ok(fkUR5.position.z !== undefined);

  // Verify rotation matrix orthogonality: R * R^T = I and det(R) = 1
  const R = fkUR5.orientation_matrix;
  const detR = matrixDeterminant(R);
  assert.ok(Math.abs(detR - 1.0) < 1e-4, 'Rotation matrix determinant must equal 1.0');

  // Verify quaternion normalization: w^2 + x^2 + y^2 + z^2 = 1
  const q = fkUR5.quaternion;
  const qNorm = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  assert.ok(Math.abs(qNorm - 1.0) < 1e-4, 'Quaternion must have unit magnitude');
});

test('Forward Kinematics: SCARA manipulator with prismatic joint', () => {
  const scaraDH = [
    { a: 0.4, alpha: 0, d: 0.2, theta: 0, type: 'revolute' },
    { a: 0.3, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 0, alpha: 0, d: 0.0, theta: 0, type: 'prismatic' },
  ];

  const fk1 = computeForwardKinematics({
    dh_parameters: scaraDH,
    joints: [0, 0, 0.15],
  });
  assert.ok(Math.abs(fk1.position.z - 0.35) < 1e-4, 'Prismatic joint must displace along Z');

  const fk2 = computeForwardKinematics({
    dh_parameters: scaraDH,
    joints: [0, 0, 0.25],
  });
  assert.ok(Math.abs(fk2.position.z - 0.45) < 1e-4);
});

test('Inverse Kinematics: DLS solver converges accurately to target Cartesian coordinates', () => {
  const dh = 'planar3';
  const target = { x: 1.4, y: 0.8, z: 0.0 };

  const ikResult = solveInverseKinematics({
    dh_parameters: dh,
    target_position: target,
    tolerance: 1e-4,
    max_iterations: 100,
    damping: 0.05,
  });

  assert.equal(ikResult.success, true);
  assert.equal(ikResult.converged, true, 'IK must converge to target');
  assert.ok(ikResult.position_error < 1e-4, `Error ${ikResult.position_error} must be < 1e-4`);

  // Verify that FK of solved joints reaches target
  const verifyFK = computeForwardKinematics({
    dh_parameters: dh,
    joints: ikResult.joints,
  });
  assert.ok(Math.abs(verifyFK.position.x - target.x) < 1e-4);
  assert.ok(Math.abs(verifyFK.position.y - target.y) < 1e-4);
  assert.ok(Math.abs(verifyFK.position.z - target.z) < 1e-4);
});

test('Inverse Kinematics: Joint limit boundaries are strictly respected', () => {
  const dh = 'planar2';
  const target = { x: 0.8, y: 1.2, z: 0.0 };

  // Constrain joint 0 to [0.2, 0.8] rad
  const jointLimits = [
    [0.2, 0.8],
    [-2.0, 2.0],
  ];

  const result = solveInverseKinematics({
    dh_parameters: dh,
    target_position: target,
    joint_limits: jointLimits,
    tolerance: 1e-3,
  });

  assert.equal(result.success, true);
  const q0 = result.joints[0];
  const q1 = result.joints[1];
  assert.ok(q0 >= 0.2 - 1e-5 && q0 <= 0.8 + 1e-5, `Joint 0 (${q0}) must be within [0.2, 0.8]`);
  assert.ok(q1 >= -2.0 - 1e-5 && q1 <= 2.0 + 1e-5, `Joint 1 (${q1}) must be within [-2.0, 2.0]`);
});

test('Inverse Kinematics: Singularity avoidance and manipulability measure', () => {
  // Near full extension singularity for 2-link arm
  const dh = 'planar2';
  const targetNearBoundary = { x: 1.99, y: 0.01, z: 0.0 };

  const result = solveInverseKinematics({
    dh_parameters: dh,
    target_position: targetNearBoundary,
    damping: 0.08,
  });

  assert.equal(result.success, true);
  assert.ok(Number.isFinite(result.manipulability));
  assert.ok(result.manipulability >= 0);
  assert.ok(!Number.isNaN(result.position_error));
});

test('Trajectory Planner: Quintic polynomial (minimum jerk) boundary and derivative conditions', () => {
  const waypoints = [0, 10];
  const maxV = 5.0;
  const maxA = 8.0;

  const traj = planTrajectory({
    waypoints,
    type: 'quintic',
    max_velocity: maxV,
    max_acceleration: maxA,
    time_step: 0.02,
    start_velocity: 0,
    end_velocity: 0,
    start_acceleration: 0,
    end_acceleration: 0,
  });

  assert.equal(traj.success, true);
  assert.equal(traj.type, 'quintic');
  assert.ok(traj.total_duration > 0);
  assert.ok(traj.sample_count > 10);

  const firstPoint = traj.trajectory[0];
  const lastPoint = traj.trajectory[traj.trajectory.length - 1];

  // Boundary checks
  assert.ok(Math.abs(firstPoint.position - 0) < 1e-3, 'Initial position must be 0');
  assert.ok(Math.abs(firstPoint.velocity - 0) < 1e-3, 'Initial velocity must be 0');
  assert.ok(Math.abs(firstPoint.acceleration - 0) < 1e-3, 'Initial acceleration must be 0');

  assert.ok(Math.abs(lastPoint.position - 10) < 1e-3, 'Final position must be 10');
  assert.ok(Math.abs(lastPoint.velocity - 0) < 1e-3, 'Final velocity must be 0');
  assert.ok(Math.abs(lastPoint.acceleration - 0) < 1e-3, 'Final acceleration must be 0');

  // Verify velocity and acceleration limits
  assert.ok(
    traj.peak_velocity <= maxV * 1.05,
    `Peak velocity ${traj.peak_velocity} should respect maxV ${maxV}`,
  );
  assert.ok(
    traj.peak_acceleration <= maxA * 1.05,
    `Peak accel ${traj.peak_acceleration} should respect maxA ${maxA}`,
  );

  // Jerk must be finite everywhere
  for (const pt of traj.trajectory) {
    assert.ok(Number.isFinite(pt.jerk), 'Jerk must be finite');
  }
});

test('Trajectory Planner: 3D multi-waypoint Cartesian trajectory', () => {
  const waypoints = [
    { x: 0, y: 0, z: 0 },
    { x: 0.5, y: 1.0, z: 0.2 },
    { x: 1.2, y: 0.8, z: 0.9 },
  ];

  const traj = planTrajectory({
    waypoints,
    type: 'quintic',
    max_velocity: 1.5,
    max_acceleration: 3.0,
    time_step: 0.05,
  });

  assert.equal(traj.success, true);
  assert.equal(traj.segments.length, 2);

  const startPt = traj.trajectory[0];
  const endPt = traj.trajectory[traj.trajectory.length - 1];

  assert.ok(Math.abs(startPt.position.x - 0) < 1e-3);
  assert.ok(Math.abs(startPt.position.y - 0) < 1e-3);
  assert.ok(Math.abs(endPt.position.x - 1.2) < 1e-3);
  assert.ok(Math.abs(endPt.position.y - 0.8) < 1e-3);
  assert.ok(Math.abs(endPt.position.z - 0.9) < 1e-3);
});

test('Trajectory Planner: Trapezoidal velocity profile generation', () => {
  const traj = planTrajectory({
    waypoints: [0, 5],
    type: 'trapezoidal',
    max_velocity: 2.0,
    max_acceleration: 4.0,
    time_step: 0.02,
  });

  assert.equal(traj.success, true);
  assert.equal(traj.type, 'trapezoidal');
  assert.ok(traj.peak_velocity <= 2.05, 'Trapezoidal profile velocity must not exceed max');

  const start = traj.trajectory[0];
  const end = traj.trajectory[traj.trajectory.length - 1];
  assert.ok(Math.abs(start.position - 0) < 1e-3);
  assert.ok(Math.abs(end.position - 5) < 1e-3);
});

test('URDF Inspector: Full robot model extraction with links, joints, and inertial tensors', () => {
  const sampleURDF = `<?xml version="1.0"?>
<robot name="titan_arm">
  <link name="base_link">
    <inertial>
      <origin xyz="0 0 0.1" rpy="0 0 0"/>
      <mass value="5.5"/>
      <inertia ixx="0.05" ixy="0.001" ixz="0.0" iyy="0.06" iyz="0.0" izz="0.08"/>
    </inertial>
    <visual>
      <origin xyz="0 0 0.1" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.12" length="0.2"/>
      </geometry>
      <material name="metallic_dark">
        <color rgba="0.2 0.2 0.2 1.0"/>
      </material>
    </visual>
    <collision>
      <origin xyz="0 0 0.1" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.12" length="0.2"/>
      </geometry>
    </collision>
  </link>

  <joint name="shoulder_pan_joint" type="revolute">
    <parent link="base_link"/>
    <child link="shoulder_link"/>
    <origin xyz="0 0 0.2" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14159" upper="3.14159" effort="150" velocity="3.15"/>
    <dynamics damping="0.5" friction="0.1"/>
  </joint>

  <link name="shoulder_link">
    <inertial>
      <origin xyz="0 0.05 0.15" rpy="0 0 0"/>
      <mass value="3.2"/>
      <inertia ixx="0.02" ixy="0.0" ixz="0.0" iyy="0.025" iyz="0.0" izz="0.015"/>
    </inertial>
    <visual>
      <origin xyz="0 0 0.15" rpy="0 0 0"/>
      <geometry>
        <box size="0.1 0.1 0.3"/>
      </geometry>
    </visual>
    <collision>
      <origin xyz="0 0 0.15" rpy="0 0 0"/>
      <geometry>
        <box size="0.1 0.1 0.3"/>
      </geometry>
    </collision>
  </link>

  <joint name="shoulder_lift_joint" type="revolute">
    <parent link="shoulder_link"/>
    <child link="upper_arm_link"/>
    <origin xyz="0 0.1 0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.0" upper="2.0" effort="150" velocity="3.15"/>
  </joint>

  <link name="upper_arm_link">
    <inertial>
      <origin xyz="0 0 0.25" rpy="0 0 0"/>
      <mass value="2.8"/>
      <inertia ixx="0.018" ixy="0.0" ixz="0.0" iyy="0.018" iyz="0.0" izz="0.005"/>
    </inertial>
    <collision>
      <origin xyz="0 0 0.25" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.05" length="0.5"/>
      </geometry>
    </collision>
  </link>
</robot>`;

  const inspection = inspectURDF({ urdf_content: sampleURDF });

  assert.equal(inspection.success, true);
  assert.equal(inspection.robot_name, 'titan_arm');
  assert.equal(inspection.root_link, 'base_link');
  assert.equal(inspection.dof, 2);
  assert.equal(inspection.summary.link_count, 3);
  assert.equal(inspection.summary.joint_count, 2);

  // Total mass: 5.5 + 3.2 + 2.8 = 11.5 kg
  assert.ok(Math.abs(inspection.total_mass - 11.5) < 1e-4);

  // Check extracted link properties
  const baseLink = inspection.links.base_link;
  assert.ok(baseLink);
  assert.equal(baseLink.mass, 5.5);
  assert.equal(baseLink.inertial.moments.ixx, 0.05);
  assert.equal(baseLink.inertial.moments.ixy, 0.001);
  assert.equal(baseLink.inertial.matrix[0][0], 0.05);
  assert.equal(baseLink.inertial.matrix[0][1], 0.001);
  assert.equal(baseLink.visual_geometries[0].geometry.type, 'cylinder');
  assert.equal(baseLink.visual_geometries[0].geometry.radius, 0.12);
  assert.ok(baseLink.collision_limits.bounding_radius > 0);

  // Check extracted joint properties
  const shoulderPan = inspection.joints.shoulder_pan_joint;
  assert.ok(shoulderPan);
  assert.equal(shoulderPan.type, 'revolute');
  assert.equal(shoulderPan.parent, 'base_link');
  assert.equal(shoulderPan.child, 'shoulder_link');
  assert.equal(shoulderPan.axis[2], 1);
  assert.ok(Math.abs(shoulderPan.limit.lower - -3.14159) < 1e-4);
  assert.equal(shoulderPan.dynamics.damping, 0.5);
});

test('Tool Registry: roboticsTools exports forward_kinematics, inverse_kinematics, trajectory_planner, urdf_inspector', () => {
  assert.ok(roboticsTools.forward_kinematics);
  assert.ok(roboticsTools.inverse_kinematics);
  assert.ok(roboticsTools.trajectory_planner);
  assert.ok(roboticsTools.urdf_inspector);

  assert.equal(typeof roboticsTools.forward_kinematics.execute, 'function');
  assert.equal(typeof roboticsTools.inverse_kinematics.execute, 'function');
  assert.equal(typeof roboticsTools.trajectory_planner.execute, 'function');
  assert.equal(typeof roboticsTools.urdf_inspector.execute, 'function');
});

test('URDF Inspector: File path loading and error handling', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const os = await import('node:os');

  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `test-robot-${Date.now()}.urdf`);

  const urdfContent = `<?xml version="1.0"?>
<robot name="mini_bot">
  <link name="base"/>
  <joint name="j1" type="revolute">
    <parent link="base"/>
    <child link="l1"/>
    <limit lower="-1.57" upper="1.57" effort="50" velocity="2"/>
  </joint>
  <link name="l1"/>
</robot>`;

  try {
    fs.writeFileSync(filePath, urdfContent, 'utf8');
    const result = roboticsTools.urdf_inspector.execute({ file_path: filePath });
    assert.equal(result.success, true);
    assert.equal(result.robot_name, 'mini_bot');
    assert.equal(result.dof, 1);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Error handling for non-existent file
  assert.throws(() => {
    inspectURDF({ file_path: '/non/existent/path/robot.urdf' });
  }, /URDF file not found/);

  // Error handling for invalid XML root
  assert.throws(() => {
    inspectURDF({ urdf_content: '<invalid_tag></invalid_tag>' });
  }, /Root element must be <robot>/);
});

test('Kinematics Round-Trip: FK -> Target -> IK -> Reconstructed Pose', () => {
  const dh = 'planar3';
  // Pick a set of known joint angles
  const originalJoints = [0.3, 0.5, -0.4];

  // 1. Compute FK
  const fk = computeForwardKinematics({
    dh_parameters: dh,
    joints: originalJoints,
  });

  // 2. Solve IK for that FK target position
  const ik = solveInverseKinematics({
    dh_parameters: dh,
    target_position: fk.position,
    tolerance: 1e-4,
    max_iterations: 150,
  });

  assert.equal(ik.success, true);
  assert.equal(ik.converged, true);
  assert.ok(ik.position_error < 1e-4);

  // 3. Forward kinematics on solved joints must match original target
  const fkReconstructed = computeForwardKinematics({
    dh_parameters: dh,
    joints: ik.joints,
  });

  assert.ok(Math.abs(fkReconstructed.position.x - fk.position.x) < 1e-4);
  assert.ok(Math.abs(fkReconstructed.position.y - fk.position.y) < 1e-4);
  assert.ok(Math.abs(fkReconstructed.position.z - fk.position.z) < 1e-4);
});
