import * as THREE from 'three';

function createVerticalLoftGeometry(rings, radialSegments = 24) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const ringCount = rings.length;
  for (let i = 0; i < ringCount; i++) {
    const ring = rings[i];
    const v = i / (ringCount - 1);
    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const theta = u * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);

      const rx = sin > 0 ? ring.rxRight || ring.rx : ring.rxLeft || ring.rx;
      const rz = cos > 0 ? ring.rzFront || ring.rz : ring.rzBack || ring.rz;

      const x = (ring.x || 0) + sin * rx;
      const y = ring.y || 0;
      const z = (ring.z || 0) + cos * rz;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Cap bottom flat sole
  const bottomRing = rings[ringCount - 1];
  if (bottomRing && (bottomRing.rx > 0.01 || bottomRing.rz > 0.01)) {
    const centerIdx = positions.length / 3;
    positions.push(bottomRing.x || 0, bottomRing.y || 0, bottomRing.z || 0);
    uvs.push(0.5, 1.0);
    const lastRowStart = (ringCount - 1) * (radialSegments + 1);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(centerIdx, lastRowStart + j + 1, lastRowStart + j);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const EQUINE_FORELEG_LOWER_RINGS = [
  { x: 0, y: 0.02, z: 0, rx: 0.076, rz: 0.092 },
  { x: 0, y: -0.06, z: 0, rx: 0.062, rz: 0.07 },
  { x: 0, y: -0.18, z: 0, rx: 0.048, rz: 0.056 },
  { x: 0, y: -0.32, z: 0, rx: 0.054, rz: 0.064 },
  { x: 0, y: -0.4, z: 0.01, rx: 0.068, rz: 0.078 },
  { x: 0, y: -0.48, z: 0.055, rx: 0.048, rz: 0.055 },
  { x: 0, y: -0.56, z: 0.11, rx: 0.065, rz: 0.075 },
  { x: 0, y: -0.65, z: 0.15, rx: 0.082, rz: 0.095 },
  { x: 0, y: -0.68, z: 0.16, rx: 0.085, rz: 0.098 },
];

const geo = createVerticalLoftGeometry(EQUINE_FORELEG_LOWER_RINGS, 24);
geo.computeBoundingBox();
console.log('Foreleg Lower Geometry generated successfully!');
console.log('Vertex count:', geo.attributes.position.count);
console.log('Index count:', geo.index.count);
console.log('Bounding Box Min:', geo.boundingBox.min);
console.log('Bounding Box Max:', geo.boundingBox.max);
