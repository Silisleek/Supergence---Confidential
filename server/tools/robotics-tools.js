// SIS 1.0 — Real Robotics Kinematics & Physics Engine
// Provides high-precision forward kinematics, singularity-robust inverse kinematics,
// minimum-jerk / trapezoidal trajectory planning, and URDF robot model inspection.

import fs from 'node:fs';
import path from 'node:path';

// ─── Mathematical & Linear Algebra Utilities ──────────────────────────

export function mat4Identity() {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

export function mat4Multiply(a, b) {
  const out = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[r][k] * b[k][c];
      }
      out[r][c] = sum;
    }
  }
  return out;
}

export function mat4TransformPoint(m, p) {
  const x = p[0] ?? p.x ?? 0;
  const y = p[1] ?? p.y ?? 0;
  const z = p[2] ?? p.z ?? 0;
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3],
    m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3],
    m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3],
  ];
}

export function standardDHMatrix(theta, d, a, alpha) {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return [
    [ct, -st * ca, st * sa, a * ct],
    [st, ct * ca, -ct * sa, a * st],
    [0, sa, ca, d],
    [0, 0, 0, 1],
  ];
}

export function modifiedDHMatrix(theta, d, a, alpha) {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return [
    [ct, -st, 0, a],
    [st * ca, ct * ca, -sa, -d * sa],
    [st * sa, ct * sa, ca, d * ca],
    [0, 0, 0, 1],
  ];
}

export function crossProduct(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function vectorNorm(v) {
  return Math.sqrt(dotProduct(v, v));
}

export function matrixDeterminant(mat) {
  const n = mat.length;
  if (n === 1) return mat[0][0];
  if (n === 2) return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
  if (n === 3) {
    return (
      mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
      mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
      mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0])
    );
  }

  // Gaussian elimination LU determinant
  const M = mat.map((row) => Array.from(row));
  let det = 1;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(M[j][i]) > Math.abs(M[pivot][i])) pivot = j;
    }
    if (Math.abs(M[pivot][i]) < 1e-12) return 0;
    if (pivot !== i) {
      const temp = M[i];
      M[i] = M[pivot];
      M[pivot] = temp;
      det = -det;
    }
    det *= M[i][i];
    for (let j = i + 1; j < n; j++) {
      const factor = M[j][i] / M[i][i];
      for (let k = i + 1; k < n; k++) {
        M[j][k] -= factor * M[i][k];
      }
    }
  }
  return det;
}

export function solveLinearSystem(A, b) {
  const n = b.length;
  const M = A.map((row) => Array.from(row));
  const x = Array.from(b);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }
    if (maxVal < 1e-12) {
      M[i][i] += 1e-6;
    }
    if (maxRow !== i) {
      const tempRow = M[i];
      M[i] = M[maxRow];
      M[maxRow] = tempRow;
      const tempB = x[i];
      x[i] = x[maxRow];
      x[maxRow] = tempB;
    }

    const diag = M[i][i];
    for (let j = i; j < n; j++) {
      M[i][j] /= diag;
    }
    x[i] /= diag;

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        if (Math.abs(factor) > 1e-14) {
          for (let j = i; j < n; j++) {
            M[k][j] -= factor * M[i][j];
          }
          x[k] -= factor * x[i];
        }
      }
    }
  }
  return x;
}

export function rotationMatrixToEuler(R) {
  let pitch = Math.atan2(-R[2][0], Math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0]));
  let roll, yaw;
  if (Math.abs(Math.cos(pitch)) > 1e-6) {
    roll = Math.atan2(R[2][1], R[2][2]);
    yaw = Math.atan2(R[1][0], R[0][0]);
  } else {
    roll = Math.atan2(-R[1][2], R[1][1]);
    yaw = 0;
  }
  return { roll, pitch, yaw };
}

export function rotationMatrixToQuaternion(R) {
  const tr = R[0][0] + R[1][1] + R[2][2];
  let w, x, y, z;
  if (tr > 0) {
    const s = 2.0 * Math.sqrt(tr + 1.0);
    w = 0.25 * s;
    x = (R[2][1] - R[1][2]) / s;
    y = (R[0][2] - R[2][0]) / s;
    z = (R[1][0] - R[0][1]) / s;
  } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const s = 2.0 * Math.sqrt(1.0 + R[0][0] - R[1][1] - R[2][2]);
    w = (R[2][1] - R[1][2]) / s;
    x = 0.25 * s;
    y = (R[0][1] + R[1][0]) / s;
    z = (R[0][2] + R[2][0]) / s;
  } else if (R[1][1] > R[2][2]) {
    const s = 2.0 * Math.sqrt(1.0 + R[1][1] - R[0][0] - R[2][2]);
    w = (R[0][2] - R[2][0]) / s;
    x = (R[0][1] + R[1][0]) / s;
    y = 0.25 * s;
    z = (R[1][2] + R[2][1]) / s;
  } else {
    const s = 2.0 * Math.sqrt(1.0 + R[2][2] - R[0][0] - R[1][1]);
    w = (R[1][0] - R[0][1]) / s;
    x = (R[0][2] + R[2][0]) / s;
    y = (R[1][2] + R[2][1]) / s;
    z = 0.25 * s;
  }
  return { w, x, y, z };
}

// ─── Robot Presets ────────────────────────────────────────────────────

