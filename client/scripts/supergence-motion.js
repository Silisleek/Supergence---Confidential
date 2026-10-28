// Decorative motion only. Particle positions are never presented as app telemetry.
const preferenceKey = 'sis-visual-motion';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const listeners = new Set();
let wanted = true;
try {
  wanted = localStorage.getItem(preferenceKey) !== 'off';
} catch {
  // Motion preferences still work for this page without browser storage.
}
export function motionEnabled() {
  return wanted && !reduced.matches;
}
function announce() {
  document.body.dataset.sgMotion = motionEnabled() ? 'on' : 'off';
  document.body.dataset.sgPageHidden = String(document.hidden);
  for (const update of listeners) update();
}
function setMotion(value) {
  wanted = value;
  try {
    localStorage.setItem(preferenceKey, value ? 'on' : 'off');
  } catch {
    // No persistent preference is required for the controls to work.
  }
  announce();
}
reduced.addEventListener('change', announce);
document.addEventListener('visibilitychange', announce);
window.addEventListener('pageshow', announce);
window.addEventListener('pagehide', () => {
  document.body.dataset.sgPageHidden = 'true';
  for (const update of listeners) update(true);
});
window.addEventListener('storage', (event) => {
  if (event.key !== preferenceKey) return;
  wanted = event.newValue !== 'off';
  announce();
});
announce();

export function bindMotionToggle(control) {
  if (!control) return;
  const checkbox = control instanceof HTMLInputElement;
  const update = () => {
    const enabled = motionEnabled();
    if (checkbox) control.checked = enabled;
    else {
      control.setAttribute('aria-pressed', String(enabled));
      const label = control.querySelector('[data-motion-label]');
      if (label)
        label.textContent = reduced.matches
          ? 'Reduced motion'
          : enabled
            ? 'Motion on'
            : 'Motion off';
    }
    control.disabled = reduced.matches;
    control.title = reduced.matches
      ? 'Your system preference reduces motion.'
      : 'Toggle decorative particles and ambient animation';
  };
  listeners.add(update);
  control.addEventListener(checkbox ? 'change' : 'click', () => {
    setMotion(checkbox ? control.checked : !motionEnabled());
  });
  update();
}

