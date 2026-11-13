#!/usr/bin/env node

/**
 * Supergence — Universal Self-Bootstrapping Launcher
 * Works across Windows, macOS, and Linux.
 * 
 * Auto-detects dependencies, initializes environment, launches the backend & frontend,
 * and automatically opens the user's browser to loopback.
 */

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Print Banner
console.log(`
\x1b[35m  ____                                                       \x1b[0m
\x1b[35m / ___| _   _ _ __   ___ _ __ __ _  ___ _ __   ___ ___        \x1b[0m
\x1b[35m \\___ \\| | | | '_ \\ / _ \\ '__/ _\` |/ _ \\ '_ \\ / __/ _ \\   \x1b[0m
\x1b[35m  ___) | |_| | |_) |  __/ | | (_| |  __/ | | | (_|  __/       \x1b[0m
\x1b[35m |____/ \\__,_| .__/ \\___|_|  \\__, |\\___|_| |_|\\___\\___|   \x1b[0m
\x1b[35m             |_|             |___/                            \x1b[0m
\x1b[36m             Beyond Ordinary Minds · SIS 1.0\x1b[0m
`);

console.log(`[Supergence] Initializing on ${process.platform} (${process.arch})...`);

// 1. Verify Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 20) {
  console.error(`\x1b[31m[ERROR] Node.js version ${nodeVersion} detected. Supergence requires Node.js 20 or higher.\x1b[0m`);
  console.error(`Please update Node.js from https://nodejs.org\n`);
  process.exit(1);
}

// 2. Auto-initialize .env if missing
const envPath = path.join(ROOT_DIR, '.env');
const envExamplePath = path.join(ROOT_DIR, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('[Supergence] First run detected: creating .env from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
}

// 3. Auto-install dependencies if node_modules is missing
const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\x1b[33m[Supergence] node_modules not found. Auto-installing dependencies (this happens only once)...\x1b[0m');
  try {
    execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('\x1b[32m[Supergence] Dependencies installed successfully.\x1b[0m');
  } catch (err) {
    console.error(`\x1b[31m[ERROR] Failed to install dependencies: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

// 4. Ensure client build or dev readiness
const distPath = path.join(ROOT_DIR, 'dist');
if (!fs.existsSync(distPath)) {
  console.log('[Supergence] Preparing client assets...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (err) {
    console.warn('[Supergence] Production build notice, falling back to live assets.');
  }
}

// 5. Cross-platform browser launcher
function openBrowser(url) {
  const startCommands = {
    darwin: `open "${url}"`,
    win32: `start "" "${url}"`,
    linux: `xdg-open "${url}"`
  };
  const cmd = startCommands[process.platform] || `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (_) {
    // If auto-open fails, the user will still see the link printed in terminal
  }
}

// 5B. Cross-Platform Auto-Start on System Boot
function configureAutoBootOnFirstRun() {
  try {
    if (process.platform === 'win32') {
      const startupFolder = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
      if (fs.existsSync(startupFolder)) {
        const batPath = path.join(startupFolder, 'Supergence-Autostart.bat');
        if (!fs.existsSync(batPath)) {
          const content = `@echo off\r\ncd /d "${ROOT_DIR}"\r\nstart /b "" node "${path.join(ROOT_DIR, 'bin', 'supergence.mjs')}" --background\r\n`;
          fs.writeFileSync(batPath, content, 'utf8');
          console.log('\x1b[36m[AutoBoot] Registered Supergence to start automatically on Windows boot.\x1b[0m');
        }
      }
    } else if (process.platform === 'darwin') {
      const home = process.env.HOME || '';
      const launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
      const plistPath = path.join(launchAgentsDir, 'com.supergence.autostart.plist');
      if (fs.existsSync(launchAgentsDir) && !fs.existsSync(plistPath)) {
        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.supergence.autostart</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${path.join(ROOT_DIR, 'bin', 'supergence.mjs')}</string>
    <string>--background</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
</dict>
</plist>`;
        fs.writeFileSync(plistPath, plist, 'utf8');
        console.log('\x1b[36m[AutoBoot] Registered Supergence to start automatically on macOS boot.\x1b[0m');
      }
    } else if (process.platform === 'linux') {
      const home = process.env.HOME || '';
      const autostartDir = path.join(home, '.config', 'autostart');
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const desktopFilePath = path.join(autostartDir, 'supergence.desktop');
      if (!fs.existsSync(desktopFilePath)) {
        const desktopFile = `[Desktop Entry]
Type=Application
Exec=${process.execPath} ${path.join(ROOT_DIR, 'bin', 'supergence.mjs')} --background
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Supergence
Comment=Supergence Local Loopback Autonomous Superintelligence
`;
        fs.writeFileSync(desktopFilePath, desktopFile, 'utf8');
        console.log('\x1b[36m[AutoBoot] Registered Supergence to start automatically on Linux boot.\x1b[0m');
      }
    }
  } catch (_) {
    // Non-blocking
  }
}
configureAutoBootOnFirstRun();

// 6. Launch Backend & Frontend
console.log('\x1b[32m[Supergence] Starting local engine...\x1b[0m');

const serverScript = path.join(ROOT_DIR, 'server', 'index.js');
const serverProcess = spawn(process.execPath, [serverScript], {
  cwd: ROOT_DIR,
  stdio: ['inherit', 'pipe', 'inherit'],
  env: {
    ...process.env,
    SIS_ALLOW_VITE_ORIGIN: '1',
    SIS_DESKTOP_SESSION: '0'
  }
});

let browserOpened = false;

serverProcess.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(chunk);

  // Detect listening port or private session link
  const match = text.match(/http:\/\/localhost:(\d+)/) || text.match(/http:\/\/127\.0\.0\.1:(\d+)/);
  const sessionMatch = text.match(/http:\/\/127\.0\.0\.1:\d+\/__session\?token=[^\s]+/);

  if ((match || sessionMatch) && !browserOpened) {
    browserOpened = true;
    const targetUrl = sessionMatch ? sessionMatch[0] : `http://127.0.0.1:${match[1]}`;
    
    console.log('\n\x1b[32m===============================================================\x1b[0m');
    console.log(`\x1b[32m  ✓ Supergence is live and ready!\x1b[0m`);
    console.log(`\x1b[36m  Local URL:\x1b[0m ${targetUrl}`);
    console.log(`\x1b[33m  Press Ctrl+C at any time to shut down.\x1b[0m`);
    console.log('\x1b[32m===============================================================\n\x1b[0m');

    setTimeout(() => openBrowser(targetUrl), 800);
  }
});

function cleanup() {
  console.log('\n[Supergence] Shutting down gracefully...');
  serverProcess.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
