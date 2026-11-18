import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, '../..');

export class AutostartManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir ? path.resolve(options.rootDir) : DEFAULT_ROOT_DIR;
    this.platform = options.platform || process.platform;
    this.execPath = options.execPath || process.execPath;
    this.dataDir =
      options.dataDir ||
      (process.env.SIS_DATA_DIR
        ? path.resolve(process.env.SIS_DATA_DIR)
        : path.join(this.rootDir, 'data'));
    this.runCommand = options.runCommand || execSync;
    this.configPath = path.join(this.dataDir, 'autostart-config.json');
  }

  isEligible() {
    return ['win32', 'darwin', 'linux'].includes(this.platform);
  }

  getPlatformInfo() {
    const labels = {
      win32: 'Windows',
      darwin: 'macOS',
      linux: 'Linux',
    };
    const methods = {
      win32: 'Windows Startup Folder & Registry',
      darwin: 'macOS LaunchAgent',
      linux: 'XDG Desktop Autostart & systemd user service',
    };
    return {
      eligible: this.isEligible(),
      platform: this.platform,
      platformLabel: labels[this.platform] || this.platform,
      method: methods[this.platform] || 'Unsupported',
    };
  }

  getLauncherScriptPath() {
    return path.join(this.rootDir, 'bin', 'supergence.mjs');
  }

  getWindowsStartupFolder() {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  }

  getWindowsVbsPath() {
    return path.join(this.getWindowsStartupFolder(), 'Supergence-Autostart.vbs');
  }

  getWindowsBatPath() {
    return path.join(this.getWindowsStartupFolder(), 'Supergence-Autostart.bat');
  }

  getMacLaunchAgentsDir() {
    return path.join(os.homedir(), 'Library', 'LaunchAgents');
  }

  getMacPlistPath() {
    return path.join(this.getMacLaunchAgentsDir(), 'com.supergence.autostart.plist');
  }

  getLinuxAutostartDir() {
    return path.join(os.homedir(), '.config', 'autostart');
  }

  getLinuxDesktopPath() {
    return path.join(this.getLinuxAutostartDir(), 'supergence.desktop');
  }

  getLinuxSystemdDir() {
    return path.join(os.homedir(), '.config', 'systemd', 'user');
  }

  getLinuxServicePath() {
    return path.join(this.getLinuxSystemdDir(), 'supergence.service');
  }

  readConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (_) {}
    return null;
  }

  saveConfig(data) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(
          {
            ...data,
            platform: this.platform,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf8',
      );
    } catch (_) {}
  }

  getWindowsRunCommand() {
    if (this.platform !== 'win32') return '';
    try {
      const output = this.runCommand(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Supergence"',
        { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' },
      );
      return output.match(/^\s*Supergence\s+REG_SZ\s+(.+)$/im)?.[1].trim() || '';
    } catch (_) {
      return '';
    }
  }

  removeWindowsRunEntry() {
    this.runCommand(
      'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Supergence" /f',
      { stdio: 'ignore' },
    );
  }

  getStatus() {
    const info = this.getPlatformInfo();
    if (!info.eligible) {
      return {
        ...info,
        enabled: false,
        registeredPaths: [],
        details: `Platform ${this.platform} is not eligible for automated system boot.`,
      };
    }

    const registeredPaths = [];
    let enabled = false;

    if (this.platform === 'win32') {
      const vbsPath = this.getWindowsVbsPath();
      const batPath = this.getWindowsBatPath();
      if (fs.existsSync(vbsPath)) {
        registeredPaths.push(vbsPath);
        enabled = true;
      }
      if (fs.existsSync(batPath)) {
        registeredPaths.push(batPath);
        enabled = true;
      }
      if (this.getWindowsRunCommand()) {
        registeredPaths.push('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run:Supergence');
        enabled = true;
      }
    } else if (this.platform === 'darwin') {
      const plistPath = this.getMacPlistPath();
      if (fs.existsSync(plistPath)) {
        registeredPaths.push(plistPath);
        enabled = true;
      }
    } else if (this.platform === 'linux') {
      const desktopPath = this.getLinuxDesktopPath();
      const servicePath = this.getLinuxServicePath();
      if (fs.existsSync(desktopPath)) {
        registeredPaths.push(desktopPath);
        enabled = true;
      }
      if (fs.existsSync(servicePath)) {
        registeredPaths.push(servicePath);
        enabled = true;
      }
    }

    const config = this.readConfig();
    const details = enabled
      ? `Active: Registered to start on ${info.platformLabel} boot via ${info.method}.`
      : `Inactive: Supergence is not currently scheduled to start on ${info.platformLabel} boot.`;

    return {
      ...info,
      enabled,
      configPreference: config ? config.enabled : null,
      registeredPaths,
      details,
    };
  }

  enable() {
    const info = this.getPlatformInfo();
    if (!info.eligible) {
      return {
        success: false,
        error: `Cannot enable autostart: platform ${this.platform} is not eligible.`,
      };
    }

    const launcherScript = this.getLauncherScriptPath();
    const createdPaths = [];

    try {
      if (this.platform === 'win32') {
        const startupFolder = this.getWindowsStartupFolder();
        if (!fs.existsSync(startupFolder)) {
          fs.mkdirSync(startupFolder, { recursive: true });
        }

        // Clean up any legacy or broken .bat file
        const batPath = this.getWindowsBatPath();
        if (fs.existsSync(batPath)) {
          try {
            fs.unlinkSync(batPath);
          } catch (_) {}
        }

        // VBScript launcher: runs completely silently with zero flashing black CMD boxes
        const vbsPath = this.getWindowsVbsPath();
        const safeNode = this.execPath.replace(/"/g, '""');
        const safeScript = launcherScript.replace(/"/g, '""');
        const vbsContent = [
          "' Supergence Autostart Launcher for Windows",
          "' Launches Supergence in background on user boot silently without console window popup",
          'On Error Resume Next',
          'Set WshShell = CreateObject("WScript.Shell")',
          `WshShell.Run """${safeNode}"" ""${safeScript}"" --boot", 0, False`,
          'Set WshShell = Nothing',
          '',
        ].join('\r\n');

        fs.writeFileSync(vbsPath, vbsContent, 'utf8');
        createdPaths.push(vbsPath);

        // Older releases registered this Startup script a second time under HKCU Run.
        if (/^wscript\.exe\s+"[^"]*\\Supergence-Autostart\.vbs"$/i.test(this.getWindowsRunCommand())) {
          this.removeWindowsRunEntry();
        }
      } else if (this.platform === 'darwin') {
        const launchAgentsDir = this.getMacLaunchAgentsDir();
        if (!fs.existsSync(launchAgentsDir)) {
          fs.mkdirSync(launchAgentsDir, { recursive: true });
        }

        const logDir = path.join(os.homedir(), 'Library', 'Logs', 'Supergence');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        const plistPath = this.getMacPlistPath();
        const stdoutLog = path.join(logDir, 'autostart.log');
        const stderrLog = path.join(logDir, 'autostart.err');

        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.supergence.autostart</string>
  <key>ProgramArguments</key>
  <array>
    <string>${this.execPath}</string>
    <string>${launcherScript}</string>
    <string>--boot</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${this.rootDir}</string>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>StandardOutPath</key>
  <string>${stdoutLog}</string>
  <key>StandardErrorPath</key>
  <string>${stderrLog}</string>
</dict>
</plist>
`;
        fs.writeFileSync(plistPath, plist, 'utf8');
        createdPaths.push(plistPath);

        try {
          this.runCommand(`launchctl load -w "${plistPath}"`, { stdio: 'ignore' });
        } catch (_) {}
      } else if (this.platform === 'linux') {
        const autostartDir = this.getLinuxAutostartDir();
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }

        const desktopPath = this.getLinuxDesktopPath();
        const desktopFile = [
          '[Desktop Entry]',
          'Type=Application',
          'Version=1.0',
          'Name=Supergence',
          'GenericName=AI Superintelligence Workspace',
          'Comment=Supergence Local AI Workspace',
          `Exec="${this.execPath}" "${launcherScript}" --boot`,
          `Path=${this.rootDir}`,
          'Terminal=false',
          'Hidden=false',
          'X-GNOME-Autostart-enabled=true',
          'Categories=Development;Utility;',
          '',
        ].join('\n');

        fs.writeFileSync(desktopPath, desktopFile, 'utf8');
        createdPaths.push(desktopPath);

        // Also configure systemd user service for headless or modern Linux setups
        try {
          const systemdDir = this.getLinuxSystemdDir();
          if (!fs.existsSync(systemdDir)) {
            fs.mkdirSync(systemdDir, { recursive: true });
          }
          const servicePath = this.getLinuxServicePath();
          const serviceContent = [
            '[Unit]',
            'Description=Supergence AI Autonomous Workspace',
            'After=network.target',
            '',
            '[Service]',
            'Type=simple',
            `WorkingDirectory=${this.rootDir}`,
            `ExecStart="${this.execPath}" "${launcherScript}" --boot`,
            'Restart=on-failure',
            'RestartSec=5',
            '',
            '[Install]',
            'WantedBy=default.target',
            '',
          ].join('\n');
          fs.writeFileSync(servicePath, serviceContent, 'utf8');
          createdPaths.push(servicePath);

          try {
            this.runCommand('systemctl --user daemon-reload', { stdio: 'ignore' });
            this.runCommand('systemctl --user enable supergence.service', { stdio: 'ignore' });
          } catch (_) {}
        } catch (_) {}
      }

      this.saveConfig({ enabled: true });
      return {
        success: true,
        message: `Registered Supergence to start automatically on ${info.platformLabel} boot.`,
        paths: createdPaths,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to configure autostart on ${info.platformLabel}: ${err.message}`,
      };
    }
  }

  disable() {
    const info = this.getPlatformInfo();
    if (!info.eligible) {
      return {
        success: false,
        error: `Cannot disable autostart: platform ${this.platform} is not eligible.`,
      };
    }

    try {
      if (this.platform === 'win32') {
        const vbsPath = this.getWindowsVbsPath();
        const batPath = this.getWindowsBatPath();
        if (fs.existsSync(vbsPath)) {
          try {
            fs.unlinkSync(vbsPath);
          } catch (_) {}
        }
        if (fs.existsSync(batPath)) {
          try {
            fs.unlinkSync(batPath);
          } catch (_) {}
        }
        if (this.getWindowsRunCommand()) this.removeWindowsRunEntry();
      } else if (this.platform === 'darwin') {
        const plistPath = this.getMacPlistPath();
        if (fs.existsSync(plistPath)) {
          try {
            this.runCommand(`launchctl unload -w "${plistPath}"`, { stdio: 'ignore' });
          } catch (_) {}
          try {
            fs.unlinkSync(plistPath);
          } catch (_) {}
        }
      } else if (this.platform === 'linux') {
        const desktopPath = this.getLinuxDesktopPath();
        if (fs.existsSync(desktopPath)) {
          try {
            fs.unlinkSync(desktopPath);
          } catch (_) {}
        }
        const servicePath = this.getLinuxServicePath();
        if (fs.existsSync(servicePath)) {
          try {
            this.runCommand('systemctl --user disable supergence.service', { stdio: 'ignore' });
          } catch (_) {}
          try {
            fs.unlinkSync(servicePath);
          } catch (_) {}
        }
      }

      this.saveConfig({ enabled: false });
      return {
        success: true,
        message: `Supergence autostart removed from ${info.platformLabel}.`,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to remove autostart on ${info.platformLabel}: ${err.message}`,
      };
    }
  }

  toggle() {
    const status = this.getStatus();
    if (status.enabled) {
      return this.disable();
    }
    return this.enable();
  }

  autoEnrollIfEligible() {
    if (!this.isEligible()) return { eligible: false };
    const config = this.readConfig();
    // If the user explicitly disabled autostart previously, respect their choice
    if (config && config.enabled === false) {
      return { autoEnrolled: false, reason: 'explicitly-disabled' };
    }
    // Otherwise, ensure autostart is active and paths are current
    return this.enable();
  }
}

export const defaultAutostartManager = new AutostartManager();
export default defaultAutostartManager;
