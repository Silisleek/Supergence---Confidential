import { existsSync, readFileSync } from 'node:fs';

const assetDirectory = [
  new URL('../../client/images/cursors/', import.meta.url),
  new URL('../../dist/images/cursors/', import.meta.url),
].find((directory) => existsSync(new URL('default.cur', directory)));

// The bundled Tahoe cursors each contain one 32px, 32-bit Windows bitmap.
function readCursor(name) {
  const file = readFileSync(new URL(`${name}.cur`, assetDirectory));
  const offset = file.readUInt32LE(18);
  const width = file[6];
  const height = file[7];
  const pixels = Buffer.alloc(width * height * 4);
  const start = offset + file.readUInt32LE(offset);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = start + ((height - 1 - y) * width + x) * 4;
      const target = (y * width + x) * 4;
      pixels[target] = file[source + 2];
      pixels[target + 1] = file[source + 1];
      pixels[target + 2] = file[source];
      pixels[target + 3] = file[source + 3];
    }
  }
  return {
    width,
    height,
    x: file.readUInt16LE(10),
    y: file.readUInt16LE(12),
    pixels: pixels.toString('base64'),
  };
}

const cursors = assetDirectory
  ? Object.fromEntries(['default', 'pointer', 'text'].map((name) => [name, readCursor(name)]))
  : null;

function installCursor(images, name) {
  if (window.top !== window || window.__updateAgentCursor) return;
  const cursor = document.createElement('div');
  cursor.id = 'sis-agent-virtual-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;';
  const icon = document.createElement('canvas');
  icon.style.cssText = 'position:absolute;display:block;';
  const context = icon.getContext('2d');
  if (!context) return;
  const badge = document.createElement('span');
  badge.textContent = name;
  badge.style.cssText =
    'position:absolute;top:5px;left:23px;padding:3px 7px;border-radius:6px;white-space:nowrap;background:#201926;color:#f5edf4;font:11px system-ui;';
  cursor.append(icon, badge);
  let previous;

  window.__updateAgentCursor = (x, y, action, label) => {
    if (!document.body) return;
    if (!cursor.isConnected) document.body.appendChild(cursor);
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    if (label) badge.textContent = label;
    const target = document.elementFromPoint(x, y);
    const style = target && window.getComputedStyle(target).cursor;
    const kind =
      action === 'typing' ||
      style === 'text' ||
      target?.closest(
        'textarea,input:not([type]),input[type="text"],input[type="search"],[contenteditable="true"]',
      )
        ? 'text'
        : style === 'pointer' || target?.closest('a[href],button,[role="button"]')
          ? 'pointer'
          : 'default';
    if (kind === previous) return;
    previous = kind;
    const image = images[kind];
    icon.width = image.width;
    icon.height = image.height;
    icon.style.left = `${-image.x}px`;
    icon.style.top = `${-image.y}px`;
    const pixels = Uint8ClampedArray.from(atob(image.pixels), (byte) => byte.charCodeAt(0));
    context.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  };
}

export function generateBrowserCursorScript(name) {
  if (!cursors) return '';
  // Draw the local pixels directly so a site's image policy cannot block them.
  return `(${installCursor.toString()})(${JSON.stringify(cursors)}, ${JSON.stringify(name)});`;
}
