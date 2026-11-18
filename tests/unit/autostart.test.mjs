import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  AutostartManager,
  defaultAutostartManager,
} from '../../server/services/autostartManager.js';

test('AutostartManager - Eligibility across platforms', () => {
  const win = new AutostartManager({ platform: 'win32' });
  const mac = new AutostartManager({ platform: 'darwin' });
  const linux = new AutostartManager({ platform: 'linux' });
  const unknown = new AutostartManager({ platform: 'sunos' });

  assert.equal(win.isEligible(), true);
  assert.equal(mac.isEligible(), true);
  assert.equal(linux.isEligible(), true);
  assert.equal(unknown.isEligible(), false);

  assert.equal(win.getPlatformInfo().platformLabel, 'Windows');
  assert.equal(mac.getPlatformInfo().platformLabel, 'macOS');
  assert.equal(linux.getPlatformInfo().platformLabel, 'Linux');
});

test('AutostartManager - Windows configuration and silent VBScript generation', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-autostart-win-'));
  const fakeStartup = path.join(tmpDir, 'Startup');
  fs.mkdirSync(fakeStartup, { recursive: true });

  class MockWindowsManager extends AutostartManager {
    getWindowsStartupFolder() {
      return fakeStartup;
    }
  }

  const legacyCommand = 'wscript.exe "C:\\Temp\\sis-autostart-pref-old\\Startup\\Supergence-Autostart.vbs"';
  let registeredCommand = legacyCommand;
  const manager = new MockWindowsManager({
    platform: 'win32',
    rootDir: 'C:\\Users\\Mock User\\Supergence Project',
    execPath: 'C:\\Program Files\\nodejs\\node.exe',
    runCommand(command) {
      if (command.startsWith('reg query')) return `    Supergence    REG_SZ    ${registeredCommand}`;
      assert.match(command, /^reg delete /);
      registeredCommand = '';
    },
    dataDir: path.join(tmpDir, 'data'),
  });

  // Migrate the stale Run value when installing the permanent launcher.
  let status = manager.getStatus();
  assert.equal(status.enabled, true);

  // Enable autostart
  const enableResult = manager.enable();
  assert.equal(enableResult.success, true);
  assert.equal(registeredCommand, '');

  const vbsPath = path.join(fakeStartup, 'Supergence-Autostart.vbs');
  assert.equal(fs.existsSync(vbsPath), true);

  const vbsContent = fs.readFileSync(vbsPath, 'utf8');
  assert.match(vbsContent, /WshShell\.Run/);
  assert.match(vbsContent, /--boot/);
  assert.match(vbsContent, /0,\s*False/);
  assert.match(vbsContent, /C:\\Program Files\\nodejs\\node\.exe/);
  assert.match(vbsContent, /Supergence Project/);

  // Status should now be enabled
  status = manager.getStatus();
  assert.equal(status.enabled, true);
  assert.equal(status.registeredPaths.includes(vbsPath), true);

  // Disable autostart
  const disableResult = manager.disable();
  assert.equal(disableResult.success, true);
  assert.equal(fs.existsSync(vbsPath), false);

  status = manager.getStatus();
  assert.equal(status.enabled, false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('AutostartManager - macOS LaunchAgent plist generation', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-autostart-mac-'));
  const fakeLaunchAgents = path.join(tmpDir, 'Library', 'LaunchAgents');

  class MockMacManager extends AutostartManager {
    getMacLaunchAgentsDir() {
      return fakeLaunchAgents;
    }
  }

  const manager = new MockMacManager({
    platform: 'darwin',
    rootDir: '/Users/testuser/Projects/Supergence Workspace',
    execPath: '/usr/local/bin/node',
    runCommand: () => '',
    dataDir: path.join(tmpDir, 'data'),
  });

  let status = manager.getStatus();
  assert.equal(status.enabled, false);

  const enableResult = manager.enable();
  assert.equal(enableResult.success, true);

  const plistPath = path.join(fakeLaunchAgents, 'com.supergence.autostart.plist');
  assert.equal(fs.existsSync(plistPath), true);

  const plistContent = fs.readFileSync(plistPath, 'utf8');
  assert.match(plistContent, /<string>com\.supergence\.autostart<\/string>/);
  assert.match(plistContent, /<string>--boot<\/string>/);
  assert.match(plistContent, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plistContent, /<string>\/usr\/local\/bin\/node<\/string>/);

  status = manager.getStatus();
  assert.equal(status.enabled, true);

  const disableResult = manager.disable();
  assert.equal(disableResult.success, true);
  assert.equal(fs.existsSync(plistPath), false);

  status = manager.getStatus();
  assert.equal(status.enabled, false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('AutostartManager - Linux XDG Desktop Autostart and systemd user service', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-autostart-linux-'));
  const fakeAutostart = path.join(tmpDir, '.config', 'autostart');
  const fakeSystemd = path.join(tmpDir, '.config', 'systemd', 'user');

  class MockLinuxManager extends AutostartManager {
    getLinuxAutostartDir() {
      return fakeAutostart;
    }
    getLinuxSystemdDir() {
      return fakeSystemd;
    }
  }

  const manager = new MockLinuxManager({
    platform: 'linux',
    rootDir: '/home/developer/supergence-ai',
    execPath: '/usr/bin/node',
    runCommand: () => '',
    dataDir: path.join(tmpDir, 'data'),
  });

  let status = manager.getStatus();
  assert.equal(status.enabled, false);

  const enableResult = manager.enable();
  assert.equal(enableResult.success, true);

  const desktopPath = path.join(fakeAutostart, 'supergence.desktop');
  const servicePath = path.join(fakeSystemd, 'supergence.service');

  assert.equal(fs.existsSync(desktopPath), true);
  assert.equal(fs.existsSync(servicePath), true);

  const desktopContent = fs.readFileSync(desktopPath, 'utf8');
  assert.match(desktopContent, /\[Desktop Entry\]/);
  assert.match(desktopContent, /Exec="\/usr\/bin\/node"/);
  assert.match(desktopContent, /--boot/);
  assert.match(desktopContent, /X-GNOME-Autostart-enabled=true/);

  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  assert.match(serviceContent, /\[Unit\]/);
  assert.match(serviceContent, /\[Service\]/);
  assert.match(serviceContent, /ExecStart="\/usr\/bin\/node"/);

  status = manager.getStatus();
  assert.equal(status.enabled, true);

  const disableResult = manager.disable();
  assert.equal(disableResult.success, true);
  assert.equal(fs.existsSync(desktopPath), false);
  assert.equal(fs.existsSync(servicePath), false);

  status = manager.getStatus();
  assert.equal(status.enabled, false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('AutostartManager - Respects explicit user disable preference', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-autostart-pref-'));
  const fakeStartup = path.join(tmpDir, 'Startup');

  class MockPrefManager extends AutostartManager {
    getWindowsStartupFolder() {
      return fakeStartup;
    }
  }

  const manager = new MockPrefManager({
    platform: 'win32',
    runCommand: () => '',
    dataDir: path.join(tmpDir, 'data'),
  });

  // User explicitly disables
  manager.saveConfig({ enabled: false });

  // Auto-enroll should respect explicit preference
  const enrollResult = manager.autoEnrollIfEligible();
  assert.equal(enrollResult.autoEnrolled, false);
  assert.equal(enrollResult.reason, 'explicitly-disabled');

  const status = manager.getStatus();
  assert.equal(status.enabled, false);

  // User explicitly toggles or enables
  manager.toggle();
  const statusAfterToggle = manager.getStatus();
  assert.equal(statusAfterToggle.enabled, true);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('AutostartManager - Live Host Environment Status', () => {
  const status = defaultAutostartManager.getStatus();
  assert.equal(status.eligible, true);
  assert.equal(typeof status.enabled, 'boolean');
  assert.equal(['win32', 'darwin', 'linux'].includes(status.platform), true);
  assert.ok(status.details.length > 0);
});
