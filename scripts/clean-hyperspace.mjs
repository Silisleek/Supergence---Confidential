import sharp from 'sharp';
import path from 'node:path';

async function clean() {
  const imgPath = 'client/images/cosmic-hyperspace.png';
  const meta = await sharp(imgPath).metadata();
  const { width, height } = meta;

  // The ghost text and input card are located in the center:
  // x: 380 to 1540 (width: 1160)
  // y: 220 to 680 (height: 460)
  const left = 360;
  const top = 200;
  const cropW = 1200;
  const cropH = 500;

  // Extract the center region, heavily blur it to remove text & box outlines while preserving warp colors
  const blurredPatch = await sharp(imgPath)
    .extract({ left, top, width: cropW, height: cropH })
    .blur(35) // Blurs away sharp text & card outlines into smooth cosmic light beam
    .toBuffer();

  // Create an SVG gradient mask so the edges of the patch blend seamlessly into the original image
  const maskSvg = Buffer.from(`
    <svg width="${cropW}" height="${cropH}" viewBox="0 0 ${cropW} ${cropH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="65%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="85%" stop-color="#ffffff" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${cropW}" height="${cropH}" fill="url(#fade)" />
    </svg>
  `);

  // Mask the blurred patch with the radial fade
  const featheredPatch = await sharp(blurredPatch)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Composite the feathered blurred patch over the original image
  await sharp(imgPath)
    .composite([{ input: featheredPatch, left, top }])
    .toFile('client/images/cosmic-hyperspace-clean.png');

  console.log('✓ Successfully created cleaned cosmic hyperspace background!');
}

clean().catch(console.error);
