import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../../../server/api/openrouter.js';
import { perfectionistCoderEngine } from '../../../server/coder/perfectionist-coder-engine.js';
import fs from 'fs';
import path from 'path';

async function testSynthesis() {
  console.log('Testing focused modular application synthesis...');
  const prompt =
    'Interactive quantum particle simulator with real-time wave-function collapse, potential energy barrier tunneling, phase color mapping, energy spectrum visualizer, and 60 FPS canvas animation.';
  const title = 'Quantum Wave-Particle Tunneling Simulator';

  const decomposition = {
    domain: 'scientific_simulation',
    mathematicalModel: {
      equation: 'i*hbar*d_psi/dt = (-hbar^2/(2m) * d2_psi/dx2 + V(x))*psi',
      discretization: 'Second-order unitary leapfrog finite difference',
    },
    subsystems: [
      {
        name: 'SimulationCore',
        role: 'Float64Array wavepacket integrator and conservation metrics',
      },
      {
        name: 'VisualRenderer',
        role: 'Dual-viewport canvas rendering for wavepacket, potential, and spectrum',
      },
      { name: 'AudioEngine', role: 'Web Audio procedural feedback for tunneling and collapse' },
      {
        name: 'InteractiveControlDeck',
        role: 'Preset scenarios, sliders, and animation loop controls',
      },
    ],
    invariants: [
      'Probability conservation sum(|psi|^2*dx) = 1.0',
      '60 FPS requestAnimationFrame loop',
    ],
  };

  const code = await perfectionistCoderEngine._buildModularApplication(
    title,
    prompt,
    decomposition,
    [],
  );
  console.log('Generated code size:', code.length, 'bytes');

  const validated = perfectionistCoderEngine._joinAndValidate(code);
  console.log('Validated code size:', validated.length, 'bytes');

  const testFile = path.resolve('workspace/test_quantum_simulator_clean.html');
  fs.writeFileSync(testFile, validated, 'utf8');
  console.log('Saved to:', testFile);
}

testSynthesis().catch(console.error);
