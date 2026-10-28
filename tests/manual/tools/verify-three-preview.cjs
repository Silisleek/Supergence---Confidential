const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  // Track console messages from all windows
  const consoleLogs = [];

  // Create main window
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
      sandbox: false,
    },
    show: true,
  });

  win.webContents.on('console-message', (event, level, msg, line, file) => {
    consoleLogs.push(`[MAIN ${level}] ${msg}`);
  });
  win.webContents.on('preload-error', (event, webPreferences, error) => {
    consoleLogs.push(`[MAIN PRELOAD-ERROR] ${error.message}`);
  });

  await win.loadURL('http://localhost:3008');

  // Wait for boot to complete and app to initialize
  await new Promise((r) => setTimeout(r, 6000));

  // Take screenshot of main app
  let img = await win.webContents.capturePage();
  fs.writeFileSync('verify-main-app.png', img.toPNG());
  console.log('Main app screenshot saved');

  // Create preview window for 3D content
  const previewWin = new BrowserWindow({
    width: 1000,
    height: 800,
    backgroundColor: '#030812',
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
    show: true,
  });

  previewWin.webContents.on('console-message', (event, level, msg, line, file) => {
    consoleLogs.push(`[PREVIEW ${level}] ${msg}`);
  });
  previewWin.webContents.on('preload-error', (event, webPreferences, error) => {
    consoleLogs.push(`[PREVIEW PRELOAD-ERROR] ${error.message}`);
  });

  console.log('Loading preview: http://localhost:3008/workspace/attack_on_titan_game.html');
  await previewWin.loadURL('http://localhost:3008/workspace/attack_on_titan_game.html');

  // Wait for Three.js to load
  await new Promise((r) => setTimeout(r, 8000));

  // Capture preview window
  img = await previewWin.webContents.capturePage();
  fs.writeFileSync('verify-3d-preview.png', img.toPNG());
  console.log('3D preview screenshot saved');

  // Save console logs
  fs.writeFileSync('verify-console-logs.txt', consoleLogs.join('\n'));
  console.log('Console logs saved to verify-console-logs.txt');

  console.log('All verification complete');
  process.exit(0);
});