export const ROBOT_PRESETS = {
  planar2: [
    { a: 1.0, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 1.0, alpha: 0, d: 0, theta: 0, type: 'revolute' },
  ],
  planar3: [
    { a: 1.0, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 1.0, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 0.5, alpha: 0, d: 0, theta: 0, type: 'revolute' },
  ],
  scara: [
    { a: 0.4, alpha: 0, d: 0.2, theta: 0, type: 'revolute' },
    { a: 0.3, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 0, alpha: 0, d: 0.1, theta: 0, type: 'prismatic' },
  ],
  ur5: [
    { a: 0, alpha: Math.PI / 2, d: 0.089159, theta: 0, type: 'revolute' },
    { a: -0.425, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: -0.39225, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 0, alpha: Math.PI / 2, d: 0.10915, theta: 0, type: 'revolute' },
    { a: 0, alpha: -Math.PI / 2, d: 0.09465, theta: 0, type: 'revolute' },
    { a: 0, alpha: 0, d: 0.0823, theta: 0, type: 'revolute' },
  ],
  puma560: [
    { a: 0, alpha: Math.PI / 2, d: 0.15005, theta: 0, type: 'revolute' },
    { a: 0.4318, alpha: 0, d: 0, theta: 0, type: 'revolute' },
    { a: 0.0203, alpha: -Math.PI / 2, d: 0, theta: 0, type: 'revolute' },
    { a: 0, alpha: Math.PI / 2, d: 0.4318, theta: 0, type: 'revolute' },
    { a: 0, alpha: -Math.PI / 2, d: 0, theta: 0, type: 'revolute' },
    { a: 0, alpha: 0, d: 0, theta: 0, type: 'revolute' },
  ],
};

function normalizeDHParams(dhInput) {
  if (typeof dhInput === 'string') {
    const key = dhInput.toLowerCase().trim();
    if (ROBOT_PRESETS[key]) {
      return normalizeDHParams(ROBOT_PRESETS[key]);
    }
    throw new Error(
      `Unknown robot preset: "${dhInput}". Available: ${Object.keys(ROBOT_PRESETS).join(', ')}`,
    );
  }
  if (!Array.isArray(dhInput) || dhInput.length === 0) {
    throw new Error('dh_parameters must be a non-empty array or recognized robot preset name.');
  }

  return dhInput.map((row) => {
    if (Array.isArray(row)) {
      return {
        theta: Number(row[0] ?? 0),
        d: Number(row[1] ?? 0),
        a: Number(row[2] ?? 0),
        alpha: Number(row[3] ?? 0),
        type: row[4] === 'prismatic' ? 'prismatic' : 'revolute',
        offset: 0,
      };
    }
    return {
      theta: Number(row.theta ?? row.th ?? 0),
      d: Number(row.d ?? 0),
      a: Number(row.a ?? row.r ?? 0),
      alpha: Number(row.alpha ?? row.alp ?? 0),
      type: row.type === 'prismatic' ? 'prismatic' : 'revolute',
      offset: Number(row.offset ?? 0),
    };
  });
}

// ─── 1. Forward Kinematics ────────────────────────────────────────────

export function computeForwardKinematics(args = {}) {
  const { dh_parameters, joints = [], convention = 'standard' } = args;
  const links = normalizeDHParams(dh_parameters);
  const n = links.length;

  let cumulativeTransform = mat4Identity();
  const linkTransforms = [cumulativeTransform];
  const linkPositions = [{ x: 0, y: 0, z: 0 }];

  for (let i = 0; i < n; i++) {
    const link = links[i];
    let theta = link.theta + (link.offset || 0);
    let d = link.d;
    const a = link.a;
    const alpha = link.alpha;

    if (joints[i] !== undefined && joints[i] !== null) {
      if (link.type === 'prismatic') {
        d += Number(joints[i]);
      } else {
        theta += Number(joints[i]);
      }
    }

    const A_i =
      convention === 'modified'
        ? modifiedDHMatrix(theta, d, a, alpha)
        : standardDHMatrix(theta, d, a, alpha);

    cumulativeTransform = mat4Multiply(cumulativeTransform, A_i);
    linkTransforms.push(cumulativeTransform);
    linkPositions.push({
      x: cumulativeTransform[0][3],
      y: cumulativeTransform[1][3],
      z: cumulativeTransform[2][3],
    });
  }

  const endTransform = cumulativeTransform;
  const position = {
    x: endTransform[0][3],
    y: endTransform[1][3],
    z: endTransform[2][3],
  };

  const orientationMatrix = [
    [endTransform[0][0], endTransform[0][1], endTransform[0][2]],
    [endTransform[1][0], endTransform[1][1], endTransform[1][2]],
    [endTransform[2][0], endTransform[2][1], endTransform[2][2]],
  ];

  const eulerAngles = rotationMatrixToEuler(orientationMatrix);
  const quaternion = rotationMatrixToQuaternion(orientationMatrix);

  return {
    success: true,
    dof: n,
    position,
    orientation_matrix: orientationMatrix,
    transform_matrix: endTransform,
    euler_angles: eulerAngles,
    quaternion,
    link_positions: linkPositions,
    link_transforms: linkTransforms,
  };
}

// ─── 2. Inverse Kinematics ────────────────────────────────────────────

