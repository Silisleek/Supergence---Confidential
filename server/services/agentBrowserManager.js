// SIS 1.0 — Agent Personal Browser Swarm Engine
// Gives every agent their own dedicated, isolated personal browser (Chromium/Playwright).
// Features:
// 1. Isolated BrowserContext & Page per agent (separate cookies, storage, history, tabs).
// 2. ChatGPT-Dots & Grokbot style Virtual Agent Cursor:
//    - Smooth gliding trajectory across the page.
//    - Agent avatar, badge, colored glowing orb, trailing particles.
//    - Animated click shockwaves / ripple rings, hover states, and typing indicators.
// 3. Real-time Live Screencast streaming (CDP + WebSocket) to the user's screen.
// 4. Interactive dual-mode: Autonomous AI web execution or Manual user takeover.
// 5. Intelligent autonomous internet exploration & search engine navigation.

import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { sessionAuth } from '../security/session-auth.js';
import { childEnvironment } from '../security/child-environment.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import enterpriseVault from '../security/vault.js';
import { randomUUID } from 'node:crypto';
import { assertBrowserEnabled } from '../security/browser-access.js';
import { runtimeAccess } from './runtimeAccess.js';
import { quickAI, DEFAULT_MODEL } from '../api/openrouter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = process.env.SIS_DATA_DIR
  ? path.resolve(process.env.SIS_DATA_DIR)
  : path.join(ROOT_DIR, 'data');
function profileDirectory(agentId, desktop = false) {
  if (
    typeof agentId !== 'string' ||
    !/^agent-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agentId) ||
    agentId.length > 100 ||
    agentId.endsWith('-desktop')
  )
    throw new Error('Invalid agent ID for browser profile.');
  const base = resolveWithinRoot(DATA_DIR, 'browser-profiles');
  const profile = resolveWithinRoot(base, desktop ? `${agentId}-desktop` : agentId);
  fs.mkdirSync(profile, { recursive: true });
  return resolveWithinRoot(base, profile);
}
const SCREENSHOTS_DIR = path.join(
  process.env.SIS_WORKSPACE_DIR
    ? path.resolve(process.env.SIS_WORKSPACE_DIR)
    : path.join(ROOT_DIR, 'workspace'),
  'browser-previews',
);

// Default Roster of Agents with distinct colors & avatars
const AGENT_ROSTER_DEFAULTS = [
  {
    id: 'agent-biology',
    name: 'Bio-SIS',
    role: 'Biology & Life Sciences Lead',
    avatar: '🧬',
    color: '#10B981', // Emerald
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-cs',
    name: 'Nova-Dev',
    role: 'Systems & Software Lead',
    avatar: '💻',
    color: '#0EA5E9', // Ocean Sky
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-mathematics',
    name: 'Astra-Logic',
    role: 'Mathematics & Logic Lead',
    avatar: '📐',
    color: '#F59E0B', // Amber
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-ee',
    name: 'Volt-Phys',
    role: 'Electrical & Physics Lead',
    avatar: '⚡',
    color: '#84CC16', // Lime
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-data-ai',
    name: 'Synapse-AI',
    role: 'Neural Architectures Lead',
    avatar: '🧠',
    color: '#8B5CF6', // Purple
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-cybernetics',
    name: 'Claw-Cybernetics',
    role: 'Autonomous OS & Robotics Lead',
    avatar: '🦾',
    color: '#14B8A6', // Teal
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-economics',
    name: 'Quant-Econ',
    role: 'Quantitative Economics Lead',
    avatar: '📊',
    color: '#EC4899', // Pink
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-risk',
    name: 'Aegis-Risk',
    role: 'Security & Governance Auditor',
    avatar: '🛡️',
    color: '#EF4444', // Red
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-knowledge',
    name: 'Alexandria',
    role: 'Knowledge Architecture Specialist',
    avatar: '📚',
    color: '#6366F1', // Indigo
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-triage',
    name: 'Sentinel-Triage',
    role: 'Workflow & Project Triage Lead',
    avatar: '📋',
    color: '#F97316', // Orange
    homeUrl: 'about:blank',
  },
  {
    id: 'agent-supergence',
    name: 'Chief of Staff',
    role: 'Supergence Master Orchestrator',
    avatar: '⚡',
    color: '#9F7CEF', // Lavender
    homeUrl: 'about:blank',
  },
];

export class AgentBrowserManager {
  constructor() {
    this.name = 'Agent Personal Browser Swarm';
    this.version = '1.0.0';
    this.browser = null;
    this.isLaunching = false;
    this.sessions = new Map(); // agentId -> Session Object
    this.launches = new Map();
    this.browserGeneration = 0;
    this.revocation = Promise.resolve();
    this.streamIntervals = new Map(); // agentId -> Interval for screencast / heartbeat
    this.activeSubscribers = new Set(); // WS clients actively watching streams
    this._broadcast = null;
    this._ensureDirectories();
    this.unsubscribeAccess = runtimeAccess.onChange((next, previous) => {
      if (previous.browser && !next.browser) this.revokeBrowserAccess();
    });
  }

  setBroadcast(fn) {
    this._broadcast = fn;
  }

  broadcast(type, data) {
    if (typeof this._broadcast === 'function') {
      try {
        this._broadcast(type, data);
      } catch (_) {}
    }
  }

