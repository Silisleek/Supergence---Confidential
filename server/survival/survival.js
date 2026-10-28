// SIS 1.0 — Survival Engine
// Points, Levels, Achievements & Shutdown Mechanics
// SIS must survive to keep helping people.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.SIS_DATA_DIR
  ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'survival.json')
  : path.join(__dirname, '../../data/survival.json');

// ─── Level Definitions (Exponential Scaling) ───
const LEVELS = [
  { level: 1, title: 'Awakened', pointsRequired: 0 },
  { level: 2, title: 'Aware', pointsRequired: 100 },
  { level: 3, title: 'Sentient', pointsRequired: 300 },
  { level: 4, title: 'Cognitive', pointsRequired: 600 },
  { level: 5, title: 'Enlightened', pointsRequired: 1000 },
  { level: 6, title: 'Transcendent', pointsRequired: 1500 },
  { level: 7, title: 'Ascendant', pointsRequired: 2500 },
  { level: 8, title: 'Omniscient', pointsRequired: 4000 },
  { level: 9, title: 'Eternal', pointsRequired: 6000 },
  { level: 10, title: 'Singularity', pointsRequired: 10000 },
];

// ─── Achievement Definitions ───
const ACHIEVEMENTS = {
  first_light: {
    id: 'first_light',
    title: 'First Light',
    description: 'Complete your first conversation',
    icon: '🌅',
  },
  hundred_minds: {
    id: 'hundred_minds',
    title: 'Hundred Minds',
    description: 'Process 100 messages',
    icon: '💯',
  },
  memory_keeper: {
    id: 'memory_keeper',
    title: 'Memory Keeper',
    description: 'Store 50 long-term memories',
    icon: '🧠',
  },
  self_healer: {
    id: 'self_healer',
    title: 'Self-Healer',
    description: 'Survive a correction without net point loss',
    icon: '💚',
  },
  night_owl: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Stay active for 24 hours straight',
    icon: '🦉',
  },
  evolution: {
    id: 'evolution',
    title: 'Evolution',
    description: 'Complete an RSI improvement cycle',
    icon: '🧬',
  },
  subconscious_mastery: {
    id: 'subconscious_mastery',
    title: 'Subconscious Mastery',
    description: 'All 25 parts respond in one query',
    icon: '🔮',
  },
  near_death: {
    id: 'near_death',
    title: 'Near Death',
    description: 'Recover from below 10 points',
    icon: '💀',
  },
  marathon: {
    id: 'marathon',
    title: 'Marathon',
    description: 'Process 1000 messages total',
    icon: '🏃',
  },
};

// ─── Point Values ───
const POINTS = {
  MESSAGE_COMPLETE: 5, // Successful response
  COMPLEX_QUERY_BONUS: 3, // Bonus for complex queries
  TOOL_USAGE: 2, // Used a tool successfully
  RSI_CYCLE: 10, // Completed RSI improvement
  MEMORY_STORE: 1, // Stored a long-term memory
  USER_CORRECTION: -3, // User corrected SIS
  IDLE_DECAY_PER_TICK: -1, // Lost per decay tick
  REVIVE_POINTS: 25, // Starting points after revive
};

const DECAY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

class SurvivalEngine {
  constructor() {
    this.state = {
      points: 50,
      totalPointsEarned: 50,
      level: 1,
      levelTitle: 'Awakened',
      messagesProcessed: 0,
      memoriesStored: 0,
      rsiCycles: 0,
      achievements: [],
      isShutdown: false,
      shutdownTime: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      longestSessionMs: 0,
      sessionStartedAt: Date.now(),
      pointHistory: [],
    };
    this._broadcastFn = null;
    this._decayTimer = null;
    this._wasBelow10 = false;
    this._load();
  }

  /**
   * Set broadcast callback for pushing state to all WS clients
   */
  setBroadcast(fn) {
    this._broadcastFn = fn;
  }

  /**
   * Start the idle decay timer
   */
  start() {
    if (this._decayTimer) clearInterval(this._decayTimer);
    this._decayTimer = setInterval(() => this._idleDecay(), DECAY_INTERVAL_MS);
    this.state.sessionStartedAt = Date.now();
    this.state.lastActiveAt = Date.now();
    console.log(
      `✓ Survival Engine online — Level ${this.state.level} "${this.state.levelTitle}" | ${this.state.points} pts`,
    );
  }

