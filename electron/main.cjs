const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell,
  dialog,
  Notification,
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, fork } = require('child_process');

// Set Application User Model ID for Windows Taskbar & shell:appsfolder tile registration
app.name = 'Supergence';
app.setAppUserModelId('com.supergence.sis');

const appDataRoot = app.getPath('appData');
const defaultUserDataDir = path.join(appDataRoot, 'Supergence');
app.setPath('userData', defaultUserDataDir);

// Dynamic user-defined path loader
function loadStoragePaths() {
  const configLocations = [
    path.join(defaultUserDataDir, 'supergence-config.json'),
    path.join(path.dirname(process.execPath), 'supergence-config.json'),
    path.join(__dirname, '../supergence-config.json'),
  ];

  let loadedConfig = {};
  for (const loc of configLocations) {
    try {
      if (fs.existsSync(loc)) {
        loadedConfig = JSON.parse(fs.readFileSync(loc, 'utf8'));
        console.log(`[Config] Loaded user paths from: ${loc}`);
        break;
      }
    } catch (_) {}
  }

  const dataDir =
    process.env.SIS_DATA_DIR || loadedConfig.dataPath || path.join(defaultUserDataDir, 'data');
  const workspaceDir =
    process.env.SIS_WORKSPACE_DIR ||
    loadedConfig.workspacePath ||
    path.join(defaultUserDataDir, 'workspace');
  return {
    userDataDir: defaultUserDataDir,
    appDataDataDir: dataDir,
    appDataWorkspaceDir: workspaceDir,
    loadedConfig,
  };
}

let { userDataDir, appDataDataDir, appDataWorkspaceDir, loadedConfig } = loadStoragePaths();

let mainWindow = null;
let tray = null;
let backendProcess = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PORT = 3008;
const VITE_PORT = 5173;

// Initialize user AppData storage structure & seed data on first setup
function initializeAppDataStorage() {
  const subdirs = [
    'conversations',
    'memory',
    'theories',
    'research',
    'rules',
    'skills/learned',
    'tools/custom',
    'rsi',
    'improvement',
  ];

  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  if (!fs.existsSync(appDataDataDir)) fs.mkdirSync(appDataDataDir, { recursive: true });
  if (!fs.existsSync(appDataWorkspaceDir)) fs.mkdirSync(appDataWorkspaceDir, { recursive: true });

  for (const sub of subdirs) {
    const full = path.join(appDataDataDir, sub);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }

  // Copy initial seed data if not yet present in AppData
  const sourceDataDir = path.join(__dirname, '../data');
  if (fs.existsSync(sourceDataDir)) {
    const seedFiles = [
      'survival.json',
      'dynamic-parts.json',
      'memory/long-term.json',
      'memory/knowledge-graph.json',
    ];
    for (const rel of seedFiles) {
      const src = path.join(sourceDataDir, rel);
      const dest = path.join(appDataDataDir, rel);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          const destDir = path.dirname(dest);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.copyFileSync(src, dest);
          console.log(`[AppData] Seeded initial data: ${rel} -> ${dest}`);
        } catch (err) {
          console.warn(`[AppData] Could not seed ${rel}:`, err.message);
        }
      }
    }
  }

  console.log(`[AppData] Storage active at: ${appDataDataDir}`);
  return { userDataDir, appDataDataDir, appDataWorkspaceDir };
}

// Window bounds state file
const stateFilePath = path.join(userDataDir, 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      return JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Desktop] Could not read window state:', e.message);
  }
  return { width: 1400, height: 900, isMaximized: false };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMax = mainWindow.isMaximized();
    let bounds = { isMaximized: isMax };
    if (!isMax) {
      bounds = { ...mainWindow.getBounds(), isMaximized: false };
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(bounds, null, 2));
  } catch (e) {
    console.warn('[Desktop] Could not save window state:', e.message);
  }
}