export function mountMotionSurface(host, { count = 64, strength = 1 } = {}) {
  if (!host || host.querySelector(':scope > .sg-motion-canvas')) return null;
  host.classList.add('sg-motion-surface');
  const canvas = document.createElement('canvas');
  canvas.className = 'sg-motion-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.frames = '0';
  host.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    return null;
  }
  let width = 1,
    height = 1,
    frame = 0,
    raf = 0,
    last = 0;
  let visible = false,
    destroyed = false,
    accent = '#e0b38c';
  let mouseX = 0,
    mouseY = 0;
  const sparks = [];
  const points = [];
  const updateColor = () => {
    accent = getComputedStyle(host).getPropertyValue('--shell-accent').trim() || '#e0b38c';
  };
  function draw(now) {
    raf = 0;
    if (destroyed || !visible || document.hidden || !motionEnabled()) return;
    raf = requestAnimationFrame(draw);
    if (now - last < 32) return; // Decorative canvas is capped near 30 draws/s.
    const dt = Math.min((now - (last || now)) / 1000, 0.08);
    last = now;
    ctx.clearRect(0, 0, width, height);
    const n = Math.min(count, width < 600 || coarse.matches ? 32 : 72);
    const cx = width * (width > 700 ? 0.75 : 0.5) + mouseX * 9;
    const cy = height * (width > 700 ? 0.29 : 0.43) + mouseY * 7;
    const radius = Math.min(width * 0.28, height * 0.34, 260);
    points.length = 0;
    for (let i = 0; i < n; i++) {
      const a = i * 2.3999632297 + now * 0.000045 * (i % 2 ? 1 : -1);
      const ring = 0.45 + ((i * 17) % 53) / 53;
      const z = Math.cos(a + i * 0.23);
      points.push({
        x: cx + Math.sin(a) * radius * ring,
        y: cy + Math.sin(a * 0.64 + i * 1.7) * radius * ring * 0.65,
        z,
        alpha: (0.16 + (z + 1) * 0.2) * strength,
      });
    }
    ctx.strokeStyle = accent;
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        next = points[(i + 3) % points.length];
      const distance = Math.hypot(p.x - next.x, p.y - next.y);
      if (distance < 92) {
        ctx.globalAlpha = (1 - distance / 92) * 0.14 * strength;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = accent;
    for (const p of points) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + (p.z + 1) * 0.55, 0, Math.PI * 2);
      ctx.fill();
      if (p.z > 0.75) {
        ctx.globalAlpha = p.alpha * 0.08;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      spark.life -= dt;
      if (spark.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.95;
      spark.vy *= 0.95;
      ctx.globalAlpha = Math.max(0, spark.life / spark.total) * 0.7;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    canvas.dataset.frames = String(++frame);
  }
  const sync = (forcePause = false) => {
    cancelAnimationFrame(raf);
    raf = 0;
    const running = !destroyed && visible && !document.hidden && !forcePause && motionEnabled();
    canvas.dataset.running = String(running);
    if (running) {
      last = 0;
      raf = requestAnimationFrame(draw);
    } else ctx.clearRect(0, 0, width, height);
  };
  const resize = new ResizeObserver(() => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sync();
  });
  resize.observe(host);
  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0 },
  );
  visibility.observe(host);
  const palette = new MutationObserver(updateColor);
  palette.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
  const onMove = (event) => {
    if (!motionEnabled() || coarse.matches) return;
    const rect = host.getBoundingClientRect();
    const x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    mouseX = x / Math.max(rect.width, 1) - 0.5;
    mouseY = y / Math.max(rect.height, 1) - 0.5;
    if (sparks.length < 48) sparks.push({ x, y, vx: -mouseX * 8, vy: -14, life: 0.7, total: 0.7 });
  };
  const onDown = (event) => {
    if (!motionEnabled()) return;
    const rect = host.getBoundingClientRect();
    for (let i = 0; i < 14 && sparks.length < 64; i++) {
      const a = (i / 14) * Math.PI * 2;
      sparks.push({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        vx: Math.cos(a) * 75,
        vy: Math.sin(a) * 75,
        life: 0.9,
        total: 0.9,
      });
    }
  };
  host.addEventListener('pointermove', onMove, { passive: true });
  host.addEventListener('pointerdown', onDown, { passive: true });
  listeners.add(sync);
  updateColor();
  sync();
  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      listeners.delete(sync);
      resize.disconnect();
      visibility.disconnect();
      palette.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      canvas.remove();
      host.classList.remove('sg-motion-surface');
    },
  };
}

const revealed = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealed.unobserve(entry.target);
    }
  },
  { threshold: 0.08 },
);
export function revealOnScroll(elements) {
  for (const element of elements) {
    element.classList.add('sg-reveal');
    revealed.observe(element);
  }
}
export function decorateMotion(elements) {
  for (const element of elements) {
    if (element.dataset.sgInteractive) continue;
    element.dataset.sgInteractive = 'true';
    element.classList.add('sg-interactive');
    element.addEventListener(
      'pointermove',
      (event) => {
        if (!motionEnabled() || coarse.matches) return;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        element.style.setProperty('--pointer-x', `${x * 100}%`);
        element.style.setProperty('--pointer-y', `${y * 100}%`);
        element.style.setProperty('--tilt-x', `${(0.5 - y) * 2}deg`);
        element.style.setProperty('--tilt-y', `${(x - 0.5) * 2}deg`);
      },
      { passive: true },
    );
    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--tilt-x', '0deg');
      element.style.setProperty('--tilt-y', '0deg');
    });
  }
}
