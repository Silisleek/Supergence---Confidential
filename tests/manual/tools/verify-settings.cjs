const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    frame: false,
    backgroundColor: '#030812',
    backgroundMaterial: 'mica',
    webPreferences: {
      preload: path.join(__dirname, '../../../electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: true,
  });

  await win.loadFile(path.join(__dirname, '../../../dist/index.html'));

  // Wait for boot screen to complete
  await new Promise((r) => setTimeout(r, 5000));

  const img = await win.webContents.capturePage();
  fs.writeFileSync('verify-settings-btn.png', img.toPNG());
  console.log('Screenshot saved: verify-settings-btn.png');
  process.exit(0);
});