// Check if a local HTTP endpoint is responding
function checkServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkViteDev(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start backend Express server if not already running
async function ensureBackendRunning() {
  const alreadyRunning = await checkServer(PORT);
  if (alreadyRunning) {
    console.log(`[Desktop] Express backend already running on port ${PORT}`);
    return;
  }

  console.log('[Desktop] Starting internal SIS Express server...');
  initializeAppDataStorage();
  const serverScript = path.join(__dirname, '../server/index.js');

  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: isDev ? 'development' : 'production',
    SIS_DATA_DIR: appDataDataDir,
    SIS_WORKSPACE_DIR: appDataWorkspaceDir,
    SUPERGENCE_APPDATA: userDataDir,
  };

  try {
    backendProcess = fork(serverScript, [], {
      env,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log(`[SIS-Backend] ${data.toString().trim()}`);
    });
    backendProcess.stderr?.on('data', (data) => {
      console.error(`[SIS-Backend-Err] ${data.toString().trim()}`);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Desktop] Backend exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });
  } catch (err) {
    console.error('[Desktop] Failed to fork backend server:', err);
  }

  // Poll until backend is healthy (up to 15 seconds)
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    const ok = await checkServer(PORT);
    if (ok) {
      console.log(`[Desktop] Backend is verified online on port ${PORT}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.warn('[Desktop] Backend start polling timed out after 15s');
}

function createMainWindow() {
  const savedState = loadWindowState();

  const iconPath = path.join(__dirname, '../resources/icon.ico');
  const pngIconPath = path.join(__dirname, '../resources/icon.png');
  const appIcon = fs.existsSync(iconPath) ? iconPath : pngIconPath;

  mainWindow = new BrowserWindow({
    width: savedState.width || 1400,
    height: savedState.height || 900,
    x: savedState.x,
    y: savedState.y,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Frameless custom Windows 11 title bar
    backgroundColor: '#030812',
    backgroundMaterial: 'mica', // Windows 11 Mica glass effect
    show: false, // Show once ready-to-show
    icon: appIcon,
    title: 'Supergence // SIS 1.0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
    },
  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // Window state listeners
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-change', true);
    saveWindowState();
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-change', false);
    saveWindowState();
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in user's default desktop browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Load URL
  loadApplication();
}

async function loadApplication() {
  if (isDev) {
    const isViteUp = await checkViteDev(VITE_PORT);
    if (isViteUp) {
      console.log(`[Desktop] Loading Vite Dev Server: http://localhost:${VITE_PORT}`);
      mainWindow.loadURL(`http://localhost:${VITE_PORT}`);
      return;
    }
  }

  // Production or fallback to Express server
  console.log(`[Desktop] Loading Express Frontend: http://localhost:${PORT}`);
  mainWindow.loadURL(`http://localhost:${PORT}`);
}

function createTray() {
  const iconPath = path.join(__dirname, '../resources/icon.ico');
  const pngIconPath = path.join(__dirname, '../resources/icon.png');
  const trayIconPath = fs.existsSync(iconPath) ? iconPath : pngIconPath;

  try {
    tray = new Tray(trayIconPath);
    tray.setToolTip('Supergence // SIS 1.0 Superintelligence');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Supergence Cockpit',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Open AppData Storage Folder',
        click: () => {
          shell.openPath(userDataDir);
        },
      },
      {
        label: 'Reload Interface',
        click: () => {
          if (mainWindow) mainWindow.reload();
        },
      },
      {
        label: 'Toggle Developer Tools',
        click: () => {
          if (mainWindow) mainWindow.webContents.toggleDevTools();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Supergence',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (err) {
    console.warn('[Desktop] Could not create system tray icon:', err.message);
  }
}

// ─── IPC Handlers for Window Caption Controls ───
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// AppData Storage IPC Handlers
ipcMain.on('open-appdata-folder', () => {
  shell.openPath(userDataDir);
});

ipcMain.handle('get-appdata-path', () => {
  return userDataDir;
});

// Storage and Path Customization IPC Handlers
ipcMain.handle('get-storage-paths', () => {
  return {
    userDataDir,
    dataDir: appDataDataDir,
    workspaceDir: appDataWorkspaceDir,
    installDir: app.getAppPath(),
  };
});

ipcMain.handle('browse-directory', async (_event, defaultPath) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Directory for Supergence',
    defaultPath: defaultPath || userDataDir,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('set-storage-paths', async (_event, newPaths) => {
  try {
    const configPath = path.join(userDataDir, 'supergence-config.json');
    const existing = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : {};
    const updated = {
      ...existing,
      dataPath: newPaths.dataPath || appDataDataDir,
      workspacePath: newPaths.workspacePath || appDataWorkspaceDir,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');

    // Update active runtime variables
    appDataDataDir = updated.dataPath;
    appDataWorkspaceDir = updated.workspacePath;
    initializeAppDataStorage();

    return { success: true, paths: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('open-path', (_event, targetPath) => {
  if (targetPath) {
    shell.openPath(targetPath);
  } else {
    shell.openPath(userDataDir);
  }
});

// Native notification API keeps titles and filenames out of executable shell code.
ipcMain.handle('show-notification', async (_event, { title, body, silent } = {}) => {
  try {
    if (!Notification.isSupported())
      return { success: false, error: 'Native notifications are unavailable.' };
    const notice = new Notification({
      title: String(title || 'Supergence'),
      body: String(body || ''),
      silent: Boolean(silent),
    });
    notice.show();
    return { success: true, submitted: true, platform: process.platform };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Toggle DevTools IPC Handler
ipcMain.on('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
});

// Capture Screenshot IPC Handler
ipcMain.handle('capture-screenshot', async () => {
  if (!mainWindow) return { success: false, error: 'No main window' };
  try {
    const img = await mainWindow.webContents.capturePage();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    const workspaceDir = appDataWorkspaceDir || path.join(userDataDir, 'workspace');
    const filepath = path.join(workspaceDir, filename);
    const fs = require('fs');
    if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(filepath, img.toPNG());
    return { success: true, path: filepath, filename, workspaceDir };
  } catch (err) {
    console.error('[Desktop] Screenshot capture failed:', err.message);
    return { success: false, error: err.message };
  }
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Desktop] Another instance of Supergence is already active. Terminating.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await ensureBackendRunning();
    createMainWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

// Cleanup on exit
app.on('before-quit', () => {
  app.isQuitting = true;
  saveWindowState();
  if (backendProcess) {
    try {
      backendProcess.kill('SIGTERM');
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
