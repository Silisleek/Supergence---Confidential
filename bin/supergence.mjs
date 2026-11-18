#!/usr/bin/env node

/**
 * Supergence — Universal Self-Bootstrapping Launcher
 * Works across Windows, macOS, and Linux.
 * 
 * Auto-detects dependencies, initializes environment, launches the backend & frontend,
 * manages automated boot initialization, and opens the user's browser.
 */

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import dotenv from 'dotenv';
import autostartManager from '../server/services/autostartManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment configuration
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

// Handle CLI Autostart Management Flags
if (process.argv.includes('--status-autostart')) {
  const status = autostartManager.getStatus();
  console.log('\n[Supergence Autostart Status]');
  console.log(`  Eligible:     ${status.eligible}`);
  console.log(`  Platform:     ${status.platformLabel} (${status.platform})`);
  console.log(`  Method:       ${status.method}`);
  console.log(`  Enabled:      ${status.enabled ? 'YES' : 'NO'}`);
  console.log(`  Details:      ${status.details}`);
  if (status.registeredPaths?.length) {
    console.log('  Registered:');
    status.registeredPaths.forEach((p) => console.log(`    - ${p}`));
  }
  console.log('');
  process.exit(0);
}

if (process.argv.includes('--install-autostart') || process.argv.includes('--enable-autostart')) {
  const result = autostartManager.enable();
  if (result.success) {
    console.log(`\x1b[32m[AutoBoot] ${result.message}\x1b[0m`);
    if (result.paths?.length) {
      result.paths.forEach((p) => console.log(`  - ${p}`));
    }
    process.exit(0);
  } else {
    console.error(`\x1b[31m[AutoBoot ERROR] ${result.error}\x1b[0m`);
    process.exit(1);
  }
}

if (process.argv.includes('--uninstall-autostart') || process.argv.includes('--disable-autostart')) {
  const result = autostartManager.disable();
  if (result.success) {
    console.log(`\x1b[36m[AutoBoot] ${result.message}\x1b[0m`);
    process.exit(0);
  } else {
    console.error(`\x1b[31m[AutoBoot ERROR] ${result.error}\x1b[0m`);
    process.exit(1);
  }
}

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

const isBootLaunch = process.argv.includes('--boot');
if (isBootLaunch) {
  console.log('\x1b[36m[AutoBoot] Supergence launched via system boot sequence.\x1b[0m');
}
console.log(`[Supergence] Initializing on ${process.platform} (${process.arch})...`);

// 1. Verify Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 20) {
  console.error(`\x1b[31m[ERROR] Node.js version ${nodeVersion} detected. Supergence requires Node.js 20 or higher.\x1b[0m`);
  console.error('Please update Node.js from https://nodejs.org\n');
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
  } catch (_) {
    console.warn('[Supergence] Production build notice, falling back to live assets.');
  }
}

// 5. Cross-platform browser launcher
function openBrowser(url) {
  const startCommands = {
    darwin: `open "${url}"`,
    win32: `start "" "${url}"`,
    linux: `xdg-open "${url}"`,
  };
  const cmd = startCommands[process.platform] || `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (_) {
    // Non-blocking fallback
  }
}

// 6. Verify and maintain automatic startup on boot
const autoEnrollResult = autostartManager.autoEnrollIfEligible();
if (autoEnrollResult?.success) {
  console.log('\x1b[36m[AutoBoot] Supergence is registered to start automatically on system boot.\x1b[0m');
}

// 7. Check if an active instance is already running
async function checkExistingInstance(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 1200 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

const configuredPort = parseInt(process.env.PORT, 10) || 3009;
const candidatePorts = [configuredPort, 3009, 3008].filter((p, i, a) => a.indexOf(p) === i);

let activeRunningPort = null;
for (const p of candidatePorts) {
  if (await checkExistingInstance(p)) {
    activeRunningPort = p;
    break;
  }
}

if (activeRunningPort) {
  console.log(`\x1b[32m[Supergence] An active instance of Supergence is already online on port ${activeRunningPort}.\x1b[0m`);
  if (!process.argv.includes('--no-open') && !process.argv.includes('--headless')) {
    openBrowser(`http://127.0.0.1:${activeRunningPort}`);
  }
  process.exit(0);
}

// 8. Launch Backend & Frontend
console.log('\x1b[32m[Supergence] Starting local engine...\x1b[0m');

const serverScript = path.join(ROOT_DIR, 'server', 'index.js');
const serverProcess = spawn(process.execPath, [serverScript], {
  cwd: ROOT_DIR,
  stdio: ['inherit', 'pipe', 'inherit'],
  env: {
    ...process.env,
    SIS_ALLOW_VITE_ORIGIN: '1',
    SIS_DESKTOP_SESSION: '0',
  },
});

let browserOpened = false;

serverProcess.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(chunk);

  const match = text.match(/http:\/\/localhost:(\d+)/) || text.match(/http:\/\/127\.0\.0\.1:(\d+)/);
  const sessionMatch = text.match(/http:\/\/127\.0\.0\.1:\d+\/__session\?token=[^\s]+/);

  if ((match || sessionMatch) && !browserOpened) {
    browserOpened = true;
    const targetUrl = sessionMatch ? sessionMatch[0] : `http://127.0.0.1:${match[1]}`;

    console.log('\n\x1b[32m===============================================================\x1b[0m');
    console.log('  ✓ Supergence is live and ready!');
    console.log(`\x1b[36m  Local URL:\x1b[0m ${targetUrl}`);
    console.log('\x1b[33m  Press Ctrl+C at any time to shut down.\x1b[0m');
    console.log('\x1b[32m===============================================================\n\x1b[0m');

    if (!process.argv.includes('--no-open') && !process.argv.includes('--headless')) {
      setTimeout(() => openBrowser(targetUrl), 800);
    }
  }
});

function cleanup() {
  console.log('\n[Supergence] Shutting down gracefully...');
  serverProcess.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
