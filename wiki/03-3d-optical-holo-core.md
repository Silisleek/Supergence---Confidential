# 03. 3D Optical Holo-Core Engine

The **3D Optical Holo-Core** (`client/scripts/holo-core.js`) is an advanced WebGL Three.js visualizer that provides a real-time, physical 3D representation of the SIS 1.0 neural architecture.

---

## 1. Post-Processing Pipeline (`UnrealBloomPass`)

To achieve authentic optical luminosity matching sci-fi reference designs, the Holo-Core uses Three.js post-processing:

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Composer Setup
this.composer = new EffectComposer(this.renderer);
this.renderPass = new RenderPass(this.scene, this.camera);
this.composer.addPass(this.renderPass);

// Optical Bloom Configuration
this.bloomPass = new UnrealBloomPass(
  new THREE.Vector2(width, height),
  1.45, // Dynamic Bloom Strength (scales up to 2.80 during inference)
  0.4, // Bloom Radius
  0.82, // Bloom Luminance Threshold
);
this.composer.addPass(this.bloomPass);
```

---

## 2. Core Visual Elements

### A. Incandescent Solar Fusion Nucleus

- **White-Hot Core**: High-intensity incandescent center sphere using additive blending.
- **Procedural Radial Glow Texture**: Generated on an internal 2D canvas with soft Gaussian falloff, eliminating harsh square particle points.
- **Horizontal Anamorphic Lens Flare Beam**: Stretched horizontal glow plane simulating Hollywood anamorphic cinema lenses.

### B. Catmull-Rom Solar Prominence Loops

- Continuous 3D parametric spline curves (`THREE.CatmullRomCurve3`) that undulate and twist around the nucleus, simulating coronal mass ejections.

### C. 360° Micro-Calibrated Scale Rings

- Precision concentric reticle rings with calibrated tick marks, cardinal alignment chevrons `[▲ ▼ ◄ ►]`, and HUD targeting corner brackets.

### D. Acoustic Geodesic Sphere & Harmonic Ribbons

- Delicate 3D geodesic wireframe sphere featuring vertex point beacons.
- Undulating wave ribbons that vibrate in direct response to cognitive audio frequencies.

### E. 25 Subconscious AI Satellites

- 25 crystalline diamond nodes orbiting on 4 tilted gyroscopic planes.
- Each satellite features:
  - Spinning radar sweep cone.
  - Dual-layer laser data conduit to the central core.
  - High-speed traveling photon packets along the conduit beam.
  - Billboard text label displaying agent specialization (e.g., `LOGICIAN`, `ALGORITHM`, `SECURITY`).

---

## 3. Dynamic Physics & Interaction API

| Method              | Parameters                        | Description                                                                                                                                           |
| ------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setWorkload(load)` | `load: number (0.0 to 1.0)`       | Scales optical bloom strength ($1.45 \to 2.80$), particle orbital velocity ($1.0 \to 3.5\times$), and flare intensity based on active neural compute. |
| `pulse(intensity)`  | `intensity: number (default 2.0)` | Triggers an immediate energy shockwave, expanding the scale rings and flashing the central bloom nucleus.                                             |
| `setTheme(theme)`   | `'amber' \| 'cyan' \| 'adaptive'` | Switches between Solar Arc Fusion (Image 1 replica), Cyan Acoustic Wave Sphere (Image 2 replica), or adaptive state.                                  |
| `toggleLabels()`    | none                              | Shows or hides billboard name tags for all 25 satellites.                                                                                             |
| `resetCamera()`     | none                              | Smoothly tweens camera back to default azimuth and distance.                                                                                          |