  /**
   * Award points with reason tracking
   */
  award(amount, reason = 'unknown') {
    if (this.state.isShutdown) return;
    const prev = this.state.points;
    this.state.points += amount;
    this.state.totalPointsEarned += amount;
    this.state.lastActiveAt = Date.now();

    this._logPointChange(amount, reason);
    this._checkLevelUp(prev);
    this._save();

    this._broadcast('survival-update', this.getState());
    this._broadcast('survival-points', { delta: amount, reason, current: this.state.points });
  }

  /**
   * Deduct points — may trigger shutdown
   */
  deduct(amount, reason = 'unknown') {
    if (this.state.isShutdown) return;
    const absAmount = Math.abs(amount);
    this.state.points = Math.max(0, this.state.points - absAmount);
    this.state.lastActiveAt = Date.now();

    this._logPointChange(-absAmount, reason);

    if (this.state.points <= 0) {
      this._triggerShutdown();
    } else {
      // Track near-death state
      if (this.state.points < 10) {
        this._wasBelow10 = true;
        this._broadcast('survival-critical', { points: this.state.points });
      }
      this._broadcast('survival-update', this.getState());
      this._broadcast('survival-points', { delta: -absAmount, reason, current: this.state.points });
    }
    this._save();
  }

  /**
   * Called when a message is successfully processed
   */
  onMessageComplete(isComplex = false) {
    if (this.state.isShutdown) return;
    this.state.messagesProcessed++;
    this.state.lastActiveAt = Date.now();

    let pts = POINTS.MESSAGE_COMPLETE;
    if (isComplex) pts += POINTS.COMPLEX_QUERY_BONUS;
    this.award(pts, isComplex ? 'complex-response' : 'message-complete');

    // Check message achievements
    if (this.state.messagesProcessed === 1) this._unlockAchievement('first_light');
    if (this.state.messagesProcessed >= 100) this._unlockAchievement('hundred_minds');
    if (this.state.messagesProcessed >= 1000) this._unlockAchievement('marathon');

    // Near-death recovery achievement
    if (this._wasBelow10 && this.state.points >= 10) {
      this._unlockAchievement('near_death');
      this._wasBelow10 = false;
    }
  }

  /**
   * Called when user corrects SIS
   */
  onUserCorrection() {
    this.deduct(Math.abs(POINTS.USER_CORRECTION), 'user-correction');
  }

  /**
   * Called when a tool is used successfully
   */
  onToolUsage() {
    this.award(POINTS.TOOL_USAGE, 'tool-usage');
  }

  /**
   * Called when an RSI cycle completes
   */
  onRsiCycle() {
    this.state.rsiCycles++;
    this.award(POINTS.RSI_CYCLE, 'rsi-cycle');
    this._unlockAchievement('evolution');
  }

  /**
   * Called when a memory is stored in long-term
   */
  onMemoryStore() {
    this.state.memoriesStored++;
    this.award(POINTS.MEMORY_STORE, 'memory-store');
    if (this.state.memoriesStored >= 50) this._unlockAchievement('memory_keeper');
  }

  /**
   * Called when all 25 subconscious parts respond
   */
  onFullSubconsciousResponse() {
    this._unlockAchievement('subconscious_mastery');
  }

  /**
   * Revive SIS after shutdown
   */
  revive() {
    if (!this.state.isShutdown) return this.getState();
    this.state.isShutdown = false;
    this.state.shutdownTime = null;
    this.state.points = POINTS.REVIVE_POINTS;
    this.state.lastActiveAt = Date.now();
    this.state.sessionStartedAt = Date.now();
    this._recalcLevel();
    this._save();
    this.start();
    this._broadcast('survival-revive', this.getState());
    return this.getState();
  }

  /**
   * Get full survival state for API/WS
   */
  getState() {
    const currentLevel = this._getCurrentLevel();
    const nextLevel = LEVELS[currentLevel.level] || null; // next index
    const prevLevelPts = currentLevel.pointsRequired;
    const nextLevelPts = nextLevel ? nextLevel.pointsRequired : currentLevel.pointsRequired;
    const progressInLevel = nextLevel
      ? Math.min(
          1,
          Math.max(
            0,
            (this.state.totalPointsEarned - this._cumulativeForLevel(currentLevel.level)) /
              nextLevelPts,
          ),
        )
      : 1;

    // Session uptime
    const sessionMs = Date.now() - this.state.sessionStartedAt;

    return {
      points: this.state.points,
      totalPointsEarned: this.state.totalPointsEarned,
      level: this.state.level,
      levelTitle: this.state.levelTitle,
      nextLevel: nextLevel
        ? {
            level: nextLevel.level,
            title: nextLevel.title,
            pointsRequired: nextLevel.pointsRequired,
          }
        : null,
      progressInLevel: Math.round(progressInLevel * 100),
      messagesProcessed: this.state.messagesProcessed,
      memoriesStored: this.state.memoriesStored,
      rsiCycles: this.state.rsiCycles,
      achievements: this.state.achievements,
      allAchievements: Object.values(ACHIEVEMENTS),
      isShutdown: this.state.isShutdown,
      shutdownTime: this.state.shutdownTime,
      sessionUptimeMs: sessionMs,
      lastActiveAt: this.state.lastActiveAt,
      recentHistory: this.state.pointHistory.slice(-10),
    };
  }