export function solveInverseKinematics(args = {}) {
  const {
    dh_parameters,
    target_position,
    initial_joints,
    joint_limits,
    method = 'damped_least_squares',
    tolerance = 1e-4,
    max_iterations = 200,
    damping = 0.05,
  } = args;

  if (!target_position) {
    throw new Error('target_position { x, y, z } or [x, y, z] is required.');
  }

  const links = normalizeDHParams(dh_parameters);
  const n = links.length;

  const target = [
    target_position.x ?? target_position[0] ?? 0,
    target_position.y ?? target_position[1] ?? 0,
    target_position.z ?? target_position[2] ?? 0,
  ];

  let q =
    Array.isArray(initial_joints) && initial_joints.length === n
      ? initial_joints.map(Number)
      : new Array(n).fill(0);

  let bestQ = Array.from(q);
  let bestError = Infinity;
  let iterations = 0;
  let converged = false;
  let manipulability = 0;
  let inSingularity = false;

  for (let iter = 0; iter < max_iterations; iter++) {
    iterations = iter + 1;
    const fk = computeForwardKinematics({ dh_parameters: links, joints: q });
    const currentPos = [fk.position.x, fk.position.y, fk.position.z];

    const err = [target[0] - currentPos[0], target[1] - currentPos[1], target[2] - currentPos[2]];
    const errNorm = vectorNorm(err);

    if (errNorm < bestError) {
      bestError = errNorm;
      bestQ = Array.from(q);
    }

    if (errNorm <= tolerance) {
      converged = true;
      break;
    }

    // Compute Geometric Jacobian for position J_v (3 x n)
    const pEnd = currentPos;
    const J = [new Array(n), new Array(n), new Array(n)];

    for (let i = 0; i < n; i++) {
      const T_i = fk.link_transforms[i]; // Frame i-1
      const p_i = [T_i[0][3], T_i[1][3], T_i[2][3]];
      const z_i = [T_i[0][2], T_i[1][2], T_i[2][2]];

      if (links[i].type === 'prismatic') {
        J[0][i] = z_i[0];
        J[1][i] = z_i[1];
        J[2][i] = z_i[2];
      } else {
        const r = [pEnd[0] - p_i[0], pEnd[1] - p_i[1], pEnd[2] - p_i[2]];
        const jcol = crossProduct(z_i, r);
        J[0][i] = jcol[0];
        J[1][i] = jcol[1];
        J[2][i] = jcol[2];
      }
    }

    // JJ^T (3 x 3)
    const JJt = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += J[r][k] * J[c][k];
        }
        JJt[r][c] = sum;
      }
    }

    const detJJt = matrixDeterminant(JJt);
    manipulability = Math.sqrt(Math.max(0, detJJt));
    inSingularity = manipulability < 0.02;

    let deltaQ = new Array(n).fill(0);

    if (method === 'transpose') {
      const Jt_e = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        Jt_e[i] = J[0][i] * err[0] + J[1][i] * err[1] + J[2][i] * err[2];
      }
      const JJte = [
        JJt[0][0] * err[0] + JJt[0][1] * err[1] + JJt[0][2] * err[2],
        JJt[1][0] * err[0] + JJt[1][1] * err[1] + JJt[1][2] * err[2],
        JJt[2][0] * err[0] + JJt[2][1] * err[1] + JJt[2][2] * err[2],
      ];
      const alpha = dotProduct(err, JJte) / (dotProduct(JJte, JJte) + 1e-6);
      for (let i = 0; i < n; i++) {
        deltaQ[i] = alpha * Jt_e[i];
      }
    } else {
      let lambdaSq = method === 'pseudo_inverse' ? 1e-8 : damping * damping;
      if (inSingularity && method !== 'pseudo_inverse') {
        const ratio = Math.max(0, 1 - manipulability / 0.05);
        lambdaSq += ratio * ratio * 0.1;
      }

      const A = [
        [JJt[0][0] + lambdaSq, JJt[0][1], JJt[0][2]],
        [JJt[1][0], JJt[1][1] + lambdaSq, JJt[1][2]],
        [JJt[2][0], JJt[2][1], JJt[2][2] + lambdaSq],
      ];

      const y = solveLinearSystem(A, err);
      for (let i = 0; i < n; i++) {
        deltaQ[i] = J[0][i] * y[0] + J[1][i] * y[1] + J[2][i] * y[2];
      }
    }

    // Redundant DOF null space projection for joint centering
    if (n > 3 && Array.isArray(joint_limits)) {
      const qNull = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (joint_limits[i] && joint_limits[i].length === 2) {
          const [minVal, maxVal] = joint_limits[i];
          const mid = (minVal + maxVal) / 2;
          const range = maxVal - minVal || 1;
          qNull[i] = -0.1 * ((q[i] - mid) / range);
        }
      }
      for (let i = 0; i < n; i++) {
        deltaQ[i] += qNull[i];
      }
    }

    // Step size clamping to prevent wild divergence
    const maxStep = 0.35;
    for (let i = 0; i < n; i++) {
      if (deltaQ[i] > maxStep) deltaQ[i] = maxStep;
      if (deltaQ[i] < -maxStep) deltaQ[i] = -maxStep;
      q[i] += deltaQ[i];
    }

    // Enforce joint limits boundaries
    if (Array.isArray(joint_limits)) {
      for (let i = 0; i < n; i++) {
        if (joint_limits[i] && joint_limits[i].length === 2) {
          const [minVal, maxVal] = joint_limits[i];
          if (q[i] < minVal) q[i] = minVal;
          if (q[i] > maxVal) q[i] = maxVal;
        }
      }
    }
  }

  const finalFK = computeForwardKinematics({
    dh_parameters: links,
    joints: converged ? q : bestQ,
  });

  return {
    success: true,
    converged,
    joints: (converged ? q : bestQ).map((val) => Number(val.toFixed(6))),
    target_position: { x: target[0], y: target[1], z: target[2] },
    final_position: finalFK.position,
    position_error: Number((converged ? bestError : bestError).toFixed(6)),
    iterations,
    manipulability: Number(manipulability.toFixed(6)),
    in_singularity: inSingularity,
  };
}

