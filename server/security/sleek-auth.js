import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionAuth } from './session-auth.js';
import { validateSleekId } from './input-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.join(ROOT_DIR, 'data');
const USERS_FILE = path.join(DATA_DIR, 'security', 'sleek-users.json');

export const SLEEK_ROLES = {
  creator: {
    id: 'creator',
    name: 'Sleek Creator',
    badge: '🎨 Creator',
    description: 'AI pair programming, visual UI design, and creative code exploration.',
    permissions: ['workspace.read', 'workspace.write', 'ai.chat', 'tools.generate_ui', 'tools.search'],
  },
  operator: {
    id: 'operator',
    name: 'Sleek Operator',
    badge: '⚡ Operator',
    description: 'Autonomous execution, command line orchestration, and bounded system controls.',
    permissions: [
      'workspace.read',
      'workspace.write',
      'ai.chat',
      'tools.generate_ui',
      'tools.search',
      'computer.control',
      'terminal.exec',
    ],
  },
  architect: {
    id: 'architect',
    name: 'Sleek Architect',
    badge: '🏛️ Architect',
    description: 'Full enterprise superintelligence access, security policy, and multi-agent systems.',
    permissions: [
      'workspace.read',
      'workspace.write',
      'ai.chat',
      'tools.generate_ui',
      'tools.search',
      'computer.control',
      'terminal.exec',
      'system.admin',
      'vault.manage',
    ],
  },
  observer: {
    id: 'observer',
    name: 'Sleek Observer',
    badge: '🔍 Observer',
    description: 'Auditing, deep research, and read-only telemetry analysis.',
    permissions: ['workspace.read', 'ai.chat', 'tools.search'],
  },
};

export class SleekAuthManager {
  constructor() {
    this.users = new Map();
    this.activeSessions = new Map(); // token -> session info
    this._loadUsers();
  }

  _hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    return { salt, hash };
  }

  _verifyPassword(password, salt, expectedHash) {
    const { hash } = this._hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  _loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf8');
        const list = JSON.parse(raw);
        for (const u of list) {
          this.users.set(u.sleekId.toLowerCase(), u);
        }
      }
    } catch (_) {}

    // Seed default verifiable Sleek identities if none exist
    if (this.users.size === 0) {
      this._registerSeedUser('slk-creator-01', 'Sleek Creator Alpha', 'sleek-pass-2026', 'creator');
      this._registerSeedUser('slk-operator-01', 'Sleek Operator Beta', 'sleek-pass-2026', 'operator');
      this._registerSeedUser('slk-architect-01', 'Sleek Architect Prime', 'sleek-pass-2026', 'architect');
      this._saveUsers();
    }
  }

  _registerSeedUser(sleekId, name, password, role) {
    const { salt, hash } = this._hashPassword(password);
    const user = {
      sleekId,
      name,
      salt,
      hash,
      role: SLEEK_ROLES[role] ? role : 'creator',
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };
    this.users.set(sleekId.toLowerCase(), user);
  }

  _saveUsers() {
    try {
      const dir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(Array.from(this.users.values()), null, 2),
        'utf8',
      );
    } catch (_) {}
  }

  authenticate(sleekId, passcode, requestedRole = null) {
    if (!validateSleekId(sleekId)) {
      throw new Error('Invalid Sleek ID format. Use 4-48 alphanumeric characters, dashes, or dots.');
    }
    if (!passcode || typeof passcode !== 'string' || passcode.length < 6) {
      throw new Error('Passcode must be at least 6 characters.');
    }

    const key = sleekId.trim().toLowerCase();
    let user = this.users.get(key);

    if (user) {
      // Verify password
      const ok = this._verifyPassword(passcode, user.salt, user.hash);
      if (!ok) {
        throw new Error('Authentication failed: Invalid credentials for Sleek ID.');
      }
      if (requestedRole && SLEEK_ROLES[requestedRole]) {
        user.role = requestedRole;
      }
    } else {
      // Auto-provision verified personal Sleek ID for user
      const role = requestedRole && SLEEK_ROLES[requestedRole] ? requestedRole : 'creator';
      const { salt, hash } = this._hashPassword(passcode);
      user = {
        sleekId: sleekId.trim(),
        name: `Sleek User (${sleekId.trim()})`,
        salt,
        hash,
        role,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      this.users.set(key, user);
      this._saveUsers();
    }

    user.lastLogin = new Date().toISOString();
    this._saveUsers();

    const roleInfo = SLEEK_ROLES[user.role] || SLEEK_ROLES.creator;
    const sessionToken = sessionAuth.secret;

    const sessionData = {
      sleekId: user.sleekId,
      name: user.name,
      role: user.role,
      roleName: roleInfo.name,
      badge: roleInfo.badge,
      permissions: roleInfo.permissions,
      authenticatedAt: new Date().toISOString(),
    };

    this.activeSessions.set(sessionToken, sessionData);

    return {
      sessionToken,
      user: sessionData,
    };
  }

  getSession(req) {
    if (!sessionAuth.authorized(req)) {
      return null;
    }
    // Return associated sleek session or default authenticated profile
    const active = this.activeSessions.get(sessionAuth.secret);
    if (active) return active;

    return {
      sleekId: 'slk-master',
      name: 'Supergence Master User',
      role: 'architect',
      roleName: SLEEK_ROLES.architect.name,
      badge: SLEEK_ROLES.architect.badge,
      permissions: SLEEK_ROLES.architect.permissions,
      authenticatedAt: new Date().toISOString(),
    };
  }

  logout(req) {
    this.activeSessions.delete(sessionAuth.secret);
    return true;
  }
}

export const sleekAuth = new SleekAuthManager();
export default sleekAuth;
