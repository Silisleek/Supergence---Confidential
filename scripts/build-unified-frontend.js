import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supergence — Powered by Unified SIS System // Apple Liquid Glass</title>
  <meta name="description" content="Supergence — Unified Superintelligent AI System powered by the SIS System, combining Hermes, OpenClaw, OpenDots, OpenBot and scientific domain swarms.">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">

  <!-- Importmap for Three.js ES Modules -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
    }
  }
  </script>

  <style>
    /* ==========================================================================
       VARIABLES & 5-COLOR MODERN APPLE LIQUID GLASS PALETTE:
       1. Linen:      #F4F0E0 (Specular, primary highlights, crisp text)
       2. Lavender:   #9F7CEF (Neural frequency, iridescence, cognition)
       3. Seaweed:    #3D524C (Optical glass substrate, deep spatial void)
       4. Pistachio:  #C6CD85 (Telemetry accents, coherence, synapse status)
       5. Candyfloss: #F1CDE2 (Refractive dispersion, rim light, chromatic flair)
       ========================================================================== */
    :root {
      --color-linen: #F4F0E0;
      --color-lavender: #9F7CEF;
      --color-seaweed: #3D524C;
      --color-pistachio: #C6CD85;
      --color-candyfloss: #F1CDE2;

      --void: #06060A;
      --surface-dark: #0e1614;
      --text: #E0DFE3;
      --text-dim: rgba(224, 223, 227, 0.45);
      --text-ghost: rgba(224, 223, 227, 0.3);

      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
      --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;

      --glass: rgba(255, 255, 255, 0.05);
      --glass-border: rgba(255, 255, 255, 0.08);
      --glass-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      --glass-reflex: rgba(255, 255, 255, 0.2);
      --glass-glow: rgba(255, 255, 255, 0.05);
      --mode-glow: #d269e6;
    }

    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: radial-gradient(circle at 50% 35%, #182521 0%, #0e1614 55%, #070c0b 100%);
      color: var(--color-linen);
      font-family: var(--font-ui);
      user-select: none;
    }

    /* Ambient Spatial Backdrop Caustics */
    .spatial-caustic-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background: 
        radial-gradient(circle at 20% 25%, rgba(159, 124, 239, 0.09) 0%, transparent 45%),
        radial-gradient(circle at 80% 65%, rgba(198, 205, 133, 0.07) 0%, transparent 40%),
        radial-gradient(circle at 50% 90%, rgba(241, 205, 226, 0.06) 0%, transparent 45%);
      filter: blur(70px);
    }

    /* FULLSCREEN SPATIAL VIEWPORT */
    .sis-viewport {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 18px 30px 40px;
      z-index: 10;
      transition: opacity 0.4s var(--ease);
    }

    /* ── 1. TOP HEADER HUD ── */
    .sis-top-hud {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      z-index: 20;
    }

    .brand-mark-group {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    .brand-title {
      font-size: 21px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: var(--color-linen);
      text-shadow: 0 1px 16px rgba(244, 240, 224, 0.35);
    }

    .brand-subtitle {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.8px;
      color: var(--color-lavender);
      text-transform: uppercase;
    }

    .hud-right-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    /* Apple Liquid Glass Date & Time Display */
    .sis-hud-datetime {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-linen);
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(61, 82, 76, 0.28);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(244, 240, 224, 0.16);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 1.5px rgba(244, 240, 224, 0.3);
    }

    .hud-time {
      font-weight: 600;
      color: var(--color-linen);
      letter-spacing: 1px;
    }

    .hud-ampm {
      font-size: 10px;
      color: var(--color-candyfloss);
      font-weight: 600;
    }

    .hud-sep {
      opacity: 0.35;
      font-size: 10px;
    }

    .hud-date {
      color: var(--color-pistachio);
      font-weight: 500;
      letter-spacing: 0.8px;
    }

    .hud-tz {
      font-size: 10px;
      color: rgba(244, 240, 224, 0.5);
    }

    .system-status-lens {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(61, 82, 76, 0.28);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(244, 240, 224, 0.16);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.8px;
      color: var(--color-pistachio);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 1.5px rgba(244, 240, 224, 0.3);
    }

    .status-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-pistachio);
      box-shadow: 0 0 10px var(--color-pistachio);
      animation: pulseCoherence 2.4s ease-in-out infinite;
    }

    @keyframes pulseCoherence {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.35); opacity: 1; }
    }

    /* ── 2. CENTER STAGE: 3D CLOCK & AUTHENTIC LIVING SUPERGENCE FACE (ZERO CLUTTER) ── */
    .sis-center-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      gap: 0;
      position: relative;
      z-index: 10;
    }

    .clock-3d-stage {
      position: relative;
      width: 100%;
      height: 190px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }

    #sis-3d-clock-canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }

    /* AUTHENTIC SYSTEMFACES LIVING ORGANISM */
    .supergence-core-face-wrap {
      position: relative;
      width: 320px;
      height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -20px;
      cursor: pointer;
      transition: transform 0.4s var(--ease), filter 0.4s var(--ease);
      pointer-events: auto;
    }

    .supergence-core-face-wrap:hover {
      transform: scale(1.04);
    }

    .supergence-core-face-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      filter: drop-shadow(0 0 35px rgba(159, 124, 239, 0.4));
    }

    /* Authentic Kinematics & Styling from systemfaces.html */
    .segment {
      stroke: rgba(0, 0, 0, 0);
      stroke-width: 10;
      stroke-linecap: round;
    }

    .joint-core {
      fill: #9F7CEF;
      stroke-width: 5px;
    }

    .arm-core {
      filter: url("#metaball-core");
      scale: 0.25;
      transform-origin: 250px 250px;
      animation: rotateCore 31s ease-in-out infinite;
    }

    #mir-core {
      scale: -0.25;
    }

    @keyframes rotateCore {
      0% { transform: rotate(-90deg); }
      25% { transform: rotate(360deg); }
      50% { transform: rotate(90deg); }
      75% { transform: rotate(-360deg); }
      100% { transform: rotate(-90deg); }
    }

    .arm1-core {
      transform-origin: 260px 200px;
      animation: rotateCore 23s ease-in-out infinite;
    }

    .arm2-core {
      transform-origin: 400px 200px;
      animation: rotateCore 17s ease-in-out infinite;
    }

    .arm3-core {
      transform-origin: 490px 200px;
      animation: rotateCore 11s ease-in-out infinite;
    }

    /* ── 3. LEFT NAV SIDEBAR (EXACT FROM takemessagebarfromthisfile.html) ── */
    #nav {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 150;
      width: 20px;
      transition: width .4s var(--ease), background .4s var(--ease), backdrop-filter .4s var(--ease);
      overflow: hidden;
      border-radius: 0 20px 20px 0;
      background: transparent;
      pointer-events: auto;
    }

    #nav::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 10px;
      border-radius: 0 20px 20px 0;
      pointer-events: none;
      transition: opacity .3s;
    }

    #nav:hover {
      width: 60px;
      background: rgba(22, 34, 30, 0.72);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-right: 1px solid rgba(244, 240, 224, 0.12);
      box-shadow: 4px 0 32px rgba(0, 0, 0, 0.4);
    }

    .nav-items {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 14px 0;
      height: 100%;
      opacity: 0;
      transition: opacity .25s ease .1s;
    }

    #nav:hover .nav-items {
      opacity: 1;
    }

    .nav-logo {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      border-radius: 8px;
      background: rgba(244, 240, 224, 0.08);
      border: 1px solid rgba(244, 240, 224, 0.15);
      color: var(--color-linen);
    }

    .nav-logo svg {
      width: 16px;
      height: 16px;
    }

    .nbtn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: rgba(244, 240, 224, 0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all .2s;
    }

    .nbtn:hover {
      background: rgba(244, 240, 224, 0.1);
      color: var(--color-linen);
    }

    .nbtn svg {
      width: 17px;
      height: 17px;
      pointer-events: none;
    }

    .nav-sep {
      width: 24px;
      height: 1px;
      background: rgba(244, 240, 224, 0.1);
      margin: 4px 0;
    }

    /* ── 4. EXACT FIAIBAR COMPOSER FROM takemessagebarfromthisfile.html ── */
    #inputWrap {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-left: 6px;
      background: transparent;
      width: 96.2%;
      max-width: 860px;
      pointer-events: auto;
      transition: opacity 0.3s, transform 0.3s;
    }

    #inputWrap .seam {
      width: 50%;
      opacity: 0;
      margin-bottom: 6px;
      transition: all 0.3s var(--ease);
    }

    .fiaibar {
      position: relative;
      opacity: 1;
      bottom: 5vh;
      right: 0;
      transform: translateY(0);
      width: 28%;
      height: 28px;
      display: flex;
      flex-direction: column;
      padding: 0;
      transition: all 0.55s var(--ease);
      z-index: 10;
      overflow: hidden;
      --mouse-x: 50%;
      --mouse-y: 50%;
      box-shadow:
        var(--glass-shadow),
        inset 1px 1px var(--glass-reflex),
        inset -1px 1px var(--glass-border),
        inset 0 -1px 1px var(--glass-border),
        inset 0 0 25px var(--glass-glow),
        inset 0 1px 0 var(--glass-reflex),
        inset 0 -20px 40px rgba(0, 0, 0, 0.1);
      background: var(--glass);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: none;
      border-radius: 50px;
      pointer-events: auto;
      cursor: pointer;
    }

    #stopBtn {
      position: absolute;
      bottom: 5vh;
      left: calc(50% + 14% + 15px);
      height: 28px;
      width: 28px;
      background: var(--glass);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: none;
      border-radius: 50px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100;
      border-radius: 50%;
      transition: all 0.55s var(--ease);
      opacity: 0;
      pointer-events: none;
    }

    #stopBtn.on {
      display: flex;
      opacity: 1;
      pointer-events: auto;
    }

    #stopBtn:hover {
      background: rgba(206, 19, 19, 0.52);
    }

    #stopBtn svg {
      width: 14px;
      height: 14px;
      fill: #fff;
    }

    .fiaibar:hover~#stopBtn,
    .fiaibar:focus-within~#stopBtn,
    #inputWrap.on #stopBtn {
      bottom: 2vh;
      left: calc(50% + min(48%, 415px));
    }

    .fiaibar > * {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .fiaibar:hover,
    .fiaibar:focus-within,
    #inputWrap.on .fiaibar {
      width: 100%;
      max-width: 800px;
      height: auto;
      padding: 12px 20px;
      overflow: visible;
      cursor: default;
      bottom: 2vh;
      background: rgba(255, 255, 255, 0);
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        inset 1px 1px rgba(255, 255, 255, 0.2),
        inset -1px 1px rgba(255, 255, 255, 0.285),
        inset 0 -1px 1px rgba(255, 255, 255, 0.285),
        inset 0 0 25px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -20px 40px rgba(0, 0, 0, 0.4);
      transition: all 0.55s ease;
    }

    .fiaibar:hover > *,
    .fiaibar:focus-within > *,
    #inputWrap.on .fiaibar > * {
      opacity: 1;
      pointer-events: auto;
    }

    #phoenixQuestionBar,
    #customCaret,
    #inp,
    .fiai-actions {
      position: relative;
      z-index: 5;
    }

    #phoenixQuestionBar {
      display: none;
    }

    /* FIAIBAR MODE GLOW */
    @keyframes rotate-glow {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    .fiaibar-glow-container {
      position: absolute;
      inset: -1.5px;
      border-radius: inherit;
      pointer-events: none !important;
      z-index: 1;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.5s var(--ease);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      padding: 1.5px;
      filter: blur(3px);
      mix-blend-mode: color-dodge;
    }

    .fiaibar-glow-rotator {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 500%;
      height: 500%;
      background: conic-gradient(from 0deg, transparent 0%, var(--mode-glow, #d269e6) 10%, transparent 20%, var(--mode-glow, #d269e6) 40%, transparent 50%);
      transform: translate(-50%, -50%);
      animation: rotate-glow 5s linear infinite;
    }

    .fiaibar:hover .fiaibar-glow-container,
    .fiaibar:focus-within .fiaibar-glow-container,
    #inputWrap.on .fiaibar-glow-container {
      opacity: 1;
    }

    .faiaiit {
      position: relative;
      left: 1vh;
      width: 90%;
      flex: 1;
      resize: none;
      font-family: var(--font-ui);
      font-weight: 400;
      font-size: 1.1rem;
      color: #ffffff;
      border: none;
      outline: none;
      background-color: transparent;
      min-height: 44px;
      padding: 0;
      line-height: 1.5;
      caret-color: #33a440;
    }

    .faiaiit::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    .fiai-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-top: 5px;
    }

    .inp-hint {
      position: absolute;
      bottom: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: var(--text-dim);
      opacity: 0;
      transition: opacity .5s var(--ease);
      letter-spacing: .5px;
      white-space: nowrap;
    }

    #inputWrap.on .inp-hint,
    .fiaibar:hover .inp-hint {
      opacity: .35;
    }

    .fiaibar-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      opacity: 1;
      transition: opacity 0.8s var(--ease);
      overflow: hidden;
      pointer-events: none;
    }

    .fiaibar:hover .fiaibar-bg,
    .fiaibar:focus-within .fiaibar-bg,
    #inputWrap.on .fiaibar-bg {
      opacity: 0;
    }

    .hazy-blob {
      position: absolute;
      width: 150%;
      height: 120%;
      filter: blur(25px);
      opacity: 0.6;
      bottom: -60%;
      left: -25%;
      animation: waveSway 7s infinite alternate ease-in-out;
      mix-blend-mode: screen;
      border-radius: 50% 50% 0 0;
    }

    .blob-1 { background: radial-gradient(circle at 50% 20%, #32CD32 0%, transparent 50%); animation-duration: 6s; }
    .blob-2 { background: radial-gradient(circle at 50% 20%, #d269e6 0%, transparent 50%); animation-duration: 9s; animation-delay: -2s; }
    .blob-3 { background: radial-gradient(circle at 50% 20%, #5e3023 0%, transparent 50%); animation-duration: 12s; animation-delay: -4s; }

    @keyframes waveSway {
      0% { transform: translateX(-15%) translateY(10%); }
      100% { transform: translateX(15%) translateY(-10%); }
    }

    .button_top {
      display: block;
      box-sizing: border-box;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: inherit;
      padding: 8px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      color: #ffffff;
      transform: translateY(-0.15em);
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      box-shadow: inset 0 6px 16px rgba(255, 255, 255, 0.05);
    }

    .addfl, .send {
      background: transparent;
      border: none;
      cursor: pointer;
      border-radius: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .addfl:hover .button_top, .send:hover .button_top {
      transform: translateY(-0.25em);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    }

    .addsvg, .sendsvg {
      width: 17px;
      height: 17px;
      display: block;
    }

    .mode-selector {
      position: relative;
      user-select: none;
    }

    .mode-current {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-current:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .mode-current .chevron {
      width: 12px;
      height: 12px;
      transition: transform 0.2s;
    }

    .mode-selector.open .mode-current .chevron {
      transform: rotate(180deg);
    }

    .mode-dropdown {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      width: 220px;
      background: rgba(20, 24, 28, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 6px;
      backdrop-filter: blur(20px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      gap: 4px;
      z-index: 100;
    }

    .mode-selector.open .mode-dropdown {
      display: flex;
    }

    .mode-option {
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .mode-option:hover, .mode-option.active {
      background: rgba(255, 255, 255, 0.1);
    }

    .mode-title {
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
    }

    .mode-desc {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 2px;
    }

    /* ==========================================================================
       5. FIRST-TIME POWER ON MODAL / OVERLAY
       ========================================================================== */
    .power-on-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(6, 6, 10, 0.78);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      padding: 24px;
      opacity: 1;
      transition: opacity 0.6s var(--ease), visibility 0.6s var(--ease);
    }

    .power-on-overlay.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .power-on-card {
      position: relative;
      width: 100%;
      max-width: 580px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(244, 240, 224, 0.18);
      border-radius: 28px;
      padding: 40px 36px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 20px;
      overflow: hidden;
    }

    .power-on-glow {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 280px;
      height: 180px;
      background: radial-gradient(circle, rgba(159, 124, 239, 0.45) 0%, rgba(198, 205, 133, 0.2) 50%, transparent 80%);
      filter: blur(40px);
      pointer-events: none;
    }

    .power-brand-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--color-linen);
      text-shadow: 0 0 25px rgba(244, 240, 224, 0.4);
    }

    .power-brand-sub {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2.5px;
      color: var(--color-lavender);
      text-transform: uppercase;
    }

    .power-desc {
      font-size: 13.5px;
      line-height: 1.65;
      color: rgba(244, 240, 224, 0.78);
      margin-top: 4px;
    }

    .power-features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      width: 100%;
      margin: 6px 0;
      text-align: left;
    }

    .power-feat-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .power-feat-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .power-feat-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-linen);
      display: block;
    }

    .power-feat-detail {
      font-size: 10.5px;
      color: rgba(244, 240, 224, 0.55);
      line-height: 1.35;
      margin-top: 2px;
      display: block;
    }

    .power-on-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 16px 28px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(159, 124, 239, 0.35) 0%, rgba(198, 205, 133, 0.25) 100%);
      border: 1px solid rgba(244, 240, 224, 0.35);
      box-shadow: 0 10px 30px rgba(159, 124, 239, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.4);
      color: var(--color-linen);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1.5px;
      cursor: pointer;
      transition: all 0.3s var(--ease);
      overflow: hidden;
      backdrop-filter: blur(20px);
    }

    .power-on-btn:hover {
      transform: translateY(-2px);
      background: linear-gradient(135deg, rgba(159, 124, 239, 0.5) 0%, rgba(198, 205, 133, 0.35) 100%);
      box-shadow: 0 15px 40px rgba(159, 124, 239, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.6);
    }

    /* ==========================================================================
       6. SUPERGENCE WORKSPACE & WORK TREE (REFERENCE IMAGE MATCH)
       ========================================================================== */
    .supergence-workspace {
      position: fixed;
      inset: 0;
      z-index: 120;
      background: radial-gradient(circle at 50% 25%, #15221e 0%, #0c1412 55%, #050807 100%);
      display: none;
      flex-direction: column;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s var(--ease);
    }

    .supergence-workspace.active {
      display: flex;
      opacity: 1;
      pointer-events: auto;
    }

    .workspace-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(14, 22, 20, 0.65);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      z-index: 130;
    }

    .workspace-left-nav {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-home-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(244, 240, 224, 0.18);
      color: var(--color-linen);
      font-family: var(--font-ui);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s var(--ease);
    }

    .back-home-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(244, 240, 224, 0.35);
      transform: translateX(-2px);
    }

    .back-arrow-svg {
      width: 14px;
      height: 14px;
    }

    .workspace-brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-linen);
    }

    .workspace-brand-pill .workspace-sep {
      opacity: 0.35;
    }

    .workspace-brand-pill .workspace-domain-label {
      font-size: 11px;
      color: var(--color-lavender);
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .workspace-right-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .create-agent-pill-btn {
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(159, 124, 239, 0.15);
      border: 1px solid rgba(159, 124, 239, 0.35);
      color: var(--color-linen);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .create-agent-pill-btn:hover {
      background: rgba(159, 124, 239, 0.25);
      border-color: var(--color-lavender);
    }

    .beta-badge-pill {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      color: rgba(244, 240, 224, 0.7);
    }

    .workspace-columns-viewport {
      flex: 1;
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;
      position: relative;
    }

    /* Primary Main Column */
    .workspace-main-column {
      flex: 1 1 520px;
      min-width: 440px;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.15);
    }

    .chat-scroll-container {
      flex: 1;
      overflow-y: auto;
      padding: 30px 48px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .chat-scroll-container::-webkit-scrollbar {
      width: 6px;
    }

    .chat-scroll-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 6px;
    }

    /* User Query Pill matching media_1791433530014.png */
    .user-query-pill-wrap {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .user-query-pill {
      background: #1e1e22;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 8px 24px;
      font-size: 14px;
      font-weight: 500;
      color: #ffffff;
      max-width: 80%;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }

    /* Work Tree Section matching reference image media_1791433530014.png */
    .work-tree-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .work-tree-header {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      width: fit-content;
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 6px;
      transition: color 0.2s, background 0.2s;
    }

    .work-tree-header:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }

    .work-tree-chevron {
      width: 14px;
      height: 14px;
      transition: transform 0.3s var(--ease);
    }

    .work-tree-section.collapsed .work-tree-chevron {
      transform: rotate(-90deg);
    }

    .work-tree-section.collapsed .work-tree-body {
      display: none;
    }

    .work-tree-body {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-left: 6px;
    }

    .work-tree-node {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: 14px;
    }

    .work-tree-node:last-child {
      padding-bottom: 4px;
    }

    .work-tree-node-header {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      z-index: 2;
    }

    .work-tree-icon {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.08);
    }

    .work-tree-icon svg {
      width: 13px;
      height: 13px;
    }

    .work-tree-title {
      font-size: 13.5px;
      color: rgba(255, 255, 255, 0.88);
      font-weight: 400;
      line-height: 1.4;
    }

    .work-tree-line {
      position: absolute;
      top: 24px;
      left: 10px;
      bottom: 0;
      width: 1.5px;
      background: rgba(255, 255, 255, 0.16);
      z-index: 1;
    }

    .work-tree-node:last-child .work-tree-line {
      display: none;
    }

    .work-tree-substeps {
      margin-left: 10px;
      padding-left: 20px;
      border-left: 1.5px solid rgba(255, 255, 255, 0.16);
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .work-tree-substep-item {
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.5;
    }

    /* Response Card Area */
    .response-synthesis-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .response-agent-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .resp-agent-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-lavender);
      box-shadow: 0 0 8px var(--color-lavender);
    }

    .resp-agent-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-lavender);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .response-body-markdown {
      font-size: 14.5px;
      line-height: 1.7;
      color: #ededed;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Follow-up composer in Workspace */
    .workspace-composer-wrap {
      padding: 16px 36px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(14, 22, 20, 0.5);
      backdrop-filter: blur(20px);
    }

    .workspace-composer-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 8px 16px;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.1);
    }

    .workspace-textarea {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-family: var(--font-ui);
      font-size: 13.5px;
      resize: none;
    }

    .workspace-send-btn {
      background: var(--color-lavender);
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #06060A;
      transition: transform 0.2s;
    }

    .workspace-send-btn:hover {
      transform: scale(1.08);
    }

    .workspace-send-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Side-by-Side Agent Columns Viewport */
    .side-agents-container {
      display: flex;
      flex-shrink: 0;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    .side-agent-column {
      width: 360px;
      min-width: 340px;
      max-width: 400px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(10, 16, 14, 0.65);
    }

    .side-agent-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }

    .side-agent-profile {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .side-agent-mini-face {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .side-agent-titles {
      display: flex;
      flex-direction: column;
    }

    .side-agent-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-linen);
    }

    .side-agent-role {
      font-size: 10.5px;
      color: rgba(244, 240, 224, 0.55);
    }

    .side-agent-header-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .talk-to-agent-btn {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--color-linen);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
    }

    .talk-to-agent-btn:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .close-column-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
    }

    .close-column-btn:hover {
      color: #fff;
    }

    .side-agent-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13px;
    }

    .side-agent-msg {
      padding: 10px 14px;
      border-radius: 12px;
      line-height: 1.5;
    }

    .side-agent-msg.user {
      background: rgba(255, 255, 255, 0.08);
      align-self: flex-end;
      color: #fff;
      max-width: 85%;
    }

    .side-agent-msg.agent {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      align-self: flex-start;
      color: #e2e2e2;
      max-width: 95%;
    }

    .side-agent-composer {
      padding: 10px 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .side-agent-inp {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      padding: 6px 12px;
      color: #fff;
      font-size: 12px;
      font-family: var(--font-ui);
      outline: none;
      resize: none;
    }

    .side-agent-send-btn {
      background: var(--color-linen);
      border: none;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #000;
    }

    .side-agent-send-btn svg {
      width: 13px;
      height: 13px;
    }

    /* Right Sidebar: Progress + SIS Systems */
    .workspace-sidebar {
      width: 290px;
      min-width: 280px;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      background: rgba(8, 14, 12, 0.7);
      overflow-y: auto;
      padding: 20px 16px;
      gap: 22px;
    }

    .sidebar-section-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--color-linen);
      margin-bottom: 10px;
    }

    .sidebar-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .sidebar-section-subtitle {
      font-size: 11px;
      color: rgba(244, 240, 224, 0.5);
    }

    .icon-add-btn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }

    .progress-tasks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-task-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .progress-task-icon {
      color: var(--color-pistachio);
      font-weight: 700;
    }

    .sis-agents-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sis-agent-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      transition: all 0.2s var(--ease);
    }

    .sis-agent-row:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.16);
      transform: translateX(2px);
    }

    .sis-agent-row-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sis-agent-row-face {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.03);
      flex-shrink: 0;
    }

    .sis-agent-row-meta {
      display: flex;
      flex-direction: column;
    }

    .sis-agent-row-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-linen);
    }

    .sis-agent-row-domain {
      font-size: 10px;
      color: rgba(244, 240, 224, 0.5);
    }

    .open-column-indicator {
      font-size: 11px;
      color: var(--color-lavender);
      opacity: 0;
      transition: opacity 0.2s;
    }

    .sis-agent-row:hover .open-column-indicator {
      opacity: 1;
    }

    .create-agent-sidebar-btn {
      width: 100%;
      margin-top: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      background: rgba(159, 124, 239, 0.12);
      border: 1px dashed rgba(159, 124, 239, 0.35);
      color: var(--color-linen);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .create-agent-sidebar-btn:hover {
      background: rgba(159, 124, 239, 0.22);
      border-color: var(--color-lavender);
    }

    /* ==========================================================================
       7. CREATE NEW SIS AGENT MODAL
       ========================================================================== */
    .create-agent-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(6, 6, 10, 0.75);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      padding: 20px;
    }

    .create-agent-modal-overlay.active {
      display: flex;
    }

    .create-agent-modal-card {
      width: 100%;
      max-width: 520px;
      background: #111a17;
      border: 1px solid rgba(244, 240, 224, 0.18);
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .modal-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .modal-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-linen);
      display: block;
    }

    .modal-subtitle {
      font-size: 11.5px;
      color: rgba(244, 240, 224, 0.55);
      margin-top: 3px;
      display: block;
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 16px;
      cursor: pointer;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-linen);
    }

    .form-group input, .form-group textarea {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 10px 12px;
      color: #fff;
      font-family: var(--font-ui);
      font-size: 13px;
      outline: none;
    }

    .form-group input:focus, .form-group textarea:focus {
      border-color: var(--color-lavender);
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .color-radio {
      cursor: pointer;
    }

    .color-radio input {
      display: none;
    }

    .color-radio span {
      display: block;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
      transition: transform 0.2s;
    }

    .color-radio input:checked + span {
      transform: scale(1.2);
      border-color: #fff;
    }

    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }

    .btn-secondary {
      padding: 10px 18px;
      border-radius: 999px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--color-linen);
      font-size: 13px;
      cursor: pointer;
    }

    .btn-primary {
      padding: 10px 20px;
      border-radius: 999px;
      background: var(--color-lavender);
      border: none;
      color: #06060A;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>

<body>

  <!-- Left Navigation Bar from takemessagebarfromthisfile.html -->
  <nav id="nav">
    <div class="nav-items">
      <div class="nav-logo" title="Supergence Unified Intelligence">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </div>

      <button class="nbtn active" data-v="chat" title="Supergence Chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <button class="nbtn" data-v="agents" title="SIS System Swarm" onclick="toggleWorkspaceFromNav()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </button>

      <div class="nav-sep"></div>

      <button class="nbtn" data-v="settings" title="System Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </nav>

  <!-- Ambient Spatial Caustic Glow -->
  <div class="spatial-caustic-bg"></div>

  <!-- ==========================================================================
       MAIN VIEWPORT: CLEAN HOME VIEW (ZERO NOISE, ZERO CARDS, ZERO CLUTTER)
       ========================================================================== -->
  <main class="sis-viewport" id="homeView">

    <!-- 1. Top HUD Header -->
    <header class="sis-top-hud">
      <div class="brand-mark-group">
        <span class="brand-title">Supergence</span>
        <span class="brand-subtitle">Powered by SIS System</span>
      </div>

      <div class="hud-right-group">
        <!-- Apple Liquid Glass Live Date & Time HUD -->
        <div class="sis-hud-datetime" id="sisHudDateTime" title="Apple Liquid Glass Live Clock">
          <span class="hud-time" id="hudLiveTime">00:00:00</span>
          <span class="hud-ampm" id="hudLiveAmPm">AM</span>
          <span class="hud-sep">•</span>
          <span class="hud-date" id="hudLiveDate">OCT 08, 2026</span>
          <span class="hud-sep">•</span>
          <span class="hud-tz">UTC+05:30</span>
        </div>

        <!-- 24/7 Homeostasis Status Lens -->
        <div class="system-status-lens" id="sisStatusLens" title="Autonomous Superintelligence Online">
          <span class="status-pulse-dot"></span>
          <span id="sisStatusLabel">ONLINE • 24/7 AUTONOMOUS</span>
        </div>
      </div>
    </header>

    <!-- 2. Center Stage: 3D Apple Liquid Glass Clock + Living Core Face -->
    <section class="sis-center-stage" id="sisCenterStage">

      <!-- 3D Apple Liquid Glass Morganite Clock -->
      <div class="clock-3d-stage" id="sisClockStage">
        <canvas id="sis-3d-clock-canvas"></canvas>
      </div>

      <!-- Authentic Living Supergence Organism Face from systemfaces.html -->
      <div class="supergence-core-face-wrap" id="supergenceCoreFace" onclick="openWorkspace('Awaken Supergence')" title="Supergence Neural Organism">
        <svg viewBox="0 0 500 500" class="supergence-core-face-svg">
          <defs>
            <filter id="metaball-core">
              <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur"></feGaussianBlur>
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -7" result="fluid"></feColorMatrix>
              <feComposite in="SourceGraphic" in2="fluid" operator="atop"></feComposite>
            </filter>
          </defs>
          <g class="arm-core">
            <line class="segment" x1="250" y1="250" x2="300" y2="250"></line>
            <circle class="joint-core" cx="250" cy="250" r="64"></circle>
            <g class="arm1-core">
              <line class="segment" x1="300" y1="250" x2="400" y2="250"></line>
              <circle class="joint-core" cx="300" cy="250" r="30"></circle>
              <g class="arm2-core">
                <line class="segment" x1="400" y1="250" x2="490" y2="250"></line>
                <circle class="joint-core" cx="400" cy="250" r="24"></circle>
                <g class="arm3-core">
                  <line class="segment" x1="490" y1="250" x2="550" y2="250"></line>
                  <circle class="joint-core" cx="490" cy="250" r="16"></circle>
                </g>
              </g>
              <g class="arm1-core">
                <line class="segment" x1="300" y1="250" x2="400" y2="250"></line>
                <circle class="joint-core" cx="300" cy="250" r="30"></circle>
                <g class="arm2-core">
                  <line class="segment" x1="400" y1="250" x2="490" y2="250"></line>
                  <circle class="joint-core" cx="400" cy="250" r="8"></circle>
                  <g class="arm3-core">
                    <line class="segment" x1="490" y1="250" x2="550" y2="250"></line>
                    <circle class="joint-core" cx="490" cy="250" r="8"></circle>
                  </g>
                  <g class="arm2-core">
                    <line class="segment" x1="400" y1="250" x2="490" y2="250"></line>
                    <circle class="joint-core" cx="400" cy="250" r="8"></circle>
                    <g class="arm3-core">
                      <line class="segment" x1="490" y1="250" x2="550" y2="250"></line>
                      <circle class="joint-core" cx="490" cy="250" r="8"></circle>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
          <g id="mir-core" class="arm-core">
            <line class="segment" x1="250" y1="250" x2="300" y2="250"></line>
            <circle class="joint-core" cx="250" cy="250" r="64"></circle>
            <g class="arm1-core">
              <line class="segment" x1="300" y1="250" x2="400" y2="250"></line>
              <circle class="joint-core" cx="300" cy="250" r="30"></circle>
              <g class="arm2-core">
                <line class="segment" x1="400" y1="250" x2="490" y2="250"></line>
                <circle class="joint-core" cx="400" cy="250" r="24"></circle>
                <g class="arm3-core">
                  <line class="segment" x1="490" y1="250" x2="550" y2="250"></line>
                  <circle class="joint-core" cx="490" cy="250" r="16"></circle>
                </g>
              </g>
              <g class="arm1-core">
                <line class="segment" x1="300" y1="250" x2="400" y2="250"></line>
                <circle class="joint-core" cx="300" cy="250" r="30"></circle>
                <g class="arm2-core">
                  <line class="segment" x1="400" y1="250" x2="490" y2="250"></line>
                  <circle class="joint-core" cx="400" cy="250" r="8"></circle>
                  <g class="arm3-core">
                    <line class="segment" x1="490" y1="250" x2="550" y2="250"></line>
                    <circle class="joint-core" cx="490" cy="250" r="8"></circle>
                  </g>
                  <g class="arm2-core">
                    <line class="segment" x1="400" y1="250" x2="490" y2="250"></line>
                    <circle class="joint-core" cx="400" cy="250" r="8"></circle>
                    <g class="arm3-core">
                      <line class="segment" x1="490" y1="250" x2="550" y2="250"></line>
                      <circle class="joint-core" cx="490" cy="250" r="8"></circle>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>

    </section>

    <!-- Empty Spacer for bottom balance -->
    <div></div>
  </main>

  <!-- ==========================================================================
       RESTORED MESSAGE BAR FROM takemessagebarfromthisfile.html
       ========================================================================== -->
  <div id="inputWrap">
    <div class="seam"></div>

    <div class="fiaibar" onmousemove="handleSprayMove(event)" onmouseleave="handleSprayLeave(event)">
      <div class="fiaibar-bg">
        <div class="hazy-blob blob-1"></div>
        <div class="hazy-blob blob-2"></div>
        <div class="hazy-blob blob-3"></div>
      </div>
      <div class="fiaibar-glow-container">
        <div class="fiaibar-glow-rotator"></div>
      </div>
      <div id="phoenixQuestionBar">
        <div class="q-label">Question <span id="pIdx">1</span> of 10</div>
        <div class="q-text" id="pText">Loading question</div>
      </div>
      <div id="customCaret"></div>
      <textarea id="inp" rows="1" spellcheck="false" class="faiaiit"></textarea>

      <div class="fiai-actions">
        <!-- Left side features -->
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="addfl">
            <span class="button_top">
              <svg viewBox="0 0 24 24" class="addsvg">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            </span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <!-- Answer Mode Selector -->
          <div class="mode-selector" id="modeSelector" style="margin-top: 0;">
            <div class="mode-current" id="modeCurrentBtn">
              <span id="currentModeName">Finefast</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div class="mode-dropdown" id="modeDropdown">
              <div class="mode-option active" data-mode="Finefast">
                <div class="mode-title">Finefast</div>
                <div class="mode-desc">Standard high-speed reasoning mode.</div>
              </div>
              <div class="mode-option" data-mode="Melly">
                <div class="mode-title">Melly</div>
                <div class="mode-desc">Collaborative deep pair programmer & researcher.</div>
              </div>
            </div>
          </div>

          <div class="send" id="sendBtn">
            <span class="button_top">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="sendsvg">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div class="inp-hint">Type anywhere · / for commands · Enter to launch</div>
    </div>
    <button id="stopBtn" title="Stop response">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd"
          d="M5 11V13C5 16.3137 7.68629 19 11 19H13C16.3137 19 19 16.3137 19 13V11C19 7.68629 16.3137 5 13 5H11C7.68629 5 5 7.68629 5 11Z"
          stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="#ffffff" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"></rect>
      </svg>
    </button>
  </div>

  <!-- ==========================================================================
       FIRST-TIME POWER ON OVERLAY
       ========================================================================== -->
  <div id="powerOnOverlay" class="power-on-overlay hidden">
    <div class="power-on-card">
      <div class="power-on-glow"></div>
      <div class="power-brand-title">SUPERGENCE</div>
      <div class="power-brand-sub">POWERED BY UNIFIED SIS ARCHITECTURE</div>

      <div class="power-desc">
        Welcome to Supergence. Initializing powers on full autonomous execution across your entire computer and global internet, backed by lifelong learning and domain specialists.
      </div>

      <div class="power-features-grid">
        <div class="power-feat-box">
          <span class="power-feat-icon">🦾</span>
          <div>
            <span class="power-feat-name">OpenClaw Execution</span>
            <span class="power-feat-detail">Full computer, terminal & filesystem automation</span>
          </div>
        </div>
        <div class="power-feat-box">
          <span class="power-feat-icon">🌐</span>
          <div>
            <span class="power-feat-name">Planetary Internet</span>
            <span class="power-feat-detail">Live research across web & 1,400+ public APIs</span>
          </div>
        </div>
        <div class="power-feat-box">
          <span class="power-feat-icon">🧠</span>
          <div>
            <span class="power-feat-name">Hermes Lifelong Memory</span>
            <span class="power-feat-detail">Learns your rules & habits on every single turn</span>
          </div>
        </div>
        <div class="power-feat-box">
          <span class="power-feat-icon">🧬</span>
          <div>
            <span class="power-feat-name">SIS Domain Swarms</span>
            <span class="power-feat-detail">Biology, Math, CS, EE & AI specialists team</span>
          </div>
        </div>
      </div>

      <button id="powerOnBtn" class="power-on-btn">
        <span>⏻</span>
        <span>POWER ON SUPERGENCE</span>
      </button>
    </div>
  </div>

  <!-- ==========================================================================
       SUPERGENCE WORKSPACE (WITH WORK TREE & SIDEBAR MATCHING REFERENCE IMAGE)
       ========================================================================== -->
  <div id="supergenceWorkspace" class="supergence-workspace">
    <!-- Top Workspace Nav / Bar -->
    <header class="workspace-top-bar">
      <div class="workspace-left-nav">
        <button id="backHomeBtn" class="back-home-btn" title="Return to Home View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-arrow-svg">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to Home</span>
        </button>

        <div class="workspace-brand-pill">
          <span class="status-pulse-dot" style="width: 6px; height: 6px;"></span>
          <span>Supergence</span>
          <span class="workspace-sep">/</span>
          <span class="workspace-domain-label">Autonomous Workspace</span>
        </div>
      </div>

      <div class="workspace-right-actions">
        <button id="createAgentHeaderBtn" class="create-agent-pill-btn">
          <span>+ Create SIS Agent</span>
        </button>
        <div class="beta-badge-pill">BETA</div>
      </div>
    </header>

    <!-- Workspace Main Multi-Column Split -->
    <div class="workspace-columns-viewport">
      
      <!-- Primary Conversation & Work Tree Column -->
      <div class="workspace-main-column" id="mainWorkspaceColumn">
        <div class="chat-scroll-container" id="chatScrollContainer">
          
          <!-- User Query Pill (Centered at the top, matching reference image) -->
          <div class="user-query-pill-wrap">
            <div class="user-query-pill" id="userQueryPill">Supergence Unified Turn</div>
          </div>

          <!-- Work Tree Section matching reference image media_1791433530014.png -->
          <div class="work-tree-section" id="workTreeSection">
            <div class="work-tree-header" id="workTreeToggle">
              <span class="work-tree-title" style="font-weight: 500; font-size: 13px;">Thoughts</span>
              <svg class="work-tree-chevron" id="workTreeChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>

            <div class="work-tree-body" id="workTreeBody">
              <!-- Dynamically populated steps with vertical spine & colored icons -->
            </div>
          </div>

          <!-- Synthesized Response Markdown Area -->
          <div class="response-synthesis-card" id="responseSynthesisCard">
            <div class="response-agent-header">
              <span class="resp-agent-indicator"></span>
              <span class="resp-agent-name" id="mainRespAgentName">Supergence (Unified SIS System)</span>
            </div>
            <div class="response-body-markdown" id="mainResponseBody">
              Connecting to unified intelligence...
            </div>
          </div>

        </div>

        <!-- In-Workspace Follow-up Composer -->
        <div class="workspace-composer-wrap">
          <div class="workspace-composer-inner">
            <textarea id="workspaceInp" class="workspace-textarea" placeholder="Ask a follow-up or steer Supergence..." rows="1"></textarea>
            <div class="workspace-composer-actions">
              <button id="workspaceSendBtn" class="workspace-send-btn" title="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Side-by-Side Agent Columns Container -->
      <div class="side-agents-container" id="sideAgentsContainer">
        <!-- Opened SIS System specialist columns mount here side-by-side -->
      </div>

      <!-- Right Sidebar (Progress + All SIS System Agents) matching reference image -->
      <aside class="workspace-sidebar" id="workspaceSidebar">
        <!-- Section 1: Progress (Past tasks & current plan) -->
        <div class="sidebar-section">
          <div class="sidebar-section-title">Progress</div>
          <div class="progress-tasks-list" id="progressTasksList">
            <div class="progress-task-item">
              <span class="progress-task-icon">✓</span>
              <span>Initialized Supergence neural architecture</span>
            </div>
          </div>
        </div>

        <!-- Section 2: SIS Systems (All specialized agents) -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <div>
              <div class="sidebar-section-title" style="margin-bottom: 2px;">SIS Systems</div>
              <div class="sidebar-section-subtitle">Click to open side-by-side</div>
            </div>
            <button id="sidebarCreateAgentBtn" class="icon-add-btn" title="Create New SIS Agent">+</button>
          </div>

          <div class="sis-agents-list" id="sisAgentsList">
            <!-- Dynamically populated agents with their authentic faces & names -->
          </div>

          <button id="sidebarCreateAgentBtnFull" class="create-agent-sidebar-btn">
            <span>+</span>
            <span>Create New SIS Agent</span>
          </button>
        </div>
      </aside>

    </div>
  </div>

  <!-- ==========================================================================
       CREATE NEW SIS AGENT MODAL
       ========================================================================== -->
  <div id="createAgentModal" class="create-agent-modal-overlay">
    <div class="create-agent-modal-card">
      <div class="modal-card-header">
        <div>
          <span class="modal-title">Create New SIS System Agent</span>
          <span class="modal-subtitle">Define custom domain specialization, research rules & tasks</span>
        </div>
        <button id="closeCreateAgentModalBtn" class="modal-close-btn">✕</button>
      </div>

      <form id="createAgentForm" class="modal-form">
        <div class="form-group">
          <label>Agent Name</label>
          <input type="text" id="newAgentName" placeholder="e.g. Quantum Cryptography Specialist" required />
        </div>

        <div class="form-group">
          <label>Specialized Domain & Field</label>
          <input type="text" id="newAgentDomain" placeholder="e.g. Post-Quantum Algorithms, Lattice Cryptography" required />
        </div>

        <div class="form-group">
          <label>Custom Instructions & Autonomous Tasks</label>
          <textarea id="newAgentPrompt" rows="3" placeholder="Describe the specific objectives, research instructions, rules, and specialized tasks for this agent..." required></textarea>
        </div>

        <div class="form-group">
          <label>Organism Aura Color</label>
          <div class="color-picker-row">
            <label class="color-radio"><input type="radio" name="agentColor" value="#34D399" checked><span style="background: #34D399;"></span></label>
            <label class="color-radio"><input type="radio" name="agentColor" value="#38BDF8"><span style="background: #38BDF8;"></span></label>
            <label class="color-radio"><input type="radio" name="agentColor" value="#9F7CEF"><span style="background: #9F7CEF;"></span></label>
            <label class="color-radio"><input type="radio" name="agentColor" value="#FBBF24"><span style="background: #FBBF24;"></span></label>
            <label class="color-radio"><input type="radio" name="agentColor" value="#F87171"><span style="background: #F87171;"></span></label>
            <label class="color-radio"><input type="radio" name="agentColor" value="#F1CDE2"><span style="background: #F1CDE2;"></span></label>
            <label class="color-radio"><input type="radio" name="agentColor" value="#C6CD85"><span style="background: #C6CD85;"></span></label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" id="cancelCreateAgentBtn" class="btn-secondary">Cancel</button>
          <button type="submit" id="submitCreateAgentBtn" class="btn-primary">Awaken & Specialize Agent</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==========================================================================
       THREE.JS 3D APPLE LIQUID GLASS CLOCK ENGINE
       ========================================================================== -->
  <script type="module">
    import * as THREE from 'three';
    import { FontLoader } from 'three/addons/loaders/FontLoader.js';
    import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

    const canvas = document.getElementById('sis-3d-clock-canvas');
    const container = document.getElementById('sisClockStage');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(22, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.6;

    // Environmental Lighting with the 5 Modern Colors
    const ambientLight = new THREE.AmbientLight(0xF4F0E0, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xF4F0E0, 3.8);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);

    const lavenderRimLight = new THREE.PointLight(0x9F7CEF, 4.5, 20);
    lavenderRimLight.position.set(-4, -2, 2);
    scene.add(lavenderRimLight);

    const candyflossPoint = new THREE.PointLight(0xF1CDE2, 3.2, 15);
    candyflossPoint.position.set(3, -2, 3);
    scene.add(candyflossPoint);

    // Apple Liquid Glass Material
    const liquidGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xF4F0E0),
      roughness: 0.16,
      transmission: 0.98,
      ior: 1.8,
      thickness: 2.2,
      reflectivity: 0.5,
      clearcoat: 0.35,
      clearcoatRoughness: 0.08,
      iridescence: 1.0,
      iridescenceIOR: 1.25,
      iridescenceThicknessRange: [230, 440],
      transparent: true,
      opacity: 0.96
    });

    // Refractive Glass Lens Sphere
    const lensGeometry = new THREE.SphereGeometry(0.38, 48, 48);
    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x9F7CEF),
      roughness: 0.04,
      transmission: 0.99,
      ior: 1.85,
      thickness: 1.8,
      reflectivity: 0.75,
      clearcoat: 0.5,
      clearcoatRoughness: 0.04,
      iridescence: 1.0,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [150, 350],
      transparent: true
    });
    const lensMesh = new THREE.Mesh(lensGeometry, lensMaterial);
    lensMesh.position.set(0, -0.15, 0.7);
    scene.add(lensMesh);

    // Load Morganite 3D Font & Create Live 3D Glass Text
    let morganiteFont = null;
    let clockMesh = null;
    let lastRenderedTime = '';

    const fontLoader = new FontLoader();
    fontLoader.load('/fonts/Morganite_Medium.json', (font) => {
      morganiteFont = font;
      updateClockGeometry();
    }, undefined, (err) => {
      console.warn('Font load fallback:', err);
    });

    function formatCurrentTime() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      return \`\${h}:\${m}:\${s}\`;
    }

    function updateClockGeometry() {
      if (!morganiteFont) return;
      const timeStr = formatCurrentTime();
      if (timeStr === lastRenderedTime && clockMesh) return;
      lastRenderedTime = timeStr;

      if (clockMesh) {
        scene.remove(clockMesh);
        clockMesh.geometry.dispose();
      }

      const textGeo = new TextGeometry(timeStr, {
        font: morganiteFont,
        size: 1.35,
        depth: 0.14,
        curveSegments: 16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.018,
        bevelSegments: 6
      });
      textGeo.center();

      clockMesh = new THREE.Mesh(textGeo, liquidGlassMaterial);
      clockMesh.position.set(0, 0.08, 0);
      scene.add(clockMesh);
    }

    // Interactive pointer parallax & lens tracking
    let targetLensX = 0;
    let targetLensY = -0.15;
    let mouseX = 0, mouseY = 0;

    window.addEventListener('pointermove', (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = nx;
      mouseY = ny;
      targetLensX = nx * 1.8;
      targetLensY = ny * 0.6;
    });

    // Render Loop
    let clockTimer = 0;
    function animate(t) {
      requestAnimationFrame(animate);

      if (t - clockTimer > 500) {
        clockTimer = t;
        updateClockGeometry();
        updateHUDLiveClock();
      }

      lensMesh.position.x += (targetLensX - lensMesh.position.x) * 0.08;
      lensMesh.position.y += (targetLensY - lensMesh.position.y) * 0.08;

      dirLight.position.x = 2 + mouseX * 1.5;
      dirLight.position.y = 3 + mouseY * 1.5;

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    function updateHUDLiveClock() {
      const now = new Date();
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const hStr = String(hours).padStart(2, '0');

      const hudTimeEl = document.getElementById('hudLiveTime');
      const hudAmPmEl = document.getElementById('hudLiveAmPm');
      if (hudTimeEl) hudTimeEl.textContent = \`\${hStr}:\${m}:\${s}\`;
      if (hudAmPmEl) hudAmPmEl.textContent = ampm;

      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthStr = months[now.getMonth()];
      const dayStr = String(now.getDate()).padStart(2, '0');
      const yearStr = now.getFullYear();

      const hudDateEl = document.getElementById('hudLiveDate');
      if (hudDateEl) hudDateEl.textContent = \`\${monthStr} \${dayStr}, \${yearStr}\`;
    }
    updateHUDLiveClock();
  </script>

  <!-- ==========================================================================
       SUPERGENCE CLIENT CONTROLLER & MULTI-AGENT ORCHESTRATION SCRIPT
       ========================================================================== -->
  <script>
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const inputWrap = $('#inputWrap');
    const inp = $('#inp');
    const sendBtn = $('#sendBtn');
    const stopBtn = $('#stopBtn');
    const fiaibar = $('.fiaibar');
    const homeView = $('#homeView');
    const supergenceWorkspace = $('#supergenceWorkspace');
    const backHomeBtn = $('#backHomeBtn');
    const userQueryPill = $('#userQueryPill');
    const workTreeSection = $('#workTreeSection');
    const workTreeToggle = $('#workTreeToggle');
    const workTreeBody = $('#workTreeBody');
    const mainResponseBody = $('#mainResponseBody');
    const workspaceInp = $('#workspaceInp');
    const workspaceSendBtn = $('#workspaceSendBtn');
    const progressTasksList = $('#progressTasksList');
    const sisAgentsList = $('#sisAgentsList');
    const sideAgentsContainer = $('#sideAgentsContainer');

    // Power On Elements
    const powerOnOverlay = $('#powerOnOverlay');
    const powerOnBtn = $('#powerOnBtn');

    // Create Agent Modal Elements
    const createAgentModal = $('#createAgentModal');
    const createAgentHeaderBtn = $('#createAgentHeaderBtn');
    const sidebarCreateAgentBtn = $('#sidebarCreateAgentBtn');
    const sidebarCreateAgentBtnFull = $('#sidebarCreateAgentBtnFull');
    const closeCreateAgentModalBtn = $('#closeCreateAgentModalBtn');
    const cancelCreateAgentBtn = $('#cancelCreateAgentBtn');
    const createAgentForm = $('#createAgentForm');

    let isFiaibarHovered = false;
    let currentAbortController = null;
    let taskRunning = false;
    let registeredAgents = [];
    let openedAgentColumns = new Map();
    let pastTasks = [];

    // ── Check Power On State ──
    function checkPowerOnStatus() {
      const poweredOn = localStorage.getItem('supergence_powered_on');
      if (!poweredOn) {
        powerOnOverlay.classList.remove('hidden');
      } else {
        powerOnOverlay.classList.add('hidden');
      }
    }

    if (powerOnBtn) {
      powerOnBtn.addEventListener('click', async () => {
        try {
          powerOnBtn.style.opacity = '0.7';
          powerOnBtn.innerHTML = '<span>⏳</span><span>INITIALIZING SUPERGENCE...</span>';
          await fetch('/api/sis/power-on', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp: new Date().toISOString() })
          });
          localStorage.setItem('supergence_powered_on', 'true');
          setTimeout(() => {
            powerOnOverlay.classList.add('hidden');
          }, 400);
        } catch (e) {
          localStorage.setItem('supergence_powered_on', 'true');
          powerOnOverlay.classList.add('hidden');
        }
      });
    }

    checkPowerOnStatus();

    // ── Spray Move Handlers ──
    window.handleSprayMove = function(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      e.currentTarget.style.setProperty('--mouse-x', \`\${x}%\`);
      e.currentTarget.style.setProperty('--mouse-y', \`\${y}%\`);
    };

    window.handleSprayLeave = function(e) {
      e.currentTarget.style.setProperty('--mouse-x', \`50%\`);
      e.currentTarget.style.setProperty('--mouse-y', \`50%\`);
    };

    // ── Mode Selector ──
    function initModeSelector() {
      const modeSelector = $('#modeSelector');
      const modeCurrentBtn = $('#modeCurrentBtn');
      const modeOptions = $$('.mode-option');
      const currentModeName = $('#currentModeName');

      if (modeCurrentBtn) {
        modeCurrentBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          modeSelector.classList.toggle('open');
        });
      }

      modeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
          e.stopPropagation();
          modeOptions.forEach(opt => opt.classList.remove('active'));
          this.classList.add('active');
          const nextMode = this.getAttribute('data-mode');
          if (currentModeName) currentModeName.textContent = nextMode;
          if (modeSelector) modeSelector.classList.remove('open');
          updateModeGlow(nextMode);
        });
      });

      document.addEventListener('click', (e) => {
        if (modeSelector && !modeSelector.contains(e.target)) {
          modeSelector.classList.remove('open');
        }
      });
    }

    function updateModeGlow(modeName) {
      const name = modeName || ($('#currentModeName') ? $('#currentModeName').textContent.trim() : "Finefast");
      const color = name.toLowerCase() === 'melly' ? '#33a440' : '#d269e6';
      if (fiaibar) fiaibar.style.setProperty('--mode-glow', color);
    }
    initModeSelector();

    // ── Ghost Rotating Placeholders ──
    const ghosts = [
      'How to build the future of humanity?',
      'Synthesize molecular drug targets for neuroregeneration',
      'Construct a proof for topological quantum computing',
      'Optimize our distributed low-latency compiler pipeline',
      'Design high-efficiency power electronics for magnetic levitation',
      'Automate our entire local developer workspace with OpenClaw',
      'Model macroeconomic volatility using game-theoretic equilibria'
    ];
    let gi = 0;
    inp.placeholder = ghosts[gi];
    setInterval(() => {
      gi = (gi + 1) % ghosts.length;
      inp.placeholder = ghosts[gi];
    }, 5000);

    // ── Composer Interactions ──
    function autoGrow(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    inp.addEventListener('input', () => autoGrow(inp));
    workspaceInp.addEventListener('input', () => autoGrow(workspaceInp));

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && inp.value.trim()) {
        e.preventDefault();
        const text = inp.value.trim();
        closeHomeInput();
        openWorkspace(text);
      }
    });

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (inp.value.trim()) {
          const text = inp.value.trim();
          closeHomeInput();
          openWorkspace(text);
        }
      });
    }

    function closeHomeInput() {
      inputWrap.classList.remove('on');
      inp.value = '';
      inp.style.height = 'auto';
    }

    document.addEventListener('click', e => {
      const insideBar = e.target.closest('#inputWrap');
      if (insideBar) {
        if (!inputWrap.classList.contains('on') && !taskRunning) {
          inputWrap.classList.add('on');
          inp.focus();
        }
      } else {
        if (inputWrap.classList.contains('on') && !inp.value.trim() && !taskRunning) {
          closeHomeInput();
        }
      }
    });

    document.addEventListener('keydown', e => {
      if (!inputWrap.classList.contains('on') && !supergenceWorkspace.classList.contains('active') && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputWrap.classList.add('on');
        inp.focus();
      }
      if (e.key === 'Escape') {
        closeHomeInput();
      }
    });

    // ── Navigation Transitions: Home vs Workspace ──
    window.openWorkspace = function(query) {
      if (!query) return;
      homeView.style.display = 'none';
      inputWrap.style.display = 'none';
      supergenceWorkspace.classList.add('active');

      userQueryPill.textContent = query;
      addProgressTask(query);
      executeTurnInWorkspace(query);
    };

    window.toggleWorkspaceFromNav = function() {
      if (supergenceWorkspace.classList.contains('active')) {
        returnToHome();
      } else {
        homeView.style.display = 'none';
        inputWrap.style.display = 'none';
        supergenceWorkspace.classList.add('active');
      }
    };

    function returnToHome() {
      supergenceWorkspace.classList.remove('active');
      homeView.style.display = 'flex';
      inputWrap.style.display = 'flex';
    }

    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', returnToHome);
    }

    // Toggle Work Tree collapse
    if (workTreeToggle) {
      workTreeToggle.addEventListener('click', () => {
        workTreeSection.classList.toggle('collapsed');
      });
    }

    // In-Workspace Follow-up Composer
    workspaceInp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && workspaceInp.value.trim()) {
        e.preventDefault();
        const text = workspaceInp.value.trim();
        workspaceInp.value = '';
        workspaceInp.style.height = 'auto';
        userQueryPill.textContent = text;
        addProgressTask(text);
        executeTurnInWorkspace(text);
      }
    });

    if (workspaceSendBtn) {
      workspaceSendBtn.addEventListener('click', () => {
        if (workspaceInp.value.trim()) {
          const text = workspaceInp.value.trim();
          workspaceInp.value = '';
          workspaceInp.style.height = 'auto';
          userQueryPill.textContent = text;
          addProgressTask(text);
          executeTurnInWorkspace(text);
        }
      });
    }

    // ── Helper: Render Authentic Animated Mini Face SVG ──
    function createAgentMiniFaceSvg(agentId, color) {
      const c = color || '#9F7CEF';
      const uid = 'meta-' + agentId.replace(/[^a-zA-Z0-9]/g, '');
      return \`
        <svg viewBox="0 0 500 500" style="width: 100%; height: 100%; overflow: visible;">
          <defs>
            <filter id="\${uid}">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"></feGaussianBlur>
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -6" result="fluid"></feColorMatrix>
              <feComposite in="SourceGraphic" in2="fluid" operator="atop"></feComposite>
            </filter>
          </defs>
          <g style="filter: url(#\${uid}); scale: 0.25; transform-origin: 250px 250px; animation: rotateCore 25s ease-in-out infinite;">
            <circle cx="250" cy="250" r="54" style="fill: \${c};"></circle>
            <g style="transform-origin: 260px 200px; animation: rotateCore 18s ease-in-out infinite;">
              <circle cx="340" cy="230" r="28" style="fill: \${c};"></circle>
              <circle cx="430" cy="250" r="18" style="fill: \${c};"></circle>
              <circle cx="490" cy="230" r="12" style="fill: \${c};"></circle>
            </g>
          </g>
          <g style="scale: -0.25; filter: url(#\${uid}); transform-origin: 250px 250px; animation: rotateCore 25s ease-in-out infinite;">
            <circle cx="250" cy="250" r="54" style="fill: \${c};"></circle>
            <g style="transform-origin: 260px 200px; animation: rotateCore 18s ease-in-out infinite;">
              <circle cx="340" cy="230" r="28" style="fill: \${c};"></circle>
              <circle cx="430" cy="250" r="18" style="fill: \${c};"></circle>
              <circle cx="490" cy="230" r="12" style="fill: \${c};"></circle>
            </g>
          </g>
        </svg>
      \`;
    }

    // ── Helper: Render Step Icon SVG ──
    function getStepIconSvg(type, color) {
      const c = color || '#9F7CEF';
      if (type === 'memory') {
        return \`<svg viewBox="0 0 24 24" fill="none" stroke="\${c}" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.2-.5 2.2-1.3 3H17a4 4 0 0 1 4 4c0 1.4-.7 2.6-1.8 3.3.5.8.8 1.7.8 2.7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4c0-1 .3-1.9.8-2.7A4 4 0 0 1 3 13a4 4 0 0 1 4-4h1.3A4 4 0 0 1 7 6a4 4 0 0 1 5-4z"/></svg>\`;
      }
      if (type === 'terminal' || type === 'openclaw') {
        return \`<svg viewBox="0 0 24 24" fill="none" stroke="\${c}" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>\`;
      }
      if (type === 'search' || type === 'web') {
        return \`<svg viewBox="0 0 24 24" fill="none" stroke="\${c}" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\`;
      }
      if (type === 'swarm' || type === 'team') {
        return \`<svg viewBox="0 0 24 24" fill="none" stroke="\${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/></svg>\`;
      }
      return \`<svg viewBox="0 0 24 24" fill="none" stroke="\${c}" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>\`;
    }

    // ── Execute Turn in Workspace & Stream Work Tree Steps ──
    async function executeTurnInWorkspace(q) {
      if (!q) return;
      mainResponseBody.innerHTML = '<em>Synthesizing thoughts across unified swarm...</em>';
      workTreeSection.classList.remove('collapsed');

      // Initial loading steps
      workTreeBody.innerHTML = \`
        <div class="work-tree-node">
          <div class="work-tree-node-header">
            <div class="work-tree-icon" style="background: rgba(159, 124, 239, 0.15);">
              \${getStepIconSvg('memory', '#9F7CEF')}
            </div>
            <span class="work-tree-title">Consulting Hermes lifelong memory & user context</span>
          </div>
          <div class="work-tree-line"></div>
          <div class="work-tree-substeps">
            <span class="work-tree-substep-item">Scanning learned cognitive facets and interaction rules...</span>
          </div>
        </div>
        <div class="work-tree-node">
          <div class="work-tree-node-header">
            <div class="work-tree-icon" style="background: rgba(45, 212, 191, 0.15);">
              \${getStepIconSvg('openclaw', '#2DD4BF')}
            </div>
            <span class="work-tree-title">Validating OpenClaw computer execution & OS sandbox</span>
          </div>
          <div class="work-tree-line"></div>
        </div>
      \`;

      const mode = $('#currentModeName') ? $('#currentModeName').textContent.trim() : 'Finefast';

      try {
        const res = await fetch('/api/sis/unified-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, mode })
        });
        const data = await res.json();

        if (data.success && data.steps && Array.isArray(data.steps)) {
          // Render the structured execution steps matching reference image media_1791433530014.png
          let stepsHtml = '';
          data.steps.forEach((step, idx) => {
            const iconSvg = getStepIconSvg(step.icon, step.iconColor);
            let substepsHtml = '';
            if (step.substeps && Array.isArray(step.substeps) && step.substeps.length > 0) {
              substepsHtml = \`
                <div class="work-tree-substeps">
                  \${step.substeps.map(s => \`<span class="work-tree-substep-item">\${s}</span>\`).join('')}
                </div>
              \`;
            }
            stepsHtml += \`
              <div class="work-tree-node">
                <div class="work-tree-node-header">
                  <div class="work-tree-icon" style="background: rgba(255,255,255,0.06);">
                    \${iconSvg}
                  </div>
                  <span class="work-tree-title">\${step.title}</span>
                </div>
                <div class="work-tree-line"></div>
                \${substepsHtml}
              </div>
            \`;
          });
          workTreeBody.innerHTML = stepsHtml;

          // Render answer markdown
          mainResponseBody.textContent = data.response;

          // Add tool notice if proposed
          if (data.toolProposal) {
            mainResponseBody.textContent += \`\\n\\n⚡ [Dynamic Tool Forged]: \${data.toolProposal.displayName || 'Custom Tool'} (\${data.toolProposal.status})\`;
          }
        } else if (data.response) {
          mainResponseBody.textContent = data.response;
        } else {
          mainResponseBody.textContent = 'Error: ' + (data.error || 'Failed to complete turn');
        }
      } catch (err) {
        mainResponseBody.textContent = 'Connection error: ' + err.message;
      }
    }

    // ── Progress Section Tracker ──
    function addProgressTask(taskText) {
      if (!taskText) return;
      pastTasks.unshift({ text: taskText, timestamp: new Date().toLocaleTimeString() });
      if (pastTasks.length > 8) pastTasks.pop();

      progressTasksList.innerHTML = pastTasks.map(t => \`
        <div class="progress-task-item">
          <span class="progress-task-icon">✓</span>
          <span>\${t.text}</span>
        </div>
      \`).join('');
    }

    // ── Fetch & Render SIS System Agents Swarm ──
    async function loadAgentSwarm() {
      try {
        const res = await fetch('/api/agents/team');
        const data = await res.json();
        if (data.success && Array.isArray(data.agents)) {
          registeredAgents = data.agents;
          renderAgentList(data.agents);
        }
      } catch (e) {
        console.warn('Failed to load agents:', e.message);
      }
    }

    function renderAgentList(agents) {
      sisAgentsList.innerHTML = agents.map(agent => \`
        <div class="sis-agent-row" onclick="openAgentColumn('\${agent.id}')" title="Click to open \${agent.name} side-by-side">
          <div class="sis-agent-row-left">
            <div class="sis-agent-row-face">
              \${createAgentMiniFaceSvg(agent.id, agent.color)}
            </div>
            <div class="sis-agent-row-meta">
              <span class="sis-agent-row-name" style="color: \${agent.color || '#fff'}">\${agent.name}</span>
              <span class="sis-agent-row-domain">\${agent.domain.substring(0, 32)}...</span>
            </div>
          </div>
          <span class="open-column-indicator">Open →</span>
        </div>
      \`).join('');
    }

    // ── Open Side-by-Side Agent Column ──
    window.openAgentColumn = function(agentId) {
      const agent = registeredAgents.find(a => a.id === agentId);
      if (!agent) return;

      if (openedAgentColumns.has(agentId)) {
        // Already opened, scroll into view
        const existing = document.getElementById('col-' + agentId);
        if (existing) existing.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      const colEl = document.createElement('div');
      colEl.className = 'side-agent-column';
      colEl.id = 'col-' + agentId;
      colEl.innerHTML = \`
        <div class="side-agent-header">
          <div class="side-agent-profile">
            <div class="side-agent-mini-face">
              \${createAgentMiniFaceSvg(agent.id, agent.color)}
            </div>
            <div class="side-agent-titles">
              <span class="side-agent-name" style="color: \${agent.color || '#fff'}">\${agent.name}</span>
              <span class="side-agent-role">\${agent.role}</span>
            </div>
          </div>
          <div class="side-agent-header-controls">
            <button class="talk-to-agent-btn" onclick="collaborateWithAnotherAgent('\${agent.id}')">Talk to...</button>
            <button class="close-column-btn" onclick="closeAgentColumn('\${agent.id}')">✕</button>
          </div>
        </div>

        <div class="side-agent-chat-messages" id="msgs-\${agent.id}">
          <div class="side-agent-msg agent">
            <strong>\${agent.name} online.</strong> Specialized in \${agent.domain}. Direct instructions and cross-agent collaboration ready.
          </div>
        </div>

        <div class="side-agent-composer">
          <textarea class="side-agent-inp" id="inp-\${agent.id}" placeholder="Instruct \${agent.name}..." rows="1"></textarea>
          <button class="side-agent-send-btn" onclick="sendToAgentColumn('\${agent.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"/>
            </svg>
          </button>
        </div>
      \`;

      sideAgentsContainer.appendChild(colEl);
      openedAgentColumns.set(agentId, colEl);

      // Auto-grow textarea
      const inpEl = colEl.querySelector('#inp-' + agentId);
      inpEl.addEventListener('input', () => autoGrow(inpEl));
      inpEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && inpEl.value.trim()) {
          e.preventDefault();
          sendToAgentColumn(agentId);
        }
      });

      colEl.scrollIntoView({ behavior: 'smooth' });
    };

    window.closeAgentColumn = function(agentId) {
      const colEl = openedAgentColumns.get(agentId);
      if (colEl) {
        colEl.remove();
        openedAgentColumns.delete(agentId);
      }
    };

    window.sendToAgentColumn = async function(agentId) {
      const agent = registeredAgents.find(a => a.id === agentId);
      const inpEl = document.getElementById('inp-' + agentId);
      const msgsEl = document.getElementById('msgs-' + agentId);
      if (!agent || !inpEl || !msgsEl || !inpEl.value.trim()) return;

      const userMsg = inpEl.value.trim();
      inpEl.value = '';
      inpEl.style.height = 'auto';

      // Append user bubble
      const uBubble = document.createElement('div');
      uBubble.className = 'side-agent-msg user';
      uBubble.textContent = userMsg;
      msgsEl.appendChild(uBubble);

      // Append loading bubble
      const aBubble = document.createElement('div');
      aBubble.className = 'side-agent-msg agent';
      aBubble.innerHTML = '<em>Thinking...</em>';
      msgsEl.appendChild(aBubble);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      try {
        const res = await fetch('/api/agents/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, message: userMsg })
        });
        const data = await res.json();
        if (data.success && data.response) {
          aBubble.textContent = data.response;
        } else {
          aBubble.textContent = 'Error: ' + (data.error || 'Failed to get response');
        }
      } catch (err) {
        aBubble.textContent = 'Error: ' + err.message;
      }
      msgsEl.scrollTop = msgsEl.scrollHeight;
    };

    // Cross-Agent Collaboration Trigger
    window.collaborateWithAnotherAgent = async function(sourceAgentId) {
      const otherAgents = registeredAgents.filter(a => a.id !== sourceAgentId);
      if (otherAgents.length === 0) return;

      const targetAgent = otherAgents[Math.floor(Math.random() * otherAgents.length)];
      const sourceAgent = registeredAgents.find(a => a.id === sourceAgentId);
      const msgsEl = document.getElementById('msgs-' + sourceAgentId);
      if (!msgsEl) return;

      const cBubble = document.createElement('div');
      cBubble.className = 'side-agent-msg agent';
      cBubble.innerHTML = \`⚡ <em>Collaborating with \${targetAgent.name}... Passing domain context and synthesizing findings.</em>\`;
      msgsEl.appendChild(cBubble);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      try {
        const res = await fetch('/api/agents/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: targetAgent.id,
            message: \`[From \${sourceAgent.name}]: Please review and provide specialized input from your domain perspective.\`
          })
        });
        const data = await res.json();
        if (data.success && data.response) {
          cBubble.innerHTML = \`<strong>[\${targetAgent.name} response]:</strong> \${data.response}\`;
        }
      } catch (e) {
        cBubble.textContent = 'Collaboration error: ' + e.message;
      }
      msgsEl.scrollTop = msgsEl.scrollHeight;
    };

    // ── Create Agent Modal Handlers ──
    function openCreateAgentModal() {
      createAgentModal.classList.add('active');
    }
    function closeCreateAgentModal() {
      createAgentModal.classList.remove('active');
    }

    if (createAgentHeaderBtn) createAgentHeaderBtn.addEventListener('click', openCreateAgentModal);
    if (sidebarCreateAgentBtn) sidebarCreateAgentBtn.addEventListener('click', openCreateAgentModal);
    if (sidebarCreateAgentBtnFull) sidebarCreateAgentBtnFull.addEventListener('click', openCreateAgentModal);
    if (closeCreateAgentModalBtn) closeCreateAgentModalBtn.addEventListener('click', closeCreateAgentModal);
    if (cancelCreateAgentBtn) cancelCreateAgentBtn.addEventListener('click', closeCreateAgentModal);

    if (createAgentForm) {
      createAgentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#newAgentName').value.trim();
        const domain = $('#newAgentDomain').value.trim();
        const prompt = $('#newAgentPrompt').value.trim();
        const colorRadio = $('input[name="agentColor"]:checked');
        const color = colorRadio ? colorRadio.value : '#34D399';

        const submitBtn = $('#submitCreateAgentBtn');
        submitBtn.textContent = 'Awakening & Researching...';
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/agents/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              domain,
              role: name + ' Lead',
              systemPrompt: prompt,
              initialTask: 'Researching domain ontology, storing operational rules, and specializing in ' + domain,
              color
            })
          });
          const data = await res.json();
          if (data.success && data.agent) {
            registeredAgents.push(data.agent);
            renderAgentList(registeredAgents);
            closeCreateAgentModal();
            createAgentForm.reset();
            // Automatically open side-by-side
            openAgentColumn(data.agent.id);
          }
        } catch (err) {
          alert('Failed to create agent: ' + err.message);
        } finally {
          submitBtn.textContent = 'Awaken & Specialize Agent';
          submitBtn.disabled = false;
        }
      });
    }

    // Load initial swarm on startup
    loadAgentSwarm();
  </script>
</body>
</html>
`;

// This historical template is a standalone demo. The maintained app lives in
// client/index.html; regenerating a demo must not overwrite it.
const outputPath = path.join(ROOT_DIR, 'demos', 'legacy', 'newfrontend.html');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, template, 'utf8');
console.log('Wrote standalone frontend:', outputPath);
