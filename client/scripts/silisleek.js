import { hydrateIcons } from './supergence-icons.js';

// Hydrate SVG outline icons
hydrateIcons();

/* ==========================================================================
   Centerpiece 1: Photorealistic Halftone Hands & Iridescent Star (Image 1)
   Mathematical 3D analytical capsule raymarching into a halftone dot raster.
   - Left: Silvery metallic robotic hand pointing to center
   - Right: Warm peach/cream biological human hand pointing to center
   - Center: 3D faceted iridescent asterisk with radiant chromatic flare
   ========================================================================== */
export function mountCreationCenterpiece(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let raf = 0;
  let time = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Mouse Parallax Tracking
  window.addEventListener(
    'pointermove',
    (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
    },
    { passive: true },
  );

  // 3D Analytical Capsules for Hands (relative coordinates 0..1)
  // Each capsule: p1: [x, y, z], p2: [x, y, z], r1, r2, isJoint
  const robotCapsules = [
    // Forearm
    { p1: [-0.05, 0.88, -0.05], p2: [0.15, 0.72, 0.0], r1: 0.09, r2: 0.065 },
    // Wrist joint
    { p1: [0.15, 0.72, 0.0], p2: [0.2, 0.67, 0.02], r1: 0.065, r2: 0.058, isJoint: true },
    // Palm plate
    { p1: [0.2, 0.67, 0.02], p2: [0.28, 0.6, 0.02], r1: 0.058, r2: 0.05 },
    // Index finger (pointing straight to center at y: 0.54)
    { p1: [0.28, 0.58, 0.02], p2: [0.34, 0.56, 0.03], r1: 0.022, r2: 0.02, isJoint: true },
    { p1: [0.34, 0.56, 0.03], p2: [0.4, 0.545, 0.03], r1: 0.02, r2: 0.017 },
    { p1: [0.4, 0.545, 0.03], p2: [0.45, 0.535, 0.02], r1: 0.017, r2: 0.013 },
    // Thumb
    { p1: [0.22, 0.68, 0.02], p2: [0.26, 0.75, 0.04], r1: 0.024, r2: 0.021, isJoint: true },
    { p1: [0.26, 0.75, 0.04], p2: [0.3, 0.79, 0.03], r1: 0.021, r2: 0.016 },
    // Middle finger curled
    { p1: [0.27, 0.62, 0.01], p2: [0.32, 0.64, -0.02], r1: 0.022, r2: 0.019 },
    { p1: [0.32, 0.64, -0.02], p2: [0.29, 0.68, -0.04], r1: 0.019, r2: 0.015 },
    // Ring finger curled
    { p1: [0.25, 0.65, 0.0], p2: [0.29, 0.68, -0.03], r1: 0.02, r2: 0.018 },
    { p1: [0.29, 0.68, -0.03], p2: [0.26, 0.72, -0.05], r1: 0.018, r2: 0.014 },
    // Pinky finger curled
    { p1: [0.23, 0.68, -0.01], p2: [0.26, 0.71, -0.04], r1: 0.018, r2: 0.015 },
    { p1: [0.26, 0.71, -0.04], p2: [0.23, 0.75, -0.06], r1: 0.015, r2: 0.012 },
  ];

  const humanCapsules = [
    // Forearm
    { p1: [1.05, 0.92, -0.05], p2: [0.85, 0.76, 0.0], r1: 0.095, r2: 0.068 },
    // Wrist
    { p1: [0.85, 0.76, 0.0], p2: [0.78, 0.7, 0.02], r1: 0.068, r2: 0.06 },
    // Palm
    { p1: [0.78, 0.7, 0.02], p2: [0.7, 0.62, 0.02], r1: 0.06, r2: 0.052 },
    // Index finger (reaching to center at y: 0.55)
    { p1: [0.7, 0.6, 0.02], p2: [0.65, 0.58, 0.03], r1: 0.022, r2: 0.019 },
    { p1: [0.65, 0.58, 0.03], p2: [0.59, 0.56, 0.03], r1: 0.019, r2: 0.016 },
    { p1: [0.59, 0.56, 0.03], p2: [0.54, 0.545, 0.02], r1: 0.016, r2: 0.012 },
    // Thumb resting down
    { p1: [0.76, 0.72, 0.02], p2: [0.73, 0.8, 0.04], r1: 0.024, r2: 0.02 },
    { p1: [0.73, 0.8, 0.04], p2: [0.69, 0.85, 0.03], r1: 0.02, r2: 0.016 },
    // Middle finger relaxed
    { p1: [0.71, 0.63, 0.01], p2: [0.66, 0.66, -0.02], r1: 0.021, r2: 0.018 },
    { p1: [0.66, 0.66, -0.02], p2: [0.62, 0.7, -0.04], r1: 0.018, r2: 0.014 },
    // Ring finger relaxed
    { p1: [0.73, 0.66, 0.0], p2: [0.69, 0.7, -0.03], r1: 0.02, r2: 0.017 },
    { p1: [0.69, 0.7, -0.03], p2: [0.65, 0.74, -0.05], r1: 0.017, r2: 0.013 },
    // Pinky
    { p1: [0.75, 0.69, -0.01], p2: [0.71, 0.73, -0.04], r1: 0.017, r2: 0.014 },
    { p1: [0.71, 0.73, -0.04], p2: [0.67, 0.77, -0.06], r1: 0.014, r2: 0.011 },
  ];

  // Point to segment distance in 2D
  function testCapsules(capsules, x, y, lightX, lightY) {
    let bestDistRatio = 1.0;
    let normalX = 0,
      normalY = 0,
      normalZ = 1;
    let isJoint = false;

    for (let i = 0; i < capsules.length; i++) {
      const cap = capsules[i];
      const dx = cap.p2[0] - cap.p1[0];
      const dy = cap.p2[1] - cap.p1[1];
      const lenSq = dx * dx + dy * dy;
      let t = 0;
      if (lenSq > 0.00001) {
        t = Math.max(0, Math.min(1, ((x - cap.p1[0]) * dx + (y - cap.p1[1]) * dy) / lenSq));
      }
      const projX = cap.p1[0] + t * dx;
      const projY = cap.p1[1] + t * dy;
      const dist = Math.hypot(x - projX, y - projY);
      const radius = cap.r1 + t * (cap.r2 - cap.r1);

      if (dist < radius) {
        const ratio = dist / radius;
        if (ratio < bestDistRatio) {
          bestDistRatio = ratio;
          const z = Math.sqrt(Math.max(0, 1 - ratio * ratio));
          normalX = (x - projX) / radius;
          normalY = (y - projY) / radius;
          normalZ = z;
          isJoint = !!cap.isJoint;
        }
      }
    }

    if (bestDistRatio >= 1.0) return null;

    // Vector to center light source
    const lx = lightX - x;
    const ly = lightY - y;
    const lz = 0.35; // Light stands out in z
    const lLen = Math.hypot(lx, ly, lz);
    const dot = normalX * (lx / lLen) + normalY * (ly / lLen) + normalZ * (lz / lLen);
    const intensity = Math.max(0.08, dot);

    return {
      intensity,
      isJoint,
      ratio: bestDistRatio,
    };
  }

  // 3D Asterisk Star Shape (Extruded 6-Point Prism)
  const starArms = 6;
  const starAngleStep = (Math.PI * 2) / starArms;

  function draw() {
    time += 0.02;
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;

    ctx.clearRect(0, 0, width, height);

    const lightX = 0.5;
    const lightY = 0.54;
    const starPxX = lightX * width;
    const starPxY = lightY * height;

    // 1. Draw Volumetric Chromatic Lens Flare & Radial Rays (Image 1 Center)
    const flareRadius = Math.min(width, height) * 0.42;
    const flareGrad = ctx.createRadialGradient(starPxX, starPxY, 2, starPxX, starPxY, flareRadius);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    flareGrad.addColorStop(0.08, 'rgba(255, 200, 140, 0.7)');
    flareGrad.addColorStop(0.22, 'rgba(168, 85, 247, 0.45)');
    flareGrad.addColorStop(0.48, 'rgba(56, 189, 248, 0.16)');
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(starPxX, starPxY, flareRadius, 0, Math.PI * 2);
    ctx.fill();

    // Intense Horizontal Light Beams to Fingertips
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const beamGrad = ctx.createLinearGradient(width * 0.35, starPxY, width * 0.65, starPxY);
    beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    beamGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.8)');
    beamGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.8)');
    beamGrad.addColorStop(1, 'rgba(224, 179, 140, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.ellipse(starPxX, starPxY, width * 0.18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Render Halftone Grid for Robotic Hand (Left)
    const dotSpacing = 11;
    const maxDotRadius = 5.2;

    const robotShiftX = mouseX * 22;
    const robotShiftY = mouseY * 14;

    for (let py = 0; py < height; py += dotSpacing) {
      for (let px = 0; px < width * 0.48; px += dotSpacing) {
        const normX = (px - robotShiftX) / width;
        const normY = (py - robotShiftY) / height;

        const hit = testCapsules(robotCapsules, normX, normY, lightX, lightY);
        if (hit) {
          const r = Math.max(0.7, maxDotRadius * Math.pow(hit.intensity, 1.3));
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);

          // Specular highlights: stark white; joints: cool cyan; midtones: metallic silver
          if (hit.intensity > 0.65) {
            ctx.fillStyle = '#ffffff';
          } else if (hit.isJoint) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
          } else {
            const val = Math.round(140 + hit.intensity * 100);
            ctx.fillStyle = `rgb(${val}, ${val + 5}, ${val + 15})`;
          }
          ctx.fill();
        }
      }
    }

    // 3. Render Halftone Grid for Human Hand (Right)
    const humanShiftX = -mouseX * 22;
    const humanShiftY = -mouseY * 14;

    for (let py = 0; py < height; py += dotSpacing) {
      for (let px = width * 0.52; px < width; px += dotSpacing) {
        const normX = (px - humanShiftX) / width;
        const normY = (py - humanShiftY) / height;

        const hit = testCapsules(humanCapsules, normX, normY, lightX, lightY);
        if (hit) {
          const r = Math.max(0.7, maxDotRadius * Math.pow(hit.intensity, 1.25));
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);

          // Warm flesh tones: peach highlight, soft pink, deep amber shadow
          if (hit.intensity > 0.7) {
            ctx.fillStyle = '#ffffff';
          } else if (hit.intensity > 0.4) {
            ctx.fillStyle = 'rgba(254, 215, 170, 0.95)'; // peach
          } else {
            ctx.fillStyle = 'rgba(224, 179, 140, 0.75)'; // copper
          }
          ctx.fill();
        }
      }
    }

    // 4. Render Extruded 3D Isometric Asterisk / Snowflake Star (Center)
    ctx.save();
    ctx.translate(starPxX, starPxY);

    const rotAngle = time * 0.5 + mouseX * 0.8;
    const starR = 48;
    const starInnerR = 18;
    const depth = 22; // 3D extrusion depth

    // Extruded side facets
    for (let i = 0; i < starArms; i++) {
      const a1 = i * starAngleStep + rotAngle;
      const a2 = (i + 0.5) * starAngleStep + rotAngle;
      const x1 = Math.cos(a1) * starR;
      const y1 = Math.sin(a1) * starR * 0.65;
      const x2 = Math.cos(a2) * starInnerR;
      const y2 = Math.sin(a2) * starInnerR * 0.65;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 + depth);
      ctx.lineTo(x1, y1 + depth);
      ctx.closePath();

      // Side facet iridescent purple/cyan gradient
      const sideGrad = ctx.createLinearGradient(x1, y1, x2, y2 + depth);
      sideGrad.addColorStop(0, '#581c87');
      sideGrad.addColorStop(0.5, '#7c3aed');
      sideGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = sideGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Top face of Asterisk
    ctx.beginPath();
    for (let i = 0; i < starArms * 2; i++) {
      const a = i * starAngleStep * 0.5 + rotAngle;
      const radius = i % 2 === 0 ? starR : starInnerR;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius * 0.65;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const topGrad = ctx.createLinearGradient(-starR, -starR, starR, starR);
    topGrad.addColorStop(0, '#c084fc');
    topGrad.addColorStop(0.35, '#f472b6');
    topGrad.addColorStop(0.7, '#f97316');
    topGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Central Gleaming Core Star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Hairline HUD Connectors to Floating Chips (Image 3)
    const chips = canvas.parentElement?.querySelectorAll('.sl-hud-chip');
    if (chips && chips.length > 0) {
      ctx.save();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      const canvasRect = canvas.getBoundingClientRect();
      chips.forEach((chip) => {
        const chipRect = chip.getBoundingClientRect();
        const chipX = chipRect.left + chipRect.width * 0.5 - canvasRect.left;
        const chipY = chipRect.top + chipRect.height * 0.5 - canvasRect.top;

        ctx.beginPath();
        ctx.moveTo(chipX, chipY);
        ctx.lineTo(starPxX, starPxY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(224, 179, 140, 0.8)';
        ctx.beginPath();
        ctx.arc(chipX, chipY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

/* ==========================================================================
   Centerpiece 2: The Moiré Halftone Botanical Bloom (Image 2 Exact Replica)
   "Nature doesn't guess. Neither should AI."
   Concentric waving petals rendered in rich golden/amber halftone raster.
   ========================================================================== */
export function mountBloomVisual(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let raf = 0;
  let time = 0;
  let mouseX = 0;
  let mouseY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  canvas.addEventListener(
    'pointermove',
    (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / width - 0.5;
      mouseY = (e.clientY - rect.top) / height - 0.5;
    },
    { passive: true },
  );

  const numRings = 42;
  const dotsPerRing = 76;

  function draw() {
    time += 0.018;
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.48;

    // Golden center flare
    const centerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 180);
    centerGrad.addColorStop(0, 'rgba(255, 190, 133, 0.5)');
    centerGrad.addColorStop(0.35, 'rgba(180, 83, 9, 0.2)');
    centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.fill();

    // Stem (curving down from flower base)
    ctx.save();
    for (let sy = cy + 110; sy < height - 10; sy += 9) {
      const sx = cx + Math.sin(sy * 0.02 + time * 0.5) * 16 - 12;
      const sr = 1.8 + Math.sin(sy * 0.05) * 0.6;
      ctx.fillStyle = 'rgba(224, 179, 140, 0.6)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Petal rings with moiré interference waves
    for (let r = 1; r <= numRings; r++) {
      const ringRatio = r / numRings;
      const baseR = ringRatio * 220;

      for (let i = 0; i < dotsPerRing; i++) {
        const angle = (i / dotsPerRing) * Math.PI * 2;

        // Wavy petal ripples
        const petalFreq = 5; // 5 natural poppy petals
        const petalAmp = 28 * Math.pow(ringRatio, 1.2);
        const petalWave = Math.sin(angle * petalFreq + time * 0.8) * petalAmp;

        // Fine moiré undulation
        const moire = Math.cos(angle * 13 - r * 0.4 + time * 1.2) * 8;

        const currentR = baseR + petalWave + moire;
        const x = cx + Math.cos(angle + mouseX * 0.4) * currentR;
        const y = cy + Math.sin(angle + mouseY * 0.4) * currentR * 0.84;

        // Dot size and color mapping
        const normDist = currentR / 230;
        const dotRadius = Math.max(
          0.6,
          (3.2 - normDist * 1.8) * (1 + Math.sin(angle * petalFreq + r * 0.2) * 0.4),
        );

        if (normDist < 0.35) {
          ctx.fillStyle = 'rgba(255, 230, 200, 0.95)';
        } else if (normDist < 0.65) {
          ctx.fillStyle = 'rgba(224, 179, 140, 0.85)';
        } else {
          ctx.fillStyle = 'rgba(160, 168, 180, 0.6)';
        }

        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

// Auto-mount canvases
const creationCanvas = document.getElementById('creationCanvas');
if (creationCanvas) mountCreationCenterpiece(creationCanvas);

const bloomCanvas = document.getElementById('bloomCanvas');
if (bloomCanvas) mountBloomVisual(bloomCanvas);

// Interactive Cockpit Tabs (on silisleek.html)
const cockpitNav = document.getElementById('cockpitNav');
if (cockpitNav) {
  cockpitNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.sl-cockpit-tab');
    if (!btn) return;
    const target = btn.dataset.target;
    if (!target) return;

    cockpitNav.querySelectorAll('.sl-cockpit-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.sl-tab-content').forEach((pane) => {
      pane.classList.remove('active');
      if (pane.id === target) pane.classList.add('active');
    });
  });
}

// Interactive Code Language Tabs (on installer.html)
const cliNav = document.getElementById('cliNav');
if (cliNav) {
  cliNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.sl-cockpit-tab');
    if (!btn) return;
    const target = btn.dataset.cli;
    if (!target) return;

    cliNav.querySelectorAll('.sl-cockpit-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.sl-cli-pane').forEach((pane) => {
      pane.style.display = pane.id === target ? 'block' : 'none';
    });
  });
}

// Toast Notification Helper
function showToast(message) {
  let toast = document.getElementById('slToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'slToast';
    toast.className = 'sl-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Copy Buttons (for hashes and terminal commands)
document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[data-copy], .sl-copy-btn');
  if (!copyBtn) return;
  const text =
    copyBtn.dataset.copy ||
    copyBtn.closest('.sl-hash-box')?.querySelector('.sl-hash-value')?.innerText;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard: ' + text.slice(0, 22) + (text.length > 22 ? '...' : ''));
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    showToast('Copied to clipboard!');
  }
});

// Live System Diagnostic Detector
export async function runSystemDiagnostics() {
  const osEl = document.getElementById('diagOS');
  const archEl = document.getElementById('diagArch');
  const webglEl = document.getElementById('diagWebGL');
  const localAppEl = document.getElementById('diagLocalApp');
  const screenEl = document.getElementById('diagScreen');

  if (osEl) {
    const ua = navigator.userAgent;
    if (
      ua.includes('Windows NT 10.0') ||
      ua.includes('Windows NT 11.0') ||
      ua.includes('Windows')
    ) {
      osEl.textContent = 'Windows 10 / 11 (Verified)';
      osEl.style.color = 'var(--sl-emerald)';
    } else if (ua.includes('Mac OS')) {
      osEl.textContent = 'macOS (Web / Source)';
    } else if (ua.includes('Linux')) {
      osEl.textContent = 'Linux (Web / Source)';
    } else {
      osEl.textContent = navigator.platform || 'Compatible Host';
    }
  }

  if (archEl) {
    const isArm = /arm64|aarch64/i.test(navigator.userAgent);
    archEl.textContent = isArm ? 'ARM64 (Prism Emulation)' : 'x86_64 / x64 (Native)';
    archEl.style.color = 'var(--sl-copper-light)';
  }

  if (screenEl) {
    const dpr = window.devicePixelRatio || 1;
    screenEl.textContent = `${window.screen.width} × ${window.screen.height} (${dpr}x DPR)`;
  }

  if (webglEl) {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : 'Hardware Accelerated';
        webglEl.textContent =
          'Active (' +
          (renderer.includes('NVIDIA')
            ? 'NVIDIA'
            : renderer.includes('AMD')
              ? 'AMD'
              : renderer.includes('Intel')
                ? 'Intel'
                : 'GPU') +
          ')';
        webglEl.style.color = 'var(--sl-emerald)';
      } else {
        webglEl.textContent = 'Software fallback';
      }
    } catch {
      webglEl.textContent = 'Standard Canvas';
    }
  }

  if (localAppEl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        localAppEl.textContent = 'Active on Loopback';
        localAppEl.style.color = 'var(--sl-emerald)';
      } else {
        localAppEl.textContent = 'Ready to Launch';
      }
    } catch {
      localAppEl.textContent = 'Ready for Deployment';
    }
  }
}

if (document.getElementById('diagOS')) {
  void runSystemDiagnostics();
}