// ─── 3. Trajectory Planner ────────────────────────────────────────────

function normalizeWaypoints(raw) {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('waypoints must be an array of at least 2 points.');
  }

  const isObject = typeof raw[0] === 'object' && raw[0] !== null && !Array.isArray(raw[0]);
  const isNumber = typeof raw[0] === 'number';

  if (isNumber) {
    return {
      points: raw.map((p) => [Number(p)]),
      dimension: 1,
      format: 'number',
    };
  }

  if (isObject) {
    const keys = ['x', 'y', 'z'].filter((k) => raw[0][k] !== undefined);
    const dim = keys.length || 3;
    const points = raw.map((pt) => keys.map((k) => Number(pt[k] ?? 0)));
    return { points, dimension: dim, format: 'object', keys };
  }

  const dim = raw[0].length;
  const points = raw.map((pt) => Array.from(pt).map(Number));
  return { points, dimension: dim, format: 'array' };
}

export function planTrajectory(args = {}) {
  const {
    waypoints,
    type = 'quintic',
    max_velocity = 1.0,
    max_acceleration = 2.0,
    time_step = 0.01,
    duration,
    start_velocity = 0,
    end_velocity = 0,
    start_acceleration = 0,
    end_acceleration = 0,
  } = args;

  const { points, dimension, format, keys } = normalizeWaypoints(waypoints);
  const numSegments = points.length - 1;

  const maxV = Array.isArray(max_velocity)
    ? max_velocity.map(Number)
    : new Array(dimension).fill(Number(max_velocity));
  const maxA = Array.isArray(max_acceleration)
    ? max_acceleration.map(Number)
    : new Array(dimension).fill(Number(max_acceleration));

  const segmentDurations = [];
  if (duration && duration > 0) {
    let totalDist = 0;
    const dists = [];
    for (let s = 0; s < numSegments; s++) {
      let d = 0;
      for (let k = 0; k < dimension; k++) {
        const diff = points[s + 1][k] - points[s][k];
        d += diff * diff;
      }
      d = Math.sqrt(d) || 1e-5;
      dists.push(d);
      totalDist += d;
    }
    for (let s = 0; s < numSegments; s++) {
      segmentDurations.push(duration * (dists[s] / totalDist));
    }
  } else {
    for (let s = 0; s < numSegments; s++) {
      let segDuration = 0.05;
      for (let k = 0; k < dimension; k++) {
        const delta = Math.abs(points[s + 1][k] - points[s][k]);
        const vLimit = maxV[k] || 1.0;
        const aLimit = maxA[k] || 2.0;

        let td;
        if (type === 'trapezoidal') {
          const dAcc = (vLimit * vLimit) / aLimit;
          if (delta <= dAcc) {
            td = 2 * Math.sqrt(delta / aLimit);
          } else {
            td = (delta - dAcc) / vLimit + 2 * (vLimit / aLimit);
          }
        } else {
          const tv = (1.875 * delta) / vLimit;
          const ta = Math.sqrt((5.7735 * delta) / aLimit);
          td = Math.max(tv, ta);
        }
        if (td > segDuration) segDuration = td;
      }
      segmentDurations.push(Math.max(0.1, segDuration));
    }
  }

  const totalDuration = segmentDurations.reduce((sum, d) => sum + d, 0);

  const nodeVelocities = Array.from({ length: points.length }, () => new Array(dimension).fill(0));
  const nodeAccelerations = Array.from({ length: points.length }, () =>
    new Array(dimension).fill(0),
  );

  for (let k = 0; k < dimension; k++) {
    nodeVelocities[0][k] = Array.isArray(start_velocity)
      ? (start_velocity[k] ?? 0)
      : Number(start_velocity);
    nodeVelocities[points.length - 1][k] = Array.isArray(end_velocity)
      ? (end_velocity[k] ?? 0)
      : Number(end_velocity);
    nodeAccelerations[0][k] = Array.isArray(start_acceleration)
      ? (start_acceleration[k] ?? 0)
      : Number(start_acceleration);
    nodeAccelerations[points.length - 1][k] = Array.isArray(end_acceleration)
      ? (end_acceleration[k] ?? 0)
      : Number(end_acceleration);
  }

  for (let s = 1; s < points.length - 1; s++) {
    const dtSum = segmentDurations[s - 1] + segmentDurations[s];
    for (let k = 0; k < dimension; k++) {
      nodeVelocities[s][k] = (points[s + 1][k] - points[s - 1][k]) / dtSum;
    }
  }

  const quinticCoeffs = [];
  if (type === 'quintic') {
    for (let s = 0; s < numSegments; s++) {
      const T = segmentDurations[s];
      const T2 = T * T;
      const T3 = T2 * T;
      const T4 = T3 * T;
      const T5 = T4 * T;
      const segCoeffs = [];

      for (let k = 0; k < dimension; k++) {
        const q0 = points[s][k];
        const q1 = points[s + 1][k];
        const v0 = nodeVelocities[s][k];
        const v1 = nodeVelocities[s + 1][k];
        const a0 = nodeAccelerations[s][k];
        const a1 = nodeAccelerations[s + 1][k];

        const c0 = q0;
        const c1 = v0;
        const c2 = 0.5 * a0;
        const c3 = (1 / (2 * T3)) * (20 * (q1 - q0) - (8 * v1 + 12 * v0) * T - (3 * a0 - a1) * T2);
        const c4 =
          (1 / (2 * T4)) * (30 * (q0 - q1) + (14 * v1 + 16 * v0) * T + (3 * a0 - 2 * a1) * T2);
        const c5 = (1 / (2 * T5)) * (12 * (q1 - q0) - 6 * (v1 + v0) * T - (a0 - a1) * T2);

        segCoeffs.push([c0, c1, c2, c3, c4, c5]);
      }
      quinticCoeffs.push(segCoeffs);
    }
  }

  const trajectory = [];
  let peakVelocity = 0;
  let peakAcceleration = 0;
  let peakJerk = 0;
  const dt = Math.max(0.001, Number(time_step));

  let currentSeg = 0;
  let segStartTime = 0;
  const numSteps = Math.ceil(totalDuration / dt);

  for (let step = 0; step <= numSteps; step++) {
    const t = Math.min(totalDuration, step * dt);

    while (currentSeg < numSegments - 1 && t > segStartTime + segmentDurations[currentSeg]) {
      segStartTime += segmentDurations[currentSeg];
      currentSeg++;
    }

    const segT = Math.min(segmentDurations[currentSeg], Math.max(0, t - segStartTime));
    const T = segmentDurations[currentSeg];

    const pos = [];
    const vel = [];
    const acc = [];
    const jerk = [];

    for (let k = 0; k < dimension; k++) {
      if (type === 'trapezoidal') {
        const q0 = points[currentSeg][k];
        const q1 = points[currentSeg + 1][k];
        const dist = q1 - q0;
        const dir = Math.sign(dist) || 1;
        const absDist = Math.abs(dist);

        const vMax = maxV[k];
        const aMax = maxA[k];
        const ta = Math.min(T / 2, vMax / aMax);
        const tv = T - 2 * ta;

        const actualV = absDist / (ta + tv || 1e-5);
        const actualA = actualV / (ta || 1e-5);

        let p_k, v_k, a_k;
        if (segT < ta) {
          a_k = dir * actualA;
          v_k = dir * actualA * segT;
          p_k = q0 + dir * 0.5 * actualA * segT * segT;
        } else if (segT < ta + tv) {
          a_k = 0;
          v_k = dir * actualV;
          p_k = q0 + dir * (0.5 * actualA * ta * ta + actualV * (segT - ta));
        } else {
          const tDec = segT - (ta + tv);
          a_k = -dir * actualA;
          v_k = dir * (actualV - actualA * tDec);
          p_k =
            q0 +
            dir *
              (0.5 * actualA * ta * ta +
                actualV * tv +
                actualV * tDec -
                0.5 * actualA * tDec * tDec);
        }
        pos.push(p_k);
        vel.push(v_k);
        acc.push(a_k);
        jerk.push(0);
      } else {
        const [c0, c1, c2, c3, c4, c5] = quinticCoeffs[currentSeg][k];
        const t1 = segT;
        const t2 = t1 * t1;
        const t3 = t2 * t1;
        const t4 = t3 * t1;
        const t5 = t4 * t1;

        const p_k = c0 + c1 * t1 + c2 * t2 + c3 * t3 + c4 * t4 + c5 * t5;
        const v_k = c1 + 2 * c2 * t1 + 3 * c3 * t2 + 4 * c4 * t3 + 5 * c5 * t4;
        const a_k = 2 * c2 + 6 * c3 * t1 + 12 * c4 * t2 + 20 * c5 * t3;
        const j_k = 6 * c3 + 24 * c4 * t1 + 60 * c5 * t2;

        pos.push(p_k);
        vel.push(v_k);
        acc.push(a_k);
        jerk.push(j_k);
      }
    }

    const currentVNorm = vectorNorm(vel);
    const currentANorm = vectorNorm(acc);
    const currentJNorm = vectorNorm(jerk);

    if (currentVNorm > peakVelocity) peakVelocity = currentVNorm;
    if (currentANorm > peakAcceleration) peakAcceleration = currentANorm;
    if (currentJNorm > peakJerk) peakJerk = currentJNorm;

    let formattedPos, formattedVel, formattedAcc;
    if (format === 'number') {
      formattedPos = pos[0];
      formattedVel = vel[0];
      formattedAcc = acc[0];
    } else if (format === 'object') {
      formattedPos = {};
      formattedVel = {};
      formattedAcc = {};
      keys.forEach((k, i) => {
        formattedPos[k] = pos[i];
        formattedVel[k] = vel[i];
        formattedAcc[k] = acc[i];
      });
    } else {
      formattedPos = pos;
      formattedVel = vel;
      formattedAcc = acc;
    }

    trajectory.push({
      time: Number(t.toFixed(4)),
      position: formattedPos,
      velocity: formattedVel,
      acceleration: formattedAcc,
      jerk: format === 'number' ? jerk[0] : jerk,
    });
  }

  return {
    success: true,
    type,
    total_duration: Number(totalDuration.toFixed(4)),
    time_step: dt,
    sample_count: trajectory.length,
    peak_velocity: Number(peakVelocity.toFixed(4)),
    peak_acceleration: Number(peakAcceleration.toFixed(4)),
    peak_jerk: Number(peakJerk.toFixed(4)),
    trajectory,
    segments: segmentDurations.map((d, i) => ({
      segment: i + 1,
      duration: Number(d.toFixed(4)),
      from: points[i],
      to: points[i + 1],
    })),
  };
}

