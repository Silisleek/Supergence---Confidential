import { quickAI, DEFAULT_MODEL, PREMIUM_MODEL } from '../../server/api/openrouter.js';

async function testSplit() {
  console.log('Model:', DEFAULT_MODEL);
  const title = 'Quantum Wave-Particle Tunneling Simulator';
  const prompt =
    'Interactive quantum particle simulator with real-time wave-function collapse, potential energy barrier tunneling, phase color mapping, energy spectrum visualizer, and 60 FPS canvas animation.';

  console.log('\n--- 1. Testing UI Shell Generation ---');
  const t0 = Date.now();
  const uiPrompt = `You are Supergence — Chief Systems Architect.
Design the complete HTML & CSS visual presentation shell for: "${title}"
Task: "${prompt}"

Requirements:
1. Luxury Obsidian HUD styling (#030712 background, sleek glassmorphism cards, glowing cyan #00F0FF and magenta #FF007F accents).
2. Layout: Left area with dual high-performance <canvas> viewports:
   - Upper canvas (id="waveCanvas", height="340"): Primary visualizer / probability density / physical space.
   - Lower canvas (id="phaseCanvas", height="220"): Mathematical phase angle hue color mapping / momentum spectrum.
   Right area: Luxury control deck with glassmorphic cards.
3. Controls: Range sliders with live numeric badge spans (<span id="val_...">...</span>) for key simulation parameters.
4. Play, Pause, Step, Reset buttons. Telemetry metrics bar: FPS counter, conservation metric, energy/transmission.
Output ONLY the complete HTML <head><style>...</style></head> and <body><div id="app">...</div> (DO NOT include <script> yet) inside \`\`\`html code fence. Every HTML tag MUST be closed.`;

  const resUi = await quickAI(
    'You are an expert Frontend Architect. Output ONLY valid HTML/CSS shell inside ```html code fence.',
    uiPrompt,
    DEFAULT_MODEL,
    3500,
    0.2,
  );
  const uiText = (resUi?.text || String(resUi)).trim();
  console.log(`UI Shell generated in ${Date.now() - t0}ms, length: ${uiText.length}`);
  console.log('UI snippet:\n', uiText.slice(0, 300));

  console.log('\n--- 2. Testing JS Engine Generation ---');
  const t1 = Date.now();
  const jsPrompt = `You are Supergence — Lead Computational Physicist & Systems Engineer.
Here is the HTML/CSS UI shell for "${title}":
${uiText.slice(0, 1200)}

Now implement the COMPLETE vanilla JavaScript code (inside <script>...</script>) to bring this entire system to life:
1. AudioEngine class: Web Audio API procedural synthesis for user button clicks and tunneling chirps.
2. SimulationCore class:
   - High-precision Float64Array numerical integrator (512 grid points).
   - Real & imaginary wavefunctions (psiR, psiI), potential barrier V(x).
   - Finite-difference leapfrog Schrodinger time evolution.
   - Normalization check and energy calculation.
3. VisualRenderer class:
   - Upper canvas (waveCanvas): Clear with #030712, draw glowing magenta potential barrier, draw probability density |psi(x)|^2 with cyan luminous glow.
   - Lower canvas (phaseCanvas): Draw phase angle theta = atan2(psiI, psiR) mapped to HSL color wheel and momentum bars.
4. Controller & Event Listeners:
   - Wire all range sliders to dynamically update simulation parameters and update numeric badges in real time.
   - Wire Play, Pause, Step, and Reset buttons.
5. Auto-start:
   - Instantiate AudioEngine, SimulationCore, VisualRenderer on window load.
   - Set isPlaying = true and run requestAnimationFrame animation loop immediately.
Output ONLY executable JavaScript inside \`\`\`html <script> ... </script> \`\`\` code fence.`;

  const resJs = await quickAI(
    'You are an expert Systems & Simulation Engineer. Output ONLY valid JavaScript inside ```html <script>...</script> ``` code fence.',
    jsPrompt,
    DEFAULT_MODEL,
    4500,
    0.2,
  );
  const jsText = (resJs?.text || String(resJs)).trim();
  console.log(`JS Engine generated in ${Date.now() - t1}ms, length: ${jsText.length}`);
  console.log('JS snippet (start):\n', jsText.slice(0, 300));
  console.log('JS snippet (end):\n', jsText.slice(-300));
}

testSplit().catch(console.error);
