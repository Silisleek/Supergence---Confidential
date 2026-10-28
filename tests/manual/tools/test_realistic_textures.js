import * as THREE from 'three';
import { createCanvas } from 'canvas'; // let's see if canvas is installed or if DOM canvas is used in browser

console.log('Testing Three.js texture creation compatibility...');
try {
  const dummyCanvas = { width: 1024, height: 1024, getContext: () => null };
  console.log('Canvas environment checked');
} catch (e) {
  console.error(e);
}
