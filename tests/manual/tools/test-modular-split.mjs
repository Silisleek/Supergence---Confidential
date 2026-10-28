import { quickAI } from '../../../server/api/openrouter.js';
import fs from 'fs';
import { chromium } from 'playwright-core';

async function testModularSplit() {
  console.log('=== Testing 2-Pass Modular Split Code Generation with 12k Token Budget ===');
  const targetModel = 'flm/auto';

  // Pass 1: UI Shell & HUD Styling
  const p1 = `You are Supergence — Chief Systems Architect.
Design the HTML & CSS visual presentation shell for: "Interactive Quantum Wave-Particle Tunneling Simulator"
Requirements:
1. Pure Obsidian HUD styling (#030712 background, sleek glassmorphism panels, glowing cyan #00F0FF and magenta #FF007F accents). Keep CSS clean and modular (~60-70 lines).
2. Layout: Left area with dual high-performance <canvas> viewports:
   - Upper canvas (id="waveCanvas", height="340"): Probability Density |psi|^2 & potential barrier overlay.
   - Lower canvas (id="phaseCanvas", height="220"): Phase Angle Hue Color Mapping & Momentum Distribution.
   Right area: luxury control deck with glassmorphic cards.
3. Controls: Range sliders with live numeric badge spans (<span id="val_barrier">50</span>, etc.) for:
   - Barrier Height (0 to 100)
   - Barrier Width (0.05 to 0.3)
   - Particle Momentum (10 to 80)
   - Wavepacket Width (0.02 to 0.1)
4. Buttons: Play, Pause, Step, Reset. Telemetry metrics bar: FPS counter, Norm conservation, Transmission Probability.
MANDATE: Output the complete HTML starting with <head><style>...</style></head><body><div id="app">...</div></body> (DO NOT include <script> yet) inside \`\`\`html code fence. The <body> and <div id="app"> MUST be 100% closed.`;

  console.log('Generating Pass 1 (HTML/CSS UI Shell)...');
  const t0 = Date.now();
  const res1 = await quickAI(p1, 'Generate HTML/CSS shell', targetModel, 8000);
  console.log(
    `Pass 1 completed in ${((Date.now() - t0) / 1000).toFixed(1)}s (${res1.length} chars).`,
  );

  // Pass 2: Simulation Mathematics, Visual Rendering, Event Wiring
  const p2 = `You are Supergence — Lead Computational Physicist & Systems Engineer.
Here is the HTML/CSS shell for "Interactive Quantum Wave-Particle Tunneling Simulator":
${res1.slice(0, 1200)}

Now write the COMPLETE, PRODUCTION-GRADE vanilla JavaScript <script> block to bring this entire system to life:
1. AudioEngine class: Web Audio API synthesis for user button clicks and high-frequency tunneling chirps.
2. QuantumSimulationCore class:
   - 1D finite-difference leapfrog numerical wavepacket solver on Float64Array grids (512 points).
   - Real & imaginary wavefunctions (psiR, psiI), potential barrier V(x) (Gaussian barrier centered at 0.5).
   - Real-time time-dependent Schrodinger equation evolution: psiR += -dt/(2m) * d2_psiI + dt*V*psiI; psiI += dt/(2m) * d2_psiR - dt*V*psiR.
   - Normalization check and energy calculation.
3. VisualRenderer class:
   - Upper canvas (waveCanvas): Clear with #030712, draw glowing magenta potential barrier, draw probability density |psi(x)|^2 with cyan-to-white glowing gradient and particle sparkles.
   - Lower canvas (phaseCanvas): Draw phase angle theta = atan2(psiI, psiR) mapped to HSL color spectrum across the grid, and live momentum bars.
4. Controller & Event Listeners:
   - Wire all range sliders (Barrier Height, Width, Momentum, Packet Width) to dynamically update simulation parameters and update numeric badges in real time.
   - Wire Play, Pause, Step, and Reset buttons.
5. Auto-start:
   - Immediately instantiate AudioEngine, QuantumSimulationCore, and VisualRenderer on window load.
   - Start 60 FPS requestAnimationFrame loop so animated wavepacket visuals render immediately!
MANDATE: Output ONLY the complete JavaScript code inside \`\`\`html <script> ... </script> \`\`\` code fence. Every class, method, event listener, and curly brace MUST be 100% written out and closed.`;

  console.log('Generating Pass 2 (JS SimulationCore, Renderer, Event Wiring)...');
  const t1 = Date.now();
  const res2 = await quickAI(p2, 'Generate complete JavaScript implementation', targetModel, 12000);
  console.log(
    `Pass 2 completed in ${((Date.now() - t1) / 1000).toFixed(1)}s (${res2.length} chars).`,
  );

  // Clean extraction function
  function extractCode(text) {
    let t = text.trim();
    const match = t.match(/```(?:html)?\s*\n?([\s\S]*?)```/i);
    if (match) t = match[1].trim();
    t = t
      .replace(/^```[a-z]*\s*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    return t;
  }

  const cleanHtml = extractCode(res1);
  const cleanJs = extractCode(res2);

  // Combine cleanly
  let combined = `<!DOCTYPE html>\n<html lang="en">\n`;
  if (!cleanHtml.includes('<head>')) {
    combined += `<head><meta charset="UTF-8"><title>Quantum Simulator</title></head>\n<body>\n${cleanHtml}\n`;
  } else {
    combined += `${cleanHtml}\n`;
  }

  if (cleanJs.includes('<script')) {
    combined += `${cleanJs}\n`;
  } else {
    combined += `<script>\n${cleanJs}\n</script>\n`;
  }

  if (!combined.includes('</body>')) combined += '</body>\n';
  if (!combined.includes('</html>')) combined += '</html>\n';

  const outPath = 'workspace/test_quantum_split_verified.html';
  fs.writeFileSync(outPath, combined, 'utf8');
  console.log(`✓ Full unified document written to ${outPath} (${combined.length} bytes).`);

  // Test inside real Playwright Chrome
  console.log('\n=== Testing in real Playwright Chrome ===');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:3009/workspace/test_quantum_split_verified.html', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const screenshotPath =
    'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/verified_quantum_split_2pass.png';
  await page.screenshot({ path: screenshotPath });
  console.log('✓ Screenshot saved to', screenshotPath);
  console.log('Browser errors:', errors);
  await browser.close();
}

testModularSplit().catch((e) => console.error('FATAL:', e));
