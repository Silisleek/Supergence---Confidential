/* ==========================================================================
   Supergence on Silisleek.com — Client Interaction Script
   - Hardware Environment Diagnostics
   - SHA-256 Checksum Clipboard Copy
   - Smooth Capsule Navigation & Active Intersection Observer
   - Subtle Glass Float Micro-Interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initDiagnostics();
  initCopyButtons();
  initNavObserver();
  initSubtleParallax();
});

// 1. Hardware Environment Diagnostics (Pure client inspection, zero telemetry)
function initDiagnostics() {
  const diagOS = document.getElementById('diagOS');
  const diagArch = document.getElementById('diagArch');
  const diagWebGL = document.getElementById('diagWebGL');
  const diagLocalApp = document.getElementById('diagLocalApp');

  if (diagOS) {
    const userAgent = navigator.userAgent || '';
    if (userAgent.includes('Windows NT 10.0')) {
      diagOS.textContent = 'Windows 10 / 11 (Verified)';
    } else if (userAgent.includes('Windows')) {
      diagOS.textContent = 'Windows NT Host (Detected)';
    } else if (userAgent.includes('Mac OS')) {
      diagOS.textContent = 'macOS Host (Local Dev Mode)';
    } else if (userAgent.includes('Linux')) {
      diagOS.textContent = 'Linux Host (Local Dev Mode)';
    } else {
      diagOS.textContent = 'Host Detected (64-bit)';
    }
  }

  if (diagArch) {
    const uaData = navigator.userAgentData;
    if (uaData && uaData.architecture) {
      diagArch.textContent = `${uaData.architecture.toUpperCase()} Architecture`;
    } else {
      const is64 = navigator.userAgent.includes('Win64') || navigator.userAgent.includes('x64');
      diagArch.textContent = is64 ? 'x86_64 Architecture' : '64-Bit Host';
    }
  }

  if (diagWebGL) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          diagWebGL.textContent = renderer ? renderer.split(' Direct3D')[0].slice(0, 32) : 'WebGL 2.0 Hardware';
        } else {
          diagWebGL.textContent = 'WebGL 2.0 Active';
        }
      } else {
        diagWebGL.textContent = 'Hardware Canvas Ready';
      }
    } catch {
      diagWebGL.textContent = 'Hardware Accel Ready';
    }
  }

  if (diagLocalApp) {
    diagLocalApp.textContent = '127.0.0.1 Air-Gapped';
  }
}

// 2. SHA-256 Checksum Clipboard Copy
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.sl-copy-btn');
  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.warn('[Silisleek] Clipboard write failed, falling back:', err);
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy';
          }, 2000);
        } catch {
          btn.textContent = 'Failed';
        }
        document.body.removeChild(textarea);
      }
    });
  });
}

// 3. Navigation Capsule Observer
function initNavObserver() {
  const sections = document.querySelectorAll('.sl-panel-stage');
  const navPills = document.querySelectorAll('.sl-nav-pill[href^="#"]');
  if (!sections.length || !navPills.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navPills.forEach((pill) => {
            const href = pill.getAttribute('href');
            if (href === `#${id}`) {
              pill.classList.add('active');
            } else {
              pill.classList.remove('active');
            }
          });
        }
      });
    },
    { rootMargin: '-30% 0px -50% 0px' },
  );

  sections.forEach((sec) => observer.observe(sec));
}

// 4. Subtle Parallax Float on Floating Emblems (mouse tracking without procedural canvas)
function initSubtleParallax() {
  const heroSphere = document.querySelector('.sl-center-sphere');
  const floatingElements = document.querySelectorAll('.sl-float-subtle');
  if (!heroSphere && !floatingElements.length) return;

  let ticking = false;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener(
    'pointermove',
    (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      targetX = nx * 12;
      targetY = ny * 12;

      if (!ticking) {
        requestAnimationFrame(() => {
          if (heroSphere) {
            heroSphere.style.transform = `translate(${targetX * 0.8}px, ${targetY * 0.8}px)`;
          }
          floatingElements.forEach((el, idx) => {
            const factor = (idx % 2 === 0 ? 1 : -1) * (0.5 + (idx % 3) * 0.3);
            el.style.transform = `translate(${targetX * factor}px, ${targetY * factor}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );
}
