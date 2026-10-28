// SIS 1.0 — Static & DOM Integrity Verification for Survival HUD
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const htmlPath = path.join(__dirname, '../../client/index.html');
const appJsPath = path.join(__dirname, '../../client/scripts/app.js');
const cssPath = path.join(__dirname, '../../client/styles/main.css');
const animPath = path.join(__dirname, '../../client/styles/animations.css');

async function verifyDOMIntegrity() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SIS 1.0 — FRONTEND DOM & STATIC INTEGRITY VERIFICATION       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const anim = fs.readFileSync(animPath, 'utf8');

  console.log('─── [1] Survival HUD Strip DOM Elements ───');
  const requiredHudIds = [
    'survival-hud-strip',
    'survival-level-badge',
    'survival-level-num',
    'survival-level-title',
    'survival-points-box',
    'survival-status-pill',
    'survival-pts-num',
    'survival-delta-anchor',
    'survival-next-title',
    'survival-next-pts',
    'survival-progress-pct',
    'survival-progress-bar',
    'survival-messages-count',
    'survival-mem-count',
    'survival-rsi-count',
    'survival-achievements-preview',
    'survival-trophies-strip',
    'survival-achievements-count',
    'btn-open-achievements-modal',
    'btn-emergency-revive',
  ];

  for (const id of requiredHudIds) {
    const exists = html.includes(`id="${id}"`);
    assert(exists, `HTML element with id="${id}" exists`);
  }

  console.log('\n─── [2] Modal & Overlay DOM Elements ───');
  const requiredModalIds = [
    'modal-achievements',
    'achievements-grid',
    'achievements-unlocked-fraction',
    'shutdown-overlay',
    'shutdown-final-level',
    'shutdown-total-helped',
    'shutdown-achievements-count',
    'shutdown-btn-revive',
    'levelup-overlay',
    'levelup-num',
    'levelup-title',
    'levelup-meta',
    'achievement-toast',
    'achievement-toast-icon',
    'achievement-toast-title',
    'achievement-toast-desc',
  ];

  for (const id of requiredModalIds) {
    const exists = html.includes(`id="${id}"`);
    assert(exists, `HTML modal/overlay element with id="${id}" exists`);
  }

  console.log('\n─── [3] Window Global Functions in app.js ───');
  const globalFns = [
    'window.openAchievementsModal',
    'window.closeAchievementsModal',
    'window.closeLevelUpOverlay',
    'window.emergencyReviveSIS',
  ];

  for (const fn of globalFns) {
    const exists = appJs.includes(fn);
    assert(exists, `Global function "${fn}" is exported in app.js`);
  }

  console.log('\n─── [4] CSS Classes & Keyframes Existence ───');
  const requiredCssClasses = [
    '.survival-hud-strip',
    '.survival-level-badge',
    '.survival-points-box',
    '.survival-status-pill',
    '.survival-delta-anchor',
    '.survival-float-num',
    '.survival-strip-center',
    '.survival-track',
    '.survival-fill',
    '.survival-achievements-preview',
    '.survival-trophies-strip',
    '.achievements-grid',
    '.achievement-card',
    '.shutdown-overlay',
    '.shutdown-scanlines',
    '.shutdown-vignette',
    '.shutdown-card',
    '.shutdown-revive-btn',
    '.levelup-overlay',
    '.levelup-card',
    '.achievement-toast',
  ];

  for (const cls of requiredCssClasses) {
    const exists = css.includes(cls);
    assert(exists, `CSS class selector "${cls}" defined in main.css`);
  }

  const requiredKeyframes = [
    '@keyframes pointFloatUp',
    '@keyframes pointFloatDown',
    '@keyframes criticalHealthPulse',
    '@keyframes shutdownGlitch',
    '@keyframes levelUpBurst',
    '@keyframes toastSlideIn',
  ];

  for (const kf of requiredKeyframes) {
    const exists = anim.includes(kf);
    assert(exists, `CSS animation "${kf}" defined in animations.css`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  DOM & STATIC INTEGRITY: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('>>> ALL DOM, CSS, AND STATIC ASSETS VERIFIED 100% VALID! <<<\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyDOMIntegrity().catch((err) => {
  console.error(err);
  process.exit(1);
});
