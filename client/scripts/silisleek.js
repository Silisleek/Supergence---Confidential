import { hydrateIcons } from './supergence-icons.js';

// Hydrate SVG outline icons
hydrateIcons();

/* ==========================================================================
   Centerpiece 1: Photorealistic Halftone Hands & Iridescent Star (Image 1)
   Bespoke Halftone Creation of Adam centerpiece with interactive 3D chromatic core.
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

  // High-fidelity pre-rendered artwork reverse-engineered from reference
  const heroImg = new Image();
  heroImg.src = '/images/creation-hero-centerpiece.png';
  let imgLoaded = false;
  heroImg.onload = () => {
    imgLoaded = true;
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
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

  // 3D Analytical Capsules for Hands (Fallback generative model)
  const robotCapsules = [
    { p1: [-0.05, 0.78, -0.05], p2: [0.18, 0.58, 0.0], r1: 0.088, r2: 0.062 },
    { p1: [0.18, 0.58, 0.0], p2: [0.26, 0.48, 0.02], r1: 0.062, r2: 0.054, isJoint: true },
    { p1: [0.26, 0.48, 0.02], p2: [0.34, 0.42, 0.02], r1: 0.054, r2: 0.046 },
    { p1: [0.34, 0.42, 0.02], p2: [0.4, 0.38, 0.03], r1: 0.02, r2: 0.018, isJoint: true },
    { p1: [0.4, 0.38, 0.03], p2: [0.46, 0.345, 0.02], r1: 0.018, r2: 0.014 },
    { p1: [0.26, 0.52, 0.02], p2: [0.3, 0.6, 0.04], r1: 0.022, r2: 0.019, isJoint: true },
    { p1: [0.3, 0.6, 0.04], p2: [0.34, 0.65, 0.03], r1: 0.019, r2: 0.015 },
    { p1: [0.32, 0.46, 0.01], p2: [0.38, 0.48, -0.02], r1: 0.02, r2: 0.017 },
    { p1: [0.38, 0.48, -0.02], p2: [0.35, 0.54, -0.04], r1: 0.017, r2: 0.013 },
    { p1: [0.3, 0.49, 0.0], p2: [0.35, 0.52, -0.03], r1: 0.018, r2: 0.015 },
    { p1: [0.35, 0.52, -0.03], p2: [0.32, 0.57, -0.05], r1: 0.015, r2: 0.012 },
  ];

  const humanCapsules = [
    { p1: [1.05, 0.82, -0.05], p2: [0.82, 0.6, 0.0], r1: 0.09, r2: 0.065 },
    { p1: [0.82, 0.6, 0.0], p2: [0.74, 0.5, 0.02], r1: 0.065, r2: 0.056 },
    { p1: [0.74, 0.5, 0.02], p2: [0.66, 0.42, 0.02], r1: 0.056, r2: 0.048 },
    { p1: [0.66, 0.42, 0.02], p2: [0.6, 0.38, 0.03], r1: 0.02, r2: 0.017 },
    { p1: [0.6, 0.38, 0.03], p2: [0.54, 0.345, 0.02], r1: 0.017, r2: 0.013 },
    { p1: [0.72, 0.54, 0.02], p2: [0.69, 0.62, 0.04], r1: 0.022, r2: 0.018 },
    { p1: [0.69, 0.62, 0.04], p2: [0.65, 0.67, 0.03], r1: 0.018, r2: 0.014 },
    { p1: [0.67, 0.46, 0.01], p2: [0.62, 0.49, -0.02], r1: 0.019, r2: 0.016 },
    { p1: [0.62, 0.49, -0.02], p2: [0.58, 0.54, -0.04], r1: 0.016, r2: 0.012 },
  ];

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

    const lx = lightX - x;
    const ly = lightY - y;
    const lz = 0.35;
    const lLen = Math.hypot(lx, ly, lz);
    const dot = normalX * (lx / lLen) + normalY * (ly / lLen) + normalZ * (lz / lLen);
    const intensity = Math.max(0.08, dot);

    return { intensity, isJoint, ratio: bestDistRatio };
  }

  const starArms = 6;
  const starAngleStep = (Math.PI * 2) / starArms;

  function draw() {
    time += 0.02;
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;

    ctx.clearRect(0, 0, width, height);

    // Exact geometric coordinates reverse-engineered from reference (1017x541)
    const lightX = 0.517;
    const lightY = 0.34;
    const starPxX = lightX * width;
    const starPxY = lightY * height;

    if (imgLoaded) {
      // 1. Draw High-Fidelity Master Artwork with subtle mouse parallax
      const shiftX = mouseX * 12;
      const shiftY = mouseY * 8;
      ctx.drawImage(heroImg, shiftX, shiftY, width, height);

      // 2. Animated chromatic radial glow breathing at the star core
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pulse = 1.0 + Math.sin(time * 2.2) * 0.12;
      const flareRadius = Math.min(width, height) * 0.28 * pulse;
      const flareGrad = ctx.createRadialGradient(
        starPxX + shiftX,
        starPxY + shiftY,
        2,
        starPxX + shiftX,
        starPxY + shiftY,
        flareRadius,
      );
      flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      flareGrad.addColorStop(0.12, 'rgba(244, 114, 182, 0.35)');
      flareGrad.addColorStop(0.35, 'rgba(168, 85, 247, 0.22)');
      flareGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
      flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(starPxX + shiftX, starPxY + shiftY, flareRadius, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal beam shimmer
      const beamGrad = ctx.createLinearGradient(
        starPxX + shiftX - width * 0.16,
        starPxY + shiftY,
        starPxX + shiftX + width * 0.16,
        starPxY + shiftY,
      );
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      beamGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.35 + Math.sin(time * 3) * 0.15})`);
      beamGrad.addColorStop(1, 'rgba(224, 179, 140, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.ellipse(starPxX + shiftX, starPxY + shiftY, width * 0.16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Generative Halftone Raymarching Fallback
      const flareRadius = Math.min(width, height) * 0.38;
      const flareGrad = ctx.createRadialGradient(
        starPxX,
        starPxY,
        2,
        starPxX,
        starPxY,
        flareRadius,
      );
      flareGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      flareGrad.addColorStop(0.08, 'rgba(255, 200, 140, 0.7)');
      flareGrad.addColorStop(0.22, 'rgba(168, 85, 247, 0.45)');
      flareGrad.addColorStop(0.48, 'rgba(56, 189, 248, 0.16)');
      flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(starPxX, starPxY, flareRadius, 0, Math.PI * 2);
      ctx.fill();

      // Elliptical halo ring
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const beamGrad = ctx.createLinearGradient(width * 0.36, starPxY, width * 0.66, starPxY);
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      beamGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.8)');
      beamGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.8)');
      beamGrad.addColorStop(1, 'rgba(224, 179, 140, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.ellipse(starPxX, starPxY, width * 0.14, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Fine Halftone Raster Dots (spacing 8.4px)
      const dotSpacing = 8.4;
      const maxDotRadius = 4.2;
      const robotShiftX = mouseX * 16;
      const robotShiftY = mouseY * 10;

      for (let py = 0; py < height; py += dotSpacing) {
        for (let px = 0; px < width * 0.49; px += dotSpacing) {
          const normX = (px - robotShiftX) / width;
          const normY = (py - robotShiftY) / height;
          const hit = testCapsules(robotCapsules, normX, normY, lightX, lightY);
          if (hit) {
            const r = Math.max(0.6, maxDotRadius * Math.pow(hit.intensity, 1.3));
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            if (hit.intensity > 0.68) ctx.fillStyle = '#ffffff';
            else if (hit.isJoint) ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
            else {
              const val = Math.round(140 + hit.intensity * 100);
              ctx.fillStyle = `rgb(${val}, ${val + 5}, ${val + 15})`;
            }
            ctx.fill();
          }
        }
      }

      const humanShiftX = -mouseX * 16;
      const humanShiftY = -mouseY * 10;
      for (let py = 0; py < height; py += dotSpacing) {
        for (let px = width * 0.51; px < width; px += dotSpacing) {
          const normX = (px - humanShiftX) / width;
          const normY = (py - humanShiftY) / height;
          const hit = testCapsules(humanCapsules, normX, normY, lightX, lightY);
          if (hit) {
            const r = Math.max(0.6, maxDotRadius * Math.pow(hit.intensity, 1.25));
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            if (hit.intensity > 0.72) ctx.fillStyle = '#ffffff';
            else if (hit.intensity > 0.42) ctx.fillStyle = 'rgba(254, 215, 170, 0.95)';
            else ctx.fillStyle = 'rgba(224, 179, 140, 0.75)';
            ctx.fill();
          }
        }
      }

      // 3D Asterisk Star Shape
      ctx.save();
      ctx.translate(starPxX, starPxY);
      const rotAngle = time * 0.4 + mouseX * 0.6;
      const starR = 44;
      const starInnerR = 17;
      const depth = 20;

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

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Hairline HUD Vector Lines (Fallback generative model)
      const stage = canvas.parentElement;
      if (stage) {
        const chip1 = stage.querySelector('.sl-hud-chip-1');
        const chip2 = stage.querySelector('.sl-hud-chip-2');
        const chip5 = stage.querySelector('.sl-hud-chip-5');
        const canvasRect = canvas.getBoundingClientRect();

        ctx.save();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';

        const drawRay = (chip, targetX, targetY) => {
          if (!chip) return;
          const r = chip.getBoundingClientRect();
          const cx = r.left + r.width * 0.5 - canvasRect.left;
          const cy = r.top + r.height * 0.5 - canvasRect.top;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
        };

        // Top-left chip angled ray down-right to star
        drawRay(chip1, starPxX, starPxY);
        // Top-right chip angled ray down-left to star
        drawRay(chip2, starPxX, starPxY);
        // Bottom-center chip vertical ray straight up to star base
        drawRay(chip5, starPxX, starPxY + 22);

        ctx.restore();
      }
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
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
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

/* ==========================================================================
   Section 1: Interactive ASCII Code Matrix Hands & Celestial Astrolabe Core
   - Left Hand: Cybernetic robot hand rendered with streaming matrix ASCII glyphs
   - Right Hand: Biological human hand rendered with warm amber ASCII glyphs
   - Center: 3D rotating Astrolabe celestial sphere with brass gear teeth,
     gimbal coordinate rings, star reticle, and radiant chromatic flare
   - Interactive mouse ripple: cursor movement distorts matrix glyphs
   ========================================================================== */