// ─── 4. URDF XML Inspector ───────────────────────────────────────────

function parseAttributes(str) {
  const attrs = {};
  const regex = /([a-zA-Z0-9_\-:]+)\s*=\s*["']([^"']*)["']/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function parseXML(xmlString) {
  const clean = xmlString
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .trim();

  const tagRegex = /<([\/]?)([a-zA-Z0-9_\-:]+)((?:\s+[^=>\/]+=(?:"[^"]*"|'[^']*'))*)\s*([\/]?)>/g;
  let root = null;
  const stack = [];

  let match;
  while ((match = tagRegex.exec(clean)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attrString = match[3];
    const isSelfClosing = match[4] === '/';

    if (isClosing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tagName) {
          stack.length = i;
          break;
        }
      }
    } else {
      const node = {
        tag: tagName,
        attributes: parseAttributes(attrString),
        children: [],
      };

      if (!root) {
        root = node;
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      }

      if (!isSelfClosing) {
        stack.push(node);
      }
    }
  }

  return root;
}

function parseFloats(str, defaultCount = 3) {
  if (!str) return new Array(defaultCount).fill(0);
  const parts = str.trim().split(/\s+/).map(Number);
  while (parts.length < defaultCount) parts.push(0);
  return parts;
}

export function inspectURDF(args = {}) {
  let content = args.urdf_content || args.content || args.xml;
  if (!content && args.file_path) {
    if (!fs.existsSync(args.file_path)) {
      throw new Error(`URDF file not found at path: ${args.file_path}`);
    }
    content = fs.readFileSync(args.file_path, 'utf8');
  }

  if (!content || typeof content !== 'string') {
    throw new Error('Either urdf_content string or existing file_path must be provided.');
  }

  const ast = parseXML(content);
  if (!ast || ast.tag !== 'robot') {
    throw new Error('Invalid URDF: Root element must be <robot>.');
  }

  const robotName = ast.attributes.name || 'unnamed_robot';
  const links = {};
  const joints = {};
  const parentLinks = new Set();
  const childLinks = new Set();

  for (const child of ast.children) {
    if (child.tag === 'link') {
      const linkName = child.attributes.name;
      if (!linkName) continue;

      let mass = 0;
      let originInertial = { xyz: [0, 0, 0], rpy: [0, 0, 0] };
      let inertiaMatrix = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      let inertiaMoments = { ixx: 0, ixy: 0, ixz: 0, iyy: 0, iyz: 0, izz: 0 };

      const visualGeometries = [];
      const collisionGeometries = [];
      let collisionBoundingRadius = 0;

      for (const linkElem of child.children) {
        if (linkElem.tag === 'inertial') {
          for (const inElem of linkElem.children) {
            if (inElem.tag === 'mass') {
              mass = Number(inElem.attributes.value ?? 0);
            } else if (inElem.tag === 'origin') {
              originInertial = {
                xyz: parseFloats(inElem.attributes.xyz, 3),
                rpy: parseFloats(inElem.attributes.rpy, 3),
              };
            } else if (inElem.tag === 'inertia') {
              const ixx = Number(inElem.attributes.ixx ?? 0);
              const ixy = Number(inElem.attributes.ixy ?? 0);
              const ixz = Number(inElem.attributes.ixz ?? 0);
              const iyy = Number(inElem.attributes.iyy ?? 0);
              const iyz = Number(inElem.attributes.iyz ?? 0);
              const izz = Number(inElem.attributes.izz ?? 0);
              inertiaMoments = { ixx, ixy, ixz, iyy, iyz, izz };
              inertiaMatrix = [
                [ixx, ixy, ixz],
                [ixy, iyy, iyz],
                [ixz, iyz, izz],
              ];
            }
          }
        } else if (linkElem.tag === 'visual') {
          let geom = null;
          let visualOrigin = { xyz: [0, 0, 0], rpy: [0, 0, 0] };
          let material = null;

          for (const vElem of linkElem.children) {
            if (vElem.tag === 'origin') {
              visualOrigin = {
                xyz: parseFloats(vElem.attributes.xyz, 3),
                rpy: parseFloats(vElem.attributes.rpy, 3),
              };
            } else if (vElem.tag === 'geometry') {
              for (const gElem of vElem.children) {
                if (gElem.tag === 'box') {
                  geom = { type: 'box', size: parseFloats(gElem.attributes.size, 3) };
                } else if (gElem.tag === 'cylinder') {
                  geom = {
                    type: 'cylinder',
                    radius: Number(gElem.attributes.radius ?? 0),
                    length: Number(gElem.attributes.length ?? 0),
                  };
                } else if (gElem.tag === 'sphere') {
                  geom = { type: 'sphere', radius: Number(gElem.attributes.radius ?? 0) };
                } else if (gElem.tag === 'mesh') {
                  geom = { type: 'mesh', filename: gElem.attributes.filename };
                }
              }
            } else if (vElem.tag === 'material') {
              material = { name: vElem.attributes.name };
              for (const mElem of vElem.children) {
                if (mElem.tag === 'color') {
                  material.rgba = parseFloats(mElem.attributes.rgba, 4);
                }
              }
            }
          }

          visualGeometries.push({ origin: visualOrigin, geometry: geom, material });
        } else if (linkElem.tag === 'collision') {
          let geom = null;
          let collOrigin = { xyz: [0, 0, 0], rpy: [0, 0, 0] };

          for (const cElem of linkElem.children) {
            if (cElem.tag === 'origin') {
              collOrigin = {
                xyz: parseFloats(cElem.attributes.xyz, 3),
                rpy: parseFloats(cElem.attributes.rpy, 3),
              };
            } else if (cElem.tag === 'geometry') {
              for (const gElem of cElem.children) {
                if (gElem.tag === 'box') {
                  const size = parseFloats(gElem.attributes.size, 3);
                  geom = { type: 'box', size };
                  const r = 0.5 * Math.sqrt(size[0] ** 2 + size[1] ** 2 + size[2] ** 2);
                  if (r > collisionBoundingRadius) collisionBoundingRadius = r;
                } else if (gElem.tag === 'cylinder') {
                  const rad = Number(gElem.attributes.radius ?? 0);
                  const len = Number(gElem.attributes.length ?? 0);
                  geom = { type: 'cylinder', radius: rad, length: len };
                  const r = Math.sqrt(rad ** 2 + (0.5 * len) ** 2);
                  if (r > collisionBoundingRadius) collisionBoundingRadius = r;
                } else if (gElem.tag === 'sphere') {
                  const rad = Number(gElem.attributes.radius ?? 0);
                  geom = { type: 'sphere', radius: rad };
                  if (rad > collisionBoundingRadius) collisionBoundingRadius = rad;
                } else if (gElem.tag === 'mesh') {
                  geom = { type: 'mesh', filename: gElem.attributes.filename };
                }
              }
            }
          }

          collisionGeometries.push({ origin: collOrigin, geometry: geom });
        }
      }

      links[linkName] = {
        name: linkName,
        mass,
        inertial: {
          origin: originInertial,
          mass,
          moments: inertiaMoments,
          matrix: inertiaMatrix,
        },
        visual_geometries: visualGeometries,
        collision_geometries: collisionGeometries,
        collision_limits: {
          bounding_radius: Number(collisionBoundingRadius.toFixed(4)),
        },
      };
    } else if (child.tag === 'joint') {
      const jointName = child.attributes.name;
      const jointType = child.attributes.type || 'fixed';
      if (!jointName) continue;

      let parent = '';
      let childLink = '';
      let origin = { xyz: [0, 0, 0], rpy: [0, 0, 0] };
      let axis = [1, 0, 0];
      let limit = null;
      let dynamics = null;
      let safetyController = null;

      for (const jElem of child.children) {
        if (jElem.tag === 'parent') {
          parent = jElem.attributes.link;
          parentLinks.add(parent);
        } else if (jElem.tag === 'child') {
          childLink = jElem.attributes.link;
          childLinks.add(childLink);
        } else if (jElem.tag === 'origin') {
          origin = {
            xyz: parseFloats(jElem.attributes.xyz, 3),
            rpy: parseFloats(jElem.attributes.rpy, 3),
          };
        } else if (jElem.tag === 'axis') {
          axis = parseFloats(jElem.attributes.xyz, 3);
        } else if (jElem.tag === 'limit') {
          limit = {
            lower: jElem.attributes.lower !== undefined ? Number(jElem.attributes.lower) : -Math.PI,
            upper: jElem.attributes.upper !== undefined ? Number(jElem.attributes.upper) : Math.PI,
            effort: Number(jElem.attributes.effort ?? 100),
            velocity: Number(jElem.attributes.velocity ?? 1),
          };
        } else if (jElem.tag === 'dynamics') {
          dynamics = {
            damping: Number(jElem.attributes.damping ?? 0),
            friction: Number(jElem.attributes.friction ?? 0),
          };
        } else if (jElem.tag === 'safety_controller') {
          safetyController = {
            soft_lower_limit: Number(jElem.attributes.soft_lower_limit ?? 0),
            soft_upper_limit: Number(jElem.attributes.soft_upper_limit ?? 0),
            k_position: Number(jElem.attributes.k_position ?? 0),
            k_velocity: Number(jElem.attributes.k_velocity ?? 0),
          };
        }
      }

      joints[jointName] = {
        name: jointName,
        type: jointType,
        parent,
        child: childLink,
        origin,
        axis,
        limit,
        dynamics,
        safety_controller: safetyController,
      };
    }
  }

  const linkNames = Object.keys(links);
  let rootLink = linkNames.find((name) => !childLinks.has(name)) || linkNames[0] || 'base_link';

  const movableJoints = Object.values(joints).filter(
    (j) => j.type === 'revolute' || j.type === 'prismatic' || j.type === 'continuous',
  );

  let totalMass = 0;
  let comNumerator = [0, 0, 0];
  for (const l of Object.values(links)) {
    totalMass += l.mass;
    comNumerator[0] += l.mass * l.inertial.origin.xyz[0];
    comNumerator[1] += l.mass * l.inertial.origin.xyz[1];
    comNumerator[2] += l.mass * l.inertial.origin.xyz[2];
  }

  const centerOfMass =
    totalMass > 0
      ? [
          Number((comNumerator[0] / totalMass).toFixed(6)),
          Number((comNumerator[1] / totalMass).toFixed(6)),
          Number((comNumerator[2] / totalMass).toFixed(6)),
        ]
      : [0, 0, 0];

  return {
    success: true,
    robot_name: robotName,
    root_link: rootLink,
    dof: movableJoints.length,
    total_mass: Number(totalMass.toFixed(4)),
    center_of_mass: { x: centerOfMass[0], y: centerOfMass[1], z: centerOfMass[2] },
    links,
    joints,
    movable_joints: movableJoints.map((j) => ({
      name: j.name,
      type: j.type,
      parent: j.parent,
      child: j.child,
      limit: j.limit,
    })),
    summary: {
      link_count: linkNames.length,
      joint_count: Object.keys(joints).length,
      movable_joint_count: movableJoints.length,
      dof: movableJoints.length,
      total_mass_kg: Number(totalMass.toFixed(4)),
    },
  };
}

// ─── Robotics Tools Export (Registry Interface) ────────────────────────

export const roboticsTools = {
  forward_kinematics: {
    name: 'forward_kinematics',
    description:
      'Computes end-effector position and orientation matrix for N-DOF robotic arms using standard Denavit-Hartenberg (DH) parameters.',
    parameters: {
      dh_parameters: {
        type: 'array',
        description:
          'Array of DH link parameters { theta, d, a, alpha, type?: "revolute"|"prismatic", offset?: number }, 2D array [theta, d, a, alpha], or preset string ("ur5", "puma560", "scara", "planar2", "planar3").',
      },
      joints: {
        type: 'array',
        description: 'Optional joint angle/displacement values. Overrides or offsets theta/d.',
      },
      convention: {
        type: 'string',
        enum: ['standard', 'modified'],
        description: 'DH convention: "standard" (default) or "modified" (Craig).',
      },
    },
    required: ['dh_parameters'],
    execute: (args) => computeForwardKinematics(args || {}),
  },

  inverse_kinematics: {
    name: 'inverse_kinematics',
    description:
      'Solves joint angles for target 3D Cartesian coordinates (x, y, z) with joint limit boundaries and singularity avoidance (Damped Least Squares / Jacobian pseudo-inverse).',
    parameters: {
      dh_parameters: {
        type: 'array',
        description:
          'Array of DH link parameters or preset string ("ur5", "puma560", "scara", "planar2", "planar3").',
      },
      target_position: {
        type: 'object',
        description: 'Target Cartesian position { x, y, z } or array [x, y, z].',
      },
      initial_joints: {
        type: 'array',
        description: 'Optional initial joint angle guess.',
      },
      joint_limits: {
        type: 'array',
        description: 'Optional array of [min, max] joint limits in radians/meters.',
      },
      method: {
        type: 'string',
        enum: ['damped_least_squares', 'pseudo_inverse', 'transpose'],
        description:
          'Solver method: "damped_least_squares" (default), "pseudo_inverse", or "transpose".',
      },
      tolerance: {
        type: 'number',
        description: 'Convergence tolerance in meters (default 1e-4).',
      },
      max_iterations: {
        type: 'number',
        description: 'Maximum solver iterations (default 200).',
      },
      damping: {
        type: 'number',
        description: 'Damping coefficient lambda for singularity avoidance (default 0.05).',
      },
    },
    required: ['dh_parameters', 'target_position'],
    execute: (args) => solveInverseKinematics(args || {}),
  },

  trajectory_planner: {
    name: 'trajectory_planner',
    description:
      'Generates smooth quintic polynomial (minimum jerk) or trapezoidal velocity trajectories given waypoints, max velocity, and max acceleration.',
    parameters: {
      waypoints: {
        type: 'array',
        description:
          'List of waypoints: 1D numbers, 3D points { x, y, z }, or joint vectors [q0, q1, ...].',
      },
      type: {
        type: 'string',
        enum: ['quintic', 'trapezoidal'],
        description:
          'Trajectory profile type: "quintic" (minimum jerk) or "trapezoidal" (trapezoidal velocity). Default is "quintic".',
      },
      max_velocity: {
        description: 'Maximum allowable velocity (scalar or array per dimension).',
      },
      max_acceleration: {
        description: 'Maximum allowable acceleration (scalar or array per dimension).',
      },
      time_step: {
        type: 'number',
        description: 'Sample time interval dt in seconds (default 0.01).',
      },
      duration: {
        type: 'number',
        description:
          'Optional fixed total duration in seconds. If omitted, computed from kinematics limits.',
      },
      start_velocity: {
        description: 'Initial velocity at first waypoint (default 0).',
      },
      end_velocity: {
        description: 'Final velocity at last waypoint (default 0).',
      },
    },
    required: ['waypoints'],
    execute: (args) => planTrajectory(args || {}),
  },

  urdf_inspector: {
    name: 'urdf_inspector',
    description:
      'Parses URDF (Unified Robot Description Format) XML to extract links, joints, inertial matrices, and collision limits.',
    parameters: {
      urdf_content: {
        type: 'string',
        description: 'URDF XML string content to parse.',
      },
      file_path: {
        type: 'string',
        description: 'File path to a .urdf file on disk.',
      },
    },
    execute: (args) => inspectURDF(args || {}),
  },
};
