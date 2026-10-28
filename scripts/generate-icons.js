import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const resourcesDir = path.join(rootDir, 'resources');

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

// 512x512 Master Supergence SVG Icon
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0A1428"/>
      <stop offset="70%" stop-color="#030812"/>
      <stop offset="100%" stop-color="#01040A"/>
    </radialGradient>

    <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F2FE"/>
      <stop offset="100%" stop-color="#0072FF"/>
    </linearGradient>

    <linearGradient id="purpleGlow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>

    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="25%" stop-color="#00F2FE"/>
      <stop offset="60%" stop-color="#0072FF" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0072FF" stop-opacity="0"/>
    </radialGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Base rounded squircle -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" stroke="url(#cyanGlow)" stroke-width="3" stroke-opacity="0.4"/>

  <!-- Outer Quantum Reactor Ring -->
  <circle cx="256" cy="256" r="200" stroke="#00F2FE" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="12 16"/>
  <circle cx="256" cy="256" r="180" stroke="url(#cyanGlow)" stroke-width="4" filter="url(#glow)"/>

  <!-- Orbital Sensor Nodes -->
  <circle cx="256" cy="76" r="8" fill="#00F2FE" filter="url(#glow)"/>
  <circle cx="256" cy="436" r="8" fill="#00F2FE" filter="url(#glow)"/>
  <circle cx="76" cy="256" r="8" fill="#A855F7" filter="url(#glow)"/>
  <circle cx="436" cy="256" r="8" fill="#A855F7" filter="url(#glow)"/>

  <!-- Diagonal Sub-nodes -->
  <circle cx="128" cy="128" r="5" fill="#00FF88" filter="url(#glow)"/>
  <circle cx="384" cy="128" r="5" fill="#00FF88" filter="url(#glow)"/>
  <circle cx="128" cy="384" r="5" fill="#00FF88" filter="url(#glow)"/>
  <circle cx="384" cy="384" r="5" fill="#00FF88" filter="url(#glow)"/>

  <!-- Hexagonal Matrix Frame -->
  <polygon points="256,116 377,186 377,326 256,396 135,326 135,186" fill="none" stroke="url(#purpleGlow)" stroke-width="3" stroke-opacity="0.75" filter="url(#glow)"/>

  <!-- Inner Concentric Circuit Ring -->
  <circle cx="256" cy="256" r="100" stroke="#00F2FE" stroke-width="3" stroke-opacity="0.6" stroke-dasharray="6 8"/>

  <!-- Core Radiant Aura -->
  <circle cx="256" cy="256" r="76" fill="url(#coreGlow)" filter="url(#glow)"/>

  <!-- Supergence Tri-Vector Quantum Core Glyph -->
  <g filter="url(#glow)">
    <!-- Top Apex Blade -->
    <path d="M256 160 L280 236 L232 236 Z" fill="#00F2FE"/>
    <!-- Bottom Right Blade -->
    <path d="M336 304 L260 274 L284 236 Z" fill="#38BDF8"/>
    <!-- Bottom Left Blade -->
    <path d="M176 304 L228 236 L252 274 Z" fill="#818CF8"/>
    <!-- Center Fusion Eye -->
    <circle cx="256" cy="256" r="22" fill="#FFFFFF"/>
    <circle cx="256" cy="256" r="12" fill="#030812"/>
    <circle cx="256" cy="256" r="6" fill="#00F2FE"/>
  </g>
</svg>
`;

// Helper to construct a multi-resolution ICO file from PNG buffers
function createIcoBuffer(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  let currentOffset = dirSize;
  const entries = [];

  for (const item of pngBuffers) {
    const { width, height, buffer } = item;
    const size = buffer.length;
    entries.push({
      width: width >= 256 ? 0 : width,
      height: height >= 256 ? 0 : height,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: size,
      imageOffset: currentOffset,
      buffer,
    });
    currentOffset += size;
  }

  const icoBuffer = Buffer.alloc(currentOffset);

  // Write ICO Header
  icoBuffer.writeUInt16LE(0, 0); // Reserved
  icoBuffer.writeUInt16LE(1, 2); // 1 = Icon
  icoBuffer.writeUInt16LE(count, 4); // Number of images

  // Write Directory Entries
  let entryPos = headerSize;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, entryPos + 0);
    icoBuffer.writeUInt8(entry.height, entryPos + 1);
    icoBuffer.writeUInt8(entry.colorCount, entryPos + 2);
    icoBuffer.writeUInt8(entry.reserved, entryPos + 3);
    icoBuffer.writeUInt16LE(entry.planes, entryPos + 4);
    icoBuffer.writeUInt16LE(entry.bitCount, entryPos + 6);
    icoBuffer.writeUInt32LE(entry.bytesInRes, entryPos + 8);
    icoBuffer.writeUInt32LE(entry.imageOffset, entryPos + 12);
    entryPos += dirEntrySize;
  }

  // Write Image Buffers
  for (const entry of entries) {
    entry.buffer.copy(icoBuffer, entry.imageOffset);
  }

  return icoBuffer;
}

async function main() {
  console.log('Generating Supergence high-resolution icon set...');
  const svgBuffer = Buffer.from(svgIcon);

  // 1. Generate master 512x512 PNG
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png512);
  console.log('✓ Created resources/icon.png (512x512)');

  // 2. Generate multi-resolution PNG buffers for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const sz of sizes) {
    const buf = await sharp(svgBuffer).resize(sz, sz).png().toBuffer();
    pngBuffers.push({ width: sz, height: sz, buffer: buf });
  }

  // 3. Assemble Windows ICO
  const icoBuffer = createIcoBuffer(pngBuffers);
  fs.writeFileSync(path.join(resourcesDir, 'icon.ico'), icoBuffer);
  console.log(`✓ Created resources/icon.ico (${sizes.join('x, ')}x)`);

  console.log('Icon generation completed successfully!');
}

main().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
