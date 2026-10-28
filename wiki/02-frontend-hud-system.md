# 02. Frontend HUD System

The SIS 1.0 frontend is an immersive, Hollywood-grade tactical sci-fi holographic cockpit built with vanilla JavaScript, modern CSS, WebGL (Three.js), and HTML5 Canvas, served via Vite.

---

## 1. Visual Design Tokens & Palette (`client/styles/main.css`)

### Color Hierarchy

| Token           | Hex Value               | Semantic Purpose                                          |
| --------------- | ----------------------- | --------------------------------------------------------- |
| `--cyan-main`   | `#00F0FF`               | Primary holographic HUD energy, border glow, active focus |
| `--amber-main`  | `#F59E0B`               | Solar fusion core, 3D simulation engine, alert telemetry  |
| `--lime-main`   | `#00FF88`               | Quantum verified health, 25-agent matrix online status    |
| `--purple-main` | `#A855F7`               | POSSAP predictive forecaster, formal complexity proofs    |
| `--bg-void`     | `#020408`               | Deep space obsidian void                                  |
| `--bg-panel`    | `rgba(6, 11, 22, 0.92)` | Frosted glassmorphic card surfaces (`blur(16px)`)         |

> [!WARNING]
> **Strict Styling Invariant**: Never introduce muted flat browns (`#8B5E3C`, `#D4A86A`) or flat opaque gray boxes. All components must adhere to the translucent luminescent cybernetic palette.

---

## 2. Atmospheric Layering & Background Grid

1. **Dynamic Perspective Cyber-Grid (`body::before`)**:
   - Dual-layer background: $32\text{px}$ micro-grid combined with $160\text{px}$ major tactical grid lines in translucent cyan.
   - Driven by `@keyframes cyberGridDrift` for continuous subtle perspective drift.
2. **Volumetric Lighting (`body`)**:
   - Multi-directional radial gradient: Electric Cyan radiating from top-center, Solar Amber from bottom-right, Singularity Violet from bottom-left.
3. **CRT Scanlines & Vignette (`body::after`)**:
   - Subtle scanline beam sweep and glowing corner vignette simulating physical glass holographic terminals.

---

## 3. Real-Time Synaptic Oscilloscope

Rendered via HTML5 Canvas (`#neural-oscilloscope-canvas`) inside `initNeuralOscilloscope()` in `client/scripts/app.js`:

- **Mathematical Waveform Synthesis**:
  $$y(x, t) = \frac{h}{2} + \left( \sin(18x + 2\phi) \cdot 14 + \sin(36x - 1.5\phi) \cdot 6 + \cos(8x + \phi) \cdot 8 \right) \cdot \sin(\pi x) \cdot M$$
  where $\phi$ is the time-integrated phase and $M$ is the amplitude multiplier ($1.0$ at idle, $1.6$ during active reasoning).
- **Dual Harmonic Channels**:
  - **Channel 1 (Cyan)**: High-frequency conscious synaptic activity with $12\text{px}$ optical glow.
  - **Channel 2 (Amber)**: Low-frequency subconscious harmonic resonance with $8\text{px}$ optical glow.
- **Traveling Photon Packet**: High-intensity incandescent pulse traveling along the wave contour at $120\text{px/s}$.

---

## 4. Tactical Directive Launch Matrix

The 2×2 mission directive grid replaces static text chips with interactive tactical cards:

1. **🪐 Procedural 3D Simulation** (`.directive-card.amber`): Pre-fills Three.js procedural physics simulation directive.
2. **🧠 Parallel Swarm Initiative** (`.directive-card.emerald`): Dispatches 25 subconscious specialized agents in parallel.
3. **⚡ Quantum Algorithms** (`.directive-card.violet`): Triggers formal asymptotic analysis with LaTeX mathematical proofs.
4. **🧬 Memory & Predictions** (`.directive-card.cyan`): Queries hierarchical episodic tree and forecasts intent trajectories.

---

## 5. Web Audio Sound Engine (`client/scripts/audio.js`)

Uses the Web Audio API to synthesize low-latency sci-fi acoustic feedback:

- `audio.play('click')`: High-frequency tactical relay click.
- `audio.play('send')`: Luminous transmission energy sweep.
- `audio.play('tab')`: Resonant frequency tab change sound.
- `audio.play('boot')`: Deep reactor spool-up sweep.
- Sound toggle button in top bar enables/disables audio across the entire session.
