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
const { spawn, fork } = require('child_process');
const { randomBytes } = require('crypto');
const { isTrustedApplicationUrl } = require('./navigation-policy.cjs');

// Set Application User Model ID for Windows Taskbar & shell:appsfolder tile registration
app.name = 'Supergence';
app.setAppUserModelId('com.supergence.sis');

const appDataRoot = app.getPath('appData');
const defaultUserDataDir = process.env.SIS_USER_DATA_DIR
  ? path.resolve(process.env.SIS_USER_DATA_DIR)
  : path.join(appDataRoot, 'Supergence');
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
let startupWindow = null;
let tray = null;
let backendProcess = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PORT = 3008;
let activeBackendPort = PORT;
const sessionSecret = randomBytes(32).toString('hex');
const trustedUrl = (url) =>
  isTrustedApplicationUrl(url, { backendPort: activeBackendPort, development: false });

function trustedSender(event) {
  return Boolean(
    mainWindow &&
    !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame &&
    trustedUrl(event.senderFrame.url),
  );
}

function trustedIpcOn(channel, handler) {
  ipcMain.on(channel, (event, ...args) => {
    if (trustedSender(event)) handler(event, ...args);
  });
}

function trustedIpcHandle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trustedSender(event)) throw new Error('Untrusted desktop IPC sender.');
    return handler(event, ...args);
  });
}

// Initialize user AppData storage structure without importing repository data.
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

// Start a dedicated backend; do not trust an unrelated local service on the port.
async function ensureBackendRunning() {
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
    SIS_SESSION_SECRET: sessionSecret,
    SIS_DESKTOP_SESSION: '1',
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
    return false;
  }

  // Readiness is sent over the private child-process IPC channel after listen succeeds.
  const child = backendProcess;
  return await new Promise((resolve) => {
    const finish = (ok) => {
      child.removeListener('message', onMessage);
      child.removeListener('exit', onExit);
      child.removeListener('error', onError);
      resolve(ok);
    };
    const onMessage = (message) => {
      if (
        message?.type !== 'supergence-backend-ready' ||
        !Number.isInteger(message.port) ||
        message.port < 1 ||
        message.port > 65535
      )
        return;
      activeBackendPort = message.port;
      finish(true);
    };
    const onExit = () => finish(false);
    const onError = () => finish(false);
    child.on('message', onMessage);
    child.once('exit', onExit);
    child.once('error', onError);
  });
}

function createStartupWindow() {
  startupWindow = new BrowserWindow({
    width: 520,
    height: 260,
    resizable: false,
    title: 'Starting Supergence',
    backgroundColor: '#101513',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  startupWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  startupWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  startupWindow.on('closed', () => {
    startupWindow = null;
    if (!mainWindow && !app.isQuitting) app.quit();
  });
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Starting Supergence</title><style>body{margin:0;background:#101513;color:#e8eee9;font:16px system-ui;padding:38px}h1{font-size:24px;margin:0 0 16px}p{line-height:1.55;color:#b8c7bd}</style><h1>Starting Supergence</h1><p>Starting local services. This can take longer when your computer is busy or low on memory.</p><p>You can close this window to cancel startup.</p></html>`;
  void startupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
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

  // Never create a privileged desktop window for arbitrary content.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === 'http:' &&
        ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
        parsed.port === String(activeBackendPort) &&
        (parsed.pathname.startsWith('/workspace/') || parsed.pathname === '/guide.html')
      ) {
        const preview = new BrowserWindow({
          width: 1100,
          height: 800,
          parent: mainWindow,
          webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
        });
        preview.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        const restrictPreview = (event, nextUrl, _isInPlace, isMainFrame = true) => {
          if (!isMainFrame) return;
          try {
            const next = new URL(nextUrl);
            if (
              next.origin === parsed.origin &&
              (next.pathname.startsWith('/workspace/') || next.pathname === '/guide.html')
            )
              return;
          } catch (_) {}
          event.preventDefault();
        };
        preview.webContents.on('will-navigate', restrictPreview);
        preview.webContents.on('will-redirect', restrictPreview);
        void preview.loadURL(parsed.href);
      } else if (['http:', 'https:'].includes(parsed.protocol))
        void shell.openExternal(parsed.href);
    } catch (_) {}
    return { action: 'deny' };
  });
  const restrictNavigation = (event, url, _isInPlace, isMainFrame = true) => {
    if (isMainFrame && !trustedUrl(url)) event.preventDefault();
  };
  mainWindow.webContents.on('will-navigate', restrictNavigation);
  mainWindow.webContents.on('will-redirect', restrictNavigation);

  // Load URL
  loadApplication();
}

async function loadApplication() {
  console.log(`[Desktop] Loading Express Frontend: http://127.0.0.1:${activeBackendPort}`);
  mainWindow.loadURL(`http://127.0.0.1:${activeBackendPort}/__session?token=${sessionSecret}`);
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
trustedIpcOn('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

trustedIpcHandle('window-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

trustedIpcOn('window-close', () => {
  if (mainWindow) mainWindow.close();
});

trustedIpcHandle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// AppData Storage IPC Handlers
trustedIpcOn('open-appdata-folder', () => {
  shell.openPath(userDataDir);
});

trustedIpcHandle('get-appdata-path', () => {
  return userDataDir;
});

// Storage and Path Customization IPC Handlers
trustedIpcHandle('get-storage-paths', () => {
  return {
    userDataDir,
    dataDir: appDataDataDir,
    workspaceDir: appDataWorkspaceDir,
    installDir: app.getAppPath(),
  };
});

trustedIpcHandle('browse-directory', async (_event, defaultPath) => {
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

trustedIpcHandle('set-storage-paths', async (_event, newPaths) => {
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

trustedIpcOn('open-path', (_event, targetPath) => {
  if (targetPath) {
    shell.openPath(targetPath);
  } else {
    shell.openPath(userDataDir);
  }
});

// Native notification API keeps titles and filenames out of executable shell code.
trustedIpcHandle('show-notification', async (_event, { title, body, silent } = {}) => {
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
trustedIpcOn('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
});

// Capture Screenshot IPC Handler
trustedIpcHandle('capture-screenshot', async () => {
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
    createStartupWindow();
    if (!(await ensureBackendRunning())) {
      if (app.isQuitting) return;
      if (startupWindow && !startupWindow.isDestroyed()) startupWindow.close();
      dialog.showErrorBox(
        'Supergence could not start',
        'The local backend stopped before it was ready. Check the application logs and try again.',
      );
      app.quit();
      return;
    }
    if (app.isQuitting) return;
    createMainWindow();
    if (startupWindow && !startupWindow.isDestroyed()) startupWindow.close();
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