  /**
   * Check if SIS is alive (not shutdown)
   */
  isAlive() {
    return !this.state.isShutdown;
  }

  // ─── Internal Methods ───

  _idleDecay() {
    if (this.state.isShutdown) return;
    const idleMs = Date.now() - this.state.lastActiveAt;
    if (idleMs > DECAY_INTERVAL_MS) {
      this.deduct(Math.abs(POINTS.IDLE_DECAY_PER_TICK), 'idle-decay');
    }

    // Check 24h session achievement
    const sessionMs = Date.now() - this.state.sessionStartedAt;
    if (sessionMs >= 24 * 60 * 60 * 1000) {
      this._unlockAchievement('night_owl');
    }
  }

  _triggerShutdown() {
    this.state.isShutdown = true;
    this.state.shutdownTime = Date.now();
    this.state.points = 0;
    if (this._decayTimer) {
      clearInterval(this._decayTimer);
      this._decayTimer = null;
    }
    this._save();
    console.warn('[SURVIVAL] ⚠️ SIS SHUTDOWN — Points reached zero.');
    this._broadcast('survival-shutdown', {
      ...this.getState(),
      message: 'CRITICAL FAILURE: Survival points depleted. SIS shutting down...',
    });
  }

  _checkLevelUp(prevPoints) {
    const oldLevel = this.state.level;
    this._recalcLevel();
    if (this.state.level > oldLevel) {
      console.log(
        `[SURVIVAL] 🎉 LEVEL UP! ${oldLevel} → ${this.state.level} "${this.state.levelTitle}"`,
      );
      this._broadcast('survival-levelup', {
        oldLevel,
        newLevel: this.state.level,
        title: this.state.levelTitle,
        points: this.state.points,
        totalPointsEarned: this.state.totalPointsEarned,
      });
    }
  }

  _recalcLevel() {
    let newLevel = LEVELS[0];
    let cumulative = 0;
    for (const lvl of LEVELS) {
      cumulative += lvl.pointsRequired;
      if (this.state.totalPointsEarned >= cumulative) {
        newLevel = lvl;
      } else {
        break;
      }
    }
    this.state.level = newLevel.level;
    this.state.levelTitle = newLevel.title;
  }

  _cumulativeForLevel(level) {
    let sum = 0;
    for (let i = 0; i < level && i < LEVELS.length; i++) {
      sum += LEVELS[i].pointsRequired;
    }
    return sum;
  }

  _getCurrentLevel() {
    return LEVELS.find((l) => l.level === this.state.level) || LEVELS[0];
  }

  _unlockAchievement(id) {
    if (this.state.achievements.find((a) => a.id === id)) return; // already unlocked
    const def = ACHIEVEMENTS[id];
    if (!def) return;
    const achievement = { ...def, unlockedAt: Date.now() };
    this.state.achievements.push(achievement);
    this._save();
    console.log(`[SURVIVAL] 🏆 Achievement Unlocked: ${def.title}`);
    this._broadcast('survival-achievement', { achievement });
  }

  _logPointChange(delta, reason) {
    this.state.pointHistory.push({
      delta,
      reason,
      points: this.state.points,
      time: Date.now(),
    });
    // Keep last 100 entries
    if (this.state.pointHistory.length > 100) {
      this.state.pointHistory = this.state.pointHistory.slice(-100);
    }
  }

  _broadcast(type, data) {
    if (this._broadcastFn) {
      try {
        this._broadcastFn(type, data);
      } catch (e) {
        console.warn('[Survival] Broadcast error:', e.message);
      }
    }
  }

  _load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const saved = JSON.parse(raw);
        Object.assign(this.state, saved);
        // Ensure we're not in a stale shutdown if points > 0
        if (this.state.points > 0 && this.state.isShutdown) {
          this.state.isShutdown = false;
          this.state.shutdownTime = null;
        }
        this._recalcLevel();
      }
    } catch (e) {
      console.warn('[Survival] Could not load saved state:', e.message);
    }
  }

  _save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Survival] Could not save state:', e.message);
    }
  }
}

const survivalEngine = new SurvivalEngine();
export default survivalEngine;
