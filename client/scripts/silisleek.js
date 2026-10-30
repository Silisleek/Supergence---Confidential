import { hydrateIcons } from './supergence-icons.js';
import { mountMotionSurface, decorateMotion, revealOnScroll } from './supergence-motion.js';

// Hydrate SVG outline icons
hydrateIcons();

// Mount futuristic ambient particles over the hero section
const heroEl = document.querySelector('.sl-hero, .sl-installer-hero');
if (heroEl) {
  mountMotionSurface(heroEl, { count: 80, strength: 1.1 });
}

// Reveal elements on scroll
revealOnScroll(document.querySelectorAll('.sl-section, .sl-dist-grid, .sl-readiness-widget'));
decorateMotion(document.querySelectorAll('.sl-card, .sl-dist-card, .sl-term-card, .sl-step-card'));

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
  const copyBtn = e.target.closest('[data-copy]');
  if (!copyBtn) return;
  const text = copyBtn.dataset.copy;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard: ' + text.slice(0, 32) + (text.length > 32 ? '...' : ''));
  } catch {
    // Fallback
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    showToast('Copied to clipboard!');
  }
});

// Live System Diagnostic Detector (for installer page)
export async function runSystemDiagnostics() {
  const osEl = document.getElementById('diagOS');
  const archEl = document.getElementById('diagArch');
  const webglEl = document.getElementById('diagWebGL');
  const localAppEl = document.getElementById('diagLocalApp');
  const screenEl = document.getElementById('diagScreen');

  // OS & Platform
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

  // Architecture
  if (archEl) {
    const isArm = /arm64|aarch64/i.test(navigator.userAgent);
    archEl.textContent = isArm ? 'ARM64 (Prism Emulation)' : 'x86_64 / x64 (Native)';
    archEl.style.color = 'var(--sl-copper-light)';
  }

  // Screen & DPI
  if (screenEl) {
    const dpr = window.devicePixelRatio || 1;
    screenEl.textContent = `${window.screen.width} × ${window.screen.height} (${dpr}x DPR)`;
  }

  // WebGL 2.0 Check
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
          'Available (' +
          (renderer.includes('NVIDIA')
            ? 'NVIDIA'
            : renderer.includes('AMD')
              ? 'AMD'
              : renderer.includes('Intel')
                ? 'Intel'
                : 'GPU Active') +
          ')';
        webglEl.style.color = 'var(--sl-emerald)';
      } else {
        webglEl.textContent = 'Software fallback';
      }
    } catch {
      webglEl.textContent = 'Standard Canvas';
    }
  }

  // Ping Local Supergence Backend
  if (localAppEl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        localAppEl.textContent = 'Active on Loopback (Port 3001)';
        localAppEl.style.color = 'var(--sl-emerald)';
      } else {
        localAppEl.textContent = 'Ready to Install / Launch';
        localAppEl.style.color = 'var(--sl-text-muted)';
      }
    } catch {
      localAppEl.textContent = 'Ready for Deployment';
      localAppEl.style.color = 'var(--sl-text-muted)';
    }
  }
}

if (document.getElementById('diagOS')) {
  void runSystemDiagnostics();
}
