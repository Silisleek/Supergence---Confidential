import fs from 'node:fs';
import path from 'node:path';

const bgDir = path.resolve('client/images/silisleek-assets/Without-BG');
const mainDir = path.resolve('client/images/silisleek-assets');

const bgFiles = fs.readdirSync(bgDir).map((f) => ({
  name: f,
  path: '/images/silisleek-assets/Without-BG/' + f,
  dir: 'Without-BG',
}));
const mainFiles = fs
  .readdirSync(mainDir)
  .filter((f) => f !== 'Without-BG')
  .map((f) => ({
    name: f,
    path: '/images/silisleek-assets/' + f,
    dir: 'Main',
  }));

const all = [...bgFiles, ...mainFiles];

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Silisleek Assets Catalog</title>
<style>
  body { background: #000; color: #fff; font-family: -apple-system, sans-serif; padding: 30px; margin: 0; }
  h1 { font-weight: 300; font-size: 28px; margin-bottom: 24px; color: #fff; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .card { background: #0c101a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; text-align: center; }
  .img-box { width: 100%; height: 220px; display: flex; align-items: center; justify-content: center; background: #020408; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
  img { max-width: 90%; max-height: 90%; object-fit: contain; }
  .title { font-size: 11px; word-break: break-all; color: #94a3b8; font-family: monospace; }
  .tag { display: inline-block; font-size: 11px; font-weight: 600; background: #e0b38c; color: #000; padding: 2px 8px; border-radius: 9999px; margin-bottom: 8px; }
</style>
</head>
<body>
  <h1>Silisleek Assets Catalog (${all.length} items)</h1>
  <div class="grid">
    ${all
      .map(
        (item) => `
      <div class="card">
        <span class="tag">${item.dir}</span>
        <div class="img-box">
          <img src="${item.path}" alt="${item.name}">
        </div>
        <div class="title">${item.name}</div>
      </div>
    `,
      )
      .join('')}
  </div>
</body>
</html>`;

fs.mkdirSync('client/silisleek', { recursive: true });
fs.writeFileSync('client/silisleek/catalog.html', html, 'utf8');
console.log('Saved client/silisleek/catalog.html with', all.length, 'assets');
