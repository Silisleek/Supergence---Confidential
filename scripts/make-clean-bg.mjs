import sharp from 'sharp';

async function generateCleanCosmicBackground() {
  const width = 1920;
  const height = 1080;

  // Generate SVG with pure cosmic hyperspace streaks, warm center warp core, and starfield
  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Base deep space background -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#040508" />
        <stop offset="50%" stop-color="#08090f" />
        <stop offset="100%" stop-color="#040508" />
      </linearGradient>

      <!-- Center warm amber warp core -->
      <radialGradient id="warpCore" cx="50%" cy="50%" rx="65%" ry="38%">
        <stop offset="0%" stop-color="#fff5e6" stop-opacity="0.85" />
        <stop offset="15%" stop-color="#ffb84d" stop-opacity="0.65" />
        <stop offset="35%" stop-color="#d97706" stop-opacity="0.4" />
        <stop offset="60%" stop-color="#9333ea" stop-opacity="0.2" />
        <stop offset="85%" stop-color="#1e1b4b" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#040508" stop-opacity="0" />
      </radialGradient>

      <!-- Violet cosmic haze on the left -->
      <radialGradient id="leftHaze" cx="15%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.25" />
        <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#040508" stop-opacity="0" />
      </radialGradient>

      <!-- Cyan/Violet cosmic haze on the right -->
      <radialGradient id="rightHaze" cx="85%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.2" />
        <stop offset="50%" stop-color="#c084fc" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#040508" stop-opacity="0" />
      </radialGradient>

      <!-- Hyperspace streak gradients -->
      <linearGradient id="streakGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7" />
        <stop offset="30%" stop-color="#fde047" stop-opacity="0.5" />
        <stop offset="70%" stop-color="#ea580c" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </linearGradient>

      <linearGradient id="streakViolet" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75" />
        <stop offset="35%" stop-color="#c084fc" stop-opacity="0.45" />
        <stop offset="75%" stop-color="#38bdf8" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </linearGradient>

      <filter id="glowBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="deepBlur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="40" />
      </filter>
    </defs>

    <!-- 1. Dark base space -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

    <!-- 2. Ambient cosmic nebulas -->
    <rect width="${width}" height="${height}" fill="url(#leftHaze)" />
    <rect width="${width}" height="${height}" fill="url(#rightHaze)" />

    <!-- 3. Curved light beams (Upper & Lower Hyperspace Warp Rays) -->
    <g filter="url(#glowBlur)">
      <!-- Top-left to Center ray -->
      <path d="M-100,-50 Q450,300 960,540 Q1470,300 2020,-50" fill="none" stroke="url(#streakGold)" stroke-width="28" opacity="0.45" />
      <path d="M-50,80 Q480,380 960,540 Q1440,380 1970,80" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.6" />
      <path d="M0,180 Q520,440 960,540 Q1400,440 1920,180" fill="none" stroke="url(#streakViolet)" stroke-width="16" opacity="0.4" />

      <!-- Bottom-left to Center ray -->
      <path d="M-100,1130 Q450,780 960,540 Q1470,780 2020,1130" fill="none" stroke="url(#streakGold)" stroke-width="32" opacity="0.45" />
      <path d="M-50,1000 Q480,700 960,540 Q1440,700 1970,1000" fill="none" stroke="#ffffff" stroke-width="9" opacity="0.6" />
      <path d="M0,900 Q520,640 960,540 Q1400,640 1920,900" fill="none" stroke="url(#streakViolet)" stroke-width="18" opacity="0.38" />

      <!-- Horizontal Center Warp Beam -->
      <ellipse cx="960" cy="540" rx="900" ry="140" fill="url(#warpCore)" filter="url(#deepBlur)" />
      <ellipse cx="960" cy="540" rx="600" ry="70" fill="url(#warpCore)" />
    </g>

    <!-- 4. Dynamic Star Dust & Starfield -->
    <g fill="#ffffff">
      ${Array.from({ length: 90 })
        .map(() => {
          const x = Math.floor(Math.random() * width);
          const y = Math.floor(Math.random() * height);
          const r = (Math.random() * 1.8 + 0.4).toFixed(1);
          const o = (Math.random() * 0.7 + 0.2).toFixed(2);
          return `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}" />`;
        })
        .join('\n      ')}
    </g>

    <!-- 5. Vignette darkening edges -->
    <rect width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="120" opacity="0.35" />
  </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('client/images/cosmic-hyperspace.png');

  console.log('✓ Clean procedural cosmic hyperspace background generated successfully!');
}

generateCleanCosmicBackground().catch(console.error);
