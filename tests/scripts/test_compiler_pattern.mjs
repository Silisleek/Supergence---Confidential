import { quickAI } from '../../server/api/openrouter.js';
import vm from 'vm';

async function testAll() {
  console.log('--- TEST 1: Objects ---');
  const code1 = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    'function buildSceneObjects(scene, THREE) {\n  // Create 10 distinct 3D objects for: Cyber Tank Warfare (chassis, tracks, turret, barrel, radar, headlights, trim). Add all to scene with castShadow=true. Return array of meshes.\n',
    'space-bunny-free',
    2000,
  );
  const f1 = code1.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i)?.[1] || code1;
  console.log('Obj code len:', f1.length);
  try {
    new vm.Script(f1);
    console.log('Obj syntax: VALID!');
  } catch (e) {
    console.log('Obj err:', e.message);
  }

  console.log('\n--- TEST 2: Animation ---');
  const code2 = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    'function animateScene(meshes, clock, THREE) {\n  // Subtle smooth animation using Math.sin and clock.getElapsedTime(). Rotate hero slowly, pulse glow trim, animate radar.\n',
    'space-bunny-free',
    1500,
  );
  const f2 = code2.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i)?.[1] || code2;
  console.log('Anim code len:', f2.length);
  try {
    new vm.Script(f2);
    console.log('Anim syntax: VALID!');
  } catch (e) {
    console.log('Anim err:', e.message);
  }

  console.log('\n--- TEST 3: Game Logic ---');
  const code3 = await quickAI(
    'You are a code compiler. You NEVER think or explain. You output ONLY valid executable JavaScript code starting with ```javascript and ending with ```. No thoughts, no reasoning.',
    'function buildGameLogic(scene, meshes, THREE) {\n  // WASD controls for meshes[0], collision detection with targets, score tracking. Return { update(dt), getScore(), getLives(), hasWon(), hasLost(), reset() }.\n',
    'space-bunny-free',
    1500,
  );
  const f3 = code3.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/i)?.[1] || code3;
  console.log('Game code len:', f3.length);
  try {
    new vm.Script(f3);
    console.log('Game syntax: VALID!');
  } catch (e) {
    console.log('Game err:', e.message);
  }
}

testAll();