export function mountAsciiHandsCanvas(canvas) {
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
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  window.addEventListener(
    'pointermove',
    (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
    },
    { passive: true },
  );

  const robotCapsules = [
    { p1: [-0.05, 0.78, -0.05], p2: [0.18, 0.58, 0.0], r1: 0.088, r2: 0.062 },
    { p1: [0.18, 0.58, 0.0], p2: [0.26, 0.48, 0.02], r1: 0.062, r2: 0.054, isJoint: true },
    { p1: [0.26, 0.48, 0.02], p2: [0.34, 0.42, 0.02], r1: 0.054, r2: 0.046 },
    { p1: [0.34, 0.42, 0.02], p2: [0.4, 0.38, 0.03], r1: 0.02, r2: 0.018, isJoint: true },
    { p1: [0.4, 0.38, 0.03], p2: [0.46, 0.345, 0.02], r1: 0.018, r2: 0.014 },
    { p1: [0.26, 0.52, 0.02], p2: [0.3, 0.6, 0.04], r1: 0.022, r2: 0.019, isJoint: true },
    { p1: [0.3, 0.6, 0.04], p2: [0.34, 0.65, 0.03], r1: 0.019, r2: 0.015 },
    { p1: [0.32, 0.46, 0.01], p2: [0.38, 0.48, -0.02], r1: 0.02, r2: 0.017 },
    { p1: [0.38, 0.48, -0.02], p2: [0.35, 0.54, -0.04], r1: 0.017, r2: 0.013 },
    { p1: [0.3, 0.49, 0.0], p2: [0.35, 0.52, -0.03], r1: 0.018, r2: 0.015 },
    { p1: [0.35, 0.52, -0.03], p2: [0.32, 0.57, -0.05], r1: 0.015, r2: 0.012 },
  ];

  const humanCapsules = [
    { p1: [1.05, 0.82, -0.05], p2: [0.82, 0.6, 0.0], r1: 0.09, r2: 0.065 },
    { p1: [0.82, 0.6, 0.0], p2: [0.74, 0.5, 0.02], r1: 0.065, r2: 0.056 },
    { p1: [0.74, 0.5, 0.02], p2: [0.66, 0.42, 0.02], r1: 0.056, r2: 0.048 },
    { p1: [0.66, 0.42, 0.02], p2: [0.6, 0.38, 0.03], r1: 0.02, r2: 0.017 },
    { p1: [0.6, 0.38, 0.03], p2: [0.54, 0.345, 0.02], r1: 0.017, r2: 0.013 },
    { p1: [0.72, 0.54, 0.02], p2: [0.69, 0.62, 0.04], r1: 0.022, r2: 0.018 },
    { p1: [0.69, 0.62, 0.04], p2: [0.65, 0.67, 0.03], r1: 0.018, r2: 0.014 },
    { p1: [0.67, 0.46, 0.01], p2: [0.62, 0.49, -0.02], r1: 0.019, r2: 0.016 },
    { p1: [0.62, 0.49, -0.02], p2: [0.58, 0.54, -0.04], r1: 0.016, r2: 0.012 },
  ];

  function testCapsules(capsules, x, y, lightX, lightY) {
    let bestDistRatio = 1.0;
    let normalX = 0;
    let normalY = 0;
    let normalZ = 1;
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

    const lx = lightX - x;
    const ly = lightY - y;
    const lz = 0.35;
    const lLen = Math.hypot(lx, ly, lz);
    const dot = normalX * (lx / lLen) + normalY * (ly / lLen) + normalZ * (lz / lLen);
    const intensity = Math.max(0.08, dot);

    return { intensity, isJoint, ratio: bestDistRatio };
  }

  const robotChars = ['■', '1', '0', 'X', '>', '[', ']', '#', 'S', 'I', '$', '+', '/', ':'];
  const humanChars = ['•', '·', '*', '+', 's', 'i', 's', '1', 'o', '0', ':', '.', '°'];

  const sparks = Array.from({ length: 42 }, () => ({
    x: 0.5 + (Math.random() - 0.5) * 0.15,
    y: 0.35 + (Math.random() - 0.5) * 0.15,
    vx: (Math.random() - 0.5) * 0.003,
    vy: (Math.random() - 0.5) * 0.003,
    life: Math.random(),
    char: ['·', '*', '+', '1', '0', 'x'][Math.floor(Math.random() * 6)],
  }));

  function draw() {
    time += 0.02;
    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    ctx.clearRect(0, 0, width, height);

    const lightX = 0.5;
    const lightY = 0.36;
    const centerPxX = lightX * width;
    const centerPxY = lightY * height;

    const bgGlow = ctx.createRadialGradient(
      centerPxX,
      centerPxY,
      2,
      centerPxX,
      centerPxY,
      Math.min(width, height) * 0.5,
    );
    bgGlow.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    bgGlow.addColorStop(0.3, 'rgba(168, 85, 247, 0.05)');
    bgGlow.addColorStop(0.7, 'rgba(14, 18, 28, 0.02)');
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(centerPxX, centerPxY, Math.min(width, height) * 0.5, 0, Math.PI * 2);
    ctx.fill();

    const spacing = 11;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const robotShiftX = mouseX * 20;
    const robotShiftY = mouseY * 12;

    for (let py = 0; py < height; py += spacing) {
      for (let px = 0; px < width * 0.49; px += spacing) {
        const normX = (px - robotShiftX) / width;
        const normY = (py - robotShiftY) / height;
        const hit = testCapsules(robotCapsules, normX, normY, lightX, lightY);

        if (hit) {
          const distToMouse = Math.hypot(
            px - (centerPxX + mouseX * width),
            py - (centerPxY + mouseY * height),
          );
          const wave = distToMouse < 120 ? Math.sin(distToMouse * 0.1 - time * 4) * 0.4 : 0;
          const charIndex = Math.min(
            robotChars.length - 1,
            Math.floor((1 - hit.intensity + wave) * (robotChars.length - 1)),
          );
          const ch = robotChars[Math.max(0, charIndex)];

          if (hit.intensity > 0.72) {
            ctx.fillStyle = '#ffffff';
          } else if (hit.isJoint) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
          } else if (hit.intensity > 0.4) {
            ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
          } else {
            ctx.fillStyle = 'rgba(100, 116, 139, 0.65)';
          }

          ctx.fillText(ch, px, py);
        }
      }
    }

    const humanShiftX = -mouseX * 20;
    const humanShiftY = -mouseY * 12;

    for (let py = 0; py < height; py += spacing) {
      for (let px = width * 0.51; px < width; px += spacing) {
        const normX = (px - humanShiftX) / width;
        const normY = (py - humanShiftY) / height;
        const hit = testCapsules(humanCapsules, normX, normY, lightX, lightY);

        if (hit) {
          const distToMouse = Math.hypot(
            px - (centerPxX + mouseX * width),
            py - (centerPxY + mouseY * height),
          );
          const wave = distToMouse < 120 ? Math.sin(distToMouse * 0.1 - time * 4) * 0.4 : 0;
          const charIndex = Math.min(
            humanChars.length - 1,
            Math.floor((1 - hit.intensity + wave) * (humanChars.length - 1)),
          );
          const ch = humanChars[Math.max(0, charIndex)];

          if (hit.intensity > 0.75) {
            ctx.fillStyle = '#ffffff';
          } else if (hit.intensity > 0.45) {
            ctx.fillStyle = 'rgba(254, 215, 170, 0.95)';
          } else {
            ctx.fillStyle = 'rgba(224, 179, 140, 0.75)';
          }

          ctx.fillText(ch, px, py);
        }
      }
    }

    for (let i = 0; i < sparks.length; i++) {
      const sp = sparks[i];
      sp.life += 0.015;
      if (sp.life > 1) {
        sp.life = 0;
        sp.x = 0.46 + Math.random() * 0.08;
        sp.y = 0.32 + Math.random() * 0.08;
      }
      sp.x += sp.vx;
      sp.y += sp.vy;
      const sx = sp.x * width;
      const sy = sp.y * height;
      const alpha = Math.sin(sp.life * Math.PI) * 0.8;
      ctx.fillStyle =
        i % 2 === 0 ? `rgba(56, 189, 248, ${alpha})` : `rgba(224, 179, 140, ${alpha})`;
      ctx.fillText(sp.char, sx, sy);
    }

    // 3D Astrolabe Sphere at Center
    ctx.save();
    ctx.translate(centerPxX, centerPxY);

    ctx.globalCompositeOperation = 'screen';
    const flarePulse = 1.0 + Math.sin(time * 2.5) * 0.15;
    const flareR = 56 * flarePulse;
    const coreFlare = ctx.createRadialGradient(0, 0, 2, 0, 0, flareR);
    coreFlare.addColorStop(0, '#ffffff');
    coreFlare.addColorStop(0.2, 'rgba(254, 215, 170, 0.8)');
    coreFlare.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
    coreFlare.addColorStop(0.8, 'rgba(56, 189, 248, 0.15)');
    coreFlare.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreFlare;
    ctx.beginPath();
    ctx.arc(0, 0, flareR, 0, Math.PI * 2);
    ctx.fill();

    const gearR = 48;
    const numTeeth = 24;
    const gearRot = time * 0.4;
    ctx.strokeStyle = '#e0b38c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < numTeeth * 2; i++) {
      const a = (i * Math.PI) / numTeeth + gearRot;
      const r = i % 2 === 0 ? gearR : gearR - 4;
      const gx = Math.cos(a) * r;
      const gy = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.closePath();
    ctx.stroke();

    const gimbalR = 42;
    const tilt1 = Math.sin(time * 0.7) * 0.5 + 0.3;
    const tilt2 = Math.cos(time * 0.5) * 0.5 - 0.2;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, gimbalR, gimbalR * Math.abs(tilt1), time * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      gimbalR * 0.85,
      gimbalR * 0.85 * Math.abs(tilt2),
      -time * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, gimbalR * 0.65, gimbalR * 0.3, time * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Hairline HUD Vector Lines connecting chips to astrolabe
    const stage = canvas.parentElement;
    if (stage) {
      const chip1 = stage.querySelector('.sl-hud-chip-1');
      const chip2 = stage.querySelector('.sl-hud-chip-2');
      const chip3 = stage.querySelector('.sl-hud-chip-3');
      const chip4 = stage.querySelector('.sl-hud-chip-4');
      const chip5 = stage.querySelector('.sl-hud-chip-5');
      const canvasRect = canvas.getBoundingClientRect();

      ctx.save();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(224, 179, 140, 0.22)';
      ctx.setLineDash([3, 4]);

      const drawRay = (chip, targetX, targetY) => {
        if (!chip) return;
        const r = chip.getBoundingClientRect();
        const cx = r.left + r.width * 0.5 - canvasRect.left;
        const cy = r.top + r.height * 0.5 - canvasRect.top;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      };

      drawRay(chip1, centerPxX - 35, centerPxY - 20);
      drawRay(chip2, centerPxX + 35, centerPxY - 20);
      drawRay(chip3, centerPxX - 35, centerPxY + 20);
      drawRay(chip4, centerPxX + 35, centerPxY + 20);
      drawRay(chip5, centerPxX, centerPxY + 45);

      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

/* ==========================================================================
   Section 2: Interactive Spiral Stardust Galaxy (Persistent Knowledge)
   - 1,600+ Stardust particles orbiting in a logarithmic spiral with 4 arms
   - Central black hole accretion disk with cyan/violet starlight bloom
   - Interactive mouse gravity: cursor attracts and accelerates local stars
   ========================================================================== */
export function mountSpiralGalaxy(canvas) {
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
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
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

  const numParticles = 1600;
  const particles = [];
  const arms = 4;

  for (let i = 0; i < numParticles; i++) {
    const arm = i % arms;
    const rDist = Math.pow(Math.random(), 1.7);
    const maxR = 210;
    const r = rDist * maxR;
    const armAngle = (arm * Math.PI * 2) / arms;
    const spiralAngle = armAngle + (r / maxR) * 4.2 + (Math.random() - 0.5) * 0.45;
    const speed = (0.28 / Math.sqrt(Math.max(12, r))) * (0.8 + Math.random() * 0.4);
    const size = Math.random() < 0.15 ? 1.8 + Math.random() * 1.2 : 0.6 + Math.random() * 0.9;
    const colorType = Math.random();

    particles.push({
      r,
      baseR: r,
      angle: spiralAngle,
      speed,
      size,
      colorType,
      brightness: 0.4 + Math.random() * 0.6,
    });
  }

  function draw() {
    time += 0.015;
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.5;

    const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 140);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(0.12, 'rgba(56, 189, 248, 0.45)');
    coreGrad.addColorStop(0.35, 'rgba(168, 85, 247, 0.25)');
    coreGrad.addColorStop(0.7, 'rgba(30, 27, 75, 0.08)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const mousePxX = cx + mouseX * width * 0.6;
    const mousePxY = cy + mouseY * height * 0.6;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.angle += p.speed;

      const basePx = cx + Math.cos(p.angle) * p.r;
      const basePy = cy + Math.sin(p.angle) * p.r * 0.72;

      const dx = mousePxX - basePx;
      const dy = mousePxY - basePy;
      const distToMouse = Math.hypot(dx, dy);
      let px = basePx;
      let py = basePy;

      if (distToMouse < 110 && distToMouse > 2) {
        const pull = (110 - distToMouse) * 0.06;
        px += (dx / distToMouse) * pull;
        py += (dy / distToMouse) * pull;
      }

      if (p.colorType < 0.45) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.brightness})`;
      } else if (p.colorType < 0.75) {
        ctx.fillStyle = `rgba(147, 197, 253, ${p.brightness * 0.9})`;
      } else if (p.colorType < 0.92) {
        ctx.fillStyle = `rgba(192, 132, 252, ${p.brightness * 0.85})`;
      } else {
        ctx.fillStyle = `rgba(224, 179, 140, ${p.brightness * 0.9})`;
      }

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

/* ==========================================================================
   Section 2: Interactive Chromatic Liquid Metal Starburst (Optimized to build)
   - Procedural undulating chrome liquid metal starburst
   - Iridescent shifts: violet, magenta, electric cyan, and specular chrome
   - Specular reflections follow cursor tracking
   ========================================================================== */
export function mountLiquidStarburst(canvas) {
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
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
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

  const numArms = 10;
  const armStep = (Math.PI * 2) / numArms;

  function draw() {
    time += 0.02;
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const baseR = Math.min(width, height) * 0.36;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flareR = baseR * 1.4;
    const flare = ctx.createRadialGradient(cx, cy, 2, cx, cy, flareR);
    flare.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    flare.addColorStop(0.2, 'rgba(236, 72, 153, 0.35)');
    flare.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
    flare.addColorStop(0.8, 'rgba(56, 189, 248, 0.06)');
    flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(cx, cy, flareR, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const beamAngle = (i * Math.PI) / 4 + time * 0.15;
      const bLen = baseR * (1.2 + Math.sin(time * 3 + i) * 0.2);
      const bx = cx + Math.cos(beamAngle) * bLen;
      const by = cy + Math.sin(beamAngle) * bLen;
      const beamGrad = ctx.createLinearGradient(cx, cy, bx, by);
      beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      beamGrad.addColorStop(0.5, 'rgba(224, 179, 140, 0.2)');
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    const rot = time * 0.2 + mouseX * 0.4;
    ctx.rotate(rot);

    ctx.beginPath();
    for (let i = 0; i < numArms; i++) {
      const aTip = i * armStep;
      const aVal = (i + 0.5) * armStep;
      const wave = Math.sin(time * 2.2 + i * 1.5) * 0.25;
      const tipR = baseR * (1.0 + wave);
      const valR = baseR * 0.32 * (1.0 + Math.sin(time * 1.8 - i) * 0.15);

      const tx = Math.cos(aTip) * tipR;
      const ty = Math.sin(aTip) * tipR;
      const vx = Math.cos(aVal) * valR;
      const vy = Math.sin(aVal) * valR;

      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.quadraticCurveTo(vx * 0.8, vy * 0.8, tx, ty);
    }
    ctx.closePath();

    const metalGrad = ctx.createLinearGradient(-baseR, -baseR, baseR, baseR);
    metalGrad.addColorStop(0, '#581c87');
    metalGrad.addColorStop(0.25, '#7c3aed');
    metalGrad.addColorStop(0.5, '#ec4899');
    metalGrad.addColorStop(0.75, '#06b6d4');
    metalGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = metalGrad;
    ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
    ctx.shadowBlur = 35;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < numArms; i++) {
      const aTip = i * armStep;
      const aVal = (i + 0.5) * armStep;
      const wave = Math.sin(time * 2.2 + i * 1.5) * 0.2;
      const tipR = baseR * 0.7 * (1.0 + wave);
      const valR = baseR * 0.22;

      const tx = Math.cos(aTip) * tipR;
      const ty = Math.sin(aTip) * tipR;
      const vx = Math.cos(aVal) * valR;
      const vy = Math.sin(aVal) * valR;

      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.quadraticCurveTo(vx * 0.8, vy * 0.8, tx, ty);
    }
    ctx.closePath();

    const chromeGrad = ctx.createLinearGradient(
      -baseR * 0.5 + mouseX * 60,
      -baseR * 0.5 + mouseY * 60,
      baseR * 0.5,
      baseR * 0.5,
    );
    chromeGrad.addColorStop(0, '#ffffff');
    chromeGrad.addColorStop(0.3, '#fbcfe8');
    chromeGrad.addColorStop(0.6, '#bae6fd');
    chromeGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = chromeGrad;
    ctx.shadowBlur = 0;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

/* ==========================================================================
   Section 3: 3D Voyager Golden Record & Holographic Chess Knight (Memories)
   - Concentric spun gold micro-grooves with rotating anisotropic butterfly sheen
   - Etched Voyager pulsar map and hydrogen spin transition symbols
   - 3D tilted planetary golden ring
   - Dual obsidian/holographic chess knight with cyan/magenta glitch scanlines
   ========================================================================== */
export function mountGoldenRecord(canvas) {
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
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
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

  const pulsarAngles = [
    0, 0.35, 0.72, 1.15, 1.58, 2.05, 2.48, 2.95, 3.42, 3.88, 4.35, 4.8, 5.25, 5.75,
  ];
  const pulsarLens = [
    0.85, 0.6, 0.75, 0.55, 0.9, 0.65, 0.8, 0.5, 0.7, 0.95, 0.62, 0.78, 0.58, 0.88,
  ];

  function draw() {
    time += 0.015;
    ctx.clearRect(0, 0, width, height);

    const neb = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      5,
      width * 0.5,
      height * 0.5,
      width * 0.6,
    );
    neb.addColorStop(0, 'rgba(147, 51, 234, 0.18)');
    neb.addColorStop(0.4, 'rgba(88, 28, 135, 0.1)');
    neb.addColorStop(0.8, 'rgba(15, 23, 42, 0.04)');
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, width, height);

    const rcx = width * 0.42;
    const rcy = height * 0.52;
    const R = Math.min(width, height) * 0.38;
    const pitch = 0.56;

    ctx.save();
    ctx.translate(rcx, rcy);
    ctx.rotate(-0.35 + mouseX * 0.15);
    const ringR = R * 1.35;
    const ringPitch = pitch * 0.7;

    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, ringR, ringR * ringPitch, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, R, R * pitch, 0, 0, Math.PI * 2);
    const goldGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, R);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.2, '#ca8a04');
    goldGrad.addColorStop(0.5, '#eab308');
    goldGrad.addColorStop(0.8, '#a16207');
    goldGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = goldGrad;
    ctx.shadowColor = 'rgba(234, 179, 8, 0.45)';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.8;
    for (let r = R * 0.28; r < R * 0.94; r += 4.5) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * pitch, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sheenRot = time * 0.3;
    for (let i = 0; i < 2; i++) {
      const a = sheenRot + i * Math.PI;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R * 0.94, a - 0.25, a + 0.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 1.0;
    const mapRot = time * 0.08;

    for (let i = 0; i < pulsarAngles.length; i++) {
      const a = pulsarAngles[i] + mapRot;
      const len = R * 0.75 * pulsarLens[i];
      const ex = Math.cos(a) * len;
      const ey = Math.sin(a) * len * pitch;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const numTicks = 3 + (i % 4);
      for (let k = 1; k <= numTicks; k++) {
        const frac = k / (numTicks + 1);
        const tx = ex * frac;
        const ty = ey * frac;
        ctx.beginPath();
        ctx.moveTo(tx - 2, ty - 2);
        ctx.lineTo(tx + 2, ty + 2);
        ctx.stroke();
      }
    }

    const hx = R * 0.45;
    const hy = -R * 0.25 * pitch;
    ctx.beginPath();
    ctx.arc(hx - 12, hy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx + 12, hy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy);
    ctx.lineTo(hx + 6, hy);
    ctx.stroke();

    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.18, R * 0.18 * pitch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, ringR, ringR * ringPitch, 0, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    // Dual Obsidian & Holographic Chess Knight
    const kx = width * 0.76;
    const ky = height * 0.55;
    const kScale = 1.1;

    ctx.save();
    ctx.translate(kx, ky);
    ctx.scale(kScale, kScale);

    // Left half: Obsidian
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(-12, -48);
    ctx.lineTo(-18, -32);
    ctx.lineTo(-24, -10);
    ctx.lineTo(-22, 18);
    ctx.lineTo(-26, 38);
    ctx.lineTo(0, 38);
    ctx.lineTo(0, -60);
    ctx.closePath();

    const obsGrad = ctx.createLinearGradient(-26, -60, 0, 38);
    obsGrad.addColorStop(0, '#1e293b');
    obsGrad.addColorStop(0.4, '#0f172a');
    obsGrad.addColorStop(1, '#020617');
    ctx.fillStyle = obsGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -38, 2, 0, Math.PI * 2);
    ctx.fill();

    // Right half: Holographic Glitch
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(6, -55);
    ctx.lineTo(18, -42);
    ctx.lineTo(26, -32);
    ctx.lineTo(22, -22);
    ctx.lineTo(16, -14);
    ctx.lineTo(18, 6);
    ctx.lineTo(24, 38);
    ctx.lineTo(0, 38);
    ctx.lineTo(0, -60);
    ctx.closePath();

    const holoGrad = ctx.createLinearGradient(0, -60, 26, 38);
    holoGrad.addColorStop(0, '#00f0ff');
    holoGrad.addColorStop(0.5, '#ec4899');
    holoGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.fill();
    ctx.strokeStyle = holoGrad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.lineWidth = 0.8;
    for (let sy = -50; sy < 35; sy += 7) {
      const glitchX = Math.sin(sy * 0.4 + time * 6) > 0.6 ? 3 : 0;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(20 + glitchX, sy);
      ctx.stroke();
    }

    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

/* ==========================================================================
   Section 4: Bioluminescent Neural Synapse Network & Glass Chains (Security)
   - 20 Interconnected neuron soma nodes with curved axons and dendrites
   - High-energy electrical action potential pulses racing along synapses
   - Central glowing glass synaptic neuron
   - 3D Refractive optical crystal chain links
   ========================================================================== */
export function mountSynapseNetwork(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let raf = 0;
  let time = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const numNodes = 20;
  const nodes = [];
  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      x: 0.12 + Math.random() * 0.76,
      y: 0.12 + Math.random() * 0.76,
      baseRadius: 3 + Math.random() * 4,
      glow: 0,
      connections: [],
    });
  }

  for (let i = 0; i < numNodes; i++) {
    for (let j = i + 1; j < numNodes; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < 0.35 && nodes[i].connections.length < 4) {
        nodes[i].connections.push(j);
      }
    }
  }

  const pulses = Array.from({ length: 32 }, () => ({
    from: Math.floor(Math.random() * numNodes),
    to: 0,
    progress: Math.random(),
    speed: 0.008 + Math.random() * 0.012,
  }));

  pulses.forEach((p) => {
    const conns = nodes[p.from].connections;
    p.to =
      conns.length > 0 ? conns[Math.floor(Math.random() * conns.length)] : (p.from + 1) % numNodes;
  });

  function draw() {
    time += 0.02;
    ctx.clearRect(0, 0, width, height);

    const atmo = ctx.createRadialGradient(
      width * 0.45,
      height * 0.45,
      5,
      width * 0.45,
      height * 0.45,
      width * 0.55,
    );
    atmo.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
    atmo.addColorStop(0.35, 'rgba(168, 85, 247, 0.1)');
    atmo.addColorStop(0.7, 'rgba(13, 148, 136, 0.04)');
    atmo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = atmo;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1.0;
    for (let i = 0; i < numNodes; i++) {
      const n1 = nodes[i];
      for (const targetIdx of n1.connections) {
        const n2 = nodes[targetIdx];
        const x1 = n1.x * width;
        const y1 = n1.y * height;
        const x2 = n2.x * width;
        const y2 = n2.y * height;

        const cpx = (x1 + x2) * 0.5 + Math.sin(time + i) * 12;
        const cpy = (y1 + y2) * 0.5 + Math.cos(time + targetIdx) * 12;

        const axonGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        axonGrad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        axonGrad.addColorStop(1, 'rgba(56, 189, 248, 0.4)');
        ctx.strokeStyle = axonGrad;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of pulses) {
      p.progress += p.speed;
      if (p.progress >= 1.0) {
        p.progress = 0;
        p.from = p.to;
        const conns = nodes[p.from].connections;
        p.to =
          conns.length > 0
            ? conns[Math.floor(Math.random() * conns.length)]
            : Math.floor(Math.random() * numNodes);
        nodes[p.from].glow = 1.0;
      }

      const n1 = nodes[p.from];
      const n2 = nodes[p.to];
      const x1 = n1.x * width;
      const y1 = n1.y * height;
      const x2 = n2.x * width;
      const y2 = n2.y * height;
      const cpx = (x1 + x2) * 0.5;
      const cpy = (y1 + y2) * 0.5;

      const t = p.progress;
      const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpx + t * t * x2;
      const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpy + t * t * y2;

      const pulseGrad = ctx.createRadialGradient(px, py, 1, px, py, 10);
      pulseGrad.addColorStop(0, '#ffffff');
      pulseGrad.addColorStop(0.3, '#38bdf8');
      pulseGrad.addColorStop(0.8, 'rgba(168, 85, 247, 0.5)');
      pulseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pulseGrad;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const node of nodes) {
      node.glow = Math.max(0, node.glow - 0.04);
      const nx = node.x * width;
      const ny = node.y * height;
      const r = node.baseRadius + node.glow * 5;

      ctx.fillStyle = node.glow > 0.1 ? '#ffffff' : 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass Synaptic Neuron
    const gnx = width * 0.44;
    const gny = height * 0.42;
    const gnR = 48;

    ctx.save();
    ctx.translate(gnx, gny);

    const glassGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, gnR);
    glassGrad.addColorStop(0, '#ffffff');
    glassGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.7)');
    glassGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.35)');
    glassGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.8)');
    glassGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.arc(0, 0, gnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3D Refractive Optical Crystal Chain Links
    const chainX = width * 0.82;
    const chainY = height * 0.52;

    ctx.save();
    ctx.translate(chainX, chainY);

    for (let k = -1; k <= 1; k++) {
      const linkY = k * 52;
      const linkW = 22;
      const linkH = 46;

      ctx.save();
      ctx.translate(0, linkY);
      if (k % 2 !== 0) ctx.rotate(Math.PI / 2);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(-linkW * 0.5, -linkH * 0.5, linkW, linkH, 12);
      ctx.stroke();

      ctx.strokeStyle = k === 0 ? 'rgba(56, 189, 248, 0.9)' : 'rgba(168, 85, 247, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-linkW * 0.5 + 1.5, -linkH * 0.5 + 1.5, linkW - 3, linkH - 3, 10);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);
}

/* ==========================================================================
   Section 5: Orbiting Constellation of 7 Sacred Emblems (Superintelligence)
   - 3D Tilted elliptical orbital system around central statement
   - Depth-sorted rendering (z-depth determines scale, opacity, and layering)
   - Emblems: Butterfly, Synapse, Atomic Ring, Chess Knight, Astrolabe, Starburst, DNA
   ========================================================================== */
export function mountSacredOrbit(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let raf = 0;
  let time = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    if (newWidth === width && newHeight === height && canvas.width > 0) return;
    width = newWidth;
    height = newHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const numEmblems = 7;

  function draw() {
    time += 0.018;
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const rx = width * 0.4;
    const ry = height * 0.34;
    const tilt = 0.44;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry * tilt, 0, 0, Math.PI * 2);
    ctx.stroke();

    const emblems = [];
    for (let i = 0; i < numEmblems; i++) {
      const a = time * 0.4 + (i * Math.PI * 2) / numEmblems;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry * tilt;
      const z = Math.sin(a);
      emblems.push({ id: i, x, y, z, a });
    }

    emblems.sort((e1, e2) => e1.z - e2.z);

    for (const em of emblems) {
      const scale = 0.75 + 0.35 * (em.z + 1) * 0.5;
      const alpha = 0.45 + 0.55 * (em.z + 1) * 0.5;

      ctx.save();
      ctx.translate(em.x, em.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      switch (em.id) {
        case 0:
          drawButterfly(ctx, time);
          break;
        case 1:
          drawSynapseCluster(ctx, time);
          break;
        case 2:
          drawAtomicRing(ctx, time);
          break;
        case 3:
          drawMiniKnight(ctx, time);
          break;
        case 4:
          drawMiniAstrolabe(ctx, time);
          break;
        case 5:
          drawMiniStarburst(ctx, time);
          break;
        case 6:
          drawDnaHelix(ctx, time);
          break;
      }

      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  function drawButterfly(c, t) {
    const flap = Math.cos(t * 8) * 0.85;
    c.strokeStyle = '#c084fc';
    c.fillStyle = 'rgba(168, 85, 247, 0.45)';
    c.lineWidth = 1.2;

    c.save();
    c.scale(flap, 1);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-24, -20, -32, 6, 0, 16);
    c.fill();
    c.stroke();
    c.restore();

    c.save();
    c.scale(-flap, 1);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-24, -20, -32, 6, 0, 16);
    c.fill();
    c.stroke();
    c.restore();

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(0, 5, 2, 10, 0, 0, Math.PI * 2);
    c.fill();
  }

  function drawSynapseCluster(c, t) {
    c.strokeStyle = '#38bdf8';
    c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + t * 0.5;
      const r = 18 + Math.sin(t * 3 + i) * 3;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(Math.cos(a) * r, Math.sin(a) * r, 2.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawAtomicRing(c, t) {
    c.strokeStyle = '#4ade80';
    c.lineWidth = 1.0;
    for (let k = 0; k < 3; k++) {
      c.save();
      c.rotate((k * Math.PI) / 3 + t * 0.3);
      c.beginPath();
      c.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
      c.stroke();
      const ea = t * 2 + k * 2;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(Math.cos(ea) * 20, Math.sin(ea) * 7, 2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.fillStyle = '#4ade80';
    c.beginPath();
    c.arc(0, 0, 3.5, 0, Math.PI * 2);
    c.fill();
  }

  function drawMiniKnight(c) {
    c.fillStyle = '#00f0ff';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.0;
    c.beginPath();
    c.moveTo(0, -18);
    c.lineTo(-8, -12);
    c.lineTo(-10, 8);
    c.lineTo(-12, 16);
    c.lineTo(12, 16);
    c.lineTo(8, -4);
    c.lineTo(10, -12);
    c.closePath();
    c.fill();
    c.stroke();
  }

  function drawMiniAstrolabe(c, t) {
    c.strokeStyle = '#e0b38c';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 0, 16, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#38bdf8';
    c.beginPath();
    c.ellipse(0, 0, 16, 6, t * 0.6, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();
  }

  function drawMiniStarburst(c, t) {
    c.strokeStyle = '#ec4899';
    c.fillStyle = 'rgba(236, 72, 153, 0.4)';
    c.lineWidth = 1.0;
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8 + t * 0.5;
      const r = i % 2 === 0 ? 18 : 6;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    c.stroke();
  }

  function drawDnaHelix(c, t) {
    c.strokeStyle = '#a855f7';
    c.lineWidth = 1.2;
    for (let i = -16; i <= 16; i += 4) {
      const w = Math.sin(i * 0.2 + t * 2) * 12;
      c.beginPath();
      c.moveTo(-w, i);
      c.lineTo(w, i);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(-w, i, 1.8, 0, Math.PI * 2);
      c.arc(w, i, 1.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  raf = requestAnimationFrame(draw);
}

// Auto-mount canvases
const creationCanvas = document.getElementById('creationCanvas');
if (creationCanvas) mountCreationCenterpiece(creationCanvas);

const bloomCanvas = document.getElementById('bloomCanvas');
if (bloomCanvas) mountBloomVisual(bloomCanvas);

// Auto-mount the 5 Official Master Showcase Canvases
const asciiHandsCanvas = document.getElementById('asciiHandsCanvas');
if (asciiHandsCanvas) mountAsciiHandsCanvas(asciiHandsCanvas);

const spiralGalaxyCanvas = document.getElementById('spiralGalaxyCanvas');
if (spiralGalaxyCanvas) mountSpiralGalaxy(spiralGalaxyCanvas);

const liquidStarburstCanvas = document.getElementById('liquidStarburstCanvas');
if (liquidStarburstCanvas) mountLiquidStarburst(liquidStarburstCanvas);

const goldenRecordCanvas = document.getElementById('goldenRecordCanvas');
if (goldenRecordCanvas) mountGoldenRecord(goldenRecordCanvas);

const neuralSynapseCanvas = document.getElementById('neuralSynapseCanvas');
if (neuralSynapseCanvas) mountSynapseNetwork(neuralSynapseCanvas);

const sacredOrbitCanvas = document.getElementById('sacredOrbitCanvas');
if (sacredOrbitCanvas) mountSacredOrbit(sacredOrbitCanvas);

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