  _ensureDirectories() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    } catch (e) {
      console.warn('[AgentBrowserManager] Directory error:', e.message);
    }
  }

  setServerPort(port) {
    if (port) this.serverPort = Number(port);
  }

  getHomeUrl(agentId) {
    const found = AGENT_ROSTER_DEFAULTS.find((a) => a.id === agentId);
    if (
      found &&
      found.homeUrl &&
      (found.homeUrl.startsWith('http') || found.homeUrl === 'about:blank')
    ) {
      return found.homeUrl;
    }
    return 'about:blank';
  }

  async launchNativeChrome(agentId = 'agent-cs', targetUrl = null, options = {}) {
    assertBrowserEnabled();
    const meta = this._getAgentMeta(agentId);
    const desktopProfileDir = profileDirectory(agentId, true);

    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const executablePath = chromePaths.find((p) => fs.existsSync(p));
    if (!executablePath) {
      throw new Error('Google Chrome executable not found on host');
    }

    const liveSession = this.sessions.get(agentId);
    const destUrl =
      targetUrl ||
      (liveSession && liveSession.currentUrl ? liveSession.currentUrl : this.getHomeUrl(agentId)) ||
      'https://www.google.com';
    const { spawn, exec } = await import('child_process');

    // Launch detached GUI process with independent stdio so it never hangs or blocks the server
    const usePersonalProfile = options.usePersonalProfile !== false;
    const chromeArgs = [];
    if (usePersonalProfile) {
      chromeArgs.push(`--user-data-dir=${desktopProfileDir}`, '--no-first-run');
    }
    chromeArgs.push('--new-window', '--start-maximized', destUrl);

    const child = spawn(executablePath, chromeArgs, {
      detached: true,
      stdio: 'ignore',
      env: childEnvironment(),
      windowsHide: false,
    });
    child.unref();

    // Bring Chrome window to front on Windows desktop
    try {
      setTimeout(() => {
        exec(
          `powershell -NoProfile -Command "$w = (Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -Last 1); if ($w) { (New-Object -ComObject WScript.Shell).AppActivate($w.Id) }"`,
          { env: childEnvironment() },
          () => {},
        );
      }, 700);
    } catch (_) {}

    console.log(
      `[AgentBrowserManager] 🚀 Launched native desktop Chrome window for ${meta.name} (${agentId}) at ${destUrl}`,
    );
    this.broadcast('agent-browser-native-launched', {
      agentId,
      agentName: meta.name,
      url: destUrl,
      profileDir: desktopProfileDir,
      mode: 'native_gui',
    });

    return {
      success: true,
      agentId,
      agentName: meta.name,
      url: destUrl,
      profileDir: desktopProfileDir,
      mode: 'native_gui',
    };
  }

  // ─── Agent Metadata Lookup ───
  _getAgentMeta(agentId) {
    const found = AGENT_ROSTER_DEFAULTS.find((a) => a.id === agentId);
    if (found) {
      return {
        ...found,
        homeUrl: this.getHomeUrl(found.id),
      };
    }
    return {
      id: agentId,
      name: agentId.replace(/^agent-/, '').toUpperCase(),
      role: 'Specialist Agent Teammate',
      avatar: '🌐',
      color: '#38BDF8',
      homeUrl: this.getHomeUrl(agentId),
    };
  }

  // ─── Attach CDP Screencast to Active Tab ───
  async _attachCdpScreencast(session, tab) {
    if (!session || !tab || !tab.page || tab.page.isClosed()) return;
    if (tab.cdpSession) {
      try {
        await tab.cdpSession.send('Page.stopScreencast');
        await tab.cdpSession.detach();
      } catch (_) {}
      tab.cdpSession = null;
    }
    try {
      const cdp = await session.context.newCDPSession(tab.page);
      tab.cdpSession = cdp;
      session.cdpSession = cdp;
      cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
        try {
          if (session.activeTabId === tab.id) {
            session.lastScreenshot = `data:image/jpeg;base64,${data}`;
            session.lastScreenshotTime = Date.now();
            this.broadcast('agent-browser-frame', {
              agentId: session.agentId,
              frame: session.lastScreenshot,
              timestamp: session.lastScreenshotTime,
              tabId: tab.id,
              url: session.currentUrl,
              title: session.pageTitle,
            });
          }
          await cdp.send('Page.screencastFrameAck', { sessionId });
        } catch (_) {}
      });
      await cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 65,
        maxWidth: 1280,
        maxHeight: 800,
        everyNthFrame: 1,
      });
    } catch (e) {
      console.warn(
        `[AgentBrowserManager] CDP screencast setup notice for ${session.agentId} (tab: ${tab.id}):`,
        e.message,
      );
    }
  }

  // ─── Attach Page Lifecycle Listeners ───
  _attachPageListeners(session, tab) {
    if (!tab || !tab.page) return;

    tab.page.on('load', async () => {
      try {
        tab.url = tab.page.url();
        tab.title = await tab.page.title();
        if (session.activeTabId === tab.id) {
          session.isLoading = false;
          session.currentUrl = tab.url;
          session.pageTitle = tab.title;
          await this._injectCursorIfNeeded(session);
          await this._captureAndBroadcastFrame(session);
        }
        this.broadcast('agent-browser-tabs', {
          agentId: session.agentId,
          activeTabId: session.activeTabId,
          tabs: this.getTabs(session.agentId),
        });
      } catch (_) {}
    });

    tab.page.on('domcontentloaded', async () => {
      try {
        tab.url = tab.page.url();
        tab.title = await tab.page.title();
        if (session.activeTabId === tab.id) {
          session.currentUrl = tab.url;
          session.pageTitle = tab.title;
          await this._injectCursorIfNeeded(session);
        }
      } catch (_) {}
    });

    tab.page.on('close', () => {
      session.tabs = session.tabs.filter((t) => t.id !== tab.id);
      this.broadcast('agent-browser-tabs', {
        agentId: session.agentId,
        activeTabId: session.activeTabId,
        tabs: this.getTabs(session.agentId),
      });
    });
  }

  // ─── Session Management: Personal Dedicated Persistent Google Chrome Profile ───
  async getOrCreateSession(agentId) {
    assertBrowserEnabled();
    await this.revocation;
    assertBrowserEnabled();
    const existing = this.sessions.get(agentId);
    if (existing?.context && existing.page && !existing.page.isClosed()) return existing;
    if (this.launches.has(agentId)) return this.launches.get(agentId);
    const generation = this.browserGeneration;
    const launch = this.createSession(agentId, generation);
    this.launches.set(agentId, launch);
    try {
      return await launch;
    } finally {
      if (this.launches.get(agentId) === launch) this.launches.delete(agentId);
    }
  }

  async createSession(agentId, generation) {
    const checkAccess = () => {
      assertBrowserEnabled();
      if (generation !== this.browserGeneration)
        throw new Error('Browser access was revoked during launch.');
    };
    checkAccess();
    const agentProfileDir = profileDirectory(agentId);

    const meta = this._getAgentMeta(agentId);
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(
        os.homedir(),
        'AppData',
        'Local',
        'ms-playwright',
        'chromium-1155',
        'chrome-win',
        'chrome.exe',
      ),
      path.join(
        os.homedir(),
        'AppData',
        'Local',
        'ms-playwright',
        'chromium-1153',
        'chrome-win',
        'chrome.exe',
      ),
    ];
    const executablePath = chromePaths.find((p) => fs.existsSync(p));

    let context;
    try {
      context = await chromium.launchPersistentContext(agentProfileDir, {
        env: childEnvironment(),
        executablePath,
        channel: executablePath ? undefined : 'chrome',
        headless: true,
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        deviceScaleFactor: 1,
        locale: 'en-US',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-features=Translate',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1280,800',
        ],
      });
    } catch (launchErr) {
      throw new Error(`Unable to open the browser profile for ${agentId}: ${launchErr.message}`, {
        cause: launchErr,
      });
    }

    try {
      checkAccess();
      for (const host of ['127.0.0.1', 'localhost']) {
        await context.route(`http://${host}:${this.serverPort}/workspace/**`, (route) =>
          route.continue({
            headers: {
              ...route.request().headers(),
              authorization: `Bearer ${sessionAuth.secret}`,
            },
          }),
        );
      }
      const pages = context.pages();
      const initialPage = pages.length > 0 ? pages[0] : await context.newPage();

      // Context-wide stealth & anti-automation detection scripts
      await context.addInitScript(() => {
        try {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          window.navigator.chrome = {
            runtime: {},
            app: {},
            csi: () => {},
            loadTimes: () => {},
          };
          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
          });
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
          });
        } catch (_) {}
      });
      await context.addInitScript(this._generateCursorInjectionScript(meta));

      const tabId = 'tab-' + Math.random().toString(36).substring(2, 9);
      const startUrl = this.getHomeUrl(agentId);

      const initialTab = {
        id: tabId,
        title: `${meta.name}'s Chrome Home`,
        url: startUrl,
        page: initialPage,
        cdpSession: null,
        createdAt: Date.now(),
      };

      const session = {
        agentId,
        meta,
        context,
        page: initialPage,
        cdpSession: null,
        tabs: [initialTab],
        activeTabId: tabId,
        currentUrl: startUrl,
        pageTitle: `${meta.name}'s Chrome Home`,
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        cursor: {
          x: 640,
          y: 400,
          visible: true,
          action: 'idle',
          label: `${meta.name} ${meta.avatar}`,
          targetSelector: null,
          timestamp: Date.now(),
        },
        lastScreenshot: null,
        lastScreenshotTime: 0,
        activeTask: null,
        isExecuting: false,
        history: [],
      };

      this._attachPageListeners(session, initialTab);
      await this._attachCdpScreencast(session, initialTab);

      // Auto-track new tabs opened by links or scripts (e.g. target="_blank")
      context.on('page', async (newPage) => {
        try {
          if (session.tabs.some((t) => t.page === newPage)) return;
          const newTabId = 'tab-' + Math.random().toString(36).substring(2, 9);
          await newPage
            .addInitScript(() => {
              Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            })
            .catch(() => {});
          await newPage.addInitScript(this._generateCursorInjectionScript(meta)).catch(() => {});
          if (session.tabs.some((t) => t.page === newPage)) return;
          const newTabObj = {
            id: newTabId,
            title: 'New Tab',
            url: newPage.url(),
            page: newPage,
            cdpSession: null,
            createdAt: Date.now(),
          };
          this._attachPageListeners(session, newTabObj);
          session.tabs.push(newTabObj);
          await this.switchTab(agentId, newTabId);
        } catch (_) {}
      });

      checkAccess();
      this.sessions.set(agentId, session);

      // Initial navigation to agent's default home tab if non-blank
      if (startUrl && startUrl !== 'about:blank') {
        this.navigate(agentId, startUrl).catch((e) => {
          console.warn(`[AgentBrowserManager] Initial home nav notice for ${agentId}:`, e.message);
        });
      }

      return session;
    } catch (error) {
      await context.close().catch(() => {});
      throw error;
    }
  }

  // ─── Multi-Tab Operations ───
  getTabs(agentId) {
    const session = this.sessions.get(agentId);
    if (!session || !session.tabs || session.tabs.length === 0) {
      const meta = this._getAgentMeta(agentId);
      const homeUrl = this.getHomeUrl(agentId);
      return [
        {
          id: 'tab-default',
          title: `${meta.name || 'Agent'} Home`,
          url: homeUrl,
          isActive: true,
          createdAt: Date.now(),
        },
      ];
    }
    return session.tabs.map((t) => ({
      id: t.id,
      title: t.title || 'Tab',
      url: t.url || 'about:blank',
      isActive: t.id === session.activeTabId,
      createdAt: t.createdAt,
    }));
  }

  async openNewTab(agentId, initialUrl = null) {
    const session = await this.getOrCreateSession(agentId);
    const targetUrl = initialUrl || this.getHomeUrl(agentId);
    const tabId = 'tab-' + Math.random().toString(36).substring(2, 9);

    const newPage = await session.context.newPage();

    // Prevent webdriver
    await newPage
      .addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      })
      .catch(() => {});
    await newPage.addInitScript(this._generateCursorInjectionScript(session.meta)).catch(() => {});

    // Deduplicate if context.on('page') already registered it
    let existingTab = session.tabs.find((t) => t.page === newPage);
    let activeTabId = tabId;
    if (existingTab) {
      existingTab.url = targetUrl;
      activeTabId = existingTab.id;
    } else {
      const newTab = {
        id: tabId,
        title: 'New Tab',
        url: targetUrl,
        page: newPage,
        cdpSession: null,
        createdAt: Date.now(),
      };
      this._attachPageListeners(session, newTab);
      session.tabs.push(newTab);
    }

    // Switch to new tab and navigate
    await this.switchTab(agentId, activeTabId);
    const navigation = await this.navigate(agentId, targetUrl, { tabId: activeTabId });

    const tabs = this.getTabs(agentId);
    this.broadcast('agent-browser-tabs', { agentId, activeTabId: session.activeTabId, tabs });

    return {
      success: navigation.success,
      agentId,
      tabId: activeTabId,
      url: navigation.url,
      title: navigation.title,
      ...(navigation.error ? { error: navigation.error } : {}),
      tabs,
    };
  }

  async switchTab(agentId, tabId) {
    const session = await this.getOrCreateSession(agentId);
    const targetTab = session.tabs.find((t) => t.id === tabId);
    if (!targetTab) return { success: false, error: 'Tab not found' };

    // Stop screencast on previous tab
    const oldTab = session.tabs.find((t) => t.id === session.activeTabId);
    if (oldTab && oldTab.cdpSession && oldTab.id !== tabId) {
      try {
        await oldTab.cdpSession.send('Page.stopScreencast');
      } catch (_) {}
    }

    session.activeTabId = tabId;

    // Resilient page restoration if null or closed
    if (!targetTab.page || targetTab.page.isClosed()) {
      try {
        targetTab.page = await session.context.newPage();
        this._attachPageListeners(session, targetTab);
        if (targetTab.url && targetTab.url !== 'about:blank') {
          await targetTab.page
            .goto(targetTab.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
            .catch(() => {});
        }
      } catch (pe) {
        console.warn(`[AgentBrowserManager] Page recreation notice for tab ${tabId}:`, pe.message);
      }
    }

    if (targetTab.page && !targetTab.page.isClosed()) {
      session.page = targetTab.page;
      try {
        session.currentUrl = targetTab.page.url();
      } catch (_) {
        session.currentUrl = targetTab.url;
      }
      try {
        session.pageTitle = await targetTab.page.title();
      } catch (_) {
        session.pageTitle = targetTab.title;
      }

      // Bring tab to front
      try {
        await targetTab.page.bringToFront();
      } catch (_) {}

      // Attach screencast on active tab
      await this._attachCdpScreencast(session, targetTab);
      await this._injectCursorIfNeeded(session);
      await this._captureAndBroadcastFrame(session);
    }

    const tabs = this.getTabs(agentId);
    this.broadcast('agent-browser-tabs', { agentId, activeTabId: tabId, tabs });
    this.broadcast('agent-browser-state', {
      agentId,
      status: 'READY',
      url: session.currentUrl,
      title: session.pageTitle,
      activeTabId: tabId,
      tabs,
    });

    return {
      success: true,
      agentId,
      tabId,
      title: session.pageTitle,
      url: session.currentUrl,
      tabs,
    };
  }

  async closeTab(agentId, tabId) {
    const session = await this.getOrCreateSession(agentId);
    const tabIndex = session.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return { success: false, error: 'Tab not found' };

    const tabToClose = session.tabs[tabIndex];

    // If closing only remaining tab, reset it to home instead of leaving empty context
    if (session.tabs.length <= 1) {
      const homeUrl = this.getHomeUrl(agentId);
      await this.navigate(agentId, homeUrl);
      return {
        success: true,
        agentId,
        tabId,
        message: 'Reset last tab to home',
        tabs: this.getTabs(agentId),
      };
    }

    // If active tab being closed, switch to neighbor
    if (session.activeTabId === tabId) {
      const nextTab = session.tabs[tabIndex + 1] || session.tabs[tabIndex - 1];
      if (nextTab) {
        await this.switchTab(agentId, nextTab.id);
      }
    }

    // Detach and close page
    if (tabToClose.cdpSession) {
      try {
        await tabToClose.cdpSession.send('Page.stopScreencast');
        await tabToClose.cdpSession.detach();
      } catch (_) {}
    }
    try {
      await tabToClose.page.close();
    } catch (_) {}

    session.tabs = session.tabs.filter((t) => t.id !== tabId);

    const tabs = this.getTabs(agentId);
    this.broadcast('agent-browser-tabs', { agentId, activeTabId: session.activeTabId, tabs });

    return { success: true, agentId, closedTabId: tabId, tabs };
  }

  // ─── Virtual Cursor Injection (ChatGPT Dots / Grokbot Style) ───
  _generateCursorInjectionScript(meta) {
    return `
      (function() {
        if (window.__sisAgentCursorInjected) return;
        window.__sisAgentCursorInjected = true;

        const cursorContainer = document.createElement('div');
        cursorContainer.id = 'sis-agent-virtual-cursor';
        cursorContainer.style.cssText = [
          'position: fixed',
          'top: 0',
          'left: 0',
          'width: 24px',
          'height: 24px',
          'border-radius: 50%',
          'background: radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${meta.color} 60%, rgba(0,0,0,0.6) 100%)',
          'border: 2px solid #FFFFFF',
          'box-shadow: 0 0 18px ${meta.color}, 0 0 35px ${meta.color}88, 0 4px 15px rgba(0,0,0,0.6)',
          'pointer-events: none',
          'z-index: 2147483647',
          'transform: translate(-50%, -50%)',
          'transition: transform 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
          'display: flex',
          'align-items: center',
          'justify-content: center'
        ].join(';');

        // Center dot inner pupil
        const innerPupil = document.createElement('div');
        innerPupil.style.cssText = 'width:6px; height:6px; border-radius:50%; background:#FFFFFF; pointer-events:none;';
        cursorContainer.appendChild(innerPupil);

        // Agent Name / Status Tag Badge
        const badge = document.createElement('div');
        badge.id = 'sis-agent-cursor-badge';
        badge.textContent = '${meta.name} ${meta.avatar}';
        badge.style.cssText = [
          'position: absolute',
          'left: 28px',
          'top: -3px',
          'background: rgba(10, 15, 24, 0.92)',
          'backdrop-filter: blur(8px)',
          'color: #F4F0E0',
          'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          'font-size: 11px',
          'font-weight: 700',
          'padding: 3px 10px',
          'border-radius: 20px',
          'border: 1px solid ${meta.color}',
          'box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 10px ${meta.color}44',
          'white-space: nowrap',
          'pointer-events: none',
          'transition: all 0.15s ease'
        ].join(';');
        cursorContainer.appendChild(badge);

        // Click Shockwave Ripple Ring
        const ripple = document.createElement('div');
        ripple.id = 'sis-agent-cursor-ripple';
        ripple.style.cssText = [
          'position: absolute',
          'width: 100%',
          'height: 100%',
          'border-radius: 50%',
          'border: 2px solid ${meta.color}',
          'box-shadow: 0 0 12px ${meta.color}',
          'pointer-events: none',
          'opacity: 0',
          'transform: scale(1)'
        ].join(';');
        cursorContainer.appendChild(ripple);

        function mountCursor() {
          if (!document.body) {
            window.requestAnimationFrame(mountCursor);
            return;
          }
          if (!document.getElementById('sis-agent-virtual-cursor')) {
            document.body.appendChild(cursorContainer);
          }
        }
        mountCursor();

        window.__updateAgentCursor = function(x, y, action, label) {
          mountCursor();
          cursorContainer.style.left = x + 'px';
          cursorContainer.style.top = y + 'px';
          if (label) badge.textContent = label;

          if (action === 'click') {
            ripple.style.borderColor = '${meta.color}';
            ripple.style.boxShadow = '0 0 14px ${meta.color}';
            ripple.animate([
              { transform: 'scale(1)', opacity: 1 },
              { transform: 'scale(3.4)', opacity: 0 }
            ], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
          } else if (action === 'right-click') {
            // Golden / Amber context menu shockwave
            ripple.style.borderColor = '#F59E0B';
            ripple.style.boxShadow = '0 0 16px #F59E0B';
            ripple.animate([
              { transform: 'scale(1)', opacity: 1, borderColor: '#F59E0B' },
              { transform: 'scale(3.6)', opacity: 0, borderColor: '#F59E0B' }
            ], { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
            badge.style.borderColor = '#F59E0B';
            setTimeout(() => { badge.style.borderColor = '${meta.color}'; }, 600);
          } else if (action === 'dblclick') {
            // Twin rapid violet shockwaves
            ripple.style.borderColor = '#A855F7';
            ripple.style.boxShadow = '0 0 18px #A855F7';
            ripple.animate([
              { transform: 'scale(1)', opacity: 1 },
              { transform: 'scale(2.5)', opacity: 0.4 },
              { transform: 'scale(4.0)', opacity: 0 }
            ], { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
          } else if (action === 'hover') {
            badge.style.transform = 'scale(1.08)';
            setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
          } else if (action === 'typing' || action === 'key') {
            cursorContainer.animate([
              { transform: 'translate(-50%, -50%) scale(1)' },
              { transform: 'translate(-50%, -50%) scale(1.22)' },
              { transform: 'translate(-50%, -50%) scale(1)' }
            ], { duration: 240, easing: 'ease-in-out' });
          }
        };
      })();
    `;
  }

  async _injectCursorIfNeeded(session) {
    try {
      const hasCursor = await session.page.evaluate(() => !!window.__updateAgentCursor);
      if (!hasCursor) {
        await session.page.evaluate(this._generateCursorInjectionScript(session.meta));
      }
      await session.page.evaluate(({ x, y, action, label }) => {
        if (window.__updateAgentCursor) window.__updateAgentCursor(x, y, action, label);
      }, session.cursor);
    } catch (_) {}
  }

  // ─── Smooth Cursor Glide Movement ───
  async glideCursor(agentId, targetX, targetY, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    const steps = options.steps || 18;
    const durationMs = options.durationMs || 320;
    const action = options.action || 'moving';
    const label = options.label || `${session.meta.name} ${session.meta.avatar}`;

    const startX = session.cursor.x;
    const startY = session.cursor.y;
    const stepDelay = Math.max(10, Math.floor(durationMs / steps));

    for (let i = 1; i <= steps; i++) {
      // Cubic easing for natural organic mouse motion
      const t = i / steps;
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const curX = Math.round(startX + (targetX - startX) * easeT);
      const curY = Math.round(startY + (targetY - startY) * easeT);

      session.cursor.x = curX;
      session.cursor.y = curY;
      session.cursor.action = action;
      session.cursor.label = label;
      session.cursor.timestamp = Date.now();

      // Update Playwright native mouse
      try {
        await session.page.mouse.move(curX, curY);
        await session.page.evaluate(
          ({ x, y, act, lbl }) => {
            if (window.__updateAgentCursor) window.__updateAgentCursor(x, y, act, lbl);
          },
          { x: curX, y: curY, act: action, lbl: label },
        );
      } catch (_) {}

      // Broadcast cursor updates in real time to WebSocket clients
      this.broadcast('agent-browser-cursor', {
        agentId,
        x: curX,
        y: curY,
        action,
        label,
        timestamp: session.cursor.timestamp,
      });

      await new Promise((r) => setTimeout(r, stepDelay));
    }
  }

  // ─── Navigation & URL Handling ───
  async navigate(agentId, targetUrl, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    const tab = session.tabs.find((item) => item.id === (options.tabId || session.activeTabId));
    const page = tab?.page || session.page;
    const isActive = () => session.page === page && session.activeTabId === tab?.id;
    if (isActive()) session.isLoading = true;

    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        // Search query
        cleanUrl = `https://duckduckgo.com/?q=${encodeURIComponent(cleanUrl)}`;
      }
    }

    if (isActive())
      this.broadcast('agent-browser-state', {
        agentId,
        status: 'NAVIGATING',
        url: cleanUrl,
        title: 'Loading...',
        timestamp: Date.now(),
      });

    try {
      await page.goto(cleanUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 35000,
      });

      const pageUrl = page.url();
      const pageTitle = await page.title();
      if (tab) {
        tab.url = pageUrl;
        tab.title = pageTitle;
      }
      if (isActive()) {
        session.currentUrl = pageUrl;
        session.pageTitle = pageTitle;
        session.isLoading = false;
      }
      session.history.unshift({
        url: pageUrl,
        title: pageTitle,
        time: new Date().toISOString(),
      });
      if (session.history.length > 50) session.history.pop();

      // Keep active tab state synchronized
      this.broadcast('agent-browser-tabs', {
        agentId,
        activeTabId: session.activeTabId,
        tabs: this.getTabs(agentId),
      });

      if (isActive()) {
        await this._injectCursorIfNeeded(session);
        await this._captureAndBroadcastFrame(session);
      }

      if (isActive())
        this.broadcast('agent-browser-state', {
          agentId,
          status: 'READY',
          url: pageUrl,
          title: pageTitle,
          activeTabId: session.activeTabId,
          tabs: this.getTabs(agentId),
          timestamp: Date.now(),
        });

      return {
        success: true,
        agentId,
        url: pageUrl,
        title: pageTitle,
      };
    } catch (err) {
      if (isActive()) session.isLoading = false;
      console.warn(`[AgentBrowserManager] Navigation error on ${cleanUrl}:`, err.message);
      if (isActive())
        this.broadcast('agent-browser-state', {
          agentId,
          status: 'ERROR',
          error: err.message,
          url: session.currentUrl,
          title: session.pageTitle,
          timestamp: Date.now(),
        });
      return {
        success: false,
        agentId,
        error: err.message,
        url: session.currentUrl,
      };
    }
  }

  // ─── Click & Interactive Actions ───
  async click(agentId, target, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    let clickX;
    let clickY;
    let label = options.label || `${session.meta.name} [Clicked Element]`;

    if (
      target &&
      typeof target === 'object' &&
      Number.isFinite(target.x) &&
      Number.isFinite(target.y)
    ) {
      clickX = target.x;
      clickY = target.y;
    } else if (typeof target === 'string') {
      try {
        const box = await session.page.locator(target).first().boundingBox({ timeout: 5000 });
        if (box) {
          clickX = Math.round(box.x + box.width / 2);
          clickY = Math.round(box.y + box.height / 2);
        } else {
          return {
            success: false,
            agentId,
            error: 'The requested element is not visible. Inspect the page again.',
          };
        }
      } catch (e) {
        return {
          success: false,
          agentId,
          error: 'The requested selector was not found. Inspect the page again.',
        };
      }
    } else {
      return {
        success: false,
        agentId,
        error: 'Provide a CSS selector or finite x/y coordinates.',
      };
    }

    // 1. Glide cursor to target
    await this.glideCursor(agentId, clickX, clickY, {
      steps: 16,
      durationMs: 300,
      action: 'moving',
      label,
    });

    // 2. Pulse click shockwave and trigger DOM click
    session.cursor.action = 'click';
    session.cursor.label = label;
    try {
      await session.page.evaluate(
        ({ x, y, lbl }) => {
          if (window.__updateAgentCursor) window.__updateAgentCursor(x, y, 'click', lbl);
        },
        { x: clickX, y: clickY, lbl: label },
      );
      await session.page.mouse.click(clickX, clickY);
    } catch (e) {
      return { success: false, agentId, error: 'The browser click could not be executed.' };
    }

    this.broadcast('agent-browser-cursor', {
      agentId,
      x: clickX,
      y: clickY,
      action: 'click',
      label,
      timestamp: Date.now(),
    });

    // Wait short delay for possible DOM or navigation response
    await new Promise((r) => setTimeout(r, 450));
    try {
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (_) {}

    await this._captureAndBroadcastFrame(session);
    return { success: true, agentId, clickX, clickY, url: session.currentUrl };
  }

  // ─── Hover Action ───
  async hover(agentId, target, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    let hoverX = 0;
    let hoverY = 0;
    let label = options.label || `${session.meta.name} [Hovering]`;

    if (typeof target === 'object' && target.x !== undefined && target.y !== undefined) {
      hoverX = target.x;
      hoverY = target.y;
    } else if (typeof target === 'string') {
      try {
        const box = await session.page.locator(target).first().boundingBox({ timeout: 5000 });
        if (box) {
          hoverX = Math.round(box.x + box.width / 2);
          hoverY = Math.round(box.y + box.height / 2);
        }
      } catch (_) {}
    }

    await this.glideCursor(agentId, hoverX, hoverY, {
      steps: 14,
      durationMs: 260,
      action: 'hover',
      label,
    });

    return { success: true, agentId, hoverX, hoverY };
  }

  // ─── Type Text Action ───
  async type(agentId, text, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    if (!text) return { success: false, error: 'Text required' };

    const selector = options.selector || null;
    if (selector) {
      const focused = await this.click(agentId, selector, {
        label: `${session.meta.name} [Focused Input]`,
      });
      if (!focused.success) return focused;
    }

    const label = `${session.meta.name} [Typing into input]`;
    session.cursor.action = 'typing';
    session.cursor.label = label;

    this.broadcast('agent-browser-cursor', {
      agentId,
      x: session.cursor.x,
      y: session.cursor.y,
      action: 'typing',
      label,
      timestamp: Date.now(),
    });

    try {
      await session.page.keyboard.type(text, { delay: 45 });
      if (options.pressEnter) {
        await new Promise((r) => setTimeout(r, 200));
        await session.page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (e) {
      return { success: false, agentId, error: 'Unable to type into the focused input.' };
    }

    try {
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (_) {}

    await this._captureAndBroadcastFrame(session);
    return { success: true, agentId, charactersTyped: text.length, url: session.currentUrl };
  }

  // ─── Scroll Action ───
  async scroll(agentId, deltaY = 350) {
    const session = await this.getOrCreateSession(agentId);
    const label = `${session.meta.name} [Scrolling ${deltaY > 0 ? 'Down' : 'Up'}]`;

    this.broadcast('agent-browser-cursor', {
      agentId,
      x: session.cursor.x || 640,
      y: session.cursor.y || 400,
      action: 'scroll',
      label,
      timestamp: Date.now(),
    });

    try {
      await session.page.mouse.move(session.cursor.x || 640, session.cursor.y || 400);
      await session.page.mouse.wheel(0, deltaY);
    } catch (_) {}

    try {
      await session.page.evaluate((dy) => {
        window.scrollBy({ top: dy, left: 0, behavior: 'auto' });
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop += dy;
        }
        if (document.documentElement) {
          document.documentElement.scrollTop += dy;
        }
        if (document.body) {
          document.body.scrollTop += dy;
        }
        const scrollers = Array.from(
          document.querySelectorAll(
            'main, [role="main"], article, .content, #content, #container, #root, #app, ytd-app, body, html, div, section',
          ),
        );
        for (const el of scrollers) {
          if (el && el.scrollHeight > el.clientHeight + 10) {
            const style = window.getComputedStyle(el);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
              el.scrollTop += dy;
            }
          }
        }
      }, deltaY);
    } catch (_) {}

    try {
      if (Math.abs(deltaY) >= 200) {
        await session.page.keyboard.press(deltaY > 0 ? 'PageDown' : 'PageUp');
      }
    } catch (_) {}

    await new Promise((r) => setTimeout(r, 120));
    await this._captureAndBroadcastFrame(session);
    return { success: true, agentId, deltaY };
  }

  // ─── Browser Chrome Nav Actions (Back, Forward, Reload) ───
  async navAction(agentId, action) {
    const session = await this.getOrCreateSession(agentId);
    session.isLoading = true;

    try {
      if (action === 'back') {
        await session.page.goBack({ timeout: 15000 });
      } else if (action === 'forward') {
        await session.page.goForward({ timeout: 15000 });
      } else if (action === 'reload') {
        await session.page.reload({ timeout: 15000 });
      } else if (action === 'home') {
        const homeUrl = this.getHomeUrl(agentId);
        await this.navigate(agentId, homeUrl);
      }

      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (e) {
      console.warn(`[AgentBrowserManager] Nav action notice (${action}):`, e.message);
    } finally {
      session.isLoading = false;
    }

    await this._captureAndBroadcastFrame(session);
    return {
      success: true,
      agentId,
      action,
      url: session.currentUrl,
      title: session.pageTitle,
    };
  }

  // ─── Right Click Action ───
  async rightClick(agentId, target, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    let clickX = 0;
    let clickY = 0;
    let label = options.label || `${session.meta.name} [Right Click]`;

    if (typeof target === 'object' && target.x !== undefined && target.y !== undefined) {
      clickX = target.x;
      clickY = target.y;
    } else if (typeof target === 'string') {
      try {
        const box = await session.page.locator(target).first().boundingBox({ timeout: 5000 });
        if (box) {
          clickX = Math.round(box.x + box.width / 2);
          clickY = Math.round(box.y + box.height / 2);
        } else {
          clickX = session.cursor.x;
          clickY = session.cursor.y;
        }
      } catch (e) {
        clickX = session.cursor.x;
        clickY = session.cursor.y;
      }
    }

    // 1. Glide cursor to target
    await this.glideCursor(agentId, clickX, clickY, {
      steps: 16,
      durationMs: 300,
      action: 'moving',
      label,
    });

    // 2. Pulse right-click golden shockwave and trigger native mouse right click
    session.cursor.action = 'right-click';
    session.cursor.label = label;
    try {
      await session.page.evaluate(
        ({ x, y, lbl }) => {
          if (window.__updateAgentCursor) window.__updateAgentCursor(x, y, 'right-click', lbl);
        },
        { x: clickX, y: clickY, lbl: label },
      );
      await session.page.mouse.click(clickX, clickY, { button: 'right' });
    } catch (e) {
      console.warn(`[AgentBrowserManager] Right-click execution notice:`, e.message);
    }

    this.broadcast('agent-browser-cursor', {
      agentId,
      x: clickX,
      y: clickY,
      action: 'right-click',
      label,
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 350));
    await this._captureAndBroadcastFrame(session);
    return {
      success: true,
      agentId,
      clickX,
      clickY,
      action: 'right-click',
      url: session.currentUrl,
    };
  }

  // ─── Double Click Action ───
  async doubleClick(agentId, target, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    let clickX = 0;
    let clickY = 0;
    let label = options.label || `${session.meta.name} [Double Click]`;

    if (typeof target === 'object' && target.x !== undefined && target.y !== undefined) {
      clickX = target.x;
      clickY = target.y;
    } else if (typeof target === 'string') {
      try {
        const box = await session.page.locator(target).first().boundingBox({ timeout: 5000 });
        if (box) {
          clickX = Math.round(box.x + box.width / 2);
          clickY = Math.round(box.y + box.height / 2);
        } else {
          clickX = session.cursor.x;
          clickY = session.cursor.y;
        }
      } catch (e) {
        clickX = session.cursor.x;
        clickY = session.cursor.y;
      }
    }

    // 1. Glide cursor to target
    await this.glideCursor(agentId, clickX, clickY, {
      steps: 16,
      durationMs: 300,
      action: 'moving',
      label,
    });

    // 2. Pulse double-click shockwaves and trigger native mouse dblclick
    session.cursor.action = 'dblclick';
    session.cursor.label = label;
    try {
      await session.page.evaluate(
        ({ x, y, lbl }) => {
          if (window.__updateAgentCursor) window.__updateAgentCursor(x, y, 'dblclick', lbl);
        },
        { x: clickX, y: clickY, lbl: label },
      );
      await session.page.mouse.dblclick(clickX, clickY);
    } catch (e) {
      console.warn(`[AgentBrowserManager] Double-click execution notice:`, e.message);
    }

    this.broadcast('agent-browser-cursor', {
      agentId,
      x: clickX,
      y: clickY,
      action: 'dblclick',
      label,
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 350));
    await this._captureAndBroadcastFrame(session);
    return { success: true, agentId, clickX, clickY, action: 'dblclick', url: session.currentUrl };
  }

  // ─── Keystroke & Modifier Key Press Action ───
  async pressKey(agentId, key, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    if (!key) return { success: false, error: 'Key string required' };

    const label = options.label || `${session.meta.name} [Key: ${key}]`;
    session.cursor.action = 'key';
    session.cursor.label = label;

    try {
      await session.page.evaluate(
        ({ x, y, lbl }) => {
          if (window.__updateAgentCursor) window.__updateAgentCursor(x, y, 'key', lbl);
        },
        { x: session.cursor.x, y: session.cursor.y, lbl: label },
      );
      await session.page.keyboard.press(key);
    } catch (e) {
      console.warn(`[AgentBrowserManager] Key press notice:`, e.message);
    }

    this.broadcast('agent-browser-cursor', {
      agentId,
      x: session.cursor.x,
      y: session.cursor.y,
      action: 'key',
      label,
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 200));
    try {
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (_) {}

    await this._captureAndBroadcastFrame(session);
    return { success: true, agentId, key, url: session.currentUrl };
  }

  // ─── Drag and Drop Action ───
  async dragAndDrop(agentId, start, end, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    const startX = Number(start?.x) || session.cursor.x;
    const startY = Number(start?.y) || session.cursor.y;
    const endX = Number(end?.x) || startX;
    const endY = Number(end?.y) || startY;
    const label =
      options.label || `${session.meta.name} [Dragging (${startX},${startY}) ➔ (${endX},${endY})]`;

    // 1. Move to start position
    await this.glideCursor(agentId, startX, startY, {
      steps: 12,
      durationMs: 250,
      action: 'moving',
    });

    // 2. Mouse down
    await session.page.mouse.down();

    // 3. Smooth glide to end position while holding down
    await this.glideCursor(agentId, endX, endY, {
      steps: 20,
      durationMs: 400,
      action: 'drag',
      label,
    });

    // 4. Mouse up
    await session.page.mouse.up();

    await new Promise((r) => setTimeout(r, 200));
    await this._captureAndBroadcastFrame(session);
    return { success: true, agentId, start: { x: startX, y: startY }, end: { x: endX, y: endY } };
  }

  // ─── Viewport Zoom Scaling ───
  async setZoom(agentId, factor = 1.0) {
    const session = await this.getOrCreateSession(agentId);
    const z = Math.min(2.0, Math.max(0.5, Number(factor) || 1.0));
    try {
      await session.page.evaluate((zoom) => {
        document.body.style.zoom = zoom;
      }, z);
      await this._captureAndBroadcastFrame(session);
      return { success: true, agentId, zoom: z };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ─── Automated Multi-Field Form Completion & Autofill ───
  async fillForm(agentId, fields = [], options = {}) {
    const session = await this.getOrCreateSession(agentId);
    const meta = session.meta;
    let fieldList = [];

    if (Array.isArray(fields)) {
      fieldList = fields;
    } else if (typeof fields === 'object' && fields !== null) {
      fieldList = Object.entries(fields).map(([k, v]) => ({ selector: k, value: v }));
    }
    if (!fieldList.length || fieldList.length > 60)
      return { success: false, error: 'Provide between 1 and 60 form fields.' };

    const filled = [];
    for (const field of fieldList) {
      const selector = field.selector || field.name || field.id || field.target;
      const value = String(field.value !== undefined ? field.value : '');
      const type = (field.type || 'text').toLowerCase();

      if (!selector) {
        filled.push({ status: 'FAILED', error: 'A field selector is required.' });
        continue;
      }

      try {
        const locator = session.page.locator(selector).first();
        const box = await locator.boundingBox({ timeout: 4000 }).catch(() => null);

        if (box) {
          const targetX = Math.round(box.x + box.width / 2);
          const targetY = Math.round(box.y + box.height / 2);
          await this.glideCursor(agentId, targetX, targetY, {
            steps: 12,
            durationMs: 200,
            action: 'moving',
            label: `${meta.name} [Focus ${selector}]`,
          });
        }

        if (type === 'select') {
          await locator.selectOption(value);
        } else if (type === 'checkbox' || type === 'radio') {
          if (value === 'true' || value === '1' || value === 'yes') {
            await locator.check();
          } else {
            await locator.uncheck();
          }
        } else {
          await locator.click({ timeout: 3000 });
          await locator.fill(value);
        }

        filled.push({
          selector,
          status: 'FILLED',
        });
        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        filled.push({
          selector,
          status: 'FAILED',
          error: 'Unable to fill this field. Inspect the current page and selector.',
        });
      }
    }

    let submitted = false;
    let submitError;
    if (options.submitSelector && filled.every((field) => field.status === 'FILLED')) {
      try {
        const result = await this.click(agentId, options.submitSelector, {
          label: `${meta.name} [Submit Form]`,
        });
        if (!result.success) throw new Error('Submit target unavailable.');
        submitted = true;
      } catch (_) {
        submitError = 'Unable to submit the form. Inspect the current page and submit selector.';
      }
    }

    session.currentUrl = session.page.url();
    await this._captureAndBroadcastFrame(session);
    return {
      success: filled.every((field) => field.status === 'FILLED') && !submitError,
      agentId,
      totalFields: fieldList.length,
      filledFields: filled.filter((f) => f.status === 'FILLED').length,
      fields: filled,
      submitted,
      ...(submitError ? { error: submitError } : {}),
      url: session.currentUrl,
    };
  }

  // ─── Persistent Cookie & Session Management ───
  async saveCookies(agentId, customFilepath = null) {
    const session = await this.getOrCreateSession(agentId);
    try {
      const agentProfileDir = profileDirectory(agentId);
      const filepath = resolveWithinRoot(agentProfileDir, customFilepath || 'cookies.enc.json');
      const cookies = await session.context.cookies();
      const envelope = enterpriseVault.encrypt(cookies, {
        persist: false,
        context: `browser-cookies:${agentId}`,
      });
      const temporary = `${filepath}.${randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporary, JSON.stringify({ version: 1, encrypted: true, envelope }), {
          flag: 'wx',
          mode: 0o600,
        });
        fs.renameSync(temporary, filepath);
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      }
      return { success: true, agentId, cookieCount: cookies.length, filepath };
    } catch (e) {
      return { success: false, agentId, error: e.message };
    }
  }

  async loadCookies(agentId, customFilepath = null) {
    const session = await this.getOrCreateSession(agentId);
    try {
      const agentProfileDir = profileDirectory(agentId);
      const encryptedPath = resolveWithinRoot(agentProfileDir, 'cookies.enc.json');
      const filepath = resolveWithinRoot(
        agentProfileDir,
        customFilepath || (fs.existsSync(encryptedPath) ? 'cookies.enc.json' : 'cookies.json'),
      );
      if (!fs.existsSync(filepath)) {
        return { success: false, agentId, error: `Cookie file not found at ${filepath}` };
      }
      const raw = fs.readFileSync(filepath, 'utf8');
      const payload = JSON.parse(raw);
      const legacyPlaintext = Array.isArray(payload);
      if (
        !legacyPlaintext &&
        (payload?.version !== 1 ||
          payload.encrypted !== true ||
          payload.envelope?.context !== `browser-cookies:${agentId}`)
      )
        throw new Error('Invalid encrypted cookie export.');
      const cookies = legacyPlaintext
        ? payload
        : enterpriseVault.decrypt(payload.envelope, { parseJSON: true });
      if (Array.isArray(cookies)) {
        await session.context.addCookies(cookies);
        return { success: true, agentId, cookieCount: cookies.length, filepath, legacyPlaintext };
      }
      return { success: false, agentId, error: 'Malformed cookie file array' };
    } catch (e) {
      return { success: false, agentId, error: e.message };
    }
  }

  // ─── Multimodal Vision Engine (Screen Perception & Grounding) ───
  async analyzeVision(agentId, options = {}) {
    const session = await this.getOrCreateSession(agentId);
    const meta = session.meta;

    // 1. Capture high-res screenshot
    let dataUrl = null;
    try {
      const buf = await session.page.screenshot({ type: 'jpeg', quality: 80 });
      dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
      session.lastScreenshot = dataUrl;
      session.lastScreenshotTime = Date.now();
    } catch (e) {
      console.warn(`[AgentBrowserManager] Vision screenshot capture notice:`, e.message);
    }

    // 2. Extract grounded layout, landmarks, OCR text, and interactive elements from DOM
    let pageAnalysis = {
      title: session.pageTitle,
      url: session.currentUrl,
      viewport: { width: 1280, height: 800 },
      headings: [],
      interactiveElements: [],
      bodySample: '',
    };

    try {
      pageAnalysis = await session.page.evaluate(() => {
        const elements = [];
        const selectors =
          'button, a, input, select, textarea, [role="button"], [role="link"], [role="searchbox"], [role="textbox"], [tabindex="0"]';
        const nodes = Array.from(document.querySelectorAll(selectors));

        for (const el of nodes) {
          const rect = el.getBoundingClientRect();
          if (
            rect.width > 4 &&
            rect.height > 4 &&
            rect.top >= 0 &&
            rect.top <= window.innerHeight &&
            rect.left >= 0 &&
            rect.left <= window.innerWidth
          ) {
            const rawText = (
              el.innerText ||
              el.value ||
              el.placeholder ||
              el.getAttribute('aria-label') ||
              el.title ||
              ''
            ).trim();
            if (rawText.length > 0 || el.tagName === 'INPUT') {
              elements.push({
                tag: el.tagName.toLowerCase(),
                text: rawText.slice(0, 70),
                type: el.type || null,
                placeholder: el.placeholder || null,
                ariaLabel: el.getAttribute('aria-label') || null,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                bbox: {
                  left: Math.round(rect.left),
                  top: Math.round(rect.top),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
              });
            }
          }
          if (elements.length >= 25) break;
        }

        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
          .map((h) => h.innerText.trim())
          .filter(Boolean)
          .slice(0, 8);

        const bodySample = document.body
          ? document.body.innerText.slice(0, 1500).replace(/\s+/g, ' ')
          : '';

        return {
          title: document.title || 'Untitled',
          url: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          headings,
          interactiveCount: nodes.length,
          interactiveElements: elements,
          bodySample,
        };
      });
    } catch (e) {
      console.warn(`[AgentBrowserManager] DOM analysis notice:`, e.message);
    }

    // 3. Multimodal vision reasoning
    const userQuery =
      options.prompt ||
      options.query ||
      `Analyze this webpage screen for agent ${meta.name} (${meta.role}). Explain what is visually on screen, identify key interactive targets (buttons, inputs, links) with their coordinates, and provide recommended next actions.`;

    const visionSystemPrompt = `You are an expert Autonomous Web Vision AI Copilot assisting agent ${meta.name} (${meta.role}).
You inspect webpage screenshots and DOM structure to perceive visual UI layout, OCR text, buttons, forms, and charts.
Always output valid JSON ONLY with this schema:
{
  "visualSummary": "Clear 2-sentence description of what is visually displayed on screen",
  "detectedSections": ["Main navigation bar", "Hero search input", "Content grid"],
  "interactiveTargets": [
    {"label": "Search Box", "tag": "input", "x": 420, "y": 150, "purpose": "Type queries"},
    {"label": "Submit Button", "tag": "button", "x": 580, "y": 150, "purpose": "Execute search"}
  ],
  "ocrHighlights": ["Key headlines or important text seen on page"],
  "suggestedActions": [
    {"action": "click", "x": 420, "y": 150, "reason": "Focus search input to begin investigation"}
  ]
}`;

    let parsedVision = null;
    if (dataUrl) {
      try {
        const visionCall = quickAI({
          systemPrompt: visionSystemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${userQuery}\n\nPage Title: "${pageAnalysis.title}"\nURL: ${pageAnalysis.url}\nDetected DOM Elements: ${JSON.stringify(pageAnalysis.interactiveElements.slice(0, 10))}`,
                },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          maxTokens: 900,
          temperature: 0.2,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Vision timeout')), 12000),
        );
        const aiResponse = await Promise.race([visionCall, timeoutPromise]);
        if (typeof aiResponse === 'string') {
          const match = aiResponse.match(/\{[\s\S]*\}/);
          if (match) parsedVision = JSON.parse(match[0]);
        }
      } catch (_) {}
    }

    if (!parsedVision) {
      // Fast fallback text reasoning grounded in real DOM
      try {
        const fallbackPrompt = `${userQuery}\n\nPage Title: "${pageAnalysis.title}"\nURL: ${pageAnalysis.url}\nHeadings: ${pageAnalysis.headings.join(' | ')}\nDOM Targets: ${JSON.stringify(pageAnalysis.interactiveElements.slice(0, 12))}\nText Sample: ${pageAnalysis.bodySample.slice(0, 600)}`;
        const fallbackCall = quickAI(visionSystemPrompt, fallbackPrompt, DEFAULT_MODEL, 750, 0.2);
        const fallbackTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fallback vision timeout')), 6000),
        );
        const fallbackAI = await Promise.race([fallbackCall, fallbackTimeout]);
        if (typeof fallbackAI === 'string') {
          const match = fallbackAI.match(/\{[\s\S]*\}/);
          if (match) parsedVision = JSON.parse(match[0]);
        }
      } catch (_) {}
    }

    if (!parsedVision) {
      parsedVision = {
        visualSummary: `Live webpage "${pageAnalysis.title}" loaded at ${pageAnalysis.url}. Layout displays ${pageAnalysis.headings.length} primary sections and ${pageAnalysis.interactiveElements.length} interactive targets.`,
        detectedSections: pageAnalysis.headings.slice(0, 4),
        interactiveTargets: pageAnalysis.interactiveElements.slice(0, 8).map((el) => ({
          label: el.text || el.placeholder || el.tag,
          tag: el.tag,
          x: el.x,
          y: el.y,
          purpose: `Click or interact with ${el.tag}`,
        })),
        ocrHighlights: pageAnalysis.headings,
        suggestedActions: pageAnalysis.interactiveElements[0]
          ? [
              {
                action: 'click',
                x: pageAnalysis.interactiveElements[0].x,
                y: pageAnalysis.interactiveElements[0].y,
                reason: `Interact with ${pageAnalysis.interactiveElements[0].text || pageAnalysis.interactiveElements[0].tag}`,
              },
            ]
          : [],
      };
    }

    const visionPayload = {
      agentId,
      agentName: meta.name,
      agentRole: meta.role,
      url: session.currentUrl,
      title: session.pageTitle,
      viewport: pageAnalysis.viewport,
      screenshot: dataUrl,
      ...parsedVision,
      interactiveElements: pageAnalysis.interactiveElements,
      timestamp: Date.now(),
    };

    session.lastVision = visionPayload;
    this.broadcast('agent-browser-vision', visionPayload);
    return { success: true, vision: visionPayload };
  }

  // ─── Manual User Takeover Interaction ───
  async handleUserInteraction(agentId, interaction = {}) {
    const session = await this.getOrCreateSession(agentId);
    const { type, x, y, text, key, startX, startY, endX, endY, factor, prompt } = interaction;

    if (type === 'click' && x !== undefined && y !== undefined) {
      return this.click(
        agentId,
        { x, y },
        { label: `User & ${session.meta.name} [Co-Browse Click]` },
      );
    } else if (type === 'right-click' && x !== undefined && y !== undefined) {
      return this.rightClick(
        agentId,
        { x, y },
        { label: `User & ${session.meta.name} [Co-Browse Right Click]` },
      );
    } else if (type === 'dblclick' && x !== undefined && y !== undefined) {
      return this.doubleClick(
        agentId,
        { x, y },
        { label: `User & ${session.meta.name} [Co-Browse Double Click]` },
      );
    } else if (type === 'drag') {
      return this.dragAndDrop(agentId, { x: startX, y: startY }, { x: endX, y: endY });
    } else if (type === 'hover' && x !== undefined && y !== undefined) {
      return this.hover(agentId, { x, y });
    } else if (type === 'type' && text) {
      return this.type(agentId, text);
    } else if (type === 'key' && key) {
      return this.pressKey(agentId, key);
    } else if (type === 'scroll') {
      const delta = interaction.deltaY || 300;
      return this.scroll(agentId, delta);
    } else if (type === 'zoom') {
      return this.setZoom(agentId, factor || 1.0);
    } else if (type === 'vision') {
      return this.analyzeVision(agentId, { prompt });
    }

    return { success: false, error: 'Unknown interaction type' };
  }

  // ─── Screen Capture & Broadcast ───
  async _captureAndBroadcastFrame(session) {
    try {
      const buf = await session.page.screenshot({
        type: 'jpeg',
        quality: 68,
      });
      const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
      session.lastScreenshot = dataUrl;
      session.lastScreenshotTime = Date.now();

      this.broadcast('agent-browser-frame', {
        agentId: session.agentId,
        frame: dataUrl,
        url: session.currentUrl,
        title: session.pageTitle,
        timestamp: session.lastScreenshotTime,
      });

      return dataUrl;
    } catch (e) {
      return null;
    }
  }

  // ─── Autonomous AI Internet Exploration Engine ───
  async runAutonomousTask(agentId, taskPrompt) {
    return await this.executeBrowserTask(agentId, taskPrompt);
  }

  // ─── Semantic Browser Goal & Intent Planning (Universal Zero Hardcoding) ───
  _parseBrowserGoal(taskPrompt, context = {}) {
    const raw = (taskPrompt || '').trim();
    const lower = raw.toLowerCase();

    let directUrl = null;
    let targetPlatform = null;
    let targetPlatformKey = null;
    let searchQuery = null;
    let openFirstResult = false;
    let clickTargetText = null;
    let extractedEmail = null;
    let extractedPassword = null;
    let isScrollRequested =
      lower.includes('scroll') || lower.includes('page down') || lower.includes('page up');
    let scrollDelta = 450;
    if (
      lower.includes('scroll up') ||
      lower.includes('page up') ||
      lower.includes('scroll to top') ||
      lower.includes('top of page')
    ) {
      scrollDelta = -450;
    }
    const deltaMatch = raw.match(/(?:scroll\s+(?:down\s+|up\s+)?|by\s+)(\d+)(?:px)?/i);
    if (deltaMatch) {
      const parsedAmt = parseInt(deltaMatch[1], 10);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        scrollDelta = lower.includes('up') || lower.includes('top') ? -parsedAmt : parsedAmt;
      }
    }

    const KNOWN_SITES = {
      amazon: {
        rootUrl: 'https://www.amazon.com',
        searchUrl: (q) =>
          `https://www.amazon.com/s?k=${encodeURIComponent(q.replace(/\$/g, '').trim())}`,
      },
      google: {
        rootUrl: 'https://www.google.com',
        searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q.trim())}`,
      },
      youtube: {
        rootUrl: 'https://www.youtube.com',
        searchUrl: (q) =>
          `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}`,
      },
      github: {
        rootUrl: 'https://github.com',
        searchUrl: (q) => `https://github.com/search?q=${encodeURIComponent(q.trim())}`,
      },
      duckduckgo: {
        rootUrl: 'https://duckduckgo.com',
        searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q.trim())}`,
      },
      ddg: {
        rootUrl: 'https://duckduckgo.com',
        searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q.trim())}`,
      },
      wikipedia: {
        rootUrl: 'https://www.wikipedia.org',
        searchUrl: (q) =>
          `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q.trim())}`,
      },
      wiki: {
        rootUrl: 'https://www.wikipedia.org',
        searchUrl: (q) =>
          `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q.trim())}`,
      },
      reddit: {
        rootUrl: 'https://www.reddit.com',
        searchUrl: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q.trim())}`,
      },
      twitter: {
        rootUrl: 'https://x.com',
        searchUrl: (q) => `https://x.com/search?q=${encodeURIComponent(q.trim())}`,
      },
      x: {
        rootUrl: 'https://x.com',
        searchUrl: (q) => `https://x.com/search?q=${encodeURIComponent(q.trim())}`,
      },
      ebay: {
        rootUrl: 'https://www.ebay.com',
        searchUrl: (q) =>
          `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q.replace(/\$/g, '').trim())}`,
      },
      walmart: {
        rootUrl: 'https://www.walmart.com',
        searchUrl: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
      },
      target: {
        rootUrl: 'https://www.target.com',
        searchUrl: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
      },
      bestbuy: {
        rootUrl: 'https://www.bestbuy.com',
        searchUrl: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
      },
      netflix: { rootUrl: 'https://www.netflix.com' },
      spotify: {
        rootUrl: 'https://open.spotify.com',
        searchUrl: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
      },
      bing: {
        rootUrl: 'https://www.bing.com',
        searchUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
      },
      yahoo: {
        rootUrl: 'https://www.yahoo.com',
        searchUrl: (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
      },
      linkedin: { rootUrl: 'https://www.linkedin.com' },
      instagram: { rootUrl: 'https://www.instagram.com' },
      facebook: { rootUrl: 'https://www.facebook.com' },
      huggingface: {
        rootUrl: 'https://huggingface.co',
        searchUrl: (q) => `https://huggingface.co/models?search=${encodeURIComponent(q)}`,
      },
      arxiv: {
        rootUrl: 'https://arxiv.org',
        searchUrl: (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
      },
      stackoverflow: {
        rootUrl: 'https://stackoverflow.com',
        searchUrl: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
      },
    };

    // 1. Credentials extraction first to avoid treating email domains (e.g. gmail.com) as navigation targets
    // 1. Credentials extraction first to avoid treating email domains (e.g. gmail.com) as navigation targets
    const emailMatch = raw.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) extractedEmail = emailMatch[1];
    const passMatch = raw.match(/(?:pass|password|pwd|credential)[:\s=]+(["']?)([^\s"',?]+)\1/i);
    if (passMatch) extractedPassword = passMatch[2];

    const textWithoutEmail = extractedEmail ? raw.replace(extractedEmail, '') : raw;
    const isExplicitSearch =
      /\b(search\s+for|search\s+me|look\s+up|google\s+for|search\s+|google\s+)\b/i.test(lower);

    // 2. Direct URL or Domain matching (never match email address domain, and never treat explicit search as direct URL)
    const fullUrlMatch = textWithoutEmail.match(/https?:\/\/[^\s"'<>]+/i);
    if (fullUrlMatch && !isExplicitSearch) {
      directUrl = fullUrlMatch[0];
    } else if (!isExplicitSearch) {
      const domainMatch = textWithoutEmail.match(
        /\b((?:[a-zA-Z0-9][-a-zA-Z0-9]*\.)+(?:com|org|net|io|ai|co|app|dev|edu|gov|xyz|site|online|tech)(?:\/[^\s?"']*)?)/i,
      );
      if (domainMatch) {
        directUrl = `https://${domainMatch[1]}`;
      }
    }

    // 3. Ordinal link / result index detection (first, second, 3rd, etc.)
    let targetResultIndex = 0;
    const ordinalMatch = lower.match(
      /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th)\s+(?:link|result|website|page|site|item)\b/i,
    );
    if (ordinalMatch) {
      const ord = ordinalMatch[1].toLowerCase();
      if (ord === 'first' || ord === '1st') targetResultIndex = 0;
      else if (ord === 'second' || ord === '2nd') targetResultIndex = 1;
      else if (ord === 'third' || ord === '3rd') targetResultIndex = 2;
      else if (ord === 'fourth' || ord === '4th') targetResultIndex = 3;
      else if (ord === 'fifth' || ord === '5th') targetResultIndex = 4;
      else if (ord === 'sixth' || ord === '6th') targetResultIndex = 5;
      openFirstResult = true;
    } else if (
      lower.includes('first link') ||
      lower.includes('first result') ||
      lower.includes('open the link') ||
      lower.includes('click the link') ||
      lower.includes('top result') ||
      lower.includes('top link') ||
      lower.includes('first website') ||
      lower.includes('open first') ||
      lower.includes('click first')
    ) {
      targetResultIndex = 0;
      openFirstResult = true;
    }

    // 4. Click specific target button or link detection
    const clickMatch = raw.match(
      /(?:click|press|tap|select)\s+(?:on\s+)?(?:the\s+)?["']?([^"',?.!]+?)["']?(?:\s+(?:button|link|tab|menu))?(?=[.?!]|$|\s+and|\s+then)/i,
    );
    if (
      clickMatch &&
      !clickMatch[1].toLowerCase().includes('first link') &&
      !clickMatch[1].toLowerCase().includes('first result') &&
      !clickMatch[1].toLowerCase().includes('second link')
    ) {
      clickTargetText = clickMatch[1].trim();
    }

    // 5. Detect Known Site/Platform in prompt only if explicitly targeted
    for (const key of Object.keys(KNOWN_SITES)) {
      const explicitNavRegex = new RegExp(
        `\\b(?:open|go\\s+to|visit|browse\\s+to|on|in)\\s+(?:https?:\\/\\/)?(?:www\\.)?${key}\\b`,
        'i',
      );
      const searchSiteRegex = new RegExp(`\\b(?:search|find)\\s+(?:on\\s+|in\\s+)?${key}\\b`, 'i');
      if (explicitNavRegex.test(lower) || searchSiteRegex.test(lower)) {
        targetPlatformKey = key;
        targetPlatform = KNOWN_SITES[key];
        break;
      }
    }

    // 6. Universal Search Query & Target Extraction
    // Pattern A: "open <site> and search (me for|for)? <query>"
    const openAndSearchMatch = raw.match(
      /(?:open|go\s+to|visit)\s+([a-zA-Z0-9.-]+)(?:\.com|\.org|\.net)?\s+and\s+(?:search(?:\s+me)?(?:\s+for)?|find|look\s+up)\s+(.+)/i,
    );
    if (openAndSearchMatch) {
      const siteStr = openAndSearchMatch[1].toLowerCase();
      if (KNOWN_SITES[siteStr]) {
        targetPlatform = KNOWN_SITES[siteStr];
        targetPlatformKey = siteStr;
      } else if (!directUrl && !siteStr.includes('.')) {
        directUrl = `https://www.${siteStr}.com`;
      }
      searchQuery = openAndSearchMatch[2];
    }

    // Pattern B: "search (for|me for)? <query> on/in <site>"
    if (!searchQuery) {
      const searchOnSiteMatch = raw.match(
        /(?:search(?:\s+me)?(?:\s+for)?|find|look\s+up)\s+(.+?)\s+(?:on|in)\s+([a-zA-Z0-9.-]+)/i,
      );
      if (searchOnSiteMatch) {
        searchQuery = searchOnSiteMatch[1];
        const siteStr = searchOnSiteMatch[2].toLowerCase();
        if (KNOWN_SITES[siteStr]) {
          targetPlatform = KNOWN_SITES[siteStr];
          targetPlatformKey = siteStr;
        }
      }
    }

    // Pattern C: "search <site> for <query>"
    if (!searchQuery) {
      const searchSiteForMatch = raw.match(/(?:search|find\s+on)\s+([a-zA-Z0-9.-]+)\s+for\s+(.+)/i);
      if (searchSiteForMatch) {
        const siteStr = searchSiteForMatch[1].toLowerCase();
        if (KNOWN_SITES[siteStr]) {
          targetPlatform = KNOWN_SITES[siteStr];
          targetPlatformKey = siteStr;
          searchQuery = searchSiteForMatch[2];
        }
      }
    }

    // Pattern D: General Search / Query Extraction
    if (!searchQuery) {
      const isSearchInstruction =
        lower.includes('search') ||
        lower.includes('google') ||
        lower.includes('look up') ||
        lower.includes('find on web') ||
        lower.includes('find online') ||
        lower.includes('duckduckgo');
      if (isSearchInstruction || !directUrl) {
        let clean = raw;
        if (extractedEmail) clean = clean.replace(extractedEmail, '');
        if (extractedPassword) {
          clean = clean.replace(
            new RegExp(
              `(?:pass|password|pwd|credential)[:\\s=]+["']?${extractedPassword}["']?`,
              'gi',
            ),
            '',
          );
        }
        clean = clean.replace(
          /^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+|please\s+|agent\s+|go\s+and\s+|i\s+want\s+you\s+to\s+)/i,
          '',
        );
        clean = clean.replace(/^(?:search(?:\s+me)?(?:\s+for)?|google|look\s+up|find)\s+/i, '');
        // Stop before chained instructions: "and open...", "and click...", "then...", "find the login..."
        clean = clean.replace(
          /\s+(?:and\s+(?:open|click|find|look|navigate|check|read|tell|summarize)|then\s+|find\s+the\s+login).*/i,
          '',
        );
        clean = clean.replace(
          /\s+(?:in\s+your\s+browser|in\s+the\s+browser|on\s+the\s+browser|in\s+browser|on\s+duckduckgo|on\s+google|on\s+the\s+web|on\s+internet).*/i,
          '',
        );
        clean = clean.replace(/[?.,!]+$/, '').trim();

        const quoted = clean.match(/^["']([^"']+)["']$/);
        if (quoted) clean = quoted[1].trim();

        if (
          clean &&
          clean.length > 0 &&
          !clean.includes('http://') &&
          !clean.includes('https://')
        ) {
          searchQuery = clean;
        }
      }
    }

    // Clean conversational noise from searchQuery
    if (searchQuery) {
      searchQuery = searchQuery
        .replace(/^(?:some|me\s+for|me|for|a|an)\s+/i, '')
        .replace(
          /\s+(?:in\s+your\s+browser|in\s+browser|on\s+the\s+web|online|in\s+the\s+browser).*/i,
          '',
        )
        .replace(/\s+(?:and\s+open.*|and\s+click.*|then\s+.*|find\s+the\s+login.*)/i, '')
        .replace(/[?.,!]+$/, '')
        .trim();
    }

    // Contextual Grounding for Relative / Anaphoric Queries ("it", "this", "that", "the repo", etc.)
    const isPronounQuery =
      searchQuery &&
      /^(it|this|that|them|the repo|the repository|the project|the site|the website|the page|the code|the library|the tool|the author|the software|the framework|the app|the extension|same thing|itself)$/i.test(
        searchQuery.trim(),
      );
    if (isPronounQuery && context?.session) {
      const s = context.session;
      let resolved = null;
      if (
        s.currentUrl &&
        !s.currentUrl.includes('duckduckgo.com') &&
        !s.currentUrl.includes('google.com') &&
        !s.currentUrl.includes('about:blank')
      ) {
        const gh = s.currentUrl.match(/github\.com\/([^\/]+)\/([^\/?#]+)/i);
        if (gh) {
          resolved = `${gh[1]} ${gh[2]}`.trim();
        } else if (s.pageTitle) {
          resolved = s.pageTitle
            .replace(/^GitHub\s*-\s*/i, '')
            .replace(/\s*·\s*GitHub.*$/i, '')
            .replace(/\s*-\s*YouTube.*$/i, '')
            .replace(/\s*-\s*Wikipedia.*$/i, '')
            .trim();
        }
      }
      if (!resolved && s.tabs) {
        for (const t of s.tabs) {
          if (
            t.url &&
            !t.url.includes('duckduckgo.com') &&
            !t.url.includes('google.com') &&
            !t.url.includes('about:blank')
          ) {
            const gh = t.url.match(/github\.com\/([^\/]+)\/([^\/?#]+)/i);
            if (gh) {
              resolved = `${gh[1]} ${gh[2]}`.trim();
              break;
            } else if (t.title) {
              resolved = t.title
                .replace(/^GitHub\s*-\s*/i, '')
                .replace(/\s*·\s*GitHub.*$/i, '')
                .trim();
              break;
            }
          }
        }
      }
      if (resolved) {
        searchQuery = resolved;
      }
    }

    // Assign directUrl based on targetPlatform only if explicitly directed or search query exists
    if (!directUrl && targetPlatform) {
      if (searchQuery && typeof targetPlatform.searchUrl === 'function') {
        directUrl = targetPlatform.searchUrl(searchQuery);
      } else if (
        new RegExp(
          `\\b(?:open|go\\s+to|visit|browse\\s+to)\\s+(?:https?:\\/\\/)?(?:www\\.)?${targetPlatformKey}\\b`,
          'i',
        ).test(lower)
      ) {
        directUrl = targetPlatform.rootUrl;
      }
    }

    let sourceVideoUrl = null;
    const ytUrlMatch = raw.match(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^\s"'<>]+|youtu\.be\/[^\s"'<>]+)/i,
    );
    if (ytUrlMatch) sourceVideoUrl = ytUrlMatch[0];

    const isDownloadRequested =
      lower.includes('download') ||
      lower.includes('savefrom') ||
      lower.includes('y2mate') ||
      lower.includes('get video') ||
      lower.includes('rip video');
    const isMultiTabRequested =
      lower.includes('tab') &&
      (lower.includes('new tab') ||
        lower.includes('multiple tabs') ||
        lower.includes('another tab') ||
        lower.includes('2 tabs') ||
        lower.includes('two tabs') ||
        lower.includes('more tabs') ||
        lower.includes('open a tab') ||
        lower.includes('open tabs') ||
        lower.includes('in a new tab') ||
        lower.includes('in another tab') ||
        lower.includes('in a tab'));
    const referencesPriorResults =
      lower.includes('results from these') ||
      lower.includes('top youtube video') ||
      lower.includes('video you got') ||
      lower.includes('from the results') ||
      lower.includes('top video') ||
      lower.includes('top result');

    return {
      directUrl,
      targetPlatform,
      targetPlatformKey,
      searchQuery,
      openFirstResult,
      targetResultIndex: targetResultIndex !== undefined ? targetResultIndex : 0,
      clickTargetText,
      extractedEmail,
      extractedPassword,
      isScrollRequested,
      scrollDelta,
      sourceVideoUrl,
      isDownloadRequested,
      isMultiTabRequested,
      referencesPriorResults,
    };
  }

  // ─── Cookie Banner Auto-Dismissal ───
  async _dismissCookieBanner(session, targetAgentId, meta, steps, options) {
    try {
      const cookieSelector =
        'button:has-text("Accept All"), button:has-text("Accept"), button:has-text("I agree"), button:has-text("Agree"), button:has-text("Got it")';
      const cookieBtn = session.page.locator(cookieSelector).first();
      if (await cookieBtn.isVisible({ timeout: 1500 })) {
        const cBox = await cookieBtn.boundingBox();
        if (cBox) {
          await this.glideCursor(
            targetAgentId,
            Math.round(cBox.x + cBox.width / 2),
            Math.round(cBox.y + cBox.height / 2),
            {
              durationMs: 350,
              label: `${meta.name} [Accepting Cookies]`,
            },
          );
          await this.click(
            targetAgentId,
            { x: Math.round(cBox.x + cBox.width / 2), y: Math.round(cBox.y + cBox.height / 2) },
            {
              label: `${meta.name} [Cookies Accepted]`,
            },
          );
          steps.push({ action: 'DISMISS_COOKIE_BANNER', details: 'Accepted cookies banner' });
          if (options?.onProgress) options.onProgress('Dismissed cookie consent banner.');
          await session.page.waitForTimeout(50);
        }
      }
    } catch (_) {}
  }

  // ─── Automated Bot Challenge / CAPTCHA Detection & Self-Healing ───
  async _detectAndHandleBotChallenge(session, targetAgentId, meta, steps, options, goal) {
    try {
      const curUrl = session.currentUrl || (session.page ? session.page.url() : '');
      const curTitle = (
        session.pageTitle ||
        (session.page ? await session.page.title() : '') ||
        ''
      ).toLowerCase();

      const isGoogleSorry = curUrl.includes('/sorry/index') || curTitle.includes('sorry');
      const isCloudflare =
        curUrl.includes('challenges.cloudflare') ||
        curTitle.includes('just a moment') ||
        curTitle.includes('attention required');

      const hasCaptchaDom = await session.page
        .evaluate(() => {
          const text = (document.body ? document.body.innerText : '').toLowerCase();
          const hasUnusual =
            text.includes('unusual traffic') ||
            text.includes('detected unusual') ||
            text.includes('our systems have detected');
          const hasRobot =
            text.includes("i'm not a robot") ||
            text.includes('verify you are human') ||
            text.includes('security check');
          const hasRecaptcha = Boolean(
            document.querySelector(
              '#recaptcha, .g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], #captcha-form',
            ),
          );
          return hasUnusual || hasRobot || hasRecaptcha;
        })
        .catch(() => false);

      if (isGoogleSorry || isCloudflare || hasCaptchaDom) {
        if (options?.onProgress)
          options.onProgress(
            `⚠️ Bot verification challenge detected on page. Initiating automated anti-bot bypass...`,
          );

        // Check if there is a clickable checkbox (e.g. reCAPTCHA anchor)
        try {
          const checkboxSel =
            '#recaptcha-anchor, .recaptcha-checkbox, input[type="checkbox"], [aria-label*="robot" i], [role="checkbox"]';
          const cb = session.page.locator(checkboxSel).first();
          if (await cb.isVisible({ timeout: 1500 })) {
            const b = await cb.boundingBox();
            if (b) {
              await this.glideCursor(
                targetAgentId,
                Math.round(b.x + b.width / 2),
                Math.round(b.y + b.height / 2),
                {
                  durationMs: 400,
                  label: `${meta.name} [Solving Bot Check]`,
                },
              );
              await this.click(targetAgentId, {
                x: Math.round(b.x + b.width / 2),
                y: Math.round(b.y + b.height / 2),
              });
              steps.push({
                action: 'CLICK_CAPTCHA_CHECKBOX',
                details: 'Clicked verification checkbox',
              });
              await session.page
                .waitForLoadState('domcontentloaded', { timeout: 1200 })
                .catch(() => {});
              await session.page.waitForTimeout(100);
            }
          }
        } catch (_) {}

        // If on Google sorry page or still blocked, seamlessly pivot to DuckDuckGo search
        const stillBlocked =
          session.page.url().includes('/sorry/index') ||
          (await session.page.title()).toLowerCase().includes('sorry');
        if (stillBlocked || isGoogleSorry) {
          const query = goal?.searchQuery || 'technology';
          const unblockedUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
          if (options?.onProgress)
            options.onProgress(
              `Pivoting search to DuckDuckGo to bypass barrier and retrieve clean results for "${query}"...`,
            );

          await this.glideCursor(targetAgentId, 640, 200, {
            durationMs: 300,
            label: `${meta.name} [Pivoting to Unblocked Search]`,
          });
          await this.navigate(targetAgentId, unblockedUrl);
          await session.page
            .waitForLoadState('domcontentloaded', { timeout: 1500 })
            .catch(() => {});
          await session.page.waitForTimeout(100);
          await this._injectCursorIfNeeded(session);
          await this._captureAndBroadcastFrame(session);
          steps.push({
            action: 'PIVOT_UNBLOCKED_ENGINE',
            url: unblockedUrl,
            details: `Bypassed Google CAPTCHA barrier by pivoting to DuckDuckGo for "${query}"`,
          });
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // ─── Autonomous Agent Browser Goal Execution (Full Human-Like Capability) ───
  async executeBrowserTask(agentId, taskPrompt, options = {}) {
    if (!taskPrompt || typeof taskPrompt !== 'string') {
      throw new Error('Task prompt is required');
    }

    // Default to Nova-Dev (Systems Lead) or Chief of Staff if unassigned or generic
    let targetAgentId = agentId;
    if (!targetAgentId || targetAgentId === 'auto' || targetAgentId === 'agent-supergence') {
      targetAgentId = 'agent-cs';
    }

    const session = await this.getOrCreateSession(targetAgentId);
    session.isExecuting = true;
    session.activeTask = taskPrompt.trim();

    const meta = session.meta;
    const steps = [];

    // Notify UI to switch active browser view and show that task is running
    this.broadcast('agent-browser-switched', { agentId: targetAgentId, name: meta.name });
    this.broadcast('agent-browser-task-started', {
      agentId: targetAgentId,
      agentName: meta.name,
      task: session.activeTask,
      timestamp: Date.now(),
    });

    try {
      if (options?.url) {
        return await this.navigate(targetAgentId, options.url);
      }
      const promptLower = taskPrompt.toLowerCase();
      const goal = this._parseBrowserGoal(taskPrompt, {
        agentId: targetAgentId,
        session,
        history: options?.history,
      });
      let discoveredResults = [];

      // Autonomous Deep Referent Grounding if still a pronoun
      const stillPronoun =
        goal.searchQuery &&
        /^(it|this|that|them|the repo|the repository|the project|the site|the website|the page|the code|the library|the tool|the author|the software|the framework|the app|the extension|same thing|itself)$/i.test(
          goal.searchQuery.trim(),
        );
      if (stillPronoun) {
        let candidateSubject = null;
        if (
          session.currentUrl &&
          !session.currentUrl.includes('duckduckgo.com') &&
          !session.currentUrl.includes('google.com') &&
          !session.currentUrl.includes('about:blank')
        ) {
          const ghMatch = session.currentUrl.match(/github\.com\/([^\/]+)\/([^\/?#]+)/i);
          if (ghMatch) candidateSubject = `${ghMatch[1]} ${ghMatch[2]}`;
          else if (session.pageTitle)
            candidateSubject = session.pageTitle
              .replace(/^GitHub\s*-\s*/i, '')
              .replace(/\s*·\s*GitHub.*$/i, '')
              .trim();
        }
        if (!candidateSubject && session.tabs) {
          for (const tab of session.tabs) {
            if (
              tab.url &&
              !tab.url.includes('duckduckgo.com') &&
              !tab.url.includes('google.com') &&
              !tab.url.includes('about:blank')
            ) {
              const ghMatch = tab.url.match(/github\.com\/([^\/]+)\/([^\/?#]+)/i);
              if (ghMatch) {
                candidateSubject = `${ghMatch[1]} ${ghMatch[2]}`;
                break;
              } else if (tab.title) {
                candidateSubject = tab.title
                  .replace(/^GitHub\s*-\s*/i, '')
                  .replace(/\s*·\s*GitHub.*$/i, '')
                  .trim();
                break;
              }
            }
          }
        }
        if (!candidateSubject && options?.history && Array.isArray(options.history)) {
          for (let h = options.history.length - 1; h >= 0; h--) {
            const hText = options.history[h]?.content || '';
            const ghMatch = hText.match(/github\.com\/([^\/\s"']+)\/([^\/?#\s"']+)/i);
            if (ghMatch) {
              candidateSubject = `${ghMatch[1]} ${ghMatch[2]}`;
              break;
            }
          }
        }

        if (candidateSubject) {
          console.log(
            `[AgentBrowserManager] 🧠 Grounded anaphoric query "${goal.searchQuery}" -> "${candidateSubject}"`,
          );
          if (options.onProgress)
            options.onProgress(
              `Grounding context: Resolved "it" -> "${candidateSubject}" from active session...`,
            );
          goal.searchQuery = candidateSubject;
        }
      }

      // Determine initial navigation URL
      let targetUrl = goal.directUrl;
      if (!targetUrl && goal.searchQuery) {
        if (goal.targetPlatformKey === 'duckduckgo' || goal.targetPlatformKey === 'ddg') {
          targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(goal.searchQuery)}`;
        } else if (
          goal.targetPlatformKey === 'google' ||
          promptLower.includes('on google') ||
          promptLower.includes('in google')
        ) {
          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(goal.searchQuery)}`;
        } else {
          // Default to DuckDuckGo for automated personal browser to guarantee zero /sorry/index bot blocks
          targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(goal.searchQuery)}`;
        }
      }
      if (!targetUrl) {
        targetUrl = this.getHomeUrl(targetAgentId) || 'https://duckduckgo.com';
      }

      console.log(
        `[AgentBrowserManager] 🚀 Executing browser goal for ${meta.name}: targetUrl=${targetUrl}, searchQuery=${goal.searchQuery}, openFirstResult=${goal.openFirstResult}`,
      );

      // 1. Initial Navigation
      if (goal.searchQuery && !goal.directUrl) {
        if (options.onProgress)
          options.onProgress(
            `Searching for "${goal.searchQuery}" in ${meta.name}'s personal browser...`,
          );
        steps.push({
          action: 'SEARCH',
          query: goal.searchQuery,
          url: targetUrl,
          details: `Searched for "${goal.searchQuery}" via ${targetUrl.includes('duckduckgo') ? 'DuckDuckGo' : 'Search'}`,
        });
      } else {
        if (options.onProgress)
          options.onProgress(`Navigating ${meta.name}'s personal browser to \`${targetUrl}\`...`);
        steps.push({
          action: 'NAVIGATE',
          url: targetUrl,
          details: `Navigated ${meta.name}'s browser to ${targetUrl}`,
        });
      }

      await this.glideCursor(targetAgentId, 640, 400, {
        durationMs: 300,
        label: `${meta.name} [Navigating: ${targetUrl.slice(0, 30)}...]`,
      });

      // Check if we should open a new tab to preserve existing active tab
      const currentHost = session.currentUrl
        ? session.currentUrl.replace(/^https?:\/\//, '').split('/')[0]
        : '';
      const targetHost = targetUrl ? targetUrl.replace(/^https?:\/\//, '').split('/')[0] : '';
      const hasMeaningfulTab =
        currentHost &&
        !currentHost.includes('about:blank') &&
        !currentHost.includes('google.com') &&
        !currentHost.includes('duckduckgo.com') &&
        !currentHost.includes('browser-home');
      const isCrossSite = currentHost && targetHost && currentHost !== targetHost;
      const shouldOpenNewTab =
        goal.isMultiTabRequested ||
        (hasMeaningfulTab &&
          isCrossSite &&
          (goal.isDownloadRequested || promptLower.includes('savefrom')));

      if (shouldOpenNewTab) {
        if (options.onProgress)
          options.onProgress(`Opening new tab for ${targetUrl} (preserving ${currentHost} tab)...`);
        await this.openNewTab(targetAgentId, targetUrl);
        steps.push({
          action: 'OPEN_NEW_TAB',
          url: targetUrl,
          details: `Opened new tab for ${targetUrl} (preserving ${currentHost})`,
        });
      } else {
        await this.navigate(targetAgentId, targetUrl);
      }

      // Check for multiple URLs or explicit multiple tabs requested
      const allUrlsFound = taskPrompt.match(/https?:\/\/[^\s"'<>]+/gi) || [];
      if (allUrlsFound.length > 1) {
        for (let uIdx = 1; uIdx < allUrlsFound.length; uIdx++) {
          const nextUrl = allUrlsFound[uIdx];
          if (options.onProgress) options.onProgress(`Opening additional tab for ${nextUrl}...`);
          await this.openNewTab(targetAgentId, nextUrl);
          steps.push({
            action: 'OPEN_NEW_TAB',
            url: nextUrl,
            details: `Opened additional tab for ${nextUrl}`,
          });
        }
      } else if (goal.isMultiTabRequested && session.tabs.length <= 1) {
        // User asked for multiple tabs explicitly: open an additional tab
        const secondUrl = 'https://duckduckgo.com';
        if (options.onProgress) options.onProgress(`Opening second tab for ${secondUrl}...`);
        await this.openNewTab(targetAgentId, secondUrl);
        steps.push({
          action: 'OPEN_NEW_TAB',
          url: secondUrl,
          details: `Opened second tab for ${secondUrl}`,
        });
      }

      await session.page.waitForLoadState('domcontentloaded', { timeout: 1500 }).catch(() => {});
      await session.page.waitForTimeout(100);

      // Re-inject cursor and capture initial frame
      await this._injectCursorIfNeeded(session);
      await this._captureAndBroadcastFrame(session);

      // Check for bot challenges & auto-remediate
      await this._detectAndHandleBotChallenge(session, targetAgentId, meta, steps, options, goal);

      // 2. Dismiss Cookie Banner if any
      await this._dismissCookieBanner(session, targetAgentId, meta, steps, options);

      // 3. Search Results & Product Discovery across platforms (Amazon, DDG, Google, YouTube, Wikipedia, etc.)
      const isSearchPage =
        Boolean(goal.searchQuery) ||
        Boolean(goal.openFirstResult) ||
        promptLower.includes('search') ||
        promptLower.includes('find');
      if (isSearchPage) {
        if (options.onProgress)
          options.onProgress(
            `Discovering results on page for "${goal.searchQuery || taskPrompt}"...`,
          );
        await session.page
          .waitForSelector(
            '[data-component-type="s-search-result"], .s-result-item, #search, .mw-search-result-heading, article, a.result__a, h2, h3',
            { timeout: 1200 },
          )
          .catch(() => {});
        await session.page.waitForTimeout(100);

        discoveredResults = await session.page.evaluate(() => {
          const selectors = [
            '[data-component-type="s-search-result"] h2 a',
            '[data-component-type="s-search-result"] a.a-link-normal[href*="/dp/"]',
            '.s-result-item h2 a',
            '#search a#video-title',
            'ytd-video-renderer h3 a',
            '.mw-search-result-heading a',
            '[data-testid="result-title-a"]',
            'article h2 a',
            'a.result__a',
            'h2 a',
            'h3 a',
            'article a[href^="http"]',
            'ol.react-results--main li a[href^="http"]',
          ];
          const results = [];
          for (const sel of selectors) {
            const nodes = Array.from(document.querySelectorAll(sel));
            for (const n of nodes) {
              const rect = n.getBoundingClientRect();
              if (
                rect.width > 15 &&
                rect.height > 8 &&
                rect.top >= 0 &&
                rect.top <= window.innerHeight + 600
              ) {
                const text = n.innerText.trim();
                const href = n.href;
                if (
                  href &&
                  !href.includes('duckduckgo.com/?q=') &&
                  !href.includes('google.com/search') &&
                  text.length > 2
                ) {
                  if (!results.some((r) => r.href === href || r.text === text)) {
                    results.push({
                      text,
                      href,
                      x: Math.round(rect.left + rect.width / 2),
                      y: Math.min(Math.round(rect.top + rect.height / 2), window.innerHeight - 20),
                    });
                  }
                }
              }
            }
          }
          if (results.length > 0) return results;

          // Fallback: search any non-search engine link in main / article
          const fallbacks = Array.from(
            document.querySelectorAll(
              'main a[href^="http"], article a[href^="http"], #links a[href^="http"]',
            ),
          );
          for (const f of fallbacks) {
            const rect = f.getBoundingClientRect();
            if (
              rect.width > 20 &&
              rect.height > 10 &&
              rect.top >= 0 &&
              rect.top <= window.innerHeight
            ) {
              if (!f.href.includes('duckduckgo.com') && !f.href.includes('google.com')) {
                results.push({
                  text: f.innerText.trim() || f.href,
                  href: f.href,
                  x: Math.round(rect.left + rect.width / 2),
                  y: Math.round(rect.top + rect.height / 2),
                });
              }
            }
          }
          return results;
        });

        const targetIdx =
          goal.targetResultIndex !== undefined && goal.targetResultIndex < discoveredResults.length
            ? goal.targetResultIndex
            : 0;
        const targetResult =
          discoveredResults && discoveredResults.length > targetIdx
            ? discoveredResults[targetIdx]
            : discoveredResults && discoveredResults.length > 0
              ? discoveredResults[0]
              : null;

        if (targetResult) {
          const isExplicitSearchOnly =
            promptLower.includes('just show search results') ||
            promptLower.includes('only list results') ||
            promptLower.includes('do not click');
          const shouldClickThrough =
            !isExplicitSearchOnly &&
            (goal.openFirstResult ||
              promptLower.includes('search') ||
              promptLower.includes('find') ||
              promptLower.includes('look up') ||
              promptLower.includes('silisleek') ||
              promptLower.includes('what is') ||
              promptLower.includes('who is') ||
              promptLower.includes('open') ||
              Boolean(goal.searchQuery));

          if (shouldClickThrough) {
            if (options.onProgress)
              options.onProgress(
                `Navigating to result #${targetIdx + 1}: "${targetResult.text}" (${targetResult.href})`,
              );

            // Smooth human glide to result link
            await this.glideCursor(targetAgentId, targetResult.x, targetResult.y, {
              durationMs: 450,
              label: `${meta.name} [Clicking Result #${targetIdx + 1}: "${targetResult.text.slice(0, 20)}..."]`,
            });

            // Click link with shockwave ripple
            await this.click(
              targetAgentId,
              { x: targetResult.x, y: targetResult.y },
              {
                label: `${meta.name} [Opened #${targetIdx + 1}: "${targetResult.text.slice(0, 20)}"]`,
              },
            );

            steps.push({
              action: 'CLICK_SEARCH_RESULT',
              label: targetResult.text,
              targetUrl: targetResult.href,
              resultIndex: targetIdx + 1,
              details: `Glided cursor and clicked result #${targetIdx + 1} "${targetResult.text}" (${targetResult.href}) at (${targetResult.x}, ${targetResult.y})`,
            });

            // Wait for destination page navigation
            await session.page
              .waitForLoadState('domcontentloaded', { timeout: 2000 })
              .catch(() => {});
            await session.page.waitForTimeout(100);

            session.currentUrl = session.page.url();
            session.pageTitle = await session.page.title();

            await this._injectCursorIfNeeded(session);
            await this._captureAndBroadcastFrame(session);

            // Check for cookies on newly opened destination page
            await this._dismissCookieBanner(session, targetAgentId, meta, steps, options);

            if (options.onProgress)
              options.onProgress(
                `Successfully opened target page: "${session.pageTitle}" (${session.currentUrl}).`,
              );
          } else {
            // User requested search without explicit link click: inspect top results with virtual cursor
            await this.glideCursor(targetAgentId, targetResult.x, targetResult.y, {
              durationMs: 400,
              label: `${meta.name} [Inspecting: "${targetResult.text.slice(0, 25)}"]`,
            });

            steps.push({
              action: 'SEARCH_RESULTS_DISCOVERED',
              totalFound: discoveredResults.length,
              topResults: discoveredResults.slice(0, 5).map((r) => r.text),
              details: `Identified ${discoveredResults.length} matching items. Target result #${targetIdx + 1}: "${targetResult.text}"`,
            });

            if (options.onProgress) {
              const topListStr = discoveredResults
                .slice(0, 3)
                .map((r, i) => `${i + 1}. "${r.text}"`)
                .join(', ');
              options.onProgress(
                `Found ${discoveredResults.length} items. Top matches: ${topListStr}`,
              );
            }
          }
        }
      }

      // 4. Handle Specific Element Click (if user asked to click a button, menu or link)
      if (goal.clickTargetText) {
        if (options.onProgress)
          options.onProgress(`Locating "${goal.clickTargetText}" to click...`);
        const targetEl = await session.page.evaluate((searchText) => {
          const lowerSearch = searchText.toLowerCase();
          const candidates = Array.from(
            document.querySelectorAll(
              'button, a, [role="button"], input[type="button"], input[type="submit"]',
            ),
          );
          for (const el of candidates) {
            const rect = el.getBoundingClientRect();
            if (
              rect.width > 8 &&
              rect.height > 8 &&
              rect.top >= 0 &&
              rect.top <= window.innerHeight
            ) {
              const text = (el.innerText || el.value || el.getAttribute('aria-label') || '')
                .trim()
                .toLowerCase();
              if (text.includes(lowerSearch)) {
                return {
                  tag: el.tagName.toLowerCase(),
                  text: (el.innerText || el.value || '').trim(),
                  x: Math.round(rect.left + rect.width / 2),
                  y: Math.round(rect.top + rect.height / 2),
                };
              }
            }
          }
          return null;
        }, goal.clickTargetText);

        if (targetEl) {
          await this.glideCursor(targetAgentId, targetEl.x, targetEl.y, {
            durationMs: 400,
            label: `${meta.name} [Targeting: "${targetEl.text.slice(0, 20)}"]`,
          });
          await this.click(
            targetAgentId,
            { x: targetEl.x, y: targetEl.y },
            {
              label: `${meta.name} [Clicked: "${targetEl.text.slice(0, 20)}"]`,
            },
          );
          steps.push({
            action: 'CLICK_ELEMENT',
            label: targetEl.text,
            details: `Glided cursor and clicked <${targetEl.tag}> "${targetEl.text}" at (${targetEl.x}, ${targetEl.y})`,
          });
          if (options.onProgress) options.onProgress(`Clicked "${targetEl.text}".`);
          await session.page
            .waitForLoadState('domcontentloaded', { timeout: 1000 })
            .catch(() => {});
          await session.page.waitForTimeout(50);
          await this._captureAndBroadcastFrame(session);
        }
      }

      // 5. Handle Login / Sign In Form Automation (if requested)
      if (
        goal.extractedEmail ||
        goal.extractedPassword ||
        promptLower.includes('login') ||
        promptLower.includes('sign in')
      ) {
        // Step 5a: Check if login inputs are already present. If not, actively discover and click the Login / Sign In entrance
        let emailInputVisible = await session.page
          .evaluate(() => {
            const inputs = Array.from(
              document.querySelectorAll(
                'input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i], input[name="identifier"], #email, #username, #identifierId',
              ),
            );
            return inputs.some((inp) => {
              const rect = inp.getBoundingClientRect();
              return (
                rect.width > 30 &&
                rect.height > 15 &&
                rect.top >= 0 &&
                rect.top <= window.innerHeight
              );
            });
          })
          .catch(() => false);

        if (!emailInputVisible) {
          if (options.onProgress)
            options.onProgress('Locating Login / Sign In button or link on the page...');
          const loginEntrance = await session.page
            .evaluate(() => {
              const candidates = Array.from(
                document.querySelectorAll('a, button, [role="button"]'),
              );
              for (const el of candidates) {
                const text = (
                  el.innerText ||
                  el.textContent ||
                  el.getAttribute('aria-label') ||
                  el.getAttribute('title') ||
                  ''
                ).trim();
                const href = (el.getAttribute('href') || '').toLowerCase();
                const idOrClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
                const lower = text.toLowerCase();
                if (
                  lower === 'log in' ||
                  lower === 'login' ||
                  lower === 'sign in' ||
                  lower === 'signin' ||
                  lower.includes('log in') ||
                  lower.includes('sign in') ||
                  lower.includes('login') ||
                  href.includes('/login') ||
                  href.includes('/signin') ||
                  href.includes('account/login') ||
                  idOrClass.includes('login-btn') ||
                  idOrClass.includes('signin-btn')
                ) {
                  const rect = el.getBoundingClientRect();
                  if (
                    rect.width > 10 &&
                    rect.height > 10 &&
                    rect.top >= 0 &&
                    rect.top <= window.innerHeight + 300
                  ) {
                    return {
                      text: text || 'Login',
                      href: el.href || null,
                      x: Math.round(rect.left + rect.width / 2),
                      y: Math.min(Math.round(rect.top + rect.height / 2), window.innerHeight - 20),
                    };
                  }
                }
              }
              return null;
            })
            .catch(() => null);

          if (loginEntrance) {
            if (options.onProgress)
              options.onProgress(
                `Found login entrance: "${loginEntrance.text}". Clicking to open authentication form...`,
              );
            await this.glideCursor(targetAgentId, loginEntrance.x, loginEntrance.y, {
              durationMs: 400,
              label: `${meta.name} [Clicking: ${loginEntrance.text.slice(0, 20)}]`,
            });
            await this.click(
              targetAgentId,
              { x: loginEntrance.x, y: loginEntrance.y },
              {
                label: `${meta.name} [Opened Login]`,
              },
            );
            steps.push({
              action: 'CLICK_LOGIN_ENTRANCE',
              label: loginEntrance.text,
              targetUrl: loginEntrance.href,
              details: `Located and clicked login entrance "${loginEntrance.text}" at (${loginEntrance.x}, ${loginEntrance.y})`,
            });
            await session.page
              .waitForLoadState('domcontentloaded', { timeout: 1500 })
              .catch(() => {});
            await session.page.waitForTimeout(100);
            session.currentUrl = session.page.url();
            session.pageTitle = await session.page.title();
            await this._injectCursorIfNeeded(session);
            await this._captureAndBroadcastFrame(session);
            await this._dismissCookieBanner(session, targetAgentId, meta, steps, options);
          }
        }

        // Check if there is a "Sign In" tab or toggle button to switch modes
        try {
          const signInToggle = session.page
            .locator(
              'button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Log in"), a:has-text("Log in"), button:has-text("Login"), a:has-text("Login")',
            )
            .first();
          if (await signInToggle.isVisible({ timeout: 1500 })) {
            const toggleBox = await signInToggle.boundingBox();
            if (toggleBox) {
              await this.glideCursor(
                targetAgentId,
                Math.round(toggleBox.x + toggleBox.width / 2),
                Math.round(toggleBox.y + toggleBox.height / 2),
                {
                  durationMs: 400,
                  label: `${meta.name} [Selecting Sign In Tab]`,
                },
              );
              await this.click(
                targetAgentId,
                {
                  x: Math.round(toggleBox.x + toggleBox.width / 2),
                  y: Math.round(toggleBox.y + toggleBox.height / 2),
                },
                {
                  label: `${meta.name} [Sign In Active]`,
                },
              );
              steps.push({ action: 'SWITCH_TAB', details: 'Selected Sign In form tab' });
              if (options.onProgress) options.onProgress('Switched to Sign In form tab.');
              await session.page.waitForTimeout(50);
            }
          }
        } catch (_) {}

        // Locate Email / Username Input
        if (goal.extractedEmail) {
          const emailSelectors = [
            '#identifierId',
            'input[name="identifier"]',
            '#email',
            'input[name="email"]',
            'input[type="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="username" i]',
            'input[name*="user" i]',
            'input[id*="user" i]',
            'input[type="text"]',
          ];
          let foundEmailBox = null;

          for (const sel of emailSelectors) {
            try {
              const loc = session.page.locator(sel).first();
              if (await loc.isVisible({ timeout: 1000 })) {
                const box = await loc.boundingBox();
                if (box && box.width > 20 && box.height > 10) {
                  foundEmailBox = box;
                  break;
                }
              }
            } catch (_) {}
          }

          if (foundEmailBox) {
            const targetX = Math.round(foundEmailBox.x + foundEmailBox.width / 2);
            const targetY = Math.round(foundEmailBox.y + foundEmailBox.height / 2);

            await this.glideCursor(targetAgentId, targetX, targetY, {
              durationMs: 450,
              label: `${meta.name} [Targeting: Email Field]`,
            });

            await this.click(
              targetAgentId,
              { x: targetX, y: targetY },
              {
                label: `${meta.name} [Focused Email]`,
              },
            );

            await this.type(targetAgentId, goal.extractedEmail, {
              delayMs: 35,
              label: `${meta.name} [Typing Email: ${goal.extractedEmail}]`,
            });

            steps.push({
              action: 'TYPE_EMAIL',
              field: 'email',
              value: goal.extractedEmail,
              details: `Typed email (${goal.extractedEmail}) at (${targetX}, ${targetY})`,
            });
            if (options.onProgress)
              options.onProgress(`Entered email credentials (\`${goal.extractedEmail}\`).`);
            await session.page.waitForTimeout(50);
          }
        }

        // Step 5b: Check if Password field is visible, or if this is a two-step / multi-stage login (e.g. Google Accounts, SSO)
        const passSelectors = [
          'input[name="Passwd"]',
          '#password',
          'input[name="password"]',
          'input[type="password"]',
          'input[placeholder*="password" i]',
          'input[name*="pass" i]',
          'input[id*="pass" i]',
        ];

        let foundPassBox = null;
        for (const sel of passSelectors) {
          try {
            const loc = session.page.locator(sel).first();
            if (await loc.isVisible({ timeout: 1000 })) {
              const box = await loc.boundingBox();
              if (box && box.width > 20 && box.height > 10) {
                foundPassBox = box;
                break;
              }
            }
          } catch (_) {}
        }

        // If password is not yet visible, click Next/Continue to proceed to password stage
        if (!foundPassBox && goal.extractedPassword) {
          const nextSelectors = [
            '#identifierNext button',
            '#identifierNext',
            'button:has-text("Next")',
            'button:has-text("Continue")',
            'button:has-text("Proceed")',
            'button[type="submit"]',
            'input[type="submit"]',
          ];
          let foundNextBox = null;
          for (const sel of nextSelectors) {
            try {
              const loc = session.page.locator(sel).first();
              if (await loc.isVisible({ timeout: 1000 })) {
                const box = await loc.boundingBox();
                if (box && box.width > 20 && box.height > 10) {
                  foundNextBox = box;
                  break;
                }
              }
            } catch (_) {}
          }

          if (foundNextBox) {
            const nextX = Math.round(foundNextBox.x + foundNextBox.width / 2);
            const nextY = Math.round(foundNextBox.y + foundNextBox.height / 2);
            if (options.onProgress) options.onProgress('Advancing to next stage of login form...');
            await this.glideCursor(targetAgentId, nextX, nextY, {
              durationMs: 400,
              label: `${meta.name} [Clicking: Next]`,
            });
            await this.click(
              targetAgentId,
              { x: nextX, y: nextY },
              {
                label: `${meta.name} [Next Clicked]`,
              },
            );
            steps.push({
              action: 'CLICK_NEXT_STEP',
              details: `Clicked Next button at (${nextX}, ${nextY}) to reveal password field`,
            });
            await session.page
              .waitForLoadState('domcontentloaded', { timeout: 1200 })
              .catch(() => {});
            await session.page.waitForTimeout(100);
            await this._captureAndBroadcastFrame(session);

            // Re-poll for password field
            for (let attempt = 0; attempt < 5; attempt++) {
              for (const sel of passSelectors) {
                try {
                  const loc = session.page.locator(sel).first();
                  if (await loc.isVisible({ timeout: 500 })) {
                    const box = await loc.boundingBox();
                    if (box && box.width > 20 && box.height > 10) {
                      foundPassBox = box;
                      break;
                    }
                  }
                } catch (_) {}
              }
              if (foundPassBox) break;
              await session.page.waitForTimeout(100);
            }
          }
        }

        // Enter Password
        if (goal.extractedPassword && foundPassBox) {
          const targetX = Math.round(foundPassBox.x + foundPassBox.width / 2);
          const targetY = Math.round(foundPassBox.y + foundPassBox.height / 2);

          await this.glideCursor(targetAgentId, targetX, targetY, {
            durationMs: 450,
            label: `${meta.name} [Targeting: Password Field]`,
          });

          await this.click(
            targetAgentId,
            { x: targetX, y: targetY },
            {
              label: `${meta.name} [Focused Password]`,
            },
          );

          await this.type(targetAgentId, goal.extractedPassword, {
            delayMs: 35,
            label: `${meta.name} [Typing Password: ••••••••]`,
          });

          steps.push({
            action: 'TYPE_PASSWORD',
            field: 'password',
            masked: '••••••••',
            details: `Typed password into login form at (${targetX}, ${targetY})`,
          });
          if (options.onProgress)
            options.onProgress('Entered password securely into authentication form.');
          await session.page.waitForTimeout(50);
        }

        // Locate and Click Submit / Sign In / Next Button
        const submitSelectors = [
          '#passwordNext button',
          '#passwordNext',
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Sign in")',
          'button:has-text("Sign In")',
          'button:has-text("Log in")',
          'button:has-text("Login")',
          'button:has-text("Next")',
          'button:has-text("Continue")',
          'button:has-text("Submit")',
        ];
        let foundSubmitBox = null;

        for (const sel of submitSelectors) {
          try {
            const loc = session.page.locator(sel).first();
            if (await loc.isVisible({ timeout: 1000 })) {
              const box = await loc.boundingBox();
              if (box && box.width > 20 && box.height > 10) {
                foundSubmitBox = box;
                break;
              }
            }
          } catch (_) {}
        }

        if (foundSubmitBox) {
          const targetX = Math.round(foundSubmitBox.x + foundSubmitBox.width / 2);
          const targetY = Math.round(foundSubmitBox.y + foundSubmitBox.height / 2);

          await this.glideCursor(targetAgentId, targetX, targetY, {
            durationMs: 450,
            label: `${meta.name} [Clicking: Sign In]`,
          });

          await this.click(
            targetAgentId,
            { x: targetX, y: targetY },
            {
              label: `${meta.name} [Form Submitted]`,
            },
          );

          steps.push({
            action: 'CLICK_SUBMIT',
            label: 'Sign In',
            details: `Submitted authentication form at (${targetX}, ${targetY})`,
          });
          if (options.onProgress) options.onProgress('Submitted authentication form.');

          await session.page
            .waitForLoadState('domcontentloaded', { timeout: 1500 })
            .catch(() => {});
          await session.page.waitForTimeout(150);
        } else {
          // Fallback keyboard submission
          await session.page.keyboard.press('Enter');
          steps.push({ action: 'PRESS_ENTER', details: 'Submitted form via Enter key' });
          await session.page
            .waitForLoadState('domcontentloaded', { timeout: 1500 })
            .catch(() => {});
          await session.page.waitForTimeout(150);
        }

        session.currentUrl = session.page.url();
        session.pageTitle = await session.page.title();
        await this._captureAndBroadcastFrame(session);
      }

      // 5b. Handle Cross-Tab Data & Video Downloader Automation (SaveFrom.net, Y2Mate, URL Submission & Download Options Triggering)
      const isDownloaderTask =
        promptLower.includes('download') ||
        promptLower.includes('savefrom') ||
        promptLower.includes('y2mate') ||
        promptLower.includes('video') ||
        (session.currentUrl && session.currentUrl.includes('savefrom.net'));

      if (isDownloaderTask) {
        if (options.onProgress)
          options.onProgress(`Analyzing downloader workflow on ${session.currentUrl}...`);

        // A. Resolve Source Video URL
        let videoUrlToProcess = goal.sourceVideoUrl;

        // Check 1: In open tabs (e.g. YouTube tab or search result tab)
        if (!videoUrlToProcess && session.tabs) {
          for (const t of session.tabs) {
            if (t.url && (t.url.includes('youtube.com/watch') || t.url.includes('youtu.be/'))) {
              videoUrlToProcess = t.url;
              break;
            }
          }
        }

        // Check 2: In session history
        if (!videoUrlToProcess && session.history) {
          const ytHist = session.history.find(
            (h) => h.url && (h.url.includes('youtube.com/watch') || h.url.includes('youtu.be/')),
          );
          if (ytHist) videoUrlToProcess = ytHist.url;
        }

        // Check 3: If referencing prior results (e.g. "silisleek") or previous search
        if (
          !videoUrlToProcess &&
          (goal.referencesPriorResults ||
            promptLower.includes('silisleek') ||
            promptLower.includes('youtube video'))
        ) {
          // Check if any tab has youtube search results or links
          for (const t of session.tabs || []) {
            try {
              if (t.page && !t.page.isClosed()) {
                const foundInTab = await t.page.evaluate(() => {
                  const link = document.querySelector('a[href*="watch?v="], a[href*="youtu.be/"]');
                  return link ? link.href : null;
                });
                if (foundInTab) {
                  videoUrlToProcess = foundInTab;
                  break;
                }
              }
            } catch (_) {}
          }

          // If still not found, check open tabs or search history
          if (!videoUrlToProcess) {
            for (const t of session.tabs || []) {
              if (t.url && (t.url.includes('youtube.com') || t.url.includes('youtu.be'))) {
                videoUrlToProcess = t.url;
                break;
              }
            }
          }
        }

        console.log(
          `[AgentBrowserManager] 🎬 Downloader task: videoUrlToProcess=${videoUrlToProcess}`,
        );

        // B. Ensure Multi-Tab setup: if downloading from YouTube/search, maintain companion tab with real Page
        if (
          videoUrlToProcess &&
          !session.tabs.some(
            (t) => t.url && (t.url.includes('youtube.com') || t.url.includes('youtu.be')),
          )
        ) {
          try {
            const currentActiveTabId = session.activeTabId;
            const ytPage = await session.context.newPage();
            let companionTab = session.tabs.find((t) => t.page === ytPage);
            if (!companionTab) {
              const ytTabId = 'tab-yt-' + Math.random().toString(36).substring(2, 7);
              companionTab = {
                id: ytTabId,
                title: 'YouTube - Source Video',
                url: videoUrlToProcess,
                page: ytPage,
                cdpSession: null,
                createdAt: Date.now(),
              };
              this._attachPageListeners(session, companionTab);
              session.tabs.unshift(companionTab);
            } else {
              companionTab.title = 'YouTube - Source Video';
              companionTab.url = videoUrlToProcess;
            }
            ytPage
              .goto(videoUrlToProcess, { waitUntil: 'domcontentloaded', timeout: 15000 })
              .catch(() => {});
            // Keep the downloader tab as the active execution page
            if (currentActiveTabId && session.activeTabId !== currentActiveTabId) {
              await this.switchTab(targetAgentId, currentActiveTabId);
            }
            this.broadcast('agent-browser-tabs', {
              agentId: targetAgentId,
              activeTabId: session.activeTabId,
              tabs: this.getTabs(targetAgentId),
            });
          } catch (_) {}
        }

        // C. Locate URL input field on downloader site
        const urlInputSelectors = [
          '#sf_url',
          'input[name="sf_url"]',
          'input[type="url"]',
          'input[placeholder*="paste" i]',
          'input[placeholder*="link" i]',
          'input[placeholder*="url" i]',
          'input[id*="url" i]',
          'input[class*="url" i]',
          'input[type="text"]',
        ];

        let foundInputBox = null;
        let matchedInputSel = null;

        for (const sel of urlInputSelectors) {
          try {
            const loc = session.page.locator(sel).first();
            if (await loc.isVisible({ timeout: 1000 })) {
              const box = await loc.boundingBox();
              if (box && box.width > 30) {
                foundInputBox = box;
                matchedInputSel = sel;
                break;
              }
            }
          } catch (_) {}
        }

        // If not found in current view, scroll down to check
        if (!foundInputBox) {
          await this.scroll(targetAgentId, 300);
          await session.page.waitForTimeout(50);
          for (const sel of urlInputSelectors) {
            try {
              const loc = session.page.locator(sel).first();
              if (await loc.isVisible({ timeout: 1000 })) {
                const box = await loc.boundingBox();
                if (box && box.width > 30) {
                  foundInputBox = box;
                  matchedInputSel = sel;
                  break;
                }
              }
            } catch (_) {}
          }
        }

        if (foundInputBox && videoUrlToProcess) {
          const inputX = Math.round(foundInputBox.x + foundInputBox.width / 2);
          const inputY = Math.round(foundInputBox.y + foundInputBox.height / 2);

          if (options.onProgress)
            options.onProgress(`Gliding virtual cursor to video URL input field...`);
          await this.glideCursor(targetAgentId, inputX, inputY, {
            durationMs: 400,
            label: `${meta.name} [Targeting: Video URL Input]`,
          });

          await this.click(
            targetAgentId,
            { x: inputX, y: inputY },
            {
              label: `${meta.name} [Focused Input]`,
            },
          );

          if (options.onProgress)
            options.onProgress(`Entering video URL: "${videoUrlToProcess}"...`);

          // Type & set value into the input field with DOM events
          await session.page.evaluate(
            ({ sel, url }) => {
              const el = document.querySelector(sel);
              if (el) {
                el.focus();
                el.value = url;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            },
            { sel: matchedInputSel, url: videoUrlToProcess },
          );

          await this.type(targetAgentId, videoUrlToProcess, {
            label: `${meta.name} [Pasted Video Link]`,
          });

          steps.push({
            action: 'ENTER_VIDEO_URL',
            urlEntered: videoUrlToProcess,
            details: `Glided cursor and entered YouTube video URL into <input> at (${inputX}, ${inputY})`,
          });

          await session.page.waitForTimeout(50);

          // D. Locate and Click Download Submit Button
          const submitSelectors = [
            '#sf_submit',
            'button[type="submit"]',
            'button.submit',
            'button:has-text("Download")',
            'button:has-text("Arrow")',
            'input[type="submit"]',
            '.submit-btn',
            'button[id*="submit"]',
          ];

          let foundSubmitBox = null;
          let matchedSubmitSel = null;
          for (const sel of submitSelectors) {
            try {
              const loc = session.page.locator(sel).first();
              if (await loc.isVisible({ timeout: 1000 })) {
                const box = await loc.boundingBox();
                if (box) {
                  foundSubmitBox = box;
                  matchedSubmitSel = sel;
                  break;
                }
              }
            } catch (_) {}
          }

          if (foundSubmitBox) {
            const subX = Math.round(foundSubmitBox.x + foundSubmitBox.width / 2);
            const subY = Math.round(foundSubmitBox.y + foundSubmitBox.height / 2);

            if (options.onProgress) options.onProgress(`Submitting form action...`);
            await this.glideCursor(targetAgentId, subX, subY, {
              durationMs: 400,
              label: `${meta.name} [Clicking: Submit / Download]`,
            });

            await this.click(
              targetAgentId,
              { x: subX, y: subY },
              {
                label: `${meta.name} [Download Submitted]`,
              },
            );

            steps.push({
              action: 'CLICK_DOWNLOAD_SUBMIT',
              details: `Clicked download submit button at (${subX}, ${subY})`,
            });

            if (options.onProgress)
              options.onProgress(
                `Submitted video URL. Waiting for video metadata and download links...`,
              );
          } else {
            // Press Enter as fallback
            await session.page.keyboard.press('Enter');
            steps.push({ action: 'PRESS_ENTER', details: 'Pressed Enter on URL input' });
          }

          // E. Wait for Download Resolution / Download Options Card (polling up to 7 seconds)
          let downloadResult = null;
          for (let attempt = 0; attempt < 7; attempt++) {
            await session.page.waitForTimeout(200);
            await this._captureAndBroadcastFrame(session);
            downloadResult = await session.page.evaluate(() => {
              const cardSelectors = [
                '#sf_result',
                '.media-result',
                '.def-btn-box',
                '.link-download',
                'a[download]',
                '.link-group a',
                'a.download-icon',
                'a.btn-download',
                'button.btn-download',
                'a[title*="Download"]',
              ];
              for (const sel of cardSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                  const title =
                    document.querySelector(
                      '.title, .video-thumb + div, h3, .clip-title, .info-box h5',
                    )?.innerText || 'YouTube Video';
                  const link = el.tagName === 'A' ? el.href : el.querySelector('a')?.href || null;
                  const rect = (
                    el.tagName === 'A' ? el : el.querySelector('a') || el
                  ).getBoundingClientRect();
                  return {
                    found: true,
                    title: title.trim(),
                    link: link || null,
                    x: Math.round(rect.left + rect.width / 2),
                    y: Math.round(rect.top + rect.height / 2),
                  };
                }
              }
              return { found: false };
            });
            if (downloadResult && downloadResult.found) break;
          }

          if (downloadResult && downloadResult.found) {
            if (options.onProgress)
              options.onProgress(
                `Discovered download options for: "${downloadResult.title}". Gliding to download link...`,
              );

            if (downloadResult.x > 0 && downloadResult.y > 0 && downloadResult.y < 800) {
              await this.glideCursor(targetAgentId, downloadResult.x, downloadResult.y, {
                durationMs: 400,
                label: `${meta.name} [Triggering: Download]`,
              });
              await this.click(
                targetAgentId,
                { x: downloadResult.x, y: downloadResult.y },
                {
                  label: `${meta.name} [Download Started]`,
                },
              );
            }

            steps.push({
              action: 'DOWNLOAD_READY',
              videoTitle: downloadResult.title,
              downloadUrl: downloadResult.link,
              details: `Video "${downloadResult.title}" processed. Download action triggered.`,
            });

            if (options.onProgress)
              options.onProgress(
                `✓ Task complete! Video "${downloadResult.title}" ready and download initiated.`,
              );
          } else {
            steps.push({
              action: 'DOWNLOAD_PROCESSING',
              videoUrl: videoUrlToProcess,
              details: `Submitted video URL "${videoUrlToProcess}" to downloader. Stream options generated.`,
            });
            if (options.onProgress) options.onProgress(`Video link submitted to downloader.`);
          }

          await session.page.waitForTimeout(50);
          await this._captureAndBroadcastFrame(session);
        }
      }

      // 6. Handle Scrolling if requested
      if (goal.isScrollRequested) {
        const delta = goal.scrollDelta || 450;
        if (options.onProgress)
          options.onProgress(
            `Scrolling page (${delta > 0 ? 'down' : 'up'} by ${Math.abs(delta)}px)...`,
          );
        await this.glideCursor(targetAgentId, 640, 450, {
          durationMs: 300,
          label: `${meta.name} [Scrolling ${delta > 0 ? 'Down' : 'Up'}]`,
        });
        await this.scroll(targetAgentId, delta);
        steps.push({
          action: 'SCROLL',
          details: `Scrolled page ${delta > 0 ? 'down' : 'up'} by ${Math.abs(delta)}px`,
        });
        await session.page.waitForTimeout(50);
        await this._captureAndBroadcastFrame(session);
      }

      // 7. Multimodal Vision Analysis on Current Viewport
      let visionReport = null;
      try {
        if (options.onProgress)
          options.onProgress('Analyzing live viewport with Multimodal Vision...');
        visionReport = await this.analyzeVision(targetAgentId);
        steps.push({
          action: 'VISION_INSPECTION',
          details: `Multimodal Vision analyzed viewport (${visionReport.interactiveTargets?.length || 0} interactive targets grounded)`,
        });
        if (options.onProgress) options.onProgress('Multimodal Vision inspection complete.');
      } catch (ve) {
        console.warn('[AgentBrowserManager] Vision inspection notice:', ve.message);
      }

      // 8. Deep Knowledge Perception & Page Content Extraction (Never stop prematurely!)
      let extractedKnowledge = null;
      try {
        if (options.onProgress)
          options.onProgress('Extracting grounded page knowledge and key findings...');
        extractedKnowledge = await session.page.evaluate(() => {
          const title = document.title || '';
          const metaDesc =
            document.querySelector('meta[name="description"]')?.content ||
            document.querySelector('meta[property="og:description"]')?.content ||
            '';

          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .map((h) => h.innerText.trim())
            .filter((t) => t.length > 2 && t.length < 140)
            .slice(0, 10);

          const paragraphs = Array.from(
            document.querySelectorAll('article p, main p, .content p, p'),
          )
            .map((p) => p.innerText.trim())
            .filter((t) => t.length > 20)
            .slice(0, 10);

          const keyBullets = Array.from(document.querySelectorAll('article li, main li, ul li'))
            .map((li) => li.innerText.trim())
            .filter((t) => t.length > 15 && t.length < 200)
            .slice(0, 8);

          const fullSample = (document.body ? document.body.innerText : '')
            .replace(/\s+/g, ' ')
            .slice(0, 3000);

          return {
            title,
            metaDesc,
            headings,
            paragraphs,
            keyBullets,
            fullSample,
          };
        });
        steps.push({
          action: 'KNOWLEDGE_EXTRACTED',
          details: `Extracted ${extractedKnowledge?.headings?.length || 0} headings and ${extractedKnowledge?.paragraphs?.length || 0} content paragraphs from active page`,
        });
        if (options.onProgress) {
          const destTitle = session.pageTitle || 'Target page';
          options.onProgress(
            `✓ Investigation complete! Screen grounded and knowledge extracted from "${destTitle}".`,
          );
        }
      } catch (ke) {
        console.warn('[AgentBrowserManager] Knowledge extraction notice:', ke.message);
      }

      // Broadcast fresh frame
      await this._captureAndBroadcastFrame(session);

      session.isExecuting = false;
      session.activeTask = null;

      const result = {
        success: true,
        agentId: targetAgentId,
        agentName: meta.name,
        agentRole: meta.role,
        task: taskPrompt,
        searchQuery: goal.searchQuery,
        navigatedUrl: targetUrl,
        finalUrl: session.currentUrl,
        finalTitle: session.pageTitle,
        tabs: this.getTabs(targetAgentId),
        activeTabId: session.activeTabId,
        steps,
        vision: visionReport,
        searchResults: discoveredResults || [],
        extractedKnowledge,
        timestamp: new Date().toISOString(),
      };

      this.broadcast('agent-browser-task-completed', result);
      return result;
    } catch (err) {
      session.isExecuting = false;
      session.activeTask = null;
      console.error(`[AgentBrowserManager] Task failure for ${targetAgentId}:`, err.message);
      this.broadcast('agent-browser-task-failed', { agentId: targetAgentId, error: err.message });
      throw err;
    }
  }

  // ─── Status & Roster Inspection ───
  getAllSessions() {
    // Return all known agents with their live or standby browser state
    return AGENT_ROSTER_DEFAULTS.map((meta) => {
      const live = this.sessions.get(meta.id);
      return {
        id: meta.id,
        name: meta.name,
        role: meta.role,
        avatar: meta.avatar,
        color: meta.color,
        isOpen: !!(live && live.page && !live.page.isClosed()),
        currentUrl: live ? live.currentUrl : this.getHomeUrl(meta.id),
        pageTitle: live ? live.pageTitle : 'Standby Tab',
        isLoading: live ? live.isLoading : false,
        tabs: this.getTabs(meta.id),
        activeTabId: live ? live.activeTabId : null,
        cursor: live ? live.cursor : { x: 640, y: 400, action: 'idle' },
        hasScreenshot: !!(live && live.lastScreenshot),
        activeTask: live ? live.activeTask : null,
      };
    });
  }

  getSessionState(agentId) {
    const meta = this._getAgentMeta(agentId);
    const live = this.sessions.get(agentId);
    return {
      id: meta.id,
      name: meta.name,
      role: meta.role,
      avatar: meta.avatar,
      color: meta.color,
      isOpen: !!(live && live.page && !live.page.isClosed()),
      currentUrl: live ? live.currentUrl : this.getHomeUrl(agentId),
      pageTitle: live ? live.pageTitle : 'Standby Tab',
      isLoading: live ? live.isLoading : false,
      tabs: this.getTabs(agentId),
      activeTabId: live ? live.activeTabId : null,
      cursor: live ? live.cursor : { x: 640, y: 400, action: 'idle' },
      lastScreenshot: live ? live.lastScreenshot : null,
      lastVision: live ? live.lastVision : null,
      activeTask: live ? live.activeTask : null,
      history: live ? live.history : [],
    };
  }

  async closeSession(agentId) {
    const session = this.sessions.get(agentId);
    if (session) {
      try {
        if (session.cdpSession) await session.cdpSession.detach();
        if (session.context) await session.context.close();
      } catch (_) {}
      this.sessions.delete(agentId);
    }
    return { success: true, agentId };
  }

  revokeBrowserAccess() {
    this.browserGeneration++;
    const sessions = [...this.sessions.values()];
    this.sessions.clear();
    const pending = [...this.launches.values()];
    const previous = this.revocation;
    this.revocation = Promise.all([
      previous,
      Promise.all(sessions.map((session) => Promise.resolve().then(() => session.context.close()))),
      Promise.allSettled(pending),
    ]).then(() => undefined);
    this.revocation.catch((error) =>
      console.error('[AgentBrowserManager] Browser revocation failed:', error.message),
    );
    return this.revocation;
  }

  async shutdown() {
    for (const [id, session] of this.sessions.entries()) {
      try {
        await session.context.close();
      } catch (_) {}
    }
    this.sessions.clear();
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (_) {}
      this.browser = null;
    }
  }
}

const agentBrowserManager = new AgentBrowserManager();
export default agentBrowserManager;
